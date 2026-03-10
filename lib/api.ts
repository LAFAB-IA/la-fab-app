import { API_URL } from "./constants";
import { getToken, setToken, getRefreshToken, setRefreshToken, clearToken } from "./auth";

let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    setToken(data.access_token);
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Don't override Content-Type for FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  console.log('[fetchWithAuth]', url, 'token:', token ? token.slice(0, 20) + '...' : 'NONE');

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    console.warn('[fetchWithAuth]', res.status, url);
    const body = await res.clone().json().catch(() => ({}));
    if (body.code === "TOKEN_EXPIRED" || body.error === "INVALID_TOKEN" || res.status === 403) {
      // Deduplicate concurrent refreshes
      if (!refreshPromise) {
        refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        res = await fetch(url, { ...options, headers });
        console.log('[fetchWithAuth] retried after refresh:', res.status, url);
        window.dispatchEvent(new CustomEvent("token-refreshed", { detail: newToken }));
        return res;
      }
    }
    // Refresh failed or other 401 → logout
    if (res.status === 401) {
      clearToken();
      window.location.href = "/login";
    }
  }

  return res;
}
