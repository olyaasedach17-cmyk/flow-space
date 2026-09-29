import React from 'react';
import { CalendarDays, Flame, Gem, Clock, User, CheckCircle2, FolderKanban } from 'lucide-react';

const TaskCard = ({ task, isDark, isTeamMode, workspace = 'personal', onSelectTask, onQuickMove, canReview = false }) => {
  const dueDate = String(task.dueDate || '').slice(0, 10);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isOverdue = Boolean(dueDate && dueDate < todayKey);
  const dueLabel = dueDate ? new Date(`${dueDate}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '';
  const canCompleteWithCheckbox = !isTeamMode && (task.status === 'todo' || task.status === 'in_progress');

  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`p-3 rounded-2xl border transition-all cursor-pointer hover:shadow-sm ${
        isDark 
          ? 'bg-[#161B22] border-white/10 hover:border-white/20' 
          : 'bg-white border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {canCompleteWithCheckbox && (
          <input
            type="checkbox"
            checked={false}
            aria-label={`Завершить задачу: ${task.text}`}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onQuickMove(task.id, 'done')}
            className={`mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-2 accent-emerald-500 ${
              isDark ? 'border-white/30 bg-transparent' : 'border-slate-300 bg-white'
            }`}
          />
        )}
        <h4 className={`min-w-0 text-sm font-bold leading-snug line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {task.text}
        </h4>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 min-w-0">
          {task.urgent && <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg bg-red-500/10 text-[9px] font-bold text-red-600 dark:text-red-400"><Flame className="w-3 h-3" /> Срочно</span>}
          {task.important && <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg bg-blue-500/10 text-[9px] font-bold text-blue-600 dark:text-blue-400"><Gem className="w-3 h-3" /> Важно</span>}
          {workspace === 'personal' && task.category === 'personal' && <span className="px-1.5 py-1 rounded-lg bg-emerald-500/10 text-[9px] font-bold text-emerald-600 dark:text-emerald-300">Личное</span>}
          {task.projectName && <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg bg-violet-500/10 text-[9px] font-bold text-violet-600 dark:text-violet-300"><FolderKanban className="w-3 h-3" />{task.projectName}</span>}
          {dueLabel && <span className={`flex items-center gap-0.5 font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}><CalendarDays className="w-3 h-3" />{isOverdue ? 'Просрочено · ' : ''}{dueLabel}</span>}
          {task.time && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {task.time}</span>}
          {isTeamMode && task.assigneeName && (
            <span className="flex items-center gap-0.5 font-medium text-slate-600 dark:text-slate-300">
              <User className="w-3 h-3 opacity-60" /> {task.assigneeName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isTeamMode && (task.status === 'todo' || task.status === 'in_progress') && (
            <button 
              onClick={() => onSelectTask(task)} 
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-bold"
            >
              Сдать результат
            </button>
          )}
          {task.status === 'review' && canReview && (
            <button 
              onClick={() => onSelectTask(task)} 
              className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> Принять
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
