/**
 * Доменная модель задач Flow Space.
 * Главный принцип: задача закрывается не галочкой, а принятым результатом.
 */

const nowIso = () => new Date().toISOString();

const pad = (value) => String(value).padStart(2, '0');

export const getLocalDateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseLocalTaskDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

const addMonthsClamped = (date, months) => {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
};

const normalizeCriteria = (criteria) => {
  if (Array.isArray(criteria)) return criteria.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof criteria === 'string') {
    return criteria.split('\n').map((item) => item.replace(/^[-•\d.)\s]+/, '').trim()).filter(Boolean);
  }
  return [];
};

const normalizeArtifact = (artifact) => {
  if (!artifact) return { url: '', note: '' };
  if (typeof artifact === 'string') return { url: artifact, note: '' };
  return {
    url: String(artifact.url || '').trim(),
    note: String(artifact.note || '').trim(),
  };
};

export const inferTaskPriority = (text = '') => {
  const source = String(text || '').toLowerCase();
  return {
    urgent: /(срочн|немедленн|горит|аврал)|как можно скорее|до конца дня|нужно сегодня/.test(source),
    important: /(важн|приоритет|ключев|критич|обязательн)/.test(source),
  };
};

export const taskPriorityScore = (task, today = getLocalDateKey()) => {
  const dueDate = String(task?.dueDate || '').slice(0, 10);
  const overdue = dueDate && dueDate < today;
  const dueToday = dueDate === today;
  return (overdue ? 1000 : 0)
    + (task?.urgent ? 400 : 0)
    + (task?.important ? 200 : 0)
    + (dueToday ? 100 : 0);
};

const taskPriorityRank = (task) => {
  if (task?.urgent && task?.important) return 0;
  if (task?.urgent) return 1;
  if (task?.important) return 2;
  return 3;
};

export const sortTasksByPriority = (tasks = [], today = getLocalDateKey()) => (
  [...tasks].sort((a, b) => {
    const aDue = String(a?.dueDate || '').slice(0, 10);
    const bDue = String(b?.dueDate || '').slice(0, 10);
    const aOverdue = Boolean(aDue && aDue < today);
    const bOverdue = Boolean(bDue && bDue < today);

    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (aDue && bDue && aDue !== bDue) return aDue.localeCompare(bDue);
    if (Boolean(aDue) !== Boolean(bDue)) return aDue ? -1 : 1;

    return taskPriorityRank(a) - taskPriorityRank(b)
      || String(a?.time || '99:99').localeCompare(String(b?.time || '99:99'))
      || String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''));
  })
);

export const isTaskForToday = (task, today = getLocalDateKey()) => {
  if (!task || task.status === 'done') return false;
  const dueDate = String(task.dueDate || '').slice(0, 10);
  return dueDate ? dueDate <= today : Boolean(task.urgent);
};

