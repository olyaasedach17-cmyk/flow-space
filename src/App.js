import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { auth, authPersistenceReady, googleProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { Toaster, toast } from 'sonner';
import { Sun, Moon, Settings, Lock, Users } from 'lucide-react';

// Компоненты UI
import ArchiveView from './components/ArchiveView';
import KpiView from './components/KpiView';
import TeamView from './components/TeamView';
import SopView from './components/SopView';
import CompanyAIPanel from './components/CompanyAIPanel';
import AssistantView from './components/AssistantView';
import MatrixView from './components/MatrixView';
import TaskModal from './components/TaskModal';
import SettingsModal from './components/SettingsModal';
import InviteModal from './components/InviteModal';
import MobileNav from './components/MobileNav';
import Sidebar from './components/Sidebar';
import AuthView from './components/AuthView';
import OnboardingModal from './components/OnboardingModal';
import ExecutiveOverview from './components/ExecutiveOverview';
import SoloOverview from './components/SoloOverview';
import IntegrationsView from './components/IntegrationsView';
import ContentHub from './components/ContentHub';
import AIControlCenter from './components/AIControlCenter';
import AITaskReviewModal from './components/AITaskReviewModal';
import HelpView from './components/HelpView';

// Сервисы и утилиты
import { WORKSPACES, ROLES, filterTasksByRole } from './utils/workspaceUtils';
import { sendTelegramAlert, copyToClipboard } from './services/notificationService';
import { callServerAI, safeParseAIJSON } from './services/aiService';
import { generateAIImage } from './services/imageService';
import { runAISpecialist, runAIOrchestrator, buildAIExecutionRecord } from './services/aiTeamService';
import { extractReadyMaterial } from './services/aiOperatingLayer';
import { normalizeSop, updateSopVersion } from './utils/sopUtils';
import { runTaskAutomations } from './utils/automations';
import { calculateCompanyMetrics } from './utils/analytics';
import { buildExecutiveInsights } from './utils/riskEngine';
import useWorkspaceData from './hooks/useWorkspaceData';
import { createCompanyInvite } from './services/inviteService';
import { recordActivityEvent } from './services/activityService';
import { applyPromoCode } from './services/promoService';
import { readGoogleCalendarEvents } from './services/integrationService';
import { normalizeTask, createNormalizedTask, createNextRecurringTask, submitTaskResult, acceptTaskResult, returnTaskForRework, replaceTaskInCollections, inferTaskPriority } from './utils/taskUtils';
import { PRODUCT_MODES, deriveProductMode, buildModeSettings } from './utils/productMode';
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
  const [authResolved, setAuthResolved] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const [activeTab, setActiveTab] = useState('executive');
  const [currentWorkspace, setCurrentWorkspace] = useState(WORKSPACES.COMPANY);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('flowspace_theme') === 'dark');

  const t = useCallback((key) => translations['ru'][key] || key, []);

  // Голосовой ввод
  const [isListening, setIsListening] = useState(false);
  const [voicePreviewReady, setVoicePreviewReady] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
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
  const [newTaskCriteriaText, setNewTaskCriteriaText] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState('none');
  const [newTaskReminder, setNewTaskReminder] = useState('none');
  const [taskKind, setTaskKind] = useState('work');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(false);
  const [newTaskAssignee, setNewTaskAssignee] = useState('manager');
  const [newTaskDepartmentId, setNewTaskDepartmentId] = useState('');
  const [newTaskAiAgent, setNewTaskAiAgent] = useState('');
  const [newTaskSopId, setNewTaskSopId] = useState('');
  const [newTaskProjectName, setNewTaskProjectName] = useState('');

  const [isTaskGenerating, setIsTaskGenerating] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [aiTaskReview, setAiTaskReview] = useState(null);
  const [isApplyingAIReview, setIsApplyingAIReview] = useState(false);
  const [briefingTexts, setBriefingTexts] = useState({});
  const [briefingLoadingKind, setBriefingLoadingKind] = useState('');
  const [calendarEvents, setCalendarEvents] = useState([]);

  // Ассистент
  const [processRole, setProcessRole] = useState('auto');
  const [processTopic, setProcessTopic] = useState('');
  const [processMessages, setProcessMessages] = useState([]);
  const [followUpText, setFollowUpText] = useState('');
  const [isProcessGenerating, setIsProcessGenerating] = useState(false);
  const [processTaskId, setProcessTaskId] = useState('');
  const [processSopId, setProcessSopId] = useState('');
  const [orchestratorPlan, setOrchestratorPlan] = useState(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageQuality, setImageQuality] = useState('medium');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isImageGenerating, setIsImageGenerating] = useState(false);

  // Команда
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [incomingPublication, setIncomingPublication] = useState(null);
  const [contentMode, setContentMode] = useState('post');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePosition, setInvitePosition] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLES.MEMBER);
  const [inviteDepartmentId, setInviteDepartmentId] = useState('');
  const [activityRevision, setActivityRevision] = useState(0);

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
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Обновляем сохранённую сессию до запуска Firestore и серверных API.
          await currentUser.getIdToken(true);
        } catch {
          await signOut(auth).catch(() => {});
          currentUser = null;
        }
      }
      if (active) {
        setUser(currentUser);
        setAuthResolved(true);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const {
    loading: workspaceLoading,
    loadError: workspaceLoadError,
    retryConnection: retryWorkspaceConnection,
    companyId: activeCompanyId,
    role: userRole,
    departmentId: userDepartmentId,
    docData,
    updateWorkspace,
    updateSettings,
    updateMember,
  } = useWorkspaceData({
    user,
    workspace: currentWorkspace,
    defaultKpis,
    defaultAutomations,
    onError: handleError,
  });
  const latestWorkspaceDataRef = useRef(docData);
  latestWorkspaceDataRef.current = docData;

  useEffect(() => {
    if (!docData?.settings) return;
    const mode = deriveProductMode(docData.settings);
    if (docData.settings.teamSize) setOnboardTeam(docData.settings.teamSize);
    setTgChatId(docData.settings.telegramChatId || '');

    if (mode === PRODUCT_MODES.SOLO) {
      setCurrentWorkspace(WORKSPACES.PERSONAL);
      if (['team', 'kpi'].includes(activeTab)) setActiveTab('executive');
    } else if (!currentWorkspace) {
      setCurrentWorkspace(WORKSPACES.COMPANY);
    }

    if (docData.settings.onboardingCompleted !== true) {
      setShowOnboarding(true);
    }
  }, [docData?.settings, activeTab, currentWorkspace]);


const notifyTelegram = useCallback(async (eventType, message) => {
    await sendTelegramAlert({ companyId: activeCompanyId, eventType, message });
  }, [activeCompanyId]);

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
      await authPersistenceReady;
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
      await authPersistenceReady;
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

  const rawTasks = useMemo(() => docData?.tasks || [], [docData]);
  const rawArchive = useMemo(() => docData?.archive || [], [docData]);

  // ФИЛЬТРАЦИЯ ПРОСТРАНСТВ И РОЛЕЙ
  // Если это Личное пространство -> показываем только задачи сотрудника.
  // Если Компания -> руководитель видит всё, линейный сотрудник только свои.
  const addSopState = useCallback((task) => {
    const latestSop = sops.find((sop) => String(sop.id) === String(task.sopId || ''));
    if (!latestSop) return task;
    const latestVersion = Math.max(1, Number(latestSop.version) || 1);
    const taskVersion = Math.max(1, Number(task.sopVersion) || 1);
    return { ...task, sopTitle: latestSop.title || task.sopTitle, sopLatestVersion: latestVersion, sopNeedsReview: latestVersion > taskVersion };
  }, [sops]);
  const tasks = useMemo(() => filterTasksByRole(rawTasks, userRole, user?.uid, currentWorkspace, userDepartmentId).map(addSopState), [rawTasks, userRole, user, currentWorkspace, userDepartmentId, addSopState]);
  const archive = useMemo(() => filterTasksByRole(rawArchive, userRole, user?.uid, currentWorkspace, userDepartmentId).map(addSopState), [rawArchive, userRole, user, currentWorkspace, userDepartmentId, addSopState]);
  const departments = useMemo(() => Array.isArray(docData?.settings?.departments) ? docData.settings.departments : [], [docData?.settings?.departments]);
  const visibleAssistants = useMemo(() => {
    if (userRole === ROLES.MANAGER) return assistants.filter(member => member.departmentId === userDepartmentId);
    if (userRole === ROLES.MEMBER) return assistants.filter(member => member.id === user?.uid);
    return assistants;
  }, [assistants, userRole, userDepartmentId, user]);

  const recordCompanyActivity = useCallback(async ({ type, task, ...details }) => {
    if (currentWorkspace !== WORKSPACES.COMPANY || !activeCompanyId) return;
    try {
      await recordActivityEvent(activeCompanyId, {
        type,
        taskId: task ? String(task.firestoreId || task.id) : undefined,
        departmentId: task?.departmentId || details.departmentId || '',
        departmentName: task?.departmentName || details.departmentName || '',
        resourceTitle: task?.text || details.resourceTitle || '',
        details: details.details || '',
      });
      setActivityRevision(value => value + 1);
    } catch (error) {
      console.warn('Activity event was not recorded:', error);
    }
  }, [activeCompanyId, currentWorkspace]);
  const isPro = useMemo(() => docData?.isPro || !!docData?.appliedPromo, [docData]);
  const productMode = useMemo(() => deriveProductMode(docData?.settings), [docData?.settings]);
  const isTeamMode = productMode === PRODUCT_MODES.TEAM;

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

  const executiveInsights = useMemo(() => {
    const riskTasks = currentWorkspace === WORKSPACES.PERSONAL ? tasks.filter((task) => task.category !== 'personal') : tasks;
    const riskArchive = currentWorkspace === WORKSPACES.PERSONAL ? archive.filter((task) => task.category !== 'personal') : archive;
    return buildExecutiveInsights(riskTasks, riskArchive, currentWorkspace === WORKSPACES.COMPANY ? assistants : [], docData?.settings?.executivePolicy);
  }, [tasks, archive, assistants, currentWorkspace, docData?.settings?.executivePolicy]);

  useEffect(() => {
    setBriefingTexts({});
    setBriefingLoadingKind('');
  }, [activeCompanyId, currentWorkspace]);

  useEffect(() => {
    if (activeTab !== 'executive' || currentWorkspace !== WORKSPACES.PERSONAL || !activeCompanyId || !user) {
      setCalendarEvents([]);
      return;
    }
    let cancelled = false;
    readGoogleCalendarEvents({ companyId: activeCompanyId })
      .then((result) => { if (!cancelled) setCalendarEvents(result?.events || []); })
      .catch(() => { if (!cancelled) setCalendarEvents([]); });
    return () => { cancelled = true; };
  }, [activeTab, activeCompanyId, currentWorkspace, user]);

  useEffect(() => {
    if (!activeCompanyId || currentWorkspace !== WORKSPACES.COMPANY || !docData?.settings?.telegramChatId) return;
    const overdue = executiveInsights.items.find(item => item.id === 'overdue');
    if (overdue) {
      const key = `flowspace_tg_deadline_${activeCompanyId}`;
      const signature = JSON.stringify([overdue.title, overdue.taskIds || []]);
      if (localStorage.getItem(key) !== signature) {
        notifyTelegram('deadline_risk', `⏳ ${overdue.title}\n${overdue.description}`).then((result) => {
          if (result?.ok && !result?.skipped) localStorage.setItem(key, signature);
        });
      }
    }
    if (userRole === ROLES.OWNER && executiveInsights.ownerItems.length) {
      const key = `flowspace_tg_owner_${activeCompanyId}`;
      const signature = JSON.stringify(executiveInsights.ownerItems.map(item => [item.id, item.title]));
      if (localStorage.getItem(key) !== signature) {
        notifyTelegram('owner_decision', `🔴 Требуется решение собственника\n${executiveInsights.ownerItems.slice(0, 3).map(item => `• ${item.title}: ${item.description}`).join('\n')}`).then((result) => {
          if (result?.ok && !result?.skipped) localStorage.setItem(key, signature);
        });
      }
    }
  }, [activeCompanyId, currentWorkspace, docData?.settings?.telegramChatId, executiveInsights, userRole, notifyTelegram]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return toast.error('Введите промокод');
    if (!activeCompanyId) return toast.error('Компания ещё не загружена');
    const code = promoInput.toUpperCase().trim();
    setIsApplyingPromo(true);

    try {
      const result = await applyPromoCode({ companyId: activeCompanyId, code });
      setOnboardTeam('👥 2-5 человек');
      toast.success(`Промокод применён. Активирован тариф ${String(result.plan || 'PRO').toUpperCase()}.`);
      setPromoInput('');
      setShowOnboarding(false);
    } catch (err) {
      handleError(err, 'Активация промокода');
    } finally {
      setIsApplyingPromo(false);
    }
  };


  const handleApplyTemplate = useCallback((template) => {
    try {
      if (!template || !template.tasks || template.tasks.length === 0) {
        throw new Error('Шаблон пуст или поврежден');
      }

      const ownDepartment = departments.find(item => item.id === userDepartmentId);
      const newTasks = template.tasks.map((tItem) => createNormalizedTask({
        title: tItem.text,
        description: tItem.description || '',
        estimatedHours: tItem.estimatedHours || 1,
        dueDate: '',
        urgent: tItem.urgent || false,
        important: tItem.important || false,
        status: 'todo',
        assigneeId: user?.uid,
        assigneeName: user?.displayName || user?.email?.split('@')[0] || 'Владелец',
        departmentId: userDepartmentId || '',
        departmentName: ownDepartment?.name || '',
        createdBy: user?.uid,
      }));

      updateWorkspace({ tasks: [...newTasks, ...tasks] });
      toast.success(`Пакет "${template.name}" добавлен (${newTasks.length} задач)`);
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Ошибка применения шаблона:', error);
      toast.error(error.message || 'Не удалось применить шаблон');
    }
  }, [tasks, updateWorkspace, departments, userDepartmentId, user]);

const handleInviteColleague = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeCompanyId) return;

    const lowerEmail = inviteEmail.toLowerCase().trim();
    const assignedRole = inviteRole === ROLES.MANAGER ? ROLES.MANAGER : ROLES.MEMBER;

    try {
      await createCompanyInvite({
        companyId: activeCompanyId,
        email: lowerEmail,
        position: invitePosition || 'Сотрудник',
        role: assignedRole,
        departmentId: inviteDepartmentId,
      });

      setIsInviteOpen(false);
      setInviteEmail('');
      setInvitePosition('');
      setInviteRole(ROLES.MEMBER);
      setInviteDepartmentId('');
      await recordCompanyActivity({
        type: 'member_invited',
        resourceTitle: lowerEmail,
        departmentId: inviteDepartmentId,
        departmentName: departments.find(item => item.id === inviteDepartmentId)?.name || '',
        details: assignedRole === ROLES.MANAGER ? 'Роль: руководитель' : 'Роль: сотрудник',
      });
      toast.success(`Приглашение для ${lowerEmail} создано. Оно применится при входе сотрудника.`);
    } catch (err) {
      handleError(err, 'Приглашение сотрудника');
    }
  };

  const handleCreateDepartment = async (name) => {
    const cleanName = String(name || '').trim();
    if (!cleanName) return;
    if (departments.some(item => item.name.toLowerCase() === cleanName.toLowerCase())) {
      return toast.error('Такой отдел уже существует');
    }
    const nextDepartments = [...departments, {
      id: `department_${Date.now()}`,
      name: cleanName.slice(0, 80),
    }];
    try {
      await updateSettings({ ...docData.settings, departments: nextDepartments });
      await recordCompanyActivity({
        type: 'department_created',
        resourceTitle: cleanName,
        departmentId: nextDepartments.at(-1).id,
        departmentName: cleanName,
      });
      toast.success(`Отдел «${cleanName}» создан`);
    } catch (error) {
      handleError(error, 'Создание отдела');
    }
  };

  const handleAssignDepartment = async (memberId, departmentId) => {
    const department = departments.find(item => item.id === departmentId);
    try {
      await updateMember(memberId, {
        departmentId: department?.id || '',
        departmentName: department?.name || '',
      });
      await recordCompanyActivity({
        type: 'member_department_changed',
        resourceTitle: assistants.find(item => item.id === memberId)?.name || 'Сотрудник',
        departmentId: department?.id || '',
        departmentName: department?.name || '',
        details: department ? `Назначен отдел «${department.name}»` : 'Отдел очищен',
      });
      toast.success(department ? `Сотрудник добавлен в отдел «${department.name}»` : 'Отдел сотрудника очищен');
    } catch (error) {
      handleError(error, 'Назначение отдела');
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
      const message = 'Ваш браузер не поддерживает голосовой ввод. Используйте Chrome или Safari.';
      setVoicePreviewReady(false);
      setVoiceMessage(message);
      return toast.error(message);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setVoicePreviewReady(false);
      setVoiceMessage('');
      setIsListening(true);
    };
    
    recognition.onresult = async (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || '')
        .join(' ')
        .trim();
      setIsListening(false);
      if (!transcript) {
        setVoiceMessage('Не удалось разобрать речь. Попробуйте ещё раз.');
        return;
      }
      setVoiceMessage('Готовлю preview задачи…');

      try {
        const prompt = `Пользователь надиктовал задачу: "${transcript}".
Верни ТОЛЬКО один валидный JSON-объект:
{"text":"Краткое название","description":"Детали","expectedResult":"Ожидаемый результат, если понятен","assignee":"Имя, если названо","dueDate":"YYYY-MM-DD или пустая строка","time":"HH:MM или пустая строка","urgent":true/false,"important":true/false}.
Слова «срочно», «сегодня», «немедленно», «горит» означают urgent=true. Слова «важно», «приоритет», «ключевая», «обязательно» означают important=true.`;

        const response = await callServerAI({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.1
        });

        const parsed = safeParseAIJSON(response.choices[0].message.content);
        const preview = Array.isArray(parsed) ? parsed[0] : parsed;
        const inferred = inferTaskPriority(transcript);
        const suggested = isTeamMode && preview?.assignee
          ? visibleAssistants.find((assistant) => assistant.name.toLowerCase().includes(String(preview.assignee).toLowerCase()))
          : null;
        if (suggested) {
          setNewTaskAssignee(suggested.id);
          setNewTaskDepartmentId(suggested.departmentId || '');
        }
        setNewTaskTitle(String(preview?.text || transcript).slice(0, 180));
        setNewTaskDesc(String(preview?.description || transcript).slice(0, 4000));
        setNewTaskExpectedResult(String(preview?.expectedResult || '').slice(0, 1000));
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(preview?.dueDate || ''))) setNewTaskDueDate(preview.dueDate);
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(preview?.time || ''))) setNewTaskTime(preview.time);
        setNewUrgent(Boolean(preview?.urgent || inferred.urgent));
        setNewImportant(Boolean(preview?.important || inferred.important));
        setVoicePreviewReady(true);
        setVoiceMessage('Проверьте задачу, срок и приоритеты перед созданием.');
        toast.success('Preview готов — задача ещё не создана');

      } catch (err) {
        const inferred = inferTaskPriority(transcript);
        setNewTaskTitle(transcript.slice(0, 180));
        setNewTaskDesc(transcript.slice(0, 4000));
        setNewUrgent(inferred.urgent);
        setNewImportant(inferred.important);
        setVoicePreviewReady(true);
        setVoiceMessage('Речь распознана. Проверьте preview перед созданием.');
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const message = event?.error === 'not-allowed'
        ? 'Разрешите доступ к микрофону в настройках браузера.'
        : event?.error === 'no-speech'
          ? 'Речь не услышана. Нажмите микрофон и попробуйте ещё раз.'
          : 'Голосовой ввод остановлен. Попробуйте ещё раз.';
      setVoiceMessage(message);
    };
    recognition.onend = () => setIsListening(false);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceMessage('Не удалось запустить микрофон. Закройте другие приложения, использующие его, и повторите.');
    }
  }, [isListening, isTeamMode, visibleAssistants]);

  const handleRunAIAgent = async () => {
    const activeTasksToCheck = tasks.filter((task) => ['todo', 'in_progress'].includes(task.status));
    const tasksToImprove = activeTasksToCheck.filter((task) => !task.expectedResult || !task.description || parseFloat(task.estimatedHours) === 0);
    if (!tasksToImprove.length) return toast.info('Все активные задачи уже содержат результат, описание и оценку времени');

    setIsAgentRunning(true);
    try {
      const prompt = `Ты — бизнес-архитектор Flow Space. Принцип: «Контролируй результат, а не каждый шаг».
Проверь ВСЕ переданные задачи. Для каждой подготовь недостающий образ результата, короткий контекст, реалистичную оценку времени и приоритет.
${isTeamMode ? `Допустимые исполнители: ${visibleAssistants.map((assistant) => assistant.name).join(', ')}. Поле assignee должно содержать только имя из этого списка.` : 'Поле assignee не добавляй.'}
Не пропускай задачи. Верни строго валидный JSON без Markdown:
{"tasks":[{"id":"исходный id","expectedResult":"проверяемый готовый результат","description":"короткий контекст","estimatedHours":1.5,"urgent":false,"important":true${isTeamMode ? ',"assignee":"Имя"' : ''}}]}

Задачи:
${JSON.stringify(tasksToImprove.map((task) => ({
  id: task.id,
  title: task.text,
  description: task.description || '',
  expectedResult: task.expectedResult || '',
  estimatedHours: Number(task.estimatedHours) || 0,
  dueDate: task.dueDate || '',
  urgent: Boolean(task.urgent),
  important: Boolean(task.important),
  assignee: task.assigneeName || '',
})))}`;

      const response = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.1
      });

      const parsed = safeParseAIJSON(response.choices[0].message.content.trim());
      const results = Array.isArray(parsed) ? parsed : parsed?.tasks;
      if (!Array.isArray(results)) throw new Error('AI не вернул список проверенных задач');
      const resultsById = new Map(results.map((item) => [String(item.id), item]));
      const proposals = tasksToImprove.flatMap((task) => {
        const aiResult = resultsById.get(String(task.id));
        if (!aiResult) return [];
        const aiAssignee = visibleAssistants.find((item) => item.name.toLowerCase() === String(aiResult.assignee || '').toLowerCase());
        const nextTask = {
          ...task,
          expectedResult: task.expectedResult || aiResult.expectedResult || '',
          description: task.description || aiResult.description || '',
          estimatedHours: parseFloat(task.estimatedHours) || parseFloat(aiResult.estimatedHours) || 1,
          urgent: aiResult.urgent !== undefined ? Boolean(aiResult.urgent) : task.urgent,
          important: aiResult.important !== undefined ? Boolean(aiResult.important) : task.important,
          assigneeId: aiAssignee?.id || task.assigneeId,
          assigneeName: aiAssignee?.name || task.assigneeName,
          departmentId: aiAssignee?.departmentId || task.departmentId || '',
          departmentName: aiAssignee?.departmentName || task.departmentName || '',
        };
        const fields = ['expectedResult', 'description', 'estimatedHours', 'urgent', 'important', 'assigneeName'];
        const changes = fields
          .filter((field) => String(task[field] ?? '') !== String(nextTask[field] ?? ''))
          .map((field) => ({ field, value: nextTask[field] }));
        return changes.length ? [{ id: task.id, title: task.text, nextTask, changes }] : [];
      });

      if (!proposals.length) return toast.info('AI не нашёл изменений, которые стоит применить');
      setAiTaskReview({ proposals, checkedCount: activeTasksToCheck.length });
      toast.info('Предложения готовы. Проверьте их перед сохранением.');
    } catch (error) {
      handleError(error, 'Запуск Умного Агента');
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleApplyAITaskReview = async (selectedProposals) => {
    if (!selectedProposals?.length) return;
    setIsApplyingAIReview(true);
    try {
      const selectedById = new Map(selectedProposals.map((item) => [String(item.id), item.nextTask]));
      await updateWorkspace({
        tasks: tasks.map((task) => selectedById.get(String(task.id)) || task),
      });
      setAiTaskReview(null);
      toast.success(`Уточнено задач: ${selectedProposals.length}`);
    } catch (error) {
      handleError(error, 'Сохранение предложений AI');
    } finally {
      setIsApplyingAIReview(false);
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
        slaSampleSize: companyMetrics.slaSampleSize,
        overdueRate: companyMetrics.overdueRate,
        totalHours: companyMetrics.totalHoursEstimated,
        acceptedResults: companyMetrics.doneTasksCount,
        reviewedResults: companyMetrics.reviewedDoneCount,
        tasksWithExpectedResult: tasks.filter(t => !!t.expectedResult).length
      };

      const systemPrompt = `Ты — Executive AI-консультант Flow Space. Твой фундаментальный принцип: «Контролируй результат, а не каждый шаг».
Сформируй для руководителя лаконичную управленческую сводку (до 180 слов) строго по 3 блокам:
1. 🎯 ДОСТИЖЕНИЕ РЕЗУЛЬТАТОВ: статус выполнения обязательств и соблюдение SLA. Принятых результатов: ${promptData.acceptedResults}. Результатов с дедлайном в выборке SLA: ${promptData.slaSampleSize}; если их 0, прямо напиши, что SLA пока нельзя оценить, и не называй ${promptData.slaScore}% фактическим показателем.
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
      const topic = processTopic.trim();
      const inferredRole = /продаж|клиент|сделк|коммерческ/i.test(topic) ? 'sales'
        : /анализ|таблиц|показател|данн|kpi/i.test(topic) ? 'analyst'
          : /контент|пост|instagram|соцсет/i.test(topic) ? 'smm'
            : /регламент|процесс|недел/i.test(topic) ? 'operations'
              : /ваканс|сотрудник|команд|интервью/i.test(topic) ? 'hr'
                : /договор|юрид|право/i.test(topic) ? 'lawyer'
                  : /стратег|проект|запуск|план/i.test(topic) ? 'consultant'
                    : 'copywriter';
      const effectiveRole = processRole === 'auto' ? inferredRole : processRole;
      const selectedAgent = aiOptions.find(o => o.id === effectiveRole) || aiOptions.find(o => o.id === inferredRole);
      setProcessRole(selectedAgent?.id || inferredRole);
      const selectedContextTask = tasks.find(t => String(t.id) === String(processTaskId));
      const selectedSop = currentWorkspace === WORKSPACES.COMPANY ? sops.find(s => String(s.id) === String(processSopId)) : null;
      const data = await runAISpecialist({
        agent: selectedAgent,
        topic,
        company: currentWorkspace === WORKSPACES.COMPANY ? docData : null,
        task: selectedContextTask,
        sop: selectedSop,
        history: []
      });

      const responseText = data.displayText || data.choices?.[0]?.message?.content?.trim() || 'AI не вернул результат.';
      setProcessMessages([
        { role: 'user', content: topic },
        { role: 'assistant', content: responseText }
      ]);
      setProcessTopic('');
      if (/визуал|изображен|картин|обложк/i.test(topic)) {
        setImagePrompt(topic);
        await handleGenerateImage(topic);
      }
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
      const selectedAgent = aiOptions.find(o => o.id === processRole);
      const selectedContextTask = tasks.find(t => String(t.id) === String(processTaskId));
      const selectedSop = currentWorkspace === WORKSPACES.COMPANY ? sops.find(s => String(s.id) === String(processSopId)) : null;
      const data = await runAISpecialist({
        agent: selectedAgent,
        topic: followUpText,
        company: currentWorkspace === WORKSPACES.COMPANY ? docData : null,
        task: selectedContextTask,
        sop: selectedSop,
        history: processMessages
      });

      const responseText = data.displayText || data.choices?.[0]?.message?.content?.trim() || 'AI не вернул результат.';
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

  const handleBuildAIPlan = async () => {
    if (!processTopic.trim()) return toast.error('Опишите, что нужно сделать');
    const plan = await runAIOrchestrator({
      goal: processTopic,
      agents: aiOptions,
      company: currentWorkspace === WORKSPACES.COMPANY ? docData : null,
      task: tasks.find(t => String(t.id) === String(processTaskId)),
      sop: currentWorkspace === WORKSPACES.COMPANY ? sops.find(s => String(s.id) === String(processSopId)) : null,
    });
    setOrchestratorPlan(plan);
    toast.success('План выполнения готов');
  };

  const handleGenerateImage = async (promptOverride) => {
    const promptText = typeof promptOverride === 'string' ? promptOverride.trim() : imagePrompt.trim();
    if (!promptText) return toast.error('Опишите, какой визуал нужно создать');
    setIsImageGenerating(true);
    setGeneratedImage(null);
    try {
      const result = await generateAIImage({
        prompt: promptText,
        size: imageSize,
        quality: imageQuality,
      });
      if (result.status === 'completed') {
        const image = result.image || {};
        const url = image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null);
        setGeneratedImage({
          url,
          revisedPrompt: image.revisedPrompt || null,
          usage: result.usage || null,
          model: result.model || null,
        });
        toast.success('Визуал создан');
      } else {
        setGeneratedImage({ pending: true, id: result.id || null });
        toast.info('Изображение ещё создаётся');
      }
    } catch (err) {
      handleError(err, 'Генерация изображения');
    } finally {
      setIsImageGenerating(false);
    }
  };

  const handleAttachImageToTask = async () => {
    const target = tasks.find(t => String(t.id) === String(processTaskId));
    if (!target) return toast.error('Сначала выберите задачу');
    if (!generatedImage?.url) return toast.error('Сначала создайте изображение');

    const rawTasks = docData?.tasks || [];
    const execution = {
      id: `image_${Date.now()}`,
      type: 'polza_image_generation',
      prompt: imagePrompt.trim(),
      imageUrl: generatedImage.url,
      model: generatedImage.model || null,
      createdBy: user?.uid || null,
      createdAt: new Date().toISOString(),
    };
    const updated = normalizeTask({
      ...target,
      aiExecutionHistory: [...(target.aiExecutionHistory || []), execution],
      resultArtifact: {
        ...(target.resultArtifact || {}),
        url: generatedImage.url,
        note: target.resultArtifact?.note || `AI-визуал: ${imagePrompt.trim()}`,
      },
    }, user?.uid);
    await updateWorkspace({ tasks: rawTasks.map(t => String(t.id) === String(target.id) ? updated : t) });
    await recordCompanyActivity({ type: 'ai_result_attached', task: updated, details: 'Создан и сохранён AI-визуал' });
    toast.success('Изображение сохранено в задаче');
  };

  const handleAttachAIResult = async (content) => {
    const target = tasks.find(t => String(t.id) === String(processTaskId));
    if (!target) {
      toast.error('Сначала выберите задачу');
      return;
    }
    const selectedAgent = aiOptions.find(o => o.id === processRole);
    const execution = buildAIExecutionRecord({
      agentId: processRole,
      agentLabel: selectedAgent?.label || processRole,
      output: content,
      structuredOutput: null,
      taskId: target.id,
      sopId: processSopId || null,
      userId: user?.uid
    });
    const rawTasks = docData?.tasks || [];
    const updated = normalizeTask({
      ...target,
      aiAgentId: processRole,
      aiExecutionHistory: [...(target.aiExecutionHistory || []), execution],
      resultArtifact: {
        ...(target.resultArtifact || {}),
        note: content
      }
    }, user?.uid);
    await updateWorkspace({ tasks: rawTasks.map(t => t.id === target.id ? updated : t) });
    await recordCompanyActivity({ type: 'ai_result_attached', task: updated, details: `AI Team: ${selectedAgent?.label || processRole}` });
    toast.success('Результат AI сохранён в задаче');
  };

  const handleAttachWorkflowToTask = async ({ taskId, workflow, outputType, goal, sourceType = 'sheets' }) => {
    const target = tasks.find(t => String(t.id) === String(taskId));
    if (!target) return toast.error('Задача не найдена');
    const rawTasks = docData?.tasks || [];
    const execution = {
      id: `workflow_${Date.now()}`,
      type: sourceType === 'docs' ? 'google_docs_ai_artifact' : 'google_sheets_ai_artifact',
      outputType,
      goal,
      source: sourceType === 'docs' ? { provider: 'google_docs', documentId: workflow?.source?.documentId || '', title: workflow?.source?.title || '' } : { provider: 'google_sheets', range: workflow?.sheet?.range || '', rows: workflow?.sheet?.rows || 0 },
      title: workflow?.result?.title || 'AI Workflow',
      summary: workflow?.result?.summary || '',
      insights: workflow?.result?.insights || [],
      recommendations: workflow?.result?.recommendations || [],
      artifactFilename: workflow?.artifact?.filename || null,
      createdBy: user?.uid || null,
      createdAt: new Date().toISOString(),
    };
    const updated = normalizeTask({
      ...target,
      aiExecutionHistory: [...(target.aiExecutionHistory || []), execution],
      resultArtifact: {
        ...(target.resultArtifact || {}),
        note: [workflow?.result?.summary, ...(workflow?.result?.recommendations || []).map(x => `• ${x}`)].filter(Boolean).join('\n\n'),
        filename: workflow?.artifact?.filename || target.resultArtifact?.filename || null,
        source: sourceType === 'docs' ? 'google_docs_ai_workflow' : 'google_sheets_ai_workflow',
      },
    }, user?.uid);
    await updateWorkspace({ tasks: rawTasks.map(t => String(t.id) === String(target.id) ? updated : t) });
    await recordCompanyActivity({ type: 'ai_result_attached', task: updated, details: sourceType === 'docs' ? 'Результат из Google Docs' : 'Результат из Google Sheets' });
    toast.success('AI Workflow сохранён в задаче');
  };

  const handleSaveContentToTask = async ({ taskId, platform, goal, topic, packageData, selectedVariant, postText, image }) => {
    const target = tasks.find(t => String(t.id) === String(taskId));
    if (!target) return toast.error('Задача не найдена');
    const rawTasks = docData?.tasks || [];
    const execution = {
      id: `content_${Date.now()}`,
      type: 'content_studio_post',
      platform,
      goal,
      topic: String(topic || '').trim(),
      title: packageData?.title || 'Публикация',
      strategy: packageData?.strategy || '',
      selectedVariant: Number(selectedVariant || 0),
      postText: String(postText || '').trim(),
      visualPrompt: packageData?.visualPrompt || '',
      imageUrl: image?.url || null,
      imageModel: image?.model || null,
      createdBy: user?.uid || null,
      createdAt: new Date().toISOString(),
    };
    const updated = normalizeTask({
      ...target,
      aiAgentId: target.aiAgentId || 'smm',
      aiExecutionHistory: [...(target.aiExecutionHistory || []), execution],
      resultArtifact: {
        ...(target.resultArtifact || {}),
        note: String(postText || '').trim(),
        url: image?.url || target.resultArtifact?.url || null,
        source: 'content_studio',
      },
    }, user?.uid);
    await updateWorkspace({ tasks: rawTasks.map(t => String(t.id) === String(target.id) ? updated : t) });
    await recordCompanyActivity({ type: 'ai_result_attached', task: updated, details: `Готовая публикация для ${platform}` });
    toast.success('Готовый пост сохранён в задаче');
  };

  const handleCreateContentPlanTasks = ({ platform, plan, items = [] }) => {
    const cleanItems = items.filter((item) => item?.topic).slice(0, 14);
    if (!cleanItems.length) return toast.error('Контент-план пуст');
    const now = new Date();
    const rawTasks = docData?.tasks || [];
    const created = cleanItems.map((item, idx) => {
      const due = new Date(now);
      due.setDate(now.getDate() + idx);
      const output = item.generated || null;
      const execution = output ? [{
        id: `content_plan_${Date.now()}_${idx}`,
        type: 'content_calendar_post',
        platform,
        planTitle: plan?.title || '',
        day: item.day,
        goal: item.goal,
        topic: item.topic,
        postText: output.postText || '',
        imageUrl: output.image?.url || null,
        createdBy: user?.uid || null,
        createdAt: new Date().toISOString(),
      }] : [];
      return normalizeTask({
        id: `content_task_${Date.now()}_${idx}`,
        text: `Контент · День ${item.day}: ${item.topic}`.slice(0, 180),
        description: [
          item.brief,
          item.cta ? `CTA: ${item.cta}` : '',
          item.visualDirection ? `Визуал: ${item.visualDirection}` : '',
          plan?.strategy ? `Стратегия периода: ${plan.strategy}` : '',
        ].filter(Boolean).join('\n\n'),
        expectedResult: `Готовая публикация для ${platform}: текст проверен, визуал подготовлен при необходимости и материал готов к публикации.`,
        successCriteria: ['Текст соответствует цели публикации', 'Соблюдён tone of voice', 'Есть понятный CTA', 'Факты о компании не выдуманы'],
        estimatedHours: 0.5,
        dueDate: due.toISOString().slice(0, 10),
        urgent: false,
        important: true,
        status: output ? 'in_progress' : 'todo',
        assigneeId: user?.uid,
        assigneeName: user?.displayName || user?.email?.split('@')[0] || 'Владелец',
        departmentId: userDepartmentId || '',
        departmentName: departments.find(item => item.id === userDepartmentId)?.name || '',
        createdBy: user?.uid,
        aiAgentId: 'smm',
        aiExecutionHistory: execution,
        resultArtifact: output ? { note: output.postText || '', url: output.image?.url || '' } : { note: '', url: '' },
      }, user?.uid);
    });
    updateWorkspace({ tasks: [...created, ...rawTasks] });
    toast.success(`Создано задач контент-плана: ${created.length}`);
  };

  const handleCreateRecommendedTasks = ({ items = [], workflow, goal, sourceType }) => {
    const cleanItems = items.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8);
    if (!cleanItems.length) return toast.error('Нет рекомендаций для создания задач');
    const now = Date.now();
    const rawTasks = docData?.tasks || [];
    const created = cleanItems.map((text, idx) => normalizeTask({
      id: now + idx,
      text: text.slice(0, 180),
      description: [
        `Создано из AI Workflow: ${workflow?.result?.title || 'AI-анализ'}`,
        workflow?.result?.summary || '',
        goal ? `Цель анализа: ${goal}` : '',
      ].filter(Boolean).join('\n\n'),
      expectedResult: `Выполнить рекомендацию и зафиксировать проверяемый результат: ${text}`.slice(0, 1200),
      estimatedHours: 1,
      urgent: false,
      important: true,
      status: 'todo',
      assigneeId: user?.uid,
      assigneeName: user?.displayName || user?.email?.split('@')[0] || 'Владелец',
      departmentId: userDepartmentId || '',
      departmentName: departments.find(item => item.id === userDepartmentId)?.name || '',
      source: sourceType === 'docs' ? 'google_docs_ai_workflow' : 'google_sheets_ai_workflow',
      createdBy: user?.uid,
      createdAt: new Date().toISOString(),
    }, user?.uid));
    updateWorkspace({ tasks: [...created, ...rawTasks] });
    toast.success(`Создано задач: ${created.length}`);
  };

  const handleSaveToSOP = async (content) => {
    toast.info('Создание регламента...');
    try {
      const readyContent = extractReadyMaterial(content);
      if (!readyContent) return toast.error('AI не вернул готовую инструкцию для сохранения');
      const response = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: `Придумай короткий заголовок (до 5 слов) для этого документа: ${readyContent.substring(0, 500)}` }],
        temperature: 0.3
      });
      const title = response.choices[0].message.content.trim().replace(/["']/g, '');
      
      const now = new Date().toISOString();
      const newSOP = normalizeSop({
        id: Date.now(),
        title: title,
        content: readyContent,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: user?.uid || null,
        date: new Date().toLocaleDateString('ru-RU')
      });

      updateWorkspace({ sops: [newSOP, ...sops] });
      toast.success('Сохранено в Базу Регламентов!');
    } catch (err) {
      handleError(err, 'Сохранение регламента');
    }
  };

  const handleUpdateSOP = async (id, changes) => {
    const current = sops.find((item) => String(item.id) === String(id));
    if (!current) return toast.error('Регламент не найден');
    const updated = updateSopVersion(current, changes, user?.uid);
    const nextSops = sops.map((item) => String(item.id) === String(id) ? updated : item);
    const nextTasks = rawTasks.map((task) => String(task.sopId || '') === String(id) ? { ...task, sopTitle: updated.title } : task);
    const nextArchive = rawArchive.map((task) => String(task.sopId || '') === String(id) ? { ...task, sopTitle: updated.title } : task);
    await updateWorkspace({ sops: nextSops, tasks: nextTasks, archive: nextArchive });
    toast.success(updated.version === (Number(current.version) || 1) ? 'Изменений нет' : `Сохранена версия ${updated.version}`);
  };

  const handleDeleteSOP = (id) => {
    const linkedTask = [...(docData?.tasks || []), ...(docData?.archive || [])].find(task => String(task.sopId || '') === String(id));
    if (linkedTask) {
      toast.error(`Регламент используется в задаче «${linkedTask.text}». Сначала отвяжите его от задачи.`);
      return;
    }
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
    setTaskKind(currentWorkspace === WORKSPACES.COMPANY ? 'team' : 'work');
    setIsCreateOpen(true);
    toast.success('Заполнено для создания задачи');
  };

 const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const selectedAssignee = assistants.find(a => a.id === newTaskAssignee);
    const isPersonalWorkspace = currentWorkspace === WORKSPACES.PERSONAL;
    const simplePersonalTask = isPersonalWorkspace && taskKind === 'personal';
    const assigneeName = isPersonalWorkspace
      ? (user?.displayName || user?.email?.split('@')[0] || 'Я')
      : (isTeamMode ? (selectedAssignee?.name || 'Владелец') : (user?.displayName || 'Владелец'));
    const assigneeId = isPersonalWorkspace
      ? user?.uid
      : (isTeamMode ? (selectedAssignee?.id || user?.uid) : user?.uid);
    const taskDepartmentId = isPersonalWorkspace
      ? ''
      : userRole === ROLES.OWNER
        ? newTaskDepartmentId
        : (selectedAssignee?.departmentId || userDepartmentId || '');
    const taskDepartmentName = isPersonalWorkspace ? '' : (selectedAssignee?.departmentName || departments.find(item => item.id === taskDepartmentId)?.name || '');
    const selectedSop = isPersonalWorkspace ? null : sops.find(sop => String(sop.id) === String(newTaskSopId));

    // SaaS безопасность: берем полный массив задач из базы, а не отфильтрованный
    const rawTasks = docData?.tasks || [];
    const rawArchive = docData?.archive || [];
    let taskObj;

    if (selectedTask) {
      taskObj = normalizeTask({
        ...selectedTask,
        text: newTaskTitle,
        description: newTaskDesc,
        expectedResult: newTaskExpectedResult,
        successCriteria: newTaskCriteriaText,
        estimatedHours: parseFloat(newTaskHours) || 0,
        dueDate: newTaskDueDate,
        time: newTaskTime,
        recurrence: newTaskRecurrence,
        reminder: newTaskReminder,
        category: isPersonalWorkspace && taskKind === 'personal' ? 'personal' : 'work',
        urgent: newUrgent,
        important: newImportant,
        assigneeId,
        assigneeName,
        departmentId: taskDepartmentId,
        departmentName: taskDepartmentName,
        aiAgentId: newTaskAiAgent,
        sopId: selectedSop?.id || '',
        sopTitle: selectedSop?.title || '',
        sopVersion: selectedSop ? (Number(selectedSop.version) || 1) : 0,
        projectName: newTaskProjectName
      }, user?.uid);

      await updateWorkspace(replaceTaskInCollections(rawTasks, rawArchive, taskObj));
      await recordCompanyActivity({
        type: 'task_updated',
        task: taskObj,
        details: selectedTask.assigneeId !== taskObj.assigneeId
          ? `Новый исполнитель: ${taskObj.assigneeName}`
          : selectedTask.dueDate !== taskObj.dueDate
            ? `Новый срок: ${taskObj.dueDate || 'не указан'}`
            : 'Обновлены условия задачи',
      });
      toast.success('Задача обновлена');
    } else {
      taskObj = createNormalizedTask({
        title: newTaskTitle,
        description: newTaskDesc,
        expectedResult: newTaskExpectedResult,
        successCriteria: newTaskCriteriaText,
        estimatedHours: simplePersonalTask ? 0 : (parseFloat(newTaskHours) || 1),
        dueDate: newTaskDueDate,
        time: newTaskTime,
        recurrence: newTaskRecurrence,
        reminder: newTaskReminder,
        category: isPersonalWorkspace && taskKind === 'personal' ? 'personal' : 'work',
        urgent: newUrgent,
        important: newImportant,
        assigneeId,
        assigneeName,
        departmentId: taskDepartmentId,
        departmentName: taskDepartmentName,
        createdBy: user?.uid || 'owner',
        aiAgentId: newTaskAiAgent,
        sopId: selectedSop?.id || '',
        sopTitle: selectedSop?.title || '',
        sopVersion: selectedSop ? (Number(selectedSop.version) || 1) : 0,
        projectName: newTaskProjectName
      });

      await updateWorkspace({ tasks: [taskObj, ...rawTasks] });
      await recordCompanyActivity({ type: 'task_created', task: taskObj });
      const todayKey = new Date().toLocaleDateString('sv-SE');
      const dueLabel = taskObj.dueDate
        ? (String(taskObj.dueDate).slice(0, 10) === todayKey
          ? 'Сегодня'
          : new Date(`${String(taskObj.dueDate).slice(0, 10)}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }))
        : 'Без срока';
      toast.success('Задача создана', {
        description: [taskObj.projectName ? `Проект: «${taskObj.projectName}»` : '', `Срок: ${dueLabel}`].filter(Boolean).join(' · '),
        action: { label: 'Открыть', onClick: () => openTaskModal(taskObj) },
        cancel: { label: 'Создать ещё', onClick: () => openTaskModal(null, taskKind) },
        duration: 7000,
      });
      processTaskAutomations('task_created', taskObj);
    }

    closeModal();
  };

  const openTaskModal = useCallback((task = null, requestedKind = null) => {
    setVoicePreviewReady(false);
    setVoiceMessage('');
    if (task) {
      setSelectedTask(task);
      setNewTaskTitle(task.text);
      setNewTaskDesc(task.description || '');
      setNewTaskExpectedResult(task.expectedResult || '');
      setNewTaskCriteriaText((task.successCriteria || []).join('\n'));
      setNewTaskHours(task.estimatedHours || '');
      setNewTaskDueDate(task.dueDate || '');
      setNewTaskTime(task.time || '');
      setNewTaskRecurrence(task.recurrence || 'none');
      setNewTaskReminder(task.reminder || 'none');
      setTaskKind(currentWorkspace === WORKSPACES.COMPANY ? 'team' : (task.category === 'personal' ? 'personal' : 'work'));
      setNewUrgent(task.urgent || false);
      setNewImportant(task.important || false);
      setNewTaskAiAgent(task.aiAgentId || '');
      setNewTaskSopId(task.sopId || '');
      setNewTaskProjectName(task.projectName || '');
      setNewTaskAssignee(task.assigneeId || user?.uid || 'manager');
      setNewTaskDepartmentId(task.departmentId || '');
    } else {
      setSelectedTask(null);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskExpectedResult('');
      setNewTaskCriteriaText('');
      setNewTaskHours('');
      setNewTaskDueDate('');
      setNewTaskTime('');
      setNewTaskRecurrence('none');
      setNewTaskReminder('none');
      setTaskKind(requestedKind || (currentWorkspace === WORKSPACES.COMPANY ? 'team' : 'work'));
      setNewUrgent(false);
      setNewImportant(false);
      setNewTaskAiAgent('');
      setNewTaskSopId('');
      setNewTaskProjectName('');
      setNewTaskAssignee(user?.uid || assistants[0]?.id || 'manager');
      setNewTaskDepartmentId(userRole === ROLES.OWNER ? '' : (userDepartmentId || ''));
    }
    setIsCreateOpen(true);
  }, [assistants, user, userRole, userDepartmentId, currentWorkspace]);

  const closeModal = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoicePreviewReady(false);
    setVoiceMessage('');
    setIsCreateOpen(false);
    setSelectedTask(null);
  }, []);

  const handleQuickMove = useCallback(async (taskId, newStatus) => {
    // SaaS безопасность: берем полные массивы из базы
    const rawTasks = docData?.tasks || [];
    const rawArchive = docData?.archive || [];

    const task = rawTasks.find(tItem => tItem.id === taskId) || rawArchive.find(tItem => tItem.id === taskId);
    if (!task) return;

    // Восстановление из архива в работу
    if (newStatus === 'todo' && task.status === 'done') {
      const restoredTask = {
        ...task,
        status: 'todo',
        completedAt: null
      };
      await updateWorkspace({
        tasks: [restoredTask, ...rawTasks],
        archive: rawArchive.filter(tItem => tItem.id !== taskId)
      });
      await recordCompanyActivity({ type: 'task_restored', task: restoredTask });
      toast.success('Задача возвращена в работу');
      return;
    }

    const completedAt = new Date();
    const updatedTask = {
      ...task,
      status: newStatus,
      completedAt: newStatus === 'done' ? completedAt.toISOString() : null
    };

    processTaskAutomations('status_changed', updatedTask);

    if (newStatus === 'done') {
      const nextRecurringTask = currentWorkspace === WORKSPACES.PERSONAL
        ? createNextRecurringTask(updatedTask, completedAt)
        : null;
      await updateWorkspace({
        tasks: nextRecurringTask
          ? [nextRecurringTask, ...rawTasks.filter(tItem => tItem.id !== taskId)]
          : rawTasks.filter(tItem => tItem.id !== taskId),
        archive: [updatedTask, ...rawArchive]
      });
      await recordCompanyActivity({ type: 'result_accepted', task: updatedTask, details: 'Результат принят быстрым действием' });
      toast.success(nextRecurringTask ? `Готово. Следующий повтор — ${nextRecurringTask.dueDate}` : 'Задача выполнена', {
        duration: 7000,
        action: {
          label: 'Отменить',
          onClick: async () => {
            const latestData = latestWorkspaceDataRef.current || {};
            const latestTasks = latestData.tasks || [];
            const latestArchive = latestData.archive || [];
            const archivedTask = latestArchive.find((item) => item.id === taskId) || updatedTask;
            const restoredTask = { ...archivedTask, status: 'todo', completedAt: null };
            await updateWorkspace({
              tasks: [restoredTask, ...latestTasks.filter((item) => item.id !== taskId && item.recurrenceSourceId !== taskId)],
              archive: latestArchive.filter((item) => item.id !== taskId),
            });
            toast.success('Завершение отменено');
          },
        },
      });
    } else {
      await updateWorkspace({
        tasks: rawTasks.map(tItem => tItem.id === taskId ? updatedTask : tItem)
      });
      if (newStatus === 'in_progress') await recordCompanyActivity({ type: 'task_started', task: updatedTask });
    }
  }, [docData, updateWorkspace, processTaskAutomations, recordCompanyActivity, currentWorkspace]);

  const replaceTaskEverywhere = useCallback((nextTask) => {
    const rawTasks = docData?.tasks || [];
    const rawArchive = docData?.archive || [];
    const without = (items) => items.filter((item) => item.id !== nextTask.id);

    if (nextTask.status === 'done') {
      return updateWorkspace({
        tasks: without(rawTasks),
        archive: [nextTask, ...without(rawArchive)]
      });
    }

    return updateWorkspace({
      tasks: [nextTask, ...without(rawTasks)],
      archive: without(rawArchive)
    });
  }, [docData, updateWorkspace]);

  const handleSubmitResult = useCallback(async ({ artifactUrl, artifactNote }) => {
    if (!selectedTask) return;
    try {
      const nextTask = submitTaskResult(selectedTask, {
        artifactUrl,
        artifactNote,
        actorId: user?.uid,
        actorName: user?.displayName || user?.email?.split('@')[0] || 'Исполнитель',
      });
      await replaceTaskEverywhere(nextTask);
      await recordCompanyActivity({ type: 'result_submitted', task: nextTask });
      notifyTelegram('result_submitted', `👀 Результат передан на проверку:\n«${nextTask.text}»\n${artifactUrl ? `Ссылка: ${artifactUrl}` : artifactNote}`);
      toast.success('Результат отправлен на проверку');
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Не удалось сдать результат');
    }
  }, [selectedTask, user, replaceTaskEverywhere, notifyTelegram, closeModal, recordCompanyActivity]);

  const handleAcceptResult = useCallback(async (comment = '') => {
    if (!selectedTask) return;
    if (!(userRole === ROLES.OWNER || userRole === ROLES.MANAGER)) return toast.error('Принять результат может руководитель');
    try {
      const nextTask = acceptTaskResult(selectedTask, {
        reviewerId: user?.uid,
        reviewerName: user?.displayName || user?.email?.split('@')[0] || 'Руководитель',
        comment,
      });
      await replaceTaskEverywhere(nextTask);
      await recordCompanyActivity({ type: 'result_accepted', task: nextTask, details: comment });
      toast.success('Результат принят');
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Не удалось принять результат');
    }
  }, [selectedTask, userRole, user, replaceTaskEverywhere, closeModal, recordCompanyActivity]);

  const handleReturnForRework = useCallback(async (comment) => {
    if (!selectedTask) return;
    if (!(userRole === ROLES.OWNER || userRole === ROLES.MANAGER)) return toast.error('Вернуть результат может руководитель');
    try {
      const nextTask = returnTaskForRework(selectedTask, {
        reviewerId: user?.uid,
        reviewerName: user?.displayName || user?.email?.split('@')[0] || 'Руководитель',
        comment,
      });
      await replaceTaskEverywhere(nextTask);
      await recordCompanyActivity({ type: 'result_returned', task: nextTask, details: comment });
      notifyTelegram('result_returned', `↩️ Результат возвращён на доработку:\n«${nextTask.text}»\nКомментарий: ${comment}`);
      toast.success('Возвращено на доработку');
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Не удалось вернуть задачу');
    }
  }, [selectedTask, userRole, user, replaceTaskEverywhere, notifyTelegram, closeModal, recordCompanyActivity]);

  const handleGenerateBriefing = useCallback(async ({ kind = 'status', snapshot = {}, solo = false, force = false } = {}) => {
    const signatureSource = JSON.stringify({
      active: snapshot.activeCount,
      accepted: snapshot.acceptedCount,
      returned: snapshot.returnedCount,
      deferred: snapshot.deferredCount,
      overdue: snapshot.overdueCount,
      ai: snapshot.aiCompletedCount,
      team: snapshot.teamHandlesCount,
      owner: snapshot.ownerDecisionCount,
      kpis: snapshot.kpis,
      risks: (snapshot.risks || []).map((risk) => risk.id),
    });
    const signature = Array.from(signatureSource).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 0).toString(36);
    const cacheKey = `flowspace_briefing_v6_${activeCompanyId}_${currentWorkspace}_${snapshot.weekKey || 'current'}_${kind}_${solo ? 'solo' : 'owner'}_${signature}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setBriefingTexts((previous) => ({ ...previous, [kind]: cached }));
        return;
      }
    }
    setBriefingTexts((previous) => ({ ...previous, [kind]: '' }));
    setBriefingLoadingKind(kind);
    const kindInstruction = {
      plan: 'Сформируй план недели: главные результаты, что требует внимания, риски, что можно решить без участия пользователя и какие решения нужны. Не более 5 коротких пунктов.',
      status: 'Дай статус середины недели. Если серьёзных отклонений нет, прямо скажи: «Всё идёт по плану. Вашего вмешательства не требуется». Иначе покажи только важные отклонения, максимум 3.',
      meeting: 'Подготовь короткий бриф к встрече: обещано, выполнено, не выполнено, возвраты, KPI, риски, вопросы для решения и рекомендуемая повестка. Не более 7 коротких пунктов.',
      review: 'Подведи итоги недели максимум в 3 коротких нумерованных выводах: качество с первого раза, возвраты, переносы, просрочки, доступные KPI, вклад AI и что перенести на следующую неделю. Для итогов используй только недельные счётчики: acceptedCount, acceptedFirstTryCount, returnedCount, deferredCount, overdueCount и aiCompletedCount. Поле risks в Weekly Review игнорируй: текущие риски показаны ниже отдельно. Если returnedCount=0, напиши, что за неделю возвратов не было, и не упоминай непринятые с первой попытки результаты. Качество за неделю считай как acceptedFirstTryCount из acceptedCount; не подменяй его общим KPI quality. Если acceptedCount>0, acceptedFirstTryCount=acceptedCount и returnedCount=0, не советуй улучшать качество или избегать возвратов; предложи сохранить текущий процесс. Не пиши, что все работы или задачи выполнены, если activeCount>0. Все рекомендации включи в эти пункты. После третьего пункта не пиши ничего.',
    }[kind];
    try {
      const response = await callServerAI({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `Ты AI-помощник Flow Space. Используй только переданные факты и не придумывай показатели. Не упоминай технические имена полей из JSON. KPI с available=false или sampleSize=0 нельзя называть в процентах, оценивать как хороший или плохой: прямо считай такой KPI недоступным для сравнения. Если kpiChangeAvailable=false, не пиши, что все KPI доступны, улучшаются, ухудшаются или находятся в норме; прямо скажи, что сравнение KPI с прошлым периодом пока недоступно. Если ownerDecisionCount=0, нельзя писать, что требуется внимание, решение или вмешательство пользователя; прямо укажи, что его решение не требуется. Просить решение пользователя можно только при ownerDecisionCount>0. ${kindInstruction} ${solo ? 'Это личное пространство. Не используй слова «эскалация», «менеджер», «сотрудник», «CEO briefing», «собственник» или корпоративные формулировки.' : 'Строй выводы вокруг трёх вопросов: что идёт нормально, что команда решает сама и где действительно нужен пользователь. Не дублируй эти вопросы отдельными блоками и не перечисляй задачи, которые не требуют внимания.'} Пиши по-русски, без вступления.` },
          { role: 'user', content: JSON.stringify(snapshot) }
        ],
        temperature: 0.2
      });
      const text = (response?.choices?.[0]?.message?.content?.trim() || 'Данных для вывода пока недостаточно.')
        .replace(/,?\s*так как количество решений владельца равно 0\.?/gi, '.')
        .replace(/ownerDecisionCount\s*=\s*0/gi, 'ваше решение не требуется');
      setBriefingTexts((previous) => ({ ...previous, [kind]: text }));
      localStorage.setItem(cacheKey, text);
    } catch (error) {
      console.warn('Briefing AI unavailable:', error);
      setBriefingTexts((previous) => ({ ...previous, [kind]: 'Основные показатели уже собраны выше. AI-вывод можно обновить позже.' }));
    } finally {
      setBriefingLoadingKind('');
    }
  }, [activeCompanyId, currentWorkspace]);

  const handleSaveBriefingDecision = useCallback(async ({ key, status, note, at }) => {
    const briefingState = { ...(docData?.settings?.briefingState || {}), [key]: { status, note: String(note || '').trim(), at } };
    await updateSettings({ ...(docData?.settings || {}), briefingState });
    toast.success(status === 'confirmed' ? 'План подтверждён' : status === 'accepted' ? 'Итоги приняты' : 'Изменения сохранены');
  }, [docData?.settings, updateSettings]);

  const handleDeleteTask = (taskId) => {
    const rawTasks = docData?.tasks || [];
    updateWorkspace({ tasks: rawTasks.filter(tItem => tItem.id !== taskId) });
    toast.success('Задача удалена');
    closeModal();
  };

  const handleSaveSettings = async (modalSettings = {}) => {
    const nextMode = onboardTeam === '👤 Я один' ? PRODUCT_MODES.SOLO : PRODUCT_MODES.TEAM;
    try {
      await updateSettings({
        ...buildModeSettings(nextMode, docData?.settings, onboardTeam),
        telegramChatId: tgChatId,
        automations: docData?.settings?.automations || defaultAutomations,
        ...(modalSettings.executivePolicy ? { executivePolicy: modalSettings.executivePolicy } : {}),
        ...(modalSettings.aiMemory ? { aiMemory: modalSettings.aiMemory } : {}),
        ...(modalSettings.notifications ? { notifications: modalSettings.notifications } : {}),
      });
      setCurrentWorkspace(nextMode === PRODUCT_MODES.SOLO ? WORKSPACES.PERSONAL : WORKSPACES.COMPANY);
      setIsSettingsOpen(false);
      toast.success('Настройки сохранены');
    } catch (err) {
      handleError(err, 'Сохранение настроек');
    }
  };

  const handleOnboardingComplete = async (mode) => {
    const nextTeamSize = mode === PRODUCT_MODES.SOLO ? '👤 Я один' : (onboardTeam === '👤 Я один' ? '👥 2-5 человек' : onboardTeam);
    try {
      setOnboardTeam(nextTeamSize);
      await updateSettings({
        ...buildModeSettings(mode, docData?.settings, nextTeamSize),
        telegramChatId: docData?.settings?.telegramChatId || '',
        automations: docData?.settings?.automations || defaultAutomations,
      });
      setCurrentWorkspace(mode === PRODUCT_MODES.SOLO ? WORKSPACES.PERSONAL : WORKSPACES.COMPANY);
      setActiveTab('executive');
      setShowOnboarding(false);
      toast.success(mode === PRODUCT_MODES.SOLO ? 'Solo Space готов' : 'Company Space готов');
    } catch (err) {
      handleError(err, 'Настройка режима');
    }
  };

  const themeBg = isDark ? 'bg-[#0E1116] text-slate-200' : 'bg-[#F8FAFC] text-slate-800';
  const cardBg = isDark ? 'bg-[#161B22] border-white/10 shadow-sm' : 'bg-white border-slate-200/80 shadow-sm';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const inputBg = isDark ? 'bg-[#0E1116] border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200/80 text-slate-900 placeholder:text-slate-400';
  const switchWorkspace = (nextWorkspace) => {
    setCurrentWorkspace(nextWorkspace);
    setAssigneeFilter('all');
    setProcessTaskId('');
    setProcessSopId('');
    if (nextWorkspace === WORKSPACES.PERSONAL && ['company-ai', 'team', 'kpi', 'sops'].includes(activeTab)) setActiveTab('executive');
  };
  const handleQuickAction = (action) => {
    if (action === 'ai') { setProcessRole('auto'); setActiveTab('processes'); return; }
    if (action === 'personal') { switchWorkspace(WORKSPACES.PERSONAL); openTaskModal(null, 'personal'); return; }
    if (action === 'work') { switchWorkspace(WORKSPACES.PERSONAL); openTaskModal(null, 'work'); return; }
    if (action === 'team') { switchWorkspace(WORKSPACES.COMPANY); openTaskModal(null, 'team'); return; }
    switchWorkspace(WORKSPACES.PERSONAL);
    openTaskModal(null, 'personal');
    if (action === 'note') {
      setNewTaskTitle('Быстрая заметка');
      setNewTaskDesc('');
    }
  };

  const recoverWorkspace = async () => {
    try {
      await user?.getIdToken(true);
      retryWorkspaceConnection?.();
    } catch {
      await signOut(auth).catch(() => {});
    }
  };

  if (!authResolved || (user && !docData && workspaceLoading && !workspaceLoadError)) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${themeBg}`} role="status" aria-label="Загрузка Flow Space">
        <div className={`px-6 py-5 rounded-3xl border text-center ${cardBg}`}>
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-black text-lg mx-auto mb-3">FS</div>
          <p className={`text-sm font-bold ${textMain}`}>Загружаем Flow Space…</p>
        </div>
      </div>
    );
  }

  if (user && !docData) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${themeBg}`}>
        <div className={`w-full max-w-sm px-6 py-6 rounded-3xl border text-center ${cardBg}`} role="alert">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-lg mx-auto mb-3">!</div>
          <h1 className={`text-base font-black ${textMain}`}>Не удалось загрузить данные</h1>
          <p className="text-sm text-slate-500 mt-2">Сессия могла устареть или соединение прервалось. Обновите сессию — задачи останутся на месте.</p>
          <button type="button" onClick={recoverWorkspace} className={`w-full mt-5 py-3 rounded-xl text-sm ${btnPrimary}`}>Обновить сессию</button>
          <button type="button" onClick={() => signOut(auth)} className="w-full mt-2 py-2 text-xs font-bold text-slate-500">Войти заново</button>
        </div>
      </div>
    );
  }

  // 1. Экран входа / регистрации (если пользователь не авторизован)
  if (!user) {
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
    <div className={`min-h-screen font-sans pb-28 md:pb-12 md:pl-64 ${themeBg}`}>
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
        setCurrentWorkspace={switchWorkspace}
        userRole={userRole}
      />

      {/* ПРЕМИАЛЬНАЯ МОБИЛЬНАЯ НАВИГАЦИЯ (ОСТРОВ) */}
      <MobileNav 
        userRole={userRole}
        isDark={isDark}
        isTeamMode={isTeamMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickAction={handleQuickAction}
        canCreateTeamTask={isTeamMode && (userRole === ROLES.OWNER || userRole === ROLES.MANAGER)}
        currentWorkspace={currentWorkspace}
      />

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        <header className="flex justify-between items-center mb-4 pt-1">
          <div>
            <h2 className={`text-xl font-black tracking-tight ${textMain}`}>
              {activeTab === 'executive'
                ? 'Сегодня'
                : activeTab === 'matrix'
                  ? 'Работа'
                  : activeTab === 'processes'
                    ? 'AI-помощник'
                    : activeTab === 'content'
                      ? 'Контент'
                  : activeTab === 'company-ai'
                    ? 'AI компании'
                  : activeTab === 'integrations'
                    ? 'Интеграции'
                    : activeTab === 'team'
                      ? 'Команда'
                      : activeTab === 'kpi'
                        ? 'Показатели'
                        : activeTab === 'sops'
                          ? 'Регламенты'
                          : activeTab === 'archive'
                            ? 'Архив'
                            : activeTab === 'help'
                              ? 'Как пользоваться'
                    : (isTeamMode ? 'Company Space' : 'My Space')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'executive'
                ? 'Главное на день без лишней операционки'
                : activeTab === 'matrix'
                  ? 'Задачи и результаты в одном месте'
                  : activeTab === 'processes'
                    ? 'Опишите, что хотите получить'
                    : activeTab === 'content'
                      ? 'Посты, планы и материалы в одном разделе'
                  : activeTab === 'company-ai'
                    ? 'Помощники, которые работают с данными компании'
                  : activeTab === 'integrations'
                    ? 'Подключайте данные и превращайте их в готовый результат'
                    : activeTab === 'team'
                      ? 'Люди, роли и ответственность за результат'
                      : activeTab === 'kpi'
                        ? 'Ключевые показатели без лишних деталей'
                        : activeTab === 'sops'
                          ? 'Рабочие инструкции для повторяемых задач'
                          : activeTab === 'archive'
                            ? 'Завершённые результаты'
                            : activeTab === 'help'
                              ? 'Короткая инструкция по основным возможностям'
                    : (isTeamMode ? 'Контролируйте результат, а не каждый шаг' : 'Личная система работы, которая растёт вместе с вами')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userRole === ROLES.OWNER && (
              <button aria-label="Открыть настройки" onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 text-base shadow-sm active:scale-95 transition-transform bg-white dark:bg-[#161B22]">
                <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            )}
            <button aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'} onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 text-base shadow-sm active:scale-95 transition-transform bg-white dark:bg-[#161B22]">
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </header>

        {isTeamMode && ['executive', 'matrix'].includes(activeTab) && (
          <div className="mb-4 flex justify-center md:hidden" aria-label="Выбор пространства">
            <div className="inline-flex w-full sm:w-auto min-w-[260px] rounded-2xl bg-slate-100 dark:bg-white/5 p-1">
              <button type="button" onClick={() => switchWorkspace(WORKSPACES.PERSONAL)} aria-pressed={currentWorkspace === WORKSPACES.PERSONAL} className={`flex-1 min-h-[42px] px-5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${currentWorkspace === WORKSPACES.PERSONAL ? 'bg-white dark:bg-[#161B22] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}><Lock className="w-4 h-4" /> Моё</button>
              <button type="button" onClick={() => switchWorkspace(WORKSPACES.COMPANY)} aria-pressed={currentWorkspace === WORKSPACES.COMPANY} className={`flex-1 min-h-[42px] px-5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${currentWorkspace === WORKSPACES.COMPANY ? 'bg-white dark:bg-[#161B22] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}><Users className="w-4 h-4" /> Команда</button>
            </div>
          </div>
        )}

        {/* ВКЛАДКА: EXECUTIVE OVERVIEW / SOLO OVERVIEW */}
        {activeTab === 'executive' && (
          isTeamMode && currentWorkspace === WORKSPACES.COMPANY && userRole === ROLES.OWNER ? (
            <ExecutiveOverview
              isTeamMode={isTeamMode}
              cardBg={cardBg}
              textMain={textMain}
              metrics={companyMetrics}
              insights={executiveInsights}
              tasks={tasks}
              archive={archive}
              calendarEvents={calendarEvents}
              aiOptions={aiOptions}
              onOpenTasks={() => setActiveTab('matrix')}
              onOpenTask={openTaskModal}
              onOpenAI={() => setActiveTab('processes')}
              briefingTexts={briefingTexts}
              briefingLoadingKind={briefingLoadingKind}
              onGenerateBriefing={handleGenerateBriefing}
              onSaveBriefingDecision={handleSaveBriefingDecision}
              briefingState={docData?.settings?.briefingState || {}}
              dataLoading={workspaceLoading}
              companyId={activeCompanyId}
            />
          ) : (
            <SoloOverview
              cardBg={cardBg}
              textMain={textMain}
              tasks={tasks}
              archive={archive}
              metrics={companyMetrics}
              insights={executiveInsights}
              calendarEvents={calendarEvents}
              aiOptions={aiOptions}
              onOpenTasks={() => setActiveTab('matrix')}
              onOpenTask={openTaskModal}
              onQuickMove={handleQuickMove}
              onOpenAI={() => setActiveTab('processes')}
              onEnableTeam={() => setShowOnboarding(true)}
              briefingTexts={briefingTexts}
              briefingLoadingKind={briefingLoadingKind}
              onGenerateBriefing={handleGenerateBriefing}
              onSaveBriefingDecision={handleSaveBriefingDecision}
              briefingState={docData?.settings?.briefingState || {}}
              dataLoading={workspaceLoading}
            />
          )
        )}

        {/* ВКЛАДКА: ЗАДАЧИ */}
        {activeTab === 'matrix' && (
          <MatrixView 
            isDark={isDark}
            isTeamMode={isTeamMode}
            workspace={currentWorkspace}
            handleRunAIAgent={handleRunAIAgent}
            isAgentRunning={isAgentRunning}
            btnPrimary={btnPrimary}
            assistants={visibleAssistants}
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
            canReview={userRole === ROLES.OWNER || userRole === ROLES.MANAGER}
            dataLoading={workspaceLoading}
          />
        )}

        {/* ВКЛАДКА: АССИСТЕНТ (ЧАТ) */}
        {activeTab === 'processes' && (
          <AIControlCenter
            companyId={activeCompanyId}
            role={userRole}
            cardBg={cardBg}
            textMain={textMain}
            enabled={isTeamMode && currentWorkspace === WORKSPACES.COMPANY && userRole !== ROLES.MEMBER}
            companyPanel={isTeamMode && currentWorkspace === WORKSPACES.COMPANY && userRole !== ROLES.MEMBER ? <CompanyAIPanel key={activeCompanyId} companyId={activeCompanyId} role={userRole} onSettings={() => setIsSettingsOpen(true)} /> : null}
          >
          <AssistantView
            onPublication={(text)=>{setIncomingPublication({id:String(Date.now()),text,scope:`${user.uid}:${currentWorkspace}:${activeCompanyId}`});setContentMode('post');setActiveTab('content');}}
            onOpenContent={() => { setContentMode('post'); setActiveTab('content'); }}
            onOpenContentPlan={() => { setContentMode('plan'); setActiveTab('content'); }}
            onOpenIntegrations={() => setActiveTab('integrations')}

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
            tasks={tasks}
            sops={currentWorkspace === WORKSPACES.COMPANY ? sops : []}
            allowCompanyContext={currentWorkspace === WORKSPACES.COMPANY}
            processTaskId={processTaskId}
            setProcessTaskId={setProcessTaskId}
            processSopId={processSopId}
            setProcessSopId={setProcessSopId}
            handleAttachAIResult={handleAttachAIResult}
            orchestratorPlan={orchestratorPlan}
            handleBuildAIPlan={handleBuildAIPlan}
            imagePrompt={imagePrompt}
            setImagePrompt={setImagePrompt}
            imageSize={imageSize}
            setImageSize={setImageSize}
            imageQuality={imageQuality}
            setImageQuality={setImageQuality}
            generatedImage={generatedImage}
            isImageGenerating={isImageGenerating}
            handleGenerateImage={handleGenerateImage}
            handleAttachImageToTask={handleAttachImageToTask}
            onCheckTasks={handleRunAIAgent}
          />
          </AIControlCenter>
        )}

        {/* ВКЛАДКА: КОНТЕНТ */}
        {activeTab === 'content' && (
          <ContentHub
            mode={contentMode}
            setMode={setContentMode}
            publicationScope={user ? `${user.uid}:${currentWorkspace}:${activeCompanyId}` : null}
            incomingPublication={incomingPublication?.scope === `${user?.uid}:${currentWorkspace}:${activeCompanyId}` ? incomingPublication : null}
            cardBg={cardBg}
            textMain={textMain}
            company={currentWorkspace === WORKSPACES.COMPANY ? docData : null}
            tasks={tasks}
            onSaveToTask={handleSaveContentToTask}
            onCreateTasks={handleCreateContentPlanTasks}
          />
        )}

        {/* ВКЛАДКА: ИНТЕГРАЦИИ */}
        {activeTab === 'integrations' && (
          <IntegrationsView
            companyId={activeCompanyId}
            cardBg={cardBg}
            textMain={textMain}
            tasks={tasks}
            onAttachWorkflowToTask={handleAttachWorkflowToTask}
            onCreateRecommendedTasks={handleCreateRecommendedTasks}
          />
        )}

        {activeTab === 'sops' && (
          <SopView 
            sops={sops}
            tasks={tasks}
            archive={archive}
            assistants={visibleAssistants}
            canEdit={userRole === ROLES.OWNER}
            cardBg={cardBg}
            textMain={textMain}
            inputBg={inputBg}
            btnPrimary={btnPrimary}
            handleUpdateSOP={handleUpdateSOP}
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
            assistants={visibleAssistants}
            tasks={tasks}
            departments={departments}
            userRole={userRole}
            userDepartmentId={userDepartmentId}
            onCreateDepartment={handleCreateDepartment}
            onAssignDepartment={handleAssignDepartment}
            companyId={activeCompanyId}
            activityRevision={activityRevision}
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
            managementReading={companyMetrics.managementReading}
            tasks={tasks}
            archive={archive}
            assistants={visibleAssistants}
          />
        )}

        {/* ВКЛАДКА: АРХИВ */}
        {activeTab === 'archive' && (
          <ArchiveView 
            archive={archive}
            cardBg={cardBg}
            textMain={textMain}
            handleQuickMove={handleQuickMove}
            onOpenTask={openTaskModal}
          />
        )}

        {activeTab === 'help' && (
          <HelpView
            cardBg={cardBg}
            textMain={textMain}
            isTeamMode={isTeamMode}
            onCreateTask={() => openTaskModal()}
            onOpenToday={() => setActiveTab('executive')}
            onOpenWork={() => setActiveTab('matrix')}
            onOpenAI={() => setActiveTab('processes')}
            onOpenIntegrations={() => setActiveTab('integrations')}
            onOpenArchive={() => setActiveTab('archive')}
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
        voicePreviewReady={voicePreviewReady}
        voiceMessage={voiceMessage}
        handleTaskAI={handleTaskAI}
        isTaskGenerating={isTaskGenerating}
        newTaskDesc={newTaskDesc}
        setNewTaskDesc={setNewTaskDesc}
        newTaskExpectedResult={newTaskExpectedResult}
        setNewTaskExpectedResult={setNewTaskExpectedResult}
        newTaskCriteriaText={newTaskCriteriaText}
        setNewTaskCriteriaText={setNewTaskCriteriaText}
        newTaskHours={newTaskHours}
        setNewTaskHours={setNewTaskHours}
        newTaskDueDate={newTaskDueDate}
        setNewTaskDueDate={setNewTaskDueDate}
        newTaskTime={newTaskTime}
        setNewTaskTime={setNewTaskTime}
        newTaskRecurrence={newTaskRecurrence}
        setNewTaskRecurrence={setNewTaskRecurrence}
        newTaskReminder={newTaskReminder}
        setNewTaskReminder={setNewTaskReminder}
        taskKind={taskKind}
        workspace={currentWorkspace}
        newUrgent={newUrgent}
        setNewUrgent={setNewUrgent}
        newImportant={newImportant}
        setNewImportant={setNewImportant}
        isTeamMode={currentWorkspace === WORKSPACES.COMPANY && isTeamMode}
        newTaskAssignee={newTaskAssignee}
        setNewTaskAssignee={setNewTaskAssignee}
        newTaskDepartmentId={newTaskDepartmentId}
        setNewTaskDepartmentId={setNewTaskDepartmentId}
        departments={departments}
        canChooseDepartment={currentWorkspace === WORKSPACES.COMPANY && userRole === ROLES.OWNER}
        assistants={visibleAssistants}
        aiOptions={aiOptions}
        newTaskAiAgent={newTaskAiAgent}
        setNewTaskAiAgent={setNewTaskAiAgent}
        newTaskSopId={newTaskSopId}
        setNewTaskSopId={setNewTaskSopId}
        newTaskProjectName={newTaskProjectName}
        setNewTaskProjectName={setNewTaskProjectName}
        projectOptions={[...new Set(tasks.map((task) => task.projectName).filter(Boolean))]}
        sops={sops}
        canLinkSop={currentWorkspace === WORKSPACES.COMPANY}
        handleDeleteTask={handleDeleteTask}
        cardBg={cardBg}
        textMain={textMain}
        inputBg={inputBg}
        btnPrimary={btnPrimary}
        canReview={userRole === ROLES.OWNER || userRole === ROLES.MANAGER}
        onSubmitResult={handleSubmitResult}
        onAcceptResult={handleAcceptResult}
        onReturnForRework={handleReturnForRework}
      />

      <AITaskReviewModal
        review={aiTaskReview}
        onClose={() => setAiTaskReview(null)}
        onApply={handleApplyAITaskReview}
        isApplying={isApplyingAIReview}
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
        inviteDepartmentId={inviteDepartmentId}
        setInviteDepartmentId={setInviteDepartmentId}
        departments={departments}
        userRole={userRole}
        userDepartmentId={userDepartmentId}
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
        initialMode={productMode}
        onComplete={handleOnboardingComplete}
      />

    </div>
  );
}
