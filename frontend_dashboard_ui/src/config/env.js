/**
 * Small helper utilities around environment variables.
 * Create React App exposes variables prefixed with REACT_APP_.
 */

// PUBLIC_INTERFACE
export function getEnv(key, fallback = undefined) {
  /** Get an environment variable safely (returns fallback if undefined/empty). */
  const value = typeof process !== 'undefined' ? process.env[key] : undefined;
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? fallback : trimmed;
}

// PUBLIC_INTERFACE
export function getBackendUrl() {
  /** Preferred backend URL for future API calls; can be undefined in dev/preview. */
  return getEnv('REACT_APP_BACKEND_URL', getEnv('REACT_APP_API_BASE', undefined));
}
