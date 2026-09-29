import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, FileText, HardDrive, Link2, RefreshCcw, Sheet, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import WorkflowStudio from './WorkflowStudio';
import TelegramIntegrationCard from './TelegramIntegrationCard';
import { isTaskForToday } from '../utils/taskUtils';
import { INTEGRATIONS, disconnectGoogleIntegration, getGoogleIntegrationStatus, readGoogleCalendarEvents, startGoogleIntegration } from '../services/integrationService';

const ICONS = { google_sheets: Sheet, google_drive: HardDrive, google_docs: FileText, google_calendar: CalendarDays };
const localDate = (value = new Date()) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function CalendarCapacity({ companyId, tasks, cardBg, textMain }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    readGoogleCalendarEvents({ companyId })
      .then((result) => { if (active) { setEvents(result.events || []); setError(''); } })
      .catch((loadError) => { if (active) setError(loadError.message || 'Календарь временно недоступен'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId]);

  const summary = useMemo(() => {
    const today = localDate();
    const meetings = events.filter((event) => !event.allDay && localDate(event.start) === today);
    const meetingMinutes = meetings.reduce((total, event) => {
      const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000;
      return total + (Number.isFinite(duration) && duration > 0 ? Math.min(duration, 12 * 60) : 0);
    }, 0);
    const todayTasks = tasks.filter((task) => task.status !== 'done' && isTaskForToday(task, today));
    const taskMinutes = todayTasks.reduce((total, task) => total + (Number(task.estimatedMinutes) || Number(task.estimatedHours) * 60 || 0), 0);
    const plannedMinutes = meetingMinutes + taskMinutes;
    return { meetingCount: meetings.length, meetingHours: meetingMinutes / 60, taskCount: todayTasks.length, taskHours: taskMinutes / 60, plannedHours: plannedMinutes / 60, freeHours: Math.max(0, (480 - plannedMinutes) / 60), overloaded: plannedMinutes > 480 };
  }, [events, tasks]);

  const hours = (value) => value < 0.1 ? '0 ч' : `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч`;

  return (
    <section className={`p-5 rounded-3xl border ${cardBg}`} aria-label="Загрузка на сегодня">
      <div className="flex items-center justify-between gap-3">
        <div><div className="flex items-center gap-2"><Clock3 className="w-5 h-5 text-violet-500" /><h3 className={`font-black ${textMain}`}>Загрузка на сегодня</h3></div><p className="text-xs text-slate-500 mt-1">Задачи Flow Space и встречи Google Calendar в одной оценке</p></div>
        {!loading && !error && <span className={`text-xs font-black px-2.5 py-1 rounded-full ${summary.overloaded ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>{summary.overloaded ? 'Есть перегруз' : 'План реалистичен'}</span>}
      </div>
      {loading ? <div className="mt-4 h-20 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" /> : error ? <p role="alert" className="mt-4 text-xs text-red-600">{error}</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5"><div className="text-lg font-black">{summary.taskCount}</div><div className="text-[11px] text-slate-500">задач · {hours(summary.taskHours)}</div></div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5"><div className="text-lg font-black">{summary.meetingCount}</div><div className="text-[11px] text-slate-500">встреч · {hours(summary.meetingHours)}</div></div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5"><div className="text-lg font-black">{hours(summary.plannedHours)}</div><div className="text-[11px] text-slate-500">всего запланировано</div></div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5"><div className="text-lg font-black">{summary.overloaded ? hours(summary.plannedHours - 8) : hours(summary.freeHours)}</div><div className="text-[11px] text-slate-500">{summary.overloaded ? 'сверх рабочего дня' : 'свободно из 8 ч'}</div></div>
        </div>
      )}
    </section>
  );
}

export default function IntegrationsView({ companyId, cardBg, textMain, tasks = [], onAttachWorkflowToTask, onCreateRecommendedTasks }) {
  const [status, setStatus] = useState({ connected: false, scopes: [], health: 'disconnected' });
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    setLoadError('');
    try { setStatus(await getGoogleIntegrationStatus(companyId)); }
    catch (error) { setLoadError(error.message || 'Не удалось проверить интеграции'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const scopeSet = useMemo(() => new Set(status.scopes || []), [status.scopes]);
  const googleHealthy = status.health !== 'needs_reconnect';
  const connectedCount = INTEGRATIONS.filter((item) => scopeSet.has(item.scope) && googleHealthy).length + (telegramConnected ? 1 : 0);

  const connect = async (item) => {
    setBusy(item.id);
    try { await startGoogleIntegration({ companyId, scope: item.scope }); }
    catch (error) { toast.error(error.message || 'Не удалось начать подключение'); setBusy(''); }
  };
  const disconnect = async () => {
    setBusy('disconnect');
    try { await disconnectGoogleIntegration({ companyId }); setStatus({ connected: false, scopes: [], health: 'disconnected' }); toast.success('Google Workspace отключён'); }
    catch (error) { toast.error(error.message || 'Не удалось отключить интеграцию'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <section className={`p-5 rounded-3xl border ${cardBg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><div className="flex items-center gap-2 mb-1"><Link2 className="w-5 h-5" /><h2 className={`font-black ${textMain}`}>Интеграции</h2></div><p className="text-sm text-slate-500">{loading ? 'Проверяем подключения…' : `${connectedCount} из ${INTEGRATIONS.length + 1} сервисов работают`}</p>{status.account?.email && <p className="text-xs text-slate-400 mt-1">Google: {status.account.name ? `${status.account.name} · ` : ''}{status.account.email}</p>}</div>
          <button onClick={load} disabled={loading} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold flex items-center gap-2 self-start md:self-auto"><RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Проверить всё</button>
        </div>
        {status.health === 'needs_reconnect' && <div role="alert" className="mt-4 rounded-2xl bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200 p-3 text-sm flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><div><div className="font-bold">Google просит повторный вход</div><p className="text-xs mt-1">Доступ истёк или был отозван. Нажмите «Подключить заново» у любого нужного сервиса.</p></div></div>}
        {loadError && <div role="alert" className="mt-4 rounded-2xl bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 p-3 text-sm"><div className="font-bold">Не удалось проверить подключение</div><p className="text-xs mt-1">{loadError}</p><button type="button" onClick={load} className="mt-2 text-xs font-black underline">Повторить проверку</button></div>}
      </section>

      <section className={`p-5 rounded-3xl border ${cardBg}`} aria-label="Google Workspace">
        <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className={`font-black ${textMain}`}>Google Workspace</h3><p className="text-xs text-slate-500 mt-1">Подключайте только те сервисы, которыми пользуетесь</p></div>{status.connected && <button onClick={disconnect} disabled={busy === 'disconnect'} className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 flex items-center gap-2"><Unplug className="w-4 h-4" /> Отключить</button>}</div>
        <div className="grid md:grid-cols-2 gap-3">
          {INTEGRATIONS.map((item) => {
            const Icon = ICONS[item.id] || Link2;
            const granted = scopeSet.has(item.scope);
            const active = granted && googleHealthy;
            return (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-start justify-between gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center"><Icon className="w-5 h-5" /></div><span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}>{loadError ? 'Статус неизвестен' : active ? 'Подключено' : granted ? 'Нужен вход' : 'Не подключено'}</span></div>
                <h4 className={`font-black mt-3 ${textMain}`}>{item.label}</h4><p className="text-xs text-slate-500 mt-1 min-h-[32px]">{item.description}</p>
                <button onClick={() => connect(item)} disabled={busy === item.id || active || loading || Boolean(loadError)} className={`mt-3 w-full py-2.5 rounded-xl text-xs font-black disabled:opacity-60 ${active ? 'bg-slate-100 text-slate-400 dark:bg-white/5' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>{loadError ? 'Сначала повторите проверку' : active ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Доступ разрешён</span> : busy === item.id ? 'Переходим в Google…' : granted ? 'Подключить заново' : 'Подключить'}</button>
              </div>
            );
          })}
        </div>
      </section>

      <TelegramIntegrationCard companyId={companyId} cardBg={cardBg} textMain={textMain} onConnectionChange={setTelegramConnected} />
      {scopeSet.has('calendar') && googleHealthy && <CalendarCapacity companyId={companyId} tasks={tasks} cardBg={cardBg} textMain={textMain} />}
      {scopeSet.has('sheets') && googleHealthy && <WorkflowStudio companyId={companyId} tasks={tasks} cardBg={cardBg} textMain={textMain} onAttachToTask={onAttachWorkflowToTask} onCreateRecommendedTasks={onCreateRecommendedTasks} docsEnabled={scopeSet.has('docs')} driveEnabled={scopeSet.has('drive')} />}
    </div>
  );
}
