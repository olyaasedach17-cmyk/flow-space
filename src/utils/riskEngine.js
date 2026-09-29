import { isTaskOverdue } from './taskUtils.js';

const hours = (task) => Number.parseFloat(task?.estimatedHours) || 0;
const activeOnly = (tasks = []) => tasks.filter((task) => task.status !== 'done');

export const DEFAULT_EXECUTIVE_POLICY = Object.freeze({
  overdueOwnerThreshold: 3,
  slaMinimumPercent: 80,
  workloadTeamHours: 24,
  workloadOwnerHours: 40,
  reviewQueueTeamThreshold: 2,
  repeatedReworkOwnerThreshold: 2,
  urgentMonitorThreshold: 3,
  missingResultTeamThreshold: 1,
  teamRecipient: 'manager',
});

export const normalizeExecutivePolicy = (policy = {}) => {
  const merged = { ...DEFAULT_EXECUTIVE_POLICY, ...(policy || {}) };
  const positiveInt = (value, fallback, min = 1, max = 999) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
  };
  const positiveNumber = (value, fallback, min = 0, max = 9999) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
  };

  const teamHours = positiveNumber(merged.workloadTeamHours, DEFAULT_EXECUTIVE_POLICY.workloadTeamHours, 1, 500);
  const ownerHours = Math.max(
    positiveNumber(merged.workloadOwnerHours, DEFAULT_EXECUTIVE_POLICY.workloadOwnerHours, 1, 500),
    teamHours,
  );

  return {
    overdueOwnerThreshold: positiveInt(merged.overdueOwnerThreshold, DEFAULT_EXECUTIVE_POLICY.overdueOwnerThreshold, 1, 50),
    slaMinimumPercent: positiveInt(merged.slaMinimumPercent, DEFAULT_EXECUTIVE_POLICY.slaMinimumPercent, 1, 100),
    workloadTeamHours: teamHours,
    workloadOwnerHours: ownerHours,
    reviewQueueTeamThreshold: positiveInt(merged.reviewQueueTeamThreshold, DEFAULT_EXECUTIVE_POLICY.reviewQueueTeamThreshold, 1, 50),
    repeatedReworkOwnerThreshold: positiveInt(merged.repeatedReworkOwnerThreshold, DEFAULT_EXECUTIVE_POLICY.repeatedReworkOwnerThreshold, 1, 20),
    urgentMonitorThreshold: positiveInt(merged.urgentMonitorThreshold, DEFAULT_EXECUTIVE_POLICY.urgentMonitorThreshold, 1, 50),
    missingResultTeamThreshold: positiveInt(merged.missingResultTeamThreshold, DEFAULT_EXECUTIVE_POLICY.missingResultTeamThreshold, 1, 50),
    teamRecipient: merged.teamRecipient === 'owner' ? 'owner' : 'manager',
  };
};

const sortBySeverity = (items) => {
  const order = { critical: 3, warning: 2, info: 1 };
  return [...items].sort((a, b) => (order[b.severity] || 0) - (order[a.severity] || 0));
};

const enrichDecision = (item, decisionGroup, ownerReason = '', recipient = '') => ({
  ...item,
  decisionGroup,
  ownerReason,
  recipient: recipient || (decisionGroup === 'owner' ? 'owner' : decisionGroup === 'team' ? 'manager' : 'monitor'),
});

/**
 * Deterministic risk + decision engine for Flow Space.
 * Thresholds are company-configurable. AI can explain only calculated facts.
 */
