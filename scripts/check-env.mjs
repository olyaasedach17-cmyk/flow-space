import fs from 'node:fs';
import path from 'node:path';

const requested = process.argv.find((arg) => arg.startsWith('--file='))?.slice(7) || '.env.local';
const file = path.resolve(process.cwd(), requested);
if (fs.existsSync(file)) process.loadEnvFile(file);

const missing = [];
const invalid = [];
const requireNames = (names) => names.forEach((name) => { if (!String(process.env[name] || '').trim()) missing.push(name); });

requireNames(['FIREBASE_SERVICE_ACCOUNT', 'POLZA_API_KEY']);

const googleNames = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_STATE_SECRET', 'APP_URL'];
if (googleNames.some((name) => String(process.env[name] || '').trim())) requireNames(googleNames);

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) invalid.push('FIREBASE_SERVICE_ACCOUNT');
} catch { invalid.push('FIREBASE_SERVICE_ACCOUNT'); }

if (process.env.GOOGLE_OAUTH_STATE_SECRET && process.env.GOOGLE_OAUTH_STATE_SECRET.length < 32) invalid.push('GOOGLE_OAUTH_STATE_SECRET');
if (process.env.TELEGRAM_WEBHOOK_SECRET && process.env.TELEGRAM_WEBHOOK_SECRET.length < 32) invalid.push('TELEGRAM_WEBHOOK_SECRET');
if (process.env.APP_URL) {
  try {
    const url = new URL(process.env.APP_URL);
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if ((!local && url.protocol !== 'https:') || (local && !['http:', 'https:'].includes(url.protocol)) || (url.pathname && url.pathname !== '/')) invalid.push('APP_URL');
  } catch { invalid.push('APP_URL'); }
}

if (missing.length || invalid.length) {
  if (missing.length) console.error(`Не заданы переменные: ${[...new Set(missing)].join(', ')}`);
  if (invalid.length) console.error(`Неверный формат: ${[...new Set(invalid)].join(', ')}`);
  process.exit(1);
}

console.log(`Окружение проверено: ${path.basename(file)}. Значения ключей не выводились.`);
