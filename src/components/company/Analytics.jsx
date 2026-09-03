// ==========================================
import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Clock, CheckCircle2, AlertTriangle, Calendar, Target } from 'lucide-react';

const Analytics = ({ tasks, archive, isDark }) => {
  // Считаем основные метрики
  const totalTasks = tasks.length + archive.length;
  const doneTasks = archive.length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const urgentTasks = tasks.filter(t => t.urgent).length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;

  // Процент выполнения
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Среднее время на задачу
  const avgHours = totalTasks > 0
    ? (tasks.reduce((acc, t) => acc + (parseFloat(t.estimatedHours) || 0), 0) / totalTasks).toFixed(1)
    : 0;

  // Данные для круговой диаграммы
  const statusData = [
    { name: 'К выполнению', value: todoTasks, color: '#94A3B8' },
    { name: 'В работе', value: inProgress, color: '#3B82F6' },
    { name: 'Срочные', value: urgentTasks, color: '#EF4444' },
    { name: 'Выполнено', value: doneTasks, color: '#10B981' },
  ].filter(item => item.value > 0);

  // Данные для графика по неделям (можно заменить на реальные данные)
  const weeklyData = [
    { week: 'Нед 1', tasks: 12, done: 8 },
    { week: 'Нед 2', tasks: 19, done: 13 },
    { week: 'Нед 3', tasks: 15, done: 10 },
    { week: 'Нед 4', tasks: 22, done: 18 },
  ];

  // Данные по сотрудникам (если есть)
  const teamData = [];
  if (tasks.length > 0) {
    const assignees = {};
    tasks.forEach(task => {
      const name = task.assigneeName || 'Без исполнителя';
      if (!assignees[name]) {
        assignees[name] = { name, tasks: 0, hours: 0 };
      }
      assignees[name].tasks += 1;
      assignees[name].hours += parseFloat(task.estimatedHours) || 0;
    });
    Object.values(assignees).forEach(a => teamData.push(a));
  }

  // Стили для тёмной/светлой темы
  const cardStyle = isDark
    ? 'bg-[#161B22] border-white/10'
    : 'bg-white border-slate-200';

  const textStyle = isDark ? 'text-white' : 'text-slate-900';
  const subtextStyle = isDark ? 'text-slate-400' : 'text-slate-500';

  const tooltipStyle = {
    backgroundColor: isDark ? '#1C2128' : 'white',
    border: `1px solid ${isDark ? '#333' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: isDark ? 'white' : 'black'
  };

  return (
    <div className="space-y-6">
      {/* ВЕРХНИЕ КАРТОЧКИ С МЕТРИКАМИ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${cardStyle}`}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-slate-500" />
            <span className={`text-xs font-bold ${subtextStyle}`}>Всего задач</span>
          </div>
          <span className={`text-2xl font-black ${textStyle}`}>{totalTasks}</span>
        </div>

        <div className={`p-4 rounded-2xl border ${cardStyle}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className={`text-xs font-bold ${subtextStyle}`}>В работе</span>
          </div>
          <span className={`text-2xl font-black ${textStyle}`}>{inProgress}</span>
        </div>

        <div className={`p-4 rounded-2xl border ${cardStyle}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className={`text-xs font-bold ${subtextStyle}`}>Срочные</span>
          </div>
          <span className={`text-2xl font-black ${textStyle}`}>{urgentTasks}</span>
        </div>

        <div className={`p-4 rounded-2xl border ${cardStyle}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className={`text-xs font-bold ${subtextStyle}`}>Эффективность</span>
          </div>
          <span className={`text-2xl font-black ${textStyle}`}>{completionRate}%</span>
        </div>
      </div>

      {/* ГРАФИКИ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Линейный график продуктивности */}
        <div className={`p-6 rounded-3xl border ${cardStyle}`}>
          <h3 className={`text-sm font-bold mb-4 ${textStyle}`}>
            Продуктивность по неделям
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
              <XAxis dataKey="week" stroke={isDark ? '#666' : '#999'} fontSize={12} />
              <YAxis stroke={isDark ? '#666' : '#999'} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line
                type="monotone"
                dataKey="tasks"
                name="Создано задач"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="done"
                name="Выполнено"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Круговая диаграмма распределения */}
        <div className={`p-6 rounded-3xl border ${cardStyle}`}>
          <h3 className={`text-sm font-bold mb-4 ${textStyle}`}>
            Распределение задач
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px]">
              <p className={`text-sm ${subtextStyle}`}>Нет данных для отображения</p>
            </div>
          )}
        </div>
      </div>

      {/* ГРАФИК ПО СОТРУДНИКАМ (если есть команда) */}
      {teamData.length > 0 && (
        <div className={`p-6 rounded-3xl border ${cardStyle}`}>
          <h3 className={`text-sm font-bold mb-4 ${textStyle}`}>
            Нагрузка по сотрудникам
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
              <XAxis dataKey="name" stroke={isDark ? '#666' : '#999'} fontSize={12} />
              <YAxis stroke={isDark ? '#666' : '#999'} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="tasks" name="Кол-во задач" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hours" name="Часы" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ */}
      <div className={`p-6 rounded-3xl border ${cardStyle}`}>
        <h3 className={`text-sm font-bold mb-4 ${textStyle}`}>
          Сводка
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className={`text-xs ${subtextStyle}`}>Среднее время на задачу</p>
            <p className={`text-xl font-bold ${textStyle}`}>{avgHours} ч</p>
          </div>
          <div>
            <p className={`text-xs ${subtextStyle}`}>К выполнению</p>
            <p className={`text-xl font-bold ${textStyle}`}>{todoTasks}</p>
          </div>
          <div>
            <p className={`text-xs ${subtextStyle}`}>Выполнено</p>
            <p className={`text-xl font-bold ${textStyle}`}>{doneTasks}</p>
          </div>
          <div>
            <p className={`text-xs ${subtextStyle}`}>Прогресс</p>
            <div className="mt-2 h-2 bg-slate-200 dark:bg-white/10 rounded-full">
              <div
                className="h-2 bg-emerald-500 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;


// ==========================================
