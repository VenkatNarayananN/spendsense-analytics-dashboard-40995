import React from 'react';

// PUBLIC_INTERFACE
export default function EmptyState({
  title = 'Nothing here yet',
  description = 'Try adjusting your filters or check back later.',
  actionLabel,
  onAction,
  minHeight = 180,
}) {
  /** Reusable empty state for tables/panels with optional primary action. */
  return (
    <div className="state state-empty" role="region" aria-label={title} style={{ minHeight }}>
      <div className="state-illustration" aria-hidden="true">
        <div className="empty-mark">
          <div className="empty-orb" />
          <div className="empty-line" />
          <div className="empty-line short" />
        </div>
      </div>
      <div className="state-content">
        <div className="state-title">{title}</div>
        <div className="state-desc">{description}</div>
        {actionLabel && typeof onAction === 'function' ? (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={onAction}>
              {actionLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
