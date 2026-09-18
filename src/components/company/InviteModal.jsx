// ==========================================
import React from 'react';
import { X } from 'lucide-react';

const InviteModal = ({
  isOpen,
  onClose,
  inviteEmail,
  setInviteEmail,
  invitePosition,
  setInvitePosition,
  inviteRole,
  setInviteRole,
  onSubmit,
  cardBg,
  textMain,
  inputBg,
  btnPrimary
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${cardBg}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-base font-bold ${textMain}`}>Пригласить сотрудника</h3>
          <button onClick={onClose} className="text-slate-400 font-bold"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email сотрудника</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
              className={`w-full p-3.5 rounded-xl outline-none border text-xs ${inputBg}`}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Должность</label>
            <input
              type="text"
              value={invitePosition}
              onChange={(e) => setInvitePosition(e.target.value)}
              placeholder="Например: Дизайнер, Копирайтер"
              className={`w-full p-3.5 rounded-xl outline-none border text-xs ${inputBg}`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Роль</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className={`w-full p-3.5 rounded-xl outline-none border text-xs ${inputBg}`}
            >
              <option value="worker">Исполнитель (Свои задачи)</option>
              <option value="manager">Руководитель (Полный доступ)</option>
            </select>
          </div>
          <button type="submit" className={`w-full py-3.5 rounded-2xl text-xs font-bold ${btnPrimary}`}>
            Отправить приглашение
          </button>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;


// ==========================================
