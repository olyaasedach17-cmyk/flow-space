// ==========================================
import React from 'react';
import TaskCard from './TaskCard';

const TaskColumn = React.memo(({ title, colorClass, tasks, isTeamMode, isDark, onSelectTask, onQuickMove }) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
        <h3 className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {title} <span className="text-slate-400 font-normal ml-0.5">({tasks.length})</span>
        </h3>
      </div>
      <div className="space-y-3 grow">
        {tasks.length === 0 ? (
          <div className={`text-center py-8 rounded-2xl border border-dashed text-xs font-medium ${isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
            Задач пока нет
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isTeamMode={isTeamMode}
              isDark={isDark}
              onSelectTask={onSelectTask}
              onQuickMove={onQuickMove}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default TaskColumn;


// ==========================================
