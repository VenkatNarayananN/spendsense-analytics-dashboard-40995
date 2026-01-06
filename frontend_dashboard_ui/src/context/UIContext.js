import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * UIContext manages UI-only state: theme, and simple global filters like search query.
 * It also stores shared UI selections that will be used by upcoming features (e.g., currency).
 */

const UIContext = createContext(null);

const SUPPORTED_CURRENCIES = ['USD', 'INR', 'GBP', 'EUR'];

// PUBLIC_INTERFACE
export function UIProvider({ children }) {
  /** Provides UI state (theme, search query, currency selection) to the app. */
  const [theme, setTheme] = useState('light');
  const [searchQuery, setSearchQuery] = useState('');

  // Currency selector state (used later for KPI/chart conversions; no-op for now).
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const value = useMemo(() => {
    return {
      theme,
      setTheme,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),

      searchQuery,
      setSearchQuery,

      // Currency selection shared across UI.
      supportedCurrencies: SUPPORTED_CURRENCIES,
      currency,
      setCurrency: (next) => {
        // Guard against accidental invalid values from future callers.
        if (!SUPPORTED_CURRENCIES.includes(next)) return;
        setCurrency(next);
      },
    };
  }, [theme, searchQuery, currency]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// PUBLIC_INTERFACE
export function useUI() {
  /** Hook to access UIContext. */
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return ctx;
}
