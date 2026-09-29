import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelegramHandler, inferTelegramPriority, normalizeTelegramPreview } from '../api/telegram.mjs';

function fixture({ role = 'owner', settings = { telegramChatId: '123456' } } = {}) {
  const rows = new Map([
    ['companies/a/members/u', { role, name: 'Тест' }],
    ['companies/a', { settings }],
  ]);
  const calls = [];
  const setPath = (target, dottedPath, value) => {
    const parts = dottedPath.split('.');
    let current = target;
    parts.slice(0, -1).forEach((part) => { current[part] ||= {}; current = current[part]; });
    current[parts.at(-1)] = value;
  };
  const database = { doc: (path) => ({
    get: async () => ({ exists: rows.has(path), data: () => rows.get(path) }),
    update: async (patch) => {
      const row = rows.get(path) || {};
      Object.entries(patch).forEach(([key, value]) => setPath(row, key, value));
      rows.set(path, row);
    },
  }) };
  let telegramUpdates = [];
  const handler = createTelegramHandler({
    authenticate: async () => ({ uid: 'u' }),
    database: () => database,
    tokenProvider: () => 'server-token',
    request: async (token, method, payload) => {
      calls.push({ token, method, payload });
      if (method === 'getMe') return { username: 'flow_space_bot' };
      if (method === 'getChat') return { username: 'owner_account', first_name: 'Ольга', type: 'private' };
      if (method === 'getUpdates') return telegramUpdates;
      return { message_id: 1 };
    },
  });
  const request = async (body) => {
    let result;
    const res = { status(code) { this.code = code; return this; }, json(data) { result = { code: this.code, data }; } };
    await handler({ method: 'POST', headers: {}, body: { companyId: 'a', ...body } }, res);
    return result;
  };
  return { calls, request, rows, setTelegramUpdates: (updates) => { telegramUpdates = updates; } };
}

test('notification uses server token and stored company chat', async () => {
  const f = fixture();
  const result = await f.request({ action: 'send', eventType: 'result_submitted', message: 'Готово', chatId: '999999' });
  assert.equal(result.code, 200);
  assert.equal(f.calls[0].token, 'server-token');
  assert.equal(f.calls[0].payload.chat_id, '123456');
});

test('disabled notification is skipped without Telegram request', async () => {
  const f = fixture({ settings: { telegramChatId: '123456', notifications: { result_returned: false } } });
  const result = await f.request({ action: 'send', eventType: 'result_returned', message: 'Доработать' });
  assert.equal(result.data.skipped, true);
  assert.equal(f.calls.length, 0);
});

test('only owner can test a candidate chat id', async () => {
  const f = fixture({ role: 'manager' });
  assert.equal((await f.request({ action: 'test', chatId: '123456' })).code, 403);
  assert.equal(f.calls.length, 0);
});

test('owner test uses stored chat and returns Telegram delivery receipt', async () => {
  const f = fixture();
  const result = await f.request({ action: 'test', chatId: '999999' });
  assert.equal(result.code, 200);
  assert.equal(result.data.messageId, 1);
  assert.equal(result.data.recipient.username, 'owner_account');
  assert.equal(f.calls[0].method, 'sendMessage');
  assert.equal(f.calls[0].payload.chat_id, '123456');
  assert.equal(f.calls[1].method, 'getChat');
});

test('owner connects Telegram through a one-time Start link', async () => {
  const f = fixture({ settings: {} });
  const started = await f.request({ action: 'begin_connection' });
  assert.equal(started.code, 200);
  assert.match(started.data.deepLink, /^https:\/\/t\.me\/flow_space_bot\?start=fs_[a-f0-9]{16}$/);
  const company = f.rows.get('companies/a');
  const code = company.settings.telegramConnectCode;
  f.setTelegramUpdates([{ message: { text: `/start ${code}`, chat: { id: 654321, type: 'private' } } }]);

  const completed = await f.request({ action: 'complete_connection' });
  assert.equal(completed.code, 200);
  assert.equal(completed.data.chatId, '654321');
  assert.equal(company.settings.telegramChatId, '654321');
  assert.equal(company.settings.notifications.telegramEnabled, true);
  assert.equal(f.calls.at(-1).method, 'sendMessage');
});

test('owner can disconnect Telegram and disable its notifications', async () => {
  const f = fixture();
  const result = await f.request({ action: 'disconnect' });
  assert.equal(result.code, 200);
  const settings = f.rows.get('companies/a').settings;
  assert.equal(settings.telegramChatId, null);
  assert.equal(settings.notifications.telegramEnabled, false);
});

test('only owner can disconnect Telegram', async () => {
  const f = fixture({ role: 'manager' });
  assert.equal((await f.request({ action: 'disconnect' })).code, 403);
});

