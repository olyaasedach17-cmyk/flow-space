import {authFetch} from './integrationService';
export async function generateAIImage({prompt,size='1024x1024'}){
 const request=body=>authFetch('/api/images',{method:'POST',body:JSON.stringify(body)});
 let result=await request({prompt,size});
 const until=Date.now()+240000;
 while(result.status!=='completed'&&result.id&&Date.now()<until){
  await new Promise(resolve=>setTimeout(resolve,3000));
  result=await request({action:'status',id:result.id,ticket:result.ticket});
 }
 if(result.status!=='completed')throw new Error('Изображение ещё обрабатывается. Не запускайте повторно сразу: предыдущая генерация могла быть оплачена.');
 return result;
}
