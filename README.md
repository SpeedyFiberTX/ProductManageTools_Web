# ProductManageTools_Web

SpeedyFiberTX 的前端管理介面（React + Vite + Tailwind），提供 Shopify / Amazon / Tools 操作頁面與新版產品備份瀏覽。

## Amazon Dashboard 資料來源（目前）

Amazon Dashboard 目前只呼叫：

- `GET /api/amazon/stats`

該 API 由 `ProductManageTools` 提供，後端會聚合：

- `amazon_daily_stats`：銷售 / 流量
- `amazon_listings`：SKU / FNSKU / FBA / FBM 庫存摘要

前端不直接讀取 `amazon_products`。目前 Dashboard 已改為依賴後端聚合結果。

## 主要頁面

- Shopify 操作頁：建立產品、更新庫存、Metafields、翻譯、Handle 等。
- Amazon 模組：Dashboard 與報表匯入。
- Tools：常規跳線成本計算與官網價格查詢。
- 新版備份頁清單：`/backup_v2`（分頁、搜尋、排序）。
- 新版備份頁詳情：`/backup_v2/:id`（單一產品與版本歷史）。

## 備份頁目前行為

- `BackupV2` 預設不顯示 `deleted` 商品。
- 列表頁可用「顯示已刪除商品」切換帶入 `includeDeleted=1`。
- `BackupDetail` 在 deleted 商品上會顯示「重新上架」按鈕。
- 重新上架會呼叫 `POST /api/products/:id/recreate`，於 Shopify 建立一筆新的 `DRAFT` 商品，成功後跳轉到新商品詳情頁。

## 備份頁最新變更

- `src/pages/BackupPage.jsx` 新增「僅組裝與上傳 (Fast Retry)」按鈕，對應後端 `POST /api/runStreamTest`。
- 同頁面原有「完整備份」對應 `POST /api/runBackupAll`。
- 若需要在前端可視化此頁面，請在 `src/router.jsx` 掛上對應路由。

## 開發與啟動

```bash
cd ProductManageTools_Web
npm install
npm run dev
```

## API 與驗證規範

- 前端呼叫本站後端 API 時，統一使用 `src/lib/api.ts` 提供的 `useApi().fetch`。
- 不要在頁面或 utility 裡手動組 `Authorization` header。
- 不要自行呼叫 `/auth/refresh` 或各自實作 401 retry；token refresh 與重送邏輯已集中在 `useApi().fetch`。
- 只有不涉及登入態的資源請求可以保留原生 `fetch`，例如 static CSV / public asset。

## 相關 API

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/:id/versions`
- `POST /api/products/:id/recreate`
- `GET /api/amazon/stats`
