const SENSITIVE_KEY = /(secret|token|password|authorization|api[_-]?key|private[_-]?key|credential)/i;

const boundedText = (value, max = 2000) => String(value ?? '').slice(0, max);

export function sanitizeAuditValue(value, depth = 0) {
  if (depth > 4) return '[truncated]';
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return boundedText(value);
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeAuditValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [
      boundedText(key, 100),
      SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizeAuditValue(item, depth + 1),
    ]));
  }
  return boundedText(value);
}

export function createAIAuditModel(input, { id = '', now = new Date().toISOString() } = {}) {
  const companyId = boundedText(input?.companyId || input?.organizationId, 128).trim();
  const userId = boundedText(input?.userId, 128).trim();
  const action = boundedText(input?.action || input?.agent, 120).trim();
  if (!companyId || !userId || !action) throw new Error('AI audit требует companyId, userId и action.');
  return {
    id: boundedText(id || input?.id, 128),
    companyId,
    organizationId: companyId,
    userId,
    agent: boundedText(input?.agent || 'business_agent', 120),
    action,
    input: sanitizeAuditValue(input?.input ?? {}),
    resultSummary: boundedText(input?.resultSummary, 2000),
    status: boundedText(input?.status || 'completed', 40),
    createdAt: now,
  };
}
