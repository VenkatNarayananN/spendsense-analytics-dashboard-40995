import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageSection from '../components/PageSection';
import { useUI } from '../context/UIContext';
import { getBackendUrl, getEnv } from '../config/env';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import InlineErrorBanner from '../components/InlineErrorBanner';
import { getCurrentUserProfile } from '../services/backendApi';

function toUserFacingError(e) {
  if (!e) return 'Something went wrong.';
  if (typeof e === 'string') return e;
  if (typeof e?.error === 'string') return e.error;
  return 'Something went wrong.';
}

// PUBLIC_INTERFACE
export default function Settings() {
  /** Settings page for UI preferences, basic profile info, and environment diagnostics. */
  const { theme, toggleTheme } = useUI();
  const navigate = useNavigate();
  const backendUrl = getBackendUrl();

  const frontendUrl = getEnv('REACT_APP_FRONTEND_URL', undefined);
  const wsUrl = getEnv('REACT_APP_WS_URL', undefined);

  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const seqRef = useRef(0);

  async function loadProfile({ isManualRetry = false } = {}) {
    const hasPrevious = Boolean(profile);

    if (hasPrevious) setIsRefreshingProfile(true);
    else setIsLoadingProfile(true);

    if (isManualRetry || !hasPrevious) setProfileError(null);

    const seq = seqRef.current + 1;
    seqRef.current = seq;

    const res = await getCurrentUserProfile();

    if (seqRef.current !== seq) return;

    if (!res.ok) {
      setProfileError(toUserFacingError(res));
      setIsLoadingProfile(false);
      setIsRefreshingProfile(false);
      return;
    }

    setProfile(res.data.user || null);
    setProfileError(null);
    setIsLoadingProfile(false);
    setIsRefreshingProfile(false);
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showInitialBlockingLoad = isLoadingProfile && !profile;
  const showBlockingError = Boolean(profileError) && !profile;

  return (
    <div>
      <PageSection
        title="Settings"
        subtitle="Preferences and configuration."
        actions={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => navigate('/onboarding')}>
              Edit onboarding preferences
            </button>
            <button type="button" className="btn btn-primary" onClick={toggleTheme}>
              Toggle theme
            </button>
          </div>
        }
      >
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 6' }}>
            <h3 style={{ fontSize: 14, margin: 0 }}>Profile</h3>
            <div className="small-muted" style={{ marginTop: 8 }}>
              Loaded from <span className="mono">/api/users/me</span>. If unavailable, the page remains usable.
            </div>

            {/* Non-blocking error banner if we have last-known data */}
            {profileError && profile ? (
              <div style={{ marginTop: 12 }}>
                <InlineErrorBanner
                  title="Could not refresh profile"
                  description={profileError}
                  actionLabel="Retry"
                  onAction={() => loadProfile({ isManualRetry: true })}
                  isBusy={isRefreshingProfile}
                  tone="warning"
                />
              </div>
            ) : null}

            <div style={{ marginTop: 12 }}>
              {showInitialBlockingLoad ? (
                <LoadingState message="Loading profile…" minHeight={140} />
              ) : showBlockingError ? (
                <EmptyState
                  title="Could not load profile"
                  description={profileError}
                  actionLabel="Retry"
                  onAction={() => loadProfile({ isManualRetry: true })}
                  minHeight={160}
                />
              ) : !profile ? (
                <EmptyState
                  title="No profile details available"
                  description="Your account profile could not be found yet. This can happen in demo mode."
                  actionLabel="Retry"
                  onAction={() => loadProfile({ isManualRetry: true })}
                  minHeight={160}
                />
              ) : (
                <div style={isRefreshingProfile ? { opacity: 0.72 } : undefined} aria-busy={isRefreshingProfile ? 'true' : 'false'}>
                  <table className="table" aria-label="User profile">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="mono">id</td>
                        <td className="mono">{profile.id}</td>
                      </tr>
                      <tr>
                        <td className="mono">name</td>
                        <td>{profile.name || '—'}</td>
                      </tr>
                      <tr>
                        <td className="mono">avatar_url</td>
                        <td className="mono">{profile.avatar_url || '—'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {isRefreshingProfile ? (
                    <div className="small-muted" style={{ marginTop: 10 }}>
                      Refreshing profile…
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

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

          <div className="card" style={{ gridColumn: 'span 12' }}>
            <h3 style={{ fontSize: 14, margin: 0 }}>Environment</h3>
            <div className="small-muted" style={{ marginTop: 8 }}>
              These are optional in preview. The UI won’t hard-fail if absent.
            </div>

            <table className="table" aria-label="Environment variables" style={{ marginTop: 10 }}>
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
