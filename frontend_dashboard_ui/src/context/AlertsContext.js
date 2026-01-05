import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Persistent alerts rail state.
 * This is UI-only placeholder logic; later can be wired to backend/WS events.
 */

const AlertsContext = createContext(null);

function nowMinus(minutes) {
  const d = new Date(Date.now() - minutes * 60 * 1000);
  return d;
}

function formatRelativeTime(date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / (60 * 1000)));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const initialAlerts = [
  {
    id: 'a1',
    type: 'warning',
    title: 'Budget nearing limit',
    message: 'Dining is at 82% of your monthly budget.',
    createdAt: nowMinus(18),
  },
  {
    id: 'a2',
    type: 'success',
    title: 'Savings goal on track',
    message: 'You saved $120 this week vs. your $100 target.',
    createdAt: nowMinus(55),
  },
  {
    id: 'a3',
    type: 'error',
    title: 'Unusual charge detected',
    message: 'A $249.99 charge was found in Electronics.',
    createdAt: nowMinus(130),
  },
];

// PUBLIC_INTERFACE
export function AlertsProvider({ children }) {
  /** Provides alert list and mutators for the persistent alerts rail. */
  const [alerts, setAlerts] = useState(() =>
    initialAlerts.map((a) => ({ ...a, relativeTime: formatRelativeTime(a.createdAt) }))
  );

  const value = useMemo(() => {
    return {
      alerts,
      addAlert: (alert) => {
        setAlerts((prev) => {
          const createdAt = alert.createdAt ? new Date(alert.createdAt) : new Date();
          const normalized = {
            id: alert.id || `a_${Math.random().toString(16).slice(2)}`,
            type: alert.type || 'warning',
            title: alert.title || 'Notification',
            message: alert.message || '',
            createdAt,
            relativeTime: formatRelativeTime(createdAt),
          };
          return [normalized, ...prev].slice(0, 50);
        });
      },
      dismissAlert: (id) => setAlerts((prev) => prev.filter((a) => a.id !== id)),
      clearAlerts: () => setAlerts([]),
    };
  }, [alerts]);

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAlerts() {
  /** Hook to access AlertsContext. */
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return ctx;
}
