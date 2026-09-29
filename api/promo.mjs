import { getAdminDb, requireFirebaseUser } from './_firebaseAdmin.mjs';

function getPromoCodes() {
  const raw = process.env.FLOWSPACE_PROMO_CODES;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new Error('FLOWSPACE_PROMO_CODES must be valid JSON.');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireFirebaseUser(req);
    const companyId = String(req.body?.companyId || '').trim();
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!companyId || !code) return res.status(400).json({ error: 'Укажите промокод.' });

    const db = getAdminDb();
    const membershipSnap = await db.doc(`companies/${companyId}/members/${user.uid}`).get();
    if (!membershipSnap.exists || membershipSnap.data()?.role !== 'owner') {
      return res.status(403).json({ error: 'Промокод может активировать только собственник пространства.' });
    }

    const promo = getPromoCodes()[code];
    if (!promo) return res.status(400).json({ error: 'Промокод не найден или больше не действует.' });

    const plan = typeof promo === 'string' ? promo : (promo.plan || 'pro');
    const durationDays = typeof promo === 'object' ? Number(promo.durationDays || 0) : 0;
    const now = new Date();
    const expiresAt = durationDays > 0 ? new Date(now.getTime() + durationDays * 86400000).toISOString() : null;

    await db.doc(`companies/${companyId}`).set({
      subscription: {
        plan,
        status: 'active',
        source: 'promo',
        promoCode: code,
        activatedAt: now.toISOString(),
        ...(expiresAt ? { expiresAt } : {}),
      },
      updatedAt: now.toISOString(),
    }, { merge: true });

    return res.status(200).json({ ok: true, plan, expiresAt });
  } catch (error) {
    console.error('Promo API error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Promo API error' });
  }
}
