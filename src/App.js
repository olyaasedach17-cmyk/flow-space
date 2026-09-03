// ==========================================
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { auth, db, googleProvider } from './firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { Sun, Moon, Settings } from 'lucide-react';

// Компоненты UI
import AuthView from './components/auth/AuthView';
import AssistantView from './components/automation/AssistantView';
import SopView from './components/automation/SopView';
import InviteModal from './components/company/InviteModal';
import KpiView from './components/company/KpiView';
import TeamView from './components/company/TeamView';
import MobileNav from './components/layout/MobileNav';
import Sidebar from './components/layout/Sidebar';
import OnboardingModal from './components/settings/OnboardingModal';
import SettingsModal from './components/settings/SettingsModal';
import ArchiveView from './components/tasks/ArchiveView';
import MatrixView from './components/tasks/MatrixView';
import TaskModal from './components/tasks/TaskModal';

// Сервисы и утилиты
import { WORKSPACES, ROLES, filterTasksByRole } from './utils/workspaceUtils';
import { sendTelegramAlert, copyToClipboard } from './services/notificationService';
import { callServerAI, safeParseAIJSON } from './services/aiService';
import { runTaskAutomations } from './utils/automations';
import { calculateCompanyMetrics } from './utils/analytics';
import { normalizeTask, createNormalizedTask } from './utils/taskUtils';
import {
  translations,
  defaultKpis,
  aiOptions,
  taskTemplates,
  defaultAutomations,
  btnPrimary,
  handleError
} from './constants';



// ==========================================
// 3. ОСНОВНОЕ ПРИЛОЖЕНИЕ FLOW SPACE
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const [docData, setDocData] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [personalData, setPersonalData] = useState({ tasks: [], archive: [] });

  const [activeTab, setActiveTab] = useState('matrix');
  const [currentWorkspace, setCurrentWorkspace] = useState(WORKSPACES.COMPANY);
  const userRole = docData?.role || ROLES.OWNER;
  const [isDark, setIsDark] = useState(() => localStorage.getItem('flowspace_theme') === 'dark');

  const t = useCallback((key) => translations['ru'][key] || key, []);

  // Голосовой ввод
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Фильтр по сотрудникам
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Промокод и Телеграм
  const [promoInput, setPromoInput] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Состояние новой задачи
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskExpectedResult, setNewTaskExpectedResult] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(false);
  const [newTaskAssignee, setNewTaskAssignee] = useState('manager');

  const [isTaskGenerating, setIsTaskGenerating] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  // Ассистент
  const [processRole, setProcessRole] = useState('copywriter');
  const [processTopic, setProcessTopic] = useState('');
  const [processMessages, setProcessMessages] = useState([]);
  const [followUpText, setFollowUpText] = useState('');
  const [isProcessGenerating, setIsProcessGenerating] = useState(false);

  // Команда
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePosition, setInvitePosition] = useState('');
  const [inviteRole, setInviteRole] = useState('worker');

  // Настройки
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardTeam, setOnboardTeam] = useState('👤 Я один');

  const [teamReport, setTeamReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    localStorage.setItem('flowspace_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let unsubscribeCompany = null;
    let unsubscribePersonal = null;

    const initUserAndCompany = async () => {
      try {
        const lowerEmail = user.email.toLowerCase();
        let companyId = user.uid; // По умолчанию человек - владелец своей компании
        let currentRole = ROLES.OWNER;

        // 1. Проверяем, есть ли "Билет" (User Mapping) от другой компании
        const mappingRef = doc(db, 'user_mappings', lowerEmail);
        const mappingSnap = await getDoc(mappingRef);

        if (mappingSnap.exists()) {
          companyId = mappingSnap.data().companyId;
          currentRole = mappingSnap.data().role;
        } else {
          // Если билета нет, создаем билет Владельца для себя
          await setDoc(mappingRef, { companyId: user.uid, role: ROLES.OWNER });
        }

        setCompanyId(companyId);

        // 2. Подписываемся на базу Компании (своей или начальника)
        const docRef = doc(db, 'users', companyId);

        unsubscribeCompany = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Внедряем роль текущего пользователя в данные, чтобы UI знал, кто это
            setDocData({ ...data, role: currentRole });
            if (data.settings?.teamSize) setOnboardTeam(data.settings.teamSize);
            if (data.settings?.telegramChatId) setTgChatId(data.settings.telegramChatId);
          } else {
            // Инициализация новой базы (ТОЛЬКО если это Владелец)
            if (currentRole === ROLES.OWNER) {
              setDoc(docRef, {
                email: lowerEmail,
                isPro: false,
                settings: { isTeamMode: false, teamSize: '👤 Я один', telegramChatId: '', automations: defaultAutomations },
                assistants: [{
                  id: user.uid,
                  name: lowerEmail.split('@')[0] || 'Владелец',
                  position: 'CEO',
                  role: ROLES.OWNER
                }],
                tasks: [], archive: [], sops: [], kpis: defaultKpis, savedTime: 0,
                createdAt: new Date().toISOString()
              }).catch(err => handleError(err, 'Инициализация профиля компании'));
            }
          }
        }, (error) => handleError(error, 'Синхронизация данных'));

        const personalRef = doc(db, 'personal_spaces', user.uid);
        unsubscribePersonal = onSnapshot(personalRef, (personalSnap) => {
          if (personalSnap.exists()) {
            setPersonalData(personalSnap.data());
          } else {
            setDoc(personalRef, { tasks: [], archive: [], createdAt: new Date().toISOString() })
              .catch(err => handleError(err, 'Инициализация личного пространства'));
          }
        }, (error) => handleError(error, 'Синхронизация личного пространства'));
      } catch (err) {
        handleError(err, 'Маршрутизация пользователя');
      }
    };

    initUserAndCompany();
    return () => {
      if (unsubscribeCompany) unsubscribeCompany();
      if (unsubscribePersonal) unsubscribePersonal();
    };
  }, [user]);

