import { getAdminDb, requireFirebaseUser } from './_firebaseAdmin.mjs';
import { APPROVAL_STATUSES } from '../src/domain/approval.js';
import { COMPANY_ROLES, fail, isSafeSegment, requireCompanyAccess } from './_companyAccess.mjs';
import { createApprovalRepository } from './_approvalRepository.mjs';
import { createAIAuditService } from './_aiAuditService.mjs';

const publicTransitions = new Set([APPROVAL_STATUSES.APPROVED, APPROVAL_STATUSES.EDITED, APPROVAL_STATUSES.REJECTED]);
const inScope = (approval, access) => access.membership.role === COMPANY_ROLES.OWNER || approval.metadata?.departmentId === access.membership.departmentId;

export function createApprovalsHandler({ authenticate = requireFirebaseUser, database = getAdminDb } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== 'POST') throw fail('Method not allowed', 405);
      const user = await authenticate(req);
      const db = database();
      const access = await requireCompanyAccess({
        db,
        companyId: req.body?.companyId,
        user,
        roles: [COMPANY_ROLES.OWNER, COMPANY_ROLES.MANAGER],
        requireDepartment: true,
      });
      const repository = createApprovalRepository(db, access.companyId);
      if (req.body?.action === 'list') {
        let approvals = await repository.list({ status: req.body?.status, limit: req.body?.limit });
        approvals = approvals.filter((approval) => inScope(approval, access));
        return res.status(200).json({ approvals });
      }
      if (req.body?.action === 'transition') {
        if (!isSafeSegment(req.body?.approvalId)) throw fail('Некорректный approval.');
        if (!publicTransitions.has(req.body?.status)) throw fail('Недопустимый статус.');
        const current = await repository.get(req.body.approvalId);
        if (!current) throw fail('Approval не найден.', 404);
        if (!inScope(current, access)) throw fail('Нет доступа к approval.', 403);
        const approval = await repository.transition(req.body.approvalId, req.body.status, { content: req.body?.content, userId: user.uid });
        await createAIAuditService(db, access.companyId).record({
          userId: user.uid,
          agent: 'approval_center',
          action: `approval_${req.body.status}`,
          input: { approvalId: approval.id, type: approval.type },
          resultSummary: approval.title,
          status: 'completed',
        });
        return res.status(200).json({ approval });
      }
      throw fail('Неизвестное действие.');
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Не удалось обработать подтверждение.' });
    }
  };
}

export default createApprovalsHandler();
