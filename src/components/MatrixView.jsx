import React, { useState } from 'react';
import { Sparkles, Filter, User, ChevronDown, X } from 'lucide-react';
import TaskColumn from './TaskColumn';
import TaskCard from './TaskCard';
import { sortTasksByPriority } from '../utils/taskUtils';

const MatrixView = ({
  isDark,
  isTeamMode,
  workspace = 'personal',
  handleRunAIAgent,
  isAgentRunning,
  assistants,
  tasks,
  assigneeFilter,
  setAssigneeFilter,
  todoTasks,
  inProgressTasks,
  reviewTasks,
  deferredTasks,
  openTaskModal,
  handleQuickMove,
  canReview = false,
  dataLoading = false
}) => {
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const companyMode = workspace === 'company' && isTeamMode;
  const allVisibleTasks = [...todoTasks, ...inProgressTasks, ...reviewTasks, ...deferredTasks];
  const matchesPriority = (task) => priorityFilter === 'all' || (priorityFilter === 'urgent' ? task.urgent : task.important);
  const matchesCategory = (task) => workspace !== 'personal' || categoryFilter === 'all' || (task.category === 'personal' ? 'personal' : 'work') === categoryFilter;
  const matchesProject = (task) => projectFilter === 'all' || task.projectName === projectFilter;
  const filterTasks = (list) => sortTasksByPriority(list.filter((task) => matchesPriority(task) && matchesCategory(task) && matchesProject(task)));
  const activeTasks = [...todoTasks, ...inProgressTasks];
  const aiSuggestionCount = activeTasks.filter((task) => !task.expectedResult || !task.description || !(Number(task.estimatedHours) > 0)).length;
  const priorityOptions = [
    ['all', 'Любой приоритет', allVisibleTasks.length],
    ['urgent', 'Только срочные', allVisibleTasks.filter((task) => task.urgent).length],
    ['important', 'Только важные', allVisibleTasks.filter((task) => task.important).length],
  ];
  const activePriorityLabel = priorityOptions.find(([id]) => id === priorityFilter)?.[1];
  const visibleDeferredTasks = filterTasks(deferredTasks);
  const projectOptions = [...new Set(allVisibleTasks.map((task) => task.projectName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));

  return (
    <div className="space-y-4">
      {/* Фильтр по сотрудникам */}
      {companyMode && assistants.length > 1 && (
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

      <div className="flex items-center justify-between gap-3">
        {workspace === 'personal' ? (
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1" aria-label="Фильтр личного пространства">
            {[['all', 'Все'], ['work', 'Работа'], ['personal', 'Личное']].map(([id, label]) => <button key={id} type="button" aria-pressed={categoryFilter === id} onClick={() => setCategoryFilter(id)} className={`min-h-[40px] px-4 rounded-xl text-xs font-bold border shrink-0 ${categoryFilter === id ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white border-slate-200 text-slate-600 dark:bg-[#161B22] dark:border-white/10 dark:text-slate-300'}`}>{label}</button>)}
          </div>
        ) : <span />}

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label={aiSuggestionCount ? `Уточнить задачи с AI: ${aiSuggestionCount}` : 'Все задачи сформулированы понятно'}
            onClick={handleRunAIAgent}
            disabled={isAgentRunning || aiSuggestionCount === 0}
            className="min-h-[40px] px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 border-slate-200 bg-white text-violet-600 disabled:opacity-50 dark:border-white/10 dark:bg-[#161B22] dark:text-violet-300"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAgentRunning ? 'animate-pulse' : ''}`} />
            <span>{isAgentRunning ? 'Проверяю…' : aiSuggestionCount ? `Уточнить с AI · ${aiSuggestionCount}` : 'Задачи понятны'}</span>
          </button>
          <button
            type="button"
            aria-expanded={isAdvancedFilterOpen}
            aria-controls="work-advanced-filter"
            onClick={() => setIsAdvancedFilterOpen((open) => !open)}
            className={`min-h-[40px] px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${priorityFilter !== 'all' || projectFilter !== 'all' ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#161B22] dark:text-slate-300'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Фильтр
            {(priorityFilter !== 'all' || projectFilter !== 'all') && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" aria-label={projectFilter !== 'all' ? `Проект: ${projectFilter}` : activePriorityLabel} />}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAdvancedFilterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isAdvancedFilterOpen && (
        <div id="work-advanced-filter" className={`rounded-2xl border p-3 flex flex-wrap items-center gap-2 ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`} aria-label="Дополнительный фильтр задач">
          {priorityOptions.map(([id, label, count]) => (
            <button key={id} type="button" aria-pressed={priorityFilter === id} onClick={() => setPriorityFilter(id)} className={`min-h-[36px] px-3 rounded-xl text-xs font-bold border ${priorityFilter === id ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300'}`}>
              {label} <span className="opacity-60">{count}</span>
            </button>
          ))}
          {projectOptions.length > 0 && <select aria-label="Фильтр по проекту" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="min-h-[36px] rounded-xl border border-slate-200 bg-transparent px-3 text-xs font-bold text-slate-600 outline-none dark:border-white/10 dark:text-slate-300"><option value="all">Все проекты</option>{projectOptions.map((project) => <option key={project} value={project}>{project}</option>)}</select>}
          {(priorityFilter !== 'all' || projectFilter !== 'all') && <button type="button" onClick={() => { setPriorityFilter('all'); setProjectFilter('all'); }} className="ml-auto min-h-[36px] px-2 text-xs font-bold text-slate-500 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Сбросить</button>}
        </div>
      )}

      {dataLoading && !allVisibleTasks.length ? (
        <div className="space-y-2" aria-label="Задачи загружаются">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />)}
        </div>
      ) : <div className={`grid grid-cols-1 ${companyMode ? 'md:grid-cols-2' : ''} gap-4`}>
        <TaskColumn title={companyMode ? 'В работе' : 'Задачи'} colorClass="bg-blue-500" tasks={filterTasks(activeTasks)} hideEmptyOnMobile isTeamMode={companyMode} workspace={workspace} isDark={isDark} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} canReview={canReview} />
        
        {companyMode && (
          <TaskColumn title="На проверке" colorClass="bg-amber-500" tasks={filterTasks(reviewTasks)} hideEmptyOnMobile isTeamMode={companyMode} workspace={workspace} isDark={isDark} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} canReview={canReview} />
        )}
      </div>}

      {visibleDeferredTasks.length > 0 && (
        <details className={`group rounded-2xl border ${isDark ? 'border-white/10 bg-[#161B22]' : 'border-slate-200 bg-white'}`}>
          <summary className="min-h-[44px] cursor-pointer list-none px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-300">
            <span>Отложено <span className="font-normal text-slate-400">({visibleDeferredTasks.length})</span></span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 dark:border-white/10 p-3 space-y-2">
            {visibleDeferredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isTeamMode={companyMode}
                workspace={workspace}
                isDark={isDark}
                onSelectTask={openTaskModal}
                onQuickMove={handleQuickMove}
                canReview={canReview}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default MatrixView;
