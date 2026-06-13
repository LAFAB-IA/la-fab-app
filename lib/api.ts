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
  options: RequestInit = {},
  _retry = false                     // anti-loop guard: true on the replayed request
): Promise<Response> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers);

  // Authorization: always set when a token is available
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Content-Type: for FormData, delete any preset value so the browser sets
  // multipart/form-data with the correct boundary automatically.
  // For everything else, default to application/json if not already specified.
  if (isFormData) {
    headers.delete("Content-Type");
  } else if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  console.log(
    '[fetchWithAuth]', url,
    '| token:', token ? token.slice(0, 20) + '...' : 'NULL ⚠️',
    '| Authorization:', headers.get('Authorization') ? 'SET' : 'ABSENT ⚠️',
  );

  const res = await fetch(url, { ...options, headers });

  // Only attempt refresh once — _retry=true on the replayed call prevents a second refresh loop
  if (!_retry && (res.status === 401 || res.status === 403)) {
    console.warn('[fetchWithAuth]', res.status, url);
    const body = await res.clone().json().catch(() => ({}));
    if (
      body.code === "TOKEN_EXPIRED" ||
      body.error === "INVALID_TOKEN" ||
      body.error === "MISSING_AUTH_TOKEN" ||
      res.status === 403
    ) {
      // Deduplicate concurrent refreshes
      if (!refreshPromise) {
        refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        // Notify React auth state of the new token, then replay with fresh credentials
        window.dispatchEvent(new CustomEvent("token-refreshed", { detail: newToken }));
        const retried = await fetchWithAuth(url, options, true);
        console.log('[fetchWithAuth] retried after refresh:', retried.status, url);
        // Fresh token still rejected → last resort logout
        if (retried.status === 401) {
          clearToken();
          window.location.href = "/login?reason=session_expired";
        }
        return retried;
      }
      // Refresh attempted but failed (no new token) → last resort logout
      console.warn('[fetchWithAuth] clearToken déclenché — refresh échoué sur:', url, '| body:', JSON.stringify(body));
      clearToken();
      window.location.href = "/login?reason=session_expired";
    } else {
      // Unrecognized 401/403 code — return response without clearing token
      console.warn('[fetchWithAuth] 401/403 non reconnu — code:', body.code, 'error:', body.error, 'url:', url, '→ token PRÉSERVÉ');
    }
  }

  return res;
}
