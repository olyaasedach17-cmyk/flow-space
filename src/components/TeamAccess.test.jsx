import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeamView from './TeamView';
import InviteModal from './InviteModal';
import { ROLES } from '../utils/workspaceUtils';
import { listActivityEvents } from '../services/activityService';

jest.mock('../services/activityService', () => ({
  listActivityEvents: jest.fn(),
}));

beforeEach(() => {
  listActivityEvents.mockResolvedValue({ events: [] });
});

const teamProps = {
  isTeamMode: true,
  cardBg: '',
  textMain: '',
  btnPrimary: '',
  setIsInviteOpen: jest.fn(),
  assistants: [],
  tasks: [],
  departments: [{ id: 'sales', name: 'Продажи' }],
  onCreateDepartment: jest.fn(),
  onAssignDepartment: jest.fn(),
  companyId: 'company-1',
};

test('member does not see invitation controls', async () => {
  render(<TeamView {...teamProps} userRole={ROLES.MEMBER} />);
  expect(screen.queryByRole('button', { name: /пригласить сотрудника/i })).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/история появится/i)).toBeInTheDocument());
});

test('manager without a department cannot open an invitation', async () => {
  render(<TeamView {...teamProps} userRole={ROLES.MANAGER} userDepartmentId="" />);
  expect(screen.getByRole('button', { name: /пригласить сотрудника/i })).toBeDisabled();
  expect(screen.getByText(/сначала собственник должен назначить вам отдел/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/история появится/i)).toBeInTheDocument());
});

function ManagerInviteHarness() {
  const [role, setRole] = useState(ROLES.MANAGER);
  const [departmentId, setDepartmentId] = useState('');
  return <InviteModal
    isOpen
    onClose={() => {}}
    inviteEmail=""
    setInviteEmail={() => {}}
    invitePosition=""
    setInvitePosition={() => {}}
    inviteRole={role}
    setInviteRole={setRole}
    inviteDepartmentId={departmentId}
    setInviteDepartmentId={setDepartmentId}
    departments={[{ id: 'sales', name: 'Продажи' }, { id: 'marketing', name: 'Маркетинг' }]}
    userRole={ROLES.MANAGER}
    userDepartmentId="sales"
    onSubmit={(event) => event.preventDefault()}
    cardBg=""
    textMain=""
    inputBg=""
    btnPrimary=""
  />;
}

test('manager invitation is locked to member role and own department', async () => {
  render(<ManagerInviteHarness />);
  expect(screen.getByText('Сотрудник (только свои задачи)')).toBeInTheDocument();
  const department = screen.getByLabelText('Отдел');
  await waitFor(() => expect(department).toHaveValue('sales'));
  expect(department).toBeDisabled();
  expect(screen.queryByRole('option', { name: 'Маркетинг' })).not.toBeInTheDocument();
  fireEvent.submit(screen.getByRole('button', { name: /отправить приглашение/i }).closest('form'));
});

test('owner cannot invite a manager before creating a department', () => {
  render(<InviteModal
    isOpen
    onClose={() => {}}
    inviteEmail="lead@example.com"
    setInviteEmail={() => {}}
    invitePosition="Руководитель"
    setInvitePosition={() => {}}
    inviteRole={ROLES.MEMBER}
    setInviteRole={() => {}}
    inviteDepartmentId=""
    setInviteDepartmentId={() => {}}
    departments={[]}
    userRole={ROLES.OWNER}
    userDepartmentId=""
    onSubmit={() => {}}
    cardBg=""
    textMain=""
    inputBg=""
    btnPrimary=""
  />);
  expect(screen.getByRole('option', { name: 'Руководитель (свой отдел)' })).toBeDisabled();
});
