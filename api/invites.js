import crypto from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, requireFirebaseUser } from './_firebaseAdmin.js';

const ALLOWED_ROLES = new Set(['manager', 'member']);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function requireCompanyManager(db, companyId, uid) {
  const memberSnap = await db.doc(`companies/${companyId}/members/${uid}`).get();
  if (!memberSnap.exists || !['owner', 'manager'].includes(memberSnap.data().role)) {
    const error = new Error('Недостаточно прав для приглашения сотрудников');
    error.statusCode = 403;
    throw error;
  }
  return memberSnap.data();
}

async function createInvite(req, res, user) {
  const { companyId, email, role = 'member', position = 'Сотрудник' } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRole = ALLOWED_ROLES.has(role) ? role : 'member';

  if (!companyId || !normalizedEmail) {
    return res.status(400).json({ error: 'companyId и email обязательны' });
  }

  const db = getAdminDb();
  await requireCompanyManager(db, companyId, user.uid);

  const token = crypto.randomBytes(32).toString('hex');
  const inviteRef = db.collection('companyInvites').doc();
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await inviteRef.set({
    companyId,
    email: normalizedEmail,
    role: normalizedRole,
    position: String(position || 'Сотрудник').trim() || 'Сотрудник',
    invitedBy: user.uid,
    status: 'pending',
    tokenHash: hashToken(token),
    expiresAt,
    createdAt: FieldValue.serverTimestamp()
  });

  return res.status(201).json({
    inviteId: inviteRef.id,
    token,
    expiresAt: expiresAt.toDate().toISOString()
  });
}

async function acceptInvite(req, res, user) {
  const { inviteId, token } = req.body || {};
  if (!inviteId || !token) {
    return res.status(400).json({ error: 'inviteId и token обязательны' });
  }

  const db = getAdminDb();
  const inviteRef = db.doc(`companyInvites/${inviteId}`);

  await db.runTransaction(async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);
    if (!inviteSnap.exists) {
      const error = new Error('Приглашение не найдено');
      error.statusCode = 404;
      throw error;
    }

    const invite = inviteSnap.data();
    const userEmail = String(user.email || '').toLowerCase();

    if (invite.status !== 'pending') {
      const error = new Error('Приглашение уже использовано или отменено');
      error.statusCode = 409;
      throw error;
    }
    if (!invite.expiresAt || invite.expiresAt.toMillis() < Date.now()) {
      const error = new Error('Срок действия приглашения истёк');
      error.statusCode = 410;
      throw error;
    }
    if (invite.tokenHash !== hashToken(String(token))) {
      const error = new Error('Неверный токен приглашения');
      error.statusCode = 403;
      throw error;
    }
    if (!userEmail || userEmail !== invite.email) {
      const error = new Error('Приглашение выдано для другого email');
      error.statusCode = 403;
      throw error;
    }

    const memberRef = db.doc(`companies/${invite.companyId}/members/${user.uid}`);
    const userRef = db.doc(`users/${user.uid}`);

    transaction.set(memberRef, {
      uid: user.uid,
      email: userEmail,
      displayName: user.name || userEmail.split('@')[0],
      role: invite.role,
      position: invite.position || 'Сотрудник',
      joinedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.set(userRef, {
      email: userEmail,
      activeCompanyId: invite.companyId,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.update(inviteRef, {
      status: 'accepted',
      acceptedBy: user.uid,
      acceptedAt: FieldValue.serverTimestamp(),
      tokenHash: FieldValue.delete()
    });
  });

  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const user = await requireFirebaseUser(req);
    const action = req.body?.action;

    if (action === 'create') return await createInvite(req, res, user);
    if (action === 'accept') return await acceptInvite(req, res, user);

    return res.status(400).json({ error: 'Неизвестное действие приглашения' });
  } catch (error) {
    console.error('Invites API error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal Server Error'
    });
  }
}
