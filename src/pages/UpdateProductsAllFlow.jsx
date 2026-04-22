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
import UpdateButtonRow from "../component/UpdateButtonRow";
import ConfirmPreviewModal from "../component/ConfirmPreviewModal";
import { SECTION_ORDER, COLUMN_ORDER } from "../config/previewSections";
import { notifyAndOfferResultExport, postJsonWithResultLog } from "../utils/loggedApiSubmit";
import { useApi } from "../lib/api";

const VARIANTS_BLOCK_KEY = "__variants_block__";
const PRODUCT_KEYS = new Set([
  "title",
  "description",
  "description_type",
  "Vendor",
  "Type",
  "Tags",
  "SEO Title",
  "SEO Description",
  "Status",
  "collections",
  "Template",
]);
const TRANSLATION_KEYS = new Set([
  "title",
  "description",
  "description_type",
  "meta_description",
  "theme.shipping_time",
]);

function getSelectedKeysForSection(selectedKeys = [], sectionId = "") {
  const keys = Array.isArray(selectedKeys) ? selectedKeys.filter(Boolean) : [];
  if (sectionId === "products") {
    return keys.filter((k) => PRODUCT_KEYS.has(k));
  }
  if (sectionId === "metafields") {
    return keys.filter((k) =>
      k.startsWith("content.") ||
      k.startsWith("filter.") ||
      k.startsWith("table.") ||
      k.startsWith("theme.") ||
      k.startsWith("custom.") ||
      k.startsWith("recommendation.")
    );
  }
  if (sectionId === "translations") {
    return keys.filter((k) => TRANSLATION_KEYS.has(k) || k.startsWith("content."));
  }
  return [];
}

function filterRowsBySelectedKeys(rows = [], selectedKeys = []) {
  const keys = Array.isArray(selectedKeys) ? selectedKeys.filter(Boolean) : [];
  if (!keys.length) return [];

  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const body = { handle: row?.handle };
      for (const key of keys) {
        const value = row?.[key];
        body[key] = value == null ? "" : value;
      }
      return body;
    })
    .filter((row) => row?.handle);
}

function filterRowsByRowIndex(rows = [], targetRowIndex) {
  if (!Array.isArray(rows)) return [];
  if (targetRowIndex == null || targetRowIndex < 0) return [];
  return rows.filter((row) => row?.__rowIndex === targetRowIndex);
}

