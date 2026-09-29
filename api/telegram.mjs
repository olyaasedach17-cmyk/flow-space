import { getAdminDb, requireFirebaseUser } from './_firebaseAdmin.mjs';
import { randomBytes } from 'node:crypto';
import { requestAI } from './_aiProvider.mjs';

const EVENT_KEYS = new Set(['urgent_task', 'result_submitted', 'result_returned', 'deadline_risk', 'owner_decision']);

function getTelegramToken() {
  return process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
}

async function telegramRequest(botToken, method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data?.description || `Telegram API error (${response.status})`);
  return data.result || data;
}

const safeChatKey = (chatId) => String(chatId).replace('-', 'm_').replace(/[^A-Za-z0-9_]/g, '');

export function inferTelegramPriority(text = '') {
  const source = String(text || '').toLowerCase();
  return {
    urgent: /(срочн|немедленн|горит|аврал)|как можно скорее|до конца дня|нужно сегодня/.test(source),
    important: /(важн|приоритет|ключев|критич|обязательн)/.test(source),
  };
}

export function normalizeTelegramPreview(value = {}, sourceText = '') {
  const inferred = inferTelegramPriority(sourceText);
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(String(value.dueDate || '')) ? String(value.dueDate) : '';
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.time || '')) ? String(value.time) : '';
  return {
    text: String(value.text || sourceText || 'Новая задача').trim().slice(0, 180),
    description: String(value.description || sourceText || '').trim().slice(0, 4000),
    expectedResult: String(value.expectedResult || '').trim().slice(0, 1000),
    dueDate,
    time,
    urgent: Boolean(value.urgent || inferred.urgent),
    important: Boolean(value.important || inferred.important),
    source: value.source === 'telegram_voice' ? 'telegram_voice' : 'telegram_text',
  };
}

const stripJsonFence = (value) => String(value || '').replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();

async function parseTelegramTask(text, source = 'telegram_text') {
  const fallback = normalizeTelegramPreview({ source }, text);
  try {
    const result = await requestAI({
      temperature: 0.1,
      max_tokens: 700,
      messages: [{
        role: 'system',
        content: `Из сообщения пользователя выдели одну задачу. Верни только JSON: {"text":"Краткое название","description":"Детали","expectedResult":"Результат, если понятен","dueDate":"YYYY-MM-DD или пусто","time":"HH:MM или пусто","urgent":true/false,"important":true/false}. Сегодня ${new Date().toISOString().slice(0, 10)}. Срочно/сегодня/немедленно/горит означает urgent=true. Важно/приоритет/ключевое/обязательно означает important=true. Сообщение: ${String(text).slice(0, 4000)}`,
      }],
    });
    const parsed = JSON.parse(stripJsonFence(result.choices?.[0]?.message?.content));
    return normalizeTelegramPreview({ ...parsed, source }, text);
  } catch {
    return fallback;
  }
}

