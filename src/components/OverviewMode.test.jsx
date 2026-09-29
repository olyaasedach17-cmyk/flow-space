import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ExecutiveOverview from './ExecutiveOverview';
import SoloOverview from './SoloOverview';

const tasks = [
  { id: 'work-1', text: 'Подготовить предложение', status: 'todo', category: 'work', estimatedHours: 2, urgent: true },
  { id: 'personal-1', text: 'Записаться к врачу', status: 'todo', category: 'personal', estimatedHours: 1 },
];

const common = {
  cardBg: 'bg-white',
  textMain: 'text-slate-900',
  tasks,
  archive: [],
  metrics: {},
  insights: { ownerItems: [], teamItems: [], healthyCount: 2, items: [] },
  calendarEvents: [],
  briefingTexts: {},
  briefingLoadingKind: '',
  onGenerateBriefing: jest.fn(),
  onSaveBriefingDecision: jest.fn(),
  briefingState: {},
  onOpenTasks: jest.fn(),
  dataLoading: false,
};

beforeEach(() => jest.clearAllMocks());

test('personal Today is task-first and Week contains the weekly rhythm', () => {
  render(<SoloOverview {...common} onEnableTeam={jest.fn()} />);

  expect(screen.getByLabelText('Фильтр задач на сегодня')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Задачи дня' })).toBeInTheDocument();
  expect(screen.getByLabelText('Загрузка на сегодня')).toHaveTextContent('1 задача · ~2 ч');
  expect(screen.queryByText('Фокус на результате')).not.toBeInTheDocument();
  expect(screen.queryByText('Ритм недели')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Неделя' }));
  expect(screen.getByText('Ритм недели')).toBeInTheDocument();
  expect(screen.queryByLabelText('Фильтр задач на сегодня')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Задачи дня' })).not.toBeInTheDocument();
});

test('company Today stays compact and company Week contains risks', () => {
  render(<ExecutiveOverview {...common} />);

  expect(screen.getByRole('heading', { name: 'Задачи дня' })).toBeInTheDocument();
  expect(screen.getByLabelText('Загрузка на сегодня')).toHaveTextContent('1 задача · ~2 ч');
  expect(screen.queryByText('Ритм недели')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Риски недели')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Неделя' }));
  expect(screen.getByText('Ритм недели')).toBeInTheDocument();
  expect(screen.getByLabelText('Риски недели')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Задачи дня' })).not.toBeInTheDocument();
});
