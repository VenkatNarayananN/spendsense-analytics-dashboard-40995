import React from 'react';
import PageSection from '../components/PageSection';
import { useUI } from '../context/UIContext';
import { getBackendUrl, getEnv } from '../config/env';

// PUBLIC_INTERFACE
export default function Settings() {
  /** Settings page (placeholder) for UI preferences and environment diagnostics. */
  const { theme, toggleTheme } = useUI();
  const backendUrl = getBackendUrl();

  const frontendUrl = getEnv('REACT_APP_FRONTEND_URL', undefined);
  const wsUrl = getEnv('REACT_APP_WS_URL', undefined);

  return (
    <div>
      <PageSection
        title="Settings"
        subtitle="Preferences and configuration (placeholder)."
        actions={
          <button type="button" className="btn btn-primary" onClick={toggleTheme}>
            Toggle theme
          </button>
        }
      >
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 6' }}>
            <h3 style={{ fontSize: 14, margin: 0 }}>Appearance</h3>
            <div className="small-muted" style={{ marginTop: 8 }}>
              Theme is applied via <span className="mono">data-theme</span> on the document element.
            </div>
            <div style={{ marginTop: 12 }}>
              <span className="pill">
                <span className="pill-dot" aria-hidden="true" />
                Current theme: <span className="mono">{theme}</span>
              </span>
            </div>
          </div>

          <div className="card" style={{ gridColumn: 'span 6' }}>
            <h3 style={{ fontSize: 14, margin: 0 }}>Environment</h3>
            <div className="small-muted" style={{ marginTop: 8 }}>
              These are optional in preview. The UI won’t hard-fail if absent.
            </div>

            <table className="table" aria-label="Environment variables">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">REACT_APP_BACKEND_URL</td>
                  <td className="mono">{backendUrl || '—'}</td>
                </tr>
                <tr>
                  <td className="mono">REACT_APP_FRONTEND_URL</td>
                  <td className="mono">{frontendUrl || '—'}</td>
                </tr>
                <tr>
                  <td className="mono">REACT_APP_WS_URL</td>
                  <td className="mono">{wsUrl || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
