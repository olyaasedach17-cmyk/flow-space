export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Мозг бота Flow Space успешно запущен и готов к работе с ИИ!');
  }

  const body = req.body;
  if (!body.message || !body.message.text) {
    return res.status(200).send('OK');
  }

  const chatId = body.message.chat.id;
  const userText = body.message.text;

  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  let aiResponseText = "";

  try {
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Ты ассистент-планировщик. Твоя задача — прочитать сообщение пользователя, выделить из него суть задачи, сроки (если есть) и коротко подтвердить, что задача понята. Отвечай дружелюбно и коротко.'
          },
          { role: 'user', content: userText }
        ]
      })
    });

    const aiData = await aiResponse.json();

    // Проверяем, ответил ли OpenAI успешно
    if (!aiResponse.ok) {
      console.error("OpenAI вернул ошибку:", JSON.stringify(aiData));
      aiResponseText = `Ответ от ИИ заблокирован. Причина: ${aiData.error?.message || 'Неизвестная ошибка'}`;
    } else {
      // Если всё хорошо, читаем ответ
      aiResponseText = aiData.choices[0].message.content;
    }

  } catch (error) {
    console.error("Ошибка при запросе к OpenAI:", error);
    aiResponseText = "Связь с ИИ прервалась на половине пути.";
  }

  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: aiResponseText
    })
  });

  return res.status(200).send('OK');
}