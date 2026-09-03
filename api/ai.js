import { requireFirebaseUser } from './_firebaseAdmin.js';

const POLZA_ENDPOINT = 'https://polza.ai/api/v1/chat/completions';
const MAX_MESSAGES = 30;
const MAX_CONTENT_LENGTH = 12000;

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'messages must be a non-empty array';
  }

  if (messages.length > MAX_MESSAGES) {
    return `Too many messages. Maximum is ${MAX_MESSAGES}`;
  }

  for (const message of messages) {
    if (!message || !['system', 'user', 'assistant'].includes(message.role)) {
      return 'Each message must have a valid role';
    }
    if (typeof message.content !== 'string' || !message.content.trim()) {
      return 'Each message must contain text';
    }
    if (message.content.length > MAX_CONTENT_LENGTH) {
      return `Message content is too long. Maximum is ${MAX_CONTENT_LENGTH} characters`;
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await requireFirebaseUser(req);
  } catch (error) {
    return res.status(error.statusCode || 401).json({ error: error.message });
  }

  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'POLZA_API_KEY is not configured on the server' });
  }

  const { model = 'gpt-4o-mini', messages, temperature = 0.5 } = req.body || {};
  const validationError = validateMessages(messages);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const safeTemperature = Number.isFinite(Number(temperature))
    ? Math.min(2, Math.max(0, Number(temperature)))
    : 0.5;

  try {
    const response = await fetch(POLZA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: safeTemperature
      })
    });

    const raw = await response.text();
    let data;

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      const providerMessage =
        data?.error?.message ||
        data?.message ||
        data?.detail ||
        (typeof data?.error === 'string' ? data.error : null) ||
        'Polza API request failed';

      console.error('Polza API error:', response.status, providerMessage);
      return res.status(response.status).json({
        error: `Polza API error (${response.status}): ${providerMessage}`
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('AI handler error:', error);
    return res.status(500).json({ error: 'AI service is temporarily unavailable' });
  }
}
