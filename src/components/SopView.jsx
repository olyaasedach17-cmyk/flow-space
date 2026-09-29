import React, { useMemo, useState } from 'react';
import { Copy, Edit3, History, Link2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeSop } from '../utils/sopUtils';

const lines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);

const SopView = ({ sops, tasks = [], archive = [], assistants = [], canEdit = false, cardBg, textMain, inputBg, btnPrimary, handleUpdateSOP = () => {}, handleDeleteSOP }) => {
  const [editing, setEditing] = useState(null);
  const normalizedSops = useMemo(() => sops.map(normalizeSop), [sops]);
  const beginEdit = (sop) => setEditing({ ...sop, stepsText: sop.steps.join('\n'), criteriaText: sop.criteria.join('\n') });
  const save = async (event) => {
    event.preventDefault();
    const owner = assistants.find((item) => String(item.id) === String(editing.ownerId));
    await handleUpdateSOP(editing.id, { title: editing.title, purpose: editing.purpose, steps: lines(editing.stepsText), criteria: lines(editing.criteriaText), ownerId: editing.ownerId, ownerName: owner?.name || '' });
    setEditing(null);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div><h3 className={`text-lg font-bold ${textMain}`}>Регламенты</h3><p className="text-xs text-slate-400 mt-1">Рабочие инструкции, связанные с задачами и AI.</p></div>
      {normalizedSops.length === 0 && <p className="text-xs text-slate-400">Создайте регламент через Операционный AI и сохраните готовый результат сюда.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {normalizedSops.map((sop) => {
          const linkedTasks = [...tasks, ...archive].filter((task) => String(task.sopId || '') === String(sop.id));
          return (
            <div key={sop.id} className={`p-5 rounded-2xl border flex flex-col ${cardBg}`}>
              <div className="flex justify-between items-start gap-3 mb-3">
                <div><h4 className={`font-bold text-sm leading-snug ${textMain}`}>{sop.title}</h4><div className="flex flex-wrap gap-2 mt-1 text-[10px] text-slate-500"><span>Версия {sop.version}</span><span>Обновлён {sop.date || '—'}</span>{sop.ownerName && <span>Ответственный: {sop.ownerName}</span>}</div></div>
                {canEdit && <button onClick={() => beginEdit(sop)} aria-label={`Редактировать ${sop.title}`} className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500"><Edit3 className="w-3.5 h-3.5" /></button>}
              </div>
              {sop.purpose && <p className="text-xs text-slate-500 mb-3"><strong>Цель:</strong> {sop.purpose}</p>}
              <details className="text-xs text-slate-500"><summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">Открыть регламент</summary><ol className="list-decimal pl-5 mt-3 space-y-1">{sop.steps.map((step, index) => <li key={`${sop.id}-step-${index}`}>{step}</li>)}</ol>{sop.criteria.length > 0 && <div className="mt-3"><strong>Критерии:</strong><ul className="list-disc pl-5 mt-1">{sop.criteria.map((item, index) => <li key={`${sop.id}-criterion-${index}`}>{item}</li>)}</ul></div>}</details>
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px] text-slate-500"><div className="font-bold flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Связанные задачи: {linkedTasks.length}</div>{linkedTasks.slice(0, 3).map((task) => <div key={task.id} className="mt-1 truncate">• {task.text}</div>)}{linkedTasks.length > 3 && <div className="mt-1">Ещё {linkedTasks.length - 3}</div>}</div>
              <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-200 dark:border-white/10"><button onClick={() => { navigator.clipboard.writeText(sop.content); toast.success('Скопировано'); }} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1"><Copy className="w-3.5 h-3.5"/> Копировать</button><div className="flex items-center gap-3">{sop.versionHistory.length > 0 && <span className="text-[10px] text-slate-400 flex items-center gap-1" title={`${sop.versionHistory.length} предыдущих версий`}><History className="w-3.5 h-3.5" /> {sop.versionHistory.length}</span>}{canEdit && <button onClick={() => handleDeleteSOP(sop.id)} aria-label={`Удалить ${sop.title}`} className="text-xs font-bold text-red-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>}</div></div>
            </div>
          );
        })}
      </div>

      {editing && <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4"><form onSubmit={save} className={`w-full md:max-w-xl rounded-t-3xl md:rounded-3xl p-6 border max-h-[92vh] overflow-y-auto ${cardBg}`}><div className="flex justify-between items-center mb-5"><div><h3 className={`font-bold ${textMain}`}>Редактирование регламента</h3><p className="text-[10px] text-slate-400">После сохранения будет версия {editing.version + 1}</p></div><button type="button" onClick={() => setEditing(null)}><X className="w-5 h-5 text-slate-400" /></button></div><div className="space-y-4">
        <label className="block text-xs font-bold text-slate-500">Название<input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={`mt-1 w-full p-3 rounded-xl border font-normal ${inputBg}`} /></label>
        <label className="block text-xs font-bold text-slate-500">Цель<textarea value={editing.purpose} onChange={(e) => setEditing({ ...editing, purpose: e.target.value })} rows="2" placeholder="Зачем нужен этот регламент" className={`mt-1 w-full p-3 rounded-xl border font-normal resize-none ${inputBg}`} /></label>
        <label className="block text-xs font-bold text-slate-500">Шаги — каждый с новой строки<textarea required value={editing.stepsText} onChange={(e) => setEditing({ ...editing, stepsText: e.target.value })} rows="7" className={`mt-1 w-full p-3 rounded-xl border font-normal resize-none ${inputBg}`} /></label>
        <label className="block text-xs font-bold text-slate-500">Критерии готовности — каждый с новой строки<textarea value={editing.criteriaText} onChange={(e) => setEditing({ ...editing, criteriaText: e.target.value })} rows="4" className={`mt-1 w-full p-3 rounded-xl border font-normal resize-none ${inputBg}`} /></label>
        <label className="block text-xs font-bold text-slate-500">Ответственный<select value={editing.ownerId} onChange={(e) => setEditing({ ...editing, ownerId: e.target.value })} className={`mt-1 w-full p-3 rounded-xl border font-normal ${inputBg}`}><option value="">Не назначен</option>{assistants.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.position || 'Сотрудник'})</option>)}</select></label>
        <button type="submit" className={`w-full py-3.5 rounded-2xl text-xs font-bold ${btnPrimary}`}>Сохранить новую версию</button>
      </div></form></div>}
    </div>
  );
};

export default SopView;
