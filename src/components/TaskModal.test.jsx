import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TaskModal from './TaskModal';

const noop = () => {};

const renderTaskModal = (overrides = {}) => render(
  <TaskModal
    isOpen
    onClose={noop}
    selectedTask={{ id: 'task-1' }}
    taskTemplates={[]}
    handleApplyTemplate={noop}
    handleSaveTask={(event) => event.preventDefault()}
    newTaskTitle="Обработать новый лид"
    setNewTaskTitle={noop}
    toggleVoiceInput={noop}
    isListening={false}
    handleTaskAI={noop}
    isTaskGenerating={false}
    newTaskDesc=""
    setNewTaskDesc={noop}
    newTaskExpectedResult=""
    setNewTaskExpectedResult={noop}
    newTaskCriteriaText=""
    setNewTaskCriteriaText={noop}
    newTaskHours=""
    setNewTaskHours={noop}
    newTaskDueDate=""
    setNewTaskDueDate={noop}
    newUrgent={false}
    setNewUrgent={noop}
    newImportant={false}
    setNewImportant={noop}
    isTeamMode={false}
    newTaskAssignee=""
    setNewTaskAssignee={noop}
    assistants={[]}
    handleDeleteTask={noop}
    cardBg="bg-white"
    textMain="text-slate-900"
    inputBg="bg-white"
    btnPrimary="bg-slate-900 text-white"
    canLinkSop
    sops={[{ id: 'sop-1', title: 'Первичная обработка лида', purpose: 'Не терять лиды', ownerName: 'Ольга', version: 2, content: 'Ответить клиенту в течение 15 минут.', criteria: ['Ответственный назначен'] }]}
    newTaskSopId="sop-1"
    {...overrides}
  />
);

test('task modal links a company SOP and shows its instruction', () => {
  const setNewTaskSopId = jest.fn();
  renderTaskModal({ setNewTaskSopId });

  expect(screen.getByText('Регламент для задачи')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Первичная обработка лида' })).toBeInTheDocument();
  expect(screen.getByText('Открыть инструкцию · версия 2')).toBeInTheDocument();
  expect(screen.getByText('Ответить клиенту в течение 15 минут.')).toBeInTheDocument();
  expect(screen.getByText(/Не терять лиды/)).toBeInTheDocument();
  expect(screen.getByText('Ответственный назначен')).toBeInTheDocument();

  fireEvent.change(screen.getByDisplayValue('Первичная обработка лида'), { target: { value: '' } });
  expect(setNewTaskSopId).toHaveBeenCalledWith('');
});

test('owner can assign a task to a department', () => {
  const setDepartment = jest.fn();
  renderTaskModal({
    isTeamMode: true,
    assistants: [{ id: 'owner-1', name: 'Ольга', position: 'CEO', departmentId: '' }],
    newTaskAssignee: 'owner-1',
    canChooseDepartment: true,
    departments: [{ id: 'marketing', name: 'Маркетинг и контент' }],
    newTaskDepartmentId: '',
    setNewTaskDepartmentId: setDepartment,
  });
  fireEvent.change(screen.getByLabelText('Отдел задачи'), { target: { value: 'marketing' } });
  expect(setDepartment).toHaveBeenCalledWith('marketing');
});

test('personal task form stays lightweight and clearly private', () => {
  renderTaskModal({ selectedTask: null, workspace: 'personal', taskKind: 'personal' });
  expect(screen.getByText('Личное дело')).toBeInTheDocument();
  expect(screen.getByText('Видно только вам')).toBeInTheDocument();
  expect(screen.getByText('Повтор')).toBeInTheDocument();
  expect(screen.getByText('Напомнить')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Срочно/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Важно/ })).toBeInTheDocument();
  expect(screen.queryByText('Готовый результат')).not.toBeInTheDocument();
  expect(screen.queryByText('Критерии принятия')).not.toBeInTheDocument();
});

test('company task is labelled and keeps result fields', () => {
  renderTaskModal({ selectedTask: null, workspace: 'company', taskKind: 'team', isTeamMode: true });
  expect(screen.getByText('Задача команде')).toBeInTheDocument();
  expect(screen.getByText('Рабочая задача компании')).toBeInTheDocument();
  expect(screen.getByText('Готовый результат')).toBeInTheDocument();
  expect(screen.getByText('Проект')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Срочно/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Важно/ })).toBeInTheDocument();
});

test('voice recognition shows a preview before task creation', () => {
  renderTaskModal({ selectedTask: null, voicePreviewReady: true, voiceMessage: 'Проверьте задачу, срок и приоритеты перед созданием.' });
  expect(screen.getByText('Проверьте задачу, срок и приоритеты перед созданием.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Продиктовать задачу' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Создать задачу' })).toBeInTheDocument();
});
