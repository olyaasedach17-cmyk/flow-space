import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Users,
} from 'lucide-react';
import BriefingCard from './BriefingCard';
import TodayTaskList from './TodayTaskList';
import { getLocalDateKey, isTaskForToday } from '../utils/taskUtils';

const severityStyles = {
  critical: 'border-red-200 bg-red-50/80 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
  info: 'border-blue-200 bg-blue-50/80 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
};

const ExecutiveOverview = ({
  cardBg,
  textMain,
  metrics,
  insights,
  tasks,
  archive,
  calendarEvents,
  onOpenTasks,
  onOpenTask,
  briefingTexts,
  briefingLoadingKind,
  onGenerateBriefing,
  onSaveBriefingDecision,
  briefingState,
  dataLoading,
}) => {
  const [period, setPeriod] = useState('today');
  const ownerItems = insights?.ownerItems || [];
  const teamItems = insights?.teamItems || [];
  const todaySummary = useMemo(() => {
    const today = getLocalDateKey();
    const items = tasks.filter((task) => isTaskForToday(task, today));
    return {
      count: items.length,
      hours: items.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0),
      unestimated: items.filter((task) => !(Number(task.estimatedHours) > 0)).length,
    };
  }, [tasks]);

  return (
    <div className="space-y-4">
      <div className="inline-flex w-full sm:w-auto rounded-2xl bg-slate-100 dark:bg-white/5 p-1" aria-label="Период обзора">
        {[['today', 'Сегодня'], ['week', 'Неделя']].map(([id, label]) => <button key={id} type="button" aria-pressed={period === id} onClick={() => setPeriod(id)} className={`flex-1 sm:min-w-[120px] min-h-[40px] px-4 rounded-xl text-xs font-bold ${period === id ? 'bg-white dark:bg-[#161B22] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}
      </div>

      {period === 'today' ? <>
        <TodayTaskList tasks={tasks} cardBg={cardBg} textMain={textMain} onOpenTasks={onOpenTasks} onOpenTask={onOpenTask} workspace="company" dataLoading={dataLoading} />
        <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${cardBg} ${textMain}`} aria-label="Загрузка на сегодня">
          <span>{todaySummary.count} {taskWord(todaySummary.count)} · ~{formatHours(todaySummary.hours)} ч{todaySummary.unestimated ? ` · без оценки: ${todaySummary.unestimated}` : ''}</span>
        </div>
      </> : <>
        <BriefingCard
          dataLoading={dataLoading}
          cardBg={cardBg}
          textMain={textMain}
          tasks={tasks}
          archive={archive}
          metrics={metrics}
          insights={insights}
          calendarEvents={calendarEvents}
          aiBriefs={briefingTexts}
          loadingKind={briefingLoadingKind}
          onGenerate={onGenerateBriefing}
          onOpenTasks={onOpenTasks}
          onSaveDecision={onSaveBriefingDecision}
          savedState={briefingState}
        />

        <section className="grid lg:grid-cols-3 gap-3" aria-label="Риски недели">
        <DecisionLane
          title="Можно не трогать"
          subtitle="Работа идёт в штатном режиме"
          icon={<CheckCircle2 className="w-5 h-5" />}
          count={insights?.healthyCount || 0}
          tone="healthy"
          textMain={textMain}
          cardBg={cardBg}
        >
          <p className="text-xs text-slate-500 leading-relaxed">Нет сигнала, который требует вашего решения. Flow Space продолжает наблюдение.</p>
        </DecisionLane>

        <DecisionLane
          title="Команда решает сама"
          subtitle="Не нужно забирать операционку себе"
          icon={<Users className="w-5 h-5" />}
          count={teamItems.length}
          tone="team"
          textMain={textMain}
          cardBg={cardBg}
        >
          {teamItems.length === 0 ? (
            <p className="text-xs text-slate-500">Сейчас нет отдельных вопросов, которые нужно передать руководителю.</p>
          ) : (
            <CompactRiskList items={teamItems.slice(0, 1)} onOpenTasks={onOpenTasks} />
          )}
        </DecisionLane>

        <DecisionLane
          title="Нужно ваше решение"
          subtitle="Только управленческие исключения"
          icon={<AlertTriangle className="w-5 h-5" />}
          count={ownerItems.length}
          tone="owner"
          textMain={textMain}
          cardBg={cardBg}
        >
          {ownerItems.length === 0 ? (
            <p className="text-xs text-slate-500">Собственнику сейчас не нужно вмешиваться в операционку.</p>
          ) : (
            <CompactRiskList items={ownerItems.slice(0, 2)} onOpenTasks={onOpenTasks} emphasize />
          )}
        </DecisionLane>
        </section>
      </>}

    </div>
  );
};

const DecisionLane = ({ title, subtitle, icon, count, tone, textMain, cardBg, children }) => {
  const toneClass = {
    healthy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    team: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    owner: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  }[tone];

  return (
    <div className={`rounded-2xl md:rounded-3xl border p-4 md:p-5 ${cardBg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${toneClass}`}>{icon}</div>
          <div>
            <h3 className={`font-black text-sm ${textMain}`}>{title}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className={`min-w-8 h-8 px-2 rounded-xl flex items-center justify-center text-xs font-black ${toneClass}`}>{count}</div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
};

const CompactRiskList = ({ items, onOpenTasks, emphasize = false }) => (
  <div className="space-y-2.5">
    {items.map((item) => (
      <button key={item.id} onClick={onOpenTasks} className="w-full text-left group">
        <div className={`rounded-2xl border p-3 ${severityStyles[item.severity] || severityStyles.info} ${emphasize ? 'ring-1 ring-red-100 dark:ring-red-500/10' : ''}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-black">{item.title}</div>
              <p className="text-[10px] leading-relaxed mt-1 opacity-80 line-clamp-2">{item.description}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </button>
    ))}
  </div>
);

const taskWord = (count) => count % 10 === 1 && count % 100 !== 11 ? 'задача' : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100) ? 'задачи' : 'задач';
const formatHours = (hours) => Number(hours || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });

export default ExecutiveOverview;
