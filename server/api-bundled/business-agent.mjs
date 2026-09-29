import { getAdminDb, requireFirebaseUser } from '../../api/_firebaseAdmin.mjs';
import { requestAI } from '../../api/_aiProvider.mjs';
import { assertCompanyAccessStillValid, COMPANY_ROLES, fail, requireCompanyAccess } from '../../api/_companyAccess.mjs';
import { createBusinessAgentOrchestrator } from '../../api/_businessAgentOrchestrator.mjs';
import { createAIAuditService } from '../../api/_aiAuditService.mjs';

export function createBusinessAgentHandler({ authenticate = requireFirebaseUser, database = getAdminDb, provider = requestAI } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    let audit = null;
    let user = null;
    try {
      if (req.method !== 'POST') throw fail('Method not allowed', 405);
      const question = String(req.body?.question || '').trim();
      if (!question || question.length > 2000) throw fail('Введите короткий вопрос о компании.');
      user = await authenticate(req);
      const db = database();
      const access = await requireCompanyAccess({ db, companyId: req.body?.companyId, user, roles: [COMPANY_ROLES.OWNER, COMPANY_ROLES.MANAGER], requireDepartment: true });
      audit = createAIAuditService(db, access.companyId);
      const result = await createBusinessAgentOrchestrator({ db, access, provider }).run({ question, options: req.body?.options || {} });
      await assertCompanyAccessStillValid(access);
      await audit.record({ userId: user.uid, agent: 'business_agent', action: result.intent, input: { question, options: req.body?.options || {} }, resultSummary: result.answer, status: result.status });
      return res.status(200).json(result);
    } catch (error) {
      if (audit && user) await audit.record({ userId: user.uid, agent: 'business_agent', action: 'request_failed', input: { question: req.body?.question }, resultSummary: error.message, status: 'failed' }).catch(() => {});
      return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'AI Business Agent временно недоступен.' });
    }
  };
}

export default createBusinessAgentHandler();
