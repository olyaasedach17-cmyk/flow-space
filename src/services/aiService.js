import { auth } from '../firebase';

/**
 * Безопасный парсинг JSON-ответа от ИИ с очисткой Markdown-блоков
 */
export const safeParseAIJSON = (rawContent) => {
  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed) && typeof parsed !== 'object') {
    throw new Error('Ответ от AI не является валидным JSON-объектом');
  }
  return parsed;
};

/**
 * Отправка запроса к серверному эндпоинту нейросети с передачей Firebase Auth токена
 */
export async function callServerAI(endpointData) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Для использования ИИ необходимо войти в аккаунт');
  }

  const token = await currentUser.getIdToken();

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(endpointData)
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Ошибка сервера: ${response.status}`);
  }
  return data;
}