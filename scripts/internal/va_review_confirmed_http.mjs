#!/usr/bin/env node
// 파일 용도: V450-A01 실제 제품 HTTP/Auth/worker/재시작의 격리 단기 검사.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import dgram from 'node:dgram';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bootstrapRecordingUiAuth,createUiAuthPasswords,reservePort,stopServer,assertPortClosed}
  from './verify_v410_recording_ui_contract.mjs';
import {resolvePlaywrightModule,resolveNativeBrowserExecutable} from './v390_ui_native_adapter.mjs';

const materialMode=process.env.MEDIA_SERVER_VA_MATERIAL_CHECKS==='1';
const phase=materialMode?'46':process.env.MEDIA_SERVER_VA_VALIDATION_PHASE==='56'?'56':'42';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'media-server-a-review-http-'));
fs.chmodSync(root,0o700);const identity=fs.statSync(root);const started=Date.now();
const report={featureId:materialMode?'V450-A03/U03':'V450-A02/U02',command:'python3 scripts/internal/verify_va_review_confirmed.py '+(materialMode?'--materials-http':'--http'),startedAtMs:started,
  sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
  actualUiPass:false,actualModel:false,checks:[],cleanup:{},status:'RUNNING',root,
  rootIdentity:{dev:identity.dev,ino:identity.ino,uid:identity.uid}};
