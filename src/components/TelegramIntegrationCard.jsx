import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, MessageCircle, RefreshCcw, Send, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import {
  beginTelegramConnection,
  completeTelegramConnection,
  disconnectTelegramConnection,
  getTelegramInfo,
  testTelegramConnection,
} from '../services/notificationService';

export default function TelegramIntegrationCard({ companyId, cardBg = '', textMain = '', onConnectionChange }) {
  const [info, setInfo] = useState({ configured: false, connected: false, username: '', connectedAccount: null, canManage: true });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [deepLink, setDeepLink] = useState('');

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const next = await getTelegramInfo(companyId);
      setInfo(next);
      onConnectionChange?.(Boolean(next.connected));
    } catch (loadError) {
      setError(loadError.message || 'Не удалось проверить Telegram');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = async () => {
    setBusy('connect');
    setError('');
    try {
      const result = await beginTelegramConnection(companyId);
      setInfo((current) => ({ ...current, configured: true, username: result.username || current.username }));
      setDeepLink(result.deepLink || '');
    } catch (connectError) {
      setError(connectError.message || 'Не удалось начать подключение');
    } finally {
      setBusy('');
    }
  };

  const complete = async () => {
    setBusy('complete');
    setError('');
    try {
      await completeTelegramConnection(companyId);
      setDeepLink('');
      await load();
      toast.success('Telegram подключён');
    } catch (completeError) {
      setError(completeError.message || 'Сообщение Start пока не найдено');
    } finally {
      setBusy('');
    }
  };

  const test = async () => {
    setBusy('test');
    setError('');
    try {
      await testTelegramConnection(companyId);
      toast.success('Тестовое сообщение отправлено в Telegram');
    } catch (testError) {
      setError(testError.message || 'Тестовое сообщение не отправлено');
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    setBusy('disconnect');
    setError('');
    try {
      await disconnectTelegramConnection(companyId);
      setInfo((current) => ({ ...current, connected: false, connectedAccount: null }));
      setDeepLink('');
      onConnectionChange?.(false);
      toast.success('Telegram отключён');
    } catch (disconnectError) {
      setError(disconnectError.message || 'Не удалось отключить Telegram');
    } finally {
      setBusy('');
    }
  };

  const account = info.connectedAccount;
  const accountLabel = account?.username ? `@${account.username}` : account?.firstName || '';

  return (
    <section className={`p-5 rounded-3xl border ${cardBg}`} aria-label="Telegram">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div>
          <div>
            <h3 className={`font-black ${textMain}`}>Telegram</h3>
            <p className="text-xs text-slate-500 mt-0.5">Уведомления и создание задач текстом или голосом</p>
          </div>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${info.connected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}>
          {loading ? 'Проверяем' : error && !info.configured ? 'Недоступен' : info.connected ? 'Подключено' : 'Не подключено'}
        </span>
      </div>

      {info.connected && (
        <div className="mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-sm text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="w-4 h-4" /> {accountLabel || 'Аккаунт подключён'}</div>
          {info.username && <div className="text-xs mt-1 opacity-80">Бот: @{info.username}</div>}
        </div>
      )}

      <div className="mt-4 grid sm:grid-cols-2 gap-2 text-xs text-slate-500">
        <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3">Получайте только выбранные важные уведомления.</div>
        <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3">Бот покажет задачу для проверки перед созданием.</div>
      </div>

      {!info.canManage && <p className="mt-3 text-xs text-slate-500">Управлять подключением может собственник пространства.</p>}

      {error && <div role="alert" className="mt-3 rounded-2xl bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 p-3 text-xs">{error}</div>}

      <div className="mt-4 flex flex-wrap gap-2">
        {!info.connected && !deepLink && info.canManage && (
          <button type="button" onClick={begin} disabled={loading || Boolean(busy)} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black disabled:opacity-50 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> {busy === 'connect' ? 'Открываю…' : 'Подключить Telegram'}
          </button>
        )}
        {!info.connected && deepLink && (
          <>
            <a href={deepLink} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-black flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Открыть бота</a>
            <button type="button" onClick={complete} disabled={Boolean(busy)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black disabled:opacity-50">{busy === 'complete' ? 'Проверяю…' : 'Я нажала Start'}</button>
          </>
        )}
        {info.connected && info.canManage && (
          <>
            <button type="button" onClick={test} disabled={Boolean(busy)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black disabled:opacity-50 flex items-center gap-2"><Send className="w-4 h-4" /> {busy === 'test' ? 'Отправляю…' : 'Отправить тест'}</button>
            <button type="button" onClick={disconnect} disabled={Boolean(busy)} className="px-4 py-2.5 rounded-xl text-red-600 bg-red-50 dark:bg-red-500/10 text-xs font-black disabled:opacity-50 flex items-center gap-2"><Unplug className="w-4 h-4" /> Отключить</button>
          </>
        )}
        {!loading && <button type="button" onClick={load} disabled={Boolean(busy)} aria-label="Обновить статус Telegram" className="ml-auto p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><RefreshCcw className="w-4 h-4" /></button>}
      </div>
    </section>
  );
}
