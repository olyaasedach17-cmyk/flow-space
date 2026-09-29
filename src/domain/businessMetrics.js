export const METRIC_PERIODS = Object.freeze(['today', 'yesterday', 'last_7_days', 'current_month']);
export const METRIC_TYPES = Object.freeze([
  'revenue', 'sales', 'leads', 'ad_spend', 'cpa', 'roi', 'conversion_rate',
]);

const bounded = (value, max) => String(value ?? '').trim().slice(0, max);
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function createBusinessMetric(input, { id = '', now = new Date().toISOString() } = {}) {
  const companyId = bounded(input?.companyId || input?.organizationId, 128);
  const metricType = bounded(input?.metricType, 80);
  const source = bounded(input?.source, 80);
  const value = Number(input?.value);
  if (!companyId || !metricType || !source || !Number.isFinite(value)) {
    throw new Error('Metric требует companyId, source, metricType и числовое value.');
  }
  return {
    id: bounded(id || input?.id, 128),
    companyId,
    organizationId: companyId,
    source,
    metricType,
    value,
    currency: bounded(input?.currency, 12),
    period: bounded(input?.period, 40),
    periodStart: bounded(input?.periodStart, 40),
    periodEnd: bounded(input?.periodEnd, 40),
    createdAt: now,
    metadata: object(input?.metadata),
  };
}
