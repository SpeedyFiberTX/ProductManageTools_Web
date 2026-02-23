import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { usePlatform } from "../stores/PlatformContext"; // 引入 Context

// 🟢 定義 Shopify 選單 (原本的 navItems)
const SHOPIFY_NAV = [
  { label: "🚀建立產品", to: "/" },
  // { label: "更新基本資訊", to: "/update_products" },
  // { label: "更新自訂欄位", to: "/update_metafields" },
  // { label: "🚀新增變體/更新庫存", to: "/create_variants" },
  // { label: "更新變體", to: "/update_variants" },
  // { label: "更新翻譯", to: "/update_translation" },
  {label: "更新產品", to: "/update_products_all_flow"},
  { label: "更新關聯產品", to: "/update_relative_products" },
  { label: "批次匹配VSFF照片", to: "/match_media" },
  { label: "批次變更 Handle", to: "/handle_change" },
  { label: "新版備份", to: "/backup_v2" }
];

// 🟢 定義 Amazon 選單 (新的)
const AMAZON_NAV = [
  { label: "📊 總覽 Dashboard", to: "/amazon/dashboard" },
  { label: "📥 匯入報表", to: "/amazon/upload" },
];

const TOOLS_NAV = [
  { label: "常規跳線成本計算工具", to: "/tools" },
  // { label: "Amazon 文案產生器", to: "/amazon_content" },
  {label: "官網價格查詢",to:"/shopify_price"}
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 使用 Context 取得當前平台狀態
  const { platform, setPlatform } = usePlatform();

  const handleLogout = async () => {
    if (!confirm("確定要登出嗎？")) return;
    await logout();
    navigate("/login");
  };

  // 切換平台處理
  const handlePlatformChange = (e) => {
    const newPlatform = e.target.value;
    setPlatform(newPlatform);
    // 切換後導向該平台的首頁
    navigate(newPlatform === 'shopify'
      ? '/'
      : newPlatform === 'amazon'
        ? '/amazon/dashboard'
        : '/tools');
  };

  // 根據平台決定顯示哪個選單
  const navItems = platform === 'shopify' ? SHOPIFY_NAV : platform === 'amazon' ?AMAZON_NAV : TOOLS_NAV;

  // 樣式設定：Amazon 模式使用淡橘色背景以示區別
  const headerClass = platform === 'shopify'
    ? "sticky top-0 z-40 w-full bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200/60"
    : "sticky top-0 z-40 w-full bg-orange-50/90 backdrop-blur supports-[backdrop-filter]:bg-orange-50/60 border-b border-orange-200/60";

  return (
    <header className={headerClass}>
      <div className="container mx-auto px-4 flex items-center justify-between">

        {/* 左側：平台切換器 */}
        <div className="flex items-center gap-3 mr-4 border-r border-slate-300 pr-4 py-3">
          <select
            value={platform}
            onChange={handlePlatformChange}
            className="bg-transparent font-bold text-slate-700 cursor-pointer outline-none hover:text-indigo-600 transition text-sm"
          >
            <option value="shopify">🛍️ Shopify</option>
            <option value="amazon">📦 Amazon</option>
            <option value="tools">🔨 Tools</option>
          </select>
        </div>

        {/* 中間：導航選單 */}
        <nav className="flex items-center gap-2 overflow-x-auto py-3 custom-scroll flex-1 mr-4">
          {navItems.map(({ label, to }) => {
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

        {/* 右側：使用者資訊 & 登出 */}
        {user && (
          <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-slate-300">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-sm font-semibold text-slate-700">{user.email}</span>
              {user.role && (
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  {user.role}
                </span>
              )}
            </div>

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
