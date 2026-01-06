import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../config/supabaseClient';
import { getEnv } from '../config/env';

/**
 * Supabase-backed authentication context.
 *
 * - Uses Supabase Auth session state when configured via env vars.
 * - Falls back gracefully when Supabase is not configured (no-op auth actions + friendly messaging).
 * - Provides a persistent, dismissible "auth banner" error for failed login/callback flows.
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

/**
 * Convert a raw Supabase/auth error into a *user-safe* message.
 * Detailed debugging information is logged separately.
 */
function toUserFacingAuthError(_err) {
  return 'Sign-in failed. Please try again or contact support.';
}

function logAuthError(context, err) {
  // eslint-disable-next-line no-console
  console.error(`[SpendSense][Auth] ${context}`, {
    status: err?.status,
    code: err?.code,
    message: err?.message,
    name: err?.name,
    raw: err,
  });
}

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides real auth state from Supabase (or safe no-op fallback when not configured). */
  const supabase = getSupabase();

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  // "authError" remains for short, inline hints (existing UI).
  const [authError, setAuthError] = useState(null);

  // "authBannerError" is a persistent, dismissible error banner for failed sign-in flows.
  const [authBannerError, setAuthBannerError] = useState(null);

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
          logAuthError('getSession() failed while loading initial session', error);
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
        logAuthError('getSession() threw while loading initial session', e);
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

    // PUBLIC_INTERFACE
    const clearAuthBannerError = () => {
      /** Dismiss the persistent auth banner error. */
      setAuthBannerError(null);
    };

    return {
      // Core state
      isSupabaseConfigured,
      isLoading,
      session,
      user,
      isAuthenticated: Boolean(user),
      authError,

      // Persistent auth banner error state (dismissible / persists until retry or dismiss)
      authBannerError,

      clearAuthBannerError,

      // PUBLIC_INTERFACE
      async signInWithGoogle() {
        /** Start Google OAuth sign-in using Supabase (no-op if Supabase is not configured). */
        setAuthError(null);

        if (!supabase) {
          const hint =
            'Sign-in is disabled because Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.';
          // Keep existing hint behavior + also set banner for visibility near auth controls.
          setAuthError(hint);
          setAuthBannerError(hint);
          return { ok: false, error: 'Supabase not configured' };
        }

        // When user retries sign-in, clear previous persistent banner.
        clearAuthBannerError();

        try {
          const redirectTo = frontendUrl ? `${frontendUrl.replace(/\/*$/, '')}/auth/callback` : undefined;

          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: redirectTo ? { redirectTo } : undefined,
          });

          if (error) {
            logAuthError('signInWithOAuth(google) returned an error', error);
            const userMsg = toUserFacingAuthError(error);
            setAuthBannerError(userMsg);
            setAuthError(userMsg);
            return { ok: false, error: userMsg };
          }

          // Note: On success, the browser is typically redirected to the provider.
          return { ok: true };
        } catch (e) {
          logAuthError('signInWithOAuth(google) threw', e);
          const userMsg = toUserFacingAuthError(e);
          setAuthBannerError(userMsg);
          setAuthError(userMsg);
          return { ok: false, error: userMsg };
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
            logAuthError('signOut() returned an error', error);
            const msg = normalizeAuthError(error);
            setAuthError(msg);
            return { ok: false, error: msg };
          }
          // Auth listener will clear session/user too, but we can be explicit.
          setSession(null);
          setUser(null);
          return { ok: true };
        } catch (e) {
          logAuthError('signOut() threw', e);
          const msg = normalizeAuthError(e);
          setAuthError(msg);
          return { ok: false, error: msg };
        }
      },
    };
  }, [authBannerError, authError, isLoading, isSupabaseConfigured, session, supabase, user]);

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
