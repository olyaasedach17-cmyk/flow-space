import { getAdminDb, requireFirebaseUser } from './_firebaseAdmin.mjs';
import { COMPANY_ROLES, fail, requireCompanyAccess } from './_companyAccess.mjs';
import { createBusinessOverviewService } from './_businessOverviewService.mjs';
import { createAIAuditService } from './_aiAuditService.mjs';

export function createBusinessOverviewHandler({ authenticate = requireFirebaseUser, database = getAdminDb } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== 'POST') throw fail('Method not allowed', 405);
      const user = await authenticate(req);
      const db = database();
      const action = req.body?.action;
      const roles = action === 'daily_brief' ? [COMPANY_ROLES.OWNER] : [COMPANY_ROLES.OWNER, COMPANY_ROLES.MANAGER];
      const access = await requireCompanyAccess({ db, companyId: req.body?.companyId, user, roles, requireDepartment: true });
      const service = createBusinessOverviewService(access);
      let result;
      if (action === 'daily_brief') result = await service.dailyBrief();
      else if (action === 'task_analysis') result = await service.taskAnalysis();
      else throw fail('Неизвестное действие.');
      // Daily Brief загружается автоматически вместе с экраном и не должен засорять
      // пользовательский журнал. Явный анализ задач остаётся значимым событием.
      if (action === 'task_analysis') {
        await createAIAuditService(db, access.companyId).record({
          userId: user.uid,
          agent: 'business_overview',
          action,
          input: { scope: access.membership.role === 'manager' ? access.membership.departmentId : 'company' },
          resultSummary: `Проанализировано активных задач: ${result.counts.active}`,
          status: 'completed',
        });
      }
      return res.status(200).json({ result });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Не удалось подготовить обзор.' });
    }
  };
}

export default createBusinessOverviewHandler();
