import { apiFetch } from './apiClient';

jest.mock('../config/env', () => ({
  getBackendUrl: () => 'http://localhost:3001',
}));

const getSessionMock = jest.fn();

jest.mock('../config/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: (...args) => getSessionMock(...args),
    },
  }),
}));

describe('apiClient', () => {
  beforeEach(() => {
    getSessionMock.mockReset();

    global.fetch = jest.fn(async (_url, options) => {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
        // provide minimal shape used by client
      };
    });
  });

  test('attaches Authorization header for /api/* when session exists', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token123' } },
      error: null,
    });

    await apiFetch('/api/fx/latest', { method: 'GET' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [_url, options] = global.fetch.mock.calls[0];

    // fetch options uses Headers(), which is not always serializable; use get().
    expect(options.headers.get('Authorization')).toBe('Bearer token123');
  });

  test('omits Authorization header for /api/* when no session exists', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await apiFetch('/api/fx/latest', { method: 'GET' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [_url, options] = global.fetch.mock.calls[0];
    expect(options.headers.get('Authorization')).toBeNull();
  });

  test('does not attach Authorization header for non-/api paths', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token123' } },
      error: null,
    });

    await apiFetch('/not-api', { method: 'GET' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [_url, options] = global.fetch.mock.calls[0];
    expect(options.headers.get('Authorization')).toBeNull();
  });
});
