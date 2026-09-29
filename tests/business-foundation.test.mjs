import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVAL_STATUSES, applyApprovalTransition, createApprovalModel } from '../src/domain/approval.js';
import { createBusinessMetric } from '../src/domain/businessMetrics.js';
import { createAIAuditModel, sanitizeAuditValue } from '../src/domain/businessAgent.js';
import { canAccessDepartment, requireCompanyAccess } from '../api/_companyAccess.mjs';

test('approval uses companyId as organization alias and enforces lifecycle', () => {
  const approval = createApprovalModel({ organizationId: 'acme', type: 'content', title: 'Пост', createdBy: 'u' }, { id: 'a1', now: '2026-01-01' });
  assert.equal(approval.companyId, 'acme');
  assert.equal(approval.organizationId, 'acme');
  assert.equal(approval.status, APPROVAL_STATUSES.PENDING);
  const edited = applyApprovalTransition(approval, APPROVAL_STATUSES.EDITED, { content: 'Итог', userId: 'u' }, '2026-01-02');
  assert.equal(edited.content, 'Итог');
  const approved = applyApprovalTransition(edited, APPROVAL_STATUSES.APPROVED, { userId: 'owner' }, '2026-01-03');
  assert.equal(approved.approvedBy, 'owner');
  assert.throws(() => applyApprovalTransition(approved, APPROVAL_STATUSES.REJECTED));
});

test('business metric validates numeric values without binding to a provider', () => {
  const metric = createBusinessMetric({ companyId: 'acme', source: 'flow_space', metricType: 'sales', value: '12', period: 'today' });
  assert.equal(metric.value, 12);
  assert.equal(metric.source, 'flow_space');
  assert.throws(() => createBusinessMetric({ companyId: 'acme', source: 'x', metricType: 'sales', value: 'unknown' }));
});

test('AI audit recursively redacts secrets and bounds payloads', () => {
  const safe = sanitizeAuditValue({ prompt: 'ok', apiKey: 'secret', nested: { authorization: 'Bearer x' } });
  assert.equal(safe.apiKey, '[redacted]');
  assert.equal(safe.nested.authorization, '[redacted]');
  const audit = createAIAuditModel({ organizationId: 'acme', userId: 'u', action: 'daily_brief', input: safe });
  assert.equal(audit.companyId, 'acme');
});

test('company permission service uses existing membership and department scope', async () => {
  const rows = new Map([
    ['companies/acme', { name: 'Acme' }],
    ['companies/acme/members/u', { role: 'manager', departmentId: 'sales' }],
  ]);
  const snapshot = (path) => ({ exists: rows.has(path), data: () => rows.get(path) });
  const ref = (path) => ({ get: async () => snapshot(path), collection: (name) => ({ doc: (id) => ref(`${path}/${name}/${id}`) }) });
  const access = await requireCompanyAccess({ db: { doc: ref }, companyId: 'acme', user: { uid: 'u' }, roles: ['owner', 'manager'], requireDepartment: true });
  assert.equal(access.membership.role, 'manager');
  assert.equal(canAccessDepartment(access, 'sales'), true);
  assert.equal(canAccessDepartment(access, 'marketing'), false);
  await assert.rejects(() => requireCompanyAccess({ db: { doc: ref }, companyId: '../other', user: { uid: 'u' } }), /Некорректное/);
});
