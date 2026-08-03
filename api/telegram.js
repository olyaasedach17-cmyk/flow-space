export default async function handler(req, res) {
  // Проверяем, что запрос пришел именно от Telegram
  if (req.method === 'POST') {
    try {
      const message = req.body.message;
      
      // Если это не текст (а стикер или фото) - игнорируем
      if (!message || !message.text) {
        return res.status(200).send('OK');
      }

      const chatId = message.chat.id;
      const text = message.text;
      
      const botToken = process.env.TELEGRAM_TOKEN;
      
      // Пока что делаем простую "заглушку", чтобы проверить связь
      const replyText = `Привет! Я Ассистент Flow Space. Я получил твое сообщение: "${text}". Совсем скоро я научусь превращать это в задачи!`;

      // Отправляем ответ обратно в Telegram
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: replyText 
        })
      });

      // Обязательно говорим Телеграму, что всё прошло успешно
      return res.status(200).send('OK');
      
    } catch (error) {
      console.error('Ошибка в боте:', error);
      return res.status(500).send('Error');
    }
  } else {
    // Если просто открыть ссылку в браузере
    res.status(200).send('Мозг бота Flow Space успешно запущен!');
  }
}