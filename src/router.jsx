import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

// Layout
import Frontend from "./layout/Frontend";

// Auth & Context
import RequireAuth from "./auth/RequireAuth";
import { PlatformProvider } from "./stores/PlatformContext";

const CreateProducts = lazy(() => import("./pages/CreateProducts"));
const CreateVariants = lazy(() => import("./pages/CreateVariants"));
const UpdateInventory = lazy(() => import("./pages/UpdateInventory"));
const UpdateMetafields = lazy(() => import("./pages/UpdateMetafields"));
const UpdateProducts = lazy(() => import("./pages/UpdateProducts"));
const UpdateRelativeProducts = lazy(() => import("./pages/UpdateRelativeProducts"));
const MatchMedia = lazy(() => import("./pages/MatchMedia"));
const HandleChange = lazy(() => import("./pages/HandleChange"));
const UpdateTranslation = lazy(() => import("./pages/UpdateTranslation"));
const UpdateVariants = lazy(() => import("./pages/UpdateVariants"));
const DeleteTranslate = lazy(() => import("./pages/DeleteTranslate"));
const BackupV2 = lazy(() => import("./pages/BackupV2"));
const BackupDetail = lazy(() => import("./pages/BackupDetail"));
const Setup2FA = lazy(() => import("./pages/Setup2FA"));
const UpdateProductsAllFlow = lazy(() => import("./pages/UpdateProductsAllFlow"));
const OperationLogs = lazy(() => import("./pages/OperationLogs"));
const AmazonDashboard = lazy(() => import("./pages/amazon/Dashboard"));
const AmazonUpload = lazy(() => import("./pages/amazon/Upload"));
const Tools = lazy(() => import("./pages/tools/Tools"));
const ShopifyPrice = lazy(() => import("./pages/tools/ShopifyPrice"));
const LoginPage = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ShopifyCsvLayout = lazy(() => import("./layout/ShopifyCsvLayout"));

function LoadingFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-slate-500">
      載入中...
    </div>
  );
}

function withSuspense(Component) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  );
}

export const route = createBrowserRouter(
  [
    // 1) 公開的登入頁
    { path: "/login", element: withSuspense(LoginPage) },

    // 2) 受保護群組
    {
      element: (
        <PlatformProvider>
          <RequireAuth />
        </PlatformProvider>
      ),
      children: [
        {
          path: "/",
          element: <Frontend />,
          children: [
            {
              element: withSuspense(ShopifyCsvLayout),
              children: [
                { index: true, element: withSuspense(CreateProducts) },
                { path: "create_variants", element: withSuspense(CreateVariants) },
                { path: "update_metafields", element: withSuspense(UpdateMetafields) },
                { path: "update_products", element: withSuspense(UpdateProducts) },
                { path: "update_relative_products", element: withSuspense(UpdateRelativeProducts) },
                { path: "match_media", element: withSuspense(MatchMedia) },
                { path: "handle_change", element: withSuspense(HandleChange) },
                { path: "update_translation", element: withSuspense(UpdateTranslation) },
                { path: "update_variants", element: withSuspense(UpdateVariants) },
                { path: "delete_translate", element: withSuspense(DeleteTranslate) },
                { path: "update_products_all_flow", element: withSuspense(UpdateProductsAllFlow) },
              ],
            },
            { path: "update_inventory", element: withSuspense(UpdateInventory) },
            { path: "backup_v2", element: withSuspense(BackupV2) },
            { path: "backup_v2/:id", element: withSuspense(BackupDetail) },
            { path: "setup_2fa", element: withSuspense(Setup2FA) },
            { path: "operation_logs", element: withSuspense(OperationLogs) },
            { path: "amazon/dashboard", element: withSuspense(AmazonDashboard) },
            { path: "amazon/upload", element: withSuspense(AmazonUpload) },
            { path: "tools", element: withSuspense(Tools) },
            { path: "shopify_price", element: withSuspense(ShopifyPrice) },
          ],
        },
      ],
    },

    // 3) 404
    { path: "*", element: withSuspense(NotFound) },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
