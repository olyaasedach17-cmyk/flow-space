import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireFirebaseUser } from '../_firebaseAdmin.js';

function getAllowedPromoCodes() {
  const raw = process.env.PROMO_CODES || '';
  if (!raw.trim()) return new Set();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.map(value => String(value).trim().toUpperCase()).filter(Boolean));
    if (parsed && typeof parsed === 'object') return new Set(Object.keys(parsed).map(value => value.trim().toUpperCase()));
  } catch {
    // Fallback to comma-separated values.
  }

  return new Set(raw.split(',').map(value => value.trim().toUpperCase()).filter(Boolean));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const decoded = await requireFirebaseUser(req);
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Promo code is required' });

    const allowed = getAllowedPromoCodes();
    if (!allowed.size) return res.status(503).json({ error: 'Promo codes are not configured on the server' });
    if (!allowed.has(code)) return res.status(400).json({ error: 'Промокод недействителен' });

    const db = getAdminDb();
    const userSnap = await db.collection('users').doc(decoded.uid).get();
    const profile = userSnap.exists ? userSnap.data() : null;
    if (!profile?.activeCompanyId || profile.role !== 'owner') {
      return res.status(403).json({ error: 'Only the company owner can activate a promo code' });
    }

    await db.collection('companies').doc(profile.activeCompanyId).set({
      appliedPromo: code,
      isPro: true,
      'settings.isTeamMode': true,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(200).json({ ok: true, code, isPro: true });
  } catch (error) {
    console.error('Promo redeem error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Promo activation failed' });
  }
}
