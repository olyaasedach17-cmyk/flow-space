import React, { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, RotateCcw, Send, History } from 'lucide-react';

const TaskReviewPanel = ({ task, canReview, onSubmitResult, onAcceptResult, onReturnForRework, inputBg, textMain }) => {
  const [artifactUrl, setArtifactUrl] = useState(task?.resultArtifact?.url || '');
  const [artifactNote, setArtifactNote] = useState(task?.resultArtifact?.note || '');
  const [reviewComment, setReviewComment] = useState('');

  const history = useMemo(() => [...(task?.reviewHistory || [])].reverse(), [task?.reviewHistory]);

  if (!task) return null;

  return (
    <div className="space-y-4 border-t border-slate-200 dark:border-white/10 pt-4 mt-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-wide text-violet-500 mb-1">Сдача результата</div>
        <p className="text-[11px] text-slate-400">Задача считается завершённой только после сдачи и принятия результата.</p>
      </div>

      <div className="space-y-2">
        <input
          value={artifactUrl}
          onChange={(event) => setArtifactUrl(event.target.value)}
          placeholder="Ссылка на результат: документ, макет, сайт, файл..."
          className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}
        />
        <textarea
          value={artifactNote}
          onChange={(event) => setArtifactNote(event.target.value)}
          rows="2"
          placeholder="Коротко: что именно готово и где смотреть результат"
          className={`w-full p-3 rounded-xl outline-none border text-xs resize-none ${inputBg}`}
        />
      </div>

      {task.status !== 'done' && task.status !== 'review' && (
        <button
          type="button"
          onClick={() => onSubmitResult({ artifactUrl, artifactNote })}
          className="w-full py-3 rounded-xl bg-violet-600 text-white text-xs font-black flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Сдать результат на проверку
        </button>
      )}

      {task.status === 'review' && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-3">
          <div className={`text-xs font-black ${textMain}`}>Результат ожидает решения</div>
          {task.resultArtifact?.url && (
            <a href={task.resultArtifact.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
              Открыть результат <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {task.resultArtifact?.note && <p className="text-xs text-slate-500 mt-2">{task.resultArtifact.note}</p>}

          {canReview ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                rows="2"
                placeholder="Комментарий руководителя (обязателен при возврате)"
                className={`w-full p-3 rounded-xl outline-none border text-xs resize-none ${inputBg}`}
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onReturnForRework(reviewComment)} className="py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-black flex items-center justify-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> На доработку
                </button>
                <button type="button" onClick={() => onAcceptResult(reviewComment)} className="py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Принять
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 mt-3">Руководитель проверит результат. После решения история сохранится в задаче.</p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 mb-2"><History className="w-3.5 h-3.5" /> История проверки</div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {history.map((entry, idx) => (
              <div key={`${entry.at}-${idx}`} className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5 text-[11px]">
                <div className={`font-bold ${textMain}`}>
                  {entry.type === 'accepted' ? 'Результат принят' : entry.type === 'returned' ? 'Возвращено на доработку' : 'Результат отправлен на проверку'}
                </div>
                <div className="text-slate-400 mt-0.5">{entry.actorName || 'Пользователь'} · {entry.at ? new Date(entry.at).toLocaleString('ru-RU') : ''}</div>
                {entry.comment && <div className="text-slate-500 mt-1">{entry.comment}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskReviewPanel;
