import { createAIAuditModel } from '../src/domain/businessAgent.js';

export function createAIAuditService(db, companyId) {
  const collection = db.collection(`companies/${companyId}/aiAudit`);
  return {
    async record(input, options = {}) {
      const ref = collection.doc();
      const event = createAIAuditModel({ ...input, companyId }, { ...options, id: ref.id });
      await ref.set(event);
      return event;
    },
    async list({ limit = 50 } = {}) {
      const snap = await collection.orderBy('createdAt', 'desc').limit(Math.min(Math.max(Number(limit) || 50, 1), 100)).get();
      return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
  };
}
