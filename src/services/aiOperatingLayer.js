export const AI_CONTEXT_SCOPES = {
  COMPANY_PROFILE: 'company_profile',
  BRAND: 'brand',
  TASK: 'task',
  SOP: 'sop',
  KPI: 'kpi',
};

export const AI_AGENT_PROFILES = {
  copywriter: { scopes: ['company_profile', 'brand', 'task', 'sop'], canDraft: true, canAnalyzeKpi: false },
  smm: { scopes: ['company_profile', 'brand', 'task', 'sop'], canDraft: true, canAnalyzeKpi: false },
  sales: { scopes: ['company_profile', 'brand', 'task', 'sop'], canDraft: true, canAnalyzeKpi: true },
  consultant: { scopes: ['company_profile', 'task', 'sop', 'kpi'], canDraft: true, canAnalyzeKpi: true },
  lawyer: { scopes: ['company_profile', 'task', 'sop'], canDraft: true, canAnalyzeKpi: false, disclaimer: 'Черновик не заменяет профессиональную юридическую проверку.' },
  hr: { scopes: ['company_profile', 'brand', 'task', 'sop'], canDraft: true, canAnalyzeKpi: false },
  analyst: { scopes: ['company_profile', 'task', 'kpi'], canDraft: false, canAnalyzeKpi: true },
  operations: { scopes: ['company_profile', 'task', 'sop', 'kpi'], canDraft: true, canAnalyzeKpi: true },
};

export const normalizeAIMemory = (memory = {}) => ({
  companyDescription: String(memory.companyDescription || '').slice(0, 2500),
  products: String(memory.products || '').slice(0, 2500),
  audience: String(memory.audience || '').slice(0, 1800),
  toneOfVoice: String(memory.toneOfVoice || '').slice(0, 1800),
  brandRules: String(memory.brandRules || '').slice(0, 2500),
  constraints: String(memory.constraints || '').slice(0, 2200),
});

export const getAgentProfile = (agentId) => AI_AGENT_PROFILES[agentId] || AI_AGENT_PROFILES.operations;

export const formatAIValue = (value) => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(formatAIValue).filter(Boolean).map(x => `• ${x}`).join('\n');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${formatAIValue(item)}`).join('\n');
  return String(value);
};

export const validateStructuredAIResult = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result = formatAIValue(value.result ?? value.output ?? '').trim();
  if (!result) return null;
  return {
    expectedResult: String(value.expectedResult || '').trim(),
    result,
    criteria: Array.isArray(value.criteria) ? value.criteria.map(String).filter(Boolean).slice(0, 10) : [],
    risks: Array.isArray(value.risks) ? value.risks.map(String).filter(Boolean).slice(0, 8) : [],
    assumptions: Array.isArray(value.assumptions) ? value.assumptions.map(String).filter(Boolean).slice(0, 8) : [],
    nextActions: Array.isArray(value.nextActions) ? value.nextActions.map(String).filter(Boolean).slice(0, 8) : [],
    confidence: ['high', 'medium', 'low'].includes(value.confidence) ? value.confidence : 'medium',
  };
};

export const renderStructuredAIResult = (result) => {
  if (!result) return '';
  const lines = [];
  if (result.expectedResult) lines.push(`ОЖИДАЕМЫЙ РЕЗУЛЬТАТ\n${result.expectedResult}`);
  lines.push(`ГОТОВЫЙ МАТЕРИАЛ / РЕШЕНИЕ\n${result.result}`);
  if (result.criteria?.length) lines.push(`КРИТЕРИИ ПРОВЕРКИ\n${result.criteria.map((x) => `• ${x}`).join('\n')}`);
  if (result.risks?.length) lines.push(`РИСКИ\n${result.risks.map((x) => `• ${x}`).join('\n')}`);
  if (result.assumptions?.length) lines.push(`ДОПУЩЕНИЯ / НЕДОСТАЮЩИЕ ДАННЫЕ\n${result.assumptions.map((x) => `• ${x}`).join('\n')}`);
  if (result.nextActions?.length) lines.push(`СЛЕДУЮЩИЕ ДЕЙСТВИЯ\n${result.nextActions.map((x) => `• ${x}`).join('\n')}`);
  lines.push(`УВЕРЕННОСТЬ: ${result.confidence}`);
  return lines.join('\n\n');
};

export const extractReadyMaterial = (value) => {
  const source = formatAIValue(value).trim();
  const marker = /ГОТОВЫЙ МАТЕРИАЛ\s*(?:\/\s*РЕШЕНИЕ)?\s*\n/i.exec(source);
  if (!marker) return source;
  const material = source.slice(marker.index + marker[0].length);
  const nextSection = /\n\s*(?:КРИТЕРИИ ПРОВЕРКИ|РИСКИ|ДОПУЩЕНИЯ\s*\/\s*НЕДОСТАЮЩИЕ ДАННЫЕ|СЛЕДУЮЩИЕ ДЕЙСТВИЯ|УВЕРЕННОСТЬ)(?:\s|:|$)/i.exec(material);
  return material.slice(0, nextSection?.index ?? material.length).trim().replace(/\*\*([^*]+)\*\*/g, '$1');
};

export const extractPublicationText = extractReadyMaterial;

const AGENT_BY_NEED = [
  [/текст|пост|лендинг|письм|оффер|слоган|копира|презентац|слайд/i, 'copywriter'],
  [/контент|соцсет|smm|instagram|telegram|публикац/i, 'smm'],
  [/продаж|клиент|лид|коммерческ|кп|возраж/i, 'sales'],
  [/договор|юрид|политик|соглашен|право/i, 'lawyer'],
  [/ваканси|найм|сотрудник|онбординг|hr|интервью/i, 'hr'],
  [/kpi|метрик|аналит|динамик|отчет|отчёт|таблиц|google sheets|excel|csv/i, 'analyst'],
  [/процесс|регламент|sop|операцион|узкое место/i, 'operations'],
];

export const planAICollaboration = (goal, availableAgents = []) => {
  const text = String(goal || '');
  const ids = [];
  for (const [pattern, id] of AGENT_BY_NEED) {
    if (pattern.test(text) && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) ids.push('consultant');
  const allowed = new Set(availableAgents.map((a) => a.id));
  const selected = ids.filter((id) => allowed.has(id)).slice(0, 4);
  return selected.length ? selected : availableAgents.slice(0, 1).map((a) => a.id);
};
