import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TaskCard from './TaskCard';

const baseTask = {
  id: 'task-1',
  text: 'Подготовить коммерческое предложение',
  status: 'todo',
  category: 'work',
  urgent: true,
  important: true,
};

test('personal task can be completed with a checkbox without an in-progress step', () => {
  const onQuickMove = jest.fn();
  render(
    <TaskCard
      task={baseTask}
      workspace="personal"
      isTeamMode={false}
      isDark={false}
      onSelectTask={jest.fn()}
      onQuickMove={onQuickMove}
    />
  );

  expect(screen.getByText('Срочно')).toBeInTheDocument();
  expect(screen.getByText('Важно')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'В работу' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Готово' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: `Завершить задачу: ${baseTask.text}` }));
  expect(onQuickMove).toHaveBeenCalledWith('task-1', 'done');
});

test('company task opens result submission without changing review flow', () => {
  const onSelectTask = jest.fn();
  const onQuickMove = jest.fn();
  render(
    <TaskCard
      task={baseTask}
      workspace="company"
      isTeamMode
      isDark={false}
      onSelectTask={onSelectTask}
      onQuickMove={onQuickMove}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Сдать результат' }));
  expect(onSelectTask).toHaveBeenCalledWith(baseTask);
  expect(onQuickMove).not.toHaveBeenCalled();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('list card keeps details behind task opening and shows a compact deadline', () => {
  render(
    <TaskCard
      task={{ ...baseTask, dueDate: '2099-10-05', expectedResult: 'Подписанный договор', description: 'Длинное описание', aiAgentId: 'sales', sopTitle: 'Продажи' }}
      workspace="personal"
      isTeamMode={false}
      isDark={false}
      onSelectTask={jest.fn()}
      onQuickMove={jest.fn()}
    />
  );

  expect(screen.getByText('05.10')).toBeInTheDocument();
  expect(screen.queryByText('Подписанный договор')).not.toBeInTheDocument();
  expect(screen.queryByText('Длинное описание')).not.toBeInTheDocument();
  expect(screen.queryByText(/видно только вам/)).not.toBeInTheDocument();
});

test('task card shows its project without adding another navigation level', () => {
  render(<TaskCard task={{ ...baseTask, projectName: 'Запуск курса' }} workspace="personal" isTeamMode={false} isDark={false} onSelectTask={jest.fn()} onQuickMove={jest.fn()} />);
  expect(screen.getByText('Запуск курса')).toBeInTheDocument();
});
