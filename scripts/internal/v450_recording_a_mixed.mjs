// 파일 용도: 기존 혼합 실행기에 인증된 A 확인·저장 부하만 연결한 제한 관측. 짧은 준비 실행은 장시간/자원/UI PASS가 아니다.
import {createReviewTestArtifacts} from './va_review_test_artifacts.mjs';
import {runReviewSeed} from './va_review_seed_process.mjs';
import {MixedALoad,requireMixedWindows} from './v450_recording_a_load.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import dgram from 'node:dgram';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CurrentRecordingObserver,CurrentLongrunProgress,CurrentObservationBudget,summarizeCurrentSamples,closedJournalComplete,disabledChannelsExact,measureCurrentRootStable,summarizeFixtureGeneration,freezeCurrentWorkspace,measureCurrentWorkspace,workspaceBounds,runCurrentRecovery} from "./recording_current_observer.mjs";
import {collectProcess} from "./recording_foundation_observer.mjs";
import {parseLongrunArgs,sampleContinuity,nextRecordingSettings,mediaAbsent,assertSampleStep,summarizeAvailableSamples,slowTraceSummary,nextSampleDelay,frameTraceSummary,captureBoundedProcessLog,processLogCaptureComplete} from "./recording_longrun_progress.mjs";
import {measuredHttpResponse} from "./recording_current_app_helpers.mjs";
import {reservePort,stopServer,assertPortClosed,bootstrapRecordingUiAuth,createUiAuthPasswords} from "./verify_v410_recording_ui_contract.mjs";
import {createProcessCleanup} from "./recording_process_cleanup.mjs";
import {assertLocalIceConfig} from "./verify_local_ice_guard.mjs";
import {summarizeSpawnDiagnostic,validatedPhaseReceipt,snapshotTree,copyVerified,receiptTree,diagnosticRootIdentity,sourceManifest,preserveDiagnosticReceipt} from "./recording_archive_diagnostic_profile.mjs";
import {removeDiagnosticRoot} from "./recording_failure_capture.mjs";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const root=process.argv[2],args=process.argv.slice(3),short=args.length===1&&args[0]==='--app-observe';
const diagnose=args.length===1&&args[0]==='--frame-diagnostic';
const duration=short?30000:diagnose?600000:parseLongrunArgs(args);
const artifacts=createReviewTestArtifacts(repo);
let aLoad=null,auth=null,seedInfo=null;const passwords=createUiAuthPasswords();
if(!path.isAbsolute(root)||fs.realpathSync(root)!==root||!path.basename(root).startsWith('media-server-current-observer-')||(fs.statSync(root).mode&0o777)!==0o700)throw Error('owned-run-root');
const start=performance.now(),deadline=start+(short?180000:diagnose?780000:7380000),processes=[],samples=[],ports=[];
const native=path.join(root,'normalize'),collector=path.join(root,'process-metrics');
let workspace=null;
// 부모의 새 로그/receipt도 가변 비용이다. 복구 copy만 기존 별도 C 예산으로 센다.
function storageNow(copy=null){const storage=workspace?measureCurrentWorkspace(root,workspace,copy):measureCurrentRootStable(root);
  const extra=fs.readdirSync(artifacts.allowedRoot).filter(n=>!n.startsWith('media-server-current-observer-')).reduce((sum,n)=>sum+size(path.join(artifacts.allowedRoot,n)),0);
  if(!workspace)return {...storage,totalBytes:storage.totalBytes+extra,capExceeded:storage.capExceeded||storage.totalBytes+extra>=448*1024*1024,parentOutputBytes:extra};
  return {...storage,...workspaceBounds(storage.totalBytes+extra,workspace.fixedBytes,storage.copyBytes,workspace.capBytes),parentOutputBytes:extra};}
let cancelled=false,failed=0,passed=0,observer,progress,phaseResult,summary,udp,udpClosed=false,observationStart=null;
process.on('SIGTERM',()=>{cancelled=true;});process.on('SIGINT',()=>{cancelled=true;});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function check(ok,label){if(!ok)throw Error(label);passed++;console.log('[pass] '+label);}
function size(dir){let bytes=0,entries=0;function visit(p){const s=fs.lstatSync(p);if(++entries>100000)throw Error('root-entry-bound');
  if(s.isSymbolicLink()){if(!p.startsWith(path.join(root,'gst-cache')+path.sep))throw Error('root-unsafe-symlink');bytes+=s.size;return;}
  if(s.isDirectory())for(const n of fs.readdirSync(p))visit(path.join(p,n));else{if(!s.isFile()||s.nlink!==1)throw Error('root-unsafe-file');bytes+=s.size;}}visit(dir);return bytes;}
// live SQLite에 별도 reader lock을 만들지 않는다. page PRAGMA는 writer 종료 뒤 post-stop에서만 실행한다.
function rootDiagnostic(reason,measurement=storageNow(),final=false){const journalMutationTypes=observer?{...observer.typeCounts}:null;
  const journalMutationTypesCoverage=observer?'drained-prefix-only; unread-or-partial-tail-excluded':'observer-unavailable';
  console.log('[root-storage] '+JSON.stringify({reason,final,elapsedMs:Math.round(performance.now()-start),journalMutationTypes,journalMutationTypesCoverage,...measurement}));return measurement;}
function cadence(){if(observationStart!==null){const now=performance.now(),previous=samples.at(-1)?.phaseAt??observationStart;
  if(now-previous>15000){console.log('[sample-gap] '+JSON.stringify({previousAt:previous,observedAt:now,gapMs:now-previous,limitMs:15000}));throw Error('sample-gap');}}}
