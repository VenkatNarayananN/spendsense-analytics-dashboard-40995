import { apiFetch, apiGetJson } from '../services/apiClient';

/**
 * This module is a typed (via JSDoc) API layer used by UI components.
 * It intentionally:
 * - Uses the existing `apiClient` for Supabase JWT injection + 401 handling.
 * - Normalizes backend envelopes `{ success, data }` to data-first results.
 * - Keeps an ergonomic, stable surface for page/components.
 */

/**
 * @typedef {Object} ApiError
 * @property {false} ok
 * @property {number} status
 * @property {string} error
 * @property {string=} code
 */

/**
 * @template T
 * @typedef {Object} ApiOk
 * @property {true} ok
 * @property {T} data
 */

/**
 * @template T
 * @typedef {ApiOk<T> | ApiError} ApiResult
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} user_id
 * @property {number} amount
 * @property {string} currency
 * @property {string} category
 * @property {string} merchant
 * @property {string=} description
 * @property {string} occurred_at
 * @property {string=} created_at
 */

/**
 * @typedef {Object} TransactionCreate
 * @property {number} amount
 * @property {string} currency
 * @property {string} category
 * @property {string} merchant
 * @property {string=} description
 * @property {string} occurred_at
 */

/**
 * @typedef {Object} TransactionsPage
 * @property {number} limit
 * @property {number} offset
 * @property {number} total
 */

/**
 * @typedef {Object} TransactionsListResponse
 * @property {Transaction[]} items
 * @property {TransactionsPage | null} page
 */

/**
 * @typedef {Object} Alert
 * @property {string} id
 * @property {string} user_id
 * @property {string} type
 * @property {string} message
 * @property {string} status
 * @property {string=} created_at
 */

/**
 * @typedef {Object} AnalyticsSummaryRange
 * @property {string | null} from
 * @property {string | null} to
 */

/**
 * @typedef {Object} AnalyticsSummaryTopCategory
 * @property {string} category
 * @property {number} total
 */

/**
 * @typedef {Object} AnalyticsSummary
 * @property {number} total_spend
 * @property {number} average_daily_spend
 * @property {AnalyticsSummaryTopCategory[]} top_categories
 * @property {string[]} recent_merchants
 * @property {AnalyticsSummaryRange} range
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string | null=} name
 * @property {string | null=} avatar_url
 * @property {string | null=} created_at
 * @property {string | null=} updated_at
 */

/**
 * @typedef {Object} ProfileUpdate
 * @property {string=} name
 * @property {string=} avatar_url
 * @property {any=} [preferences] Forward-compatible bag (backend may ignore/reject).
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
  // UI may use YYYY-MM-DD (date inputs). Backend accepts string; we pass through as-is.
  if (!value) return undefined;
  return String(value);
}

function toUserFacingProfileUpdateError(resOrError) {
  if (!resOrError) return 'Something went wrong.';
  if (typeof resOrError === 'string') return resOrError;

  const status = resOrError?.status;
  const message = resOrError?.error || resOrError?.message;

  // For forward compatibility with onboarding/preferences keys, backend may reject.
  if (status === 400 || status === 404) {
    return (
      'We couldn’t save these preferences yet (your server may not support them). ' +
      'You can continue using the app, and try again later.'
    );
  }

  if (message) return message;
  return 'Something went wrong.';
}

// PUBLIC_INTERFACE
export async function fetchTransactions({
  from,
  to,
  category,
  merchant,
  limit = 50,
  offset = 0,
} = {}) {
  /**
   * Fetch a paginated list of transactions for the authenticated user.
   *
   * @param {{
   *   from?: string,
   *   to?: string,
   *   category?: string,
   *   merchant?: string,
   *   limit?: number,
   *   offset?: number,
   * }=} params
   * @returns {Promise<ApiResult<TransactionsListResponse>>}
   */
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
  /**
   * Create a transaction for the authenticated user.
   *
   * @param {TransactionCreate} payload
   * @returns {Promise<ApiResult<{ transaction: Transaction | null }>>}
   */
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
export async function fetchSummary({ from, to } = {}) {
  /**
   * Fetch analytics summary KPIs over an optional date range.
   *
   * @param {{ from?: string, to?: string }=} params
   * @returns {Promise<ApiResult<{ summary: AnalyticsSummary | null }>>}
   */
  const qs = toQueryString({ from: safeDateToApi(from), to: safeDateToApi(to) });

  const res = await apiGetJson(`/api/analytics/summary${qs}`, { redirectOn401: true, retryOn401: true });
  if (!res.ok) return res;

  // Expected: { success: true, data: { summary } }
  const summary = res.data?.data?.summary || null;
  return { ok: true, data: { summary } };
}

// PUBLIC_INTERFACE
export async function fetchAlerts({ status } = {}) {
  /**
   * List alerts for the authenticated user.
   *
   * @param {{ status?: string }=} params
   * @returns {Promise<ApiResult<{ items: Alert[] }>>}
   */
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
   * Note: Backend OpenAPI shows GET/POST /api/alerts but no explicit dismissal endpoint.
   * This client uses a pragmatic POST with status:"dismissed" and includes the id.
   *
   * @param {{ id: string, type?: string, message?: string }} params
   * @returns {Promise<ApiResult<any>>}
   */
  const res = await apiFetch('/api/alerts', {
    method: 'POST',
    redirectOn401: true,
    retryOn401: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      type: type || 'system',
      message: message || 'Dismissed',
      status: 'dismissed',
    }),
  });

  if (!res.ok) return res;
  return { ok: true, data: res.data?.data || null };
}

// PUBLIC_INTERFACE
export async function updateProfile(patch) {
  /**
   * Update the authenticated user's profile via PUT /api/users/me.
   *
   * Backend officially supports: { name, avatar_url }
   * We allow extra keys for forward compatibility. If rejected, we return a friendly message.
   *
   * @param {ProfileUpdate} patch
   * @returns {Promise<ApiResult<{ user: UserProfile | null }>>}
   */
  const res = await apiFetch('/api/users/me', {
    method: 'PUT',
    redirectOn401: true,
    retryOn401: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch || {}),
  });

  if (!res.ok) {
    return { ...res, error: toUserFacingProfileUpdateError(res) };
  }

  // Expected: { success: true, data: { user } }
  const user = res.data?.data?.user || null;
  return { ok: true, data: { user } };
}
