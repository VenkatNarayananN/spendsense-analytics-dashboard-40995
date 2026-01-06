import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../config/supabaseClient';
import { getEnv } from '../config/env';

/**
 * Supabase-backed authentication context.
 *
 * - Uses Supabase Auth session state when configured via env vars.
 * - Falls back gracefully when Supabase is not configured (no-op auth actions + friendly messaging).
 *
 * This replaces the previous mock-only auth scaffolding.
 */

const AuthContext = createContext(null);

function normalizeAuthError(err) {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (err.message) return String(err.message);
  return 'Authentication failed.';
}

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides real auth state from Supabase (or safe no-op fallback when not configured). */
  const supabase = getSupabase();

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  // Track basic status + last error for UI messaging.
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  const isSupabaseConfigured = Boolean(supabase);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSession() {
      if (!supabase) {
        // Supabase not configured: stay in a stable guest state.
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setAuthError(null);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          setAuthError(normalizeAuthError(error));
          setSession(null);
          setUser(null);
        } else {
          const nextSession = data?.session ?? null;
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
        }
      } catch (e) {
        if (!isMounted) return;
        setAuthError(normalizeAuthError(e));
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitialSession();

    // Subscribe to auth changes so UI/ProtectedRoute respond immediately.
    if (!supabase) return () => { };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      try {
        subscription?.subscription?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [supabase]);

  const value = useMemo(() => {
    const frontendUrl =
      getEnv('REACT_APP_FRONTEND_URL', null) ||
      (typeof window !== 'undefined' ? window.location.origin : null);

    return {
      // Core state
      isSupabaseConfigured,
      isLoading,
      session,
      user,
      isAuthenticated: Boolean(user),
      authError,

      // PUBLIC_INTERFACE
      async signInWithGoogle() {
        /** Start Google OAuth sign-in using Supabase (no-op if Supabase is not configured). */
        setAuthError(null);

        if (!supabase) {
          setAuthError(
            'Sign-in is disabled because Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'
          );
          return { ok: false, error: 'Supabase not configured' };
        }

        try {
          const redirectTo = frontendUrl ? `${frontendUrl.replace(/\/+$/, '')}/auth/callback` : undefined;

          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: redirectTo ? { redirectTo } : undefined,
          });

          if (error) {
            const msg = normalizeAuthError(error);
            setAuthError(msg);
            return { ok: false, error: msg };
          }

          // Note: On success, the browser is typically redirected to the provider.
          return { ok: true };
        } catch (e) {
          const msg = normalizeAuthError(e);
          setAuthError(msg);
          return { ok: false, error: msg };
        }
      },

      // PUBLIC_INTERFACE
      async signOut() {
        /** Sign out current user (no-op if Supabase is not configured). */
        setAuthError(null);

        if (!supabase) {
          setSession(null);
          setUser(null);
          return { ok: true };
        }

        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            const msg = normalizeAuthError(error);
            setAuthError(msg);
            return { ok: false, error: msg };
          }
          // Auth listener will clear session/user too, but we can be explicit.
          setSession(null);
          setUser(null);
          return { ok: true };
        } catch (e) {
          const msg = normalizeAuthError(e);
          setAuthError(msg);
          return { ok: false, error: msg };
        }
      },
    };
  }, [authError, isLoading, isSupabaseConfigured, session, supabase, user]);

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
