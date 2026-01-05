import React from 'react';

/**
 * Shared visual wrapper for chart placeholders.
 * This keeps the "coming soon" UI consistent across chart types.
 */

// PUBLIC_INTERFACE
export default function ChartPlaceholderCard({ title, subtitle = 'Chart coming soon', footer }) {
  /** Card-like placeholder for chart surfaces. */
  return (
    <div className="chart-card" role="figure" aria-label={title ? `Chart: ${title}` : 'Chart placeholder'}>
      <div className="chart-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="chart-card-title">{title || 'Chart'}</div>
          <div className="chart-card-subtitle">{subtitle}</div>
        </div>
        <span className="pill pill-warn">
          <span className="pill-dot" aria-hidden="true" />
          Placeholder
        </span>
      </div>

      <div className="chart-card-body">
        <div className="chart-skeleton" aria-hidden="true">
          <div className="chart-skeleton-grid" />
        </div>
      </div>

      {footer ? (
        <div className="chart-card-footer">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
