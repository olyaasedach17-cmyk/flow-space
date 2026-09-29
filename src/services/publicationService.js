import {callServerAI,safeParseAIJSON} from './aiService';
export async function writePublication({action,mode,context,topic,brief,post,instruction}){
 const facts=mode==='personal'?{}:context||{};
 const task=action==='ideas'?'Предложи ровно 3 конкретные темы. JSON {"ideas":["...","...","..."]}.':action==='revise'?'Отредактируй исходный пост по пожеланию. Верни только полный текст поста.':'Напиши готовый русский пост. Верни только текст поста.';
 const result=await callServerAI({messages:[{role:'system',content:`Ты редактор публикаций. ${task} Не выдумывай биографию, события, услуги, кейсы, цифры и скидки. Личный режим: не добавляй бизнес, продажи или услуги; предлагай вопросы для размышления, не вымышленные воспоминания. Рабочий режим: учитывай только предоставленные сведения. Сохраняй факты исходного текста.`},{role:'user',content:JSON.stringify({mode,context:facts,topic,brief,post,instruction})}],temperature:.35});
 const text=result.choices?.[0]?.message?.content?.trim();if(!text)throw new Error('AI вернул пустой ответ');
 if(action==='ideas'){const data=safeParseAIJSON(text);if(!Array.isArray(data.ideas)||!data.ideas.length)throw new Error('Не удалось получить темы');return data.ideas.filter(x=>typeof x==='string').slice(0,3);}
 return text;
}
let database;
function open(){if(!database)database=new Promise((resolve,reject)=>{const r=indexedDB.open('flow-publications',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();database=undefined;};resolve(r.result);};r.onerror=()=>{database=undefined;reject(r.error);};});return database;}
export async function loadPublication(key){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction('drafts').objectStore('drafts').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function savePublication(key,value){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}

export async function listPublications(scope){
 const db=await open();const prefix=`${scope}:history:`;
 return new Promise((resolve,reject)=>{const items=[];const tx=db.transaction('drafts');const r=tx.objectStore('drafts').openCursor();r.onsuccess=()=>{const cursor=r.result;if(!cursor)return; if(String(cursor.key).startsWith(prefix)){const value=cursor.value;items.push({key:cursor.key,title:(value.post||value.topic||'Без названия').slice(0,90),savedAt:value.savedAt});}cursor.continue();};tx.oncomplete=()=>resolve(items.sort((a,b)=>b.savedAt-a.savedAt));tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
function samePublication(a,b){
 const fields=['mode','brief','topic','post','slides','carousel','sourcePost','style','exports'];
 return fields.every(field=>JSON.stringify(a?.[field])===JSON.stringify(b?.[field]));
}
export async function switchPublication(scope,current,next,sourceKey){
 const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');const store=tx.objectStore('drafts');if(sourceKey)store.delete(sourceKey);if((current.post||current.topic||current.slides?.length)&&!samePublication(current,next)){const savedAt=Date.now();store.put({...current,savedAt},`${scope}:history:${savedAt}:${Math.random().toString(36).slice(2)}`);}store.put(next,scope);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
