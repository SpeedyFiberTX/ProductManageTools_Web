import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth() {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) return null; // or a spinner
  
  // 1. 未登入 -> 踢去 Login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  // 🟢 2. 已登入但未開啟 2FA -> 踢去 Setup (除非已經在 Setup 頁面)
  if (!user.two_factor_enabled && loc.pathname !== '/setup_2fa') {
    return <Navigate to="/setup_2fa" replace />;
  }

  return <Outlet />;
}