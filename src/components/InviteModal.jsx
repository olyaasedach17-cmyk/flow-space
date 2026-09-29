import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ROLES } from '../utils/workspaceUtils';

const InviteModal = ({ 
  isOpen, 
  onClose, 
  inviteEmail, 
  setInviteEmail, 
  invitePosition, 
  setInvitePosition, 
  inviteRole, 
  setInviteRole, 
  inviteDepartmentId,
  setInviteDepartmentId,
  departments = [],
  userRole,
  userDepartmentId,
  onSubmit, 
  cardBg, 
  textMain, 
  inputBg, 
  btnPrimary 
}) => {
  const managerMode = userRole === ROLES.MANAGER;
  const managerDepartment = departments.find((department) => department.id === userDepartmentId);

  useEffect(() => {
    if (!isOpen || !managerMode) return;
    setInviteRole(ROLES.MEMBER);
    setInviteDepartmentId(userDepartmentId || '');
  }, [isOpen, managerMode, userDepartmentId, setInviteRole, setInviteDepartmentId]);

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
            {managerMode ? (
              <div className={`w-full p-3.5 rounded-xl border text-xs ${inputBg}`}>Сотрудник (только свои задачи)</div>
            ) : (
              <select
                aria-label="Роль"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className={`w-full p-3.5 rounded-xl outline-none border text-xs ${inputBg}`}
              >
                <option value="member">Сотрудник (только свои задачи)</option>
                <option value="manager" disabled={!departments.length}>Руководитель (свой отдел)</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Отдел</label>
            <select
              aria-label="Отдел"
              value={inviteDepartmentId || ''}
              onChange={(e) => setInviteDepartmentId(e.target.value)}
              disabled={managerMode}
              className={`w-full p-3.5 rounded-xl outline-none border text-xs ${inputBg}`}
            >
              <option value="">{managerMode ? 'Отдел не назначен' : 'Без отдела'}</option>
              {(managerMode ? departments.filter((department) => department.id === userDepartmentId) : departments).map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            {managerMode && managerDepartment && <p className="text-[10px] text-slate-400 mt-1">Сотрудник будет добавлен в ваш отдел.</p>}
            {managerMode && !managerDepartment && <p role="alert" className="text-[10px] text-red-500 mt-1">Сначала собственник должен назначить вам отдел.</p>}
            {!managerMode && inviteRole === ROLES.MANAGER && !inviteDepartmentId && <p role="alert" className="text-[10px] text-red-500 mt-1">Для руководителя выберите отдел.</p>}
            {!departments.length && <p className="text-[10px] text-slate-400 mt-1">Отдел можно создать на экране «Команда».</p>}
          </div>
          <button type="submit" disabled={(managerMode && !managerDepartment) || (!managerMode && inviteRole === ROLES.MANAGER && !inviteDepartmentId)} className={`w-full py-3.5 rounded-2xl text-xs font-bold disabled:opacity-50 ${btnPrimary}`}>
            Отправить приглашение
          </button>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;
