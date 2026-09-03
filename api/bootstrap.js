import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, normalizeEmail, requireFirebaseUser } from './_firebaseAdmin.js';

const DEFAULT_AUTOMATIONS = [
  { id: 'auto_urgent_tg', name: 'Срочная задача ➔ Алерт в Telegram', event: 'task_created', condition: 'is_urgent', enabled: true },
  { id: 'auto_review_notify', name: 'Перевод «На проверке» ➔ Уведомление', event: 'status_changed', targetStatus: 'review', enabled: true }
];

const DEFAULT_KPIS = [
  { id: 'sla', name: 'Соблюдение SLA', score: 100, desc: 'Процент задач, выполненных без просрочки дедлайна' },
  { id: 'completion', name: 'Процент выполнения', score: 0, desc: 'Доля завершенных задач от общего объема' },
  { id: 'overdue', name: 'Уровень просрочки', score: 0, desc: 'Процент активных задач с нарушенным дедлайна' }
];

function taskPayload(task = {}, fallbackId, ownerEmail = '') {
  const createdAtMs = Number(task.createdAtMs) || Date.parse(task.createdAt || '') || Date.now();
  return {
    ...task,
    legacyId: task.id ?? fallbackId,
    createdAtMs,
    updatedAtMs: Date.now(),
    createdAt: task.createdAt || new Date(createdAtMs).toISOString(),
    updatedAt: new Date().toISOString(),
    assigneeEmail: String(task.assigneeEmail || ownerEmail || '').toLowerCase()
  };
}

