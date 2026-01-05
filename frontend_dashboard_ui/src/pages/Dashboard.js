import React, { useMemo } from 'react';
import PageSection from '../components/PageSection';
import { useUI } from '../context/UIContext';

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
  ]), []);

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
        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div className="card-title-row">
            <h2 style={{ fontSize: 16, margin: 0 }}>Spending trend</h2>
            <span className="pill pill-warn">
              <span className="pill-dot" aria-hidden="true" />
              Placeholder
            </span>
          </div>
          <div className="small-muted" style={{ marginTop: 6 }}>
            A chart will be rendered here (e.g., via Recharts) once API wiring is added.
          </div>

          <div
            className="card"
            style={{
              marginTop: 12,
              padding: 12,
              background: 'rgba(244, 114, 182, 0.08)',
              borderColor: 'rgba(244, 114, 182, 0.20)',
            }}
          >
            <div className="small-muted">
              Tip: Connect <span className="mono">REACT_APP_BACKEND_URL</span> to fetch real analytics.
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 5' }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Category mix</h2>
          <div className="small-muted" style={{ marginTop: 6 }}>
            Elegant donut chart placeholder. Categories: Housing, Dining, Transport, Subscriptions.
          </div>

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
