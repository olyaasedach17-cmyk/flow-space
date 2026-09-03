// ==========================================
import React from 'react';
import { Sparkles, Filter, User } from 'lucide-react';
import TaskColumn from './TaskColumn';

const MatrixView = ({
  isDark,
  isTeamMode,
  handleRunAIAgent,
  isAgentRunning,
  btnPrimary,
  assistants,
  tasks,
  assigneeFilter,
  setAssigneeFilter,
  t,
  todoTasks,
  inProgressTasks,
  reviewTasks,
  deferredTasks,
  openTaskModal,
  handleQuickMove
}) => {
  return (
    <div className="space-y-4">
      {/* Баннер Умного Агента */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-slate-50 border-slate-200/80'}`}>
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Умный Агент
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Автоматически находит неполные задачи и составляет ТЗ.</p>
        </div>
        <button
          onClick={handleRunAIAgent}
          disabled={isAgentRunning}
          className={`px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 ${btnPrimary}`}
        >
          {isAgentRunning ? 'Запуск...' : 'Запустить Агента'}
        </button>
      </div>

      {/* Фильтр по сотрудникам */}
      {isTeamMode && assistants.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3" /> Фильтр:
          </span>
          <button
            onClick={() => setAssigneeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all ${
              assigneeFilter === 'all'
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#161B22]'
            }`}
          >
            Все ({tasks.length})
          </button>
          {assistants.map(ast => {
            const count = tasks.filter(tItem => tItem.assigneeName === ast.name).length;
            return (
              <button
                key={ast.id}
                onClick={() => setAssigneeFilter(ast.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all flex items-center gap-1.5 ${
                  assigneeFilter === ast.name
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#161B22]'
                }`}
              >
                <User className="w-3 h-3 opacity-60" /> {ast.name} <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Колонки задач */}
      <div className={`grid grid-cols-1 ${isTeamMode ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
        <TaskColumn title={t('colTodo')} colorClass="bg-slate-400" tasks={todoTasks} isTeamMode={isTeamMode} isDark={isDark} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />
        <TaskColumn title={t('colInProgress')} colorClass="bg-blue-500" tasks={inProgressTasks} isTeamMode={isTeamMode} isDark={isDark} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />

        {isTeamMode && (
          <TaskColumn title={t('colReview')} colorClass="bg-amber-500" tasks={reviewTasks} isTeamMode={isTeamMode} isDark={isDark} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />
        )}

        <TaskColumn title={t('colDeferred')} colorClass="bg-slate-600" tasks={deferredTasks} isTeamMode={isTeamMode} isDark={isDark} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />
      </div>
    </div>
  );
};

export default MatrixView;


// ==========================================