export const buildExecutiveInsights = (tasks = [], archive = [], assistants = [], policyInput = {}) => {
  const policy = normalizeExecutivePolicy(policyInput);
  const active = activeOnly(tasks);
  const insights = [];
  const teamDecisionGroup = policy.teamRecipient === 'owner' ? 'owner' : 'team';
  const teamRecipient = policy.teamRecipient === 'owner' ? 'owner' : 'manager';

  const overdue = active.filter(isTaskOverdue);
  const slaPercent = active.length === 0 ? 100 : Math.max(0, Math.round(((active.length - overdue.length) / active.length) * 100));
  if (overdue.length > 0) {
    const ownerRequired = overdue.length >= policy.overdueOwnerThreshold || (active.length >= 4 && slaPercent < policy.slaMinimumPercent);
    insights.push(enrichDecision({
      id: 'overdue',
      severity: ownerRequired ? 'critical' : 'warning',
      title: `${overdue.length} ${overdue.length === 1 ? 'результат просрочен' : 'результата просрочены'}`,
      description: ownerRequired
        ? `Соблюдение сроков сейчас около ${slaPercent}%. Нужен выбор: менять приоритет, срок или ресурс.`
        : `Есть обязательство с истёкшим дедлайном. Сначала ситуацию разбирает ${teamRecipient === 'owner' ? 'собственник' : 'руководитель'}.`,
      action: ownerRequired ? 'Принять решение' : 'Открыть задачи',
      taskIds: overdue.map((task) => task.id),
    }, ownerRequired ? 'owner' : teamDecisionGroup, ownerRequired ? 'Просрочка вышла за настроенный компанией порог.' : '', ownerRequired ? 'owner' : teamRecipient));
  }

  const review = active.filter((task) => task.status === 'review');
  if (review.length >= policy.reviewQueueTeamThreshold) {
    insights.push(enrichDecision({
      id: 'review-bottleneck',
      severity: 'warning',
      title: `На проверке накопилось: ${review.length}`,
      description: `Результаты готовы, но решение ещё не принято. Порог компании: ${policy.reviewQueueTeamThreshold}.`,
      action: 'Разобрать проверку',
      taskIds: review.map((task) => task.id),
    }, teamDecisionGroup, '', teamRecipient));
  }

  const missingResult = active.filter((task) => !String(task.expectedResult || '').trim());
  if (missingResult.length >= policy.missingResultTeamThreshold) {
    insights.push(enrichDecision({
      id: 'missing-result',
      severity: 'warning',
      title: `Без ожидаемого результата: ${missingResult.length}`,
      description: 'Такие задачи сложнее принять объективно. Нужно уточнить результат и критерии готовности.',
      action: 'Уточнить результат',
      taskIds: missingResult.map((task) => task.id),
    }, teamDecisionGroup, '', teamRecipient));
  }

  const load = new Map();
  active.forEach((task) => {
    const key = task.assigneeName || task.assigneeId || 'Без исполнителя';
    load.set(key, (load.get(key) || 0) + hours(task));
  });

  const overloaded = [...load.entries()]
    .filter(([, total]) => total >= policy.workloadTeamHours)
    .sort((a, b) => b[1] - a[1]);

  if (overloaded.length > 0) {
    const [name, total] = overloaded[0];
    const ownerRequired = total >= policy.workloadOwnerHours;
    insights.push(enrichDecision({
      id: 'overload',
      severity: ownerRequired ? 'critical' : 'warning',
      title: `Риск перегруза: ${name}`,
      description: ownerRequired
        ? `В активной работе примерно ${Math.round(total)} ч. Порог эскалации собственнику: ${policy.workloadOwnerHours} ч.`
        : `В активной работе примерно ${Math.round(total)} ч. Порог команды: ${policy.workloadTeamHours} ч.`,
      action: ownerRequired ? 'Выбрать приоритет' : 'Проверить нагрузку',
    }, ownerRequired ? 'owner' : teamDecisionGroup, ownerRequired ? 'Нагрузка превысила настроенный owner-порог.' : '', ownerRequired ? 'owner' : teamRecipient));
  }

  const urgent = active.filter((task) => task.urgent);
  if (urgent.length >= policy.urgentMonitorThreshold) {
    insights.push(enrichDecision({
      id: 'urgent-volume',
      severity: 'info',
      title: `Слишком много срочного: ${urgent.length}`,
      description: `Порог наблюдения компании: ${policy.urgentMonitorThreshold}. Это сигнал качества приоритизации.`,
      action: 'Пересмотреть приоритеты',
    }, 'monitor'));
  }

  const rework = [...tasks, ...archive].filter((task) => (Number(task.reopenedCount) || 0) > 0);
  if (rework.length > 0) {
    const repeated = rework.filter((task) => (Number(task.reopenedCount) || 0) >= policy.repeatedReworkOwnerThreshold);
    const ownerRequired = repeated.length > 0;
    insights.push(enrichDecision({
      id: 'rework',
      severity: ownerRequired ? 'critical' : 'warning',
      title: ownerRequired ? `Повторная доработка: ${repeated.length}` : `Возвраты на доработку: ${rework.length}`,
      description: ownerRequired
        ? `Есть результаты с ${policy.repeatedReworkOwnerThreshold}+ возвратами. Нужен выбор: менять постановку, критерии, процесс или ответственность.`
        : 'Есть результаты, которые не приняли с первой попытки. Нужно проверить критерии готовности и обратную связь.',
      action: ownerRequired ? 'Разобрать причину' : 'Разобрать качество',
      taskIds: rework.map((task) => task.id),
    }, ownerRequired ? 'owner' : teamDecisionGroup, ownerRequired ? 'Переделки превысили настроенный компанией owner-порог.' : '', ownerRequired ? 'owner' : teamRecipient));
  }

  const done = [...tasks, ...archive].filter((task) => task.status === 'done');
  const acceptedWithoutRework = done.filter((task) => (Number(task.reopenedCount) || 0) === 0).length;
  const sorted = sortBySeverity(insights);
  const ownerItems = sorted.filter((item) => item.decisionGroup === 'owner');
  const teamItems = sorted.filter((item) => item.decisionGroup === 'team');
  const monitorItems = sorted.filter((item) => item.decisionGroup === 'monitor');

  return {
    items: sorted.slice(0, 8),
    ownerItems,
    teamItems,
    monitorItems,
    ownerDecisionCount: ownerItems.length,
    teamActionCount: teamItems.length,
    monitorCount: monitorItems.length,
    attentionCount: ownerItems.length + teamItems.length,
    healthyCount: Math.max(active.length - overdue.length - missingResult.length, 0),
    workloadByAssignee: [...load.entries()].map(([name, totalHours]) => ({ name, totalHours })),
    acceptedWithoutRework,
    teamSize: assistants.length,
    slaPercent,
    policy,
  };
};
