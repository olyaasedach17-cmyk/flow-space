import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ArchiveView from './ArchiveView';

test('archived task opens without restoring it', () => {
  const task = { id: 'done-1', text: 'Готовая задача', status: 'done' };
  const onOpenTask = jest.fn();
  const handleQuickMove = jest.fn();
  render(<ArchiveView archive={[task]} cardBg="" textMain="" onOpenTask={onOpenTask} handleQuickMove={handleQuickMove} />);
  fireEvent.click(screen.getByRole('button', { name: 'Открыть' }));
  expect(onOpenTask).toHaveBeenCalledWith(task);
  expect(handleQuickMove).not.toHaveBeenCalled();
});