async function migrateLegacyOwnerData(db, uid, companyRef, authenticatedEmail = '') {
  const legacyRef = db.collection('users').doc(uid);
  const legacySnap = await legacyRef.get();
  const legacy = legacySnap.exists ? legacySnap.data() : null;

  const companySnap = await companyRef.get();
  if (companySnap.exists && Number(companySnap.data()?.migrationVersion || 0) >= 1) return companySnap.data();

  const ownerEmail = normalizeEmail(legacy?.email || authenticatedEmail || '');
  const companyData = {
    name: legacy?.companyName || 'Моя компания',
    ownerId: uid,
    isPro: Boolean(legacy?.isPro),
    appliedPromo: legacy?.appliedPromo || null,
    settings: {
      isTeamMode: legacy?.settings?.isTeamMode ?? false,
      teamSize: legacy?.settings?.teamSize || '👤 Я один',
      telegramChatId: legacy?.settings?.telegramChatId || '',
      automations: legacy?.settings?.automations || DEFAULT_AUTOMATIONS
    },
    kpis: legacy?.kpis || DEFAULT_KPIS,
    createdAt: legacy?.createdAt || new Date().toISOString(),
    migratedFromLegacy: Boolean(legacy),
    updatedAt: FieldValue.serverTimestamp()
  };

  await companyRef.set(companyData, { merge: true });

  const legacyAssistants = Array.isArray(legacy?.assistants) ? legacy.assistants.map(item => ({ ...item })) : [];
  const emailByAssigneeName = new Map(
    legacyAssistants
      .filter(item => item?.name && item?.email)
      .map(item => [String(item.name).toLowerCase(), normalizeEmail(item.email)])
  );

  const batch = db.batch();
  const seenTaskIds = new Set();
  const activeTasks = Array.isArray(legacy?.tasks) ? legacy.tasks : [];
  const archivedTasks = Array.isArray(legacy?.archive) ? legacy.archive : [];

  [...activeTasks, ...archivedTasks].forEach((task, index) => {
    const preferred = String(task?.id ?? `legacy_${index}`);
    const id = seenTaskIds.has(preferred) ? `${preferred}_${index}` : preferred;
    seenTaskIds.add(id);
    const ref = companyRef.collection('tasks').doc(id);
    const inferredEmail = normalizeEmail(task?.assigneeEmail) || emailByAssigneeName.get(String(task?.assigneeName || '').toLowerCase()) || ownerEmail;
    batch.set(ref, taskPayload({ ...task, assigneeEmail: inferredEmail, status: archivedTasks.includes(task) ? 'done' : (task.status || 'todo') }, id, ownerEmail), { merge: true });
  });

  const sops = Array.isArray(legacy?.sops) ? legacy.sops : [];
  sops.forEach((sop, index) => {
    const id = String(sop?.id ?? `legacy_sop_${index}`);
    batch.set(companyRef.collection('sops').doc(id), {
      ...sop,
      createdAtMs: Number(sop?.createdAtMs) || Date.now() - index,
      updatedAtMs: Date.now()
    }, { merge: true });
  });

  const assistants = legacyAssistants;
  const ownerIndex = assistants.findIndex(item => item.uid === uid || item.role === 'owner' || item.id === 'manager');
  const ownerAssistant = {
    id: ownerIndex >= 0 ? (assistants[ownerIndex].id || uid) : uid,
    uid,
    name: assistants[ownerIndex]?.name || ownerEmail.split('@')[0] || 'Владелец',
    email: ownerEmail,
    position: assistants[ownerIndex]?.position || 'CEO',
    role: 'owner'
  };
  if (ownerIndex >= 0) assistants[ownerIndex] = { ...assistants[ownerIndex], ...ownerAssistant };
  else assistants.unshift(ownerAssistant);
  await companyRef.set({ assistants }, { merge: true });

  await batch.commit();
  await companyRef.set({ migrationVersion: 1, migratedAt: FieldValue.serverTimestamp() }, { merge: true });
  return companyData;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const decoded = await requireFirebaseUser(req);
    const db = getAdminDb();
    const email = normalizeEmail(decoded.email);
    if (!email) return res.status(400).json({ error: 'Firebase account has no email' });

    const mappingRef = db.collection('user_mappings').doc(email);
    const mappingSnap = await mappingRef.get();

    let companyId;
    let role;
    let mappingData = null;

    if (mappingSnap.exists) {
      mappingData = mappingSnap.data();
      companyId = mappingData.companyId;
      role = mappingData.role || 'member';
    } else {
      companyId = decoded.uid;
      role = 'owner';
      await mappingRef.set({ companyId, role, createdAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    const companyRef = db.collection('companies').doc(companyId);
    if (role === 'owner' && companyId === decoded.uid) {
      await migrateLegacyOwnerData(db, decoded.uid, companyRef, email);
    }

    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      return res.status(409).json({ error: 'Company workspace is not initialized. Ask the owner to sign in first.' });
    }

    const displayName = decoded.name || email.split('@')[0] || 'Пользователь';
    const assistants = Array.isArray(companySnap.data()?.assistants) ? companySnap.data().assistants.map(item => ({ ...item })) : [];
    const assistantIndex = assistants.findIndex(item =>
      (mappingData?.assistantId && item.id === mappingData.assistantId) || normalizeEmail(item.email) === email
    );
    if (assistantIndex >= 0) {
      assistants[assistantIndex] = {
        ...assistants[assistantIndex],
        uid: decoded.uid,
        email,
        name: assistants[assistantIndex].name || displayName,
        role,
        position: assistants[assistantIndex].position || mappingData?.position || 'Сотрудник'
      };
      await companyRef.set({ assistants, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    await db.collection('users').doc(decoded.uid).set({
      uid: decoded.uid,
      email,
      displayName,
      activeCompanyId: companyId,
      role,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    await companyRef.collection('members').doc(decoded.uid).set({
      uid: decoded.uid,
      email,
      name: displayName,
      role,
      active: true,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection('users').doc(decoded.uid).collection('workspace_meta').doc('personal').set({
      initialized: true,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(200).json({ companyId, role, email, uid: decoded.uid });
  } catch (error) {
    console.error('Bootstrap error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Bootstrap failed' });
  }
}
