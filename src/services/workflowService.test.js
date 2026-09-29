import { normalizeSheetValues, validateWorkflowResult } from './workflowService';

test('normalizeSheetValues limits rows, columns and cell size', () => {
  const rows = Array.from({ length: 300 }, (_, i) => Array.from({ length: 40 }, (_, j) => `${i}-${j}-${'x'.repeat(600)}`));
  const normalized = normalizeSheetValues(rows);
  expect(normalized).toHaveLength(250);
  expect(normalized[0]).toHaveLength(30);
  expect(normalized[0][0].length).toBeLessThanOrEqual(500);
});

test('validateWorkflowResult creates safe artifact structure', () => {
  const result = validateWorkflowResult({
    title: 'Продажи',
    summary: 'Выручка выросла.',
    insights: ['Рост 10%'],
    recommendations: ['Усилить канал'],
    slides: [{ title: 'Итог', bullets: ['Рост'] }],
    reportSections: [{ heading: 'Итог', body: 'Текст' }],
    socialPost: { caption: 'Пост', hashtags: ['#sales'] },
    confidence: 'high',
  });
  expect(result.title).toBe('Продажи');
  expect(result.slides[0].title).toBe('Итог');
  expect(result.socialPost.caption).toBe('Пост');
  expect(result.confidence).toBe('high');
});

test('validateWorkflowResult rejects missing summary', () => {
  expect(validateWorkflowResult({ title: 'Нет вывода' })).toBeNull();
});
