import { calculateCompanyMetrics } from './utils/analytics';
import { buildExecutiveInsights } from './utils/riskEngine';
import { filterTasksByRole, ROLES, WORKSPACES } from './utils/workspaceUtils';
import {
  acceptTaskResult,
  createNextRecurringTask,
  createNormalizedTask,
  getPersonalReminderState,
  inferTaskPriority,
  replaceTaskInCollections,
  returnTaskForRework,
  sortTasksByPriority,
  submitTaskResult,
} from './utils/taskUtils';

describe('Flow Space domain foundation', () => {
  test('natural speech detects urgent and important priorities', () => {
    expect(inferTaskPriority('Срочно подготовить важный отчёт до конца дня')).toEqual({ urgent: true, important: true });
    expect(inferTaskPriority('Когда будет время, проверить заметки')).toEqual({ urgent: false, important: false });
  });

  test('tasks are ordered by overdue, nearest deadline, then urgency and importance', () => {
    const ordered = sortTasksByPriority([
      { id: 'normal-undated' },
      { id: 'important-undated', important: true },
      { id: 'urgent-undated', urgent: true },
      { id: 'urgent-important-undated', urgent: true, important: true },
      { id: 'later-urgent', urgent: true, dueDate: '2026-09-21' },
      { id: 'nearest-normal', dueDate: '2026-09-20' },
      { id: 'overdue', dueDate: '2026-09-17' },
    ], '2026-09-18');
    expect(ordered.map((task) => task.id)).toEqual([
      'overdue',
      'nearest-normal',
      'later-urgent',
      'urgent-important-undated',
      'urgent-undated',
      'important-undated',
      'normal-undated',
    ]);
  });

  test('personal workspace trusts physical isolation and returns supplied personal tasks', () => {
    const tasks = [{ id: 'p1', text: 'Личная задача', assigneeId: 'someone-else', status: 'todo' }];
    expect(filterTasksByRole(tasks, ROLES.MEMBER, 'user-1', WORKSPACES.PERSONAL)).toEqual(tasks);
  });

  test('company member sees only tasks assigned to them', () => {
    const tasks = [{ id: '1', assigneeId: 'user-1' }, { id: '2', assigneeId: 'user-2' }];
    expect(filterTasksByRole(tasks, ROLES.MEMBER, 'user-1', WORKSPACES.COMPANY).map((task) => task.id)).toEqual(['1']);
  });

  test('manager sees only tasks from their department', () => {
    const tasks = [{ id: '1', departmentId: 'sales' }, { id: '2', departmentId: 'marketing' }];
    expect(filterTasksByRole(tasks, ROLES.MANAGER, 'manager-1', WORKSPACES.COMPANY, 'sales').map((task) => task.id)).toEqual(['1']);
  });

  test('editing an archived task updates the archive without restoring it', () => {
    const active = [{ id: 'active', status: 'todo' }];
    const archived = [{ id: 'done', status: 'done', departmentId: '' }];
    const result = replaceTaskInCollections(active, archived, { ...archived[0], departmentId: 'sales' });
    expect(result.tasks).toEqual(active);
    expect(result.archive[0]).toMatchObject({ id: 'done', status: 'done', departmentId: 'sales' });
  });

  test('risk engine detects overdue work and missing expected result', () => {
    const tasks = [{
      id: 'late', text: 'Просроченная задача', status: 'in_progress', dueDate: '2020-01-01',
      expectedResult: '', estimatedHours: 2, assigneeId: 'user-1',
    }];
    const result = buildExecutiveInsights(tasks, [], []);
    expect(result.items.map((item) => item.id)).toEqual(expect.arrayContaining(['overdue', 'missing-result']));
  });

  test('new task carries measurable result and acceptance criteria', () => {
    const task = createNormalizedTask({
      title: 'Подготовить лендинг',
      expectedResult: 'Опубликованный лендинг с работающей формой',
      successCriteria: 'Форма работает\nМобильная версия проверена',
      assigneeId: 'user-1', createdBy: 'owner-1',
    });
    expect(task.expectedResult).toBe('Опубликованный лендинг с работающей формой');
    expect(task.successCriteria).toEqual(['Форма работает', 'Мобильная версия проверена']);
  });

  test('task keeps its linked SOP for direct instructions and AI context', () => {
    const task = createNormalizedTask({ title: 'Обработать лид', sopId: 'sop-1', sopTitle: 'Первичная обработка лида', sopVersion: 2 });
    expect(task.sopId).toBe('sop-1');
    expect(task.sopTitle).toBe('Первичная обработка лида');
    expect(task.sopVersion).toBe(2);
  });

  test('result submission creates a review attempt and artifact', () => {
    const task = createNormalizedTask({ title: 'КП', assigneeId: 'user-1' });
    const submitted = submitTaskResult(task, { artifactUrl: 'https://example.com/result', actorId: 'user-1' });
    expect(submitted.status).toBe('review');
    expect(submitted.reviewAttempts).toBe(1);
    expect(submitted.resultArtifact.url).toBe('https://example.com/result');
    expect(submitted.reviewHistory.at(-1).type).toBe('submitted');
  });

  test('return and accept preserve review history and count rework', () => {
    const task = submitTaskResult(createNormalizedTask({ title: 'Макет', assigneeId: 'user-1' }), { artifactNote: 'Готовый макет', actorId: 'user-1' });
    const returned = returnTaskForRework(task, { reviewerId: 'owner', comment: 'Исправить CTA' });
    const resubmitted = submitTaskResult(returned, { artifactNote: 'CTA исправлен', actorId: 'user-1' });
    const accepted = acceptTaskResult(resubmitted, { reviewerId: 'owner', comment: 'Принято' });
    expect(accepted.status).toBe('done');
    expect(accepted.reopenedCount).toBe(1);
    expect(accepted.reviewAttempts).toBe(2);
    expect(accepted.reviewHistory.map((item) => item.type)).toEqual(['submitted', 'returned', 'submitted', 'accepted']);
  });

  test('quality KPI falls when accepted work required rework', () => {
    const clean = { id: '1', status: 'done', reviewAttempts: 1, reopenedCount: 0 };
    const reworked = { id: '2', status: 'done', reviewAttempts: 2, reopenedCount: 1 };
    const metrics = calculateCompanyMetrics([], [clean, reworked]);
    expect(metrics.qualityScore).toBe(50);
    expect(metrics.reworkRate).toBe(50);
  });

  test('KPI samples distinguish missing data from a real 100 percent result', () => {
    const metrics = calculateCompanyMetrics([{ id: '1', status: 'todo', dueDate: '2099-01-01' }], []);
    expect(metrics.kpis.find((item) => item.id === 'sla').sampleSize).toBe(0);
    expect(metrics.kpis.find((item) => item.id === 'quality').sampleSize).toBe(0);
    expect(metrics.managementReading.action).toContain('после приёмки');
  });

  test('accepted task without a deadline is excluded from SLA', () => {
    const metrics = calculateCompanyMetrics([], [{ id: 'done', status: 'done', completedAt: '2026-09-13T10:00:00Z', acceptedAt: '2026-09-13T10:00:00Z', reviewAttempts: 1 }]);
    expect(metrics.slaSampleSize).toBe(0);
    expect(metrics.kpis.find((item) => item.id === 'sla').sampleSize).toBe(0);
    expect(metrics.kpis.find((item) => item.id === 'quality').sampleSize).toBe(1);
  });

  test('management reading prioritizes overdue work over healthy workload', () => {
    const metrics = calculateCompanyMetrics([
      { id: 'late', status: 'in_progress', dueDate: '2020-01-01', estimatedHours: 3 },
      { id: 'future', status: 'todo', dueDate: '2099-01-01', estimatedHours: 2 },
    ], []);
    expect(metrics.overdueActiveCount).toBe(1);
    expect(metrics.managementReading.tone).toBe('danger');
    expect(metrics.managementReading.meaning).toContain('1 из 2');
  });
});

