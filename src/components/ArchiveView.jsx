import React from 'react';

const ArchiveView = ({
  archive,
  cardBg,
  textMain,
  handleQuickMove,
  onOpenTask,
}) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h3 className={`text-lg font-bold ${textMain}`}>Выполненные задачи</h3>
      {archive.length === 0 ? (
        <p className="text-xs text-slate-400">Архив пуст.</p>
      ) : (
        archive.map(task => (
          <div key={task.id} className={`p-4 rounded-2xl border flex justify-between items-center gap-3 ${cardBg}`}>
            <span className="text-sm font-semibold line-through text-slate-400">{task.text}</span>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => onOpenTask?.(task)} className="text-xs font-bold text-violet-600 dark:text-violet-400">Открыть</button>
              <button
                onClick={() => handleQuickMove(task.id, 'todo')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Восстановить
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ArchiveView;
