#!/usr/bin/env node
// 파일 용도: 실제 native Chrome으로 녹화 UI addendum의 31개 action evidence를 수집한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolvePlaywrightModule,resolveNativeBrowserExecutable,secretStrippedBrowserEnv} from './v390_ui_native_adapter.mjs';
import {runVerifier} from './verify_v410_recording_ui_contract.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const actionRows=Object.freeze([
  ['I27-filter','V410-S06-I27','정상 필터'],['I27-empty','V410-S06-I27','빈값·빈 결과'],['I27-inverted','V410-S06-I27','역전 시간'],['I27-page','V410-S06-I27','페이지'],
  ['I28-event','V410-S06-I28','이벤트 우선'],['I29-original','V410-S06-I29','원본'],['I30-play','V410-S06-I30','재생'],['I30-pause','V410-S06-I30','정지'],['I30-seek','V410-S06-I30','탐색'],
  ['I31-partial','V410-S06-I31','partial'],['I31-deleted','V410-S06-I31','삭제'],['I31-corrupt','V410-S06-I31','손상'],['I31-pending','V410-S06-I31','미완결 event'],['I31-gap','V410-S06-I31','공백'],['I31-error','V410-S06-I31','오류'],
  ['I32-quota','V410-S06-I32','quota'],['I32-active','V410-S06-I32','활성'],['I32-blocked','V410-S06-I32','blocked'],['I33-navigation','V410-S06-I33','navigation'],
  ['I34-admin','V410-S06-I34','admin'],['I34-operator','V410-S06-I34','operator scope'],['I34-viewer-unauth','V410-S06-I34','viewer·미인증'],['I34-redaction','V410-S06-I34','redaction'],
  ['I34-320-light','V410-S06-I34','320 light'],['I34-320-dark','V410-S06-I34','320 dark'],['I34-390-light','V410-S06-I34','390 light'],['I34-390-dark','V410-S06-I34','390 dark'],['I34-760-light','V410-S06-I34','760 light'],['I34-760-dark','V410-S06-I34','760 dark'],['I34-1180-light','V410-S06-I34','1180 light'],['I34-1180-dark','V410-S06-I34','1180 dark'],
]);
export const RECORDING_UI_ACTIONS=actionRows.map(([id,feature,title])=>Object.freeze({id,feature,title}));
const allowedMedia=/^\/ops\/api\/recordings\/media\/[A-Za-z0-9._:-]{1,128}$/;
const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function assert(value,message){if(!value)throw new Error(message);}
export function parseAcceptanceArgs(args){
  let mode='',outputDir='';
  for(let i=0;i<args.length;i++){
    const value=args[i];
    if(value==='--focus-i30'||value==='--all'){assert(!mode,'mode duplicated');mode=value;}
    else if(value==='--output-dir'){assert(!outputDir,'output duplicated');outputDir=args[++i]||'';}
    else throw Error('unsupported acceptance option');
  }
  assert(mode&&path.isAbsolute(outputDir),'mode and absolute output required');
  return {mode,outputDir:path.resolve(outputDir)};
}
export function prepareOutputDirectory(outputDir){
  const absolute=path.resolve(outputDir),parent=path.dirname(absolute);
  assert(parent===fs.realpathSync(os.tmpdir())&&/^media-server-recording-ui-acceptance-[A-Za-z0-9_-]+$/.test(path.basename(absolute)),'owned temp output required');
  if(!fs.existsSync(absolute))fs.mkdirSync(absolute,{mode:0o700});
  const stat=fs.lstatSync(absolute);
  assert(stat.isDirectory()&&!stat.isSymbolicLink()&&fs.realpathSync(absolute)===absolute&&stat.uid===process.getuid()&&(stat.mode&0o777)===0o700&&fs.readdirSync(absolute).length===0,'empty private owned output required');
  return absolute;
}
export function redactAcceptanceText(value,secrets=[]){
  let text=String(value??'');
  for(const secret of secrets)if(secret)text=text.split(secret).join('[REDACTED]');
  return text.replace(/(?:https?|rtsp|stun):\/\/[^\s"'<>]+/g,'[URL]')
    .replace(/(?:\/Users\/|\/private\/|\/tmp\/|\/var\/folders\/)[^\s"'<>]+/g,'[PATH]')
    .replace(/\b(authorization|cookie|set-cookie)\s*[:=][^\r\n]*/gi,'$1: [REDACTED]')
    .replace(/\b(password(?:Hash|History)?|token(?:Hash)?)\s*[=:]\s*[^\s;,}\]]+/gi,'$1=[REDACTED]')
    .replace(/"(password|token|cookie|authorization)"\s*:\s*"[^"]*"/gi,'"$1":"[REDACTED]"');
}
function safeJoin(root,name){
  const target=path.resolve(root,name),parent=path.dirname(target);
  assert(target.startsWith(root+path.sep)&&fs.realpathSync(parent)===parent&&!fs.lstatSync(parent).isSymbolicLink(),'artifact path escape');
  return target;
}
export function writeSanitizedArtifact(root,name,value,secrets=[]){
  const file=safeJoin(root,name);
  fs.writeFileSync(file,redactAcceptanceText(value,secrets),{mode:0o600,flag:'wx'});
  return {path:name,sha256:hashFile(file),bytes:fs.statSync(file).size};
}
function safeValue(value,secrets){
  if(typeof value==='string')return redactAcceptanceText(value,secrets);
  if(Array.isArray(value))return value.map(v=>safeValue(v,secrets));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,safeValue(v,secrets)]));
  return value;
}
export function createResultManifest(mode){
  assert(mode==='--focus-i30'||mode==='--all','invalid mode');
  return RECORDING_UI_ACTIONS.filter(r=>mode==='--all'||r.feature==='V410-S06-I30').map(r=>({...r,status:'notRun',evidence:[]}));
}
export const floorMinute=epoch=>Math.floor(Number(epoch)/60000)*60000;
export const ceilMinute=epoch=>Math.ceil(Number(epoch)/60000)*60000;
function dateLocal(epoch){const d=new Date(Number(epoch));return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
export function findSeekSeedItem(seed){
  const matches=seed.pages.flatMap(p=>[...p.items,...p.unplacedItems]).filter(r=>r.segmentId===seed.seek.id&&r.playable);
  assert(matches.length===1,'seek row must be unique');return matches[0];
}
export function findTimelinePosition(page,itemId,originals){
  const visible=page.items.filter(r=>originals||r.kind==='event'||r.hideByEvent!==true);
  const known=visible.findIndex(r=>r.itemId===itemId),unknown=page.unplacedItems.findIndex(r=>r.itemId===itemId);
  assert((known>=0)!==(unknown>=0),'exact row must exist in only one list');
  return {selector:known>=0?'#opsRecordingTimelineRows button':'#opsRecordingUnplacedRows button',index:known>=0?known:unknown};
}
export function validateI30Observation(o){
  assert(o.metadata.duration>=9.95&&o.metadata.duration<=10.1&&o.metadata.videoWidth===1280&&o.metadata.videoHeight===720,'I30 metadata');
  assert(o.beforePlay.paused&&!o.afterPlay.paused&&o.afterPlay.currentTime>o.beforePlay.currentTime&&o.afterPlay.frames>o.beforePlay.frames,'I30 play progression');
  assert(o.afterPause.paused&&o.afterPause.elapsedMs>=300&&Math.abs(o.afterPause.currentTime-o.beforePause.currentTime)<0.05,'I30 pause stability');
  assert(o.afterSeek.currentTime-o.beforeSeek.currentTime>=1&&o.afterSeek.seekingObserved&&o.afterSeek.seekedObserved&&o.afterSeek.frames>o.beforeSeek.frames,'I30 seek');
  assert(o.media.some(r=>r.id===o.selectedId&&r.status===206&&/^bytes=\d+-\d*$/.test(r.range)&&/^bytes \d+-\d+\/\d+$/.test(r.contentRange)),'I30 Range');
  return true;
}
export async function captureMediaResponse(response){
  const route=new URL(response.url()).pathname;if(!allowedMedia.test(route))return null;
  const headers=await response.allHeaders(),requestHeaders=await response.request().allHeaders();
  return {id:route.split('/').at(-1),status:response.status(),range:requestHeaders.range||'',contentRange:headers['content-range']||''};
}
async function loginVisible(page,base,account){
  await page.goto(base+'/login',{waitUntil:'domcontentloaded'});
  await page.locator('input[name="username"]').fill(account.username);
  await page.locator('input[name="password"]').fill(account.password);
  await Promise.all([page.waitForURL(url=>url.pathname!=='/login'),page.locator('button[type="submit"]').click()]);
}
export async function runRecordingUiAcceptance(context,options){
  const root=prepareOutputDirectory(options.outputDir),results=createResultManifest(options.mode);
  const secrets=context.accounts.map(a=>a.password),artifacts=[],trace=[],consoleRows=[],media=[],pending=[],network=[];
  const resolved=resolvePlaywrightModule(),executablePath=resolveNativeBrowserExecutable();
  let browser,page,failure=null,active=null,browserClosed=false,browserVersion=null,observationFailed=false;
  const events={seeking:0,seeked:0};
  const write=(name,value)=>{const file=safeJoin(root,name);fs.writeFileSync(file,JSON.stringify(safeValue(value,secrets),null,2)+'\n',{mode:0o600,flag:'wx'});const artifact={path:name,sha256:hashFile(file),bytes:fs.statSync(file).size};artifacts.push(artifact);return artifact;};
  const screenshot=async name=>{
    assert(page&&new URL(page.url()).pathname!=='/login','credential page capture forbidden');
    const file=safeJoin(root,name+'.png');await page.screenshot({path:file,fullPage:true});
    const artifact={path:name+'.png',sha256:hashFile(file),bytes:fs.statSync(file).size};artifacts.push(artifact);return artifact;
  };
  const snapshot=()=>page.locator('#opsRecordingPlayer').evaluate(node=>({paused:node.paused,currentTime:node.currentTime,readyState:node.readyState,duration:Number.isFinite(node.duration)?node.duration:null,videoWidth:node.videoWidth,videoHeight:node.videoHeight,frames:node.getVideoPlaybackQuality().totalVideoFrames,src:node.getAttribute('src'),error:node.error?.code??null,focused:document.activeElement===node}));
  const abort=()=>{if(browser)void browser.close().catch(()=>{observationFailed=true;});};
  const action=async(id,fn)=>{
    const row=results.find(r=>r.id===id);assert(row&&row.status==='notRun','duplicate action');active=row;
    const startedAt=new Date().toISOString();trace.push({id,phase:'begin',at:startedAt,requestedRole:'admin',requestedScope:['*'],viewport:{width:1180,height:900},theme:'light'});
    try{const detail=await fn();row.evidence.push(write(id+'.json',{id,startedAt,completedAt:new Date().toISOString(),detail}),await screenshot(id));row.status='pass';}
    catch(error){row.status='fail';row.reason=redactAcceptanceText(error.message,secrets);throw error;}
    finally{trace.push({id,phase:'end',at:new Date().toISOString(),status:row.status});}
  };
  let timeline=null;
  async function timelineAction(trigger,offset=0){
    const wait=page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/ops/api/recordings/timeline'&&u.searchParams.get('offset')===String(offset)&&r.request().method()==='GET';});
    const [response]=await Promise.all([wait,trigger()]);assert(response.status()===200,'timeline HTTP status');timeline=await response.json();
    const expected=context.seed.pages[offset/100];assert(expected,'expected seed page');
    assert(JSON.stringify(timeline)===JSON.stringify(expected),'timeline differs from independent C++ seed');
    const originals=await page.locator('#opsRecordingOriginalView').isChecked();
    const visible=timeline.items.filter(r=>originals||r.kind==='event'||!r.hideByEvent);
    await page.waitForFunction(({known,unknown})=>document.querySelectorAll('#opsRecordingTimelineRows button').length===known&&document.querySelectorAll('#opsRecordingUnplacedRows button').length===unknown,{known:visible.length,unknown:timeline.unplacedItems.length});
    return timeline;
  }
  async function selectSeedRow(row){
    let index=context.seed.pages.findIndex(p=>[...p.items,...p.unplacedItems].some(r=>r.itemId===row.itemId));assert(index>=0,'row page');
    await page.locator('#opsRecordingOriginalView').check();
    await timelineAction(()=>page.locator('#opsRecordingLoad').click(),0);
    for(let p=1;p<=index;p++)await timelineAction(()=>page.locator('#opsRecordingNext').click(),p*100);
    const position=findTimelinePosition(timeline,row.itemId,true),button=page.locator(position.selector).nth(position.index);
    assert(await button.isVisible()&&await button.isEnabled(),'row visible/enabled');await button.click();
    await page.waitForFunction(url=>document.querySelector('#opsRecordingPlayer').getAttribute('src')===url,row.playbackUrl);
    assert(await page.locator(position.selector).nth(position.index).getAttribute('aria-pressed')==='true','selected row state');
    return {itemId:row.itemId,segmentId:row.segmentId,selector:position.selector,index:position.index,src:(await snapshot()).src};
  }
  try{
    assert(!context.signal.aborted,'cancelled before launch');
    browser=await resolved.playwright.chromium.launch({headless:true,executablePath,env:secretStrippedBrowserEnv(),args:['--no-first-run']});browserVersion=browser.version();
    context.signal.addEventListener('abort',abort,{once:true});
    const browserContext=await browser.newContext({viewport:{width:1180,height:900},colorScheme:'light',locale:'ko-KR'});
    page=await browserContext.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);
    page.on('console',message=>consoleRows.push({type:message.type(),text:redactAcceptanceText(message.text(),secrets),at:Date.now()}));
    page.on('pageerror',error=>consoleRows.push({type:'pageerror',text:redactAcceptanceText(error.message,secrets),at:Date.now()}));
    page.on('crash',()=>consoleRows.push({type:'crash',text:'renderer crashed',at:Date.now()}));
    page.on('response',response=>{const job=(async()=>{const u=new URL(response.url()),route=u.pathname;if(route.startsWith('/ops/api/recordings/'))network.push({route,status:response.status(),at:Date.now()});const item=await captureMediaResponse(response);if(item)media.push({...item,at:Date.now()});})();pending.push(job.catch(()=>{observationFailed=true;}));});
    await page.exposeFunction('__recordingUiMediaEvent',type=>{if(type==='seeking'||type==='seeked')events[type]++;});
    // 읽기 전용 이벤트 관측만 설치한다. play/pause/currentTime 변경은 실제 control로 수행한다.
    await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const video=document.querySelector('#opsRecordingPlayer');if(video)for(const type of ['seeking','seeked'])video.addEventListener(type,()=>window.__recordingUiMediaEvent(type));}));
    await loginVisible(page,context.baseUrl,context.accounts[0]);
    await page.goto(context.baseUrl+'/ops/events',{waitUntil:'networkidle'});
    await page.locator('#opsRecordingStartTime').fill(dateLocal(floorMinute(context.seed.startTimeMs)));
    await page.locator('#opsRecordingEndTime').fill(dateLocal(ceilMinute(context.seed.endTimeMs)));
    if(await page.locator('#opsRecordingChannelFilter').inputValue()!=='1')await timelineAction(()=>page.locator('#opsRecordingChannelFilter').selectOption('1'));
    await timelineAction(()=>page.locator('#opsRecordingLoad').click());
    const selected=await selectSeedRow(findSeekSeedItem(context.seed)),video=page.locator('#opsRecordingPlayer');
    await page.waitForFunction(()=>{const v=document.querySelector('#opsRecordingPlayer');return v.readyState>=2&&v.duration>0;});
    const metadata=await snapshot();assert(metadata.duration>=9.95&&metadata.duration<=10.1,'selected 10 second fixture');
    let beforePlay,afterPlay,beforePause,afterPause,beforeSeek,afterSeek;
    await action('I30-play',async()=>{
      assert(await video.isVisible()&&await video.isEnabled(),'video visible/enabled');await video.focus();
      beforePlay=await snapshot();assert(beforePlay.paused&&beforePlay.focused,'initial paused focus');
      await video.press('Space');await page.waitForTimeout(700);afterPlay=await snapshot();
      assert(!afterPlay.paused&&afterPlay.currentTime>beforePlay.currentTime&&afterPlay.frames>beforePlay.frames&&afterPlay.error===null,'native play progression');
      return {control:'#opsRecordingPlayer',action:'focused Space',selected,metadata,beforePlay,afterPlay};
    });
    await action('I30-pause',async()=>{
      await video.press('Space');beforePause=await snapshot();const began=performance.now();
      assert(beforePause.paused,'native pause state');await page.waitForTimeout(350);afterPause={...await snapshot(),elapsedMs:performance.now()-began};
      assert(afterPause.paused&&Math.abs(afterPause.currentTime-beforePause.currentTime)<0.05,'native pause stability');
      return {control:'#opsRecordingPlayer',action:'focused Space',beforePause,afterPause};
    });
    await action('I30-seek',async()=>{
      beforeSeek=await snapshot();const beforeEvents={...events},began=Date.now();
      // 실제 Chrome에서 짧은 영상의 native 방향키 한 번은 0.1초였다.
      // 기준을 완화하지 않고 동일한 사용자 키 조작 20회로 충분한 이동을 요청한다.
      for(let key=0;key<20;key++)await video.press('ArrowRight');
      await page.waitForTimeout(500);afterSeek={...await snapshot(),seekingObserved:events.seeking>beforeEvents.seeking,seekedObserved:events.seeked>beforeEvents.seeked};
      await Promise.all(pending);
      write('I30-seek-observation.json',{beforeSeek,afterSeek,beforeEvents,events,media:media.filter(r=>r.id===context.seed.seek.id)});
      validateI30Observation({metadata,beforePlay,afterPlay,beforePause,afterPause,beforeSeek,afterSeek,media,selectedId:context.seed.seek.id});
      return {control:'#opsRecordingPlayer',action:'focused ArrowRight x20',beforeSeek,afterSeek,media:media.filter(r=>r.id===context.seed.seek.id),seekStartedAt:began,rangeInterpretation:'same selected file response; seek may use buffered bytes'};
    });
    assert(!observationFailed,'observation failure');
    assert(consoleRows.every(r=>!['error','warning','pageerror','crash'].includes(r.type)),'unapproved console or renderer failure');
    assert(results.every(r=>r.status==='pass'),'selected actions remain notRun');
  }catch(error){failure=redactAcceptanceText(error.message,secrets);if(active&&active.status!=='pass')active.status='fail';}
  finally{
    const failures=[];
    try{await Promise.all(pending);}catch{failures.push('response capture');}
    if(page&&new URL(page.url()).pathname!=='/login')try{await screenshot('final');}catch{failures.push('final screenshot unavailable');}
    context.signal.removeEventListener('abort',abort);
    try{if(browser)await browser.close();browserClosed=true;}catch{failures.push('browser cleanup');}
    for(const [name,value] of [['trace.json',trace],['browser-console.json',consoleRows],['media.json',media],['network.json',network],['seed-oracle.json',context.seed]]){
      try{write(name,value);}catch{failures.push(name);}
    }
    try{artifacts.push(writeSanitizedArtifact(root,'server-log.txt',fs.readFileSync(context.serverLogPath,'utf8'),secrets));}catch{failures.push('server log');}
    try{const revision=spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'});assert(revision.status===0,'source revision');write('provenance.json',{sourceCommit:revision.stdout.trim(),runnerHash:hashFile(fileURLToPath(import.meta.url)),productHash:hashFile(path.join(repo,'build-gst-onnx/media_server')),seedHash:hashFile(path.join(context.root,'ui-seed-manifest.json')),moduleVersion:resolved.moduleVersion,browserVersion,evidenceMode:'qualified-native-automation',fallback:'native Chrome instead of prior failed in-app renderer',manualIntervention:false,visualReviewRequired:true});}catch{failures.push('provenance');}
    if(failures.length)failure=failure||failures.join(', ');
    write('results.json',{mode:options.mode,results,pass:results.filter(r=>r.status==='pass').length,fail:results.filter(r=>r.status==='fail').length,notRun:results.filter(r=>r.status==='notRun').length,failure,browserClosed,artifacts:[...artifacts],visualReviewRequired:true,uiFulltestPass:false});
  }
  secrets.fill('');
  if(failure)throw Error(failure);
  return {results,browserClosed,uiFulltestPass:false};
}
export async function main(){
  const options=parseAcceptanceArgs(process.argv.slice(2)),anchor=String(Math.floor(Date.now()/60000)*60000);
  let result;await runVerifier('--ui-auth-direct',{uiArgs:['--ui-anchor-utc-ms',anchor,'--ui-seek-fixture'],uiDriver:async context=>{result=await runRecordingUiAcceptance(context,options);}});
  console.log(JSON.stringify({pass:result.results.filter(r=>r.status==='pass').length,notRun:result.results.filter(r=>r.status==='notRun').length,uiFulltestPass:false,outputDir:options.outputDir}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('recording UI acceptance failed; inspect private sanitized evidence');process.exitCode=1;});