const notifyTelegram = useCallback(async (msg) => {
    await sendTelegramAlert(msg, docData?.settings);
  }, [docData?.settings]);

const processTaskAutomations = useCallback((event, taskData) => {
    const rules = docData?.settings?.automations || defaultAutomations;
    runTaskAutomations({
      event,
      taskData,
      automations: rules,
      notifyTelegram
    });
  }, [docData?.settings?.automations, notifyTelegram]);

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
      handleError(error, 'Авторизация');
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Успешный вход через Google');
    } catch (error) {
      handleError(error, 'Google Авторизация');
    }
  };

  const handleResetPassword = async () => {
    if (!email) return toast.error('Пожалуйста, введите ваш Email в поле выше.');
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Письмо для сброса пароля отправлено на ваш e-mail.');
    } catch (error) {
      handleError(error, 'Сброс пароля');
    }
  };

  // Базовые коллекции теперь загружаются напрямую из документа компании
  const assistants = useMemo(() => docData?.assistants || [], [docData]);
  const sops = useMemo(() => docData?.sops || [], [docData]);
  const activeData = currentWorkspace === WORKSPACES.PERSONAL ? personalData : docData;
  const rawTasks = useMemo(() => activeData?.tasks || [], [activeData]);
  const rawArchive = useMemo(() => activeData?.archive || [], [activeData]);

  // ФИЛЬТРАЦИЯ ПРОСТРАНСТВ И РОЛЕЙ
  // Если это Личное пространство -> показываем только задачи сотрудника.
  // Если Компания -> руководитель видит всё, линейный сотрудник только свои.
  const tasks = useMemo(() => filterTasksByRole(rawTasks, userRole, user?.uid, currentWorkspace), [rawTasks, userRole, user, currentWorkspace]);
  const archive = useMemo(() => filterTasksByRole(rawArchive, userRole, user?.uid, currentWorkspace), [rawArchive, userRole, user, currentWorkspace]);
  const isPro = useMemo(() => docData?.isPro || !!docData?.appliedPromo, [docData]);
  const isTeamMode = useMemo(() => docData?.settings?.isTeamMode ?? (onboardTeam !== '👤 Я один'), [docData, onboardTeam]);

  // Фильтрация с мемоизацией
  const filteredTasks = useMemo(() => {
    return assigneeFilter === 'all'
      ? tasks
      : tasks.filter(tItem => tItem.assigneeName === assigneeFilter);
  }, [tasks, assigneeFilter]);

  const todoTasks = useMemo(() => filteredTasks.filter(tItem => tItem.status === 'todo'), [filteredTasks]);
  const inProgressTasks = useMemo(() => filteredTasks.filter(tItem => tItem.status === 'in_progress'), [filteredTasks]);
  const reviewTasks = useMemo(() => filteredTasks.filter(tItem => tItem.status === 'review'), [filteredTasks]);
  const deferredTasks = useMemo(() => filteredTasks.filter(tItem => tItem.status === 'deferred'), [filteredTasks]);
