import { useMemo, useState, useEffect } from "react";
import JSZip from "jszip";

/* ---------- 共用小工具 ---------- */

// 忽略大小寫與非英數
const normalize = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// 依 preferredColumns 解析出最終欄位順序（完全相等→結尾相符→包含）
function resolveColumns(allRows = [], preferredColumns) {
  if (!allRows?.length) return [];
  const cols = [...new Set(allRows.flatMap((r) => Object.keys(r || {})))];
  const actuals = cols.map((k) => ({ actual: k, norm: normalize(k) }));

  if (!Array.isArray(preferredColumns) || !preferredColumns.length) return cols;

  const used = new Set();
  const resolvedHead = [];
  const pickMatch = (want) => {
    const wn = normalize(want);
    let hit = actuals.find((a) => a.norm === wn && !used.has(a.actual));
    if (hit) return hit;
    hit = actuals.find((a) => a.norm.endsWith(wn) && !used.has(a.actual));
    if (hit) return hit;
    hit = actuals.find((a) => a.norm.includes(wn) && !used.has(a.actual));
    return hit || null;
  };

  for (const want of preferredColumns) {
    const match = pickMatch(want);
    if (match) {
      resolvedHead.push(match.actual);
      used.add(match.actual);
    }
  }
  const tail = cols.filter((c) => !used.has(c));
  return [...resolvedHead, ...tail];
}

// 展平成純文字
function mapRowsToFlat(rows, columns) {
  const toCell = (v) => {
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      return String(v);
    try { return JSON.stringify(v); } catch { return String(v); }
  };
  return rows.map((r) =>
    columns.reduce((acc, c) => ((acc[c] = toCell(r?.[c])), acc), {})
  );
}

