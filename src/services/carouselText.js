export function normalizeCarouselText(data,count){
 const items=Array.isArray(data?.slides)?data.slides:[];
 if(items.length!==count)throw new Error(`AI подготовил ${items.length} слайдов вместо ${count}. Повторите запрос.`);
 return items.map(item=>{
  const value=typeof item==='string'?{text:item}:item||{};
  const text=value.text||value.title||value.heading||'';
  if(typeof text!=='string'||!text.trim())throw new Error('AI не подготовил заголовок слайда');
  return {text:text.trim().slice(0,240),accent:typeof value.accent==='string'?value.accent.slice(0,65):'',subtitle:typeof value.subtitle==='string'?value.subtitle.slice(0,110):''};
 });
}
