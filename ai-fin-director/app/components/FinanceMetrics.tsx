/* app/components/FinanceMetrics.tsx */
export default function FinanceMetrics() {
  // Пока захардкодим тестовые цифры (mock data) для визуализации. 
  // Позже мы заменим их на реальные данные из нашей базы Supabase.
  const metrics = {
    revenue: 1250000,    // Выручка
    expenses: 850000,    // Расходы (включая логистику и комиссии)
    profit: 400000,      // Чистая прибыль
    margin: 32,          // Маржинальность в процентах
  };

  // Функция для красивого отображения денег (разбивает на разряды, добавляет ₽)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Карточка: Выручка */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 font-medium mb-1">Выручка</p>
        <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.revenue)}</p>
      </div>

      {/* Карточка: Расходы */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 font-medium mb-1">Все расходы</p>
        <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.expenses)}</p>
      </div>

      {/* Карточка: Чистая прибыль */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 font-medium mb-1">Чистая прибыль</p>
        <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(metrics.profit)}</p>
      </div>

      {/* Карточка: Маржинальность */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 font-medium mb-1">Маржинальность</p>
        <p className="text-2xl font-semibold text-blue-600">{metrics.margin}%</p>
      </div>
    </div>
  );
}