import { getBackendUrl } from '../config/env';

const FX_CACHE_TTL_MS = 55 * 60 * 1000; // keep slightly under backend's 1h cache

/**
 * Normalize various possible backend response shapes to a consistent structure.
 * We keep this defensive because the backend OpenAPI isn't exposed at /openapi.json
 * and the endpoint may return slightly different keys over time.
 */
function normalizeFxResponse(payload) {
  if (!payload || typeof payload !== 'object') return null;

  // Common shapes:
  // - { base: "USD", rates: { INR: 83.1, ... }, timestamp: "...", provider: "..." }
  // - { data: { base, rates, ... } }
  // - { result: { base, rates, ... } }
  const candidate = payload.data || payload.result || payload;

  const base = candidate.base || candidate.base_currency || candidate.baseCurrency || null;
  const rates = candidate.rates || candidate.fxRates || candidate.exchangeRates || null;
  const timestamp =
    candidate.timestamp ||
    candidate.time ||
    candidate.date ||
    candidate.asOf ||
    candidate.updated_at ||
    null;

  if (!base || typeof rates !== 'object' || rates === null) return null;

  return {
    base: String(base).toUpperCase(),
    rates,
    timestamp,
  };
}

function now() {
  return Date.now();
}

// In-memory cache for the browser session.
let cached = {
  base: null,
  rates: null,
  fetchedAt: 0,
  timestamp: null,
};

// PUBLIC_INTERFACE
export async function fetchLatestFxRates({ base = 'USD', force = false } = {}) {
  /**
   * Fetch latest FX rates from backend.
   *
   * - Uses REACT_APP_BACKEND_URL / REACT_APP_API_BASE (via getBackendUrl()).
   * - Caches results in-memory for the browser session.
   *
   * @param {{base?: string, force?: boolean}} options
   * @returns {Promise<{ok: true, data: {base: string, rates: Object, timestamp: any}} | {ok: false, error: string}>}
   */
  const baseUpper = String(base || 'USD').toUpperCase();

  if (!force && cached.base === baseUpper && cached.rates && now() - cached.fetchedAt < FX_CACHE_TTL_MS) {
    return { ok: true, data: { base: cached.base, rates: cached.rates, timestamp: cached.timestamp } };
  }

  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    return { ok: false, error: 'Backend URL is not configured (missing REACT_APP_BACKEND_URL).' };
  }

  const url = `${backendUrl.replace(/\/+$/, '')}/api/fx/latest?base=${encodeURIComponent(baseUpper)}`;

  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const text = await res.text();

    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      // ignore JSON parsing error for now
    }

    if (!res.ok) {
      const msg =
        (payload && (payload.message || payload.error)) ||
        `FX endpoint failed with HTTP ${res.status}`;
      return { ok: false, error: String(msg) };
    }

    const normalized = normalizeFxResponse(payload);
    if (!normalized) {
      return { ok: false, error: 'FX endpoint returned an unexpected response shape.' };
    }

    cached = {
      base: normalized.base,
      rates: normalized.rates,
      fetchedAt: now(),
      timestamp: normalized.timestamp,
    };

    return { ok: true, data: normalized };
  } catch (e) {
    return { ok: false, error: e?.message ? String(e.message) : 'Network error while fetching FX rates.' };
  }
}

// PUBLIC_INTERFACE
export function convertAmount({ amount, from = 'USD', to = 'USD', ratesByCode = null }) {
  /**
   * Convert a numeric amount using provided FX rates.
   *
   * Assumption: ratesByCode is quoted as: 1 unit of `from` equals ratesByCode[CODE] units of CODE.
   * This matches the standard Open Exchange Rates / common FX APIs.
   *
   * @param {{amount: number, from?: string, to?: string, ratesByCode?: Record<string, number>}} params
   * @returns {number}
   */
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;

  const fromC = String(from || 'USD').toUpperCase();
  const toC = String(to || 'USD').toUpperCase();

  if (fromC === toC) return n;

  const rates = ratesByCode || {};
  const rate = Number(rates[toC]);

  if (!Number.isFinite(rate) || rate <= 0) {
    // If we can't convert, keep original numeric value (graceful fallback).
    return n;
  }

  return n * rate;
}

// PUBLIC_INTERFACE
export function formatMoney(amount, currencyCode = 'USD') {
  /**
   * Format a number in a given currency using Intl.NumberFormat.
   * Falls back gracefully if the currency code is invalid in the runtime.
   */
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const code = String(currencyCode || 'USD').toUpperCase();

  try {
    return safe.toLocaleString(undefined, { style: 'currency', currency: code });
  } catch {
    // Some environments may not support all currencies; provide a minimal fallback.
    return `${code} ${safe.toFixed(2)}`;
  }
}
