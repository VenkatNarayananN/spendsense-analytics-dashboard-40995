export type ApiError = {
  ok: false;
  status: number;
  error: string;
  code?: string;
};

export type ApiOk<T> = {
  ok: true;
  data: T;
};

export type ApiResult<T> = ApiOk<T> | ApiError;

/**
 * Backend standard response envelope:
 *  - success: boolean
 *  - data: payload when success=true
 */
export type BackendEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    cause?: unknown;
  };
};

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  category: string;
  merchant: string;
  description?: string | null;
  occurred_at: string;
  created_at?: string | null;
};

export type TransactionCreate = {
  amount: number;
  currency: string;
  category: string;
  merchant: string;
  description?: string;
  occurred_at: string;
};

export type TransactionsPage = {
  limit: number;
  offset: number;
  total: number;
};

export type TransactionsListResponse = {
  items: Transaction[];
  page: TransactionsPage | null;
};

export type Alert = {
  id: string;
  user_id: string;
  type: string;
  message: string;
  status: string;
  created_at?: string | null;
};

export type AnalyticsSummaryRange = {
  from: string | null;
  to: string | null;
};

export type AnalyticsSummaryTopCategory = {
  category: string;
  total: number;
};

export type AnalyticsSummary = {
  total_spend: number;
  average_daily_spend: number;
  top_categories: AnalyticsSummaryTopCategory[];
  recent_merchants: string[];
  range: AnalyticsSummaryRange;
};

export type UserProfile = {
  id: string;
  name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProfileUpdate = {
  name?: string;
  avatar_url?: string;
  /**
   * Forward-compatible bag (backend may ignore/reject).
   * Used by onboarding/settings flows.
   */
  preferences?: unknown;
};

export type FetchTransactionsParams = {
  from?: string;
  to?: string;
  category?: string;
  merchant?: string;
  limit?: number;
  offset?: number;
};

export type FetchSummaryParams = {
  from?: string;
  to?: string;
};

export type FetchAlertsParams = {
  status?: string;
};

export type DismissAlertParams = {
  id: string;
  type?: string;
  message?: string;
};
