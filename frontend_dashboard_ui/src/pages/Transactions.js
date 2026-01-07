import React, { useEffect, useMemo, useState } from 'react';
import PageSection from '../components/PageSection';
import { useUI } from '../context/UIContext';
import { useAlerts } from '../context/AlertsContext';
import { subscribeToNewTransactions } from '../services/transactionsRealtime';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { createTransaction, listTransactions } from '../services/backendApi';

function currency(n, currencyCode = 'USD') {
  try {
    return n.toLocaleString(undefined, { style: 'currency', currency: currencyCode });
  } catch {
    return `${currencyCode} ${Number(n || 0).toFixed(2)}`;
  }
}

function parseISODateInputAsISO(dateInput) {
  // dateInput comes in as YYYY-MM-DD from <input type="date">
  // Backend expects a datetime string; we send midnight UTC-ish ISO to be explicit.
  if (!dateInput) return '';
  const d = new Date(`${dateInput}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function safeNumber(s) {
  if (s === '' || s === null || s === undefined) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toUserFacingError(e) {
  if (!e) return 'Something went wrong.';
  if (typeof e === 'string') return e;
  if (typeof e?.error === 'string') return e.error;
  return 'Something went wrong.';
}

// PUBLIC_INTERFACE
export default function Transactions() {
  /** Transactions list page backed by authenticated backend API. */
  const { searchQuery } = useUI();
  const { addAlert } = useAlerts();

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Amount filters remain UI-only (backend endpoint doesn't support min/max per OpenAPI)
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Data
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create flow
  const [isCreating, setIsCreating] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [newMerchant, setNewMerchant] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCurrency, setNewCurrency] = useState('USD');
  const [newAmount, setNewAmount] = useState('');
  const [newOccurredAt, setNewOccurredAt] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [refreshTick, setRefreshTick] = useState(0);

  const hasAnyLocalFilter = Boolean(
    localSearch.trim() ||
      category !== 'all' ||
      dateFrom ||
      dateTo ||
      minAmount ||
      maxAmount
  );

  const categories = useMemo(() => {
    const set = new Set(items.map((t) => t.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [items]);

  async function refetch() {
    setIsLoading(true);
    setError(null);

    const merchantQuery = [searchQuery.trim(), localSearch.trim()].filter(Boolean).join(' ').trim();

    const res = await listTransactions({
      from: dateFrom ? parseISODateInputAsISO(dateFrom) : undefined,
      to: dateTo ? parseISODateInputAsISO(dateTo) : undefined,
      category: category !== 'all' ? category : undefined,
      merchant: merchantQuery || undefined,
      limit: 50,
      offset: 0,
    });

    if (!res.ok) {
      setError(toUserFacingError(res));
      setIsLoading(false);
      return;
    }

    setItems(res.data.items || []);
    setPage(res.data.page || null);
    setIsLoading(false);
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, dateFrom, dateTo, localSearch, searchQuery, refreshTick]);

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

  const clientSideFiltered = useMemo(() => {
    // Apply min/max amount locally (UI-only)
    const min = safeNumber(minAmount);
    const max = safeNumber(maxAmount);

    return (items || []).filter((t) => {
      const amtAbs = Math.abs(Number(t.amount || 0));
      const matchesMin = min === null || amtAbs >= min;
      const matchesMax = max === null || amtAbs <= max;
      return matchesMin && matchesMax;
    });
  }, [items, minAmount, maxAmount]);

  async function onCreate() {
    const amount = safeNumber(newAmount);
    if (amount === null) {
      addAlert({ type: 'error', title: 'Invalid amount', message: 'Please enter a valid number.' });
      return;
    }
    if (!newMerchant.trim() || !newCategory.trim()) {
      addAlert({
        type: 'error',
        title: 'Missing details',
        message: 'Merchant and category are required.',
      });
      return;
    }

    const occurredAt = newOccurredAt ? parseISODateInputAsISO(newOccurredAt) : new Date().toISOString();

    setIsCreating(true);

    const res = await createTransaction({
      amount,
      currency: String(newCurrency || 'USD').toUpperCase(),
      category: newCategory.trim(),
      merchant: newMerchant.trim(),
      description: newDescription.trim() || undefined,
      occurred_at: occurredAt,
    });

    if (!res.ok) {
      setIsCreating(false);
      addAlert({
        type: 'error',
        title: 'Could not create transaction',
        message: toUserFacingError(res),
      });
      return;
    }

    addAlert({
      type: 'success',
      title: 'Transaction created',
      message: 'Your transaction has been saved.',
    });

    setIsCreating(false);
    setCreateFormOpen(false);
    setNewMerchant('');
    setNewCategory('');
    setNewCurrency('USD');
    setNewAmount('');
    setNewOccurredAt('');
    setNewDescription('');

    // Refetch from server to ensure table matches backend source of truth.
    setRefreshTick((t) => t + 1);
  }

  return (
    <div>
      <PageSection
        title="Transactions"
        subtitle="Review and filter your activity (live from backend)."
        actions={(
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCreateFormOpen((v) => !v)}
              aria-expanded={createFormOpen ? 'true' : 'false'}
              aria-controls="create-transaction-panel"
            >
              {createFormOpen ? 'Close' : 'Add transaction'}
            </button>
            <button type="button" className="btn" aria-label="Export CSV (placeholder)" disabled>
              Export CSV
            </button>
          </div>
        )}
      >
        {createFormOpen ? (
          <div id="create-transaction-panel" className="card" style={{ padding: 12, marginBottom: 12 }}>
            <div className="card-title-row">
              <strong style={{ fontSize: 13 }}>Create transaction</strong>
              <span className="small-muted">Saved to your account</span>
            </div>

            <div style={{ marginTop: 10, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(12, 1fr)' }}>
              <div style={{ gridColumn: 'span 4' }}>
                <label className="filter-label" htmlFor="tx-new-merchant">Merchant</label>
                <input
                  id="tx-new-merchant"
                  className="input"
                  value={newMerchant}
                  onChange={(e) => setNewMerchant(e.target.value)}
                  placeholder="e.g., Target"
                />
              </div>

              <div style={{ gridColumn: 'span 3' }}>
                <label className="filter-label" htmlFor="tx-new-category">Category</label>
                <input
                  id="tx-new-category"
                  className="input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Groceries"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="filter-label" htmlFor="tx-new-currency">Currency</label>
                <select
                  id="tx-new-currency"
                  className="select"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                >
                  {['USD', 'EUR', 'GBP', 'INR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 3' }}>
                <label className="filter-label" htmlFor="tx-new-amount">Amount</label>
                <input
                  id="tx-new-amount"
                  className="input"
                  type="number"
                  inputMode="decimal"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g., -24.50"
                />
              </div>

              <div style={{ gridColumn: 'span 3' }}>
                <label className="filter-label" htmlFor="tx-new-date">Date</label>
                <input
                  id="tx-new-date"
                  className="input"
                  type="date"
                  value={newOccurredAt}
                  onChange={(e) => setNewOccurredAt(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: 'span 9' }}>
                <label className="filter-label" htmlFor="tx-new-desc">Description (optional)</label>
                <input
                  id="tx-new-desc"
                  className="input"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g., Weekly groceries"
                />
              </div>

              <div style={{ gridColumn: 'span 12', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setCreateFormOpen(false)} disabled={isCreating}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={onCreate} disabled={isCreating}>
                  {isCreating ? 'Saving…' : 'Save transaction'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="filter-bar" aria-label="Transactions filters">
          <div className="filter-group" style={{ gridColumn: 'span 4' }}>
            <label className="filter-label" htmlFor="tx-search">Search</label>
            <input
              id="tx-search"
              className="input"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Merchant…"
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
              aria-label="Filter transactions by minimum amount (UI-only)"
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
              aria-label="Filter transactions by maximum amount (UI-only)"
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {isLoading ? (
            <LoadingState message="Fetching transactions…" />
          ) : error ? (
            <EmptyState
              title="Could not load transactions"
              description={error}
              actionLabel="Retry"
              onAction={() => setRefreshTick((t) => t + 1)}
            />
          ) : clientSideFiltered.length === 0 ? (
            <EmptyState
              title="No transactions found"
              description={
                hasAnyLocalFilter
                  ? 'No results match your filters. Try clearing filters or widening the date range.'
                  : 'No transactions are available yet.'
              }
              actionLabel={hasAnyLocalFilter ? 'Clear filters' : undefined}
              onAction={
                hasAnyLocalFilter
                  ? () => {
                      setLocalSearch('');
                      setCategory('all');
                      setDateFrom('');
                      setDateTo('');
                      setMinAmount('');
                      setMaxAmount('');
                    }
                  : undefined
              }
            />
          ) : (
            <table className="table" aria-label="Transactions table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {clientSideFiltered.map((t) => (
                  <tr key={t.id}>
                    <td>{t.merchant}</td>
                    <td>{t.category}</td>
                    <td className="mono">
                      {t.occurred_at ? String(t.occurred_at).slice(0, 10) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      {currency(Number(t.amount || 0), t.currency || 'USD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="small-muted" style={{ marginTop: 10 }}>
          {page ? (
            <span className="mono">
              Showing {page.offset + 1}–{Math.min(page.offset + page.limit, page.total)} of {page.total}
            </span>
          ) : (
            ' '
          )}
        </div>
      </PageSection>
    </div>
  );
}
