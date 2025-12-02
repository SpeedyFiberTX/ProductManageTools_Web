// ============================
// File: src/variants/fiberPatch.calc.js
// ============================
import { registerCalculator } from "./registry";
import { findKey, makeCommon } from "./helpers";
import { fiberPatchCableTable } from "../utils/fiberPatchCableTable";

async function buildVariantsPayload_fiberPatch_armored_row(row) {
  if (!row) return [];

  const handleKey = findKey(row, "Handle");
  const skuKey = findKey(row, "SKU") || findKey(row, "Variant SKU");

  const handle = String(row?.[handleKey] ?? "").trim();
  const baseSku = String(row?.[skuKey] ?? "").trim();
  if (!handle || !baseSku) return [];

  const common = makeCommon(row);

  const opt1Name =
    row?.[findKey(row, "Option1 Name")] ??
    row?.[findKey(row, "Option Name")] ??
    "Length";
  const opt2Name = row?.[findKey(row, "Option2 Name")] ?? "";
  const opt3Name = row?.[findKey(row, "Option3 Name")] ?? "";

  const { variants } = await fiberPatchCableTable(baseSku);

  return (variants || []).map((v) => {

    // 價格*1.2
    const basePriceNum = Number(String(v.variantPrice ?? v.price ?? "").replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(basePriceNum)) return null;
    const armoredPrice = (basePriceNum * 1.2);
    const priceStr = armoredPrice.toFixed(2);

    return {
      ...common,
      "Option1 Name": opt1Name,
      "Option2 Name": opt2Name,
      "Option3 Name": opt3Name,
      "Option1 Value": v.option1Value ?? "",
      "Option2 Value": "",
      "Option3 Value": "",
      Variant: v.option1Value ?? "",
      "Variant SKU": v.variantSKU ?? "",
      "Variant Price": priceStr,
      "Price(USD)": priceStr,
    };
  });
}

async function buildVariantsPayload_fiberPatch_armored_rows(rows) {
  const lists = await Promise.all((rows ?? []).map(buildVariantsPayload_fiberPatch_armored_row));
  const out = [];
  lists.forEach((list, i) => (list || []).forEach((v, j) => out.push({ __rowIndex: i, __variantIndex: j, ...v })));
  return out;
}

registerCalculator({
  id: "fiberpatchcable_armored",
  label: "常規跳線(鎧裝)",
  buildForRow: buildVariantsPayload_fiberPatch_armored_row,
  buildForRows: buildVariantsPayload_fiberPatch_armored_rows,
});
