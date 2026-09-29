import { act, renderHook, waitFor } from '@testing-library/react';
import useWorkspaceData from './useWorkspaceData';
import { acceptPendingInvite } from '../services/inviteService';
import {
  ensureOwnedCompany,
  ensureUserProfile,
  getMembership,
  migrateLegacyOwnerData,
  subscribeCompany,
  subscribeCompanySops,
  subscribeCompanyTasks,
  subscribeMembers,
  subscribePersonalTasks,
  subscribeUserProfile,
} from '../services/workspaceRepository';

jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));
jest.mock('../services/inviteService', () => ({
  acceptPendingInvite: jest.fn(),
}));
jest.mock('../services/workspaceRepository', () => ({
  ensureOwnedCompany: jest.fn(),
  ensureUserProfile: jest.fn(),
  getMembership: jest.fn(),
  migrateLegacyOwnerData: jest.fn(),
  replaceCompanySops: jest.fn(),
  replaceCompanyTasks: jest.fn(),
  replacePersonalTasks: jest.fn(),
  subscribeCompany: jest.fn(),
  subscribeCompanySops: jest.fn(),
  subscribeCompanyTasks: jest.fn(),
  subscribeDepartmentTasks: jest.fn(),
  subscribeMembers: jest.fn(),
  subscribePersonalTasks: jest.fn(),
  subscribeUserProfile: jest.fn(),
  updateCompany: jest.fn(),
  updateCompanyMember: jest.fn(),
}));

const user = { uid: 'owner-1', email: 'owner@example.com' };
const defaults = { defaultKpis: [], defaultAutomations: [], onError: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  ensureUserProfile.mockResolvedValue({ activeCompanyId: user.uid });
  ensureOwnedCompany.mockResolvedValue(user.uid);
  getMembership.mockResolvedValue(null);
  migrateLegacyOwnerData.mockResolvedValue(undefined);
  acceptPendingInvite.mockReturnValue(new Promise(() => {}));
  [subscribeUserProfile, subscribeMembers, subscribeCompanySops].forEach((subscribe) => {
    subscribe.mockReturnValue(jest.fn());
  });
});

test('keeps the loading state until the first task snapshots arrive without waiting for invite check', async () => {
  const callbacks = {};
  subscribeCompany.mockImplementation((_id, callback) => { callbacks.company = callback; return jest.fn(); });
  subscribeCompanyTasks.mockImplementation((_id, _role, _uid, callback) => { callbacks.companyTasks = callback; return jest.fn(); });
  subscribePersonalTasks.mockImplementation((_uid, callback) => { callbacks.personalTasks = callback; return jest.fn(); });

  const { result } = renderHook(() => useWorkspaceData({ user, workspace: 'personal', ...defaults }));

  await waitFor(() => expect(subscribePersonalTasks).toHaveBeenCalled());
  expect(result.current.loading).toBe(true);

  act(() => callbacks.company({ id: user.uid, settings: {} }));
  act(() => callbacks.companyTasks([{ id: 'company-task', status: 'todo' }]));
  expect(result.current.loading).toBe(true);

  act(() => callbacks.personalTasks([{ id: 'personal-task', status: 'todo' }]));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.tasks.map((task) => task.id)).toEqual(['personal-task']);
});
