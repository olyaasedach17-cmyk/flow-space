import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { loadDailyBrief } from '../services/businessAgentService';

export default function DailyBriefPanel({ companyId, cardBg = '', textMain = '', compact = false }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const load = async () => {
    if (!companyId) return;
    setLoading(true); setError('');
    try { setBrief(await loadDailyBrief(companyId)); }
    catch (err) { setError(err.message || 'Не удалось загрузить ежедневный обзор.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className={`rounded-3xl border p-4 md:p-5 ${cardBg}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400"><Sparkles className="w-4 h-4" /> Daily Brief</div>
          <h3 className={`font-black mt-2 ${compact ? 'text-base' : 'text-xl'} ${textMain}`}>{brief?.summary || (loading ? 'Собираю картину дня…' : 'Ежедневный обзор')}</h3>
        </div>
        <button onClick={load} disabled={loading} aria-label="Обновить Daily Brief" className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</button>
      </div>
      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      {brief && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <BriefMetric label="Сегодня" value={brief.today?.counts?.dueToday || 0} icon={<CheckCircle2 className="w-4 h-4" />} />
          <BriefMetric label="Просрочено" value={brief.today?.counts?.overdue || 0} icon={<AlertTriangle className="w-4 h-4" />} />
          <BriefMetric label="Нужно вам" value={brief.decisionStatus?.ownerDecisionCount || 0} icon={<Sparkles className="w-4 h-4" />} />
        </div>
      )}
      {compact && brief && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 min-h-[40px] w-full rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2"
        >
          {expanded ? 'Скрыть подробности' : 'Показать подробности'}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
      {(!compact || expanded) && brief && (
        <div className="mt-5 space-y-4">
          <BriefSection title="Требует внимания">
            {brief.requiresAttention?.length > 0
              ? brief.requiresAttention.slice(0, 3).map((item) => <BriefRow key={item.id} title={item.title} description={item.description} textMain={textMain} />)
              : <p className="text-sm text-slate-500">Ситуаций, требующих вашего решения, нет.</p>}
          </BriefSection>
          <BriefSection title="Сегодня">
            {brief.today?.priorities?.length > 0
              ? brief.today.priorities.slice(0, 3).map((task) => <BriefRow key={task.id} title={task.title} description={[task.assigneeName, task.dueDate].filter(Boolean).join(' · ')} textMain={textMain} />)
              : <p className="text-sm text-slate-500">Задач на сегодня нет.</p>}
          </BriefSection>
          <BriefSection title="Показатели за 7 дней">
            <div className="grid grid-cols-2 gap-2">
              {(brief.kpis?.latestChanges || []).map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3"><div className="text-[10px] uppercase font-bold text-slate-400">{item.name}</div><div className={`text-lg font-black mt-1 ${textMain}`}>{item.value}</div><div className={`text-[11px] font-bold ${item.delta > 0 ? 'text-emerald-600' : item.delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>{item.delta > 0 ? '+' : ''}{item.delta} к прошлым 7 дням</div></div>)}
            </div>
          </BriefSection>
        </div>
      )}
      {(!compact || expanded) && brief?.recommendations?.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-black uppercase tracking-wide text-slate-400">Рекомендации AI</div>
          {brief.recommendations.slice(0, 3).map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3"><div className={`text-sm font-bold ${textMain}`}>{item.title}</div><p className="text-xs text-slate-500 mt-1">{item.reason}</p></div>)}
        </div>
      )}
    </section>
  );
}

const BriefMetric = ({ label, value, icon }) => <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">{icon}{label}</div><div className="text-xl font-black mt-1">{value}</div></div>;
const BriefSection = ({ title, children }) => <div><div className="text-xs font-black uppercase tracking-wide text-slate-400 mb-2">{title}</div><div className="space-y-2">{children}</div></div>;
const BriefRow = ({ title, description, textMain }) => <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3"><div className={`text-sm font-bold ${textMain}`}>{title}</div>{description && <p className="text-xs text-slate-500 mt-1">{description}</p>}</div>;
