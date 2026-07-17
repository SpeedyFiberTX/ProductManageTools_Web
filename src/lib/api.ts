// src/lib/useApi.ts
import { useAuth } from '../auth/AuthContext';

// ✅ 同網域就用空字串，跨網域就填完整 origin
const API_BASE =  import.meta.env.VITE_API_BASE;
// ✅ 後端若需要 API Key，設定 VITE_API_KEY 後會自動帶上 X-API-Key
const API_KEY = import.meta.env.VITE_API_KEY;
// 去重複用的 refresh promise，避免同時多個 401 重複打 refresh
let refreshPromise: Promise<{ ok: boolean; accessToken: string | null }> | null = null;

function joinURL(base: string, path: string) {
  // 若 path 已是完整網址（http/https），直接使用，忽略 base
  if (/^https?:\/\//i.test(path)) return path;
  if (!base) return path.startsWith('/') ? path : `/${path}`;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return b + p;
}

export function useApi() {
  const { ready, accessToken } = useAuth(); // Retrieve accessToken

  async function rawFetch(path: string, init: RequestInit = {}, overrideToken?: string | null) {
    const url = joinURL(API_BASE, path);
    const headers = new Headers(init.headers || {});
    const hasBody = init.body !== undefined && init.body !== null;

    // 若 body 不是 FormData 才自動加 JSON header
    if (hasBody && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Add Authorization header if accessToken is available and not already set
    const tokenToUse = overrideToken !== undefined ? overrideToken : accessToken;
    if (tokenToUse && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${tokenToUse}`);
    }

    // Add X-API-Key header if configured and not already set
    if (API_KEY && !headers.has('X-API-Key')) {
      headers.set('X-API-Key', API_KEY);
    }

    return fetch(url, {
      ...init,
      // 預設帶 cookie（主後端 refresh 需要）；可由 init.credentials 覆寫，例如跨網域 API 用 'omit'
      credentials: init.credentials ?? 'include',
      headers,
    });
  }

  // 401 → refresh → 重試一次
  async function api(path: string, init: RequestInit = {}): Promise<Response> {
    if (!ready) throw new Error('Auth not ready');

    let resp = await rawFetch(path, init);
    if (resp.status !== 401) return resp;

    // 進入 refresh 區段（全域共用一個 promise）
    if (!refreshPromise) {
      refreshPromise = rawFetch('/auth/refresh', { method: 'POST' }, null)
        .then(async (r) => {
          if (!r.ok) return { ok: false, accessToken: null };
          try {
            const data = await r.json();
            return { ok: true, accessToken: data?.access_token || null };
          } catch {
            return { ok: true, accessToken: null };
          }
        });
    }
    let refreshResult: { ok: boolean; accessToken: string | null };
    try {
      refreshResult = await refreshPromise;
      if (!refreshResult.ok) return resp; // refresh 失敗 → 把 401 傳回去
    } finally {
      refreshPromise = null;
    }

    // refresh 成功 → 重送一次原請求
    const retryHeaders = new Headers(init.headers || {});
    retryHeaders.delete('Authorization');
    resp = await rawFetch(path, { ...init, headers: retryHeaders }, refreshResult.accessToken);
    return resp;
  }

  // 便捷：自動 parse JSON、錯誤時丟出 Error
  async function apiJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const resp = await api(path, init);
    const text = await resp.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!resp.ok) {
      const message = (data && (data.message || data.error)) || resp.statusText || 'Request failed';
      const err = new Error(message);
      (err as any).status = resp.status;
      (err as any).data = data;
      throw err;
    }
    return data as T;
  }

  function getJson<T = any>(path: string, init: RequestInit = {}) {
    return apiJson<T>(path, { method: 'GET', ...init });
  }

  function postJson<T = any>(path: string, body: any, init: RequestInit = {}) {
    return apiJson<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...init,
    });
  }

  return { fetch: api, getJson, postJson };
}
