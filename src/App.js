import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

// ==========================================
// 1. СЛОВАРЬ ПЕРЕВОДОВ И КОНСТАНТЫ
// ==========================================
const translations = {
  ru: {
    loginTitle: 'Корпоративная система', signIn: 'Войти', createAccount: 'Создать аккаунт',
    board: 'Задачи', projects: 'Проекты', analytics: 'Сводка SLA', team: 'Команда', playbooksTab: 'База',
    aiProcesses: 'ИИ-Генератор', more: 'Ещё', profileTab: 'Профиль',
    taskInput: 'Название задачи...', hours: 'Оценка (часы)', createBtn: 'Создать задачу ↵',
    colTodo: 'Нужно сделать', colInProgress: 'В процессе', colReview: 'На проверке', colDeferred: 'Отложено',
    empty: 'Нет задач', logout: 'Выйти', inviteEmp: 'Пригласить сотрудника',
    urgentBtn: '🔥 Срочная задача', importantBtn: '💎 Важная задача',
    matrixView: 'Матрица', pipelineView: 'Пайплайн',
    slaIndex: 'Индекс SLA', timeSaved: 'Сэкономлено', hrs: 'час', weight: 'Вес', impact: 'Влияние',
    workload: 'Текущая загрузка', capacity: 'Capacity команды',
    sopLibrary: 'База знаний и регламенты', sopMarketing: 'Маркетинг', sopSales: 'Продажи'
  }
};

const defaultKpis = [
  { id: 1, name: 'Соблюдение сроков (SLA)', weight: 40, type: 'percent', max: 100, score: 92, desc: 'Задачи закрываются строго до дедлайна.' },
  { id: 2, name: 'Качество (без возвратов)', weight: 35, type: 'percent', max: 100, score: 88, desc: 'Задачи принимаются с первого раза.' },
  { id: 3, name: 'Инициативность', weight: 25, type: 'points5', max: 5, score: 4, desc: 'Предлагает решения, а не проблемы.' },
];

const aiOptions = [
  { id: 'copywriter', icon: '✍️', label: 'Копирайтер (Посты и тексты)' },
  { id: 'analyst', icon: '🕵️', label: 'Аналитик (ЦА, рынок, идеи)' },
  { id: 'consultant', icon: '🧠', label: 'Консультант (Стратегия)' },
  { id: 'lawyer', icon: '👔', label: 'Юрист (Регламенты, договоры)' },
  { id: 'sheets', icon: '📊', label: 'Архитектор таблиц (Структура)' }
];

