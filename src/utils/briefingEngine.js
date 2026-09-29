import { isTaskOverdue } from './taskUtils.js';

const dateValue = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export const getWeekWindow = (now = new Date()) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const key = [start.getFullYear(), String(start.getMonth() + 1).padStart(2, '0'), String(start.getDate()).padStart(2, '0')].join('-');
  return { start, end, key };
};

const happenedIn = (value, start, end) => {
  const date = dateValue(value);
  return Boolean(date && date >= start && date < end);
};

export const getAutomaticBriefingKind = (now = new Date(), meetingSoon = false) => {
  if (meetingSoon) return 'meeting';
  if (now.getDay() === 1) return 'plan';
  if (now.getDay() === 5) return 'review';
  return 'status';
};

export const buildBriefingSnapshot = ({ tasks = [], archive = [], metrics = {}, insights = {}, now = new Date(), calendarEvents = [] }) => {
  const { start, end, key } = getWeekWindow(now);
  const all = [...tasks, ...archive];
  const active = tasks.filter((task) => task.status !== 'done');
  const acceptedThisWeek = all.filter((task) => task.status === 'done' && happenedIn(task.acceptedAt || task.completedAt, start, end));
  const returnedThisWeek = all.filter((task) => (task.reviewHistory || []).some((entry) => entry.type === 'returned' && happenedIn(entry.at, start, end)));
  const deadlinesThisWeek = all.filter((task) => {
    if (!task.dueDate) return false;
    const due = dateValue(`${String(task.dueDate).slice(0, 10)}T12:00:00`);
    return due && due >= start && due < end;
  });
  const firstTry = acceptedThisWeek.filter((task) => (Number(task.reopenedCount) || 0) === 0);
  const aiCompleted = acceptedThisWeek.filter((task) => task.aiAgentId || (task.aiExecutionHistory || []).length > 0);
  const overdue = active.filter(isTaskOverdue);
  const upcomingMeeting = calendarEvents
    .map((event) => ({ ...event, startDate: dateValue(event.start) }))
    .filter((event) => event.startDate && event.startDate >= now)
    .sort((a, b) => a.startDate - b.startDate)[0] || null;

  return {
    weekKey: key,
    activeCount: active.length,
    unfinishedCount: active.length,
    newCount: all.filter((task) => happenedIn(task.createdAt, start, end)).length,
    deadlineCount: deadlinesThisWeek.length,
    acceptedCount: acceptedThisWeek.length,
    acceptedFirstTryCount: firstTry.length,
    returnedCount: returnedThisWeek.length,
    deferredCount: active.filter((task) => task.status === 'deferred').length,
    overdueCount: overdue.length,
    aiCompletedCount: aiCompleted.length,
    urgentCount: active.filter((task) => task.urgent).length,
    importantCount: active.filter((task) => task.important).length,
    workloadHours: Number(metrics.totalHoursEstimated || 0),
    kpis: (metrics.kpis || []).map((kpi) => {
      const sampleSize = Number(kpi.sampleSize || 0);
      return {
        id: kpi.id,
        name: kpi.name,
        sampleSize,
        available: sampleSize > 0,
        score: sampleSize > 0 ? Number(kpi.score || 0) : null,
      };
    }),
    kpiChangeAvailable: false,
    onTrackCount: Number(insights.healthyCount || 0),
    teamHandlesCount: (insights.teamItems || []).length,
    ownerDecisionCount: (insights.ownerItems || []).length,
    risks: (insights.items || []).slice(0, 3),
    ownerDecisions: (insights.ownerItems || []).slice(0, 3),
    teamActions: (insights.teamItems || []).slice(0, 3),
    overdueTasks: overdue.slice(0, 3).map((task) => task.text || task.title),
    promisedTasks: deadlinesThisWeek.slice(0, 5).map((task) => ({ title: task.text || task.title, done: task.status === 'done' })),
    upcomingMeeting: upcomingMeeting ? { id: upcomingMeeting.id, title: upcomingMeeting.title || 'Встреча', start: upcomingMeeting.start } : null,
  };
};
