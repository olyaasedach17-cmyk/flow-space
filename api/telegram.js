export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN не задан в Vercel' });

  const body = req.body || {};

  // 1. Если сообщение пришло ИЗ ТЕЛЕГРАМА (пользователь написал боту)
  if (body.message) {
    const chatId = body.message.chat.id;
    const text = body.message.text || '';

    let replyText = '';

    if (text.startsWith('/start')) {
      replyText = `Привет! Я Ассистент Flow Space.\nВаш Telegram ID: ${chatId}\n\nУкажите этот ID в настройках приложения Flow Space!`;
    } else {
      replyText = `Задача записана: "${text}"! 🚀`;
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: replyText })
    });

    return res.status(200).json({ ok: true });
  }

  // 2. Если запрос пришел С НАШЕГО САЙТА (React отправляет уведомление)
  if (body.chatId && body.message) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: body.chatId, text: body.message })
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Неверный формат запроса' });
}