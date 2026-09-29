import { auth } from '../firebase';

async function callInviteApi(payload) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Для работы с приглашениями необходимо войти в аккаунт');
  const token = await currentUser.getIdToken();

  const response = await fetch('/api/invites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить операцию с приглашением');
  return data;
}

export function createCompanyInvite({ companyId, email, position, role, departmentId = '' }) {
  return callInviteApi({ action: 'create', companyId, email, position, role, departmentId });
}

export function acceptPendingInvite() {
  return callInviteApi({ action: 'accept' });
}
