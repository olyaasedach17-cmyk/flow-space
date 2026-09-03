// api/ai.js - Vercel Serverless Function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Polza API key from Vercel Environment Variables.
  // PROXYAPI_KEY is kept as a temporary fallback so the current deployment
  // does not break before POLZA_API_KEY is added in Vercel.
  const apiKey = process.env.POLZA_API_KEY || process.env.PROXYAPI_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'POLZA_API_KEY is not configured on the server.'
    });
  }

  try {
    const { model = 'gpt-4o-mini', messages, temperature = 0.5 } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array.' });
    }

    const response = await fetch('https://polza.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, temperature })
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
        data?.error ||
        raw ||
        'Unknown Polza API error';

      console.error('Polza API error:', response.status, providerMessage);

      return res.status(response.status).json({
        error: `Polza API error (${response.status}): ${providerMessage}`
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('AI handler error:', error);
    return res.status(500).json({
      error: 'Internal Server Error: ' + error.message
    });
  }
}