export const normalizeTask = (task, defaultUserId = 'owner') => {
  if (!task) return null;

  const estimatedHours = parseFloat(task.estimatedHours) || 0;
  const estimatedMinutes = task.estimatedMinutes !== undefined
    ? parseFloat(task.estimatedMinutes) || 0
    : Math.round(estimatedHours * 60);

  return {
    id: task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: task.text || task.title || 'Новая задача',
    description: task.description || '',

    expectedResult: task.expectedResult || '',
    successCriteria: normalizeCriteria(task.successCriteria),

    status: task.status || 'todo', // todo | in_progress | review | deferred | done

    urgent: Boolean(task.urgent),
    important: Boolean(task.important),

    assigneeId: task.assigneeId || (task.assigneeName ? `emp_${task.assigneeName}` : defaultUserId),
    assigneeName: task.assigneeName || 'Владелец',
    departmentId: task.departmentId || '',
    departmentName: task.departmentName || '',
    createdBy: task.createdBy || defaultUserId,

    createdAt: task.createdAt || nowIso(),
    updatedAt: task.updatedAt || task.createdAt || nowIso(),
    dueDate: task.dueDate || '',
    time: task.time || '',
    recurrence: task.recurrence || 'none',
    reminder: task.reminder || 'none',
    category: task.category === 'personal' ? 'personal' : 'work',
    projectName: String(task.projectName || '').trim(),
    completedAt: task.status === 'done' ? (task.completedAt || nowIso()) : (task.completedAt || null),

    estimatedMinutes,
    estimatedHours: estimatedHours || (estimatedMinutes / 60),
    actualMinutes: parseFloat(task.actualMinutes) || 0,

    // Сдача и проверка результата
    resultArtifact: normalizeArtifact(task.resultArtifact),
    submittedAt: task.submittedAt || null,
    acceptedAt: task.acceptedAt || null,
    acceptedBy: task.acceptedBy || null,
    reviewAttempts: Number(task.reviewAttempts) || 0,
    reopenedCount: Number(task.reopenedCount) || 0,
    reviewHistory: Array.isArray(task.reviewHistory) ? task.reviewHistory : [],

    // AI Team
    aiAgentId: task.aiAgentId || '',
    sopId: task.sopId || '',
    sopTitle: task.sopTitle || '',
    sopVersion: Number(task.sopVersion) || (task.sopId ? 1 : 0),
    aiExecutionHistory: Array.isArray(task.aiExecutionHistory) ? task.aiExecutionHistory : [],
  };
};

export const createNormalizedTask = ({
  title,
  description = '',
  expectedResult = '',
  successCriteria = [],
  estimatedHours = 1,
  dueDate = '',
  urgent = false,
  important = false,
  status = 'todo',
  assigneeId = 'manager',
  assigneeName = 'Владелец',
  departmentId = '',
  departmentName = '',
  createdBy = 'owner',
  aiAgentId = '',
  sopId = '',
  sopTitle = '',
  sopVersion = 0,
  time = '',
  recurrence = 'none',
  reminder = 'none',
  category = 'work',
  projectName = ''
}) => {
  const hours = parseFloat(estimatedHours) || 0;
  const createdAt = nowIso();

  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: title.trim(),
    description: description.trim(),
    expectedResult: expectedResult.trim(),
    successCriteria: normalizeCriteria(successCriteria),
    status,
    urgent: Boolean(urgent),
    important: Boolean(important),
    assigneeId,
    assigneeName,
    departmentId,
    departmentName,
    createdBy,
    createdAt,
    updatedAt: createdAt,
    dueDate,
    time,
    recurrence,
    reminder,
    category: category === 'personal' ? 'personal' : 'work',
    projectName: String(projectName || '').trim(),
    completedAt: status === 'done' ? createdAt : null,
    estimatedMinutes: Math.round(hours * 60),
    estimatedHours: hours,
    actualMinutes: 0,
    resultArtifact: { url: '', note: '' },
    submittedAt: null,
    acceptedAt: null,
    acceptedBy: null,
    reviewAttempts: 0,
    reopenedCount: 0,
    reviewHistory: [],
    aiAgentId,
    sopId,
    sopTitle,
    sopVersion: Number(sopVersion) || (sopId ? 1 : 0),
    aiExecutionHistory: [],
  };
};

