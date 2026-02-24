function joinURL(base, path) {
  if (!base) return path;
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function parseResponse(resp) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadOperationLogCsv({ apiBase, requestId, accessToken }) {
  const url = joinURL(apiBase, `/api/operation-logs/${encodeURIComponent(requestId)}/export.csv`);
  const resp = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!resp.ok) {
    throw new Error(`下載結果失敗 (${resp.status})`);
  }

  const blob = await resp.blob();
  downloadBlob(`operation-log-${requestId}.csv`, blob);
}

export async function postJsonWithResultLog({
  apiBase,
  endpoint,
  body,
  accessToken,
  successMessage = "資料已送出。",
}) {
  const url = endpoint.startsWith("http") ? endpoint : joinURL(apiBase, endpoint);
  const resp = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await parseResponse(resp);

  if (!resp.ok) {
    throw new Error(data?.message || `Request failed (${resp.status})`);
  }

  const requestId = data?.requestId || "";
  let finalMessage = data?.message || successMessage;
  if (requestId) {
    finalMessage += `\nrequestId: ${requestId}`;
  }

  return { data, requestId, message: finalMessage };
}

export async function notifyAndOfferResultExport({
  requestId,
  message,
}) {
  const base = message || "資料已送出。";
  const hint = requestId
    ? `\n請到「結果紀錄」查看執行狀態與下載結果。\nrequestId: ${requestId}`
    : "\n請到「結果紀錄」查看執行狀態與下載結果。";
  alert(base.includes("結果紀錄") ? base : `${base}${hint}`);
}
