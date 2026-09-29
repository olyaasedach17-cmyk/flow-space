import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AITaskReviewModal from './AITaskReviewModal';

test('AI proposals require an explicit apply action and allow excluding a task', () => {
  const onApply = jest.fn();
  const review = {
    proposals: [
      { id: 'one', title: 'Первая задача', nextTask: { id: 'one', expectedResult: 'Отчёт' }, changes: [{ field: 'expectedResult', value: 'Отчёт' }] },
      { id: 'two', title: 'Вторая задача', nextTask: { id: 'two', estimatedHours: 2 }, changes: [{ field: 'estimatedHours', value: 2 }] },
    ],
  };

  render(<AITaskReviewModal review={review} onClose={jest.fn()} onApply={onApply} />);

  expect(screen.getByText(/Ничего ещё не изменено/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Применить изменения к задаче Вторая задача' }));
  fireEvent.click(screen.getByRole('button', { name: 'Применить · 1' }));

  expect(onApply).toHaveBeenCalledWith([expect.objectContaining({ id: 'one' })]);
});
