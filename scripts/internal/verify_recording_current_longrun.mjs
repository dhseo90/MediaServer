// 파일 용도: 현행 2채널 녹화·보존·재기동 관측. 짧은 준비 실행은 장시간/자원/UI PASS가 아니다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import dgram from 'node:dgram';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CurrentRecordingObserver,CurrentLongrunProgress,CurrentObservationBudget,summarizeCurrentSamples,closedJournalComplete,disabledChannelsExact,measureCurrentRoot,summarizeFixtureGeneration} from './recording_current_observer.mjs';
import {collectProcess} from './recording_foundation_observer.mjs';
import {parseLongrunArgs,sampleContinuity,nextRecordingSettings,mediaAbsent} from './recording_longrun_progress.mjs';
import {reservePort,stopServer,assertPortClosed} from './verify_v410_recording_ui_contract.mjs';
import {createProcessCleanup} from './recording_process_cleanup.mjs';
import {assertLocalIceConfig} from './verify_local_ice_guard.mjs';
const root=process.argv[2],args=process.argv.slice(3),short=args.length===1&&args[0]==='--app-observe';
const duration=short?30000:parseLongrunArgs(args),repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
if(!path.isAbsolute(root)||fs.realpathSync(root)!==root||!path.basename(root).startsWith('media-server-current-observer-')||(fs.statSync(root).mode&0o777)!==0o700)throw Error('owned-run-root');
const start=performance.now(),deadline=start+(short?180000:7380000),processes=[],samples=[],ports=[];
const native=path.join(root,'normalize'),collector=path.join(root,'process-metrics');
let cancelled=false,failed=0,passed=0,observer,progress,phaseResult,summary,udp,udpClosed=false;
process.on('SIGTERM',()=>{cancelled=true;});process.on('SIGINT',()=>{cancelled=true;});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function check(ok,label){if(!ok)throw Error(label);passed++;console.log('[pass] '+label);}
function size(dir){let bytes=0,entries=0;function visit(p){const s=fs.lstatSync(p);if(++entries>100000)throw Error('root-entry-bound');
  if(s.isSymbolicLink()){if(!p.startsWith(path.join(root,'gst-cache')+path.sep))throw Error('root-unsafe-symlink');bytes+=s.size;return;}
  if(s.isDirectory())for(const n of fs.readdirSync(p))visit(path.join(p,n));else{if(!s.isFile()||s.nlink!==1)throw Error('root-unsafe-file');bytes+=s.size;}}visit(dir);return bytes;}
