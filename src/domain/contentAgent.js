const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
const clean = (value, limit = 4000) => String(value || '').trim().slice(0, limit);

export const CONTENT_PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
];

export const CONTENT_GOALS = [
  { id: 'sales', label: 'Продажа' },
  { id: 'expert', label: 'Экспертный пост' },
  { id: 'warmup', label: 'Прогрев' },
  { id: 'announcement', label: 'Анонс' },
  { id: 'engagement', label: 'Вовлечение' },
];

export const buildContentAgentPrompt = ({ platform, goal, topic, tone, cta, variants = 2, brandMemory = {} }) => {
  const count = clamp(variants, 1, 3);
  const platformLabel = CONTENT_PLATFORMS.find((x) => x.id === platform)?.label || platform;
  const goalLabel = CONTENT_GOALS.find((x) => x.id === goal)?.label || goal;
  return `Ты — Content Agent внутри Flow Space. Создай полностью готовый пакет публикации.

Площадка: ${platformLabel}
Цель: ${goalLabel}
Тема: ${clean(topic, 2500)}
Тон: ${clean(tone, 500) || 'следовать tone of voice бренда'}
CTA: ${clean(cta, 500) || 'подбери уместный CTA'}
Количество вариантов текста: ${count}

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
- Не выдумывай факты о компании, ценах, клиентах, результатах или продукте.
- Если фактов не хватает, используй нейтральные формулировки и отметь допущения.
- Текст должен быть готов к публикации.
- Для Instagram не перегружай хэштегами.
- visualPrompt описывает один выразительный визуал без текстовых надписей, если они не требуются темой.

Верни ТОЛЬКО валидный JSON:
{"title":"...","strategy":"...","variants":[{"hook":"...","body":"...","cta":"...","hashtags":["#пример"]}],"visualPrompt":"...","carousel":["..."],"assumptions":[],"confidence":"high|medium|low"}`;
};

export const normalizeContentPackage = (raw) => {
  if (!raw || typeof raw !== 'object') throw new Error('AI не вернул пакет публикации');
  const variants = Array.isArray(raw.variants) ? raw.variants.slice(0, 3).map((item) => ({
    hook: clean(item?.hook, 500),
    body: clean(item?.body, 8000),
    cta: clean(item?.cta, 1000),
    hashtags: Array.isArray(item?.hashtags) ? item.hashtags.map((x) => clean(x, 80)).filter(Boolean).slice(0, 20) : [],
  })).filter((item) => item.body || item.hook) : [];
  if (!variants.length) throw new Error('AI не создал текст публикации');
  return {
    title: clean(raw.title, 500) || 'Готовая публикация',
    strategy: clean(raw.strategy, 2000),
    variants,
    visualPrompt: clean(raw.visualPrompt, 6000),
    carousel: Array.isArray(raw.carousel) ? raw.carousel.map((x) => clean(x, 1200)).filter(Boolean).slice(0, 10) : [],
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map((x) => clean(x, 1000)).filter(Boolean).slice(0, 10) : [],
    confidence: ['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'medium',
  };
};

export const renderPostVariant = (variant) => [variant?.hook, variant?.body, variant?.cta, (variant?.hashtags || []).join(' ')].filter(Boolean).join('\n\n').trim();
