import { useState } from "react";
import { useApi } from "../lib/api";

export default function BackupPage() {
  const { postJson } = useApi();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleBackup = async () => {
    if (!confirm("確定要開始完整備份嗎？\n這將會從 Shopify 下載所有資料並上傳至 Notion，過程可能需要數分鐘。")) return;
    
    setLoading(true);
    setMessage("");
    setError("");

    try {
      // 呼叫後端 API
      const res = await postJson("/api/runBackupAll");
      
      // 因為後端是回傳 202 Accepted (背景執行)，所以這裡只會顯示請求成功
      setMessage(res.message || "備份請求已發送，伺服器正在背景執行中。");
    } catch (err) {
      console.error(err);
      setError(err.message || "備份啟動失敗，請檢查網路或權限");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">系統備份 (System Backup)</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-2">執行完整備份</h2>
          <p className="text-slate-500 leading-relaxed">
            點擊下方按鈕將觸發伺服器執行以下流程：
          </p>
          <ul className="list-disc list-inside mt-2 text-slate-500 space-y-1 ml-2">
            <li>從 Shopify 下載產品、變體、Metafields 資料</li>
            <li>下載多國語言翻譯 (日文、繁中)</li>
            <li>資料組裝並轉換格式</li>
            <li>上傳至 Notion 資料庫</li>
          </ul>
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

        <button
          onClick={handleBackup}
          disabled={loading}
          className={`w-full md:w-auto px-8 py-3 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2 ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              啟動中...
            </>
          ) : (
            "開始備份"
          )}
        </button>
      </div>
    </div>
  );
}