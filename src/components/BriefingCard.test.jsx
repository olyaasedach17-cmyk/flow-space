import { fireEvent, render, screen } from '@testing-library/react';
import BriefingCard from './BriefingCard';

const baseProps = {
  cardBg: '',
  textMain: '',
  tasks: [],
  archive: [],
  metrics: {},
  insights: { items: [], teamItems: [], ownerItems: [], healthyCount: 0 },
  calendarEvents: [],
  aiBriefs: {},
  onGenerate: jest.fn(),
  onOpenTasks: jest.fn(),
  onSaveDecision: jest.fn(),
  savedState: {},
};

beforeEach(() => jest.clearAllMocks());

test('Solo briefing keeps personal wording in every weekly mode', () => {
  render(<BriefingCard {...baseProps} solo />);
  const selector = screen.getByLabelText('Вид сводки');

  fireEvent.change(selector, { target: { value: 'plan' } });
  expect(screen.getByText('Мой план недели')).toBeInTheDocument();

  fireEvent.change(selector, { target: { value: 'status' } });
  expect(screen.getByText('Что выбивается из плана')).toBeInTheDocument();
  expect(screen.queryByText('Команда решает')).not.toBeInTheDocument();

  fireEvent.change(selector, { target: { value: 'review' } });
  expect(screen.getByRole('heading', { name: 'Итоги недели' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Подготовить следующую неделю' })).toBeInTheDocument();
});

test('Owner briefing answers the three management questions in status mode', () => {
  render(<BriefingCard {...baseProps} />);
  fireEvent.change(screen.getByLabelText('Вид сводки'), { target: { value: 'status' } });

  expect(screen.getByText('Идёт по плану')).toBeInTheDocument();
  expect(screen.getByText('Команда решает')).toBeInTheDocument();
  expect(screen.getByText('Нужно ваше решение')).toBeInTheDocument();
});
