const dateKey = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

const dueTime = (value) => {
  if (!value) return NaN;
  const date = new Date(String(value).length <= 10 ? `${value}T23:59:59` : value);
  return date.getTime();
};

const title = (task) => String(task?.text || task?.title || 'Без названия').slice(0, 240);
const taskView = (task) => ({
  id: task.id,
  title: title(task),
  dueDate: task.dueDate || '',
  assigneeId: task.assigneeId || '',
  assigneeName: task.assigneeName || '',
  departmentId: task.departmentId || '',
  urgent: Boolean(task.urgent),
  important: Boolean(task.important),
  status: task.status || 'todo',
});

export function analyzeCompanyTasks(tasks = [], { now = new Date(), priorityLimit = 10 } = {}) {
  const active = tasks.filter((task) => task.status !== 'done');
  const todayKey = dateKey(now);
  const overdue = active.filter((task) => Number.isFinite(dueTime(task.dueDate)) && dueTime(task.dueDate) < now.getTime());
  const dueToday = active.filter((task) => dateKey(task.dueDate) === todayKey);
  const withoutAssignee = active.filter((task) => !String(task.assigneeId || '').trim());
  const withoutDeadline = active.filter((task) => !String(task.dueDate || '').trim());
  const highPriority = active.filter((task) => task.urgent || task.important);
  const overdueByAssignee = new Map();
  overdue.forEach((task) => {
    const key = task.assigneeId || 'unassigned';
    const row = overdueByAssignee.get(key) || { assigneeId: task.assigneeId || '', assigneeName: task.assigneeName || 'Без ответственного', count: 0, taskIds: [] };
    row.count += 1;
    row.taskIds.push(task.id);
    overdueByAssignee.set(key, row);
  });
  const score = (task) => (overdue.includes(task) ? 100 : 0) + (task.urgent ? 40 : 0) + (task.important ? 20 : 0) + (dueToday.includes(task) ? 10 : 0);
  const priorities = [...active].sort((a, b) => score(b) - score(a) || dueTime(a.dueDate) - dueTime(b.dueDate)).slice(0, priorityLimit);
  return {
    generatedAt: now.toISOString(),
    counts: {
      active: active.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      highPriority: highPriority.length,
      withoutAssignee: withoutAssignee.length,
      withoutDeadline: withoutDeadline.length,
    },
    dueToday: dueToday.map(taskView),
    overdue: overdue.map(taskView),
    highPriority: highPriority.map(taskView),
    withoutAssignee: withoutAssignee.map(taskView),
    withoutDeadline: withoutDeadline.map(taskView),
    overdueByAssignee: [...overdueByAssignee.values()].sort((a, b) => b.count - a.count),
    priorities: priorities.map(taskView),
  };
}
