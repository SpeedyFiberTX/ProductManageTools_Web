import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApi } from '../../lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function AmazonDashboard() {
  const { getJson } = useApi();
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [overlayHeight, setOverlayHeight] = useState(0);

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
  const [channelFilter, setChannelFilter] = useState('all');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [sortConfigs, setSortConfigs] = useState([{ key: 'sales', direction: 'desc' }]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // 每頁顯示 10 筆

  // --- 2. 資料讀取 ---
  useEffect(() => {
    fetchData();
    setCurrentPage(1); // 切換日期時也回到第一頁，避免分頁也錯
  }, [dateRange.start, dateRange.end]);

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
          sku: row.amazon_products?.sku || '',
          // 🟢 確保欄位存在，否則給預設值
          channel: row.amazon_products?.fulfillment_channel || 'N/A',
          fba_inventory: row.amazon_products?.inventory_quantity || 0,
          fbm_inventory: row.amazon_products?.fbm_quantity || 0,
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
  const channelOptions = useMemo(() => {
    return Array.from(
      new Set(
        allProductsAggregated
          .map(item => item.channel)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [allProductsAggregated]);

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

    // B. 結構化篩選
    if (channelFilter !== 'all') {
      data = data.filter(p => p.channel === channelFilter);
    }

    if (inventoryFilter === 'in_stock') {
      data = data.filter(p => (p.fba_inventory || 0) + (p.fbm_inventory || 0) > 0);
    }

    if (inventoryFilter === 'out_of_stock') {
      data = data.filter(p => (p.fba_inventory || 0) + (p.fbm_inventory || 0) === 0);
    }

    // C. 多重排序
    if (sortConfigs.length > 0) {
      data.sort((a, b) => {
        for (const sortConfig of sortConfigs) {
          let aValue = a[sortConfig.key];
          let bValue = b[sortConfig.key];

          // 特殊處理：如果是字串欄位，處理空值
          if (['title', 'channel'].includes(sortConfig.key)) {
            aValue = aValue || '';
            bValue = bValue || '';
          }

          // 字串比較
          if (typeof aValue === 'string' || typeof bValue === 'string') {
            const result = sortConfig.direction === 'asc'
              ? String(aValue).localeCompare(String(bValue))
              : String(bValue).localeCompare(String(aValue));

            if (result !== 0) return result;
            continue;
          }

          // 數字比較
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return data;
  }, [allProductsAggregated, searchText, channelFilter, inventoryFilter, sortConfigs]);

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
  }, [searchText, channelFilter, inventoryFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // 排序切換處理
  const handleSort = (key, additive = false) => {
    setSortConfigs(prev => {
      const existing = prev.find(item => item.key === key);
      const nextDirection = existing?.direction === 'desc' ? 'asc' : 'desc';
      const updatedItem = { key, direction: nextDirection };

      if (!additive) {
        return [updatedItem];
      }

      if (!existing) {
        return [...prev, { key, direction: 'desc' }];
      }

      return prev.map(item => item.key === key ? updatedItem : item);
    });
  };

  // 排序箭頭元件
  const SortIcon = ({ columnKey }) => {
    const currentSort = sortConfigs.find(item => item.key === columnKey);
    const sortPriority = sortConfigs.findIndex(item => item.key === columnKey);

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
                <p className="text-xs text-slate-500">正在更新 Amazon Dashboard，請稍候...</p>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

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
          <div>
            <h3 className="font-bold text-slate-700">商品銷售報表</h3>
            <p className="text-xs text-slate-400 mt-1">可直接搜尋，並用 Shift + 點擊欄位標題加入多重排序</p>
          </div>

          <div className="flex w-full sm:w-auto flex-col lg:flex-row gap-3">
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

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">全部 Channel</option>
              {channelOptions.map(channel => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>

            <select
              value={inventoryFilter}
              onChange={(e) => setInventoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">全部庫存狀態</option>
              <option value="in_stock">只看有庫存</option>
              <option value="out_of_stock">只看缺貨</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition select-none w-[35%]" onClick={(e) => handleSort('title', e.shiftKey)}>
                  商品資訊 (ASIN / Title) <SortIcon columnKey="title" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('channel', e.shiftKey)}>
                  Channel <SortIcon columnKey="channel" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('fba_inventory', e.shiftKey)}>
                  FBA庫存 <SortIcon columnKey="fba_inventory" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('fbm_inventory', e.shiftKey)}>
                  FBM庫存 <SortIcon columnKey="fbm_inventory" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('sessions', e.shiftKey)}>
                  Sessions <SortIcon columnKey="sessions" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('page_views', e.shiftKey)}>
                  Page Views <SortIcon columnKey="page_views" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('units', e.shiftKey)}>
                  銷量 <SortIcon columnKey="units" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick={(e) => handleSort('sales', e.shiftKey)}>
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
                      <span className='font-bold text-sm'>{p.asin}</span><br/>{p.sku}<br/>{p.title}
                    </div>
                  </td>

                  <td className="px-6 py-3 text-right font-mono text-slate-700">
                    {p.channel}
                  </td>

                  <td className="px-6 py-3 text-right font-mono text-slate-700">
                    {p.fba_inventory}
                  </td>

                  <td className="px-6 py-3 text-right font-mono text-slate-700">
                    {p.fbm_inventory}
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
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    {loading ? '資料載入中...' : '無符合條件的商品'}
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