export default function UpdateProductsAllFlow() {
  const { fetch: apiFetch } = useApi();
  const {
    rows, headers, currentRow, selectedIndex, setIndex,
    customMap, setCustomMap,
    productPayloads, metafieldPayloads, translationPayloads,
    currentProductFromList,
    variantMode, variantCatalog, variantsActive,
  } = useCsv();

  const variantLabel = useMemo(
    () => variantCatalog.find(c => c.id === variantMode)?.label ?? variantMode,
    [variantCatalog, variantMode]
  );

  const rowsCount = variantsActive?.length ?? 0;

  const [showPreview, setShowPreview] = useState(false);
  const [submitMode, setSubmitMode] = useState("all_full");
  const handleOpenPreview = () => {
    setSubmitMode("all_full");
    setShowPreview(true);
  };

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
  const isVariantsBlockChecked = isChecked([VARIANTS_BLOCK_KEY]);

  const openCurrentSelectedPreview = () => {
    setSubmitMode("current_selected");
    setShowPreview(true);
  };

  const openAllSelectedPreview = () => {
    setSubmitMode("all_selected");
    setShowPreview(true);
  };

  const requestPayloads = useMemo(() => {
    const selected = Array.from(selectedKeys);
    const selectedProductKeys = getSelectedKeysForSection(selected, "products");
    const selectedMetafieldKeys = getSelectedKeysForSection(selected, "metafields");
    const selectedTranslationKeys = getSelectedKeysForSection(selected, "translations");
    const hasSelection = selected.length > 0;
    const isSelectedMode = submitMode !== "all_full";
    const sourceProducts = submitMode === "current_selected"
      ? filterRowsByRowIndex(productPayloads || [], selectedIndex)
      : (productPayloads || []);
    const sourceMetafields = submitMode === "current_selected"
      ? filterRowsByRowIndex(metafieldPayloads || [], selectedIndex)
      : (metafieldPayloads || []);
    const sourceTranslations = submitMode === "current_selected"
      ? filterRowsByRowIndex(translationPayloads || [], selectedIndex)
      : (translationPayloads || []);
    const variantRows = submitMode === "current_selected"
      ? filterRowsByRowIndex(Array.isArray(variantsActive) ? variantsActive : [], selectedIndex)
      : (Array.isArray(variantsActive) ? variantsActive : []);

    const shouldSendVariants = !isSelectedMode
      ? true
      : hasSelection
        ? selected.includes(VARIANTS_BLOCK_KEY)
        : false;

    return {
      selected,
      hasSelection,
      submitMode,
      products: isSelectedMode
        ? filterRowsBySelectedKeys(sourceProducts, selectedProductKeys)
        : sourceProducts,
      metafields: isSelectedMode
        ? filterRowsBySelectedKeys(sourceMetafields, selectedMetafieldKeys)
        : sourceMetafields,
      translations: isSelectedMode
        ? filterRowsBySelectedKeys(sourceTranslations, selectedTranslationKeys)
        : sourceTranslations,
      // 變體 payload 目前後端 helper 依賴完整欄位做 update/delete/inventory，勾選模式下先採 all-or-nothing。
      variants: shouldSendVariants ? variantRows : [],
    };
  }, [selectedKeys, submitMode, selectedIndex, productPayloads, metafieldPayloads, translationPayloads, variantsActive]);

  // 四分頁都宣告，Modal 會依 onlyNonEmptyTabs 過濾、依 SECTION_ORDER 排序
  const sections = useMemo(() => ([
    {
      id: "products",
      label: `Products (${requestPayloads.products?.length || 0})`,
      rows: requestPayloads.products || [],
      endpoint: "/api/productUpdater",
    },
    {
      id: "metafields",
      label: `Metafields (${requestPayloads.metafields?.length || 0})`,
      rows: requestPayloads.metafields || [],
      endpoint: "/api/metafieldsWriter",
    },
    {
      id: "translations",
      label: `Translations (${requestPayloads.translations?.length || 0})`,
      rows: requestPayloads.translations || [],
      endpoint: "/api/translate",
    },
    {
      id: "variants",
      label: `Variants (${requestPayloads.variants?.length || 0})`,
      rows: requestPayloads.variants || [],
      endpoint: "/api/productVariantsBuilder",
    },
  ]), [requestPayloads]);

  const sourceLabel = useMemo(() => variantLabel || variantMode, [variantLabel, variantMode]);

  // 一次送出所有（可見）分頁
  const handleConfirmSend = async () => {
    try {
      const { hasSelection, products: productsRows, metafields: metafieldsRows, translations: translationsRows, variants: variantsRows } = requestPayloads;

      if (
        submitMode !== "all_full" &&
        !hasSelection
      ) {
        alert("請先勾選要更新的欄位。");
        setShowPreview(false);
        return;
      }

      if (
        submitMode !== "all_full" &&
        productsRows.length === 0 &&
        metafieldsRows.length === 0 &&
        translationsRows.length === 0 &&
        variantsRows.length === 0
      ) {
        alert("目前勾選的欄位沒有可送出的資料。");
        setShowPreview(false);
        return;
      }

      // 這段拿來取得用postman測試的資料
      // const payload = {
      //   products: productsRows,
      //   metafields: metafieldsRows,
      //   translations: translationsRows,
      //   variants: variantsRows,
      // };

      // // ✅ 這邊 log，方便檢查
      // console.log("=== /api/updateProductFlow ===");
      // console.log(JSON.stringify(payload, null, 2));

      const { requestId, message } = await postJsonWithResultLog({
        apiFetch,
        endpoint: "/api/updateProductFlow",
        body: {
          products: productsRows,
          metafields: metafieldsRows,
          translations: translationsRows,
          variants: variantsRows,
        },
        successMessage: "整批更新流程已啟動，請稍後查看官網後台是否更新成功，並請記得到 notion 修改 status 狀態與官網同步唷。",
      });
      await notifyAndOfferResultExport({ requestId, message });
    } catch (e) {
      console.error("updateProductFlow error:", e);
      alert(`送出失敗：${e.message}`);
    } finally {
      setShowPreview(false);
    }
  };

  return (
    <>
      <Hero pageTitle="更新產品" onSubmit={handleOpenPreview} />

      {rows.length > 0 && (
        <UpdateButtonRow
          selectedKeys={selectedKeys}
          currentPayload={currentProductFromList}
          payloads={productPayloads}
          updateSelectedForCurrent={openCurrentSelectedPreview}
          updateSelectedForAll={openAllSelectedPreview}
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
                  <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm text-sm text-slate-600">
                    將送出：<b>{rowsCount}</b> 筆（來源：{variantLabel} / {variantMode}）
                  </div>

                  <RequireColumn
                    rows={rows}
                    selectedProductIndex={selectedIndex}
                    currentRow={currentRow}
                    canEdit={true}
                    isChecked={isChecked}
                    toggleSelected={toggleSelected}
                  />

                  {/* 內含動態下拉，會更新 variantMode */}
                  <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-indigo-600"
                        checked={isVariantsBlockChecked}
                        onChange={(e) => toggleSelected([VARIANTS_BLOCK_KEY], e.target.checked)}
                      />
                      更新變體（整個區塊）
                    </label>
                    <p className="mt-1 text-xs text-slate-500">
                      勾選後會送出此產品/全部產品的完整變體資料（含建立/更新/刪除與庫存流程）。
                    </p>
                  </div>
                  <Variants />

                  <SeoSetting currentRow={currentRow} canEdit={true} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Translate currentRow={currentRow} canEdit={true} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Metafields_Table currentRow={currentRow} canEdit={true} customMap={customMap} headers={headers} setCustomMap={setCustomMap} isChecked={isChecked} toggleSelected={toggleSelected} />
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
                  <ProductSetting currentRow={currentRow} canEdit={true} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Metafields_Content currentRow={currentRow} canEdit={true} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Metafields_Theme currentRow={currentRow} canEdit={true} isChecked={isChecked} toggleSelected={toggleSelected} />
                  <Metafields_Filter currentRow={currentRow} canEdit={true} isChecked={isChecked} toggleSelected={toggleSelected} />
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
