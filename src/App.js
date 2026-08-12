import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// ==========================================
// 1. КОНСТАНТЫ И НАСТРОЙКИ
// ==========================================
const translations = {
  ru: {
    loginTitle: 'Flow Space Enterprise',
    board: 'Задачи',
    analytics: 'Аналитика',
    team: 'Команда',
    archiveTab: 'Архив',
    aiProcesses: 'Ассистент',
    colTodo: 'Нужно сделать',
    colInProgress: 'В процессе',
    colReview: 'На проверке',
    colDeferred: 'Отложено',
    empty: 'Задач пока нет',
  }
};

const defaultKpis = [
  { id: 1, name: 'Соблюдение сроков (SLA)', weight: 40, max: 100, score: 92, desc: 'Процент задач, закрытых до дедлайна.' },
  { id: 2, name: 'Качество (без возвратов)', weight: 35, max: 100, score: 88, desc: 'Задачи, принятые руководителем с первого раза.' },
  { id: 3, name: 'Инициативность', weight: 25, max: 5, score: 4, desc: 'Самостоятельное решение проблем.' },
];

const aiOptions = [
  { id: 'copywriter', icon: '✍️', label: 'Копирайтер (Тексты, посты)' },
  { id: 'analyst', icon: '🕵️', label: 'Аналитик (Маркетинг, идеи)' },
  { id: 'consultant', icon: '🧠', label: 'Консультант (Стратегия)' },
  { id: 'lawyer', icon: '👔', label: 'Юрист (Договоры, регламенты)' },
  { id: 'sheets', icon: '📊', label: 'Архитектор процессов' }
];

