import React, { useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarClock, ChevronDown, Flame, Gem, Lock } from 'lucide-react';
import { getLocalDateKey, isTaskForToday, sortTasksByPriority } from '../utils/taskUtils';

const TodayTaskList = ({ tasks = [], cardBg, textMain, onOpenTasks, onOpenTask, onQuickMove, workspace = 'personal', limit = 6, dataLoading = false }) => {
  const [showAll, setShowAll] = useState(false);
  const today = getLocalDateKey();
  const allTodayTasks = useMemo(() => sortTasksByPriority(
    tasks.filter((task) => isTaskForToday(task, today)),
    today,
  ), [tasks, today]);
  const visibleTasks = showAll ? allTodayTasks : allTodayTasks.slice(0, limit);
  const hiddenCount = Math.max(0, allTodayTasks.length - visibleTasks.length);
  const groups = [
    ['overdue', 'Просрочено', visibleTasks.filter((task) => task.dueDate && String(task.dueDate).slice(0, 10) < today), 'text-red-600 dark:text-red-300'],
    ['today', 'Сегодня', visibleTasks.filter((task) => String(task.dueDate || '').slice(0, 10) === today), 'text-slate-500 dark:text-slate-300'],
    ['urgent', 'Срочно без срока', visibleTasks.filter((task) => !task.dueDate && task.urgent), 'text-amber-600 dark:text-amber-300'],
  ];

  const renderTask = (task) => (
    <div key={task.id} className="w-full min-h-[48px] rounded-2xl bg-slate-50 dark:bg-white/5 px-3 py-2.5 flex items-center gap-2.5">
      {workspace === 'personal' && onQuickMove && (
        <input
          type="checkbox"
          checked={false}
          aria-label={`Завершить задачу: ${task.text || task.title}`}
          onChange={() => onQuickMove(task.id, 'done')}
          className="h-5 w-5 shrink-0 cursor-pointer rounded-md border-2 border-slate-300 bg-white accent-emerald-500 dark:border-white/30 dark:bg-transparent"
        />
      )}
      {workspace === 'personal' && task.category === 'personal'
        ? <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
        : <BriefcaseBusiness className="w-4 h-4 text-blue-500 shrink-0" />}
      <button type="button" onClick={() => onOpenTask ? onOpenTask(task) : onOpenTasks()} className="min-w-0 flex-1 text-left flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-semibold line-clamp-2 ${textMain}`}>{task.text || task.title}</span>
          {(task.time || task.dueDate) && <span className="mt-0.5 inline-flex sm:hidden items-center gap-1 text-[10px] text-slate-400"><CalendarClock className="w-3 h-3" />{task.time || String(task.dueDate).slice(5)}</span>}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {task.urgent && <span className="inline-flex items-center gap-0.5 rounded-lg bg-red-500/10 px-1.5 py-1 text-[9px] font-bold text-red-600 dark:text-red-300"><Flame className="w-3 h-3" />Срочно</span>}
          {task.important && <span className="inline-flex items-center gap-0.5 rounded-lg bg-blue-500/10 px-1.5 py-1 text-[9px] font-bold text-blue-600 dark:text-blue-300"><Gem className="w-3 h-3" />Важно</span>}
          {(task.time || task.dueDate) && <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400"><CalendarClock className="w-3 h-3" />{task.time || String(task.dueDate).slice(5)}</span>}
        </span>
      </button>
    </div>
  );

  return (
    <section className={`rounded-3xl border p-4 md:p-5 ${cardBg}`} aria-label="Задачи на сегодня">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Сегодня</div>
          <h3 className={`text-lg font-black ${textMain}`}>Задачи дня</h3>
        </div>
        <button type="button" onClick={onOpenTasks} className="text-xs font-bold text-violet-600 dark:text-violet-300">Вся работа</button>
      </div>
      {dataLoading && !allTodayTasks.length ? (
        <div className="space-y-2" aria-label="Задачи загружаются">
          {[0, 1, 2].map((item) => <div key={item} className="h-12 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />)}
        </div>
      ) : allTodayTasks.length ? (
        <div className="space-y-3">
          {groups.filter(([, , items]) => items.length).map(([id, label, items, tone]) => (
            <div key={id}>
              <div className={`mb-1.5 text-[10px] font-black uppercase tracking-wider ${tone}`}>{label} · {items.length}</div>
              <div className="space-y-2">{items.map(renderTask)}</div>
            </div>
          ))}
          {hiddenCount > 0 && <button type="button" onClick={() => setShowAll(true)} className="flex min-h-[40px] w-full items-center justify-center gap-1 rounded-xl text-xs font-bold text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10">Показать остальные · {hiddenCount}<ChevronDown className="h-3.5 w-3.5" /></button>}
          {showAll && allTodayTasks.length > limit && <button type="button" onClick={() => setShowAll(false)} className="min-h-[36px] w-full text-xs font-bold text-slate-400">Свернуть</button>}
        </div>
      ) : <p className="text-sm text-slate-500">На сегодня задач нет.</p>}
    </section>
  );
};

export default TodayTaskList;
