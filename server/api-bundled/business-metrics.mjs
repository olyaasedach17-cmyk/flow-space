import { getAdminDb, requireFirebaseUser } from '../../api/_firebaseAdmin.mjs';
import { COMPANY_ROLES, fail, requireCompanyAccess } from '../../api/_companyAccess.mjs';
import { createMetricAggregationService } from '../../api/_metricAggregationService.mjs';

export function createBusinessMetricsHandler({ authenticate = requireFirebaseUser, database = getAdminDb } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== 'POST') throw fail('Method not allowed', 405);
      if (!['aggregate', 'compare'].includes(req.body?.action)) throw fail('Неизвестное действие.');
      const user = await authenticate(req);
      const db = database();
      const access = await requireCompanyAccess({ db, companyId: req.body?.companyId, user, roles: [COMPANY_ROLES.OWNER, COMPANY_ROLES.MANAGER], requireDepartment: true });
      const service = createMetricAggregationService({ db, access });
      const result = req.body.action === 'compare'
        ? await service.compare(req.body?.period || 'last_7_days')
        : await service.aggregate(req.body?.period || 'today');
      return res.status(200).json({ result });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Не удалось получить метрики.' });
    }
  };
}

export default createBusinessMetricsHandler();
