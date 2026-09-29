import React from 'react';
import { LayoutDashboard, CheckSquare, Users, LogOut, ShieldCheck, PieChart, Zap, Building2, Lock, Bot, Radar, Plug, Camera, CircleHelp } from 'lucide-react';
import { WORKSPACES, ROLES } from '../utils/workspaceUtils';

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
    { id: 'executive', icon: <Radar className="w-5 h-5" />, label: 'Сегодня', primary: true },
    { id: 'matrix', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Работа', primary: true },
    { id: 'processes', icon: <Bot className="w-5 h-5" />, label: 'AI-помощник', primary: true },
    { id: 'content', icon: <Camera className="w-5 h-5" />, label: 'Контент' },
    { id: 'integrations', icon: <Plug className="w-5 h-5" />, label: 'Интеграции' },
    { id: 'kpi', icon: <PieChart className="w-5 h-5" />, label: 'Показатели', hideForMember: true, teamOnly: true },
    { id: 'team', icon: <Users className="w-5 h-5" />, label: 'Команда', hideForMember: true, teamOnly: true },
    { id: 'sops', icon: <ShieldCheck className="w-5 h-5" />, label: 'Регламенты', teamOnly: true },
    { id: 'archive', icon: <CheckSquare className="w-5 h-5" />, label: 'Архив' },
    { id: 'help', icon: <CircleHelp className="w-5 h-5" />, label: 'Как пользоваться' },
  ];

  const visibleMenu = menuItems.filter((item) => {
    if (item.hideForMember && userRole === ROLES.MEMBER) return false;
    if (item.teamOnly && (!isTeamMode || currentWorkspace !== WORKSPACES.COMPANY)) return false;
    return true;
  });
  const primaryMenu = visibleMenu.filter((item) => item.primary);
  const secondaryMenu = visibleMenu.filter((item) => !item.primary);
  const menuButton = (item) => (
    <button
      key={item.id}
      onClick={() => setActiveTab(item.id)}
      aria-current={activeTab === item.id ? 'page' : undefined}
      className={`w-full flex items-center justify-start gap-3 p-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-medium'}`}
    >
      {item.icon}<span className="text-sm">{item.label}</span>
    </button>
  );

  return (
    <aside className="fixed bottom-0 md:top-0 left-0 w-full md:w-64 bg-white dark:bg-[#0D1117] border-t md:border-t-0 md:border-r border-slate-200 dark:border-white/10 z-40 hidden md:flex flex-col transition-colors">
      <div className="hidden md:flex items-center gap-3 p-6 border-b border-slate-100 dark:border-white/5">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-black text-lg shadow-md shrink-0">FS</div>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Flow Space</h1>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {isTeamMode ? 'Company OS' : 'Solo OS'}{isPro ? ' · Pro' : ''}
          </div>
        </div>
      </div>

      {isTeamMode && setCurrentWorkspace && (
        <div className="hidden md:flex p-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-full">
            <button
              onClick={() => setCurrentWorkspace(WORKSPACES.COMPANY)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${currentWorkspace === WORKSPACES.COMPANY ? 'bg-white dark:bg-[#161B22] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Building2 className="w-3.5 h-3.5" /> Команда
            </button>
            <button
              onClick={() => setCurrentWorkspace(WORKSPACES.PERSONAL)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${currentWorkspace === WORKSPACES.PERSONAL ? 'bg-white dark:bg-[#161B22] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Lock className="w-3.5 h-3.5" /> Моё
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-4 space-y-2 hide-scrollbar">
        {primaryMenu.map(menuButton)}
        <details className="pt-2" open={secondaryMenu.some((item) => item.id === activeTab)}>
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">Ещё</summary>
          <div className="space-y-1 mt-1">{secondaryMenu.map(menuButton)}</div>
        </details>
      </nav>

      <div className="hidden md:block p-4 border-t border-slate-100 dark:border-white/5 space-y-2">
        <button onClick={() => openTaskModal()} className={`w-full py-3.5 rounded-2xl text-xs font-bold mb-4 shadow-lg transition-transform active:scale-95 ${btnPrimary}`}>
          + Новая задача
        </button>
        <button onClick={() => setShowOnboarding(true)} className="w-full flex items-center gap-3 p-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
          <Zap className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-medium">Режим пространства</span>
        </button>
        <button onClick={onSignOut} className="w-full flex items-center gap-3 p-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Выйти</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
