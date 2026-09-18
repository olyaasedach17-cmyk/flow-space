// ==========================================
/**
 * Вспомогательный модуль для нормализации и управления задачами
 */

/**
 * Приводит любую задачу к единому стандарту
 */
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

    // Принцип Flow Space: Образ результата
    expectedResult: task.expectedResult || '',

    status: task.status || 'todo', // todo | in_progress | review | deferred | done

    // Приоритеты
    urgent: Boolean(task.urgent),
    important: Boolean(task.important),

    // Назначение и авторство
    assigneeId: task.assigneeId || (task.assigneeName ? `emp_${task.assigneeName}` : defaultUserId),
    assigneeName: task.assigneeName || 'Владелец',
    createdBy: task.createdBy || defaultUserId,

    // Метки времени (SLA и аналитика)
    createdAt: task.createdAt || new Date().toISOString(),
    dueDate: task.dueDate || '',
    completedAt: task.status === 'done' ? (task.completedAt || new Date().toISOString()) : null,

    // Временные затраты в минутах
    estimatedMinutes: estimatedMinutes,
    estimatedHours: estimatedHours || (estimatedMinutes / 60),
    actualMinutes: parseFloat(task.actualMinutes) || 0
  };
};

/**
 * Создаёт абсолютно новую нормализованную задачу
 */
export const createNormalizedTask = ({
  title,
  description = '',
  expectedResult = '',
  estimatedHours = 1,
  dueDate = '',
  urgent = false,
  important = false,
  status = 'todo',
  assigneeId = 'manager',
  assigneeName = 'Владелец',
  createdBy = 'owner'
}) => {
  const hours = parseFloat(estimatedHours) || 0;

  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: title.trim(),
    description: description.trim(),
    expectedResult: expectedResult.trim(),
    status,
    urgent: Boolean(urgent),
    important: Boolean(important),
    assigneeId,
    assigneeName,
    createdBy,
    createdAt: new Date().toISOString(),
    dueDate,
    completedAt: status === 'done' ? new Date().toISOString() : null,
    estimatedMinutes: Math.round(hours * 60),
    estimatedHours: hours,
    actualMinutes: 0
  };
};

/**
 * Проверяет, просрочена ли задача
 */
export const isTaskOverdue = (task) => {
  if (!task.dueDate || task.status === 'done') return false;

  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);

  return new Date() > due;
};


// ==========================================
