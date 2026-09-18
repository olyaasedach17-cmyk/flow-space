// ==========================================
import { isTaskOverdue } from './taskUtils';

/**
 * Расчёт реальных бизнес-метрик (KPI) на основе массива задач
 */
export const calculateCompanyMetrics = (tasks = [], archive = []) => {
  const allTasks = [...tasks, ...archive];
  const totalTasksCount = allTasks.length;

  if (totalTasksCount === 0) {
    return {
      slaScore: 100,
      overdueRate: 0,
      completionRate: 0,
      totalHoursEstimated: 0,
      activeTasksCount: 0,
      doneTasksCount: 0,
      kpis: [
        { id: 'sla', name: 'Соблюдение SLA', score: 100, desc: 'Процент задач, выполненных без просрочки дедлайна' },
        { id: 'completion', name: 'Процент выполнения', score: 0, desc: 'Доля завершенных задач от общего объема' },
        { id: 'overdue', name: 'Уровень просрочки', score: 0, desc: 'Процент активных задач с нарушенным дедлайном' }
      ]
    };
  }

  // 1. Завершённые задачи
  const doneTasks = allTasks.filter(t => t.status === 'done');
  const doneTasksCount = doneTasks.length;
  const completionRate = Math.round((doneTasksCount / totalTasksCount) * 100);

  // 2. Расчет SLA (задачи, закрытые вовремя)
  const doneOnTime = doneTasks.filter(t => {
    if (!t.dueDate) return true; // Без дедлайна — считаем в срок
    if (!t.completedAt) return true;
    return new Date(t.completedAt) <= new Date(`${t.dueDate}T23:59:59`);
  }).length;

  const slaScore = doneTasksCount > 0
    ? Math.round((doneOnTime / doneTasksCount) * 100)
    : 100;

  // 3. Просроченные активные задачи
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const overdueActiveCount = activeTasks.filter(t => isTaskOverdue(t)).length;
  const overdueRate = activeTasks.length > 0
    ? Math.round((overdueActiveCount / activeTasks.length) * 100)
    : 0;

  // 4. Часы в работе
  const totalHoursEstimated = activeTasks.reduce((acc, t) => acc + (parseFloat(t.estimatedHours) || 0), 0);

  // Формируем динамический KPI список для отображения в KpiView
  const kpis = [
    {
      id: 'sla',
      name: 'Соблюдение SLA',
      score: slaScore,
      desc: 'Процент задач, выполненных строго до наступления дедлайна'
    },
    {
      id: 'completion',
      name: 'Завершение проектов',
      score: completionRate,
      desc: 'Отношение выполненных задач к общему бэклогу'
    },
    {
      id: 'overdue',
      name: 'Риск просрочки',
      score: overdueRate,
      desc: 'Процент задач в работе с истёкшим дедлайном'
    }
  ];

  return {
    slaScore,
    completionRate,
    overdueRate,
    totalHoursEstimated,
    activeTasksCount: activeTasks.length,
    doneTasksCount,
    kpis
  };
};


// ==========================================
