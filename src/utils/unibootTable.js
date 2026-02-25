// ============================
// File: src/utils/unibootTable.js
// ============================
import { parseCsvFile } from "./parseCsv";

const url = `${import.meta.env.BASE_URL}csv/unibootPrice.csv`;

// 僅由表頭蒐集「系列代號」：XXXXX 與 XXXXX-NP
function collectSeriesCodes(headers = []) {
  const codes = new Set();
  for (const h of headers) {
    const key = String(h).trim().toUpperCase();
    if (/^[A-Z0-9]{5}$/.test(key)) {
      codes.add(key);
    } else {
      const m = key.match(/^([A-Z0-9]{5})-NP$/);
      if (m) codes.add(m[1]);
    }
  }
  return Array.from(codes);
}

// baseSku 是否包含某 5 碼系列（不分大小寫）
// 若 SKU 中有 -/_，可考慮用 token 邊界避免誤擊；這裡先走 includes，簡單直覺
function findSeriesInSku(baseSku = "", seriesList = []) {
  const up = String(baseSku).toUpperCase();
  return seriesList.find(code => up.includes(code)) || null;
}

// 檢查倒數兩碼是否為 NP
function isNP(baseSku = "") {
  const up = String(baseSku).toUpperCase();
  return up.slice(-2) === "NP";
}

/** 讀 CSV → 產生 variants
 * 規則：
 *  - 「系列代號」不再固定取前 5 碼；只要 baseSku 內含「表頭的任一 5 碼」即可。
 *  - 若第 15–16 碼是 NP → 僅用 <系列>-NP 欄；否則用 <系列> 欄。
 *  - 固定 option 欄、SKU 欄（大小寫精準：option / SKU）
 */
export async function unibootCableTable(baseSku) {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  const text = await res.text();
  const { rows } = await parseCsvFile(text);

  if (!rows?.length) {
    console.warn("[uniboot] 價目表是空的");
    return { baseSku, variants: [] };
  }

  // 從第一列反推表頭
  const headers = Object.keys(rows[0] || {});
  const OPTION_KEY = "option";
  const LENGTH_CODE_KEY = "SKU";

  if (!headers.includes(OPTION_KEY) || !headers.includes(LENGTH_CODE_KEY)) {
    console.warn("[uniboot] 缺少必要欄位(option 或 SKU)", { headers });
    return { baseSku, variants: [] };
  }

  // 從表頭建立系列代號清單 → 在 baseSku 中尋找命中的系列
  const seriesList = collectSeriesCodes(headers);
  const series = findSeriesInSku(baseSku, seriesList);

  if (!series) {
    console.warn("[uniboot] baseSku 未命中任何系列代號", { baseSku, seriesListPreview: seriesList.slice(0, 10) });
    return { baseSku, variants: [] };
  }

  // 依 NP 與否挑價格欄
  const wantNP = isNP(baseSku);
  const priceHeader = wantNP ? `${series}-NP` : `${series}`;

  if (!headers.includes(priceHeader)) {
    console.warn("[uniboot] 找不到價格欄", { baseSku, series, wantNP, priceHeader, headersPreview: headers.slice(0, 20) });
    return { baseSku, variants: [] };
  }

  // 組 variants（calc 可直接 passthrough 使用 variantSKU/variantPrice/option1Value）
  const variants = rows.reduce((acc, row) => {
    const optionText = row[OPTION_KEY];
    const lengthCode = row[LENGTH_CODE_KEY];
    const priceRaw   = row[priceHeader];

    if (!optionText || !lengthCode) return acc;
    if (priceRaw == null || String(priceRaw).trim() === "") return acc;

    const priceNum = Number(String(priceRaw).replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(priceNum)) return acc;

    acc.push({
      option1Value: String(optionText).trim(),
      variantSKU: `${baseSku}-${String(lengthCode).trim()}`,
      variantPrice: priceNum,
      _series: series,       // 方便除錯
      _priceHeader: priceHeader,
    });
    return acc;
  }, []);

  console.log("[uniboot] sample", variants[0]);
  return { baseSku, variants };
}
