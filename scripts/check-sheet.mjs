import {getAdminDb} from '../api/_firebaseAdmin.mjs';
process.loadEnvFile('.env.local');
const id='1XQnrDbPVT70edpvlSoK43MBjbbjl7rT-zdLFJ1LMPHc';
const docs=(await getAdminDb().collection('integrationSecrets').get()).docs.filter(d=>(d.data().scopes||[]).includes('sheets'));
if(docs.length!==1)throw Error('Cannot select a unique Sheets connection');
const ref=docs[0].ref;let s=docs[0].data();
if(!s.accessToken||s.expiresAt<Date.now()+60000){
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_OAUTH_CLIENT_ID,client_secret:process.env.GOOGLE_OAUTH_CLIENT_SECRET,refresh_token:s.refreshToken,grant_type:'refresh_token'})});
 const d=await r.json();if(!r.ok){console.log(JSON.stringify({stage:'refresh',status:r.status,error:d.error}));process.exit(1)}
 s={...s,accessToken:d.access_token,expiresAt:Date.now()+d.expires_in*1000};await ref.set(s,{merge:true});
}
async function read(url){const r=await fetch(url,{headers:{Authorization:`Bearer ${s.accessToken}`}});const d=await r.json();if(!r.ok){console.log(JSON.stringify({stage:'Sheets API',status:r.status,error:d.error?.message}));process.exit(1)}return d;}
const meta=await read(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties`);
const sh=meta.sheets.find(x=>x.properties.sheetId===722470818)?.properties;
if(!sh)throw Error('Requested sheet not found');
const range=`'${sh.title.replaceAll("'","''")}'!A1:H20`;
const data=await read(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`);
console.log(JSON.stringify({success:true,sheet:sh.title,range:data.range,rowsReturned:data.values?.length||0,nonEmptyCells:(data.values||[]).flat().filter(x=>x!=='').length}));process.exit();
