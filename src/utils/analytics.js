import { isTaskOverdue } from './taskUtils.js';

const pluralRu = (count, one, few, many) => {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

/**
 * Реальные управленческие метрики Flow Space.
 * Quality считается по принятым результатам, а не по количеству закрытых галочек.
 */
export const calculateCompanyMetrics = (tasks = [], archive = []) => {
  const allTasks = [...tasks, ...archive];
  const totalTasksCount = allTasks.length;
  const doneTasks = allTasks.filter((task) => task.status === 'done');
  const doneTasksCount = doneTasks.length;
  const activeTasks = tasks.filter((task) => task.status !== 'done');

  const completionRate = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;
  const slaEligibleTasks = doneTasks.filter((task) => task.dueDate && task.completedAt);
  const doneOnTime = slaEligibleTasks.filter((task) => new Date(task.completedAt) <= new Date(`${task.dueDate}T23:59:59`)).length;
  const slaScore = slaEligibleTasks.length > 0 ? Math.round((doneOnTime / slaEligibleTasks.length) * 100) : 100;

  const overdueActiveCount = activeTasks.filter((task) => isTaskOverdue(task)).length;
  const overdueRate = activeTasks.length > 0 ? Math.round((overdueActiveCount / activeTasks.length) * 100) : 0;
  const totalHoursEstimated = activeTasks.reduce((acc, task) => acc + (parseFloat(task.estimatedHours) || 0), 0);
  const awaitingReviewCount = activeTasks.filter((task) => task.status === 'review').length;

  const reviewedDone = doneTasks.filter((task) => (Number(task.reviewAttempts) || 0) > 0 || task.acceptedAt);
  const acceptedFirstTry = reviewedDone.filter((task) => (Number(task.reopenedCount) || 0) === 0).length;
  const qualityScore = reviewedDone.length > 0 ? Math.round((acceptedFirstTry / reviewedDone.length) * 100) : 100;
  const reworkCount = allTasks.filter((task) => (Number(task.reopenedCount) || 0) > 0).length;
  const reworkRate = doneTasksCount > 0 ? Math.round((doneTasks.filter((task) => (Number(task.reopenedCount) || 0) > 0).length / doneTasksCount) * 100) : 0;

  const kpis = [
    { id: 'sla', name: 'Соблюдение SLA', score: slaScore, sampleSize: slaEligibleTasks.length, desc: 'Доля принятых результатов с дедлайном, завершённых в срок' },
    { id: 'quality', name: 'Качество с первого раза', score: qualityScore, sampleSize: reviewedDone.length, desc: 'Доля результатов, принятых без возврата на доработку' },
    { id: 'completion', name: 'Завершение', score: completionRate, sampleSize: totalTasksCount, desc: 'Доля принятых результатов от общего объёма задач' },
    { id: 'overdue', name: 'Просрочено сейчас', score: overdueRate, sampleSize: activeTasks.length, desc: 'Доля активных задач с истёкшим дедлайном' },
  ];

  let managementReading;
  if (totalTasksCount === 0) {
    managementReading = {
      tone: 'neutral',
      title: 'Данных для управленческой оценки пока нет',
      meaning: 'Создайте первую рабочую задачу с ожидаемым результатом и сроком.',
      action: 'После приёмки результата появятся SLA и качество с первого раза.',
    };
  } else if (overdueActiveCount > 0) {
    managementReading = {
      tone: 'danger',
      title: 'Сроки требуют внимания',
      meaning: `${overdueActiveCount} из ${activeTasks.length} активных задач просрочено.`,
      action: 'Определите новый срок, снимите блокировку или измените приоритет.',
    };
  } else if (awaitingReviewCount > 0) {
    managementReading = {
      tone: 'warning',
      title: 'Есть результаты, ожидающие решения',
      meaning: `${awaitingReviewCount} ${pluralRu(awaitingReviewCount, 'результат ждёт', 'результата ждут', 'результатов ждут')} проверки руководителя.`,
      action: 'Примите результат или верните его с конкретным комментарием.',
    };
  } else if (reworkCount > 0) {
    managementReading = {
      tone: 'warning',
      title: 'Есть повторные доработки',
      meaning: `${reworkCount} ${pluralRu(reworkCount, 'задача возвращалась', 'задачи возвращались', 'задач возвращались')} на доработку.`,
      action: 'Проверьте критерии готовности и повторяющуюся причину возвратов.',
    };
  } else {
    managementReading = {
      tone: 'success',
      title: 'Критических отклонений не найдено',
      meaning: `${activeTasks.length} ${pluralRu(activeTasks.length, 'активная задача', 'активные задачи', 'активных задач')}, просрочек нет. Плановая нагрузка — ${Number(totalHoursEstimated.toFixed(1))} ч.`,
      action: doneTasksCount > 0 ? 'Продолжайте контролировать результаты по срокам и качеству.' : 'Первые показатели качества появятся после приёмки результата.',
    };
  }

  return {
    slaScore,
    slaSampleSize: slaEligibleTasks.length,
    qualityScore,
    reworkRate,
    reworkCount,
    completionRate,
    overdueRate,
    overdueActiveCount,
    awaitingReviewCount,
    totalHoursEstimated,
    activeTasksCount: activeTasks.length,
    doneTasksCount,
    reviewedDoneCount: reviewedDone.length,
    managementReading,
    kpis,
  };
};
