import React from 'react';
import { X, Mic, Sparkles, CheckCircle2, Flame, Gem, Trash2, Target, ChevronDown, Lock, Users } from 'lucide-react';
import TaskReviewPanel from './TaskReviewPanel';

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
  voicePreviewReady = false,
  voiceMessage = '',
  handleTaskAI,
  isTaskGenerating,
  newTaskDesc,
  setNewTaskDesc,
  newTaskExpectedResult,
  setNewTaskExpectedResult,
  newTaskCriteriaText,
  setNewTaskCriteriaText,
  newTaskHours,
  setNewTaskHours,
  newTaskDueDate,
  setNewTaskDueDate,
  newTaskTime = '',
  setNewTaskTime = () => {},
  newTaskRecurrence = 'none',
  setNewTaskRecurrence = () => {},
  newTaskReminder = 'none',
  setNewTaskReminder = () => {},
  taskKind = 'work',
  workspace = 'personal',
  newUrgent,
  setNewUrgent,
  newImportant,
  setNewImportant,
  isTeamMode,
  newTaskAssignee,
  setNewTaskAssignee,
  newTaskDepartmentId = '',
  setNewTaskDepartmentId = () => {},
  departments = [],
  canChooseDepartment = false,
  assistants,
  aiOptions = [],
  newTaskAiAgent = '',
  setNewTaskAiAgent = () => {},
  newTaskSopId = '',
  setNewTaskSopId = () => {},
  newTaskProjectName = '',
  setNewTaskProjectName = () => {},
  projectOptions = [],
  sops = [],
  canLinkSop = false,
  handleDeleteTask,
  cardBg,
  textMain,
  inputBg,
  btnPrimary,
  canReview = false,
  onSubmitResult,
  onAcceptResult,
  onReturnForRework
}) => {
  if (!isOpen) return null;
  const simplePersonal = workspace === 'personal' && taskKind === 'personal';
  const companyTask = workspace === 'company';
  const linkedSop = sops.find((sop) => String(sop.id) === String(newTaskSopId));

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
      <div className={`w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-4 md:p-6 border shadow-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-base font-bold ${textMain}`}>
            {selectedTask ? 'Задача' : simplePersonal ? 'Личное дело' : companyTask ? 'Задача команде' : 'Моя рабочая задача'}
          </h3>
          <button type="button" aria-label="Закрыть" onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`mb-4 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${companyTask ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
          {companyTask ? <Users className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          {companyTask ? 'Рабочая задача компании' : 'Видно только вам'}
        </div>

        {/* БЛОК БЫСТРЫХ ШАБЛОНОВ */}
        {!selectedTask && !simplePersonal && (
          <details className="mb-4 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <summary className="min-h-[44px] px-3 flex items-center justify-between cursor-pointer list-none text-sm font-semibold">
              Начать с шаблона <ChevronDown className="w-4 h-4 text-slate-400" />
            </summary>
            <div className="grid grid-cols-2 gap-2 px-3 pb-3">
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
          </details>
        )}

        <form onSubmit={handleSaveTask} className="space-y-4">
          {/* НАЗВАНИЕ */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Что нужно сделать?
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
                aria-label={isListening ? 'Остановить голосовой ввод' : 'Продиктовать задачу'}
                className={`w-12 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  isListening 
                    ? 'bg-red-500 border-red-500 text-white animate-pulse shadow-lg shadow-red-500/40' 
                    : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
            {(isListening || voiceMessage) && (
              <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-semibold ${voicePreviewReady ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300'}`}>
                {isListening ? 'Слушаю… говорите задачу естественно' : voiceMessage}
              </div>
            )}
            
            {!simplePersonal && <details className="mt-2">
              <summary className="cursor-pointer list-none min-h-[36px] inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                <Sparkles className="w-3.5 h-3.5" /> Помочь сформулировать
              </summary>
              <div className="flex gap-2 mt-1">
              <button 
                type="button" 
                onClick={() => handleTaskAI('expand')} 
                disabled={isTaskGenerating || !newTaskTitle} 
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                Уточнить задачу
              </button>
              <button 
                type="button" 
                onClick={() => handleTaskAI('decompose')} 
                disabled={isTaskGenerating || !newTaskTitle} 
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Сделать шаги
              </button>
              </div>
            </details>}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Приоритет</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={newUrgent} onClick={() => setNewUrgent(!newUrgent)} className={`min-h-[42px] rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${newUrgent ? 'bg-red-500/10 border-red-500 text-red-500' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}><Flame className="w-3.5 h-3.5" /> Срочно</button>
              <button type="button" aria-pressed={newImportant} onClick={() => setNewImportant(!newImportant)} className={`min-h-[42px] rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${newImportant ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}><Gem className="w-3.5 h-3.5" /> Важно</button>
            </div>
          </div>

          {!simplePersonal && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Проект</label>
              <input
                type="text"
                list="flow-space-project-options"
                value={newTaskProjectName}
                onChange={(event) => setNewTaskProjectName(event.target.value)}
                placeholder="Например: Запуск курса"
                className={`w-full p-3 rounded-xl outline-none border text-sm ${inputBg}`}
              />
              <datalist id="flow-space-project-options">
                {projectOptions.map((project) => <option key={project} value={project} />)}
              </datalist>
              <p className="text-[10px] text-slate-400 mt-1">Необязательно. Например, «Запуск курса» или «Новый сайт».</p>
            </div>
          )}

          {simplePersonal && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Дата</label><input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-sm ${inputBg}`} /></div>
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Время</label><input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-sm ${inputBg}`} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Повтор</label><select value={newTaskRecurrence} onChange={(e) => setNewTaskRecurrence(e.target.value)} className={`w-full p-3 rounded-xl border text-xs ${inputBg}`}><option value="none">Не повторять</option><option value="daily">Каждый день</option><option value="weekly">Каждую неделю</option><option value="monthly">Каждый месяц</option></select></div>
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Напомнить</label><select value={newTaskReminder} onChange={(e) => setNewTaskReminder(e.target.value)} className={`w-full p-3 rounded-xl border text-xs ${inputBg}`}><option value="none">Без напоминания</option><option value="at_time">В указанное время</option><option value="15m">За 15 минут</option><option value="1h">За час</option><option value="1d">За день</option></select></div>
              </div>
            </>
          )}

          {/* ОЖИДАЕМЫЙ РЕЗУЛЬТАТ / КРИТЕРИИ СДАЧИ */}
          {!simplePersonal && <>
          <div>
            <label className="block text-[10px] font-bold uppercase text-amber-500 dark:text-amber-400 mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Готовый результат
            </label>
            <input 
              type="text"
              value={newTaskExpectedResult || ''} 
              onChange={(e) => setNewTaskExpectedResult(e.target.value)} 
              placeholder="Например: Ссылка на опубликованный пост + 3 согласованных макета" 
              className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`} 
            />
          </div>

          <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Срок</label><input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-sm ${inputBg}`} /></div>

          <details className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <summary className="min-h-[48px] px-3 flex items-center justify-between cursor-pointer list-none text-sm font-semibold">
              Дополнительно <ChevronDown className="w-4 h-4 text-slate-400" />
            </summary>
            <div className="px-3 pb-3 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Время</label>
            <input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-sm ${inputBg}`} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Критерии принятия
            </label>
            <textarea
              value={newTaskCriteriaText || ''}
              onChange={(e) => setNewTaskCriteriaText(e.target.value)}
              rows="3"
              placeholder={`Каждый критерий с новой строки:
