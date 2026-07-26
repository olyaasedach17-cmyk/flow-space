import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// 🌍 СЛОВАРЬ ПЕРЕВОДОВ
const translations = {
  en: {
    loginTitle: 'Premium Enterprise Workspace', signIn: 'Sign In', createAccount: 'Create Account', contGoogle: 'Continue with Google',
    board: 'Task Board', analytics: 'Analytics & SLA', capacityTab: 'Team Capacity', payrollTab: 'Payroll', playbooksTab: 'Playbooks',
    taskInput: 'Task title...', docLink: 'Doc Link (URL)', hours: 'Est. Hours', urgent: 'Urgent', important: 'Important',
    createBtn: 'Create Task ↵', focus: 'Focus Queue', review: 'Pending Review', critical: 'Critical', strategy: 'Strategy',
    operations: 'Operations', backlog: 'Backlog', plan: 'Plan:', fact: 'Fact:', approve: 'Approve', reject: 'Reject', pending: 'Pending',
    start: 'Start', pause: 'Pause', delegate: 'Delegate', edit: 'Edit', del: 'Del', doc: 'Doc', hideArc: 'Hide Completed', showArc: 'Show Completed Log',
    empty: 'No active tasks', emptyArc: 'No records', profile: 'Workspace Account', theme: 'Appearance', langMenu: 'Language',
    upgrade: 'Upgrade Plan', logout: 'Sign out', slaIndex: 'SLA Index', timeSaved: 'Time Saved', hrs: 'hrs', overdue: 'Overdue:', due: 'Due:',
    returnReason: 'Return reason:', myTasks: 'My Tasks', proTitle: 'Upgrade to PRO', proClose: 'Close',
    proF1: 'Unlimited team members', proF2: 'Advanced workload analytics', proF3: 'Telegram bot integration', proF4: 'Financial & payroll modules',
    proNote: 'PRO features are currently in closed beta. Contact your IT integrator.', proBtn: 'Acknowledge', weight: 'Weight', impact: 'Impact',
    workload: 'Current Workload', maxCapacity: 'Max Weekly Capacity: 40h', overload: 'Overloaded', availableHours: 'Available',
    salaryCalc: 'Salary Calculator', baseRate: 'Base Rate', slaBonus: 'SLA Performance Bonus', totalPayout: 'Estimated Payout', exportCsv: 'Export Payroll',
    sopLibrary: 'Standard Operating Procedures', sopMarketing: 'Marketing Guidelines', sopSales: 'Sales Playbook', sopSupport: 'Customer Support SLA',
    proLockedTitle: 'Unlock Advanced PRO Features', proLockedDesc: 'Gain deep insights, automate financial calculations, and centralize SOPs by upgrading to PRO.', activatePro: 'Activate PRO Tier',
    delTitle: 'Delete Task', delReason: 'Reason for deletion (for log):', selectEmp: 'Select employee...',
    toggleToReg: 'No account? Create one', toggleToLogin: 'Already have an account? Sign in'
  },
  ru: {
    loginTitle: 'Корпоративная система', signIn: 'Войти', createAccount: 'Создать аккаунт', contGoogle: 'Войти через Google',
    board: 'Кросс-борд', analytics: 'Аналитика и SLA', capacityTab: 'Загрузка', payrollTab: 'Финансы', playbooksTab: 'Регламенты',
    taskInput: 'Название задачи...', docLink: 'Ссылка на док-т (URL)', hours: 'Оценка (часы)', urgent: 'Срочно', important: 'Важно',
    createBtn: 'Создать задачу ↵', focus: 'Фокус дня', review: 'Ждут проверки', critical: 'Критично', strategy: 'Стратегия',
    operations: 'Операционка', backlog: 'Бэклог', plan: 'План:', fact: 'Факт:', approve: 'Принять', reject: 'Вернуть', pending: 'Ожидает',
    start: 'Начать', pause: 'Пауза', delegate: 'Передать', edit: 'Изменить', del: 'Удалить', doc: 'Док', hideArc: 'Скрыть архив', showArc: 'Показать архив',
    empty: 'Нет задач', emptyArc: 'Нет записей', profile: 'Учетная запись', theme: 'Оформление', langMenu: 'Язык (Language)',
    upgrade: 'Тариф PRO', logout: 'Выйти', slaIndex: 'Индекс SLA', timeSaved: 'Сэкономлено', hrs: 'час', overdue: 'Просрочено:', due: 'Дедлайн:',
    returnReason: 'Причина возврата:', myTasks: 'Мои задачи', proTitle: 'Продвинутые возможности PRO', proClose: 'Закрыть',
    proF1: 'Неограниченное число сотрудников', proF2: 'Аналитика загрузки команды', proF3: 'Интеграция с Telegram-ботом', proF4: 'Финансовый модуль',
    proNote: 'Тариф PRO находится в закрытом бета-тестировании. Для активации обратитесь к разработчику платформы.', proBtn: 'Отлично, понятно',
    weight: 'Вес', impact: 'Влияние', workload: 'Текущая загрузка', maxCapacity: 'Норма в неделю: 40ч', overload: 'Перегруз', availableHours: 'Свободно',
    salaryCalc: 'Расчет выплат', baseRate: 'Базовая ставка', slaBonus: 'SLA Бонус / Штраф', totalPayout: 'Итого к выплате', exportCsv: 'Скачать ведомость',
    sopLibrary: 'База знаний и регламенты', sopMarketing: 'Маркетинг и PR', sopSales: 'Скрипты продаж', sopSupport: 'Правила поддержки клиентов',
    proLockedTitle: 'Активация продвинутых PRO функций', proLockedDesc: 'Получите доступ к глубокой аналитике, автоматизации финансов и базе знаний при переходе на тариф PRO.', activatePro: 'Активировать Тариф PRO',
    delTitle: 'Удаление задачи', delReason: 'Укажите причину удаления (для истории):', selectEmp: 'Выберите сотрудника...',
    toggleToReg: 'Нет аккаунта? Зарегистрироваться', toggleToLogin: 'Уже есть аккаунт? Войти'
  }
};

const defaultKpis = [
  { id: 1, name: 'Соблюдение SLA (Сроки)', weight: 35, type: 'percent', max: 100, score: 85, desc: 'Задачи закрываются строго до дедлайна, без просрочек.' },
  { id: 2, name: 'Точность исполнения', weight: 25, type: 'percent', max: 100, score: 90, desc: 'Работа выполняется без ошибок, не требует возврата на доработку.' },
  { id: 3, name: 'Инициативность', weight: 20, type: 'points5', max: 5, score: 4, desc: 'Сотрудник предлагает решения проблем, а не только задает вопросы.' },
];

