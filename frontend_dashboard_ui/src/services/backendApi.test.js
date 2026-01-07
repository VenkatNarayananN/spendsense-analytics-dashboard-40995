import {
  createTransaction,
  dismissAlert,
  getAnalyticsSummary,
  listAlerts,
  listTransactions,
} from './backendApi';

jest.mock('./apiClient', () => ({
  apiGetJson: jest.fn(),
  apiFetch: jest.fn(),
}));

const { apiGetJson, apiFetch } = require('./apiClient');

describe('backendApi service wrappers', () => {
  beforeEach(() => {
    apiGetJson.mockReset();
    apiFetch.mockReset();
  });

  test('listTransactions builds query string and normalizes response', async () => {
    apiGetJson.mockResolvedValue({
      ok: true,
      data: { success: true, data: { items: [{ id: '1' }], page: { limit: 50, offset: 0, total: 1 } } },
    });

    const res = await listTransactions({ from: '2025-01-01', to: '2025-01-31', category: 'Groceries', merchant: 'tar' });

    expect(apiGetJson).toHaveBeenCalledTimes(1);
    const [path] = apiGetJson.mock.calls[0];
    expect(path).toContain('/api/transactions?');
    expect(path).toContain('from=2025-01-01');
    expect(path).toContain('to=2025-01-31');
    expect(path).toContain('category=Groceries');
    expect(path).toContain('merchant=tar');

    expect(res.ok).toBe(true);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.page.total).toBe(1);
  });

  test('createTransaction posts to /api/transactions and normalizes response', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 201,
      data: { success: true, data: { transaction: { id: 't1' } } },
    });

    const payload = { amount: 10, currency: 'USD', category: 'Groceries', merchant: 'Target', occurred_at: '2025-01-01T00:00:00Z' };
    const res = await createTransaction(payload);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [path, options] = apiFetch.mock.calls[0];
    expect(path).toBe('/api/transactions');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual(payload);

    expect(res.ok).toBe(true);
    expect(res.data.transaction.id).toBe('t1');
  });

  test('getAnalyticsSummary uses /api/analytics/summary with range params', async () => {
    apiGetJson.mockResolvedValue({
      ok: true,
      data: { success: true, data: { summary: { total_spend: 1, average_daily_spend: 1, top_categories: [], recent_merchants: [], range: {} } } },
    });

    await getAnalyticsSummary({ from: '2025-01-01', to: '2025-01-31' });

    expect(apiGetJson).toHaveBeenCalledTimes(1);
    const [path] = apiGetJson.mock.calls[0];
    expect(path).toContain('/api/analytics/summary?');
    expect(path).toContain('from=2025-01-01');
    expect(path).toContain('to=2025-01-31');
  });

  test('listAlerts calls /api/alerts and normalizes items', async () => {
    apiGetJson.mockResolvedValue({
      ok: true,
      data: { success: true, data: { items: [{ id: 'a1' }] } },
    });

    const res = await listAlerts({ status: 'active' });

    expect(apiGetJson).toHaveBeenCalledTimes(1);
    const [path] = apiGetJson.mock.calls[0];
    expect(path).toContain('/api/alerts?');
    expect(path).toContain('status=active');

    expect(res.ok).toBe(true);
    expect(res.data.items[0].id).toBe('a1');
  });

  test('dismissAlert posts status change payload to /api/alerts', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 201,
      data: { success: true, data: { alert: { id: 'a1', status: 'dismissed' } } },
    });

    await dismissAlert({ id: 'a1', type: 'budget', message: 'hello' });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [path, options] = apiFetch.mock.calls[0];
    expect(path).toBe('/api/alerts');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.id).toBe('a1');
    expect(body.status).toBe('dismissed');
    expect(body.type).toBe('budget');
    expect(body.message).toBe('hello');
  });
});
