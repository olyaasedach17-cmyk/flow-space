import { authFetch, getGoogleIntegrationStatus } from './integrationService';
import { auth } from '../firebase';

jest.mock('../firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('test-token') } },
}));

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  auth.currentUser.getIdToken.mockResolvedValue('test-token');
});

test('Google status request is authenticated and bypasses cache', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ connected: true, scopes: ['sheets'] }) });
  const result = await getGoogleIntegrationStatus('company-1');
  expect(result).toEqual({ connected: true, scopes: ['sheets'] });
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/google?action=status&companyId=company-1'), expect.objectContaining({
    method: 'GET',
    cache: 'no-store',
    headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
  }));
});

test('integration timeout is shown as a retryable error', async () => {
  const aborted = new Error('aborted');
  aborted.name = 'AbortError';
  global.fetch = jest.fn().mockRejectedValue(aborted);
  await expect(authFetch('/api/google')).rejects.toThrow('Сервер интеграций не ответил');
});

test('Google request refreshes the Firebase token once after 401', async () => {
  auth.currentUser.getIdToken.mockResolvedValueOnce('old-token').mockResolvedValueOnce('fresh-token');
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'expired' }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ connected: true, scopes: [] }) });
  await expect(getGoogleIntegrationStatus('company-1')).resolves.toEqual({ connected: true, scopes: [] });
  expect(auth.currentUser.getIdToken).toHaveBeenNthCalledWith(1, false);
  expect(auth.currentUser.getIdToken).toHaveBeenNthCalledWith(2, true);
  expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-token');
});
