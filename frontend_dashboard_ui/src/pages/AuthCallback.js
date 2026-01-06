import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

const POST_LOGIN_REDIRECT_KEY = 'spendsense.postLoginRedirect';

function logAuthCallbackError(context, err) {
  // eslint-disable-next-line no-console
  console.error(`[SpendSense][AuthCallback] ${context}`, {
    status: err?.status,
    code: err?.code,
    message: err?.message,
    name: err?.name,
    raw: err,
  });
}

/**
 * OAuth redirect callback landing page.
 *
 * Supabase Auth (OAuth) redirects back to this route. With `detectSessionInUrl: true`,
 * supabase-js will parse the session from the URL hash/query automatically, but we
 * still:
 * - call getSession() once to ensure state is available immediately
 * - redirect the user back to the persisted intended path (if present), else "/dashboard"
 *
 * This page additionally provides a friendly error section and retry action when
 * session finalization fails.
 */

// PUBLIC_INTERFACE
export default function AuthCallback() {
  /** Minimal callback handler to finalize OAuth login and redirect the user. */
  const supabase = getSupabase();
  const navigate = useNavigate();
  const { signInWithGoogle, isSupabaseConfigured } = useAuth();

  const [message, setMessage] = useState('Finalizing sign-in…');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function getAndClearIntendedRedirect() {
      try {
        const v = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
        if (v) sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
        return v;
      } catch {
        return null;
      }
    }

    async function finalize() {
      if (!supabase) {
        if (cancelled) return;
        setHasError(true);
        setMessage(
          'Sign-in cannot be completed because Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'
        );
        return;
      }

      const intended = getAndClearIntendedRedirect();

      try {
        // Trigger a session read to ensure tokens are processed.
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error) {
          logAuthCallbackError('getSession() returned an error during OAuth callback finalization', error);
        }

        if (error || !data?.session) {
          setHasError(true);
          setMessage('Sign-in failed. Please try again or contact support.');
          return;
        }

        setMessage('Signed in. Redirecting…');
        navigate(intended || '/dashboard', { replace: true });
      } catch (e) {
        if (cancelled) return;
        logAuthCallbackError('getSession() threw during OAuth callback finalization', e);
        setHasError(true);
        setMessage('Sign-in failed. Please try again or contact support.');
      }
    }

    finalize();

    return () => {
      cancelled = true;
    };
  }, [navigate, supabase]);

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="card-title-row">
        <h2 style={{ fontSize: 16, margin: 0 }}>Authentication</h2>
        <span className="badge">OAuth</span>
      </div>

      <div className="small-muted" style={{ marginTop: 8 }}>
        {message}
      </div>

      {hasError ? (
        <div className="auth-callback-actions" style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              if (!isSupabaseConfigured) {
                navigate('/', { replace: true });
                return;
              }
              await signInWithGoogle();
            }}
            disabled={!isSupabaseConfigured}
            aria-label="Retry sign-in"
          >
            Retry sign-in
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => navigate('/', { replace: true })}
            aria-label="Back to home"
          >
            Back to home
          </button>
        </div>
      ) : null}
    </div>
  );
}
