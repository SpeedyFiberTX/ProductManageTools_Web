// src/pages/UpdateMetafields.jsx
import { useState } from "react";
import { useCsv } from "../stores/useCsv";
import EmptyState from "../component/EmptyState";
import RequireColumn from "../component/RequireColumn";
import AsideList from "../component/asideList";
import Hero from "../component/Hero";
import Metafields_Content from "../component/Metafields_Content";
import Metafields_Table from "../component/Metafields_Table";
import Metafields_Filter from "../component/Metafields_Filter";
import Metafields_Theme from "../component/Metafields_Theme";
import UpdateButtonRow from "../component/updateButtonRow";
import ConfirmPreviewModal from "../component/ConfirmPreviewModal";
import { SECTION_ORDER, COLUMN_ORDER } from "../config/previewSections";
import { pick } from "../utils/pick";

import { useAuth } from "../auth/AuthContext";
const API_BASE = import.meta.env.VITE_API_BASE;

export default function UpdateMetafields() {
  const { accessToken } = useAuth();
  const {
    rows, headers, currentRow, selectedIndex, setIndex,
    customMap, setCustomMap,
    metafieldPayloads, currentMetafieldPayload,
  } = useCsv();

  // 勾選欄位
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const toggleSelected = (keys = [], checked) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (!k) continue;
        if (checked) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  };
  const isChecked = (keys = []) => keys.every((k) => selectedKeys.has(k));

  /* ============ Modal 狀態（共用） ============ */
  const [showPreview, setShowPreview] = useState(false);
  const [modalSections, setModalSections] = useState([]);
  const [modalDefaultTab, setModalDefaultTab] = useState("metafields");

  /* ============ 三種開啟方式 ============ */

  // 1) Hero：全部送出 → 顯示完整 payloads
  const handleOpenPreviewAll = () => {
    setModalSections([
      {
        id: "metafields",
        label: `Metafields (${metafieldPayloads?.length || 0})`,
        rows: Array.isArray(metafieldPayloads) ? metafieldPayloads : [],
        endpoint: `${API_BASE}/api/metafieldsWriter`,
      },
    ]);
    setModalDefaultTab("metafields");
    setShowPreview(true);
  };

  // 2) 更新這筆 → 只顯示「當前列 + 勾選欄位」
  const updateSelectedForCurrent = () => {
    if (!currentMetafieldPayload) return;
    const keys = Array.from(selectedKeys);
    if (!keys.length) return;

    const body = [{ handle: currentMetafieldPayload.handle, ...pick(currentMetafieldPayload, keys) }];
    setModalSections([
      {
        id: "metafields",
        label: "Metafields (1)",
        rows: body,
        endpoint: `${API_BASE}/api/metafieldsWriter`,
      },
    ]);
    setModalDefaultTab("metafields");
    setShowPreview(true);
  };

  // 3) 更新全部 → 顯示「全部列 + 勾選欄位」
  const updateSelectedForAll = () => {
    const keys = Array.from(selectedKeys);
    if (!keys.length) return;

    const body = (metafieldPayloads || []).map((p) => ({ handle: p.handle, ...pick(p, keys) }));
    setModalSections([
      {
        id: "metafields",
        label: `Metafields (${body.length})`,
        rows: body,
        endpoint: `${API_BASE}/api/metafieldsWriter`,
      },
    ]);
    setModalDefaultTab("metafields");
    setShowPreview(true);
  };

  /* ============ Modal 確認送出：依當前 modalSections 送出 ============ */
  const handleConfirmSend = async (selectedIds /* string[] */) => {
  const chosen = (modalSections || []).filter(
    (s) => selectedIds.includes(s.id) && Array.isArray(s.rows) && s.rows.length
  );

  if (!chosen.length) {
    alert("目前沒有可送出的翻譯資料。");
    setShowPreview(false);
    return;
  }

  let anySuccess = false;

  try {
    // 逐一送出（若未來有多分頁，也只彈一次提示）
    for (const s of chosen) {
      const resp = await fetch(s.endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ rows: s.rows }),
      });

      if (resp.ok) { // 等同 2xx（包含 200/202）
        anySuccess = true;
      }
    }

    if (anySuccess) {
      alert("資料已送出，您可關閉視窗。");
    } else {
      alert("送出失敗，請稍後再試。");
    }
  } catch (err) {
    console.error(err);
    alert("送出失敗，請稍後再試或查看主控台錯誤訊息。");
  } finally {
    setShowPreview(false);
  }
};

  return (
    <>
      {/* Hero：全部送出 → 開 Modal 預覽 */}
      <Hero pageTitle="更新自訂欄位" onSubmit={handleOpenPreviewAll} />

      {/* 工具列：維持原介面，但行為改為開 Modal 預覽 */}
      {rows.length > 0 && (
        <UpdateButtonRow
          selectedKeys={selectedKeys}
          currentPayload={currentMetafieldPayload}
          payloads={metafieldPayloads}
          updateSelectedForCurrent={updateSelectedForCurrent}
          updateSelectedForAll={updateSelectedForAll}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-12 gap-4 lg:gap-6">
            <AsideList
              rows={rows}
              selectedProductIndex={selectedIndex}
              setSelectedProductIndex={setIndex}
            />

            <main className="col-span-12 md:col-span-6">
              {currentRow ? (
                <div className="flex flex-col gap-3">
                  <RequireColumn
                    rows={rows}
                    selectedProductIndex={selectedIndex}
                    currentRow={currentRow}
                    canEdit={false}
                  />
                  <Metafields_Content
                    currentRow={currentRow}
                    canEdit={true}
                    isChecked={isChecked}
                    toggleSelected={toggleSelected}
                  />
                  <Metafields_Table
                    currentRow={currentRow}
                    canEdit={true}
                    customMap={customMap}
                    headers={headers}
                    setCustomMap={setCustomMap}
                    isChecked={isChecked}
                    toggleSelected={toggleSelected}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-slate-500">尚未選擇資料或資料尚未載入</p>
                </div>
              )}
            </main>

            <section className="col-span-12 md:col-span-3">
              {currentRow ? (
                <div className="flex flex-col gap-3">
                  <Metafields_Theme
                    currentRow={currentRow}
                    canEdit={true}
                    isChecked={isChecked}
                    toggleSelected={toggleSelected}
                  />
                  <Metafields_Filter
                    currentRow={currentRow}
                    canEdit={true}
                    isChecked={isChecked}
                    toggleSelected={toggleSelected}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-slate-500">尚未選擇資料或資料尚未載入</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Modal：顯示由三種入口組成的 rows（完整 / 這筆勾選 / 全部勾選） */}
      <ConfirmPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmSend}
        sections={modalSections}
        defaultTabId={modalDefaultTab}
        onlyNonEmptyTabs={true}
        sectionOrder={SECTION_ORDER}
        columnOrderMap={COLUMN_ORDER}
      />
    </>
  );
}
