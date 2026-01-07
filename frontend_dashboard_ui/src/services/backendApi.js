import { apiFetch, apiGetJson } from './apiClient';

/**
 * Small typed-ish wrapper layer around our backend REST endpoints.
 * Keeps page components clean and ensures all requests go through apiClient
 * (which injects Supabase JWT for /api/* paths).
 */

function toQueryString(params) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function safeDateToApi(value) {
  // UI may use YYYY-MM-DD (date inputs). Backend accepts string; we pass through.
  if (!value) return undefined;
  return String(value);
}

// PUBLIC_INTERFACE
export async function listTransactions({
  from,
  to,
  category,
  merchant,
  limit = 50,
  offset = 0,
} = {}) {
  /** List transactions for the authenticated user with optional filters and pagination. */
  const qs = toQueryString({
    from: safeDateToApi(from),
    to: safeDateToApi(to),
    category: category && category !== 'all' ? category : undefined,
    merchant,
    limit,
    offset,
  });

  const res = await apiGetJson(`/api/transactions${qs}`, { redirectOn401: true, retryOn401: true });
  if (!res.ok) return res;

  // Expected: { success: true, data: { items, page } }
  const items = res.data?.data?.items || [];
  const page = res.data?.data?.page || null;

  return { ok: true, data: { items, page } };
}

// PUBLIC_INTERFACE
export async function createTransaction(payload) {
  /** Create a transaction for the authenticated user. */
  const res = await apiFetch('/api/transactions', {
    method: 'POST',
    redirectOn401: true,
    retryOn401: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return res;

  // Expected: { success: true, data: { transaction } }
  const transaction = res.data?.data?.transaction || null;
  return { ok: true, data: { transaction } };
}

// PUBLIC_INTERFACE
export async function getAnalyticsSummary({ from, to } = {}) {
  /** Fetch analytics summary KPIs over an optional date range. */
  const qs = toQueryString({ from: safeDateToApi(from), to: safeDateToApi(to) });

  const res = await apiGetJson(`/api/analytics/summary${qs}`, { redirectOn401: true, retryOn401: true });
  if (!res.ok) return res;

  // Expected: { success: true, data: { summary } }
  const summary = res.data?.data?.summary || null;
  return { ok: true, data: { summary } };
}

// PUBLIC_INTERFACE
export async function listAlerts({ status } = {}) {
  /** List alerts for the authenticated user. */
  const qs = toQueryString({ status });
  const res = await apiGetJson(`/api/alerts${qs}`, { redirectOn401: true, retryOn401: true });
  if (!res.ok) return res;

  // Expected: { success: true, data: { items } }
  const items = res.data?.data?.items || [];
  return { ok: true, data: { items } };
}

// PUBLIC_INTERFACE
export async function dismissAlert({ id, type, message }) {
  /**
   * Dismiss an alert.
   *
   * Backend OpenAPI only exposes POST /api/alerts (create) so we use a pragmatic
   * "status change" POST with status: dismissed.
   *
   * This preserves UI behavior while allowing backend to interpret it as a dismissal.
   */
  const res = await apiFetch('/api/alerts', {
    method: 'POST',
    redirectOn401: true,
    retryOn401: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // send the id so backend can treat this as an upsert/status change if supported
      id,
      type: type || 'system',
      message: message || 'Dismissed',
      status: 'dismissed',
    }),
  });

  if (!res.ok) return res;
  return { ok: true, data: res.data?.data || null };
}
