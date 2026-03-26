import { useEffect, useMemo, useState } from "react";

function fmtTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function toLocalDateTimeInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDateTimeInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function getCollectionLabels(item) {
  const raw = Array.isArray(item?.collections) ? item.collections : [];
  return raw
    .map((collectionItem) => collectionItem?.title || collectionItem?.handle || "")
    .filter(Boolean);
}

export default function BatchRestoreModal({
  open,
  onClose,
  selectionSummary,
  filtersSummary,
  selectionNeedsPreviewCount = false,
  onPreview,
  onExportPreview,
  onSubmit,
  onOpenLogs,
}) {
  const [restoreAtInput, setRestoreAtInput] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    now.setSeconds(0, 0);
    setRestoreAtInput((prev) => prev || toLocalDateTimeInputValue(now.toISOString()));
    setPreviewLoading(false);
    setPreviewError("");
    setSubmitLoading(false);
    setSubmitError("");
    setSubmitted(null);
    setPreviewData(null);
  }, [open]);

  const requestedRestoreAt = useMemo(
    () => fromLocalDateTimeInputValue(restoreAtInput),
    [restoreAtInput]
  );

  const previewItems = Array.isArray(previewData?.items) ? previewData.items : [];
  const previewSummary = previewData?.summary || null;
  const previewDisplayedItems = Number(previewData?.displayed_items) || previewItems.length;
  const previewTotalResolved = Number(previewData?.total_items_resolved) || previewItems.length;

  async function handlePreview() {
    if (!requestedRestoreAt) {
      setPreviewError("請先指定還原時間");
      return;
    }
    setPreviewLoading(true);
    setPreviewError("");
    setSubmitError("");
    try {
      const data = await onPreview?.(requestedRestoreAt);
      setPreviewData(data || null);
    } catch (err) {
      setPreviewError(err?.message || "無法載入預覽");
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleExportPreview() {
    if (!requestedRestoreAt) {
      setPreviewError("請先指定還原時間");
      return;
    }
    try {
      await onExportPreview?.(requestedRestoreAt);
    } catch (err) {
      setPreviewError(err?.message || "預覽匯出失敗");
    }
  }

  async function handleSubmit() {
    if (!previewData) {
      setSubmitError("請先載入預覽清單");
      return;
    }
    setSubmitLoading(true);
    setSubmitError("");
    try {
      const data = await onSubmit?.(requestedRestoreAt);
      setSubmitted(data || null);
    } catch (err) {
      setSubmitError(err?.message || "批次還原送出失敗");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-black/40" onClick={() => !submitLoading && onClose?.()} />

      <div className="absolute inset-x-0 top-8 mx-auto w-[94%] max-w-6xl max-h-[88vh] rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">批次還原</h3>
            <p className="text-sm text-slate-500 mt-1">送出前先確認本次還原清單與時間點。</p>
          </div>
          <button
            onClick={() => !submitLoading && onClose?.()}
            className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            disabled={submitLoading}
          >
            關閉
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
            <div className="space-y-2">
              <div className="text-sm text-slate-700">
                <span className="font-medium">選取範圍：</span> {selectionSummary}
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-medium">目前搜尋條件：</span> {filtersSummary}
              </div>
              {selectionNeedsPreviewCount && !previewSummary && (
                <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                  目前為全選搜尋結果模式。精確筆數與實際處理清單會在載入預覽後確認。
                </div>
              )}
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                還原會覆蓋 Shopify 現況。找不到對應版本的產品會被略過，單筆失敗不會中斷整批。
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-slate-700">
                <div className="font-medium mb-1">還原時間點</div>
                <input
                  type="datetime-local"
                  value={restoreAtInput}
                  onChange={(e) => setRestoreAtInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewLoading || submitLoading}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {previewLoading ? "載入預覽中..." : "載入預覽"}
                </button>
                <button
                  type="button"
                  onClick={handleExportPreview}
                  disabled={previewLoading || submitLoading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  下載預覽 CSV
                </button>
              </div>
            </div>
          </div>

          {previewError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {previewError}
            </div>
          )}
          {submitError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          {submitted && (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <div className="font-medium">批次還原已送出，可以關閉此視窗。</div>
              <div className="mt-1">requestId: {submitted.requestId || "—"}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenLogs?.(submitted.requestId)}
                  className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm text-green-800 hover:bg-green-100"
                >
                  前往結果紀錄
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex-1 min-h-0 overflow-auto">
          {!previewData ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              請先載入預覽清單。
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard label="總筆數" value={previewSummary?.total ?? 0} />
                <SummaryCard label="可還原" value={previewSummary?.ready ?? 0} />
                <SummaryCard label="將略過" value={previewSummary?.skipped ?? 0} />
                <SummaryCard label="已截斷" value={previewSummary?.truncated ? "是" : "否"} />
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                預覽已確認本次實際處理範圍，共 {previewSummary?.total ?? 0} 筆產品。送出後系統會自動分批背景處理，不需要手動分次操作。
              </div>

              {previewTotalResolved > previewDisplayedItems && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  預覽表目前顯示前 {previewDisplayedItems} 筆樣本，完整清單可下載 CSV，實際送出時會處理全部 {previewSummary?.total ?? previewTotalResolved} 筆。
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
                  還原預覽清單
                </div>
                <div className="overflow-auto max-h-[42vh]">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">產品</th>
                        <th className="px-4 py-3 text-left font-medium">Collections</th>
                        <th className="px-4 py-3 text-left font-medium">最近可還原版本</th>
                        <th className="px-4 py-3 text-left font-medium">狀態</th>
                        <th className="px-4 py-3 text-left font-medium">說明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((item) => {
                        const collections = getCollectionLabels(item);
                        return (
                          <tr key={item.product_id} className="border-b border-slate-100 align-top">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">{item.title || "—"}</div>
                              <div className="text-xs text-slate-500 mt-1">{item.handle || "—"}</div>
                              <div className="text-[11px] text-slate-400 mt-1">{item.product_id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5 max-w-xs">
                                {collections.length > 0 ? collections.map((label) => (
                                  <span
                                    key={`${item.product_id}-${label}`}
                                    className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-100"
                                  >
                                    {label}
                                  </span>
                                )) : <span className="text-slate-400">—</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {fmtTime(item.resolved_restore_at)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                                item.status === "ready"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {item.status === "ready" ? "可送出" : "將略過"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{item.reason || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200">
          <div className="text-sm text-slate-500">
            {previewSummary ? `本次預計處理 ${previewSummary.total} 筆產品` : "尚未載入預覽"}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => !submitLoading && onClose?.()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={submitLoading}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitLoading || !previewData || submitted}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {submitLoading ? "送出中..." : submitted ? "已送出" : "確認送出批次還原"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
