import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * UIContext manages UI-only state: theme, and simple global filters like search query.
 */

const UIContext = createContext(null);

// PUBLIC_INTERFACE
export function UIProvider({ children }) {
  /** Provides UI state (theme, search query) to the app. */
  const [theme, setTheme] = useState('light');
  const [searchQuery, setSearchQuery] = useState('');

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
    };
  }, [theme, searchQuery]);

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
