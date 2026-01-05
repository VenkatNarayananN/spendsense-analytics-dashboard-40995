import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// PUBLIC_INTERFACE
export default function ProtectedRoute({ children }) {
  /**
   * Route guard placeholder.
   *
   * Behavior:
   * - If not authenticated, redirect to "/" (Dashboard).
   * - Preserves "from" in location state for future real auth flows.
   *
   * TODO: Replace redirect target and add a proper login page when real auth exists.
   */
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
