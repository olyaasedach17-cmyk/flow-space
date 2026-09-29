import { calculateCompanyMetrics } from '../src/utils/analytics.js';

export function createMetricProvider({ id, collect }) {
  if (!id || typeof collect !== 'function') throw new Error('Metric provider требует id и collect().');
  return Object.freeze({ id, collect });
}

const happenedBetween = (value, start, end) => {
  const date = value ? new Date(value) : null;
  return Boolean(date && !Number.isNaN(date.getTime()) && date >= start && date < end);
};

export const flowSpaceMetricProvider = createMetricProvider({
  id: 'flow_space',
  async collect({ tasks, archive = [], start, end, now = new Date() }) {
    const all = [...tasks, ...archive];
    const metrics = calculateCompanyMetrics(tasks, archive);
    const completedRows = all.filter((task) => task.status === 'done' && happenedBetween(task.completedAt || task.acceptedAt, start, end));
    const completed = completedRows.length;
    const created = all.filter((task) => happenedBetween(task.createdAt, start, end)).length;
    const slaRows = completedRows.filter((task) => task.dueDate && task.completedAt);
    const onTime = slaRows.filter((task) => new Date(task.completedAt) <= new Date(`${String(task.dueDate).slice(0, 10)}T23:59:59`)).length;
    const reviewedRows = completedRows.filter((task) => (Number(task.reviewAttempts) || 0) > 0 || task.acceptedAt);
    const firstTry = reviewedRows.filter((task) => (Number(task.reopenedCount) || 0) === 0).length;
    const periodSla = slaRows.length ? Math.round((onTime / slaRows.length) * 100) : null;
    const periodQuality = reviewedRows.length ? Math.round((firstTry / reviewedRows.length) * 100) : null;
    return [
      { source: 'flow_space', metricType: 'tasks_created', value: created, periodStart: start.toISOString(), periodEnd: end.toISOString(), createdAt: now.toISOString() },
      { source: 'flow_space', metricType: 'tasks_completed', value: completed, periodStart: start.toISOString(), periodEnd: end.toISOString(), createdAt: now.toISOString() },
      { source: 'flow_space', metricType: 'tasks_overdue', value: metrics.overdueActiveCount, periodStart: start.toISOString(), periodEnd: end.toISOString(), createdAt: now.toISOString() },
      { source: 'flow_space', metricType: 'sla', value: periodSla, periodStart: start.toISOString(), periodEnd: end.toISOString(), createdAt: now.toISOString(), metadata: { unit: 'percent', sampleSize: slaRows.length, available: slaRows.length > 0 } },
      { source: 'flow_space', metricType: 'quality', value: periodQuality, periodStart: start.toISOString(), periodEnd: end.toISOString(), createdAt: now.toISOString(), metadata: { unit: 'percent', sampleSize: reviewedRows.length, available: reviewedRows.length > 0 } },
    ];
  },
});

export const metricProviderRegistry = new Map([[flowSpaceMetricProvider.id, flowSpaceMetricProvider]]);
