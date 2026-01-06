import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../config/supabaseClient';

const POST_LOGIN_REDIRECT_KEY = 'spendsense.postLoginRedirect';

/**
 * OAuth redirect callback landing page.
 *
 * Supabase Auth (OAuth) redirects back to this route. With `detectSessionInUrl: true`,
 * supabase-js will parse the session from the URL hash/query automatically, but we
 * still:
 * - call getSession() once to ensure state is available immediately
 * - redirect the user back to the persisted intended path (if present), else "/dashboard"
 */

// PUBLIC_INTERFACE
export default function AuthCallback() {
  /** Minimal callback handler to finalize OAuth login and redirect the user. */
  const supabase = getSupabase();
  const navigate = useNavigate();

  const [message, setMessage] = useState('Finalizing sign-in…');

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
        setMessage(
          'Sign-in cannot be completed because Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'
        );
        window.setTimeout(() => {
          if (!cancelled) navigate('/', { replace: true });
        }, 900);
        return;
      }

      const intended = getAndClearIntendedRedirect();

      try {
        // Trigger a session read to ensure tokens are processed.
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error || !data?.session) {
          setMessage('Sign-in failed or was cancelled. Redirecting…');
          window.setTimeout(() => {
            if (!cancelled) navigate('/', { replace: true });
          }, 900);
          return;
        }

        setMessage('Signed in. Redirecting…');
        navigate(intended || '/dashboard', { replace: true });
      } catch {
        if (cancelled) return;
        setMessage('Sign-in failed. Redirecting…');
        window.setTimeout(() => {
          if (!cancelled) navigate('/', { replace: true });
        }, 900);
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
    </div>
  );
}
