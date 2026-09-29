import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Check, ChevronDown, Loader2, MessageSquare, Pencil, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import DailyBriefPanel from './DailyBriefPanel';
import { APPROVAL_STATUSES } from '../domain/approval';
import { askBusinessAgent, listAIAudit, listApprovals, loadBusinessMetrics, transitionApproval } from '../services/businessAgentService';

const primaryTabs = [
  ['assistant', 'Помощник', Bot],
  ['overview', 'Обзор', Sparkles],
];

const auditLabels = {
  daily_brief: 'Подготовлена сводка по компании',
  task_analysis: 'Проверены задачи и приоритеты',
  attention: 'Проверены риски и отклонения',
  kpi_trend: 'Проанализированы показатели',
  create_content: 'Подготовлен материал',
  generate_content: 'Создан пост на согласование',
  approvals: 'Проверен центр подтверждений',
  approval_approved: 'Материал подтверждён',
  approval_edited: 'Материал отредактирован',
  approval_rejected: 'Материал пропущен',
  request_failed: 'AI не смог выполнить запрос',
};

const auditLabel = (action) => auditLabels[action] || 'Выполнено действие AI';
const intentLabels = {
  daily_brief: 'Обзор компании',
  attention: 'Что требует внимания',
  task_analysis: 'Анализ задач',
  kpi_trend: 'Изменение показателей',
  create_content: 'Создание контента',
  approvals: 'Подтверждения',
};

