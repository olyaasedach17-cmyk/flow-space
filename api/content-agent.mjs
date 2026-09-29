import { getAdminDb, requireFirebaseUser } from './_firebaseAdmin.mjs';
import { requestAI } from './_aiProvider.mjs';
import { COMPANY_ROLE_VALUES, fail, requireCompanyAccess } from './_companyAccess.mjs';
import { createContentAgentService } from './_contentAgentService.mjs';
import { createAIAuditService } from './_aiAuditService.mjs';

export function createContentAgentHandler({ authenticate = requireFirebaseUser, database = getAdminDb, provider = requestAI } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== 'POST') throw fail('Method not allowed', 405);
      if (req.body?.action !== 'generate') throw fail('Неизвестное действие.');
      if (!String(req.body?.topic || '').trim()) throw fail('Укажите тему публикации.');
      const user = await authenticate(req);
      const db = database();
      const access = await requireCompanyAccess({ db, companyId: req.body?.companyId, user, roles: COMPANY_ROLE_VALUES });
      const result = await createContentAgentService({ db, access, provider }).generate(req.body);
      await createAIAuditService(db, access.companyId).record({
        userId: user.uid,
        agent: 'content_agent',
        action: 'generate_content',
        input: { platform: req.body.platform, goal: req.body.goal, topic: req.body.topic },
        resultSummary: result.packageData.title,
        status: 'approval_pending',
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Не удалось создать публикацию.' });
    }
  };
}

export default createContentAgentHandler();
