import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./config/supabaseClient', () => {
  return {
    // Always disable Supabase in tests to avoid realtime setup/network behavior.
    getSupabase: () => null,
  };
});

test('renders SpendSense shell', () => {
  render(<App />);
  // SpendSense appears in the navigation/branding; keep assertion broad to avoid churn.
  expect(screen.getAllByText(/SpendSense/i).length).toBeGreaterThan(0);
});

test('renders Dashboard currency selector', () => {
  render(<App />);
  // Default route is "/", which mounts the Dashboard.
  // Ensure the new selector is present for subsequent features that rely on currency state.
  expect(screen.getByLabelText(/Select currency for dashboard/i)).toBeInTheDocument();
});

test('empty/loading state components are available', () => {
  // We don’t route-navigate here; this just ensures the module graph stays healthy.
  // If these imports break, the app would fail to compile and this test will fail too.
  // eslint-disable-next-line global-require
  const LoadingState = require('./components/LoadingState').default;
  // eslint-disable-next-line global-require
  const EmptyState = require('./components/EmptyState').default;

  expect(typeof LoadingState).toBe('function');
  expect(typeof EmptyState).toBe('function');
});
