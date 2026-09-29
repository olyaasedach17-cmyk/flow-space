import { METRIC_PERIODS } from '../src/domain/businessMetrics.js';
import { createCompanyDataRepository } from './_companyDataRepository.mjs';
import { createMetricRepository } from './_metricRepository.mjs';
import { flowSpaceMetricProvider } from './_metricProviders.mjs';

export function metricPeriodWindow(period, now = new Date()) {
  if (!METRIC_PERIODS.includes(period)) throw Object.assign(new Error('Неизвестный период метрик.'), { statusCode: 400 });
  const end = new Date(now);
  const start = new Date(now);
  if (period === 'today') start.setHours(0, 0, 0, 0);
  if (period === 'yesterday') { start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0); }
  if (period === 'last_7_days') { start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0); }
  if (period === 'current_month') { start.setDate(1); start.setHours(0, 0, 0, 0); }
  return { start, end };
}

const isRate = (type) => ['cpa', 'roi', 'conversion_rate', 'sla', 'quality'].includes(type);

const previousWindow = ({ start, end }) => {
  const duration = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - duration), end: new Date(end.getTime() - duration) };
};

const aggregateRows = async ({ tasks, stored, start, end, now }) => {
  const live = await flowSpaceMetricProvider.collect({ tasks, start, end, now });
  const storedInWindow = stored.filter((item) => { const at = new Date(item.createdAt); return at >= start && at < end; });
  const groups = new Map();
  [...storedInWindow, ...live].forEach((item) => {
    const key = `${item.source}:${item.metricType}:${item.currency || ''}`;
    const row = groups.get(key) || { source: item.source, metricType: item.metricType, currency: item.currency || '', values: [], metadata: item.metadata || {} };
    const value = item.value === null || item.value === undefined ? NaN : Number(item.value);
    if (Number.isFinite(value)) row.values.push(value);
    row.metadata = item.metadata || row.metadata;
    groups.set(key, row);
  });
  return [...groups.values()].map((row) => ({
    source: row.source,
    metricType: row.metricType,
    currency: row.currency,
    value: row.values.length === 0 ? null : isRate(row.metricType) ? Number((row.values.reduce((a, b) => a + b, 0) / row.values.length).toFixed(2)) : row.values.reduce((a, b) => a + b, 0),
    sampleSize: row.values.length,
    metadata: row.metadata,
  }));
};

export function createMetricAggregationService({ db, access }) {
  const loadInputs = async () => {
    const data = createCompanyDataRepository(access.companyRef);
    const [tasks, stored] = await Promise.all([
      data.listTasks(),
      createMetricRepository(db, access.companyId).list({ limit: 1000 }),
    ]);
    return {
      tasks: access.membership.role === 'manager' ? tasks.filter((task) => task.departmentId === access.membership.departmentId) : tasks,
      stored,
    };
  };
  return {
    async aggregate(period, { now = new Date() } = {}) {
      const { start, end } = metricPeriodWindow(period, now);
      const { tasks, stored } = await loadInputs();
      const metrics = await aggregateRows({ tasks, stored, start, end, now });
      return { period, start: start.toISOString(), end: end.toISOString(), metrics, unavailableSources: ['sales', 'leads', 'advertising'] };
    },
    async compare(period, { now = new Date() } = {}) {
      const currentWindow = metricPeriodWindow(period, now);
      const priorWindow = previousWindow(currentWindow);
      const { tasks, stored } = await loadInputs();
      const [currentMetrics, previousMetrics] = await Promise.all([
        aggregateRows({ tasks, stored, ...currentWindow, now }),
        aggregateRows({ tasks, stored, ...priorWindow, now }),
      ]);
      const previousMap = new Map(previousMetrics.map((item) => [`${item.source}:${item.metricType}:${item.currency}`, item]));
      const changes = currentMetrics.map((current) => {
        const previous = previousMap.get(`${current.source}:${current.metricType}:${current.currency}`);
        const comparable = Number.isFinite(current.value) && Number.isFinite(previous?.value);
        return { ...current, previousValue: previous?.value ?? null, delta: comparable ? Number((current.value - previous.value).toFixed(2)) : null };
      });
      return {
        period,
        current: { start: currentWindow.start.toISOString(), end: currentWindow.end.toISOString(), metrics: currentMetrics },
        previous: { start: priorWindow.start.toISOString(), end: priorWindow.end.toISOString(), metrics: previousMetrics },
        changes,
        unavailableSources: ['sales', 'leads', 'advertising'],
      };
    },
  };
}
