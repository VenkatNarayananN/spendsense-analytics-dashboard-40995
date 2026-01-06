import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

import { UIProvider } from './context/UIContext';
import { AlertsProvider } from './context/AlertsContext';
import { AuthProvider } from './context/AuthContext';

import ProtectedRoute from './routes/ProtectedRoute';

import AppShell from './layout/AppShell';

import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Insights from './pages/Insights';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';

// PUBLIC_INTERFACE
function App() {
  /** Root application entrypoint: provides contexts + router + main layout shell. */
  return (
    <AuthProvider>
      <UIProvider>
        <AlertsProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                {/* Protected routes */}
                <Route
                  path="/"
                  element={(
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  )}
                />

                <Route
                  path="/dashboard"
                  element={(
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  )}
                />

                <Route
                  path="/transactions"
                  element={(
                    <ProtectedRoute>
                      <Transactions />
                    </ProtectedRoute>
                  )}
                />

                <Route
                  path="/insights"
                  element={(
                    <ProtectedRoute>
                      <Insights />
                    </ProtectedRoute>
                  )}
                />

                <Route
                  path="/alerts"
                  element={(
                    <ProtectedRoute>
                      <Alerts />
                    </ProtectedRoute>
                  )}
                />

                <Route
                  path="/settings"
                  element={(
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  )}
                />

                {/* Auth callback (must remain public to complete OAuth redirect) */}
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Back-compat */}
                <Route path="/home" element={<Navigate to="/" replace />} />

                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AlertsProvider>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;
