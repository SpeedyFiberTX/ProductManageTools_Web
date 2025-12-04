import { useState, useMemo } from "react";
import { useCsv } from "../stores/useCsv";
import EmptyState from "../component/EmptyState";
import RequireColumn from "../component/RequireColumn_withDescription";
import Variants from "../component/Variants";
import SeoSetting from "../component/SeoSetting";
import Metafields_Content from "../component/Metafields_Content";
import Metafields_Filter from "../component/Metafields_Filter";
import Metafields_Table from "../component/Metafields_Table";
import Metafields_Theme from "../component/Metafields_Theme";
import ProductSetting from "../component/ProductSetting";
import Translate from "../component/Translate";
import AsideList from "../component/AsideList";
import Hero from "../component/Hero";
import ConfirmPreviewModal from "../component/ConfirmPreviewModal";
import { SECTION_ORDER, COLUMN_ORDER } from "../config/previewSections";

import { useAuth } from "../auth/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function CreateProducts() {
  const { accessToken } = useAuth();
  const {
    rows, headers, currentRow, selectedIndex, setIndex,
    customMap, setCustomMap,
    productPayloads, metafieldPayloads, translationPayloads,
    variantMode, variantCatalog, variantsActive,
  } = useCsv();

  const variantLabel = useMemo(
    () => variantCatalog.find(c => c.id === variantMode)?.label ?? variantMode,
    [variantCatalog, variantMode]
  );

  const rowsCount = variantsActive?.length ?? 0;

  const [showPreview, setShowPreview] = useState(false);
  const handleOpenPreview = () => setShowPreview(true);

  // 四分頁都宣告，Modal 會依 onlyNonEmptyTabs 過濾、依 SECTION_ORDER 排序
  const sections = useMemo(() => ([
    {
      id: "products",
      label: `Products (${productPayloads?.length || 0})`,
      rows: productPayloads || [],
      endpoint: "/api/productBuilder",
    },
    {
      id: "metafields",
      label: `Metafields (${metafieldPayloads?.length || 0})`,
      rows: metafieldPayloads || [],
      endpoint: "/api/metafieldsWriter",
    },
    {
      id: "translations",
      label: `Translations (${translationPayloads?.length || 0})`,
      rows: translationPayloads || [],
      endpoint: "/api/translate",
    },
    {
      id: "variants",
      label: `Variants (${variantsActive?.length || 0})`,
      rows: Array.isArray(variantsActive) ? variantsActive : [],
      endpoint: "/api/productVariantsBuilder",
    },
  ]), [productPayloads, metafieldPayloads, translationPayloads, variantsActive]);

  const sourceLabel = useMemo(() => variantLabel || variantMode, [variantLabel, variantMode]);

  // 一次送出所有（可見）分頁
  const handleConfirmSend = async () => {
    try {
      // 這段拿來取得用postman測試的資料
      // const payload = {
      //   products: productPayloads || [],
      //   metafields: metafieldPayloads || [],
      //   translations: translationPayloads || [],
      //   variants: Array.isArray(variantsActive) ? variantsActive : [],
      // };

      // // ✅ 這邊 log，方便檢查
      // console.log("=== /api/fullPipeline ===");
      // console.log(JSON.stringify(payload, null, 2));

      const resp = await fetch(`${API_BASE}/api/fullPipeline`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          products: productPayloads || [],
          metafields: metafieldPayloads || [],
          translations: translationPayloads || [],
          variants: Array.isArray(variantsActive) ? variantsActive : [],
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        alert(data.message || "整批建立流程已啟動，請稍後查看官網後台是否建立成功，並請記得到 notion 修改 status 狀態與官網同步唷。");
      } else {
        alert(`送出失敗：${data.message || "未知錯誤"}`);
      }
    } catch (e) {
      console.error("fullPipeline error:", e);
      alert(`送出失敗：${e.message}`);
    } finally {
      setShowPreview(false);
    }
  };

  // 勾選欄位（保留原樣）
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
      <Hero pageTitle="建立產品" onSubmit={handleOpenPreview} />

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
                  <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm text-sm text-slate-600">
                    將送出：<b>{rowsCount}</b> 筆（來源：{variantLabel} / {variantMode}）
                  </div>

                  <RequireColumn
                    rows={rows}
                    selectedProductIndex={selectedIndex}
                    currentRow={currentRow}
                    canEdit={false}
                    isChecked={isChecked}
                    toggleSelected={toggleSelected}
                  />

                  {/* 內含動態下拉，會更新 variantMode */}
                  <Variants />

                  <SeoSetting currentRow={currentRow} canEdit={false} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Translate currentRow={currentRow} canEdit={false} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Metafields_Table currentRow={currentRow} canEdit={false} customMap={customMap} headers={headers} setCustomMap={setCustomMap} isChecked={isChecked} toggleSelected={toggleSelected} />
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
                  <ProductSetting currentRow={currentRow} canEdit={false} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Metafields_Content currentRow={currentRow} canEdit={false} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Metafields_Theme currentRow={currentRow} canEdit={false} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Metafields_Filter currentRow={currentRow} canEdit={false} isChecked={isChecked} toggleSelected={toggleSelected} />
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

      {/* 預覽／確認送出 Modal：會依 SECTION_ORDER 排序、依 COLUMN_ORDER 排欄位 */}
      <ConfirmPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmSend}
        sections={sections}
        sourceLabel={sourceLabel}
        defaultTabId={sections.find(s => s.id === "variants" && s.rows.length)?.id || sections.find(s => s.rows.length)?.id}
        onlyNonEmptyTabs={true}
        sectionOrder={SECTION_ORDER}
        columnOrderMap={COLUMN_ORDER}
      />
    </>
  );
}
