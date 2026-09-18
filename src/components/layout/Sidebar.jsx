// ==========================================
import React from 'react';
import { LayoutDashboard, CheckSquare, Users, LogOut, ShieldCheck, PieChart, Zap, Building2, Lock } from 'lucide-react';
import { WORKSPACES, ROLES } from '../../utils/workspaceUtils';

const Sidebar = ({
  isDark,
  isPro,
  isTeamMode,
  activeTab,
  setActiveTab,
  openTaskModal,
  setShowOnboarding,
  onSignOut,
  btnPrimary,
  currentWorkspace,
  setCurrentWorkspace,
  userRole
}) => {
  const menuItems = [
    { id: 'matrix', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Матрица задач' },
    { id: 'kpi', icon: <PieChart className="w-5 h-5" />, label: 'Сводка и KPI', hideForMember: true },
    { id: 'team', icon: <Users className="w-5 h-5" />, label: 'Команда', hideForMember: true },
    { id: 'sops', icon: <ShieldCheck className="w-5 h-5" />, label: 'Регламенты (SOP)' },
    { id: 'archive', icon: <CheckSquare className="w-5 h-5" />, label: 'Архив' },
  ];

  // Скрываем вкладки аналитики и команды для рядовых сотрудников или если режим команды выключен
  const visibleMenu = menuItems.filter(item => {
    if (currentWorkspace === WORKSPACES.PERSONAL && ['kpi', 'team', 'sops'].includes(item.id)) return false;
    if (item.hideForMember && userRole === ROLES.MEMBER) return false;
    if ((item.id === 'team' || item.id === 'kpi') && !isTeamMode) return false;
    return true;
  });

  return (
    <aside className="fixed bottom-0 md:top-0 left-0 w-full md:w-64 bg-white dark:bg-[#0D1117] border-t md:border-t-0 md:border-r border-slate-200 dark:border-white/10 z-40 flex flex-col transition-colors">
      <div className="hidden md:flex items-center gap-3 p-6 border-b border-slate-100 dark:border-white/5">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-black text-lg shadow-md shrink-0">
          FS
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Flow Space</h1>
          {isPro && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pro Edition</span>}
        </div>
      </div>

      {/* ПЕРЕКЛЮЧАТЕЛЬ ПРОСТРАНСТВ (WORKSPACE TOGGLE) */}
      {isTeamMode && setCurrentWorkspace && (
        <div className="hidden md:flex p-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-full">
            <button
              onClick={() => setCurrentWorkspace(WORKSPACES.COMPANY)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentWorkspace === WORKSPACES.COMPANY
                  ? 'bg-white dark:bg-[#161B22] shadow-sm text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Компания
            </button>
            <button
              onClick={() => setCurrentWorkspace(WORKSPACES.PERSONAL)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentWorkspace === WORKSPACES.PERSONAL
                  ? 'bg-white dark:bg-[#161B22] shadow-sm text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Личное
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2 md:p-4 flex flex-row md:flex-col gap-1 md:gap-2 justify-around md:justify-start hide-scrollbar">
        {visibleMenu.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center md:justify-start justify-center flex-col md:flex-row gap-1 md:gap-3 p-3 rounded-2xl transition-all ${
              activeTab === item.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-md'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            {item.icon}
            <span className="text-[10px] md:text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="hidden md:block p-4 border-t border-slate-100 dark:border-white/5 space-y-2">
        <button
          onClick={() => openTaskModal()}
          className={`w-full py-3.5 rounded-2xl text-xs font-bold mb-4 shadow-lg transition-transform active:scale-95 ${btnPrimary}`}
        >
          + Новая задача
        </button>

        <button
          onClick={() => setShowOnboarding(true)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <Zap className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-medium">Обучение</span>
        </button>

        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 p-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Выйти</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;


// ==========================================
