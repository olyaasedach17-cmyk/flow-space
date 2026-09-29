import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Image as ImageIcon, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  CONTENT_GOALS,
  CONTENT_PLATFORMS,
  generateContentPackage,
  generateContentPlan,
  generateContentVisual,
  renderPostVariant,
} from '../services/contentStudioService';

const SIZES = [
  { id: '1024x1536', label: 'Вертикальный' },
  { id: '1024x1024', label: 'Квадрат' },
  { id: '1536x1024', label: 'Горизонтальный' },
  { id: '1024x1792', label: 'Stories 9:16' },
];

export default function ContentCalendar({ cardBg, textMain, company, onCreateTasks }) {
  const [platform, setPlatform] = useState('instagram');
  const [days, setDays] = useState(7);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('');
  const [plan, setPlan] = useState(null);
  const [generated, setGenerated] = useState({});
  const [planning, setPlanning] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [createVisuals, setCreateVisuals] = useState(false);
  const [imageSize, setImageSize] = useState('1024x1536');
  const [imageQuality, setImageQuality] = useState('medium');

  const brandMemory = company?.settings?.aiMemory || {};
  const generatedCount = useMemo(() => Object.keys(generated).length, [generated]);

  const createPlan = async () => {
    if (!topic.trim()) return toast.error('Опишите цель или тему контент-плана');
    setPlanning(true); setPlan(null); setGenerated({});
    try {
      const data = await generateContentPlan({ platform, days, topic: topic.trim(), tone, brandMemory });
      setPlan(data);
      toast.success(`Контент-план на ${data.items.length} дней готов`);
    } catch (error) {
      toast.error(error.message || 'Не удалось создать контент-план');
    } finally { setPlanning(false); }
  };

  const generateDay = async (item) => {
    setActiveDay(item.day);
    try {
      const packageData = await generateContentPackage({
        platform,
        goal: item.goal,
        topic: `${item.topic}\n\nЗадача публикации: ${item.brief}`,
        tone,
        cta: item.cta,
        variants: 1,
        brandMemory,
      });
      let image = null;
      if (createVisuals && packageData.visualPrompt) {
        const imageData = await generateContentVisual({ packageData, size: imageSize, quality: imageQuality });
        if (imageData?.status === 'completed' && imageData?.image) {
          image = {
            url: imageData.image.url || (imageData.image.b64_json ? `data:image/png;base64,${imageData.image.b64_json}` : null),
            model: imageData.model || null,
          };
        }
      }
      setGenerated((prev) => ({ ...prev, [item.day]: { packageData, postText: renderPostVariant(packageData.variants[0]), image } }));
      toast.success(`День ${item.day}: публикация готова`);
    } catch (error) {
      toast.error(`День ${item.day}: ${error.message || 'ошибка генерации'}`);
    } finally { setActiveDay(null); }
  };

  const generateAll = async () => {
    if (!plan?.items?.length) return;
    setBulkRunning(true);
    try {
      for (const item of plan.items) {
        if (!generated[item.day]) await generateDay(item);
      }
    } finally { setBulkRunning(false); }
  };

  const createTasks = () => {
    const items = plan?.items?.map((item) => ({ ...item, generated: generated[item.day] || null })) || [];
    if (!items.length) return;
    onCreateTasks?.({ platform, plan, items });
  };

  return (
    <div className="space-y-5">
      <div className={`p-5 rounded-3xl border ${cardBg}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><CalendarDays className="w-5 h-5"/><h3 className={`font-black ${textMain}`}>Контент-план</h3></div>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">План на 3–14 дней → готовые посты и визуалы → отдельные задачи Flow Space.</p>
          </div>
          <div className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">AI plan</div>
        </div>
      </div>

      <div className={`p-5 rounded-3xl border ${cardBg} space-y-4`}>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500">Площадка</span><select value={platform} onChange={(e)=>setPlatform(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm">{CONTENT_PLATFORMS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500">Период</span><select value={days} onChange={(e)=>setDays(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"><option value={3}>3 дня</option><option value={5}>5 дней</option><option value={7}>7 дней</option><option value={10}>10 дней</option><option value={14}>14 дней</option></select></label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500">Тон</span><input value={tone} onChange={(e)=>setTone(e.target.value)} placeholder="Экспертно и спокойно" className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"/></label>
        </div>
        <label className="space-y-1 block"><span className="text-xs font-bold text-slate-500">Цель периода / что продвигаем</span><textarea rows={3} value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="Например: на неделю прогреть аудиторию к запуску нового сервиса и показать его пользу для собственников малого бизнеса." className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm resize-none"/></label>
        <button onClick={createPlan} disabled={planning} className="w-full py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black text-sm flex items-center justify-center gap-2">{planning?<><Loader2 className="w-4 h-4 animate-spin"/> Планирую…</>:<><Sparkles className="w-4 h-4"/> Создать контент-план</>}</button>
      </div>

      {plan && <>
        <div className={`p-5 rounded-3xl border ${cardBg} space-y-4`}>
          <div><div className={`font-black ${textMain}`}>{plan.title}</div><p className="text-sm text-slate-500 mt-1">{plan.strategy}</p></div>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-white/10"><input type="checkbox" checked={createVisuals} onChange={(e)=>setCreateVisuals(e.target.checked)}/><div><div className="text-xs font-black">Создавать визуалы</div><div className="text-[10px] text-slate-400">Добавить изображения к публикациям</div></div></label>
            <select value={imageSize} disabled={!createVisuals} onChange={(e)=>setImageSize(e.target.value)} className="px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm disabled:opacity-40">{SIZES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>
            <select value={imageQuality} disabled={!createVisuals} onChange={(e)=>setImageQuality(e.target.value)} className="px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm disabled:opacity-40"><option value="low">Черновик</option><option value="medium">Стандарт</option><option value="high">Высокое</option></select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={generateAll} disabled={bulkRunning} className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-black flex items-center gap-2">{bulkRunning?<Loader2 className="w-4 h-4 animate-spin"/>:<WandSparkles className="w-4 h-4"/>}Создать все публикации</button>
            <button onClick={createTasks} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black">Создать задачи ({plan.items.length})</button>
            <span className="self-center text-xs text-slate-400">Готово публикаций: {generatedCount}/{plan.items.length}</span>
          </div>
        </div>

        <div className="space-y-3">
          {plan.items.map((item) => {
            const output = generated[item.day];
            const goalLabel = CONTENT_GOALS.find((x)=>x.id===item.goal)?.label || item.goal;
            return <div key={item.day} className={`p-5 rounded-3xl border ${cardBg}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black">{item.day}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><div className={`font-black ${textMain}`}>{item.topic}</div><span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 dark:bg-white/10">{goalLabel}</span>{output&&<CheckCircle2 className="w-4 h-4 text-emerald-500"/>}</div>
                  <p className="text-sm text-slate-500 mt-1">{item.brief}</p>
                  {item.cta&&<p className="text-xs text-slate-400 mt-2">CTA: {item.cta}</p>}
                  {output && <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 text-sm whitespace-pre-wrap">{output.postText}</div>}
                  {output?.image?.url && <div className="mt-3"><img src={output.image.url} alt={`День ${item.day}`} className="max-h-80 rounded-2xl border border-slate-200 dark:border-white/10"/></div>}
                </div>
                <button onClick={()=>generateDay(item)} disabled={activeDay===item.day || bulkRunning} className="shrink-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black flex items-center gap-1.5">{activeDay===item.day?<Loader2 className="w-4 h-4 animate-spin"/>:output?<Sparkles className="w-4 h-4"/>:<ImageIcon className="w-4 h-4"/>}{output?'Обновить':'Создать'}</button>
              </div>
            </div>;
          })}
        </div>
      </>}
    </div>
  );
}
