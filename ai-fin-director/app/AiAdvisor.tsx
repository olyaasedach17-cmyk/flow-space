/* app/components/AiAdvisor.tsx */
"use client";

import { useState } from "react";

export default function AiAdvisor() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  // Имитация запроса к OpenAI (пока без реального API)
  const handleGenerateReport = () => {
    setIsLoading(true);
    setReport(null);

    // Имитируем задержку ответа нейросети в 3 секунды
    setTimeout(() => {
      setReport(
        "Анализ завершен. \n\n1. Товары-локомотивы: Артикул 'Сумка женская черная' приносит 45% выручки, но маржинальность упала на 3% из-за роста стоимости логистики. Рекомендую поднять цену на 150 ₽.\n\n2. Зоны риска: Расходы на рекламу выросли на 20%, при этом конверсия в заказ осталась прежней. Стоит пересмотреть рекламные ставки.\n\n3. Прогноз кассового разрыва: При текущих темпах закупок и выплат от WB, через 12 дней на счету останется менее 50 000 ₽. Рекомендую отложить закупку новой партии на неделю."
      );
      setIsLoading(false);
    }, 3000);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 rounded-2xl shadow-sm border border-indigo-100 mt-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            ✨ AI-Бизнес-аналитик
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Нейросеть проанализирует ваши транзакции и найдет точки роста прибыли.
          </p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isLoading
              ? "bg-indigo-100 text-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg"
          }`}
        >
          {isLoading ? "Анализирую цифры..." : "Сгенерировать отчет"}
        </button>
      </div>

      {/* Блок с результатом */}
      {report && (
        <div className="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-indigo-50 whitespace-pre-line text-sm text-gray-700 leading-relaxed">
          {report}
        </div>
      )}

      {/* Анимация загрузки */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-pulse flex space-x-2">
            <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animation-delay-400"></div>
          </div>
        </div>
      )}
    </div>
  );
}