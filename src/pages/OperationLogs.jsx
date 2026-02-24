import { Fragment, useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api";

function fmtTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function fmtMs(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${n} ms`;
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "success") return "bg-green-100 text-green-700 border-green-200";
  if (s === "error") return "bg-red-100 text-red-700 border-red-200";
  if (s === "running") return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "accepted" || s === "started") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (["accepted", "started", "running"].includes(s)) return "進行中";
  if (s === "success") return "已完成";
  if (s === "error" || s === "validation_error") return "失敗";
  return s || "-";
}

export default function OperationLogs() {
  const api = useApi();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [detailMap, setDetailMap] = useState({});
  const [detailLoading, setDetailLoading] = useState({});
  const [filters, setFilters] = useState({
    status: "",
    route: "",
    q: "",
    limit: 100,
  });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.status) p.set("status", filters.status);
    if (filters.route) p.set("route", filters.route);
    if (filters.q) p.set("q", filters.q);
    if (filters.limit) p.set("limit", String(filters.limit));
    return p.toString();
  }, [filters]);

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getJson(`/api/operation-logs?${queryString}`);
      setRows(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      setError(err?.message || "讀取紀錄失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function toggleDetail(requestId) {
    if (expandedId === requestId) {
      setExpandedId("");
      return;
    }
    setExpandedId(requestId);
    if (detailMap[requestId] || detailLoading[requestId]) return;

    setDetailLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      const data = await api.getJson(`/api/operation-logs/${encodeURIComponent(requestId)}`);
      setDetailMap((prev) => ({ ...prev, [requestId]: data }));
    } catch (err) {
      setDetailMap((prev) => ({
        ...prev,
        [requestId]: { ok: false, message: err?.message || "讀取明細失敗", events: [] },
      }));
    } finally {
      setDetailLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  }

  async function handleExportCsv() {
    try {
      const resp = await api.fetch(`/api/operation-logs-export.csv?${queryString}`, { method: "GET" });
      if (!resp.ok) throw new Error(`匯出失敗 (${resp.status})`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `operation_logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.message || "匯出失敗");
    }
  }

  async function handleExportSingle(requestId) {
    try {
      const resp = await api.fetch(`/api/operation-logs/${encodeURIComponent(requestId)}/export.csv`, {
        method: "GET",
      });
      if (!resp.ok) throw new Error(`匯出失敗 (${resp.status})`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `operation-log-${requestId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.message || "單筆匯出失敗");
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">結果紀錄</h1>
            <p className="text-sm text-slate-500 mt-1">
              查看 `API_router` 任務送出與執行狀態（含背景流程）
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadList}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm"
            >
              重新整理
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm"
            >
              匯出 CSV（Excel 可開啟）
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <input
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            placeholder="搜尋 requestId / route / email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部狀態</option>
            <option value="success">success</option>
            <option value="error">error</option>
            <option value="running">running</option>
            <option value="accepted">accepted</option>
            <option value="started">started</option>
            <option value="validation_error">validation_error</option>
          </select>
          <input
            value={filters.route}
            onChange={(e) => setFilters((p) => ({ ...p, route: e.target.value }))}
            placeholder="route 篩選，例如 /productUpdater"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={filters.limit}
            onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value) }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={50}>50 筆</option>
            <option value={100}>100 筆</option>
            <option value={200}>200 筆</option>
            <option value={500}>500 筆</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          {loading ? "載入中..." : `共 ${total} 筆（目前顯示 ${rows.length} 筆）`}
          {error ? <span className="text-red-600 ml-3">{error}</span> : null}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">時間</th>
                <th className="py-2 pr-3">狀態</th>
                <th className="py-2 pr-3">流程</th>
                <th className="py-2 pr-3">路由</th>
                <th className="py-2 pr-3">筆數</th>
                <th className="py-2 pr-3">使用者</th>
                <th className="py-2 pr-3">耗時</th>
                <th className="py-2 pr-3">訊息</th>
                <th className="py-2 pr-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isOpen = expandedId === row.requestId;
                const detail = detailMap[row.requestId];
                const events = Array.isArray(detail?.events) ? detail.events : [];
                return (
                  <Fragment key={row.requestId}>
                    <tr
                      onClick={() => toggleDetail(row.requestId)}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer align-top"
                    >
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtTime(row.updatedAt || row.startedAt)}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs ${statusClass(row.status)}`}>
                          {statusLabel(row.status)}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">{row.status || "-"}</div>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{row.operationKey || "-"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{row.method} {row.routePath}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{row.rowCount ?? row.itemCount ?? "-"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{row.user?.email || "-"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtMs(row.durationMs)}</td>
                      <td className="py-2 pr-3 max-w-[360px]">
                        <div className="truncate" title={row.message || ""}>{row.message || "-"}</div>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportSingle(row.requestId);
                          }}
                          className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs"
                        >
                          下載 CSV
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <td colSpan={9} className="p-3">
                          {detailLoading[row.requestId] ? (
                            <div className="text-sm text-slate-500">載入明細中...</div>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="text-xs font-semibold text-slate-500 mb-2">基本資訊</div>
                                <div className="text-xs text-slate-700 space-y-1">
                                  <div><span className="text-slate-400">requestId:</span> {row.requestId}</div>
                                  <div><span className="text-slate-400">startedAt:</span> {fmtTime(row.startedAt)}</div>
                                  <div><span className="text-slate-400">updatedAt:</span> {fmtTime(row.updatedAt)}</div>
                                  <div><span className="text-slate-400">eventCount:</span> {row.eventCount ?? events.length}</div>
                                  <div><span className="text-slate-400">IP:</span> {row.clientIp || "-"}</div>
                                </div>
                                {row.payloadSummary ? (
                                  <pre className="mt-3 text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto">
                                    {JSON.stringify(row.payloadSummary, null, 2)}
                                  </pre>
                                ) : null}
                                {row.error ? (
                                  <pre className="mt-3 text-xs bg-red-950 text-red-100 rounded-lg p-3 overflow-auto">
                                    {JSON.stringify(row.error, null, 2)}
                                  </pre>
                                ) : null}
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="text-xs font-semibold text-slate-500 mb-2">事件時間軸</div>
                                {events.length === 0 ? (
                                  <div className="text-sm text-slate-500">
                                    {detail?.message || "沒有事件明細"}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {events.map((e) => (
                                      <div key={e.eventId} className="border border-slate-100 rounded-lg p-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs ${statusClass(e.status)}`}>
                                            {e.status}
                                          </span>
                                          <span className="text-xs text-slate-400">{fmtTime(e.timestamp)}</span>
                                        </div>
                                        <div className="text-sm text-slate-700 mt-1">{e.message || "-"}</div>
                                        {e.error?.message ? (
                                          <div className="text-xs text-red-600 mt-1">{e.error.message}</div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    尚無紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
