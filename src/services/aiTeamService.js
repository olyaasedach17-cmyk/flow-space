import { callServerAI, safeParseAIJSON } from './aiService';
import {
  getAgentProfile,
  normalizeAIMemory,
  validateStructuredAIResult,
  renderStructuredAIResult,
  planAICollaboration,
} from './aiOperatingLayer';

const truncate = (value, limit = 6000) => String(value || '').slice(0, limit);

export const buildAIContext = ({ company, task, sop, agent }) => {
  const profile = getAgentProfile(agent?.id);
  const scopes = new Set(profile.scopes || []);
  const memory = normalizeAIMemory(company?.settings?.aiMemory || {});

  const companyBlock = scopes.has('company_profile') ? {
    name: company?.name || 'Компания',
    description: memory.companyDescription,
    products: memory.products,
    audience: memory.audience,
    constraints: memory.constraints,
  } : null;

  const brandBlock = scopes.has('brand') ? {
    toneOfVoice: memory.toneOfVoice,
    brandRules: memory.brandRules,
  } : null;

  const kpiBlock = scopes.has('kpi') ? (company?.kpis || []).slice(0, 25) : null;

  const taskBlock = scopes.has('task') && task ? {
    id: task.id,
    title: task.text,
    description: truncate(task.description, 3000),
    expectedResult: truncate(task.expectedResult, 2000),
    successCriteria: task.successCriteria || [],
    dueDate: task.dueDate || '',
    status: task.status || 'todo',
  } : null;

  const sopBlock = scopes.has('sop') && sop ? {
    id: sop.id,
    title: sop.title,
    purpose: sop.purpose || '',
    steps: sop.steps || [],
    criteria: sop.criteria || [],
    ownerName: sop.ownerName || '',
    version: Number(sop.version) || 1,
    content: truncate(sop.content, 5000),
  } : null;

  return { company: companyBlock, brand: brandBlock, kpis: kpiBlock, task: taskBlock, sop: sopBlock, agent: { id: agent?.id, label: agent?.label }, permissions: profile };
};

const systemForAgent = (agent, context) => `Ты — ${agent?.label || 'AI-специалист'} внутри Flow Space. ${agent?.description || ''}

Философия Flow Space: «Контролируй результат, а не каждый шаг».
Ты работаешь как участник операционной системы, а не как общий чат.
Используй ТОЛЬКО переданный контекст. Не выдумывай внутренние факты, цифры, клиентов, правила или результаты компании.
Если данных не хватает, явно перечисли допущения. Не выдавай предположение за факт.
Если пользователь просит публикацию, помести в result только готовый текст для читателя: без служебных заголовков и Markdown-разметки. Не добавляй хэштеги, если их не просили. Никогда не придумывай брендовые хэштеги, имена брендов или аккаунтов — используй их только когда они явно есть в контексте.
${getAgentProfile(agent?.id)?.disclaimer || ''}

Верни ТОЛЬКО валидный JSON без Markdown:
{
  "expectedResult": "что должно быть получено",
  "result": "готовый рабочий материал или решение",
  "criteria": ["как проверить результат"],
  "risks": ["риски или ограничения"],
  "assumptions": ["что пришлось предположить или чего не хватает"],
  "nextActions": ["следующий конкретный шаг"],
  "confidence": "high|medium|low"
}

Контекст:
${JSON.stringify(context, null, 2)}`;

export const runAISpecialist = async ({ agent, topic, company, task, sop, history = [] }) => {
  const context = buildAIContext({ company, task, sop, agent });
  const recentHistory = history.slice(-6).map((m) => ({ role: m.role, content: truncate(m.content, 5000) }));
  const response = await callServerAI({
    temperature: 0.35,
    messages: [
      { role: 'system', content: systemForAgent(agent, context) },
      ...recentHistory,
      { role: 'user', content: truncate(topic, 6000) },
    ],
  });

  const raw = response?.choices?.[0]?.message?.content?.trim() || '';
  let structured = null;
  try {
    structured = validateStructuredAIResult(safeParseAIJSON(raw));
  } catch {
    structured = null;
  }
  if (!structured) {
    structured = {
      expectedResult: task?.expectedResult || '',
      result: raw || 'AI не вернул результат.',
      criteria: [], risks: [], assumptions: ['Ответ не прошёл структурную проверку. Проверьте материал вручную.'], nextActions: [], confidence: 'low'
    };
  }
  return { ...response, flowSpace: structured, displayText: renderStructuredAIResult(structured) };
};

export const runAIOrchestrator = async ({ goal, agents, company, task, sop }) => {
  const agentIds = planAICollaboration(goal, agents);
  const selectedAgents = agentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean);
  const plan = selectedAgents.map((agent, index) => ({
    order: index + 1,
    agentId: agent.id,
    agentLabel: agent.label,
    assignment: `Внести вклад в цель: ${goal}`,
  }));
  return { goal, plan };
};

export const buildAIExecutionRecord = ({ agentId, agentLabel, output, structuredOutput, taskId, sopId, userId }) => ({
  id: `ai_exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  agentId,
  agentLabel,
  output: String(output || '').trim(),
  structuredOutput: structuredOutput || null,
  taskId: taskId || null,
  sopId: sopId || null,
  createdBy: userId || null,
  createdAt: new Date().toISOString(),
});
