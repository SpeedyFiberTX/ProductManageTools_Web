import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { label: "🚀建立產品", to: "/" },
  { label: "更新基本資訊", to: "/update_products" },
  { label: "更新自訂欄位", to: "/update_metafields" },
  { label: "🚀新增變體/更新庫存", to: "/create_variants" },
  { label: "更新變體", to: "/update_variants" },
  { label: "更新翻譯", to: "/update_translation" },
  { label: "更新關聯產品", to: "/update_relative_products" },
  { label: "系統備份", to: "/backup" }
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (!confirm("確定要登出嗎？")) return;
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200/60">
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* 左側：導航選單 (flex-1 佔據剩餘空間，overflow-x-auto 保持水平捲動) */}
        <nav className="flex items-center gap-2 overflow-x-auto py-3 custom-scroll flex-1 mr-4">
          {navItems.map(({ label, to }) => {
            // 只要 label 包含火箭符號就視為重點項目
            const isYellow = label.includes("🚀");

            return (
              <NavLink
                key={label}
                to={to}
                className={({ isActive }) =>
                  "whitespace-nowrap rounded-xl px-3 py-2 text-sm transition border " +
                  (isActive
                    ? isYellow
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : isYellow
                    ? "bg-gray-500 text-white border-slate-200 hover:bg-gray-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-200")
                }
              >
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* 右側：使用者資訊 & 登出按鈕 */}
        {user && (
          <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-slate-300">
            {/* 電腦版顯示 Email 與角色 */}
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-sm font-semibold text-slate-700">{user.email}</span>
              {user.role && (
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  {user.role}
                </span>
              )}
            </div>

            {/* 登出按鈕 */}
            <button
              onClick={handleLogout}
              className="group flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-600 transition-all hover:bg-red-50 hover:text-red-600"
              title="登出"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 transition-transform group-hover:translate-x-0.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}