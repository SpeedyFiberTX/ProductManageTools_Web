import { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function AmazonDashboard() {
  const { getJson } = useApi();
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);

  // --- 1. 狀態控制區 ---
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  // 搜尋、排序、分頁狀態
  const [searchText, setSearchText] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'sales', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // 每頁顯示 10 筆

  // --- 2. 資料讀取 ---
  useEffect(() => {
    fetchData();
    setCurrentPage(1); // 切換日期時也回到第一頁，避免分頁也錯
  }, [dateRange.start, dateRange.end]);

  const fetchData = async () => {
    setLoading(true);

    const uniqueStamp = Date.now(); // 🔥強制避免 cache 或重複請求問題

    try {
      const res = await getJson(`/api/amazon/stats?start=${dateRange.start}&end=${dateRange.end}&_=${uniqueStamp}`);
      if (res.ok) {
        setRawData(res.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 3. 數據加工 (Aggregation) ---
  const { chartData, kpi, allProductsAggregated } = useMemo(() => {
    if (!rawData.length) return { chartData: [], kpi: {}, allProductsAggregated: [] };

    const dailyMap = new Map();
    const productMap = new Map();

    let totalSales = 0;
    let totalUnits = 0;
    let totalSessions = 0;

    rawData.forEach(row => {
      // A. 每日加總 (圖表用)
      const d = row.date;
      if (!dailyMap.has(d)) {
        dailyMap.set(d, { date: d, sales: 0, units: 0, sessions: 0 });
      }
      const day = dailyMap.get(d);
      day.sales += (row.total_sales || 0);
      day.units += (row.units_sold || 0);
      day.sessions += (row.sessions || 0);

      // B. 商品加總 (表格用)
      const asin = row.asin;
      if (!productMap.has(asin)) {
        productMap.set(asin, {
          asin,
          title: row.amazon_products?.title || asin,
          // 🟢 確保欄位存在，否則給預設值
          channel: row.amazon_products?.fulfillment_channel || 'N/A',
          inventory: row.amazon_products?.inventory_quantity || 0,
          sales: 0,
          units: 0,
          sessions: 0,
          page_views: 0
        });
      }
      const prod = productMap.get(asin);
      prod.sales += (row.total_sales || 0);
      prod.units += (row.units_sold || 0);
      prod.sessions += (row.sessions || 0);
      prod.page_views += (row.page_views || 0);

      // C. 全局加總
      totalSales += (row.total_sales || 0);
      totalUnits += (row.units_sold || 0);
      totalSessions += (row.sessions || 0);
    });

    const sortedChart = Array.from(dailyMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    const allProducts = Array.from(productMap.values());

    const conversionRate = totalSessions > 0 ? ((totalUnits / totalSessions) * 100).toFixed(2) : 0;

    return {
      chartData: sortedChart,
      allProductsAggregated: allProducts,
      kpi: {
        sales: totalSales.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        units: totalUnits.toLocaleString(),
        sessions: totalSessions.toLocaleString(),
        conversion: conversionRate + '%'
      }
    };
  }, [rawData]);

  // --- 4. 列表邏輯 (搜尋 -> 排序 -> 分頁) ---

  const processedProducts = useMemo(() => {
    let data = [...allProductsAggregated];

    // A. 搜尋功能
    if (searchText) {
      const lowerText = searchText.toLowerCase().trim();
      data = data.filter(p =>
        String(p.asin || '').toLowerCase().includes(lowerText) ||
        String(p.title || '').toLowerCase().includes(lowerText)
      );
    }

    // B. 排序功能
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // 特殊處理：如果是 title，處理空值
        if (sortConfig.key === 'title') {
          aValue = aValue || '';
          bValue = bValue || '';
        }

        // 字串比較
        if (typeof aValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // 數字比較
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [allProductsAggregated, searchText, sortConfig]);

  // C. 分頁計算
  const totalItems = processedProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedProducts.slice(start, start + pageSize);
  }, [processedProducts, currentPage]);

  // 當搜尋條件改變時，重置回第一頁
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  // 排序切換處理
  const handleSort = (key) => {
    let direction = 'desc';
    // 如果點擊相同欄位，且原本是 desc，則切換為 asc
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // 排序箭頭元件
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="text-slate-300 ml-1 text-[10px]">↕</span>;
    return sortConfig.direction === 'asc'
      ? <span className="ml-1 text-indigo-600 text-[10px]">▲</span>
      : <span className="ml-1 text-indigo-600 text-[10px]">▼</span>;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Amazon 營運總覽</h1>
          <p className="text-slate-500 text-sm">數據來源：手動上傳 Business Reports</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
            className="text-sm outline-none text-slate-600"
          />
          <span className="text-slate-400">➜</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
            className="text-sm outline-none text-slate-600"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Sales" value={kpi.sales || '$0.00'} color="text-emerald-600" />
        <KPICard title="Units Sold" value={kpi.units || '0'} color="text-blue-600" />
        <KPICard title="Sessions" value={kpi.sessions || '0'} color="text-orange-600" />
        <KPICard title="Conversion Rate (Units / Sessions)" value={kpi.conversion || '0%'} color="text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 銷售趨勢圖 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4">銷售趨勢 (Sales & Units)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales ($)" stroke="#10b981" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="units" name="Units" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 流量趨勢圖 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4">流量趨勢 (Sessions)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 商品報表與搜尋 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-700">商品銷售報表</h3>

          {/* 搜尋框 */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="搜尋 Title 或 ASIN..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition select-none w-[35%]" onClick={() => handleSort('title')}>
                  商品資訊 (ASIN / Title) <SortIcon columnKey="title" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={() => handleSort('inventory')}>
                  庫存 <SortIcon columnKey="inventory" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={() => handleSort('sessions')}>
                  Sessions <SortIcon columnKey="sessions" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={() => handleSort('page_views')}>
                  Page Views <SortIcon columnKey="page_views" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={() => handleSort('units')}>
                  銷量 <SortIcon columnKey="units" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={() => handleSort('sales')}>
                  金額 <SortIcon columnKey="sales" />
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((p) => (
                <tr key={p.asin} className="hover:bg-slate-50 transition group">
                  <td className="px-6 py-3 max-w-xs" title={p.title}>
                    <div
                      className="text-slate-400 text-xs overflow-auto whitespace-nowrap overflow-hidden hover:overflow-auto "
                      title={p.title}  // 滑鼠移上去會看到完整標題
                    >
                      {p.title}
                    </div>
                  </td>

                  <td className="px-6 py-3 text-right font-mono text-slate-700">
                    {p.inventory}
                  </td>

                  <td className="px-6 py-3 text-right text-slate-600">
                    {p.sessions?.toLocaleString() || 0}
                  </td>

                  <td className="px-6 py-3 text-right text-slate-600">
                    {p.page_views?.toLocaleString() || 0}
                  </td>

                  <td className="px-6 py-3 text-right font-medium text-blue-600">
                    {p.units}
                  </td>

                  <td className="px-6 py-3 text-right font-medium text-emerald-600">
                    {p.sales.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </td>
                </tr>
              ))}

              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    {loading ? '載入數據中...' : '無符合條件的商品'}
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* 分頁控制區 */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-sm text-slate-500">
            顯示 {totalItems > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} 到 {Math.min(currentPage * pageSize, totalItems)} 筆，共 {totalItems} 筆
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition"
            >
              上一頁
            </button>
            <span className="px-2 text-sm text-slate-600 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

// 小元件：KPI 卡片 (保持不變)
function KPICard({ title, value, color }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}