Форма отправляется
Мобильная версия проверена
Ссылка передана руководителю`}
              className={`w-full p-3 rounded-xl outline-none border text-xs resize-none ${inputBg}`}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              AI-помощник по задаче
            </label>
            <select
              value={newTaskAiAgent || ''}
              onChange={(e) => setNewTaskAiAgent(e.target.value)}
              className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}
            >
              <option value="">Без AI-помощника</option>
              {aiOptions.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.icon} {agent.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">AI помогает подготовить результат, но не принимает задачу вместо руководителя.</p>
          </div>

          {canLinkSop && sops.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Регламент для задачи</label>
              <select value={newTaskSopId} onChange={(e) => setNewTaskSopId(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}>
                <option value="">Без регламента</option>
                {sops.map((sop) => <option key={sop.id} value={sop.id}>{sop.title}</option>)}
              </select>
              {linkedSop && <details className="mt-2 rounded-xl border border-slate-200 dark:border-white/10 p-3"><summary className="cursor-pointer text-xs font-bold">Открыть инструкцию · версия {linkedSop.version || 1}</summary><div className="text-xs text-slate-500 mt-2 max-h-56 overflow-y-auto">{linkedSop.purpose && <p className="mb-2"><strong>Цель:</strong> {linkedSop.purpose}</p>}{linkedSop.ownerName && <p className="mb-2"><strong>Ответственный:</strong> {linkedSop.ownerName}</p>}<div className="whitespace-pre-wrap">{linkedSop.content}</div>{Array.isArray(linkedSop.criteria) && linkedSop.criteria.length > 0 && <div className="mt-3"><strong>Критерии:</strong><ul className="list-disc pl-5 mt-1">{linkedSop.criteria.map((item, index) => <li key={`${linkedSop.id}-task-criterion-${index}`}>{item}</li>)}</ul></div>}</div></details>}
              {selectedTask?.sopNeedsReview && String(selectedTask.sopId || '') === String(newTaskSopId) && <p className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400">Регламент обновлён до версии {linkedSop?.version || selectedTask.sopLatestVersion}. Проверьте изменения и сохраните задачу.</p>}
            </div>
          )}

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

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Оценка времени, часов</label>
            <input type="number" step="0.5" value={newTaskHours} onChange={(e) => setNewTaskHours(e.target.value)} placeholder="1.5" className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`} />
          </div>

          {isTeamMode && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Ответственный за результат
              </label>
              <select 
                value={newTaskAssignee} 
                onChange={(e) => {
                  setNewTaskAssignee(e.target.value);
                  const assignee = assistants.find((item) => item.id === e.target.value);
                  if (canChooseDepartment) setNewTaskDepartmentId(assignee?.departmentId || '');
                }}
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

          {canChooseDepartment && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Отдел задачи</label>
              <select
                aria-label="Отдел задачи"
                value={newTaskDepartmentId}
                onChange={(event) => setNewTaskDepartmentId(event.target.value)}
                className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}
              >
                <option value="">Без отдела</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Руководитель выбранного отдела увидит задачу и сможет принять результат.</p>
            </div>
          )}
            </div>
          </details>
          </>}

          {selectedTask && companyTask && onSubmitResult && (
            <details className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden" open={selectedTask.status === 'review' ? true : undefined}>
              <summary className="min-h-[48px] px-3 flex items-center justify-between cursor-pointer list-none text-sm font-semibold">
                Результат и проверка
                {selectedTask.status === 'review' && <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700">Ждёт решения</span>}
              </summary>
              <div className="px-3 pb-3">
                <TaskReviewPanel
                  task={selectedTask}
                  canReview={canReview}
                  onSubmitResult={onSubmitResult}
                  onAcceptResult={onAcceptResult}
                  onReturnForRework={onReturnForRework}
                  inputBg={inputBg}
                  textMain={textMain}
                />
              </div>
            </details>
          )}

          {selectedTask && (
            <button 
              type="button" 
              onClick={() => handleDeleteTask(selectedTask.id)} 
              className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-400 text-center flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Удалить задачу
            </button>
          )}

          <div className={`sticky bottom-0 z-10 -mx-4 px-4 py-3 border-t border-slate-200/80 dark:border-white/10 ${cardBg}`}>
            <button type="submit" className={`w-full min-h-[48px] rounded-2xl text-sm font-bold ${btnPrimary}`}>
              {selectedTask ? 'Сохранить' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
