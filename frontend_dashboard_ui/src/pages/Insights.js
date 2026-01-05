import React, { useEffect, useMemo, useState } from 'react';
import PageSection from '../components/PageSection';
import { useAlerts } from '../context/AlertsContext';
import LineChartPlaceholder from '../components/charts/LineChartPlaceholder';
import BarChartPlaceholder from '../components/charts/BarChartPlaceholder';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

function rangeLabel(range) {
  if (range === '7d') return 'Last 7 days';
  if (range === '30d') return 'Last 30 days';
  if (range === '90d') return 'Last 90 days';
  return 'Last 30 days';
}

// PUBLIC_INTERFACE
export default function Insights() {
  /** Insights page (placeholder) offering narrative analytics and actions to create alerts. */
  const { addAlert } = useAlerts();

  const [timeRange, setTimeRange] = useState('30d');
  const [segment, setSegment] = useState('All categories');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const t = window.setTimeout(() => setIsLoading(false), 650);
    return () => window.clearTimeout(t);
  }, [timeRange, segment]);

  const insights = useMemo(() => ([
    {
      title: 'Dining spike detected',
      body: 'Dining spend is +22% over the last 14 days. Consider setting a soft cap alert.',
      type: 'warning',
      segment: 'Dining',
    },
    {
      title: 'Subscription consolidation opportunity',
      body: 'You have 4 active subscriptions; potential savings estimated at $18/month.',
      type: 'success',
      segment: 'Subscriptions',
    },
    {
      title: 'Weekend spending pattern',
      body: 'Most discretionary spend happens between Fri–Sun, 6–10 PM.',
      type: 'warning',
      segment: 'Discretionary',
    },
  ]), []);

  const segments = useMemo(() => ([
    'All categories',
    'Dining',
    'Subscriptions',
    'Discretionary',
  ]), []);

  const filteredInsights = useMemo(() => {
    if (segment === 'All categories') return insights;
    return insights.filter((i) => i.segment === segment);
  }, [insights, segment]);

  return (
    <div>
      <PageSection
        title="Insights"
        subtitle="Beautiful, narrative analytics. Filters below are wired to placeholder content."
        actions={(
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => addAlert({
              type: 'warning',
              title: 'Insight saved as alert',
              message: `We will notify you when this pattern repeats (${rangeLabel(timeRange)}, ${segment}). (placeholder)`,
            })}
          >
            Save as alert
          </button>
        )}
      >
        <div className="filter-bar" aria-label="Insights filters">
          <div className="filter-group" style={{ gridColumn: 'span 6' }}>
            <div className="filter-label">Time range</div>
            <div className="chip-group" role="group" aria-label="Insights time range">
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
          </div>

          <div className="filter-group" style={{ gridColumn: 'span 6' }}>
            <label className="filter-label" htmlFor="ins-seg">Segment</label>
            <select
              id="ins-seg"
              className="select"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              aria-label="Select a segment/category for insights"
            >
              {segments.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {isLoading ? (
            <LoadingState message="Generating insights…" />
          ) : (
            <div className="grid">
              <div style={{ gridColumn: 'span 7' }}>
                <LineChartPlaceholder title={`Forecast vs. actual spend · ${rangeLabel(timeRange)}`} />
              </div>
              <div style={{ gridColumn: 'span 5' }}>
                <BarChartPlaceholder title={`Top categories · ${rangeLabel(timeRange)} · ${segment}`} />
              </div>
            </div>
          )}
        </div>

        <div className="grid" style={{ marginTop: 14 }}>
          {isLoading ? null : filteredInsights.length === 0 ? (
            <div style={{ gridColumn: 'span 12' }}>
              <EmptyState
                title="No insights for this segment"
                description="Try selecting a different segment or widening the time range."
                actionLabel="Reset segment"
                onAction={() => setSegment('All categories')}
              />
            </div>
          ) : (
            filteredInsights.map((i) => (
              <div key={i.title} className="card" style={{ gridColumn: 'span 6' }}>
                <div className="card-title-row">
                  <h3 style={{ fontSize: 14, margin: 0 }}>{i.title}</h3>
                  <span className={i.type === 'success' ? 'pill pill-success' : 'pill pill-warn'}>
                    <span className="pill-dot" aria-hidden="true" />
                    {i.type}
                  </span>
                </div>
                <div className="small-muted" style={{ marginTop: 8 }}>{i.body}</div>
                <div className="small-muted" style={{ marginTop: 10 }}>
                  Segment: <span className="mono">{i.segment}</span> · Range: <span className="mono">{timeRange}</span>
                </div>
              </div>
            ))
          )}
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
