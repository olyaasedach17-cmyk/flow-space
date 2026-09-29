import { auth } from '../firebase';

export async function applyPromoCode({ companyId, code }) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Для активации промокода необходимо войти в аккаунт');
  const token = await currentUser.getIdToken();

  const response = await fetch('/api/promo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ companyId, code }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось применить промокод');
  return data;
}