// 產 CSV（排除指定欄位）
function buildCsv(columns, flatRows) {
  const exclude = new Set(["__variantIndex", "__rowIndex", "Variant", "Price(USD)"]);
  const filteredCols = columns.filter((c) => !exclude.has(c));
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const header = filteredCols.map(esc).join(",");
  const lines = flatRows.map((r) => filteredCols.map((c) => esc(r[c] ?? "")).join(","));
  return "\ufeff" + [header, ...lines].join("\r\n"); // BOM for Excel
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- Products+Variants 依 handle 合併 ---------- */

function getHandle(row) {
  if (!row || typeof row !== "object") return "";
  const entry = Object.keys(row).find((k) => normalize(k) === "handle");
  return entry ? String(row[entry] ?? "") : "";
}

function keysUnion(rows) {
  const s = new Set();
  for (const r of rows || []) {
    if (!r || typeof r !== "object") continue;
    for (const k of Object.keys(r)) s.add(k);
  }
  return s;
}

/**
 * 依 handle 合併：
 * - 以 variants 的 handle 順序為主（沒有 variants 的 handle 會在最後補上一列）
 * - 同 handle 的第一筆 variant 會帶上對應的 product 欄位
 * - 同 handle 的後續 variant，product 專屬欄位清空（handle 會保留）
 */
function buildProductsVariantsMerged(products = [], variants = []) {
  const productByHandle = new Map();
  for (const p of products) {
    const h = getHandle(p);
    if (!h) continue;
    if (!productByHandle.has(h)) productByHandle.set(h, p);
  }

  const variantsByHandle = new Map();
  for (const v of variants) {
    const h = getHandle(v);
    if (!h) continue;
    if (!variantsByHandle.has(h)) variantsByHandle.set(h, []);
    variantsByHandle.get(h).push(v);
  }

  const productKeys = keysUnion(products);
  const variantKeys = keysUnion(variants);
  const productOnlyKeys = new Set([...productKeys].filter((k) => !variantKeys.has(k)));
  for (const k of [...productOnlyKeys]) if (normalize(k) === "handle") productOnlyKeys.delete(k);

  const merged = [];

  for (const [h, vRows] of variantsByHandle.entries()) {
    const prod = productByHandle.get(h) || {};
    vRows.forEach((vRow, idx) => {
      const row = { ...prod, ...vRow };
      if (idx > 0) {
        productOnlyKeys.forEach((k) => {
          if (k in row) row[k] = "";
        });
      }
      merged.push(row);
    });
    productByHandle.delete(h);
  }

  for (const [, p] of productByHandle.entries()) {
    merged.push({ ...p });
  }
  return merged;
}

/* ---------- Modal ---------- */

export default function ConfirmPreviewModal({
  open,
  onClose,
  onConfirm,
  sections = [],
  sourceLabel,
  defaultTabId,
  onlyNonEmptyTabs = false,
  sectionOrder,
  columnOrderMap,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const visibleSections = useMemo(() => {
    const list = Array.isArray(sections) ? sections : [];
    const filtered = onlyNonEmptyTabs ? list.filter((s) => s.rows?.length) : list;
    if (!sectionOrder?.length) return filtered;
    const idx = new Map(sectionOrder.map((id, i) => [id, i]));
    return [...filtered].sort(
      (a, b) => (idx.get(a.id) ?? 999) - (idx.get(b.id) ?? 999)
    );
  }, [sections, onlyNonEmptyTabs, sectionOrder]);

  const initialTab =
    defaultTabId ||
    visibleSections.find((s) => s.id === "variants")?.id ||
    visibleSections[0]?.id ||
    "";

  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const next =
      defaultTabId ||
      visibleSections.find((s) => s.id === "variants")?.id ||
      visibleSections[0]?.id ||
      "";
    setTab(next);
  }, [defaultTabId, visibleSections]);

  const totalCount = useMemo(
    () => visibleSections.reduce((sum, s) => sum + (s.rows?.length || 0), 0),
    [visibleSections]
  );

  if (!open) return null;

  const current = visibleSections.find((s) => s.id === tab) || visibleSections[0];
  const handleClose = () => {
    if (isSubmitting) return;
    onClose?.();
  };
  const confirmAll = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(visibleSections.map((s) => s.id));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 匯出「本分頁」
  const exportCurrentCsv = () => {
    if (!current?.rows?.length) return;
    const cols = resolveColumns(current.rows, columnOrderMap?.[current.id]);
    const flat = mapRowsToFlat(current.rows, cols);
    const csv = buildCsv(cols, flat);
    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
    downloadBlob(`${current.id}-${ts}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  };

  // 匯出 ZIP（三檔；Products+Variants 依 handle 合併）
  const exportZip = async () => {
    const get = (id) => visibleSections.find((s) => s.id === id)?.rows || [];
    const prodRows = get("products");
    const varRows = get("variants");
    const metaRows = get("metafields");
    const transRows = get("translations");

    if (!(prodRows.length || varRows.length || metaRows.length || transRows.length)) return;

    const zip = new JSZip();
    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);

    // 1) Products+Variants（依 handle 合併）
    const pvMerged = buildProductsVariantsMerged(prodRows, varRows);
    const pvPreferred = [
      ...(columnOrderMap?.products || []),
      ...(columnOrderMap?.variants || []),
    ];
    if (pvMerged.length) {
      const cols = resolveColumns(pvMerged, pvPreferred);
      const flat = mapRowsToFlat(pvMerged, cols);
      const csv = buildCsv(cols, flat);
      zip.file(`Shopify-${ts}.csv`, csv);
    }

    // 2) Metafields
    if (metaRows.length) {
      const cols = resolveColumns(metaRows, columnOrderMap?.metafields);
      const flat = mapRowsToFlat(metaRows, cols);
      const csv = buildCsv(cols, flat);
      zip.file(`Metafields-${ts}.csv`, csv);
    }

    // 3) Translations
    if (transRows.length) {
      const cols = resolveColumns(transRows, columnOrderMap?.translations);
      const flat = mapRowsToFlat(transRows, cols);
      const csv = buildCsv(cols, flat);
      zip.file(`Translations-${ts}.csv`, csv);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(`Export-${ts}.zip`, blob);
  };

  // ===== ▼ 新增：ZIP 顯示條件（可輸出檔案數 ≥ 2 才顯示） =====
  const has = (id) => visibleSections.some(s => s.id === id && s.rows?.length);
  // 「Shopify-*.csv」是否存在（products 或 variants 任一有資料即算 1 份）
  const hasShopifyCSV = has("products") || has("variants");
  const hasMetafieldsCSV = has("metafields");
  const hasTranslationsCSV = has("translations");
  const exportableFileCount =
    (hasShopifyCSV ? 1 : 0) +
    (hasMetafieldsCSV ? 1 : 0) +
    (hasTranslationsCSV ? 1 : 0);
  const showZipButton = exportableFileCount >= 2;
  // ===== ▲ 新增：ZIP 顯示條件 =====

  return (
    <div className="fixed inset-0 z-[100]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* dialog：加 overscroll-contain，避免滾動穿透 */}
      <div className="absolute inset-x-0 top-10 mx-auto w-11/12 max-w-6xl max-h-[85vh] rounded-2xl bg-white shadow-xl flex flex-col overscroll-contain">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            確認送出
            {sourceLabel && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                （來源：{sourceLabel}）
              </span>
            )}
          </h3>
          <button
            onClick={handleClose}
            className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            disabled={isSubmitting}
          >
            關閉
          </button>
        </div>

        {/* tabs（只有 1 個分頁時自動隱藏） */}
        {visibleSections.length > 1 && (
          <div className="px-6 pt-4">
            <div className="flex flex-wrap gap-2 items-center">
              {visibleSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setTab(s.id)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                    tab === s.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  disabled={isSubmitting}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 唯一捲動容器：overscroll-contain + 穩定捲軸 */}
        <div
          className="relative px-6 py-4 flex-1 min-h-0 overflow-auto overscroll-contain"
          style={{ scrollbarGutter: "stable both-edges", overscrollBehavior: "contain" }}
        >
          {current ? (
            <AutoTable
              rows={current.rows}
              preferredColumns={columnOrderMap?.[current.id]}
              emptyText={`沒有要送出的 ${current.id}`}
            />
          ) : (
            <div className="text-slate-500">沒有分頁可顯示</div>
          )}

          {isSubmitting && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                <div className="text-sm font-medium text-slate-700">
                  資料送出中，請稍候...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              onClick={exportCurrentCsv}
              className="rounded-xl px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={isSubmitting || !current?.rows?.length}
              title="匯出目前分頁為 CSV"
            >
              匯出本分頁 CSV
            </button>

            {/* 只有當可輸出檔案數 ≥ 2（例如：Shopify + Metafields）時才顯示 ZIP */}
            {showZipButton && (
              <button
                onClick={exportZip}
                className="rounded-xl px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={isSubmitting || !totalCount}
                title="打包全部 CSV（Products+Variants、Metafields、Translations）"
              >
                匯出全部 CSV
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="rounded-xl px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              onClick={confirmAll}
              className="rounded-xl px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting || !totalCount}
            >
              {isSubmitting ? "送出中..." : "確認送出"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 表格（內層水平滑桿，固定底部；含分頁） ---------- */
function AutoTable({ rows = [], preferredColumns, emptyText = "No data" }) {
  const { columns, flatRows } = useMemo(() => {
    if (!rows.length) return { columns: [], flatRows: [] };
    const columns = resolveColumns(rows, preferredColumns);
    const flatRows = mapRowsToFlat(rows, columns);
    return { columns, flatRows };
  }, [rows, preferredColumns]);

  const MAX_PREVIEW = 100;
  const [page, setPage] = useState(0);

  const total = flatRows.length;
  const totalPages = Math.ceil(total / MAX_PREVIEW);
  const start = page * MAX_PREVIEW;
  const end = Math.min(start + MAX_PREVIEW, total);
  const displayRows = flatRows.slice(start, end);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto border rounded-lg" style={{ maxHeight: "50vh" }}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              {columns.map((label) => (
                <th
                  key={label}
                  className="px-3 py-2 text-left font-medium text-slate-700 whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayRows.length ? (
              displayRows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {columns.map((key) => (
                    <td key={key} className="px-3 py-2 whitespace-pre">
                      {r[key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-3 py-8 text-center text-slate-500"
                  colSpan={columns.length || 1}
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分頁控制列 */}
      {total > MAX_PREVIEW && (
        <div className="flex items-center justify-between text-sm text-slate-600 px-2">
          <p>
            顯示第 <b>{start + 1}</b>–<b>{end}</b> 筆（共 <b>{total}</b> 筆）
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-slate-100"
            >
              上一頁
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-slate-100"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
