import React from 'react';

// PUBLIC_INTERFACE
export default function LoadingState({ message = 'Loading…', minHeight = 160 }) {
  /** Reusable loading state for primary panels/tables with accessible status messaging. */
  return (
    <div
      className="state state-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ minHeight }}
    >
      <div className="state-illustration" aria-hidden="true">
        <div className="spinner" />
      </div>
      <div className="state-content">
        <div className="state-title">Loading</div>
        <div className="state-desc">{message}</div>
      </div>
    </div>
  );
}
