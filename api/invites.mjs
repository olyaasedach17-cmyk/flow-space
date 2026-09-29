import { getAdminDb, requireFirebaseUser } from './_firebaseAdmin.mjs';

const ALLOWED_ROLES = new Set(['manager', 'member']);
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

function send(res, status, payload) {
  res.status(status).json(payload);
}

export function createInvitesHandler({ authenticate = requireFirebaseUser, database = getAdminDb } = {}) {
 return async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  try {
    const actor = await authenticate(req);
    const db = database();
    const action = req.body?.action;

    if (action === 'create') {
      const companyId = String(req.body?.companyId || '').trim();
      const email = normalizeEmail(req.body?.email);
      const position = String(req.body?.position || 'Сотрудник').trim().slice(0, 120);
      const role = ALLOWED_ROLES.has(req.body?.role) ? req.body.role : 'member';
      const departmentId = String(req.body?.departmentId || '').trim().slice(0, 120);

      if (!companyId || !email || !email.includes('@')) {
        return send(res, 400, { error: 'Укажите корректный email сотрудника.' });
      }

      const membershipSnap = await db.doc(`companies/${companyId}/members/${actor.uid}`).get();
      const membership = membershipSnap.data();
      if (!membership || !['owner', 'manager'].includes(membership.role)) {
        return send(res, 403, { error: 'Недостаточно прав для приглашения сотрудников.' });
      }
      if (membership.role === 'manager' && role === 'manager') {
        return send(res, 403, { error: 'Назначать руководителей может только собственник.' });
      }
      if (membership.role === 'manager' && !String(membership.departmentId || '').trim()) {
        return send(res, 403, { error: 'Сначала назначьте руководителю отдел.' });
      }
      if (membership.role === 'manager' && departmentId !== String(membership.departmentId || '')) {
        return send(res, 403, { error: 'Руководитель может приглашать сотрудников только в свой отдел.' });
      }
      if (role === 'manager' && !departmentId) {
        return send(res, 400, { error: 'Для руководителя нужно выбрать отдел.' });
      }

      const companySnap = await db.doc(`companies/${companyId}`).get();
      const departments = Array.isArray(companySnap.data()?.settings?.departments)
        ? companySnap.data().settings.departments
        : [];
      const department = departments.find(item => String(item?.id) === departmentId);
      if (departmentId && !department) return send(res, 400, { error: 'Выбранный отдел не найден.' });

      const inviteRef = db.doc(`companyInvites/${email}`);
      const existingInvite = await inviteRef.get();
      if (existingInvite.exists && existingInvite.data()?.status === 'pending' && existingInvite.data()?.companyId !== companyId) {
        return send(res, 409, { error: 'Для этого email уже есть приглашение в другую компанию.' });
      }
      await inviteRef.set({
        email,
        companyId,
        position,
        role,
        departmentId: department?.id || '',
        departmentName: department?.name || '',
        invitedBy: actor.uid,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return send(res, 200, { ok: true, email, role });
    }

    if (action === 'accept') {
      const email = normalizeEmail(actor.email);
      if (!email) return send(res, 400, { error: 'В аккаунте отсутствует email.' });

      const inviteRef = db.doc(`companyInvites/${email}`);
      const inviteSnap = await inviteRef.get();
      if (!inviteSnap.exists || inviteSnap.data()?.status !== 'pending') {
        return send(res, 404, { error: 'Приглашение не найдено.' });
      }

      const invite = inviteSnap.data();
      const companyRef = db.doc(`companies/${invite.companyId}`);
      const companySnap = await companyRef.get();
      if (!companySnap.exists) return send(res, 404, { error: 'Компания приглашения не найдена.' });

      const batch = db.batch();
      batch.set(db.doc(`companies/${invite.companyId}/members/${actor.uid}`), {
        uid: actor.uid,
        email,
        name: actor.name || email.split('@')[0],
        position: invite.position || 'Сотрудник',
        role: invite.role === 'manager' ? 'manager' : 'member',
        departmentId: invite.departmentId || '',
        departmentName: invite.departmentName || '',
        joinedAt: new Date().toISOString(),
        invitedBy: invite.invitedBy || null,
      }, { merge: true });
      batch.set(db.doc(`users/${actor.uid}`), {
        uid: actor.uid,
        email,
        activeCompanyId: invite.companyId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      batch.set(inviteRef, {
        status: 'accepted',
        acceptedBy: actor.uid,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      await batch.commit();

      return send(res, 200, { ok: true, companyId: invite.companyId, role: invite.role });
    }

    return send(res, 400, { error: 'Unknown invite action.' });
  } catch (error) {
    console.error('Invites API error:', error);
    return send(res, error.statusCode || 500, { error: error.message || 'Invite API error' });
  }
 };
}

export default createInvitesHandler();
