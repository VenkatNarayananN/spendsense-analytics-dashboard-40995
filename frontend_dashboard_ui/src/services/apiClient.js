import { getBackendUrl } from '../config/env';
import { getSupabase } from '../config/supabaseClient';

const POST_LOGIN_REDIRECT_KEY = 'spendsense.postLoginRedirect';

/**
 * This module centralizes fetch() calls to the backend API.
 *
 * Key goals:
 * - Always attach the current Supabase access token for `/api/*` requests.
 * - Avoid stale tokens by calling `supabase.auth.getSession()` on every call.
 * - Handle unauthorized responses consistently with existing ProtectedRoute logic:
 *   store intended path and redirect to "/".
 *
 * NOTE: This client must never expose any server-side secrets to the frontend.
 */

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function persistIntendedRedirect() {
  // Mirror ProtectedRoute's behavior so the login flow can bring users back.
  try {
    const intended =
      typeof window !== 'undefined'
        ? `${window.location.pathname || '/'}${window.location.search || ''}${window.location.hash || ''}`
        : '/';
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, intended);
  } catch {
    // Ignore storage errors (private mode / quota).
  }
}

function redirectToHomePreservingIntendedPath() {
  if (typeof window === 'undefined') return;
  persistIntendedRedirect();

  // Use a hard navigation to align with existing routing behavior and ensure a clean state.
  // (This is acceptable because it only triggers after auth failure.)
  window.location.assign('/');
}

async function getFreshAccessToken() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;

  return data?.session?.access_token || null;
}

/**
 * Normalize backend error responses into a user-safe message.
 * Backend uses a standardized JSON format: { success: false, error: { code, message, ... } }
 * We avoid leaking technical details to the UI.
 */
function toUserSafeErrorMessage({ status, payload }) {
  const msg =
    payload?.error?.message ||
    payload?.message ||
    payload?.error ||
    (status ? `Request failed (HTTP ${status}).` : 'Request failed.');
  return typeof msg === 'string' ? msg : 'Request failed.';
}

// PUBLIC_INTERFACE
export async function apiFetch(path, options = {}) {
  /**
   * Fetch helper for backend API calls.
   *
   * - `path` may be "/api/..." or a full URL.
   * - If the request targets `/api/*`, we attach Authorization: Bearer <access_token> when available.
   * - On 401:
   *    - optionally refresh session once by re-reading getSession() (supabase-js autoRefreshToken is enabled)
   *    - if still 401, redirect to "/" preserving intended path
   *
   * @param {string} path
   * @param {RequestInit & { redirectOn401?: boolean, retryOn401?: boolean }} options
   * @returns {Promise<{ ok: true, status: number, data: any } | { ok: false, status: number, error: string, code?: string }>}
   */
  const {
    redirectOn401 = true,
    retryOn401 = true,
    headers: inputHeaders,
    ...fetchOptions
  } = options;

  const backendUrl = getBackendUrl();

  const isFullUrl = /^https?:\/\//i.test(path);
  const url = isFullUrl
    ? path
    : backendUrl
      ? `${backendUrl.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`
      : path;

  const isApiPath = (() => {
    try {
      const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      return u.pathname.startsWith('/api/');
    } catch {
      return String(path).startsWith('/api/');
    }
  })();

  const headers = new Headers(inputHeaders || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  // Attach auth header for backend API endpoints
  if (isApiPath) {
    const token = await getFreshAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  async function doFetchOnce() {
    const res = await fetch(url, { ...fetchOptions, headers });

    // Always read text first so we can safely parse json or return empty.
    const text = await res.text();
    const payload = safeJsonParse(text);

    if (res.ok) {
      return { ok: true, status: res.status, data: payload };
    }

    const code = payload?.error?.code;
    const error = toUserSafeErrorMessage({ status: res.status, payload });

    return { ok: false, status: res.status, error, code };
  }

  const first = await doFetchOnce();

  if (first.ok) return first;

  if (isApiPath && first.status === 401) {
    if (retryOn401) {
      // Attempt one more time. We re-read session to avoid a stale token.
      const token = await getFreshAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const second = await doFetchOnce();

      if (second.ok) return second;

      if (second.status === 401 && redirectOn401) {
        redirectToHomePreservingIntendedPath();
      }
      return second;
    }

    if (redirectOn401) {
      redirectToHomePreservingIntendedPath();
    }
  }

  return first;
}

// PUBLIC_INTERFACE
export async function apiGetJson(path, options = {}) {
  /**
   * Convenience wrapper around apiFetch for GET requests returning JSON.
   *
   * @param {string} path
   * @param {RequestInit & { redirectOn401?: boolean, retryOn401?: boolean }} options
   * @returns {Promise<{ ok: true, data: any } | { ok: false, status: number, error: string, code?: string }>}
   */
  const res = await apiFetch(path, { ...options, method: 'GET' });
  if (res.ok) return { ok: true, data: res.data };
  return res;
}
