import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MobileNav from './MobileNav';

const renderNav = (overrides = {}) => render(
  <MobileNav
    isDark={false}
    isTeamMode
    userRole="member"
    activeTab="executive"
    setActiveTab={() => {}}
    onQuickAction={() => {}}
    currentWorkspace="personal"
    {...overrides}
  />
);

test('mobile plus offers separate private personal and work tasks', () => {
  renderNav();
  fireEvent.click(screen.getByLabelText('Создать'));
  expect(screen.getByText('Личное дело')).toBeInTheDocument();
  expect(screen.getByText('Моя рабочая задача')).toBeInTheDocument();
  expect(screen.queryByText('Задача команде')).not.toBeInTheDocument();
});

test('team task action is shown only when the user has permission', () => {
  renderNav({ userRole: 'owner', currentWorkspace: 'company', canCreateTeamTask: true });
  fireEvent.click(screen.getByLabelText('Создать'));
  expect(screen.getByText('Задача команде')).toBeInTheDocument();
});

test('help is available from the compact more menu', () => {
  renderNav();
  fireEvent.click(screen.getByText('Ещё'));
  expect(screen.getByText('Как пользоваться')).toBeInTheDocument();
});
