// 파일 용도: 52번 활성 SigLIP2 HTTP의 제한된 입력·적용값·권한 직접 검사.
import fs from 'node:fs';import assert from 'node:assert/strict';
const [base,handoff,out]=process.argv.slice(2),accounts=JSON.parse(fs.readFileSync(handoff)).accounts,rows=[];
let current='login';
const check=(id,value)=>{rows.push({id,pass:!!value});assert(value,id);};
const call=async(route,cookie,options={})=>fetch(base+route,{redirect:'manual',signal:AbortSignal.timeout(6000),...options,headers:{...(cookie?{Cookie:cookie}:{}),...options.headers}});
try{
 const cookies={};
 for(const a of accounts){const r=await call('/login',null,{method:'POST',body:new URLSearchParams({username:a.username,password:a.password})});check(a.username+' login',r.status===302);cookies[a.username]=r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');await r.arrayBuffer();}
 const path='/ops/api/recordings/visual-search',defaultQuery={channelIds:'1',text:'A RED scene'};
 const query=async(id,q={},principal='admin',expected=200)=>{
   current=id;const r=await call(path+'?'+new URLSearchParams({...defaultQuery,...q}),cookies[principal]);const text=await r.text();let body=JSON.parse(text);
   check(id+' status',r.status===expected);check(id+' no-store',r.headers.get('cache-control')==='no-store');
   check(id+' sanitized',!/passwordHash|tokenHash|modelDirectory|cacheDirectory|embedding|\/Users\/|\/private\/|models\//.test(text));
   if(expected!==200)check(id+' error only',Object.keys(body).length===1&&typeof body.error==='string');
   rows.push({id,response:body});return body;
 };
 const normal=await query('english/default');
 check('effective defaults',normal.appliedQuery.text==='A RED scene'&&normal.appliedQuery.encoderText==='a red scene'&&normal.appliedQuery.limit===20&&normal.appliedQuery.threshold===-1&&normal.appliedQuery.startTimeMs===null&&normal.appliedQuery.endTimeMs===null&&normal.appliedQuery.channelIds.join(',')==='1'&&normal.items.length===8);
 await query('korean',{text:'공원에서 공을 가지고 노는 사람'});
 const filtered=await query('explicit filters',{text:'어제 3번 카메라의 공원',startTimeMs:'1000',endTimeMs:'2000',limit:'10',threshold:'.25'});
 check('explicit parsed filters',filtered.appliedQuery.startTimeMs===1000&&filtered.appliedQuery.endTimeMs===2000&&filtered.appliedQuery.limit===10&&filtered.appliedQuery.threshold===.25&&filtered.appliedQuery.channelIds.join(',')==='1'&&filtered.appliedQuery.text==='어제 3번 카메라의 공원');
 for(const n of [62,63,64]){const r=await query('body-'+n,{text:Array(n).fill('red').join(' ')},'admin',n<=63?200:400);check('body-'+n+' exact',n<=63?r.appliedQuery.bodyTokens===n:r.error==='visual-text-token-limit');}
 for(const text of ['', '　 \t']){const r=await query('empty-'+text.length,{text},'admin',400);check('empty exact error',r.error==='visual-text-empty');}
 const dense=await query('dense-24-codepoints',{text:'㐀'.repeat(24)},'admin',400);check('dense uses tokens',dense.error==='visual-text-token-limit');
 current='invalid-utf8';const utf=await call(path+'?channelIds=1&text=%FF',cookies.admin);const ub=await utf.json();check('UTF8 distinct',utf.status===400&&ub.error==='visual-text-invalid-utf8');
 for(const [p,c] of [['s06-viewer',403],['s06-no-source',403],['s06-no-ops',403],['anonymous',401]])await query(p,{},p,c);
 await query('forbidden mixed',{channelIds:'1,2'},'s06-operator',403);
 await query('operator authorized',{},'s06-operator');
 await query('error recovery',{text:'red scene'});
 current='seek';const hit=normal.items[0];const seek=await call(path+'/seek?'+new URLSearchParams({channelId:'1',hitId:hit.id}),cookies.admin);const sb=await seek.json();check('seek real reference',seek.status===200&&sb.playable&&sb.seekAvailable&&sb.playbackUrl.startsWith('/ops/api/recordings/media/'));
 const media=await call(sb.playbackUrl,cookies.admin,{headers:{Range:'bytes=0-127'}});await media.arrayBuffer();check('media bytes',media.status===206||media.status===200);
 console.log(JSON.stringify({status:'PASS',checks:rows.filter(x=>'pass'in x).length}));
 fs.writeFileSync(out,JSON.stringify({status:'PASS',checks:rows},null,2)+'\n');
}catch(e){fs.writeFileSync(out,JSON.stringify({status:'FAIL',stage:current,error:e.message,checks:rows},null,2)+'\n');throw e;}
