import { createBusinessMetric } from '../src/domain/businessMetrics.js';

export function createMetricRepository(db, companyId) {
  const collection = db.collection(`companies/${companyId}/metrics`);
  return {
    async create(input, options = {}) {
      const ref = collection.doc();
      const metric = createBusinessMetric({ ...input, companyId }, { ...options, id: ref.id });
      await ref.set(metric);
      return metric;
    },
    async list({ metricType, source, limit = 500 } = {}) {
      let query = collection.orderBy('createdAt', 'desc');
      if (metricType) query = query.where('metricType', '==', metricType);
      if (source) query = query.where('source', '==', source);
      const snap = await query.limit(Math.min(Math.max(Number(limit) || 500, 1), 1000)).get();
      return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
  };
}
