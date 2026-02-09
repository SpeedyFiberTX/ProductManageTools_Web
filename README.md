# ProductManageTools_Web

SpeedyFiberTX 的前端管理介面（React + Vite + Tailwind），提供 Shopify / Amazon / Tools 操作頁面與新版產品備份瀏覽。

## 主要頁面

- Shopify 操作頁：建立產品、更新庫存、Metafields、翻譯、Handle 等。
- Amazon 模組：Dashboard 與報表匯入。
- Tools：常規跳線成本計算與官網價格查詢。
- 新版備份頁清單：`/backup_v2`（分頁、搜尋、排序）。
- 新版備份頁詳情：`/backup_v2/:id`（單一產品與版本歷史）。

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

## 相關 API

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/:id/versions`
