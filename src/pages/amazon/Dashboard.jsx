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
  const pageSize = 10; // 每頁顯示筆數

  // --- 2. 資料讀取 ---
  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getJson(`/api/amazon/stats?start=${dateRange.start}&end=${dateRange.end}`);
      if (res.ok) {
        setRawData(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. 數據加工 (Aggregation) ---
  // 第一階段：將原始資料聚合為「每日圖表數據」與「產品列表總數據」
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

      // C. 全局加總 (KPI用)
      totalSales += (row.total_sales || 0);
      totalUnits += (row.units_sold || 0);
      totalSessions += (row.sessions || 0);
    });

    const sortedChart = Array.from(dailyMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    const allProducts = Array.from(productMap.values());
    
    const conversionRate = totalSessions > 0 ? ((totalUnits / totalSessions) * 100).toFixed(2) : 0;

    return {
      chartData: sortedChart,
      allProductsAggregated: allProducts, // 這裡回傳所有產品，不做切片
      kpi: {
        sales: totalSales.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        units: totalUnits.toLocaleString(),
        sessions: totalSessions.toLocaleString(),
        conversion: conversionRate + '%'
      }
    };
  }, [rawData]);

  // --- 4. 列表邏輯 (搜尋 -> 排序 -> 分頁) ---
  
  // A. 處理搜尋與排序
  const processedProducts = useMemo(() => {
    let data = [...allProductsAggregated];

    // 搜尋 (Search)
    if (searchText) {
      const lowerText = searchText.toLowerCase();
      data = data.filter(p => 
        p.asin.toLowerCase().includes(lowerText) || 
        (p.title && p.title.toLowerCase().includes(lowerText))
      );
    }

    // 排序 (Sort)
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [allProductsAggregated, searchText, sortConfig]);

  // B. 處理分頁 (Pagination)
  const totalPages = Math.ceil(processedProducts.length / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedProducts.slice(start, start + pageSize);
  }, [processedProducts, currentPage]);

  // 當搜尋條件改變時，重置回第一頁
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  // 排序處理函式
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
    if (sortConfig.key !== columnKey) return <span className="text-slate-300 ml-1">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-indigo-600">↑</span> : <span className="ml-1 text-indigo-600">↓</span>;
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
        <KPICard title="總銷售額 (Sales)" value={kpi.sales || '$0.00'} color="text-emerald-600" />
        <KPICard title="銷售數量 (Units)" value={kpi.units || '0'} color="text-blue-600" />
        <KPICard title="流量 (Sessions)" value={kpi.sessions || '0'} color="text-orange-600" />
        <KPICard title="轉化率 (Conv.)" value={kpi.conversion || '0%'} color="text-purple-600" />
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
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} />
                <YAxis yAxisId="left" tick={{fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
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
                <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Legend />
                <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Product Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-700">商品銷售報表</h3>
          
          {/* 搜尋框 */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="搜尋 Title 或 ASIN..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
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
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                {/* 可排序的表頭 */}
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition select-none" onClick={() => handleSort('title')}>
                  商品資訊 (ASIN / Title) <SortIcon columnKey="title" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none" onClick={() => handleSort('sessions')}>
                  曝光 (Sessions) <SortIcon columnKey="sessions" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none" onClick={() => handleSort('page_views')}>
                  點擊 (Views) <SortIcon columnKey="page_views" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none" onClick={() => handleSort('units')}>
                  銷售數量 <SortIcon columnKey="units" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none" onClick={() => handleSort('sales')}>
                  銷售金額 <SortIcon columnKey="sales" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((p) => (
                <tr key={p.asin} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3 max-w-xs truncate" title={p.title}>
                    <div className="font-medium text-slate-700">{p.asin}</div>
                    <div className="text-slate-400 text-xs truncate">{p.title}</div>
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {p.sessions?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {p.page_views?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-blue-600">{p.units}</td>
                  <td className="px-6 py-3 text-right font-medium text-emerald-600">
                    {p.sales.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </td>
                </tr>
              ))}
              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    {loading ? '載入數據中...' : '無符合條件的商品'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分頁控制區 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100">
            <div className="text-sm text-slate-500">
              顯示 {((currentPage - 1) * pageSize) + 1} 到 {Math.min(currentPage * pageSize, processedProducts.length)} 筆，共 {processedProducts.length} 筆
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                上一頁
              </button>
              <span className="px-3 py-1 text-sm text-slate-600 font-medium flex items-center">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 小元件：KPI 卡片
function KPICard({ title, value, color }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}