async function transcribeTelegramVoice({ botToken, voice, request }) {
  if (!voice?.file_id) throw new Error('Голосовое сообщение не содержит файла.');
  if (Number(voice.file_size || 0) > 20 * 1024 * 1024) throw new Error('Голосовое сообщение слишком большое. Максимум 20 МБ.');
  if (!process.env.POLZA_API_KEY) throw new Error('Распознавание голоса не настроено на сервере.');
  const file = await request(botToken, 'getFile', { file_id: voice.file_id });
  if (!file?.file_path) throw new Error('Telegram не вернул голосовой файл.');
  const audioResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${file.file_path}`, { signal: AbortSignal.timeout(30000) });
  if (!audioResponse.ok) throw new Error('Не удалось скачать голосовое сообщение.');
  const audio = await audioResponse.arrayBuffer();
  const form = new FormData();
  form.append('file', new Blob([audio], { type: voice.mime_type || 'audio/ogg' }), 'telegram-voice.ogg');
  form.append('model', process.env.POLZA_TRANSCRIPTION_MODEL || 'openai/whisper-large-v3');
  form.append('language', 'ru');
  const response = await fetch('https://polza.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.POLZA_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !String(data.text || '').trim()) throw new Error(data.error?.message || 'Не удалось распознать голосовое сообщение.');
  return String(data.text).trim();
}

async function findCompanyByChat(db, chatId) {
  const snapshot = await db.collection('companies').where('settings.telegramChatId', '==', String(chatId)).limit(1).get();
  const company = snapshot.docs?.[0];
  return company ? { id: company.id, data: company.data(), ref: company.ref } : null;
}

const draftRef = (companyRef, chatId) => companyRef.collection('telegramTaskDrafts').doc(safeChatKey(chatId));

const formatPreview = (preview) => [
  '📝 Проверьте задачу',
  '',
  preview.text,
  preview.dueDate ? `📅 ${preview.dueDate}${preview.time ? ` · ${preview.time}` : ''}` : '',
  preview.urgent ? '🔥 Срочно' : '',
  preview.important ? '💎 Важно' : '',
  '',
  'Создать задачу или отменить?',
].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join('\n');

async function ensureWebhook(botToken, request) {
  const origin = String(process.env.APP_URL || '').replace(/\/$/, '');
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!origin || !secret) return false;
  await request(botToken, 'setWebhook', {
    url: `${origin}/api/telegram`,
    secret_token: secret,
    allowed_updates: ['message'],
    drop_pending_updates: false,
  });
  return true;
}

export function createTelegramHandler({ authenticate = requireFirebaseUser, database = getAdminDb, tokenProvider = getTelegramToken, request = telegramRequest, locateCompany = findCompanyByChat, parseTask = parseTelegramTask, transcribeVoice = transcribeTelegramVoice } = {}) {
 return async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const botToken = tokenProvider();
  const body = req.body || {};

  if (body.update_id && body.message) {
    if (!botToken) return res.status(503).json({ error: 'Telegram is not configured.' });
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret && req.headers['x-telegram-bot-api-secret-token'] !== webhookSecret) {
      return res.status(401).json({ error: 'Invalid Telegram webhook secret.' });
    }
    const chatId = body.message?.chat?.id;
    if (!chatId) return res.status(200).json({ ok: true });
    try {
      const incomingText = String(body.message?.text || '').trim();
      if (incomingText.startsWith('/start')) {
        const connectCode = incomingText.split(/\s+/)[1] || '';
        if (/^fs_[a-f0-9]{16}$/.test(connectCode)) {
          const db = database();
          const pending = await db.collection('companies').where('settings.telegramConnectCode', '==', connectCode).limit(1).get();
          const company = pending.docs?.[0];
          const companyData = company?.data?.() || {};
          const expiresAt = Date.parse(companyData.settings?.telegramConnectExpiresAt || '');
          if (company && Number.isFinite(expiresAt) && expiresAt >= Date.now()) {
            await company.ref.update({
              'settings.telegramChatId': String(chatId),
              'settings.notifications.telegramEnabled': true,
              'settings.telegramConnectCode': null,
              'settings.telegramConnectExpiresAt': null,
            });
            await request(botToken, 'sendMessage', { chat_id: chatId, text: '✅ Telegram подключён к Flow Space. Теперь можно отправлять сюда текст или голосовые задачи.' });
            return res.status(200).json({ ok: true, connected: true });
          }
          await request(botToken, 'sendMessage', { chat_id: chatId, text: 'Ссылка подключения истекла. Создайте новую ссылку в настройках Flow Space.' });
          return res.status(200).json({ ok: true, connected: false });
        }
        const db = database();
        const linked = await locateCompany(db, chatId);
        if (linked) {
          await request(botToken, 'sendMessage', {
            chat_id: chatId,
            text: '✅ Telegram уже подключён к Flow Space. Отправьте сюда текст или голосовое сообщение с задачей — перед созданием я покажу её для проверки.',
          });
          return res.status(200).json({ ok: true, connected: true });
        }
        await request(botToken, 'sendMessage', { chat_id: chatId, text: `Привет! Я ассистент Flow Space.\nВаш Telegram ID: ${chatId}\n\nВернитесь в настройки Flow Space и завершите подключение.` });
        return res.status(200).json({ ok: true });
      }

      const db = database();
      const linked = await locateCompany(db, chatId);
      if (!linked) {
        await request(botToken, 'sendMessage', { chat_id: chatId, text: 'Сначала подключите этот Telegram-аккаунт в настройках Flow Space.' });
        return res.status(200).json({ ok: true, skipped: true });
      }
      const previewRef = draftRef(linked.ref, chatId);
      const command = incomingText.toLowerCase();

      if (['отмена', 'отменить', '/cancel'].includes(command)) {
        await previewRef.delete();
        await request(botToken, 'sendMessage', { chat_id: chatId, text: 'Создание задачи отменено.', reply_markup: { remove_keyboard: true } });
        return res.status(200).json({ ok: true, cancelled: true });
      }

      if (['создать', 'подтвердить', 'да', '/create'].includes(command)) {
        const snapshot = await previewRef.get();
        if (!snapshot.exists) {
          await request(botToken, 'sendMessage', { chat_id: chatId, text: 'Сначала отправьте текст или голосовое сообщение с задачей.' });
          return res.status(200).json({ ok: true, skipped: true });
        }
        const preview = snapshot.data() || {};
        const createdAt = new Date().toISOString();
        const taskId = `telegram_${Date.now()}_${randomBytes(3).toString('hex')}`;
        await linked.ref.collection('tasks').doc(taskId).set({
          id: taskId,
          text: preview.text,
          description: preview.description || '',
          expectedResult: preview.expectedResult || '',
          successCriteria: [],
          status: 'todo',
          urgent: Boolean(preview.urgent),
          important: Boolean(preview.important),
          assigneeId: linked.data?.ownerId || linked.id,
          assigneeName: 'Владелец',
          departmentId: '',
          departmentName: '',
          createdBy: linked.data?.ownerId || linked.id,
          createdAt,
          updatedAt: createdAt,
          dueDate: preview.dueDate || '',
          time: preview.time || '',
          recurrence: 'none',
          reminder: 'none',
          category: 'work',
          completedAt: null,
          estimatedMinutes: 0,
          estimatedHours: 0,
          actualMinutes: 0,
          resultArtifact: { url: '', note: '' },
          submittedAt: null,
          acceptedAt: null,
          acceptedBy: null,
          reviewAttempts: 0,
          reopenedCount: 0,
          reviewHistory: [],
          aiAgentId: '',
          aiExecutionHistory: [],
          source: preview.source || 'telegram_text',
        });
        await previewRef.delete();
        await request(botToken, 'sendMessage', { chat_id: chatId, text: `✅ Задача создана: ${preview.text}`, reply_markup: { remove_keyboard: true } });
        return res.status(200).json({ ok: true, created: true, taskId });
      }

      let sourceText = incomingText;
      let source = 'telegram_text';
      if (body.message?.voice) {
        sourceText = await transcribeVoice({ botToken, voice: body.message.voice, request });
        source = 'telegram_voice';
      }
      if (!sourceText) {
        await request(botToken, 'sendMessage', { chat_id: chatId, text: 'Отправьте текст или голосовое сообщение с задачей.' });
        return res.status(200).json({ ok: true, skipped: true });
      }
      const preview = normalizeTelegramPreview(await parseTask(sourceText, source), sourceText);
      await previewRef.set({ ...preview, createdAt: new Date().toISOString() });
      await request(botToken, 'sendMessage', {
        chat_id: chatId,
        text: formatPreview(preview),
        reply_markup: { keyboard: [['Создать', 'Отмена']], resize_keyboard: true, one_time_keyboard: true },
      });
      return res.status(200).json({ ok: true });
    } catch (error) {
      try { await request(botToken, 'sendMessage', { chat_id: chatId, text: `Не удалось подготовить задачу: ${error.message}` }); } catch {}
      return res.status(502).json({ error: error.message });
    }
  }

  let actor;
  try { actor = await authenticate(req); }
  catch (error) { return res.status(error.statusCode || 401).json({ error: error.message }); }
  if (!botToken) return res.status(503).json({ error: 'Telegram-бот ещё не настроен на сервере.' });

  const companyId = String(body.companyId || '').trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(companyId)) return res.status(400).json({ error: 'Некорректное пространство.' });
  const db = database();
  const companyRef = db.doc(`companies/${companyId}`);
  const memberRef = db.doc(`companies/${companyId}/members/${actor.uid}`);
  const [memberSnap, companySnap] = await Promise.all([
    memberRef.get(),
    companyRef.get(),
  ]);
  if (!memberSnap.exists || !companySnap.exists) return res.status(403).json({ error: 'Нет доступа к настройкам Telegram.' });
  const membership = memberSnap.data() || {};
  const settings = companySnap.data()?.settings || {};

  if (body.action === 'info') {
    try {
      const bot = await request(botToken, 'getMe');
      if (settings.telegramChatId && membership.role === 'owner') await ensureWebhook(botToken, request).catch(() => false);
      let connectedAccount = null;
      if (settings.telegramChatId && membership.role === 'owner') {
        try {
          const chat = await request(botToken, 'getChat', { chat_id: String(settings.telegramChatId) });
          connectedAccount = {
            username: chat.username || '',
            firstName: chat.first_name || '',
            type: chat.type || '',
          };
        } catch {
          connectedAccount = { username: '', firstName: '', type: '', unavailable: true };
        }
      }
      return res.status(200).json({ configured: true, username: bot.username || '', connected: Boolean(settings.telegramChatId), connectedAccount, canManage: membership.role === 'owner' });
    } catch (error) {
      return res.status(502).json({ error: `Telegram-бот недоступен: ${error.message}` });
    }
  }

  if (body.action === 'begin_connection') {
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Подключить Telegram может собственник.' });
    try {
      const bot = await request(botToken, 'getMe');
      const code = `fs_${randomBytes(8).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await companyRef.update({
        'settings.telegramConnectCode': code,
        'settings.telegramConnectExpiresAt': expiresAt,
      });
      return res.status(200).json({
        ok: true,
        username: bot.username || '',
        deepLink: bot.username ? `https://t.me/${bot.username}?start=${code}` : '',
        expiresAt,
      });
    } catch (error) {
      return res.status(502).json({ error: error.message });
    }
  }

  if (body.action === 'complete_connection') {
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Подключить Telegram может собственник.' });
    if (settings.telegramChatId) {
      await ensureWebhook(botToken, request).catch(() => false);
      return res.status(200).json({ ok: true, chatId: String(settings.telegramChatId), alreadyConnected: true });
    }
    const code = String(settings.telegramConnectCode || '');
    const expiresAt = Date.parse(settings.telegramConnectExpiresAt || '');
    if (!code || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      return res.status(409).json({ error: 'Код подключения истёк. Начните подключение заново.' });
    }
    try {
      const updates = await request(botToken, 'getUpdates', { limit: 100, timeout: 0, allowed_updates: ['message'] });
      const match = [...(Array.isArray(updates) ? updates : [])].reverse().find((update) => {
        const text = String(update?.message?.text || '').trim();
        return text === `/start ${code}` && update?.message?.chat?.type === 'private';
      });
      const chatId = match?.message?.chat?.id;
      if (!chatId) return res.status(409).json({ error: 'Сообщение Start пока не найдено. Откройте бота по кнопке и нажмите Start.' });
      await companyRef.update({
        'settings.telegramChatId': String(chatId),
        'settings.notifications.telegramEnabled': true,
        'settings.telegramConnectCode': null,
        'settings.telegramConnectExpiresAt': null,
      });
      await request(botToken, 'sendMessage', { chat_id: chatId, text: '✅ Telegram подключён к Flow Space. Важные уведомления будут приходить сюда.' });
      await ensureWebhook(botToken, request).catch(() => false);
      return res.status(200).json({ ok: true, chatId: String(chatId) });
    } catch (error) {
      return res.status(502).json({ error: error.message });
    }
  }

  if (body.action === 'disconnect') {
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Отключить Telegram может собственник.' });
    await companyRef.update({
      'settings.telegramChatId': null,
      'settings.notifications.telegramEnabled': false,
      'settings.telegramConnectCode': null,
      'settings.telegramConnectExpiresAt': null,
    });
    return res.status(200).json({ ok: true });
  }

  if (body.action === 'test') {
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Проверить подключение может собственник.' });
    const chatId = String(settings.telegramChatId || body.chatId || '').trim();
    if (!/^-?\d{4,20}$/.test(chatId)) return res.status(409).json({ error: 'Telegram не подключён. Подключите бота заново.' });
    try {
      const sent = await request(botToken, 'sendMessage', { chat_id: chatId, text: `✅ Тест Flow Space · ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' })}\nУведомления для этого пространства доставляются в этот чат.` });
      let chat = null;
      try { chat = await request(botToken, 'getChat', { chat_id: chatId }); } catch {}
      return res.status(200).json({
        ok: true,
        messageId: sent?.message_id || null,
        recipient: chat ? { username: chat.username || '', firstName: chat.first_name || '', type: chat.type || '' } : null,
      });
    } catch (error) {
      return res.status(502).json({ error: error.message });
    }
  }

  if (body.action !== 'send' || !EVENT_KEYS.has(body.eventType)) return res.status(400).json({ error: 'Некорректный тип уведомления.' });
  const notificationSettings = settings.notifications || {};
  if (notificationSettings.telegramEnabled === false || notificationSettings[body.eventType] === false) {
    return res.status(200).json({ ok: true, skipped: true });
  }
  const chatId = String(settings.telegramChatId || '').trim();
  const message = String(body.message || '').trim();
  if (!chatId) return res.status(200).json({ ok: true, skipped: true, reason: 'not_connected' });
  if (!message || message.length > 4000) return res.status(400).json({ error: 'Некорректный текст уведомления.' });

  try {
    await request(botToken, 'sendMessage', { chat_id: chatId, text: message });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
 };
}

export default createTelegramHandler();
