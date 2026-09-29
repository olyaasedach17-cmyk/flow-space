export const BUSINESS_INTENTS = Object.freeze({
  DAILY_BRIEF: 'daily_brief',
  TASK_ANALYSIS: 'task_analysis',
  ATTENTION: 'attention',
  KPI_TREND: 'kpi_trend',
  CREATE_CONTENT: 'create_content',
  APPROVALS: 'approvals',
});

export function detectBusinessIntent(question = '') {
  const text = String(question).trim().toLowerCase();
  if (/(пост|публикац|контент).*(instagram|инстаграм|telegram|телеграм|facebook|linkedin)|(?:сделай|напиши|создай).*(пост|публикац)/i.test(text)) return BUSINESS_INTENTS.CREATE_CONTENT;
  if (/(согласован|подтвержден|approval|одобр)/i.test(text)) return BUSINESS_INTENTS.APPROVALS;
  if (/(kpi|показател).*(недел|измен|динамик)|как изменились/i.test(text)) return BUSINESS_INTENTS.KPI_TREND;
  if (/(просроч|без ответственного|без дедлайн|приоритет.*день)/i.test(text)) return BUSINESS_INTENTS.TASK_ANALYSIS;
  if (/(внимани|риск|проблем|где нужен)/i.test(text)) return BUSINESS_INTENTS.ATTENTION;
  return BUSINESS_INTENTS.DAILY_BRIEF;
}

export function inferContentPlatform(question = '') {
  const text = String(question).toLowerCase();
  if (/телеграм|telegram/.test(text)) return 'telegram';
  if (/facebook|фейсбук/.test(text)) return 'facebook';
  if (/linkedin|линкедин/.test(text)) return 'linkedin';
  return 'instagram';
}

export function extractContentTopic(question = '') {
  const text = String(question).trim();
  const match = text.match(/(?:на тему|про)\s+[«"']?(.+?)[»"']?[.!?]*$/i);
  return match ? match[1].trim().slice(0, 1000) : '';
}
