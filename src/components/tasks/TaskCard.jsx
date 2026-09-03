// ==========================================
import React from 'react';
import { Flame, Gem, Clock, User, CheckCircle2, Target } from 'lucide-react';

const TaskCard = ({ task, isDark, isTeamMode, onSelectTask, onQuickMove }) => {
  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
        isDark
          ? 'bg-[#161B22] border-white/10 hover:border-white/20'
          : 'bg-white border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {task.text}
        </h4>
        <div className="flex items-center gap-1 shrink-0">
          {task.urgent && <Flame className="w-3.5 h-3.5 text-red-500" />}
          {task.important && <Gem className="w-3.5 h-3.5 text-blue-500" />}
        </div>
      </div>

      {/* ОЖИДАЕМЫЙ РЕЗУЛЬТАТ */}
      {task.expectedResult && (
        <div className="mb-2.5 p-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
          <Target className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="line-clamp-2 font-medium">{task.expectedResult}</span>
        </div>
      )}

      {task.description && !task.expectedResult && (
        <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          {task.estimatedHours > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> {task.estimatedHours}ч
            </span>
          )}
          {isTeamMode && task.assigneeName && (
            <span className="flex items-center gap-0.5 font-medium text-slate-600 dark:text-slate-300">
              <User className="w-3 h-3 opacity-60" /> {task.assigneeName}
            </span>
          )}
        </div>

        {/* Быстрое действие перемещения */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {task.status === 'todo' && (
            <button
              onClick={() => onQuickMove(task.id, 'in_progress')}
              className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold"
            >
              В работу
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              onClick={() => onQuickMove(task.id, isTeamMode ? 'review' : 'done')}
              className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 font-bold"
            >
              {isTeamMode ? 'На проверку' : 'Готово'}
            </button>
          )}
          {task.status === 'review' && (
            <button
              onClick={() => onQuickMove(task.id, 'done')}
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


// ==========================================