// Динамический расчёт метрик и KPI на основе задач
  const companyMetrics = useMemo(() => {
    return calculateCompanyMetrics(tasks, archive);
  }, [tasks, archive]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return toast.error('Введите промокод');
    const code = promoInput.toUpperCase().trim();
    setIsApplyingPromo(true);

    try {
      await setDoc(doc(db, 'users', companyId), {
        appliedPromo: code,
        isPro: true,
        settings: { ...docData?.settings, isTeamMode: true }
      }, { merge: true });

      setOnboardTeam('👥 2-5 человек');
      toast.success(`Промокод "${code}" применен! Вам активирован PRO-доступ.`);
      setPromoInput('');
      setShowOnboarding(false);
    } catch (err) {
      handleError(err, 'Активация промокода');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const updateWorkspace = useCallback((newData) => {
    const targetRef = currentWorkspace === WORKSPACES.PERSONAL
      ? doc(db, 'personal_spaces', user.uid)
      : doc(db, 'users', companyId);
    return setDoc(targetRef, newData, { merge: true })
      .catch(err => handleError(err, 'Сохранение рабочей области'));
  }, [user, companyId, currentWorkspace]);

  const handleApplyTemplate = useCallback((template) => {
    try {
      if (!template || !template.tasks || template.tasks.length === 0) {
        throw new Error('Шаблон пуст или поврежден');
      }

      const isPersonal = currentWorkspace === WORKSPACES.PERSONAL;
      const newTasks = template.tasks.map((tItem) => createNormalizedTask({
        title: tItem.text,
        description: tItem.description || '',
        expectedResult: tItem.expectedResult || '',
        estimatedHours: tItem.estimatedHours || 1,
        urgent: tItem.urgent || false,
        important: tItem.important || false,
        assigneeId: isPersonal ? user?.uid : (assistants[0]?.id || user?.uid),
        assigneeName: isPersonal ? (user?.displayName || user?.email || 'Я') : (assistants[0]?.name || 'Владелец'),
        createdBy: user?.uid
      }));

      updateWorkspace({ tasks: [...newTasks, ...(activeData?.tasks || [])] });
      toast.success(`Пакет "${template.name}" добавлен (${newTasks.length} задач)`);
      notifyTelegram(`📦 Добавлен пакет задач "${template.name}"`);
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Ошибка применения шаблона:', error);
      toast.error(error.message || 'Не удалось применить шаблон');
    }
  }, [currentWorkspace, user, assistants, activeData, updateWorkspace, notifyTelegram]);

const handleInviteColleague = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newAssistantId = `emp_${Date.now()}`;
    const lowerEmail = inviteEmail.toLowerCase();
    const newAssistantName = lowerEmail.split('@')[0];
    const assignedRole = inviteRole || ROLES.MEMBER;

    try {
      const newAssistant = {
        id: newAssistantId,
        name: newAssistantName,
        email: lowerEmail,
        role: assignedRole,
        position: invitePosition || 'Сотрудник',
        invitedAt: new Date().toISOString()
      };

      // 1. Добавляем сотрудника в команду
      await setDoc(doc(db, 'users', companyId), {
        assistants: [...assistants, newAssistant]
      }, { merge: true });

      // 2. Создаем "Билет" (User Mapping), чтобы сотрудник при входе попал в эту компанию
      await setDoc(doc(db, 'user_mappings', lowerEmail), {
        companyId,
        role: assignedRole
      });

      setIsInviteOpen(false);
      setInviteEmail('');
      setInvitePosition('');
      toast.success(`Сотрудник ${lowerEmail} добавлен в команду!`);
    } catch (err) {
      handleError(err, 'Приглашение сотрудника');
    }
  };

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return toast.error('Ваш браузер не поддерживает голосовой ввод. Используйте Chrome или Safari.');
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      toast.info('🎙 Распознавание ИИ...', { duration: 3000 });
      setIsListening(false);

      try {
        const prompt = `Пользователь надиктовал: "${transcript}".
        Выдели из текста задачи. Верни ТОЛЬКО валидный JSON-массив объектов:
        [{"text": "Краткое название", "description": "Детали", "assignee": "Имя (если звучит)", "urgent": true/false, "important": true/false}]`;

        const response = await callServerAI({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.1
        });

        const aiTasks = safeParseAIJSON(response.choices[0].message.content);

        const isPersonal = currentWorkspace === WORKSPACES.PERSONAL;
        const newTasks = aiTasks.map((tItem) => {
          const matchedAssistant = tItem.assignee
            ? assistants.find(a => a.name.toLowerCase().includes(tItem.assignee.toLowerCase()))
            : null;
          return createNormalizedTask({
            title: tItem.text || 'Новая задача',
            description: tItem.description || '',
            estimatedHours: 1,
            urgent: !!tItem.urgent,
            important: !!tItem.important,
            assigneeId: isPersonal ? user?.uid : (matchedAssistant?.id || assistants[0]?.id || user?.uid),
            assigneeName: isPersonal ? (user?.displayName || user?.email || 'Я') : (matchedAssistant?.name || assistants[0]?.name || 'Владелец'),
            createdBy: user?.uid
          });
        });

        updateWorkspace({ tasks: [...newTasks, ...(activeData?.tasks || [])] });
        toast.success(`Создано задач: ${newTasks.length}`);

        notifyTelegram(`🎙 Голосовой ввод распознан.\nСоздано задач: ${newTasks.length}`);
        setIsCreateOpen(false);

      } catch (err) {
        handleError(err, 'Голосовой ввод');
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  }, [isListening, currentWorkspace, user, assistants, activeData, updateWorkspace, notifyTelegram]);

  const handleRunAIAgent = async () => {
    const targetTask = tasks.find(tItem => tItem.status === 'todo' && (!tItem.expectedResult || !tItem.description || parseFloat(tItem.estimatedHours) === 0));
    if (!targetTask) return toast.info("Все задачи в бэклоге уже содержат критерии готовности и ТЗ!");

    setIsAgentRunning(true);
    try {
      const prompt = isTeamMode
        ? `Ты — бизнес-архитектор Flow Space. Принцип: «Контролируй результат, а не каждый шаг».
Проанализируй цель: "${targetTask.text}". Назначь наиболее подходящего исполнителя из списка: ${assistants.map(a => a.name).join(', ')}.
Верни строго валидный JSON:
{
  "expectedResult": "Четкий образ готового результата (по каким критериям руководитель примет работу)",
  "description": "Контекст задачи и вводные ориентиры",
  "estimatedHours": 1.5,
  "urgent": false,
  "important": true,
  "assignee": "Имя сотрудника"
}`
        : `Ты — бизнес-архитектор Flow Space. Принцип: «Контролируй результат, а не каждый шаг».
Проанализируй цель: "${targetTask.text}".
Верни строго валидный JSON:
{
  "expectedResult": "Четкий образ готового результата",
  "description": "Контекст задачи и вводные ориентиры",
  "estimatedHours": 2,
  "urgent": false,
  "important": true
}`;

      const response = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.1
      });

      let rawContent = response.choices[0].message.content.trim();
      if (rawContent.startsWith('```json')) rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      if (rawContent.startsWith('```')) rawContent = rawContent.replace(/```/g, '').trim();

      const aiResult = JSON.parse(rawContent);

      updateWorkspace({
        tasks: (activeData?.tasks || []).map(tItem => tItem.id === targetTask.id ? {
          ...tItem,
          expectedResult: aiResult.expectedResult || tItem.expectedResult || '',
          description: aiResult.description || tItem.description || '',
          estimatedHours: parseFloat(aiResult.estimatedHours) || tItem.estimatedHours || 1,
          urgent: aiResult.urgent !== undefined ? Boolean(aiResult.urgent) : tItem.urgent,
          important: aiResult.important !== undefined ? Boolean(aiResult.important) : tItem.important,
          assigneeName: isTeamMode && aiResult.assignee ? aiResult.assignee : tItem.assigneeName
        } : tItem)
      });
      toast.success('Умный Агент сформировал критерии готовности задачи!');
    } catch (error) {
      handleError(error, 'Запуск Умного Агента');
    } finally {
      setIsAgentRunning(false);
    }
  };

 const handleGenerateTeamReport = async () => {
    setIsGeneratingReport(true);
    try {
      const promptData = {
        totalTasks: tasks.length,
        inProgress: inProgressTasks.length,
        inReview: reviewTasks.length,
        slaScore: companyMetrics.slaScore,
        overdueRate: companyMetrics.overdueRate,
        totalHours: companyMetrics.totalHoursEstimated,
        tasksWithExpectedResult: tasks.filter(t => !!t.expectedResult).length
      };

      const systemPrompt = `Ты — Executive AI-консультант Flow Space. Твой фундаментальный принцип: «Контролируй результат, а не каждый шаг».
Сформируй для руководителя лаконичную управленческую сводку (до 180 слов) строго по 3 блокам:
1. 🎯 ДОСТИЖЕНИЕ РЕЗУЛЬТАТОВ: статус выполнения обязательств и текущий показатель соблюдения SLA (${promptData.slaScore}%).
2. ⚠️ РИСКИ И СРЫВЫ СРОКОВ: уровень просрочек (${promptData.overdueRate}%), задачи на проверке (${promptData.inReview}) и потенциальные заторы.
3. ⚡ УПРАВЛЕНЧЕСКОЕ РЕШЕНИЕ: 1-2 конкретных действия для руководителя, чтобы обеспечить результат без микроменеджмента.`;

      const data = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Текущие метрики компании: ${JSON.stringify(promptData)}` }
        ],
        temperature: 0.3
      });

      setTeamReport(data.choices[0].message.content.trim());
      toast.success('Управленческий отчет сформирован');
    } catch (err) {
      handleError(err, 'Генерация отчета');
    } finally {
      setIsGeneratingReport(false);
    }
  };

 const handleCopyReport = () => {
    if (!teamReport) return;
    copyToClipboard(teamReport, 'Отчет скопирован в буфер');
  };

