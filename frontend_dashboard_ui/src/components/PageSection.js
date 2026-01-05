import React from 'react';

// PUBLIC_INTERFACE
export default function PageSection({ title, subtitle, actions, children }) {
  /** Page section wrapper with consistent spacing and heading hierarchy. */
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-title-row">
        <div>
          <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
          {subtitle ? <div className="small-muted" style={{ marginTop: 4 }}>{subtitle}</div> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      <div style={{ marginTop: 12 }}>
        {children}
      </div>
    </div>
  );
}
