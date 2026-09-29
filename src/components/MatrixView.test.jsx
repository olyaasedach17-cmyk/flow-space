import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import MatrixView from './MatrixView';

const tasks = [
  { id: 'normal', text: 'Обычная', status: 'todo', category: 'work' },
  { id: 'important', text: 'Важная', status: 'todo', category: 'work', important: true },
  { id: 'urgent', text: 'Срочная', status: 'todo', category: 'work', urgent: true },
];

const props = {
  isDark: false,
  isTeamMode: false,
  workspace: 'personal',
  handleRunAIAgent: jest.fn(),
  isAgentRunning: false,
  btnPrimary: '',
  assistants: [],
  tasks,
  assigneeFilter: 'all',
  setAssigneeFilter: jest.fn(),
  t: (key) => ({ colTodo: 'В работе', colDeferred: 'Отложено', colReview: 'На проверке' }[key] || key),
  todoTasks: tasks,
  inProgressTasks: [],
  reviewTasks: [],
  deferredTasks: [],
  openTaskModal: jest.fn(),
  handleQuickMove: jest.fn(),
};

test('Work keeps priority choices behind one compact filter button', () => {
  render(<MatrixView {...props} />);

  expect(screen.getByRole('button', { name: /Фильтр/ })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByLabelText('Дополнительный фильтр задач')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Фильтр/ }));
  const advanced = screen.getByLabelText('Дополнительный фильтр задач');
  expect(within(advanced).getByRole('button', { name: /Только срочные/ })).toBeInTheDocument();
  expect(within(advanced).getByRole('button', { name: /Только важные/ })).toBeInTheDocument();
});

test('priority badges remain visible on task cards', () => {
  render(<MatrixView {...props} />);
  expect(screen.getByText('Срочно')).toBeInTheDocument();
  expect(screen.getByText('Важно')).toBeInTheDocument();
});

test('AI check is a compact toolbar action instead of a large callout', () => {
  render(<MatrixView {...props} />);
  expect(screen.getByRole('button', { name: 'Уточнить задачи с AI: 3' })).toHaveTextContent('Уточнить с AI · 3');
  expect(screen.queryByText('Найдёт задачи без ясного результата и поможет уточнить их.')).not.toBeInTheDocument();
});

test('deferred tasks stay in a compact collapsed section', () => {
  render(<MatrixView {...props} deferredTasks={[{ id: 'later', text: 'Сделать позже', status: 'deferred', category: 'work' }]} />);

  const summary = screen.getByText(/Отложено/).closest('summary');
  expect(summary).toBeInTheDocument();
  expect(summary.parentElement).not.toHaveAttribute('open');
  expect(screen.queryByText('Задач пока нет')).not.toBeInTheDocument();
});