// Вспомогательный метод безопасного вызова бэкенд ИИ
async function callServerAI(endpointData) {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(endpointData)
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Ошибка сервера: ${response.status}`);
  }
  return data;
}

// ==========================================
// 2. ОПТИМИЗИРОВАННЫЕ КОМПОНЕНТЫ UI
// ==========================================

function TaskCard({ task, isTeamMode, isDark, onSelectTask, onQuickMove }) {
  const cardBase = task.urgent 
    ? (isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')
    : (isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200');

  const textMain = isDark ? 'text-slate-100' : 'text-slate-900';

  return (
    <div 
      onClick={() => onSelectTask(task)}
      className={`p-4 rounded-2xl border transition-all shadow-sm cursor-pointer hover:border-indigo-500/50 active:scale-[0.99] ${cardBase}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
          <span className={`text-sm font-semibold leading-snug ${textMain}`}>{task.text}</span>
        </div>

        {task.description && (
          <p className={`text-xs line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 items-center mt-1">
          {task.urgent && <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-red-500/20 text-red-400 border border-red-500/30">🔥 Срочно</span>}
          {task.important && <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">💎 Важно</span>}
          {task.estimatedHours > 0 && <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">{task.estimatedHours}ч</span>}
          {task.dueDate && <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">📅 {task.dueDate}</span>}
        </div>

        {/* Индикатор исполнителя только в командном режиме */}
        {isTeamMode && task.assigneeName && (
          <div className="text-[10px] text-indigo-400 font-medium mt-1">
            👤 {task.assigneeName}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-100 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5">
          {task.status === 'todo' && (
            <button onClick={() => onQuickMove(task.id, 'in_progress')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">В работу</button>
          )}
          {task.status === 'in_progress' && (
            isTeamMode ? (
              <button onClick={() => onQuickMove(task.id, 'review')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700">На проверку</button>
            ) : (
              <button onClick={() => onQuickMove(task.id, 'done')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Готово ✓</button>
            )
          )}
          {task.status === 'review' && isTeamMode && (
            <button onClick={() => onQuickMove(task.id, 'done')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Принять</button>
          )}
        </div>
        <span className="text-[10px] text-slate-400">Детали →</span>
      </div>
    </div>
  );
}

function TaskColumn({ title, colorClass, tasks, isTeamMode, isDark, t, onSelectTask, onQuickMove }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
        <h3 className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {title} <span className="text-slate-500 font-normal ml-1">({tasks.length})</span>
        </h3>
      </div>
      <div className="space-y-3 grow">
        {tasks.length === 0 ? (
          <div className={`text-center py-6 rounded-2xl border border-dashed text-xs ${isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
            {t('empty')}
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              isTeamMode={isTeamMode} 
              isDark={isDark} 
              onSelectTask={onSelectTask}
              onQuickMove={onQuickMove}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. ОСНОВНОЕ ПРИЛОЖЕНИЕ FLOW SPACE
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const [role, setRole] = useState('manager');
  const [docData, setDocData] = useState(null);
  const [currentAssistantId, setCurrentAssistantId] = useState('manager');

  const [activeTab, setActiveTab] = useState('matrix');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('flowspace_theme') === 'dark');
  const t = (key) => translations['ru'][key] || key;

  // Полноэкранные состояния карточки задачи
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Форма задачи
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(false);
  const [newTaskAssignee, setNewTaskAssignee] = useState('manager');

  const [isTaskGenerating, setIsTaskGenerating] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  // Чат Ассистента
  const [processRole, setProcessRole] = useState('copywriter');
  const [processTopic, setProcessTopic] = useState('');
  const [processMessages, setProcessMessages] = useState([]);
  const [followUpText, setFollowUpText] = useState('');
  const [isProcessGenerating, setIsProcessGenerating] = useState(false);

  // Команда и настройки
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePosition, setInvitePosition] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardTeam, setOnboardTeam] = useState('👤 Я один');

  const [teamReport, setTeamReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

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
        const data = docSnap.data();
        setDocData(data);
        if (data.settings?.teamSize) setOnboardTeam(data.settings.teamSize);
      } else {
        setDoc(docRef, {
          email: user.email.toLowerCase(),
          settings: { isTeamMode: false, teamSize: '👤 Я один' },
          assistants: [{ id: 'manager', name: 'Владелец', position: 'Руководитель' }],
          workspaces: { 'manager': { tasks: [], archive: [], kpis: defaultKpis, savedTime: 0 } }
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert('Ошибка авторизации: ' + error.message);
    }
  };

  const currentWorkspace = docData?.workspaces?.[currentAssistantId] || {};
  const tasks = currentWorkspace.tasks || [];
  const archive = currentWorkspace.archive || [];
  const kpis = currentWorkspace.kpis || defaultKpis;
  const savedTime = currentWorkspace.savedTime || 0;
  const assistants = docData?.assistants || [];
  
  // Автоматический флаг режима на основе выбора пользователя
  const isTeamMode = docData?.settings?.isTeamMode ?? (onboardTeam !== '👤 Я один');

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const deferredTasks = tasks.filter(t => t.status === 'deferred');

  const updateWorkspace = (newData) => {
    setDoc(doc(db, 'users', user.uid), {
      workspaces: { ...docData.workspaces, [currentAssistantId]: { ...currentWorkspace, ...newData } }
    }, { merge: true });
  };

  // --- ИИ-Функция: Умный Агент ---
  const handleRunAIAgent = async () => {
    const targetTask = tasks.find(t => t.status === 'todo' && (!t.description || parseFloat(t.estimatedHours) === 0));
    if (!targetTask) return alert("Все задачи в бэклоге уже оформлены!");

    setIsAgentRunning(true);
    try {
      const prompt = isTeamMode 
        ? `Проанализируй задачу "${targetTask.text}". Назначь исполнителя из списка: ${assistants.map(a => a.name).join(', ')}. Выдай JSON: {"description": "План", "estimatedHours": 1.5, "urgent": false, "important": true, "assignee": "Имя"}`
        : `Проанализируй задачу "${targetTask.text}" для соло-разработчика. Выдай JSON: {"description": "Пошаговый план", "estimatedHours": 2, "urgent": false, "important": true}`;

      const response = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.3
      });

      let rawContent = response.choices[0].message.content.trim();
      if (rawContent.startsWith('```json')) rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResult = JSON.parse(rawContent);

      updateWorkspace({
        tasks: tasks.map(t => t.id === targetTask.id ? {
          ...t,
          description: aiResult.description || t.description,
          estimatedHours: aiResult.estimatedHours || 1,
          urgent: !!aiResult.urgent,
          important: !!aiResult.important,
          assigneeName: isTeamMode ? aiResult.assignee : null
        } : t)
      });
      alert('Агент успешно расписал задачу!');
    } catch (error) {
      alert('Ошибка агента: ' + error.message);
    } finally {
      setIsAgentRunning(false);
    }
  };

  // --- ИИ-Функция: Генерация отчета по команде ---
  const handleGenerateTeamReport = async () => {
    setIsGeneratingReport(true);
    try {
      const prompt = `Проанализируй состояние команды: Всего задач: ${tasks.length}, В работе: ${inProgressTasks.length}, На проверке: ${reviewTasks.length}. Напиши краткую сводку для руководителя из 3 пунктов: Эффективность, Риски, Рекомендация.`;
      const data = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.5
      });
      setTeamReport(data.choices[0].message.content.trim());
    } catch (err) {
      alert('Ошибка отчета: ' + err.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // --- ИИ-Функция: Декомпозиция задач ---
  const handleTaskAI = async (mode) => {
    if (!newTaskTitle.trim()) return alert('Введите название задачи!');
    setIsTaskGenerating(true);
    try {
      const prompt = mode === 'expand' 
        ? 'Преврати эту идею в структурированное ТЗ для задачи.' 
        : 'Разбей эту задачу на пошаговый чек-лист.';

      const data = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: newTaskTitle }
        ]
      });
      setNewTaskDesc(data.choices[0].message.content.trim());
    } catch (err) {
      alert('Ошибка ИИ: ' + err.message);
    } finally {
      setIsTaskGenerating(false);
    }
  };

  // --- ИИ-Функция: Ассистент (Чат) ---
  const handleGenerateProcess = async () => {
    if (!processTopic.trim()) return;
    setIsProcessGenerating(true);
    try {
      const systemPrompt = aiOptions.find(o => o.id === processRole)?.label || 'Эксперт';
      const initialMessages = [
        { role: 'system', content: `Ты — ${systemPrompt}. Давай структурированные ответы.` },
        { role: 'user', content: processTopic }
      ];

      const data = await callServerAI({
        model: 'gpt-4o',
        messages: initialMessages,
        temperature: 0.7
      });

      const responseText = data.choices[0].message.content.trim();
      setProcessMessages([
        { role: 'user', content: processTopic },
        { role: 'assistant', content: responseText }
      ]);
      setProcessTopic('');
    } catch (err) {
      alert('Ошибка Ассистента: ' + err.message);
    } finally {
      setIsProcessGenerating(false);
    }
  };

  const handleFollowUpProcess = async () => {
    if (!followUpText.trim()) return;
    setIsProcessGenerating(true);
    try {
      const messagesPayload = [
        { role: 'system', content: 'Продолжай вести диалог как эксперт.' },
        ...processMessages,
        { role: 'user', content: followUpText }
      ];

      const data = await callServerAI({
        model: 'gpt-4o',
        messages: messagesPayload,
        temperature: 0.7
      });

      const responseText = data.choices[0].message.content.trim();
      setProcessMessages([
        ...processMessages,
        { role: 'user', content: followUpText },
        { role: 'assistant', content: responseText }
      ]);
      setFollowUpText('');
    } catch (err) {
      alert('Ошибка диалога: ' + err.message);
    } finally {
      setIsProcessGenerating(false);
    }
  };

  // Управление задачами
  const handleSaveTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskObj = {
      id: selectedTask ? selectedTask.id : Date.now(),
      text: newTaskTitle,
      description: newTaskDesc,
      estimatedHours: parseFloat(newTaskHours) || 0,
      dueDate: newTaskDueDate,
      urgent: newUrgent,
      important: newImportant,
      status: selectedTask ? selectedTask.status : 'todo',
      assigneeName: isTeamMode ? (assistants.find(a => a.id === newTaskAssignee)?.name || 'Владелец') : null
    };

    if (selectedTask) {
      updateWorkspace({ tasks: tasks.map(t => t.id === selectedTask.id ? taskObj : t) });
    } else {
      updateWorkspace({ tasks: [taskObj, ...tasks] });
    }

    closeModal();
  };

  const handleQuickMove = (taskId, newStatus) => {
    if (newStatus === 'done') {
      const taskToArchive = tasks.find(t => t.id === taskId);
      if (taskToArchive) {
        updateWorkspace({
          tasks: tasks.filter(t => t.id !== taskId),
          archive: [{ ...taskToArchive, status: 'done' }, ...archive]
        });
      }
    } else {
      updateWorkspace({
        tasks: tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
      });
    }
  };

  const handleDeleteTask = (taskId) => {
    updateWorkspace({ tasks: tasks.filter(t => t.id !== taskId) });
    closeModal();
  };

  const openTaskModal = (task = null) => {
    if (task) {
      setSelectedTask(task);
      setNewTaskTitle(task.text);
      setNewTaskDesc(task.description || '');
      setNewTaskHours(task.estimatedHours || '');
      setNewTaskDueDate(task.dueDate || '');
      setNewUrgent(task.urgent || false);
      setNewImportant(task.important || false);
    } else {
      setSelectedTask(null);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskHours('');
      setNewTaskDueDate('');
      setNewUrgent(false);
      setNewImportant(false);
    }
    setIsCreateOpen(true);
  };

  const closeModal = () => {
    setIsCreateOpen(false);
    setSelectedTask(null);
  };

  const handleSaveSettings = async () => {
    const isTeam = onboardTeam !== '👤 Я один';
    await setDoc(doc(db, 'users', user.uid), {
      settings: { isTeamMode: isTeam, teamSize: onboardTeam }
    }, { merge: true });
    setShowOnboarding(false);
  };

  const themeBg = isDark ? 'bg-[#0E1116] text-slate-200' : 'bg-[#F8FAFC] text-slate-800';
  const cardBg = isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const inputBg = isDark ? 'bg-[#0E1116] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900';

  if (!user || !docData) return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${themeBg}`}>
      <div className={`p-8 rounded-[32px] max-w-md w-full border ${cardBg}`}>
        <h1 className={`text-2xl font-black text-center mb-6 tracking-tight ${textMain}`}>Flow Space</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={`w-full px-4 py-3.5 rounded-2xl outline-none border ${inputBg}`} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" required className={`w-full px-4 py-3.5 rounded-2xl outline-none border ${inputBg}`} />
          <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-transform active:scale-95">
            {isLogin ? 'Войти в систему' : 'Зарегистрироваться'}
          </button>
        </form>
        <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-xs font-semibold text-slate-400 mt-4">
          {isLogin ? 'Создать новый аккаунт' : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans pb-28 md:pb-8 md:pl-64 ${themeBg}`}>
      
      {/* ДЕСКТОПНОЕ МЕНЮ */}
      <nav className={`hidden md:flex fixed top-0 left-0 w-64 h-screen border-r flex-col justify-start py-6 px-4 gap-2 ${isDark ? 'bg-[#0E1116] border-white/10' : 'bg-[#F8FAFC] border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">FS</div>
          <h1 className={`text-lg font-black tracking-tight ${textMain}`}>Flow Space</h1>
        </div>

        <button onClick={() => openTaskModal()} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm mb-4 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
          + Создать задачу
        </button>

        <button onClick={() => setActiveTab('matrix')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'matrix' ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-400'}`}>📋 Задачи</button>
        <button onClick={() => setActiveTab('processes')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'processes' ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-400'}`}>🤖 Ассистент</button>
        
        {/* АНАЛИТИКА ПОКАЗЫВАЕТСЯ ТОЛЬКО ДЛЯ КОМАНДЫ */}
        {isTeamMode && (
          <button onClick={() => setActiveTab('kpi')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'kpi' ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-400'}`}>📊 Сводка SLA</button>
        )}

        <button onClick={() => setActiveTab('archive')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'archive' ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-400'}`}>📂 Архив</button>

        <div className="mt-auto border-t border-slate-200 dark:border-white/10 pt-4 space-y-2">
          <button onClick={() => setShowOnboarding(true)} className="text-xs font-bold text-slate-400 px-2 hover:text-slate-200">⚙️ Режим: {isTeamMode ? 'Команда' : 'Соло'}</button>
          <button onClick={() => signOut(auth)} className="w-full text-left px-2 py-2 text-xs font-bold text-red-400 hover:underline">Выйти из аккаунта</button>
        </div>
      </nav>

      {/* МОБИЛЬНАЯ НАВИГАЦИЯ */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className={`flex justify-around items-center px-4 py-3 rounded-3xl shadow-2xl backdrop-blur-xl border ${isDark ? 'bg-[#161B22]/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
          <button onClick={() => setActiveTab('matrix')} className={`text-xs font-bold flex flex-col items-center ${activeTab === 'matrix' ? 'text-indigo-500' : 'text-slate-400'}`}>📋 <span>Задачи</span></button>
          <button onClick={() => setActiveTab('processes')} className={`text-xs font-bold flex flex-col items-center ${activeTab === 'processes' ? 'text-indigo-500' : 'text-slate-400'}`}>🤖 <span>Ассистент</span></button>
          
          <button onClick={() => openTaskModal()} className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/30 active:scale-90 transition-transform">
            +
          </button>

          {isTeamMode && (
            <button onClick={() => setActiveTab('kpi')} className={`text-xs font-bold flex flex-col items-center ${activeTab === 'kpi' ? 'text-indigo-500' : 'text-slate-400'}`}>📊 <span>Сводка</span></button>
          )}

          <button onClick={() => setActiveTab('archive')} className={`text-xs font-bold flex flex-col items-center ${activeTab === 'archive' ? 'text-indigo-500' : 'text-slate-400'}`}>📂 <span>Архив</span></button>
        </div>
      </div>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* Шапка */}
        <header className="flex justify-between items-center mb-6 pt-2">
          <div>
            <h2 className={`text-xl font-black ${textMain}`}>
              {isTeamMode ? 'Командная доска' : 'Личное пространство'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{isTeamMode ? 'Управление процессами и сотрудниками' : 'Фокус на личных задачах'}</p>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 text-base">
            {isDark ? '☀️' : '🌙'}
          </button>
        </header>

        {/* ВКЛАДКА: ЗАДАЧИ */}
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-indigo-50/50 border-indigo-100'}`}>
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-900'}`}>Умный Агент</h3>
                <p className="text-xs text-slate-500 mt-0.5">Автоматически находит неполные задачи и составляем подробный план.</p>
              </div>
              <button onClick={handleRunAIAgent} disabled={isAgentRunning} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                {isAgentRunning ? 'Запуск...' : 'Запустить Агента'}
              </button>
            </div>

            {/* СТОЛБЦЫ KANBAN */}
            <div className={`grid grid-cols-1 ${isTeamMode ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
              <TaskColumn title={t('colTodo')} colorClass="bg-slate-400" tasks={todoTasks} isTeamMode={isTeamMode} isDark={isDark} t={t} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />
              <TaskColumn title={t('colInProgress')} colorClass="bg-blue-500" tasks={inProgressTasks} isTeamMode={isTeamMode} isDark={isDark} t={t} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />
              
              {/* НА ПРОВЕРКЕ — ТОЛЬКО В КОМАНДНОМ РЕЖИМЕ */}
              {isTeamMode && (
                <TaskColumn title={t('colReview')} colorClass="bg-amber-500" tasks={reviewTasks} isTeamMode={isTeamMode} isDark={isDark} t={t} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />
              )}
              
              <TaskColumn title={t('colDeferred')} colorClass="bg-slate-600" tasks={deferredTasks} isTeamMode={isTeamMode} isDark={isDark} t={t} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />
            </div>
          </div>
        )}

        {/* ВКЛАДКА: АССИСТЕНТ (ЧАТ) */}
        {activeTab === 'processes' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className={`p-6 rounded-3xl border ${cardBg}`}>
              <h3 className={`text-base font-bold mb-4 ${textMain}`}>Выбор специалиста</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {aiOptions.map(opt => (
                  <button 
                    key={opt.id} 
                    onClick={() => setProcessRole(opt.id)}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all ${processRole === opt.id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-200 dark:border-white/5 opacity-70'}`}
                  >
                    <div className="text-lg mb-1">{opt.icon}</div>
                    {opt.label}
                  </button>
                ))}
              </div>

              <textarea 
                value={processTopic} 
                onChange={(e) => setProcessTopic(e.target.value)} 
                placeholder="Опишите задачу подробнее..." 
                rows="3" 
                className={`w-full p-4 rounded-2xl outline-none border text-sm resize-none mb-3 ${inputBg}`} 
              />
              <button 
                onClick={handleGenerateProcess} 
                disabled={isProcessGenerating || !processTopic.trim()} 
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-transform active:scale-95 disabled:opacity-50"
              >
                {isProcessGenerating ? 'Обработка запроса...' : 'Отправить запрос'}
              </button>
            </div>

            {/* ИСТОРИЯ ЧАТА */}
            {processMessages.length > 0 && (
              <div className="space-y-4">
                {processMessages.map((msg, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border text-sm ${msg.role === 'user' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 ml-6' : `${cardBg} mr-6`}`}>
                    <div className="font-bold text-xs mb-2 opacity-60">{msg.role === 'user' ? '👤 Ваш запрос' : '🤖 Ответ Ассистента'}</div>
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  </div>
                ))}

                <div className={`p-2 pl-4 flex items-center gap-2 rounded-2xl border ${cardBg}`}>
                  <input 
                    type="text" 
                    value={followUpText} 
                    onChange={(e) => setFollowUpText(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleFollowUpProcess()}
                    placeholder="Уточнить или попросить переделать..." 
                    className="flex-1 bg-transparent outline-none text-xs font-medium" 
                  />
                  <button onClick={handleFollowUpProcess} disabled={isProcessGenerating} className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs">
                    Отправить
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ВКЛАДКА: СВОДКА (ТОЛЬКО ДЛЯ КОМАНДЫ) */}
        {activeTab === 'kpi' && isTeamMode && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className={`p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${cardBg}`}>
              <div>
                <h3 className={`text-base font-bold ${textMain}`}>Сводка для руководителя</h3>
                <p className="text-xs text-slate-400 mt-1">Автоматический ИИ-анализ эффективности и рисков компании.</p>
              </div>
              <button onClick={handleGenerateTeamReport} disabled={isGeneratingReport} className="px-5 py-3 bg-indigo-600 text-white font-bold text-xs rounded-2xl">
                {isGeneratingReport ? 'Анализ...' : 'Сформировать отчет'}
              </button>
            </div>

            {teamReport && (
              <div className={`p-6 rounded-3xl border ${cardBg}`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{teamReport}</div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {kpis.map((kpi) => (
                <div key={kpi.id} className={`p-5 rounded-2xl border flex justify-between items-center ${cardBg}`}>
                  <div>
                    <h4 className="font-bold text-sm">{kpi.name}</h4>
                    <p className="text-xs text-slate-400">{kpi.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black">{kpi.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА: АРХИВ */}
        {activeTab === 'archive' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <h3 className={`text-lg font-bold ${textMain}`}>Выполненные задачи</h3>
            {archive.length === 0 ? (
              <p className="text-xs text-slate-400">Архив пуст.</p>
            ) : (
              archive.map(task => (
                <div key={task.id} className={`p-4 rounded-2xl border flex justify-between items-center ${cardBg}`}>
                  <span className="text-sm font-semibold line-through text-slate-400">{task.text}</span>
                  <button onClick={() => handleQuickMove(task.id, 'todo')} className="text-xs font-bold text-indigo-400">Восстановить</button>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ / РЕДАКТИРОВАНИЯ ЗАДАЧИ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          <div className={`w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 border shadow-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-base font-bold ${textMain}`}>{selectedTask ? 'Редактирование задачи' : 'Новая задача'}</h3>
              <button onClick={closeModal} className="text-slate-400 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Название задачи</label>
                <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Что нужно сделать?" required className={`w-full p-3.5 rounded-xl outline-none border text-sm font-medium ${inputBg}`} />
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => handleTaskAI('expand')} disabled={isTaskGenerating} className="flex-1 py-2 rounded-lg bg-slate-500/10 text-xs font-bold">Расписать ИИ</button>
                  <button type="button" onClick={() => handleTaskAI('decompose')} disabled={isTaskGenerating} className="flex-1 py-2 rounded-lg bg-slate-500/10 text-xs font-bold">Чек-лист ИИ</button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Описание / ТЗ</label>
                <textarea value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} rows="4" className={`w-full p-3.5 rounded-xl outline-none border text-xs resize-none ${inputBg}`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Оценка (часы)</label>
                  <input type="number" step="0.5" value={newTaskHours} onChange={(e) => setNewTaskHours(e.target.value)} placeholder="1.5" className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Дедлайн</label>
                  <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`} />
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setNewUrgent(!newUrgent)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${newUrgent ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}>🔥 Срочно</button>
                <button type="button" onClick={() => setNewImportant(!newImportant)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${newImportant ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}>💎 Важно</button>
              </div>

              {isTeamMode && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Исполнитель</label>
                  <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}>
                    {assistants.map(a => <option key={a.id} value={a.id}>{a.name} ({a.position || 'Сотрудник'})</option>)}
                  </select>
                </div>
              )}

              <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl">
                Сохранить задачу
              </button>

              {selectedTask && (
                <button type="button" onClick={() => handleDeleteTask(selectedTask.id)} className="w-full py-2 text-xs font-bold text-red-400 hover:underline text-center block">
                  Удалить задачу
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО НАСТРОЙКИ РЕЖИМА */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 border ${cardBg}`}>
            <h3 className={`text-lg font-bold mb-3 ${textMain}`}>Режим работы</h3>
            <p className="text-xs text-slate-400 mb-4">Выберите формат работы для адаптации интерфейса.</p>
            
            <div className="space-y-2 mb-6">
              {['👤 Я один', '👥 2-5 человек', '🏢 Больше 5 человек'].map(size => (
                <button 
                  key={size} 
                  onClick={() => setOnboardTeam(size)}
                  className={`w-full p-3 rounded-xl border text-xs font-bold text-left ${onboardTeam === size ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-200 dark:border-white/10'}`}
                >
                  {size}
                </button>
              ))}
            </div>

            <button onClick={handleSaveSettings} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold">Сохранить</button>
          </div>
        </div>
      )}

    </div>
  );
}