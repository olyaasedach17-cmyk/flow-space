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
import { Toaster, toast } from 'sonner';
import { 
  Flame, 
  Gem, 
  Bot, 
  User, 
  Calendar, 
  Plus, 
  FolderArchive, 
  BarChart3, 
  Users, 
  LayoutDashboard, 
  Sun, 
  Moon, 
  Sparkles, 
  Send, 
  Trash2, 
  Settings, 
  Globe,
  Clock,
  ArrowRight,
  X,
  CheckCircle2
  LogOut
} from 'lucide-react';

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
    ? (isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50/70 border-red-200')
    : (isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200');

  const textMain = isDark ? 'text-slate-100' : 'text-slate-900';

  return (
    <div 
      onClick={() => onSelectTask(task)}
      className={`p-4 rounded-2xl border transition-all shadow-sm cursor-pointer hover:border-emerald-500/50 active:scale-[0.99] ${cardBase}`}
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
          {task.urgent && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-red-500/20 text-red-400 border border-red-500/30">
              <Flame className="w-3 h-3 text-red-400" /> Срочно
            </span>
          )}
          {task.important && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Gem className="w-3 h-3 text-blue-400" /> Важно
            </span>
          )}
          {task.estimatedHours > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
              <Clock className="w-3 h-3" /> {task.estimatedHours}ч
            </span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Calendar className="w-3 h-3" /> {task.dueDate}
            </span>
          )}
        </div>

        {isTeamMode && task.assigneeName && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium mt-1">
            <User className="w-3 h-3" /> {task.assigneeName}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-100 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5">
          {task.status === 'todo' && (
            <button onClick={() => onQuickMove(task.id, 'in_progress')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">В работу</button>
          )}
          {task.status === 'in_progress' && (
            isTeamMode ? (
              <button onClick={() => onQuickMove(task.id, 'review')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">На проверку</button>
            ) : (
              <button onClick={() => onQuickMove(task.id, 'done')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Готово ✓</button>
            )
          )}
          {task.status === 'review' && isTeamMode && (
            <button onClick={() => onQuickMove(task.id, 'done')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Принять</button>
          )}
        </div>
        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">Детали <ArrowRight className="w-2.5 h-2.5" /></span>
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

  const [docData, setDocData] = useState(null);
  const [currentAssistantId, setCurrentAssistantId] = useState('manager');

  const [activeTab, setActiveTab] = useState('matrix');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('flowspace_theme') === 'dark');
  const t = (key) => translations['ru'][key] || key;

  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(false);
  const [newTaskAssignee, setNewTaskAssignee] = useState('manager');

  const [isTaskGenerating, setIsTaskGenerating] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  const [processRole, setProcessRole] = useState('copywriter');
  const [processTopic, setProcessTopic] = useState('');
  const [processMessages, setProcessMessages] = useState([]);
  const [followUpText, setFollowUpText] = useState('');
  const [isProcessGenerating, setIsProcessGenerating] = useState(false);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePosition, setInvitePosition] = useState('');
  const [inviteRole, setInviteRole] = useState('worker');

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
          assistants: [{ id: 'manager', name: 'Владелец', position: 'Руководитель', role: 'manager' }],
          workspaces: { 'manager': { tasks: [], archive: [], kpis: defaultKpis, savedTime: 0 } }
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Добро пожаловать в систему!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Аккаунт успешно создан!');
      }
    } catch (error) {
      toast.error('Ошибка авторизации: ' + error.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Успешный вход через Google');
    } catch (error) {
      toast.error('Ошибка входа через Google: ' + error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return toast.error('Пожалуйста, введите ваш Email в поле выше.');
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Письмо для сброса пароля отправлено на ваш e-mail.');
    } catch (error) {
      toast.error('Ошибка сброса пароля: ' + error.message);
    }
  };

  const currentWorkspace = docData?.workspaces?.[currentAssistantId] || {};
  const tasks = currentWorkspace.tasks || [];
  const archive = currentWorkspace.archive || [];
  const kpis = currentWorkspace.kpis || defaultKpis;
  const assistants = docData?.assistants || [];
  
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

  const handleInviteColleague = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const newAssistantId = `emp_${Date.now()}`;
    const newAssistantName = inviteEmail.split('@')[0];
    
    await setDoc(doc(db, 'users', user.uid), {
      assistants: [...assistants, { 
        id: newAssistantId, 
        name: newAssistantName, 
        email: inviteEmail, 
        role: inviteRole,
        position: invitePosition || 'Сотрудник'
      }],
      workspaces: { 
        ...docData.workspaces, 
        [newAssistantId]: { tasks: [], archive: [], kpis: defaultKpis, savedTime: 0 } 
      }
    }, { merge: true });
    
    setIsInviteOpen(false); 
    setInviteEmail(''); 
    setInvitePosition('');
    toast.success(`Сотрудник ${inviteEmail} успешно добавлен в команду!`);
  };

  const handleRunAIAgent = async () => {
    const targetTask = tasks.find(t => t.status === 'todo' && (!t.description || parseFloat(t.estimatedHours) === 0));
    if (!targetTask) return toast.info("Все задачи в бэклоге уже оформлены!");

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
      toast.success('Агент успешно расписал задачу!');
    } catch (error) {
      toast.error('Ошибка агента: ' + error.message);
    } finally {
      setIsAgentRunning(false);
    }
  };

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
      toast.success('Отчет сформирован');
    } catch (err) {
      toast.error('Ошибка отчета: ' + err.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleTaskAI = async (mode) => {
    if (!newTaskTitle.trim()) return toast.error('Введите название задачи!');
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
      toast.success('Текст сформирован');
    } catch (err) {
      toast.error('Ошибка ИИ: ' + err.message);
    } finally {
      setIsTaskGenerating(false);
    }
  };

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
      toast.error('Ошибка Ассистента: ' + err.message);
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
      toast.error('Ошибка диалога: ' + err.message);
    } finally {
      setIsProcessGenerating(false);
    }
  };

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
      toast.success('Задача обновлена');
    } else {
      updateWorkspace({ tasks: [taskObj, ...tasks] });
      toast.success('Новая задача создана');
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
        toast.success('Задача перенесена в Архив');
      }
    } else {
      updateWorkspace({
        tasks: tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
      });
    }
  };

  const handleDeleteTask = (taskId) => {
    updateWorkspace({ tasks: tasks.filter(t => t.id !== taskId) });
    toast.success('Задача удалена');
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
    toast.success('Настройки сохранены');
  };

  const themeBg = isDark ? 'bg-[#0E1116] text-slate-200' : 'bg-[#F8FAFC] text-slate-800';
  const cardBg = isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const inputBg = isDark ? 'bg-[#0E1116] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900';

  if (!user || !docData) return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${themeBg}`}>
      <Toaster position="top-center" richColors />
      <div className={`p-8 rounded-[32px] max-w-md w-full border ${cardBg}`}>
        <h1 className={`text-2xl font-black text-center mb-6 tracking-tight ${textMain}`}>Flow Space</h1>
        <form onSubmit={handleAuth} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={`w-full px-4 py-3.5 rounded-2xl outline-none border ${inputBg}`} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" required className={`w-full px-4 py-3.5 rounded-2xl outline-none border ${inputBg}`} />
          <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-transform active:scale-95 shadow-lg shadow-emerald-600/20">
            {isLogin ? 'Войти в систему' : 'Зарегистрироваться'}
          </button>
        </form>

        <button 
          type="button" 
          onClick={signInWithGoogle} 
          className={`w-full font-bold py-3.5 mt-3 rounded-2xl border transition-transform active:scale-95 text-xs flex items-center justify-center gap-2 ${isDark ? 'bg-[#0E1116] border-white/10 text-white hover:bg-white/5' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'}`}
        >
          <Globe className="w-4 h-4 text-emerald-500" /> Войти через Google
        </button>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-xs font-semibold text-slate-400 hover:underline">
            {isLogin ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
          </button>
          {isLogin && (
            <button type="button" onClick={handleResetPassword} className="text-xs font-semibold text-slate-400 hover:text-slate-200">
              Забыли пароль?
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans pb-28 md:pb-8 md:pl-64 ${themeBg}`}>
      <Toaster position="top-center" richColors />
      
      {/* ДЕСКТОПНОЕ МЕНЮ */}
      <nav className={`hidden md:flex fixed top-0 left-0 w-64 h-screen border-r flex-col justify-start py-6 px-4 gap-2 ${isDark ? 'bg-[#0E1116] border-white/10' : 'bg-[#F8FAFC] border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md">FS</div>
          <h1 className={`text-lg font-black tracking-tight ${textMain}`}>Flow Space</h1>
        </div>

        <button onClick={() => openTaskModal()} className="flex items-center justify-center gap-2 w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm mb-4 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Создать задачу
        </button>

        <button onClick={() => setActiveTab('matrix')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'matrix' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:text-slate-200'}`}>
          <LayoutDashboard className="w-4 h-4" /> Задачи
        </button>
        <button onClick={() => setActiveTab('processes')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'processes' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:text-slate-200'}`}>
          <Bot className="w-4 h-4" /> Ассистент
        </button>
        
        {isTeamMode && (
          <>
            <button onClick={() => setActiveTab('team')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'team' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:text-slate-200'}`}>
              <Users className="w-4 h-4" /> Команда
            </button>
            <button onClick={() => setActiveTab('kpi')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'kpi' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:text-slate-200'}`}>
              <BarChart3 className="w-4 h-4" /> Сводка SLA
            </button>
          </>
        )}

        <button onClick={() => setActiveTab('archive')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'archive' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:text-slate-200'}`}>
          <FolderArchive className="w-4 h-4" /> Архив
        </button>

        <div className="mt-auto border-t border-slate-200 dark:border-white/10 pt-4 space-y-2">
          <button onClick={() => setShowOnboarding(true)} className="flex items-center gap-2 text-xs font-bold text-slate-400 px-2 hover:text-slate-200">
            <Settings className="w-3.5 h-3.5" /> Режим: {isTeamMode ? 'Команда' : 'Соло'}
          </button>
          <button onClick={() => signOut(auth)} className="flex items-center gap-2 w-full text-left px-2 py-2 text-xs font-bold text-red-400 hover:underline">
            <LogOut className="w-3.5 h-3.5" /> Выйти из аккаунта
          </button>
        </div>
      </nav>

      {/* МОБИЛЬНАЯ НАВИГАЦИЯ */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className={`flex justify-around items-center px-4 py-3 rounded-3xl shadow-2xl backdrop-blur-xl border ${isDark ? 'bg-[#161B22]/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
          <button onClick={() => setActiveTab('matrix')} className={`text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'matrix' ? 'text-emerald-500' : 'text-slate-400'}`}>
            <LayoutDashboard className="w-4 h-4" /> <span>Задачи</span>
          </button>
          <button onClick={() => setActiveTab('processes')} className={`text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'processes' ? 'text-emerald-500' : 'text-slate-400'}`}>
            <Bot className="w-4 h-4" /> <span>Ассистент</span>
          </button>
          
          <button onClick={() => openTaskModal()} className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-600/30 active:scale-90 transition-transform">
            <Plus className="w-6 h-6" />
          </button>

          {isTeamMode ? (
            <button onClick={() => setActiveTab('team')} className={`text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'team' ? 'text-emerald-500' : 'text-slate-400'}`}>
              <Users className="w-4 h-4" /> <span>Команда</span>
            </button>
          ) : (
            <button onClick={() => setActiveTab('archive')} className={`text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'archive' ? 'text-emerald-500' : 'text-slate-400'}`}>
              <FolderArchive className="w-4 h-4" /> <span>Архив</span>
            </button>
          )}

          {isTeamMode && (
            <button onClick={() => setActiveTab('kpi')} className={`text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'kpi' ? 'text-emerald-500' : 'text-slate-400'}`}>
              <BarChart3 className="w-4 h-4" /> <span>Сводка</span>
            </button>
          )}
        </div>
      </div>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        <header className="flex justify-between items-center mb-6 pt-2">
          <div>
            <h2 className={`text-xl font-black ${textMain}`}>
              {isTeamMode ? 'Командная доска' : 'Личное пространство'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{isTeamMode ? 'Управление процессами и сотрудниками' : 'Фокус на личных задачах'}</p>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 text-base">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </header>

        {/* ВКЛАДКА: ЗАДАЧИ */}
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-emerald-50/50 border-emerald-100'}`}>
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-900'}`}>
                  <Sparkles className="w-3.5 h-3.5" /> Умный Агент
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Автоматически находит неполные задачи и составляет подробный план.</p>
              </div>
              <button onClick={handleRunAIAgent} disabled={isAgentRunning} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-emerald-600/20">
                {isAgentRunning ? 'Запуск...' : 'Запустить Агента'}
              </button>
            </div>

            <div className={`grid grid-cols-1 ${isTeamMode ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
              <TaskColumn title={t('colTodo')} colorClass="bg-slate-400" tasks={todoTasks} isTeamMode={isTeamMode} isDark={isDark} t={t} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />
              <TaskColumn title={t('colInProgress')} colorClass="bg-blue-500" tasks={inProgressTasks} isTeamMode={isTeamMode} isDark={isDark} t={t} onSelectTask={openTaskModal} onQuickMove={handleQuickMove} />
              
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
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all ${processRole === opt.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-200 dark:border-white/5 opacity-70'}`}
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
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                {isProcessGenerating ? 'Обработка запроса...' : 'Отправить запрос'}
              </button>
            </div>

            {processMessages.length > 0 && (
              <div className="space-y-4">
                {processMessages.map((msg, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border text-sm ${msg.role === 'user' ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-300 ml-6' : `${cardBg} mr-6`}`}>
                    <div className="font-bold text-xs mb-2 opacity-60 flex items-center gap-1.5">
                      {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-emerald-500" />}
                      {msg.role === 'user' ? 'Ваш запрос' : 'Ответ Ассистента'}
                    </div>
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
                  <button onClick={handleFollowUpProcess} disabled={isProcessGenerating} className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1">
                    <Send className="w-3 h-3" /> Отправить
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ВКЛАДКА: КОМАНДА */}
        {activeTab === 'team' && isTeamMode && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className={`p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${cardBg}`}>
              <div>
                <h3 className={`text-base font-bold ${textMain}`}>Команда и доступы</h3>
                <p className="text-xs text-slate-400 mt-1">Управление составом команды и ролями пользователей.</p>
              </div>
              <button 
                onClick={() => setIsInviteOpen(true)} 
                className="flex items-center gap-1.5 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" /> Пригласить сотрудника
              </button>
            </div>

            <div className="space-y-3">
              {assistants.map(ast => (
                <div key={ast.id} className={`p-4 rounded-2xl border flex justify-between items-center ${cardBg}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
                      {ast.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm flex items-center gap-1.5 ${textMain}`}>
                        {ast.name} {ast.id === 'manager' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {ast.position ? `${ast.position} • ` : ''}{ast.email || 'Владелец аккаунта'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-slate-500/10 text-slate-400">
                    {ast.role === 'manager' || ast.id === 'manager' ? 'Руководитель' : 'Исполнитель'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА: СВОДКА */}
        {activeTab === 'kpi' && isTeamMode && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className={`p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${cardBg}`}>
              <div>
                <h3 className={`text-base font-bold ${textMain}`}>Сводка для руководителя</h3>
                <p className="text-xs text-slate-400 mt-1">Автоматический ИИ-анализ эффективности и рисков компании.</p>
              </div>
              <button onClick={handleGenerateTeamReport} disabled={isGeneratingReport} className="px-5 py-3 bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20">
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
                  <button onClick={() => handleQuickMove(task.id, 'todo')} className="text-xs font-bold text-emerald-400 hover:underline">Восстановить</button>
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
              <button onClick={closeModal} className="text-slate-400 text-lg font-bold hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Название задачи</label>
                <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Что нужно сделать?" required className={`w-full p-3.5 rounded-xl outline-none border text-sm font-medium ${inputBg}`} />
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => handleTaskAI('expand')} disabled={isTaskGenerating} className="flex-1 py-2 rounded-lg bg-slate-500/10 text-xs font-bold flex items-center justify-center gap-1"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Расписать ИИ</button>
                  <button type="button" onClick={() => handleTaskAI('decompose')} disabled={isTaskGenerating} className="flex-1 py-2 rounded-lg bg-slate-500/10 text-xs font-bold flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Чек-лист ИИ</button>
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
                <button type="button" onClick={() => setNewUrgent(!newUrgent)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${newUrgent ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}>
                  <Flame className="w-3.5 h-3.5" /> Срочно
                </button>
                <button type="button" onClick={() => setNewImportant(!newImportant)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${newImportant ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}>
                  <Gem className="w-3.5 h-3.5" /> Важно
                </button>
              </div>

              {isTeamMode && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Исполнитель</label>
                  <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className={`w-full p-3 rounded-xl outline-none border text-xs ${inputBg}`}>
                    {assistants.map(a => <option key={a.id} value={a.id}>{a.name} ({a.position || 'Сотрудник'})</option>)}
                  </select>
                </div>
              )}

              <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20">
                Сохранить задачу
              </button>

              {selectedTask && (
                <button type="button" onClick={() => handleDeleteTask(selectedTask.id)} className="w-full py-2 text-xs font-bold text-red-400 hover:underline text-center flex items-center justify-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Удалить задачу
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ПРИГЛАШЕНИЯ СОТРУДНИКА */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${cardBg}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-base font-bold ${textMain}`}>Пригласить сотрудника</h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-slate-400 font-bold"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleInviteColleague} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email сотрудника</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" required className={`w-full p-3.5 rounded-xl outline-none border text-xs ${inputBg}`} autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Должность</label>
                <input type="text" value={invitePosition} onChange={(e) => setInvitePosition(e.target.value)} placeholder="Например: Дизайнер, Копирайтер" className={`w-full p-3.5 rounded-xl outline-none border text-xs ${inputBg}`} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Роль</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={`w-full p-3.5 rounded-xl outline-none border text-xs ${inputBg}`}>
                  <option value="worker">Исполнитель (Свои задачи)</option>
                  <option value="manager">Руководитель (Полный доступ)</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20">
                Отправить приглашение
              </button>
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
                  className={`w-full p-3 rounded-xl border text-xs font-bold text-left ${onboardTeam === size ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-200 dark:border-white/10'}`}
                >
                  {size}
                </button>
              ))}
            </div>

            <button onClick={handleSaveSettings} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20">
              Сохранить
            </button>
          </div>
        </div>
      )}

    </div>
  );
}