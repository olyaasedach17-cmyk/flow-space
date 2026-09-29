export const APPROVAL_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EDITED: 'edited',
  EXECUTED: 'executed',
});

export const APPROVAL_ACTIONS = Object.freeze({
  APPROVE: 'approve',
  EDIT: 'edit',
  REGENERATE: 'regenerate',
  REJECT: 'reject',
  SKIP: 'skip',
});

export const APPROVAL_TYPES = Object.freeze({
  TASK_ACTION: 'task_action',
  CONTENT: 'content',
  RECOMMENDATION: 'recommendation',
});

const STATUS_TRANSITIONS = Object.freeze({
  pending: new Set(['approved', 'edited', 'rejected']),
  edited: new Set(['approved', 'edited', 'rejected']),
  approved: new Set(['executed']),
  rejected: new Set(),
  executed: new Set(),
});

const boundedText = (value, max) => String(value ?? '').trim().slice(0, max);
const plainObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function canTransitionApproval(from, to) {
  return Boolean(STATUS_TRANSITIONS[from]?.has(to));
}

export function createApprovalModel(input, { id = '', now = new Date().toISOString() } = {}) {
  const companyId = boundedText(input?.companyId || input?.organizationId, 128);
  const type = boundedText(input?.type, 80);
  const title = boundedText(input?.title, 240);
  const createdBy = boundedText(input?.createdBy, 128);
  if (!companyId || !type || !title || !createdBy) {
    throw new Error('Approval требует companyId, type, title и createdBy.');
  }
  return {
    id: boundedText(id || input?.id, 128),
    companyId,
    organizationId: companyId,
    type,
    title,
    content: boundedText(input?.content, 20000),
    createdBy,
    status: APPROVAL_STATUSES.PENDING,
    createdAt: now,
    updatedAt: now,
    metadata: plainObject(input?.metadata),
    proposedAction: plainObject(input?.proposedAction),
  };
}

export function applyApprovalTransition(approval, nextStatus, input = {}, now = new Date().toISOString()) {
  if (!canTransitionApproval(approval?.status, nextStatus)) {
    throw new Error(`Недопустимый переход approval: ${approval?.status || 'unknown'} -> ${nextStatus}.`);
  }
  const next = { ...approval, status: nextStatus, updatedAt: now };
  if (nextStatus === APPROVAL_STATUSES.EDITED) {
    const content = boundedText(input.content, 20000);
    if (!content) throw new Error('Отредактированный approval должен содержать итоговый текст.');
    next.content = content;
    next.editedBy = boundedText(input.userId, 128);
  }
  if (nextStatus === APPROVAL_STATUSES.APPROVED) next.approvedBy = boundedText(input.userId, 128);
  if (nextStatus === APPROVAL_STATUSES.REJECTED) next.rejectedBy = boundedText(input.userId, 128);
  if (nextStatus === APPROVAL_STATUSES.EXECUTED) next.executedBy = boundedText(input.userId, 128);
  return next;
}