function budget(){if(cancelled)throw Error('observation-cancelled');if(performance.now()>deadline)throw Error('observation-deadline');cadence();const storage=storageNow();if(storage.capExceeded){rootDiagnostic('root-cap');throw Error('observation-root-cap');}if(processes.some(p=>p.overflow))throw Error('private-log-cap');cadence();}
async function until(fn,ms=15000){const end=performance.now()+ms;while(performance.now()<end){budget();const v=await fn();if(v)return v;await pause(100);}throw Error('observation-wait-timeout');}
function environment(http,rtsp,stun){const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:path.join(root,'tmp')};
  const values={SKIP_LOCAL_ENV:1,SKIP_BUILD:1,SKIP_ENV_CHECK:1,BUILD_DIR:path.join(repo,'build-gst-onnx'),BIN_PATH:path.join(repo,'build-gst-onnx/media_server'),AUTH_MODE:'auto',ENABLE_AI:0,ENABLE_LAB:0,ENABLE_OPS:1,ENABLE_CLIENT:0,ENABLE_YOUTUBE_SOURCE:0,
    LISTEN_ADDRESS:'127.0.0.1',HTTP_LISTEN_ADDRESS:'127.0.0.1',LISTEN_PORT:rtsp,HTTP_LISTEN_PORT:http,FORCE_RTSP_TCP:1,
    FILE_ROOT:path.join(root,'input'),DEFAULT_FILE:path.join(root,'input/retention-9101.mp4'),STATE_DIR:path.join(root,'state'),AUTH_USERS_FILE:path.join(root,'state/users.json'),
    SOURCE_REGISTRY:path.join(root,'state/sources.json'),PUBLISHED_VIEWS:path.join(root,'state/views.json'),ANALYSIS_REGISTRY:path.join(root,'state/analysis.json'),
    ANALYSIS_EVENT_STORAGE_ENABLED:0,ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),ANALYSIS_EVENT_POST_ENABLED:0,
    ANALYSIS_EVENT_CLIP_HOOK_ENABLED:0,ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:0,ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),
    VA_REVIEW_ENABLED:1,VA_REVIEW_LOCAL_ENDPOINT:'http://127.0.0.1:1',VISUAL_SEARCH_ENABLED:1,VISUAL_SEARCH_MODEL_DIRECTORY:path.join(repo,'models/v430-siglip2'),VISUAL_SEARCH_SCAN_SECONDS:1,VISUAL_SEARCH_SAMPLE_SECONDS:1,EVIDENCE_ENABLED:1,RECORDING_ENABLED:1,RECORDING_STORAGE_ROOT:path.join(root,'recordings'),RECORDING_SEGMENT_DURATION_SECONDS:2,RECORDING_RESERVED_FREE_BYTES:0,RECORDING_RETENTION_INTERVAL_MS:1000,
    VERIFY_FRAME_TRACE:diagnose?1:'bounded',VERIFY_RECORDING_LATENCY_TRACE:1,VERIFY_RECORDING_LATENCY_SLOW_ONLY:1,
    GST_CACHE_DIR:path.join(root,'gst-cache'),GST_PLUGIN_PROFILE:'headless',WEBRTC_STUN_SERVER:`stun://127.0.0.1:${stun}`,WEBRTC_TURN_SERVER:''};
  for(const [k,v] of Object.entries(values))env['MEDIA_SERVER_'+k]=String(v);return env;
}
async function request(app,method,route,body){const begin=performance.now();budget();console.log('[request-budget] '+JSON.stringify({elapsedMs:Math.round(performance.now()-begin)}));
  const response=await measuredHttpResponse({route,method,maxBytes:4*1024*1024,report:value=>console.log('[http-timing] '+JSON.stringify(value)),
    request:()=>fetch(app.base+route,{method,redirect:'error',signal:AbortSignal.timeout(4000),headers:{...(app.cookie?{Cookie:app.cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})});
  if(response.status!==200&&response.status!==201){console.log('[http-failed-response] '+JSON.stringify({method,route,status:response.status,body:response.bytes.toString()}));throw Error('http-status-'+response.status);}
  return JSON.parse(response.bytes.toString());}
const mixed={windows:Array.from({length:3},()=>({structured:0,visual:0,evidence:0,visualEvidence:0})),cycles:0,searchSuccess:0,searchUnavailable:0,searchSuccessByClient:[0,0,0,0],createComplete:0,createPartial:0,createSuccess:0,createBusy:0,retainedChecks:0,deletedSourceObserved:false,searchLatencyMs:[],createLatencyMs:[],visualResults:0,visualCreated:0,visualExpired:0,visualIndexObservations:[]};let nextEvidence=0,savedEvidence=null,savedStructuredEvidence=null;
async function evidenceFetch(app,route,method='GET',body){
 const started=performance.now();const response=await fetch(app.base+route,{method,redirect:'error',signal:AbortSignal.timeout(5000),headers:{Cookie:app.cookie,...(method==='POST'?{'Content-Type':'application/json'}:{})},body:method==='POST'?JSON.stringify(body??{}):undefined});
 const chunks=[];let length=0;for await(const chunk of response.body){length+=chunk.length;if(length>4*1024*1024)throw Error('http-response-byte-limit');chunks.push(chunk);}return {status:response.status,bytes:Buffer.concat(chunks),elapsedMs:performance.now()-started,headers:response.headers};
}
async function verifySavedEvidence(app,afterRestart=false){
 const globalSavedEvidence=savedEvidence;
 for(const savedEvidence of [globalSavedEvidence,savedStructuredEvidence].filter(Boolean)){const result=await evidenceFetch(app,'/ops/api/recordings/evidence/'+savedEvidence.id);check(result.status===200,'V440 saved detail remains readable');const detail=JSON.parse(result.bytes);
 check(JSON.stringify(detail.manifest)===savedEvidence.manifest,'V440 immutable manifest');
 const file=await evidenceFetch(app,'/ops/api/recordings/evidence/'+savedEvidence.id+'/assets/0');
 check(file.status===200&&crypto.createHash('sha256').update(file.bytes).digest('hex')===savedEvidence.sha256,'V440 preserved PNG bytes');
 console.log('[saved-evidence-sources] '+JSON.stringify({atMs:Date.now(),id:savedEvidence.id,afterRestart,currentSources:detail.currentSources}));mixed.deletedSourceObserved ||= detail.currentSources.some(v=>v.state==='deleted');mixed.retainedChecks++;}
 if(afterRestart)check(mixed.deletedSourceObserved,'V440 original actually deleted before restart readback');
}
async function evidenceLoad(app){
 if(performance.now()<nextEvidence)return;nextEvidence+=15000;const window=observationStart===null?null:mixed.windows[Math.min(2,Math.floor((performance.now()-observationStart)/(duration/3)))];
 const query=new URLSearchParams({channelIds:'9101',startTimeMs:String(Date.now()-3600000),endTimeMs:String(Date.now()+60000),includeUnplaced:'true',limit:'20'});
 const routes=[0,1].map(()=>'/ops/api/recordings/search?'+query).concat([0,1].map(()=>'/ops/api/recordings/visual-search?'+new URLSearchParams({channelIds:'9101,9201',text:'ball',threshold:'-1',limit:'20'})));
 const all=await Promise.all(routes.map(route=>evidenceFetch(app,route)));
 const pages=all.slice(0,2),visual=all.slice(2);
 const index=await evidenceFetch(app,'/ops/api/recordings/visual-search/status');check(index.status===200,'PR77 visual worker status');const state=JSON.parse(index.bytes);check(state.enabled===true,'PR77 visual worker enabled');mixed.visualIndexObservations.push({cycle:mixed.cycles,state:state.state,error:state.error,channels:state.channels.map(c=>({channelId:c.channelId,indexedFrames:c.indexedFrames}))});
 for(const [i,result] of visual.entries()){
  check(result.status===200||result.status===503,'PR77 bounded visual status');
  if(result.status===503){check(['visual-index-not-ready','visual-search-unavailable','visual-search-busy','visual-source-unavailable','visual-source-changed'].includes(JSON.parse(result.bytes).error),'PR77 explicit visual unavailability');mixed.searchUnavailable++;continue;}
  const found=JSON.parse(result.bytes);check(found.index&&found.appliedQuery&&found.index.identityScope==='worker-instance','V450-R02 query bound used index');check(found.kind==='visual-frame'&&Array.isArray(found.items)&&found.items.every(v=>['9101','9201'].includes(v.channelId)&&Number.isFinite(v.score)),'PR77 actual visual results');console.log('[visual-query-observation] '+JSON.stringify({atMs:Date.now(),client:i+2,status:result.status,elapsedMs:result.elapsedMs,usedIndex:found.index,appliedQuery:found.appliedQuery,items:found.items.map(v=>({id:v.id,channelId:v.channelId,segmentId:v.playbackUrl.split('/').at(-1)}))}));if(window)window.visual+=found.items.length;mixed.visualResults+=found.items.length;mixed.searchSuccess++;mixed.searchSuccessByClient[i+2]++;mixed.searchLatencyMs.push(result.elapsedMs);
 }
 const chosen=visual.find(v=>v.status===200&&JSON.parse(v.bytes).items.length);
 if(chosen){const candidates=JSON.parse(chosen.bytes).items.filter(v=>progress.records.get(v.playbackUrl.split('/').at(-1))?.state==='finalized');
  candidates.sort((a,b)=>{const x=BigInt(progress.records.get(a.playbackUrl.split('/').at(-1)).order),y=BigInt(progress.records.get(b.playbackUrl.split('/').at(-1)).order);return x<y?-1:x>y?1:0;});check(candidates.length>0,'PR77 observed live visual source');const hit=candidates[0];const saved=await evidenceFetch(app,'/ops/api/recordings/visual-search/evidence?'+new URLSearchParams({channelId:hit.channelId,hitId:hit.id}),'POST');
  check([201,410,503].includes(saved.status),'PR77 visual evidence bounded status');const body=JSON.parse(saved.bytes);
  if(saved.status===201){check(['complete','partial'].includes(body.status),'PR77 visual preservation status');mixed.visualCreated++;if(window)window.visualEvidence++;
   if(!savedEvidence){const detail=await evidenceFetch(app,'/ops/api/recordings/evidence/'+body.id);check(detail.status===200,'PR77 visual detail200');const value=JSON.parse(detail.bytes);check(value.manifest.frames.length>0,'PR77 actual visual PNG');savedEvidence={id:body.id,manifest:JSON.stringify(value.manifest),sha256:value.manifest.assets[0].sha256};}
   console.log('[visual-preserved] '+JSON.stringify({atMs:Date.now(),hitId:hit.id,segmentId:hit.playbackUrl.split('/').at(-1),packageId:body.id,status:body.status}));}
  else if(saved.status===410){check(body.error==='visual-hit-unavailable','PR77 refreshed/deleted hit rejects explicitly');mixed.visualExpired++;}
  else{check(['evidence-busy','visual-index-not-ready','visual-search-busy'].includes(body.error),'PR77 concurrent visual preservation busy');mixed.createBusy++;}
 }

 for(const [client,result] of pages.entries()){check(result.status===200||result.status===503,'V440 bounded parallel search status');if(result.status===503){check(['recording-search-unavailable','search-capacity-exceeded'].includes(JSON.parse(result.bytes).error),'V440 explicit search unavailability');mixed.searchUnavailable++;continue;}mixed.searchSuccess++;mixed.searchSuccessByClient[client]++;mixed.searchLatencyMs.push(result.elapsedMs);}
 const successful=pages.find(v=>v.status===200);if(!successful)return;const page=JSON.parse(successful.bytes);if(!page.items.length){check(!mixed.cycles,'V440 search retains current recordings');return;}
 if(window)window.structured+=page.items.length;query.set('snapshotId',page.snapshotId);query.set('hitId',page.items[0].id);
 const created=await Promise.all([0,1].map(()=>evidenceFetch(app,'/ops/api/recordings/search/evidence?'+query,'POST')));
 console.log('[evidence-create-responses] '+JSON.stringify(created.map(v=>({status:v.status,elapsedMs:v.elapsedMs,body:JSON.parse(v.bytes)}))));
 check(created.some(v=>v.status===201),'V440 concurrent creation admits a request');
 for(const r of created){check(r.status===201||r.status===503,'V440 bounded creation status');if(r.status===503){check(JSON.parse(r.bytes).error==='evidence-busy','V440 concurrent busy explicit');mixed.createBusy++;continue;}
  mixed.createSuccess++;if(window)window.evidence++;mixed.createLatencyMs.push(r.elapsedMs);const saved=JSON.parse(r.bytes);const detail=await evidenceFetch(app,'/ops/api/recordings/evidence/'+saved.id);check(detail.status===200,'V440 new detail200');const value=JSON.parse(detail.bytes);
  check(['complete','partial'].includes(value.manifest.status)&&value.manifest.frames.length<=8,'V440 bounded preserved frame sequence');if(value.manifest.status==='partial'){mixed.createPartial++;check(value.manifest.references.some(v=>['deleted','missing','unsupported'].includes(v.state)),'V440 explicit partial reason');}else{mixed.createComplete++;check(value.manifest.frames.length>=1,'V440 complete contains actual PNG');}
  if(!savedStructuredEvidence&&value.manifest.status==='complete')savedStructuredEvidence={id:saved.id,manifest:JSON.stringify(value.manifest),sha256:value.manifest.assets[0].sha256};
 }
 mixed.cycles++;console.log('[mixed-cycle-progress] '+JSON.stringify({elapsedMs:observationStart===null?null:performance.now()-observationStart,searchClients:mixed.searchSuccessByClient,evidenceCreated:mixed.createSuccess,visualCreated:mixed.visualCreated}));await verifySavedEvidence(app);console.log('[evidence-load] '+JSON.stringify({cycles:mixed.cycles,searchSuccess:mixed.searchSuccess,createSuccess:mixed.createSuccess,createBusy:mixed.createBusy,retainedChecks:mixed.retainedChecks,deletedSourceObserved:mixed.deletedSourceObserved}));
}
async function launch(stun,requiresFrameTrace=true){const http=await reservePort(),rtsp=await reservePort();ports.push(http,rtsp);
  const child=spawn(path.join(repo,'server.sh'),['foreground'],{cwd:repo,env:environment(http,rtsp,stun),stdio:['ignore','pipe','pipe']});
  const log=path.join(root,`server-${processes.length+1}.private.log`),logFd=fs.openSync(log,'wx',0o600);
  const app={child,http,rtsp,base:`http://127.0.0.1:${http}`,bytes:0,log,logFd,requiresFrameTrace};processes.push(app);
  app.cleanup=createProcessCleanup({child,ports:[{kind:'http',port:http},{kind:'rtsp',port:rtsp}],stopServer,assertPortClosed});
  child.on('error',()=>{app.error=true;});child.on('close',()=>{app.closed=true;});
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>captureBoundedProcessLog(app,chunk,bytes=>fs.writeSync(app.logFd,bytes),()=>child.kill('SIGTERM')));
  await until(async()=>{if(app.closed||app.error)throw Error('server-start-failed');try{return !!await request(app,'GET','/health');}catch{return false;}});
  if(!auth)auth=await bootstrapRecordingUiAuth(app.base,passwords);
  else{const response=await fetch(app.base+'/login',{method:'POST',body:new URLSearchParams({username:'admin',password:passwords[0]}),redirect:'manual',signal:AbortSignal.timeout(5000)});check(response.status===302,'A restart authenticated login');auth.cookies[0]=response.headers.getSetCookie().map(v=>v.split(';',1)[0]).join('; ');await response.arrayBuffer();}
  app.cookie=auth.cookies[0];assertLocalIceConfig(await request(app,'GET','/webrtc/config'),stun);check(true,'LP26-O05 isolated server healthy');return app;
}
async function stop(app){if(!app.stopPromise)app.stopPromise=app.cleanup().then(r=>{app.result=r;console.log('[process-cleanup] '+JSON.stringify(r));if(!r.normalShutdownPass)throw Error('server-stop-failed');return r;});return app.stopPromise;}
function source(id){return {sourceId:id,displayName:`S11 recording ${id}`,kind:'file',file:`retention-${id}.mp4`,enabled:true,
  recording:{enabled:true,revision:1,continuousMaxBytes:64*1024*1024+256*1024,eventMaxBytes:134217728,continuousMaxAgeMs:10800000,eventMaxAgeMs:10800000}};}
async function settings(app,enabled){const registry=await request(app,'GET','/ops/api/sources');for(const id of ['9101','9201']){const body=source(id);body.recording=nextRecordingSettings(registry,id,enabled);
  const r=await request(app,'PUT','/ops/api/sources/'+id,body);check(r.source?.recording?.enabled===enabled&&r.source.recording.revision===body.recording.revision,'LP26-O05 setting '+id+' '+enabled);}}
async function drain(now){let result;for(let i=0;i<128;i++){result=await observer.pollAsync();for(const d of progress.consume(result.rows,now)){const file=path.resolve(root,'recordings',d.mediaRelpath);check(file.startsWith(path.join(root,'recordings')+path.sep)&&mediaAbsent(()=>fs.lstatSync(file)),'LP26-O03 deleted media absent');}if(!result.backlog)return result;}throw Error('observer-backlog-cap');}
async function sample(app){const begin=performance.now();let metricsMs=null,drainMs=null,storageMs=null;
  try{const m=await collectProcess(collector,app.child.pid);metricsMs=performance.now()-begin;if(m.valid!==true||m.error!==null)throw Error('process-metrics-invalid');check(m.rssBytes<=4*1024**3,'V440 peak RSS budget');const phaseAt=performance.now();
  if(samples.length>=10000)throw Error('sample-cap');const cpu=spawnSync('ps',['-axo','pid=,ppid=,pcpu='],{encoding:'utf8',timeout:3000,maxBuffer:1024*1024});if(cpu.status!==0)throw Error('cpu-observation');const rows=cpu.stdout.trim().split('\n').map(x=>x.trim().split(/\s+/).map(Number)),own=rows.find(x=>x[0]===app.child.pid);if(!own||!Number.isFinite(own[2]))throw Error('cpu-observation');const children=new Set();let more=true;while(more){more=false;for(const row of rows)if((row[1]===app.child.pid||children.has(row[1]))&&!children.has(row[0])){children.add(row[0]);more=true;}}const previous=samples.at(-1),point={...m,cpuPercent:own[2],childPids:[...children],footprintBytes:null,phaseAt,mutationCount:observer.prefix.length};samples.push(point);
  assertSampleStep(previous,point,observationStart,app.child.pid);
  const drainStart=performance.now();let r;try{r=await drain(phaseAt);point.mutationCount=r.mutationCount;}finally{drainMs=performance.now()-drainStart;}
  const storageStart=performance.now();try{rootDiagnostic('sample');}finally{storageMs=performance.now()-storageStart;}
  console.log('[current-observation] '+JSON.stringify({pid:m.pid,startIdentity:m.startIdentity,sampledAt:m.sampledAt,phaseAt,rssBytes:m.rssBytes,threadCount:m.threadCount,fdCount:m.fdCount,cpuPercent:point.cpuPercent,childPids:point.childPids,footprintBytes:null,footprintState:"not-measured",
    mutationCount:r.mutationCount,typeCounts:r.typeCounts,identityBytes:r.identityBytes,combinedLogicalIds:observer.budget.ids,combinedLogicalBytes:observer.budget.bytes,
    rotations:r.rotations,partialBytes:r.partialBytes,progress:progress.status(phaseAt),resourceTrendPass:false}));cadence();return r;
  }finally{console.log('[sample-timing] '+JSON.stringify({sampleIndex:samples.length,metricsMs,drainMs,storageMs,totalMs:performance.now()-begin}));}
}
function fileHash(file){const h=crypto.createHash('sha256'),fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const chunk=Buffer.alloc(65536);let n;while((n=fs.readSync(fd,chunk,0,chunk.length,null)))h.update(chunk.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
function snapshotEnvironment(){const env={PATH:process.env.PATH,MEDIA_SERVER_ARCHIVE_PHASE_TRACE:'1'},allowed=['GST_REGISTRY','GST_REGISTRY_1_0','GST_PLUGIN_PATH','GST_PLUGIN_PATH_1_0','GST_PLUGIN_SYSTEM_PATH','GST_PLUGIN_SYSTEM_PATH_1_0','GST_PLUGIN_SCANNER','GST_PLUGIN_SCANNER_1_0','DYLD_LIBRARY_PATH','DYLD_FALLBACK_LIBRARY_PATH','MEDIA_SERVER_GST_CACHE_DIR','MEDIA_SERVER_GST_PLUGIN_PROFILE'];for(const key of allowed)if(typeof process.env[key]==='string')env[key]=process.env[key];return env;}
function verifyStatusUsage(status){
  const mediaRoot=path.join(root,'recordings'),expected=new Map(['9101','9201'].map(id=>[id,{alive:0n,history:0n,deleted:0}]));
  for(const record of progress.records.values()){
    const usage=expected.get(record.channel);if(!usage)continue;
    const bytes=BigInt(record.sizeBytes);usage.history+=bytes;
    const file=path.resolve(mediaRoot,record.mediaRelpath);
    if(!file.startsWith(mediaRoot+path.sep))throw Error('status-media-containment');
    if(record.state==='deleted'){
      usage.deleted++;if(fs.existsSync(file))throw Error('status-deleted-media-present');continue;
    }
    if(record.state!=='finalized')throw Error('status-unsettled-segment');
    const stat=fs.lstatSync(file,{bigint:true});
    if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1n||stat.size!==bytes)throw Error('status-physical-size-mismatch');
    usage.alive+=bytes;
  }
  for(const [id,usage] of expected){
    const rows=status.channels?.filter(channel=>channel.channelId===id),row=rows?.[0];
    console.log('[status-usage] '+JSON.stringify({channelId:id,aliveBytes:String(usage.alive),historicalBytes:String(usage.history),deleted:usage.deleted,
      apiContinuousBytes:row?.continuousBytes??null,apiEventBytes:row?.eventBytes??null,physicalFilesChecked:true}));
    check(rows?.length===1&&Number.isSafeInteger(row.continuousBytes)&&row.continuousBytes===Number(usage.alive)&&
      row.eventBytes===0&&usage.deleted>0&&usage.history>usage.alive,'LP26-O11 independent status usage '+id);
  }
}
async function snapshot(){
  if(processes.some(p=>!p.result?.archiveSafe))throw Error('snapshot-live-owner');
  const original=path.join(root,'recordings'),sourceTree=snapshotTree(original);
  if(sourceTree.bytes>=448*1024*1024)throw Error('snapshot-byte-cap');
  const copyParent=fs.realpathSync(process.env.MEDIA_SERVER_TEST_ARTIFACT_ROOT),copyRoot=fs.realpathSync(fs.mkdtempSync(path.join(copyParent,'media-server-current-observer-copy-')));fs.chmodSync(copyRoot,0o700);
  const copyIdentity=diagnosticRootIdentity(copyRoot,copyParent,'current-observer-snapshot'),copy=path.join(copyRoot,'recordings');
  let copied=false,primary=null,result,copyTree=null,receiptPreserved=false,originalUnchanged=false,manifestUnchanged=false,groupClosed=false,childSuccess=false;
  try{
    const admitted=storageNow();workspaceBounds(admitted.totalBytes,workspace.fixedBytes,sourceTree.bytes,workspace.capBytes);
    copyTree=copyVerified(original,copy,sourceTree,n=>workspaceBounds(admitted.totalBytes,workspace.fixedBytes,n,workspace.capBytes));copied=true;if(copyTree.bytes>=448*1024*1024)throw Error('snapshot-byte-cap');
    const manifestEntries=[
      {name:'catalog-source',file:path.join(repo,'src/recording/recording_catalog.cpp')},{name:'catalog-instrumented',file:path.join(root,'catalog-instrumented.cpp')},
      {name:'runtime-archive',file:path.join(repo,'build-gst-onnx/libmedia_server_runtime.a')},{name:'native-source',file:path.join(repo,'scripts/internal/recording_current_observer_native.cpp')},
      {name:'trace-header',file:path.join(repo,'scripts/internal/recording_archive_phase_trace.h')},{name:'generation-observation',file:path.join(repo,'scripts/internal/recording_generation_observation.h')},{name:'native-binary',file:native}],manifest=sourceManifest(manifestEntries);
    const childStart=performance.now(),copyStat=fs.lstatSync(copyRoot);
    const r=await runCurrentRecovery({command:native,args:['--snapshot',copy],env:{...snapshotEnvironment(),TMPDIR:copyRoot,HOME:copyRoot},
      onGroup:event=>{const file=process.env.MEDIA_SERVER_OWNED_RECOVERY_GROUPS;if(!file)throw Error('recovery-owner-registry');fs.appendFileSync(file,JSON.stringify(event)+'\n');},
      observe:()=>storageNow({root:copyRoot,identity:{dev:copyStat.dev,ino:copyStat.ino}})});
    console.log('[workspace-copy-monitor] '+JSON.stringify(r.monitor));
    const child=summarizeSpawnDiagnostic(r,{elapsedMs:performance.now()-childStart}),trace=validatedPhaseReceipt(r.stderr);console.log('[snapshot-process] '+JSON.stringify(child));
    groupClosed=r.groupClosed;childSuccess=groupClosed&&!r.error&&!r.signal&&r.status===0&&!r.monitor.failure;
    try{const after=snapshotTree(original);originalUnchanged=after.sha256===sourceTree.sha256&&after.bytes===sourceTree.bytes&&after.count===sourceTree.count;}catch{}
    try{manifestUnchanged=JSON.stringify(sourceManifest(manifestEntries))===JSON.stringify(manifest);}catch{}
    const receiptPath=path.join(process.env.MEDIA_SERVER_RECORDING_RECEIPT_DIR??'',`o28-current-snapshot-${crypto.randomUUID()}.json`);
    const receipt=preserveDiagnosticReceipt({evidencePath:receiptPath,receipt:{schema:'media-server.recording-diagnostic-receipt.v1',profile:'current-observer-snapshot',child,trace,
      command:{name:'recording-current-observer-native',args:['--snapshot','owned-copy'],timeoutMs:15000,maxBuffer:16384},sourceTree:receiptTree(sourceTree),
      copyTree:receiptTree(copyTree),originalUnchanged,manifestUnchanged,groupClosed,limits:{treeBytes:448*1024*1024,treeEntries:4096},manifest,rawPathsPublished:false}});
    receiptPreserved=receipt.preserved;console.log('[snapshot-receipt] '+JSON.stringify({...receipt,rawPathsPublished:false}));
    check(childSuccess,'LP26-O05 stopped copy native catalog recovery');
    result=JSON.parse(r.stdout);check(result.catalogRecovered===true&&result.available>0&&result.deleted>0,'LP26-O05 native surviving and deleted states');
    // 이름 하나가 아닌 원본 전체 파일의 경로·크기·해시를 대조한다(B/legacy 모두).
    check(originalUnchanged,'LP26-O05 original journal bytes unchanged');
  }catch(error){primary=error;
  }finally{let bytes=null,reason=null,absent=false;try{bytes=size(copyRoot);}catch{reason='size-unavailable';}
    if(!primary&&childSuccess&&receiptPreserved&&originalUnchanged&&manifestUnchanged&&groupClosed)try{removeDiagnosticRoot(copyRoot,copyIdentity,true);absent=!fs.existsSync(copyRoot);}catch{reason='remove-failed';}
    else reason='preserved-for-diagnostic';
    console.log('[copy-cleanup] '+JSON.stringify({root:copyRoot,bytes,copied,absent,reason,receiptPreserved,originalUnchanged,manifestUnchanged,groupClosed}));
    if(!absent){fs.writeFileSync(path.join(root,'cleanup-blocked'),'recovery copy or evidence cleanup unresolved\n',{mode:0o600});if(!primary)primary=Error('snapshot-preserved');}
    if(absent&&reason===null)check(true,'LP26-O05 recovery copy cleanup');else if(primary){failed++;console.log('[fail] LP26-O05 recovery copy cleanup');}else check(false,'LP26-O05 recovery copy cleanup');}
  if(primary)throw primary;return result;
}
try{
  check(fs.statSync(path.join(repo,'build-gst-onnx/media_server')).isFile()&&(fs.statSync(path.join(repo,'build-gst-onnx/media_server')).mode&0o111)!==0,'LP26-O05 fixed current executable');
  for(const d of ['input','state','events/clips','events/snapshots','recordings','tmp'])fs.mkdirSync(path.join(root,d),{recursive:true,mode:0o700});
  const seedOptions={fixture:process.env.MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN,repo,artifacts};
  runReviewSeed({...seedOptions,root,mode:'--seed'});
  runReviewSeed({...seedOptions,root:path.join(root,'recordings'),mode:'--confirmed-seed'});
  seedInfo=JSON.parse(fs.readFileSync(path.join(root,'recordings/confirmed-seed.json')));
  const seededMedia=[];function collectSeeded(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())collectSeeded(file);else if(entry.isFile()&&entry.name.endsWith('.mp4'))seededMedia.push(file);}}collectSeeded(path.join(root,'recordings'));check(seededMedia.length===1,'A one original seeded media');fs.copyFileSync(seededMedia[0],path.join(root,'input/a-seed.mp4'),fs.constants.COPYFILE_EXCL);
  const generationStart=performance.now();
  const generated=spawnSync('gst-launch-1.0',['-q','-e','videotestsrc','num-buffers=120','pattern=ball','!','video/x-raw,format=I420,width=160,height=90,framerate=30/1','!','x264enc','tune=zerolatency','speed-preset=ultrafast','pass=quant','quantizer=0','key-int-max=30','!','h264parse','!','mp4mux','!','filesink',`location=${path.join(root,'input/retention.mp4')}`],{encoding:'utf8',timeout:30000,maxBuffer:65536,env:{...process.env,TMPDIR:path.join(root,'tmp')}});
  let generatedBytes=null;try{const s=fs.lstatSync(path.join(root,'input/retention.mp4'));if(s.isFile()&&s.nlink===1)generatedBytes=s.size;}catch{}
  console.log('[fixture-generation] '+JSON.stringify(summarizeFixtureGeneration(generated,{elapsedMs:Math.round(performance.now()-generationStart),outputBytes:generatedBytes})));
  check(generated.status===0&&!generated.error&&!generated.signal&&generatedBytes!==null&&generatedBytes>0&&generatedBytes<96*1024*1024,'LP26-O05 original bounded retention fixture');
  budget();
  for(const id of ['9101','9201']){fs.copyFileSync(path.join(root,'input/retention.mp4'),path.join(root,'input',source(id).file),fs.constants.COPYFILE_EXCL);budget();}
  fs.unlinkSync(path.join(root,'input/retention.mp4'));
  if(!diagnose){workspace=freezeCurrentWorkspace(root);console.log('[workspace-fixed] '+JSON.stringify(workspace));}
  check(new Set(['9101','9201'].map(id=>fs.realpathSync(path.join(root,'input',source(id).file)))).size===2,'LP26-O05 distinct canonical sources');
  fs.writeFileSync(path.join(root,'state/sources.json'),JSON.stringify({sources:[{sourceId:'1',displayName:'Synthetic A observations',kind:'file',file:'a-seed.mp4',enabled:false,recording:{enabled:false}}]}));fs.writeFileSync(path.join(root,'state/views.json'),JSON.stringify({views:[]}));
  udp=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});const stun=udp.address().port;
  const first=await launch(stun),initial=await request(first,'GET','/ops/api/recordings/status');
  const initialIds=initial.channels?.map(c=>c.channelId);
  check(Array.isArray(initialIds)&&initialIds.every(id=>/^[A-Za-z0-9_-]+$/.test(id)&&!['9101','9201'].includes(id))&&
    (initialIds.length===0||disabledChannelsExact(initial,initialIds)),'LP26-O05 independent initial channels');
  const expectedIds=[...initialIds,'9101','9201'];
  for(const id of ['9101','9201'])await request(first,'POST','/ops/api/sources',source(id));
  // 등록 응답은 비동기 녹화 worker의 활성 완료 응답이 아니다. 동일 총예산 안에서 기존15초 readiness를 관측한다.
  await until(async()=>{const status=await request(first,'GET','/ops/api/recordings/status');const rows=['9101','9201'].map(id=>status.channels?.find(c=>c.channelId===id));
    console.log('[channel-readiness] '+JSON.stringify(rows.map(c=>c?{channelId:c.channelId,enabled:c.enabled,active:c.active,storageBlocked:c.storageBlocked}:null)));
    if(rows.some(c=>c?.storageBlocked))throw Error('recording-readiness-blocked');return rows.every(c=>c?.enabled&&c.active);});
  aLoad=new MixedALoad({root,seedInfo,request:evidenceFetch,check,budget});
  const begin=performance.now(),observationBudget=new CurrentObservationBudget();observationStart=begin;nextEvidence=begin;progress=new CurrentLongrunProgress(begin,['9101','9201'],observationBudget);observer=new CurrentRecordingObserver(path.join(root,'recordings'),native,observationBudget);
  aLoad.start(begin,duration);
  while(performance.now()-begin<duration){
    await sample(first);const status=await request(first,'GET','/ops/api/recordings/status');
    for(const id of ['9101','9201']){const c=status.channels?.filter(c=>c.channelId===id);check(c?.length===1&&c[0].enabled&&c[0].active&&!c[0].storageBlocked,'LP26-O05 active '+id);}
    await evidenceLoad(first);await aLoad.tick(first);cadence();
    const sleepMs=nextSampleDelay(samples.at(-1).phaseAt,performance.now(),begin+duration);
    if(sleepMs>0)await pause(sleepMs);cadence();}
  await aLoad.finish(first);if(!short)requireMixedWindows(mixed.windows);
  check(mixed.cycles>0&&mixed.createComplete>0&&mixed.searchSuccessByClient.every(n=>n>0)&&mixed.visualResults>0&&mixed.visualCreated>0,"V440 actual mixed work occurred");const orderedLatencies=[...mixed.searchLatencyMs].sort((a,b)=>a-b);check(orderedLatencies.at(Math.ceil(orderedLatencies.length*.95)-1)<=2000&&orderedLatencies.at(-1)<=5000,"V440 successful search latency");await sample(first);const end=performance.now();check(sampleContinuity(samples,begin,end,first.child.pid,samples[0].startIdentity),'LP26-O04 sample coverage');
  phaseResult=progress.status(end);if(!short&&!diagnose)check(phaseResult.elapsedMs>=7200000,"V440 actual120 duration");
  check(Object.values(phaseResult.channels).every(c=>c.finalized>0&&c.deleted>0),'LP26-O05 both channels retained and progressed');
  summary=summarizeCurrentSamples(samples);observationStart=null;if(!diagnose)await aLoad.controls(first,passwords[1]);progress.setActive(performance.now(),false);await settings(first,false);await stop(first);
  const tail=await drain(performance.now());check(closedJournalComplete(tail),'LP26-O02 closed journal no partial tail');
  if(!diagnose){const before=await snapshot();
  const second=await launch(stun,false);const s=await request(second,'GET','/ops/api/recordings/status');
  verifyStatusUsage(s);
  console.log('[channel-observation] '+JSON.stringify({expectedIds,channels:s.channels?.map(c=>({id:c.channelId,enabled:c.enabled,active:c.active}))}));
  check(disabledChannelsExact(s,expectedIds),'LP26-O05 disabled restart');
  await verifySavedEvidence(second,true);await aLoad.readback(second);await stop(second);const after=await snapshot();check(JSON.stringify(before)===JSON.stringify(after),'LP26-O05 restart exact catalog media state');
  const third=await launch(stun);const known=Object.fromEntries(Object.entries(progress.channels).map(([id,c])=>[id,c.finalized]));await settings(third,true);progress.setActive(performance.now(),true);
  await until(async()=>{await drain(performance.now());return Object.entries(progress.channels).every(([id,c])=>c.finalized>known[id]);},30000);check(true,'LP26-O05 reenabled recording after restart');await evidenceLoad(third);await aLoad.reactivate(third);await stop(third);
  check(closedJournalComplete(await drain(performance.now())),'LP26-O02 final restart closed journal no partial tail');await snapshot();}
  }catch(error){failed++;try{rootDiagnostic('failure-live',storageNow(),true);}catch{console.log('[root-storage] '+JSON.stringify({reason:'failure-live',final:true,measurementAvailable:false,journalMutationTypes:observer?{...observer.typeCounts}:null,journalMutationTypesCoverage:observer?'drained-prefix-only; unread-or-partial-tail-excluded':'observer-unavailable',rawPathsPublished:false}));}console.error('[fail] current observation: '+(error?.message?.match(/^[a-zA-Z0-9 .:-]+$/)?error.message:'redacted-error'));}
