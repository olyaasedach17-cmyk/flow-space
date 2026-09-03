import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be valid JSON');
  }

  return initializeApp({
    credential: cert(serviceAccount)
  });
}

export async function requireFirebaseUser(req) {
  const authHeader = req.headers?.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  try {
    const app = getAdminApp();
    return await getAuth(app).verifyIdToken(match[1]);
  } catch (cause) {
    const error = new Error('Invalid or expired authentication token');
    error.statusCode = 401;
    error.cause = cause;
    throw error;
  }
}
