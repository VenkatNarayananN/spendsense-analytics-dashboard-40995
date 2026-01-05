import React, { useMemo } from 'react';
import PageSection from '../components/PageSection';
import { useAlerts } from '../context/AlertsContext';

// PUBLIC_INTERFACE
export default function Insights() {
  /** Insights page (placeholder) offering narrative analytics and actions to create alerts. */
  const { addAlert } = useAlerts();

  const insights = useMemo(() => ([
    {
      title: 'Dining spike detected',
      body: 'Dining spend is +22% over the last 14 days. Consider setting a soft cap alert.',
      type: 'warning',
    },
    {
      title: 'Subscription consolidation opportunity',
      body: 'You have 4 active subscriptions; potential savings estimated at $18/month.',
      type: 'success',
    },
    {
      title: 'Weekend spending pattern',
      body: 'Most discretionary spend happens between Fri–Sun, 6–10 PM.',
      type: 'warning',
    },
  ]), []);

  return (
    <div>
      <PageSection
        title="Insights"
        subtitle="Beautiful, narrative analytics. Placeholder insights below."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => addAlert({
              type: 'warning',
              title: 'Insight saved as alert',
              message: 'We will notify you when this pattern repeats (placeholder).',
            })}
          >
            Save as alert
          </button>
        }
      >
        <div className="grid">
          {insights.map((i) => (
            <div key={i.title} className="card" style={{ gridColumn: 'span 6' }}>
              <div className="card-title-row">
                <h3 style={{ fontSize: 14, margin: 0 }}>{i.title}</h3>
                <span className={i.type === 'success' ? 'pill pill-success' : 'pill pill-warn'}>
                  <span className="pill-dot" aria-hidden="true" />
                  {i.type}
                </span>
              </div>
              <div className="small-muted" style={{ marginTop: 8 }}>{i.body}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <h3 style={{ fontSize: 14, margin: 0 }}>What’s next</h3>
          <ul style={{ margin: '10px 0 0 18px', padding: 0, color: 'var(--muted)', fontSize: 13 }}>
            <li>Wire charts and forecasts to backend endpoints.</li>
            <li>Use REACT_APP_WS_URL for real-time anomaly alerts.</li>
            <li>Add exportable insight reports.</li>
          </ul>
        </div>
      </PageSection>
    </div>
  );
}
