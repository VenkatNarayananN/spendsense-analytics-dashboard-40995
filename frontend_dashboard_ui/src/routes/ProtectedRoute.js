import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// PUBLIC_INTERFACE
export default function ProtectedRoute({ children }) {
  /**
   * Route guard using real Supabase auth state.
   *
   * Behavior:
   * - While auth is loading, show a minimal loading panel.
   * - If Supabase isn't configured, redirect to "/" and include a friendly message.
   * - If not authenticated, redirect to "/" and preserve "from" in location state.
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
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
