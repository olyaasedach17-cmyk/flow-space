import { auth } from '../firebase';

export const INTEGRATIONS = [
  { id: 'google_sheets', provider: 'google', label: 'Google Sheets', description: 'Читать таблицы, анализировать показатели и записывать результаты обратно.', scope: 'sheets' },
  { id: 'google_drive', provider: 'google', label: 'Google Drive', description: 'Читать разрешённые файлы и сохранять готовые AI-материалы обратно в Drive.', scope: 'drive' },
  { id: 'google_docs', provider: 'google', label: 'Google Docs', description: 'Брать исходные документы и превращать их в готовые материалы.', scope: 'docs' },
  { id: 'google_calendar', provider: 'google', label: 'Google Calendar', description: 'Учитывать встречи, дедлайны и свободное время.', scope: 'calendar' },
];

export async function authFetch(url, options = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Нужно войти в Flow Space');
  const { timeoutMs = 20000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const request = async (forceRefresh = false) => {
      const token = await currentUser.getIdToken(forceRefresh);
      return fetch(url, {
        ...fetchOptions,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(fetchOptions.headers || {}),
        },
      });
    };
    let response = await request(false);
    if (response.status === 401) response = await request(true);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(response.status === 401 ? 'Сессия истекла. Войдите в Flow Space заново.' : data.error || 'Ошибка интеграции');
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Сервер интеграций не ответил. Попробуйте ещё раз через несколько секунд.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const getGoogleIntegrationStatus = (companyId) =>
  authFetch(`/api/google?action=status&companyId=${encodeURIComponent(companyId)}&_=${Date.now()}`, { method: 'GET' });

export const startGoogleIntegration = async ({ companyId, scope }) => {
  const data = await authFetch('/api/google', {
    method: 'POST',
    body: JSON.stringify({ action: 'start', companyId, scope }),
  });
  if (!data.url) throw new Error('Google OAuth URL не получен');
  window.location.assign(data.url);
};

export const disconnectGoogleIntegration = ({ companyId }) =>
  authFetch('/api/google', {
    method: 'POST',
    body: JSON.stringify({ action: 'disconnect', companyId }),
  });

export const readGoogleSheet = ({ companyId, spreadsheetId, range }) =>
  authFetch('/api/google', {
    method: 'POST',
    body: JSON.stringify({ action: 'sheets_read', companyId, spreadsheetId, range }),
  });

export const writeGoogleSheet = ({ companyId, spreadsheetId, range, values }) =>
  authFetch('/api/google', {
    method: 'POST',
    body: JSON.stringify({ action: 'sheets_write', companyId, spreadsheetId, range, values }),
  });


export const readGoogleDoc = ({ companyId, documentId }) =>
  authFetch('/api/google', {
    method: 'POST',
    body: JSON.stringify({ action: 'docs_read', companyId, documentId }),
  });

export const listGoogleDriveFiles = ({ companyId, query = '' }) =>
  authFetch('/api/google', {
    method: 'POST',
    body: JSON.stringify({ action: 'drive_list', companyId, query }),
  });

export const readGoogleCalendarEvents = ({ companyId }) =>
  authFetch('/api/google', {
    method: 'POST',
    body: JSON.stringify({ action: 'calendar_events', companyId }),
  });

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export async function uploadArtifactToGoogleDrive({ companyId, artifact, folderId = '' }) {
  if (!artifact?.blob || !artifact?.filename) throw new Error('Файл для загрузки не найден');
  if (artifact.blob.size > 3 * 1024 * 1024) throw new Error('Файл больше 3 МБ — уменьшите объём результата');
  const base64 = await blobToBase64(artifact.blob);
  return authFetch('/api/google', {
    method: 'POST',
    timeoutMs: 60000,
    body: JSON.stringify({
      action: 'drive_upload',
      companyId,
      filename: artifact.filename,
      contentType: artifact.contentType || artifact.blob.type || 'application/octet-stream',
      base64,
      folderId: String(folderId || '').trim(),
    }),
  });
}