function rootDiagnostic(reason,measurement=measureCurrentRoot(root)){console.log('[root-storage] '+JSON.stringify({reason,elapsedMs:Math.round(performance.now()-start),...measurement}));return measurement;}
function budget(){if(cancelled)throw Error('observation-cancelled');if(performance.now()>deadline)throw Error('observation-deadline');const storage=measureCurrentRoot(root);if(storage.capExceeded){rootDiagnostic('root-cap',storage);throw Error('observation-root-cap');}if(processes.some(p=>p.overflow))throw Error('private-log-cap');}
async function until(fn,ms=15000){const end=performance.now()+ms;while(performance.now()<end){budget();const v=await fn();if(v)return v;await pause(100);}throw Error('observation-wait-timeout');}
function environment(http,rtsp,stun){const env={PATH:process.env.PATH,HOME:root,TMPDIR:path.join(root,'tmp')};
  const values={SKIP_LOCAL_ENV:1,SKIP_BUILD:1,BIN_PATH:path.join(repo,'build-gst-onnx/media_server'),AUTH_MODE:'off',ENABLE_AI:0,ENABLE_LAB:0,ENABLE_OPS:1,ENABLE_CLIENT:0,ENABLE_YOUTUBE_SOURCE:0,
    LISTEN_ADDRESS:'127.0.0.1',HTTP_LISTEN_ADDRESS:'127.0.0.1',LISTEN_PORT:rtsp,HTTP_LISTEN_PORT:http,FORCE_RTSP_TCP:1,
    FILE_ROOT:path.join(root,'input'),DEFAULT_FILE:path.join(root,'input/retention-9101.mp4'),STATE_DIR:path.join(root,'state'),AUTH_USERS_FILE:path.join(root,'state/users.json'),
    SOURCE_REGISTRY:path.join(root,'state/sources.json'),PUBLISHED_VIEWS:path.join(root,'state/views.json'),ANALYSIS_REGISTRY:path.join(root,'state/analysis.json'),
    ANALYSIS_EVENT_STORAGE_ENABLED:0,ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),ANALYSIS_EVENT_POST_ENABLED:0,
    ANALYSIS_EVENT_CLIP_HOOK_ENABLED:0,ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:0,ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),
    RECORDING_ENABLED:1,RECORDING_STORAGE_ROOT:path.join(root,'recordings'),RECORDING_SEGMENT_DURATION_SECONDS:2,RECORDING_RESERVED_FREE_BYTES:0,RECORDING_RETENTION_INTERVAL_MS:1000,
    GST_CACHE_DIR:path.join(root,'gst-cache'),GST_PLUGIN_PROFILE:'headless',WEBRTC_STUN_SERVER:`stun://127.0.0.1:${stun}`,WEBRTC_TURN_SERVER:''};
  for(const [k,v] of Object.entries(values))env['MEDIA_SERVER_'+k]=String(v);return env;
}
async function request(app,method,route,body){budget();const response=await fetch(app.base+route,{method,redirect:'error',signal:AbortSignal.timeout(4000),headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  if(response.status!==200&&response.status!==201)throw Error('http-status-'+response.status);
  const chunks=[];let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;if(bytes>4*1024*1024)throw Error('http-body-cap');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());}
async function launch(stun){const http=await reservePort(),rtsp=await reservePort();ports.push(http,rtsp);
  const child=spawn(path.join(repo,'server.sh'),['foreground'],{cwd:repo,env:environment(http,rtsp,stun),stdio:['ignore','pipe','pipe']});
  const log=path.join(root,`server-${processes.length+1}.private.log`),logFd=fs.openSync(log,'wx',0o600);
  const app={child,http,rtsp,base:`http://127.0.0.1:${http}`,bytes:0,log,logFd};processes.push(app);
  app.cleanup=createProcessCleanup({child,ports:[{kind:'http',port:http},{kind:'rtsp',port:rtsp}],stopServer,assertPortClosed});
  child.on('error',()=>{app.error=true;});child.on('close',()=>{app.closed=true;});
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{app.bytes+=chunk.length;if(app.bytes>4*1024*1024){app.overflow=true;child.kill('SIGTERM');return;}
    try{fs.writeSync(app.logFd,chunk);}catch{app.overflow=true;child.kill('SIGTERM');}});
  await until(async()=>{if(app.closed||app.error)throw Error('server-start-failed');try{return !!await request(app,'GET','/health');}catch{return false;}});
  assertLocalIceConfig(await request(app,'GET','/webrtc/config'),stun);check(true,'LP26-O05 isolated server healthy');return app;
}
async function stop(app){if(!app.stopPromise)app.stopPromise=app.cleanup().then(r=>{app.result=r;console.log('[process-cleanup] '+JSON.stringify(r));if(!r.normalShutdownPass)throw Error('server-stop-failed');return r;});return app.stopPromise;}
function source(id){return {sourceId:id,displayName:`S11 recording ${id}`,kind:'file',file:`retention-${id}.mp4`,enabled:true,
  recording:{enabled:true,revision:1,continuousMaxBytes:134217728,eventMaxBytes:134217728,continuousMaxAgeMs:10800000,eventMaxAgeMs:10800000}};}
async function settings(app,enabled){const registry=await request(app,'GET','/ops/api/sources');for(const id of ['9101','9201']){const body=source(id);body.recording=nextRecordingSettings(registry,id,enabled);
  const r=await request(app,'PUT','/ops/api/sources/'+id,body);check(r.source?.recording?.enabled===enabled&&r.source.recording.revision===body.recording.revision,'LP26-O05 setting '+id+' '+enabled);}}
