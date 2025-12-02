import { useState } from "react";
import { useApi } from "../lib/api";

export default function BackupPage() {
  const { postJson } = useApi();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // 完整備份 (包含下載)
  const handleBackup = async () => {
    if (!confirm("確定要開始完整備份嗎？\n這將會從 Shopify 下載所有資料並上傳至 Notion，過程可能需要數分鐘。")) return;
    triggerApi("/api/runBackupAll");
  };

  // ✅ 新增：快速重試 (只跑最後一段)
  const handleStreamOnly = async () => {
    if (!confirm("確定要執行「組裝與上傳」嗎？\n請確保 Supabase 上已經有最新的 Shopify 資料檔案。\n這將直接讀取 Supabase 檔案並上傳至 Notion。")) return;
    triggerApi("/api/runStreamTest");
  };

  const triggerApi = async (url) => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await postJson(url);
      setMessage(res.message || "請求已發送，伺服器正在背景執行中。");
    } catch (err) {
      console.error(err);
      setError(err.message || "啟動失敗，請檢查網路或權限");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">系統備份 (System Backup)</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-2">執行備份流程</h2>
          <p className="text-slate-500 leading-relaxed mb-4">
            請選擇執行模式：
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* 左邊：完整備份 */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <h3 className="font-medium text-slate-800 mb-1">完整備份 (Full Backup)</h3>
              <p className="text-xs text-slate-500 mb-4 h-10">
                從 Shopify 下載最新資料 → 更新 Supabase → 上傳 Notion。<br/>(耗時約 5-10 分鐘)
              </p>
              <button
                onClick={handleBackup}
                disabled={loading}
                className={`w-full py-2.5 rounded-lg text-white font-medium transition-all ${
                  loading ? "bg-slate-400" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {loading ? "執行中..." : "開始完整備份"}
              </button>
            </div>

            {/* 右邊：快速重試 */}
            <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/50">
              <h3 className="font-medium text-indigo-900 mb-1">僅組裝與上傳 (Fast Retry)</h3>
              <p className="text-xs text-indigo-600/70 mb-4 h-10">
                跳過下載，直接使用 Supabase 上的現有檔案進行組裝與上傳。<br/>(適合修復上傳錯誤時使用)
              </p>
              <button
                onClick={handleStreamOnly}
                disabled={loading}
                className={`w-full py-2.5 rounded-lg border-2 border-indigo-600 text-indigo-700 font-medium transition-all ${
                  loading ? "border-slate-400 text-slate-400" : "hover:bg-indigo-600 hover:text-white"
                }`}
              >
                {loading ? "執行中..." : "僅執行組裝"}
              </button>
            </div>
          </div>
        </div>

        {/* 狀態訊息區 */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>{message}</div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}