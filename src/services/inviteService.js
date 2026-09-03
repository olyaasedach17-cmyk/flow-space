import { auth } from '../firebase';

async function callInvitesApi(payload) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Необходимо войти в аккаунт');

  const token = await currentUser.getIdToken();
  const response = await fetch('/api/invites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Ошибка приглашения: ${response.status}`);
  return data;
}

export function createCompanyInvite({ companyId, email, role, position }) {
  return callInvitesApi({
    action: 'create',
    companyId,
    email,
    role,
    position
  });
}

export function acceptCompanyInvite({ inviteId, token }) {
  return callInvitesApi({
    action: 'accept',
    inviteId,
    token
  });
}
