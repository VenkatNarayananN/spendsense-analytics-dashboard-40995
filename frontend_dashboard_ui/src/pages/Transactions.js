import React, { useMemo, useState } from 'react';
import PageSection from '../components/PageSection';
import { useUI } from '../context/UIContext';

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

// PUBLIC_INTERFACE
export default function Transactions() {
  /** Transactions list page (placeholder); includes local filter controls. */
  const { searchQuery } = useUI();
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => {
    const set = new Set(sample.map((t) => t.category));
    return ['all', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sample.filter((t) => {
      const matchesQuery = !q || `${t.merchant} ${t.category} ${t.status} ${t.date}`.toLowerCase().includes(q);
      const matchesCategory = category === 'all' || t.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [searchQuery, category]);

  return (
    <div>
      <PageSection
        title="Transactions"
        subtitle="Review, filter, and export your activity (placeholder data)."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="btn" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <span className="small-muted" style={{ color: 'inherit' }}>Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ border: 'none', background: 'transparent', color: 'inherit', fontWeight: 800 }}
                aria-label="Filter by category"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <button type="button" className="btn">Export CSV</button>
          </div>
        }
      >
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

        <div className="small-muted" style={{ marginTop: 10 }}>
          Note: When API wiring is added, this table should request data from the backend using REACT_APP_BACKEND_URL.
        </div>
      </PageSection>
    </div>
  );
}
