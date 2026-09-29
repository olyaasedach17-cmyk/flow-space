import { enforceRateLimit, requireFirebaseUser } from './_firebaseAdmin.mjs';

import { requestAI } from './_aiProvider.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const user = await requireFirebaseUser(req);
    enforceRateLimit({ key: `ai:${user.uid}`, limit: 30 });
  } catch (error) {
    return res.status(error.statusCode || 401).json({ error: error.message });
  }

  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'POLZA_API_KEY is not configured on the server.' });
  }

  const { messages, temperature = 0.5 } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return res.status(400).json({ error: 'messages must contain between 1 and 20 items.' });
  }
  const normalizedMessages = messages.map((message) => ({
    role: ['system', 'user', 'assistant'].includes(message?.role) ? message.role : 'user',
    content: String(message?.content || '').slice(0, 12000),
  })).filter((message) => message.content.trim());
  if (!normalizedMessages.length) return res.status(400).json({ error: 'messages contain no content.' });

  const safeTemperature = Math.max(0, Math.min(Number(temperature) || 0.5, 1));
  try {
    const data = await requestAI({ messages: normalizedMessages, temperature: safeTemperature });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.statusCode || 502).json({ error: 'AI временно недоступен. Попробуйте позже.' });
  }
}
