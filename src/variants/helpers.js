// ============================
// File: src/variants/helpers.js
// ============================
import { PRODUCT_DEFAULTS } from "../utils/buildPayload";
import { PRODUCT_DEFAULTS_TAA } from "../utils/buildPayload";

export function norm(s) {
  return String(s).replace(/[\s_]+/g, "").toLowerCase();
}

export function findKey(row, target) {
  const t = norm(target);
  return Object.keys(row || {}).find((k) => norm(k) === t);
}

/** 逗號切陣列（去頭尾空白、忽略整項空白） */
export function splitComma(str) {
  return String(str ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 斜線切陣列；保留洞（處理 "//"），並補齊到指定長度（缺值用 null） */
export function splitSlashKeepHoles(s, targetLen) {
  const parts = String(s ?? "")
    .split("/")
    .map((x) => {
      const t = x.trim();
      return t === "" ? null : t;
    });
  return Array.from({ length: Math.max(targetLen, 1) }, (_, i) => parts[i] ?? null);
}

export function stripQuotes(s) {
  return String(s ?? "")
    .trim()
    .replace(/^[“”"']+/, "")
    .replace(/[“”"']+$/, "");
}

/** 共用：從 row + PRODUCT_DEFAULTS 產出共用欄位 */
export function makeCommon(row) {
  const handleKey = findKey(row, "Handle");
  const handle = String(row?.[handleKey] ?? "").trim();
  const common = { ...PRODUCT_DEFAULTS, handle };
  Object.keys(PRODUCT_DEFAULTS).forEach((k) => {
    const keyInRow = findKey(row, k);
    if (keyInRow && String(row[keyInRow]).trim() !== "") {
      common[k] = String(row[keyInRow]);
    }
  });
  return common;
}

/** 共用：從 row + PRODUCT_DEFAULTS 產出共用欄位(TAA版本) */
export function makeCommon_taa(row) {
  const handleKey = findKey(row, "Handle");
  const handle = String(row?.[handleKey] ?? "").trim();
  const common = { ...PRODUCT_DEFAULTS_TAA, handle };
  Object.keys(PRODUCT_DEFAULTS_TAA).forEach((k) => {
    const keyInRow = findKey(row, k);
    if (keyInRow && String(row[keyInRow]).trim() !== "") {
      common[k] = String(row[keyInRow]);
    }
  });
  return common;
}

// 將任意字串/數字的價格清洗成「純數字字串」；空/無效回空字串
export function normalizePrice(raw, { decimals = null } = {}) {
  if (raw === undefined || raw === null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  // 移除幣別、空白、千分位等，只保留數字/小數點/負號
  const cleaned = s.replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return "";
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return "";
  return decimals == null ? String(n) : n.toFixed(decimals);
}

// UI 需要時可以用這個轉成「帶符號」的顯示字串
export function formatUSD(raw, { decimals = 2, withSymbol = false } = {}) {
  const numStr = normalizePrice(raw, { decimals });
  if (numStr === "") return "";
  const n = Number(numStr);
  const out = n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return withSymbol ? `US$${out}` : out;
}