// ==========================================
/**
 * Утилиты для управления пространствами (Workspaces) и ролевой моделью (Roles)
 * Базируется на принципе: «Контролируй результат, а не каждый шаг»
 */

export const ROLES = {
  OWNER: 'owner',     // Владелец компании: полный доступ, видит сводную аналитику и KPI всех сотрудников.
  MANAGER: 'manager', // Руководитель: ставит цели, определяет ожидаемый результат, принимает работу.
  MEMBER: 'member'    // Сотрудник: автономен, видит только свои задачи и критерии готовности (DoD).
};

export const WORKSPACES = {
  PERSONAL: 'personal', // Личное пространство: черновики и заметки сотрудника (недоступно руководителю).
  COMPANY: 'company'    // Пространство компании: согласованные задачи, дедлайны и результаты.
};

/**
 * Проверяет, имеет ли пользователь управленческие права
 */
export const isAdminRole = (role) => {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
};

/**
 * Фильтрует задачи для отображения в зависимости от роли и пространства.
 * Гарантирует, что микроменеджмент технически невозможен: каждый видит только свой уровень абстракции.
 */
export const filterTasksByRole = (tasks, userRole, userId, currentWorkspace) => {
  if (!tasks) return [];

  // В личном пространстве человек видит только свои персональные таски
  if (currentWorkspace === WORKSPACES.PERSONAL) {
    return tasks.filter(task => task.assigneeId === userId || task.createdBy === userId);
  }

  // В пространстве компании:
  if (isAdminRole(userRole)) {
    // Руководитель видит результаты и метрики по всей компании
    return tasks;
  } else {
    // Сотрудник видит только те задачи, где он ответственен за результат
    return tasks.filter(task => task.assigneeId === userId);
  }
};

/**
 * Формирует базовый профиль пользователя при первой регистрации
 */
export const createInitialUserRecord = (uid, email, displayName) => {
  return {
    uid,
    email,
    displayName: displayName || email.split('@')[0],
    role: ROLES.OWNER, // Первый пользователь по умолчанию становится владельцем компании
    activeWorkspace: WORKSPACES.COMPANY,
    createdAt: new Date().toISOString()
  };
};


// ==========================================