export const createNextRecurringTask = (task, completedAt = new Date()) => {
  const normalized = normalizeTask(task);
  if (!normalized || normalized.category !== 'personal' || normalized.recurrence === 'none') return null;

  const completedDate = completedAt instanceof Date ? completedAt : new Date(completedAt);
  const sourceDate = parseLocalTaskDate(normalized.dueDate) || completedDate;
  let nextDate;

  if (normalized.recurrence === 'daily') {
    nextDate = new Date(sourceDate);
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (normalized.recurrence === 'weekly') {
    nextDate = new Date(sourceDate);
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (normalized.recurrence === 'monthly') {
    nextDate = addMonthsClamped(sourceDate, 1);
  } else {
    return null;
  }

  // Если старый экземпляр закрыли с большим опозданием, не создаём уже просроченный повтор.
  const today = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
  while (nextDate < today) {
    if (normalized.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    if (normalized.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    if (normalized.recurrence === 'monthly') nextDate = addMonthsClamped(nextDate, 1);
  }

  const createdAt = completedDate.toISOString();
  return {
    ...normalized,
    id: `task_${completedDate.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
    recurrenceSourceId: normalized.id,
    firestoreId: undefined,
    status: 'todo',
    dueDate: getLocalDateKey(nextDate),
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    acceptedAt: null,
    acceptedBy: null,
    submittedAt: null,
    resultArtifact: { url: '', note: '' },
    reviewAttempts: 0,
    reviewHistory: [],
  };
};

export const getPersonalReminderState = (task, now = new Date()) => {
  if (!task || task.category !== 'personal' || task.reminder === 'none' || !task.dueDate || !task.time || task.status === 'done') return null;
  const due = new Date(`${String(task.dueDate).slice(0, 10)}T${task.time}:00`);
  if (Number.isNaN(due.getTime())) return null;
  const offsets = { at_time: 0, '15m': 15, '1h': 60, '1d': 1440 };
  const minutes = offsets[task.reminder];
  if (minutes === undefined) return null;
  const remindAt = new Date(due.getTime() - minutes * 60 * 1000);
  const nowValue = now instanceof Date ? now : new Date(now);
  if (nowValue < remindAt || nowValue > due) return null;
  return {
    due,
    remindAt,
    label: nowValue >= due ? 'Сейчас' : task.reminder === 'at_time' ? 'Сейчас' : 'Скоро',
  };
};

export const submitTaskResult = (task, { artifactUrl = '', artifactNote = '', actorId, actorName }) => {
  if (!task) throw new Error('Задача не найдена');
  if (!String(artifactUrl || '').trim() && !String(artifactNote || '').trim()) {
    throw new Error('Добавьте ссылку на результат или короткое описание результата');
  }
  const submittedAt = nowIso();
  return {
    ...task,
    status: 'review',
    resultArtifact: { url: String(artifactUrl || '').trim(), note: String(artifactNote || '').trim() },
    submittedAt,
    updatedAt: submittedAt,
    reviewAttempts: (Number(task.reviewAttempts) || 0) + 1,
    reviewHistory: [
      ...(Array.isArray(task.reviewHistory) ? task.reviewHistory : []),
      { type: 'submitted', at: submittedAt, actorId: actorId || null, actorName: actorName || 'Исполнитель' },
    ],
  };
};

export const acceptTaskResult = (task, { reviewerId, reviewerName, comment = '' }) => {
  const normalized = normalizeTask(task, reviewerId);
  const acceptedAt = nowIso();
  return {
    ...normalized,
    status: 'done',
    completedAt: acceptedAt,
    acceptedAt,
    acceptedBy: reviewerId || null,
    updatedAt: acceptedAt,
    reviewHistory: [
      ...(normalized.reviewHistory || []),
      { type: 'accepted', at: acceptedAt, actorId: reviewerId || null, actorName: reviewerName || 'Руководитель', comment: String(comment || '').trim() },
    ],
  };
};

export const returnTaskForRework = (task, { reviewerId, reviewerName, comment }) => {
  const normalized = normalizeTask(task, reviewerId);
  if (!String(comment || '').trim()) throw new Error('Укажите, что нужно доработать');
  const returnedAt = nowIso();
  return {
    ...normalized,
    status: 'in_progress',
    completedAt: null,
    acceptedAt: null,
    acceptedBy: null,
    updatedAt: returnedAt,
    reopenedCount: (normalized.reopenedCount || 0) + 1,
    reviewHistory: [
      ...(normalized.reviewHistory || []),
      { type: 'returned', at: returnedAt, actorId: reviewerId || null, actorName: reviewerName || 'Руководитель', comment: String(comment).trim() },
    ],
  };
};

export const isTaskOverdue = (task) => {
  if (!task.dueDate || task.status === 'done') return false;
  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return new Date() > due;
};

export const replaceTaskInCollections = (tasks = [], archive = [], updatedTask) => ({
  tasks: tasks.map((task) => task.id === updatedTask?.id ? updatedTask : task),
  archive: archive.map((task) => task.id === updatedTask?.id ? updatedTask : task),
});
