import React, { useState } from 'react';
import PageSection from '../components/PageSection';
import { useAlerts } from '../context/AlertsContext';

// PUBLIC_INTERFACE
export default function Alerts() {
  /** Alerts management page (placeholder). Edits affect the persistent alerts rail. */
  const { alerts, addAlert, dismissAlert, clearAlerts } = useAlerts();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div>
      <PageSection
        title="Alerts"
        subtitle="Persistent alerts, rules, and notifications (placeholder)."
        actions={
          <button type="button" className="btn" onClick={clearAlerts}>
            Clear all
          </button>
        }
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Large purchase"
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '10px 12px',
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.6)',
                    color: 'var(--text)'
                  }}
                />
              </label>

              <label>
                <span className="small-muted">Message</span>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g., Notify me when a transaction exceeds $200"
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '10px 12px',
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.6)',
                    color: 'var(--text)'
                  }}
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
              <h3 style={{ fontSize: 14, margin: 0 }}>Active alerts</h3>
              <span className="badge">{alerts.length}</span>
            </div>

            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {alerts.length === 0 ? (
                <div className="small-muted">No alerts. Try creating one.</div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="alert-item">
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
                      <button type="button" className="icon-btn" onClick={() => dismissAlert(a.id)}>
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
