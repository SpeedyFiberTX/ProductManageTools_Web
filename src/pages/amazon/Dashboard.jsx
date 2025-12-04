import { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function AmazonDashboard() {
  const { getJson } = useApi();
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  
  // 日期範圍：預設過去 30 天
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  // 1. 讀取數據
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

  // 2. 數據加工 (Aggregation)
  const { chartData, kpi, topProducts } = useMemo(() => {
    if (!rawData.length) return { chartData: [], kpi: {}, topProducts: [] };

    // A. 每日趨勢圖數據 (依日期加總)
    const dailyMap = new Map();
    // B. 商品排行數據 (依 ASIN 加總)
    const productMap = new Map();

    let totalSales = 0;
    let totalUnits = 0;
    let totalSessions = 0;

    rawData.forEach(row => {
      // A. 每日加總
      const d = row.date;
      if (!dailyMap.has(d)) {
        dailyMap.set(d, { date: d, sales: 0, units: 0, sessions: 0 });
      }
      const day = dailyMap.get(d);
      day.sales += (row.total_sales || 0);
      day.units += (row.units_sold || 0);
      day.sessions += (row.sessions || 0);

      // B. 商品加總
      const asin = row.asin;
      if (!productMap.has(asin)) {
        productMap.set(asin, { 
          asin, 
          sku: row.amazon_products?.sku || '',
          title: row.amazon_products?.title || asin,
          sales: 0, 
          units: 0 
        });
      }
      const prod = productMap.get(asin);
      prod.sales += (row.total_sales || 0);
      prod.units += (row.units_sold || 0);

      // C. 全局加總
      totalSales += (row.total_sales || 0);
      totalUnits += (row.units_sold || 0);
      totalSessions += (row.sessions || 0);
    });

    // 轉換為陣列並排序
    const sortedChart = Array.from(dailyMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    const sortedProducts = Array.from(productMap.values()).sort((a, b) => b.sales - a.sales).slice(0, 10); // 取前 10 名
    
    // 計算轉換率
    const conversionRate = totalSessions > 0 ? ((totalUnits / totalSessions) * 100).toFixed(2) : 0;

    return {
      chartData: sortedChart,
      topProducts: sortedProducts,
      kpi: {
        sales: totalSales.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        units: totalUnits.toLocaleString(),
        sessions: totalSessions.toLocaleString(),
        conversion: conversionRate + '%'
      }
    };
  }, [rawData]);

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

      {/* Top Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-700">🏆 熱銷商品排行 (Top 10)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">商品資訊 (ASIN / Title)</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3 text-right">銷售數量</th>
                <th className="px-6 py-3 text-right">銷售金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.map((p) => (
                <tr key={p.asin} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3 max-w-xs truncate" title={p.title}>
                    <div className="font-medium text-slate-700">{p.asin}</div>
                    <div className="text-slate-400 text-xs truncate">{p.title}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{p.sku || '-'}</td>
                  <td className="px-6 py-3 text-right font-medium text-blue-600">{p.units}</td>
                  <td className="px-6 py-3 text-right font-medium text-emerald-600">
                    {p.sales.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    {loading ? '載入數據中...' : '此區間無銷售數據'}
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

// 小元件：KPI 卡片
function KPICard({ title, value, color }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}