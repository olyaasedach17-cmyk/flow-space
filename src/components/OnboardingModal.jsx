import React, { useEffect, useState } from 'react';
import { ArrowRight, Bot, Building2, Check, Lock, Sparkles, UserRound, X } from 'lucide-react';
import { PRODUCT_MODES } from '../utils/productMode';

const OnboardingModal = ({
  isOpen,
  onClose,
  cardBg,
  textMain,
  btnPrimary,
  initialMode = PRODUCT_MODES.SOLO,
  onComplete,
}) => {
  const [mode, setMode] = useState(initialMode);
  useEffect(() => { if (isOpen) setMode(initialMode); }, [isOpen, initialMode]);
  if (!isOpen) return null;

  const choose = (nextMode) => setMode(nextMode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 md:p-8 border shadow-2xl relative ${cardBg}`}>
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-black">FS</div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Flow Space</div>
            <h3 className={`text-xl font-black tracking-tight ${textMain}`}>Что хотите организовать?</h3>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-6 max-w-xl">Выберите текущий вариант. Позже можно добавить команду, а личные задачи останутся видны только вам.</p>

        <div className="grid md:grid-cols-2 gap-3">
          <ModeCard
            active={mode === PRODUCT_MODES.SOLO}
            onClick={() => choose(PRODUCT_MODES.SOLO)}
            icon={<UserRound className="w-5 h-5" />}
            title="Я работаю один"
            subtitle="Моё пространство"
            bullets={['Сегодня — только актуальные задачи', 'Работа — все задачи и проекты', 'AI помогает подготовить результат']}
          />
          <ModeCard
            active={mode === PRODUCT_MODES.TEAM}
            onClick={() => choose(PRODUCT_MODES.TEAM)}
            icon={<Building2 className="w-5 h-5" />}
            title="У меня есть команда"
            subtitle="Пространство команды"
            bullets={['Моё остаётся приватным', 'Команда сдаёт готовый результат', 'Вам показываются только важные решения']}
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-2 mt-5">
          <MiniFeature icon={<Lock className="w-4 h-4" />} title="Личное остаётся личным" />
          <MiniFeature icon={<Bot className="w-4 h-4" />} title="AI рядом с задачей" />
          <MiniFeature icon={<Sparkles className="w-4 h-4" />} title="Без ручных отчётов" />
        </div>

        <button onClick={() => onComplete?.(mode)} className={`w-full mt-6 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 ${btnPrimary}`}>
          {mode === PRODUCT_MODES.SOLO ? 'Открыть моё пространство' : 'Настроить пространство команды'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ModeCard = ({ active, onClick, icon, title, subtitle, bullets }) => (
  <button onClick={onClick} className={`relative text-left rounded-3xl border p-5 transition-all ${active ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-white/10 ring-1 ring-slate-900/5 dark:ring-white/10' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
    {active && <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center"><Check className="w-3.5 h-3.5" /></div>}
    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200">{icon}</div>
    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-4">{subtitle}</div>
    <div className="text-base font-black text-slate-900 dark:text-white mt-1">{title}</div>
    <div className="space-y-2 mt-4">
      {bullets.map((bullet) => <div key={bullet} className="flex items-start gap-2 text-xs text-slate-500"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />{bullet}</div>)}
    </div>
  </button>
);

const MiniFeature = ({ icon, title }) => (
  <div className="rounded-2xl bg-slate-50 dark:bg-white/5 px-3 py-3 flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{icon}{title}</div>
);

export default OnboardingModal;
