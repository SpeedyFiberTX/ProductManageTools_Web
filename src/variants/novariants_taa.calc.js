// ============================
// File: src/variants/novariants.calc.js
// ============================
import { registerCalculator } from "./registry";
import { findKey, makeCommon_taa, normalizePrice } from "./helpers";

function buildVariantsPayload_noVariants(row) {
  if (!row) return [];
  const handleKey = findKey(row, "Handle");
  const skuKey = findKey(row, "SKU");
 const priceKey  = findKey(row, "Price(USD)") || findKey(row, "Variant Price");

  const handle = String(row?.[handleKey] ?? "").trim();
  if (!handle) return [];

  const common = makeCommon_taa(row);
const price  = normalizePrice(row?.[priceKey]);

  return [{
    ...common,
    Variant: "",
    "Option1 Name": "",
    "Option2 Name": "",
    "Option3 Name": "",
    "Option1 Value": "",
    "Option2 Value": "",
    "Option3 Value": "",
    "Variant SKU": String(row?.[skuKey] ?? ""),
    "Variant Price": price,
    "Price(USD)": price,
  }];
}

registerCalculator({
  id: "novariants_taa",
  label: "TAA 無變體",
  buildForRow: buildVariantsPayload_noVariants,
});