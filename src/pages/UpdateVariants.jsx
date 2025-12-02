import { useState, useMemo } from "react";
import { useCsv } from "../stores/useCsv";
import EmptyState from "../component/EmptyState";
import RequireColumn from "../component/RequireColumn";
import Variants from "../component/Variants";
import AsideList from "../component/asideList";
import Hero from "../component/Hero";
import ConfirmPreviewModal from "../component/ConfirmPreviewModal";
import { SECTION_ORDER, COLUMN_ORDER } from "../config/previewSections";

import { useAuth } from "../auth/AuthContext";
const API_BASE = import.meta.env.VITE_API_BASE;

export default function UpdateVariants() {
  const {
    rows,
    currentRow,
    selectedIndex,
    setIndex,
    variantMode,        // "notion" | "loopback" | "novariants" | "mtpmpo" ...
    setVariantMode,
    variantCatalog,     // [{ id, label }]
    variantsActive,     // 依 variantMode 計算出的 rows（送單就用這個）
  } = useCsv();

  const category = useMemo(() => {
    const item = (variantCatalog || []).find(x => x.id === variantMode);
    return item?.label ?? variantMode;
  }, [variantMode, variantCatalog]);

  const rowsToSend = useMemo(
    () => (Array.isArray(variantsActive) ? variantsActive : []),
    [variantsActive]
  );
  const rowsCount = rowsToSend.length;

  const handleCategoryChange = (nextLabelOrId) => {
    const list = variantCatalog || [];
    const byLabel = list.find(x => x.label === nextLabelOrId);
    const byId = list.find(x => x.id === nextLabelOrId);
    const target = byLabel || byId;
    if (target) setVariantMode(target.id);
  };

  // ▶ 按「全部送出」→ 開啟 Modal
  const [showPreview, setShowPreview] = useState(false);
  const handleSubmitAll = () => setShowPreview(true);

  // 分頁：Variants only
  const sections = useMemo(() => ([
    {
      id: "variants",
      label: `Variants (${rowsCount})`,
      rows: rowsToSend,
      endpoint: `${API_BASE}/api/variantsUpdater`,
    },
  ]), [rowsCount, rowsToSend]);

  const sourceLabel = useMemo(() => category || variantMode, [category, variantMode]);

  // Modal 確認送出：一次送出所有可見分頁（此頁只有 variants）
  const handleConfirmSend = async (selectedIds /* string[] */) => {
    const chosen = (sections || []).filter(
      (s) => selectedIds.includes(s.id) && Array.isArray(s.rows) && s.rows.length
    );

    if (!chosen.length) {
      alert("目前沒有可送出的變體資料。");
      setShowPreview(false);
      return;
    }

    let anySuccess = false;

    try {
      // 逐一依分頁送出（此頁目前只有 variants）
      for (const s of chosen) {
        const resp = await fetch(s.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: s.rows }),
        });

        if (resp.ok) { // 視為 2xx（200/202 等）
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

  // 勾選邏輯（提供給 RequireColumn/Variants）
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

  return (
    <>
      <Hero pageTitle="建立變體" onSubmit={handleSubmitAll} />

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

            <main className="col-span-12 md:col-span-9">
              <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm text-sm text-slate-600">
                將送出：<b>{rowsCount}</b> 筆（來源：{variantMode}，由下方選單切換）
              </div>

              {currentRow ? (
                <div className="flex flex-col gap-3">
                  <RequireColumn
                    rows={rows}
                    selectedProductIndex={selectedIndex}
                    currentRow={currentRow}
                    canEdit={false}
                    isChecked={isChecked}
                    toggleSelected={toggleSelected}
                  />
                  <Variants
                    category={category}
                    onCategoryChange={handleCategoryChange}
                    categoryOptions={variantCatalog}
                    currentRow={currentRow}
                    canEdit={false}
                    isChecked={isChecked}
                    toggleSelected={toggleSelected}
                    variantsMTPMPO={variantMode === "mtpmpo" ? rowsToSend : []}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-slate-500">尚未選擇資料或資料尚未載入</p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* 預覽／確認送出 Modal */}
      <ConfirmPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmSend}
        sections={sections}
        sourceLabel={sourceLabel}
        defaultTabId="variants"
        onlyNonEmptyTabs={true}
        sectionOrder={SECTION_ORDER}
        columnOrderMap={COLUMN_ORDER}
      />
    </>
  );
}
