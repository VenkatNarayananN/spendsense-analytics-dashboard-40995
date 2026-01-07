import React from 'react';
import { act, render, screen } from '@testing-library/react';

import Dashboard from '../Dashboard';
import Transactions from '../Transactions';
import Alerts from '../Alerts';
import Insights from '../Insights';
import Settings from '../Settings';

jest.mock('../../config/supabaseClient', () => {
  return {
    // Always disable Supabase in tests to avoid realtime setup/network behavior.
    getSupabase: () => null,
  };
});

jest.mock('../../services/transactionsRealtime', () => {
  return {
    subscribeToNewTransactions: () => () => {},
  };
});

jest.mock('../../context/UIContext', () => {
  return {
    useUI: () => ({
      searchQuery: '',
      currency: 'USD',
      setCurrency: () => {},
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
      theme: 'light',
      toggleTheme: () => {},
    }),
  };
});

jest.mock('../../context/AlertsContext', () => {
  return {
    useAlerts: () => ({
      addAlert: () => {},
      clearAlerts: () => {},
    }),
  };
});

jest.mock('../../services/backendApi', () => {
  return {
    getAnalyticsSummary: jest.fn(),
    listTransactions: jest.fn(),
    createTransaction: jest.fn(),
    listAlerts: jest.fn(),
    dismissAlert: jest.fn(),
    getCurrentUserProfile: jest.fn(),
  };
});

const backendApi = require('../../services/backendApi');

describe('page loading/error states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Dashboard renders loading then error state', async () => {
    backendApi.getAnalyticsSummary.mockResolvedValue({ ok: false, error: 'Nope' });

    render(<Dashboard />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    // Wait for effects to settle; after the failed fetch it should show an error EmptyState.
    await act(async () => {});
    expect(screen.getByText(/Could not load dashboard/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  test('Transactions renders loading then error state', async () => {
    backendApi.listTransactions.mockResolvedValue({ ok: false, error: 'Nope' });

    render(<Transactions />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await act(async () => {});
    expect(screen.getByText(/Could not load transactions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  test('Alerts renders loading then error state', async () => {
    backendApi.listAlerts.mockResolvedValue({ ok: false, error: 'Nope' });

    render(<Alerts />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await act(async () => {});
    expect(screen.getByText(/Could not load alerts/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  test('Insights renders loading then error state', async () => {
    jest.useFakeTimers();

    // Force simulated failure deterministically for this test.
    const originalRandom = Math.random;
    Math.random = () => 0.01; // < 0.08 => fail

    render(<Insights />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    expect(screen.getByText(/Could not load insights/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();

    Math.random = originalRandom;
    jest.useRealTimers();
  });

  test('Settings renders loading then error state', async () => {
    backendApi.getCurrentUserProfile.mockResolvedValue({ ok: false, error: 'Nope' });

    render(<Settings />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await act(async () => {});
    expect(screen.getByText(/Could not load profile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
