import { BUSINESS_INTENTS, detectBusinessIntent, extractContentTopic, inferContentPlatform } from '../src/domain/businessIntent.js';
import { createBusinessOverviewService } from './_businessOverviewService.mjs';
import { createMetricAggregationService } from './_metricAggregationService.mjs';
import { createContentAgentService } from './_contentAgentService.mjs';
import { createApprovalRepository } from './_approvalRepository.mjs';

const boundedTaskRows = (rows = []) => rows.slice(0, 12).map((task) => ({
  id: task.id,
  title: task.title,
  dueDate: task.dueDate,
  assigneeName: task.assigneeName,
  status: task.status,
  urgent: task.urgent,
  important: task.important,
}));

const prepareContext = (intent, data) => {
  if (intent === BUSINESS_INTENTS.TASK_ANALYSIS) return {
    counts: data.counts,
    overdueByAssignee: data.overdueByAssignee.slice(0, 10),
    overdue: boundedTaskRows(data.overdue),
    priorities: boundedTaskRows(data.priorities),
    withoutAssignee: boundedTaskRows(data.withoutAssignee),
    withoutDeadline: boundedTaskRows(data.withoutDeadline),
  };
  if ([BUSINESS_INTENTS.DAILY_BRIEF, BUSINESS_INTENTS.ATTENTION].includes(intent)) return {
    summary: data.summary,
    requiresAttention: data.requiresAttention,
    today: { counts: data.today.counts, tasks: boundedTaskRows(data.today.tasks), priorities: boundedTaskRows(data.today.priorities) },
    kpis: data.kpis,
    business: data.business,
    recommendations: data.recommendations,
    dataLimitations: data.dataLimitations,
  };
  return data;
};

const answerFromLLM = async ({ provider, question, intent, data }) => {
  const intentGuidance = intent === BUSINESS_INTENTS.KPI_TREND
    ? 'Для KPI сравни текущий и предыдущий периоды. Не советуй улучшать показатель, если он уже достиг 100% или не ухудшился. Если предыдущих данных нет, прямо скажи, что динамику этого показателя оценить нельзя. Не давай общих рекомендаций без подтверждённого отрицательного изменения.'
    : '';
  const response = await provider({
    messages: [
      { role: 'system', content: `Ты AI Business Agent Flow Space. Отвечай кратко по-русски только по переданным структурированным данным. Не придумывай причины, числа, продажи, лиды или KPI. Отсутствие источника называй отсутствием данных. Предлагай действия, но не утверждай, что выполнил их. ${intentGuidance}` },
      { role: 'user', content: JSON.stringify({ question: String(question).slice(0, 2000), intent, data: prepareContext(intent, data) }) },
    ],
    temperature: 0.2,
    max_tokens: 1400,
  });
  return String(response.choices?.[0]?.message?.content || '').trim();
};

export function createBusinessAgentOrchestrator({ db, access, provider }) {
  return {
    async run({ question, options = {} }) {
      const intent = detectBusinessIntent(question);
      const overview = createBusinessOverviewService(access);
      let data;
      if (intent === BUSINESS_INTENTS.CREATE_CONTENT) {
        const platform = options.platform || inferContentPlatform(question);
        const topic = String(options.topic || extractContentTopic(question)).trim();
        if (!topic) return { intent, status: 'needs_input', answer: 'Укажите тему поста, и я подготовлю готовый текст на согласование.', requiredFields: ['topic'], suggestedOptions: { platform } };
        data = await createContentAgentService({ db, access, provider }).generate({
          platform,
          goal: options.goal || 'expert',
          topic,
          tone: options.tone || '',
          cta: options.cta || '',
          variants: options.variants || 1,
        });
        return { intent, status: 'approval_pending', answer: 'Пост готов и отправлен в центр подтверждений.', data };
      }
      if (intent === BUSINESS_INTENTS.TASK_ANALYSIS) data = await overview.taskAnalysis();
      else if (intent === BUSINESS_INTENTS.KPI_TREND) data = await createMetricAggregationService({ db, access }).compare(options.period || 'last_7_days');
      else if (intent === BUSINESS_INTENTS.APPROVALS) {
        const approvals = await createApprovalRepository(db, access.companyId).list({ status: 'pending', limit: 50 });
        data = { approvals: access.membership.role === 'owner' ? approvals : approvals.filter((item) => item.metadata?.departmentId === access.membership.departmentId) };
      } else data = await overview.dailyBrief();
      const answer = await answerFromLLM({ provider, question, intent, data });
      return { intent, status: 'completed', answer, data };
    },
  };
}
