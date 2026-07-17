import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApi } from '../../lib/api';

// PChome 庫存 API 與主後端不同網域，獨立設定 base
const PCHOME_API_BASE = import.meta.env.VITE_PCHOME_API_BASE;

// 出貨方式顯示對應
const SHIPTYPE_LABELS = {
  Trans: '轉單',
  Consign: '寄倉',
};
const shiptypeLabel = (value) => SHIPTYPE_LABELS[value] || value;

// 出貨方式排序順序（寄倉 在 轉單 前面）
const SHIPTYPE_ORDER = {
  Consign: 0,
  Trans: 1,
};
const shiptypeRank = (value) =>
  value in SHIPTYPE_ORDER ? SHIPTYPE_ORDER[value] : 99;

// 只有「轉單」商品可以修改庫存
const EDITABLE_SHIPTYPE = 'Trans';
const isEditableItem = (item) => item?.shiptype === EDITABLE_SHIPTYPE;

export default function PchomeInventory() {
  const { getJson, postJson } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [overlayHeight, setOverlayHeight] = useState(0);

  // 搜尋 / 排序 / 分頁
  const [searchText, setSearchText] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [shiptypeFilter, setShiptypeFilter] = useState('all');
  const [sortConfigs, setSortConfigs] = useState([{ key: 'qty', direction: 'desc' }]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 庫存編輯狀態
  const [editingId, setEditingId] = useState(null); // 目前開啟輸入框的列（一次只能一列）
  const [editValue, setEditValue] = useState('');
  const [edits, setEdits] = useState({}); // 待送出的變更 { [id]: newQty }
  const [submitting, setSubmitting] = useState(false);

  // --- 資料讀取 ---
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const uniqueStamp = Date.now();
      // 跨網域呼叫，不帶 cookie（改用 X-API-Key / Bearer 驗證）
      const res = await getJson(`${PCHOME_API_BASE}/inventory/pchome?_=${uniqueStamp}`, {
        credentials: 'omit',
      });
      setItems(Array.isArray(res?.items) ? res.items : []);
      // 重新載入資料後，清掉尚未送出的編輯狀態，避免對應到舊資料
      setEdits({});
      setEditingId(null);
      setEditValue('');
    } catch (err) {
      console.error(err);
      setItems([]);
      setError('資料載入失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading overlay 高度量測（沿用 Amazon Dashboard 作法）
  useEffect(() => {
    if (!loading) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const measureHeight = () => {
      setOverlayHeight(
        Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          window.innerHeight
        )
      );
    };

    measureHeight();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('resize', measureHeight);

    return () => {
      window.removeEventListener('resize', measureHeight);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [loading]);

  // --- KPI ---
  const kpi = useMemo(() => {
    const totalItems = items.length;
    const totalQty = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
    const outOfStock = items.filter((it) => (Number(it.qty) || 0) <= 0).length;
    return { totalItems, totalQty, outOfStock };
  }, [items]);

  // 出貨方式選項（依資料動態產生，並依自訂順序排序）
  const shiptypeOptions = useMemo(() => {
    return Array.from(new Set(items.map((it) => it.shiptype).filter(Boolean)))
      .sort((a, b) => shiptypeRank(a) - shiptypeRank(b));
  }, [items]);

  // --- 列表邏輯 (搜尋 -> 篩選 -> 排序) ---
  const processedItems = useMemo(() => {
    let data = [...items];

    if (searchText) {
      const lower = searchText.toLowerCase().trim();
      data = data.filter((it) =>
        String(it.id || '').toLowerCase().includes(lower) ||
        String(it.vendor_pid || '').toLowerCase().includes(lower) ||
        String(it.name || '').toLowerCase().includes(lower)
      );
    }

    if (stockFilter === 'in_stock') {
      data = data.filter((it) => (Number(it.qty) || 0) > 0);
    } else if (stockFilter === 'out_of_stock') {
      data = data.filter((it) => (Number(it.qty) || 0) <= 0);
    }

    if (shiptypeFilter !== 'all') {
      data = data.filter((it) => it.shiptype === shiptypeFilter);
    }

    if (sortConfigs.length > 0) {
      data.sort((a, b) => {
        for (const sortConfig of sortConfigs) {
          let aValue = a[sortConfig.key];
          let bValue = b[sortConfig.key];

          if (sortConfig.key === 'qty') {
            aValue = Number(aValue) || 0;
            bValue = Number(bValue) || 0;
          } else if (sortConfig.key === 'shiptype') {
            // 依自訂順序排序：寄倉(Consign) 在 轉單(Trans) 前面
            aValue = shiptypeRank(aValue);
            bValue = shiptypeRank(bValue);
          } else {
            aValue = aValue || '';
            bValue = bValue || '';
          }

          if (typeof aValue === 'string' || typeof bValue === 'string') {
            const result = sortConfig.direction === 'asc'
              ? String(aValue).localeCompare(String(bValue))
              : String(bValue).localeCompare(String(aValue));
            if (result !== 0) return result;
            continue;
          }

          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return data;
  }, [items, searchText, stockFilter, shiptypeFilter, sortConfigs]);

  const totalCount = processedItems.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedItems.slice(start, start + pageSize);
  }, [processedItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, stockFilter, shiptypeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleSort = (key, additive = false) => {
    setSortConfigs((prev) => {
      const existing = prev.find((item) => item.key === key);
      const nextDirection = existing?.direction === 'desc' ? 'asc' : 'desc';
      const updatedItem = { key, direction: nextDirection };

      if (!additive) return [updatedItem];
      if (!existing) return [...prev, { key, direction: 'desc' }];
      return prev.map((item) => (item.key === key ? updatedItem : item));
    });
  };

  // --- 庫存編輯（先累積變更，最後一次送出） ---
  const editCount = Object.keys(edits).length;

  const startEdit = (item) => {
    if (!isEditableItem(item)) return;
    setEditingId(item.id);
    // 若已有待送出變更，帶入該值，否則帶原值
    const current = item.id in edits ? edits[item.id] : item.qty;
    setEditValue(String(current ?? ''));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // 確認單列變更 → 存入待送出清單（尚未呼叫 API）
  const confirmEdit = (item) => {
    const nextQty = Number(editValue);
    if (!Number.isInteger(nextQty) || nextQty < 0) {
      alert('請輸入 0 或正整數的庫存數量。');
      return;
    }
    setEdits((prev) => {
      const copy = { ...prev };
      if (nextQty === Number(item.qty)) {
        delete copy[item.id]; // 與原值相同 → 視為未變更
      } else {
        copy[item.id] = nextQty;
      }
      return copy;
    });
    cancelEdit();
  };

  // 還原單列的待送出變更
  const revertEdit = (id) => {
    setEdits((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // 清除全部待送出變更
  const clearAllEdits = () => {
    if (editCount === 0) return;
    if (!confirm('確定要清除所有尚未送出的庫存變更嗎？')) return;
    setEdits({});
    cancelEdit();
  };

  // 一次送出所有待送出變更
  const submitEdits = async () => {
    if (editCount === 0) return;
    if (!confirm(`確定要送出 ${editCount} 筆庫存變更嗎？`)) return;

    setSubmitting(true);
    try {
      const payload = Object.entries(edits).map(([id, qty]) => ({ id, qty }));

      // TODO: 批次更新庫存 API 尚未完成，待後端提供後改為實際呼叫，例如：
      // await postJson(`${PCHOME_API_BASE}/inventory/pchome/batch`, { items: payload }, { credentials: 'omit' });
      console.warn('[PChome] 批次更新庫存 API 尚未串接，暫時只更新前端顯示', payload);

      // 先在前端更新顯示（API 完成後改由回傳結果或重新 fetch 更新）
      setItems((prev) =>
        prev.map((it) => (it.id in edits ? { ...it, qty: edits[it.id] } : it))
      );
      setEdits({});
      cancelEdit();
    } catch (err) {
      console.error(err);
      alert('送出失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  const SortIcon = ({ columnKey }) => {
    const currentSort = sortConfigs.find((item) => item.key === columnKey);
    const sortPriority = sortConfigs.findIndex((item) => item.key === columnKey);

    if (!currentSort) return <span className="text-slate-300 ml-1 text-[10px]">↕</span>;

    return (
      <span className="ml-1 inline-flex items-center gap-1 text-indigo-600 text-[10px]">
        <span>{currentSort.direction === 'asc' ? '▲' : '▼'}</span>
        {sortConfigs.length > 1 && <span>{sortPriority + 1}</span>}
      </span>
    );
  };

  return (
    <div className="relative max-w-7xl mx-auto p-6 space-y-8">
      {loading && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="absolute left-0 top-0 z-[80] w-full bg-white/80 backdrop-blur-[1px]"
            style={{ height: `${overlayHeight || window.innerHeight}px` }}
          />
          <div className="fixed inset-0 z-[90] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-lg">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">資料載入中</p>
                <p className="text-xs text-slate-500">正在讀取 PChome 庫存，請稍候...</p>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">PChome 庫存</h1>
          <p className="text-slate-500 text-sm">數據來源：PChome 庫存 API</p>
        </div>
        <div className="flex items-center gap-2">
          {editCount > 0 && (
            <button
              onClick={clearAllEdits}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              清除變更
            </button>
          )}
          <button
            onClick={submitEdits}
            disabled={submitting || editCount === 0}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {submitting ? '送出中...' : `送出修改${editCount > 0 ? ` (${editCount})` : ''}`}
          </button>
          <button
            onClick={fetchData}
            disabled={loading || submitting}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            🔄 重新整理
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 更新 API 尚未完成的提醒 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        ⚠️ 更新庫存 API 尚未完成。目前僅「轉單」商品可修改庫存，變更會先累積，按「送出修改」後也只會更新畫面顯示，重新整理後會還原、不會寫回後端。
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="品項數" value={kpi.totalItems.toLocaleString()} color="text-blue-600" />
        <KPICard title="總庫存量" value={kpi.totalQty.toLocaleString()} color="text-emerald-600" />
        <KPICard title="缺貨品項" value={kpi.outOfStock.toLocaleString()} color="text-red-600" />
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-700">庫存清單</h3>
            <p className="text-xs text-slate-400 mt-1">可直接搜尋，並用 Shift + 點擊欄位標題加入多重排序</p>
          </div>

          <div className="flex w-full sm:w-auto flex-col lg:flex-row gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="搜尋 ID / 廠商料號 / 名稱..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">全部庫存狀態</option>
              <option value="in_stock">只看有庫存</option>
              <option value="out_of_stock">只看缺貨</option>
            </select>

            <select
              value={shiptypeFilter}
              onChange={(e) => setShiptypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">全部出貨方式</option>
              {shiptypeOptions.map((st) => (
                <option key={st} value={st}>{shiptypeLabel(st)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('id', e.shiftKey)}>
                  商品 ID <SortIcon columnKey="id" />
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('vendor_pid', e.shiftKey)}>
                  廠商料號 <SortIcon columnKey="vendor_pid" />
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition select-none" onClick={(e) => handleSort('name', e.shiftKey)}>
                  名稱 <SortIcon columnKey="name" />
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('shiptype', e.shiftKey)}>
                  出貨方式 <SortIcon columnKey="shiptype" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('qty', e.shiftKey)}>
                  庫存量 <SortIcon columnKey="qty" />
                </th>
                <th className="px-6 py-3 text-center select-none whitespace-nowrap">操作</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((it) => {
                const originalQty = Number(it.qty) || 0;
                const isEditing = editingId === it.id;
                const editable = isEditableItem(it);
                const hasPending = it.id in edits;
                const displayQty = hasPending ? Number(edits[it.id]) : originalQty;
                return (
                  <tr
                    key={it.id}
                    className={`transition ${
                      isEditing ? 'bg-indigo-50/60' : hasPending ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-6 py-3 font-mono text-xs text-slate-700">{it.id}</td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{it.vendor_pid}</td>
                    <td className="px-6 py-3 text-slate-700">{it.name}</td>
                    <td className="px-6 py-3 text-slate-600">{shiptypeLabel(it.shiptype)}</td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={editValue}
                          autoFocus
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEdit(it);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="w-24 px-2 py-1 text-right rounded-lg border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                        />
                      ) : hasPending ? (
                        <span className="inline-flex items-center justify-end gap-2">
                          <span className="text-slate-400 line-through font-normal">{originalQty.toLocaleString()}</span>
                          <span className="text-amber-600">➜</span>
                          <span className={displayQty <= 0 ? 'text-red-500' : 'text-emerald-600'}>
                            {displayQty.toLocaleString()}
                          </span>
                        </span>
                      ) : (
                        <span className={displayQty <= 0 ? 'text-red-500' : 'text-emerald-600'}>
                          {displayQty.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => confirmEdit(it)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition"
                          >
                            確認
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 bg-white text-xs hover:bg-slate-50 transition"
                          >
                            取消
                          </button>
                        </div>
                      ) : !editable ? (
                        <span className="text-xs text-slate-400">不可修改</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(it)}
                            disabled={editingId !== null || submitting}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 bg-white text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                          >
                            {hasPending ? '再次修改' : '修改庫存'}
                          </button>
                          {hasPending && (
                            <button
                              onClick={() => revertEdit(it.id)}
                              disabled={editingId !== null || submitting}
                              className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 bg-white text-xs hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                              還原
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    {loading ? '資料載入中...' : '無符合條件的庫存資料'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分頁控制 */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-sm text-slate-500">
            顯示 {totalCount > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} 到 {Math.min(currentPage * pageSize, totalCount)} 筆，共 {totalCount} 筆
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition"
            >
              上一頁
            </button>
            <span className="px-2 text-sm text-slate-600 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition"
            >
              下一頁
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, color }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
