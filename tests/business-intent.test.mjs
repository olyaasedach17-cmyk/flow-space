import test from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_INTENTS, detectBusinessIntent, extractContentTopic, inferContentPlatform } from '../src/domain/businessIntent.js';

test('business intent router selects deterministic services', () => {
  assert.equal(detectBusinessIntent('Что сегодня происходит в компании?'), BUSINESS_INTENTS.DAILY_BRIEF);
  assert.equal(detectBusinessIntent('Какие задачи просрочены?'), BUSINESS_INTENTS.TASK_ANALYSIS);
  assert.equal(detectBusinessIntent('На что мне обратить внимание?'), BUSINESS_INTENTS.ATTENTION);
  assert.equal(detectBusinessIntent('Как изменились KPI за неделю?'), BUSINESS_INTENTS.KPI_TREND);
  assert.equal(detectBusinessIntent('Сделай пост для Instagram'), BUSINESS_INTENTS.CREATE_CONTENT);
  assert.equal(inferContentPlatform('Сделай пост в Телеграм'), 'telegram');
  assert.equal(extractContentTopic('Сделай пост для Instagram на тему управления конфликтами'), 'управления конфликтами');
  assert.equal(extractContentTopic('Сделай пост для Instagram'), '');
});
