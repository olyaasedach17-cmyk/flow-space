import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ROLES } from '../utils/workspaceUtils';

const toIso = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value?.toDate) return value.toDate().toISOString();
  return null;
};

const mapSnapshot = (snap) => snap.docs.map((item) => ({
  ...item.data(),
  id: item.data()?.id ?? item.id,
  firestoreId: item.id,
}));

export async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const base = {
    uid: user.uid,
    email: user.email?.toLowerCase() || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Пользователь',
    updatedAt: new Date().toISOString(),
  };

  if (!snap.exists()) {
    await setDoc(ref, { ...base, activeCompanyId: null, createdAt: new Date().toISOString() });
    return { ...base, activeCompanyId: null };
  }

  await setDoc(ref, base, { merge: true });
  return { ...snap.data(), ...base };
}

export async function ensureOwnedCompany(user) {
  const companyId = user.uid;
  const companyRef = doc(db, 'companies', companyId);
  const companySnap = await getDoc(companyRef);

  if (!companySnap.exists()) {
    await setDoc(companyRef, {
      id: companyId,
      ownerId: user.uid,
      name: `${user.displayName || user.email?.split('@')[0] || 'Моя'} Space`,
      settings: {
        productMode: 'solo',
        isTeamMode: false,
        teamSize: '👤 Я один',
        onboardingCompleted: false,
        telegramChatId: '',
        automations: [],
      },
      subscription: { plan: 'free', status: 'active' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  await setDoc(doc(db, 'companies', companyId, 'members', user.uid), {
    uid: user.uid,
    email: user.email?.toLowerCase() || '',
    name: user.displayName || user.email?.split('@')[0] || 'Владелец',
    position: 'CEO',
    role: ROLES.OWNER,
    joinedAt: new Date().toISOString(),
  }, { merge: true });

  await setDoc(doc(db, 'users', user.uid), { activeCompanyId: companyId }, { merge: true });
  return companyId;
}

export async function migrateLegacyOwnerData(user, defaultKpis = [], defaultAutomations = []) {
  const companyId = user.uid;
  const legacyRef = doc(db, 'users', companyId);
  const legacySnap = await getDoc(legacyRef);
  if (!legacySnap.exists()) return;

  const companyRef = doc(db, 'companies', companyId);
  const companySnap = await getDoc(companyRef);
  if (companySnap.data()?.migration?.legacyUsersDocumentImported) return;

  const legacy = legacySnap.data();
  const hasLegacyData = Array.isArray(legacy.tasks) || Array.isArray(legacy.archive) || Array.isArray(legacy.sops) || Array.isArray(legacy.assistants);
  if (!hasLegacyData) {
    await setDoc(companyRef, {
      migration: { legacyUsersDocumentImported: true, importedAt: new Date().toISOString(), sourceHadData: false }
    }, { merge: true });
    return;
  }

  const batch = writeBatch(db);
  const allTasks = [
    ...(legacy.tasks || []),
    ...(legacy.archive || []).map((task) => ({ ...task, status: 'done', completedAt: task.completedAt || new Date().toISOString() })),
  ];

  allTasks.forEach((task, idx) => {
    const taskId = String(task.firestoreId || task.id || `legacy_task_${idx}`);
    batch.set(doc(db, 'companies', companyId, 'tasks', taskId), {
      ...task,
      id: task.id || taskId,
      companyId,
      migratedFromLegacy: true,
      updatedAt: task.updatedAt || new Date().toISOString(),
    }, { merge: true });
  });

  (legacy.sops || []).forEach((sop, idx) => {
    const sopId = String(sop.firestoreId || sop.id || `legacy_sop_${idx}`);
    batch.set(doc(db, 'companies', companyId, 'sops', sopId), {
      ...sop,
      id: sop.id || sopId,
      companyId,
      migratedFromLegacy: true,
      updatedAt: sop.updatedAt || new Date().toISOString(),
    }, { merge: true });
  });

  (legacy.assistants || []).forEach((member, idx) => {
    const isOwner = member.role === ROLES.OWNER || member.id === user.uid;
    const memberId = isOwner ? user.uid : String(member.uid || member.id || `legacy_member_${idx}`);
    batch.set(doc(db, 'companies', companyId, 'members', memberId), {
      uid: memberId,
      email: member.email || (isOwner ? user.email?.toLowerCase() : ''),
      name: member.name || (isOwner ? (user.displayName || 'Владелец') : 'Сотрудник'),
      position: member.position || (isOwner ? 'CEO' : 'Сотрудник'),
      role: isOwner ? ROLES.OWNER : (member.role === ROLES.MANAGER ? ROLES.MANAGER : ROLES.MEMBER),
      invitedAt: member.invitedAt || null,
      joinedAt: isOwner ? new Date().toISOString() : null,
      migratedFromLegacy: true,
    }, { merge: true });
  });

  batch.set(companyRef, {
    ownerId: user.uid,
    settings: {
      ...(legacy.settings || {}),
      automations: legacy.settings?.automations || defaultAutomations,
    },
    kpis: legacy.kpis || defaultKpis,
    savedTime: legacy.savedTime || 0,
    subscription: legacy.isPro || legacy.appliedPromo
      ? { plan: 'pro', status: 'active', source: 'legacy' }
      : { plan: 'free', status: 'active' },
    legacyAppliedPromo: legacy.appliedPromo || null,
    migration: {
      legacyUsersDocumentImported: true,
      importedAt: new Date().toISOString(),
      sourceHadData: true,
    },
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await batch.commit();
}

export function subscribeUserProfile(uid, callback, errorCallback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => callback(snap.exists() ? snap.data() : null), errorCallback);
}

export function subscribeCompany(companyId, callback, errorCallback) {
  return onSnapshot(doc(db, 'companies', companyId), (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null), errorCallback);
}

export function subscribeMembers(companyId, callback, errorCallback) {
  return onSnapshot(collection(db, 'companies', companyId, 'members'), (snap) => callback(mapSnapshot(snap)), errorCallback);
}

export function subscribeCompanySops(companyId, callback, errorCallback) {
  return onSnapshot(collection(db, 'companies', companyId, 'sops'), (snap) => callback(mapSnapshot(snap)), errorCallback);
}

export function subscribePersonalTasks(uid, callback, errorCallback) {
  return onSnapshot(collection(db, 'users', uid, 'personalTasks'), (snap) => callback(mapSnapshot(snap)), errorCallback);
}

export function subscribeCompanyTasks(companyId, role, uid, callback, errorCallback) {
  const ref = collection(db, 'companies', companyId, 'tasks');
  if (role === ROLES.OWNER) {
    return onSnapshot(ref, (snap) => callback(mapSnapshot(snap)), errorCallback);
  }

  const memberQuery = query(ref, where('assigneeId', '==', uid));
  return onSnapshot(memberQuery, (snap) => callback(mapSnapshot(snap)), errorCallback);
}

export function subscribeDepartmentTasks(companyId, departmentId, callback, errorCallback) {
  if (!departmentId) {
    callback([]);
    return () => {};
  }
  const ref = collection(db, 'companies', companyId, 'tasks');
  return onSnapshot(query(ref, where('departmentId', '==', departmentId)), (snap) => callback(mapSnapshot(snap)), errorCallback);
}

export async function getMembership(companyId, uid) {
  const snap = await getDoc(doc(db, 'companies', companyId, 'members', uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateCompany(companyId, patch) {
  await setDoc(doc(db, 'companies', companyId), { ...patch, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function updateCompanyMember(companyId, uid, patch) {
  await setDoc(doc(db, 'companies', companyId, 'members', uid), {
    ...patch,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

function cleanFirestoreValue(value) {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(cleanFirestoreValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanFirestoreValue(v)]));
  }
  return value;
}

async function replaceCollection(collectionRef, items, existingSource = collectionRef, knownIds = null) {
  const existing = await getDocs(existingSource);
  const nextIds = new Set(items.map((item, idx) => String(item.firestoreId || item.id || `item_${idx}`)));
  const batch = writeBatch(db);

  existing.docs.forEach((item) => {
    if (!nextIds.has(item.id) && (!knownIds || knownIds.has(item.id))) batch.delete(item.ref);
  });

  items.forEach((item, idx) => {
    const firestoreId = String(item.firestoreId || item.id || `item_${idx}`);
    batch.set(doc(collectionRef, firestoreId), cleanFirestoreValue({
      ...item,
      firestoreId,
      updatedAt: new Date().toISOString(),
    }), { merge: true });
  });

  await batch.commit();
}

export async function replaceCompanyTasks(companyId, items, access = {}) {
  const ref = collection(db, 'companies', companyId, 'tasks');
  const existingSource = access.role === ROLES.OWNER
    ? ref
    : access.role === ROLES.MANAGER
      ? query(ref, where('departmentId', '==', access.departmentId || '__unassigned__'))
      : query(ref, where('assigneeId', '==', access.uid));
  return replaceCollection(ref, items, existingSource, access.knownIds ? new Set(access.knownIds) : null);
}

export async function replacePersonalTasks(uid, items) {
  return replaceCollection(collection(db, 'users', uid, 'personalTasks'), items);
}

export async function replaceCompanySops(companyId, items) {
  return replaceCollection(collection(db, 'companies', companyId, 'sops'), items);
}

export async function deleteCompanyTask(companyId, firestoreId) {
  return deleteDoc(doc(db, 'companies', companyId, 'tasks', String(firestoreId)));
}

export async function deletePersonalTask(uid, firestoreId) {
  return deleteDoc(doc(db, 'users', uid, 'personalTasks', String(firestoreId)));
}

export function normalizeDatesForUi(item) {
  return {
    ...item,
    createdAt: toIso(item.createdAt) || item.createdAt,
    updatedAt: toIso(item.updatedAt) || item.updatedAt,
    completedAt: toIso(item.completedAt) || item.completedAt,
  };
}
