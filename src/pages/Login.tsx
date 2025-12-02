import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, login2FA } = useAuth();
  const nav = useNavigate();
  
  // 帳密狀態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // 2FA 狀態
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('');

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🟢 第一步：送出帳密
  async function onSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await login(email, password); 
      // 若後端回傳 require2fa，進入第二步
      if (res && res.require2fa) {
        setTempToken(res.tempToken);
        setStep('2fa');
        // 這裡不清空 loading，或視 UX 需求調整
        setLoading(false); 
      } else {
        nav('/'); // 直接登入成功
      }
    } catch (e:any) {
      setErr(e?.message ?? 'Login failed');
      setLoading(false);
    }
  }

  // 🟢 第二步：送出 2FA 代碼
  async function onSubmit2FA(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login2FA(code, tempToken);
      nav('/');
    } catch (e:any) {
      setErr(e?.message ?? 'Verification failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-md border border-gray-200">
        <h1 className="text-2xl font-semibold mb-6 text-slate-800 text-center">
            {step === 'credentials' ? 'Sign in' : 'Two-Factor Auth'}
        </h1>
        
        {step === 'credentials' ? (
            <form onSubmit={onSubmitCredentials} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="email" 
                    value={email} onChange={e=>setEmail(e.target.value)}
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="password"
                    value={password} onChange={e=>setPassword(e.target.value)}
                    required
                />
            </div>
            
            {err && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{err}</p>}
            
            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg px-3 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
                {loading ? 'Checking...' : 'Next'}
            </button>
            </form>
        ) : (
            <form onSubmit={onSubmit2FA} className="space-y-6">
                <div className="text-center">
                    <p className="text-sm text-gray-500 mb-4">
                        請輸入 Authenticator App 上的 6 位數驗證碼。
                    </p>
                    <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center tracking-[0.5em] text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        type="text" 
                        placeholder="000000" 
                        maxLength={6}
                        value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}
                        autoFocus
                    />
                </div>

                {err && <p className="text-red-600 text-sm bg-red-50 p-2 rounded text-center">{err}</p>}
                
                <div className="space-y-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg px-3 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setStep('credentials');
                            setErr(null);
                            setCode('');
                        }}
                        className="w-full text-sm text-slate-500 hover:text-slate-700"
                    >
                        Back to Login
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
}