let browser,page,child,provider,udp,httpPort,rtspPort,providerPort,timer,expired=false,failed=false,admin;
let delay=false,chatCalls=0,blockedRequests=0,providerError=false,diagnostics='';const pending=new Set(),secrets=[];
const assert=(ok,id)=>{if(!ok)throw Error(id);};
const check=(ok,id)=>{report.checks.push({id,status:ok?'PASS':'FAIL'});assert(ok,id);};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const binary=path.join(repo,'build-gst-onnx/media_server');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
try{
  for(const name of ['data','input','events','recordings','tmp','gst-cache','cache'])fs.mkdirSync(path.join(root,name),{mode:0o700});
  fs.copyFileSync(path.join(repo,'video/sample_h264_video_only.mp4'),path.join(root,'input/sample.mp4'));
  fs.copyFileSync(path.join(repo,'video/sample_h264_video_only.mp4'),path.join(root,'input/second.mp4'));
  fs.writeFileSync(path.join(root,'data/sources.json'),JSON.stringify({sources:['1','2'].map(sourceId=>({sourceId,
    displayName:'fixture '+sourceId,kind:'file',file:sourceId==='1'?'sample.mp4':'second.mp4',enabled:false,recording:{enabled:false}}))}),{mode:0o600});
  fs.writeFileSync(path.join(root,'data/views.json'),'{"views":[]}',{mode:0o600});
  const seed=spawnSync(process.env.MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN,[path.join(root,'recordings'),'--confirmed-seed','unused'],{encoding:'utf8',timeout:10000});
  assert(seed.status===0,'seed');const seedInfo=JSON.parse(fs.readFileSync(path.join(root,'recordings/confirmed-seed.json'),'utf8')); const packages=[seedInfo.packageId,seedInfo.missingId];
  report.binarySha256=hash(binary);report.fixtureSha256=hash(process.env.MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN);
  provider=http.createServer((req,res)=>{++chatCalls;res.writeHead(503);res.end('{}');});
  await new Promise((resolve,reject)=>{provider.once('error',reject);provider.listen(0,'127.0.0.1',resolve);});providerPort=provider.address().port;
  httpPort=await reservePort();rtspPort=await reservePort();assert(httpPort!==rtspPort,'distinct ports');
  udp=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});
  report.ports={http:httpPort,rtsp:rtspPort,provider:providerPort,udp:udp.address().port};
  const base=`http://127.0.0.1:${httpPort}`;
  const env={PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C',LC_ALL:'C',TMPDIR:path.join(root,'tmp'),XDG_CACHE_HOME:path.join(root,'cache'),
    MEDIA_SERVER_SKIP_LOCAL_ENV:'1',MEDIA_SERVER_SKIP_BUILD:'1',MEDIA_SERVER_SKIP_ENV_CHECK:'1',MEDIA_SERVER_BIN_PATH:binary,
    MEDIA_SERVER_BUILD_DIR:path.dirname(binary),MEDIA_SERVER_AUTH_MODE:'auto',MEDIA_SERVER_ENABLE_OPS:'1',MEDIA_SERVER_ENABLE_CLIENT:'1',
    MEDIA_SERVER_ENABLE_LAB:'0',MEDIA_SERVER_ENABLE_AI:'1',MEDIA_SERVER_LISTEN_ADDRESS:'127.0.0.1',MEDIA_SERVER_HTTP_LISTEN_ADDRESS:'127.0.0.1',
    MEDIA_SERVER_LISTEN_PORT:String(rtspPort),MEDIA_SERVER_HTTP_LISTEN_PORT:String(httpPort),MEDIA_SERVER_FORCE_RTSP_TCP:'1',
    MEDIA_SERVER_FILE_ROOT:path.join(root,'input'),MEDIA_SERVER_DEFAULT_FILE:path.join(root,'input/sample.mp4'),
    MEDIA_SERVER_STATE_DIR:path.join(root,'data'),MEDIA_SERVER_AUTH_USERS_FILE:path.join(root,'data/users.json'),
    MEDIA_SERVER_SOURCE_REGISTRY:path.join(root,'data/sources.json'),MEDIA_SERVER_PUBLISHED_VIEWS:path.join(root,'data/views.json'),
    MEDIA_SERVER_ANALYSIS_REGISTRY:path.join(root,'data/analysis.json'),MEDIA_SERVER_RECORDING_ENABLED:'1',
    MEDIA_SERVER_RECORDING_STORAGE_ROOT:path.join(root,'recordings'),MEDIA_SERVER_EVIDENCE_ENABLED:'1',MEDIA_SERVER_VISUAL_SEARCH_ENABLED:'0',
    MEDIA_SERVER_VA_REVIEW_ENABLED:'1',MEDIA_SERVER_VA_REVIEW_LOCAL_ENDPOINT:`http://127.0.0.1:${providerPort}`,
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),
    MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED:'0',MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst-cache'),MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless',
    MEDIA_SERVER_WEBRTC_STUN_SERVER:`stun://127.0.0.1:${udp.address().port}`,MEDIA_SERVER_WEBRTC_TURN_SERVER:''};
  const call=async(route,options={})=>{assert(!expired,'deadline');return fetch(base+route,{...options,redirect:'manual',signal:AbortSignal.timeout(5000)});};
  const start=async(enabled)=>{
    child=spawn('./server.sh',['foreground'],{cwd:repo,env:{...env,MEDIA_SERVER_VA_REVIEW_ENABLED:enabled?'1':'0'},stdio:['ignore','pipe','pipe']});
    report.pid=child.pid;
    for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>{diagnostics=(diagnostics+bytes.toString()).slice(-16384);});
    child.on('error',()=>{failed=true;});
    for(let i=0;i<60;++i){assert(!failed&&child.exitCode===null&&!expired,'server startup');try{const r=await call('/health');await r.arrayBuffer();if(r.status===200)return;}catch{}await pause(100);}
    throw Error('readiness');
  };
  timer=setTimeout(()=>{expired=true;child?.kill('SIGTERM');},Math.max(1,180000-(Date.now()-started)));
  await start(true);
  const passwords=createUiAuthPasswords();secrets.push(...passwords);
  const auth=await bootstrapRecordingUiAuth(base,passwords,async(url,options)=>call(new URL(url).pathname,options));
  secrets.push(...auth.cookies);
  const cookies=auth.cookies;admin=cookies[0];const prefix='/ops/api/recordings/a-record-reviews';const jobs=prefix+'/jobs/';const packs='/ops/api/recordings/a-record-packages';
  const req=async(route,cookie=admin,method='GET',body,expected=200)=>{
    const r=await call(route,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},
      ...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
    const text=await r.text();check(r.status===expected,`${method} ${route.split('?')[0]} expected ${expected} got ${r.status} ${r.status===expected?'':text.slice(0,180)}`);
    if(route.startsWith('/ops/api/recordings/')){
      check(r.headers.get('cache-control')==='no-store'&&r.headers.get('x-content-type-options')==='nosniff','private response headers');
      check(!/passwordHash|passwordHistory|tokenHash|sourceUrl|absolutePath|\/Users\/|\/private\/|file:\/\//i.test(text),'private fields absent');
    }
    return JSON.parse(text);
  };
  const packageInfo=await req(packs+'/'+packages[0]);
  const body=(p=packageInfo,relation='endpoint-right',n=1)=>({packageId:p.id,targetKey:p.targetKey,question:'원문 <script>는 자동 해석하지 않음',claims:Array.from({length:n},()=>({relation,requiredColor:'red',requiredVisible:true,frames:[0,7]}))});
  const draft=async(b=body(),cookie=admin)=>req(prefix+'/drafts',cookie,'POST',b,201);
  const action=(d,name,cookie=admin,expected=200)=>req(prefix+'/drafts/'+d.id+'/'+name,cookie,'POST',{revision:d.revision},expected);
  const waitJob=async(id)=>{for(let i=0;i<120;++i){const d=await req(jobs+id);if(!['queued','running'].includes(d.state))return d;await pause(20);}throw Error('A job deadline');};
  const execute=async(b=body())=>{const d=await draft(b);await action(d,'confirm');const job=await action(d,'execute',admin,202);const done=await waitJob(job.id);check(done.state==='completed','A record completes');return {d,job,done,result:await req(prefix+'/'+done.reviewId)};};
  if(materialMode){
    const {checkMaterials}=await import('./va_review_material_http.mjs');
    await checkMaterials({repo,root,base,req,execute,body,prefix,packs,packageInfo,packages,seedInfo,cookies,admin,report,check,pause,started});
    check(chatCalls===0,'model transport trap: zero calls');check(!expired,'180 second bounded harness');
  }else{
  for(const route of [packs+'?channelId=1',packs+'/'+packages[0],prefix+'?packageId='+packages[0]]){
    await req(route,null,'GET',undefined,401);for(const i of [2,4])await req(route,cookies[i],'GET',undefined,403);
    await req(route,cookies[3],'GET',undefined,403);
  }
  await req(prefix+'/drafts',cookies[1],'POST',body(),403);
  await req(packs+'?channelId=2',cookies[1],'GET',undefined,403);
  check(!(await req(packs+'/'+packages[0],cookies[1])).canExecute,'read-only package capability');
  for(const field of ['verdict','basis','observations','confirmedBy','manifestDigest','episode','policy'])await req(prefix+'/drafts',admin,'POST',{...body(),[field]:'injected'},400);
  const unconfirmed=await draft();await action(unconfirmed,'execute',admin,409);
  await action(unconfirmed,'confirm');await req(prefix+'/drafts/'+unconfirmed.id+'/execute',admin,'POST',{revision:unconfirmed.revision,packageId:packages[1]},400);
  await req(prefix+'/drafts/'+unconfirmed.id+'/execute',admin,'POST',{revision:'a'.repeat(64)},409);
  await req(prefix+'/drafts',admin,'POST',{...body(),targetKey:'a'.repeat(64)},409);
  const changed=await draft(body(packageInfo,'endpoint-left'));await action(unconfirmed,'execute',admin,410);
  const ok=await execute();check(ok.result.decisions[0].verdict==='supported'&&ok.result.scope==='analysis-record-consistency'&&ok.result.questionsState==='not-generated'&&ok.result.modelQuality==='not-evaluated','A right result provenance');
  check((await action(ok.d,'execute',admin,202)).id===ok.job.id,'same confirmation retains completed job');
  const left=await execute(body(packageInfo,'endpoint-left'));check(left.result.decisions[0].verdict==='contradicted','left contradicted');
  const unsupported=await execute(body(packageInfo,'continuous-motion'));check(unsupported.result.decisions[0].verdict==='unsupported'&&unsupported.result.projectionStatus==='unavailable-unsupported','unsupported distinct');
  const missing=await req(packs+'/'+packages[1]);const gaps=await execute(body(missing,'endpoint-right',16));
  check(gaps.result.claims.length===16&&gaps.result.decisions.every(d=>d.verdict==='insufficient'&&d.gaps.length===2)&&gaps.result.projectionStatus==='unavailable-limit','all 16 claims survive projection limit');
  await req(prefix+'/'+seedInfo.internalId,admin,'GET',undefined,404);await req(prefix+'/'+seedInfo.v1Id,admin,'GET',undefined,404);
  await req('/ops/api/recordings/va-reviews/'+ok.done.reviewId,admin,'GET',undefined,404);
  await req('/ops/api/recordings/va-review-jobs/'+ok.job.id,admin,'DELETE',undefined,404);
  check((await req('/ops/api/recordings/va-reviews/'+seedInfo.v1Id)).provider==='ollama','v1 historical read preserved');
  const legacy=await req('/ops/api/recordings/evidence?channelId=1');check(!legacy.items.some(x=>packages.includes(x.id)),'v2 hidden from existing evidence list');
  const image=await call(packageInfo.frames[0].imageUrl,{headers:{Cookie:admin}});check(image.status===200&&(await image.arrayBuffer()).byteLength>0&&image.headers.get('cache-control')==='no-store','authorized actual PNG');
  await req(packageInfo.frames[0].imageUrl,cookies[3],'GET',undefined,403);
  const createOperator=async username=>{const password=createUiAuthPasswords()[0];secrets.push(password);
    await req('/ops/api/users',admin,'POST',{username,displayName:username,role:'operator',scopes:['ops:read','ops:write','source:read:1'],password,enabled:true,mustChangePassword:false},201);
    const login=await call('/login',{method:'POST',body:new URLSearchParams({username,password})});check(login.status===302,'writer login');await login.arrayBuffer();const cookie=login.headers.getSetCookie().map(v=>v.split(';',1)[0]).join('; ');secrets.push(cookie);return cookie;};
  const writer=await createOperator('a-writer'),other=await createOperator('a-other');const owned=await draft(body(),writer);await action(owned,'confirm',other,403);await action(owned,'confirm',writer);
  const usersFile=path.join(root,'data/users.json'),users=JSON.parse(fs.readFileSync(usersFile,'utf8'));const userRows=Array.isArray(users)?users:users.users;
  userRows.find(u=>u.username==='a-writer').scopes=['ops:read','source:read:1'];fs.writeFileSync(usersFile+'.new',JSON.stringify(users),{mode:0o600});fs.renameSync(usersFile+'.new',usersFile);
  await action(owned,'execute',writer,403);
  // 실제 현재 검색 snapshot을 통과하는 v2 생성. 클라이언트는 hit ID만 선택한다.
  const searchParams=new URLSearchParams({channelIds:'1',startTimeMs:String(seedInfo.startTimeMs),endTimeMs:String(seedInfo.endTimeMs),object:'synthetic-target',includeUnplaced:'true'});
  const found=await req('/ops/api/recordings/search?'+searchParams);check(found.items.length>0,'current search has real mock recording');
  const targetHit=found.items.find(x=>x.track==='track-77')||found.items[0];
  report.searchHitKinds=found.items.map(x=>({kind:x.kind,trackId:x.track,analysisNamespace:x.analysisNamespace}));
  const selection=new URLSearchParams(searchParams);selection.set('snapshotId',found.snapshotId);selection.set('hitId',targetHit.id);
  const created=await req('/ops/api/recordings/search/a-record-evidence?'+selection,admin,'POST',{},201);
  check((await req(packs+'/'+created.id)).frames.length>0,'HTTP created v2 selectable');
  await req('/ops/api/recordings/search/a-record-evidence?'+selection,cookies[1],'POST',{},403);
  const packPath=path.join(root,'recordings/evidence-packages',packages[0]+'.evp'),preserved=fs.readFileSync(packPath);
  const corrupt=Buffer.from(preserved);corrupt[0]^=1;fs.writeFileSync(packPath,corrupt,{mode:0o600});
  check((await req(prefix+'/'+ok.done.reviewId)).evidenceAvailability==='error','package tamper separate from unavailable');fs.writeFileSync(packPath,preserved,{mode:0o600});
  fs.renameSync(packPath,path.join(root,'held-package.evp'));check((await req(prefix+'/'+ok.done.reviewId)).evidenceAvailability==='unavailable','missing package leaves saved verdict');fs.renameSync(path.join(root,'held-package.evp'),packPath);
  // 실제 브라우저. 네트워크 지연은 실제 응답을 유지한 채 선택 변경 경합만 재현한다.
  const {playwright,moduleVersion}=resolvePlaywrightModule();browser=await playwright.chromium.launch({headless:true,executablePath:resolveNativeBrowserExecutable(),args:['--disable-background-networking','--disable-component-update','--no-first-run']});
  report.browser={engine:'chromium',moduleVersion,checks:[],screenshots:[]};
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const addCookie=async(ctx,cookie)=>ctx.addCookies(cookie.split('; ').map(v=>{const at=v.indexOf('=');return {name:v.slice(0,at),value:v.slice(at+1),url:base,httpOnly:true,sameSite:'Lax'};}));
  await addCookie(context,admin);page=await context.newPage();page.setDefaultTimeout(7000);const pageErrors=report.pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));report.browserResponses=[];page.on('response',r=>{if(r.url().includes('/a-record-'))report.browserResponses.push({url:new URL(r.url()).pathname,status:r.status()});});
  const uiCheck=(ok,id)=>{check(ok,'browser '+id);report.browser.checks.push(id);};
  const openA=async(track='track-77')=>{await page.goto(base+'/ops/events');await page.locator('#opsEvidenceChannel option[value="1"]').waitFor({state:'attached'});await page.selectOption('#opsEvidenceChannel','1');await page.selectOption('#opsEvidenceKind','A');
    await page.locator(`[data-package-id="${track==='track-999'?packages[1]:packages[0]}"]`).click();await page.locator('#opsAReviewQuestion').waitFor();};
  await openA();await page.fill('#opsAReviewQuestion','끝 위치가 오른쪽인가요? <script>원문</script>');
  uiCheck(await page.locator('#opsAReviewExecute').isDisabled(),'execute disabled until confirmation');
  await page.click('#opsAReviewPrepare');await page.locator('#opsAReviewConfirm').waitFor();await page.click('#opsAReviewConfirm');await page.waitForFunction(()=>!document.getElementById('opsAReviewExecute').disabled);
  await page.selectOption('#opsAReviewRelation','endpoint-left');uiCheck(await page.locator('#opsAReviewExecute').isDisabled(),'spec edit invalidates confirmation');
  await page.selectOption('#opsAReviewRelation','endpoint-right');await page.click('#opsAReviewPrepare');await page.click('#opsAReviewConfirm');await page.waitForFunction(()=>!document.getElementById('opsAReviewExecute').disabled);
  let executeCount=0;page.on('request',r=>{if(r.url().endsWith('/execute'))++executeCount;});
  await page.locator('#opsAReviewExecute').evaluate(el=>{el.click();el.click();});
  await page.locator('#opsAReviewResult h5').first().waitFor();uiCheck(executeCount===1,'duplicate click submits once');
  uiCheck((await page.locator('#opsAReviewResult').innerText()).includes('지지')&&await page.locator('#opsAReviewResult script').count()===0,'supported result and input escaping');
  await page.locator('#opsAReviewResult button').first().click();await page.waitForFunction(()=>[...document.querySelectorAll('#opsAReviewPanel img')].every(x=>x.complete&&x.naturalWidth>0));uiCheck(true,'actual evidence PNG opened');
  const shot=async(name,width,theme)=>{await page.setViewportSize({width,height:900});await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem('media-server-theme',t);},theme);
    await page.locator('#opsAReviewPanel').scrollIntoViewIfNeeded();const file=path.join(repo,'docs/release-artifacts/v4.5.0/42-'+name+'-'+started+'.png');await page.screenshot({path:file});report.browser.screenshots.push({file:path.basename(file),width,theme});if(name==='desktop-light'||name==='mobile-dark'){const full=file.replace('.png','-panel.png');await page.locator('#opsAReviewPanel').screenshot({path:full});report.browser.screenshots.push({file:path.basename(full),width,theme,scope:'whole changed panel'});}};
  await shot('desktop-light',1280,'light');await shot('mobile-dark',390,'dark');
  uiCheck(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'mobile no horizontal overflow');
  const uiExecute=async(relation)=>{await page.selectOption('#opsAReviewRelation',relation);await page.fill('#opsAReviewQuestion','명시한 관계를 확인합니다.');await page.click('#opsAReviewPrepare');await page.click('#opsAReviewConfirm');await page.click('#opsAReviewExecute');await page.waitForFunction(()=>document.getElementById('opsAReviewStatus').textContent.includes('A 기록 검토가 완료'));await page.locator('#opsAReviewResult').filter({hasText:'명시한 관계를 확인합니다.'}).waitFor();};
  await uiExecute('continuous-motion');uiCheck((await page.locator('#opsAReviewResult').innerText()).includes('미지원'),'unsupported shown separately');
  await page.setViewportSize({width:1280,height:900});await openA('track-999');await page.locator('#opsAReviewRows button').first().click();await page.locator('#opsAReviewResult h5').first().waitFor();
  const allText=await page.locator('#opsAReviewResult').innerText();uiCheck(allText.includes('unavailable-limit')&&(allText.match(/분석 기록상의 관계/g)||[]).length===16&&allText.includes('추가로 필요한 자료 — 서버 규칙'),'projection unavailable displays all structured gaps');
  await shot('desktop-dark',1280,'dark');await shot('mobile-light',390,'light');
  // R55-F1: 실제 job 응답을 보류한다. payload/state를 조작하지 않고 과거 결과 조회와 교차한다.
  await page.setViewportSize({width:1280,height:900});await openA();await page.fill('#opsAReviewQuestion','진행 중 이력 조회 반례');
  await page.click('#opsAReviewPrepare');await page.click('#opsAReviewConfirm');
  let releaseJob,jobArrived,jobReads=0;const heldJob=new Promise(r=>releaseJob=r),jobArrival=new Promise(r=>jobArrived=r);
  await page.route('**/a-record-reviews/jobs/*',async route=>{
    if(route.request().method()!=='GET'){await route.continue();return;}
    ++jobReads;const response=await route.fetch();
    if(jobReads===1){report.browser.heldJobState=(await response.json()).state;jobArrived();await heldJob;}
    try{await route.fulfill({response});}catch{}
  });
  try{
    await page.click('#opsAReviewExecute');await jobArrival;
    await page.locator('#opsAReviewRows button').first().click();await page.locator('#opsAReviewResult h5').first().waitFor();
    const historicalText=await page.locator('#opsAReviewResult').innerText();
    await page.click('#opsAReviewRefresh');uiCheck(jobReads===1,'refresh during held GET does not start duplicate polling');
    releaseJob();await page.waitForFunction(()=>document.getElementById('opsAReviewStatus').textContent.includes('A 기록 검토가 완료'));
    await page.waitForFunction(()=>!document.getElementById('opsAReviewQuestion').disabled);
    uiCheck((await page.locator('#opsAReviewResult').innerText())===historicalText,'pending real job GET survives history selection; completion leaves history visible');
    await page.locator('#opsAReviewRows button').filter({hasText:'진행 중 이력 조회 반례'}).waitFor();
    uiCheck(await page.locator('#opsAReviewRows button').filter({hasText:'진행 중 이력 조회 반례'}).count()===1,'completed server result listed once');
    await page.locator('#opsAReviewRows button').filter({hasText:'진행 중 이력 조회 반례'}).click();
    await page.locator('#opsAReviewResult').filter({hasText:'진행 중 이력 조회 반례'}).waitFor();
    uiCheck((await page.locator('#opsAReviewResult').innerText()).includes('지지'),'new completed result explicitly readable');
    await shot('poll-history-desktop',1280,'light');report.browser.jobReads=jobReads;
  }finally{releaseJob();await page.unroute('**/a-record-reviews/jobs/*');}
  // 늦게 돌아오는 실제 초안 응답은 현재 명세에 적용하지 않는다.
  await page.setViewportSize({width:1280,height:900});await openA();await page.fill('#opsAReviewQuestion','늦은 응답 확인');let releaseDraft,arrived;
  const arrival=new Promise(r=>arrived=r),release=new Promise(r=>releaseDraft=r);
  await page.route('**/a-record-reviews/drafts',async route=>{const response=await route.fetch();arrived();await release;try{await route.fulfill({response});}catch{}});
  await page.click('#opsAReviewPrepare');await arrival;await page.fill('#opsAReviewQuestion','변경한 원문');releaseDraft();await page.unroute('**/a-record-reviews/drafts');await pause(100);
  uiCheck(await page.locator('#opsAReviewExecute').isDisabled()&&await page.locator('#opsAReviewConfirm').isDisabled(),'late real draft ignored after edit');
  await page.fill('#opsAReviewQuestion','선택 전환 검사');let releaseSelection,selectionArrived;
  const selectedArrival=new Promise(r=>selectionArrived=r),selectedRelease=new Promise(r=>releaseSelection=r);
  await page.route('**/a-record-reviews/drafts',async route=>{const response=await route.fetch();selectionArrived();await selectedRelease;try{await route.fulfill({response});}catch{}});
  await page.click('#opsAReviewPrepare');await selectedArrival;await page.selectOption('#opsEvidenceKind','v1');releaseSelection();await page.unroute('**/a-record-reviews/drafts');await pause(100);
  uiCheck(await page.locator('#opsAReviewPanel').count()===0,'late response ignored after package selection changes');await openA();await page.fill('#opsAReviewQuestion','취소 경합 검사');
  // 실행 수명은 서버가 관리한다. 실제 GET 응답만 지연시켜 취소와 완료의 경합을 확인한다.
  await page.route('**/a-record-reviews/jobs/*',async route=>{if(route.request().method()!=='GET'){await route.continue();return;}const response=await route.fetch();await pause(350);try{await route.fulfill({response});}catch{}});
  await page.click('#opsAReviewPrepare');await page.click('#opsAReviewConfirm');await page.click('#opsAReviewExecute');
  const cancelButton=page.locator('#opsAReviewCancel');await page.waitForFunction(()=>!document.getElementById('opsAReviewCancel').disabled);
  await cancelButton.click();await page.waitForFunction(()=>/취소|이미 저장|저장된 구조화|A 기록 검토가 완료/.test(document.getElementById('opsAReviewStatus').textContent));
  report.browser.cancelOutcome=await page.locator('#opsAReviewStatus').innerText();uiCheck(true,'actual cancel action respects publish race');
  await page.unroute('**/a-record-reviews/jobs/*');
  fs.renameSync(packPath,path.join(root,'held-package.evp'));await openA();await page.locator('#opsAReviewRows button').first().click();await page.locator('#opsAReviewResult h5').first().waitFor();uiCheck((await page.locator('#opsAReviewResult').innerText()).includes('unavailable'),'missing evidence leaves structured result visible');fs.renameSync(path.join(root,'held-package.evp'),packPath);
  await openA();await page.fill('#opsAReviewQuestion','저장 오류 확인');await page.click('#opsAReviewPrepare');await page.click('#opsAReviewConfirm');
  const recordsPath=path.join(root,'recordings/va-reviews');fs.renameSync(recordsPath,recordsPath+'.held');fs.writeFileSync(recordsPath,'owned failure injection',{mode:0o600});
  try{await page.click('#opsAReviewExecute');await page.waitForFunction(()=>/오류|읽을 수 없|실패/.test(document.getElementById('opsAReviewStatus').textContent));uiCheck(!(await page.locator('#opsAReviewStatus').innerText()).includes('근거 부족'),'storage error not insufficiency');}
  finally{fs.unlinkSync(recordsPath);fs.renameSync(recordsPath+'.held',recordsPath);}
  for(const index of [1,2,3]){const ctx=await browser.newContext();await addCookie(ctx,cookies[index]);const p=await ctx.newPage();await p.goto(base+'/ops/events');
    if(index===1){await p.locator('#opsEvidenceChannel option[value="1"]').waitFor({state:'attached'});await p.selectOption('#opsEvidenceKind','A');await p.locator(`[data-package-id="${packages[0]}"]`).click();await p.fill('#opsAReviewQuestion','read only');uiCheck(await p.locator('#opsAReviewPrepare').isDisabled(),'read-only browser cannot execute');}
    else uiCheck(await p.locator('#opsAReviewPanel').count()===0,'viewer/no-source browser no review data '+index);await ctx.close();}
  uiCheck(pageErrors.length===0,'no page script exceptions');await context.close();await browser.close();browser=null;
  report.scopedBrowserExecuted=true;report.actualUiPass=false;
  const pendingDraft=await draft();await action(pendingDraft,'confirm');
  report.cleanup.firstProcess=await stopServer(child);await assertPortClosed(httpPort);await assertPortClosed(rtspPort);child=null;
  await start(true);const login=await call('/login',{method:'POST',body:new URLSearchParams({username:'admin',password:passwords[0]})});await login.arrayBuffer();admin=login.headers.getSetCookie().map(v=>v.split(';',1)[0]).join('; ');secrets.push(admin);
  await action(pendingDraft,'execute',admin,410);await req(jobs+ok.job.id,admin,'GET',undefined,410);
  check((await req(prefix+'/'+ok.done.reviewId)).decisions[0].verdict==='supported','new server process saved confirmed verdict');
  report.cleanup.secondProcess=await stopServer(child);await assertPortClosed(httpPort);await assertPortClosed(rtspPort);child=null;
  await start(false);const l=await call('/login',{method:'POST',body:new URLSearchParams({username:'admin',password:passwords[0]})});await l.arrayBuffer();admin=l.headers.getSetCookie().map(v=>v.split(';',1)[0]).join('; ');secrets.push(admin);
  await req(packs+'?channelId=1',admin,'GET',undefined,503);check(chatCalls===0,'no model/provider request in entire HTTP/browser run');check(!expired,'180 second bounded harness');
  }
}catch(error){failed=true;report.status='FAIL';report.failure=error.message;report.stack=error.stack;if(page){report.failureUi=await page.locator('#opsEvidenceStatus').textContent().catch(()=>null);report.failureRows=await page.locator('#opsEvidenceRows').innerText().catch(()=>null);report.failureResult=await page.locator('#opsAReviewResult').innerText().catch(()=>null);}
  let safe=diagnostics;for(const value of secrets)if(value)safe=safe.split(value).join('[secret]');report.failureDiagnostics=safe.split('\n').filter(x=>/error|fail|fatal|invalid/i.test(x)).slice(-12);}
