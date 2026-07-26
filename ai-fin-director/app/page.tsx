/* app/page.tsx */
import FinanceMetrics from "./components/FinanceMetrics";
import TransactionTable from "./components/TransactionTable";
import AiAdvisor from "./components/AiAdvisor";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Обзор финансов
          </h1>
          <p className="text-gray-500 mt-1">
            Сводка по вашему бизнесу и рекомендации ИИ.
          </p>
        </header>
        
        {/* Дашборд с метриками */}
        <FinanceMetrics />
        
        {/* Таблица транзакций */}
        <TransactionTable />

        {/* Наш новый модуль AI-Аналитики */}
        <AiAdvisor />
      </div>
    </main>
  );
}