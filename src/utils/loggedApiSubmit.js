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

export async function downloadOperationLogCsv({ apiFetch, requestId }) {
  const resp = await apiFetch(`/api/operation-logs/${encodeURIComponent(requestId)}/export.csv`, {
    method: "GET",
  });

  if (!resp.ok) {
    throw new Error(`下載結果失敗 (${resp.status})`);
  }

  const blob = await resp.blob();
  downloadBlob(`operation-log-${requestId}.csv`, blob);
}

export async function postJsonWithResultLog({
  apiFetch,
  endpoint,
  body,
  successMessage = "資料已送出。",
}) {
  const resp = await apiFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
