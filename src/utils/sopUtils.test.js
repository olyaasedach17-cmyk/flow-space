import { buildSopContent, normalizeSop, parseSopSteps, updateSopVersion } from './sopUtils';

test('legacy SOP content becomes structured steps', () => {
  expect(parseSopSteps('1. Назначить ответственного. 2. Создать задачу.')).toEqual([
    'Назначить ответственного.',
    'Создать задачу.',
  ]);
  expect(normalizeSop({ title: 'Лиды', content: '1. Ответить\n2. Зафиксировать' }).version).toBe(1);
});

test('SOP update increments version and preserves prior revision', () => {
  const updated = updateSopVersion({ id: 's1', title: 'Лиды', content: '1. Ответить', version: 1 }, {
    title: 'Обработка лидов',
    purpose: 'Не терять обращения',
    steps: ['Ответить', 'Создать задачу'],
    criteria: ['Ответственный назначен'],
  }, 'owner-1');
  expect(updated.version).toBe(2);
  expect(updated.content).toBe(buildSopContent(['Ответить', 'Создать задачу']));
  expect(updated.versionHistory[0].version).toBe(1);
  expect(updated.versionHistory[0].replacedBy).toBe('owner-1');
});
