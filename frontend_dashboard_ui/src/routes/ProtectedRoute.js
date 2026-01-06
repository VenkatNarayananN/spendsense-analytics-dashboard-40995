import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const POST_LOGIN_REDIRECT_KEY = 'spendsense.postLoginRedirect';

// PUBLIC_INTERFACE
export default function ProtectedRoute({ children }) {
  /**
   * Route guard using real Supabase auth state.
   *
   * Behavior:
   * - While auth is loading, show a minimal loading panel.
   * - If Supabase isn't configured, redirect to "/" and include a friendly message.
   * - If not authenticated:
   *    - persist the intended URL (pathname + search + hash) for post-login redirect
   *    - redirect to "/" (do NOT trigger OAuth automatically)
   */
  const { isAuthenticated, isLoading, isSupabaseConfigured } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 12 }}>
        <strong style={{ fontSize: 13 }}>Checking session…</strong>
        <div className="small-muted" style={{ marginTop: 6 }}>
          Verifying your sign-in status.
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location,
          authMessage:
            'Protected pages require Supabase Auth. Please configure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.',
        }}
      />
    );
  }

  if (!isAuthenticated) {
    // Persist the full intended path so /auth/callback can restore it after OAuth.
    // We use sessionStorage so it survives the OAuth full-page redirect but clears on tab close.
    try {
      const intended = `${location.pathname || '/'}${location.search || ''}${location.hash || ''}`;
      sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, intended);
    } catch {
      // Ignore storage errors (private mode/quota); we'll fall back to dashboard.
    }

    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location,
          authMessage: 'Please sign in to continue.',
        }}
      />
    );
  }

  return children;
}
