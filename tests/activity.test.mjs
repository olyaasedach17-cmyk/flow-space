import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityHandler } from '../api/activity.mjs';

function fixture({ role = 'owner', departmentId = '' } = {}) {
  const rows = new Map(Object.entries({
    'companies/a/members/u': { role, name: 'Тест', departmentId },
    'companies/a/tasks/own': { text: 'Своя задача', assigneeId: role === 'member' ? 'u' : 'employee', departmentId, departmentName: 'Продажи' },
    'companies/a/tasks/other': { text: 'Чужая задача', assigneeId: 'other', departmentId: 'other' },
  }));
  let sequence = 0;
  const snapshot = (path) => ({ exists: rows.has(path), id: path.split('/').at(-1), data: () => structuredClone(rows.get(path)) });
  const ref = (path) => ({
    id: path.split('/').at(-1),
    get: async () => snapshot(path),
    set: async (value) => rows.set(path, structuredClone(value)),
  });
  const collection = (path, limit = Infinity) => ({
    doc: () => ref(`${path}/event${++sequence}`),
    orderBy: () => collection(path, limit),
    limit: (value) => collection(path, value),
    get: async () => ({
      docs: [...rows.keys()]
        .filter((key) => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1)
        .map(snapshot)
        .sort((a, b) => String(b.data().createdAt || '').localeCompare(String(a.data().createdAt || '')))
        .slice(0, limit),
    }),
  });
  const database = { doc: ref, collection };
  const handler = createActivityHandler({ authenticate: async () => ({ uid: 'u', email: 'u@example.com' }), database: () => database });
  const request = async (body) => {
    let result;
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { result = { code: this.code, data }; } };
    await handler({ method: 'POST', body: { companyId: 'a', ...body } }, res);
    return result;
  };
  return { rows, request };
}

test('owner records and reads a task event', async () => {
  const f = fixture();
  assert.equal((await f.request({ action: 'record', type: 'task_created', taskId: 'own' })).code, 200);
  const list = await f.request({ action: 'list' });
  assert.equal(list.code, 200);
  assert.equal(list.data.events[0].label, 'Создана задача');
});

test('manager cannot record activity for another department', async () => {
  const f = fixture({ role: 'manager', departmentId: 'sales' });
  assert.equal((await f.request({ action: 'record', type: 'task_updated', taskId: 'other' })).code, 403);
});

test('member can record submission only for own task', async () => {
  const f = fixture({ role: 'member', departmentId: 'sales' });
  assert.equal((await f.request({ action: 'record', type: 'result_submitted', taskId: 'own' })).code, 200);
  assert.equal((await f.request({ action: 'record', type: 'result_accepted', taskId: 'own' })).code, 403);
  assert.equal((await f.request({ action: 'record', type: 'result_submitted', taskId: 'other' })).code, 403);
});
