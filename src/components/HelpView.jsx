import React from 'react';
import {
  Archive,
  Bot,
  CalendarCheck2,
  Check,
  CheckSquare2,
  ChevronRight,
  CircleHelp,
  Plug,
  Plus,
  Users,
} from 'lucide-react';

const HelpView = ({
  cardBg = '',
  textMain = '',
  isTeamMode = false,
  onCreateTask,
  onOpenToday,
  onOpenWork,
  onOpenAI,
  onOpenIntegrations,
  onOpenArchive,
}) => {
  const steps = [
    {
      number: '1',
      title: 'Создайте первую задачу',
      text: 'Нажмите «+», укажите задачу и срок. Для сложной задачи добавьте ожидаемый результат.',
      action: 'Создать задачу',
      icon: Plus,
      onClick: onCreateTask,
    },
    {
      number: '2',
      title: 'Работайте из экрана «Сегодня»',
      text: 'Здесь уже собраны актуальные задачи. Начинайте с верхней — список учитывает срок и приоритет.',
      action: 'Открыть Сегодня',
      icon: CalendarCheck2,
      onClick: onOpenToday,
    },
    {
      number: '3',
      title: 'Подключайте AI к конкретной работе',
      text: 'Попросите AI проверить задачи, подготовить материал или сохранить готовый результат в задачу.',
      action: 'Открыть AI',
      icon: Bot,
      onClick: onOpenAI,
    },
  ];

  const locations = [
    ['Сегодня', 'Задачи дня и компактная сводка недели', CalendarCheck2, onOpenToday],
    ['Работа', 'Все активные задачи, проекты и статусы', CheckSquare2, onOpenWork],
    ['AI-помощник', 'Проверка задач и подготовка готовых материалов', Bot, onOpenAI],
    ['Интеграции', 'Google и Telegram: подключение и проверка', Plug, onOpenIntegrations],
    ['Архив', 'Завершённые и принятые результаты', Archive, onOpenArchive],
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className={`rounded-3xl border p-5 md:p-7 ${cardBg}`}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center">
            <CircleHelp className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-xl font-black ${textMain}`}>Начните за 2 минуты</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">Flow Space сам собирает главное. Вам достаточно создать задачу, открыть «Сегодня» и подключать AI там, где нужна помощь.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-3 mt-6">
          {steps.map(({ number, title, text, action, icon: Icon, onClick }) => (
            <article key={number} className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-black">{number}</span>
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <h4 className={`mt-3 text-sm font-black ${textMain}`}>{title}</h4>
              <p className="mt-1 text-xs leading-5 text-slate-500 flex-1">{text}</p>
              <button type="button" onClick={onClick} className="mt-4 min-h-[42px] rounded-xl bg-slate-100 dark:bg-white/10 px-3 text-xs font-bold flex items-center justify-between hover:bg-slate-200 dark:hover:bg-white/15">
                {action}<ChevronRight className="w-4 h-4" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className={`rounded-3xl border p-5 ${cardBg}`}>
          <h3 className={`font-black ${textMain}`}>Где что находится</h3>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
            {locations.map(([title, text, Icon, onClick]) => (
              <button key={title} type="button" onClick={onClick} className="w-full min-h-[58px] py-3 text-left flex items-center gap-3 group">
                <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold ${textMain}`}>{title}</span>
                  <span className="block text-xs text-slate-500">{text}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
              </button>
            ))}
          </div>
        </section>

        <section className={`rounded-3xl border p-5 ${cardBg}`}>
          <h3 className={`font-black ${textMain}`}>{isTeamMode ? 'Как работать с командой' : 'Полезно знать'}</h3>
          <div className="mt-4 space-y-4">
            {(isTeamMode ? [
              ['«Моё» и «Команда»', 'Личные задачи остаются приватными. В пространстве команды видны только рабочие задачи.'],
              ['Результат вместо отчёта', 'Исполнитель сдаёт результат, а ответственный принимает его или возвращает с комментарием.'],
              ['Неделя без длинных списков', 'На экране «Сегодня» переключитесь в «Неделя», чтобы увидеть план, риски и итоги.'],
            ] : [
              ['Не заполняйте всё', 'Для простой задачи достаточно названия. Остальные поля открывайте только когда они действительно нужны.'],
              ['Срочно и важно', 'Отмечайте приоритет только у исключений — Flow Space сам поднимет их выше.'],
              ['Неделя', 'На экране «Сегодня» переключитесь в «Неделя», чтобы увидеть план и итоги без отдельного раздела.'],
            ]).map(([title, text]) => (
              <div key={title} className="flex gap-3">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5" /></div>
                <div><div className={`text-sm font-bold ${textMain}`}>{title}</div><p className="text-xs leading-5 text-slate-500 mt-0.5">{text}</p></div>
              </div>
            ))}
          </div>
          {isTeamMode && <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-white/5 p-3 flex gap-2 text-xs text-slate-500"><Users className="w-4 h-4 shrink-0" /> Собственнику показываются решения и отклонения. Обычные задачи команды остаются в разделе «Работа».</div>}
        </section>
      </div>
    </div>
  );
};

export default HelpView;
