// ==========================================
import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

const STATUS_COLORS = {
  todo: '#94A3B8',        // slate-400
  in_progress: '#3B82F6', // blue-500
  review: '#F59E0B',      // amber-500
  deferred: '#64748B',    // slate-500
  done: '#10B981'         // emerald-500
};

const STATUS_NAMES = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  review: 'На проверке',
  deferred: 'Отложено',
  done: 'Готово'
};

const AnalyticsCharts = ({ tasks = [], archive = [], assistants = [], isDark = false, cardBg, textMain }) => {
  const allTasks = [...tasks, ...archive];

  // 1. Данные для круговой диаграммы статусов
  const statusCounts = allTasks.reduce((acc, task) => {
    const status = task.status || 'todo';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts)
    .filter(([_, value]) => value > 0)
    .map(([status, value]) => ({
      name: STATUS_NAMES[status] || status,
      value,
      color: STATUS_COLORS[status] || '#94A3B8'
    }));

  // 2. Данные для столбчатой диаграммы плановой нагрузки команды
  const workloadData = (assistants.length > 0 ? assistants : [{ id: 'manager', name: 'Владелец' }]).map(ast => {
    const userActiveTasks = tasks.filter(t => (t.assigneeName === ast.name || (!t.assigneeName && ast.id === 'manager')) && t.status !== 'done');
    const totalHours = userActiveTasks.reduce((sum, t) => sum + (parseFloat(t.estimatedHours) || 0), 0);
    return {
      name: ast.name,
      hours: Number(totalHours.toFixed(1)),
      count: userActiveTasks.length
    };
  });

  const axisStroke = isDark ? '#64748B' : '#94A3B8';
  const tooltipBg = isDark ? '#161B22' : '#FFFFFF';
  const tooltipBorder = isDark ? '#30363D' : '#E2E8F0';

  if (allTasks.length === 0) {
    return (
      <div className={`p-6 rounded-3xl border text-center ${cardBg}`}>
        <p className="text-xs text-slate-400">Нет данных по задачам для построения графиков.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* КРУГОВАЯ ДИАГРАММА: СТАТУСЫ */}
      <div className={`p-5 rounded-3xl border flex flex-col ${cardBg}`}>
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textMain}`}>
          Распределение задач по статусам
        </h4>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: isDark ? '#FFFFFF' : '#0F172A'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2 text-[11px]">
          {statusData.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {item.name}: <strong className={textMain}>{item.value}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* СТОЛБЧАТАЯ ДИАГРАММА: НАГРУЗКА В ЧАСАХ */}
      <div className={`p-5 rounded-3xl border flex flex-col ${cardBg}`}>
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textMain}`}>
          Плановая нагрузка (часы в работе)
        </h4>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke={axisStroke} fontSize={11} tickLine={false} />
              <YAxis stroke={axisStroke} fontSize={11} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value} ч.`, 'В работе']}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: isDark ? '#FFFFFF' : '#0F172A'
                }}
              />
              <Bar dataKey="hours" fill={isDark ? '#FFFFFF' : '#0F172A'} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          Суммарная оценка незавершённых задач по исполнителям
        </p>
      </div>
    </div>
  );
};

export default AnalyticsCharts;


// ==========================================
