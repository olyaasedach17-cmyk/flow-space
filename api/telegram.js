import * as admin from 'firebase-admin';

// Инициализация базы данных через единый JSON
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Ошибка инициализации Firebase:', error);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Мозг бота готов к работе с базой!');
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
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
       throw new Error("Не найден ключ FIREBASE_SERVICE_ACCOUNT в Vercel!");
    }

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
      const aiResultString = aiData.choices[0].message.content;
      const aiResult = JSON.parse(aiResultString);
      
      aiResponseText = aiResult.reply;

      await db.collection('tasks').add({
        title: aiResult.title,
        time: aiResult.time,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'telegram'
      });
    }

  } catch (error) {
    console.error("Ошибка в процессе обработки:", error);
    aiResponseText = `Произошла ошибка: ${error.message}`;
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