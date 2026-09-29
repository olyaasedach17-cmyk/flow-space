import {
  normalizeAIMemory,
  validateStructuredAIResult,
  renderStructuredAIResult,
  extractReadyMaterial,
  extractPublicationText,
  planAICollaboration,
} from './aiOperatingLayer';
import { aiOptions } from '../constants';

test('AI memory is normalized and truncated safely', () => {
  const memory = normalizeAIMemory({ companyDescription: 'A'.repeat(3000), toneOfVoice: 'Спокойно' });
  expect(memory.companyDescription.length).toBe(2500);
  expect(memory.toneOfVoice).toBe('Спокойно');
});

test('structured AI output requires a result', () => {
  expect(validateStructuredAIResult({ expectedResult: 'X' })).toBeNull();
  const parsed = validateStructuredAIResult({ result: 'Готово', criteria: ['Проверить'], confidence: 'high' });
  expect(parsed.result).toBe('Готово');
  expect(parsed.criteria).toEqual(['Проверить']);
});

test('structured AI output renders readable result', () => {
  const text = renderStructuredAIResult({ expectedResult: 'КП', result: 'Текст', criteria: ['Есть CTA'], risks: [], assumptions: [], nextActions: [], confidence: 'medium' });
  expect(text).toContain('ОЖИДАЕМЫЙ РЕЗУЛЬТАТ');
  expect(text).toContain('Есть CTA');
});

test('publication transfer excludes service sections', () => {
  const text = 'ОЖИДАЕМЫЙ РЕЗУЛЬТАТ\nПост\n\nГОТОВЫЙ МАТЕРИАЛ / РЕШЕНИЕ\nТолько **готовый пост**\n\nКРИТЕРИИ ПРОВЕРКИ\n• Проверить';
  expect(extractPublicationText(text)).toBe('Только готовый пост');
});

test('SOP transfer keeps only the ready instruction', () => {
  const text = 'ОЖИДАЕМЫЙ РЕЗУЛЬТАТ\nРегламент\n\nГОТОВЫЙ МАТЕРИАЛ / РЕШЕНИЕ\n1. Создать задачу в Flow Space.\n2. Назначить ответственного.\n\nДОПУЩЕНИЯ / НЕДОСТАЮЩИЕ ДАННЫЕ\n• Срок задаёт владелец\n\nУВЕРЕННОСТЬ: medium';
  expect(extractReadyMaterial(text)).toBe('1. Создать задачу в Flow Space.\n2. Назначить ответственного.');
});

test('orchestrator selects specialists from goal', () => {
  const plan = planAICollaboration('Подготовить контент-план и коммерческое предложение для продаж', aiOptions);
  expect(plan).toContain('smm');
  expect(plan).toContain('sales');
});

 test('preserves nested analyst results instead of object placeholders', () => {
   const parsed = validateStructuredAIResult({result: {growth: '20%', conclusion: 'Выручка выросла', steps: ['120 - 100 = 20']}});
   expect(parsed.result).toContain('20%');
   expect(parsed.result).toContain('Выручка выросла');
   expect(parsed.result).not.toContain('[object Object]');
 });
