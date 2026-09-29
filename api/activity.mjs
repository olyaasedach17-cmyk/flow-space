import { getAdminDb, requireFirebaseUser } from './_firebaseAdmin.mjs';

const ALLOWED_TYPES = new Set([
  'task_created', 'task_updated', 'task_started', 'task_restored', 'task_deleted',
  'result_submitted', 'result_accepted', 'result_returned', 'ai_result_attached',
  'department_created', 'member_department_changed', 'member_invited',
]);
const MEMBER_TYPES = new Set(['task_created', 'task_updated', 'task_started', 'result_submitted', 'ai_result_attached']);

const TYPE_LABELS = {
  task_created: 'Создана задача',
  task_updated: 'Изменена задача',
  task_started: 'Задача взята в работу',
  task_restored: 'Задача возвращена из архива',
  task_deleted: 'Удалена задача',
  result_submitted: 'Результат отправлен на проверку',
  result_accepted: 'Результат принят',
  result_returned: 'Результат возвращён на доработку',
  ai_result_attached: 'AI подготовил результат',
  department_created: 'Создан отдел',
  member_department_changed: 'Изменён отдел сотрудника',
  member_invited: 'Приглашён сотрудник',
};

const segment = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const send = (res, code, data) => res.status(code).json(data);

export function createActivityHandler({ authenticate = requireFirebaseUser, database = getAdminDb } = {}) {
 return async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  try {
    const actor = await authenticate(req);
    const { companyId, action } = req.body || {};
    if (!segment(companyId)) return send(res, 400, { error: 'Некорректное пространство.' });

    const db = database();
    const memberSnap = await db.doc(`companies/${companyId}/members/${actor.uid}`).get();
    if (!memberSnap.exists) return send(res, 403, { error: 'Нет доступа к журналу компании.' });
    const membership = memberSnap.data() || {};
    const activityRef = db.collection(`companies/${companyId}/activity`);

    if (action === 'list') {
      const snapshot = await activityRef.orderBy('createdAt', 'desc').limit(100).get();
      const events = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((event) => {
        if (membership.role === 'owner') return true;
        if (membership.role === 'manager') return Boolean(membership.departmentId) && event.departmentId === membership.departmentId;
        return event.taskAssigneeId === actor.uid || event.actorId === actor.uid;
      }).slice(0, 50);
      return send(res, 200, { events });
    }

    if (action !== 'record' || !ALLOWED_TYPES.has(req.body?.type)) {
      return send(res, 400, { error: 'Некорректное действие журнала.' });
    }

    const type = req.body.type;
    if (membership.role === 'member' && !MEMBER_TYPES.has(type)) {
      return send(res, 403, { error: 'Сотрудник не может записать такое действие.' });
    }
    const taskId = segment(req.body?.taskId) ? req.body.taskId : '';
    let task = null;
    if (taskId) {
      const taskSnap = await db.doc(`companies/${companyId}/tasks/${taskId}`).get();
      if (!taskSnap.exists) return send(res, 404, { error: 'Задача для журнала не найдена.' });
      task = taskSnap.data() || {};
      const mayAccess = membership.role === 'owner' ||
        (membership.role === 'manager' && membership.departmentId && task.departmentId === membership.departmentId) ||
        (membership.role === 'member' && task.assigneeId === actor.uid);
      if (!mayAccess) return send(res, 403, { error: 'Нет доступа к этой задаче.' });
    } else if (membership.role !== 'owner') {
      return send(res, 403, { error: 'Это действие доступно только собственнику.' });
    }

    const ref = activityRef.doc();
    const createdAt = new Date().toISOString();
    const resourceTitle = String(task?.text || req.body?.resourceTitle || '').trim().slice(0, 180);
    const event = {
      id: ref.id,
      companyId,
      type,
      label: TYPE_LABELS[type],
      resourceTitle,
      taskId: taskId || null,
      taskAssigneeId: task?.assigneeId || null,
      departmentId: task?.departmentId || String(req.body?.departmentId || '').slice(0, 128),
      departmentName: task?.departmentName || String(req.body?.departmentName || '').slice(0, 80),
      actorId: actor.uid,
      actorName: String(membership.name || actor.name || actor.email || 'Пользователь').slice(0, 120),
      actorRole: membership.role || 'member',
      details: String(req.body?.details || '').trim().slice(0, 500),
      createdAt,
    };
    await ref.set(event);
    return send(res, 200, { event });
  } catch (error) {
    console.error('Activity API error:', error);
    return send(res, error.statusCode || 500, { error: error.message || 'Не удалось обновить журнал.' });
  }
 };
}

export default createActivityHandler();
