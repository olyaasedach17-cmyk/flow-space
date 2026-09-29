import { toast } from 'sonner';
import { auth } from '../firebase';

async function telegramApi(payload) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Сначала войдите в Flow Space');
  const request = async (forceRefresh = false) => {
    const token = await currentUser.getIdToken(forceRefresh);
    return fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  };
  let response = await request(false);
  if (response.status === 401) response = await request(true);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 401 ? 'Сессия истекла. Войдите в Flow Space заново.' : data.error || 'Telegram временно недоступен');
  return data;
}

export const getTelegramInfo = (companyId) => telegramApi({ action: 'info', companyId });
export const beginTelegramConnection = (companyId) => telegramApi({ action: 'begin_connection', companyId });
export const completeTelegramConnection = (companyId) => telegramApi({ action: 'complete_connection', companyId });
export const testTelegramConnection = (companyId, chatId = '') => telegramApi({ action: 'test', companyId, ...(chatId ? { chatId } : {}) });
export const disconnectTelegramConnection = (companyId) => telegramApi({ action: 'disconnect', companyId });

export const sendTelegramAlert = async ({ companyId, eventType, message }) => {
  if (!companyId || !eventType || !message) return { skipped: true };
  try {
    return await telegramApi({ action: 'send', companyId, eventType, message });
  } catch (error) {
    console.warn('Не удалось доставить уведомление в Telegram:', error.message);
    return { ok: false, error: error.message };
  }
};

export const copyToClipboard = async (text, successMessage = 'Скопировано в буфер обмена') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error('Не удалось скопировать текст');
  }
};