test('Telegram Start link can finish reconnection through the webhook', async () => {
  const settings = {
    telegramConnectCode: 'fs_0123456789abcdef',
    telegramConnectExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    notifications: {},
  };
  const companyRef = {
    update: async (patch) => {
      for (const [key, value] of Object.entries(patch)) {
        const parts = key.split('.');
        let current = { settings };
        for (const part of parts.slice(0, -1)) current = current[part];
        current[parts.at(-1)] = value;
      }
    },
  };
  const database = {
    collection: () => ({
      where: () => ({
        limit: () => ({
          get: async () => ({ docs: [{ ref: companyRef, data: () => ({ settings }) }] }),
        }),
      }),
    }),
  };
  const calls = [];
  const handler = createTelegramHandler({
    database: () => database,
    tokenProvider: () => 'server-token',
    request: async (token, method, payload) => { calls.push({ method, payload }); return { message_id: 1 }; },
  });
  let result;
  const res = { status(code) { this.code = code; return this; }, json(data) { result = { code: this.code, data }; } };
  await handler({
    method: 'POST',
    headers: {},
    body: { update_id: 1, message: { text: '/start fs_0123456789abcdef', chat: { id: 7654321, type: 'private' } } },
  }, res);

  assert.equal(result.code, 200);
  assert.equal(result.data.connected, true);
  assert.equal(settings.telegramChatId, '7654321');
  assert.equal(settings.notifications.telegramEnabled, true);
  assert.match(calls.at(-1).payload.text, /Telegram подключён/);
});

function webhookFixture() {
  let draft = null;
  const tasks = new Map();
  const calls = [];
  const previewRef = {
    get: async () => ({ exists: Boolean(draft), data: () => draft }),
    set: async (value) => { draft = value; },
    delete: async () => { draft = null; },
  };
  const companyRef = {
    collection(name) {
      if (name === 'telegramTaskDrafts') return { doc: () => previewRef };
      if (name === 'tasks') return { doc: (id) => ({ set: async (value) => tasks.set(id, value) }) };
      throw new Error(`Unexpected collection: ${name}`);
    },
  };
  const handler = createTelegramHandler({
    database: () => ({}),
    tokenProvider: () => 'server-token',
    locateCompany: async () => ({ id: 'a', data: { ownerId: 'owner-a' }, ref: companyRef }),
    parseTask: async (text, source) => normalizeTelegramPreview({ text: 'Подготовить отчёт', important: true, source }, text),
    transcribeVoice: async () => 'Срочно подготовить важный отчёт',
    request: async (token, method, payload) => { calls.push({ token, method, payload }); return { message_id: 1 }; },
  });
  const webhook = async (message) => {
    let result;
    const res = { status(code) { this.code = code; return this; }, json(data) { result = { code: this.code, data }; } };
    await handler({ method: 'POST', headers: {}, body: { update_id: Date.now(), message: { chat: { id: 123456, type: 'private' }, ...message } } }, res);
    return result;
  };
  return { webhook, tasks, calls, getDraft: () => draft };
}

test('telegram text creates a preview and waits for confirmation', async () => {
  const f = webhookFixture();
  const previewed = await f.webhook({ text: 'Важно подготовить отчёт' });
  assert.equal(previewed.code, 200);
  assert.equal(f.tasks.size, 0);
  assert.equal(f.getDraft().text, 'Подготовить отчёт');
  assert.match(f.calls.at(-1).payload.text, /Проверьте задачу/);
  assert.deepEqual(f.calls.at(-1).payload.reply_markup.keyboard, [['Создать', 'Отмена']]);

  const created = await f.webhook({ text: 'Создать' });
  assert.equal(created.data.created, true);
  assert.equal(f.tasks.size, 1);
  assert.equal([...f.tasks.values()][0].status, 'todo');
  assert.equal([...f.tasks.values()][0].important, true);
  assert.equal(f.getDraft(), null);
});

test('plain Start confirms an account that is already connected', async () => {
  const f = webhookFixture();
  const result = await f.webhook({ text: '/start' });
  assert.equal(result.code, 200);
  assert.equal(result.data.connected, true);
  assert.match(f.calls.at(-1).payload.text, /уже подключён/);
  assert.match(f.calls.at(-1).payload.text, /текст или голосовое/);
});

test('telegram voice is transcribed into a preview without immediate creation', async () => {
  const f = webhookFixture();
  const result = await f.webhook({ voice: { file_id: 'voice-1', file_size: 1000, mime_type: 'audio/ogg' } });
  assert.equal(result.code, 200);
  assert.equal(f.tasks.size, 0);
  assert.equal(f.getDraft().source, 'telegram_voice');
});

test('telegram priority fallback understands natural Russian speech', () => {
  assert.deepEqual(inferTelegramPriority('Срочно и важно отправить договор до конца дня'), { urgent: true, important: true });
});
