import React, { useEffect, useMemo, useState } from 'react';
import PageSection from '../components/PageSection';
import { useAlerts } from '../context/AlertsContext';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

function isActiveType(type) {
  return type === 'warning' || type === 'error' || type === 'success';
}

function statusOfAlert(a) {
  // Placeholder mapping: existing alerts are considered "Active".
  // The page-level “Snoozed/Resolved” views are UI-only scaffolding.
  if (!a) return 'Active';
  if (isActiveType(a.type)) return 'Active';
  return 'Active';
}

// PUBLIC_INTERFACE
export default function Alerts() {
  /** Alerts management page (placeholder). Edits affect the persistent alerts rail. */
  const { alerts, addAlert, dismissAlert, clearAlerts } = useAlerts();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const t = window.setTimeout(() => setIsLoading(false), 500);
    return () => window.clearTimeout(t);
  }, [statusFilter, alerts.length]);

  const filteredAlerts = useMemo(() => {
    if (statusFilter === 'All') return alerts;

    // Since we only have “active” alerts from context, we filter accordingly.
    if (statusFilter === 'Active') return alerts;

    // No-op placeholder filters for states not implemented in context yet.
    if (statusFilter === 'Snoozed') return [];
    if (statusFilter === 'Resolved') return [];

    return alerts;
  }, [alerts, statusFilter]);

  return (
    <div>
      <PageSection
        title="Alerts"
        subtitle="Persistent alerts, rules, and notifications (placeholder)."
        actions={(
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <label className="btn" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <span className="small-muted" style={{ color: 'inherit' }}>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', color: 'inherit', fontWeight: 800 }}
                aria-label="Filter alerts by status"
              >
                {['All', 'Active', 'Snoozed', 'Resolved'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <button type="button" className="btn" onClick={clearAlerts} aria-label="Clear all alerts">
              Clear all
            </button>
          </div>
        )}
      >
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 5' }}>
            <h3 style={{ fontSize: 14, margin: 0 }}>Create a quick alert</h3>
            <div className="small-muted" style={{ marginTop: 6 }}>
              This will add a notification to the persistent alerts rail.
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <label>
                <span className="small-muted">Title</span>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Large purchase"
                  aria-label="Alert title"
                />
              </label>

              <label>
                <span className="small-muted">Message</span>
                <input
                  className="input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g., Notify me when a transaction exceeds $200"
                  aria-label="Alert message"
                />
              </label>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  addAlert({
                    type: 'warning',
                    title: title || 'Custom alert',
                    message: message || 'This is a placeholder custom alert.',
                  });
                  setTitle('');
                  setMessage('');
                }}
              >
                Add alert
              </button>
            </div>
          </div>

          <div className="card" style={{ gridColumn: 'span 7' }}>
            <div className="card-title-row">
              <h3 style={{ fontSize: 14, margin: 0 }}>Alerts</h3>
              <span className="badge">{filteredAlerts.length}</span>
            </div>

            <div className="small-muted" style={{ marginTop: 6 }}>
              Filter: <span className="mono">{statusFilter}</span>
            </div>

            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {isLoading ? (
                <LoadingState message="Loading alerts…" minHeight={160} />
              ) : filteredAlerts.length === 0 ? (
                <EmptyState
                  title="No alerts in this view"
                  description={
                    statusFilter === 'All'
                      ? 'No alerts right now. You’re all set.'
                      : `There are no alerts with status “${statusFilter}” (placeholder).`
                  }
                  actionLabel={statusFilter !== 'All' ? 'Show all' : undefined}
                  onAction={statusFilter !== 'All' ? () => setStatusFilter('All') : undefined}
                />
              ) : (
                filteredAlerts.map((a) => (
                  <div key={a.id} className="alert-item" aria-label={`Alert: ${a.title} (${statusOfAlert(a)})`}>
                    <div>
                      <p className="alert-title">{a.title}</p>
                      <p className="alert-body">{a.message}</p>
                      <div style={{ marginTop: 8 }}>
                        <span className={a.type === 'success' ? 'pill pill-success' : a.type === 'error' ? 'pill pill-error' : 'pill pill-warn'}>
                          <span className="pill-dot" aria-hidden="true" />
                          {a.type}
                        </span>
                      </div>
                    </div>
                    <div className="alert-meta">
                      <span className="alert-time">{a.relativeTime}</span>
                      <button type="button" className="icon-btn" onClick={() => dismissAlert(a.id)} aria-label={`Dismiss alert: ${a.title}`}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