import { buildAIExecutionRecord } from './services/aiTeamService';

test('AI execution record keeps task linkage and specialist identity', () => {
  const record = buildAIExecutionRecord({
    agentId: 'copywriter',
    agentLabel: 'Копирайтер',
    output: 'Готовый текст',
    taskId: 'task_1',
    sopId: 'sop_1',
    userId: 'owner_1'
  });
  expect(record.agentId).toBe('copywriter');
  expect(record.taskId).toBe('task_1');
  expect(record.sopId).toBe('sop_1');
  expect(record.output).toContain('Готовый');
});

test('personal task keeps lightweight scheduling fields without a work result model', () => {
  const task = createNormalizedTask({
    title: 'Выпить витамины',
    dueDate: '2026-09-18',
    time: '09:00',
    recurrence: 'daily',
    reminder: '15m',
    category: 'personal',
    estimatedHours: 0,
  });
  expect(task).toMatchObject({
    text: 'Выпить витамины',
    time: '09:00',
    recurrence: 'daily',
    reminder: '15m',
    category: 'personal',
    expectedResult: '',
  });
});

test('legacy personal-space task defaults to private work category', () => {
  const task = createNormalizedTask({ title: 'Подготовить своё КП' });
  expect(task.category).toBe('work');
});

test('completed recurring personal task creates the next private occurrence', () => {
  const task = createNormalizedTask({
    title: 'Выпить витамины',
    dueDate: '2026-09-17',
    time: '09:00',
    recurrence: 'daily',
    reminder: '15m',
    category: 'personal',
  });
  const next = createNextRecurringTask({ ...task, status: 'done' }, new Date('2026-09-17T10:00:00'));
  expect(next).toMatchObject({
    text: 'Выпить витамины',
    dueDate: '2026-09-18',
    time: '09:00',
    recurrence: 'daily',
    reminder: '15m',
    category: 'personal',
    status: 'todo',
    completedAt: null,
  });
  expect(next.id).not.toBe(task.id);
});

