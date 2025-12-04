import { createBrowserRouter } from "react-router-dom";

// Layout
import Frontend from "./layout/Frontend";

// Shopify Pages
import CreateProducts from "./pages/CreateProducts";
import CreateVariants from "./pages/CreateVariants";
import UpdateInventory from "./pages/UpdateInventory";
import UpdateMetafields from "./pages/UpdateMetafields";
import UpdateProducts from "./pages/UpdateProducts";
import UpdateRelativeProducts from "./pages/UpdateRelativeProducts";
import UpdateTranslation from "./pages/UpdateTranslation";
import UpdateVariants from "./pages/UpdateVariants";
import DeleteTranslate from "./pages/DeleteTranslate"; // 注意檔名大小寫，原檔可能是 deleteTranslate
import BackupPage from "./pages/BackupPage";
import Setup2FA from "./pages/Setup2FA";

// 🟢 Amazon Pages (新增)
import AmazonDashboard from "./pages/amazon/Dashboard";
import AmazonUpload from "./pages/amazon/Upload";

// 公開頁
import LoginPage from "./pages/Login";
import NotFound from "./pages/NotFound";

// Auth & Context
import RequireAuth from "./auth/RequireAuth";
import { PlatformProvider } from "./stores/PlatformContext"; // 🟢 引入 PlatformContext

export const route = createBrowserRouter(
  [
    // 1) 公開的登入頁
    { path: "/login", element: <LoginPage /> },

    // 2) 受保護群組
    {
      element: (
        // 🟢 包裹 PlatformProvider，讓裡面的 Header 和頁面都能拿到狀態
        <PlatformProvider>
          <RequireAuth />
        </PlatformProvider>
      ),
      children: [
        {
          path: "/",
          element: <Frontend />, // 這裡面包含了 Header
          children: [
            // === Shopify Routes ===
            { index: true, element: <CreateProducts /> },
            { path: "create_variants", element: <CreateVariants /> },
            { path: "update_inventory", element: <UpdateInventory /> },
            { path: "update_metafields", element: <UpdateMetafields /> },
            { path: "update_products", element: <UpdateProducts /> },
            { path: "update_relative_products", element: <UpdateRelativeProducts /> },
            { path: "update_translation", element: <UpdateTranslation /> },
            { path: "update_variants", element: <UpdateVariants /> },
            { path: "delete_translate", element: <DeleteTranslate /> },
            { path: "backup", element: <BackupPage /> },
            { path: "setup_2fa", element: <Setup2FA /> },

            // === 🟢 Amazon Routes (新增) ===
            { path: "amazon/dashboard", element: <AmazonDashboard /> },
            { path: "amazon/upload", element: <AmazonUpload /> },
          ],
        },
      ],
    },

    // 3) 404
    { path: "*", element: <NotFound /> },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);