import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Mock authentication context.
 *
 * NOTE: This is intentionally UI-only scaffolding.
 * TODO: Replace with real auth provider (e.g., Supabase Auth / OAuth) when backend is ready.
 */

const AuthContext = createContext(null);

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides a mock authentication state plus login/logout helpers for route scaffolding. */
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const value = useMemo(() => {
    return {
      isAuthenticated,
      // TODO: Replace with real login flow.
      login: () => setIsAuthenticated(true),
      // TODO: Replace with real logout flow / session clear.
      logout: () => setIsAuthenticated(false),
      // Convenience toggle to simulate auth changes in the UI.
      toggleAuth: () => setIsAuthenticated((v) => !v),
    };
  }, [isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook to access AuthContext. */
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
