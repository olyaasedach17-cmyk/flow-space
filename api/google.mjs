import crypto from 'crypto';
import { getAdminDb, requireFirebaseUser } from './_firebaseAdmin.mjs';
import { requireCompanyAccess as requireWorkspaceAccess } from './_companyAccess.mjs';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v2/userinfo';
const IDENTITY_SCOPES = ['openid', 'email', 'profile'];

const SCOPE_MAP = {
  sheets: ['https://www.googleapis.com/auth/spreadsheets'],
  drive: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file'],
  docs: ['https://www.googleapis.com/auth/documents.readonly', 'https://www.googleapis.com/auth/drive.readonly'],
  calendar: ['https://www.googleapis.com/auth/calendar.readonly'],
};

const safeJson = async (response) => response.json().catch(() => ({}));
export const escapeDriveQueryValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function getConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET;
  const appUrl = (process.env.APP_URL || process.env.VERCEL_URL || '').replace(/\/$/, '');
  if (!clientId || !clientSecret || !stateSecret || !appUrl) {
    const error = new Error('Google integration is not configured on the server.');
    error.statusCode = 503;
    throw error;
  }
  const origin = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
  return { clientId, clientSecret, stateSecret, origin, redirectUri: `${origin}/api/google?action=callback` };
}

function signState(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(value, secret) {
  const [body, sig] = String(value || '').split('.');
  if (!body || !sig) throw new Error('Invalid OAuth state.');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid OAuth state.');
  const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!data.exp || Date.now() > data.exp) throw new Error('OAuth state expired.');
  return data;
}

const requireGoogleAccess = (uid, companyId) => requireWorkspaceAccess({ db: getAdminDb(), companyId, user: { uid } });

const secretRef = (uid, companyId) => getAdminDb().doc(`integrationSecrets/${uid}_${companyId}_google`);

