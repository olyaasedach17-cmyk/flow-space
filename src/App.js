import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

// ==========================================
// 1. СЛОВАРЬ ПЕРЕВОДОВ И КОНСТАНТЫ
// ==========================================
const translations = {
  ru: {
    loginTitle: 'Корпоративная система', signIn: 'Войти', createAccount: 'Создать аккаунт',
    board: 'Задачи', projects: 'Проекты', analytics: 'Аналитика', team: 'Команда', playbooksTab: 'База',
    aiProcesses: 'Ассистент', more: 'Ещё', profileTab: 'Профиль',
    taskInput: 'Название задачи...', hours: 'Оценка (часы)', createBtn: 'Создать задачу ↵',
    colTodo: 'Нужно сделать', colInProgress: 'В процессе', colReview: 'На проверке', colDeferred: 'Отложено',
    empty: 'Нет задач', logout: 'Выйти', inviteEmp: 'Пригласить сотрудника',
    urgentBtn: '🔥 Срочная задача', importantBtn: '💎 Важная задача',
    matrixView: 'Матрица', pipelineView: 'Пайплайн',
    slaIndex: 'Индекс SLA', timeSaved: 'Сэкономлено', hrs: 'ч.', weight: 'Вес', impact: 'Влияние',
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
                Настройки базы
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
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('Этот Email уже зарегистрирован! Нажмите "Уже есть аккаунт? Войти" внизу.');
      } else if (error.code === 'auth/invalid-credential') {
        alert('Неверный Email или пароль.');
      } else {
        alert('Ошибка: ' + error.message);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) return alert('Пожалуйста, введите ваш Email в поле выше, чтобы мы знали, куда отправить ссылку.');
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Письмо для сброса пароля отправлено! Проверьте вашу почту (и папку Спам).');
    } catch (error) {
      alert('Ошибка при сбросе пароля: ' + error.message);
    }
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

