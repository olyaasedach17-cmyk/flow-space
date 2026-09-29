import PublicationEditor from './PublicationEditor';
import React, { useMemo, useState } from 'react';
import { Check, Copy, Image as ImageIcon, Camera, Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  CONTENT_GOALS,
  CONTENT_PLATFORMS,
  generateContentPackage,
  generateContentVisual,
  renderPostVariant,
} from '../services/contentStudioService';

const SIZES = [
  { id: '1024x1536', label: 'Вертикальный' },
  { id: '1024x1024', label: 'Квадрат' },
  { id: '1536x1024', label: 'Горизонтальный' },
  { id: '1024x1792', label: 'Stories 9:16' },
];

export default function ContentStudio({ cardBg, textMain, company, tasks = [], onSaveToTask, publicationScope, incomingPublication }) {
  const [legacyPublication,setLegacyPublication]=useState(null);
  const [platform, setPlatform] = useState('instagram');
  const [goal, setGoal] = useState('expert');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('');
  const [cta, setCta] = useState('');
  const [variants, setVariants] = useState(2);
  const [createVisual, setCreateVisual] = useState(true);
  const [imageSize, setImageSize] = useState('1024x1536');
  const imageQuality = 'medium';
  const [running, setRunning] = useState(false);
  const [visualRunning, setVisualRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [image, setImage] = useState(null);
  const [visualError, setVisualError] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [taskId, setTaskId] = useState('');

  const brandMemory = company?.settings?.aiMemory || {};
  const selectedPost = useMemo(() => result?.variants?.[selectedVariant] || null, [result, selectedVariant]);
  const selectedTask = useMemo(() => tasks.find((x) => String(x.id) === String(taskId)), [tasks, taskId]);

  const generate = async () => {
    if (!topic.trim()) return toast.error('Опишите тему публикации');
    setVisualError('');
    setRunning(true); setImage(null); setResult(null); setSelectedVariant(0);
    try {
      const packageData = await generateContentPackage({ platform, goal, topic: topic.trim(), tone, cta, variants, brandMemory });
      setResult(packageData);
      toast.success('Текст публикации готов');
      if (createVisual && packageData.visualPrompt) {
        setVisualRunning(true);
        try {
          const imageData = await generateContentVisual({ packageData, size: imageSize, quality: imageQuality });
          if (imageData?.status === 'completed' && imageData?.image) {
            const url = imageData.image.url || (imageData.image.b64_json ? `data:image/png;base64,${imageData.image.b64_json}` : null);
            setImage({ url, model: imageData.model || null, revisedPrompt: imageData.image.revisedPrompt || null });
            toast.success('Визуал к посту готов');
          } else {
            toast.info('Изображение ещё создаётся');
          }
        } catch (imageError) {
          setVisualError(imageError.message || 'Текст готов, но визуал создать не удалось');
          toast.error(imageError.message || 'Текст готов, но визуал создать не удалось');
        } finally {
          setVisualRunning(false);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Не удалось создать публикацию');
    } finally {
      setRunning(false);
    }
  };

  const copyPost = async () => {
    const text = renderPostVariant(selectedPost);
    if (!text) return;
    try { await navigator.clipboard.writeText(text); toast.success('Пост скопирован'); }
    catch { toast.error('Не удалось скопировать текст'); }
  };

  const save = () => {
    if (!result || !selectedPost) return toast.error('Сначала создайте публикацию');
    if (!selectedTask) return toast.error('Выберите задачу');
    onSaveToTask?.({
      taskId: selectedTask.id,
      platform,
      goal,
      topic,
      packageData: result,
      selectedVariant,
      postText: renderPostVariant(selectedPost),
      image,
    });
  };

  return (
    <div className="space-y-5">
      {publicationScope && <PublicationEditor key={publicationScope} scope={publicationScope} context={brandMemory} incoming={legacyPublication || incomingPublication} />}
      <details><summary className="cursor-pointer text-sm font-bold text-slate-500 min-h-[44px] flex items-center">Дополнительные настройки публикации</summary> 
      <div className={`p-5 rounded-3xl border ${cardBg}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Camera className="w-5 h-5"/><h3 className={`font-black ${textMain}`}>Создать пост</h3></div>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">Укажите тему — AI подготовит текст и визуал.</p>
          </div>
        </div>
      </div>

      <div className={`p-5 rounded-3xl border ${cardBg} space-y-5`}>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500">Площадка</span><select value={platform} onChange={(e)=>setPlatform(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm">{CONTENT_PLATFORMS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500">Цель публикации</span><select value={goal} onChange={(e)=>setGoal(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm">{CONTENT_GOALS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        </div>

        <label className="space-y-1 block"><span className="text-xs font-bold text-slate-500">О чём пост</span><textarea rows={4} value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="Например: запускаем новую услугу для малого бизнеса. Объясни проблему, результат и пригласи на консультацию." className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm resize-none"/></label>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500">Тон (необязательно)</span><input value={tone} onChange={(e)=>setTone(e.target.value)} placeholder="Экспертно, спокойно, без канцелярита" className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"/></label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500">CTA (необязательно)</span><input value={cta} onChange={(e)=>setCta(e.target.value)} placeholder="Напишите «ХОЧУ» в директ" className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"/></label>
        </div>

        <div className="grid md:grid-cols-3 gap-4 items-end">
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500">Вариантов текста</span><select value={variants} onChange={(e)=>setVariants(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-500">Формат визуала</span><select value={imageSize} onChange={(e)=>setImageSize(e.target.value)} disabled={!createVisual} className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent text-sm disabled:opacity-40">{SIZES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
          <label className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 cursor-pointer"><input type="checkbox" checked={createVisual} onChange={(e)=>setCreateVisual(e.target.checked)}/><div><div className="text-xs font-black">Создать визуал</div><div className="text-[10px] text-slate-400">вместе с постом</div></div></label>
        </div>

        <button onClick={generate} disabled={running || visualRunning} className="w-full py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black text-sm flex items-center justify-center gap-2">{running||visualRunning?<><Loader2 className="w-4 h-4 animate-spin"/> Создаю публикацию…</>:<><Sparkles className="w-4 h-4"/> Создать готовый пост</>}</button>
      </div>

      {result && <div className="grid lg:grid-cols-5 gap-5">
        <div className={`lg:col-span-3 p-5 rounded-3xl border ${cardBg} space-y-4`}>
          <div><div className={`font-black ${textMain}`}>{result.title}</div>{result.strategy&&<p className="text-sm text-slate-500 mt-1">{result.strategy}</p>}</div>
          {result.variants.length>1&&<div className="flex gap-2 flex-wrap">{result.variants.map((_,idx)=><button key={idx} onClick={()=>setSelectedVariant(idx)} className={`px-3 py-2 rounded-xl text-xs font-black border ${selectedVariant===idx?'border-slate-900 dark:border-white bg-slate-100 dark:bg-white/10':'border-slate-200 dark:border-white/10'}`}>Вариант {idx+1}</button>)}</div>}
          <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 whitespace-pre-wrap text-sm leading-relaxed">{renderPostVariant(selectedPost)}</div>
          <button className="border rounded-xl p-3 text-sm" onClick={()=>{setLegacyPublication({id:String(Date.now()),text:renderPostVariant(selectedPost)});window.scrollTo({top:0,behavior:'smooth'});}}>Продолжить в редакторе публикации</button>
          <button onClick={copyPost} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black flex items-center gap-2"><Copy className="w-4 h-4"/>Скопировать готовый пост</button>
          {result.carousel.length>0&&<div><div className="text-xs font-black uppercase text-slate-400 mb-2">Если нужна карусель</div><div className="space-y-2">{result.carousel.map((x,i)=><div key={i} className="text-sm p-3 rounded-xl border border-slate-200 dark:border-white/10"><b>{i+1}.</b> {x}</div>)}</div></div>}
        </div>

        <div className={`lg:col-span-2 p-5 rounded-3xl border ${cardBg} space-y-4`}>
          <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4"/><div className={`font-black ${textMain}`}>Визуал</div></div>
          {visualRunning?<div className="aspect-[4/5] rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin"/></div>:image?.url?<img src={image.url} alt="AI visual" className="w-full rounded-2xl object-cover"/>:<div className="aspect-[4/5] rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs text-slate-400 text-center p-6">{visualError || (createVisual?'Визуал не создан. Можно повторить генерацию позже.':'Генерация визуала отключена.')}</div>}
          <div className="text-xs text-slate-500"><b>Промпт:</b> {result.visualPrompt || '—'}</div>
        </div>
      </div>}

      {result && tasks.length>0&&<div className={`p-5 rounded-3xl border ${cardBg}`}>
        <div className="flex items-center gap-2 mb-3"><Check className="w-4 h-4"/><div className={`font-black ${textMain}`}>Сохранить результат</div></div>
        <div className="flex flex-col md:flex-row gap-2"><select value={taskId} onChange={(e)=>setTaskId(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-sm"><option value="">Выберите задачу</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.text||t.title}</option>)}</select><button onClick={save} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-2"><Send className="w-4 h-4"/>Сохранить пост в задачу</button></div>
      </div>}

      </details>
    </div>
  );
}
