// файл: api/telegram.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { chatId, message } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN; // Добавьте токен бота в Vercel

  if (!chatId || !message || !botToken) return res.status(400).json({ error: 'Missing data' });

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}