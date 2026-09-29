import {createHmac,timingSafeEqual} from 'node:crypto';
import {enforceRateLimit,requireFirebaseUser} from '../../api/_firebaseAdmin.mjs';
const endpoint='https://polza.ai/api/v1/media';
const sign=(id,uid,key)=>createHmac('sha256',key).update(`${uid}:${id}`).digest('hex');
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 try{
 const user=await requireFirebaseUser(req),key=process.env.POLZA_API_KEY;
 enforceRateLimit({key:`images:${user.uid}:${req.body?.action==='status'?'status':'create'}`,limit:req.body?.action==='status'?120:12,windowMs:10*60*1000});
 if(!key)return res.status(503).json({error:'Генерация изображений не настроена'});
 const body=req.body||{};let response;
 if(body.action==='status'){
  if(!/^[a-zA-Z0-9_-]{1,150}$/.test(body.id||''))return res.status(400).json({error:'Некорректный запрос'});
  const expected=sign(body.id,user.uid,key),provided=String(body.ticket||'');
  if(provided.length!==expected.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return res.status(403).json({error:'Нет доступа к генерации'});
  response=await fetch(`${endpoint}/${body.id}`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(30000)});
 }else{
  const prompt=String(body.prompt||'').trim();if(!prompt||prompt.length>12000)return res.status(400).json({error:'Описание должно содержать от 1 до 12000 символов'});
  const ratio={'1024x1536':'2:3','1536x1024':'3:2','1024x1792':'9:16','1792x1024':'16:9'}[body.size]||'1:1';
  response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.POLZA_IMAGE_MODEL||'google/gemini-2.5-flash-image',input:{prompt,aspect_ratio:ratio},async:true}),signal:AbortSignal.timeout(60000)});
 }
 const data=await response.json();
 if(!response.ok||['failed','error','cancelled'].includes(data.status))return res.status(502).json({error:'Провайдер не смог создать изображение. Попробуйте позже.'});
 const picture=data.data?.[0];
 if(picture?.url)return res.status(200).json({status:'completed',image:{url:picture.url},model:data.model,usage:data.usage});
 const id=body.action==='status'?body.id:data.id;
 if(!id)return res.status(502).json({error:'Провайдер не вернул изображение или номер генерации'});
 return res.status(202).json({status:'processing',id,ticket:sign(id,user.uid,key)});
 }catch(e){return res.status(e.statusCode||502).json({error:e.statusCode?e.message:'Не удалось связаться с генератором изображений'});}
}
