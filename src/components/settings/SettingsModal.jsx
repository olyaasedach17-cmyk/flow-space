// ==========================================
import React from 'react';
import { X, Tag, Award, MessageCircle } from 'lucide-react';
import { defaultAutomations } from '../../constants';

const SettingsModal = ({
  isOpen,
  onClose,
  onboardTeam,
  setOnboardTeam,
  promoInput,
  setPromoInput,
  handleApplyPromo,
  isApplyingPromo,
  docData,
  tgChatId,
  setTgChatId,
  handleSaveSettings,
  cardBg,
  textMain,
  inputBg,
  btnPrimary
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-sm rounded-3xl p-6 border ${cardBg}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-lg font-bold ${textMain}`}>Настройки аккаунта</h3>
          <button onClick={onClose} className="text-slate-400 font-bold"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-xs text-slate-400 mb-4">Выберите формат работы для адаптации интерфейса.</p>

        <div className="space-y-2 mb-6">
          {['👤 Я один', '👥 2-5 человек', '🏢 Больше 5 человек'].map(size => (
            <button
              key={size}
              onClick={() => setOnboardTeam(size)}
              className={`w-full p-3 rounded-xl border text-xs font-bold text-left transition-all ${onboardTeam === size ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-sm' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5'}`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* БЛОК АВТОМАТИЗАЦИЙ */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10 mb-6">
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Правила автоматизаций</label>
          <div className="space-y-2">
            {defaultAutomations.map((rule) => (
              <div key={rule.id} className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{rule.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">Активно</span>
              </div>
            ))}
          </div>
        </div>

        {/* БЛОК АКТИВАЦИИ ПРОМОКОДА ПАРТНЕРА */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10 mb-6">
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Промокод партнера
          </label>

          {docData?.appliedPromo ? (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 dark:bg-white/10 dark:border-white/20 dark:text-white text-xs font-bold flex items-center gap-2">
              <Award className="w-4 h-4" /> Активирован код: {docData.appliedPromo} (PRO)
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Например: CRISIS2026"
                className={`flex-1 p-3 rounded-xl outline-none border text-xs font-semibold ${inputBg}`}
              />
              <button
                onClick={handleApplyPromo}
                disabled={isApplyingPromo || !promoInput.trim()}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                {isApplyingPromo ? '...' : 'Ввод'}
              </button>
            </div>
          )}
        </div>

        {/* БЛОК TELEGRAM УВЕДОМЛЕНИЙ */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10 mb-6">
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
            <MessageCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Telegram Уведомления
          </label>
          <input
            type="text"
            value={tgChatId}
            onChange={(e) => setTgChatId(e.target.value)}
            placeholder="Ваш Telegram Chat ID"
            className={`w-full p-3 rounded-xl outline-none border text-xs font-semibold ${inputBg}`}
          />
          <p className="text-[9px] text-slate-400 mt-1">Вставьте ваш Chat ID для получения уведомлений от бота.</p>
        </div>

        <button onClick={handleSaveSettings} className={`w-full py-3.5 rounded-xl text-xs font-bold ${btnPrimary}`}>
          Сохранить изменения
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;


// ==========================================
