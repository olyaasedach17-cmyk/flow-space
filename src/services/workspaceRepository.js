import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { ROLES } from '../utils/workspaceUtils';

const normalizeTimestamp = (value) => {
  if (!value) return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  return value;
};

const mapSnapshot = (snapshot) => snapshot.docs.map((item) => {
  const data = item.data();
  return {
    id: item.id,
    ...data,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
    completedAt: normalizeTimestamp(data.completedAt)
  };
});

const mergeTaskLists = (...lists) => {
  const byId = new Map();
  lists.flat().forEach((task) => byId.set(task.id, task));
  return Array.from(byId.values());
};

export async function ensureUserProfile(user) {
  if (!user?.uid) throw new Error('User is required');

  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const baseProfile = {
    email: user.email?.toLowerCase() || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Пользователь',
    updatedAt: serverTimestamp()
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...baseProfile,
      createdAt: serverTimestamp()
    });
  } else {
    await setDoc(ref, baseProfile, { merge: true });
  }
}

export async function ensureOwnedCompany(user, existingCompanyId = null) {
  if (!user?.uid) throw new Error('User is required');

  const companyId = existingCompanyId || user.uid;
  const companyRef = doc(db, 'companies', companyId);
  const companySnap = await getDoc(companyRef);

  if (!companySnap.exists()) {
    await setDoc(companyRef, {
      ownerId: user.uid,
      name: user.displayName ? `${user.displayName} — компания` : 'Моя компания',
      settings: {
        isTeamMode: false,
        teamSize: '👤 Я один',
        telegramChatId: ''
      },
      subscription: {
        plan: 'free',
        status: 'active'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  const memberRef = doc(db, 'companies', companyId, 'members', user.uid);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) {
    await setDoc(memberRef, {
      uid: user.uid,
      email: user.email?.toLowerCase() || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Владелец',
      role: ROLES.OWNER,
      position: 'CEO',
      joinedAt: serverTimestamp()
    });
  }

  await setDoc(doc(db, 'users', user.uid), {
    activeCompanyId: companyId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return companyId;
}

export function subscribePersonalTasks(uid, onData, onError) {
  if (!uid) return () => {};
  return onSnapshot(
    collection(db, 'users', uid, 'personalTasks'),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export function subscribeCompanyTasks(companyId, uid, role, onData, onError) {
  if (!companyId || !uid) return () => {};

  const tasksRef = collection(db, 'companies', companyId, 'tasks');
  if (role === ROLES.OWNER || role === ROLES.MANAGER) {
    return onSnapshot(tasksRef, (snapshot) => onData(mapSnapshot(snapshot)), onError);
  }

  let assignedTasks = [];
  let createdTasks = [];
  const emit = () => onData(mergeTaskLists(assignedTasks, createdTasks));

  const unsubscribeAssigned = onSnapshot(
    query(tasksRef, where('assigneeId', '==', uid)),
    (snapshot) => {
      assignedTasks = mapSnapshot(snapshot);
      emit();
    },
    onError
  );

  const unsubscribeCreated = onSnapshot(
    query(tasksRef, where('createdBy', '==', uid)),
    (snapshot) => {
      createdTasks = mapSnapshot(snapshot);
      emit();
    },
    onError
  );

  return () => {
    unsubscribeAssigned();
    unsubscribeCreated();
  };
}

export function subscribeCompanyMembers(companyId, onData, onError) {
  if (!companyId) return () => {};
  return onSnapshot(
    collection(db, 'companies', companyId, 'members'),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export function subscribeCompanySops(companyId, onData, onError) {
  if (!companyId) return () => {};
  return onSnapshot(
    collection(db, 'companies', companyId, 'sops'),
    (snapshot) => onData(mapSnapshot(snapshot)),
    onError
  );
}

export async function createPersonalTask(uid, task) {
  const ref = await addDoc(collection(db, 'users', uid, 'personalTasks'), {
    ...task,
    ownerId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function createCompanyTask(companyId, userId, task) {
  const ref = await addDoc(collection(db, 'companies', companyId, 'tasks'), {
    ...task,
    companyId,
    createdBy: task.createdBy || userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updatePersonalTask(uid, taskId, patch) {
  await updateDoc(doc(db, 'users', uid, 'personalTasks', taskId), {
    ...patch,
    updatedAt: serverTimestamp()
  });
}

export async function updateCompanyTask(companyId, taskId, patch) {
  await updateDoc(doc(db, 'companies', companyId, 'tasks', taskId), {
    ...patch,
    updatedAt: serverTimestamp()
  });
}

export async function deletePersonalTask(uid, taskId) {
  await deleteDoc(doc(db, 'users', uid, 'personalTasks', taskId));
}

export async function deleteCompanyTask(companyId, taskId) {
  await deleteDoc(doc(db, 'companies', companyId, 'tasks', taskId));
}

export async function saveCompanySop(companyId, sop) {
  const ref = sop.id
    ? doc(db, 'companies', companyId, 'sops', String(sop.id))
    : doc(collection(db, 'companies', companyId, 'sops'));

  await setDoc(ref, {
    ...sop,
    id: ref.id,
    companyId,
    updatedAt: serverTimestamp(),
    createdAt: sop.createdAt || serverTimestamp()
  }, { merge: true });

  return ref.id;
}

export async function deleteCompanySop(companyId, sopId) {
  await deleteDoc(doc(db, 'companies', companyId, 'sops', String(sopId)));
}

export async function getMembership(companyId, uid) {
  if (!companyId || !uid) return null;
  const snap = await getDoc(doc(db, 'companies', companyId, 'members', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
