import { getAdminDb, requireFirebaseUser } from '../../api/_firebaseAdmin.mjs';
import { COMPANY_ROLES, fail, requireCompanyAccess } from '../../api/_companyAccess.mjs';
import { createAIAuditService } from '../../api/_aiAuditService.mjs';

export function createAIAuditHandler({ authenticate = requireFirebaseUser, database = getAdminDb } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== 'POST' || req.body?.action !== 'list') throw fail('Method not allowed', 405);
      const user = await authenticate(req);
      const db = database();
      const access = await requireCompanyAccess({ db, companyId: req.body?.companyId, user, roles: [COMPANY_ROLES.OWNER, COMPANY_ROLES.MANAGER], requireDepartment: true });
      let events = await createAIAuditService(db, access.companyId).list({ limit: req.body?.limit });
      if (access.membership.role === COMPANY_ROLES.MANAGER) events = events.filter((event) => event.userId === user.uid);
      return res.status(200).json({ events });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Не удалось загрузить AI-журнал.' });
    }
  };
}

export default createAIAuditHandler();
