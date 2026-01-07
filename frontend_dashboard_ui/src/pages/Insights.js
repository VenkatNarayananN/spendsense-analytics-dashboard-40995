import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageSection from '../components/PageSection';
import { useAlerts } from '../context/AlertsContext';
import LineChartPlaceholder from '../components/charts/LineChartPlaceholder';
import BarChartPlaceholder from '../components/charts/BarChartPlaceholder';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import InlineErrorBanner from '../components/InlineErrorBanner';

function rangeLabel(range) {
  if (range === '7d') return 'Last 7 days';
  if (range === '30d') return 'Last 30 days';
  if (range === '90d') return 'Last 90 days';
  return 'Last 30 days';
}

function toUserFacingError(e) {
  if (!e) return 'Something went wrong.';
  if (typeof e === 'string') return e;
  if (typeof e?.error === 'string') return e.error;
  return 'Something went wrong.';
}

// PUBLIC_INTERFACE
export default function Insights() {
  /** Insights page (placeholder) offering narrative analytics and actions to create alerts. */
  const { addAlert } = useAlerts();

  const [timeRange, setTimeRange] = useState('30d');
  const [segment, setSegment] = useState('All categories');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Placeholder "data"
  const [insightsData, setInsightsData] = useState(null);

  // Helps avoid UI flicker on rapid changes
  const seqRef = useRef(0);

  const baseInsights = useMemo(() => ([
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
    const src = insightsData || [];
    if (segment === 'All categories') return src;
    return src.filter((i) => i.segment === segment);
  }, [insightsData, segment]);

  async function fetchInsights({ isManualRetry = false } = {}) {
    const hasPreviousData = Array.isArray(insightsData) && insightsData.length > 0;

    if (hasPreviousData) setIsRefreshing(true);
    else setIsLoading(true);

    if (isManualRetry || !hasPreviousData) setError(null);

    const seq = seqRef.current + 1;
    seqRef.current = seq;

    // Simulated fetch; keep consistent wrappers as if this were a real API call.
    await new Promise((r) => setTimeout(r, 650));

    // Small chance of simulated error to exercise error UI during manual testing.
    // (Unit tests will mock this component state directly.)
    const shouldFail = Math.random() < 0.08;

    if (seqRef.current !== seq) return;

    if (shouldFail) {
      setError(toUserFacingError('Unable to generate insights right now. Please try again.'));
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setInsightsData(baseInsights);
    setError(null);
    setIsLoading(false);
    setIsRefreshing(false);
  }

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, segment]);

  const showInitialBlockingLoad = isLoading && !insightsData;
  const showBlockingError = Boolean(error) && !insightsData;

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

        {/* Non-blocking error banner if we have last-known data */}
        {error && insightsData ? (
          <div style={{ marginTop: 12 }}>
            <InlineErrorBanner
              title="Insights may be out of date"
              description={error}
              actionLabel="Retry"
              onAction={() => fetchInsights({ isManualRetry: true })}
              isBusy={isRefreshing}
              tone="warning"
            />
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          {showInitialBlockingLoad ? (
            <LoadingState message="Generating insights…" />
          ) : showBlockingError ? (
            <EmptyState
              title="Could not load insights"
              description={error}
              actionLabel="Retry"
              onAction={() => fetchInsights({ isManualRetry: true })}
            />
          ) : (
            <div style={isRefreshing ? { opacity: 0.72 } : undefined} aria-busy={isRefreshing ? 'true' : 'false'}>
              <div className="grid">
                <div style={{ gridColumn: 'span 7' }}>
                  <LineChartPlaceholder title={`Forecast vs. actual spend · ${rangeLabel(timeRange)}`} />
                </div>
                <div style={{ gridColumn: 'span 5' }}>
                  <BarChartPlaceholder title={`Top categories · ${rangeLabel(timeRange)} · ${segment}`} />
                </div>
              </div>

              {isRefreshing ? (
                <div className="small-muted" style={{ marginTop: 10 }}>
                  Refreshing insights…
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid" style={{ marginTop: 14 }}>
          {(showInitialBlockingLoad || showBlockingError) ? null : filteredInsights.length === 0 ? (
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
