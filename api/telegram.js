export default async function handler(req, res) {
  // 1. Проверяем, что кто-то открыл ссылку в браузере
  if (req.method !== 'POST') {
    return res.status(200).send('Мозг бота Flow Space успешно запущен и готов к работе с ИИ!');
  }

  // 2. Проверяем, что пришло текстовое сообщение
  const body = req.body;
  if (!body.message || !body.message.text) {
    return res.status(200).send('OK');
  }

  const chatId = body.message.chat.id;
  const userText = body.message.text;

  // Достаем наши секретные ключи из Vercel
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  let aiResponseText = "";

  try {
    // 3. Отправляем твое сообщение в мозг нейросети
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Используем быструю и недорогую модель
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
    aiResponseText = aiData.choices[0].message.content;

  } catch (error) {
    console.error("Ошибка при запросе к OpenAI:", error);
    aiResponseText = "Ой, кажется, мой ИИ-мозг немного завис. Проверь ключи!";
  }

  // 4. Отправляем ответ от нейросети обратно тебе в Телеграм
  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: aiResponseText
    })
  });

  // Говорим Телеграму, что всё прошло отлично
  return res.status(200).send('OK');
}