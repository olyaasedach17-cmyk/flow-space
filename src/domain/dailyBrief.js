import { calculateCompanyMetrics } from '../utils/analytics.js';
import { buildExecutiveInsights } from '../utils/riskEngine.js';
import { analyzeCompanyTasks } from './taskAnalysis.js';

const configuredKpis = (company) => (Array.isArray(company?.kpis) ? company.kpis : []).slice(0, 20).map((item) => ({
  id: item.id || item.name || item.label,
  name: String(item.name || item.label || 'KPI').slice(0, 160),
  value: item.value ?? item.current ?? item.score ?? null,
  target: item.target ?? null,
  unit: String(item.unit || '').slice(0, 30),
  source: 'company_settings',
}));

const happenedBetween = (value, start, end) => {
  const date = value ? new Date(value) : null;
  return Boolean(date && !Number.isNaN(date.getTime()) && date >= start && date < end);
};

const operationalChanges = (tasks, archive, now) => {
  const currentEnd = new Date(now);
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 7);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 7);
  const rows = [...tasks, ...archive];
  const count = (field, start, end) => rows.filter((task) => happenedBetween(task[field], start, end)).length;
  const metrics = [
    ['tasks_created', 'Создано задач', 'createdAt'],
    ['tasks_completed', 'Принято результатов', 'completedAt'],
  ];
  return metrics.map(([id, name, field]) => {
    const value = count(field, currentStart, currentEnd);
    const previousValue = count(field, previousStart, currentStart);
    return { id, name, value, previousValue, delta: value - previousValue, period: 'last_7_days', source: 'flow_space' };
  });
};

export function buildDailyBrief({ company = {}, tasks = [], archive = [], assistants = [], now = new Date() }) {
  const analysis = analyzeCompanyTasks(tasks, { now });
  const metrics = calculateCompanyMetrics(tasks, archive);
  const risks = buildExecutiveInsights(tasks, archive, assistants, company?.settings?.executivePolicy);
  const requiresAttention = [
    ...risks.ownerItems,
    ...risks.teamItems,
  ].slice(0, 5);
  const recommendations = requiresAttention.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.action || item.title,
    reason: item.description,
    proposedAction: { type: 'review_tasks', taskIds: item.taskIds || [] },
  }));
  if (analysis.withoutAssignee.length) recommendations.push({
    id: 'assign-owner',
    title: 'Назначить ответственных',
    reason: `${analysis.withoutAssignee.length} задач без ответственного.`,
    proposedAction: { type: 'review_tasks', taskIds: analysis.withoutAssignee.map((task) => task.id) },
  });
  const summary = analysis.overdue.length || risks.ownerDecisionCount
    ? `Требуют внимания: ${analysis.overdue.length} просрочено, ${risks.ownerDecisionCount} решений собственника.`
    : risks.teamActionCount
      ? `В целом всё по плану. Команда решает ${risks.teamActionCount} ${risks.teamActionCount === 1 ? 'рабочий вопрос' : 'рабочих вопроса'} без вашего вмешательства.`
      : `Работа идёт по плану: ${analysis.dueToday.length} задач на сегодня, отклонений не найдено.`;
  return {
    generatedAt: now.toISOString(),
    companyId: company.id || company.companyId || '',
    summary,
    requiresAttention,
    today: {
      tasks: analysis.dueToday,
      priorities: analysis.priorities.slice(0, 5),
      counts: analysis.counts,
    },
    kpis: {
      operational: metrics.kpis,
      configured: configuredKpis(company),
      latestChanges: operationalChanges(tasks, archive, now),
    },
    business: {
      sales: { available: false, reason: 'Источник продаж не подключён.' },
      leads: { available: false, reason: 'Источник лидов не подключён.' },
    },
    recommendations: recommendations.slice(0, 4),
    decisionStatus: {
      onTrackCount: risks.healthyCount,
      teamActionCount: risks.teamActionCount,
      ownerDecisionCount: risks.ownerDecisionCount,
    },
    taskAnalysis: analysis,
    dataLimitations: [
      'Отчёт использует только данные Flow Space.',
      'Изменения операционных показателей рассчитаны по задачам за последние 7 дней; история настроенных KPI появится после накопления метрик.',
      'Продажи и лиды не считаются нулевыми: источник пока не подключён.',
    ],
  };
}
