import React from 'react';
import { Copy } from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';

const KpiView = ({
  isTeamMode,
  isDark,
  cardBg,
  textMain,
  btnPrimary,
  handleGenerateTeamReport,
  isGeneratingReport,
  teamReport,
  handleCopyReport,
  kpis,
  managementReading,
  tasks = [],
  archive = [],
  assistants = []
}) => {
  if (!isTeamMode) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ШАПКА СВОДКИ */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${cardBg}`}>
        <div>
          <h3 className={`text-base font-bold ${textMain}`}>Сводка для руководителя</h3>
          <p className="text-xs text-slate-400 mt-1">Реальные показатели задач, приёмки результатов и рисков компании.</p>
        </div>
        <button onClick={handleGenerateTeamReport} disabled={isGeneratingReport} className={`px-5 py-3 rounded-2xl text-xs font-bold ${btnPrimary}`}>
          {isGeneratingReport ? 'Анализ...' : 'Сформировать отчет'}
        </button>
      </div>

      {managementReading && (() => {
        const toneClass = managementReading.tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100'
          : managementReading.tone === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100'
            : managementReading.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100'
              : cardBg;
        return (
          <div className={`p-5 rounded-3xl border ${toneClass}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Что это означает для бизнеса</div>
            <h4 className="font-bold text-sm">{managementReading.title}</h4>
            <p className="text-xs mt-1 opacity-80">{managementReading.meaning}</p>
            <p className="text-xs font-bold mt-2">Следующий шаг: {managementReading.action}</p>
          </div>
        );
      })()}

      {/* ИИ-ОТЧЕТ РУКОВОДИТЕЛЯ */}
      {teamReport && (
        <div className={`p-6 rounded-3xl border relative ${cardBg}`}>
          <button onClick={handleCopyReport} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-white/10 rounded-lg text-slate-500 dark:text-slate-300 transition-colors" title="Скопировать отчет">
            <Copy className="w-4 h-4" />
          </button>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{teamReport}</div>
        </div>
      )}

      {/* БЛОК ГРАФИКОВ RECHARTS */}
      <AnalyticsCharts 
        tasks={tasks}
        archive={archive}
        assistants={assistants}
        isDark={isDark}
        cardBg={cardBg}
        textMain={textMain}
      />

      {/* ДИНАМИЧЕСКИЕ КАРТОЧКИ KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${cardBg}`}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <h4 className={`font-bold text-sm ${textMain}`}>{kpi.name}</h4>
                <span className={`text-2xl font-black ${textMain}`}>{kpi.sampleSize > 0 ? `${kpi.score}%` : '—'}</span>
              </div>
              <p className="text-xs text-slate-400">{kpi.desc}</p>
              {kpi.sampleSize === 0 && <p className="text-[10px] text-slate-400 mt-2">Пока нет данных для расчёта</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KpiView;
