import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error('Ошибка инициализации Firebase:', error);
  }
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Мозг бота готов к работе с базой!');
  }

  const body = req.body;
  if (!body.message || !body.message.text) {
    return res.status(200).send('OK');
  }

  const chatId = body.message.chat.id.toString(); // Превращаем ID в строку для надежности
  const userText = body.message.text;

  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  let aiResponseText = "";
  let targetUserId = null;

  try {
    // 1. ПРОВЕРКА ПАСПОРТА (Ищем юзера в базе по chatId)
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('telegramChatId', '==', chatId).get();

    if (snapshot.empty) {
      // Юзер не найден в базе
      aiResponseText = `🔒 Ошибка доступа.\n\nЯ вас не узнаю. Ваш Telegram ID: ${chatId}\n\nПожалуйста, укажите этот ID в настройках вашего профиля в приложении, чтобы я мог сохранять ваши задачи.`;
    } else {
      // Юзер найден! Берем его ID из базы
      const userDoc = snapshot.docs[0];
      targetUserId = userDoc.id; // Предполагаем, что ID документа - это и есть UID пользователя

      // 2. ОБРАЩЕНИЕ К ИИ (Только если юзер авторизован)
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

 // 3. СОХРАНЕНИЕ В БАЗУ (С правильными полями для фронтенда!)
        await db.collection('tasks').add({
          text: aiResult.title, // Заменили title на text
          time: aiResult.time,
          status: 'todo',       // Добавили статус по умолчанию
          createdAt: FieldValue.serverTimestamp(),
          source: 'telegram',
          userId: targetUserId
        });

  // ОТПРАВКА ОТВЕТА В ТЕЛЕГРАМ
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