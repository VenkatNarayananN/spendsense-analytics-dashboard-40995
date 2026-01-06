import React, { useEffect, useMemo, useState } from 'react';
import PageSection from '../components/PageSection';
import { useUI } from '../context/UIContext';
import { useAlerts } from '../context/AlertsContext';
import LineChartPlaceholder from '../components/charts/LineChartPlaceholder';
import PieChartPlaceholder from '../components/charts/PieChartPlaceholder';
import { subscribeToNewTransactions } from '../services/transactionsRealtime';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { convertAmount, fetchLatestFxRates, formatMoney } from '../services/fxRates';

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

// PUBLIC_INTERFACE
export default function Dashboard() {
  /** Dashboard overview page with KPI cards and recent activity placeholder data. */
  const { searchQuery, currency: selectedCurrency, setCurrency, supportedCurrencies } = useUI();
  const { addAlert } = useAlerts();

  const [timeRange, setTimeRange] = useState('30d');

  // Simulated loading state for primary panels
  const [isLoading, setIsLoading] = useState(true);

  // Used to trigger re-fetches later when dashboard data becomes API-driven.
  const [refreshTick, setRefreshTick] = useState(0);

  // FX state (kept local to Dashboard per requirement; could be promoted to context later).
  const [fx, setFx] = useState({
    base: 'USD',
    rates: null,
    timestamp: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Simulate initial fetch for KPI/overview data.
    const t = window.setTimeout(() => setIsLoading(false), 650);
    return () => window.clearTimeout(t);
  }, [timeRange]);

  useEffect(() => {
    const unsubscribe = subscribeToNewTransactions(() => {
      // Notify user (subtle alert on the alerts rail).
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addAlert({
        type: 'success',
        title: 'New transaction received',
        message: `A new transaction was added at ${ts}.`,
      });

      // Trigger a refresh. Today this is a no-op visually (placeholder data),
      // but it ensures the wiring is ready once we fetch real KPIs/recent activity.
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
    // Light “reaction” to timeRange selection (still placeholder data).
    const factor = timeRange === '7d' ? 0.35 : timeRange === '90d' ? 1.75 : 1.0;

    // KPI base amounts are authored in USD.
    const monthlySpendUsd = 2480.12 * factor;
    const netCashflowUsd = 310.55 * (factor * 0.9);

    const monthlySpend = convertAmount({
      amount: monthlySpendUsd,
      from: 'USD',
      to: selectedCurrency,
      ratesByCode: fx?.rates,
    });

    const netCashflow = convertAmount({
      amount: netCashflowUsd,
      from: 'USD',
      to: selectedCurrency,
      ratesByCode: fx?.rates,
    });

    return [
      { label: 'Monthly spend', value: formatMoney(monthlySpend, selectedCurrency), sub: `${percent(0.06)} vs last month` },
      { label: 'Net cashflow', value: formatMoney(netCashflow, selectedCurrency), sub: 'Income − Expenses' },
      { label: 'Savings rate', value: `${Math.round(18 / factor)}%`, sub: 'Target: 20%' },
      { label: 'At-risk categories', value: timeRange === '7d' ? '1' : '2', sub: 'Dining, Subscriptions' },
    ];
  }, [timeRange, selectedCurrency, fx?.rates]);

  const recent = useMemo(() => ([
    { id: 't1', merchant: 'Aurora Coffee', category: 'Dining', amountUsd: -6.45, date: 'Today' },
    { id: 't2', merchant: 'Metro Transit', category: 'Transport', amountUsd: -2.50, date: 'Yesterday' },
    { id: 't3', merchant: 'Nimbus Payroll', category: 'Income', amountUsd: 2250.00, date: '2 days ago' },
    { id: 't4', merchant: 'StreamFlix', category: 'Subscriptions', amountUsd: -14.99, date: '3 days ago' },
  ]), [refreshTick]);

  const filteredRecent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recent;
    return recent.filter((r) =>
      `${r.merchant} ${r.category} ${r.date}`.toLowerCase().includes(q)
    );
  }, [recent, searchQuery]);

  const chartPlaceholderNumbers = useMemo(() => {
    // These numbers are used only for placeholder annotations (not real charts yet).
    // Base values authored in USD.
    const baseSeriesUsd = timeRange === '7d'
      ? [120, 95, 130, 140, 110, 150, 160]
      : timeRange === '90d'
        ? [420, 390, 460, 520, 480, 505, 560]
        : [260, 240, 275, 290, 265, 310, 330];

    const totalUsd = baseSeriesUsd.reduce((a, b) => a + b, 0);
    const avgUsd = totalUsd / baseSeriesUsd.length;
    const maxUsd = Math.max(...baseSeriesUsd);

    const total = convertAmount({ amount: totalUsd, from: 'USD', to: selectedCurrency, ratesByCode: fx?.rates });
    const avg = convertAmount({ amount: avgUsd, from: 'USD', to: selectedCurrency, ratesByCode: fx?.rates });
    const max = convertAmount({ amount: maxUsd, from: 'USD', to: selectedCurrency, ratesByCode: fx?.rates });

    return {
      totalLabel: formatMoney(total, selectedCurrency),
      avgLabel: formatMoney(avg, selectedCurrency),
      maxLabel: formatMoney(max, selectedCurrency),
    };
  }, [timeRange, selectedCurrency, fx?.rates]);

  return (
    <div>
      <PageSection
        title="Overview"
        subtitle={`KPIs and trends · ${rangeLabel(timeRange)} (placeholder)`}
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
                aria-label="Select currency for dashboard (no conversion yet)"
              >
                {(supportedCurrencies || ['USD', 'INR', 'GBP', 'EUR']).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      >
        {/* FX fetch failure banner (non-blocking, allows retry). */}
        {fx.error ? (
          <div className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div className="card-title-row">
              <strong style={{ fontSize: 13 }}>FX rates unavailable</strong>
              <button
                type="button"
                className="btn"
                onClick={async () => {
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
                    setFx((prev) => ({ ...prev, isLoading: false, error: res.error || 'Failed to fetch FX rates.' }));
                  }
                }}
                aria-label="Retry fetching FX rates"
              >
                {fx.isLoading ? 'Retrying…' : 'Retry'}
              </button>
            </div>
            <div className="small-muted" style={{ marginTop: 6 }}>
              {fx.error} Conversions may be stale or remain in USD until rates are available.
            </div>
          </div>
        ) : null}

        {conversionRateNote ? (
          <div className="small-muted" style={{ marginBottom: 10 }}>
            {conversionRateNote}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingState message="Refreshing dashboard KPIs…" />
        ) : (
          <div className="grid">
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
      </PageSection>

      <div className="grid" style={{ marginTop: 14 }}>
        <div style={{ gridColumn: 'span 7' }}>
          <LineChartPlaceholder
            title={`Spending trend · ${rangeLabel(timeRange)}`}
            subtitle={`Total: ${chartPlaceholderNumbers.totalLabel} · Avg: ${chartPlaceholderNumbers.avgLabel} · Max: ${chartPlaceholderNumbers.maxLabel}`}
          />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="small-muted">
              Tip: Connect <span className="mono">REACT_APP_BACKEND_URL</span> to fetch real analytics.
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
        subtitle={searchQuery ? `Filtered by “${searchQuery}”` : 'Latest activity across your accounts'}
        actions={<a className="btn" href="/transactions">View all</a>}
      >
        {isLoading ? (
          <LoadingState message="Loading recent activity…" />
        ) : filteredRecent.length === 0 ? (
          <EmptyState
            title="No transactions match"
            description="Try clearing search or widening your time range."
            actionLabel="Clear search"
            onAction={() => {
              // Global search lives in UIContext; we can't set it here without adding new API.
              // So we provide a gentle UX action: scroll user to the topbar search.
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <table className="table" aria-label="Recent transactions table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Category</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map((r) => {
                const converted = convertAmount({
                  amount: r.amountUsd,
                  from: 'USD',
                  to: selectedCurrency,
                  ratesByCode: fx?.rates,
                });

                const absFormatted = formatMoney(Math.abs(converted), selectedCurrency);
                const display = converted < 0 ? `-${absFormatted}` : absFormatted;

                return (
                  <tr key={r.id}>
                    <td>{r.merchant}</td>
                    <td>{r.category}</td>
                    <td>{r.date}</td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      {display}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </PageSection>
    </div>
  );
}
