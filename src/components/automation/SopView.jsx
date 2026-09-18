// ==========================================
import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const SopView = ({
  sops,
  cardBg,
  textMain,
  handleDeleteSOP
}) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h3 className={`text-lg font-bold ${textMain}`}>База Регламентов (SOP)</h3>
      {sops.length === 0 ? (
        <p className="text-xs text-slate-400">Сохраняйте ответы ИИ-юриста и бизнес-консультанта сюда.</p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sops.map(sop => (
          <div key={sop.id} className={`p-5 rounded-2xl border flex flex-col ${cardBg}`}>
            <div className="flex justify-between items-start mb-3">
              <h4 className={`font-bold text-sm leading-snug pr-4 ${textMain}`}>{sop.title}</h4>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">{sop.date}</span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-4 mb-4">{sop.content}</p>
            <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => { navigator.clipboard.writeText(sop.content); toast.success('Скопировано'); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5"/> Копировать
              </button>
              <button
                onClick={() => handleDeleteSOP(sop.id)}
                className="text-xs font-bold text-red-500 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SopView;


// ==========================================
