// ============================
// File: src/variants/TAAfiberPatch.calc.js
// ============================
import { registerCalculator } from "./registry";
import { findKey, makeCommon_taa } from "./helpers"; //注意這邊要引入 taa 的資料，庫存才會對
import { fiberPatchCableTable } from "../utils/fiberPatchCableTable";

// 去掉 TA- 前綴（大小寫不拘，允許 TA 與 TA-）
function stripTAPrefix(sku = "") {
  return String(sku).replace(/^TA-?/i, "");
}

// 從 table 回傳的 variantSKU 取出 lengthCode
function extractLengthCodeFromVariantSKU(variantSKU = "", lookupBase = "") {
  const s = String(variantSKU).trim();
  if (lookupBase && s.startsWith(lookupBase + "-")) {
    return s.slice(lookupBase.length + 1).trim();
  }
  // 後備：如果 table 直接給的是長度碼
  return s;
}

async function buildVariantsPayload_TAAFiberPatch_row(row) {
  if (!row) return [];

  const handleKey = findKey(row, "Handle");
  const skuKey    = findKey(row, "SKU") || findKey(row, "Variant SKU");

  const handle        = String(row?.[handleKey] ?? "").trim();
  const origBaseSku   = String(row?.[skuKey] ?? "").trim();   // e.g. TA-SMDXRGLCASCU2YNP
  if (!handle || !origBaseSku) return [];

  const lookupBaseSku = stripTAPrefix(origBaseSku);           // e.g. SMDXRGLCASCU2YNP
  const common = makeCommon_taa(row);

  // 用「去掉 TA- 的 baseSku」查表，讓前 5 碼/NP 規則生效
  const { variants } = await fiberPatchCableTable(lookupBaseSku);

  return (variants || []).map(v => {
    const option1Value = String(v.option1Value ?? v.Variant ?? v.option ?? "").trim();

    // 從 table 的 variantSKU 抽出 lengthCode，再換回 TA- 前綴
    const lengthCode   = extractLengthCodeFromVariantSKU(v.variantSKU ?? "", lookupBaseSku);
    const taaVariantSKU = `${origBaseSku}-${lengthCode}`;

    // 價格 × 1.2
    const basePriceNum = Number(String(v.variantPrice ?? v.price ?? "").replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(basePriceNum)) return null;
    const taaPrice = (basePriceNum * 1.2);
    const priceStr = taaPrice.toFixed(2);

    return {
      ...common,
      "Option1 Name": "Length",
      "Option2 Name": "",
      "Option3 Name": "",
      "Option1 Value": option1Value,
      "Option2 Value": "",
      "Option3 Value": "",
      Variant: option1Value,
      "Variant SKU": taaVariantSKU,
      "Variant Price": priceStr,
      "Price(USD)": priceStr,
    };
  }).filter(Boolean);
}

async function buildVariantsPayload_TAAFiberPatch_rows(rows) {
  const lists = await Promise.all((rows ?? []).map(buildVariantsPayload_TAAFiberPatch_row));
  const out = [];
  lists.forEach((list, i) => (list || []).forEach((v, j) => out.push({ __rowIndex: i, __variantIndex: j, ...v })));
  return out;
}

registerCalculator({
  id: "taaFiberPatch",
  label: "TAA 常規跳線",
  buildForRow: buildVariantsPayload_TAAFiberPatch_row,
  buildForRows: buildVariantsPayload_TAAFiberPatch_rows,
});
