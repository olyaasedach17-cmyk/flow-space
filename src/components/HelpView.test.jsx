import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HelpView from './HelpView';

test('quick start explains the core flow and opens its actions', () => {
  const create = jest.fn();
  const today = jest.fn();
  const ai = jest.fn();
  render(<HelpView onCreateTask={create} onOpenToday={today} onOpenAI={ai} />);

  expect(screen.getByText('Начните за 2 минуты')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Создать задачу/ }));
  fireEvent.click(screen.getByRole('button', { name: /Открыть Сегодня/ }));
  fireEvent.click(screen.getByRole('button', { name: /Открыть AI/ }));

  expect(create).toHaveBeenCalledTimes(1);
  expect(today).toHaveBeenCalledTimes(1);
  expect(ai).toHaveBeenCalledTimes(1);
});

test('team guide explains private and company workspaces', () => {
  render(<HelpView isTeamMode />);
  expect(screen.getByText('Как работать с командой')).toBeInTheDocument();
  expect(screen.getByText('«Моё» и «Команда»')).toBeInTheDocument();
  expect(screen.getByText('Результат вместо отчёта')).toBeInTheDocument();
});
