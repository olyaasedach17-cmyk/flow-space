import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const rateBuckets = new Map();

export function enforceRateLimit({ key, limit = 120, windowMs = 5 * 60 * 1000 }) {
  const now = Date.now();
  const bucketKey = String(key || 'anonymous').slice(0, 240);
  const current = rateBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    const error = new Error('Слишком много запросов. Подождите немного и попробуйте снова.');
    error.statusCode = 429;
    error.retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw error;
  }
  current.count += 1;
}

export function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured on the server.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid JSON.');
  }

  return initializeApp({ credential: cert(serviceAccount) });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export async function requireFirebaseUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  let app;
  try { app = getAdminApp(); } catch {
    throw Object.assign(new Error('Сервер Firebase не настроен.'), {statusCode: 503});
  }
  try {
    const user = await getAuth(app).verifyIdToken(idToken);
    enforceRateLimit({ key: `api:${user.uid}`, limit: 240 });
    return user;
  } catch {
    const error = new Error('Invalid or expired authentication token.');
    error.statusCode = 401;
    throw error;
  }
}
