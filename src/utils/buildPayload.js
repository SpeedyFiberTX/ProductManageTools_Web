// ============================
// File: src/utils/buildPayload.js
// （已移除所有變體算法，僅保留 Products / Metafields / Translations）
// ============================

export const PRODUCT_DEFAULTS = {
  "Variant Grams": "0",
  "Variant Inventory Tracker": "shopify",
  "Variant Inventory Qty / SpeedyFiberTX Shenzhen": "200",
  "Variant Inventory Policy": "continue",
  "Variant Requires Shipping": "TRUE",
  "Variant Taxable": "TRUE",
  "Variant Compare At Price": "",
  "Variant Barcode": "",
  "Variant Inventory Qty / SpeedyFiberTX TW": ""
};

export const PRODUCT_DEFAULTS_TAA = {
  "Variant Grams": "0",
  "Variant Inventory Tracker": "shopify",
  "Variant Inventory Qty / SpeedyFiberTX SPTW": "200",
  "Variant Inventory Qty / SpeedyFiberTX Shenzhen": "0",
  "Variant Inventory Policy": "continue",
  "Variant Requires Shipping": "TRUE",
  "Variant Taxable": "TRUE",
  "Variant Compare At Price": "",
  "Variant Barcode": "",
  "Variant Inventory Qty / SpeedyFiberTX TW": ""
};

const METAFIELDS_DEFAULTS = {
  "theme.label_1_bg_color": "#6D6A6A",
  "theme.label_1_text_color": "#FFFFFF",
  "theme.label_2_bg_color": "#CB2D2D",
  "theme.label_2_text_color": "#FFFFFF",
  "theme.label_3_bg_color": "#3DA8B8",
  "theme.label_3_text_color": "#FFFFFF",
  "theme.label_4_bg_color": "#3DA8B8",
  "theme.label_4_text_color": "#FFFFFF",
};

// 產品欄位
const PRODUCT_FIELDS = [
  ["Handle", "handle"],
  ["Title", "title"],
  ["Description", "description"],
  ["Description_type", "description_type"],
  ["Vendor", "Vendor"],
  ["Type", "Type"],
  ["SEO Tags", "Tags"],
  ["SEO Title", "SEO Title"],
  ["SEO Description", "SEO Description"],
  ["Status", "Status"],
  ["Collections", "collections"],
  ["Template", "Template"],
  // ["SKU", "Variant SKU"],
  // ["Price(USD)", "Variant Price"],
  ["Option Name", "Option1 Name"]
];

// 自訂欄位
const METAFIELDS_FIELDS = [
  ["Handle", "handle"],
  // content
  ["Highlight_type", "content.highlight_type"],
  ["Highlight", "content.highlight"],
  ["Application_type", "content.application_type"],
  ["Application", "content.application"],
  ["Feature_type", "content.features_type"],
  ["Feature", "content.features"],
  ["Specification_type", "content.specification_type"],
  ["Specification", "content.specification"],
  ["Specification_html", "content.specification_html"],
  // Filter
  ["#Transceiver Type", "filter.transceiverType"],
  ["#Fiber Mode", "filter.fiberMode"],
  ["#Connector Type", "filter.connectorType"],
  ["#Polish Type", "filter.polishType"],
  ["#Transmission Mode", "filter.transmissionMode"],
  ["#Insertion Loss Grade", "filter.insertionLossGrade"],
  ["#Transmission Distance", "filter.transmissionDistance"],
  ["#Data Rate (Gbps)", "filter.data_rate_gbps"],
  ["#Branch Type", "filter.branchType"],
  ["#Fiber Count", "filter.fiberCount"],
  ["#Connector Gender", "filter.connectorGender"],
  ["#Connector Color", "filter.connectorColor"],
  ["#ConnectorA", "filter.connector_a"],
  ["#ConnectorB", "filter.connector_b"],
  ["#Jacket Color", "filter.jacketColor"],
  ["#Jacket", "filter.jacket"],
  ["#Wavelength", "filter.wavelength_filter"],
  ["#Polarity", "filter.polarity"],
  ["#Body Type", "filter.bodyType"],
  ["#Gender", "filter.gender"],
  ["#TAA", "filter.taa"],
  // Compatibility Brand
  ["Compatibility", "custom.compatibility"],
  // Theme
  ["Label 1", "theme.label_1"],
  ["Label 2", "theme.label_2"],
  ["Label 3", "theme.label_3"],
  ["Shipping Time", "theme.shipping_time"],
  ["是否開啟詢價", "theme.inquiry"],
  // 關聯產品
  ["關聯產品","recommendation.related_products"]
];

// 翻譯欄位
const TRANSLATE_FIELDS = [
  ["Handle", "handle"],
  ["中文 Title", "title"],
  ["中文 Description", "description"],
  ["中文 Description_type", "description_type"],
  ["中文 SEO Description", "meta_description"],
  ["中文 Highlight", "content.highlight"],
  ["中文 Highlight_type", "content.highlight_type"],
  ["中文 Application", "content.application"],
  ["中文 Application_type", "content.application_type"],
  ["中文 Feature", "content.features"],
  ["中文 Feature_type", "content.features_type"],
  ["中文 Specification", "content.specification"],
  ["中文 Specification_type", "content.specification_type"],
  ["中文 Specification_html", "content.specification_html"],
  ["發貨時間", "theme.shipping_time"],
];

/** 將一筆 CSV row 轉成後端要吃的產品 payload */
export function buildProductsPayload(row) {
  const out = {
    // ...PRODUCT_DEFAULTS,
    handle: String(row?.Handle ?? "").trim(),
  };

  PRODUCT_FIELDS.forEach(([csvKey, apiKey]) => {
    const v = row?.[csvKey];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      out[apiKey] = String(v);
    }
  });

  return out;
}

/** 多筆 */
export function buildProductsPayloads(rows) {
  return (rows ?? [])
    .map(buildProductsPayload)
    .filter((p) => p.handle);
}

/** 將一筆 CSV row 轉成後端要吃的自訂欄位 payload */
export function buildMetafieldsPayload(row, customMap = {}) {
  const out = {
    ...METAFIELDS_DEFAULTS,
    handle: String(row?.Handle ?? "").trim(),
  };

  METAFIELDS_FIELDS.forEach(([csvKey, apiKey]) => {
    const v = row?.[csvKey];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      out[apiKey] = String(v);
    }
  });

  Object.entries(customMap || {}).forEach(([slot, header]) => {
    if (!header) return;
    const key = typeof header === "string" ? header.trim() : header;
    const raw = row?.[key];
    if (raw === undefined || raw === null) return;
    const str = String(raw);
    if (str.trim() === "") return;
    out[`table.${slot}`] = str;
  });

  return out;
}

/** 多筆 */
export function buildMetafieldsPayloads(rows, customMap = {}) {
  return (rows ?? [])
    .map((row) => buildMetafieldsPayload(row, customMap))
    .filter((p) => p.handle);
}

/** 將一筆 CSV row 轉成後端要吃的翻譯 payload */
export function buildTranslationPayload(row) {
  const out = {
    handle: String(row?.Handle ?? "").trim(),
  };

  TRANSLATE_FIELDS.forEach(([csvKey, apiKey]) => {
    const v = row?.[csvKey];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      out[apiKey] = String(v);
    }
  });

  return out;
}

/** 多筆 */
export function buildTranslationPayloads(rows) {
  return (rows ?? [])
    .map(buildTranslationPayload)
    .filter((p) => p.handle);
}