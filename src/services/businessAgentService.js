import { auth } from '../firebase';

async function post(path, body) {
  const user = auth.currentUser;
  if (!user) throw new Error('Для AI Business необходимо войти в аккаунт.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос.');
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('AI не ответил вовремя. Попробуйте повторить запрос.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const loadDailyBrief = (companyId) => post('/api/business-overview', { companyId, action: 'daily_brief' }).then((data) => data.result);
export const loadTaskAnalysis = (companyId) => post('/api/business-overview', { companyId, action: 'task_analysis' }).then((data) => data.result);
export const listApprovals = (companyId, status) => post('/api/approvals', { companyId, action: 'list', status }).then((data) => data.approvals);
export const transitionApproval = (companyId, approvalId, status, content = '') => post('/api/approvals', { companyId, action: 'transition', approvalId, status, content }).then((data) => data.approval);
export const generateBusinessContent = (companyId, input) => post('/api/content-agent', { ...input, companyId, action: 'generate' });
export const loadBusinessMetrics = (companyId, period = 'today') => post('/api/business-metrics', { companyId, action: 'aggregate', period }).then((data) => data.result);
export const askBusinessAgent = (companyId, question, options = {}) => post('/api/business-agent', { companyId, question, options });
export const listAIAudit = (companyId, limit = 50) => post('/api/ai-audit', { companyId, action: 'list', limit }).then((data) => data.events);
