import React, { useState } from 'react';
import { CalendarCheck2, BriefcaseBusiness, Bot, Plus, Menu, X, Sparkles, StickyNote, Lock, Users } from 'lucide-react';
import { ROLES } from '../utils/workspaceUtils';

const MobileNav = ({ isDark, isTeamMode, userRole, activeTab, setActiveTab, onQuickAction, canCreateTeamTask = false, currentWorkspace = 'personal' }) => {
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const sections = [
    ['content', 'Контент', true],
    ['integrations', 'Интеграции', true],
    ['kpi', 'Аналитика', currentWorkspace === 'company' && isTeamMode && userRole !== ROLES.MEMBER],
    ['team', 'Команда', currentWorkspace === 'company' && isTeamMode && userRole !== ROLES.MEMBER],
    ['sops', 'Регламенты', currentWorkspace === 'company'],
    ['archive', 'Архив', true],
    ['help', 'Как пользоваться', true],
  ].filter(([, , visible]) => visible);
  const select = id => { setActiveTab(id); setExpanded(false); setCreating(false); };
  const runQuick = action => { setCreating(false); setExpanded(false); onQuickAction?.(action); };
  const surface = isDark ? 'bg-[#1C2128] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900';
  const mainTabs = [
    ['executive', 'Сегодня', CalendarCheck2],
    ['matrix', 'Работа', BriefcaseBusiness],
    ['processes', 'AI', Bot],
  ];
  const itemClass = selected => `flex flex-col items-center justify-center gap-1 min-h-[48px] flex-1 rounded-xl ${selected ? 'font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10' : 'text-slate-500'}`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {creating && (
        <section aria-label="Быстрое создание" className={`mb-2 p-2 rounded-2xl border shadow-xl ${surface}`}>
          {[
            ['personal', 'Личное дело', Lock, true],
            ['work', 'Моя рабочая задача', BriefcaseBusiness, true],
            ['team', 'Задача команде', Users, canCreateTeamTask],
            ['ai', 'Создать с AI', Sparkles, true],
            ['note', 'Быстрая заметка', StickyNote, true],
          ].filter(([, , , visible]) => visible).map(([id, label, Icon]) => (
            <button key={id} onClick={() => runQuick(id)} className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/10">
              <Icon className="w-4 h-4 text-slate-500" /> {label}
            </button>
          ))}
        </section>
      )}
      {expanded && (
        <section id="mobile-sections" aria-label="Ещё" className={`mb-2 p-2 rounded-2xl border shadow-xl max-h-[55vh] overflow-y-auto ${surface}`}>
          <div className="flex items-center justify-between px-2 mb-1"><span className="font-bold text-sm">Ещё</span><button aria-label="Закрыть меню" onClick={() => setExpanded(false)} className="p-2"><X className="w-5 h-5" /></button></div>
          {sections.map(([id, label]) => <button key={id} onClick={() => select(id)} aria-current={activeTab === id ? 'page' : undefined} className={`block w-full min-h-[44px] text-left px-3 rounded-xl text-sm ${activeTab === id ? 'bg-slate-100 dark:bg-white/10 font-bold' : ''}`}>{label}</button>)}
        </section>
      )}
      <nav aria-label="Основное меню" className={`grid grid-cols-5 items-center gap-1 px-2 py-2 rounded-2xl border shadow-xl ${surface}`}>
        {mainTabs.slice(0, 2).map(([id, label, Icon]) => <button key={id} onClick={() => select(id)} className={itemClass(activeTab === id)}><Icon className="w-5 h-5" /><span className="text-[10px]">{label}</span></button>)}
        <button aria-label="Создать" aria-expanded={creating} onClick={() => { setCreating(!creating); setExpanded(false); }} className="w-12 h-12 justify-self-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-md"><Plus className={`w-5 h-5 transition-transform ${creating ? 'rotate-45' : ''}`} /></button>
        {mainTabs.slice(2).map(([id, label, Icon]) => <button key={id} onClick={() => select(id)} className={itemClass(activeTab === id)}><Icon className="w-5 h-5" /><span className="text-[10px]">{label}</span></button>)}
        <button aria-expanded={expanded} aria-controls="mobile-sections" onClick={() => { setExpanded(!expanded); setCreating(false); }} className={itemClass(expanded || sections.some(([id]) => id === activeTab))}><Menu className="w-5 h-5" /><span className="text-[10px]">Ещё</span></button>
      </nav>
    </div>
  );
};
export default MobileNav;
