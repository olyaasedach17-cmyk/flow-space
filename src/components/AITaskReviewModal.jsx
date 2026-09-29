import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Sparkles, X } from 'lucide-react';

const fieldLabels = {
  expectedResult: 'Результат',
  description: 'Контекст',
  estimatedHours: 'Оценка',
  urgent: 'Срочно',
  important: 'Важно',
  assigneeName: 'Исполнитель',
};

const formatValue = (field, value) => {
  if (field === 'estimatedHours') return `${value} ч`;
  if (field === 'urgent' || field === 'important') return value ? 'Да' : 'Нет';
  return String(value || '—');
};

const AITaskReviewModal = ({ review, onClose, onApply, isApplying = false }) => {
  const proposals = review?.proposals || [];
  const [selectedIds, setSelectedIds] = useState(() => new Set(proposals.map((item) => String(item.id))));
  const selected = proposals.filter((item) => selectedIds.has(String(item.id)));

  useEffect(() => {
    setSelectedIds(new Set((review?.proposals || []).map((item) => String(item.id))));
  }, [review]);

  if (!review) return null;

  const toggle = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" role="dialog" aria-modal="true" aria-label="Проверка предложений AI">
      <div className="w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#161B22] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-300"><Sparkles className="h-4 w-4" /> AI подготовил предложения</div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Проверьте изменения перед сохранением</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Выберите задачи, которые нужно уточнить. Ничего ещё не изменено.</p>
          </div>
          <button type="button" aria-label="Закрыть" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 space-y-2">
          {proposals.map((proposal) => (
            <div key={proposal.id} className={`rounded-2xl border p-3 ${selectedIds.has(String(proposal.id)) ? 'border-violet-200 bg-violet-50/50 dark:border-violet-500/30 dark:bg-violet-500/5' : 'border-slate-200 opacity-60 dark:border-white/10'}`}>
              <div className="flex items-start gap-3">
                <button type="button" role="checkbox" aria-checked={selectedIds.has(String(proposal.id))} aria-label={`Применить изменения к задаче ${proposal.title}`} onClick={() => toggle(proposal.id)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${selectedIds.has(String(proposal.id)) ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 dark:border-white/30'}`}>{selectedIds.has(String(proposal.id)) && <Check className="h-3.5 w-3.5" />}</button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{proposal.title}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {proposal.changes.map((change) => <span key={change.field} className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200">{fieldLabels[change.field] || change.field}: {formatValue(change.field, change.value)}</span>)}
                  </div>
                  <details className="mt-2 text-xs text-slate-500">
                    <summary className="flex min-h-[32px] cursor-pointer list-none items-center gap-1 font-bold text-violet-600 dark:text-violet-300">Посмотреть полностью <ChevronDown className="h-3.5 w-3.5" /></summary>
                    <div className="space-y-2 border-t border-slate-200 pt-2 dark:border-white/10">
                      {proposal.changes.map((change) => <div key={change.field}><span className="font-bold text-slate-700 dark:text-slate-200">{fieldLabels[change.field] || change.field}:</span> {formatValue(change.field, change.value)}</div>)}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 -mx-4 -mb-4 mt-5 flex gap-2 border-t border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#161B22] md:-mx-6 md:-mb-6 md:px-6">
          <button type="button" onClick={onClose} className="min-h-[46px] flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 dark:border-white/10 dark:text-slate-300">Отмена</button>
          <button type="button" disabled={!selected.length || isApplying} onClick={() => onApply(selected)} className="min-h-[46px] flex-[1.4] rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{isApplying ? 'Сохраняю…' : `Применить · ${selected.length}`}</button>
        </div>
      </div>
    </div>
  );
};

export default AITaskReviewModal;
