import React, { useEffect, useState } from 'react';
import { COMPANY_AGENTS, canUseAgent } from '../domain/companyAI';
import { companyAIRequest } from '../services/companyAIService';
const statusLabel = {new:'Новая',dismissed:'Отклонена',converted_to_task:'Задача создана'};
const button = 'px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 text-xs font-semibold disabled:opacity-40';
export default function CompanyAIPanel({companyId,role,onSettings}) {
 const [data,setData]=useState({agents:[],insights:[]});
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [draft,setDraft]=useState(null),[confirmation,setConfirmation]=useState(null),[goal,setGoal]=useState('');
 useEffect(()=>{let active=true;companyAIRequest(companyId,'list').then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[companyId]);
 async function perform(action,payload={},message='') {
  setBusy(true);setError('');setNotice('');
  try { const result=await companyAIRequest(companyId,action,payload);if(action==='save_agent')setDraft(null);if(action==='convert')setConfirmation(null);setNotice(result?.message||message);const fresh=await companyAIRequest(companyId,'list');setData(fresh); }
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="mb-6 p-5 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B22] text-slate-900 dark:text-white" aria-label="Агенты компании">
  <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold">AI компании</h2>{role==='owner'&&<button className={button} onClick={onSettings}>Данные компании</button>}</div>
  <p className="text-xs text-slate-500 my-3">Sales предлагает направления роста. CEO готовит обзор для собственника. При запуске выбранные данные компании передаются AI; сообщения клиентам не отправляются.</p>
  {error && <p role="alert" className="text-sm text-red-600 my-2">{error} <button className={button} disabled={busy} onClick={()=>perform('list')}>Обновить</button></p>}
  {notice && <p role="status" className="text-sm text-emerald-600 my-2">{notice}</p>}
  {busy && <p role="status" className="text-xs my-2">Выполняется запрос…</p>}
  <label className="block text-xs my-3">Цель текущего запуска (необязательно)<input maxLength={1500} value={goal} onChange={e=>setGoal(e.target.value)} className="block w-full mt-1 p-3 border rounded-xl bg-transparent" placeholder="Например: оценить возможности сотрудничества со стилистами" /></label>
  <div className="grid sm:grid-cols-2 gap-3">{Object.entries(COMPANY_AGENTS).filter(([id])=>canUseAgent(role,id)).map(([id,base])=>{
   const agent=data.agents.find(a=>a.id===id);
   return <article key={id} className="border rounded-2xl p-4 border-slate-200 dark:border-white/10"><h3 className="font-bold text-sm">{base.name}</h3><p className="text-xs text-slate-500 my-2">{base.description}</p><p className="text-xs mb-3">{!agent?'Не создан':agent.enabled?'Включён':'Выключен'}</p>
    <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={()=>setDraft({id,instructions:agent?.instructions||'',enabled:agent?.enabled!==false})}>{agent?'Настроить':'Создать агента'}</button>{agent&&<button className={button} disabled={busy||!agent.enabled} onClick={()=>perform('run',{agentId:id,goal},'Результат сохранён в рекомендациях компании')}>{id==='ceo'?'Сформировать обзор':'Получить рекомендации'}</button>}</div>
   </article>;
  })}</div>
  {draft&&<div className="my-3 p-4 border rounded-2xl"><h3 className="text-sm font-bold">Настройка {COMPANY_AGENTS[draft.id].name}</h3><label className="block text-xs my-2">Дополнительные инструкции<textarea rows={3} maxLength={3000} value={draft.instructions} onChange={e=>setDraft({...draft,instructions:e.target.value})} className="block w-full p-3 border rounded-xl bg-transparent" /></label><label className="text-xs block mb-3"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})} /> Агент включён</label><button className={button} disabled={busy} onClick={()=>perform('save_agent',{agentId:draft.id,agent:draft},'Настройки агента сохранены')}>Сохранить агента</button> <button className={button} disabled={busy} onClick={()=>setDraft(null)}>Отмена</button></div>}
  <h3 className="text-sm font-bold mt-5 mb-2">Рекомендации и обзоры</h3>
  {!data.insights.length&&!busy&&<p className="text-xs text-slate-500">Результатов пока нет. Создайте агента и запустите его.</p>}
  {data.insights.map(item=><article key={item.id} className="border-t border-slate-200 dark:border-white/10 py-4"><p className="text-xs text-slate-500">{COMPANY_AGENTS[item.agentId]?.name} · {statusLabel[item.status]||item.status} · Приоритет: {{low:'низкий',medium:'средний',high:'высокий'}[item.priority]}</p><h4 className="font-semibold text-sm my-1">{item.title}</h4><p className="text-sm whitespace-pre-wrap">{item.summary}</p><details className="my-2 text-xs"><summary className="cursor-pointer">Подробнее</summary><p className="whitespace-pre-wrap my-2">{item.details}</p>{item.dataLimitations?.map((x,i)=><p className="text-slate-500 my-1" key={i}>{x}</p>)}</details>{item.status==='new'&&<div className="flex gap-2"><button className={button} disabled={busy||!item.suggestedAction?.title||!item.suggestedAction?.expectedResult} onClick={()=>setConfirmation(item)}>Создать задачу</button><button className={button} disabled={busy} onClick={()=>perform('dismiss',{insightId:item.id},'Рекомендация отклонена')}>Отклонить</button></div>}</article>)}
  {confirmation&&<div role="dialog" aria-modal="true" aria-label="Подтверждение задачи" className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center"><div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-lg w-full"><h3 className="font-bold">Создать задачу в Company Space?</h3><p className="my-3 text-sm">{confirmation.suggestedAction.title}</p><p className="text-xs whitespace-pre-wrap">Ожидаемый результат: {confirmation.suggestedAction.expectedResult}</p><ul className="text-xs my-2 list-disc pl-5">{confirmation.suggestedAction.successCriteria?.map((x,i)=><li key={i}>{x}</li>)}</ul><p className="text-xs text-slate-500 my-3">Исполнитель — вы. После создания можно изменить исполнителя и срок в обычной карточке задачи.</p>{error&&<p role="alert" className="text-red-600 text-sm">{error}</p>}<button className={button} disabled={busy} onClick={()=>perform('convert',{insightId:confirmation.id,confirm:true},'Задача создана. Она доступна в задачах Company Space.')}>Подтвердить создание</button> <button className={button} disabled={busy} onClick={()=>setConfirmation(null)}>Отмена</button></div></div>}
 </section>;
}
