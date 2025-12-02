import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Setup2FA() {
  const { reloadUser, logout } = useAuth(); // 🟢 取得 reloadUser
  const nav = useNavigate();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // 1. 取得 QR Code
  const handleSetup = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/setup`, {
        method: 'POST',
        credentials: 'include', 
        headers: { 'Content-Type': 'application/json' } 
      });
      const data = await res.json();
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setMsg('請使用 Google Authenticator 掃描 QR Code');
      }
    } catch (e) {
      setError('無法產生 QR Code，請稍後再試');
    }
  };

  // 2. 輸入驗證碼啟用
  const handleEnable = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/enable`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, secret }),
      });
      const data = await res.json();
      if (data.ok) {
        alert('✅ 兩步驟驗證已成功啟用！');
        
        // 🟢 關鍵：更新 Context 狀態，讓 RequireAuth 知道你已啟用
        await reloadUser();
        
        // 導回首頁
        nav('/');
      } else {
        setError('❌ 驗證碼錯誤，請重新輸入');
      }
    } catch (e) {
      setError('啟用失敗，請檢查網路連線');
    }
  };

  // 登出 (萬一使用者不想設，想換帳號)
  const handleLogout = async () => {
    await logout();
    nav('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-2 text-slate-800">🛡️ 安全性設定</h2>
        <p className="text-slate-500 mb-6 text-sm">為了保護您的帳號，請啟用兩步驟驗證。</p>
        
        {/* 步驟 1: 還沒顯示 QR Code */}
        {!qrCode ? (
          <button 
            onClick={handleSetup}
            className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-indigo-700 transition mb-4"
          >
            開始設定 2FA
          </button>
        ) : (
          /* 步驟 2: 顯示 QR Code 與輸入框 */
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-center border-2 border-dashed border-slate-200 p-4 rounded-xl bg-slate-50">
              <img src={qrCode} alt="2FA QR Code" className="rounded-lg mix-blend-multiply" />
            </div>
            
            <div className="text-left">
              <label className="block text-sm font-medium text-slate-700 mb-2">輸入 6 位數驗證碼</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 p-3 rounded-xl text-center tracking-[0.5em] text-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                maxLength={6}
              />
            </div>

            {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium">{error}</p>}

            <button 
              onClick={handleEnable}
              disabled={code.length !== 6}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              啟用保護並進入系統
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100">
            <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-slate-600">
                登出 / 切換帳號
            </button>
        </div>
      </div>
    </div>
  );
}