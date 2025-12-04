import { useState } from 'react';

export default function AmazonUpload() {
    // 預設昨天
    const [date, setDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('business_report');

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert('請選擇檔案');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('reportType', reportType);
        
        if (reportType === 'business_report') {
            formData.append('reportDate', date);
        }

        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE;
            const res = await fetch(`${API_BASE}/api/amazon/upload-report`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setFile(null);
            } else {
                alert(`上傳失敗: ${data.error || '未知錯誤'}`);
            }
        } catch (err) {
            console.error(err);
            alert('上傳發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">匯入 Amazon 報表</h1>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <form onSubmit={handleUpload} className="space-y-6">

                    {/* 報表類型選擇 */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">報表類型</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="block w-full md:w-1/2 rounded-xl border-slate-300 border px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                        >
                            <option value="business_report">銷售流量報表 (Business Report)</option>
                            <option value="inventory_report">庫存與配送報表 (All Listings/Inventory)</option>
                        </select>
                    </div>

                    {/* 日期選擇器 (僅銷售報表需要) */}
                    {reportType === 'business_report' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-bold text-slate-700 mb-2">報表日期 (Data Date)</label>
                            <p className="text-xs text-slate-500 mb-2">請選擇這份報表代表的「單日」日期</p>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full md:w-1/2 rounded-xl border-slate-300 border px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                    )}

                    {/* 檔案選擇器 */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">CSV 檔案</label>
                        <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition">
                            <input
                                type="file"
                                accept=".csv,.txt"
                                required
                                onChange={(e) => setFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="space-y-2">
                                <div className="text-4xl">📄</div>
                                <p className="text-sm font-medium text-slate-600">
                                    {file ? file.name : "點擊或拖曳檔案至此"}
                                </p>
                                {file && (
                                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl text-white font-bold shadow-md transition-all ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 hover:shadow-lg"
                            }`}
                    >
                        {loading ? "上傳處理中..." : "確認匯入資料"}
                    </button>

                </form>
            </div>

            <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm">
                <h3 className="font-bold mb-1">💡 報表下載指南</h3>
                <ul className="list-disc list-inside space-y-1 opacity-80">
                    <li><b>銷售報表：</b>Reports {'>'} Business Reports {'>'} Detail Page Sales ... by Child Item (CSV)</li>
                    <li><b>庫存報表：</b>Reports {'>'} Inventory Reports {'>'} All Listing Report (CSV/TXT)</li>
                </ul>
            </div>
        </div>
    );
}