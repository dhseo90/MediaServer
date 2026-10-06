// 파일 용도: 묶음2의 실제 SigLIP2 HTTP 게시본·범위·권한·조건·기존 seek 연결 검사.
import fs from 'node:fs';import assert from 'node:assert/strict';
const [base,handoff,out]=process.argv.slice(2),accounts=JSON.parse(fs.readFileSync(handoff)).accounts,rows=[],cookies={};
const check=(id,value)=>{rows.push({id,pass:!!value});assert(value,id);};
const call=async(route,principal='admin',options={})=>fetch(base+route,{redirect:'manual',signal:AbortSignal.timeout(6000),...options,headers:{...(cookies[principal]?{Cookie:cookies[principal]}:{}),...options.headers}});
const read=async(id,route,principal='admin',expected=200)=>{
 const response=await call(route,principal);const text=await response.text();const body=JSON.parse(text);
 check(id+' HTTP',response.status===expected);check(id+' no-store',response.headers.get('cache-control')==='no-store');
 check(id+' redacted',!/passwordHash|tokenHash|modelDirectory|cacheDirectory|embedding|\/Users\/|\/private\/|models\//.test(text));rows.push({id,response:body});return body;
};
try{
 for(const a of accounts){const r=await call('/login','anonymous',{method:'POST',body:new URLSearchParams({username:a.username,password:a.password})});assert.equal(r.status,302);cookies[a.username]=r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');await r.arrayBuffer();}
 const path='/ops/api/recordings/visual-search',q={channelIds:'1',text:'A RED scene'};
 const search=(id,params={},principal='admin',code=200)=>read(id,path+'?'+new URLSearchParams({...q,...params}),principal,code);
 const status=await read('current publication',path+'/status');
 check('current publication metadata',status.index.channels.length===1&&status.index.channels[0].indexedFrames===8&&status.index.generation>=1&&status.index.publishedAtMs!==null&&status.refresh.attemptState==='succeeded');
 const normal=await search('normal');check('same view result size',normal.items.length===8&&normal.returnedItems===8&&normal.index.channels[0].indexedFrames===8&&normal.index.coverage==='unknown');
 check('identity scope and provenance',normal.index.instanceId===status.index.instanceId&&normal.index.identityScope==='worker-instance'&&normal.index.statisticsScope==='authorized-channels-all-indexed-samples-before-query-filters');
 const prior=JSON.parse(fs.readFileSync(new URL('./52-http.json',import.meta.url))).checks.find(r=>r.id==='english/default'&&r.response).response;
 check('preserved fixture rank score sequence',normal.items.length===prior.items.length&&normal.items.every((hit,i)=>Math.abs(hit.score-prior.items[i].score)<=1e-4));
 const top=await search('top two',{limit:'2'});check('top-k separate from publication denominator',top.items.length===2&&top.index.channels[0].indexedFrames===8&&top.items.every((h,i)=>h.id===normal.items[i].id&&h.score===normal.items[i].score));
 const timed=await search('empty time filter',{startTimeMs:'1000',endTimeMs:'2000'});check('empty not unavailable',timed.items.length===0&&timed.index.channels[0].indexedFrames===8&&timed.appliedQuery.startTimeMs===1000);
 for(const n of [63,64]){const result=await search('tokens '+n,{text:Array(n).fill('red').join(' ')},'admin',n===63?200:400);check('token limit '+n,n===63?result.appliedQuery.bodyTokens===63:result.error==='visual-text-token-limit');}
 await search('Korean',{text:'공원에서 공을 가지고 노는 사람'});
 for(const [principal,code] of [['s06-viewer',403],['s06-no-ops',403],['anonymous',401]])await read('status '+principal,path+'/status',principal,code);
 await search('forbidden mixed channels',{channelIds:'1,2'},'s06-operator',403);
 const empty=await read('no-source restricted status',path+'/status','s06-no-source');check('no source statistics exposed',empty.state==='restricted'&&empty.channels.length===0&&empty.index===null&&empty.refresh===null);
 const restricted=await read('operator statistics',path+'/status','s06-operator');check('authorized channel only',restricted.channels.every(c=>c.channelId==='1')&&restricted.index.channels.every(c=>c.channelId==='1'));
 const rquery={channelIds:'1',startTimeMs:'1789084800000',endTimeMs:'1789084810000',limit:'1',includeUnplaced:'true'};
 const structured=await read('structured','/ops/api/recordings/search?'+new URLSearchParams(rquery));check('structured effective scope',structured.searchBasis.snapshotId===structured.snapshotId&&structured.searchBasis.statisticsScope==='query-matches'&&structured.appliedQuery.limit===1&&structured.appliedQuery.includeUnplaced===true);
 if(structured.nextCursor){await read('cursor changed condition','/ops/api/recordings/search?'+new URLSearchParams({...rquery,limit:'2',cursor:structured.nextCursor}),'admin',403);}
 const hit=normal.items[0];const seek=await read('seek',path+'/seek?'+new URLSearchParams({channelId:'1',hitId:hit.id}));check('exact seek remains',seek.playable&&seek.seekAvailable&&seek.playbackUrl.startsWith('/ops/api/recordings/media/'));
 const media=await call(seek.playbackUrl,'admin',{headers:{Range:'bytes=0-127'}});await media.arrayBuffer();check('media read',media.status===206||media.status===200);
 fs.writeFileSync(out,JSON.stringify({status:'PASS',checks:rows},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks:rows.filter(r=>'pass'in r).length}));
}catch(error){fs.writeFileSync(out,JSON.stringify({status:'FAIL',error:error.message,checks:rows},null,2)+'\n');throw error;}
