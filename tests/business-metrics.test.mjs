import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentAgentPrompt, normalizeContentPackage, renderPostVariant } from '../src/domain/contentAgent.js';
import { metricPeriodWindow } from '../api/_metricAggregationService.mjs';
import { flowSpaceMetricProvider } from '../api/_metricProviders.mjs';

test('content agent uses brand context and produces ready post text', () => {
  const prompt = buildContentAgentPrompt({ platform: 'instagram', goal: 'expert', topic: 'Конфликты', brandMemory: { products: 'Обучение' } });
  assert.match(prompt, /Instagram/);
  assert.match(prompt, /Обучение/);
  const packageData = normalizeContentPackage({ title: 'Пост', variants: [{ hook: 'Хук', body: 'Текст', cta: 'Ответьте', hashtags: ['#тест'] }] });
  assert.equal(renderPostVariant(packageData.variants[0]), 'Хук\n\nТекст\n\nОтветьте\n\n#тест');
});

test('metric windows cover supported periods', () => {
  const now = new Date('2026-09-16T12:00:00Z');
  assert.equal(metricPeriodWindow('today', now).start.getDate(), now.getDate());
  assert.equal(metricPeriodWindow('yesterday', now).start.getDate(), now.getDate() - 1);
  assert.throws(() => metricPeriodWindow('year', now), /Неизвестный/);
});

test('Flow Space provider exposes operational metrics without external data', async () => {
  const rows = await flowSpaceMetricProvider.collect({
    tasks: [{ id: 't', status: 'done', createdAt: '2026-09-16T08:00:00Z', completedAt: '2026-09-16T10:00:00Z', dueDate: '2026-09-16', reviewAttempts: 1, reopenedCount: 0 }],
    start: new Date('2026-09-16T00:00:00Z'),
    end: new Date('2026-09-17T00:00:00Z'),
    now: new Date('2026-09-16T12:00:00Z'),
  });
  assert.equal(rows.find((x) => x.metricType === 'tasks_completed').value, 1);
  assert.equal(rows.find((x) => x.metricType === 'sla').value, 100);
  assert.equal(rows.find((x) => x.metricType === 'quality').value, 100);
  assert.ok(rows.every((x) => x.source === 'flow_space'));
});
