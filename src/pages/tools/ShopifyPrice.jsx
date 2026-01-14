import { useEffect, useMemo, useState } from "react";
import { buildVariantsById, listCalculators } from "../../variants";

// ---- helpers ----
function normalizeSkus(input) {
  return String(input || "")
    .split(/[\n,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function rowFromSku(sku, i) {
  return {
    __rowIndex: i,
    Handle: sku,
    "Variant SKU": sku,
    SKU: sku,
  };
}

function csvEscape(value) {
  const s = value === undefined || value === null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadTextFile({ filename, content, mime = "text/plain;charset=utf-8" }) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ShopifyPrice() {
  const variantCatalog = useMemo(() => listCalculators(), []);

  const [variantMode, setVariantMode] = useState(() => {
    try {
      return localStorage.getItem("variantMode_v1") || "notion";
    } catch {
      return "notion";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("variantMode_v1", variantMode);
    } catch {}
  }, [variantMode]);

  const categoryLabel = useMemo(() => {
    const hit = (variantCatalog || []).find((x) => x.id === variantMode);
    return hit?.label ?? variantMode;
  }, [variantMode, variantCatalog]);

  const [skuInput, setSkuInput] = useState("");
  const [variantsActive, setVariantsActive] = useState([]);
  const [isComputing, setIsComputing] = useState(false);
  const [computeError, setComputeError] = useState("");

  const skus = useMemo(() => normalizeSkus(skuInput), [skuInput]);

  const tableRows = useMemo(() => {
    const list = Array.isArray(variantsActive) ? variantsActive : [];
    return list.map((r, idx) => {
      const usd = Number(r["Price(USD)"] ?? r["Variant Price"] ?? 0);
      const twd = Math.round(usd * 32);

      return {
        id: `${r.__rowIndex ?? "x"}-${r.__variantIndex ?? idx}`,
        sku: r["Variant SKU"] ?? "",
        variant: r["Variant"] ?? r["Option1 Value"] ?? "",
        priceUsd: usd ? usd.toFixed(2) : "",
        priceTwd: twd || "",
      };
    });
  }, [variantsActive]);

  const handleCategoryChange = (value) => setVariantMode(value);

  const handleCompute = async () => {
    setComputeError("");

    if (!skus.length) {
      setVariantsActive([]);
      setComputeError("請先輸入至少一個 SKU（可用換行或逗號分隔）。");
      return;
    }

    const rows = skus.map((sku, i) => rowFromSku(sku, i));

    setIsComputing(true);
    try {
      const list = await buildVariantsById(variantMode, rows, {});
      setVariantsActive(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setVariantsActive([]);
      setComputeError("計算失敗：請確認 SKU 或算法設定。");
    } finally {
      setIsComputing(false);
    }
  };

  const handleClear = () => {
    setSkuInput("");
    setVariantsActive([]);
    setComputeError("");
  };

  const handleExportCsv = () => {
    if (!tableRows.length) {
      alert("目前沒有可匯出的結果，請先計算。");
      return;
    }

    const headers = ["Variant SKU", "Variant", "Price(USD)", "Price(TWD)"];
    const lines = [
      headers.map(csvEscape).join(","),
      ...tableRows.map((r) =>
        [r.sku, r.variant, r.priceUsd, r.priceTwd].map(csvEscape).join(",")
      ),
    ];

    const ts = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const filename = `shopify_price_${variantMode}_${ts.getFullYear()}${pad(
      ts.getMonth() + 1
    )}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`;

    downloadTextFile({
      filename,
      content: lines.join("\n"),
      mime: "text/csv;charset=utf-8",
    });
  };

  const resultCount = tableRows.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Shopify 價格計算（手動 SKU）
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            變體算法：<b>{categoryLabel}</b>
          </div>
        </div>

        <button
          className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
          onClick={handleExportCsv}
          disabled={!resultCount}
        >
          輸出 CSV
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <aside className="col-span-12 lg:col-span-4">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium mb-1">變體模式</label>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={variantMode}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {variantCatalog.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label ?? opt.id}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium mt-4 mb-1">
              輸入 SKU（換行或逗號分隔）
            </label>
            <textarea
              className="w-full min-h-[220px] rounded-xl border px-3 py-2 text-sm"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
            />

            <div className="mt-3 flex gap-2">
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={handleCompute}
                disabled={isComputing}
              >
                {isComputing ? "計算中..." : "開始計算"}
              </button>

              <button
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={handleClear}
                disabled={isComputing}
              >
                清空
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              已解析 SKU：<b>{skus.length}</b> 筆
            </div>

            {computeError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {computeError}
              </div>
            )}
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-8">
          <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm text-sm">
            計算結果：<b>{resultCount}</b> 筆（來源：{variantMode}）
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            {resultCount ? (
              <div className="max-h-[620px] overflow-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2">Variant SKU</th>
                      <th className="px-3 py-2">Variant</th>
                      <th className="px-3 py-2 text-right">Price (USD)</th>
                      <th className="px-3 py-2 text-right">Price (TWD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                        <td className="px-3 py-2">{r.variant}</td>
                        <td className="px-3 py-2 text-right">{r.priceUsd}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          {r.priceTwd}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                尚無結果。請輸入 SKU 並點「開始計算」。
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
