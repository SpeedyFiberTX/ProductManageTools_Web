// src/router.jsx
import { createBrowserRouter } from "react-router-dom";

// Layout
import Frontend from "./layout/Frontend";

// 受保護頁
import CreateProducts from "./pages/CreateProducts";
import CreateVariants from "./pages/CreateVariants";
import UpdateInventory from "./pages/UpdateInventory";
import UpdateMetafields from "./pages/UpdateMetafields";
import UpdateProducts from "./pages/UpdateProducts";
import UpdateRelativeProducts from "./pages/UpdateRelativeProducts";
import UpdateTranslation from "./pages/UpdateTranslation";
import UpdateVariants from "./pages/UpdateVariants";
import DeleteTranslate from "./pages/deleteTranslate";
import BackupPage from "./pages/BackupPage";
import Setup2FA from "./pages/Setup2FA";

// 公開頁
import LoginPage from "./pages/Login";

// 共用
import NotFound from "./pages/NotFound";

// 新增：權限殼
import RequireAuth from "./auth/RequireAuth";

export const route = createBrowserRouter(
  [
    // 1) 公開的登入頁（不套 Frontend）
    { path: "/login", element: <LoginPage /> },

    // 2) 受保護群組：先套 RequireAuth，再套 Frontend 當 layout
    {
      element: <RequireAuth />,
      children: [
        {
          path: "/",
          element: <Frontend />,
          children: [
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
          ],
        },
      ],
    },

    // 3) 全站 404（不論是否登入）
    { path: "*", element: <NotFound /> },
  ],
  {
    basename: import.meta.env.BASE_URL, // 你原本的設定保留
  }
);
