import { fireEvent, render, screen } from '@testing-library/react';
import DailyBriefPanel from './DailyBriefPanel';
import { loadDailyBrief } from '../services/businessAgentService';

jest.mock('../services/businessAgentService', () => ({ loadDailyBrief: jest.fn() }));

const brief = {
  summary: 'Всё идёт по плану.',
  today: { counts: { dueToday: 1, overdue: 0 }, priorities: [{ id: 'task-1', title: 'Проверить результат' }] },
  decisionStatus: { ownerDecisionCount: 0 },
  requiresAttention: [],
  kpis: { latestChanges: [{ id: 'created', name: 'Создано задач', value: 2, delta: 1 }] },
  recommendations: [{ id: 'tip-1', title: 'Сохранить фокус', reason: 'Новых рисков нет.' }],
};

beforeEach(() => loadDailyBrief.mockResolvedValue(brief));

test('compact Daily Brief reveals all required sections without leaving Today', async () => {
  render(<DailyBriefPanel companyId="company-1" compact />);

  expect(await screen.findByText('Всё идёт по плану.')).toBeInTheDocument();
  expect(screen.queryByText('Требует внимания')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Показать подробности' }));

  expect(screen.getByText('Требует внимания')).toBeInTheDocument();
  expect(screen.getByText('Показатели за 7 дней')).toBeInTheDocument();
  expect(screen.getByText('Рекомендации AI')).toBeInTheDocument();
  expect(screen.getByText('Проверить результат')).toBeInTheDocument();
});
