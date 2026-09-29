import { buildBriefingSnapshot, getAutomaticBriefingKind, getWeekWindow } from './briefingEngine';

test('weekly briefing reuses supplied KPI and risk results while counting weekly task events', () => {
  const now = new Date('2026-09-16T12:00:00+03:00');
  const tasks = [
    { id: 'active', text: 'Активная', status: 'in_progress', createdAt: '2026-09-15T08:00:00Z', dueDate: '2026-09-18', urgent: true, important: false, estimatedHours: 3, reviewHistory: [{ type: 'returned', at: '2026-09-16T08:00:00Z' }] },
    { id: 'deferred', text: 'Отложенная', status: 'deferred', createdAt: '2026-09-01T08:00:00Z', important: true, estimatedHours: 2 },
  ];
  const archive = [
    { id: 'done', text: 'Принятая', status: 'done', createdAt: '2026-09-14T08:00:00Z', completedAt: '2026-09-16T09:00:00Z', acceptedAt: '2026-09-16T09:00:00Z', reopenedCount: 0, aiAgentId: 'analyst', dueDate: '2026-09-16' },
  ];
  const insights = { healthyCount: 7, teamItems: [{ id: 'team' }], ownerItems: [{ id: 'owner' }], items: [{ id: 'risk', title: 'Риск', description: 'Факт' }] };
  const snapshot = buildBriefingSnapshot({ tasks, archive, metrics: { totalHoursEstimated: 5, kpis: [{ id: 'sla', name: 'SLA', score: 90, sampleSize: 4 }] }, insights, now });

  expect(snapshot.weekKey).toBe(getWeekWindow(now).key);
  expect(snapshot).toEqual(expect.objectContaining({ newCount: 2, acceptedCount: 1, acceptedFirstTryCount: 1, returnedCount: 1, deferredCount: 1, aiCompletedCount: 1, workloadHours: 5, onTrackCount: 7, teamHandlesCount: 1, ownerDecisionCount: 1 }));
  expect(snapshot.kpis).toEqual([{ id: 'sla', name: 'SLA', score: 90, sampleSize: 4, available: true }]);
  expect(snapshot.risks).toEqual([{ id: 'risk', title: 'Риск', description: 'Факт' }]);
});

test('automatic rhythm selects Monday plan, Friday review, and an imminent meeting first', () => {
  expect(getAutomaticBriefingKind(new Date('2026-09-14T10:00:00+03:00'))).toBe('plan');
  expect(getAutomaticBriefingKind(new Date('2026-09-18T10:00:00+03:00'))).toBe('review');
  expect(getAutomaticBriefingKind(new Date('2026-09-16T10:00:00+03:00'), true)).toBe('meeting');
});