test('recurrence never creates a company or private work task', () => {
  const workTask = createNormalizedTask({ title: 'Отчёт', dueDate: '2026-09-17', recurrence: 'daily', category: 'work' });
  expect(createNextRecurringTask(workTask, new Date('2026-09-17T10:00:00'))).toBeNull();
});

test('personal reminder becomes visible only inside its reminder window', () => {
  const task = createNormalizedTask({ title: 'Футбол сына', dueDate: '2026-09-17', time: '18:00', reminder: '1h', category: 'personal' });
  expect(getPersonalReminderState(task, new Date('2026-09-17T16:59:00'))).toBeNull();
  expect(getPersonalReminderState(task, new Date('2026-09-17T17:15:00'))?.label).toBe('Скоро');
});

test('decision engine separates team work from owner decisions', () => {
  const tasks = [
    { id: 'late-1', status: 'in_progress', dueDate: '2020-01-01', expectedResult: 'A', estimatedHours: 2, assigneeId: 'u1' },
    { id: 'late-2', status: 'in_progress', dueDate: '2020-01-01', expectedResult: 'B', estimatedHours: 2, assigneeId: 'u2' },
    { id: 'late-3', status: 'in_progress', dueDate: '2020-01-01', expectedResult: 'C', estimatedHours: 2, assigneeId: 'u3' },
    { id: 'review-1', status: 'review', dueDate: '2099-01-01', expectedResult: 'D', estimatedHours: 1, assigneeId: 'u1' },
    { id: 'review-2', status: 'review', dueDate: '2099-01-01', expectedResult: 'E', estimatedHours: 1, assigneeId: 'u1' },
  ];
  const result = buildExecutiveInsights(tasks, [], []);
  expect(result.ownerItems.map((item) => item.id)).toContain('overdue');
  expect(result.teamItems.map((item) => item.id)).toContain('review-bottleneck');
  expect(result.ownerDecisionCount).toBeGreaterThan(0);
});

test('single overdue task stays with team instead of escalating to owner', () => {
  const tasks = [{ id: 'late', status: 'in_progress', dueDate: '2020-01-01', expectedResult: 'Готовый отчёт', estimatedHours: 2, assigneeId: 'u1' }];
  const result = buildExecutiveInsights(tasks, [], []);
  expect(result.ownerItems).toHaveLength(0);
  expect(result.teamItems.map((item) => item.id)).toContain('overdue');
});

test('company policy changes owner escalation threshold', () => {
  const tasks = [
    { id: 'late-1', status: 'in_progress', dueDate: '2020-01-01', expectedResult: 'A', estimatedHours: 1, assigneeId: 'u1' },
    { id: 'late-2', status: 'in_progress', dueDate: '2020-01-01', expectedResult: 'B', estimatedHours: 1, assigneeId: 'u2' },
  ];
  const defaultResult = buildExecutiveInsights(tasks, [], []);
  const strictResult = buildExecutiveInsights(tasks, [], [], { overdueOwnerThreshold: 2 });
  expect(defaultResult.ownerItems.map((item) => item.id)).not.toContain('overdue');
  expect(strictResult.ownerItems.map((item) => item.id)).toContain('overdue');
});

test('flat solo company can route team-level signals directly to owner', () => {
  const tasks = [
    { id: 'review-1', status: 'review', dueDate: '2099-01-01', expectedResult: 'A', assigneeId: 'u1' },
    { id: 'review-2', status: 'review', dueDate: '2099-01-01', expectedResult: 'B', assigneeId: 'u1' },
  ];
  const result = buildExecutiveInsights(tasks, [], [], { teamRecipient: 'owner' });
  expect(result.ownerItems.map((item) => item.id)).toContain('review-bottleneck');
  expect(result.teamItems).toHaveLength(0);
});

import { PRODUCT_MODES, buildModeSettings, deriveProductMode } from './utils/productMode';

test('legacy team flag maps to Team Mode and solo stays the default', () => {
  expect(deriveProductMode({ isTeamMode: true })).toBe(PRODUCT_MODES.TEAM);
  expect(deriveProductMode({ isTeamMode: false })).toBe(PRODUCT_MODES.SOLO);
  expect(deriveProductMode({})).toBe(PRODUCT_MODES.SOLO);
});

test('switching to team keeps existing settings and marks onboarding complete', () => {
  const settings = buildModeSettings(PRODUCT_MODES.TEAM, { telegramChatId: '123' }, '👥 2-5 человек');
  expect(settings.productMode).toBe(PRODUCT_MODES.TEAM);
  expect(settings.isTeamMode).toBe(true);
  expect(settings.teamSize).toBe('👥 2-5 человек');
  expect(settings.telegramChatId).toBe('123');
  expect(settings.onboardingCompleted).toBe(true);
});

test('switching back to solo does not inherit team size', () => {
  const settings = buildModeSettings(PRODUCT_MODES.SOLO, { teamSize: '🏢 Больше 5 человек' });
  expect(settings.productMode).toBe(PRODUCT_MODES.SOLO);
  expect(settings.isTeamMode).toBe(false);
  expect(settings.teamSize).toBe('👤 Я один');
});
