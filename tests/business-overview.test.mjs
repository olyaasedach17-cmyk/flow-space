import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCompanyTasks } from '../src/domain/taskAnalysis.js';
import { buildDailyBrief } from '../src/domain/dailyBrief.js';

test('task analysis finds overdue, missing owner/deadline and builds priorities', () => {
  const now = new Date('2026-09-16T12:00:00Z');
  const result = analyzeCompanyTasks([
    { id: 'late', text: 'Просрочено', status: 'todo', dueDate: '2026-09-15', assigneeId: 'u', assigneeName: 'Анна' },
    { id: 'today', text: 'Сегодня', status: 'todo', dueDate: '2026-09-16', urgent: true },
    { id: 'open', text: 'Без срока', status: 'todo', assigneeId: 'u' },
    { id: 'done', text: 'Готово', status: 'done', dueDate: '2026-09-10' },
  ], { now });
  assert.equal(result.counts.overdue, 1);
  assert.equal(result.counts.dueToday, 1);
  assert.equal(result.counts.withoutAssignee, 1);
  assert.equal(result.counts.withoutDeadline, 1);
  assert.equal(result.priorities[0].id, 'late');
  assert.equal(result.overdueByAssignee[0].assigneeName, 'Анна');
});

test('daily brief reuses operational metrics and marks external data unavailable', () => {
  const result = buildDailyBrief({
    company: { id: 'acme', kpis: [{ name: 'Выручка', value: 10 }] },
    tasks: [{ id: 't', text: 'Задача', status: 'todo', dueDate: '2026-09-16', urgent: true, assigneeId: 'u' }],
    now: new Date('2026-09-16T12:00:00Z'),
  });
  assert.equal(result.companyId, 'acme');
  assert.equal(result.today.tasks.length, 1);
  assert.equal(result.business.sales.available, false);
  assert.equal(result.kpis.configured[0].name, 'Выручка');
  assert.equal(result.kpis.latestChanges.length, 2);
  assert.equal(result.kpis.latestChanges[0].period, 'last_7_days');
});
