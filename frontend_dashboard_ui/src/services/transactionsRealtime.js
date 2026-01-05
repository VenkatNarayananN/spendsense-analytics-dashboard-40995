import { getSupabase } from '../config/supabaseClient';

/**
 * Centralized subscription helper for transaction INSERT events.
 * Uses Supabase Realtime (supabase-js v2) when configured.
 */

// PUBLIC_INTERFACE
export function subscribeToNewTransactions(onInsert) {
  /**
   * Subscribe to INSERT events on the `public.transactions` table.
   *
   * @param {(payload: any) => void} onInsert callback invoked for each insert event.
   * @returns {() => void} unsubscribe function (always safe to call).
   */
  const supabase = getSupabase();
  if (!supabase) {
    // No-op unsubscribe for non-configured environments
    return () => {};
  }

  if (typeof onInsert !== 'function') {
    throw new Error('subscribeToNewTransactions requires an onInsert callback function');
  }

  // Use a stable, unique channel name to avoid collisions.
  // (Still, each call creates a new channel; callers must cleanup on unmount.)
  const channelName = `transactions-inserts`;

  // supabase-js v2 realtime API
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'transactions' },
      (payload) => {
        try {
          onInsert(payload);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[SpendSense] onInsert handler threw an error', e);
        }
      }
    )
    .subscribe((status) => {
      // Useful for debugging; keep as info-level
      // eslint-disable-next-line no-console
      console.info('[SpendSense] transactions realtime status:', status);
    });

  return () => {
    // Remove channel to avoid leaks/duplicate events.
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[SpendSense] Failed to cleanup realtime channel', e);
    }
  };
}
