// ==========================================
import { toast } from 'sonner';

/**
 * Отправка сервисного сообщения в Telegram-канал/чат через бота
 */
export const sendTelegramAlert = async (text, settings = {}) => {
  const token = settings?.telegramBotToken;
  const chatId = settings?.telegramChatId;

  if (!token || !chatId || !text) return;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      console.warn('Не удалось доставить уведомление в Telegram:', response.statusText);
    }
  } catch (error) {
    console.error('Ошибка отправки уведомления в Telegram:', error);
  }
};

/**
 * Копирование текста в буфер обмена с уведомлением
 */
export const copyToClipboard = async (text, successMessage = 'Скопировано в буфер обмена') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch (err) {
    toast.error('Не удалось скопировать текст');
  }
};
