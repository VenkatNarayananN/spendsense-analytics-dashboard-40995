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

function normalizeBaseUrl(maybeUrl) {
  if (!maybeUrl) return undefined;
  const s = String(maybeUrl).trim();
  if (!s) return undefined;
  // Remove trailing slash for consistent joining later.
  return s.replace(/\/+$/, '');
}

function getDefaultSameOriginBase() {
  // Sensible default when REACT_APP_API_BASE is absent:
  // - Use same origin so relative deployment works (and avoids hardcoding localhost).
  // - Note: This does NOT append /api; callers pass "/api/..." paths.
  if (typeof window === 'undefined') return undefined;
  return window.location.origin;
}

// PUBLIC_INTERFACE
export function getApiBaseUrl() {
  /**
   * Canonical base URL for backend API calls.
   *
   * Priority:
   *  1) REACT_APP_API_BASE (preferred)
   *  2) REACT_APP_BACKEND_URL (legacy/back-compat)
   *  3) window.location.origin (sensible default for same-origin deployments)
   *
   * Examples:
   *  - https://api.example.com
   *  - https://example.com (when backend is reverse-proxied under same origin)
   */
  return normalizeBaseUrl(
    getEnv('REACT_APP_API_BASE', getEnv('REACT_APP_BACKEND_URL', getDefaultSameOriginBase()))
  );
}

// PUBLIC_INTERFACE
export function getBackendUrl() {
  /**
   * Backwards-compatible alias used by existing code.
   * Prefer using getApiBaseUrl() for new code.
   */
  return getApiBaseUrl();
}
