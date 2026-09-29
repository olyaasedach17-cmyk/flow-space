// Shared server-side Polza transport. Never import from the frontend.
export async function requestAI({messages,temperature=0.35,max_tokens=3000}) {
 if(!process.env.POLZA_API_KEY)throw Object.assign(new Error('Polza AI не настроен на сервере'),{statusCode:503});
 const response=await fetch('https://polza.ai/api/v1/chat/completions',{
 method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.POLZA_API_KEY}`},
 body:JSON.stringify({model:process.env.AI_MODEL||'gpt-4o-mini',messages,temperature,max_tokens}),signal:AbortSignal.timeout(60000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Object.assign(new Error(data.error?.message||'AI временно недоступен'),{statusCode:502});
 if(!data.choices?.[0]?.message?.content)throw Object.assign(new Error('AI вернул пустой ответ'),{statusCode:502});
 return data;
}
