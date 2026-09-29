import { readFile } from 'node:fs/promises';
import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-flow-space-rules';
let environment;

const userDb = (uid, email = `${uid}@example.test`) => environment
  .authenticatedContext(uid, { email })
  .firestore();

async function seed() {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users', 'owner-a'), { uid: 'owner-a', email: 'owner-a@example.test' }),
      setDoc(doc(db, 'users', 'employee-a'), { uid: 'employee-a', email: 'employee-a@example.test' }),
      setDoc(doc(db, 'users', 'employee-b'), { uid: 'employee-b', email: 'employee-b@example.test' }),
      setDoc(doc(db, 'users', 'employee-a', 'personalTasks', 'private-task'), { text: 'Футбол сына', category: 'personal' }),
      setDoc(doc(db, 'companies', 'company-a'), { ownerId: 'owner-a', subscription: { plan: 'free', status: 'active' } }),
      setDoc(doc(db, 'companies', 'company-b'), { ownerId: 'owner-b', subscription: { plan: 'free', status: 'active' } }),
      setDoc(doc(db, 'companies', 'company-a', 'members', 'owner-a'), { uid: 'owner-a', role: 'owner', departmentId: '' }),
      setDoc(doc(db, 'companies', 'company-a', 'members', 'manager-a'), { uid: 'manager-a', role: 'manager', departmentId: 'sales' }),
      setDoc(doc(db, 'companies', 'company-a', 'members', 'employee-a'), { uid: 'employee-a', role: 'member', departmentId: 'sales' }),
      setDoc(doc(db, 'companies', 'company-b', 'members', 'employee-b'), { uid: 'employee-b', role: 'member', departmentId: 'ops' }),
      setDoc(doc(db, 'companies', 'company-a', 'tasks', 'sales-task'), { text: 'КП', assigneeId: 'employee-a', createdBy: 'owner-a', departmentId: 'sales', status: 'todo' }),
      setDoc(doc(db, 'companies', 'company-b', 'tasks', 'foreign-task'), { text: 'Чужая задача', assigneeId: 'employee-b', createdBy: 'owner-b', departmentId: 'ops', status: 'todo' }),
    ]);
  });
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seed();
});

after(async () => {
  await environment?.cleanup();
});

test('user can CRUD only their own personal tasks', async () => {
  const ownRef = doc(userDb('employee-a'), 'users', 'employee-a', 'personalTasks', 'new-private-task');
  await assertSucceeds(setDoc(ownRef, { text: 'Витамины', category: 'personal' }));
  await assertSucceeds(getDoc(ownRef));
  await assertFails(getDoc(doc(userDb('employee-b'), 'users', 'employee-a', 'personalTasks', 'private-task')));
});

test('company owner cannot read an employee private task', async () => {
  const privateRef = doc(userDb('owner-a'), 'users', 'employee-a', 'personalTasks', 'private-task');
  await assertFails(getDoc(privateRef));
});

test('employee cannot read another company task', async () => {
  const foreignRef = doc(userDb('employee-a'), 'companies', 'company-b', 'tasks', 'foreign-task');
  await assertFails(getDoc(foreignRef));
});

test('employee cannot promote themselves', async () => {
  const membershipRef = doc(userDb('employee-a'), 'companies', 'company-a', 'members', 'employee-a');
  await assertFails(updateDoc(membershipRef, { role: 'owner' }));
});

test('manager is limited to their department', async () => {
  const manager = userDb('manager-a');
  await assertSucceeds(setDoc(doc(manager, 'companies', 'company-a', 'tasks', 'sales-new'), {
    text: 'План продаж', assigneeId: 'employee-a', createdBy: 'manager-a', departmentId: 'sales', status: 'todo',
  }));
  await assertFails(setDoc(doc(manager, 'companies', 'company-a', 'tasks', 'ops-new'), {
    text: 'Операционная задача', assigneeId: 'employee-a', createdBy: 'manager-a', departmentId: 'ops', status: 'todo',
  }));
  await assertFails(getDoc(doc(manager, 'companies', 'company-b', 'tasks', 'foreign-task')));
});

test('member can update execution fields but cannot accept their own result', async () => {
  const taskRef = doc(userDb('employee-a'), 'companies', 'company-a', 'tasks', 'sales-task');
  await assertSucceeds(updateDoc(taskRef, { status: 'in_progress' }));
  await assertFails(updateDoc(taskRef, { status: 'done' }));
  const snapshot = await assertSucceeds(getDoc(taskRef));
  assert.equal(snapshot.data().status, 'in_progress');
});

test('member can submit a result directly without a separate in-progress transition', async () => {
  const taskRef = doc(userDb('employee-a'), 'companies', 'company-a', 'tasks', 'sales-task');
  await assertSucceeds(updateDoc(taskRef, {
    status: 'review',
    resultArtifact: { url: '', note: 'Готовый результат' },
    submittedAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
    reviewAttempts: 1,
    reviewHistory: [{ type: 'submitted', at: '2026-09-18T10:00:00.000Z', actorId: 'employee-a' }],
  }));
});
