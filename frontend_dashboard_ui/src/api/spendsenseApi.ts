import { apiFetch, apiGetJson } from '../services/apiClient';
import type {
  Alert,
  ApiResult,
  AnalyticsSummary,
  BackendEnvelope,
  DismissAlertParams,
  FetchAlertsParams,
  FetchSummaryParams,
  FetchTransactionsParams,
  ProfileUpdate,
  Transaction,
  TransactionCreate,
  TransactionsListResponse,
  UserProfile,
} from './types';

/**
 * This module is a typed API layer used by UI components.
 * It intentionally:
 * - Uses the existing `apiClient` for Supabase JWT injection + 401 handling.
 * - Normalizes backend envelopes `{ success, data }` to data-first results.
 * - Keeps an ergonomic, stable surface for pages/components.
 */

function toQueryString(params?: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function safeDateToApi(value?: string) {
  // UI may use YYYY-MM-DD (date inputs). Backend accepts string; we pass through as-is.
  if (!value) return undefined;
  return String(value);
}

function toUserFacingProfileUpdateError(resOrError: any) {
  if (!resOrError) return 'Something went wrong.';
  if (typeof resOrError === 'string') return resOrError;

  const status = resOrError?.status as number | undefined;
  const message = (resOrError?.error || resOrError?.message) as string | undefined;

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
export async function fetchTransactions(
  params: FetchTransactionsParams = {}
): Promise<ApiResult<TransactionsListResponse>> {
  /**
   * Fetch a paginated list of transactions for the authenticated user.
   */
  const { from, to, category, merchant, limit = 50, offset = 0 } = params;

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

  const envelope = res.data as BackendEnvelope<{ items: Transaction[]; page: any }>;
  const items = envelope?.data?.items || [];
  const page = envelope?.data?.page || null;

  return { ok: true, data: { items, page } };
}

// PUBLIC_INTERFACE
export async function createTransaction(
  payload: TransactionCreate
): Promise<ApiResult<{ transaction: Transaction | null }>> {
  /**
   * Create a transaction for the authenticated user.
   */
  const res = await apiFetch('/api/transactions', {
    method: 'POST',
    redirectOn401: true,
    retryOn401: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return res;

  const envelope = res.data as BackendEnvelope<{ transaction: Transaction }>;
  const transaction = envelope?.data?.transaction || null;

  return { ok: true, data: { transaction } };
}

// PUBLIC_INTERFACE
export async function fetchSummary(
  params: FetchSummaryParams = {}
): Promise<ApiResult<{ summary: AnalyticsSummary | null }>> {
  /**
   * Fetch analytics summary KPIs over an optional date range.
   */
  const { from, to } = params;
  const qs = toQueryString({ from: safeDateToApi(from), to: safeDateToApi(to) });

  const res = await apiGetJson(`/api/analytics/summary${qs}`, { redirectOn401: true, retryOn401: true });
  if (!res.ok) return res;

  const envelope = res.data as BackendEnvelope<{ summary: AnalyticsSummary }>;
  const summary = envelope?.data?.summary || null;

  return { ok: true, data: { summary } };
}

// PUBLIC_INTERFACE
export async function fetchAlerts(
  params: FetchAlertsParams = {}
): Promise<ApiResult<{ items: Alert[] }>> {
  /**
   * List alerts for the authenticated user.
   */
  const { status } = params;
  const qs = toQueryString({ status });

  const res = await apiGetJson(`/api/alerts${qs}`, { redirectOn401: true, retryOn401: true });
  if (!res.ok) return res;

  const envelope = res.data as BackendEnvelope<{ items: Alert[] }>;
  const items = envelope?.data?.items || [];

  return { ok: true, data: { items } };
}

// PUBLIC_INTERFACE
export async function dismissAlert(params: DismissAlertParams): Promise<ApiResult<unknown>> {
  /**
   * Dismiss an alert.
   *
   * Note: Backend OpenAPI shows GET/POST /api/alerts but no explicit dismissal endpoint.
   * This client uses a pragmatic POST with status:"dismissed" and includes the id.
   */
  const { id, type, message } = params;

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
  return { ok: true, data: (res as any).data?.data || null };
}

// PUBLIC_INTERFACE
export async function updateProfile(patch: ProfileUpdate): Promise<ApiResult<{ user: UserProfile | null }>> {
  /**
   * Update the authenticated user's profile via PUT /api/users/me.
   *
   * Backend officially supports: { name, avatar_url }
   * We allow extra keys for forward compatibility. If rejected, we return a friendly message.
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

  const envelope = res.data as BackendEnvelope<{ user: UserProfile }>;
  const user = envelope?.data?.user || null;

  return { ok: true, data: { user } };
}