const getControlLevels = (lang) => [
  { value: 0, label: lang === 'ru' ? 'Не задан' : 'Not set' },
  { value: 1, label: lang === 'ru' ? 'Ур. 1: Микроменеджмент' : 'L1: Micromanagement' },
  { value: 2, label: lang === 'ru' ? 'Ур. 2: Промежуточный срез' : 'L2: Milestones' },
  { value: 3, label: lang === 'ru' ? 'Ур. 3: Контроль по вехам' : 'L3: Key Points' },
  { value: 4, label: lang === 'ru' ? 'Ур. 4: Полное доверие' : 'L4: Full Trust' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false); // По умолчанию регистрация
  const [authError, setAuthError] = useState('');

  const [role, setRole] = useState(null); 
  const [employeeLink, setEmployeeLink] = useState(null); 
  const [docData, setDocData] = useState(null);
  const [currentAssistantId, setCurrentAssistantId] = useState(null);
  
  const [activeTab, setActiveTab] = useState('matrix');
  const [showArchive, setShowArchive] = useState(false);

  const [isDark, setIsDark] = useState(() => localStorage.getItem('flowspace_theme') === 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('flowspace_lang') || 'ru');
  const t = (key) => translations[lang][key] || key;

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  
  // СОСТОЯНИЕ ДЛЯ АДМИНКИ
  const [clientEmailToUpgrade, setClientEmailToUpgrade] = useState('');

  const [deleteModalTask, setDeleteModalTask] = useState(null); 
  const [deleteReason, setDeleteReason] = useState(''); 
  const [delegateModal, setDelegateModal] = useState({ isOpen: false, task: null, targetId: '', controlLevel: 0 });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, taskId: null, reason: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, task: null, text: '', urgent: false, important: false, link: '', deadline: '', hours: '', recurrence: 'none', subtasks: [], newSubtask: '' });

  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(false);
  const [newAssignee, setNewAssignee] = useState(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [newRateValue, setNewRateValue] = useState('');
  const [editingRates, setEditingRates] = useState({}); 
  const [rateValues, setRateValues] = useState({});

  // ⚠️ ВАЖНО: Впиши сюда свою почту, под которой ты зарегистрирована!
  const isSuperAdmin = user?.email?.toLowerCase() === 'olyaasedach17@gmail.com';

  useEffect(() => { 
    localStorage.setItem('flowspace_theme', isDark ? 'dark' : 'light');
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);
  useEffect(() => { localStorage.setItem('flowspace_lang', lang); }, [lang]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setDocData(null); setRole(null); return; }
    let unsubscribe = () => {};

    getDoc(doc(db, 'employee_links', user.email.toLowerCase())).then(linkSnap => {
      if (linkSnap.exists()) {
        setRole('employee');
        const linkData = linkSnap.data();
        setEmployeeLink(linkData);
        setCurrentAssistantId(String(linkData.assistantId)); 
        unsubscribe = onSnapshot(doc(db, 'users', linkData.managerUid), (docSnap) => {
          if (docSnap.exists()) setDocData(docSnap.data());
        });
      } else {
        setRole('manager');
        const docRef = doc(db, 'users', user.uid);
        setDoc(docRef, { email: user.email.toLowerCase() }, { merge: true });
        
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            let data = docSnap.data();
            const legacyTasks = data.tasks || [];
            const legacyArchive = data.archive || [];
            const legacyDeletedArchive = data.deletedArchive || []; 
            
          // Добавляем тестовых сотрудников, если список пуст (только 1 менеджер или вообще никого)
            if (!data.assistants || data.assistants.length <= 1) {
              const fake1Id = 'test_emp_1';
              const fake2Id = 'test_emp_2';
              const newAssistants = [
                { id: 'manager', name: '👑' },
                { id: fake1Id, name: '👨‍💻 Иван (Тест)', email: 'ivan@test.com' },
                { id: fake2Id, name: '👩‍🎨 Анна (Тест)', email: 'anna@test.com' }
              ];
              const newWorkspaces = { 
                ...(data.workspaces || {}), 
                'manager': data.workspaces?.['manager'] || { tasks: legacyTasks, archive: legacyArchive, deletedArchive: legacyDeletedArchive, kpis: defaultKpis, savedTime: 0, baseRate: 2500 },
                [fake1Id]: { tasks: [], archive: [], deletedArchive: [], kpis: defaultKpis, savedTime: 0, baseRate: 2000 },
                [fake2Id]: { tasks: [], archive: [], deletedArchive: [], kpis: defaultKpis, savedTime: 0, baseRate: 2200 }
              };
              setDoc(docRef, { assistants: newAssistants, workspaces: newWorkspaces }, { merge: true });
              data = { ...data, assistants: newAssistants, workspaces: newWorkspaces };
            }
            setDocData(data);
            setCurrentAssistantId(prev => prev ? String(prev) : 'manager');
          } else {
            setDoc(docRef, {
              email: user.email.toLowerCase(),
              assistants: [{ id: 'manager', name: '👑' }],
              workspaces: { 'manager': { tasks: [], archive: [], deletedArchive: [], kpis: defaultKpis, savedTime: 0, baseRate: 2500 } }
            });
          }
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault(); setAuthError('');
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) { setAuthError('Ошибка: ' + error.message); }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      // Проверяем, мобильное ли это устройство
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // На телефоне делаем редирект (перенаправление)
        await signInWithRedirect(auth, googleProvider);
      } else {
        // На компьютере оставляем всплывающее окно
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) { 
      setAuthError('Ошибка Google: ' + error.message); 
    }
  };

  const themeBg = isDark ? 'bg-[#0E1116] text-slate-200' : 'bg-[#F8FAFC] text-slate-800';
  const cardBg = isDark ? 'bg-[#161B22] border border-white/5 shadow-2xl shadow-black/40' : 'bg-white border border-slate-200/60 shadow-sm shadow-slate-200/40';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-[#0E1116] border border-white/10 text-white focus:border-slate-500 focus:ring-1 focus:ring-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900';
  const btnPrimary = isDark ? 'bg-white text-slate-900 hover:bg-slate-200 shadow-md' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md';

  const globalFontStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    body { font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .dark ::-webkit-scrollbar-thumb { background: #334155; }
    input[type=range] { -webkit-appearance: none; background: transparent; width: 100%; }
    input[type=range]:focus { outline: none; }
    input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #e2e8f0; border-radius: 2px; }
    .dark input[type=range]::-webkit-slider-runnable-track { background: #334155; }
    input[type=range]::-webkit-slider-thumb { height: 16px; width: 16px; border-radius: 50%; background: #0f172a; cursor: pointer; -webkit-appearance: none; margin-top: -6px; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: transform 0.1s; }
    input[type=range]::-webkit-slider-thumb:active { transform: scale(1.2); }
    .dark input[type=range]::-webkit-slider-thumb { background: #fff; border: 2px solid #161B22; }
  `;

  if (!user) return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${themeBg}`}>
      <style>{globalFontStyles}</style>
      <div className={`p-8 rounded-3xl max-w-md w-full ${cardBg}`}>
        <div className="flex justify-center mb-6">
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
              <span className="font-black text-2xl">FS</span>
           </div>
        </div>
        <h1 className={`text-2xl font-black text-center mb-2 tracking-tight ${textMain}`}>Flow Space</h1>
        <p className={`text-center mb-8 text-sm font-medium ${textMuted}`}>{t('loginTitle')}</p>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={`w-full px-4 py-3.5 rounded-xl outline-none transition-all ${inputBg}`} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className={`w-full px-4 py-3.5 rounded-xl outline-none transition-all ${inputBg}`} />
          {authError && <p className="text-red-500 text-sm font-bold text-center">{authError}</p>}
          <button type="submit" className={`w-full font-bold py-4 rounded-xl transition-all active:scale-[0.98] ${btnPrimary}`}>{isLogin ? t('signIn') : t('createAccount')}</button>
        </form>
        <div className="mt-5 text-center">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className={`text-sm font-semibold transition-colors border-b border-transparent hover:border-current ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
            {isLogin ? t('toggleToReg') : t('toggleToLogin')}
          </button>
        </div>
        <div className="mt-4 flex gap-2">
            <button type="button" onClick={handleGoogleSignIn} className={`flex-1 font-bold py-4 rounded-xl transition-all border ${isDark ? 'bg-transparent border-white/10 hover:bg-white/5 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>{t('contGoogle')}</button>
            <button type="button" onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} className={`px-4 font-bold rounded-xl transition-all border ${isDark ? 'bg-transparent border-white/10 hover:bg-white/5 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>{lang.toUpperCase()}</button>
        </div>
      </div>
    </div>
  );

  if (!docData || !currentAssistantId || !role) return <div className={`min-h-screen flex items-center justify-center font-bold tracking-widest uppercase text-sm ${themeBg}`}>Loading Workspace...</div>;

  const sCurrentId = String(currentAssistantId);
  const currentWorkspace = docData.workspaces?.[sCurrentId] || {};
  const tasks = currentWorkspace.tasks || [];
  const archive = currentWorkspace.archive || [];
  const deletedArchive = currentWorkspace.deletedArchive || []; 
  const kpis = currentWorkspace.kpis || defaultKpis;
  const savedTime = currentWorkspace.savedTime || 0;
  const baseRate = currentWorkspace.baseRate !== undefined ? currentWorkspace.baseRate : 2500;

  const isPro = docData?.isPremium === true;

  const updateWorkspace = (newData) => {
    const targetUid = role === 'employee' ? employeeLink.managerUid : user.uid;
    setDoc(doc(db, 'users', targetUid), { workspaces: { ...docData.workspaces, [sCurrentId]: { ...currentWorkspace, ...newData } } }, { merge: true });
  };

  const handleAddAssistant = async () => {
    const name = window.prompt('Имя / Name:');
    if (!name) return;
    const empEmail = window.prompt('Email:');
    if (!empEmail) return;
    const newId = Date.now().toString();
    await setDoc(doc(db, 'employee_links', empEmail.trim().toLowerCase()), { managerUid: user.uid, assistantId: newId, name: name.trim() });
    await setDoc(doc(db, 'users', user.uid), {
      assistants: [...docData.assistants, { id: newId, name: name.trim(), email: empEmail.trim().toLowerCase() }],
      workspaces: { ...docData.workspaces, [newId]: { tasks: [], archive: [], deletedArchive: [], kpis: defaultKpis, savedTime: 0, baseRate: 2500 } }
    }, { merge: true });
    setCurrentAssistantId(newId);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    const input = e.target.elements.taskInput.value;
    const link = e.target.elements.linkInput.value;
    const deadline = e.target.elements.deadlineInput.value;
    const hours = parseFloat(e.target.elements.hoursInput.value) || 0;
    
    // Берем выбранного по кнопке сотрудника, а если не нажали — оставляем текущего
    const assigneeId = newAssignee || sCurrentId;
    
    if (!input.trim()) return;
    
    const newTask = { id: Date.now(), text: input, urgent: newUrgent, important: newImportant, controlLevel: 0, status: 'pending', link: link.trim(), deadline: deadline, estimatedHours: hours, recurrence: 'none', rejectReason: null, isFocus: false, subtasks: [], timerState: 'idle', elapsedTime: 0, lastStartTime: null };

    if (assigneeId === sCurrentId) {
      updateWorkspace({ tasks: [newTask, ...tasks] });
    } else {
      const targetWorkspace = docData.workspaces?.[assigneeId] || { tasks: [], archive: [], deletedArchive: [], kpis: defaultKpis, savedTime: 0, baseRate: 2500 };
      setDoc(doc(db, 'users', user.uid), {
        workspaces: { ...docData.workspaces, [assigneeId]: { ...targetWorkspace, tasks: [newTask, ...(targetWorkspace.tasks || [])] } }
      }, { merge: true });
    }
    
    e.target.reset(); setNewUrgent(false); setNewImportant(false); setNewAssignee(null);
  };

  const handleGrantProToClient = async () => {
    if (!clientEmailToUpgrade) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', clientEmailToUpgrade.toLowerCase().trim()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert('Пользователь не найден! Убедись, что клиент уже зарегистрировался.');
        return;
      }
      snapshot.forEach(async (docSnap) => {
        await setDoc(doc(db, 'users', docSnap.id), { isPremium: true }, { merge: true });
      });
      alert(`PRO-доступ успешно выдан аккаунту: ${clientEmailToUpgrade}`);
      setClientEmailToUpgrade('');
    } catch (error) {
      alert('Ошибка при выдаче доступа: ' + error.message);
    }
  };

  const handleToggleTimer = (task) => {
    let newElapsedTime = task.elapsedTime || 0;
    let newTimerState = task.timerState;
    let newStartTime = task.lastStartTime;
    if (task.timerState === 'running') { newElapsedTime += (Date.now() - task.lastStartTime); newTimerState = 'idle'; newStartTime = null; } 
    else { newTimerState = 'running'; newStartTime = Date.now(); }
    updateWorkspace({ tasks: tasks.map(t => String(t.id) === String(task.id) ? { ...t, timerState: newTimerState, elapsedTime: newElapsedTime, lastStartTime: newStartTime } : t) });
  };

  const handleToggleFocus = (id) => updateWorkspace({ tasks: tasks.map(t => String(t.id) === String(id) ? { ...t, isFocus: !t.isFocus } : t) });
  const handleToggleSubtask = (taskId, subtaskId) => updateWorkspace({ tasks: tasks.map(t => { if (String(t.id) === String(taskId)) return { ...t, subtasks: t.subtasks.map(st => String(st.id) === String(subtaskId) ? { ...st, done: !st.done } : st) }; return t; }) });
  
  const handleSendToReview = (id) => {
    const task = tasks.find(t => String(t.id) === String(id));
    let finalElapsed = task.elapsedTime || 0;
    if (task.timerState === 'running') finalElapsed += (Date.now() - task.lastStartTime);
    updateWorkspace({ tasks: tasks.map(t => String(t.id) === String(id) ? { ...t, status: 'review', rejectReason: null, timerState: 'idle', elapsedTime: finalElapsed, lastStartTime: null } : t) });
  };

  const handleApprove = (id) => {
    const task = tasks.find(t => String(t.id) === String(id));
    if (!task) return;
    const newArchiveTask = { ...task, status: 'done', completedAt: `${new Date().toLocaleDateString('ru-RU')} в ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` };
    const hoursAdded = parseFloat(task.estimatedHours) || 0;
    updateWorkspace({ archive: [newArchiveTask, ...archive], tasks: tasks.filter(t => String(t.id) !== String(id)), savedTime: savedTime + hoursAdded });
  };

  const openRejectModal = (id) => setRejectModal({ isOpen: true, taskId: id, reason: '' });
  const confirmReject = () => {
    if (!rejectModal.taskId || !rejectModal.reason.trim()) return;
    updateWorkspace({ tasks: tasks.map(t => String(t.id) === String(rejectModal.taskId) ? { ...t, status: 'pending', rejectReason: rejectModal.reason.trim() } : t) });
    setRejectModal({ isOpen: false, taskId: null, reason: '' });
  };

  const handleConfirmDelete = () => {
    if (!deleteModalTask || !deleteReason.trim()) return;
    updateWorkspace({
      deletedArchive: [{ ...deleteModalTask, deletedAt: `${new Date().toLocaleDateString('ru-RU')} в ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`, reason: deleteReason.trim() }, ...deletedArchive],
      tasks: tasks.filter(t => String(t.id) !== String(deleteModalTask.id))
    });
    setDeleteModalTask(null); setDeleteReason('');
  };

  const openEditModal = (task) => setEditModal({ isOpen: true, task, text: task.text, urgent: task.urgent, important: task.important, link: task.link || '', deadline: task.deadline || '', hours: task.estimatedHours || '', recurrence: task.recurrence || 'none', subtasks: task.subtasks || [], newSubtask: '' });
  const saveEdit = () => {
    if (!editModal.text.trim()) return;
    updateWorkspace({ tasks: tasks.map(t => String(t.id) === String(editModal.task.id) ? { ...t, text: editModal.text, urgent: editModal.urgent, important: editModal.important, link: editModal.link, deadline: editModal.deadline, estimatedHours: parseFloat(editModal.hours) || 0, recurrence: editModal.recurrence, subtasks: editModal.subtasks } : t) });
    setEditModal({ isOpen: false, task: null, text: '', urgent: false, important: false, link: '', deadline: '', hours: '', recurrence: 'none', subtasks: [], newSubtask: '' });
  };

  const openDelegateModal = (task) => setDelegateModal({ isOpen: true, task, targetId: '', controlLevel: task.controlLevel > 0 ? task.controlLevel : 1 });
  const confirmDelegate = () => {
    const { task, targetId, controlLevel } = delegateModal;
    if (!targetId) return;
    const sourceWorkspace = docData.workspaces?.[sCurrentId] || {};
    const targetWorkspace = docData.workspaces?.[targetId] || {};
    setDoc(doc(db, 'users', user.uid), {
      workspaces: { ...docData.workspaces, [sCurrentId]: { ...sourceWorkspace, tasks: (sourceWorkspace.tasks || []).filter(t => String(t.id) !== String(task.id)) }, [targetId]: { ...targetWorkspace, tasks: [{ ...task, id: Date.now(), controlLevel, status: 'pending' }, ...(targetWorkspace.tasks || [])] } }
    }, { merge: true });
    setDelegateModal({ isOpen: false, task: null, targetId: '', controlLevel: 0 });
  };

  const handleScoreChange = (id, newScore) => updateWorkspace({ kpis: kpis.map(k => String(k.id) === String(id) ? { ...k, score: Number(newScore) } : k) });
  
  const handleSaveRate = () => {
    const newNum = parseFloat(newRateValue);
    if (!isNaN(newNum) && newNum >= 0) updateWorkspace({ baseRate: newNum });
    setIsEditingRate(false);
  };

  const handleSaveAssistantRate = (astId) => {
    const newNum = parseFloat(rateValues[astId]);
    if (!isNaN(newNum) && newNum >= 0) {
      const astWorkspace = docData.workspaces?.[astId] || {};
      setDoc(doc(db, 'users', user.uid), {
        workspaces: { ...docData.workspaces, [astId]: { ...astWorkspace, baseRate: newNum } }
      }, { merge: true });
    }
    setEditingRates(prev => ({ ...prev, [astId]: false }));
  };

  const totalEfficiency = kpis.reduce((sum, kpi) => sum + ((kpi.score / kpi.max) * kpi.weight), 0).toFixed(1);
  const pendingTasks = tasks.filter(t => t.status !== 'review');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const focusTasks = pendingTasks.filter(t => t.isFocus);
  
  const totalPendingHours = pendingTasks.reduce((acc, task) => acc + (parseFloat(task.estimatedHours) || 0), 0);
  const maxCapacity = 40;
  const capacityPercent = Math.min((totalPendingHours / maxCapacity) * 100, 100);
  const capacityColor = totalPendingHours > maxCapacity ? 'bg-red-500' : (totalPendingHours > 30 ? 'bg-amber-500' : 'bg-emerald-500');

  const payoutMultiplier = totalEfficiency / 100;
  const totalPayout = baseRate * payoutMultiplier;

  const ProLock = () => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8">
       <div className={`p-5 rounded-full mb-6 border ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200 shadow-lg'}`}>
          <span className="text-5xl">🔒</span>
       </div>
       <h3 className={`text-2xl font-black text-center mb-2 tracking-tight ${textMain}`}>{t('proLockedTitle')}</h3>
       <p className={`text-sm text-center mb-8 max-w-sm font-medium ${textMuted}`}>{t('proLockedDesc')}</p>
       <button onClick={() => setIsProModalOpen(true)} className={`px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95 ${btnPrimary}`}>
         {t('activatePro')}
       </button>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans pb-24 animate-in fade-in transition-colors duration-300 ${themeBg}`}>
      <style>{globalFontStyles}</style>
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        <header className="flex justify-between items-center mt-2 mb-10">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                <span className="font-black text-xl">FS</span>
             </div>
             <h1 className={`text-xl md:text-2xl font-black tracking-tight ${textMain}`}>Flow Space</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {role === 'manager' && (
              <>
                <div className={`hidden md:flex items-center rounded-xl p-1 border ${isDark ? 'bg-[#161B22] border-white/10' : 'bg-white border-slate-200'}`}>
                  <select value={sCurrentId} onChange={(e) => setCurrentAssistantId(e.target.value)} className={`min-w-[150px] pl-3 pr-8 py-1.5 bg-transparent font-semibold text-sm outline-none appearance-none cursor-pointer ${textMain}`}>
                    {docData.assistants.map(a => <option key={String(a.id)} value={String(a.id)} className={isDark ? 'text-slate-900' : ''}>{a.id === 'manager' ? `${a.name} (${t('myTasks')})` : a.name}</option>)}
                  </select>
                </div>
                <button onClick={handleAddAssistant} className={`w-9 h-9 rounded-lg font-bold flex items-center justify-center border transition-all hover:scale-105 ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}>+</button>
              </>
            )}
            
            <div className="relative">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`w-10 h-10 rounded-full font-black text-sm flex items-center justify-center border transition-transform hover:scale-105 ${isDark ? 'bg-[#161B22] border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'}`}>
                {user.email.charAt(0).toUpperCase()}
              </button>
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                  <div className={`absolute right-0 mt-3 w-72 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in slide-in-from-top-2 ${cardBg}`}>
                    <div className={`p-5 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                       <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('profile')}</p>
                       <p className={`font-bold truncate mt-1 text-sm ${textMain}`}>{user.email}</p>
                    </div>
                    
                    {/* ПАНЕЛЬ СОЗДАТЕЛЯ (ВИДНА ТОЛЬКО ТЕБЕ) */}
                    {isSuperAdmin && (
                      <div className={`p-3 border-b ${isDark ? 'border-white/5 bg-amber-500/10' : 'border-slate-100 bg-amber-50'}`}>
                         <p className="text-[10px] font-black uppercase text-amber-500 mb-2">💎 Панель Создателя</p>
                         <input 
                           type="email" 
                           value={clientEmailToUpgrade} 
                           onChange={e => setClientEmailToUpgrade(e.target.value)}
                           placeholder="Email клиента..." 
                           className={`w-full px-2 py-1.5 text-xs rounded outline-none mb-2 ${isDark ? 'bg-[#161B22] text-white border border-white/20' : 'bg-white text-slate-900 border border-slate-300'}`}
                         />
                         <button onClick={handleGrantProToClient} className="w-full bg-amber-500 text-white font-bold text-xs py-2 rounded hover:bg-amber-400 transition-colors">
                           Выдать PRO
                         </button>
                      </div>
                    )}

                    <div className="p-2 space-y-1">
                       <button onClick={() => setIsDark(!isDark)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}>
                         <span className="flex items-center gap-3"><span className="opacity-70">{t('theme')}</span></span>
                         <span className="text-xs font-bold border px-2 py-1 rounded-md bg-opacity-50 border-opacity-20">{isDark ? 'Dark' : 'Light'}</span>
                       </button>
                       <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}>
                         <span className="flex items-center gap-3"><span className="opacity-70">🌐 {t('langMenu')}</span></span>
                         <span className="text-xs font-bold border px-2 py-1 rounded-md bg-opacity-50 border-opacity-20">{lang.toUpperCase()}</span>
                       </button>
                       <button onClick={() => {setIsProModalOpen(true); setIsProfileOpen(false);}} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}>
                         <span className="flex items-center gap-3"><span className="opacity-70">{t('upgrade')}</span></span>
                         <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${isDark ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>PRO</span>
                       </button>
                    </div>
                    <div className={`p-2 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                       <button onClick={() => {signOut(auth); setIsProfileOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}>
                         {t('logout')}
                       </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex justify-start mb-8 border-b border-opacity-20 border-slate-500 overflow-x-auto whitespace-nowrap scrollbar-hide pb-2">
          <div className="flex gap-6 px-1">
            <button onClick={() => setActiveTab('matrix')} className={`pb-2 font-semibold text-sm transition-all border-b-2 ${activeTab === 'matrix' ? (isDark ? 'border-white text-white' : 'border-slate-900 text-slate-900') : 'border-transparent text-slate-400 hover:text-slate-500'}`}>{t('board')}</button>
            <button onClick={() => setActiveTab('kpi')} className={`pb-2 font-semibold text-sm transition-all border-b-2 ${activeTab === 'kpi' ? (isDark ? 'border-white text-white' : 'border-slate-900 text-slate-900') : 'border-transparent text-slate-400 hover:text-slate-500'}`}>{t('analytics')}</button>
            
            {/* Ограничиваем просмотр этих вкладок для сотрудников (видят только Менеджеры) */}
            {role === 'manager' && (
              <>
                <button onClick={() => setActiveTab('capacity')} className={`pb-2 font-semibold text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'capacity' ? (isDark ? 'border-white text-white' : 'border-slate-900 text-slate-900') : 'border-transparent text-slate-400 hover:text-slate-500'}`}>
                    {t('capacityTab')} <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${isDark ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>PRO</span>
                </button>
                <button onClick={() => setActiveTab('payroll')} className={`pb-2 font-semibold text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'payroll' ? (isDark ? 'border-white text-white' : 'border-slate-900 text-slate-900') : 'border-transparent text-slate-400 hover:text-slate-500'}`}>
                    {t('payrollTab')} <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${isDark ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>PRO</span>
                </button>
              </>
            )}

            <button onClick={() => setActiveTab('playbooks')} className={`pb-2 font-semibold text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'playbooks' ? (isDark ? 'border-white text-white' : 'border-slate-900 text-slate-900') : 'border-transparent text-slate-400 hover:text-slate-500'}`}>
                {t('playbooksTab')} <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${isDark ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>PRO</span>
            </button>
          </div>
        </div>

        {activeTab === 'matrix' && (
          <div className="space-y-8 animate-in fade-in">
            <div className={`p-6 rounded-2xl ${cardBg}`}>
              <form onSubmit={handleAddTask} className="space-y-4">
                <input name="taskInput" type="text" placeholder={t('taskInput')} required className={`w-full px-4 py-3 rounded-xl outline-none font-semibold text-lg transition-all ${inputBg} border-transparent bg-transparent focus:bg-transparent shadow-none px-0 border-b rounded-none focus:ring-0 focus:border-b-2`} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <input name="linkInput" type="url" placeholder={t('docLink')} className={`w-full min-w-0 px-4 py-2.5 rounded-lg outline-none text-sm transition-all ${inputBg}`} />
                  <input name="deadlineInput" type="datetime-local" className={`w-full min-w-0 px-4 py-2.5 rounded-lg outline-none text-sm transition-all ${inputBg} ${isDark ? '[color-scheme:dark]' : ''}`} />
                  <input name="hoursInput" type="number" step="0.1" placeholder={t('hours')} className={`w-full min-w-0 px-4 py-2.5 rounded-lg outline-none text-sm transition-all ${inputBg}`} />
                </div>
                <div className="flex flex-col md:flex-row gap-4 pt-2 items-center justify-between">
                  <div className="flex gap-3 w-full md:w-auto">
                    <button type="button" onClick={() => setNewUrgent(!newUrgent)} className={`px-5 py-2.5 rounded-lg font-semibold text-xs transition-all border ${newUrgent ? (isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700') : (isDark ? 'bg-transparent border-white/10 text-slate-400 hover:bg-white/5' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}`}>{t('urgent')}</button>
                    <button type="button" onClick={() => setNewImportant(!newImportant)} className={`px-5 py-2.5 rounded-lg font-semibold text-xs transition-all border ${newImportant ? (isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700') : (isDark ? 'bg-transparent border-white/10 text-slate-400 hover:bg-white/5' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}`}>{t('important')}</button>
                  </div>
                  <button type="submit" className={`w-full md:w-auto px-8 py-2.5 font-bold rounded-lg text-sm transition-all active:scale-[0.98] ${btnPrimary}`}>{t('createBtn')}</button>
                </div>
              </form>
            </div>
            
            {/* ДОБАВЛЕНО: ВЫБОР СОТРУДНИКА */}
            {role === 'manager' && (
              <div className="flex flex-wrap items-center gap-2 pt-2 pb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest mr-2 ${textMuted}`}>Исполнитель:</span>
                {docData.assistants.map(a => {
                  const isSelected = (newAssignee || sCurrentId) === String(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setNewAssignee(String(a.id))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected ? (isDark ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm') : (isDark ? 'bg-transparent border-white/10 text-slate-400 hover:bg-white/5' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}`}
                    >
                      {a.id === 'manager' ? '👑 Мне' : a.name}
                    </button>
                  )
                })}
              </div>
            )}

            {focusTasks.length > 0 && (
              <div className="mb-8">
                <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> {t('focus')} ({focusTasks.length})</h2>
                <div className="space-y-3">
                  {focusTasks.map(tData => <TaskCard key={tData.id} task={tData} role={role} isDark={isDark} t={t} translate={t} onReview={handleSendToReview} onDelete={setDeleteModalTask} onEdit={openEditModal} openDelegate={role === 'manager' ? openDelegateModal : null} onToggleTimer={handleToggleTimer} onToggleFocus={handleToggleFocus} onToggleSubtask={handleToggleSubtask} lang={lang} />)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Quadrant title={t('critical')} dotColor="bg-red-500" tasks={pendingTasks.filter(t => t.urgent && t.important && !t.isFocus)} role={role} isDark={isDark} t={t} onReview={handleSendToReview} onDelete={setDeleteModalTask} onEdit={openEditModal} openDelegate={role === 'manager' ? openDelegateModal : null} onToggleTimer={handleToggleTimer} onToggleFocus={handleToggleFocus} onToggleSubtask={handleToggleSubtask} lang={lang} />
              <Quadrant title={t('strategy')} dotColor="bg-blue-500" tasks={pendingTasks.filter(t => !t.urgent && t.important && !t.isFocus)} role={role} isDark={isDark} t={t} onReview={handleSendToReview} onDelete={setDeleteModalTask} onEdit={openEditModal} openDelegate={role === 'manager' ? openDelegateModal : null} onToggleTimer={handleToggleTimer} onToggleFocus={handleToggleFocus} onToggleSubtask={handleToggleSubtask} lang={lang} />
              <Quadrant title={t('operations')} dotColor="bg-amber-500" tasks={pendingTasks.filter(t => t.urgent && !t.important && !t.isFocus)} role={role} isDark={isDark} t={t} onReview={handleSendToReview} onDelete={setDeleteModalTask} onEdit={openEditModal} openDelegate={role === 'manager' ? openDelegateModal : null} onToggleTimer={handleToggleTimer} onToggleFocus={handleToggleFocus} onToggleSubtask={handleToggleSubtask} lang={lang} />
              <Quadrant title={t('backlog')} dotColor="bg-slate-400" tasks={pendingTasks.filter(t => !t.urgent && !t.important && !t.isFocus)} role={role} isDark={isDark} t={t} onReview={handleSendToReview} onDelete={setDeleteModalTask} onEdit={openEditModal} openDelegate={role === 'manager' ? openDelegateModal : null} onToggleTimer={handleToggleTimer} onToggleFocus={handleToggleFocus} onToggleSubtask={handleToggleSubtask} lang={lang} />
            </div>

            {/* БЛОК АРХИВА */}
            <div className="flex justify-center pt-10 pb-4">
              <button onClick={() => setShowArchive(!showArchive)} className={`font-semibold text-xs tracking-wide flex items-center gap-2 transition-all px-4 py-2 rounded-lg border ${isDark ? 'bg-transparent border-white/10 text-slate-400 hover:text-white' : 'bg-transparent border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                {showArchive ? t('hideArc') : t('showArc')}
              </button>
            </div>

            {showArchive && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                  {archive.length === 0 ? <p className={`text-sm text-center ${textMuted}`}>{t('emptyArc')}</p> : (
                    <div className="space-y-2">
                      {archive.map(tData => (
                        <div key={tData.id} className={`p-3 rounded-lg flex flex-col md:flex-row md:justify-between md:items-center gap-2 border ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                          <span className={`font-medium text-sm ${isDark ? 'text-slate-400 line-through' : 'text-slate-500 line-through'}`}>{tData.text}</span>
                          <span className={`text-[10px] font-mono px-2 py-1 rounded shrink-0 ${isDark ? 'bg-white/5 text-slate-400' : 'bg-white text-slate-400 border border-slate-100'}`}>{tData.completedAt}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'kpi' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 md:p-8 rounded-2xl shadow-sm border relative overflow-hidden flex flex-col justify-between ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-6">
                   <p className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>{t('slaIndex')}</p>
                   <span className={`w-3 h-3 rounded-full ${totalEfficiency >= 80 ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
                </div>
                <div><h2 className={`text-5xl font-black tracking-tighter ${textMain}`}>{totalEfficiency}%</h2></div>
              </div>
              <div className={`p-6 md:p-8 rounded-2xl shadow-sm border relative overflow-hidden flex flex-col justify-between ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-6">
                   <p className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>{t('timeSaved')}</p>
                   <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
                </div>
                <div><h2 className={`text-5xl font-black tracking-tighter ${textMain}`}>{savedTime.toFixed(1)} <span className="text-2xl font-medium opacity-50 tracking-normal">{t('hrs')}</span></h2></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {kpis.map((kpi) => (
                <div key={kpi.id} className={`p-6 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200'}`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`text-sm font-bold leading-tight ${textMain}`}>{kpi.name}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{t('weight')}: {kpi.weight}%</span>
                    </div>
                    <p className={`text-xs leading-relaxed mb-6 ${textMuted}`}>{kpi.desc}</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-3">
                      <span className={`text-2xl font-black tracking-tight ${textMain}`}>{kpi.score} <span className="text-sm opacity-50 font-medium">/ {kpi.max}</span></span>
                      <span className="text-xs font-bold text-emerald-500">+{((kpi.score / kpi.max) * kpi.weight).toFixed(1)}% {t('impact')}</span>
                    </div>
                    <input type="range" min="0" max={kpi.max} value={kpi.score} onChange={(e) => role === 'manager' && handleScoreChange(kpi.id, e.target.value)} disabled={role !== 'manager'} className="w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {role === 'manager' && activeTab === 'capacity' && (
          <div className={!isPro ? "relative" : ""}>
            <div className={`space-y-8 transition-all duration-500 ${!isPro ? 'blur-[8px] opacity-40 pointer-events-none select-none' : ''}`}>
              <div className={`p-8 rounded-2xl shadow-sm border ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200'}`}>
                 <h3 className={`text-sm font-bold uppercase tracking-widest mb-6 ${textMuted}`}>{t('workload')}</h3>
                 <div className="mb-4 flex justify-between items-end">
                    <h2 className={`text-4xl font-black tracking-tighter ${textMain}`}>{totalPendingHours.toFixed(1)} <span className="text-xl opacity-50 font-medium">/ 40 {t('hrs')}</span></h2>
                 </div>
                 <div className={`w-full h-4 rounded-full overflow-hidden flex ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div className={`h-full transition-all duration-1000 ease-out ${capacityColor}`} style={{ width: `${capacityPercent}%` }}></div>
                 </div>
              </div>
            </div>
            {!isPro && <ProLock />}
          </div>
        )}

        {role === 'manager' && activeTab === 'payroll' && (
          <div className={!isPro ? "relative" : ""}>
            <div className={`space-y-6 transition-all duration-500 ${!isPro ? 'blur-[8px] opacity-40 pointer-events-none select-none' : ''}`}>
              <div className={`p-8 rounded-2xl shadow-sm border ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200'}`}>
                 <div className="flex justify-between items-center mb-8">
                   <h3 className={`text-sm font-bold uppercase tracking-widest ${textMuted}`}>{t('salaryCalc')}</h3>
                   <button className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${btnPrimary}`}>{t('exportCsv')}</button>
                 </div>
                 
                 <div className="space-y-4">
                   {docData.assistants.map(ast => {
                     const ws = docData.workspaces?.[String(ast.id)] || {};
                     const astRate = ws.baseRate !== undefined ? ws.baseRate : 2500;
                     const astKpis = ws.kpis || defaultKpis;
                     const astEff = astKpis.reduce((sum, kpi) => sum + ((kpi.score / kpi.max) * kpi.weight), 0);
                     const astPayout = astRate * (astEff / 100);
                     const isEditing = editingRates[ast.id];

                     return (
                       <div key={ast.id} className={`p-4 rounded-xl border ${isDark ? 'border-white/10 bg-[#161B22]' : 'border-slate-200 bg-slate-50'} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                         <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isDark ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-700 shadow-sm'}`}>
                             {ast.name.charAt(0).toUpperCase()}
                           </div>
                           <div>
                             <p className={`font-bold ${textMain}`}>{ast.name} {ast.id === 'manager' && '(Вы)'}</p>
                             <p className={`text-xs ${textMuted}`}>SLA Индекс: {astEff.toFixed(1)}%</p>
                           </div>
                         </div>

                         <div className="flex items-center gap-6">
                           <div className="flex flex-col items-end">
                             <span className={`text-[10px] uppercase font-bold ${textMuted}`}>{t('baseRate')}</span>
                             {isEditing ? (
                               <div className="flex items-center gap-1 mt-1">
                                 <input
                                   type="number"
                                   value={rateValues[ast.id] !== undefined ? rateValues[ast.id] : astRate}
                                   onChange={(e) => setRateValues({...rateValues, [ast.id]: e.target.value})}
                                   className={`w-20 px-2 py-1 text-sm font-mono rounded outline-none border ${isDark ? 'bg-[#0E1116] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                 />
                                 <button onClick={() => handleSaveAssistantRate(ast.id)} className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-400">✓</button>
                               </div>
                             ) : (
                               <div className="flex items-center gap-2">
                                 <span className={`font-mono text-sm font-semibold ${textMain}`}>${astRate.toLocaleString('en-US')}</span>
                                 <button onClick={() => { setEditingRates({...editingRates, [ast.id]: true}); setRateValues({...rateValues, [ast.id]: astRate}); }} className="text-[10px] opacity-50 hover:opacity-100">✏️</button>
                               </div>
                             )}
                           </div>

                           <div className="flex flex-col items-end min-w-[80px]">
                             <span className={`text-[10px] uppercase font-bold ${textMuted}`}>{t('totalPayout')}</span>
                             <span className={`font-mono text-lg font-black text-emerald-500`}>${astPayout.toLocaleString('en-US')}</span>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
                 
              </div>
            </div>
            {!isPro && <ProLock />}
          </div>
        )}

        {activeTab === 'playbooks' && (
          <div className={!isPro ? "relative" : ""}>
            <div className={`space-y-6 transition-all duration-500 ${!isPro ? 'blur-[8px] opacity-40 pointer-events-none select-none' : ''}`}>
               <h3 className={`text-sm font-bold uppercase tracking-widest mb-2 ${textMuted}`}>{t('sopLibrary')}</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="text-4xl mb-4">📘</div>
                    <h4 className={`font-bold mb-1 ${textMain}`}>{t('sopMarketing')}</h4>
                 </div>
                 <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#161B22] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="text-4xl mb-4">📗</div>
                    <h4 className={`font-bold mb-1 ${textMain}`}>{t('sopSales')}</h4>
                 </div>
               </div>
            </div>
            {!isPro && <ProLock />}
          </div>
        )}

        {/* 🌟 ВСЕ МОДАЛЬНЫЕ ОКНА */}
        
        {editModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <div className={`rounded-3xl p-6 w-full max-w-md shadow-2xl border ${isDark ? 'bg-[#161B22] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <h3 className="text-xl font-bold mb-4">{t('edit')}</h3>
              <input type="text" value={editModal.text} onChange={e => setEditModal({...editModal, text: e.target.value})} className={`w-full px-4 py-3 rounded-xl mb-3 outline-none transition-colors ${inputBg}`} />
              <input type="url" value={editModal.link} onChange={e => setEditModal({...editModal, link: e.target.value})} placeholder={t('docLink')} className={`w-full px-4 py-3 rounded-xl mb-3 outline-none transition-colors ${inputBg}`} />
              <div className="grid grid-cols-2 gap-3 mb-3">
                 <input type="datetime-local" value={editModal.deadline} onChange={e => setEditModal({...editModal, deadline: e.target.value})} className={`px-4 py-3 rounded-xl outline-none transition-colors ${inputBg} ${isDark ? '[color-scheme:dark]' : ''}`} />
                 <input type="number" step="0.1" value={editModal.hours} onChange={e => setEditModal({...editModal, hours: e.target.value})} placeholder={t('hours')} className={`px-4 py-3 rounded-xl outline-none transition-colors ${inputBg}`} />
              </div>
              <div className="flex gap-4 mb-6 px-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                  <input type="checkbox" checked={editModal.urgent} onChange={e => setEditModal({...editModal, urgent: e.target.checked})} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" /> {t('urgent')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                  <input type="checkbox" checked={editModal.important} onChange={e => setEditModal({...editModal, important: e.target.checked})} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" /> {t('important')}
                </label>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditModal({...editModal, isOpen: false})} className={`flex-1 py-3 rounded-xl font-bold transition-all border ${isDark ? 'bg-transparent border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>{t('proClose')}</button>
                <button onClick={saveEdit} className={`flex-1 py-3 rounded-xl font-bold transition-all ${btnPrimary}`}>Сохранить</button>
              </div>
            </div>
          </div>
        )}

        {deleteModalTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <div className={`rounded-3xl p-6 w-full max-w-md shadow-2xl border ${isDark ? 'bg-[#161B22] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <h3 className="text-xl font-bold mb-2">{t('delTitle')}</h3>
              <p className={`text-sm mb-4 ${textMuted}`}>{t('delReason')}</p>
              <input type="text" value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="..." className={`w-full px-4 py-3 rounded-xl mb-6 outline-none transition-colors ${inputBg}`} autoFocus />
              <div className="flex gap-3">
                <button onClick={() => {setDeleteModalTask(null); setDeleteReason('');}} className={`flex-1 py-3 rounded-xl font-bold transition-all border ${isDark ? 'bg-transparent border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>{t('proClose')}</button>
                <button onClick={handleConfirmDelete} className="flex-1 py-3 rounded-xl font-bold transition-all bg-red-600 text-white hover:bg-red-500">{t('del')}</button>
              </div>
            </div>
          </div>
        )}

        {rejectModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <div className={`rounded-3xl p-6 w-full max-w-md shadow-2xl border ${isDark ? 'bg-[#161B22] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <h3 className="text-xl font-bold mb-4">{t('returnReason')}</h3>
              <textarea value={rejectModal.reason} onChange={e => setRejectModal({...rejectModal, reason: e.target.value})} className={`w-full px-4 py-3 rounded-xl mb-4 outline-none resize-none transition-colors ${inputBg}`} rows="3" autoFocus></textarea>
              <div className="flex gap-3">
                <button onClick={() => setRejectModal({isOpen: false, taskId: null, reason: ''})} className={`flex-1 py-3 rounded-xl font-bold transition-all border ${isDark ? 'bg-transparent border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>{t('proClose')}</button>
                <button onClick={confirmReject} className="flex-1 py-3 rounded-xl font-bold transition-all bg-amber-500 text-white hover:bg-amber-400">{t('reject')}</button>
              </div>
            </div>
          </div>
        )}

        {delegateModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <div className={`rounded-3xl p-6 w-full max-w-md shadow-2xl border ${isDark ? 'bg-[#161B22] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <h3 className="text-xl font-bold mb-4">{t('delegate')}</h3>
              <select value={delegateModal.targetId} onChange={e => setDelegateModal({...delegateModal, targetId: e.target.value})} className={`w-full px-4 py-3 rounded-xl mb-3 outline-none transition-colors ${inputBg}`}>
                <option value="" disabled>{t('selectEmp')}</option>
                {docData.assistants.map(a => <option key={a.id} value={String(a.id)} className={isDark ? 'text-slate-900' : ''}>{a.name}</option>)}
              </select>
              <select value={delegateModal.controlLevel} onChange={e => setDelegateModal({...delegateModal, controlLevel: Number(e.target.value)})} className={`w-full px-4 py-3 rounded-xl mb-6 outline-none transition-colors ${inputBg}`}>
                 {getControlLevels(lang).map(l => <option key={l.value} value={l.value} className={isDark ? 'text-slate-900' : ''}>{l.label}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => setDelegateModal({isOpen: false, task: null, targetId: '', controlLevel: 0})} className={`flex-1 py-3 rounded-xl font-bold transition-all border ${isDark ? 'bg-transparent border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>{t('proClose')}</button>
                <button onClick={confirmDelegate} className={`flex-1 py-3 rounded-xl font-bold transition-all ${btnPrimary}`}>{t('delegate')}</button>
              </div>
            </div>
          </div>
        )}

        {/* PRO MODAL */}
        {isProModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in">
            <div className={`rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden ${isDark ? 'bg-[#0E1116] border border-white/10' : 'bg-white border border-slate-200'}`}>
              <div className="flex justify-between items-center mb-6">
                 <h3 className={`text-xl font-bold tracking-tight ${textMain}`}>{t('proTitle')}</h3>
                 <button onClick={() => setIsProModalOpen(false)} className={`text-sm ${textMuted}`}>{t('proClose')}</button>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3"><span className={textMain}>✓</span><span className={`text-sm ${textMuted}`}>{t('proF1')}</span></li>
                <li className="flex items-start gap-3"><span className={textMain}>✓</span><span className={`text-sm ${textMuted}`}>{t('proF2')}</span></li>
                <li className="flex items-start gap-3"><span className={textMain}>✓</span><span className={`text-sm ${textMuted}`}>{t('proF3')}</span></li>
                <li className="flex items-start gap-3"><span className={textMain}>✓</span><span className={`text-sm ${textMuted}`}>{t('proF4')}</span></li>
              </ul>
              <div className={`p-4 rounded-xl mb-6 text-xs leading-relaxed border ${isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {t('proNote')}
              </div>
              
              <button onClick={() => setIsProModalOpen(false)} className={`w-full py-3 text-sm font-bold rounded-xl transition-all ${btnPrimary}`}>
                {t('proBtn')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function TaskCard({ task, role, isDark, t, translate, onReview, onDelete, onEdit, openDelegate, onToggleTimer, onToggleFocus, onToggleSubtask, lang }) {
  const tLocal = translate || t; 
  const isOverdue = task.deadline && new Date(task.deadline) < new Date();
  const completedSubtasks = (task.subtasks || []).filter(st => st.done).length;
  const totalSubtasks = (task.subtasks || []).length;
  const CONTROL_LEVELS = getControlLevels(lang);
  const cardBase = isOverdue ? (isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100') : (isDark ? 'bg-[#161B22] border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300');
  const textMain = isDark ? 'text-slate-200' : 'text-slate-800';

  return (
    <div className={`p-5 rounded-2xl border transition-all shadow-sm ${cardBase}`}>
      <div className="flex flex-col gap-3 w-full">
        <div className="flex justify-between items-start gap-3">
          <span className={`text-sm font-semibold leading-relaxed ${textMain}`}>{task.text}</span>
          <button onClick={() => onToggleFocus(task.id)} className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all border ${task.isFocus ? (isDark ? 'bg-white text-black' : 'bg-slate-900 text-white') : (isDark ? 'bg-transparent border-white/10 text-slate-500 hover:bg-white/5' : 'bg-transparent border-slate-200 text-slate-400 hover:bg-slate-50')}`} title="Focus">🎯</button>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {task.urgent && <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${isDark ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-red-200 text-red-700 bg-red-50'}`}>{tLocal('urgent')}</span>}
          {task.important && <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${isDark ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>{tLocal('important')}</span>}
          {task.controlLevel > 0 && <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${isDark ? 'border-white/10 text-slate-400 bg-white/5' : 'border-slate-200 text-slate-600 bg-slate-50'}`}>{CONTROL_LEVELS.find(l => l.value === task.controlLevel)?.label}</span>}
          {task.link && <a href={task.link} target="_blank" rel="noreferrer" className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{tLocal('doc')}</a>}
          {task.estimatedHours > 0 && <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${isDark ? 'border-white/10 text-slate-400 bg-transparent' : 'border-slate-200 text-slate-500 bg-transparent'}`}>{task.estimatedHours}h</span>}
        </div>
        
        {totalSubtasks > 0 && (
          <div className="mt-2 space-y-2">
            <div className={`w-full h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <div className={`h-full transition-all duration-500 ${isDark ? 'bg-slate-400' : 'bg-slate-400'}`} style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}></div>
            </div>
            <div className="space-y-1.5 pt-1">
              {task.subtasks.map(st => (
                <label key={st.id} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={st.done} onChange={() => onToggleSubtask(task.id, st.id)} className={`w-3.5 h-3.5 rounded-sm focus:ring-slate-500 transition-colors ${isDark ? 'bg-transparent border-white/20' : 'text-slate-900 border-slate-300'}`} />
                  <span className={`text-xs font-medium transition-all ${st.done ? 'text-slate-500 line-through' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>{st.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {task.rejectReason && (
          <div className={`mt-1 text-[11px] p-2.5 rounded-lg font-medium border ${isDark ? 'bg-red-500/5 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {tLocal('returnReason')} {task.rejectReason}
          </div>
        )}

        {task.deadline && (
          <span className={`text-[11px] font-medium mt-1 ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
            {isOverdue ? tLocal('overdue') : tLocal('due')} {new Date(task.deadline).toLocaleString('ru-RU', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'})}
          </span>
        )}
      </div>
      
      <div className={`flex flex-wrap md:flex-nowrap justify-between items-center pt-4 border-t mt-3 gap-2 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => onToggleTimer(task)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${task.timerState === 'running' ? (isDark ? 'bg-white text-slate-900 border-white animate-pulse' : 'bg-slate-900 text-white border-slate-900 animate-pulse') : (isDark ? 'bg-transparent border-white/10 text-slate-300 hover:bg-white/5' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
            {task.timerState === 'running' ? tLocal('pause') : tLocal('start')}
          </button>
          {openDelegate && (
             <button onClick={() => openDelegate(task)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${isDark ? 'bg-transparent border-white/10 text-slate-300 hover:bg-white/5' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{tLocal('delegate')}</button>
          )}
        </div>
        
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(task)} className={`text-xs p-1.5 rounded-md transition-all ${isDark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'}`}>{tLocal('edit')}</button>
          <button onClick={() => onReview(task.id)} className={`text-xs p-1.5 rounded-md transition-all ${isDark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'}`}>{tLocal('review')}</button>
          <button onClick={() => onDelete(task)} className={`text-xs p-1.5 rounded-md transition-all ${isDark ? 'text-slate-500 hover:bg-red-500/20 hover:text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`}>{tLocal('del')}</button>
        </div>
      </div>
    </div>
  );
}

function Quadrant({ title, dotColor, tasks, role, isDark, t, onReview, onDelete, onEdit, openDelegate, onToggleTimer, onToggleFocus, onToggleSubtask, lang }) {
  return (
    <div className={`flex flex-col`}>
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
        <h3 className={`font-bold text-sm uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{title} <span className="text-slate-500 font-normal ml-1">{tasks.length}</span></h3>
      </div>
      <div className="space-y-3 grow">
        {tasks.length === 0 ? <p className={`text-xs text-center py-6 rounded-xl border border-dashed font-medium ${isDark ? 'border-white/10 text-slate-600' : 'border-slate-200 text-slate-400'}`}>{t('empty')}</p> : 
          tasks.map(task => <TaskCard key={task.id} task={task} role={role} isDark={isDark} t={t} translate={t} onReview={onReview} onDelete={onDelete} onEdit={onEdit} openDelegate={openDelegate} onToggleTimer={onToggleTimer} onToggleFocus={onToggleFocus} onToggleSubtask={onToggleSubtask} lang={lang} />)
        }
      </div>
    </div>
  );
}