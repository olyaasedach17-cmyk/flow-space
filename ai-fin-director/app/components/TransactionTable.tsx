/* app/components/TransactionTable.tsx */

// Описываем структуру данных транзакции (TypeScript помогает избежать ошибок)
type Transaction = {
  id: string;
  date: string;
  description: string;
  category: "Доход" | "Расход" | "Комиссия МП" | "Логистика";
  amount: number;
};

// Тестовые данные для визуализации
const mockTransactions: Transaction[] = [
  { id: "1", date: "2026-07-24", description: "Выплата Wildberries", category: "Доход", amount: 450000 },
  { id: "2", date: "2026-07-23", description: "Комиссия WB (FBO)", category: "Комиссия МП", amount: -75000 },
  { id: "3", date: "2026-07-23", description: "Логистика WB", category: "Логистика", amount: -32000 },
  { id: "4", date: "2026-07-20", description: "Закупка товара (Китай)", category: "Расход", amount: -150000 },
];

export default function TransactionTable() {
  // Функция для форматирования суммы (добавляет пробелы и знак рубля)
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Функция для выбора цвета бейджа в зависимости от категории
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "Доход":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "Расход":
        return "bg-red-50 text-red-700 ring-red-600/10";
      case "Комиссия МП":
        return "bg-orange-50 text-orange-700 ring-orange-600/20";
      case "Логистика":
        return "bg-blue-50 text-blue-700 ring-blue-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-gray-600/20";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Последние операции</h2>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          + Добавить
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Описание</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                  {new Date(tx.date).toLocaleDateString("ru-RU")}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {tx.description}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getCategoryStyle(tx.category)}`}>
                    {tx.category}
                  </span>
                </td>
                <td className={`px-6 py-4 text-sm font-medium whitespace-nowrap text-right ${tx.amount > 0 ? "text-emerald-600" : "text-gray-900"}`}>
                  {tx.amount > 0 ? "+" : ""}{formatAmount(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}