export default function AIControlCenter({ companyId, role, cardBg, textMain, enabled = true, companyPanel = null, children }) {
  const [tab, setTab] = useState('assistant');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [asking, setAsking] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  const [approvals, setApprovals] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editText, setEditText] = useState('');
  const [askError, setAskError] = useState('');

  const refreshMetrics = async () => {
    if (!companyId || role !== 'owner') return;
    setMetrics(null);
    setMetricsError('');
    try { setMetrics(await loadBusinessMetrics(companyId, 'last_7_days')); }
    catch (error) { setMetricsError(error.message || 'Не удалось загрузить показатели.'); }
  };
  useEffect(() => {
    refreshMetrics();
  }, [companyId, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshApprovals = async () => {
    setLoadingList(true);
    setApprovals([]);
    setListError('');
    try { setApprovals(await listApprovals(companyId)); }
    catch (error) { setListError(error.message || 'Не удалось загрузить подтверждения.'); }
    finally { setLoadingList(false); }
  };
  const refreshActivity = async () => {
    setLoadingList(true);
    setEvents([]);
    setListError('');
    try { setEvents(await listAIAudit(companyId)); }
    catch (error) { setListError(error.message || 'Не удалось загрузить журнал AI.'); }
    finally { setLoadingList(false); }
  };
  useEffect(() => { if (tab === 'approvals') refreshApprovals(); if (tab === 'activity') refreshActivity(); }, [tab, companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = async (event) => {
    event?.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAskError('');
    try {
      const waitingForContentTopic = answer?.status === 'needs_input' && answer?.intent === 'create_content';
      setAnswer(await askBusinessAgent(
        companyId,
        waitingForContentTopic ? 'Сделай пост для выбранной площадки' : question.trim(),
        waitingForContentTopic ? { topic: question.trim(), ...(answer.suggestedOptions || {}) } : {},
      ));
      setQuestion('');
    }
    catch (error) { setAskError(error.message || 'AI временно недоступен.'); }
    finally { setAsking(false); }
  };

  const changeApproval = async (approval, status, value = '') => {
    try {
      const updated = await transitionApproval(companyId, approval.id, status, value);
      setApprovals((items) => items.map((item) => item.id === updated.id ? updated : item));
      setEditingId(''); setEditText('');
      toast.success(status === 'approved' ? 'Материал подтверждён' : status === 'edited' ? 'Изменения сохранены' : 'Материал пропущен');
      return updated;
    } catch (error) { toast.error(error.message); }
  };

  const pendingCount = useMemo(() => approvals.filter((item) => ['pending', 'edited'].includes(item.status)).length, [approvals]);
  const visibleEvents = useMemo(
    () => events.filter((event) => !(event.agent === 'business_overview' && event.action === 'daily_brief')),
    [events],
  );

  if (!enabled) return children;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {primaryTabs.map(([id, label, Icon]) => <button key={id} onClick={() => { setTab(id); setHistoryOpen(false); }} className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border ${tab === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}><Icon className="w-4 h-4 shrink-0" />{label}</button>)}
      </div>

      <div className={`rounded-2xl border ${cardBg}`}>
        <button type="button" aria-expanded={historyOpen} onClick={() => setHistoryOpen((open) => !open)} className="w-full min-h-[44px] px-4 flex items-center gap-2 text-left text-xs font-bold text-slate-500">
          <Activity className="w-4 h-4" /><span className="flex-1">История и подтверждения{pendingCount > 0 ? ` · ${pendingCount}` : ''}</span><ChevronDown className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
        </button>
        {historyOpen && <div className="px-3 pb-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setTab('approvals')} className={`min-h-[38px] rounded-xl text-xs font-bold ${tab === 'approvals' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-50 text-slate-500 dark:bg-white/5'}`}><Check className="w-3.5 h-3.5 inline mr-1" />Подтверждения</button><button type="button" onClick={() => setTab('activity')} className={`min-h-[38px] rounded-xl text-xs font-bold ${tab === 'activity' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-50 text-slate-500 dark:bg-white/5'}`}><Activity className="w-3.5 h-3.5 inline mr-1" />История</button></div>}
      </div>

      {tab === 'assistant' && <>
        {children}
        {companyPanel && <details className={`rounded-2xl border ${cardBg}`}><summary className="cursor-pointer list-none min-h-[48px] px-4 flex items-center gap-3"><Bot className="w-4 h-4 text-violet-500" /><span className={`flex-1 text-sm font-bold ${textMain}`}>AI компании</span><ChevronDown className="w-4 h-4 text-slate-400" /></summary><div className="px-4 pb-4">{companyPanel}</div></details>}
      </>}

      {tab === 'overview' && <div className="space-y-4">
        {role === 'owner' && <DailyBriefPanel companyId={companyId} cardBg={cardBg} textMain={textMain} />}
        <section className={`rounded-3xl border p-4 md:p-5 ${cardBg}`}>
          <div className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /><h3 className={`font-black ${textMain}`}>Спросить о компании</h3></div>
          <form onSubmit={ask} className="mt-3 flex flex-col md:flex-row gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Например: на что мне обратить внимание сегодня?" className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm" /><button disabled={asking} className="px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-black flex items-center justify-center gap-2">{asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Спросить</button></form>
          {askError && <InlineError message={askError} />}
          {answer && <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-white/5 p-4"><div className="text-xs uppercase font-black text-slate-400">{intentLabels[answer.intent] || 'Ответ AI'}</div><p className="text-sm leading-relaxed mt-2 whitespace-pre-wrap">{answer.answer}</p></div>}
        </section>
        {metricsError && <section className={`rounded-3xl border p-4 ${cardBg}`}><InlineError message={metricsError} retry={refreshMetrics} /></section>}
        {metrics && <section className={`rounded-3xl border p-4 ${cardBg}`}><div className="text-xs uppercase font-black text-slate-400">Flow Space · последние 7 дней</div>{metrics.metrics?.length ? <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">{metrics.metrics.slice(0, 4).map((item) => <div key={`${item.source}-${item.metricType}`} className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3"><div className="text-[10px] text-slate-400">{item.metricType.replaceAll('_', ' ')}</div><div className={`text-lg font-black ${textMain}`}>{item.value == null ? '—' : item.value}{item.value != null && item.metadata?.unit === 'percent' ? '%' : ''}</div></div>)}</div> : <p className="text-sm text-slate-500 mt-3">Показателей пока нет. Они появятся после первых задач и результатов.</p>}</section>}
      </div>}

      {tab === 'approvals' && <section className={`rounded-3xl border p-4 md:p-5 ${cardBg}`}>
        <div className="flex items-center justify-between"><div><h3 className={`font-black ${textMain}`}>Центр подтверждений</h3><p className="text-xs text-slate-500">AI ничего не публикует и не меняет без решения человека.</p></div><button aria-label="Обновить подтверждения" onClick={refreshApprovals} className="p-2 rounded-xl border"><RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} /></button></div>
        {listError && <InlineError message={listError} retry={refreshApprovals} />}
        <div className="space-y-3 mt-4">{!listError && approvals.length === 0 && !loadingList ? <p className="text-sm text-slate-500">Подтверждений пока нет.</p> : approvals.map((item) => <ApprovalRow key={item.id} item={item} textMain={textMain} editing={editingId === item.id} editText={editText} setEditText={setEditText} onEdit={() => { setEditingId(item.id); setEditText(item.content); }} onCancel={() => setEditingId('')} onChange={changeApproval} />)}</div>
      </section>}

      {tab === 'activity' && <section className={`rounded-3xl border p-4 md:p-5 ${cardBg}`}><div className="flex items-center justify-between"><div><h3 className={`font-black ${textMain}`}>История работы AI</h3><p className="text-xs text-slate-500 mt-1">Только ваши запросы, созданные материалы и принятые решения.</p></div><button aria-label="Обновить журнал AI" onClick={refreshActivity} className="p-2 rounded-xl border"><RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} /></button></div>{listError && <InlineError message={listError} retry={refreshActivity} />}<div className="mt-4 space-y-2">{!listError && visibleEvents.length === 0 && !loadingList ? <p className="text-sm text-slate-500">Здесь появятся выполненные действия AI.</p> : visibleEvents.map((event) => <div key={event.id} className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3"><div className="flex justify-between gap-2"><div className={`text-sm font-bold ${textMain}`}>{auditLabel(event.action)}</div><span className="text-[10px] text-slate-400">{new Date(event.createdAt).toLocaleString('ru-RU')}</span></div><p className="text-xs text-slate-500 mt-1">{event.resultSummary}</p></div>)}</div></section>}
    </div>
  );
}

const InlineError = ({ message, retry }) => <div role="alert" className="mt-3 rounded-2xl bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 p-3 text-xs"><span>{message}</span>{retry && <button type="button" onClick={retry} className="ml-2 font-black underline">Повторить</button>}</div>;

function ApprovalRow({ item, textMain, editing, editText, setEditText, onEdit, onCancel, onChange }) {
  const actionable = ['pending', 'edited'].includes(item.status);
  return <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4"><div className="flex items-start justify-between gap-2"><div><div className={`font-bold ${textMain}`}>{item.title}</div><div className="text-[10px] uppercase text-slate-400 mt-1">{item.type} · {item.status}</div></div>{actionable && <button onClick={onEdit} className="p-2"><Pencil className="w-4 h-4" /></button>}</div>{editing ? <textarea rows={7} value={editText} onChange={(event) => setEditText(event.target.value)} className="w-full mt-3 p-3 rounded-xl border bg-transparent text-sm" /> : <p className="text-sm whitespace-pre-wrap mt-3 line-clamp-6">{item.content}</p>}{actionable && <div className="flex flex-wrap gap-2 mt-3">{editing ? <><button onClick={() => onChange(item, APPROVAL_STATUSES.EDITED, editText)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Сохранить</button><button onClick={onCancel} className="px-3 py-2 rounded-xl border text-xs font-bold">Отмена</button></> : <><button onClick={() => onChange(item, APPROVAL_STATUSES.APPROVED)} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex gap-1"><Check className="w-3.5 h-3.5" /> Подтвердить</button><button onClick={() => onChange(item, APPROVAL_STATUSES.REJECTED)} className="px-3 py-2 rounded-xl border text-xs font-bold flex gap-1"><X className="w-3.5 h-3.5" /> Пропустить</button></>}</div>}</div>;
}