finally{
  clearTimeout(timer);if(browser){await browser.close();report.cleanup.browserClosed=true;}else report.cleanup.browserClosed=true;
  if(child){try{report.cleanup.process=await stopServer(child);}catch{failed=true;report.cleanup.process={exited:child.exitCode!==null||child.signalCode!==null};}}
  for(const [name,port] of [['http',httpPort],['rtsp',rtspPort]])if(port){try{report.cleanup[name]=await assertPortClosed(port);}catch{failed=true;report.cleanup[name]={closed:false};}}
  if(provider){provider.closeAllConnections();await new Promise(resolve=>provider.close(resolve));report.cleanup.provider=await assertPortClosed(providerPort);}
  if(udp){await new Promise(resolve=>udp.close(resolve));report.cleanup.udpClosed=true;}
  try{assert(!child||child.exitCode!==null||child.signalCode!==null,'active process');const s=fs.lstatSync(root);assert(!s.isSymbolicLink()&&s.dev===identity.dev&&s.ino===identity.ino&&s.uid===process.getuid(),'root ownership');fs.rmSync(root,{recursive:true});report.cleanup.rootAbsent=!fs.existsSync(root);assert(report.cleanup.rootAbsent,'cleanup remains');}catch{failed=true;report.cleanup.failed=true;}
  report.modelCalls=chatCalls;report.status=failed?'FAIL':'PASS';report.exit=failed?1:0;report.elapsedMs=Date.now()-started;
  const dir=path.join(repo,'docs/release-artifacts/v4.5.0');let n=1;while(fs.existsSync(path.join(dir,`${phase}-http-${n}.json`)))++n;
  fs.writeFileSync(path.join(dir,`${phase}-http-${n}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,failure:report.failure,elapsedMs:report.elapsedMs,cleanup:report.cleanup}));process.exitCode=report.exit;
}
