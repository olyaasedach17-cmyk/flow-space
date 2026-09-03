import { requireFirebaseUser } from './_firebaseAdmin.js';

function getTelegramToken() {
  return process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
}

async function sendTelegramMessage(botToken, chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.description || `Telegram API error (${response.status})`);
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const botToken = getTelegramToken();
  if (!botToken) {
    return res.status(500).json({ error: 'TELEGRAM_TOKEN is not configured on the server' });
  }

  const body = req.body || {};
  const isTelegramUpdate = Boolean(body.update_id && body.message && typeof body.message === 'object');

  try {
    // Telegram webhook: used primarily to show the user their chat ID.
    if (isTelegramUpdate) {
      const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
      if (expectedSecret) {
        const providedSecret = req.headers['x-telegram-bot-api-secret-token'];
        if (providedSecret !== expectedSecret) {
          return res.status(401).json({ error: 'Invalid Telegram webhook secret' });
        }
      }

      const chatId = body.message?.chat?.id;
      const text = body.message?.text || '';
      if (!chatId) return res.status(200).json({ ok: true });

      const replyText = text.startsWith('/start')
        ? `Привет! Я ассистент Flow Space.\nВаш Telegram Chat ID: ${chatId}\n\nДобавьте этот ID в настройках Flow Space.`
        : 'Сообщение получено. Управляйте задачами и уведомлениями через Flow Space.';

      await sendTelegramMessage(botToken, chatId, replyText);
      return res.status(200).json({ ok: true });
    }

    // Requests from Flow Space must always be authenticated.
    await requireFirebaseUser(req);

    const chatId = body.chatId;
    const message = body.message;

    if (!chatId || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'chatId and message are required' });
    }

    if (message.length > 4000) {
      return res.status(400).json({ error: 'Telegram message is too long' });
    }

    await sendTelegramMessage(botToken, chatId, message.trim());
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram handler error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message || 'Telegram request failed' });
  }
}
