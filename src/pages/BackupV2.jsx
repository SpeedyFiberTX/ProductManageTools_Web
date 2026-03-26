import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../lib/api";
import BatchRestoreModal from "../component/BatchRestoreModal";

const PAGE_SIZES = [20, 50, 100];

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function BackupV2() {
  const { getJson, postJson, fetch: apiFetch } = useApi();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchInput, setSearchInput] = useState("");
  const [draftSearchMode, setDraftSearchMode] = useState("keyword");
  const [appliedFilters, setAppliedFilters] = useState({ q: "", collection: "" });
  const [collectionOptions, setCollectionOptions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [sortKey, setSortKey] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [showBatchRestore, setShowBatchRestore] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const latestFetchIdRef = useRef(0);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  const activeFilters = useMemo(() => ({
    q: appliedFilters.q.trim(),
    collection: appliedFilters.collection.trim(),
  }), [appliedFilters]);

  const hasSearchFilters = Boolean(activeFilters.q || activeFilters.collection);

  const fetchList = async () => {
    const fetchId = latestFetchIdRef.current + 1;
    latestFetchIdRef.current = fetchId;
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
        ...(activeFilters.q ? { q: activeFilters.q } : {}),
        ...(activeFilters.collection ? { collection: activeFilters.collection } : {}),
      });
      const res = await getJson(`/api/products?${qs.toString()}`);
      if (latestFetchIdRef.current !== fetchId) return;
      setItems(res.items || []);
      setTotalCount(Number.isFinite(Number(res.total)) ? Number(res.total) : null);
      setHasMore(Boolean(res.hasMore));
    } catch (err) {
      if (latestFetchIdRef.current !== fetchId) return;
      console.error(err);
      setError(err.message || "載入失敗，請稍後再試");
    } finally {
      if (latestFetchIdRef.current === fetchId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, pageSize, activeFilters.q, activeFilters.collection]);

  useEffect(() => {
    clearSelection();
    setItems([]);
    setTotalCount(null);
    setHasMore(false);
  }, [activeFilters.q, activeFilters.collection]);

  useEffect(() => {
    getJson("/api/collections?limit=500")
      .then((res) => setCollectionOptions(res.items || []))
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const filteredCollectionOptions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    const base = collectionOptions
      .map((c) => c?.title || c?.handle || "")
      .filter(Boolean);
    const unique = Array.from(new Set(base));
    if (!q) return unique.slice(0, 8);
    return unique.filter((label) => label.toLowerCase().includes(q)).slice(0, 8);
  }, [collectionOptions, searchInput]);

  const canPrev = page > 1;
  const canNext = totalCount == null ? hasMore : offset + items.length < totalCount;

  function getCollectionLabels(item) {
    const raw = Array.isArray(item?.collections)
      ? item.collections
      : Array.isArray(item?.data?.collections)
        ? item.data.collections
        : [];

    return raw
      .map((collectionItem) => collectionItem?.title || collectionItem?.handle || "")
      .filter(Boolean);
  }

  const sortedItems = useMemo(() => {
    const list = [...items];
    const dir = sortDir === "asc" ? 1 : -1;
    const getValue = (item) => {
      if (sortKey === "title") return item.title || "";
      if (sortKey === "handle") return item.handle || "";
      if (sortKey === "collections") return getCollectionLabels(item).join(", ");
      if (sortKey === "type") return item.productType || "";
      if (sortKey === "status") return item.status || "";
      return item.last_updated_at_source || "";
    };
    list.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va === vb) return 0;
      return va > vb ? dir : -dir;
    });
    return list;
  }, [items, sortKey, sortDir]);

  const pageIds = useMemo(() => sortedItems.map((item) => item.id).filter(Boolean), [sortedItems]);
  const selectionCount = selectedIds.size;
  const hasSelection = selectAllMatching || selectionCount > 0;
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selectAllMatching || selectedIds.has(id));

  const selectionSummary = useMemo(() => {
    if (selectAllMatching) {
      return totalCount > 0
        ? `已選取目前搜尋結果共 ${totalCount} 筆產品`
        : "已選取目前搜尋結果的全部產品";
    }
    return selectionCount > 0 ? `已勾選 ${selectionCount} 筆產品` : "尚未選取產品";
  }, [selectAllMatching, selectionCount, totalCount]);

  const inlineSelectionMessage = useMemo(() => {
    if (selectAllMatching) {
      const countLabel = totalCount > 0 ? `${totalCount} 筆` : "目前搜尋結果全部產品";
      return `已選取 ${countLabel}`;
    }
    if (selectionCount > 0) {
      return `已選取 ${selectionCount} 筆`;
    }
    return "";
  }, [selectAllMatching, selectionCount, totalCount]);

  const filtersSummary = useMemo(() => {
    const parts = [];
    if (activeFilters.q) parts.push(`關鍵字：${activeFilters.q}`);
    if (activeFilters.collection) parts.push(`Collection：${activeFilters.collection}`);
    return parts.length ? parts.join(" / ") : "未套用搜尋條件";
  }, [activeFilters]);

  function resetListForNewFilters() {
    clearSelection();
    setItems([]);
    setTotalCount(null);
    setHasMore(false);
  }

  function applySearch(nextValue = searchInput, nextMode = draftSearchMode) {
    const trimmed = nextValue.trim();
    const nextFilters = nextMode === "collection"
      ? { q: "", collection: trimmed }
      : { q: trimmed, collection: "" };
    const sameFilters =
      activeFilters.q === nextFilters.q &&
      activeFilters.collection === nextFilters.collection;

    if (!sameFilters) {
      resetListForNewFilters();
      setAppliedFilters(nextFilters);
    }

    if (page !== 1) {
      setPage(1);
    } else if (sameFilters) {
      fetchList();
    }

    setShowSearchSuggestions(false);
  }

  function handlePickCollectionSuggestion(label) {
    setSearchInput(label);
    setDraftSearchMode("collection");
    if (page !== 1) {
      setPage(1);
    }
    resetListForNewFilters();
    setAppliedFilters({ q: "", collection: label });
    setShowSearchSuggestions(false);
  }

  function buildRestorePayload(restoreAt) {
    const body = {
      target: { restore_at: restoreAt },
      applyVariants: true,
      applyTranslations: true,
      applyMetafields: true,
      applyCollections: true,
    };

    if (selectAllMatching) {
      body.selection = {
        mode: "all_matching",
        filters: {
          ...(activeFilters.q ? { q: activeFilters.q } : {}),
          ...(activeFilters.collection ? { collection: activeFilters.collection } : {}),
        },
      };
    } else {
      body.product_ids = Array.from(selectedIds);
    }

    return body;
  }

  function openDetail(item) {
    navigate(`/backup_v2/${encodeURIComponent(item.id)}`);
  }

  function toggleItemSelection(productId) {
    if (!productId) return;

    if (selectAllMatching) {
      const next = new Set(pageIds);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      setSelectAllMatching(false);
      setSelectedIds(next);
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
    setCountLoading(false);
  }

  async function handleSelectAllMatching() {
    setCountLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        ...(activeFilters.q ? { q: activeFilters.q } : {}),
        ...(activeFilters.collection ? { collection: activeFilters.collection } : {}),
      });
      const res = await getJson(`/api/products/count?${qs.toString()}`);
      setTotalCount(Number(res.total) || 0);
      setSelectAllMatching(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || "無法取得搜尋結果總筆數");
    } finally {
      setCountLoading(false);
    }
  }

  function togglePageSelection() {
    if (pageIds.length === 0) return;

    if (selectAllMatching) {
      clearSelection();
      return;
    }

    if (pageAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }

    const next = new Set(selectedIds);
    pageIds.forEach((id) => next.add(id));
    setSelectedIds(next);
  }

  async function handlePreview(restoreAt) {
    const res = await postJson("/api/products/restore-batch-preview", buildRestorePayload(restoreAt));
    return res.preview;
  }

  async function handleExportPreview(restoreAt) {
    const resp = await apiFetch("/api/products/restore-batch-preview/export.csv", {
      method: "POST",
      body: JSON.stringify(buildRestorePayload(restoreAt)),
    });
    if (!resp.ok) throw new Error(`預覽匯出失敗 (${resp.status})`);
    const blob = await resp.blob();
    downloadBlob(`batch-restore-preview-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`, blob);
  }

  async function handleSubmitBatchRestore(restoreAt) {
    return postJson("/api/products/restore-batch", buildRestorePayload(restoreAt));
  }

  function handleOpenLogs(requestId) {
    const qs = requestId ? `?q=${encodeURIComponent(requestId)}` : "";
    navigate(`/operation_logs${qs}`);
  }

  return (
    <>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">產品備份</h1>
            <p className="text-sm text-slate-500 mt-1">
              透過新版 API 取得產品清單（簡表），支援分頁切換與批次還原。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setDraftSearchMode("keyword");
                    setShowSearchSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applySearch();
                    }
                  }}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSearchSuggestions(false), 100);
                  }}
                  placeholder="搜尋關鍵字或選擇 Collection"
                  className="w-72 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                />
                {showSearchSuggestions && (searchInput.trim() || filteredCollectionOptions.length > 0) && (
                  <div className="absolute left-0 right-0 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg z-10">
                    {searchInput.trim() && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setDraftSearchMode("keyword");
                          applySearch(searchInput, "keyword");
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span>搜尋關鍵字：{searchInput.trim()}</span>
                        <span className="text-xs text-slate-400">title / handle / SKU</span>
                      </button>
                    )}
                    {filteredCollectionOptions.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handlePickCollectionSuggestion(label)}
                        className="flex w-full items-center justify-between border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span>{label}</span>
                        <span className="text-xs text-emerald-600">Collection</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  applySearch();
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                搜尋
              </button>
            </div>
            <label className="text-sm text-slate-600">
              每頁筆數
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
                className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={fetchList}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              重新整理
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800">{selectionSummary}</div>
              <div className="text-xs text-slate-500 mt-1">{filtersSummary}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={!hasSelection}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                清除選取
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasSelection) {
                    window.alert("請先勾選要還原的產品。");
                    return;
                  }
                  setShowBatchRestore(true);
                }}
                disabled={!hasSelection}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                批次還原
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              顯示第 <span className="font-medium text-slate-800">{offset + 1}</span> -
              <span className="font-medium text-slate-800"> {offset + items.length}</span> 筆
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev || loading}
                className={`rounded-lg px-3 py-1.5 text-sm border ${
                  canPrev && !loading
                    ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                    : "border-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                上一頁
              </button>
              <div className="text-sm text-slate-500">第 {page} 頁</div>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext || loading}
                className={`rounded-lg px-3 py-1.5 text-sm border ${
                  canNext && !loading
                    ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                    : "border-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                下一頁
              </button>
            </div>
          </div>

          {error && (
            <div className="px-5 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                {hasSelection ? (
                  <tr>
                    <th colSpan={7} className="px-5 py-3 font-medium">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
                        <input
                          type="checkbox"
                          checked={pageAllSelected}
                          onChange={togglePageSelection}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="font-medium text-slate-700">{inlineSelectionMessage}</span>
                        {hasSearchFilters && !selectAllMatching && (
                          <button
                            type="button"
                            onClick={handleSelectAllMatching}
                            disabled={countLoading}
                            className="text-amber-700 hover:text-amber-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            {countLoading ? "計算總筆數中..." : "全選此搜尋結果"}
                          </button>
                        )}
                        {selectAllMatching && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(selectedIds);
                              pageIds.forEach((id) => next.add(id));
                              setSelectAllMatching(false);
                              setSelectedIds(next);
                            }}
                            className="text-slate-500 hover:text-slate-700 hover:underline"
                          >
                            改回只選本頁
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>
                ) : (
                  <tr>
                    <th className="w-12 text-left px-5 py-3 font-medium">
                      <input
                        type="checkbox"
                        checked={pageAllSelected}
                        onChange={togglePageSelection}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </th>
                    {[
                      { key: "title", label: "Title" },
                      { key: "handle", label: "Handle" },
                      { key: "collections", label: "Collections" },
                      { key: "type", label: "Type" },
                      { key: "status", label: "Status" },
                      { key: "updated", label: "Updated" },
                    ].map((col) => (
                      <th key={col.key} className="text-left px-5 py-3 font-medium">
                        <button
                          onClick={() => {
                            if (sortKey === col.key) {
                              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                            } else {
                              setSortKey(col.key);
                              setSortDir("asc");
                            }
                          }}
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
                        >
                          {col.label}
                          <span className="text-xs text-slate-400">
                            {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-5 py-6 text-slate-400" colSpan={7}>
                      載入中...
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td className="px-5 py-6 text-slate-400" colSpan={7}>
                      沒有資料
                    </td>
                  </tr>
                )}

                {!loading &&
                  sortedItems.map((item) => {
                    const checked = selectAllMatching || selectedIds.has(item.id);
                    return (
                      <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-5 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItemSelection(item.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => openDetail(item)}
                            className="text-left"
                            title="點擊查看完整資料"
                          >
                            <div className="font-medium text-slate-800">{item.title || "—"}</div>
                            <div className="text-xs text-slate-400">{item.id}</div>
                          </button>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{item.handle}</td>
                        <td className="px-5 py-3 text-slate-600">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {getCollectionLabels(item).length > 0 ? (
                              getCollectionLabels(item).map((label) => (
                                <span
                                  key={`${item.id}-${label}`}
                                  className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-100"
                                >
                                  {label}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{item.productType || "—"}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            {item.status || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {item.last_updated_at_source ? new Date(item.last_updated_at_source).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <BatchRestoreModal
        open={showBatchRestore}
        onClose={() => setShowBatchRestore(false)}
        selectionSummary={selectionSummary}
        filtersSummary={filtersSummary}
        selectionNeedsPreviewCount={selectAllMatching && totalCount == null}
        onPreview={handlePreview}
        onExportPreview={handleExportPreview}
        onSubmit={handleSubmitBatchRestore}
        onOpenLogs={handleOpenLogs}
      />
    </>
  );
}
