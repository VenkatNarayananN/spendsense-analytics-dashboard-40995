import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import { useAlerts } from '../context/AlertsContext';
import { useAuth } from '../context/AuthContext';
import { getBackendUrl } from '../config/env';

function Icon({ label }) {
  return <span className="nav-icon" aria-hidden="true">{label}</span>;
}

function routeTitle(pathname) {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/transactions')) return 'Transactions';
  if (pathname.startsWith('/insights')) return 'Insights';
  if (pathname.startsWith('/alerts')) return 'Alerts';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'SpendSense';
}

// PUBLIC_INTERFACE
export default function AppShell() {
  /** Main app layout: sidebar + topbar + content + persistent alerts rail. */
  const { theme, toggleTheme, searchQuery, setSearchQuery } = useUI();
  const { alerts, dismissAlert, clearAlerts } = useAlerts();
  const {
    isAuthenticated,
    isSupabaseConfigured,
    isLoading: authLoading,
    user,
    authError,
    authBannerError,
    clearAuthBannerError,
    signInWithGoogle,
    signOut,
  } = useAuth();
  const location = useLocation();

  const backendUrl = getBackendUrl();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = useMemo(() => ([
    { to: '/', label: 'Dashboard', icon: '⌁', badge: 'Home', end: true },
    { to: '/transactions', label: 'Transactions', icon: '⟐', badge: 'List' },
    { to: '/insights', label: 'Insights', icon: '◈', badge: 'Trends' },
    { to: '/alerts', label: 'Alerts', icon: '⟁', badge: String(alerts.length) },
    { to: '/settings', label: 'Settings', icon: '⟡', badge: 'Prefs' },
  ]), [alerts.length]);

  // Close the mobile menu when navigation occurs.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="App">
      {/* Responsive top navbar (small screens) */}
      <header className="topnav" role="navigation" aria-label="Top navigation">
        <div className="topnav-left">
          <button
            type="button"
            className="hamburger"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen ? 'true' : 'false'}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {/* Simple hamburger glyph; keep consistent with lightweight, no-icons approach */}
            ☰
          </button>

          <div className="topnav-title">
            <strong>SpendSense</strong>
            <span>{routeTitle(location.pathname)}</span>
          </div>
        </div>

        <div className="topnav-actions">
          <button type="button" className="btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </header>

      <div className={mobileMenuOpen ? 'mobile-menu open' : 'mobile-menu'} aria-label="Mobile menu">
        {navLinks.map((l) => (
          <NavLink key={l.to} to={l.to} end={Boolean(l.end)}>
            <span className="mobile-menu-row">
              <Icon label={l.icon} />
              <span style={{ fontWeight: 800 }}>{l.label}</span>
            </span>
            <span className="badge">{l.badge}</span>
          </NavLink>
        ))}

        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          <button
            type="button"
            className={isAuthenticated ? 'btn' : 'btn btn-primary'}
            onClick={async () => {
              if (authLoading) return;
              if (isAuthenticated) {
                await signOut();
              } else {
                await signInWithGoogle();
              }
            }}
            disabled={authLoading}
            aria-label={isAuthenticated ? 'Sign out' : 'Sign in with Google'}
          >
            {authLoading ? 'Please wait…' : isAuthenticated ? 'Sign out' : 'Sign in with Google'}
          </button>

          {authBannerError ? (
            <div className="auth-banner" role="alert" aria-live="polite">
              <div className="auth-banner__row">
                <strong style={{ fontSize: 12 }}>Sign-in issue</strong>
                <button
                  type="button"
                  className="auth-banner__dismiss"
                  onClick={clearAuthBannerError}
                  aria-label="Dismiss sign-in error"
                >
                  ×
                </button>
              </div>
              <div className="auth-banner__message">{authBannerError}</div>
              <div className="auth-banner__actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    if (authLoading) return;
                    await signInWithGoogle();
                  }}
                  disabled={authLoading}
                >
                  {authLoading ? 'Please wait…' : 'Retry sign-in'}
                </button>
              </div>
            </div>
          ) : null}
          {!isSupabaseConfigured ? (
            <div className="small-muted">
              Auth is disabled (missing <span className="mono">REACT_APP_SUPABASE_URL</span> /
              <span className="mono"> REACT_APP_SUPABASE_KEY</span>).
            </div>
          ) : authError ? (
            <div className="small-muted">
              <span className="mono">Auth:</span> {authError}
            </div>
          ) : isAuthenticated && user?.email ? (
            <div className="small-muted">
              Signed in as <span className="mono">{user.email}</span>
            </div>
          ) : (
            <div className="small-muted">
              Protected routes: <span className="mono">/insights</span>, <span className="mono">/alerts</span>
            </div>
          )}
        </div>
      </div>

      <div className="app-shell">
        <aside className="sidebar" aria-label="Primary navigation">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <div className="brand-title">
              <strong>SpendSense</strong>
              <span>Analytics Suite</span>
            </div>
          </div>

          <nav className="nav">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={Boolean(l.end)}>
                <span className="nav-item-left">
                  <Icon label={l.icon} />
                  <span className="nav-label">{l.label}</span>
                </span>
                <span className="badge">{l.badge}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="small-muted">
              Backend: <span className="mono">{backendUrl || 'not configured'}</span>
            </div>
            <div className="small-muted">
              Theme: <span className="mono">{theme}</span>
            </div>
            <div className="small-muted" style={{ marginTop: 8 }}>
              Auth: <span className="mono">{isAuthenticated ? 'signed-in' : 'guest'}</span>
            </div>
            {isAuthenticated && user?.email ? (
              <div className="small-muted" style={{ marginTop: 6 }}>
                User: <span className="mono">{user.email}</span>
              </div>
            ) : null}
            {!isSupabaseConfigured ? (
              <div className="small-muted" style={{ marginTop: 6 }}>
                Supabase auth not configured.
              </div>
            ) : null}
            {authError ? (
              <div className="small-muted" style={{ marginTop: 6 }}>
                <span className="mono">Error:</span> {authError}
              </div>
            ) : null}
            <button
              type="button"
              className={isAuthenticated ? 'btn' : 'btn btn-primary'}
              style={{ marginTop: 10, width: '100%' }}
              onClick={async () => {
                if (authLoading) return;
                if (isAuthenticated) {
                  await signOut();
                } else {
                  await signInWithGoogle();
                }
              }}
              disabled={authLoading}
            >
              {authLoading ? 'Please wait…' : isAuthenticated ? 'Sign out' : 'Sign in with Google'}
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar" role="banner">
            <div className="topbar-left">
              <div>
                <p className="page-title">{routeTitle(location.pathname)}</p>
                <span className="small-muted">Ocean Professional · Fintech</span>
              </div>

              <label className="search" aria-label="Global search">
                <span className="search-hint" aria-hidden="true">Search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Merchants, categories, alerts…"
                />
              </label>
            </div>

            <div className="topbar-actions">
              <button type="button" className="btn" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'light' ? 'Dark mode' : 'Light mode'}
              </button>

              <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    if (authLoading) return;
                    if (isAuthenticated) {
                      await signOut();
                    } else {
                      await signInWithGoogle();
                    }
                  }}
                  aria-label={isAuthenticated ? 'Sign out' : 'Sign in with Google'}
                  disabled={authLoading}
                >
                  {authLoading ? 'Please wait…' : isAuthenticated ? 'Sign out' : 'Sign in'}
                </button>

                {authBannerError ? (
                  <div className="auth-banner auth-banner--compact" role="alert" aria-live="polite">
                    <div className="auth-banner__row">
                      <div className="auth-banner__message">{authBannerError}</div>
                      <button
                        type="button"
                        className="auth-banner__dismiss"
                        onClick={clearAuthBannerError}
                        aria-label="Dismiss sign-in error"
                      >
                        ×
                      </button>
                    </div>
                    <div className="auth-banner__actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={async () => {
                          if (authLoading) return;
                          await signInWithGoogle();
                        }}
                        disabled={authLoading}
                      >
                        {authLoading ? 'Please wait…' : 'Retry'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  // Placeholder action; later this might open a modal to add a transaction.
                  // Here we only keep it as a UI affordance.
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                New transaction
              </button>
            </div>
          </header>

          <section className="content" aria-label="Main content">
            <Outlet />
          </section>
        </main>

        <aside className="alerts-rail" aria-label="Persistent alerts">
          <div className="alerts-header">
            <div>
              <strong>Alerts</strong>
              <div className="small-muted">{alerts.length} active</div>
            </div>
            <button type="button" className="icon-btn" onClick={clearAlerts} aria-label="Clear all alerts">
              Clear
            </button>
          </div>

          <div className="alerts-list" role="list">
            {alerts.length === 0 ? (
              <div className="card" style={{ padding: 12 }}>
                <div className="small-muted">No alerts right now. You're all set.</div>
              </div>
            ) : (
              alerts.map((a) => {
                const pillClass =
                  a.type === 'success' ? 'pill pill-success' :
                  a.type === 'error' ? 'pill pill-error' :
                  'pill pill-warn';

                return (
                  <div key={a.id} className="alert-item" role="listitem">
                    <div>
                      <p className="alert-title">{a.title}</p>
                      <p className="alert-body">{a.message}</p>
                      <div style={{ marginTop: 8 }}>
                        <span className={pillClass}>
                          <span className="pill-dot" aria-hidden="true" />
                          {a.type}
                        </span>
                      </div>
                    </div>
                    <div className="alert-meta">
                      <span className="alert-time">{a.relativeTime}</span>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => dismissAlert(a.id)}
                        aria-label={`Dismiss alert: ${a.title}`}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