const handleRunAIAgent = async () => {
    if (apiKey === "ВСТАВЬ_СЮДА_СВОЙ_НОВЫЙ_КЛЮЧ") return alert('Вставьте ключ API!');
    
    const tasksToProcess = tasks.filter(t => t.status === 'todo' && (!t.description || parseFloat(t.estimatedHours) === 0));
    if (tasksToProcess.length === 0) {
      return alert("Агент проверил доску: Все задачи уже оформлены. Работа завершена.");
    }
    
    setIsAgentRunning(true);
    const targetTask = tasksToProcess[0];

    // 🧠 1. Собираем список команды, чтобы ИИ знал, кому поручить задачу
    const teamList = assistants.map(a => a.name).join(', ');

    try {
      // 🧠 2. Обновляем промпт: теперь ИИ обязан выбрать исполнителя
      const systemPrompt = `Ты — автономный менеджер проектов. Пользователь набросал задачу: "${targetTask.text}".
      Твоя команда: ${teamList}. Выбери наиболее подходящего исполнителя исходя из сути задачи.
      ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON: 
      {
        "description": "Краткий пошаговый план", 
        "estimatedHours": 1.5, 
        "urgent": true или false, 
        "important": true или false,
        "assignee": "Имя выбранного сотрудника"
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
        
        // 🧠 3. Вписываем имя исполнителя прямо в карточку задачи
        updateWorkspace({ 
          tasks: tasks.map(t => String(t.id) === String(targetTask.id) ? {
            ...t, 
            description: `👤 Исполнитель: ${aiResult.assignee || 'Вам'}\n\n${aiResult.description || t.description}`, 
            estimatedHours: aiResult.estimatedHours || 1, 
            urgent: aiResult.urgent, 
            important: aiResult.important
          } : t)
        });
        
        alert(`Агент успешно расписал задачу и назначил её на: ${aiResult.assignee || 'вас'}!`);
      }
    } catch (error) { 
      alert('Ошибка агента: ' + error.message); 
    } finally { 
      setIsAgentRunning(false); 
    }
  };

  const handleInviteColleague = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const newAssistantId = `emp_${Date.now()}`;
    const newAssistantName = inviteEmail.split('@')[0];
    await setDoc(doc(db, 'users', user.uid), {
      assistants: [...assistants, { id: newAssistantId, name: newAssistantName, email: inviteEmail, role: inviteRole }],
      workspaces: { ...docData.workspaces, [newAssistantId]: { tasks: [], archive: [], kpis: defaultKpis, savedTime: 0 } }
    }, { merge: true });
    setIsInviteOpen(false); setInviteEmail('');
    alert(`Доступ PRO: Сотрудник ${inviteEmail} успешно добавлен в систему!`);
  };
  
  const handleGenerateTeamReport = async () => {
    if (apiKey === "sk-PtBuea8zR4gRtdYury5w1GOX3gKIpD4m") return alert('sk-PtBuea8zR4gRtdYury5w1GOX3gKIpD4m');
    setIsGeneratingReport(true);
    try {
      const systemPrompt = `Ты — операционный директор (COO). Проанализируй данные:
      SLA: ${totalEfficiency}%. Бэклог: ${todoTasks.length}. В работе: ${inProgressTasks.length}. На проверке: ${reviewTasks.length}. Загрузка: ${totalPendingHours}ч.
      Напиши краткий отчет в 3 абзаца: 1. Оценка. 2. Риски. 3. Совет руководителю.`;
      const response = await fetch('[https://api.proxyapi.ru/openai/v1/chat/completions](https://api.proxyapi.ru/openai/v1/chat/completions)', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }], temperature: 0.6 }) });
      const data = await response.json();
      if (data.choices) setTeamReport(data.choices[0].message.content.trim());
    } catch (error) {} finally { setIsGeneratingReport(false); }
  };
  
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Ваш браузер не поддерживает голосовой ввод");
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
    if (apiKey === "ВСТАВЬ_СЮДА_СВОЙ_НОВЫЙ_КЛЮЧ") return alert('Вставьте ключ!');
    setIsTaskGenerating(true);
    
    try {
      let systemPrompt = mode === 'expand' ? 'Пользователь написал идею. Преврати её в структурированную задачу.' : 'Разбей задачу на пошаговый чек-лист. Используй маркдаун списки.';
      const response = await fetch('https://api.proxyapi.ru/openai/v1/chat/completions', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, 
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: newTaskTitle }], temperature: 0.5 }) 
      });
      
      const data = await response.json();
      
      // Если нейросеть ответила текстом:
      if (data.choices) {
        setNewTaskDesc(data.choices[0].message.content.trim());
      } else {
        // Если нейросеть выдала ошибку (нет денег, неверный ключ и т.д.):
        alert('Ответ от сервера ИИ: ' + JSON.stringify(data)); 
      }
    } catch (error) { 
      alert('Ошибка интернета/сети: ' + error.message); 
    } finally { 
      setIsTaskGenerating(false); 
    }
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
  const btnPrimary = isDark ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-900 text-white hover:bg-slate-800'; // Строгий цвет кнопок

  if (!user || !docData || !currentAssistantId) return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${themeBg}`}>
      <div className={`p-8 rounded-[32px] max-w-md w-full ${cardBg}`}>
        <h1 className={`text-2xl font-black text-center mb-8 tracking-tight ${textMain}`}>Flow Space</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={`w-full px-4 py-4 rounded-2xl outline-none transition-colors border-2 ${inputBg}`} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" required className={`w-full px-4 py-4 rounded-2xl outline-none transition-colors border-2 ${inputBg}`} />
          <button type="submit" className={`w-full font-bold py-4 rounded-2xl transition-transform active:scale-95 shadow-lg ${btnPrimary}`}>
            {isLogin ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
        
        <div className="mt-8 flex flex-col items-center gap-4">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className={`text-sm font-semibold hover:underline transition-colors ${textMuted}`}>
            {isLogin ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
          </button>
          {isLogin && (<button type="button" onClick={handleResetPassword} className={`text-xs font-bold transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>Забыли пароль? Восстановить</button>)}
        </div>
      </div>
    </div>
  );

  const NavigationItem = ({ id, label, iconSvg }) => (
    <button onClick={() => { setActiveTab(id); setIsMoreMenuOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors ${activeTab === id ? (isDark ? 'text-white bg-white/10' : 'text-slate-900 bg-slate-100') : 'text-slate-400 hover:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
      {iconSvg}
      <span className="text-sm font-bold tracking-wide">{label}</span>
    </button>
  );

  // SVG иконки для бокового меню
  const svgBoard = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="14" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
  const svgAssistant = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
  const svgProjects = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>;
  const svgAnalytics = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M18 9l-5 5-4-4-4 4"/></svg>;
  const svgTeam = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;

  return (
    <div className={`min-h-screen font-sans pb-32 md:pb-8 md:pl-64 transition-colors duration-300 ${themeBg}`}>
      
      {/* --- ПРЕМИАЛЬНОЕ МЕНЮ НАВИГАЦИИ (Sidebar for Desktop, Pill for Mobile) --- */}
      <nav className={`fixed z-40 md:bottom-auto md:top-0 md:left-0 md:w-64 md:h-screen md:border-r md:flex md:flex-col md:justify-start md:py-6 md:px-4 md:gap-2 ${isDark ? 'md:bg-[#0E1116] md:border-white/10' : 'md:bg-[#F8FAFC] md:border-slate-200'}`}>
        
        {/* === ДЕСКТОПНАЯ ВЕРСИЯ === */}
        <div className="hidden md:flex flex-col w-full h-full">
          <div className="flex items-center gap-3 mb-8 px-2 w-full">
             <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}><span className="font-black text-sm">FS</span></div>
             <h1 className={`text-lg font-black tracking-tight ${textMain}`}>Flow Space</h1>
          </div>
          <div className="w-full mb-6">
            <button onClick={() => setIsCreateOpen(true)} className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg transition-transform active:scale-95 ${isDark ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}>
              <span>+ Создать задачу</span>
            </button>
          </div>
          <NavigationItem id="matrix" iconSvg={svgBoard} label={t('board')} />
          <NavigationItem id="processes" iconSvg={svgAssistant} label={t('aiProcesses')} />
          <NavigationItem id="projects" iconSvg={svgProjects} label={t('projects')} />
          <NavigationItem id="kpi" iconSvg={svgAnalytics} label={t('analytics')} />
          <NavigationItem id="team" iconSvg={svgTeam} label={t('team')} />
          
          <button onClick={() => setShowOnboarding(true)} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors mt-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span className="text-sm font-bold tracking-wide">Настройки базы</span>
          </button>
          
          <div className="mt-auto w-full pt-4 border-t border-slate-200 dark:border-white/10">
            <button onClick={() => signOut(auth)} className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-slate-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </nav>

      {/* === МОБИЛЬНАЯ ВЕРСИЯ (PREMIUM FLOATING PILL) === */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
        <div className={`flex justify-between items-center px-6 py-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl border ${isDark ? 'bg-[#1C2128]/85 border-white/10' : 'bg-white/90 border-slate-200'}`}>
          
          <button onClick={() => { setActiveTab('matrix'); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'matrix' ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-400 hover:text-slate-500'}`}>
            {svgBoard}
            <span className="text-[9px] font-bold tracking-wide">Задачи</span>
          </button>
          
          <button onClick={() => { setActiveTab('processes'); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'processes' ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-400 hover:text-slate-500'}`}>
            {svgAssistant}
            <span className="text-[9px] font-bold tracking-wide">Ассистент</span>
          </button>

          <button onClick={() => setIsCreateOpen(true)} className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transition-transform active:scale-90 ${isDark ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-slate-900 shadow-slate-900/20'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          </button>

          <button onClick={() => { setActiveTab('kpi'); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'kpi' ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-400 hover:text-slate-500'}`}>
            {svgAnalytics}
            <span className="text-[9px] font-bold tracking-wide">Сводка</span>
          </button>
          
          <button onClick={() => setIsMoreMenuOpen(true)} className={`flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-500`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span className="text-[9px] font-bold tracking-wide">Ещё</span>
          </button>

        </div>
      </div>

      {/* МОБИЛЬНОЕ МЕНЮ ЕЩЕ */}
      {isMoreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end animate-in fade-in" onClick={() => setIsMoreMenuOpen(false)}>
          <div className={`w-full rounded-t-[32px] p-6 pb-32 space-y-2 ${cardBg}`} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
            <h3 className={`font-bold text-lg mb-4 px-2 tracking-tight ${textMain}`}>Меню</h3>
            <button onClick={() => {setShowOnboarding(true); setIsMoreMenuOpen(false);}} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-colors ${isDark ? 'bg-white/5 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Настройки базы
            </button>
            <button onClick={() => {setActiveTab('team'); setIsMoreMenuOpen(false);}} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-colors ${isDark ? 'bg-white/5 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
              {svgTeam} Команда и Доступы
            </button>
            <button onClick={() => signOut(auth)} className="w-full flex items-center gap-4 p-4 rounded-2xl mt-4 text-red-500 font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Выйти из аккаунта
            </button>
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
            <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${textMain}`}>Умный Агент</h3>
                <p className={`text-xs mt-1 ${textMuted}`}>Агент сам найдет пустые задачи в бэклоге, составит план действий и проставит оценку.</p>
              </div>
              <button onClick={handleRunAIAgent} disabled={isAgentRunning} className={`px-5 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-md w-full sm:w-auto ${isAgentRunning ? 'bg-slate-400 animate-pulse' : (isDark ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800 active:scale-95')}`}>
                {isAgentRunning ? 'Агент работает...' : 'Запустить Агента'}
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
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}>
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <h2 className={`text-3xl font-black tracking-tight mb-3 ${textMain}`}>Умный Ассистент</h2>
              <p className={`text-sm ${textMuted}`}>Выберите профильного эксперта, опишите задачу и получите готовый результат.</p>
            </div>
            <div className={`p-6 md:p-8 rounded-[32px] border shadow-sm ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">1. Выбор специалиста</label>
              <div className="relative mb-6">
                <button type="button" onClick={() => setIsProcessDropdownOpen(!isProcessDropdownOpen)} className={`w-full px-4 py-4 text-base font-semibold rounded-2xl outline-none text-left flex justify-between items-center transition-all border-2 ${isDark ? 'bg-[#0E1116] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                  <span><span className="mr-3 text-lg">{aiOptions.find(opt => opt.id === processRole)?.icon}</span>{aiOptions.find(opt => opt.id === processRole)?.label}</span><span className={`text-slate-400 transition-transform ${isProcessDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {isProcessDropdownOpen && (
                  <><div className="fixed inset-0 z-40" onClick={() => setIsProcessDropdownOpen(false)}></div><div className={`absolute z-50 w-full mt-2 py-2 rounded-2xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 ${isDark ? 'bg-[#1C2128] border-white/10' : 'bg-white border-slate-200'}`}>{aiOptions.map(opt => (<button key={opt.id} type="button" onClick={() => { setProcessRole(opt.id); setIsProcessDropdownOpen(false); }} className={`w-full text-left px-4 py-4 text-sm font-medium transition-colors ${processRole === opt.id ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50')}`}><span className="mr-3 text-lg">{opt.icon}</span> {opt.label}</button>))}</div></>
                )}
              </div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">2. Постановка задачи</label>
              <textarea value={processTopic} onChange={(e) => setProcessTopic(e.target.value)} placeholder="Опишите, что нужно сделать в свободной форме..." rows="4" className={`w-full px-5 py-4 mb-6 rounded-2xl outline-none transition-all resize-none border-2 text-base ${inputBg}`} />
              <button type="button" onClick={handleGenerateProcess} disabled={isProcessGenerating || !processTopic} className={`w-full py-4 text-sm font-bold text-white rounded-2xl transition-all active:scale-95 shadow-lg ${isProcessGenerating ? 'bg-slate-400 animate-pulse' : (isDark ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20')}`}>{isProcessGenerating ? '⏳ Обработка запроса...' : 'Сгенерировать решение'}</button>
            </div>
            {processResult && (
              <div className={`p-6 md:p-8 rounded-[32px] border shadow-sm animate-in fade-in slide-in-from-bottom-4 ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-6"><h3 className={`text-lg font-bold ${textMain}`}>Результат работы:</h3><button onClick={() => navigator.clipboard.writeText(processResult)} className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Скопировать текст</button></div>
                <div className={`whitespace-pre-wrap text-sm leading-relaxed ${textMain}`}>{processResult}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'kpi' && (
          <div className="space-y-8 animate-in fade-in max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}>
                 {svgAnalytics}
              </div>
              <h2 className={`text-3xl font-black tracking-tight mb-3 ${textMain}`}>Аналитика и SLA</h2>
              <p className={`text-sm ${textMuted}`}>Контролируйте эффективность работы команды в реальном времени.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-8 rounded-[32px] shadow-sm border relative overflow-hidden flex flex-col justify-between ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-6"><p className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>{t('slaIndex')}</p></div>
                <div><h2 className={`text-4xl md:text-5xl font-bold tracking-tight ${textMain}`}>{totalEfficiency}%</h2></div>
              </div>
              <div className={`p-8 rounded-[32px] shadow-sm border relative overflow-hidden flex flex-col justify-between ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-6"><p className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>{t('timeSaved')}</p></div>
                <div><h2 className={`text-4xl md:text-5xl font-bold tracking-tight ${textMain}`}>{savedTime.toFixed(1)} <span className="text-xl md:text-2xl font-medium text-slate-400">ч.</span></h2></div>
              </div>
            </div>

            <div className={`p-6 md:p-8 rounded-[32px] border shadow-sm ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${textMain}`}>Сводка для руководителя</h3>
                  <p className={`text-xs mt-1 ${textMuted}`}>Автоматический анализ состояния доски и загрузки команды.</p>
                </div>
                <button onClick={handleGenerateTeamReport} disabled={isGeneratingReport} className={`px-5 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-md w-full sm:w-auto ${isGeneratingReport ? 'bg-slate-400 animate-pulse' : (isDark ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800 active:scale-95')}`}>
                  {isGeneratingReport ? 'Анализирую данные...' : 'Сгенерировать отчет'}
                </button>
              </div>
              {teamReport && (
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#0E1116] border-white/5' : 'bg-white border-slate-200'}`}>
                  <div className={`whitespace-pre-wrap text-sm leading-relaxed ${textMain}`}>{teamReport}</div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {kpis.map((kpi) => (
                <div key={kpi.id} className={`p-6 md:p-8 rounded-[32px] border flex flex-col md:flex-row gap-6 md:items-center justify-between ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
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

        {/* 🚀 ПУЛЬТ УПРАВЛЕНИЯ КОМАНДОЙ */}
        {activeTab === 'team' && (
          <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${textMain}`}>
                Пульт Управления 
                <span className="px-2 py-0.5 rounded border border-amber-500/30 text-amber-500 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest">PRO</span>
              </h2>
              <button onClick={() => setIsInviteOpen(true)} className={`px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition-transform active:scale-95 ${isDark ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                + Пригласить коллегу
              </button>
            </div>
            
            {assistants.map(ast => (
              <div key={ast.id} className={`p-6 rounded-[24px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${ast.id === 'manager' ? (isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white') : (isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800')}`}>
                    {ast.name.charAt(0).toUpperCase()}
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
                  <button className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>Отозвать доступ</button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}>
              {svgProjects}
            </div>
            <h2 className={`text-3xl font-black mb-4 tracking-tight ${textMain}`}>Проекты и Папки</h2>
            <p className={`text-sm max-w-md leading-relaxed ${textMuted}`}>Здесь вы сможете объединять задачи в крупные проекты.</p>
            <button onClick={() => setActiveTab('matrix')} className={`mt-8 px-8 py-4 font-bold rounded-2xl active:scale-95 transition-transform ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Вернуться к задачам</button>
          </div>
        )}
      </div>

      {/* --- ШТОРКА СОЗДАНИЯ ЗАДАЧИ --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-end md:justify-end md:items-stretch bg-black/40 backdrop-blur-sm p-0 animate-in fade-in">
          <div className={`w-full md:w-[450px] md:h-full md:rounded-none md:rounded-l-[32px] rounded-t-[32px] p-6 sm:p-8 shadow-2xl overflow-y-auto transition-transform ${isDark ? 'bg-[#161B22] border-l border-white/10' : 'bg-white border-l border-slate-200'}`}>
            <div className="flex justify-between items-center mb-6"><h2 className={`text-xl font-bold ${textMain}`}>Новая задача</h2><button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button></div>
            <form onSubmit={handleAddTask} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Суть задачи</label>
                <div className="relative">
                  <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Что нужно сделать?" required className={`w-full pl-4 pr-12 py-4 rounded-2xl outline-none font-semibold transition-all border-2 text-base ${inputBg}`} autoFocus />
                  <button type="button" onClick={startVoiceInput} className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`} title="Диктовать голосом"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg></button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => handleTaskAI('expand')} disabled={isTaskGenerating} className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Расписать подробно</button>
                  <button type="button" onClick={() => handleTaskAI('decompose')} disabled={isTaskGenerating} className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Разбить на шаги</button>
                </div>
              </div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Описание / Результат</label><textarea value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} placeholder={isTaskGenerating ? "Формируем текст..." : "Подробности, шаги или чек-лист..."} rows="6" className={`w-full px-4 py-4 rounded-2xl outline-none transition-all resize-none border-2 text-sm ${inputBg} ${isTaskGenerating ? 'opacity-50 animate-pulse' : ''}`} /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Оценка (часы)</label><input type="number" step="0.1" value={newTaskHours} onChange={(e) => setNewTaskHours(e.target.value)} placeholder={t('hours')} className={`w-full px-4 py-4 rounded-2xl outline-none transition-all border-2 ${inputBg}`} /></div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setNewUrgent(!newUrgent)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border-2 ${newUrgent ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20' : (isDark ? 'bg-transparent border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}`}>🔥 Срочно</button>
                <button type="button" onClick={() => setNewImportant(!newImportant)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border-2 ${newImportant ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20' : (isDark ? 'bg-transparent border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}`}>💎 Важно</button>
              </div>
              <button type="submit" className={`w-full mt-2 py-4 font-bold rounded-2xl transition-transform active:scale-95 shadow-lg ${isDark ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}>Создать задачу ↵</button>
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
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="hello@company.com" required className={`w-full px-4 py-4 rounded-2xl outline-none font-medium transition-all border-2 text-sm ${inputBg}`} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Роль</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={`w-full px-4 py-4 rounded-2xl outline-none font-medium transition-all border-2 text-sm appearance-none cursor-pointer ${inputBg}`}>
                  <option value="worker">Исполнитель (Свои задачи)</option>
                  <option value="manager">Руководитель (Полный доступ)</option>
                </select>
              </div>
              <button type="submit" className={`w-full mt-4 py-4 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg ${isDark ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                Отправить приглашение
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ОНБОРДИНГ И СЛАЙДЕРЫ */}
      {showOnboarding && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowOnboarding(false)}><div className={`w-full max-w-lg p-8 md:p-10 rounded-[32px] border transition-all ${isDark ? 'bg-[#1C2128] border-white/10 shadow-2xl' : 'bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)]'}`} onClick={e => e.stopPropagation()}><div className="w-16 h-16 mb-6 rounded-2xl bg-indigo-50 dark:bg-white/5 flex items-center justify-center text-indigo-600 dark:text-white text-3xl"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div><h2 className={`text-3xl font-bold tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Настройка базы</h2><div className="mb-6"><label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Ваша ниша</label><div className="flex flex-wrap gap-2">{niches.map(niche => (<button key={niche} onClick={() => setOnboardNiche(niche)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${onboardNiche === niche ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : (isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600 hover:border-slate-300')}`}>{niche}</button>))}</div></div><div className="mb-10"><label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Размер команды</label><div className="flex flex-wrap gap-2">{teams.map(team => (<button key={team} onClick={() => setOnboardTeam(team)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${onboardTeam === team ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : (isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600 hover:border-slate-300')}`}>{team}</button>))}</div></div><div className="flex gap-3"><button onClick={() => setShowOnboarding(false)} className={`px-6 py-4 rounded-2xl font-bold transition-colors ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Пропустить</button><button onClick={handleStartTutorial} className={`flex-1 py-4 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg ${isDark ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800'}`}>Сохранить</button></div></div></div>)}
      {showTutorial && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in zoom-in-95" onClick={() => setShowTutorial(false)}><div className={`w-full max-w-lg p-8 md:p-10 rounded-[32px] border transition-all text-center ${isDark ? 'bg-[#1C2128] border-white/10 shadow-2xl' : 'bg-white border-slate-100 shadow-[0_20px_50px_rgb(0,0,0,0.15)]'}`} onClick={e => e.stopPropagation()}>{tutorialStep === 1 && (<div className="animate-in fade-in slide-in-from-right-4"><div className={`w-20 h-20 mx-auto mb-6 rounded-[24px] flex items-center justify-center text-4xl shadow-sm ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}>{svgBoard}</div><h2 className={`text-2xl font-black tracking-tight mb-4 ${textMain}`}>Управление задачами</h2><p className={`text-base leading-relaxed mb-10 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Создавайте карточки, а система сама разобьет их на чек-листы.</p></div>)}{tutorialStep === 2 && (<div className="animate-in fade-in slide-in-from-right-4"><div className={`w-20 h-20 mx-auto mb-6 rounded-[24px] flex items-center justify-center text-4xl shadow-sm ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}>{svgAssistant}</div><h2 className={`text-2xl font-black tracking-tight mb-4 ${textMain}`}>Ваш Ассистент</h2><p className={`text-base leading-relaxed mb-10 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Делегируйте создание текстов и анализ данных профильным экспертам во вкладке Ассистент.</p></div>)}{tutorialStep === 3 && (<div className="animate-in fade-in slide-in-from-right-4"><div className={`w-20 h-20 mx-auto mb-6 rounded-[24px] flex items-center justify-center text-4xl shadow-sm ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}>{svgAnalytics}</div><h2 className={`text-2xl font-black tracking-tight mb-4 ${textMain}`}>Сводка по команде</h2><p className={`text-base leading-relaxed mb-10 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Следите за ключевыми метриками (SLA) и получайте автоматические советы по управлению.</p></div>)}<div className="flex justify-center gap-2 mb-8"><span className={`w-2.5 h-2.5 rounded-full transition-colors ${tutorialStep === 1 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/20'}`}></span><span className={`w-2.5 h-2.5 rounded-full transition-colors ${tutorialStep === 2 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/20'}`}></span><span className={`w-2.5 h-2.5 rounded-full transition-colors ${tutorialStep === 3 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/20'}`}></span></div><div className="flex gap-3">{tutorialStep < 3 ? (<><button onClick={() => setShowTutorial(false)} className={`px-6 py-4 rounded-2xl font-bold transition-colors ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Пропустить</button><button onClick={() => setTutorialStep(prev => prev + 1)} className={`flex-1 py-4 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg ${isDark ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800'}`}>Далее</button></>) : (<button onClick={() => setShowTutorial(false)} className={`w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg ${isDark ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-900 hover:bg-slate-800'}`}>Начать работу</button>)}</div></div></div>)}
    </div>
  );
}