const handleTaskAI = async (mode) => {
    if (!newTaskTitle.trim()) return toast.error('Введите цель задачи!');
    setIsTaskGenerating(true);
    try {
      const systemPrompt = mode === 'expand'
        ? `Ты — бизнес-архитектор Flow Space. Принцип: «Контролируй результат, а не каждый шаг».
По полученной цели сформулируй ответ строго в формате JSON:
{
  "expectedResult": "Четкий, проверяемый образ готового результата (1-2 предложения, по каким критериям руководитель примет работу)",
  "description": "Контекст задачи, ключевые вводные и ориентиры для исполнителя"
}`
        : `Ты — бизнес-архитектор Flow Space.
По полученной цели составь критерии приемки и ориентировочный чек-лист в формате JSON:
{
  "expectedResult": "Критерии готовности (Definition of Done)",
  "description": "Чек-лист готовности:\\n- [ ] Критерий 1\\n- [ ] Критерий 2\\n- [ ] Критерий 3"
}`;

      const response = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: newTaskTitle }
        ],
        temperature: 0.2
      });

      let rawContent = response.choices[0].message.content.trim();
      if (rawContent.startsWith('```json')) rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      if (rawContent.startsWith('```')) rawContent = rawContent.replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(rawContent);
        if (parsed.expectedResult) setNewTaskExpectedResult(parsed.expectedResult);
        if (parsed.description) setNewTaskDesc(parsed.description);
      } catch {
        setNewTaskDesc(rawContent);
      }

      toast.success('ИИ сформировал образ результата и контекст');
    } catch (err) {
      handleError(err, 'ИИ Генератор');
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
        { role: 'system', content: `Ты — ${systemPrompt}. Давай четкие структурированные ответы.` },
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
      handleError(err, 'ИИ Ассистент');
    } finally {
      setIsProcessGenerating(false);
    }
  };

  const handleFollowUpProcess = async () => {
    if (!followUpText.trim()) return;
    setIsProcessGenerating(true);
    try {
      const recentMessages = processMessages.slice(-10);
      const messagesPayload = [
        { role: 'system', content: 'Продолжай вести диалог как эксперт.' },
        ...recentMessages,
        { role: 'user', content: followUpText }
      ];

      const data = await callServerAI({
        model: 'gpt-4o',
        messages: messagesPayload,
        temperature: 0.7
      });

      const responseText = data.choices[0].message.content.trim();
      setProcessMessages(prev => [
        ...prev,
        { role: 'user', content: followUpText },
        { role: 'assistant', content: responseText }
      ]);
      setFollowUpText('');
    } catch (err) {
      handleError(err, 'Диалог с Ассистентом');
    } finally {
      setIsProcessGenerating(false);
    }
  };

  const handleSaveToSOP = async (content) => {
    toast.info('Создание регламента...');
    try {
      const response = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: `Придумай короткий заголовок (до 5 слов) для этого документа: ${content.substring(0, 500)}` }],
        temperature: 0.3
      });
      const title = response.choices[0].message.content.trim().replace(/["']/g, '');

      const newSOP = {
        id: Date.now(),
        title: title,
        content: content,
        date: new Date().toLocaleDateString('ru-RU')
      };

      updateWorkspace({ sops: [newSOP, ...sops] });
      toast.success('Сохранено в Базу Регламентов!');
    } catch (err) {
      handleError(err, 'Сохранение регламента');
    }
  };

  const handleDeleteSOP = (id) => {
    updateWorkspace({ sops: sops.filter(s => s.id !== id) });
    toast.success('Регламент удален');
  };

  const handleCreateTaskFromAI = (content) => {
    setSelectedTask(null);
    setNewTaskTitle(content.slice(0, 45) + '...');
    setNewTaskDesc(content);
    setNewTaskHours('1');
    setNewTaskDueDate('');
    setNewUrgent(false);
    setNewImportant(false);
    setIsCreateOpen(true);
    toast.success('Заполнено для создания задачи');
  };

 const handleSaveTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const selectedAssignee = assistants.find(a => a.id === newTaskAssignee);
    const isPersonal = currentWorkspace === WORKSPACES.PERSONAL;
    const assigneeName = isPersonal
      ? (user?.displayName || user?.email || 'Я')
      : (selectedAssignee?.name || 'Владелец');
    const assigneeId = isPersonal ? user?.uid : (selectedAssignee?.id || user?.uid);

    // SaaS безопасность: берем полный массив задач из базы, а не отфильтрованный
    const rawTasks = activeData?.tasks || [];
    let taskObj;

    if (selectedTask) {
      taskObj = normalizeTask({
        ...selectedTask,
        text: newTaskTitle,
        description: newTaskDesc,
        expectedResult: newTaskExpectedResult,
        estimatedHours: parseFloat(newTaskHours) || 0,
        dueDate: newTaskDueDate,
        urgent: newUrgent,
        important: newImportant,
        assigneeId,
        assigneeName
      }, user?.uid);

      updateWorkspace({ tasks: rawTasks.map(tItem => tItem.id === selectedTask.id ? taskObj : tItem) });
      toast.success('Задача обновлена');
    } else {
      taskObj = createNormalizedTask({
        title: newTaskTitle,
        description: newTaskDesc,
        expectedResult: newTaskExpectedResult,
        estimatedHours: parseFloat(newTaskHours) || 1,
        dueDate: newTaskDueDate,
        urgent: newUrgent,
        important: newImportant,
        assigneeId,
        assigneeName,
        createdBy: user?.uid || 'owner'
      });

      updateWorkspace({ tasks: [taskObj, ...rawTasks] });
      toast.success('Новая задача создана');
      notifyTelegram(`📝 Новая задача: ${newTaskTitle}\nПриоритет: ${newUrgent ? 'Срочно' : 'Обычный'}`);
      processTaskAutomations('task_created', taskObj);
    }

    closeModal();
  };

  const handleQuickMove = useCallback((taskId, newStatus) => {
    // SaaS безопасность: берем полные массивы из базы
    const rawTasks = activeData?.tasks || [];
    const rawArchive = activeData?.archive || [];

    const task = rawTasks.find(tItem => tItem.id === taskId) || rawArchive.find(tItem => tItem.id === taskId);
    if (!task) return;

    // Восстановление из архива в работу
    if (newStatus === 'todo' && task.status === 'done') {
      const restoredTask = {
        ...task,
        status: 'todo',
        completedAt: null
      };
      updateWorkspace({
        tasks: [restoredTask, ...rawTasks],
        archive: rawArchive.filter(tItem => tItem.id !== taskId)
      });
      toast.success('Задача возвращена в работу');
      return;
    }

    const updatedTask = {
      ...task,
      status: newStatus,
      completedAt: newStatus === 'done' ? new Date().toISOString() : null
    };

    processTaskAutomations('status_changed', updatedTask);

    if (newStatus === 'review') {
      notifyTelegram(`👀 Результат передан на проверку:\n«${task.text}»\nКритерии: ${task.expectedResult || 'Не указаны'}\nИсполнитель: ${task.assigneeName || 'Владелец'}`);
    } else if (newStatus === 'done') {
      notifyTelegram(`🎯 Результат принят руководителем:\n«${task.text}»`);
    }

    if (newStatus === 'done') {
      updateWorkspace({
        tasks: rawTasks.filter(tItem => tItem.id !== taskId),
        archive: [updatedTask, ...rawArchive]
      });
      toast.success('Результат принят и перенесен в Архив');
    } else {
      updateWorkspace({
        tasks: rawTasks.map(tItem => tItem.id === taskId ? updatedTask : tItem)
      });
    }
  }, [activeData, updateWorkspace, notifyTelegram, processTaskAutomations]);

  const handleDeleteTask = (taskId) => {
    const rawTasks = activeData?.tasks || [];
    updateWorkspace({ tasks: rawTasks.filter(tItem => tItem.id !== taskId) });
    toast.success('Задача удалена');
    closeModal();
  };

  const openTaskModal = useCallback((task = null) => {
    if (task) {
      setSelectedTask(task);
      setNewTaskTitle(task.text);
      setNewTaskDesc(task.description || '');
      setNewTaskExpectedResult(task.expectedResult || '');
      setNewTaskHours(task.estimatedHours || '');
      setNewTaskDueDate(task.dueDate || '');
      setNewUrgent(task.urgent || false);
      setNewImportant(task.important || false);
    } else {
      setSelectedTask(null);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskExpectedResult('');
      setNewTaskHours('');
      setNewTaskDueDate('');
      setNewUrgent(false);
      setNewImportant(false);
    }
    setIsCreateOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsCreateOpen(false);
    setSelectedTask(null);
  }, []);

  const handleSaveSettings = async () => {
    const isTeam = onboardTeam !== '👤 Я один';
    try {
      await setDoc(doc(db, 'users', companyId), {
        settings: {
          ...docData?.settings,
          isTeamMode: isTeam,
          teamSize: onboardTeam,
          telegramChatId: tgChatId,
          automations: docData?.settings?.automations || defaultAutomations
        }
      }, { merge: true });
      setShowOnboarding(false);
      toast.success('Настройки сохранены');
    } catch (err) {
      handleError(err, 'Сохранение настроек');
    }
  };

  const themeBg = isDark ? 'bg-[#0E1116] text-slate-200' : 'bg-[#F8FAFC] text-slate-800';
  const cardBg = isDark ? 'bg-[#161B22] border-white/10 shadow-sm' : 'bg-white border-slate-200/80 shadow-sm';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const inputBg = isDark ? 'bg-[#0E1116] border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200/80 text-slate-900 placeholder:text-slate-400';

  // 1. Экран входа / регистрации (если пользователь не авторизован)
  if (!user || !docData) {
    return (
      <AuthView
        themeBg={themeBg}
        cardBg={cardBg}
        textMain={textMain}
        inputBg={inputBg}
        btnPrimary={btnPrimary}
        isDark={isDark}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        handleAuth={handleAuth}
        signInWithGoogle={signInWithGoogle}
        handleResetPassword={handleResetPassword}
      />
    );
  }

  // 2. Главный экран приложения (когда пользователь вошёл)
  return (
    <div className={`min-h-screen font-sans pb-36 md:pb-12 md:pl-64 ${themeBg}`}>
      <Toaster position="top-center" richColors />

      {/* ДЕСКТОПНОЕ МЕНЮ */}
      <Sidebar
        isDark={isDark}
        isPro={isPro}
        isTeamMode={isTeamMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openTaskModal={openTaskModal}
        setShowOnboarding={setShowOnboarding}
        onSignOut={() => signOut(auth)}
        btnPrimary={btnPrimary}
        currentWorkspace={currentWorkspace}
        setCurrentWorkspace={setCurrentWorkspace}
        userRole={userRole}
      />

      {/* ПРЕМИАЛЬНАЯ МОБИЛЬНАЯ НАВИГАЦИЯ (ОСТРОВ) */}
      <MobileNav
        isDark={isDark}
        isTeamMode={isTeamMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openTaskModal={openTaskModal}
      />

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="max-w-6xl mx-auto p-4 md:p-8">

        <header className="flex justify-between items-center mb-4 pt-1">
          <div>
            <h2 className={`text-xl font-black tracking-tight ${textMain}`}>
              {isTeamMode ? 'Командная доска' : 'Личное пространство'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{isTeamMode ? 'Управление процессами' : 'Фокус на личных задачах'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowOnboarding(true)} className="p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 text-base shadow-sm active:scale-95 transition-transform bg-white dark:bg-[#161B22]">
              <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
            <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 text-base shadow-sm active:scale-95 transition-transform bg-white dark:bg-[#161B22]">
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </header>

        {/* ПЕРЕКЛЮЧАТЕЛЬ ДЛЯ КОМАНДНОГО РЕЖИМА НА МОБИЛЬНЫХ */}
        {isTeamMode && (
          <div className="md:hidden grid grid-cols-3 gap-1 p-1 bg-slate-200/60 dark:bg-white/5 rounded-xl mb-4 text-[11px] font-bold">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`py-2 rounded-lg transition-all ${activeTab === 'matrix' ? 'bg-white dark:bg-[#161B22] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              Задачи
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`py-2 rounded-lg transition-all ${activeTab === 'team' ? 'bg-white dark:bg-[#161B22] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              Команда
            </button>
            <button
              onClick={() => setActiveTab('kpi')}
              className={`py-2 rounded-lg transition-all ${activeTab === 'kpi' ? 'bg-white dark:bg-[#161B22] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              Сводка
            </button>
          </div>
        )}

        {/* ВКЛАДКА: ЗАДАЧИ */}
        {activeTab === 'matrix' && (
          <MatrixView
            isDark={isDark}
            isTeamMode={isTeamMode}
            handleRunAIAgent={handleRunAIAgent}
            isAgentRunning={isAgentRunning}
            btnPrimary={btnPrimary}
            assistants={assistants}
            tasks={tasks}
            assigneeFilter={assigneeFilter}
            setAssigneeFilter={setAssigneeFilter}
            t={t}
            todoTasks={todoTasks}
            inProgressTasks={inProgressTasks}
            reviewTasks={reviewTasks}
            deferredTasks={deferredTasks}
            openTaskModal={openTaskModal}
            handleQuickMove={handleQuickMove}
          />
        )}

        {/* ВКЛАДКА: АССИСТЕНТ (ЧАТ) */}
        {activeTab === 'processes' && (
          <AssistantView
            cardBg={cardBg}
            textMain={textMain}
            inputBg={inputBg}
            btnPrimary={btnPrimary}
            aiOptions={aiOptions}
            processRole={processRole}
            setProcessRole={setProcessRole}
            processTopic={processTopic}
            setProcessTopic={setProcessTopic}
            handleGenerateProcess={handleGenerateProcess}
            isProcessGenerating={isProcessGenerating}
            processMessages={processMessages}
            handleCreateTaskFromAI={handleCreateTaskFromAI}
            handleSaveToSOP={handleSaveToSOP}
            followUpText={followUpText}
            setFollowUpText={setFollowUpText}
            handleFollowUpProcess={handleFollowUpProcess}
          />
        )}

        {/* ВКЛАДКА: РЕГЛАМЕНТЫ (SOPS) */}
        {activeTab === 'sops' && (
          <SopView
            sops={sops}
            cardBg={cardBg}
            textMain={textMain}
            handleDeleteSOP={handleDeleteSOP}
          />
        )}
       {/* ВКЛАДКА: КОМАНДА */}
        {activeTab === 'team' && isTeamMode && (
          <TeamView
            isTeamMode={isTeamMode}
            cardBg={cardBg}
            textMain={textMain}
            btnPrimary={btnPrimary}
            setIsInviteOpen={setIsInviteOpen}
            assistants={assistants}
            tasks={tasks}
          />
        )}

        {/* ВКЛАДКА: СВОДКА */}
        {activeTab === 'kpi' && isTeamMode && (
          <KpiView
            isTeamMode={isTeamMode}
            isDark={isDark}
            cardBg={cardBg}
            textMain={textMain}
            btnPrimary={btnPrimary}
            handleGenerateTeamReport={handleGenerateTeamReport}
            isGeneratingReport={isGeneratingReport}
            teamReport={teamReport}
            handleCopyReport={handleCopyReport}
            kpis={companyMetrics.kpis}
            tasks={tasks}
            archive={archive}
            assistants={assistants}
          />
        )}

        {/* ВКЛАДКА: АРХИВ */}
        {activeTab === 'archive' && (
          <ArchiveView
            archive={archive}
            cardBg={cardBg}
            textMain={textMain}
            handleQuickMove={handleQuickMove}
          />
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ / РЕДАКТИРОВАНИЯ ЗАДАЧИ */}
      <TaskModal
        isOpen={isCreateOpen}
        onClose={closeModal}
        selectedTask={selectedTask}
        taskTemplates={taskTemplates}
        handleApplyTemplate={handleApplyTemplate}
        handleSaveTask={handleSaveTask}
        newTaskTitle={newTaskTitle}
        setNewTaskTitle={setNewTaskTitle}
        toggleVoiceInput={toggleVoiceInput}
        isListening={isListening}
        handleTaskAI={handleTaskAI}
        isTaskGenerating={isTaskGenerating}
        newTaskDesc={newTaskDesc}
        setNewTaskDesc={setNewTaskDesc}
        newTaskExpectedResult={newTaskExpectedResult}
        setNewTaskExpectedResult={setNewTaskExpectedResult}
        newTaskHours={newTaskHours}
        setNewTaskHours={setNewTaskHours}
        newTaskDueDate={newTaskDueDate}
        setNewTaskDueDate={setNewTaskDueDate}
        newUrgent={newUrgent}
        setNewUrgent={setNewUrgent}
        newImportant={newImportant}
        setNewImportant={setNewImportant}
        isTeamMode={isTeamMode}
        newTaskAssignee={newTaskAssignee}
        setNewTaskAssignee={setNewTaskAssignee}
        assistants={assistants}
        handleDeleteTask={handleDeleteTask}
        cardBg={cardBg}
        textMain={textMain}
        inputBg={inputBg}
        btnPrimary={btnPrimary}
      />

      {/* МОДАЛЬНОЕ ОКНО ПРИГЛАШЕНИЯ СОТРУДНИКА */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        invitePosition={invitePosition}
        setInvitePosition={setInvitePosition}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        onSubmit={handleInviteColleague}
        cardBg={cardBg}
        textMain={textMain}
        inputBg={inputBg}
        btnPrimary={btnPrimary}
      />

      {/* МОДАЛЬНОЕ ОКНО НАСТРОЙКИ РЕЖИМА И ПАРТНЕРСКИХ ПРОМОКОДОВ */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onboardTeam={onboardTeam}
        setOnboardTeam={setOnboardTeam}
        promoInput={promoInput}
        setPromoInput={setPromoInput}
        handleApplyPromo={handleApplyPromo}
        isApplyingPromo={isApplyingPromo}
        docData={docData}
        tgChatId={tgChatId}
        setTgChatId={setTgChatId}
        handleSaveSettings={handleSaveSettings}
        cardBg={cardBg}
        textMain={textMain}
        inputBg={inputBg}
        btnPrimary={btnPrimary}
      />

      {/* МОДАЛЬНОЕ ОКНО ОНБОРДИНГА */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        cardBg={cardBg}
        textMain={textMain}
        btnPrimary={btnPrimary}
      />

    </div>
  );
}


// ==========================================
