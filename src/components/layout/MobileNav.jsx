// ==========================================
import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Plus,
  BookOpen,
  Users,
  FolderArchive
} from 'lucide-react';

const MobileNav = ({
  isDark,
  isTeamMode,
  activeTab,
  setActiveTab,
  openTaskModal
}) => {
  return (
    <div className="md:hidden fixed bottom-5 left-4 right-4 z-40">
      <div className={`flex justify-between items-center px-4 py-2 rounded-2xl shadow-2xl border backdrop-blur-lg ${isDark ? 'bg-[#1C2128]/90 border-white/10 shadow-black/60' : 'bg-white/90 border-slate-200/80 shadow-slate-300/50'}`}>
        <button onClick={() => setActiveTab('matrix')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'matrix' ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px]">Задачи</span>
        </button>
        <button onClick={() => setActiveTab('processes')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'processes' ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-400'}`}>
          <Bot className="w-5 h-5" />
          <span className="text-[9px]">ИИ</span>
        </button>

        <button onClick={() => openTaskModal()} className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl active:scale-95 transition-transform shadow-md ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
          <Plus className="w-5 h-5" />
        </button>

        <button onClick={() => setActiveTab('sops')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'sops' ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-400'}`}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[9px]">База</span>
        </button>

        {isTeamMode ? (
          <button onClick={() => setActiveTab('team')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'team' ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-400'}`}>
            <Users className="w-5 h-5" />
            <span className="text-[9px]">Люди</span>
          </button>
        ) : (
          <button onClick={() => setActiveTab('archive')} className={`flex flex-col items-center gap-1 w-12 ${activeTab === 'archive' ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-400'}`}>
            <FolderArchive className="w-5 h-5" />
            <span className="text-[9px]">Архив</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileNav;


// ==========================================
