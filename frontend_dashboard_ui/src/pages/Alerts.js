import React, { useEffect, useMemo, useState } from 'react';
import PageSection from '../components/PageSection';
import { useAlerts } from '../context/AlertsContext';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { dismissAlert as dismissBackendAlert, listAlerts } from '../services/backendApi';

function uiTypeFromBackendType(type) {
  // Map backend alert types (e.g. "budget") into UI pill variants.
  // Keep fintech theme defaults; fall back to warning.
  const t = String(type || '').toLowerCase();
  if (t.includes('error') || t.includes('fraud')) return 'error';
  if (t.includes('success')) return 'success';
  return 'warning';
}

function formatRelativeTimeFromIso(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.max(1, Math.round(diffMs / (60 * 1000)));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function statusLabel(status) {
  const s = String(status || 'active').toLowerCase();
  if (s === 'dismissed' || s === 'resolved') return 'Resolved';
  if (s === 'snoozed') return 'Snoozed';
  return 'Active';
}

function toUserFacingError(e) {
  if (!e) return 'Something went wrong.';
  if (typeof e === 'string') return e;
  if (typeof e?.error === 'string') return e.error;
  return 'Something went wrong.';
}

// PUBLIC_INTERFACE
export default function Alerts() {
  /** Alerts management page backed by authenticated backend API (list + dismiss). */
  const { addAlert, clearAlerts } = useAlerts();

  const [statusFilter, setStatusFilter] = useState('All');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  async function refetch() {
    setIsLoading(true);
    setError(null);

    const backendStatus = statusFilter === 'All' ? undefined : statusFilter.toLowerCase();
    const res = await listAlerts({ status: backendStatus });

    if (!res.ok) {
      setError(toUserFacingError(res));
      setIsLoading(false);
      return;
    }

    const normalized = (res.data.items || []).map((a) => ({
      id: a.id,
      type: uiTypeFromBackendType(a.type),
      title: a.type || 'Alert',
      message: a.message || '',
      status: a.status || 'active',
      relativeTime: formatRelativeTimeFromIso(a.created_at),
      raw: a,
    }));

    setAlerts(normalized);
    setIsLoading(false);
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, refreshTick]);

  const filteredAlerts = useMemo(() => {
    if (statusFilter === 'All') return alerts;

    const target = statusFilter.toLowerCase();
    return alerts.filter((a) => String(a.status || '').toLowerCase() === target);
  }, [alerts, statusFilter]);

  async function onDismiss(a) {
    // Optimistic UI update
    setAlerts((prev) => prev.filter((x) => x.id !== a.id));

    const res = await dismissBackendAlert({
      id: a.id,
      type: a.raw?.type,
      message: a.raw?.message,
    });

    if (!res.ok) {
      // rollback best-effort
      setAlerts((prev) => [a, ...prev]);
      addAlert({
        type: 'error',
        title: 'Could not dismiss alert',
        message: toUserFacingError(res),
      });
      return;
    }

    addAlert({
      type: 'success',
      title: 'Alert dismissed',
      message: 'The alert has been dismissed.',
    });

    // Refetch to stay consistent with backend truth
    setRefreshTick((t) => t + 1);
  }

  return (
    <div>
      <PageSection
        title="Alerts"
        subtitle="Persistent alerts, rules, and notifications (live from backend)."
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
                {['All', 'active', 'snoozed', 'resolved', 'dismissed'].map((s) => (
                  <option key={s} value={s === 'active' ? 'Active' : s === 'snoozed' ? 'Snoozed' : s === 'resolved' ? 'Resolved' : s === 'dismissed' ? 'Dismissed' : 'All'}>
                    {s === 'active' ? 'Active' : s === 'snoozed' ? 'Snoozed' : s === 'resolved' ? 'Resolved' : s === 'dismissed' ? 'Dismissed' : 'All'}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="btn"
              onClick={() => {
                // "Clear all" is still a UI action; backend bulk dismiss not provided yet.
                clearAlerts();
                setAlerts([]);
              }}
              aria-label="Clear all alerts (UI-only)"
            >
              Clear all
            </button>
          </div>
        )}
      >
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 12' }}>
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
              ) : error ? (
                <EmptyState
                  title="Could not load alerts"
                  description={error}
                  actionLabel="Retry"
                  onAction={() => setRefreshTick((t) => t + 1)}
                />
              ) : filteredAlerts.length === 0 ? (
                <EmptyState
                  title="No alerts in this view"
                  description={
                    statusFilter === 'All'
                      ? 'No alerts right now. You’re all set.'
                      : `There are no alerts with status “${statusFilter}”.`
                  }
                  actionLabel={statusFilter !== 'All' ? 'Show all' : undefined}
                  onAction={statusFilter !== 'All' ? () => setStatusFilter('All') : undefined}
                />
              ) : (
                filteredAlerts.map((a) => (
                  <div key={a.id} className="alert-item" aria-label={`Alert: ${a.title} (${statusLabel(a.status)})`}>
                    <div>
                      <p className="alert-title">{a.title}</p>
                      <p className="alert-body">{a.message}</p>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={a.type === 'success' ? 'pill pill-success' : a.type === 'error' ? 'pill pill-error' : 'pill pill-warn'}>
                          <span className="pill-dot" aria-hidden="true" />
                          {a.type}
                        </span>
                        <span className="pill">
                          <span className="pill-dot" aria-hidden="true" />
                          {String(a.status || 'active')}
                        </span>
                      </div>
                    </div>
                    <div className="alert-meta">
                      <span className="alert-time">{a.relativeTime}</span>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => onDismiss(a)}
                        aria-label={`Dismiss alert: ${a.title}`}
                      >
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
