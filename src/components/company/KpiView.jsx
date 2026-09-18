// ==========================================
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
          <p className="text-xs text-slate-400 mt-1">Автоматический ИИ-анализ эффективности и рисков компании.</p>
        </div>
        <button onClick={handleGenerateTeamReport} disabled={isGeneratingReport} className={`px-5 py-3 rounded-2xl text-xs font-bold ${btnPrimary}`}>
          {isGeneratingReport ? 'Анализ...' : 'Сформировать отчет'}
        </button>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${cardBg}`}>
            <div>
              <div className="flex justify-between items-start mb-1">
                <h4 className={`font-bold text-sm ${textMain}`}>{kpi.name}</h4>
                <span className={`text-2xl font-black ${textMain}`}>{kpi.score}%</span>
              </div>
              <p className="text-xs text-slate-400">{kpi.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KpiView;


// ==========================================
