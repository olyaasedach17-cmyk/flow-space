import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Building2, Plus, Sparkles } from 'lucide-react';
import { ROLES } from '../utils/workspaceUtils';
import { listActivityEvents } from '../services/activityService';

const pluralRu = (count, one, few, many) => {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const TeamView = ({
  isTeamMode,
  cardBg,
  textMain,
  btnPrimary,
  setIsInviteOpen,
  assistants,
  tasks,
  departments = [],
  userRole,
  userDepartmentId,
  onCreateDepartment,
  onAssignDepartment,
  companyId,
  activityRevision = 0,
}) => {
  const [departmentName, setDepartmentName] = useState('');
  const [activityEvents, setActivityEvents] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const groupedDepartments = useMemo(() => departments.map((department) => ({
    ...department,
    members: assistants.filter((member) => member.departmentId === department.id),
    tasks: tasks.filter((task) => task.departmentId === department.id),
  })), [departments, assistants, tasks]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setActivityLoading(true);
    listActivityEvents(companyId)
      .then((result) => { if (!cancelled) setActivityEvents(result.events || []); })
      .catch((error) => { if (!cancelled) console.warn('Activity log unavailable:', error); })
      .finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
  }, [companyId, activityRevision]);

  if (!isTeamMode) return null;

  const createDepartment = async (event) => {
    event.preventDefault();
    if (!departmentName.trim()) return;
    await onCreateDepartment?.(departmentName);
    setDepartmentName('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${cardBg}`}>
        <div>
          <h3 className={`text-base font-bold ${textMain}`}>Команда и доступы</h3>
          <p className="text-xs text-slate-400 mt-1">Управление составом команды и ролями пользователей.</p>
        </div>
        {(userRole === ROLES.OWNER || userRole === ROLES.MANAGER) && (
          <div className="text-right">
            <button
              onClick={() => setIsInviteOpen(true)}
              disabled={userRole === ROLES.MANAGER && !userDepartmentId}
              className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 ${btnPrimary}`}
            >
              <Plus className="w-4 h-4" /> Пригласить сотрудника
            </button>
            {userRole === ROLES.MANAGER && !userDepartmentId && <p className="text-[10px] text-red-500 mt-1">Сначала собственник должен назначить вам отдел.</p>}
          </div>
        )}
      </div>

      <section className={`p-5 rounded-3xl border ${cardBg}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={`text-sm font-black flex items-center gap-2 ${textMain}`}><Building2 className="w-4 h-4 text-violet-500" /> Отделы</h3>
            <p className="text-xs text-slate-400 mt-1">Руководитель видит задачи и результаты только своего направления.</p>
          </div>
        </div>

        {userRole === ROLES.OWNER && (
          <form onSubmit={createDepartment} className="flex gap-2 mb-4">
            <input
              value={departmentName}
              onChange={(event) => setDepartmentName(event.target.value)}
              placeholder="Например: Продажи"
              maxLength={80}
              className="min-w-0 flex-1 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs outline-none"
            />
            <button type="submit" disabled={!departmentName.trim()} className={`px-4 rounded-xl text-xs font-bold disabled:opacity-50 ${btnPrimary}`}>Добавить</button>
          </form>
        )}

        {groupedDepartments.length ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {groupedDepartments.map((department) => (
              <div key={department.id} className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3">
                <div className={`text-xs font-black ${textMain}`}>{department.name}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {department.members.length} {pluralRu(department.members.length, 'сотрудник', 'сотрудника', 'сотрудников')} · {department.tasks.length} {pluralRu(department.tasks.length, 'активная задача', 'активные задачи', 'активных задач')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Создайте первый отдел, затем распределите сотрудников.</p>
        )}
      </section>

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
                      ({activeTasksCount} {pluralRu(activeTasksCount, 'задача', 'задачи', 'задач')} • {totalHours} ч)
                    </span>
                  </p>
                  <p className="text-[10px] text-violet-500 mt-1">{ast.departmentName || 'Отдел не назначен'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  {ast.role === 'owner' ? 'Собственник' : ast.role === 'manager' ? 'Руководитель' : 'Исполнитель'}
                </span>
                {userRole === ROLES.OWNER && ast.role !== ROLES.OWNER && (
                  <select
                    aria-label={`Отдел: ${ast.name}`}
                    value={ast.departmentId || ''}
                    onChange={(event) => onAssignDepartment?.(ast.id, event.target.value)}
                    className="max-w-40 p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B22] text-[10px]"
                  >
                    <option value="">Без отдела</option>
                    {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className={`p-5 rounded-3xl border ${cardBg}`}>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-emerald-500" />
          <h3 className={`text-sm font-black ${textMain}`}>Последние действия</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">Только важные изменения результата, без контроля кликов и времени онлайн.</p>
        {activityLoading ? (
          <p className="text-xs text-slate-400">Загружаю историю…</p>
        ) : activityEvents.length ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activityEvents.slice(0, 20).map((event) => (
              <div key={event.id} className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3">
                <div className={`text-xs font-bold ${textMain}`}>{event.label}{event.resourceTitle ? ` · ${event.resourceTitle}` : ''}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {event.actorName}{event.departmentName ? ` · ${event.departmentName}` : ''}{event.createdAt ? ` · ${new Date(event.createdAt).toLocaleString('ru-RU')}` : ''}
                </div>
                {event.details && <div className="text-[11px] text-slate-500 mt-1">{event.details}</div>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">История появится после создания, сдачи или проверки задачи.</p>
        )}
      </section>
    </div>
  );
};

export default TeamView;
