import { buildContentStudioPrompt, normalizeContentPackage, renderPostVariant } from './contentStudioService';

test('Content Studio prompt contains platform and topic', () => {
  const prompt = buildContentStudioPrompt({ platform: 'instagram', goal: 'sales', topic: 'Новый продукт', variants: 2, brandMemory: {} });
  expect(prompt).toContain('Instagram');
  expect(prompt).toContain('Новый продукт');
});

test('normalizes content package and limits variants', () => {
  const data = normalizeContentPackage({
    title: 'Test',
    variants: [1,2,3,4].map((x) => ({ hook: `H${x}`, body: `B${x}`, cta: 'Go', hashtags: ['#x'] })),
    visualPrompt: 'Visual',
    confidence: 'high',
  });
  expect(data.variants).toHaveLength(3);
  expect(data.confidence).toBe('high');
});

test('renders publish-ready post text', () => {
  expect(renderPostVariant({ hook: 'Hook', body: 'Body', cta: 'CTA', hashtags: ['#one'] })).toBe('Hook\n\nBody\n\nCTA\n\n#one');
});

import { buildContentPlanPrompt, normalizeContentPlan } from './contentStudioService';

test('content plan prompt includes period goal', () => {
  const prompt = buildContentPlanPrompt({ platform: 'instagram', topic: 'Запуск продукта', days: 7, brandMemory: {} });
  expect(prompt).toContain('7 дней');
  expect(prompt).toContain('Запуск продукта');
});

test('normalizes content plan and limits items to requested days', () => {
  const data = normalizeContentPlan({
    title: 'Week',
    items: Array.from({ length: 10 }, (_, idx) => ({ day: idx + 1, goal: 'expert', topic: `T${idx}`, brief: `B${idx}` })),
  }, 7);
  expect(data.items).toHaveLength(7);
  expect(data.items[0].day).toBe(1);
});
