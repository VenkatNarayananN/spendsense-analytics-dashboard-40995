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
