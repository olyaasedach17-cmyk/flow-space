import { applyApprovalTransition, createApprovalModel } from '../src/domain/approval.js';

export function createApprovalRepository(db, companyId) {
  const collection = db.collection(`companies/${companyId}/approvals`);
  return {
    async create(input, options = {}) {
      const ref = collection.doc();
      const approval = createApprovalModel({ ...input, companyId }, { ...options, id: ref.id });
      await ref.set(approval);
      return approval;
    },
    async get(id) {
      const snap = await collection.doc(id).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    },
    async list({ status, limit = 50 } = {}) {
      let query = collection.orderBy('createdAt', 'desc');
      if (status) query = query.where('status', '==', status);
      const snap = await query.limit(Math.min(Math.max(Number(limit) || 50, 1), 100)).get();
      return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
    async transition(id, nextStatus, input = {}, options = {}) {
      const ref = collection.doc(id);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw Object.assign(new Error('Approval не найден.'), { statusCode: 404 });
        const next = applyApprovalTransition({ id: snap.id, ...snap.data() }, nextStatus, input, options.now);
        tx.set(ref, next);
        return next;
      });
    },
  };
}
