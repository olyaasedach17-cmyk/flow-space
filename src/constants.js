// ==========================================
import { toast } from 'sonner';

export const translations = {
  ru: {
    colTodo: 'Нужно сделать',
    colInProgress: 'В процессе',
    colReview: 'На проверке',
    colDeferred: 'Отложено',
  }
};

export const defaultKpis = [
  { id: 1, name: 'Соблюдение сроков (SLA)', weight: 40, max: 100, score: 92, desc: 'Процент задач, закрытых до дедлайна.' },
  { id: 2, name: 'Качество (без возвратов)', weight: 35, max: 100, score: 88, desc: 'Задачи, принятые руководителем с первого раза.' },
  { id: 3, name: 'Инициативность', weight: 25, max: 5, score: 4, desc: 'Самостоятельное решение проблем.' },
];

export const aiOptions = [
  { id: 'copywriter', icon: '✍️', label: 'Копирайтер' },
  { id: 'smm', icon: '📲', label: 'Маркетолог' },
  { id: 'sales', icon: '💼', label: 'Продажи' },
  { id: 'consultant', icon: '🧠', label: 'Стратег' },
  { id: 'lawyer', icon: '👔', label: 'Юрист' }
];

export const taskTemplates = [
  {
    id: 'marketing',
    name: 'Маркетинг',
    icon: '📲',
    tasks: [
      { text: 'Разработать контент-план на месяц', estimatedHours: 3, urgent: false, important: true, description: 'Составить сетку публикаций, темы и дедлайны.' },
      { text: 'Написать рекламный пост для соцсетей', estimatedHours: 1, urgent: true, important: false, description: 'Подготовить текст с призывом к действию.' },
      { text: 'Настроить таргетированную рекламу', estimatedHours: 4, urgent: true, important: true, description: 'Собрать аудитории и запустить кампанию.' }
    ]
  },
  {
    id: 'sales',
    name: 'Продажи',
    icon: '💼',
    tasks: [
      { text: 'Обновить скрипты звонков', estimatedHours: 2, urgent: false, important: true, description: 'Прописать ответы на частые возражения.' },
      { text: 'Подготовить КП для ключевого клиента', estimatedHours: 2, urgent: true, important: true, description: 'Сформировать индивидуальные условия.' },
      { text: 'Провести аудит сделок в CRM', estimatedHours: 3, urgent: false, important: false, description: 'Проверить зависшие лиды.' }
    ]
  },
  {
    id: 'dev',
    name: 'IT / Разработка',
    icon: '⚡',
    tasks: [
      { text: 'Провести рефакторинг кода', estimatedHours: 4, urgent: false, important: true, description: 'Оптимизировать производительность.' },
      { text: 'Настроить мониторинг ошибок', estimatedHours: 2, urgent: true, important: true, description: 'Подключить алерты.' }
    ]
  },
  {
    id: 'legal',
    name: 'Юриспруденция',
    icon: '👔',
    tasks: [
      { text: 'Составить договор оказания услуг', estimatedHours: 3, urgent: true, important: true, description: 'Подготовить типовую форму.' },
      { text: 'Проверить политику конфиденциальности', estimatedHours: 2, urgent: false, important: true, description: 'Актуализировать данные на сайте.' }
    ]
  }
];

export const defaultAutomations = [
  {
    id: 'auto_urgent_tg',
    name: 'Срочная задача ➔ Алерт в Telegram',
    event: 'task_created',
    condition: 'is_urgent',
    enabled: true
  },
  {
    id: 'auto_review_notify',
    name: 'Перевод «На проверке» ➔ Уведомление',
    event: 'status_changed',
    targetStatus: 'review',
    enabled: true
  }
];

export const btnPrimary = "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 transition-all shadow-sm font-bold active:scale-[0.98]";

export const handleError = (error, context = 'Операция') => {
  console.error(`Error in ${context}:`, error);
  if (error?.code === 'permission-denied') {
    toast.error('У вас нет прав для выполнения этой операции');
  } else if (error?.code === 'unavailable') {
    toast.error('Сервис временно недоступен. Проверьте подключение к сети');
  } else {
    toast.error(`${context}: ${error.message || 'Неизвестная ошибка'}`);
  }
};


// ==========================================
