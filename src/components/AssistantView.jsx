import React, { useState } from 'react';
import { User, Bot, Plus, BookOpen, Send, Image as ImageIcon, Sparkles, Download, ChevronDown, Database, Users } from 'lucide-react';
import { extractPublicationText } from '../services/aiOperatingLayer';

const quickGroups = [
  { id: 'create', title: 'Создать', hint: 'Текст или визуал', items: [['Пост','content'],['Презентацию','presentation'],['Документ','document'],['Изображение','visual']] },
  { id: 'analyze', title: 'Разобрать', hint: 'Задачи или данные', items: [['Таблицу','integrations'],['Задачи','tasks'],['Показатели','metrics'],['Бизнес-данные','business']] },
  { id: 'plan', title: 'Спланировать', hint: 'Неделю или проект', items: [['Неделю','week'],['Контент','content-plan'],['Проект','project'],['Запуск','launch']] },
];
const examples = ['Сделай презентацию для клиента','Напиши 5 постов','Проанализируй продажи','Составь план запуска'];

const AssistantView = ({
  onPublication, onOpenContent, onOpenContentPlan, onOpenIntegrations,
  cardBg, textMain, inputBg, btnPrimary, aiOptions,
  processRole, setProcessRole, processTopic, setProcessTopic, handleGenerateProcess,
  isProcessGenerating, processMessages, handleCreateTaskFromAI, handleSaveToSOP,
  followUpText, setFollowUpText, handleFollowUpProcess,
  tasks = [], sops = [], processTaskId = '', setProcessTaskId = () => {},
  processSopId = '', setProcessSopId = () => {}, handleAttachAIResult = () => {},
  orchestratorPlan = null, imagePrompt = '', setImagePrompt = () => {}, imageSize = '1024x1024',
  setImageSize = () => {}, imageQuality = 'medium', setImageQuality = () => {}, generatedImage = null,
  isImageGenerating = false, handleGenerateImage = () => {}, handleAttachImageToTask = () => {}, allowCompanyContext = false,
  onCheckTasks = () => {}
}) => {
  const [teamOpen, setTeamOpen] = useState(false);
  const [visualOpen, setVisualOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState('');

  const chooseQuick = (kind, label) => {
    if (kind === 'content') return onOpenContent?.();
    if (kind === 'content-plan') return onOpenContentPlan?.();
    if (kind === 'integrations') return onOpenIntegrations?.();
    if (kind === 'tasks') return onCheckTasks();
    if (kind === 'visual') { setVisualOpen(true); setImagePrompt(processTopic || ''); return; }
    const prompts = {
      presentation: 'Сделай презентацию для клиента: ', document: 'Подготовь документ: ', tasks: 'Проанализируй мои задачи и предложи следующие действия',
      metrics: 'Проанализируй показатели и объясни, что требует внимания', business: 'Проанализируй бизнес-данные и дай 3 практических вывода',
      week: 'Составь реалистичный план на неделю', project: 'Составь план проекта: ', launch: 'Составь план запуска: '
    };
    const roles = { presentation:'copywriter', document:'copywriter', tasks:'operations', metrics:'analyst', business:'analyst', week:'operations', project:'consultant', launch:'consultant' };
    setProcessRole(roles[kind] || 'consultant');
    setProcessTopic(prompts[kind] || label);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <section className={`p-5 md:p-6 rounded-3xl border ${cardBg}`}>
        <div className="mb-4"><h3 className={`text-xl md:text-2xl font-black ${textMain}`}>Что нужно сделать?</h3><p className="text-sm text-slate-500 mt-1">Опишите результат своими словами — Flow Space выберет подходящего помощника.</p></div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">{examples.map((item) => <button key={item} onClick={() => setProcessTopic(item)} className="shrink-0 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-xs text-slate-600 dark:text-slate-300">{item}</button>)}</div>
        <textarea value={processTopic} onChange={(e) => setProcessTopic(e.target.value)} placeholder="Например: сделай пост и визуал о новой услуге" rows="4" className={`w-full p-4 rounded-2xl outline-none border text-sm resize-none my-3 ${inputBg}`} />
        <button onClick={handleGenerateProcess} disabled={isProcessGenerating || !processTopic.trim()} className={`flex items-center justify-center gap-2 w-full min-h-[48px] rounded-2xl text-sm font-bold disabled:opacity-50 ${btnPrimary}`}><Sparkles className="w-4 h-4" />{isProcessGenerating ? 'AI готовит результат…' : 'Сделать с AI'}</button>
      </section>

      <section className={`rounded-2xl border p-3 ${cardBg}`} aria-label="Быстрые действия AI">
        <div className="grid grid-cols-3 gap-2">
          {quickGroups.map((group) => <button key={group.id} type="button" aria-expanded={quickOpen === group.id} onClick={() => setQuickOpen((open) => open === group.id ? '' : group.id)} className={`min-h-[64px] rounded-xl px-2 py-2 text-center border ${quickOpen === group.id ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10' : 'border-slate-200 dark:border-white/10'}`}><span className={`block text-xs font-black ${textMain}`}>{group.title}</span><span className="hidden sm:block mt-1 text-[10px] text-slate-400">{group.hint}</span></button>)}
        </div>
        {quickGroups.filter((group) => group.id === quickOpen).map((group) => <div key={group.id} className="mt-3 pt-3 border-t border-slate-100 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2">{group.items.map(([label,kind]) => <button key={kind} onClick={() => { chooseQuick(kind,label); setQuickOpen(''); }} className="min-h-[40px] px-3 rounded-xl text-left text-xs font-semibold bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-300">{label}</button>)}</div>)}
      </section>

      <section className={`rounded-2xl border ${cardBg}`}>
        <button onClick={() => setTeamOpen(!teamOpen)} aria-expanded={teamOpen} className="w-full min-h-[48px] px-4 flex items-center gap-3 text-left"><Users className="w-4 h-4 text-violet-500"/><span className={`flex-1 text-sm font-black ${textMain}`}>Моя AI-команда</span><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${teamOpen ? 'rotate-180' : ''}`}/></button>
        {teamOpen && <div className="px-4 pb-4"><p className="text-xs text-slate-500 mb-3">Выберите специалиста вручную, если это важно для задачи.</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{aiOptions.map(opt => <button key={opt.id} onClick={() => setProcessRole(opt.id)} className={`p-3 rounded-xl border text-left text-xs font-bold ${processRole === opt.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-slate-200 dark:border-white/10'}`}><span className="text-base mr-1">{opt.icon}</span>{opt.label}</button>)}</div></div>}
      </section>

      <details className={`rounded-2xl border ${cardBg}`}><summary className="cursor-pointer list-none min-h-[48px] px-4 flex items-center gap-3"><Database className="w-4 h-4 text-slate-400"/><span className={`text-sm font-bold ${textMain}`}>{allowCompanyContext ? 'Использовать данные компании' : 'Использовать мою задачу'}</span></summary><div className="px-4 pb-4 grid sm:grid-cols-2 gap-2"><select value={processTaskId} onChange={(e) => setProcessTaskId(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}><option value="">Без задачи</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.text}</option>)}</select>{allowCompanyContext ? <select value={processSopId} onChange={(e) => setProcessSopId(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}><option value="">Без регламента</option>{sops.map((sop) => <option key={sop.id} value={sop.id}>{sop.title}</option>)}</select> : <p className="text-xs text-slate-500 self-center">Данные компании и регламенты не используются в режиме «Моё».</p>}</div></details>

      {visualOpen && <section className={`p-5 rounded-3xl border ${cardBg}`}><div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-violet-500"/><h3 className={`font-black ${textMain}`}>Создать изображение</h3></div><textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows="3" placeholder="Опишите изображение" className={`w-full p-4 rounded-2xl outline-none border text-sm resize-none my-3 ${inputBg}`}/><div className="grid grid-cols-2 gap-2 mb-3"><select value={imageSize} onChange={(e) => setImageSize(e.target.value)} className={`p-3 rounded-xl border text-xs ${inputBg}`}><option value="1024x1024">Квадрат 1:1</option><option value="1024x1536">Вертикальный</option><option value="1536x1024">Горизонтальный</option><option value="1024x1792">Stories 9:16</option></select><select value={imageQuality} onChange={(e) => setImageQuality(e.target.value)} className={`p-3 rounded-xl border text-xs ${inputBg}`}><option value="low">Черновик</option><option value="medium">Стандарт</option><option value="high">Высокое качество</option></select></div><button onClick={handleGenerateImage} disabled={isImageGenerating || !imagePrompt.trim()} className={`w-full min-h-[46px] rounded-xl text-sm font-bold disabled:opacity-50 ${btnPrimary}`}>{isImageGenerating ? 'Создаю…' : 'Создать изображение'}</button>{generatedImage?.url && <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10"><img src={generatedImage.url} alt="Созданный AI визуал" className="w-full max-h-[560px] object-contain bg-white"/><div className="p-3 flex gap-2"><a href={generatedImage.url} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 inline-flex gap-1"><Download className="w-3.5 h-3.5"/>Открыть</a>{processTaskId && <button onClick={handleAttachImageToTask} className="text-xs font-bold px-3 py-2 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">В задачу</button>}</div></div>}</section>}

      {orchestratorPlan?.plan?.length > 0 && <details className={`rounded-2xl border p-4 ${cardBg}`}><summary className={`cursor-pointer text-sm font-black ${textMain}`}>План выполнения</summary><div className="mt-3 space-y-2">{orchestratorPlan.plan.map((step) => <div key={`${step.order}-${step.agentId}`} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5"><div className={`text-xs font-black ${textMain}`}>{step.agentLabel}</div><div className="text-xs text-slate-500 mt-1">{step.assignment}</div></div>)}</div></details>}

      {processMessages.length > 0 && <div className="space-y-3">{processMessages.map((msg, idx) => <div key={idx} className={`p-4 rounded-2xl border text-sm ${msg.role === 'user' ? 'bg-slate-100 border-slate-200 dark:bg-white/10 dark:border-white/20 ml-3' : `${cardBg} mr-3`}`}><div className="font-bold text-xs mb-2 text-slate-400 flex items-center gap-1.5">{msg.role === 'user' ? <User className="w-3 h-3"/> : <Bot className="w-3 h-3"/>}{msg.role === 'user' ? 'Ваш запрос' : 'AI подготовил результат'}</div><div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>{msg.role === 'assistant' && <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-white/10">{onPublication && <button className="text-xs font-bold px-3 py-2 rounded-xl border" onClick={() => onPublication(extractPublicationText(msg.content))}>Оформить публикацию</button>}<button onClick={() => handleCreateTaskFromAI(msg.content)} className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center gap-1"><Plus className="w-3.5 h-3.5"/>В задачу</button>{processTaskId && <button onClick={() => handleAttachAIResult(msg.content)} className="text-xs font-bold px-3 py-2 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">Сохранить результат</button>}{allowCompanyContext && <button onClick={() => handleSaveToSOP(msg.content)} className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5"/>В регламент</button>}</div>}</div>)}<div className={`p-2 pl-4 flex items-center gap-2 rounded-2xl border ${cardBg}`}><input value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFollowUpProcess()} placeholder="Уточнить результат…" className="flex-1 bg-transparent outline-none text-sm"/><button onClick={handleFollowUpProcess} disabled={isProcessGenerating || !followUpText.trim()} className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-1 ${btnPrimary}`}><Send className="w-3 h-3"/>Отправить</button></div></div>}
    </div>
  );
};
export default AssistantView;
