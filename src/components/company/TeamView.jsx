// ==========================================
import React from 'react';
import { Plus, Sparkles } from 'lucide-react';

const TeamView = ({
  isTeamMode,
  cardBg,
  textMain,
  btnPrimary,
  setIsInviteOpen,
  assistants,
  tasks
}) => {
  if (!isTeamMode) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${cardBg}`}>
        <div>
          <h3 className={`text-base font-bold ${textMain}`}>Команда и доступы</h3>
          <p className="text-xs text-slate-400 mt-1">Управление составом команды и ролями пользователей.</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 ${btnPrimary}`}
        >
          <Plus className="w-4 h-4" /> Пригласить сотрудника
        </button>
      </div>

      <div className="space-y-3">
        {assistants.map(ast => {
          const activeTasksCount = tasks.filter(tItem => tItem.assigneeName === ast.name && tItem.status !== 'done').length;
          const totalHours = tasks.filter(tItem => tItem.assigneeName === ast.name && tItem.status !== 'done').reduce((acc, curr) => acc + (parseFloat(curr.estimatedHours) || 0), 0);

          return (
            <div key={ast.id} className={`p-4 rounded-2xl border flex justify-between items-center ${cardBg}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white flex items-center justify-center font-bold text-sm">
                  {ast.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className={`font-bold text-sm flex items-center gap-1.5 ${textMain}`}>
                    {ast.name} {ast.id === 'manager' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {ast.position ? `${ast.position} • ` : ''}{ast.email || 'Владелец аккаунта'}
                    <span className="ml-2 font-semibold text-slate-600 dark:text-slate-300">
                      ({activeTasksCount} задач • {totalHours}ч)
                    </span>
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                {ast.role === 'manager' || ast.id === 'manager' ? 'Руководитель' : 'Исполнитель'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamView;


// ==========================================
