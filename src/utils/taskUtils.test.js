import {
  acceptTaskResult,
  createNextRecurringTask,
  createNormalizedTask,
  getLocalDateKey,
  isTaskForToday,
  normalizeTask,
  returnTaskForRework,
  sortTasksByPriority,
  submitTaskResult,
} from './taskUtils';

test('local date key does not switch Today by UTC near local midnight', () => {
  const date = new Date(2026, 8, 29, 1, 30);
  expect(getLocalDateKey(date)).toBe('2026-09-29');
});

test('recurring task keeps a source link so quick completion can be undone safely', () => {
  const source = normalizeTask({ id: 'repeat-1', text: 'Ежедневная задача', category: 'personal', recurrence: 'daily', dueDate: '2026-09-28' });
  const next = createNextRecurringTask(source, new Date('2026-09-28T10:00:00.000Z'));

  expect(next.recurrenceSourceId).toBe(source.id);
  expect(next.status).toBe('todo');
});

test('Today contains due and urgent work but leaves ordinary unscheduled tasks in Work', () => {
  expect(isTaskForToday({ status: 'todo', dueDate: '2026-09-28' }, '2026-09-28')).toBe(true);
  expect(isTaskForToday({ status: 'todo', urgent: true }, '2026-09-28')).toBe(true);
  expect(isTaskForToday({ status: 'todo' }, '2026-09-28')).toBe(false);
  expect(isTaskForToday({ status: 'done', urgent: true }, '2026-09-28')).toBe(false);
});

test('task journey keeps priority and review history from creation through acceptance', () => {
  const task = createNormalizedTask({
    title: 'Подготовить предложение',
    dueDate: '2026-09-28',
    urgent: true,
    important: true,
    expectedResult: 'Ссылка на готовый документ',
    projectName: 'Новый клиент',
  });
  expect(sortTasksByPriority([task, { id: 'later', dueDate: '2026-09-29' }], '2026-09-28')[0].id).toBe(task.id);
  expect(isTaskForToday(task, '2026-09-28')).toBe(true);

  const submitted = submitTaskResult(task, { artifactUrl: 'https://example.com/result', actorId: 'member-1', actorName: 'Анна' });
  expect(submitted.status).toBe('review');
  expect(submitted.reviewAttempts).toBe(1);

  const returned = returnTaskForRework(submitted, { reviewerId: 'owner-1', reviewerName: 'Ольга', comment: 'Добавить расчёты' });
  expect(returned.status).toBe('in_progress');
  expect(returned.reopenedCount).toBe(1);

  const resubmitted = submitTaskResult(returned, { artifactNote: 'Расчёты добавлены', actorId: 'member-1', actorName: 'Анна' });
  const accepted = acceptTaskResult(resubmitted, { reviewerId: 'owner-1', reviewerName: 'Ольга' });
  expect(accepted.status).toBe('done');
  expect(accepted.reviewAttempts).toBe(2);
  expect(accepted.reviewHistory.map((entry) => entry.type)).toEqual(['submitted', 'returned', 'submitted', 'accepted']);
  expect(isTaskForToday(accepted, '2026-09-28')).toBe(false);
});
