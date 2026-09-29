import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AssistantView from './AssistantView';

test('task analysis is discoverable from Разобрать and runs the shared task check', () => {
  const onCheckTasks = jest.fn();
  const setProcessTopic = jest.fn();
  render(
    <AssistantView
      cardBg=""
      textMain=""
      inputBg=""
      btnPrimary=""
      aiOptions={[]}
      processRole="auto"
      setProcessRole={jest.fn()}
      processTopic=""
      setProcessTopic={setProcessTopic}
      handleGenerateProcess={jest.fn()}
      isProcessGenerating={false}
      processMessages={[]}
      handleCreateTaskFromAI={jest.fn()}
      handleSaveToSOP={jest.fn()}
      followUpText=""
      setFollowUpText={jest.fn()}
      handleFollowUpProcess={jest.fn()}
      onCheckTasks={onCheckTasks}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: /Разобрать/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Задачи' }));
  expect(onCheckTasks).toHaveBeenCalledTimes(1);
  expect(setProcessTopic).not.toHaveBeenCalled();
});
