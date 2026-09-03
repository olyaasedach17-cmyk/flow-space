// ==========================================
import React from 'react';
import { X, Mic, Sparkles, CheckCircle2, Flame, Gem, Trash2, Target } from 'lucide-react';

const TaskModal = ({
  isOpen,
  onClose,
  selectedTask,
  taskTemplates,
  handleApplyTemplate,
  handleSaveTask,
  newTaskTitle,
  setNewTaskTitle,
  toggleVoiceInput,
  isListening,
  handleTaskAI,
  isTaskGenerating,
  newTaskDesc,
  setNewTaskDesc,
  newTaskExpectedResult,
  setNewTaskExpectedResult,
  newTaskHours,
  setNewTaskHours,
  newTaskDueDate,
  setNewTaskDueDate,
  newUrgent,
  setNewUrgent,
  newImportant,
  setNewImportant,
  isTeamMode,
  newTaskAssignee,
  setNewTaskAssignee,
  assistants,
  handleDeleteTask,
  cardBg,
  textMain,
  inputBg,
  btnPrimary
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
      <div className={`w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 border shadow-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-base font-bold ${textMain}`}>
            {selectedTask ? 'Редактирование задачи' : 'Новая задача'}
          </h3>
          <button onClick={onClose} className="text-slate-400 font-bold hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* БЛОК БЫСТРЫХ ШАБЛОНОВ */}
        {!selectedTask && (
          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">
              Быстрый запуск пакета задач
            </label>
            <div className="grid grid-cols-2 gap-2">
              {taskTemplates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-400 text-left text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 bg-slate-50 dark:bg-white/5"
                >
                  <span className="text-base">{tmpl.icon}</span>
                  <span className="truncate">{tmpl.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSaveTask} className="space-y-4">
          {/* НАЗВАНИЕ */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Цель задачи
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Что нужно сделать?"
                required
                className={`flex-1 p-3.5 rounded-xl outline-none border text-sm font-medium ${inputBg}`}
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`w-12 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  isListening
                    ? 'bg-red-500 border-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                    : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleTaskAI('expand')}
                disabled={isTaskGenerating || !newTaskTitle}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Расписать ИИ
              </button>
              <button
                type="button"
                onClick={() => handleTaskAI('decompose')}
                disabled={isTaskGenerating || !newTaskTitle}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Чек-лист ИИ
              </button>
            </div>
          </div>

          {/* ОЖИДАЕМЫЙ РЕЗУЛЬТАТ / КРИТЕРИИ СДАЧИ */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-amber-500 dark:text-amber-400 mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Ожидаемый результат (Критерии готовности)
            </label>
            <input
              type="text"
              value={newTaskExpectedResult || ''}
              onChange={(e) => setNewTaskExpectedResult(e.target.value)}
              placeholder="Например: Ссылка на опубликованный пост + 3 согласованных макета"
              className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}
            />
          </div>

          {/* КОНТЕКСТ И ОПИСАНИЕ */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Контекст и вводные данные
            </label>
            <textarea
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              rows="3"
              placeholder="Ссылки на материалы, вводные, пожелания..."
              className={`w-full p-3.5 rounded-xl outline-none border text-xs resize-none ${inputBg}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Оценка (часы)
              </label>
              <input
                type="number"
                step="0.5"
                value={newTaskHours}
                onChange={(e) => setNewTaskHours(e.target.value)}
                placeholder="1.5"
                className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Дедлайн
              </label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewUrgent(!newUrgent)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${
                newUrgent ? 'bg-red-500/10 border-red-500 text-red-500' : 'border-slate-200 dark:border-white/10 text-slate-400'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Срочно
            </button>
            <button
              type="button"
              onClick={() => setNewImportant(!newImportant)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${
                newImportant ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'border-slate-200 dark:border-white/10 text-slate-400'
              }`}
            >
              <Gem className="w-3.5 h-3.5" /> Важно
            </button>
          </div>

          {isTeamMode && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Ответственный за результат
              </label>
              <select
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}
              >
                {assistants.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.position || 'Сотрудник'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className={`w-full py-3.5 rounded-2xl text-xs font-bold ${btnPrimary}`}>
            Сохранить задачу
          </button>

          {selectedTask && (
            <button
              type="button"
              onClick={() => handleDeleteTask(selectedTask.id)}
              className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-400 text-center flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Удалить задачу
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default TaskModal;


// ==========================================
