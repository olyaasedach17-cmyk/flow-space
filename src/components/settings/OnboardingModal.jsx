// ==========================================
import React from 'react';
import { X, Sparkles, Target, Users, Zap, ShieldCheck } from 'lucide-react';

const OnboardingModal = ({
  isOpen,
  onClose,
  cardBg,
  textMain,
  btnPrimary
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      icon: <Target className="w-5 h-5 text-amber-500" />,
      title: 'Контроль результата, а не каждого шага',
      desc: 'Задавайте цель, ожидаемый результат (Definition of Done) и дедлайн. Сотрудник выбирает способ реализации самостоятельно.'
    },
    {
      icon: <Sparkles className="w-5 h-5 text-blue-500" />,
      title: 'Умный ИИ-архитектор',
      desc: 'Нейросеть автоматически формулирует проверяемые критерии сдачи работы и готовит управленческие сводки по SLA.'
    },
    {
      icon: <Users className="w-5 h-5 text-emerald-500" />,
      title: 'Автономия и прозрачность команды',
      desc: 'Отслеживайте реальную нагрузку в часах, статус выполнения обязательств и риски срыва сроков на наглядных графиках.'
    },
    {
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      title: 'Бизнес-автоматизации и регламенты (SOP)',
      desc: 'Генерируйте пошаговые регламенты за секунды и получайте моментальные алерты о ключевых вехах в Telegram.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg rounded-3xl p-6 md:p-8 border shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 ${cardBg}`}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-black text-base shadow-md">
            FS
          </div>
          <div>
            <h3 className={`text-lg font-black tracking-tight ${textMain}`}>Добро пожаловать во Flow Space</h3>
            <p className="text-xs text-slate-400">Система управления результатом нового поколения</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <div className="p-2 rounded-xl bg-white dark:bg-white/10 shadow-sm shrink-0 mt-0.5">
                {step.icon}
              </div>
              <div>
                <h4 className={`text-xs font-bold mb-1 ${textMain}`}>{step.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className={`w-full py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 ${btnPrimary}`}
        >
          <ShieldCheck className="w-4 h-4" /> Понятно, приступить к работе
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;


// ==========================================
