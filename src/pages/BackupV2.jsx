import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../lib/api";

const PAGE_SIZES = [20, 50, 100];

export default function BackupV2() {
  const { getJson } = useApi();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("");
  const [collectionOptions, setCollectionOptions] = useState([]);
  const [showCollectionOptions, setShowCollectionOptions] = useState(false);
  const [sortKey, setSortKey] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const q = search.trim();
      const collectionValue = collection.trim();
      const qs = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
        ...(q ? { q } : {}),
        ...(collectionValue ? { collection: collectionValue } : {}),
      });
      const res = await getJson(`/api/products?${qs.toString()}`);
      setItems(res.items || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "載入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, pageSize, search, collection]);

  useEffect(() => {
    getJson("/api/collections?limit=500")
      .then((res) => setCollectionOptions(res.items || []))
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const filteredCollectionOptions = useMemo(() => {
    const q = collection.trim().toLowerCase();
    const base = collectionOptions
      .map((c) => c?.title || c?.handle || "")
      .filter(Boolean);
    const unique = Array.from(new Set(base));
    if (!q) return unique.slice(0, 20);
    return unique.filter((label) => label.toLowerCase().includes(q)).slice(0, 20);
  }, [collectionOptions, collection]);

  const canPrev = page > 1;
  const canNext = items.length === pageSize;
  const sortedItems = useMemo(() => {
    const list = [...items];
    const dir = sortDir === "asc" ? 1 : -1;
    const getValue = (item) => {
      if (sortKey === "title") return item.title || "";
      if (sortKey === "handle") return item.handle || "";
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

  const openDetail = async (item) => {
    navigate(`/backup_v2/${encodeURIComponent(item.id)}`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">產品備份</h1>
          <p className="text-sm text-slate-500 mt-1">
            透過新版 API 取得產品清單（簡表），支援分頁切換。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="搜尋 title / handle / SKU"
              className="w-60 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
            />
            <div className="relative">
              <input
                value={collection}
                onChange={(e) => {
                  setPage(1);
                  setCollection(e.target.value);
                  setShowCollectionOptions(true);
                }}
                onFocus={() => setShowCollectionOptions(true)}
                onBlur={() => {
                  setTimeout(() => setShowCollectionOptions(false), 100);
                }}
                placeholder="Collection"
                className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              />
              {showCollectionOptions && filteredCollectionOptions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg z-10">
                  {filteredCollectionOptions.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setPage(1);
                        setCollection(label);
                        setShowCollectionOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setPage(1);
                fetchList();
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
              <tr>
                {[
                  { key: "title", label: "Title" },
                  { key: "handle", label: "Handle" },
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
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-5 py-6 text-slate-400" colSpan={5}>
                    載入中...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-5 py-6 text-slate-400" colSpan={5}>
                    沒有資料
                  </td>
                </tr>
              )}

              {!loading &&
                sortedItems.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60">
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
                ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