function drain(now){let result;for(let i=0;i<128;i++){result=observer.poll();for(const d of progress.consume(result.rows,now)){const file=path.resolve(root,'recordings',d.mediaRelpath);check(file.startsWith(path.join(root,'recordings')+path.sep)&&mediaAbsent(()=>fs.lstatSync(file)),'LP26-O03 deleted media absent');}if(!result.backlog)return result;}throw Error('observer-backlog-cap');}
async function sample(app){const m=await collectProcess(collector,app.child.pid);if(m.valid!==true||m.error!==null)throw Error('process-metrics-invalid');const phaseAt=performance.now(),r=drain(phaseAt);
  rootDiagnostic('sample');
  if(samples.length>=10000)throw Error('sample-cap');samples.push({...m,phaseAt,mutationCount:r.mutationCount});
  console.log('[current-observation] '+JSON.stringify({pid:m.pid,startIdentity:m.startIdentity,sampledAt:m.sampledAt,phaseAt,rssBytes:m.rssBytes,threadCount:m.threadCount,fdCount:m.fdCount,
    mutationCount:r.mutationCount,typeCounts:r.typeCounts,identityBytes:r.identityBytes,combinedLogicalIds:observer.budget.ids,combinedLogicalBytes:observer.budget.bytes,
    rotations:r.rotations,partialBytes:r.partialBytes,progress:progress.status(phaseAt),resourceTrendPass:false}));return r;
}
function fileHash(file){const h=crypto.createHash('sha256'),fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const chunk=Buffer.alloc(65536);let n;while((n=fs.readSync(fd,chunk,0,chunk.length,null)))h.update(chunk.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
function snapshot(){
  if(processes.some(p=>!p.result?.archiveSafe))throw Error('snapshot-live-owner');
  const original=path.join(root,'recordings'),file=path.join(original,'recording-v2-mutations.jsonl'),before=fileHash(file);
  const copyRoot=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-current-observer-copy-')));fs.chmodSync(copyRoot,0o700);
  const copy=path.join(copyRoot,'recordings');let copied=false;
  try{
    // 원본의 검사 한도는 그대로 유지한다. 종료 후 복제는 별도 소유 root, 동일448MiB 상한이며 즉시 정리한다.
    if(size(original)>=448*1024*1024)throw Error('snapshot-byte-cap');
    fs.cpSync(original,copy,{recursive:true,dereference:false,errorOnExist:true,force:false});copied=true;
    if(size(copy)>=448*1024*1024)throw Error('snapshot-byte-cap');
    const r=spawnSync(native,['--snapshot',copy],{encoding:'utf8',timeout:15000,maxBuffer:16384,env:{PATH:process.env.PATH}});check(!r.error&&!r.signal&&r.status===0,'LP26-O05 stopped copy native catalog recovery');
    const result=JSON.parse(r.stdout);check(result.catalogRecovered===true&&result.available>0&&result.deleted>0,'LP26-O05 native surviving and deleted states');
    check(before===fileHash(file),'LP26-O05 original journal bytes unchanged');return result;
  }finally{let bytes=null,reason=null;try{bytes=size(copyRoot);}catch{reason='size-unavailable';}
    try{fs.rmSync(copyRoot,{recursive:true});}catch{reason='remove-failed';}
    const absent=!fs.existsSync(copyRoot);console.log('[copy-cleanup] '+JSON.stringify({root:copyRoot,bytes,copied,absent,reason}));
    if(!absent)fs.writeFileSync(path.join(root,'cleanup-blocked'),'recovery copy cleanup unresolved\n',{mode:0o600});
    check(absent&&reason===null,'LP26-O05 recovery copy cleanup');}
}
try{
  check(fs.statSync(path.join(repo,'build-gst-onnx/media_server')).isFile()&&(fs.statSync(path.join(repo,'build-gst-onnx/media_server')).mode&0o111)!==0,'LP26-O05 fixed current executable');
  for(const d of ['input','state','events/clips','events/snapshots','recordings','tmp'])fs.mkdirSync(path.join(root,d),{recursive:true,mode:0o700});
  const generationStart=performance.now();
  const generated=spawnSync('gst-launch-1.0',['-q','-e','videotestsrc','num-buffers=120','pattern=snow','!','video/x-raw,width=640,height=360,framerate=30/1','!','x264enc','tune=zerolatency','speed-preset=ultrafast','pass=quant','quantizer=0','key-int-max=30','!','h264parse','!','mp4mux','!','filesink',`location=${path.join(root,'input/retention.mp4')}`],{encoding:'utf8',timeout:30000,maxBuffer:65536,env:{...process.env,TMPDIR:path.join(root,'tmp')}});
  let generatedBytes=null;try{const s=fs.lstatSync(path.join(root,'input/retention.mp4'));if(s.isFile()&&s.nlink===1)generatedBytes=s.size;}catch{}
  console.log('[fixture-generation] '+JSON.stringify(summarizeFixtureGeneration(generated,{elapsedMs:Math.round(performance.now()-generationStart),outputBytes:generatedBytes})));
  check(generated.status===0&&!generated.error&&!generated.signal&&generatedBytes!==null&&generatedBytes>0&&generatedBytes<96*1024*1024,'LP26-O05 original bounded retention fixture');
  for(const id of ['9101','9201'])fs.copyFileSync(path.join(root,'input/retention.mp4'),path.join(root,'input',source(id).file),fs.constants.COPYFILE_EXCL);
  fs.unlinkSync(path.join(root,'input/retention.mp4'));
  check(new Set(['9101','9201'].map(id=>fs.realpathSync(path.join(root,'input',source(id).file)))).size===2,'LP26-O05 distinct canonical sources');
  fs.writeFileSync(path.join(root,'state/sources.json'),JSON.stringify({sources:[]}));fs.writeFileSync(path.join(root,'state/views.json'),JSON.stringify({views:[]}));
  udp=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});const stun=udp.address().port;
  const first=await launch(stun),initial=await request(first,'GET','/ops/api/recordings/status');
  const initialIds=initial.channels?.map(c=>c.channelId);
  check(Array.isArray(initialIds)&&initialIds.every(id=>/^[A-Za-z0-9_-]+$/.test(id)&&!['9101','9201'].includes(id))&&
    (initialIds.length===0||disabledChannelsExact(initial,initialIds)),'LP26-O05 independent initial channels');
  const expectedIds=[...initialIds,'9101','9201'];
  for(const id of ['9101','9201'])await request(first,'POST','/ops/api/sources',source(id));
  const begin=performance.now(),observationBudget=new CurrentObservationBudget();progress=new CurrentLongrunProgress(begin,['9101','9201'],observationBudget);observer=new CurrentRecordingObserver(path.join(root,'recordings'),native,observationBudget);
  while(performance.now()-begin<duration){await sample(first);const status=await request(first,'GET','/ops/api/recordings/status');
    for(const id of ['9101','9201']){const c=status.channels?.filter(c=>c.channelId===id);check(c?.length===1&&c[0].enabled&&c[0].active&&!c[0].storageBlocked,'LP26-O05 active '+id);}
    await pause(Math.min(5000,Math.max(0,duration-(performance.now()-begin))));}
  await sample(first);const end=performance.now();check(sampleContinuity(samples,begin,end,first.child.pid,samples[0].startIdentity),'LP26-O04 sample coverage');
  phaseResult=short?progress.status(end):progress.finish(end);check(Object.values(phaseResult.channels).every(c=>c.finalized>0&&c.deleted>0),'LP26-O05 both channels retained and progressed');
  summary=summarizeCurrentSamples(samples);progress.setActive(performance.now(),false);await settings(first,false);await stop(first);
  const tail=drain(performance.now());check(closedJournalComplete(tail),'LP26-O02 closed journal no partial tail');const before=snapshot();
  const second=await launch(stun);const s=await request(second,'GET','/ops/api/recordings/status');
  console.log('[channel-observation] '+JSON.stringify({expectedIds,channels:s.channels?.map(c=>({id:c.channelId,enabled:c.enabled,active:c.active}))}));
  check(disabledChannelsExact(s,expectedIds),'LP26-O05 disabled restart');
  await stop(second);const after=snapshot();check(JSON.stringify(before)===JSON.stringify(after),'LP26-O05 restart exact catalog media state');
  const third=await launch(stun);const known=Object.fromEntries(Object.entries(progress.channels).map(([id,c])=>[id,c.finalized]));await settings(third,true);progress.setActive(performance.now(),true);
  await until(async()=>{drain(performance.now());return Object.entries(progress.channels).every(([id,c])=>c.finalized>known[id]);},30000);check(true,'LP26-O05 reenabled recording after restart');await stop(third);
  check(closedJournalComplete(drain(performance.now())),'LP26-O02 final restart closed journal no partial tail');snapshot();
}catch(error){failed++;try{rootDiagnostic('failure');}catch{console.log('[root-storage] '+JSON.stringify({reason:'failure',measurementAvailable:false,rawPathsPublished:false}));}console.error('[fail] current observation: '+(error?.message?.match(/^[a-zA-Z0-9 .:-]+$/)?error.message:'redacted-error'));}
finally{
  for(const app of processes)try{await stop(app);}catch{failed++;}
  for(const app of processes){try{fs.closeSync(app.logFd);const text=fs.readFileSync(app.log,'utf8');
    const categories=['file evidence unavailable','storageBlocked','shutdown','ERROR','WARNING'].map(code=>({code,count:text.split(code).length-1}));
    console.log('[server-diagnostic] '+JSON.stringify({pid:app.child.pid,bytes:app.bytes,capturedBytes:Buffer.byteLength(text),sha256:fileHash(app.log),overflow:!!app.overflow,categories,rawBodyPublished:false,privateCaptureRemovedWithRoot:true}));
  }catch{failed++;console.log('[fail] server-diagnostic-capture');}}
  observer?.close();if(udp)try{await new Promise(r=>udp.close(r));udpClosed=true;}catch{failed++;}else udpClosed=true;
  if(!udpClosed||processes.some(p=>!p.result?.archiveSafe)){fs.writeFileSync(path.join(root,'cleanup-blocked'),'process or port safety unresolved\n',{mode:0o600});failed++;}
  console.log(JSON.stringify({mode:short?'current-app-observe-short':'current-recording-120',passed,failed,elapsedMs:Math.round(performance.now()-start),verifiedDurationMs:phaseResult?.elapsedMs??null,
    longrunObservationCompleted:!short&&failed===0&&!!phaseResult,shortPreparationPass:short&&failed===0,resourceTrendPass:false,reviewRequired:true,uiFulltestPass:false,
    phase:phaseResult??null,resources:summary??null,processCount:processes.length,processesClosed:processes.every(p=>p.result?.normalShutdownPass),udpClosed,
    tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));process.exitCode=failed?1:0;
}
