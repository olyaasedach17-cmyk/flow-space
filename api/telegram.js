import admin from 'firebase-admin';

// Инициализируем базу данных (проверяем, чтобы не запускать дважды)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Обязательный фикс для правильного чтения ключа в Vercel
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Ошибка инициализации Firebase:', error);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Мозг бота готов к сохранению задач!');
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
    // 1. Просим ИИ выдать ответ в формате JSON (для базы данных)
    const aiResponse = await fetch('https://api.proxyapi.ru/openai/v1/chat/completions', {
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
            content: 'Ты ассистент. Пользователь пишет тебе задачу. Твоя цель — вернуть ответ СТРОГО в формате JSON. Формат: {"title": "Краткое название задачи", "time": "Время или дата (если есть, иначе null)", "reply": "Короткий дружелюбный ответ пользователю, что задача записана"}. Никакого другого текста, кроме JSON, быть не должно.'
          },
          { role: 'user', content: userText }
        ]
      })
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      aiResponseText = `Ошибка ИИ: ${aiData.error?.message || 'Неизвестно'}`;
    } else {
      // 2. Расшифровываем JSON от нейросети
      const aiResultString = aiData.choices[0].message.content;
      const aiResult = JSON.parse(aiResultString);
      
      aiResponseText = aiResult.reply;

      // 3. Сохраняем готовую задачу в твою базу данных Firebase (в коллекцию tasks)
      await db.collection('tasks').add({
        title: aiResult.title,
        time: aiResult.time,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'telegram'
      });
    }

  } catch (error) {
    console.error("Ошибка в процессе обработки:", error);
    aiResponseText = "Произошла ошибка при сохранении задачи в базу данных.";
  }

  // 4. Отправляем ответ в Телеграм
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