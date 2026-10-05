#!/usr/bin/env node
// 파일 용도: 기존 격리 UI fixture에서 V420 검색 control과 실제 응답·미디어 완료를 연결한다. 시각 검토 전 전체 PASS는 아니다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runVerifier,createUiAuthPasswords,uiLiveSource} from './verify_v410_recording_ui_contract.mjs';
import {resolvePlaywrightModule,resolveNativeBrowserExecutable,secretStrippedBrowserEnv} from './v390_ui_native_adapter.mjs';
import {prepareOutputDirectory,redactAcceptanceText} from './run_recording_ui_acceptance.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
// 동일 질의의 전체 페이지와 독립 timeline을 대조한다. 건수 증가만으로 신규 자료를 인정하지 않는다.
export function validateC03Unplaced({first,held,fresh,before,after,oldQuery,newQuery}) {
  const need=(ok,message)=>{if(!ok)throw Error(message);};
  need(JSON.stringify(oldQuery)===JSON.stringify(newQuery)&&oldQuery.includeUnplaced==='true','C03 identical unplaced query');
  need(before.total===0&&before.unplacedTotal===0,'C03 independent empty live channel');
  need(after.total===0&&after.unplacedTotal>0&&after.unplacedTotal===after.unplacedItems.length,'C03 complete independent unplaced timeline');
  const segments=new Set(after.unplacedItems.map(x=>x.segmentId));
  need(segments.size===after.unplacedTotal&&after.unplacedItems.every(x=>x.channelId==='3'&&x.catalogState==='finalized'&&x.completeness==='complete'&&x.startTimeMs===null&&x.endTimeMs===null&&x.members.length>0&&x.members.every(m=>m.mappingProvenance==='unknown')),'C03 independently finalized unknown media');
  const collect=(pages,head)=>{const items=pages.flatMap(p=>p.items);need(pages.length>0&&pages.at(-1).nextCursor===null&&pages.every(p=>p.snapshotId===head.snapshotId&&p.knownCount===head.knownCount&&p.unplacedCount===head.unplacedCount),'C03 complete stable pages');need(items.length===head.knownCount+head.unplacedCount&&new Set(items.map(x=>x.id)).size===items.length,'C03 exact unique page membership');return items;};
  const old=collect(held,first),current=collect(fresh,fresh[0]);
  need(old.every(x=>x.channelId!=='3'),'C03 no new channel members in held snapshot');
  const prior=new Set(old.map(x=>x.id)),added=current.filter(x=>!prior.has(x.id));
  need(added.length>0&&added.every(x=>x.channelId==='3'&&segments.has(x.segmentId)&&x.startTimeNs===null&&x.endTimeNs===null&&x.timeProvenance==='unknown'),'C03 new identities are independently unplaced');
  need([...segments].every(id=>added.some(x=>x.segmentId===id)),'C03 every new finalized segment represented');
  need(current.filter(x=>x.channelId!=='3').length===old.length&&old.every(x=>current.some(y=>y.id===x.id)),'C03 stationary seed membership preserved');
  return {newSegmentIds:[...segments],newResultIds:added.map(x=>x.id),oldKnown:first.knownCount,newKnown:fresh[0].knownCount,oldUnplaced:first.unplacedCount,newUnplaced:fresh[0].unplacedCount};
}
export async function runSearchUiAcceptance(){
const c03Observe=process.argv[3]==='--c03-observe';
if(process.argv.length>4||(process.argv[3]&&!c03Observe))throw Error('expected output directory [--c03-observe]');
const output=prepareOutputDirectory(process.argv[2]);
const plannedActions=['F03-object','F04-track','F05-event','V420-F06','V420-F07','V420-F08-I','V420-F08-L','V420-F08-D','V420-F08-O','F09-combined','F09-same-event','M02-missing','M02-unrelated','F10-invalid','F10-unknown','F01-channels','F02-time','C01-pages','C03-live-membership','P01-original','P02-derived','E02-current-fallback','P03-missing-current-file','P03-corrupt-current-file','U02-390-light','U02-390-dark','U02-1440-light','U02-1440-dark','U01-late-search','U01-late-seek','C02-restart','C02-expiry','L01-add-restart','A01-operator','A01-denied-2','A01-denied-5','A01-denied-null','M03-capacity'];
const results=plannedActions.map(id=>({id,status:'notRun'})),network=[],consoleRows=[],screenshots=[],trace=[],artifacts=[];let failure=null;
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const local=ms=>{const d=new Date(Number(ms));return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
await runVerifier('--ui-auth-direct',{uiArgs:['--ui-anchor-utc-ms',String(Math.floor(Date.now()/60000)*60000),'--ui-search-fixture'],uiDriver:async context=>{
  const accounts=[...context.accounts],secrets=accounts.map(a=>a.password),resolved=resolvePlaywrightModule();let browser,page,principal,active='setup',browserClosed=false;
  const artifact=file=>{assert(path.dirname(file)===output&&fs.realpathSync(file)===file&&fs.lstatSync(file).isFile(),'artifact containment');artifacts.push({path:path.basename(file),sha256:hash(file),bytes:fs.statSync(file).size,type:file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':'text/plain'});};
  const save=(name,value)=>{const file=path.join(output,name);fs.writeFileSync(file,redactAcceptanceText(JSON.stringify(value,null,2)+'\n',secrets),{flag:'wx',mode:0o600});artifact(file);};
  const abort=()=>{browser?.close().catch(()=>{});};context.signal.addEventListener('abort',abort,{once:true});
  const capture=async(name,selector='#opsSearchForm')=>{
    assert(!(await page.locator('input[type=password]').evaluateAll(nodes=>nodes.some(n=>n.value))),'password capture');
    if(selector)await page.locator(selector).evaluate(node=>node.scrollIntoView({block:'center'}));
    await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});screenshots.push({name:name+'.png',sha256:hash(path.join(output,name+'.png'))});artifact(path.join(output,name+'.png'));
  };
  // 긴 결과 목록은 배율을 줄이지 않고 겹치는 화면으로 보존한다.
  const captureRows=async name=>{
    const bounds=await page.locator('#opsSearchRows').evaluate(n=>{const r=n.getBoundingClientRect();return {top:r.top+scrollY,height:r.height};});
    const height=page.viewportSize().height;
    for(let offset=0,part=0;offset<bounds.height;offset+=height*0.7,part++){
      await page.evaluate(top=>window.scrollTo(0,top),Math.max(0,bounds.top+offset-80));
      await capture(name+'-rows-'+part,null);
    }
    await capture(name+'-pagination','#opsSearchNext');
  };
  const action=async(id,features,fn)=>{if(c03Observe&&id!=='C03-live-membership')return;assert(!context.signal.aborted,'UI run aborted');active=id;console.log('[search-ui-action] '+id+' begin');trace.push({id,phase:'begin',at:new Date().toISOString()});const row=results.find(r=>r.id===id);assert(row&&row.status==='notRun'&&!row.startedAt,'declared unique action');Object.assign(row,{features,role:principal,startedAt:new Date().toISOString()});
    try{row.observation=await fn();row.role=principal;row.viewport=page.viewportSize();row.theme=(await page.locator('html').getAttribute('data-theme'))||'light';await capture(id,await page.locator('#opsSearchForm').count()?'#opsSearchForm':null);row.status='pass';}catch(e){row.status='fail';row.reason=e.message;throw e;}finally{row.endedAt=new Date().toISOString();trace.push({id,phase:'end',at:row.endedAt,status:row.status,role:principal});console.log('[search-ui-action] '+id+' '+row.status);}};
  const login=async index=>{
    if(page)await page.context().close();
    const c=await browser.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'});page=await c.newPage();page.setDefaultTimeout(10000);
    page.on('response',r=>{const u=new URL(r.url());network.push({action:active,path:u.pathname,status:r.status(),method:r.request().method(),at:Date.now()});});
    page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleRows.push({action:active,type:m.type(),text:m.text(),route:(()=>{try{return new URL(m.location().url).pathname;}catch{return '';}})(),at:Date.now()});});
    page.on('pageerror',e=>consoleRows.push({action:active,type:'pageerror',text:e.message,at:Date.now()}));
    await page.addInitScript(()=>{
      window.searchMediaObservations=[];
      const record=(type,data)=>window.searchMediaObservations.push({type,at:performance.now(),...data});
      document.addEventListener('DOMContentLoaded',()=>{
        const status=document.querySelector('#opsSearchPlayback');if(status)new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)record('status',{text:n.textContent});}).observe(status,{childList:true});
        for(const type of ['loadedmetadata','seeking','seeked','error'])document.addEventListener(type,e=>{if(e.target.id==='opsSearchPlayer')record(type,{time:e.target.currentTime,seeking:e.target.seeking,readyState:e.target.readyState});},true);
      });
    });
    principal=index===null?{role:'anonymous'}:accounts[index];
    if(index!==null){await page.goto(context.baseUrl+'/login');await page.locator('input[name=username]').fill(principal.username);await page.locator('input[name=password]').fill(principal.password);
      await Promise.all([page.waitForURL(u=>u.pathname!=='/login'),page.locator('button[type=submit]').click()]);
      const who=await (await page.request.get(context.baseUrl+'/auth/whoami')).json();assert(who.authenticated&&who.role===principal.role,'principal binding');assert(!principal.scopes||JSON.stringify([...who.scopes].sort())===JSON.stringify([...principal.scopes].sort()),'principal scopes');principal={requestedRole:principal.role,requestedScopes:principal.scopes??['*'],role:who.role,scopes:who.scopes};}
  };
  const open=async()=>{await page.goto(context.baseUrl+'/ops/events',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#opsSearchChannels')?.options.length>0);
    await page.locator('#opsSearchStart').fill(local(context.seed.startTimeMs));await page.locator('#opsSearchEnd').fill(local(Number(context.seed.startTimeMs)+60000));await page.locator('#opsSearchChannels').selectOption('1');};
  const relogin=async()=>{
    const whoResponse=await page.request.get(context.baseUrl+'/auth/whoami');
    if(whoResponse.ok()){const who=await whoResponse.json();if(who.authenticated&&who.username===accounts[0].username&&who.role==='admin')return;}
    const p=await page.context().newPage();await p.goto(context.baseUrl+'/login');
    await p.locator('input[name=username]').fill(accounts[0].username);await p.locator('input[name=password]').fill(accounts[0].password);
    await Promise.all([p.waitForURL(u=>u.pathname!=='/login'),p.locator('button[type=submit]').click()]);await p.close();
  };
  const filters=async values=>{for(const n of ['Object','Track','Event','Zone','Rule','Behaviour'])await page.locator('#opsSearch'+n).fill(values[n]??'');};
  let lastSearchQuery=null;
  const search=async(expectedStatus=200,next=false)=>{
    const wait=page.waitForResponse(r=>new URL(r.url()).pathname==='/ops/api/recordings/search');
    const selector=next?'#opsSearchNext':'#opsSearchSubmit',control=page.locator(selector);assert(await control.isVisible()&&await control.isEnabled(),'search control visible/enabled');trace.push({action:active,selector,operation:'click',at:Date.now()});const [r]=await Promise.all([wait,control.click()]);const data=await r.json();lastSearchQuery=Object.fromEntries(new URL(r.url()).searchParams);save('response-'+trace.length+'.json',{status:r.status(),query:Object.fromEntries(new URL(r.url()).searchParams),normalizedQuery:{channels:(lastSearchQuery.channelIds??'').split(',').filter(Boolean).sort(),startTimeMs:Number(lastSearchQuery.startTimeMs),endTimeMs:Number(lastSearchQuery.endTimeMs),includeUnplaced:lastSearchQuery.includeUnplaced==='true',limit:Number(lastSearchQuery.limit),filters:Object.fromEntries(['object','track','event','zone','rule','behaviour'].map(k=>[k,(lastSearchQuery[k]??'').split(',').filter(Boolean).sort()]))},body:data});assert(!/passwordHash|passwordHistory|tokenHash|absolutePath|mediaRelpath|storeId|jobId/.test(JSON.stringify(data)),'public search redaction');if(r.status()!==expectedStatus)trace.push({action:active,kind:'unexpected-search-response',status:r.status(),body:data});assert(r.status()===expectedStatus,'search HTTP '+r.status()+' expected '+expectedStatus+' code '+String(data.error??'none'));
    await page.waitForFunction(()=>!document.querySelector('#opsSearchSubmit').disabled);
    if(expectedStatus!==200)trace.push({action:active,kind:'expected-search-error',status:r.status(),body:data});
    if(expectedStatus===200)assert(await page.locator('#opsSearchRows button[data-hit]').count()===data.items.length,'rendered count');else {assert(await page.locator('#opsSearchRows button').count()===0&&!data.snapshotId,'error must not publish snapshot');await capture(active+'-http-'+expectedStatus,'#opsSearchStatus');await capture(active+'-http-'+expectedStatus+'-player','#opsSearchPlayer');}
    return data;
  };
  const count=async(n)=>{const data=await search();assert(data.knownCount===n&&data.unplacedCount===0&&data.items.length===n,'independent fixture count '+n);await capture(active+'-count-'+n,'#opsSearchStatus');if(n>=6)await captureRows(active+'-count-'+n);return {known:data.knownCount,unknown:data.unplacedCount,ids:data.items.map(x=>x.id)};};
  const select=async(index,exact=true)=>{
    const before=await page.evaluate(()=>window.searchMediaObservations.length);
    const wait=page.waitForResponse(r=>new URL(r.url()).pathname==='/ops/api/recordings/search/seek');
    const control=page.locator('#opsSearchRows button[data-hit]').nth(index);assert(await control.isVisible()&&await control.isEnabled(),'hit control visible/enabled');trace.push({action:active,selector:'#opsSearchRows button[data-hit]',index,operation:'click',at:Date.now()});const [r]=await Promise.all([wait,control.click()]);const data=await r.json();assert(r.status()===200,'seek HTTP');
    await page.waitForFunction(()=>{const t=document.querySelector('#opsSearchPlayback').textContent;return !t.includes('확인하는 중')&&!t.includes('탐색 중');});
    await page.locator('#opsSearchPlayer').evaluate(v=>v.scrollIntoView({block:'center'}));
    if(data.playable){
      try{await page.waitForFunction(()=>{const v=document.querySelector('#opsSearchPlayer');return v.readyState>=2&&!v.seeking&&!v.error&&(v.getVideoPlaybackQuality?.().totalVideoFrames??0)>0;});}
      catch(e){save(active+'-frame-failure.json',await page.locator('#opsSearchPlayer').evaluate(v=>({time:v.currentTime,readyState:v.readyState,seeking:v.seeking,error:v.error?.code??null,frames:v.getVideoPlaybackQuality?.().totalVideoFrames??null,rect:v.getBoundingClientRect().toJSON()})));throw e;}
    }
    const state=await page.locator('#opsSearchPlayer').evaluate(v=>({time:v.currentTime,duration:v.duration,readyState:v.readyState,seeking:v.seeking,error:v.error?.code??null,src:v.getAttribute('src'),width:v.videoWidth,height:v.videoHeight,frames:v.getVideoPlaybackQuality?.().totalVideoFrames??null}));
    const message=await page.locator('#opsSearchPlayback').textContent();const events=await page.evaluate(n=>window.searchMediaObservations.slice(n),before);save(active+'-selection-'+trace.length+'.json',{status:r.status(),response:data,state,message,events});
    if(exact){assert(data.playable&&data.seekAvailable&&message.includes('검색 시점으로 이동했습니다'),'actual seek completion');assert(state.readyState>=2&&!state.seeking&&!state.error&&Math.abs(state.time-data.targetSeconds)<=data.frameDurationSeconds,'target frame-duration tolerance');
      if(data.targetSeconds>0){assert(events.some(e=>e.type==='status'&&e.text.includes('탐색 중'))&&events.some(e=>e.type==='seeked'),'pending and seeked observed');const done=events.findIndex(e=>e.type==='status'&&e.text.includes('이동했습니다'));assert(done>events.findIndex(e=>e.type==='seeked'),'completion follows seeked');}}
    await capture(active+'-player-'+index,'#opsSearchPlayer');return {response:data,state,message,events};
  };
  try{
    browser=await resolved.playwright.chromium.launch({headless:true,executablePath:resolveNativeBrowserExecutable(),env:secretStrippedBrowserEnv(),args:['--no-first-run']});
    await login(0);await open();
    await action('F03-object',['V420-F03'],async()=>{await filters({Object:'person'});const yes=await count(6);await filters({Object:'vehicle'});const no=await count(0);return {yes,no};});
    await action('F04-track',['V420-F04'],async()=>{await filters({Object:'person',Track:'track-7'});const yes=await count(4);await page.locator('#opsSearchTrack').fill('absent');const no=await count(0);await filters({Object:'track-collision',Track:'track-7'});const distinct=await count(2);assert(new Set(distinct.ids).size===2,'namespace epoch identity');await filters({Object:'epoch-collision',Track:'track-7'});await page.locator('#opsSearchUnplaced').check();const epoch=await search();assert(epoch.knownCount===0&&epoch.unplacedCount===2&&new Set(epoch.items.map(x=>x.id)).size===2,'unknown epoch identity');await capture('F04-epoch','#opsSearchStatus');await captureRows('F04-epoch');await page.locator('#opsSearchUnplaced').uncheck();return {yes,no,distinct,epoch};});
    await action('F05-event',['V420-F05'],async()=>{await filters({Object:'person',Event:'ui-release-event-0'});const yes=await count(1);await page.locator('#opsSearchEvent').fill('unrelated-event');return {yes,no:await count(0)};});
    for(const [name,feature] of [['Zone','V420-F06'],['Rule','V420-F07']])await action(feature,[feature],async()=>{await filters({Object:'person',[name]:name==='Zone'?'zone-a':'rule-a'});const yes=await count(2);await page.locator('#opsSearch'+name).fill('absent');return {yes,no:await count(0)};});
    for(const [i,b,id] of [[0,'event:Intrusion','V420-F08-I'],[1,'event:LineCrossing','V420-F08-L'],[2,'scenario:intrusion-dwell','V420-F08-D'],[3,'scenario:loitering','V420-F08-O']])await action(id,[id],async()=>{await filters({Object:'person',Event:'ui-release-event-'+i,Behaviour:b});const yes=await count(1);await page.locator('#opsSearchBehaviour').fill('scenario:Absent');return {yes,no:await count(0)};});
    await action('F09-combined',['V420-F09'],async()=>{await filters({Object:'person,vehicle',Track:'track-7',Zone:'zone-a,zone-b',Rule:'rule-a'});const match=await count(2);await page.locator('#opsSearchZone').fill('zone-b');return {match,contradiction:await count(0)};});
    await action('F09-same-event',['V420-F09','V420-F08-O'],async()=>{await filters({Object:'event-combination',Event:'ui-release-event-0',Behaviour:'scenario:loitering'});const different=await count(0);await page.locator('#opsSearchEvent').fill('ui-release-event-3');return {different,same:await count(1)};});
    await action('M02-missing',['V420-M02','V420-F08-I'],async()=>{await filters({Object:'person',Event:'ui-missing-event',Behaviour:'event:Intrusion'});const data=await search(503);const text=await page.locator('#opsSearchStatus').textContent();assert(data.error==='search-event-evidence-incomplete'&&text.includes('근거가 부족'),'incomplete guidance');return {data,text};});
    await action('M02-unrelated',['V420-M02'],async()=>{await filters({Object:'vehicle',Behaviour:'scenario:Absent'});const unrelated=await count(0);await filters({Object:'person',Track:'track-ui'});return {unrelated,withoutBehaviour:await count(2)};});
    await action('F10-invalid',['V420-F10'],async()=>{await filters({Behaviour:'invalid'});const data=await search(400);assert((await page.locator('#opsSearchStatus').textContent()).includes('올바르지'),'invalid guidance');return data;});
    await action('F10-unknown',['V420-F10','V420-P03'],async()=>{await filters({Object:'unknown-fixture'});const excluded=await count(0);await page.locator('#opsSearchUnplaced').check();const data=await search();assert(data.knownCount===0&&data.unplacedCount===1&&data.items[0].startTimeNs===null,'unknown separate count');const selection=await select(0,false);assert(!selection.response.playable&&!selection.response.seekAvailable&&selection.response.targetSeconds===null&&selection.message.includes('재생할 수 없습니다'),'unresolved unknown has no invented offset');return {excluded,data,selection};});
    await action('F01-channels',['V420-F01'],async()=>{await page.locator('#opsSearchUnplaced').uncheck();await filters({Object:'person'});await page.locator('#opsSearchChannels').selectOption(['1','2']);const union=await count(6);await page.locator('#opsSearchChannels').selectOption('2');const empty=await count(0);await page.locator('#opsSearchChannels').selectOption('1');return {union,empty};});
    await action('F02-time',['V420-F02'],async()=>{await page.locator('#opsSearchStart').fill(local(Number(context.seed.startTimeMs)+60000));await page.locator('#opsSearchEnd').fill(local(Number(context.seed.startTimeMs)+120000));const outside=await count(0);await page.locator('#opsSearchStart').fill(local(Number(context.seed.startTimeMs)+180000));await page.locator('#opsSearchSubmit').click();const text=await page.locator('#opsSearchStatus').textContent();assert(text.includes('올바른 시간'),'inverted client guidance');await capture('F02-inverted');await page.locator('#opsSearchStart').fill(local(context.seed.startTimeMs));await page.locator('#opsSearchEnd').fill(local(Number(context.seed.startTimeMs)+60000));return {outside,text};});
    await action('C01-pages',['V420-C01'],async()=>{await filters({Object:'paging'});await page.locator('#opsSearchLimit').selectOption('20');const first=await search();assert(first.knownCount===25&&first.items.length===20&&first.nextCursor,'25 independent paging rows');await capture('C01-first','#opsSearchStatus');await captureRows('C01-first');const second=await search(200,true);await capture('C01-second','#opsSearchStatus');await captureRows('C01-second');assert(second.snapshotId===first.snapshotId&&second.items.length===5&&!second.nextCursor&&new Set([...first.items,...second.items].map(x=>x.id)).size===25,'exact 20/5 membership');assert(JSON.stringify([...first.items,...second.items].map(x=>x.observationId).sort())===JSON.stringify(Array.from({length:25},(_,i)=>'ui-release-'+(i+4)).sort()),'independent paging observation identities');return {first,second};});
    await action('C03-live-membership',['V420-C03'],async()=>{
      await filters({});await page.locator('#opsSearchUnplaced').check();await page.locator('#opsSearchEnd').fill(local(Date.now()+180000));await page.locator('#opsSearchChannels').selectOption(['1','3']);await page.locator('#opsSearchLimit').selectOption('20');
      const channel=async()=>{const r=await page.request.get(context.baseUrl+'/ops/api/recordings/status');assert(r.ok(),'live recording status');const data=await r.json();const c=data.channels.find(x=>x.channelId==='3');assert(c,'owned live channel');return c;};
      const setRecording=async enabled=>{const r=await page.request.get(context.baseUrl+'/ops/api/sources');assert(r.ok(),'owned source registry');const d=await r.json(),matches=d.sources.filter(x=>x.sourceId==='3');assert(matches.length===1&&Number.isSafeInteger(matches[0].recording.revision),'owned source revision');
        const source=uiLiveSource('3','s06-channel-3.mp4');source.recording.enabled=enabled;source.recording.revision=matches[0].recording.revision+1;
        const saved=await page.request.put(context.baseUrl+'/ops/api/sources/3',{data:source});assert(saved.ok(),'owned recording setting');const body=await saved.json();assert(body.source.recording.enabled===enabled,'recording setting readback');return body.source.recording;};
      const timeline=async label=>{const query={channelId:'3',startTimeMs:String(new Date(await page.locator('#opsSearchStart').inputValue()).getTime()),endTimeMs:String(new Date(await page.locator('#opsSearchEnd').inputValue()).getTime()),limit:'1000',unplacedUnit:'file'};const r=await page.request.get(context.baseUrl+'/ops/api/recordings/timeline?'+new URLSearchParams(query));const body=await r.json();save('C03-timeline-'+label+'.json',{query,status:r.status(),body});assert(r.ok(),'independent timeline');return body;};
      const timelineBefore=await timeline('before');
      const before=await channel();save('C03-status-before.json',before);assert(!before.enabled&&!before.active,'normal filter fixture was stationary');
      const first=await search(),oldQuery={...lastSearchQuery},held=[first];assert(first.nextCursor,'held snapshot has later page');
      let enabled=false;
      try{
        await setRecording(true);enabled=true;let progressed=await channel();const deadline=Date.now()+65000;
        while(progressed.continuousBytes<=before.continuousBytes&&Date.now()<deadline){await page.waitForTimeout(1000);progressed=await channel();}
        assert(progressed.active&&progressed.continuousBytes>before.continuousBytes,'real recording finalized new bytes while snapshot held');
        const ids=new Set(first.items.map(x=>x.id));let next=first.nextCursor,pages=1;
        while(next){const data=await search(200,true);held.push(data);assert(data.snapshotId===first.snapshotId&&data.knownCount===first.knownCount&&data.unplacedCount===first.unplacedCount,'held snapshot counts');for(const item of data.items){assert(!ids.has(item.id),'held page duplicate');ids.add(item.id);}next=data.nextCursor;assert(++pages<20,'bounded held pagination');}
        assert(ids.size===first.knownCount+first.unplacedCount&&(await channel()).active,'fixed cursor membership while recorder active');await capture('C03-held-final','#opsSearchStatus');
        await setRecording(false);enabled=false;const stopped=await channel();save('C03-recording-states.json',{before,progressed,stopped});const timelineAfter=await timeline('stopped');assert(!stopped.enabled&&!stopped.active,'recorder stopped before fresh static search');
        const freshFirst=await search(),newQuery={...lastSearchQuery},fresh=[freshFirst];
        while(fresh.at(-1).nextCursor){fresh.push(await search(200,true));assert(fresh.length<20,'bounded fresh pagination');}
        save('C03-comparison.json',{first,held,fresh,timelineBefore,timelineAfter,oldQuery,newQuery});
        const comparison=validateC03Unplaced({first,held,fresh,before:timelineBefore,after:timelineAfter,oldQuery,newQuery});
        await capture('C03-new-search','#opsSearchStatus');await captureRows('C03-new-search');await page.locator('#opsSearchChannels').selectOption('1');await page.locator('#opsSearchUnplaced').uncheck();await page.locator('#opsSearchLimit').selectOption('200');
        return {...comparison,pages,before,progressed,stopped};
      }finally{if(enabled)await setRecording(false);}
    });
    if(c03Observe)return;
    await action('P01-original',['V420-P01','V420-U01','V420-K02'],async()=>{await filters({Object:'person',Track:'track-7'});const rows=await search();assert(rows.items[0].observationId==='ui-release-3'&&rows.items[1].observationId==='ui-release-2','independent descending source samples');const first=await select(0),second=await select(1);assert(Math.abs(first.response.targetSeconds-4)<=first.response.frameDurationSeconds&&Math.abs(second.response.targetSeconds-3)<=second.response.frameDurationSeconds,'fixture sample 120/90 at 30fps');assert(first.response.playbackUrl===second.response.playbackUrl&&first.response.targetSeconds!==second.response.targetSeconds,'same URL distinct targets');return {first,second};});
    await action('P02-derived',['V420-P02','V420-E01','V420-E02'],async()=>{await filters({Object:'event-search'});const data=await search();assert(data.items.length===2,'two original points');const eventIndex=data.items.findIndex(x=>x.selectionReason==='event-priority'),originalIndex=data.items.findIndex(x=>x.selectionReason!=='event-priority');assert(eventIndex>=0&&originalIndex>=0,'event covered point and outside original');assert(data.items[eventIndex].observationId==='ui-release-derived-0'&&data.items[originalIndex].observationId==='ui-release-derived-20','independent coverage points');const event=await select(eventIndex),original=await select(originalIndex,false);assert(event.response.targetSeconds===0,'derived first sample physical origin');assert(original.response.playable&&!original.response.seekAvailable&&original.response.reason==='seek-unavailable'&&original.message.includes('파일 시작부터 재생'),'unsupported 10fps original explicitly permits file start');return {data,event,original};});
    await action('E02-current-fallback',['V420-E02','V420-P03'],async()=>{
      await filters({Object:'event-search'});const data=await search(),index=data.items.findIndex(x=>x.selectionReason==='event-priority');assert(index>=0,'preferred fixture');
      const item=data.items[index],outputId=item.playbackUrl.split('/').at(-1),fileInfo=context.seed.jobs.flatMap(j=>j.outputs).find(f=>f.id===outputId);assert(fileInfo,'preferred file independent seed');
      const file=path.join(context.root,'recordings',fileInfo.relativePath),held=file+'.ui-held';assert(fs.realpathSync(file)===file&&!fs.existsSync(held),'owned preferred media');fs.renameSync(file,held);
      try{const fallback=await select(index,false);assert(fallback.response.playable&&fallback.response.playbackUrl==='/ops/api/recordings/media/'+item.segmentId,'current unavailable preferred output falls back to original');assert(!fallback.response.seekAvailable&&fallback.message.includes('파일 시작부터 재생'),'fallback retains unsupported original seek boundary');return {preferred:item.playbackUrl,fallback};}
      finally{assert(!fs.existsSync(file)&&fs.realpathSync(held)===held,'owned preferred restore');fs.renameSync(held,file);}
    });
    await action('P03-missing-current-file',['V420-P03','V420-L02','V420-K02'],async()=>{
      await filters({Object:'person',Track:'track-7'});const initial=await search();assert(initial.items.length===4,'current original candidates');
      const file=path.join(context.root,'recordings',context.seed.seek.relativePath),held=file+'.ui-held';
      assert(fs.realpathSync(file)===file&&!fs.existsSync(held),'owned exact media file');fs.renameSync(file,held);
      try{const unavailable=await select(0,false);assert(!unavailable.response.playable,'deleted current file denied');
        assert(unavailable.message.includes('재생할 수 없습니다')&&await page.locator('#opsSearchRows button[data-hit]').count()===4,'unavailable guidance and fixed membership');const fresh=await search();assert(fresh.knownCount===4&&fresh.items.every(i=>!i.playable),'new search reflects current missing media');return {initialSnapshot:initial.snapshotId,unavailable,fresh};
      }finally{assert(!fs.existsSync(file)&&fs.realpathSync(held)===held,'owned media restore');fs.renameSync(held,file);}
    });
    await action('P03-corrupt-current-file',['V420-P03','V420-L02'],async()=>{
      await filters({Object:'person',Track:'track-7'});await search();const file=path.join(context.root,'recordings',context.seed.seek.relativePath);
      assert(fs.realpathSync(file)===file&&hash(file)===context.seed.seek.sha256,'owned healthy original before corrupt fixture');
      const fd=fs.openSync(file,fs.constants.O_RDWR|fs.constants.O_NOFOLLOW),original=Buffer.alloc(1);fs.readSync(fd,original,0,1,0);
      try{fs.writeSync(fd,Buffer.from([original[0]^1]),0,1,0);fs.fsyncSync(fd);const unavailable=await select(0,false);assert(!unavailable.response.playable,'current corrupt file denied');const fresh=await search();assert(fresh.knownCount===4&&fresh.items.every(i=>!i.playable),'new search reflects current corrupt media');return {unavailable,fresh};}
      finally{fs.writeSync(fd,original,0,1,0);fs.fsyncSync(fd);fs.closeSync(fd);assert(hash(file)===context.seed.seek.sha256,'original bytes restored');}
    });
    for(const width of [390,1440])for(const theme of ['light','dark'])await action('U02-'+width+'-'+theme,['V420-U02'],async()=>{await page.setViewportSize({width,height:1000});const current=await page.locator('html').getAttribute('data-theme');if((current==='dark'?'dark':'light')!==theme)await page.locator('#themeToggleBtn').click();await filters({Object:'person',Track:'track-7'});await search();await select(0);await capture('U02-'+width+'-'+theme+'-form-top','#opsSearchChannels');await capture('U02-'+width+'-'+theme+'-form-bottom','#opsSearchSubmit');const geometry=await page.locator('#opsSearchForm input,#opsSearchForm select,#opsSearchForm button,#opsSearchPlayer').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.id,left:r.left,right:r.right,width:r.width,label:n.labels?.[0]?.textContent?.trim()||n.getAttribute('aria-label')||n.textContent?.trim()||'',focusable:n.tabIndex>=0};}));assert(geometry.every(r=>r.width>0&&r.left>=0&&r.right<=width+1),'search controls horizontal containment');assert(geometry.filter(r=>r.id!=='opsSearchPlayer').every(r=>r.label&&r.focusable),'labeled keyboard controls');await page.locator('#opsSearchSubmit').focus();await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({id:document.activeElement.id,tag:document.activeElement.tagName}));assert(focus.tag==='BUTTON','keyboard reaches result action');await capture('U02-'+width+'-'+theme+'-focus',null);return {width,theme,geometry,focus};});
    await page.setViewportSize({width:1440,height:1000});
    await action('U01-late-search',['V420-U01'],async()=>{
      await filters({Object:'person',Track:'track-7'});let release,started;const ready=new Promise(r=>{started=r;}),gate=new Promise(r=>{release=r;});let intercepted=false;
      const pattern='**/ops/api/recordings/search?*';
      await page.route(pattern,async route=>{if(!intercepted){intercepted=true;started();await gate;}await route.continue();});
      try{await page.locator('#opsSearchSubmit').click();await ready;await filters({Object:'vehicle'});const fresh=await search();assert(fresh.items.length===0,'replacement search empty');
        const late=page.waitForResponse(r=>new URL(r.url()).pathname==='/ops/api/recordings/search'&&new URL(r.url()).searchParams.get('object')==='person');release();await (await late).finished();
        assert(await page.locator('#opsSearchRows button').count()===0&&(await page.locator('#opsSearchStatus').textContent()).includes('일치하는 결과가 없습니다'),'late result ignored');await capture('U01-late-search-player','#opsSearchPlayer');return {freshCount:0,lateResponseObserved:true};
      }finally{release();await page.unroute(pattern);}
    });
    await action('U01-late-seek',['V420-U01'],async()=>{
      await filters({Object:'person',Track:'track-7'});const data=await search();let release,started;const ready=new Promise(r=>{started=r;}),gate=new Promise(r=>{release=r;});let intercepted=false;
      const pattern='**/ops/api/recordings/search/seek?*';await page.route(pattern,async route=>{if(!intercepted){intercepted=true;started();await gate;}await route.continue();});
      try{await page.locator('#opsSearchRows button[data-hit]').nth(0).click();await ready;const current=await select(1);
        const late=page.waitForResponse(r=>new URL(r.url()).pathname==='/ops/api/recordings/search/seek'&&new URL(r.url()).searchParams.get('hitId')===data.items[0].id);release();await (await late).finished();
        assert(await page.locator('#opsSearchRows button[data-hit]').nth(1).getAttribute('aria-pressed')==='true','late selection ignored');
        const time=await page.locator('#opsSearchPlayer').evaluate(v=>v.currentTime);assert(Math.abs(time-current.response.targetSeconds)<=current.response.frameDurationSeconds,'late seek cannot replace current');return {current,time,lateResponseObserved:true};
      }finally{release();await page.unroute(pattern);}
    });
    await action('C02-restart',['V420-C02'],async()=>{await filters({Object:'paging'});await page.locator('#opsSearchLimit').selectOption('20');const initial=await search();assert(initial.nextCursor,'restart cursor fixture');await select(0);
      const lifecycle=await context.mutateSearchFixture('restart');await relogin();const response=await search(400,true);
      const text=await page.locator('#opsSearchStatus').textContent(),state=await page.locator('#opsSearchPlayer').evaluate(v=>({src:v.getAttribute('src'),paused:v.paused}));
      save('C02-restart-rejection.json',{initial,lifecycle,response,text,state,principal});
      assert(response.error==='search-invalid-cursor'&&['snapshotId','items','knownCount','unplacedCount'].every(k=>!(k in response)),'restart MAC rejection without result');
      assert(text==='검색 조건이 올바르지 않습니다.'&&!state.src&&state.paused&&await page.locator('#opsSearchRows button').count()===0,'restart error clears stale results and playback');
      const fresh=await search();assert(fresh.knownCount===25&&fresh.nextCursor,'same principal new search');const resumed=await search(200,true);
      assert(resumed.snapshotId===fresh.snapshotId&&resumed.items.length===5&&!resumed.nextCursor,'new pool cursor works');return {initialSnapshot:initial.snapshotId,lifecycle,response,text,state,fresh,resumed};});
    await action('C02-expiry',['V420-C02'],async()=>{await filters({Object:'paging'});const initial=await search();assert(initial.nextCursor,'expiry cursor fixture');const begin=Date.now();
      await page.waitForTimeout(300100);const response=await search(410,true);assert(response.error==='search-snapshot-expired'&&Date.now()-begin>=300000,'same pool real TTL expiry');return {elapsedMs:Date.now()-begin,response,text:await page.locator('#opsSearchStatus').textContent()};});
    await action('L01-add-restart',['V420-L01','V420-L02','V420-C02'],async()=>{await filters({Object:'added'});const before=await count(0);const lifecycle=await context.mutateSearchFixture('add');await relogin();await open();await filters({Object:'added'});return {before,lifecycle,after:await count(1)};});
    await action('A01-operator',['V420-A01','V420-A02'],async()=>{await login(1);await open();await filters({Object:'person'});const allowed=await count(6);const options=await page.locator('#opsSearchChannels option').evaluateAll(nodes=>nodes.map(x=>x.value));assert(JSON.stringify(options)==='["1"]','operator channel non-disclosure');return {allowed,options,principal};});
    await login(0);await open();
    const integratorPassword=createUiAuthPasswords()[0];secrets.push(integratorPassword);
    const user=await page.request.post(context.baseUrl+'/ops/api/users',{data:{username:'v420-ui-integrator',displayName:'UI integrator',role:'integrator',scopes:['event:read:1','metadata:read:1'],password:integratorPassword,enabled:true,mustChangePassword:false}});
    assert(user.ok(),'integrator fixture creation');accounts.push({username:'v420-ui-integrator',password:integratorPassword,role:'integrator',scopes:['event:read:1','metadata:read:1']});
    for(const index of [2,5,null])await action('A01-denied-'+String(index),['V420-A01','V420-A02'],async()=>{await login(index);
      const r=await page.goto(context.baseUrl+'/ops/events',{waitUntil:'networkidle'});const route=new URL(page.url()).pathname;
      assert(index===null?route==='/login':r.status()===403,'actual route authorization');assert(await page.locator('#opsSearchForm').count()===0,'forbidden search control absent');
      const text=await page.locator('body').innerText();assert(!/mediaRelpath|passwordHash|tokenHash|rtsp:\/\//.test(text),'denied visible redaction');return {principal,status:r.status(),route};});
    await action('M03-capacity',['V420-M03'],async()=>{await login(0);await open();const lifecycle=await context.mutateSearchFixture('capacity');await relogin();await open();await filters({Object:'capacity'});const data=await search(503);assert(data.error==='search-capacity-exceeded','actual model admission');return {lifecycle,data,text:await page.locator('#opsSearchStatus').textContent()};});
    const expected={ 'M02-missing':[503], 'F10-invalid':[400], 'C02-restart':[400], 'C02-expiry':[410], 'M03-capacity':[503], 'A01-operator':[403], 'A01-denied-2':[403], 'A01-denied-5':[403] };
    const assessment=consoleRows.map(row=>{const match=/^Failed to load resource: the server responded with a status of (\d+) \([^)]+\)$/.exec(row.text),status=Number(match?.[1]);
      const routes=row.action==='A01-operator'?['/ops/api/users']:row.action==='A01-denied-5'?['/ops/home','/ops/events']:row.action==='A01-denied-2'?['/ops/events']:['/ops/api/recordings/search'];
      const expectedStatus=(expected[row.action]||[]).includes(status)&&routes.includes(row.route);
      const codes={'C02-restart':'search-invalid-cursor','C02-expiry':'search-snapshot-expired','F10-invalid':'invalid-recording-search-query','M02-missing':'search-event-evidence-incomplete','M03-capacity':'search-capacity-exceeded'};
      const exactError=row.route!=='/ops/api/recordings/search'||trace.some(t=>t.action===row.action&&t.kind==='expected-search-error'&&t.status===status&&t.body.error===codes[row.action]);
      const approved=row.type==='error'&&expectedStatus&&exactError&&network.some(n=>n.action===row.action&&n.status===status&&n.path===row.route);
      return {...row,approved};});save('console-assessment.json',assessment);assert(assessment.every(r=>r.approved),'unapproved browser console failure');assert(results.every(r=>r.status==='pass'),'planned actions not completed');
  }catch(e){failure=redactAcceptanceText(e.message,secrets);}
  finally{
    context.signal.removeEventListener('abort',abort);if(browser){await browser.close();browserClosed=true;}
    save('results.json',{results,pass:results.filter(r=>r.status==='pass').length,fail:results.filter(r=>r.status==='fail').length,notRun:results.filter(r=>r.status==='notRun').length,failure,browserClosed,c03Observe,uiFulltestPass:false,visualReviewRequired:true});save('seed-oracle.json',context.seed);save('trace.json',trace);save('network.json',network);save('console.json',consoleRows);save('screenshots.json',screenshots);
    save('provenance.json',{head:spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).stdout.trim(),patchSha256:crypto.createHash('sha256').update(spawnSync('git',['diff','HEAD','--binary'],{cwd:repo,maxBuffer:16*1024*1024}).stdout).digest('hex'),productSha256:hash(path.join(repo,'build-gst-onnx/media_server')),runnerSha256:hash(fileURLToPath(import.meta.url)),fingerprints:Object.fromEntries(['scripts/internal/recording_current_ui_seed.cpp','scripts/internal/verify_recording_current_ui_seed.sh','scripts/internal/verify_v410_recording_ui_contract.mjs','test/fixtures/ui_fulltest_evidence_policy_v4.json'].map(f=>[f,hash(path.join(repo,f))])),evidenceMode:'qualified-native-automation',fallback:'native Chrome with visual review; no in-app renderer',reproductionCommand:'node scripts/internal/run_recording_search_ui_acceptance.mjs <new-owned-output-directory>',actionManifestSha256:crypto.createHash('sha256').update(JSON.stringify(plannedActions)).digest('hex'),manualIntervention:false,browserVersion:browser?.version(),moduleVersion:resolved.moduleVersion,policySha256:hash(path.join(repo,'docs/manual-ui-fulltest.md'))});
    fs.writeFileSync(path.join(output,'server-log.txt'),redactAcceptanceText(fs.readFileSync(context.serverLogPath,'utf8'),secrets),{flag:'wx',mode:0o600});artifact(path.join(output,'server-log.txt'));save('artifacts.json',[...artifacts]);
  }
  if(failure)throw Error(failure);
}}).catch(e=>{console.error('search UI run failed; inspect private evidence: '+e.message);process.exitCode=1;});

}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await runSearchUiAcceptance();
