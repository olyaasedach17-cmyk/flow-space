import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Check, ChevronDown, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import { buildBriefingSnapshot, getAutomaticBriefingKind } from '../utils/briefingEngine';

const modes = [
  ['plan', 'План недели'],
  ['status', 'Статус недели'],
  ['meeting', 'К встрече'],
  ['review', 'Итоги недели'],
];

const BriefingCard = ({ solo = false, dataLoading = false, cardBg, textMain, tasks, archive, metrics, insights, calendarEvents = [], aiBriefs = {}, loadingKind = '', onGenerate, onOpenTasks, onSaveDecision, savedState = {} }) => {
  const meetingSoon = useMemo(() => calendarEvents.some((event) => {
    const start = new Date(event.start).getTime();
    return Number.isFinite(start) && start >= Date.now() && start - Date.now() <= 24 * 60 * 60 * 1000;
  }), [calendarEvents]);
  const automaticKind = getAutomaticBriefingKind(new Date(), meetingSoon);
  const [kind, setKind] = useState(automaticKind);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const snapshot = useMemo(() => buildBriefingSnapshot({ tasks, archive, metrics, insights, calendarEvents }), [tasks, archive, metrics, insights, calendarEvents]);
  const snapshotSignature = useMemo(() => JSON.stringify({
    active: snapshot.activeCount,
    accepted: snapshot.acceptedCount,
    returned: snapshot.returnedCount,
    deferred: snapshot.deferredCount,
    overdue: snapshot.overdueCount,
    ai: snapshot.aiCompletedCount,
    team: snapshot.teamHandlesCount,
    owner: snapshot.ownerDecisionCount,
    kpis: snapshot.kpis,
    risks: snapshot.risks.map((risk) => risk.id),
  }), [snapshot]);
  const stateKey = `${snapshot.weekKey}:${kind}`;
  const decision = savedState[stateKey];
  const aiText = aiBriefs[kind] || '';
  const loading = loadingKind === kind;

  useEffect(() => {
    if (!dataLoading && !loadingKind) onGenerate?.({ kind, snapshot, solo });
  }, [kind, snapshotSignature, solo, dataLoading, loadingKind, onGenerate, snapshot]);

  const title = solo
    ? ({ plan: 'Мой план недели', status: 'Что выбивается из плана', meeting: 'Подготовка к встрече', review: 'Итоги недели' }[kind])
    : ({ plan: 'План недели', status: 'Status Briefing', meeting: 'Meeting Briefing', review: 'Weekly Review' }[kind]);

  const confirm = async (status, message = '') => {
    await onSaveDecision?.({ key: stateKey, status, note: message, at: new Date().toISOString() });
    setEditing(false);
  };

  return (
    <section className={`rounded-3xl border p-4 md:p-6 ${cardBg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-violet-500"><CalendarCheck2 className="w-4 h-4" /> Ритм недели</div>
          <h3 className={`text-lg font-black mt-1 ${textMain}`}>{title}</h3>
          {snapshot.upcomingMeeting && kind === 'meeting' && <p className="text-xs text-slate-500 mt-1">{snapshot.upcomingMeeting.title}</p>}
        </div>
        <label className="relative shrink-0">
          <select aria-label="Вид сводки" value={kind} onChange={(event) => setKind(event.target.value)} className="appearance-none min-h-[40px] pl-3 pr-8 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold">
            {modes.map(([id, label]) => <option key={id} value={id}>{solo && id === 'status' ? 'Сейчас' : label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-3 w-4 h-4 text-slate-400" />
        </label>
      </div>

      {kind === 'status' && <StatusView snapshot={snapshot} solo={solo} textMain={textMain} />}
      {kind === 'plan' && <PlanView snapshot={snapshot} textMain={textMain} />}
      {kind === 'meeting' && <MeetingView snapshot={snapshot} textMain={textMain} />}
      {kind === 'review' && <ReviewView snapshot={snapshot} textMain={textMain} />}

      <div className="mt-4 rounded-2xl bg-violet-50/70 dark:bg-violet-500/10 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-violet-500"><Sparkles className="w-3.5 h-3.5" /> Короткий вывод AI</div>
          <button type="button" aria-label="Обновить вывод" onClick={() => onGenerate?.({ kind, snapshot, solo, force: true })} disabled={loading} className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-500 disabled:opacity-50"><RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        {loading && !aiText ? <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Готовлю сводку…</div> : <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">{aiText || 'Сводка появится через несколько секунд.'}</p>}
      </div>

      {!['status', 'meeting'].includes(kind) && (
        <div className="mt-4">
          <div className={`text-xs font-black ${textMain}`}>Риски недели</div>
          {snapshot.risks.length ? <RiskList risks={snapshot.risks} /> : <p className="text-xs text-slate-500 mt-2">На этой неделе критичных отклонений нет.</p>}
        </div>
      )}

      {kind === 'plan' && (
        <div className="mt-4">
          {decision?.status === 'confirmed' ? <div className="min-h-[44px] rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 flex items-center gap-2 text-xs font-bold"><Check className="w-4 h-4" /> План подтверждён</div> : editing ? <div className="space-y-2"><textarea value={note} onChange={(event) => setNote(event.target.value)} rows="2" placeholder="Что нужно изменить в плане?" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-3 text-sm resize-none"/><button type="button" onClick={() => confirm('adjusted', note)} disabled={!note.trim()} className="w-full min-h-[44px] rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold disabled:opacity-50">Сохранить корректировку</button></div> : <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => confirm('confirmed')} className="min-h-[44px] rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold">Подтвердить план</button><button type="button" onClick={() => setEditing(true)} className="min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold">Скорректировать</button></div>}
        </div>
      )}

      {kind === 'review' && <div className="grid grid-cols-2 gap-2 mt-4"><button type="button" onClick={() => confirm('accepted')} className="min-h-[44px] rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold">Принять итоги</button><button type="button" onClick={() => setKind('plan')} className="min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold">Подготовить следующую неделю</button></div>}

      <button type="button" onClick={onOpenTasks} className="mt-3 min-h-[40px] text-xs font-bold text-violet-600 dark:text-violet-300">Открыть работу →</button>
    </section>
  );
};

const Stat = ({ label, value }) => <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3"><div className="text-[10px] text-slate-400">{label}</div><div className="text-lg font-black mt-1">{value}</div></div>;

const StatusView = ({ snapshot, solo, textMain }) => {
  const noProblems = snapshot.teamHandlesCount === 0 && snapshot.ownerDecisionCount === 0;
  return <div className="mt-4 space-y-2">
    <StatusLine label={solo ? 'Идёт по плану' : 'Идёт по плану'} value={snapshot.onTrackCount} tone="emerald" />
    {!solo && <StatusLine label="Команда решает" value={snapshot.teamHandlesCount} tone="blue" />}
    <StatusLine label={solo ? 'Требует моего решения' : 'Нужно ваше решение'} value={snapshot.ownerDecisionCount} tone="red" />
    {noProblems ? <p className={`pt-2 text-sm font-bold ${textMain}`}>Всё идёт по плану. Вашего вмешательства не требуется.</p> : <RiskList risks={snapshot.risks} />}
  </div>;
};

const StatusLine = ({ label, value, tone }) => <div className="flex items-center justify-between min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-white/5 text-sm"><span>{label}</span><span className={`font-black ${tone === 'red' ? 'text-red-500' : tone === 'blue' ? 'text-blue-500' : 'text-emerald-500'}`}>{value}</span></div>;

const PlanView = ({ snapshot }) => <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4"><Stat label="Незавершённые" value={snapshot.unfinishedCount}/><Stat label="Новые" value={snapshot.newCount}/><Stat label="Дедлайны недели" value={snapshot.deadlineCount}/><Stat label="Загрузка" value={`${snapshot.workloadHours} ч`}/></div>;

const MeetingView = ({ snapshot, textMain }) => <div className="mt-4"><div className="grid grid-cols-3 gap-2"><Stat label="Обещали" value={snapshot.promisedTasks.length}/><Stat label="Выполнено" value={snapshot.acceptedCount}/><Stat label="Возвраты" value={snapshot.returnedCount}/></div><h4 className={`text-sm font-black mt-4 ${textMain}`}>Рекомендуемая повестка</h4>{snapshot.risks.length ? <RiskList risks={snapshot.risks}/> : <p className="text-xs text-slate-500 mt-2">Отклонений нет. Достаточно сверить результаты и договориться о следующем шаге.</p>}</div>;

const ReviewView = ({ snapshot }) => <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4"><Stat label="Принято" value={snapshot.acceptedCount}/><Stat label="С первого раза" value={snapshot.acceptedFirstTryCount}/><Stat label="На доработку" value={snapshot.returnedCount}/><Stat label="Перенесено" value={snapshot.deferredCount}/><Stat label="Просрочено" value={snapshot.overdueCount}/><Stat label="С помощью AI" value={snapshot.aiCompletedCount}/><Stat label="Показатели" value={snapshot.kpiChangeAvailable ? 'Изменились' : 'Нет сравнения'}/></div>;

const RiskList = ({ risks }) => <div className="space-y-2 mt-3">{risks.slice(0, 3).map((risk) => <div key={risk.id} className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-3"><div className="text-xs font-bold text-amber-700 dark:text-amber-300">{risk.title}</div><p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{risk.description}</p></div>)}</div>;

export default BriefingCard;
