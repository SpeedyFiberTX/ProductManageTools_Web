import { useState } from 'react';
import { useApi } from '../../lib/api'; // 假設您有這個 hook，或直接用 fetch

export default function AmazonUpload() {
    const { postJson } = useApi(); // 使用既有的 API helper
    
    // 優化後：預設昨天
    const [date, setDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1); // 減一天
        return d.toISOString().split('T')[0];
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    // 處理上傳
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert('請選擇檔案');

        // 建立 FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('reportDate', date);
        formData.append('reportType', 'business_report');

        setLoading(true);
        try {
            // 使用 fetch 或 axios (這裡示範用 raw fetch，因為 useApi.postJson 可能會自動 stringify body)
            // 如果您的 useApi 有支援 FormData，請改用它。這裡用最保險的原生 fetch。
            const API_BASE = import.meta.env.VITE_API_BASE;
            // 注意：需確認您的 AuthContext 是否會自動帶 token，如果沒有，這裡需要手動處理 credentials
            // 這裡假設您的後端 cookie 是 httpOnly，瀏覽器會自動帶
            const res = await fetch(`${API_BASE}/api/amazon/upload-report`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setFile(null);
                // 可以在這裡清除 file input
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
            <p className="text-slate-500 mb-8">目前支援：Business Report (Detail Page Sales and Traffic by Child Item)</p>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <form onSubmit={handleUpload} className="space-y-6">

                    {/* 1. 日期選擇器 */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">報表日期 (Data Date)</label>
                        <p className="text-xs text-slate-500 mb-2">請選擇這份報表代表的「單日」日期 (例如下載昨天 11/20 的數據，請選 11/20)</p>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="block w-full md:w-1/2 rounded-xl border-slate-300 border px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>

                    {/* 2. 檔案選擇器 */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">CSV 檔案</label>
                        <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition">
                            <input
                                type="file"
                                accept=".csv"
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

                    {/* 3. 送出按鈕 */}
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

            {/* 提示區塊 */}
            <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm">
                <h3 className="font-bold mb-1">💡 如何下載報表？</h3>
                <ul className="list-disc list-inside space-y-1 opacity-80">
                    <li>進入 Amazon Seller Central {'>'} Reports {'>'} Business Reports</li>
                    <li>左側選單點選 <b>"Detail Page Sales and Traffic by Child Item"</b></li>
                    <li>右上角日期選擇 <b>"單一日"</b> (不要選範圍，以免數據被平均)</li>
                    <li>下載 <b>CSV</b> 檔案並在此上傳</li>
                </ul>
            </div>
        </div>
    );
}