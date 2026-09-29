import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TodayTaskList from './TodayTaskList';

const task = { id: 'today-1', text: 'Позвонить клиенту', status: 'todo', category: 'work', urgent: true };

test('personal Today uses the same completion checkbox and opens the selected task', () => {
  const onOpenTask = jest.fn();
  const onQuickMove = jest.fn();
  render(
    <TodayTaskList
      tasks={[task]}
      cardBg=""
      textMain=""
      workspace="personal"
      onOpenTasks={jest.fn()}
      onOpenTask={onOpenTask}
      onQuickMove={onQuickMove}
    />
  );

  fireEvent.click(screen.getByRole('checkbox', { name: `Завершить задачу: ${task.text}` }));
  expect(onQuickMove).toHaveBeenCalledWith(task.id, 'done');

  fireEvent.click(screen.getByRole('button', { name: new RegExp(task.text) }));
  expect(onOpenTask).toHaveBeenCalledWith(task);
});

test('company Today keeps result flow instead of a completion checkbox', () => {
  render(
    <TodayTaskList
      tasks={[task]}
      cardBg=""
      textMain=""
      workspace="company"
      onOpenTasks={jest.fn()}
      onOpenTask={jest.fn()}
      onQuickMove={jest.fn()}
    />
  );

  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('Today separates overdue work from urgent tasks without a date', () => {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  render(<TodayTaskList tasks={[{ ...task, id: 'late', text: 'Просроченная', dueDate: yesterdayKey }, task]} cardBg="" textMain="" workspace="company" onOpenTasks={jest.fn()} onOpenTask={jest.fn()} />);
  expect(screen.getByText('Просрочено · 1')).toBeInTheDocument();
  expect(screen.getByText('Срочно без срока · 1')).toBeInTheDocument();
});