finally{
  observationStart=null;summary=summarizeAvailableSamples(samples);
  try{rootDiagnostic('final-live',storageNow(),true);}catch{console.log('[root-storage] '+JSON.stringify({reason:'final-live',final:true,measurementAvailable:false,journalMutationTypes:observer?{...observer.typeCounts}:null,journalMutationTypesCoverage:observer?'drained-prefix-only; unread-or-partial-tail-excluded':'observer-unavailable',rawPathsPublished:false}));}
  for(const app of processes)try{await stop(app);}catch{failed++;}
  try{rootDiagnostic('post-stop',{...measureCurrentRootStable(root,{sqlitePages:true}),...storageNow()},true);}catch{failed++;console.log('[root-storage] '+JSON.stringify({reason:'post-stop',final:true,measurementAvailable:false,journalMutationTypes:observer?{...observer.typeCounts}:null,journalMutationTypesCoverage:observer?'drained-prefix-only; unread-or-partial-tail-excluded':'observer-unavailable',rawPathsPublished:false}));}
  for(const app of processes){try{fs.closeSync(app.logFd);const text=fs.readFileSync(app.log,'utf8');
    const categories=['file evidence unavailable','storageBlocked','shutdown','ERROR','WARNING'].map(code=>({code,count:text.split(code).length-1}));
    const blocked=fs.existsSync(path.join(root,'cleanup-blocked'));
    console.log('[server-diagnostic] '+JSON.stringify({pid:app.child.pid,bytes:app.bytes,capturedBytes:Buffer.byteLength(text),sha256:fileHash(app.log),overflow:!!app.overflow,captureError:app.captureError??null,categories,rawBodyPublished:false,privateCaptureDisposition:blocked?'preserved-with-owned-root':'eligible-for-wrapper-cleanup'}));
    if(!processLogCaptureComplete(app,Buffer.byteLength(text))){failed++;console.log('[fail] process-log-collection');}
    const frameTrace=frameTraceSummary(text,diagnose?'full':'bounded',app.requiresFrameTrace);console.log('[frame-trace-summary] '+JSON.stringify(frameTrace));
    if(frameTrace.status!=='captured'&&!(frameTrace.status==='not-observed'&&!app.requiresFrameTrace)){failed++;console.log('[fail] frame-trace-incomplete');}
    const slow=slowTraceSummary(text,app.result?.normalShutdownPass===true);console.log('[server-slow-diagnostic] '+JSON.stringify(slow));
    if(slow.status!=='captured'){failed++;console.log('[fail] slow-diagnostic-unavailable');}
  }catch{failed++;console.log('[fail] server-diagnostic-capture');}}
  try{if(observer)await observer.closeAsync();}catch{failed++;try{fs.writeFileSync(path.join(root,'cleanup-blocked'),'observer transport cleanup unresolved\n',{mode:0o600});}catch{}}if(udp)try{await new Promise(r=>udp.close(r));udpClosed=true;}catch{failed++;}else udpClosed=true;
  if(!udpClosed||processes.some(p=>!p.result?.archiveSafe)){fs.writeFileSync(path.join(root,'cleanup-blocked'),'process or port safety unresolved\n',{mode:0o600});failed++;}
  const final={mode:short?'v450-mixed-preparation':diagnose?'v450-frame-diagnostic':'v450-recording-search-evidence-A-mixed-120',passed,failed,elapsedMs:Math.round(performance.now()-start),verifiedDurationMs:phaseResult?.elapsedMs??null,
    longrunObservationCompleted:!short&&!diagnose&&failed===0&&!!phaseResult,shortPreparationPass:short&&failed===0,frameDiagnosticPass:diagnose&&failed===0&&!!phaseResult,resourceTrendPass:false,reviewRequired:true,uiFulltestPass:false,
    evidenceLoad:mixed,aLoad:aLoad?.report()??null,phase:phaseResult??null,resources:summary??null,processCount:processes.length,processesClosed:processes.every(p=>p.result?.normalShutdownPass),udpClosed,
    footprintState:'not-measured',cpu:{maxPercent:samples.length?Math.max(...samples.map(s=>s.cpuPercent)):null},tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'};artifacts.checkpoint({...final,status:failed?'FAIL':'PASS',exit:failed?1:0});console.log(JSON.stringify(final));process.exitCode=failed?1:0;
}
