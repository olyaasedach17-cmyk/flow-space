import React, { useMemo, useState } from 'react';
import BriefingCard from './BriefingCard';
import TodayTaskList from './TodayTaskList';
import { getLocalDateKey, isTaskForToday } from '../utils/taskUtils';

const SoloOverview = ({ cardBg, textMain, tasks = [], archive = [], metrics, insights, calendarEvents, briefingTexts, briefingLoadingKind, onGenerateBriefing, onSaveBriefingDecision, briefingState, onOpenTasks, onOpenTask, onQuickMove, onEnableTeam, dataLoading }) => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [period, setPeriod] = useState('today');
  const summary = useMemo(() => {
    const active = tasks.filter((task) => task.status !== 'done').filter((task) => categoryFilter === 'all' || (task.category === 'personal' ? 'personal' : 'work') === categoryFilter);
    const todayKey = getLocalDateKey();
    const today = active.filter((task) => isTaskForToday(task, todayKey));
    const hours = today.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0);
    const unestimated = today.filter((task) => !(Number(task.estimatedHours) > 0)).length;
    return { today, hours, unestimated };
  }, [tasks, categoryFilter]);

  return (
    <div className="space-y-4">
      <div className="inline-flex w-full sm:w-auto rounded-2xl bg-slate-100 dark:bg-white/5 p-1" aria-label="Период обзора">
        {[['today', 'Сегодня'], ['week', 'Неделя']].map(([id, label]) => <button key={id} type="button" aria-pressed={period === id} onClick={() => setPeriod(id)} className={`flex-1 sm:min-w-[120px] min-h-[40px] px-4 rounded-xl text-xs font-bold ${period === id ? 'bg-white dark:bg-[#161B22] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}
      </div>

      {period === 'today' ? <>
        <div className="flex items-center gap-2 overflow-x-auto" aria-label="Фильтр задач на сегодня">
          {[['all', 'Все'], ['work', 'Работа'], ['personal', 'Личное']].map(([id, label]) => <button key={id} type="button" aria-pressed={categoryFilter === id} onClick={() => setCategoryFilter(id)} className={`min-h-[40px] px-4 rounded-xl text-xs font-bold border shrink-0 ${categoryFilter === id ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white border-slate-200 text-slate-600 dark:bg-[#161B22] dark:border-white/10 dark:text-slate-300'}`}>{label}</button>)}
        </div>
        <TodayTaskList tasks={summary.today} cardBg={cardBg} textMain={textMain} onOpenTasks={onOpenTasks} onOpenTask={onOpenTask} onQuickMove={onQuickMove} workspace="personal" dataLoading={dataLoading} />
        <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${cardBg} ${textMain}`} aria-label="Загрузка на сегодня">
          <span>{summary.today.length} {taskWord(summary.today.length)} · ~{formatHours(summary.hours)} ч{summary.unestimated ? ` · без оценки: ${summary.unestimated}` : ''}</span>
          {summary.hours > 8 && <span className="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-300">План перегружен — часть задач лучше перенести.</span>}
        </div>
      </> : (
        <BriefingCard
          solo
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
      )}

      {period === 'week' && <details className={`rounded-2xl border px-4 py-3 ${cardBg}`}><summary className="cursor-pointer text-xs font-bold text-slate-500">Подробнее о режиме пространства</summary><div className="pt-3 text-xs text-slate-500">Личные задачи останутся приватными, если позже понадобится команда. <button onClick={onEnableTeam} className="font-bold text-violet-600 dark:text-violet-300">Добавить команду</button></div></details>}
    </div>
  );
};

const taskWord = (count) => count % 10 === 1 && count % 100 !== 11 ? 'задача' : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100) ? 'задачи' : 'задач';
const formatHours = (hours) => Number(hours || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });

export default SoloOverview;
