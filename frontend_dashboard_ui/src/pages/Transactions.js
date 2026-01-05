import React, { useEffect, useMemo, useState } from 'react';
import PageSection from '../components/PageSection';
import { useUI } from '../context/UIContext';
import { useAlerts } from '../context/AlertsContext';
import { subscribeToNewTransactions } from '../services/transactionsRealtime';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

function currency(n) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

const sample = [
  { id: 'tx_1', merchant: 'Aurora Coffee', category: 'Dining', amount: -6.45, status: 'posted', date: '2026-01-05' },
  { id: 'tx_2', merchant: 'StreamFlix', category: 'Subscriptions', amount: -14.99, status: 'posted', date: '2026-01-03' },
  { id: 'tx_3', merchant: 'Nimbus Payroll', category: 'Income', amount: 2250.0, status: 'posted', date: '2026-01-02' },
  { id: 'tx_4', merchant: 'Metro Transit', category: 'Transport', amount: -2.5, status: 'pending', date: '2026-01-02' },
  { id: 'tx_5', merchant: 'Ocean Market', category: 'Groceries', amount: -84.22, status: 'posted', date: '2026-01-01' },
];

function parseISODate(s) {
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function amountAbs(n) {
  return Math.abs(Number(n));
}

function safeNumber(s) {
  if (s === '' || s === null || s === undefined) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// PUBLIC_INTERFACE
export default function Transactions() {
  /** Transactions list page (placeholder); includes local filter controls and respects global search. */
  const { searchQuery } = useUI();
  const { addAlert } = useAlerts();

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Simulated fetch/loading
  const [isLoading, setIsLoading] = useState(true);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    // Simulate initial fetch and subsequent "refetch" when filters change.
    setIsLoading(true);
    const t = window.setTimeout(() => setIsLoading(false), 650);
    return () => window.clearTimeout(t);
  }, [category, dateFrom, dateTo, minAmount, maxAmount, localSearch]);

  useEffect(() => {
    // Keep realtime wiring intact (graceful no-op if env vars missing).
    const unsubscribe = subscribeToNewTransactions(() => {
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addAlert({
        type: 'success',
        title: 'New transaction received',
        message: `Transaction list updated at ${ts}.`,
      });
      setRefreshTick((t) => t + 1);
    });

    return () => unsubscribe();
  }, [addAlert]);

  const categories = useMemo(() => {
    const set = new Set(sample.map((t) => t.category));
    return ['all', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    // Combine global + local search (both optional)
    const globalQ = searchQuery.trim().toLowerCase();
    const localQ = localSearch.trim().toLowerCase();
    const q = [globalQ, localQ].filter(Boolean).join(' ').trim();

    const from = dateFrom ? parseISODate(dateFrom) : null;
    const to = dateTo ? parseISODate(dateTo) : null;
    const min = safeNumber(minAmount);
    const max = safeNumber(maxAmount);

    return sample.filter((t) => {
      const matchesQuery =
        !q || `${t.merchant} ${t.category} ${t.status} ${t.date}`.toLowerCase().includes(q);

      const matchesCategory = category === 'all' || t.category === category;

      const d = parseISODate(t.date);
      const matchesFrom = !from || (d && d.getTime() >= from.getTime());
      const matchesTo = !to || (d && d.getTime() <= to.getTime());

      const a = amountAbs(t.amount);
      const matchesMin = min === null || a >= min;
      const matchesMax = max === null || a <= max;

      return matchesQuery && matchesCategory && matchesFrom && matchesTo && matchesMin && matchesMax;
    });
  }, [searchQuery, localSearch, category, dateFrom, dateTo, minAmount, maxAmount, refreshTick]);

  const hasAnyLocalFilter = Boolean(
    localSearch.trim() ||
    category !== 'all' ||
    dateFrom ||
    dateTo ||
    minAmount ||
    maxAmount
  );

  return (
    <div>
      <PageSection
        title="Transactions"
        subtitle="Review, filter, and export your activity (placeholder data)."
        actions={(
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" aria-label="Export CSV (placeholder)">
              Export CSV
            </button>
          </div>
        )}
      >
        <div className="filter-bar" aria-label="Transactions filters">
          <div className="filter-group" style={{ gridColumn: 'span 4' }}>
            <label className="filter-label" htmlFor="tx-search">Search</label>
            <input
              id="tx-search"
              className="input"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Merchant, category, status…"
              aria-label="Search transactions"
            />
          </div>

          <div className="filter-group" style={{ gridColumn: 'span 3' }}>
            <label className="filter-label" htmlFor="tx-category">Category</label>
            <select
              id="tx-category"
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter transactions by category"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="filter-group" style={{ gridColumn: 'span 2' }}>
            <label className="filter-label" htmlFor="tx-from">From</label>
            <input
              id="tx-from"
              className="input"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Filter transactions by start date"
            />
          </div>

          <div className="filter-group" style={{ gridColumn: 'span 2' }}>
            <label className="filter-label" htmlFor="tx-to">To</label>
            <input
              id="tx-to"
              className="input"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter transactions by end date"
            />
          </div>

          <div className="filter-group" style={{ gridColumn: 'span 1' }}>
            <label className="filter-label" htmlFor="tx-min">Min</label>
            <input
              id="tx-min"
              className="input"
              type="number"
              inputMode="decimal"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              aria-label="Filter transactions by minimum amount"
            />
          </div>

          <div className="filter-group" style={{ gridColumn: 'span 1' }}>
            <label className="filter-label" htmlFor="tx-max">Max</label>
            <input
              id="tx-max"
              className="input"
              type="number"
              inputMode="decimal"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="500"
              aria-label="Filter transactions by maximum amount"
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {isLoading ? (
            <LoadingState message="Fetching transactions…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No transactions found"
              description={hasAnyLocalFilter ? 'No results match your filters. Try clearing filters or widening the date range.' : 'No transactions are available yet.'}
              actionLabel={hasAnyLocalFilter ? 'Clear filters' : undefined}
              onAction={hasAnyLocalFilter ? () => {
                setLocalSearch('');
                setCategory('all');
                setDateFrom('');
                setDateTo('');
                setMinAmount('');
                setMaxAmount('');
              } : undefined}
            />
          ) : (
            <table className="table" aria-label="Transactions table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>{t.merchant}</td>
                    <td>{t.category}</td>
                    <td>
                      <span className={t.status === 'posted' ? 'pill pill-success' : 'pill pill-warn'}>
                        <span className="pill-dot" aria-hidden="true" />
                        {t.status}
                      </span>
                    </td>
                    <td className="mono">{t.date}</td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      {t.amount < 0 ? `-${currency(Math.abs(t.amount))}` : currency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="small-muted" style={{ marginTop: 10 }}>
          Note: When API wiring is added, this table should request data from the backend using REACT_APP_BACKEND_URL.
        </div>
      </PageSection>
    </div>
  );
}
