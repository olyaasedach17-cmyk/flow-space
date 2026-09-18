// ==========================================
import React from 'react';
import { User, Bot, Plus, BookOpen, Send } from 'lucide-react';

const AssistantView = ({
  cardBg,
  textMain,
  inputBg,
  btnPrimary,
  aiOptions,
  processRole,
  setProcessRole,
  processTopic,
  setProcessTopic,
  handleGenerateProcess,
  isProcessGenerating,
  processMessages,
  handleCreateTaskFromAI,
  handleSaveToSOP,
  followUpText,
  setFollowUpText,
  handleFollowUpProcess
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className={`p-6 rounded-3xl border ${cardBg}`}>
        <h3 className={`text-base font-bold mb-4 ${textMain}`}>Выбор специалиста</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {aiOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setProcessRole(opt.id)}
              className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all ${
                processRole === opt.id
                  ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-sm'
                  : 'border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="text-lg mb-1">{opt.icon}</div>
              {opt.label}
            </button>
          ))}
        </div>

        <textarea
          value={processTopic}
          onChange={(e) => setProcessTopic(e.target.value)}
          placeholder="Опишите задачу подробнее..."
          rows="3"
          className={`w-full p-4 rounded-2xl outline-none border text-sm resize-none mb-3 ${inputBg}`}
        />
        <button
          onClick={handleGenerateProcess}
          disabled={isProcessGenerating || !processTopic.trim()}
          className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-xs font-bold disabled:opacity-50 ${btnPrimary}`}
        >
          <Send className="w-3.5 h-3.5" />
          {isProcessGenerating ? 'Обработка запроса...' : 'Отправить запрос'}
        </button>
      </div>

      {processMessages.length > 0 && (
        <div className="space-y-4">
          {processMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border text-sm ${
                msg.role === 'user'
                  ? 'bg-slate-100 border-slate-200 text-slate-800 dark:bg-white/10 dark:border-white/20 dark:text-white ml-6'
                  : `${cardBg} mr-6`
              }`}
            >
              <div className="font-bold text-xs mb-2 opacity-60 flex items-center gap-1.5">
                {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                {msg.role === 'user' ? 'Ваш запрос' : 'Ответ Ассистента'}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

              {msg.role === 'assistant' && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => handleCreateTaskFromAI(msg.content)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> В задачу
                  </button>
                  <button
                    onClick={() => handleSaveToSOP(msg.content)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white transition-colors flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Сохранить регламент
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className={`p-2 pl-4 flex items-center gap-2 rounded-2xl border ${cardBg}`}>
            <input
              type="text"
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFollowUpProcess()}
              placeholder="Уточнить запрос..."
              className="flex-1 bg-transparent outline-none text-xs font-medium"
            />
            <button
              onClick={handleFollowUpProcess}
              disabled={isProcessGenerating}
              className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-1 ${btnPrimary}`}
            >
              <Send className="w-3 h-3" /> Отправить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantView;


// ==========================================
