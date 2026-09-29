import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SopView from './SopView';

test('SOP view shows linked tasks and saves a structured revision', async () => {
  const handleUpdateSOP = jest.fn();
  render(<SopView
    sops={[{ id: 's1', title: 'Обработка обращения', content: '1. Ответить\n2. Создать задачу', version: 1, date: '13.09.2026' }]}
    tasks={[{ id: 't1', text: 'Обработать лид', sopId: 's1' }]}
    assistants={[{ id: 'u1', name: 'Ольга', position: 'CEO' }]}
    canEdit
    cardBg="bg-white"
    textMain="text-slate-900"
    inputBg="bg-white"
    btnPrimary="bg-slate-900"
    handleUpdateSOP={handleUpdateSOP}
    handleDeleteSOP={jest.fn()}
  />);

  expect(screen.getByText('Связанные задачи: 1')).toBeInTheDocument();
  expect(screen.getByText('• Обработать лид')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Редактировать Обработка обращения' }));
  expect(screen.getByText('После сохранения будет версия 2')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Цель'), { target: { value: 'Не терять обращения' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить новую версию' }));

  await waitFor(() => expect(handleUpdateSOP).toHaveBeenCalledWith('s1', expect.objectContaining({ purpose: 'Не терять обращения', steps: ['Ответить', 'Создать задачу'] })));
  await waitFor(() => expect(screen.queryByText('Редактирование регламента')).not.toBeInTheDocument());
});
