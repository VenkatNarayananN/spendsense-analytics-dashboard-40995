import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

let cachedClient = undefined;

/**
 * Conditionally initialize a Supabase client.
 *
 * We intentionally *do not* hard-fail when credentials are missing because:
 * - preview/dev environments may not have Supabase configured
 * - UI should continue to operate with placeholder data
 */

// PUBLIC_INTERFACE
export function getSupabase() {
  /** Returns a singleton Supabase client, or null if env vars are missing. */
  if (cachedClient !== undefined) return cachedClient;

  const url = getEnv('REACT_APP_SUPABASE_URL', null);
  const anonKey = getEnv('REACT_APP_SUPABASE_KEY', null);

  if (!url || !anonKey) {
    // Graceful fallback: keep UI working without realtime
    // eslint-disable-next-line no-console
    console.info(
      '[SpendSense] Supabase Realtime disabled (missing REACT_APP_SUPABASE_URL and/or REACT_APP_SUPABASE_KEY).'
    );
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      // This app currently does not implement Supabase Auth; avoid storing sessions.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      // Keep defaults; can be tuned later if needed.
    },
  });

  return cachedClient;
}
