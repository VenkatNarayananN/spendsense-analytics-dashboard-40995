import React, { useEffect, useMemo, useState } from 'react';
import PageSection from '../components/PageSection';
import { useUI } from '../context/UIContext';
import { useAlerts } from '../context/AlertsContext';
import LineChartPlaceholder from '../components/charts/LineChartPlaceholder';
import PieChartPlaceholder from '../components/charts/PieChartPlaceholder';
import { subscribeToNewTransactions } from '../services/transactionsRealtime';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import InlineErrorBanner from '../components/InlineErrorBanner';
import { convertAmount, fetchLatestFxRates, formatMoney } from '../services/fxRates';
import { getAnalyticsSummary } from '../services/backendApi';

function percent(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${Math.round(n * 100)}%`;
}

function rangeLabel(range) {
  if (range === '7d') return 'Last 7 days';
  if (range === '30d') return 'Last 30 days';
  if (range === '90d') return 'Last 90 days';
  return 'All time';
}

function hasRateForCurrency(rates, currencyCode) {
  if (!rates) return false;
  const c = String(currencyCode || '').toUpperCase();
  if (!c || c === 'USD') return true; // USD doesn't require a rate for this dashboard
  const r = Number(rates[c]);
  return Number.isFinite(r) && r > 0;
}

function moneySkeleton() {
  // A visually-stable placeholder that doesn't jump around in KPI cards / subtitles.
  return '—';
}

function isoDateOnly(d) {
  // Backend expects YYYY-MM-DD for analytics date range per OpenAPI examples.
  return d.toISOString().slice(0, 10);
}

function computeRangeParams(timeRange) {
  const to = new Date();
  const from = new Date(to);
  if (timeRange === '7d') from.setDate(to.getDate() - 7);
  else if (timeRange === '30d') from.setDate(to.getDate() - 30);
  else if (timeRange === '90d') from.setDate(to.getDate() - 90);
  else return { from: undefined, to: undefined };

  return { from: isoDateOnly(from), to: isoDateOnly(to) };
}

function toUserFacingError(e) {
  if (!e) return 'Something went wrong.';
  if (typeof e === 'string') return e;
  if (typeof e?.error === 'string') return e.error;
  return 'Something went wrong.';
}

// PUBLIC_INTERFACE
export default function Dashboard() {
  /** Dashboard overview page with KPI cards, backed by analytics summary endpoint. */
  const { searchQuery, currency: selectedCurrency, setCurrency, supportedCurrencies } = useUI();
  const { addAlert } = useAlerts();

  const [timeRange, setTimeRange] = useState('30d');

  // Analytics state
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Used to trigger re-fetches later when dashboard data refreshes.
  const [refreshTick, setRefreshTick] = useState(0);

  // FX state (kept local to Dashboard per requirement; could be promoted to context later).
  const [fx, setFx] = useState({
    base: 'USD',
    rates: null,
    timestamp: null,
    isLoading: false,
    error: null,
  });

  const canConvert = useMemo(() => hasRateForCurrency(fx?.rates, selectedCurrency), [fx?.rates, selectedCurrency]);

  // Provide UI signals without blocking the rest of the dashboard.
  const fxUi = useMemo(() => {
    const loading = Boolean(fx?.isLoading);
    const hasError = Boolean(fx?.error);

    // If we're loading and don't have previous rates yet, treat as “initial load”.
    const initialLoading = loading && !fx?.rates;

    // When we have cached/previous rates, we can keep showing values while refreshing in background.
    const refreshing = loading && Boolean(fx?.rates);

    // Only show “no conversion possible” placeholders when we truly cannot convert and user asked for non-USD.
    const showPlaceholders = !canConvert && selectedCurrency !== 'USD';

    return { loading, initialLoading, refreshing, hasError, showPlaceholders };
  }, [fx?.isLoading, fx?.error, fx?.rates, canConvert, selectedCurrency]);

  // PUBLIC_INTERFACE
  async function retryFxFetch() {
    /** Manually re-fetch FX rates (force refresh) without blocking other dashboard interactions. */
    setFx((prev) => ({ ...prev, isLoading: true, error: null }));
    const res = await fetchLatestFxRates({ base: 'USD', force: true });

    if (res.ok) {
      setFx({
        base: res.data.base,
        rates: res.data.rates,
        timestamp: res.data.timestamp || null,
        isLoading: false,
        error: null,
      });
    } else {
      // Keep last-known rates if they exist; we only update the error and loading flags.
      setFx((prev) => ({
        ...prev,
        isLoading: false,
        error: res.error || 'Failed to fetch FX rates.',
      }));
    }
  }

  async function loadAnalytics({ isManualRetry = false } = {}) {
    const hasPreviousData = Boolean(summary);

    // Preserve last-known data when possible:
    // - initial load: show full LoadingState
    // - refetch: keep existing UI, but dim + show a subtle banner
    if (hasPreviousData) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    // Clear hard error only on manual retry or initial load;
    // otherwise keep the error banner (if any) until the next successful fetch.
    if (isManualRetry || !hasPreviousData) setLoadError(null);

    const range = computeRangeParams(timeRange);
    const res = await getAnalyticsSummary(range);

    if (!res.ok) {
      setLoadError(toUserFacingError(res) || 'Failed to load analytics summary.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setSummary(res.data.summary || null);
    setLoadError(null);
    setIsLoading(false);
    setIsRefreshing(false);
  }

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, refreshTick]);

  useEffect(() => {
    const unsubscribe = subscribeToNewTransactions(() => {
      // Notify user (subtle alert on the alerts rail).
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addAlert({
        type: 'success',
        title: 'New transaction received',
        message: `A new transaction was added at ${ts}.`,
      });

      // Trigger a refresh of analytics.
      setRefreshTick((t2) => t2 + 1);
    });

    return () => unsubscribe();
  }, [addAlert]);

  // Fetch FX rates once (base USD), and allow manual retry on failure.
  useEffect(() => {
    let cancelled = false;

    async function loadFxRates() {
      setFx((prev) => ({ ...prev, isLoading: true, error: null }));
      const res = await fetchLatestFxRates({ base: 'USD', force: false });

      if (cancelled) return;

      if (res.ok) {
        setFx({
          base: res.data.base,
          rates: res.data.rates,
          timestamp: res.data.timestamp || null,
          isLoading: false,
          error: null,
        });
      } else {
        // Graceful handling: keep whatever rates we previously had (if any).
        setFx((prev) => ({
          ...prev,
          isLoading: false,
          error: res.error || 'Failed to fetch FX rates.',
        }));
      }
    }

    loadFxRates();

    return () => {
      cancelled = true;
    };
  }, []);

  const conversionRateNote = useMemo(() => {
    if (!fx.rates || !selectedCurrency || selectedCurrency === 'USD') return null;

    const r = Number(fx.rates[selectedCurrency]);
    if (!Number.isFinite(r) || r <= 0) return null;

    // Provide a subtle hint of the applied conversion.
    return `1 USD ≈ ${r.toFixed(4)} ${selectedCurrency}`;
  }, [fx.rates, selectedCurrency]);

  const kpis = useMemo(() => {
    // If conversion isn't possible (missing rates) and user selected non-USD, return placeholders.
    if (fxUi.showPlaceholders) {
      return [
        { label: 'Total spend', value: moneySkeleton(), sub: rangeLabel(timeRange) },
        { label: 'Avg daily spend', value: moneySkeleton(), sub: 'Computed from transactions' },
        { label: 'Top category', value: moneySkeleton(), sub: 'By total spend' },
        { label: 'Recent merchant', value: moneySkeleton(), sub: 'Most recent activity' },
      ];
    }

    // Prefer backend summary; fall back to placeholders when absent.
    const totalSpendUsd = Number(summary?.total_spend);
    const avgDailyUsd = Number(summary?.average_daily_spend);

    const topCategory = summary?.top_categories?.[0]?.category || '—';
    const topCategoryTotalUsd = Number(summary?.top_categories?.[0]?.total);
    const recentMerchant = summary?.recent_merchants?.[0] || '—';

    const totalSpend = Number.isFinite(totalSpendUsd)
      ? convertAmount({ amount: totalSpendUsd, from: 'USD', to: selectedCurrency, ratesByCode: fx?.rates })
      : null;

    const avgDaily = Number.isFinite(avgDailyUsd)
      ? convertAmount({ amount: avgDailyUsd, from: 'USD', to: selectedCurrency, ratesByCode: fx?.rates })
      : null;

    const topCatTotal = Number.isFinite(topCategoryTotalUsd)
      ? convertAmount({ amount: topCategoryTotalUsd, from: 'USD', to: selectedCurrency, ratesByCode: fx?.rates })
      : null;

    const rangeText =
      summary?.range?.from && summary?.range?.to ? `${summary.range.from} → ${summary.range.to}` : rangeLabel(timeRange);

    return [
      {
        label: 'Total spend',
        value: totalSpend === null ? moneySkeleton() : formatMoney(totalSpend, selectedCurrency),
        sub: rangeText,
      },
      {
        label: 'Avg daily spend',
        value: avgDaily === null ? moneySkeleton() : formatMoney(avgDaily, selectedCurrency),
        sub: 'Based on selected range',
      },
      {
        label: 'Top category',
        value: topCategory,
        sub: topCatTotal === null ? '—' : `${formatMoney(topCatTotal, selectedCurrency)}`,
      },
      {
        label: 'Recent merchant',
        value: recentMerchant,
        sub: 'Most recent merchants list',
      },
    ];
  }, [timeRange, selectedCurrency, fx?.rates, fxUi.showPlaceholders, summary]);

  const chartPlaceholderNumbers = useMemo(() => {
    // These numbers are used only for placeholder annotations (not real charts yet).
    // If backend summary exists, derive a stable approximation for labels.
    const fallbackTotalUsd = 260 + (timeRange === '7d' ? 0 : timeRange === '90d' ? 300 : 120);

    const totalUsd = Number.isFinite(Number(summary?.total_spend)) ? Number(summary?.total_spend) : fallbackTotalUsd;
    const avgUsd = Number.isFinite(Number(summary?.average_daily_spend)) ? Number(summary?.average_daily_spend) : totalUsd / 30;
    const maxUsd = Math.max(avgUsd * 1.6, avgUsd);

    if (fxUi.showPlaceholders) {
      return {
        totalLabel: moneySkeleton(),
        avgLabel: moneySkeleton(),
        maxLabel: moneySkeleton(),
      };
    }

    const total = convertAmount({ amount: totalUsd, from: 'USD', to: selectedCurrency, ratesByCode: fx?.rates });
    const avg = convertAmount({ amount: avgUsd, from: 'USD', to: selectedCurrency, ratesByCode: fx?.rates });
    const max = convertAmount({ amount: maxUsd, from: 'USD', to: selectedCurrency, ratesByCode: fx?.rates });

    return {
      totalLabel: formatMoney(total, selectedCurrency),
      avgLabel: formatMoney(avg, selectedCurrency),
      maxLabel: formatMoney(max, selectedCurrency),
    };
  }, [timeRange, selectedCurrency, fx?.rates, fxUi.showPlaceholders, summary]);

  const showInitialBlockingLoad = isLoading && !summary;
  const showBlockingError = Boolean(loadError) && !summary;

  return (
    <div>
      <PageSection
        title="Overview"
        subtitle={`KPIs and trends · ${rangeLabel(timeRange)}`}
        actions={(
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div className="chip-group" role="group" aria-label="Dashboard time range">
              {['7d', '30d', '90d'].map((r) => (
                <button
                  key={r}
                  type="button"
                  className="chip"
                  aria-pressed={timeRange === r ? 'true' : 'false'}
                  onClick={() => setTimeRange(r)}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="filter-group" style={{ minWidth: 180 }}>
              <label className="filter-label" htmlFor="dash-currency">Currency</label>
              <select
                id="dash-currency"
                className="select"
                value={selectedCurrency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Select currency for dashboard"
              >
                {(supportedCurrencies || ['USD', 'INR', 'GBP', 'EUR']).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      >
        {/* FX loading / error (non-blocking): do not prevent interacting with the rest of the dashboard. */}
        {fxUi.initialLoading ? (
          <div style={{ marginBottom: 12 }}>
            <LoadingState message="Fetching FX rates for currency conversions…" minHeight={120} />
          </div>
        ) : fx.error ? (
          <div className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div className="card-title-row">
              <strong style={{ fontSize: 13 }}>Currency conversion temporarily unavailable</strong>
              <button
                type="button"
                className="btn"
                onClick={retryFxFetch}
                aria-label="Retry fetching FX rates"
                disabled={fxUi.loading}
              >
                {fxUi.loading ? 'Retrying…' : 'Retry'}
              </button>
            </div>

            <div className="small-muted" style={{ marginTop: 6 }}>
              We couldn’t refresh FX rates right now. {fx.rates ? 'Showing the last known conversion rates.' : 'Values may remain in USD or show placeholders until rates are available.'}
            </div>

            <div className="small-muted" style={{ marginTop: 6 }}>
              <span className="mono">Details:</span> {fx.error}
            </div>
          </div>
        ) : null}

        {/* Subtle “refreshing” hint when we already have rates but are revalidating them. */}
        {fxUi.refreshing ? (
          <div className="small-muted" style={{ marginBottom: 10 }}>
            Refreshing FX rates…
          </div>
        ) : null}

        {conversionRateNote ? (
          <div className="small-muted" style={{ marginBottom: 10 }}>
            {conversionRateNote}
          </div>
        ) : null}

        {/* If user selected a non-USD currency but we don't have a usable rate, show an inline hint (doesn't block). */}
        {fxUi.showPlaceholders ? (
          <div className="small-muted" style={{ marginBottom: 10 }}>
            Conversions to <span className="mono">{selectedCurrency}</span> are not available yet — showing placeholders.
          </div>
        ) : null}

        {/* Page-level error banner: only show non-blocking if we have last-known data; otherwise show full EmptyState */}
        {loadError && summary ? (
          <div style={{ marginBottom: 12 }}>
            <InlineErrorBanner
              title="Dashboard may be out of date"
              description={loadError}
              actionLabel="Retry"
              onAction={() => loadAnalytics({ isManualRetry: true })}
              isBusy={isRefreshing}
              tone="warning"
            />
          </div>
        ) : null}

        {showInitialBlockingLoad ? (
          <LoadingState message="Loading dashboard KPIs…" />
        ) : showBlockingError ? (
          <EmptyState
            title="Could not load dashboard"
            description={loadError}
            actionLabel="Retry"
            onAction={() => loadAnalytics({ isManualRetry: true })}
          />
        ) : (
          <div
            className="grid"
            style={(fxUi.loading || isRefreshing) ? { opacity: 0.72, filter: 'saturate(0.95)' } : undefined}
            aria-busy={(fxUi.loading || isRefreshing) ? 'true' : 'false'}
          >
            {kpis.map((k) => (
              <div key={k.label} className="card" style={{ gridColumn: 'span 3' }}>
                <div className="kpi">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value">{k.value}</div>
                  <div className="kpi-sub">{k.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Small hint while we refetch but keep UI */}
        {isRefreshing && summary ? (
          <div className="small-muted" style={{ marginTop: 10 }}>
            Refreshing dashboard…
          </div>
        ) : null}
      </PageSection>

      <div className="grid" style={{ marginTop: 14, opacity: (fxUi.loading || isRefreshing) ? 0.9 : 1 }}>
        <div style={{ gridColumn: 'span 7' }}>
          <LineChartPlaceholder
            title={`Spending trend · ${rangeLabel(timeRange)}`}
            subtitle={
              (fxUi.loading || isRefreshing)
                ? 'Updating…'
                : `Total: ${chartPlaceholderNumbers.totalLabel} · Avg: ${chartPlaceholderNumbers.avgLabel} · Max: ${chartPlaceholderNumbers.maxLabel}`
            }
          />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="small-muted">
              Charts remain placeholders; KPIs above are fetched from <span className="mono">/api/analytics/summary</span>.
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 5' }}>
          <PieChartPlaceholder
            title="Category mix"
            subtitle={`Typical split · amounts shown in ${selectedCurrency}`}
          />
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <div className="pill pill-success"><span className="pill-dot" aria-hidden="true" /> Housing · 38%</div>
            <div className="pill pill-warn"><span className="pill-dot" aria-hidden="true" /> Dining · 16%</div>
            <div className="pill"><span className="pill-dot" aria-hidden="true" /> Transport · 10%</div>
            <div className="pill pill-error"><span className="pill-dot" aria-hidden="true" /> Subscriptions · 9%</div>
          </div>
        </div>
      </div>

      <PageSection
        title="Recent transactions"
        subtitle={searchQuery ? `Filtered by “${searchQuery}”` : 'Latest activity across your accounts (placeholder)'}
        actions={<a className="btn" href="/transactions">View all</a>}
      >
        {/* Keep this section placeholder for now to preserve existing UX until backend exposes a dedicated recent endpoint. */}
        <div className="card">
          <div className="small-muted">
            Recent transactions table is still placeholder; Transactions page is fully API-backed.
          </div>
        </div>
      </PageSection>
    </div>
  );
}
