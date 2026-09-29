import { config } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldPath } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '../api/_firebaseAdmin.mjs';

config({ path: new URL('../.env.local', import.meta.url).pathname, quiet: true });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || serviceAccount.project_id;
const apiKey = process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyCmbVwwSd5GjyhY1MkF_oSkB7SEaORgLyU';
if (!projectId || !apiKey) throw new Error('Firebase client config is missing.');

const suffix = randomBytes(6).toString('hex');
const companyId = `security_test_${suffix}`;
const ids = {
  owner: `security_owner_${suffix}`,
  manager: `security_manager_${suffix}`,
  member: `security_member_${suffix}`,
  outsider: `security_outsider_${suffix}`,
};
const auth = getAuth(getAdminApp());
const db = getAdminDb();
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function cleanupStaleSecurityTests() {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users.filter((user) => user.uid.startsWith('security_')).map((user) => user.uid));
    pageToken = page.pageToken;
  } while (pageToken);
  if (users.length) await auth.deleteUsers(users);

  const companies = await db.collection('companies')
    .where(FieldPath.documentId(), '>=', 'security_test_')
    .where(FieldPath.documentId(), '<', 'security_test_\uf8ff')
    .get();
  await Promise.all(companies.docs.map((doc) => db.recursiveDelete(doc.ref)));
}

async function idToken(uid) {
  const customToken = await auth.createCustomToken(uid);
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Could not exchange custom token.');
  return data.idToken;
}

const getDocument = (path, token) => fetch(`${base}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
const updateRole = (token) => fetch(`${base}/companies/${companyId}/members/${ids.member}?updateMask.fieldPaths=role`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { role: { stringValue: 'owner' } } }),
});

function expectStatus(label, actual, expected) {
  if (actual !== expected) throw new Error(`${label}: expected HTTP ${expected}, received ${actual}`);
  console.log(`✓ ${label}`);
}

try {
  await cleanupStaleSecurityTests();
  await Promise.all(Object.entries(ids).map(([role, uid]) => auth.createUser({ uid, email: `${role}.${suffix}@flowspace.test`, displayName: `Security ${role}` })));
  await db.doc(`companies/${companyId}`).set({ ownerId: ids.owner, name: 'Security test', subscription: { plan: 'free', status: 'active' }, settings: {} });
  await Promise.all([
    db.doc(`companies/${companyId}/members/${ids.owner}`).set({ uid: ids.owner, role: 'owner' }),
    db.doc(`companies/${companyId}/members/${ids.manager}`).set({ uid: ids.manager, role: 'manager', departmentId: 'sales' }),
    db.doc(`companies/${companyId}/members/${ids.member}`).set({ uid: ids.member, role: 'member', departmentId: 'sales' }),
    db.doc(`companies/${companyId}/tasks/sales-own`).set({ assigneeId: ids.member, departmentId: 'sales', status: 'todo', createdBy: ids.owner }),
    db.doc(`companies/${companyId}/tasks/marketing-other`).set({ assigneeId: ids.owner, departmentId: 'marketing', status: 'todo', createdBy: ids.owner }),
    db.doc(`users/${ids.member}`).set({ uid: ids.member }),
    db.doc(`users/${ids.member}/personalTasks/private`).set({ assigneeId: ids.member, status: 'todo' }),
  ]);

  const [managerToken, memberToken, outsiderToken] = await Promise.all([idToken(ids.manager), idToken(ids.member), idToken(ids.outsider)]);
  expectStatus('manager reads a task from own department', (await getDocument(`companies/${companyId}/tasks/sales-own`, managerToken)).status, 200);
  expectStatus('manager cannot read another department', (await getDocument(`companies/${companyId}/tasks/marketing-other`, managerToken)).status, 403);
  expectStatus('member reads own company task', (await getDocument(`companies/${companyId}/tasks/sales-own`, memberToken)).status, 200);
  expectStatus('member cannot read another employee task', (await getDocument(`companies/${companyId}/tasks/marketing-other`, memberToken)).status, 403);
  expectStatus('manager cannot read employee personal task', (await getDocument(`users/${ids.member}/personalTasks/private`, managerToken)).status, 403);
  expectStatus('member reads own personal task', (await getDocument(`users/${ids.member}/personalTasks/private`, memberToken)).status, 200);
  expectStatus('outsider cannot read company data', (await getDocument(`companies/${companyId}/tasks/sales-own`, outsiderToken)).status, 403);
  expectStatus('member cannot promote self to owner', (await updateRole(memberToken)).status, 403);
  await db.doc(`companies/${companyId}/members/${ids.manager}`).update({ departmentId: '' });
  expectStatus('manager without a department cannot read department tasks', (await getDocument(`companies/${companyId}/tasks/sales-own`, managerToken)).status, 403);
  console.log('Live Firestore role test passed.');
} finally {
  await Promise.allSettled([db.recursiveDelete(db.doc(`companies/${companyId}`)), db.recursiveDelete(db.doc(`users/${ids.member}`))]);
  await Promise.allSettled(Object.values(ids).map((uid) => auth.deleteUser(uid)));
}