async function refreshIfNeeded(secret, config) {
  const now = Date.now();
  if (secret.accessToken && secret.expiresAt && secret.expiresAt > now + 60_000) return secret;
  if (!secret.refreshToken) throw Object.assign(new Error('Google access expired. Reconnect Google Workspace.'), { statusCode: 401 });
  const response = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: secret.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await safeJson(response);
  if (!response.ok) throw Object.assign(new Error(data.error_description || 'Could not refresh Google access.'), { statusCode: 502 });
  const next = { ...secret, accessToken: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  await secretRef(secret.uid, secret.companyId).set(next, { merge: true });
  return next;
}

async function getGoogleSecret(uid, companyId, config) {
  const snap = await secretRef(uid, companyId).get();
  if (!snap.exists) throw Object.assign(new Error('Google Workspace is not connected.'), { statusCode: 409 });
  return refreshIfNeeded(snap.data(), config);
}

async function getGoogleAccount(accessToken) {
  if (!accessToken) return null;
  const response = await fetch(GOOGLE_USERINFO, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await safeJson(response);
  if (!response.ok) return null;
  return { email: data.email || '', name: data.name || '', picture: data.picture || '' };
}

async function handleCallback(req, res) {
  const config = getConfig();
  try {
    const state = verifyState(req.query.state, config.stateSecret);
    await requireGoogleAccess(state.uid, state.companyId);
    if (req.query.error) throw new Error(`Google authorization failed: ${req.query.error}`);
    const code = String(req.query.code || '');
    if (!code) throw new Error('Google authorization code is missing.');
    const response = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = await safeJson(response);
    if (!response.ok) throw new Error(data.error_description || 'Google token exchange failed.');
    const ref = secretRef(state.uid, state.companyId);
    const previous = await ref.get();
    const prev = previous.exists ? previous.data() : {};
    const scopes = Array.from(new Set([...(prev.scopes || []), state.scope]));
    const account = await getGoogleAccount(data.access_token);
    await ref.set({
      uid: state.uid,
      companyId: state.companyId,
      provider: 'google',
      scopes,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || prev.refreshToken || null,
      expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
      ...(account ? { account } : {}),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return res.redirect(302, `${config.origin}/?integration=google&status=connected`);
  } catch (error) {
    const message = encodeURIComponent(error.message || 'Google integration failed');
    return res.redirect(302, `${config.origin}/?integration=google&status=error&message=${message}`);
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query?.action === 'callback') return handleCallback(req, res);
  try {
    const user = await requireFirebaseUser(req);
    const config = getConfig();
    const action = req.method === 'GET' ? req.query?.action : req.body?.action;
    const companyId = req.method === 'GET' ? req.query?.companyId : req.body?.companyId;
    await requireGoogleAccess(user.uid, companyId);

    if (action === 'status') {
      const snap = await secretRef(user.uid, companyId).get();
      const data = snap.exists ? snap.data() : null;
      if (!data?.refreshToken && !data?.accessToken) return res.status(200).json({ connected: false, scopes: [], health: 'disconnected' });
      try {
        const fresh = await refreshIfNeeded(data, config);
        const account = fresh.account || await getGoogleAccount(fresh.accessToken);
        if (account && !fresh.account) await secretRef(user.uid, companyId).set({ account }, { merge: true });
        return res.status(200).json({
          connected: true,
          scopes: fresh.scopes || [],
          health: 'ok',
          account: account || null,
          checkedAt: new Date().toISOString(),
        });
      } catch (healthError) {
        return res.status(200).json({
          connected: true,
          scopes: data.scopes || [],
          health: 'needs_reconnect',
          account: data.account || null,
          checkedAt: new Date().toISOString(),
        });
      }
    }

    if (action === 'start') {
      const scope = String(req.body?.scope || '');
      if (!SCOPE_MAP[scope]) return res.status(400).json({ error: 'Unsupported Google scope.' });
      const state = signState({ uid: user.uid, companyId, scope, exp: Date.now() + 10 * 60 * 1000 }, config.stateSecret);
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        scope: [...IDENTITY_SCOPES, ...SCOPE_MAP[scope]].join(' '),
        state,
      });
      return res.status(200).json({ url: `${GOOGLE_AUTH}?${params.toString()}` });
    }

    if (action === 'disconnect') {
      await secretRef(user.uid, companyId).delete();
      return res.status(200).json({ ok: true });
    }

    const secret = await getGoogleSecret(user.uid, companyId, config);

    if (action === 'sheets_read') {
      if (!(secret.scopes || []).includes('sheets')) return res.status(403).json({ error: 'Google Sheets permission is not granted.' });
      const spreadsheetId = String(req.body?.spreadsheetId || '').trim();
      const range = String(req.body?.range || 'A1:Z1000').trim();
      if (!/^[A-Za-z0-9-_]+$/.test(spreadsheetId)) return res.status(400).json({ error: 'Invalid spreadsheetId.' });
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${secret.accessToken}` } });
      const data = await safeJson(response);
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Google Sheets read failed.' });
      return res.status(200).json({ range: data.range, values: data.values || [] });
    }

    if (action === 'sheets_write') {
      if (!(secret.scopes || []).includes('sheets')) return res.status(403).json({ error: 'Google Sheets permission is not granted.' });
      const spreadsheetId = String(req.body?.spreadsheetId || '').trim();
      const range = String(req.body?.range || '').trim();
      const values = Array.isArray(req.body?.values) ? req.body.values.slice(0, 1000) : null;
      if (!/^[A-Za-z0-9-_]+$/.test(spreadsheetId) || !range || !values) return res.status(400).json({ error: 'spreadsheetId, range and values are required.' });
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${secret.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
      });
      const data = await safeJson(response);
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Google Sheets write failed.' });
      return res.status(200).json({ ok: true, updatedRange: data.updatedRange, updatedCells: data.updatedCells });
    }



    if (action === 'docs_read') {
      if (!(secret.scopes || []).includes('docs')) return res.status(403).json({ error: 'Google Docs permission is not granted.' });
      const documentId = String(req.body?.documentId || '').trim();
      if (!/^[A-Za-z0-9-_]+$/.test(documentId)) return res.status(400).json({ error: 'Invalid documentId.' });
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`, {
        headers: { Authorization: `Bearer ${secret.accessToken}` },
      });
      const data = await safeJson(response);
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Google Docs read failed.' });
      const text = (data.body?.content || []).flatMap((block) => block.paragraph?.elements || [])
        .map((el) => el.textRun?.content || '').join('').trim().slice(0, 120000);
      return res.status(200).json({ documentId, title: data.title || 'Google Doc', text });
    }

    if (action === 'drive_list') {
      const scopes = secret.scopes || [];
      if (!scopes.includes('drive') && !scopes.includes('docs')) return res.status(403).json({ error: 'Google Drive permission is not granted.' });
      const queryText = String(req.body?.query || '').trim().slice(0, 100);
      const q = queryText
        ? `trashed = false and name contains '${escapeDriveQueryValue(queryText)}'`
        : 'trashed = false';
      const params = new URLSearchParams({
        pageSize: '50',
        orderBy: 'modifiedTime desc',
        fields: 'files(id,name,mimeType,modifiedTime,webViewLink,size)',
        q,
      });
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: { Authorization: `Bearer ${secret.accessToken}` },
      });
      const data = await safeJson(response);
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Google Drive list failed.' });
      return res.status(200).json({ files: data.files || [] });
    }

    if (action === 'drive_upload') {
      if (!(secret.scopes || []).includes('drive')) return res.status(403).json({ error: 'Google Drive write permission is not granted.' });
      const filename = String(req.body?.filename || 'flow-space-ai-file').replace(/[\r\n]/g, '').slice(0, 180);
      const requestedContentType = String(req.body?.contentType || '').trim().slice(0, 120);
      const contentType = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(requestedContentType) ? requestedContentType : 'application/octet-stream';
      const base64 = String(req.body?.base64 || '');
      const folderId = String(req.body?.folderId || '').trim();
      if (!base64) return res.status(400).json({ error: 'File content is required.' });
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > 3 * 1024 * 1024) return res.status(413).json({ error: 'File is too large for direct upload.' });
      if (folderId && !/^[A-Za-z0-9-_]+$/.test(folderId)) return res.status(400).json({ error: 'Invalid folderId.' });
      const metadata = { name: filename, ...(folderId ? { parents: [folderId] } : {}) };
      const boundary = `flowspace_${Date.now().toString(16)}`;
      const head = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`, 'utf8');
      const tail = Buffer.from(`\r\n--${boundary}--`, 'utf8');
      const multipartBody = Buffer.concat([head, buffer, tail]);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(multipartBody.length),
        },
        body: multipartBody,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      const data = await safeJson(response);
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Google Drive upload failed.' });
      return res.status(200).json({ ok: true, file: data });
    }

    if (action === 'calendar_events') {
      if (!(secret.scopes || []).includes('calendar')) return res.status(403).json({ error: 'Google Calendar permission is not granted.' });
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const timeMin = startOfToday.toISOString();
      const timeMaxDate = new Date();
      timeMaxDate.setDate(timeMaxDate.getDate() + 7);
      const params = new URLSearchParams({
        timeMin,
        timeMax: timeMaxDate.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '20',
        fields: 'items(id,summary,start,end,status,htmlLink)',
      });
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${secret.accessToken}` },
      });
      const data = await safeJson(response);
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Google Calendar read failed.' });
      const events = (data.items || []).filter((event) => event.status !== 'cancelled').map((event) => ({
        id: event.id,
        title: event.summary || 'Встреча',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        allDay: Boolean(event.start?.date && !event.start?.dateTime),
        url: event.htmlLink || '',
      }));
      return res.status(200).json({ events });
    }

    return res.status(400).json({ error: 'Unsupported integration action.' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Integration request failed.' });
  }
}
