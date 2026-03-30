// src/pages/MatchMedia.jsx
import { useState } from "react";
import { useCsv } from "../stores/useCsv";
import EmptyState from "../component/EmptyState";
import Hero from "../component/Hero";
import AsideList from "../component/AsideList";
import { postJsonWithResultLog, notifyAndOfferResultExport } from "../utils/loggedApiSubmit";
import { useApi } from "../lib/api";

const REQUIRED_COLUMNS = ["Handle", "mediaKeyword", "mediaKeyword_type"];
export default function MatchMedia() {
  const { fetch: apiFetch } = useApi();
  const { rows, selectedIndex, setIndex, productPayloads, metafieldPayloads } = useCsv();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getMediaMatchFields = (row, product) => {
    const metafield = (metafieldPayloads || []).find((m) => m.handle === product.handle);
    const mediaKeywordType = row?.["mediaKeyword_type"];
    const normalizedMediaKeywordType = String(mediaKeywordType ?? "").trim().toUpperCase();
    const branchType = metafield?.["filter.branchType"] ?? row?.["filter.branchType"];

    const fields = {
      mediaKeyword: row?.["mediaKeyword"],
      mediaKeyword_type: mediaKeywordType,
    };

    if (normalizedMediaKeywordType === "MTPMPO") {
      fields["filter.branchType"] = branchType;
    }

    return fields;
  };

  // Check for required columns
  const hasRequiredColumns = () => {
    if (rows.length === 0) return false;
    const columns = Object.keys(rows[0]);
    return REQUIRED_COLUMNS.every((col) => columns.includes(col));
  };

  const buildPayload = () => {
    return productPayloads.map((product) => {
      const row = rows[product.__rowIndex];
      return {
        handle: product.handle,
        ...getMediaMatchFields(row, product),
      };
    });
  };

  const handleSubmitAll = async () => {
    if (!hasRequiredColumns()) {
      alert(`CSV 檔案中缺少必要的欄位。請確認是否包含 ${REQUIRED_COLUMNS.join("、")}。`);
      return;
    }

    const payload = buildPayload();
    if (!payload.length) {
      alert("沒有可處理的資料。");
      return;
    }

    if (!confirm(`即將為 ${payload.length} 筆資料進行照片匹配，是否確認？`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(payload);
      const { requestId, message } = await postJsonWithResultLog({
        apiFetch,
        endpoint: "/api/mediaSet",
        body: { rows: payload },
        successMessage: "照片匹配請求已成功送出。",
      });
      await notifyAndOfferResultExport({ requestId, message });
    } catch (error) {
      console.error("Media match failed:", error);
      alert(`處理失敗： ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewData = productPayloads.slice(0, 10).map((product) => {
    const row = rows[product.__rowIndex];
    return {
      handle: product.handle,
      ...getMediaMatchFields(row, product),
    };
  });

  return (
    <>
      <Hero
        pageTitle="批次匹配照片"
        onSubmit={handleSubmitAll}
        isSubmitting={isSubmitting}
        submitButtonText="開始匹配"
      />

      <div className="container mx-auto px-4 py-8">
        {rows.length === 0 ? (
          <EmptyState />
        ) : !hasRequiredColumns() ? (
          <div className="text-center bg-white rounded-lg shadow p-8">
            <h3 className="text-lg font-semibold text-red-600">缺少必要欄位</h3>
            <p className="mt-2 text-slate-600">
              請確認您的 CSV 檔案包含以下欄位：
              <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md ml-2">
                {REQUIRED_COLUMNS.join(", ")}
              </span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 lg:gap-6">
            <AsideList
              rows={rows}
              selectedProductIndex={selectedIndex}
              setSelectedProductIndex={setIndex}
            />

            <main className="col-span-12 md:col-span-9">
              <div className="bg-white rounded-2xl border shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-4">預覽資料 (前10筆)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                      <tr>
                        <th scope="col" className="px-6 py-3">Handle</th>
                        <th scope="col" className="px-6 py-3">mediaKeyword</th>
                        <th scope="col" className="px-6 py-3">mediaKeyword_type</th>
                        <th scope="col" className="px-6 py-3">filter.branchType</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((data, index) => (
                        <tr key={index} className="bg-white border-b hover:bg-slate-50">
                          <td className="px-6 py-4 font-mono text-slate-800">{data.handle}</td>
                          <td className="px-6 py-4">{data.mediaKeyword}</td>
                          <td className="px-6 py-4 font-mono">
                            {data.mediaKeyword_type || <span className="text-red-500">缺少值</span>}
                          </td>
                          <td className="px-6 py-4 font-mono">
                            {data["filter.branchType"] || <span className="text-red-500">缺少值</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 10 && (
                    <p className="text-xs text-slate-500 mt-2">... and {rows.length - 10} more rows.</p>
                  )}
                </div>
              </div>
            </main>
          </div>
        )}
      </div>
    </>
  );
}