// ==========================================
// 2. ВЫДЕЛЕННЫЕ КОМПОНЕНТЫ
// ==========================================
function TaskCard({ task, role, isDark, t, onMove, onDelete }) {
  const cardBase = task.urgent ? (isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50/50 border-red-100') : 
                   (isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200');
  const textMain = isDark ? 'text-slate-200' : 'text-slate-800';

  return (
    <div className={`p-5 rounded-2xl border transition-all shadow-sm ${cardBase}`}>
      <div className="flex flex-col gap-3 w-full">
        <span className={`text-sm font-semibold leading-relaxed ${textMain}`}>{task.text}</span>
        {task.description && <p className={`text-xs whitespace-pre-wrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{task.description}</p>}
        <div className="flex flex-wrap gap-2 items-center mt-1">
          {task.urgent && <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${isDark ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-red-200 text-red-700 bg-red-50'}`}>🔥 Срочно</span>}
          {task.important && <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${isDark ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>💎 Важно</span>}
          {task.estimatedHours > 0 && <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>{task.estimatedHours}h</span>}
        </div>
      </div>
      <div className={`flex flex-wrap justify-between items-center pt-4 border-t mt-3 gap-2 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
        <div className="flex gap-2 w-full md:w-auto">
          {task.status === 'todo' && <button onClick={() => onMove(task.id, 'in_progress')} className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-blue-500 text-white hover:bg-blue-600">В работу</button>}
          {task.status === 'in_progress' && (
            <><button onClick={() => onMove(task.id, 'review')} className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-amber-500 text-white hover:bg-amber-600">На проверку</button>
            <button onClick={() => onMove(task.id, 'deferred')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${isDark ? 'text-slate-400 border-white/10' : 'text-slate-500 border-slate-200'}`}>Отложить</button></>
          )}
          {task.status === 'review' && role === 'manager' && (
            <><button onClick={() => onMove(task.id, 'done')} className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-emerald-500 text-white hover:bg-emerald-600">Принять</button>
            <button onClick={() => onMove(task.id, 'in_progress')} className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-red-500 text-white hover:bg-red-600">Вернуть</button></>
          )}
          {task.status === 'deferred' && <button onClick={() => onMove(task.id, 'todo')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}>Вернуть</button>}
        </div>
        <button onClick={() => onDelete(task)} className={`text-xs p-1.5 rounded-md ${isDark ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}>🗑</button>
      </div>
    </div>
  );
}

function TaskColumn({ title, colorClass, tasks, role, isDark, t, onMove, onDelete, onShowOnboarding }) {
  return (
    <div className={`flex flex-col`}>
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
        <h3 className={`font-bold text-sm uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{title} <span className="text-slate-500 font-normal ml-1">{tasks.length}</span></h3>
      </div>
      <div className="space-y-3 grow">
        {tasks.length === 0 ? (
          <div className={`text-center py-8 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3 ${isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
            <p className="text-xs font-medium">{t('empty')}</p>
            {title === t('colTodo') && (
              <button onClick={onShowOnboarding} className="px-4 py-2 mt-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-xl text-xs font-bold hover:scale-105 transition-transform">
                ✨ Настроить ИИ
              </button>
            )}
          </div>
        ) : (
          tasks.map(task => <TaskCard key={task.id} task={task} role={role} isDark={isDark} t={t} onMove={onMove} onDelete={onDelete} />)
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. ОСНОВНОЕ ПРИЛОЖЕНИЕ
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  
  const [role, setRole] = useState(null); 
  const [docData, setDocData] = useState(null);
  const [currentAssistantId, setCurrentAssistantId] = useState(null);
  
  const [activeTab, setActiveTab] = useState('matrix');
  const [viewMode, setViewMode] = useState('pipeline'); 
  
  const [isDark, setIsDark] = useState(() => localStorage.getItem('flowspace_theme') === 'dark');
  const t = (key) => translations['ru'][key] || key;
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(false); 
  const [isTaskGenerating, setIsTaskGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Состояния для Пульта управления (Команда)
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('worker');

  // Состояния ИИ-Агента
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  const [processRole, setProcessRole] = useState('copywriter');
  const [processTopic, setProcessTopic] = useState('');
  const [processResult, setProcessResult] = useState('');
  const [isProcessGenerating, setIsProcessGenerating] = useState(false);
  const [isProcessDropdownOpen, setIsProcessDropdownOpen] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardNiche, setOnboardNiche] = useState('');
  const [onboardTeam, setOnboardTeam] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  const [teamReport, setTeamReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const niches = ['👗 Одежда', '💅 Бьюти', '☕️ Кофейня', '💻 IT / Дизайн', '📝 Инфобизнес'];
  const teams = ['👤 Я один', '👥 2-5 человек', '🏢 Больше 5 человек'];

  useEffect(() => { 
    localStorage.setItem('flowspace_theme', isDark ? 'dark' : 'light');
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setRole('manager'); setDocData(docSnap.data());
        if (!currentAssistantId) setCurrentAssistantId('manager');
      } else {
        setDoc(docRef, { email: user.email.toLowerCase(), assistants: [{ id: 'manager', name: '👑' }], workspaces: { 'manager': { tasks: [], archive: [], kpis: defaultKpis, savedTime: 0 } } });
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isLogin) await signInWithEmailAndPassword(auth, email, password);
    else await createUserWithEmailAndPassword(auth, email, password);
  };

  const currentWorkspace = docData?.workspaces?.[currentAssistantId] || {};
  const tasks = currentWorkspace.tasks || [];
  const archive = currentWorkspace.archive || [];
  const kpis = currentWorkspace.kpis || defaultKpis;
  const savedTime = currentWorkspace.savedTime || 0;
  const assistants = docData?.assistants || [];
  
  const totalEfficiency = kpis.reduce((sum, kpi) => sum + ((kpi.score / kpi.max) * kpi.weight), 0).toFixed(1);
  const totalPendingHours = tasks.filter(t => t.status !== 'done').reduce((acc, task) => acc + (parseFloat(task.estimatedHours) || 0), 0);
  const capacityPercent = Math.min((totalPendingHours / 40) * 100, 100);

  const todoTasks = tasks.filter(t => t.status === 'todo' || t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const deferredTasks = tasks.filter(t => t.status === 'deferred');
  const activeTasks = tasks.filter(t => t.status !== 'deferred' && t.status !== 'done');

  const updateWorkspace = (newData) => setDoc(doc(db, 'users', user.uid), { workspaces: { ...docData.workspaces, [currentAssistantId]: { ...currentWorkspace, ...newData } } }, { merge: true });

  // ⚠️ СЮДА ВСТАВЛЯЙ СВОЙ НОВЫЙ КЛЮЧ ОТ PROXYAPI
  const apiKey = "sk-PtBuea8zR4gRtdYury5w1GOX3gKIpD4m"; 

  // ==========================================
  // 🤖 АВТОНОМНЫЙ ИИ-АГЕНТ (СОРТИРОВЩИК)
  // ==========================================
  const handleRunAIAgent = async () => {
    if (apiKey === "ВСТАВЬ_СЮДА_СВОЙ_НОВЫЙ_КЛЮЧ") return alert('Вставьте ключ API!');
    
    // Ищем задачи в бэклоге, у которых нет описания или оценки времени
    const tasksToProcess = tasks.filter(t => t.status === 'todo' && (!t.description || parseFloat(t.estimatedHours) === 0));
    
    if (tasksToProcess.length === 0) {
      return alert("🤖 ИИ-Агент проверил доску: Все задачи в бэклоге уже оформлены и оценены. Я пока отдыхаю!");
    }

    setIsAgentRunning(true);
    
    // Берем первую сырую задачу для обработки
    const targetTask = tasksToProcess[0];

    try {
      const systemPrompt = `Ты — автономный ИИ-Агент менеджер проектов. 
      Пользователь набросал сырую задачу: "${targetTask.text}".
      Твоя цель: оценить её и расписать.
      
      ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
      {
        "description": "Краткий пошаговый план (3-4 пункта)",
        "estimatedHours": 1.5,
        "urgent": true или false,
        "important": true или false
      }`;

      const response = await fetch('https://api.proxyapi.ru/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }], temperature: 0.3 })
      });

      const data = await response.json();
      if (data.choices) {
        let rawContent = data.choices[0].message.content.trim();
        if (rawContent.startsWith('```json')) rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiResult = JSON.parse(rawContent);

        // Обновляем задачу магией ИИ
        updateWorkspace({ 
          tasks: tasks.map(t => String(t.id) === String(targetTask.id) ? {
            ...t,
            description: aiResult.description || t.description,
            estimatedHours: aiResult.estimatedHours || 1,
            urgent: aiResult.urgent,
            important: aiResult.important
          } : t)
        });
        
        alert(`🤖 ИИ-Агент успешно обработал задачу: "${targetTask.text}"!`);
      }
    } catch (error) {
      alert('Ошибка агента: ' + error.message);
    } finally {
      setIsAgentRunning(false);
    }
  };

  // ==========================================
  // ПРИГЛАШЕНИЕ В КОМАНДУ (ПУЛЬТ УПРАВЛЕНИЯ)
  // ==========================================
  const handleInviteColleague = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newAssistantId = `emp_${Date.now()}`;
    const newAssistantName = inviteEmail.split('@')[0];

    // Добавляем сотрудника в общий список (визуально)
    await setDoc(doc(db, 'users', user.uid), {
      assistants: [...assistants, { id: newAssistantId, name: newAssistantName, email: inviteEmail, role: inviteRole }],
      workspaces: {
        ...docData.workspaces,
        [newAssistantId]: { tasks: [], archive: [], kpis: defaultKpis, savedTime: 0 }
      }
    }, { merge: true });

    setIsInviteOpen(false);
    setInviteEmail('');
    alert(`Доступ PRO: Сотрудник ${inviteEmail} успешно добавлен в систему!`);
  };
  
  const handleGenerateTeamReport = async () => {
    if (apiKey === "ВСТАВЬ_СЮДА_СВОЙ_НОВЫЙ_КЛЮЧ") return alert('Вставьте ключ API!');
    setIsGeneratingReport(true);
    try {
      const systemPrompt = `Ты — операционный директор (COO). Проанализируй данные:
      SLA: ${totalEfficiency}%. Бэклог: ${todoTasks.length}. В работе: ${inProgressTasks.length}. На проверке: ${reviewTasks.length}. Загрузка: ${totalPendingHours}ч.
      Напиши краткий отчет в 3 абзаца (эмодзи): 1. Оценка. 2. Риски. 3. Совет руководителю.`;
      const response = await fetch('[https://api.proxyapi.ru/openai/v1/chat/completions](https://api.proxyapi.ru/openai/v1/chat/completions)', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }], temperature: 0.6 }) });
      const data = await response.json();
      if (data.choices) setTeamReport(data.choices[0].message.content.trim());
    } catch (error) {} finally { setIsGeneratingReport(false); }
  };
  
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Ваш браузер не поддерживает голосовой ввод 😢");
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU'; recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => setNewTaskTitle(prev => prev ? prev + ' ' + event.results[0][0].transcript : event.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleTaskAI = async (mode) => {
    if (!newTaskTitle.trim()) return alert('Сначала напишите короткую суть задачи!');
    if (apiKey === "ВСТАВЬ_СЮДА_СВОЙ_НОВЫЙ_КЛЮЧ") return alert('Не забудьте вставить свой ключ API в код!');
    setIsTaskGenerating(true);
    try {
      let systemPrompt = mode === 'expand' ? 'Пользователь написал идею. Преврати её в структурированную задачу.' : 'Разбей задачу на пошаговый чек-лист. Используй маркдаун списки.';
      const response = await fetch('[https://api.proxyapi.ru/openai/v1/chat/completions](https://api.proxyapi.ru/openai/v1/chat/completions)', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: newTaskTitle }], temperature: 0.5 }) });
      const data = await response.json();
      if (data.choices) setNewTaskDesc(data.choices[0].message.content.trim());
    } catch (error) {} finally { setIsTaskGenerating(false); }
  };

  const handleGenerateProcess = async () => {
    if (!processTopic.trim()) return alert('Опишите, что вам нужно сгенерировать.');
    if (apiKey === "ВСТАВЬ_СЮДА_СВОЙ_НОВЫЙ_КЛЮЧ") return alert('Вставьте ключ!');
    setIsProcessGenerating(true);
    try {
      let systemPrompt = '';
      switch (processRole) {
        case 'consultant': systemPrompt = 'Ты топовый бизнес-консультант. Дай стратегический совет.'; break;
        case 'copywriter': systemPrompt = 'Ты коммерческий писатель. Пиши живо, вовлекающе.'; break;
        case 'lawyer': systemPrompt = 'Ты корпоративный юрист. Составь документ.'; break;
        case 'analyst': systemPrompt = 'Ты эксперт по маркетингу. Сделай анализ рынка.'; break;
        case 'sheets': systemPrompt = 'Ты эксперт по таблицам. Спроектируй структуру.'; break;
        default: systemPrompt = 'Выдай подробный ответ.';
      }
      const response = await fetch('[https://api.proxyapi.ru/openai/v1/chat/completions](https://api.proxyapi.ru/openai/v1/chat/completions)', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: processTopic }], temperature: 0.7 }) });
      const data = await response.json();
      if (data.choices) setProcessResult(data.choices[0].message.content.trim());
    } catch (error) {} finally { setIsProcessGenerating(false); }
  };

  const handleStartTutorial = () => {
    if (!onboardNiche || !onboardTeam) return alert('Выберите нишу и команду!');
    setShowOnboarding(false); setTutorialStep(1); setShowTutorial(true);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    updateWorkspace({ tasks: [{ id: Date.now(), text: newTaskTitle, description: newTaskDesc, status: 'todo', estimatedHours: parseFloat(newTaskHours) || 0, urgent: newUrgent, important: newImportant }, ...tasks] });
    setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskHours(''); setNewUrgent(false); setNewImportant(false); setIsCreateOpen(false); 
  };

  const handleMoveTask = (id, newStatus) => {
    const task = tasks.find(t => String(t.id) === String(id));
    if (!task) return;
    if (newStatus === 'done') { updateWorkspace({ archive: [{ ...task, status: 'done' }, ...archive], tasks: tasks.filter(t => String(t.id) !== String(id)) }); return; }
    updateWorkspace({ tasks: tasks.map(t => String(t.id) === String(id) ? { ...t, status: newStatus } : t) });
  };
  const handleDelete = (task) => updateWorkspace({ tasks: tasks.filter(t => String(t.id) !== String(task.id)) });
  const handleScoreChange = (id, newScore) => updateWorkspace({ kpis: kpis.map(k => String(k.id) === String(id) ? { ...k, score: Number(newScore) } : k) });

  const themeBg = isDark ? 'bg-[#0E1116] text-slate-200' : 'bg-[#F8FAFC] text-slate-800';
  const cardBg = isDark ? 'bg-[#161B22] border border-white/5 shadow-2xl' : 'bg-white border border-slate-200/60 shadow-sm';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-[#0E1116] border border-white/10 text-white focus:border-indigo-500' : 'bg-white border border-slate-200 text-slate-900 focus:border-indigo-500';
  const btnPrimary = isDark ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800';

  if (!user || !docData || !currentAssistantId) return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${themeBg}`}>
      <div className={`p-8 rounded-3xl max-w-md w-full ${cardBg}`}>
        <h1 className={`text-2xl font-black text-center mb-8 ${textMain}`}>Flow Space</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={`w-full px-4 py-3.5 rounded-xl outline-none ${inputBg}`} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className={`w-full px-4 py-3.5 rounded-xl outline-none ${inputBg}`} />
          <button type="submit" className={`w-full font-bold py-4 rounded-xl ${btnPrimary}`}>{isLogin ? t('signIn') : t('createAccount')}</button>
        </form>
      </div>
    </div>
  );

  const NavigationItem = ({ id, icon, label, isDesktopOnly = false }) => (
    <button onClick={() => { setActiveTab(id); setIsMoreMenuOpen(false); }} className={`${isDesktopOnly ? 'hidden md:flex' : 'flex'} flex-col md:flex-row items-center md:items-start gap-1 md:gap-3 md:w-full w-16 transition-colors md:px-4 md:py-3 md:rounded-xl ${activeTab === id ? (isDark ? 'text-white md:bg-white/10' : 'text-slate-900 md:bg-slate-100') : 'text-slate-400 hover:text-slate-500 md:hover:bg-slate-50 dark:md:hover:bg-white/5'}`}>
      <span className="text-xl md:text-lg">{icon}</span>
      <span className="text-[10px] md:text-sm font-bold">{label}</span>
    </button>
  );

  return (
    <div className={`min-h-screen font-sans pb-24 md:pb-8 md:pl-64 transition-colors duration-300 ${themeBg}`}>
      {/* МЕНЮ СЛЕВА */}
      <nav className={`fixed z-40 transition-colors bottom-0 w-full border-t flex justify-around items-center px-2 py-3 backdrop-blur-lg md:bottom-auto md:top-0 md:left-0 md:w-64 md:h-screen md:border-t-0 md:border-r md:flex-col md:justify-start md:py-6 md:px-4 md:gap-2 ${isDark ? 'bg-[#0E1116]/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
        <div className="hidden md:flex items-center gap-3 mb-8 px-4 w-full">
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}><span className="font-black text-sm">FS</span></div>
           <h1 className={`text-lg font-black tracking-tight ${textMain}`}>Flow Space</h1>
        </div>
        <NavigationItem id="matrix" icon="📝" label={t('board')} />
        <div className="w-16 md:w-full flex justify-center md:justify-start relative -top-6 md:top-0 md:my-2 md:px-4">
          <button onClick={() => setIsCreateOpen(true)} className="w-14 h-14 md:w-full md:h-12 md:rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center gap-2 text-3xl md:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-transform active:scale-95">
            <span className="md:hidden">+</span><span className="hidden md:block">Создать задачу</span>
          </button>
        </div>
        <NavigationItem id="processes" icon="✨" label={t('aiProcesses')} />
        <NavigationItem id="projects" icon="📁" label={t('projects')} isDesktopOnly={true} />
        <NavigationItem id="kpi" icon="📈" label={t('analytics')} />
        <NavigationItem id="team" icon="👥" label={t('team')} isDesktopOnly={true} />
        <button onClick={() => setShowOnboarding(true)} className="hidden md:flex items-center gap-3 w-full px-4 py-3 rounded-xl text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
          <span className="text-lg">⚙️</span><span className="text-sm font-bold">ИИ-Настройка</span>
        </button>
        <button onClick={() => setIsMoreMenuOpen(true)} className={`md:hidden flex flex-col items-center gap-1 w-16 transition-colors text-slate-400`}><span className="text-xl">☰</span><span className="text-[10px] font-bold">{t('more')}</span></button>
        <div className="hidden md:block mt-auto w-full pt-4 border-t border-slate-200 dark:border-white/10">
          <button onClick={() => signOut(auth)} className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-slate-400 hover:text-red-500 transition-colors"><span>🚪</span>Выйти</button>
        </div>
      </nav>

      {/* МОБИЛЬНОЕ МЕНЮ ЕЩЕ */}
      {isMoreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end animate-in fade-in" onClick={() => setIsMoreMenuOpen(false)}>
          <div className={`w-full rounded-t-3xl p-6 pb-12 space-y-2 ${cardBg}`} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
            <h3 className={`font-bold text-lg mb-4 px-2 ${textMain}`}>Меню</h3>
            <button onClick={() => {setShowOnboarding(true); setIsMoreMenuOpen(false);}} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-50 dark:bg-orange-500/10 font-bold text-orange-600 dark:text-orange-400">✨ ИИ-Настройка</button>
            <button onClick={() => {setActiveTab('team'); setIsMoreMenuOpen(false);}} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 font-bold text-slate-700 dark:text-slate-200">👥 Команда и Обязанности</button>
            <button onClick={() => signOut(auth)} className="w-full flex items-center gap-4 p-4 rounded-2xl mt-4 text-red-500 font-bold">🚪 Выйти из аккаунта</button>
          </div>
        </div>
      )}

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <header className="flex justify-between items-center mt-2 mb-6">
          <div className="flex items-center gap-3 md:hidden">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}><span className="font-black text-xl">FS</span></div>
          </div>
          <div className="hidden md:block"><h2 className={`text-2xl font-black tracking-tight ${textMain}`}>Рабочее пространство</h2></div>
          <div className="flex items-center gap-4 ml-auto">
            {role === 'manager' && (
              <div className={`flex items-center rounded-xl p-1 border ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
                <select value={currentAssistantId} onChange={(e) => setCurrentAssistantId(e.target.value)} className={`pl-3 pr-8 py-1.5 bg-transparent font-semibold text-sm outline-none cursor-pointer ${textMain}`}>
                  {assistants.map(a => <option key={String(a.id)} value={String(a.id)} className={isDark ? 'text-slate-900' : ''}>{a.id === 'manager' ? `👑 Вы` : a.name}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => setIsDark(!isDark)} className="text-2xl">{isDark ? '☀️' : '🌙'}</button>
          </div>
        </header>

        {activeTab === 'matrix' && (
          <div className="space-y-6 animate-in fade-in">
            {/* 🤖 ПАНЕЛЬ УПРАВЛЕНИЯ АГЕНТОМ */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${isDark ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50/50 border-indigo-100'}`}>
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${textMain}`}>🤖 ИИ-Агент Менеджер</h3>
                <p className={`text-xs mt-1 ${textMuted}`}>Агент сам найдет пустые задачи в колонке "Нужно сделать", распишет их и поставит оценку.</p>
              </div>
              <button onClick={handleRunAIAgent} disabled={isAgentRunning} className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md ${isAgentRunning ? 'bg-indigo-400 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5'}`}>
                {isAgentRunning ? 'Агент работает...' : 'Запустить Агента ✨'}
              </button>
            </div>

            {viewMode === 'pipeline' ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <TaskColumn title={t('colTodo')} colorClass="bg-slate-400" tasks={todoTasks} role={role} isDark={isDark} t={t} onMove={handleMoveTask} onDelete={handleDelete} onShowOnboarding={() => setShowOnboarding(true)} />
                <TaskColumn title={t('colInProgress')} colorClass="bg-blue-500" tasks={inProgressTasks} role={role} isDark={isDark} t={t} onMove={handleMoveTask} onDelete={handleDelete} />
                <TaskColumn title={t('colReview')} colorClass="bg-amber-500" tasks={reviewTasks} role={role} isDark={isDark} t={t} onMove={handleMoveTask} onDelete={handleDelete} />
                <TaskColumn title={t('colDeferred')} colorClass="bg-slate-600" tasks={deferredTasks} role={role} isDark={isDark} t={t} onMove={handleMoveTask} onDelete={handleDelete} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TaskColumn title={t('critical')} colorClass="bg-red-500" tasks={activeTasks.filter(t => t.urgent && t.important)} role={role} isDark={isDark} t={t} onMove={handleMoveTask} onDelete={handleDelete} />
                <TaskColumn title={t('strategy')} colorClass="bg-blue-500" tasks={activeTasks.filter(t => !t.urgent && t.important)} role={role} isDark={isDark} t={t} onMove={handleMoveTask} onDelete={handleDelete} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'processes' && (
          <div className="space-y-6 animate-in fade-in max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-5xl mb-4 block">✨</span><h2 className={`text-3xl font-black mb-3 ${textMain}`}>ИИ-Генератор</h2><p className={`text-sm ${textMuted}`}>Выберите помощника, опишите задачу и получите готовый результат.</p>
            </div>
            <div className={`p-6 md:p-8 rounded-[24px] border shadow-sm ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">1. Кто вам нужен?</label>
              <div className="relative mb-6">
                <button type="button" onClick={() => setIsProcessDropdownOpen(!isProcessDropdownOpen)} className={`w-full px-4 py-4 text-base font-semibold rounded-xl outline-none text-left flex justify-between items-center transition-all border-2 ${isDark ? 'bg-[#0E1116] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                  <span><span className="mr-3 text-lg">{aiOptions.find(opt => opt.id === processRole)?.icon}</span>{aiOptions.find(opt => opt.id === processRole)?.label}</span><span className={`text-slate-400 transition-transform ${isProcessDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {isProcessDropdownOpen && (
                  <><div className="fixed inset-0 z-40" onClick={() => setIsProcessDropdownOpen(false)}></div><div className={`absolute z-50 w-full mt-2 py-2 rounded-xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 ${isDark ? 'bg-[#1C2128] border-white/10' : 'bg-white border-slate-100'}`}>{aiOptions.map(opt => (<button key={opt.id} type="button" onClick={() => { setProcessRole(opt.id); setIsProcessDropdownOpen(false); }} className={`w-full text-left px-4 py-4 text-sm font-medium transition-colors ${processRole === opt.id ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50')}`}><span className="mr-3 text-lg">{opt.icon}</span> {opt.label}</button>))}</div></>
                )}
              </div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">2. Что нужно сделать?</label>
              <textarea value={processTopic} onChange={(e) => setProcessTopic(e.target.value)} placeholder="Например: Проанализируй рынок..." rows="4" className={`w-full px-5 py-4 mb-6 rounded-xl outline-none transition-all resize-none border-2 text-base ${inputBg}`} />
              <button type="button" onClick={handleGenerateProcess} disabled={isProcessGenerating || !processTopic} className={`w-full py-4 text-base font-bold text-white rounded-xl transition-all shadow-lg ${isProcessGenerating ? 'bg-indigo-400 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}>{isProcessGenerating ? '⏳ Нейросеть думает...' : 'Создать магию ✨'}</button>
            </div>
            {processResult && (
              <div className={`p-6 md:p-8 rounded-[24px] border shadow-sm animate-in fade-in slide-in-from-bottom-4 ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-6"><h3 className={`text-lg font-bold ${textMain}`}>Результат:</h3><button onClick={() => navigator.clipboard.writeText(processResult)} className="text-sm font-bold text-indigo-500 hover:text-indigo-600 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">Скопировать</button></div>
                <div className={`whitespace-pre-wrap text-sm leading-relaxed ${textMain}`}>{processResult}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'kpi' && (
          <div className="space-y-8 animate-in fade-in max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-5xl mb-4 block">📈</span>
              <h2 className={`text-3xl font-black mb-3 ${textMain}`}>Аналитика и SLA</h2>
              <p className={`text-sm ${textMuted}`}>Контролируйте эффективность работы вашей команды в реальном времени.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-8 rounded-[24px] shadow-sm border relative overflow-hidden flex flex-col justify-between ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-6"><p className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>{t('slaIndex')}</p></div>
                <div><h2 className={`text-6xl font-black tracking-tighter ${textMain}`}>{totalEfficiency}%</h2></div>
              </div>
              <div className={`p-8 rounded-[24px] shadow-sm border relative overflow-hidden flex flex-col justify-between ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-6"><p className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>{t('timeSaved')}</p></div>
                <div><h2 className={`text-6xl font-black tracking-tighter ${textMain}`}>{savedTime.toFixed(1)} <span className="text-3xl font-medium opacity-50 tracking-normal">{t('hrs')}</span></h2></div>
              </div>
            </div>

            <div className={`p-6 md:p-8 rounded-[24px] border shadow-sm ${isDark ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50/50 border-indigo-100'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${textMain}`}><span>✨</span> ИИ-Сводка для руководителя</h3>
                  <p className={`text-sm mt-1 ${textMuted}`}>Нейросеть проанализирует доску и найдет слабые места.</p>
                </div>
                <button onClick={handleGenerateTeamReport} disabled={isGeneratingReport} className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${isGeneratingReport ? 'bg-indigo-400 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5'}`}>
                  {isGeneratingReport ? 'Анализирую данные...' : 'Сгенерировать отчет'}
                </button>
              </div>
              {teamReport && (
                <div className={`p-6 rounded-2xl border bg-white/50 dark:bg-[#0E1116]/50 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <div className={`whitespace-pre-wrap text-sm leading-relaxed ${textMain}`}>{teamReport}</div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {kpis.map((kpi) => (
                <div key={kpi.id} className={`p-6 md:p-8 rounded-[24px] border flex flex-col md:flex-row gap-6 md:items-center justify-between ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2"><h3 className={`text-base font-bold ${textMain}`}>{kpi.name}</h3><span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg border ${isDark ? 'border-white/10 text-slate-400 bg-white/5' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>{t('weight')}: {kpi.weight}%</span></div>
                    <p className={`text-sm ${textMuted}`}>{kpi.desc}</p>
                  </div>
                  <div className="w-full md:w-72">
                    <div className="flex justify-between items-end mb-3"><span className={`text-2xl font-black ${textMain}`}>{kpi.score} <span className="text-base opacity-50 font-semibold">/ {kpi.max}</span></span></div>
                    <input type="range" min="0" max={kpi.max} value={kpi.score} onChange={(e) => role === 'manager' && handleScoreChange(kpi.id, e.target.value)} disabled={role !== 'manager'} className="w-full accent-indigo-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🚀 ПУЛЬТ УПРАВЛЕНИЯ КОМАНДОЙ (ИМИТАЦИЯ PRO) */}
        {activeTab === 'team' && (
          <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${textMain}`}>
                Пульт Управления 
                <span className="px-2 py-0.5 rounded border border-amber-500/30 text-amber-500 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest">PRO</span>
              </h2>
              <button onClick={() => setIsInviteOpen(true)} className={`px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5 ${btnPrimary}`}>
                + Пригласить коллегу
              </button>
            </div>
            
            {assistants.map(ast => (
              <div key={ast.id} className={`p-6 rounded-[24px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${ast.id === 'manager' ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                    {ast.id === 'manager' ? '👑' : ast.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${textMain}`}>
                      {ast.name} 
                      {ast.id === 'manager' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">Владелец</span>}
                    </h3>
                    <p className={`text-xs ${textMuted}`}>{ast.email || 'Полный доступ'}</p>
                  </div>
                </div>
                {ast.id !== 'manager' && (
                  <button className="text-xs font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">Отозвать доступ</button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in">
            <span className="text-7xl mb-6">📁</span><h2 className={`text-3xl font-black mb-4 ${textMain}`}>Проекты и Группировка</h2><p className={`text-base max-w-md leading-relaxed ${textMuted}`}>Здесь вы сможете объединять задачи.</p><button onClick={() => setActiveTab('matrix')} className="mt-8 px-8 py-4 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold rounded-xl hover:scale-105 transition-transform">Вернуться к задачам</button>
          </div>
        )}
      </div>

      {/* --- ШТОРКА СОЗДАНИЯ ЗАДАЧИ --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-end md:justify-end md:items-stretch bg-black/40 backdrop-blur-sm p-0 animate-in fade-in">
          <div className={`w-full md:w-[450px] md:h-full md:rounded-none md:rounded-l-3xl rounded-t-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto transition-transform ${isDark ? 'bg-[#161B22] border-l border-white/10' : 'bg-white border-l border-slate-200'}`}>
            <div className="flex justify-between items-center mb-6"><h2 className={`text-xl font-bold ${textMain}`}>Новая задача</h2><button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button></div>
            <form onSubmit={handleAddTask} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Суть задачи</label>
                <div className="relative">
                  <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Что нужно сделать?" required className={`w-full pl-4 pr-12 py-3.5 rounded-xl outline-none font-semibold transition-all border-2 text-base ${inputBg}`} autoFocus />
                  <button type="button" onClick={startVoiceInput} className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg transition-all ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`} title="Диктовать голосом"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg></button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => handleTaskAI('expand')} disabled={isTaskGenerating} className="flex-1 py-2.5 px-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-lg text-[11px] font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50">✨ Расписать подробно</button>
                  <button type="button" onClick={() => handleTaskAI('decompose')} disabled={isTaskGenerating} className="flex-1 py-2.5 px-2 bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-colors disabled:opacity-50">📝 Разбить на шаги</button>
                </div>
              </div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Описание / Результат</label><textarea value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} placeholder={isTaskGenerating ? "ИИ генерирует текст..." : "Подробности, шаги или чек-лист..."} rows="6" className={`w-full px-4 py-3.5 rounded-xl outline-none transition-all resize-none border-2 text-sm ${inputBg} ${isTaskGenerating ? 'opacity-50 animate-pulse' : ''}`} /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Оценка (часы)</label><input type="number" step="0.1" value={newTaskHours} onChange={(e) => setNewTaskHours(e.target.value)} placeholder={t('hours')} className={`w-full px-4 py-3.5 rounded-xl outline-none transition-all border-2 ${inputBg}`} /></div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setNewUrgent(!newUrgent)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border-2 ${newUrgent ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20' : (isDark ? 'bg-transparent border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}`}>🔥 Срочно</button>
                <button type="button" onClick={() => setNewImportant(!newImportant)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border-2 ${newImportant ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20' : (isDark ? 'bg-transparent border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}`}>💎 Важно</button>
              </div>
              <button type="submit" className={`w-full mt-2 py-4 font-bold rounded-xl transition-all shadow-lg ${btnPrimary}`}>Создать задачу ↵</button>
            </form>
          </div>
        </div>
      )}

      {/* --- МОДАЛКА ПРИГЛАШЕНИЯ СОТРУДНИКА --- */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setIsInviteOpen(false)}>
          <div className={`w-full max-w-sm p-8 rounded-[32px] border shadow-2xl ${isDark ? 'bg-[#1C2128] border-white/10' : 'bg-white border-slate-100'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${textMain}`}>Новый сотрудник</h2>
              <button onClick={() => setIsInviteOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>
            <form onSubmit={handleInviteColleague} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Email сотрудника</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="hello@company.com" required className={`w-full px-4 py-3.5 rounded-xl outline-none font-medium transition-all border-2 text-sm ${inputBg}`} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Роль</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={`w-full px-4 py-3.5 rounded-xl outline-none font-medium transition-all border-2 text-sm appearance-none cursor-pointer ${inputBg}`}>
                  <option value="worker">👤 Исполнитель (Только свои задачи)</option>
                  <option value="manager">👑 Руководитель (Полный доступ)</option>
                </select>
              </div>
              <button type="submit" className="w-full mt-4 py-4 rounded-xl font-bold text-white transition-all shadow-lg bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5">
                Отправить приглашение
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ОНБОРДИНГ И СЛАЙДЕРЫ */}
      {showOnboarding && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowOnboarding(false)}><div className={`w-full max-w-lg p-8 md:p-10 rounded-[32px] border transition-all ${isDark ? 'bg-[#1C2128] border-white/10 shadow-2xl' : 'bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)]'}`} onClick={e => e.stopPropagation()}><div className="w-16 h-16 mb-6 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 text-3xl">✨</div><h2 className={`text-3xl font-bold tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Настройка пространства</h2><div className="mb-6"><label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Ваша ниша</label><div className="flex flex-wrap gap-2">{niches.map(niche => (<button key={niche} onClick={() => setOnboardNiche(niche)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${onboardNiche === niche ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : (isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600 hover:border-slate-300')}`}>{niche}</button>))}</div></div><div className="mb-10"><label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Размер команды</label><div className="flex flex-wrap gap-2">{teams.map(team => (<button key={team} onClick={() => setOnboardTeam(team)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${onboardTeam === team ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : (isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600 hover:border-slate-300')}`}>{team}</button>))}</div></div><div className="flex gap-3"><button onClick={() => setShowOnboarding(false)} className={`px-6 py-4 rounded-2xl font-bold transition-colors ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Пропустить</button><button onClick={handleStartTutorial} className="flex-1 py-4 rounded-2xl font-bold text-white transition-all shadow-lg bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5">Продолжить 🚀</button></div></div></div>)}
      {showTutorial && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in zoom-in-95" onClick={() => setShowTutorial(false)}><div className={`w-full max-w-lg p-8 md:p-10 rounded-[32px] border transition-all text-center ${isDark ? 'bg-[#1C2128] border-white/10 shadow-2xl' : 'bg-white border-slate-100 shadow-[0_20px_50px_rgb(0,0,0,0.15)]'}`} onClick={e => e.stopPropagation()}>{tutorialStep === 1 && (<div className="animate-in fade-in slide-in-from-right-4"><div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-600 text-4xl shadow-sm">📝</div><h2 className={`text-2xl font-black tracking-tight mb-4 ${textMain}`}>Умные задачи</h2><p className={`text-base leading-relaxed mb-10 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Вся работа происходит на главной доске. Нажмите <b>«Создать задачу»</b>, напишите суть, и ИИ сам разобьет её на чек-лист!</p></div>)}{tutorialStep === 2 && (<div className="animate-in fade-in slide-in-from-right-4"><div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-purple-100 flex items-center justify-center text-purple-600 text-4xl shadow-sm">✨</div><h2 className={`text-2xl font-black tracking-tight mb-4 ${textMain}`}>ИИ-Генератор</h2><p className={`text-base leading-relaxed mb-10 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Нужен длинный пост, анализ рынка или договор? Откройте вкладку <b>«ИИ-Генератор»</b> слева. Там живут умные ассистенты.</p></div>)}{tutorialStep === 3 && (<div className="animate-in fade-in slide-in-from-right-4"><div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-4xl shadow-sm">👥</div><h2 className={`text-2xl font-black tracking-tight mb-4 ${textMain}`}>Команда и Аналитика</h2><p className={`text-base leading-relaxed mb-10 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Делегируйте задачи коллегам и следите за эффективностью выполнения в <b>«Сводке SLA»</b>. Всё под контролем!</p></div>)}<div className="flex justify-center gap-2 mb-8"><span className={`w-2.5 h-2.5 rounded-full transition-colors ${tutorialStep === 1 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/20'}`}></span><span className={`w-2.5 h-2.5 rounded-full transition-colors ${tutorialStep === 2 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/20'}`}></span><span className={`w-2.5 h-2.5 rounded-full transition-colors ${tutorialStep === 3 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/20'}`}></span></div><div className="flex gap-3">{tutorialStep < 3 ? (<><button onClick={() => setShowTutorial(false)} className={`px-6 py-4 rounded-2xl font-bold transition-colors ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Пропустить</button><button onClick={() => setTutorialStep(prev => prev + 1)} className="flex-1 py-4 rounded-2xl font-bold text-white transition-all shadow-lg bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5">Далее ➔</button></>) : (<button onClick={() => setShowTutorial(false)} className="w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5">Начать работу 🚀</button>)}</div></div></div>)}
    </div>
  );
}