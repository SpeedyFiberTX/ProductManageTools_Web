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

function normalizeConnector(conn, meta) {
  if (!conn) return conn;
  if (meta.connectors.includes(conn)) return conn;
  if (conn.endsWith("O")) {
    const short = conn.slice(0, -1);
    if (meta.connectors.includes(short)) return short;
  }
  return conn;
}

/** proto+count 這個組合，在價目表表頭裡是否真的存在對應欄位 */
function protoCountExists(headers, proto, count) {
  return headers.some((h) => {
    const [h1, h2] = h.split("/");
    return h1 === proto && h2 === count;
  });
}

/**
 * 用動態 meta 解析 baseSku（長度優先；支援 ZH）
 *
 * proto 的判斷不能只憑「子字串最長者優先」：像 "MTPUUA12M3A3MMBZH" 這種 SKU，
 * 開頭剛好包含價目表裡另一個不相干型號的代碼 "MTPUU"（該代碼只搭配 16M4 出現），
 * 若直接採用最長匹配會誤判成 "MTPUU"，導致查無 "MTPUU+12M3" 這個不存在的欄位組合，
 * 即使真正對應的 "MTP+12M3" 欄位其實存在且有價格。
 * 因此改為：列出所有子字串匹配到的 proto 候選（仍按長度由長到短排序），
 * 依序驗證「候選 proto + 偵測到的 count」是否在表頭中真的存在，取第一個成立的；
 * 若都不成立才退回舊行為（取最長匹配或預設值），避免比原本更差。
 */
function parseSkuDynamic(baseSku = "", meta, headers = []) {
  const upper = String(baseSku).toUpperCase();
  const pick = USE_TOKEN_BOUNDARY ? firstTokenMatch : firstIncludes;

  const count = pick(meta.counts, upper) ?? null;

  const protoCandidates = USE_TOKEN_BOUNDARY
    ? [firstTokenMatch(meta.protos, upper)].filter(Boolean)
    : meta.protos.filter((p) => upper.includes(p));
  protoCandidates.push(upper.startsWith("MTP") ? "MTP" : "MPO"); // 保底，維持原本預設行為

  const proto =
    (count && protoCandidates.find((p) => protoCountExists(headers, p, count))) ??
    protoCandidates[0] ??
    null;

  const rawConn = pick(meta.connectors, upper) ?? null;
  const conn = normalizeConnector(rawConn, meta);

  // ✅ 加入 ZH：SKU 若含 ZH，就去匹配含 ZH 的價格欄（例如 "NR,ZH"）
  let polish = null;
  if (upper.includes("NP"))      polish = "NP";
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
    if (info.conn   && !h3.split(",").includes(info.conn)) continue;

    // ✅ 如果 SKU 判到 polish，就必須命中該 bucket（可對應 "NR,ZH"）
    if (info.polish) {
      const tokens = h4.split(",").map(s => s.trim());
      if (!tokens.includes(info.polish)) continue;
    }

    const price = Number(String(priceRaw).replace(/[^\d.-]/g, ""));
    if (Number.isFinite(price)) return price;
  }
  return null;
}

/** 讀 CSV → 產生 variants（只保留找到價格的長度） */
export async function mtpmpoTable(baseSku) {
  const res = await fetch(url);
  const text = await res.text();
  const { rows } = await parseCsvFile(text);   // 這裡不依賴 headers 了

  const meta = buildMetaFromRows(rows);        // ✅ 從 rows 的鍵名動態建 meta
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const info = parseSkuDynamic(baseSku, meta, headers); // ✅ 可解析 MTPBOMY08SMY3FLCU052ZH

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
