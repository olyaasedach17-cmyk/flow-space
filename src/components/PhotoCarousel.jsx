import {normalizeCarouselText} from '../services/carouselText';
import React,{useState,useEffect,useRef} from 'react';
import {callServerAI,safeParseAIJSON} from '../services/aiService';
export async function renderSlide(photo,text,index,options={}){
 const img=new Image();img.src=photo;await img.decode();
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d');
 if(options.style==='editorial'){
  const scale=Math.max(1080/img.width,1350/img.height);
  const offset=(options.position??50)/100;
  c.drawImage(img,(1080-img.width*scale)*offset,(1350-img.height*scale)/2,img.width*scale,img.height*scale);
  const right=options.side==='right';
  const gradient=c.createLinearGradient(right?1080:0,0,right?0:1080,0);
  gradient.addColorStop(0,'rgba(243,235,224,1)');gradient.addColorStop(.38,'rgba(243,235,224,.97)');gradient.addColorStop(.72,'rgba(243,235,224,0)');c.fillStyle=gradient;c.fillRect(0,0,1080,1350);
  const x=right?530:64,width=486;
  const write=(value,y,font,color,lineHeight,maxLines)=>{
   const baseSize=Number(font.match(/(\d+)px/)[1]);let lines=[],size=baseSize;
   for(;size>=Math.ceil(baseSize*.65);size--){
    c.font=font.replace(/\d+px/,`${size}px`);lines=[];let line='';let tooWide=false;
    for(const word of value.split(/\s+/).filter(Boolean)){
     if(c.measureText(word).width>width)tooWide=true;
     if(c.measureText(line?line+' '+word:word).width>width&&line){lines.push(line);line=word;}else line=line?line+' '+word:word;
    }if(line)lines.push(line);
    if(!tooWide&&lines.length<=maxLines)break;
   }
   if(size<Math.ceil(baseSize*.65))throw new Error(`Слишком длинный текст слайда ${index+1}. Сократите его в «Редактировать».`);
   c.fillStyle=color;const step=lineHeight*size/baseSize;
   lines.forEach((line,i)=>c.fillText(line,x,y+i*step));return y+lines.length*step;
  };
  let y=write(text.toLocaleUpperCase('ru'),135,'900 58px "Arial Narrow", Arial, sans-serif','#141414',65,7);
  if(options.accent)y=write(options.accent.toLocaleUpperCase('ru'),y+35,'900 54px "Arial Narrow", Arial, sans-serif','#d50927',62,2);
  if(options.subtitle)write(options.subtitle,y+45,'36px Arial','#171717',44,3);
  if(options.signature)write(options.signature.toLocaleUpperCase('ru'),1190,'bold 25px Arial','#343434',30,3);
  c.font='24px Arial';c.fillStyle='#444';c.fillText(String(index+1).padStart(2,'0'),970,1300);
  return canvas.toDataURL('image/png');
 }
 c.fillStyle='#f8f5ef';c.fillRect(0,0,1080,1350);
 const scale=Math.min(1000/img.width,850/img.height);c.drawImage(img,(1080-img.width*scale)/2,40+(850-img.height*scale)/2,img.width*scale,img.height*scale);
 c.fillStyle='#142020';c.font='600 44px Arial';
 const lines=[];let line='';for(const word of text.split(/\s+/)){if(c.measureText(`${line} ${word}`).width>920&&line){lines.push(line);line=word;}else line=line?`${line} ${word}`:word;}if(line)lines.push(line);
 if(lines.length>6)throw new Error(`Сократите текст слайда ${index+1}: он не помещается в макет`);
 lines.forEach((x,i)=>c.fillText(x,80,980+i*55));c.font='24px Arial';c.fillStyle='#697575';c.fillText(String(index+1).padStart(2,'0'),80,1300);
 return canvas.toDataURL('image/png');
}
export default function PhotoCarousel({sourcePost='',regenerateText=false,initialSlides=[],initialStyle='editorial',initialExports=[],onDraftChange,onTextGenerated,onBusyChange}){
 const resultRef=useRef(null),showResult=useRef(false);

 const [style,setStyle]=useState(initialStyle);
 const [slides,setSlides]=useState(initialSlides),[topic,setTopic]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[exports,setExports]=useState(initialExports);
 useEffect(()=>{if(exports.length&&showResult.current){showResult.current=false;resultRef.current?.scrollIntoView?.({behavior:'smooth',block:'start'});}},[exports]);
 useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[busy,onBusyChange]);
 useEffect(()=>{onDraftChange?.(slides,style,exports);},[slides,style,exports]); // eslint-disable-line react-hooks/exhaustive-deps
 async function upload(e){setError('');setExports([]);const files=Array.from(e.target.files||[]);e.target.value='';if(files.length+slides.length>10){setError('Можно добавить до 10 фотографий');return;}setBusy(true);
 try{const next=[];for(const f of files){if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024)throw new Error('Используйте JPG, PNG или WebP до 10 МБ');const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');const scale=Math.min(1,1600/Math.max(img.width,img.height));canvas.width=img.width*scale;canvas.height=img.height*scale;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);next.push({photo:canvas.toDataURL('image/jpeg',.9),text:''});}setSlides(prev=>[...prev,...next]);}catch(e){setError(e.message||'Не удалось прочитать фото');}finally{setBusy(false);}}
 async function generate(){const r=await callServerAI({messages:[{role:'system',content:'Ты редактор Instagram. Напиши грамотный русский текст для карусели. Только JSON {"slides":[{"title":"заголовок","accent":"короткий красный акцент","subtitle":"пояснение"}]}. Количество элементов slides должно точно совпадать с запрошенным. На слайд короткий выразительный заголовок до 80 символов, без длинных предложений. Первый — заголовок, затем последовательные мысли, последний — мягкий призыв. Не выдумывай цены, факты и скидки. Фотографии ты не видишь, не описывай их.'},{role:'user',content:`Исходный пост: ${sourcePost || topic}. Ровно ${slides.length} слайдов. Сократи этот пост до последовательных заголовков, сохраняя смысл. Не добавляй новые факты.`}],temperature:.3});const data=safeParseAIJSON(r.choices[0].message.content);const texts=normalizeCarouselText(data,slides.length);return slides.map((s,i)=>({...s,...texts[i]}));}
 async function prepare(){setBusy(true);setError('');try{
 const ready=regenerateText||slides.some(s=>!s.text.trim())?await generate():slides;
 const result=[];for(let i=0;i<ready.length;i++)result.push(await renderSlide(ready[i].photo,ready[i].text,i,{...ready[i],style}));
 showResult.current=true;setSlides(ready);setExports(result);onTextGenerated?.();
 }catch(e){setError(e.message||'Не удалось создать карусель. Попробуйте ещё раз.');}finally{setBusy(false);}}
 const edit=(i,patch)=>{setExports([]);setSlides(prev=>prev.map((s,n)=>n===i?{...s,...patch}:s));};
 function downloadAll(){exports.forEach((url,i)=>{const link=document.createElement('a');link.href=url;link.download=`carousel-${String(i+1).padStart(2,'0')}.png`;document.body.appendChild(link);link.click();link.remove();});}
 return <section className="p-5 rounded-3xl border border-slate-200 dark:border-white/10 space-y-4"><h3 className="font-bold">Instagram-карусель из своих фото</h3><p className="text-xs text-slate-500">Добавьте 2–10 фото — карусель будет создана из вашего поста.</p>{exports.length>0&&<div ref={resultRef} className="space-y-3 scroll-mt-4"><div className="flex items-center justify-between gap-3"><h4 className="font-bold">Готовая карусель</h4><button type="button" className="border rounded-xl p-3 text-sm" onClick={downloadAll}>Скачать все</button></div><div className="grid sm:grid-cols-2 gap-4">{exports.map((url,i)=><div key={i}><img src={url} alt={`Готовый слайд ${i+1}`} className="w-full rounded-xl"/><a className="text-sm underline" href={url} download={`carousel-${String(i+1).padStart(2,'0')}.png`}>Скачать слайд {i+1}</a></div>)}</div></div>}<input aria-label="Фотографии карусели" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={upload}/>{!sourcePost&&<label className="block text-sm">Тема и факты для карусели<textarea className="block w-full border rounded-xl p-3 bg-transparent" maxLength={4000} value={topic} disabled={busy} onChange={e=>setTopic(e.target.value)}/></label>}<button disabled={busy||slides.length<2||(!(sourcePost||topic).trim()&&slides.some(s=>!s.text.trim()))} className="border rounded-xl p-3 text-sm disabled:opacity-40" onClick={prepare}>{busy?'Создаю…':'Создать карусель'}</button>{error&&<p role="alert" className="text-red-600 text-sm">{error}</p>}{busy&&<p role="status">Подготавливаю…</p>}<div className="grid sm:grid-cols-2 gap-4">{slides.map((s,i)=><div key={i} className="border rounded-xl p-3"><img src={s.photo} alt={`Фото ${i+1}`} className="h-48 w-full object-contain"/><details><summary className="cursor-pointer text-xs py-2">Редактировать</summary><label className="text-xs">Текст {i+1}<textarea className="block w-full bg-transparent border rounded-lg p-2" maxLength={240} value={s.text} disabled={busy} onChange={e=>edit(i,{text:e.target.value})}/></label>{style==='editorial'&&<div className="space-y-2 my-3">{[['accent','Выделенная фраза',65],['subtitle','Подзаголовок',110],['signature','Подпись внизу',65]].map(([key,label,max])=><label key={key} className="block text-xs">{label}<input value={s[key]||''} maxLength={max} disabled={busy} onChange={e=>edit(i,{[key]:e.target.value})} className="block w-full border rounded-lg p-2 bg-transparent"/></label>)}<label className="block text-xs">Сторона текста<select value={s.side||'left'} disabled={busy} onChange={e=>edit(i,{side:e.target.value})} className="block border rounded-lg p-2 bg-transparent"><option value="left">Слева</option><option value="right">Справа</option></select></label><label className="block text-xs">Кадрирование фото<input type="range" min="0" max="100" value={s.position??50} disabled={busy} onChange={e=>edit(i,{position:Number(e.target.value)})}/></label></div>}</details><button disabled={busy} className="text-xs underline mr-3" onClick={()=>{setExports([]);setSlides(prev=>prev.filter((_,n)=>n!==i));}}>Удалить</button><button disabled={busy||i===0} className="text-xs underline" onClick={()=>{setExports([]);setSlides(prev=>{const a=[...prev];[a[i-1],a[i]]=[a[i],a[i-1]];return a;});}}>Переместить раньше</button></div>)}</div><details><summary className="cursor-pointer text-sm">Оформление</summary><label className="block text-sm">Оформление<select className="block border rounded-xl p-2 bg-transparent" disabled={busy} value={style} onChange={e=>{setStyle(e.target.value);setExports([]);}}><option value="editorial">Фото на весь слайд</option><option value="classic">Фото сверху · текст снизу</option></select></label></details></section>;
}
