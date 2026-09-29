import React, { useMemo, useState } from 'react';
import { Download, FileBarChart2, FileText, HardDriveUpload, Megaphone, Loader2, Presentation, Sheet, Sparkles, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { downloadArtifact } from '../services/artifactService';
import { uploadArtifactToGoogleDrive } from '../services/integrationService';
import { runDocToArtifactWorkflow, runSheetToArtifactWorkflow } from '../services/workflowService';

const OUTPUTS = [
  { id: 'report', label: 'Отчёт DOCX', icon: FileBarChart2 },
  { id: 'presentation', label: 'Презентация PPTX', icon: Presentation },
  { id: 'social_post', label: 'Пост для соцсетей', icon: Megaphone },
];

export default function WorkflowStudio({ companyId, tasks = [], cardBg, textMain, onAttachToTask, onCreateRecommendedTasks, docsEnabled = false, driveEnabled = false }) {
  const [sourceType, setSourceType] = useState('sheets');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [range, setRange] = useState('A1:Z200');
  const [goal, setGoal] = useState('');
  const [outputType, setOutputType] = useState('report');
  const [taskId, setTaskId] = useState('');
  const [running, setRunning] = useState(false);
  const [savingDrive, setSavingDrive] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const [driveFile, setDriveFile] = useState(null);

  const selectedTask = useMemo(() => tasks.find((task) => String(task.id) === String(taskId)), [tasks, taskId]);

  const run = async () => {
    if (!companyId) return toast.error('Рабочее пространство ещё не готово');
    if (sourceType === 'sheets' && !spreadsheetId.trim()) return toast.error('Укажите ID Google Sheets');
    if (sourceType === 'docs' && !documentId.trim()) return toast.error('Укажите ID Google Docs');
    if (!goal.trim()) return toast.error('Опишите, какой результат нужен');
    setRunning(true); setDriveFile(null);
    try {
      const data = sourceType === 'docs'
        ? await runDocToArtifactWorkflow({ companyId, documentId: documentId.trim(), goal: goal.trim(), outputType })
        : await runSheetToArtifactWorkflow({ companyId, spreadsheetId: spreadsheetId.trim(), range: range.trim() || 'A1:Z200', goal: goal.trim(), outputType });
      setWorkflow(data);
      toast.success('Результат готов');
    } catch (error) { toast.error(error.message || 'Не удалось выполнить workflow'); }
    finally { setRunning(false); }
  };

  const attach = () => {
    if (!workflow) return;
    if (!selectedTask) return toast.error('Выберите задачу');
    onAttachToTask?.({ taskId: selectedTask.id, workflow, outputType, goal, sourceType });
  };

  const saveToDrive = async () => {
    if (!workflow?.artifact) return;
    setSavingDrive(true);
    try {
      const result = await uploadArtifactToGoogleDrive({ companyId, artifact: workflow.artifact });
      setDriveFile(result.file || null);
      toast.success('Файл сохранён в Google Drive');
    } catch (error) { toast.error(error.message || 'Не удалось сохранить файл в Drive'); }
    finally { setSavingDrive(false); }
  };

  const createTasks = () => {
    const items = (workflow?.result?.tasks?.length ? workflow.result.tasks : workflow?.result?.recommendations || []).slice(0, 8);
    if (!items.length) return toast.error('AI не предложил задач');
    if (!window.confirm(`Создать ${items.length} задач в Flow Space из рекомендаций AI?`)) return;
    onCreateRecommendedTasks?.({ items, workflow, goal, sourceType });
  };

  return (
    <div className={`p-5 rounded-3xl border ${cardBg} space-y-5`}>
      <div>
        <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" /><h3 className={`font-black ${textMain}`}>Работа с Google</h3></div>
        <p className="text-sm text-slate-500 mt-1">Возьмём данные из Google и подготовим файл или задачу Flow Space.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <button onClick={() => setSourceType('sheets')} className={`p-3 rounded-2xl border text-left text-xs font-black flex items-center gap-2 ${sourceType==='sheets'?'border-slate-900 dark:border-white bg-slate-100 dark:bg-white/10':'border-slate-200 dark:border-white/10'}`}><Sheet className="w-4 h-4"/>Google Sheets</button>
        {docsEnabled && <button onClick={() => setSourceType('docs')} className={`p-3 rounded-2xl border text-left text-xs font-black flex items-center gap-2 ${sourceType==='docs'?'border-slate-900 dark:border-white bg-slate-100 dark:bg-white/10':'border-slate-200 dark:border-white/10'}`}><FileText className="w-4 h-4"/>Google Docs</button>}
      </div>

      {sourceType === 'sheets' ? <div className="grid md:grid-cols-2 gap-4">
        <label className="space-y-1"><span className="text-xs font-bold text-slate-500">ID Google Sheets</span><input value={spreadsheetId} onChange={(e)=>setSpreadsheetId(e.target.value)} placeholder="1AbC... из ссылки таблицы" className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"/></label>
        <label className="space-y-1"><span className="text-xs font-bold text-slate-500">Диапазон</span><input value={range} onChange={(e)=>setRange(e.target.value)} placeholder="Продажи!A1:H200" className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"/></label>
      </div> : <label className="space-y-1 block"><span className="text-xs font-bold text-slate-500">ID Google Docs</span><input value={documentId} onChange={(e)=>setDocumentId(e.target.value)} placeholder="ID документа из ссылки Google Docs" className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"/></label>}

      <label className="space-y-1 block"><span className="text-xs font-bold text-slate-500">Что нужно получить</span><textarea value={goal} onChange={(e)=>setGoal(e.target.value)} rows={3} placeholder="Например: найди проблемы, подготовь презентацию собственнику и предложи следующие задачи" className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm resize-none"/></label>

      <div><div className="text-xs font-bold text-slate-500 mb-2">Формат результата</div><div className="grid sm:grid-cols-3 gap-2">{OUTPUTS.map((item)=>{const Icon=item.icon; const active=outputType===item.id; return <button key={item.id} onClick={()=>setOutputType(item.id)} className={`p-3 rounded-2xl border text-left text-xs font-black flex items-center gap-2 ${active?'border-slate-900 dark:border-white bg-slate-100 dark:bg-white/10':'border-slate-200 dark:border-white/10'}`}><Icon className="w-4 h-4"/>{item.label}</button>})}</div></div>

      <button onClick={run} disabled={running} className="w-full py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black text-sm flex items-center justify-center gap-2">{running?<><Loader2 className="w-4 h-4 animate-spin"/> Анализирую и создаю…</>:<><Sparkles className="w-4 h-4"/> Создать результат</>}</button>

      {workflow && <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-white/10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3"><div><div className={`font-black ${textMain}`}>{workflow.result.title}</div><div className="text-xs text-slate-400 mt-1">{workflow.sheet ? `Прочитано строк: ${workflow.sheet.rows} · ${workflow.sheet.range}` : `Google Docs · ${workflow.source?.title || 'документ'}`}</div></div><button onClick={()=>downloadArtifact(workflow.artifact)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-2"><Download className="w-4 h-4"/> Скачать {workflow.artifact.filename}</button></div>
        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{workflow.result.summary}</p>
        {workflow.result.insights.length>0&&<div><div className="text-xs font-black uppercase text-slate-400 mb-1">Главные выводы</div><ul className="text-sm space-y-1 list-disc pl-5">{workflow.result.insights.slice(0,6).map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
        {workflow.result.recommendations.length>0&&<div><div className="text-xs font-black uppercase text-slate-400 mb-1">Что делать</div><ul className="text-sm space-y-1 list-disc pl-5">{workflow.result.recommendations.slice(0,6).map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
        <div className="grid md:grid-cols-2 gap-2">
          {driveEnabled && <button onClick={saveToDrive} disabled={savingDrive} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black flex items-center justify-center gap-2"><HardDriveUpload className="w-4 h-4"/>{savingDrive?'Сохраняю…':driveFile?'Сохранено в Drive':'Сохранить в Google Drive'}</button>}
          <button onClick={createTasks} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black flex items-center justify-center gap-2"><WandSparkles className="w-4 h-4"/>Создать задачи из рекомендаций</button>
        </div>
        {driveFile?.webViewLink && <a href={driveFile.webViewLink} target="_blank" rel="noreferrer" className="text-xs font-bold underline text-slate-500">Открыть файл в Google Drive</a>}
        {tasks.length>0&&<div className="flex flex-col md:flex-row gap-2"><select value={taskId} onChange={(e)=>setTaskId(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"><option value="">Выберите задачу для сохранения результата</option>{tasks.map((task)=><option key={task.id} value={task.id}>{task.text||task.title}</option>)}</select><button onClick={attach} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black">Сохранить в задачу</button></div>}
      </div>}
    </div>
  );
}
