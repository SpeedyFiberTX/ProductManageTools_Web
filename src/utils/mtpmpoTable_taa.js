// src/utils/mtpmpoTable.js
import { parseCsvFile } from "./parseCsv";

const EXCLUDE = new Set(["Length Spec", "SKU"]);
const url = `${import.meta.env.BASE_URL}csv/MTPMPOPrice.csv`;

// 長碼優先，避免 FFB 誤配 FFBA
const sortDescLen = (a, b) => b.length - a.length || a.localeCompare(b);

/** 從「所有 row 的鍵名」動態蒐集 proto/count/connector（不依賴 parseCsvFile 回傳 headers） */
function buildMetaFromRows(rows = []) {
  const protos = new Set();
  const counts = new Set();
  const connectors = new Set();

  // 把每一列的所有欄名掃過，收集像 MTPBO/12SM/FLC,FSC/NP 這種價格欄
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (EXCLUDE.has(k)) continue;
      if (typeof k !== "string") continue;
      const parts = k.split("/");
      if (parts.length < 2) continue; // 非價格欄
      const [proto, count, connGroup] = parts;
      if (proto) protos.add(proto.trim());
      if (count) counts.add(count.trim());
      if (connGroup) {
        for (const c of connGroup.split(",")) {
          const code = c.trim();
          if (code) connectors.add(code);
        }
      }
    }
  }

  return {
    protos: Array.from(protos).sort(sortDescLen),
    counts: Array.from(counts).sort(sortDescLen),
    connectors: Array.from(connectors).sort(sortDescLen),
  };
}

// 若 SKU 有 -/_ 可開啟更嚴謹的邊界比對
const USE_TOKEN_BOUNDARY = false;
function firstTokenMatch(list, text) {
  const alts = list.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(?:^|[-_])(${alts})(?=[-_]|$)`, "i");
  const m = text.match(re);
  return m ? m[1].toUpperCase() : null;
}
function firstIncludes(list, text) {
  return list.find(s => text.includes(s)) || null;
}

/** 用動態 meta 解析 baseSku（長度優先；支援 ZH） */
function parseSkuDynamic(baseSku = "", meta) {
  const upper = String(baseSku).toUpperCase();
  const pick = USE_TOKEN_BOUNDARY ? firstTokenMatch : firstIncludes;

  const proto = pick(meta.protos, upper) ?? (upper.startsWith("MTP") ? "MTP" : "MPO");
  const count = pick(meta.counts, upper) ?? null;
  const conn = pick(meta.connectors, upper) ?? null;

  // ✅ 加入 ZH：SKU 若含 ZH，就去匹配含 ZH 的價格欄（例如 "NR,ZH"）
  let polish = null;
  if (upper.includes("NP")) polish = "NP";
  else if (upper.includes("NR")) polish = "NR";
  else if (upper.includes("ZH")) polish = "ZH";

  return { proto, count, conn, polish };
}

/** 在單一 row 依解析後 info 找價格 */
function priceFromRowForSku(row, info) {
  for (const [header, priceRaw] of Object.entries(row)) {
    if (EXCLUDE.has(header) || priceRaw == null || String(priceRaw).trim() === "") continue;

    // 例： "MTPBO/08SM/FLC,FSC,FFC,FST/NR,ZH"
    const [h1, h2, h3 = "", h4 = ""] = String(header).split("/");
    if (h1 !== info.proto) continue;
    if (h2 !== info.count) continue;
    if (info.conn && !h3.split(",").includes(info.conn)) continue;

    // ✅ 如果 SKU 判到 polish，就必須命中該 bucket（可對應 "NR,ZH"）
    if (info.polish) {
      const tokens = h4.split(",").map(s => s.trim());
      if (!tokens.includes(info.polish)) continue;
    }

    const price = Number((Number(String(priceRaw).replace(/[^\d.-]/g, "")) * 1.1).toFixed(2)); //TAA 貴1.1
    if (Number.isFinite(price)) return price;
  }
  return null;
}

/** 讀 CSV → 產生 variants（只保留找到價格的長度） */
export async function mtpmpoTable_TAA(baseSku) {
  const res = await fetch(url);
  const text = await res.text();
  const { rows } = await parseCsvFile(text);   // 這裡不依賴 headers 了

  const meta = buildMetaFromRows(rows);        // ✅ 從 rows 的鍵名動態建 meta
  const info = parseSkuDynamic(baseSku, meta); // ✅ 可解析 MTPBOMY08SMY3FLCU052ZH

  const variants = rows.reduce((acc, row) => {
    const lengthSpec = row["Length Spec"]; // e.g. "0.2 m / 7 in"
    const lengthCode = row["SKU"];         // e.g. "020CM"
    const price = priceFromRowForSku(row, info);

    if (lengthSpec && lengthCode && price != null) {
      acc.push({
        option1Name: "Length",
        option1Value: lengthSpec,
        variantSKU: `${baseSku}-${lengthCode}`,
        variantPrice: price,
      });
    }
    return acc;
  }, []);

  return { baseSku, variants };
}
