import { callServerAI, safeParseAIJSON } from './aiService';
import { generateAIImage } from './imageService';
import { CONTENT_GOALS, CONTENT_PLATFORMS, buildContentAgentPrompt as buildContentStudioPrompt, normalizeContentPackage, renderPostVariant } from '../domain/contentAgent';

export { CONTENT_GOALS, CONTENT_PLATFORMS, buildContentStudioPrompt, normalizeContentPackage, renderPostVariant };

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
const clean = (value, limit = 4000) => String(value || '').trim().slice(0, limit);

export async function generateContentPackage(input) {
  const prompt = buildContentStudioPrompt(input);
  const response = await callServerAI({
    temperature: 0.55,
    messages: [
      { role: 'system', content: 'Ты Content Studio внутри Flow Space. Выполняй задачу как SMM-стратег и копирайтер. Возвращай только JSON.' },
      { role: 'user', content: prompt },
    ],
  });
  const raw = response?.choices?.[0]?.message?.content || '';
  let parsed;
  try {
    parsed = safeParseAIJSON(raw);
  } catch (error) {
    throw new Error(`Не удалось разобрать результат AI: ${error.message}`);
  }
  return normalizeContentPackage(parsed);
}

export async function generateContentVisual({ packageData, size = '1024x1536', quality = 'medium' }) {
  if (!packageData?.visualPrompt) throw new Error('AI не подготовил описание визуала');
  return generateAIImage({ prompt: packageData.visualPrompt, size, quality });
}



export const buildContentPlanPrompt = ({
  platform,
  topic,
  days = 7,
  tone,
  brandMemory = {},
}) => {
  const count = clamp(days, 3, 14);
  const platformLabel = CONTENT_PLATFORMS.find((x) => x.id === platform)?.label || platform;
  return `Ты — AI-SMM стратег внутри Flow Space. Составь практичный контент-план, который затем будет автоматически превращён в готовые публикации.

Площадка: ${platformLabel}
Период: ${count} дней
Главная тема/цель периода: ${clean(topic, 2500)}
Тон: ${clean(tone, 500) || 'следовать tone of voice бренда'}

Память бренда:
${JSON.stringify({
    companyDescription: clean(brandMemory.companyDescription, 1500),
    products: clean(brandMemory.products, 1500),
    audience: clean(brandMemory.audience, 1500),
    toneOfVoice: clean(brandMemory.toneOfVoice, 1000),
    brandRules: clean(brandMemory.brandRules, 1500),
    constraints: clean(brandMemory.constraints, 1500),
  }, null, 2)}

Правила:
- План должен чередовать пользу, доверие, вовлечение и коммерческие публикации.
- Не выдумывай факты, цены, кейсы или отзывы.
- Каждый день должен иметь конкретную тему и понятную цель.
- brief должен быть достаточным, чтобы AI-копирайтер мог по нему сразу написать готовый пост.
- visualDirection — идея одного визуала без надписей, если текст на изображении не обязателен.

Верни ТОЛЬКО валидный JSON:
{
  "title": "название контент-плана",
  "strategy": "краткая стратегия периода",
  "items": [
    {
      "day": 1,
      "goal": "sales|expert|warmup|announcement|engagement",
      "topic": "тема поста",
      "brief": "что именно раскрыть в публикации",
      "cta": "какое действие предложить",
      "visualDirection": "идея визуала"
    }
  ]
}`;
};

export const normalizeContentPlan = (raw, days = 7) => {
  if (!raw || typeof raw !== 'object') throw new Error('AI не вернул контент-план');
  const count = clamp(days, 3, 14);
  const validGoals = new Set(CONTENT_GOALS.map((x) => x.id));
  const items = Array.isArray(raw.items)
    ? raw.items.slice(0, count).map((item, idx) => ({
        day: idx + 1,
        goal: validGoals.has(item?.goal) ? item.goal : 'expert',
        topic: clean(item?.topic, 700),
        brief: clean(item?.brief, 3000),
        cta: clean(item?.cta, 700),
        visualDirection: clean(item?.visualDirection, 2000),
      })).filter((item) => item.topic && item.brief)
    : [];
  if (!items.length) throw new Error('AI не создал пункты контент-плана');
  return {
    title: clean(raw.title, 500) || `Контент-план на ${items.length} дней`,
    strategy: clean(raw.strategy, 2500),
    items,
  };
};

export async function generateContentPlan(input) {
  const prompt = buildContentPlanPrompt(input);
  const response = await callServerAI({
    temperature: 0.45,
    messages: [
      { role: 'system', content: 'Ты Content Planner внутри Flow Space. Возвращай только JSON и не выдумывай факты о бизнесе. Не придумывай скидки, акции, цены, наличие товара и обещания результата. Если предложение не подтверждено контекстом, формулируй его только как гипотезу для согласования, без конкретных цифр.' },
      { role: 'user', content: prompt },
    ],
  });
  const raw = response?.choices?.[0]?.message?.content || '';
  let parsed;
  try { parsed = safeParseAIJSON(raw); }
  catch (error) { throw new Error(`Не удалось разобрать контент-план: ${error.message}`); }
  return normalizeContentPlan(parsed, input.days);
}

