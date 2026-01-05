import React, { useEffect, useMemo, useState } from 'react';
import PageSection from '../components/PageSection';
import { useUI } from '../context/UIContext';
import { useAlerts } from '../context/AlertsContext';
import LineChartPlaceholder from '../components/charts/LineChartPlaceholder';
import PieChartPlaceholder from '../components/charts/PieChartPlaceholder';
import { subscribeToNewTransactions } from '../services/transactionsRealtime';

function currency(n) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function percent(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${Math.round(n * 100)}%`;
}

// PUBLIC_INTERFACE
export default function Dashboard() {
  /** Dashboard overview page with KPI cards and recent activity placeholder data. */
  const { searchQuery } = useUI();
  const { addAlert } = useAlerts();

  // Used to trigger re-fetches later when dashboard data becomes API-driven.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToNewTransactions((payload) => {
      // Notify user (subtle alert on the alerts rail).
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addAlert({
        type: 'success',
        title: 'New transaction received',
        message: `A new transaction was added at ${ts}.`,
      });

      // Trigger a refresh. Today this is a no-op visually (placeholder data),
      // but it ensures the wiring is ready once we fetch real KPIs/recent activity.
      setRefreshTick((t) => t + 1);
    });

    return () => unsubscribe();
  }, [addAlert]);

  const kpis = useMemo(() => ([
    { label: 'Monthly spend', value: currency(2480.12), sub: `${percent(0.06)} vs last month` },
    { label: 'Net cashflow', value: currency(310.55), sub: 'Income − Expenses' },
    { label: 'Savings rate', value: '18%', sub: 'Target: 20%' },
    { label: 'At-risk categories', value: '2', sub: 'Dining, Subscriptions' },
  ]), []);

  const recent = useMemo(() => ([
    { id: 't1', merchant: 'Aurora Coffee', category: 'Dining', amount: -6.45, date: 'Today' },
    { id: 't2', merchant: 'Metro Transit', category: 'Transport', amount: -2.50, date: 'Yesterday' },
    { id: 't3', merchant: 'Nimbus Payroll', category: 'Income', amount: 2250.00, date: '2 days ago' },
    { id: 't4', merchant: 'StreamFlix', category: 'Subscriptions', amount: -14.99, date: '3 days ago' },
  ]), [refreshTick]);

  const filteredRecent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recent;
    return recent.filter((r) =>
      `${r.merchant} ${r.category} ${r.date}`.toLowerCase().includes(q)
    );
  }, [recent, searchQuery]);

  return (
    <div>
      <div className="grid" style={{ marginBottom: 14 }}>
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

      <div className="grid">
        <div style={{ gridColumn: 'span 7' }}>
          <LineChartPlaceholder title="Spending trend" />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="small-muted">
              Tip: Connect <span className="mono">REACT_APP_BACKEND_URL</span> to fetch real analytics.
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 5' }}>
          <PieChartPlaceholder title="Category mix" />
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <div className="pill pill-success"><span className="pill-dot" /> Housing · 38%</div>
            <div className="pill pill-warn"><span className="pill-dot" /> Dining · 16%</div>
            <div className="pill"><span className="pill-dot" /> Transport · 10%</div>
            <div className="pill pill-error"><span className="pill-dot" /> Subscriptions · 9%</div>
          </div>
        </div>
      </div>

      <PageSection
        title="Recent transactions"
        subtitle={searchQuery ? `Filtered by “${searchQuery}”` : 'Latest activity across your accounts'}
        actions={<a className="btn" href="/transactions">View all</a>}
      >
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
            {filteredRecent.map((r) => (
              <tr key={r.id}>
                <td>{r.merchant}</td>
                <td>{r.category}</td>
                <td>{r.date}</td>
                <td style={{ textAlign: 'right' }} className="mono">
                  {r.amount < 0 ? `-${currency(Math.abs(r.amount))}` : currency(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageSection>
    </div>
  );
}
