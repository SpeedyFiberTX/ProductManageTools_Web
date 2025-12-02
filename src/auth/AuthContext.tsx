import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE;

// 🟢 修改 User 定義
type User = { 
  id: string; 
  email: string; 
  role?: string;
  two_factor_enabled?: boolean; // 🟢 新增這行
} | null;

type AuthContextType = {
  user: User;
  login: (email: string, password: string) => Promise<any>;
  login2FA: (code: string, tempToken: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  ready: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await refresh();
      await loadMe();
      setReady(true);
    })();
  }, []);

  async function refresh() {
    await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
  }

  // 🟢 這是重新載入使用者狀態的關鍵函式
  async function loadMe() {
    try {
      const r = await fetch(`${API_BASE}/api/me`, {
        credentials: 'include',
      });
      if (r.ok) {
        const data = await r.json();
        setUser(data); // 更新 User 狀態
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }

  async function login(email: string, password: string) {
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Login failed');

    if (data.require2fa) {
        return data; 
    }

    await loadMe();
    return data;
  }

  async function login2FA(code: string, tempToken: string) {
    const r = await fetch(`${API_BASE}/auth/2fa/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, tempToken }),
        credentials: 'include',
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Verification failed');
    
    await loadMe();
  }

  async function logout() {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, login2FA, logout, reloadUser: loadMe, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}