// src/pages/UpdateProducts.jsx
import { useState } from "react";
import { useCsv } from "../stores/useCsv";
import EmptyState from "../component/EmptyState";
import RequireColumn from "../component/RequireColumn";
import Metafields_Recommendation from "../component/Metafields_Recommendation";
import AsideList from "../component/AsideList";
import Hero from "../component/Hero";
import UpdateButtonRow from "../component/updateButtonRow";
import ConfirmPreviewModal from "../component/ConfirmPreviewModal";
import { SECTION_ORDER, COLUMN_ORDER } from "../config/previewSections";
import { pick } from "../utils/pick";

import { useAuth } from "../auth/AuthContext";
const API_BASE = import.meta.env.VITE_API_BASE;

export default function UpdateRelativeProducts() {
  const { accessToken } = useAuth();
  const {
    rows,
    selectedIndex,
    setIndex,
    currentRow,
    metafieldPayloads, currentMetafieldPayload,
  } = useCsv();

  // 勾選 keys
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const toggleSelected = (keys = [], checked) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (!k) continue;
        if (checked) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  };
  const isChecked = (keys = []) => keys.every((k) => selectedKeys.has(k));

  /* ============ Modal 狀態（共用） ============ */
  const [showPreview, setShowPreview] = useState(false);
  const [modalSections, setModalSections] = useState(() => []);
  const [modalDefaultTab, setModalDefaultTab] = useState("products");

  /* ============ 三種開啟方式 ============ */

  // 1) Hero 的全部送出 → 直接把完整 productPayloads 放進 Modal
  const handleSubmitAll = () => {
  // 只取 handle + recommendation.related_products
  const minimalRows = Array.isArray(metafieldPayloads)
    ? metafieldPayloads.map(p => ({
        handle: p.handle,
        "recommendation.related_products": p["recommendation.related_products"]
      }))
    : [];

  setModalSections([
    {
      id: "products",
      label: `Products (${minimalRows.length})`,
      rows: minimalRows,
      endpoint: `${API_BASE}/api/updateProductRelative`,
    },
  ]);

  setModalDefaultTab("products");
  setShowPreview(true);
};

  // 2) 更新這筆（原本直接打 API）→ 改成只顯示「當前列 + 勾選欄位」於 Modal
  const updateSelectedForCurrent = () => {
    if (!currentMetafieldPayload) return;
    const keys = Array.from(selectedKeys);
    if (!keys.length) return;

    const body = [{ handle: currentMetafieldPayload.handle, ...pick(currentMetafieldPayload, keys) }];
    setModalSections([
      {
        id: "products",
        label: `Products (1)`,
        rows: body,
        endpoint: `${API_BASE}/api/updateProductRelative`,
      },
    ]);
    setModalDefaultTab("products");
    setShowPreview(true);
  };

  // 3) 更新全部（原本直接打 API）→ 改成只顯示「全部列 + 勾選欄位」於 Modal
  const updateSelectedForAll = () => {
    const keys = Array.from(selectedKeys);
    if (!keys.length) return;

    const body = (metafieldPayloads || []).map((p) => ({ handle: p.handle, ...pick(p, keys) }));
    setModalSections([
      {
        id: "products",
        label: `Products (${body.length})`,
        rows: body,
        endpoint: `${API_BASE}/api/updateProductRelative`,
      },
    ]);
    setModalDefaultTab("products");
    setShowPreview(true);
  };

  // ▶ Modal 的「確認送出」：把目前 modalSections 的資料送到對應 endpoint
  const handleConfirmSend = async (selectedIds /* string[] */) => {
    const chosen = (modalSections || []).filter(
      (s) => selectedIds.includes(s.id) && Array.isArray(s.rows) && s.rows.length
    );

    if (!chosen.length) {
      alert("目前沒有可送出的翻譯資料。");
      setShowPreview(false);
      return;
    }

    let anySuccess = false;

    try {
      // 逐一送出（若未來有多分頁，也只彈一次提示）
      for (const s of chosen) {
        const resp = await fetch(s.endpoint, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ rows: s.rows }),
        });

        if (resp.ok) { // 等同 2xx（包含 200/202）
          anySuccess = true;
        }
      }

      if (anySuccess) {
        alert("資料已送出，您可關閉視窗。");
      } else {
        alert("送出失敗，請稍後再試。");
      }
    } catch (err) {
      console.error(err);
      alert("送出失敗，請稍後再試或查看主控台錯誤訊息。");
    } finally {
      setShowPreview(false);
    }
  };

  return (
    <>
      {/* 1) 按「全部送出」→ 開啟 Modal */}
      <Hero pageTitle="更新關聯產品" onSubmit={handleSubmitAll} />

      {/* 2/3) 工具列：維持原本介面；內部呼叫的兩個方法已改成開 Modal */}
      {rows.length > 0 && (
        <UpdateButtonRow
          selectedKeys={selectedKeys}
          currentPayload={currentMetafieldPayload}
          payloads={metafieldPayloads}
          updateSelectedForAll={updateSelectedForAll}
          updateSelectedForCurrent={updateSelectedForCurrent}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-12 gap-4 lg:gap-6">
            <AsideList
              rows={rows}
              selectedProductIndex={selectedIndex}
              setSelectedProductIndex={setIndex}
            />

            <main className="col-span-12 md:col-span-6">
              {metafieldPayloads ? (
                <div className="flex flex-col gap-3">
                  <RequireColumn
                    rows={rows}
                    selectedProductIndex={selectedIndex}
                    currentRow={currentRow}
                    canEdit={false}
                  />
                  <Metafields_Recommendation
                    rows={rows}
                    selectedProductIndex={selectedIndex}
                    currentRow={currentRow}
                    canEdit={true}
                    isChecked={isChecked}
                    toggleSelected={toggleSelected}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-slate-500">尚未選擇資料或資料尚未載入</p>
                </div>
              )}
            </main>

            <section className="col-span-12 md:col-span-3">
              {currentRow ? (
                <div className="flex flex-col gap-3">

                </div>
              ) : (
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-slate-500">尚未選擇資料或資料尚未載入</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Modal：顯示由三種入口組成的 rows（完整 / 這筆勾選 / 全部勾選） */}
      <ConfirmPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmSend}
        sections={modalSections}
        defaultTabId={modalDefaultTab}
        onlyNonEmptyTabs={true}
        sectionOrder={SECTION_ORDER}
        columnOrderMap={COLUMN_ORDER}
      />
    </>
  );
}
