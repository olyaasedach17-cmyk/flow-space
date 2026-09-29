import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvitesHandler } from '../api/invites.mjs';

function fixture({ actor = { uid: 'manager-1', email: 'manager@example.com' }, membership = { role: 'manager', departmentId: 'sales' } } = {}) {
  const rows = new Map([
    ['companies/company-1/members/manager-1', membership],
    ['companies/company-1', { settings: { departments: [{ id: 'sales', name: 'Продажи' }, { id: 'marketing', name: 'Маркетинг' }] } }],
  ]);
  const writes = [];
  const doc = (path) => ({
    get: async () => ({ exists: rows.has(path), data: () => rows.get(path) }),
    set: async (data) => { rows.set(path, { ...(rows.get(path) || {}), ...data }); writes.push({ path, data }); },
  });
  const db = {
    doc,
    batch: () => {
      const pending = [];
      return { set: (ref, data) => pending.push({ ref, data }), commit: async () => Promise.all(pending.map(({ ref, data }) => ref.set(data))) };
    },
  };
  const handler = createInvitesHandler({ authenticate: async () => actor, database: () => db });
  const request = async (body) => {
    let result;
    const res = { status(code) { this.code = code; return this; }, json(data) { result = { code: this.code, data }; } };
    await handler({ method: 'POST', body }, res);
    return result;
  };
  return { rows, writes, request };
}

test('manager can invite a member only into own department', async () => {
  const f = fixture();
  assert.equal((await f.request({ action: 'create', companyId: 'company-1', email: 'worker@example.com', role: 'member', departmentId: 'sales' })).code, 200);
  assert.equal(f.rows.get('companyInvites/worker@example.com').departmentName, 'Продажи');
  assert.equal((await f.request({ action: 'create', companyId: 'company-1', email: 'other@example.com', role: 'member', departmentId: 'marketing' })).code, 403);
});

test('manager cannot invite another manager', async () => {
  const f = fixture();
  const result = await f.request({ action: 'create', companyId: 'company-1', email: 'lead@example.com', role: 'manager', departmentId: 'sales' });
  assert.equal(result.code, 403);
});

test('manager without a department cannot invite members', async () => {
  const f = fixture({ membership: { role: 'manager', departmentId: '' } });
  const result = await f.request({ action: 'create', companyId: 'company-1', email: 'worker@example.com', role: 'member', departmentId: '' });
  assert.equal(result.code, 403);
});

test('owner must assign a department when inviting a manager', async () => {
  const f = fixture({ actor: { uid: 'manager-1', email: 'owner@example.com' }, membership: { role: 'owner' } });
  const result = await f.request({ action: 'create', companyId: 'company-1', email: 'lead@example.com', role: 'manager', departmentId: '' });
  assert.equal(result.code, 400);
});

test('pending invite from another company cannot be overwritten', async () => {
  const f = fixture({ actor: { uid: 'manager-1', email: 'owner@example.com' }, membership: { role: 'owner' } });
  f.rows.set('companyInvites/worker@example.com', { status: 'pending', companyId: 'company-2', role: 'member' });
  const result = await f.request({ action: 'create', companyId: 'company-1', email: 'worker@example.com', role: 'member', departmentId: 'sales' });
  assert.equal(result.code, 409);
  assert.equal(f.rows.get('companyInvites/worker@example.com').companyId, 'company-2');
});

test('accepting a forged owner invite is downgraded to member', async () => {
  const f = fixture({ actor: { uid: 'new-user', email: 'new@example.com', name: 'Новый' }, membership: null });
  f.rows.set('companyInvites/new@example.com', { status: 'pending', companyId: 'company-1', role: 'owner', departmentId: 'sales' });
  const result = await f.request({ action: 'accept' });
  assert.equal(result.code, 200);
  assert.equal(f.rows.get('companies/company-1/members/new-user').role, 'member');
});
