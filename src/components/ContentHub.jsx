import React from 'react';
import { FileText, CalendarDays, FolderOpen } from 'lucide-react';
import ContentStudio from './ContentStudio';
import ContentCalendar from './ContentCalendar';

export default function ContentHub({ mode, setMode, cardBg, textMain, company, tasks, onSaveToTask, publicationScope, incomingPublication, onCreateTasks }) {
  const tabs = [
    ['post', 'Создать пост', FileText],
    ['plan', 'Контент-план', CalendarDays],
    ['materials', 'Мои материалы', FolderOpen],
  ];
  return <div className="space-y-4">
    <div className={`p-1 rounded-2xl border grid grid-cols-3 gap-1 ${cardBg}`}>{tabs.map(([id,label,Icon]) => <button key={id} onClick={() => setMode(id)} className={`min-h-[44px] px-2 rounded-xl text-[11px] md:text-xs font-bold flex items-center justify-center gap-1.5 ${mode === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}><Icon className="w-4 h-4"/><span>{label}</span></button>)}</div>
    {mode === 'plan' ? <ContentCalendar cardBg={cardBg} textMain={textMain} company={company} onCreateTasks={onCreateTasks}/> : <ContentStudio cardBg={cardBg} textMain={textMain} company={company} tasks={tasks} onSaveToTask={onSaveToTask} publicationScope={publicationScope} incomingPublication={incomingPublication}/>} 
  </div>;
}
