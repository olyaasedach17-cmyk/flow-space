import { CONTEXT_FIELDS, normalizeCompanyContext, FASHION_EXAMPLE } from '../domain/companyAI';
import React, { useEffect, useRef, useState } from 'react';
import { X, Tag, Award, MessageCircle, SlidersHorizontal, BrainCircuit } from 'lucide-react';
import { defaultAutomations } from '../constants';
import { DEFAULT_EXECUTIVE_POLICY, normalizeExecutivePolicy } from '../utils/riskEngine';

const DEFAULT_NOTIFICATIONS = {
  telegramEnabled: true,
  urgent_task: true,
  result_submitted: true,
  result_returned: true,
  deadline_risk: true,
  owner_decision: true,
};

const NumberField = ({ label, value, onChange, suffix, min = 1, max = 999 }) => (
  <label className="block">
    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">{label}</span>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 rounded-xl outline-none border text-xs font-semibold bg-slate-50 border-slate-200 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white"
      />
      {suffix && <span className="text-[10px] text-slate-400 shrink-0">{suffix}</span>}
    </div>
  </label>
);

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
  handleSaveSettings,
  cardBg,
  textMain,
  inputBg,
  btnPrimary
}) => {
  const docDataRef = useRef(docData);
  docDataRef.current = docData;
  const [policy, setPolicy] = useState(DEFAULT_EXECUTIVE_POLICY);
  const [aiMemory, setAiMemory] = useState(() => normalizeCompanyContext());
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    if (isOpen) {
      const currentDocData = docDataRef.current;
      setPolicy(normalizeExecutivePolicy(currentDocData?.settings?.executivePolicy));
      setAiMemory(normalizeCompanyContext(currentDocData?.settings?.aiMemory));
      setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(currentDocData?.settings?.notifications || {}) });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const changePolicy = (key, value) => setPolicy((prev) => normalizeExecutivePolicy({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 border ${cardBg}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-lg font-bold ${textMain}`}>Настройки пространства</h3>
          <button onClick={onClose} className="text-slate-400 font-bold"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-xs text-slate-400 mb-4">Начните с личного пространства и добавьте команду, когда она появится. Личные задачи останутся приватными.</p>

        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Режим работы</div>

        <div className="space-y-2 mb-6">
          {['👤 Я один', '👥 2-5 человек', '🏢 Больше 5 человек'].map(size => (
            <button
              key={size}
              onClick={() => setOnboardTeam(size)}
              className={`w-full p-3 rounded-xl border text-xs font-bold text-left transition-all ${onboardTeam === size ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-sm' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5'}`}
            >{size}</button>
          ))}
        </div>

        {onboardTeam !== '👤 Я один' && (
        <div className="pt-4 border-t border-slate-200 dark:border-white/10 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-violet-500" />
            <label className="text-[10px] font-bold uppercase text-slate-400">Правила внимания</label>
          </div>
          <p className="text-[10px] text-slate-400 mb-3">Пороги определяют, что остаётся у команды, а что становится решением собственника. AI не может менять эти правила.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumberField label="Просрочек до решения владельца" value={policy.overdueOwnerThreshold} onChange={(v) => changePolicy('overdueOwnerThreshold', v)} />
            <NumberField label="Минимум выполненных в срок" value={policy.slaMinimumPercent} onChange={(v) => changePolicy('slaMinimumPercent', v)} suffix="%" max={100} />
            <NumberField label="Нагрузка: внимание команды" value={policy.workloadTeamHours} onChange={(v) => changePolicy('workloadTeamHours', v)} suffix="ч" max={500} />
            <NumberField label="Нагрузка: решение собственника" value={policy.workloadOwnerHours} onChange={(v) => changePolicy('workloadOwnerHours', v)} suffix="ч" max={500} />
            <NumberField label="Очередь на проверке" value={policy.reviewQueueTeamThreshold} onChange={(v) => changePolicy('reviewQueueTeamThreshold', v)} />
            <NumberField label="Повторных возвратов до решения владельца" value={policy.repeatedReworkOwnerThreshold} onChange={(v) => changePolicy('repeatedReworkOwnerThreshold', v)} />
            <NumberField label="Срочных задач до сигнала" value={policy.urgentMonitorThreshold} onChange={(v) => changePolicy('urgentMonitorThreshold', v)} />
            <NumberField label="Задач без результата до сигнала" value={policy.missingResultTeamThreshold} onChange={(v) => changePolicy('missingResultTeamThreshold', v)} />
          </div>

          <label className="block mt-3">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Кому сначала идут операционные отклонения</span>
            <select
              value={policy.teamRecipient}
              onChange={(e) => changePolicy('teamRecipient', e.target.value)}
              className="w-full p-3 rounded-xl outline-none border text-xs font-semibold bg-slate-50 border-slate-200 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white"
            >
              <option value="manager">Руководителю / менеджеру</option>
              <option value="owner">Сразу собственнику (для solo/плоской команды)</option>
            </select>
          </label>
        </div>
        )}


        <div className="pt-4 border-t border-slate-200 dark:border-white/10 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="w-3.5 h-3.5 text-violet-500" />
            <label className="text-[10px] font-bold uppercase text-slate-400">Данные компании для AI</label>
          </div>
          <p className="text-[10px] text-slate-400 mb-3">Это управляемый контекст, который AI использует вместо догадок. Не добавляйте пароли, ключи, банковские или особо чувствительные данные.</p>
          <div className="grid gap-2">
            {CONTEXT_FIELDS.slice(0,6).map(([key,label]) => (
              <label key={key} className="block text-xs">{label}<textarea rows="2" maxLength={2500} value={aiMemory[key]} onChange={e=>setAiMemory(prev=>({...prev,[key]:e.target.value}))} className={`w-full p-3 rounded-xl border ${inputBg}`} /></label>
            ))}
            <details><summary className="cursor-pointer text-xs font-bold py-2">Правила и дополнительные сведения</summary>
              {CONTEXT_FIELDS.slice(6).map(([key,label]) => <label key={key} className="block text-xs mt-2">{label}<textarea rows="2" maxLength={2500} value={aiMemory[key]} onChange={e=>setAiMemory(prev=>({...prev,[key]:e.target.value}))} className={`w-full p-3 rounded-xl border ${inputBg}`} /></label>)}
            </details>
            <button type="button" className="text-xs underline text-left" onClick={()=>setAiMemory(normalizeCompanyContext(FASHION_EXAMPLE))}>Заполнить пример бренда одежды (заменит черновик)</button>
            <p className="text-xs text-slate-500">Изменения и пример сохранятся только кнопкой «Сохранить».</p>
          </div>
        </div>

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

        <div className="pt-4 border-t border-slate-200 dark:border-white/10 mb-6">
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Промокод партнера</label>
          {docData?.appliedPromo ? (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 dark:bg-white/10 dark:border-white/20 dark:text-white text-xs font-bold flex items-center gap-2"><Award className="w-4 h-4" /> Активирован код: {docData.appliedPromo} (PRO)</div>
          ) : (
            <div className="flex gap-2">
              <input type="text" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Например: CRISIS2026" className={`flex-1 p-3 rounded-xl outline-none border text-xs font-semibold ${inputBg}`} />
              <button onClick={handleApplyPromo} disabled={isApplyingPromo || !promoInput.trim()} className="px-4 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs rounded-xl disabled:opacity-50">{isApplyingPromo ? '...' : 'Ввод'}</button>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-white/10 mb-6">
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Telegram-уведомления</label>
          <div className={`p-3 rounded-xl text-xs ${tgChatId ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300'}`}>
            <div className="font-bold">{tgChatId ? 'Telegram подключён' : 'Telegram не подключён'}</div>
            <p className="mt-1 opacity-80">Подключение, проверка и смена аккаунта находятся в разделе «Интеграции».</p>
          </div>
          <div className="mt-4 space-y-2">
            <label className="flex items-center justify-between gap-3 text-xs font-bold"><span>Уведомления в Telegram</span><input type="checkbox" checked={notifications.telegramEnabled} onChange={(e) => setNotifications(prev => ({ ...prev, telegramEnabled: e.target.checked }))} /></label>
            {[
              ['result_submitted', 'Результат сдан на проверку'],
              ['result_returned', 'Результат возвращён'],
              ['deadline_risk', 'Срок под угрозой'],
              ['owner_decision', 'Требуется решение собственника'],
              ['urgent_task', 'Создана срочная задача'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                <span>{label}</span>
                <input type="checkbox" checked={notifications[key] !== false} disabled={!notifications.telegramEnabled} onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))} />
              </label>
            ))}
          </div>
        </div>

        <button onClick={() => handleSaveSettings({ executivePolicy: normalizeExecutivePolicy(policy), aiMemory, notifications })} className={`w-full py-3.5 rounded-xl text-xs font-bold ${btnPrimary}`}>
          Сохранить изменения
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
