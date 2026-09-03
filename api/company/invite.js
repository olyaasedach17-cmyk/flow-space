import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, normalizeEmail, requireFirebaseUser } from '../_firebaseAdmin.js';

const ALLOWED_ROLES = new Set(['manager', 'member']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const decoded = await requireFirebaseUser(req);
    const db = getAdminDb();
    const { companyId, email: rawEmail, role: rawRole, position } = req.body || {};
    const email = normalizeEmail(rawEmail);
    const role = rawRole === 'manager' ? 'manager' : 'member';

    if (!companyId || !email) return res.status(400).json({ error: 'companyId and email are required' });
    if (!ALLOWED_ROLES.has(role)) return res.status(400).json({ error: 'Invalid role' });

    const callerSnap = await db.collection('users').doc(decoded.uid).get();
    const caller = callerSnap.exists ? callerSnap.data() : null;
    if (!caller || caller.activeCompanyId !== companyId || !['owner', 'manager'].includes(caller.role)) {
      return res.status(403).json({ error: 'Only an owner or manager can invite team members' });
    }

    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) return res.status(404).json({ error: 'Company not found' });

    const assistants = Array.isArray(companySnap.data().assistants) ? companySnap.data().assistants : [];
    const existingIndex = assistants.findIndex(item => normalizeEmail(item.email) === email);
    const assistant = {
      id: existingIndex >= 0 ? assistants[existingIndex].id : `invite_${Date.now()}`,
      name: email.split('@')[0],
      email,
      role,
      position: String(position || 'Сотрудник').trim().slice(0, 80),
      invitedBy: decoded.uid,
      invitedAt: new Date().toISOString()
    };

    const nextAssistants = [...assistants];
    if (existingIndex >= 0) nextAssistants[existingIndex] = { ...nextAssistants[existingIndex], ...assistant };
    else nextAssistants.push(assistant);

    const batch = db.batch();
    batch.set(companyRef, { assistants: nextAssistants, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.collection('user_mappings').doc(email), {
      companyId,
      role,
      assistantId: assistant.id,
      position: assistant.position,
      invitedBy: decoded.uid,
      invitedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await batch.commit();

    return res.status(200).json({ ok: true, assistant });
  } catch (error) {
    console.error('Invite error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Invite failed' });
  }
}
