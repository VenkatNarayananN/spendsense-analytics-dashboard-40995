import React from 'react';

// PUBLIC_INTERFACE
export default function InlineErrorBanner({
  title = 'Something went wrong',
  description,
  actionLabel = 'Retry',
  onAction,
  isBusy = false,
  tone = 'error', // 'error' | 'warning' | 'info'
  style,
}) {
  /** Small inline banner for non-blocking page errors with optional retry action. */
  const border =
    tone === 'warning'
      ? 'rgba(245, 158, 11, 0.35)'
      : tone === 'info'
        ? 'rgba(59, 130, 246, 0.35)'
        : 'rgba(239, 68, 68, 0.35)';

  const bg =
    tone === 'warning'
      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(255, 255, 255, 0.85))'
      : tone === 'info'
        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.10), rgba(255, 255, 255, 0.85))'
        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.10), rgba(255, 255, 255, 0.85))';

  return (
    <div
      role="status"
      aria-live="polite"
      className="card"
      style={{
        padding: 12,
        border: `1px solid ${border}`,
        background: bg,
        ...style,
      }}
    >
      <div className="card-title-row">
        <strong style={{ fontSize: 13 }}>{title}</strong>
        {actionLabel && typeof onAction === 'function' ? (
          <button type="button" className="btn" onClick={onAction} disabled={isBusy}>
            {isBusy ? 'Retrying…' : actionLabel}
          </button>
        ) : null}
      </div>

      {description ? (
        <div className="small-muted" style={{ marginTop: 6 }}>
          {description}
        </div>
      ) : null}
    </div>
  );
}
