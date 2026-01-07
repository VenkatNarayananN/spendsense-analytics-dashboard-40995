import {
  fetchTransactions,
  createTransaction,
  fetchSummary,
  fetchAlerts,
  dismissAlert,
  updateProfile,
} from './spendsenseApi';

// PUBLIC_INTERFACE
export { fetchTransactions, createTransaction, fetchSummary, fetchAlerts, dismissAlert, updateProfile };

/**
 * Optionally provide a default export for ergonomic imports:
 *   import api from '../api';
 */
const api = {
  fetchTransactions,
  createTransaction,
  fetchSummary,
  fetchAlerts,
  dismissAlert,
  updateProfile,
};

export default api;
