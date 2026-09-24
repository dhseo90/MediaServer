// 파일 용도: 실제 제품 두 기동의 이벤트/출력 상관. 공개 이벤트 JSONL 외 원장 JSON을 읽지 않는다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import dgram from 'node:dgram';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reservePort,stopServer,assertPortClosed} from './verify_v410_recording_ui_contract.mjs';
import {assertLocalIceConfig} from './verify_local_ice_guard.mjs';
import {dispatchTuple,correlatedEvent} from './recording_event_correlation.mjs';
import {allTimelinePages,eventOutputs,verifyRestart,measuredHttpResponse,summarizeEventState,createTerminalObservation,requireCompletionEvidence} from './recording_current_app_helpers.mjs';
import {failedWindowGate,requireFailedWindowDispatch,summarizeOverlappingSources,observeInteriorBoundary,fixtureFirstKeyframeBoundary} from './recording_current_app_helpers.mjs';
import {captureFailureEvidence,captureBasicFailureEvidence,captureCompletenessEvidence,captureStateEvidence,removeDiagnosticRoot,runDiagnosticProbe,createWriterEvidenceCollector} from './recording_failure_capture.mjs';
import {createLatencyTraceCollector,preserveLatencyEvidence} from './recording_latency_trace.mjs';
import {createProcessCleanup,processStartEvidence} from './recording_process_cleanup.mjs';
import {createSelectionTraceCollector,matchSelectionTrace,reportSelectionTraceFailure} from './recording_selection_trace.mjs';
import {createCompletionTraceCollector,summarizeCompletion,createTimelineObservation,observeTransitionWait,boundedUntil} from './recording_completion_trace.mjs';
const reproduceFailedWindow=process.argv.length===3&&process.argv[2]==='--reproduce-failed-window';
const boundaryDiagnostic=process.argv.length===3&&process.argv[2]==='--diagnose-restart-boundary';
const latencyOnly=reproduceFailedWindow||(process.argv.slice(2).length===1&&process.argv[2]==='--latency-only');
if(process.argv.length>2&&!latencyOnly&&!boundaryDiagnostic)throw Error('unsupported-mode');
let latencyPass=false,failedReference=null,completedReference=null,diagnosticReference=null;
const pageObservation=createTimelineObservation({reference:()=>diagnosticReference,report:row=>console.log('[timeline-page-observation] '+JSON.stringify(row))});
let transitionObservationInvalid=0;
const timelineTimings=[];
const timelineUnplacedUnit='file',terminalObservations=[];
console.log('[timeline-query-mode] '+JSON.stringify({unplacedUnit:timelineUnplacedUnit,knownUnit:'mapping',maxTopItems:4096,maxLeafItems:8192,maxBytes:64*1024*1024}));
// 이 fixture의 segment=2000ms, post=750ms, 기본 여유=1000ms,
// retry=500ms와 LP10 원본 대기 예산에 결박한다. 임의 행별 예산은 허용하지 않는다.
const selectionTraceBudget={baseWaitMs:3750,baseAttemptLimit:9,sourceWaitMs:60000,sourceAttemptLimit:121};
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const MiB=1024*1024,start=performance.now(),deadline=start+180000;
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-current-integration-')));
fs.chmodSync(root,0o700);const rootStat=fs.lstatSync(root,{bigint:true});
let passed=0,failed=0,actualEventPass=false,restartPass=false,boundaryDiagnosticPass=false,udp,udpClosed=false;
const observedOutputCounts=[];
let cancelled=false;process.on('SIGTERM',()=>{cancelled=true;});process.on('SIGINT',()=>{cancelled=true;});
const processes=[],processEvidence=[];let primaryError,processEvidencePreserved=true;
let httpSequence=0;
const check=(condition,label)=>{if(!condition)throw Error(label);passed++;console.log(`[pass] ${label}`);};
function scan(directory,{hash=false,strict=false}={}){
  const result=[];let bytes=0,entries=0;
  function visit(current){for(const name of fs.readdirSync(current).sort()){
    const full=path.join(current,name),s=fs.lstatSync(full);if(++entries>4096)throw Error('root-entry-cap');
    if(s.isDirectory()){visit(full);continue;}
    bytes+=s.size;if(bytes>512*MiB)throw Error('root-byte-cap');
    if(s.isSymbolicLink()){if(strict)throw Error('archive-symlink');continue;}
    if(!s.isFile()||(strict&&s.nlink!==1))throw Error('archive-not-regular-single-link');
    const item={path:path.relative(directory,full),bytes:s.size};
    if(hash){const digest=crypto.createHash('sha256'),fd=fs.openSync(full,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const after=fs.fstatSync(fd);if(after.ino!==s.ino||after.dev!==s.dev)throw Error('file-race');const buffer=Buffer.alloc(65536);let n;while((n=fs.readSync(fd,buffer,0,buffer.length,null)))digest.update(buffer.subarray(0,n));item.hash=digest.digest('hex');}finally{fs.closeSync(fd);}}
    result.push(item);
  }}visit(directory);return {bytes,entries,files:result};
}
function budget(){if(cancelled)throw Error('actual-app-cancelled');if(processes.some(p=>p.logOverflow))throw Error('app-log-cap');if(performance.now()>deadline)throw Error('actual-app-deadline');scan(root);}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(label,fn,timeout=30000){return boundedUntil(label,fn,{deadline,timeout,pause,budget});}
function environment(http,rtsp,stun){
  const env={PATH:process.env.PATH,HOME:root,TMPDIR:path.join(root,'tmp'),GST_REGISTRY:path.join(root,'gst-cache/registry.bin'),GST_REGISTRY_1_0:path.join(root,'gst-cache/registry.bin')};
  const values={SKIP_LOCAL_ENV:1,SKIP_BUILD:1,AUTH_MODE:'off',ENABLE_AI:1,ENABLE_LAB:1,ENABLE_OPS:1,ENABLE_CLIENT:1,ENABLE_YOUTUBE_SOURCE:0,
    LISTEN_ADDRESS:'127.0.0.1',HTTP_LISTEN_ADDRESS:'127.0.0.1',LISTEN_PORT:rtsp,HTTP_LISTEN_PORT:http,FORCE_RTSP_TCP:1,
    FILE_ROOT:path.join(root,'input'),DEFAULT_FILE:path.join(root,'input/identity.mp4'),STATE_DIR:path.join(root,'state'),AUTH_USERS_FILE:path.join(root,'state/users.json'),
    SOURCE_REGISTRY:path.join(root,'state/sources.json'),PUBLISHED_VIEWS:path.join(root,'state/views.json'),ANALYSIS_REGISTRY:path.join(root,'state/analysis.json'),
    ANALYSIS_MODEL:path.join(repo,'models/yolo11n.onnx'),ANALYSIS_LABELS:path.join(repo,'models/coco.names'),ANALYSIS_DETECTOR:'yolo',ANALYSIS_FPS:8,ANALYSIS_CONFIDENCE:0.25,ANALYSIS_ADAPTIVE:0,
    ANALYSIS_EVENT_STORAGE_ENABLED:1,ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:0,ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),
    ANALYSIS_EVENT_CLIP_HOOK_ENABLED:1,ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),ANALYSIS_EVENT_PRE_EVENT_MS:750,ANALYSIS_EVENT_POST_EVENT_MS:750,ANALYSIS_EVENT_POST_ENABLED:0,
    RECORDING_ENABLED:1,RECORDING_STORAGE_ROOT:path.join(root,'recordings'),RECORDING_SEGMENT_DURATION_SECONDS:2,RECORDING_RESERVED_FREE_BYTES:0,RECORDING_RETENTION_INTERVAL_MS:1000,
    VERIFY_RECORDING_SELECTION_TRACE:1,VERIFY_RECORDING_LATENCY_TRACE:1,GST_CACHE_DIR:path.join(root,'gst-cache'),GST_PLUGIN_PROFILE:'headless',WEBRTC_STUN_SERVER:`stun://127.0.0.1:${stun}`,WEBRTC_TURN_SERVER:''};
  for(const [key,value] of Object.entries(values))env['MEDIA_SERVER_'+key]=String(value);return env;
}
async function response(app,route,options={}){
  budget();if(!route.startsWith('/')||route.startsWith('//'))throw Error('nonlocal-route');
  const sequence=++httpSequence;
  const timelineOrdinal=route.startsWith('/ops/api/recordings/timeline?')?++app.timelineSequence:null;
  return measuredHttpResponse({route,method:options.method??'GET',
    report:timing=>{if(timing.routeClass==='timeline')timelineTimings.push(timing);console.log('[http-timing] '+JSON.stringify({sequence,timelineOrdinal,processOrdinal:app.ordinal,...timing}));},
    request:()=>fetch(app.base+route,{...options,redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(4000,deadline-performance.now())))})});
}
async function request(app,method,route,body){const r=await response(app,route,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});if(r.status!==200&&r.status!==201)throw Error('request-status-'+r.status);return JSON.parse(r.bytes.toString());}
async function launch(stun){
  const http=await reservePort(),rtsp=await reservePort();
  const child=spawn(path.join(repo,'server.sh'),['foreground'],{cwd:repo,env:environment(http,rtsp,stun),stdio:['ignore','pipe','pipe']});
  const app={child,http,rtsp,base:`http://127.0.0.1:${http}`,logBytes:0,closed:false,ordinal:processes.length+1,timelineSequence:0,latencyTrace:createLatencyTraceCollector(),selectionTrace:createSelectionTraceCollector(selectionTraceBudget),completionTrace:createCompletionTraceCollector(),writerEvidence:createWriterEvidenceCollector()};processes.push(app);
  const ports=[{kind:'http',port:http},{kind:'rtsp',port:rtsp}];
  app.collectCleanup=createProcessCleanup({child,ports,stopServer,assertPortClosed});
  console.log('[process-start] '+JSON.stringify({processOrdinal:app.ordinal,...processStartEvidence(child,ports)}));
  child.once('error',()=>{app.spawnError=true;});child.once('close',()=>{app.closed=true;});
  for(const stream of [child.stdout,child.stderr]){
    stream.setEncoding('utf8');
    stream.on('data',chunk=>{
      app.logBytes+=Buffer.byteLength(chunk);if(app.logBytes>4*MiB){app.logOverflow=true;child.kill('SIGTERM');}
      if(stream===child.stderr&&!app.traceError)try{app.selectionTrace.append(chunk);}catch{app.traceError=true;}
      if(stream===child.stderr&&!app.completionError)try{app.completionTrace.append(chunk);}catch{app.completionError=true;}
      if(stream===child.stderr)app.writerEvidence.append(chunk);
      if(stream===child.stderr)app.latencyTrace.append(chunk);
    });
  }
  await until('health',async()=>{if(app.closed||app.spawnError||app.logOverflow)throw Error('app-start-failed');try{return (await response(app,'/health')).status===200;}catch(error){if(error.message==='actual-app-deadline')throw error;return false;}},15000);
  assertLocalIceConfig(await request(app,'GET','/webrtc/config'),stun);check(true,`S11-CI09 product-${processes.length} healthy isolated ICE`);return app;
}
async function stop(app){
  if(app.stopPromise)return app.stopPromise;
  app.stopPromise=(async()=>{
    const result=await app.collectCleanup();app.archiveSafe=result.archiveSafe;app.stopped=result.normalShutdownPass;
    processEvidence.push(result);
    console.log('[process-stop] '+JSON.stringify({processOrdinal:app.ordinal,...result}));
    // writer 안전 요약은 정상 종료 PASS와 독립적으로 첫 종료 시도 뒤 한 번 기록한다.
    console.log('[writer-evidence-status] '+JSON.stringify(app.writerEvidence.finish()));
    const evidencePath=path.join(repo,'docs/release-artifacts/v4.1.0/s11-preparation-mapping',`process-${crypto.randomUUID()}.json`);
    let fd;
    try{
      fd=fs.openSync(evidencePath,'wx',0o600);fs.writeFileSync(fd,JSON.stringify(result)+'\n');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
      const directory=fs.openSync(path.dirname(evidencePath),'r');try{fs.fsyncSync(directory);}finally{fs.closeSync(directory);}
      console.log('[process-evidence] '+JSON.stringify({processOrdinal:app.ordinal,evidenceFile:path.basename(evidencePath)}));
    }catch{processEvidencePreserved=false;throw Error('process-evidence-unavailable');}finally{if(fd!==undefined)fs.closeSync(fd);}
    if(!result.normalShutdownPass)throw Error('process-cleanup-failed');
    check(true,`S11-CI08 product-${app.ordinal} exit0 ports returned`);
  })();
  return app.stopPromise;
}
function events(){const file=path.join(root,'events/events.jsonl');if(!fs.existsSync(file))return [];const size=fs.statSync(file).size;if(size>4*MiB)throw Error('event-jsonl-byte-cap');const text=fs.readFileSync(file,'utf8'),end=text.lastIndexOf('\n');if(end<0)return [];const lines=text.slice(0,end).split('\n').filter(Boolean);if(lines.length>8192)throw Error('event-record-cap');return lines.map(line=>JSON.parse(line));}
const queryStart=Date.now()-60000,queryEnd=Date.now()+240000;
async function timeline(app,consumePage){
  const cycle=pageObservation.begin(app.ordinal);
  return allTimelinePages(async(offset,limit)=>{
    try{return await request(app,'GET',`/ops/api/recordings/timeline?channelId=9101&startTimeMs=${queryStart}&endTimeMs=${queryEnd}&offset=${offset}&limit=${limit}&unplacedUnit=${timelineUnplacedUnit}`);}
    finally{cycle.ordinal(app.timelineSequence);}
  },{observe:event=>{
    if(event.kind==='failure'&&['page-bound-top-limit','page-bound-offset-limit','page-bound-leaf-limit'].includes(event.code))
      console.log('[timeline-page-bound] '+JSON.stringify({processOrdinal:app.ordinal,code:event.code,...event.details}));
    cycle.observe(event);
  },consumePage});
}
function rule(id,enabled=true){return {id,priority:100,enabled,match:{sourceKind:'file',route:'http'},analysis:{classes:['person']},event:{type:'presence',minConfidence:0.25,region:{type:'polygon',points:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]}},eventActions:{highlight:{enabled:true,mode:'blink',target:'matched-object',durationMs:1500,color:'#00ff00'},post:{enabled:false,method:'POST',url:'',payloadFormat:'media-server.va.event.v1'}}};}
async function collectEvent(app,index,{fixtureBoundary=null}={}){
  // 두 번째 기동이 이벤트 이전에 실패하면 첫 기동의 참조로 잘못 진단하지 않는다.
  diagnosticReference=null;
  const prior=new Set(events().map(e=>e.eventId)),ruleId=String(9101+index);
  const tap=await request(app,'POST','/lab/analysis/taps?file=identity.mp4&va=1&fps=8&maxQueue=1&trackIds=1');
  let tuple,event;
  try{
    if(!reproduceFailedWindow&&(typeof fixtureBoundary!=='bigint'||fixtureBoundary<=0n))throw Error('fixture-keyframe-boundary-required');
    let previousPts=null;
    await until('interior-source-boundary',async()=>{
      const readPts=async()=>{const snapshot=await request(app,'GET',`/lab/analysis/taps/${tap.tapId}`);const pts=snapshot.tap?.latestResult?.pts;
        if(!Number.isSafeInteger(pts))return null;
        if(previousPts!==null&&pts<previousPts)throw Error('fixture-epoch-reset-before-trigger');
        previousPts=pts;return pts;};
      if(reproduceFailedWindow){
        let page;try{page=await timeline(app);}catch(e){if(e.message==='page-total-changed')return false;throw e;}
        const sources=[...page.items,...page.unplacedItems].filter(x=>x.kind==='continuous'&&x.mediaRange?.endPts!==null&&x.mediaRange?.timeBaseNum==='1'&&x.mediaRange?.timeBaseDen==='1000000000');
        if(!sources.length)return false;
        sources.sort((a,b)=>BigInt(a.orderSequence)<BigInt(b.orderSequence)?-1:1);const end=BigInt(sources.at(-1).mediaRange.endPts);
        const pts=await readPts();if(pts===null)return false;
        console.log('[reproduction-observation] '+JSON.stringify({sourceEndPts:String(end),tapPts:String(pts)}));
        if(!failedWindowGate(end,BigInt(pts)))return false;
        console.log('[trigger-timing] '+JSON.stringify({run:index,sourceEndPts:end.toString(),tapPts:String(pts),delta:String(BigInt(pts)-end)}));return true;}
      const selected=await observeInteriorBoundary(fixtureBoundary,readPts,{pause:()=>pause(80)});
      if(!selected&&previousPts!==null&&BigInt(previousPts)>fixtureBoundary+500000000n)throw Error('fixture-boundary-missed');
      if(selected)console.log('[trigger-timing] '+JSON.stringify({run:index,sourceEndPts:String(fixtureBoundary),tapPts:String(selected.pts),delta:selected.delta.toString(),
        basis:'input-file-keyframe',newEpochProofDeferredToOutputAndArchive:true}));
      return Boolean(selected);
    },30000);
    await request(app,'PUT',`/lab/analysis/rules/${ruleId}`,rule(ruleId));
    await until('actual-dispatch',async()=>{tuple=dispatchTuple(await request(app,'GET',`/lab/analysis/taps/${tap.tapId}/events?dispatch=1`),tap,ruleId,
      {selectionBasis:'first-dispatch-stable-reference'});return tuple;},15000);
    console.log('[dispatch-timing] '+JSON.stringify({run:index,pts:String(tuple.pts),selectionBasis:tuple.selectionBasis,
      candidateCount:tuple.candidateCount,selectedDispatchOrdinal:tuple.selectedDispatchOrdinal}));
    if(reproduceFailedWindow)requireFailedWindowDispatch(tuple.pts);
    event=await until('durable-event',()=>correlatedEvent(events(),prior,tuple),10000);
    check(event.recordingLinkId&&event.channelId===tap.streamKey,`S11-CI07 run${index} actual tuple EventRecord reference`);
    diagnosticReference=event.recordingLinkId;
    await request(app,'PUT',`/lab/analysis/rules/${ruleId}`,rule(ruleId,false));
    let lastState,lastSources;
    const observe=(page,reason)=>{if(!page)return;const state=summarizeEventState(page,event.eventId,event.recordingLinkId,reason),json=JSON.stringify(state);if(json!==lastState){console.log('[timeline-state] '+json);lastState=json;}
      const sources=JSON.stringify(summarizeOverlappingSources(page,Math.trunc(tuple.pts/1000000),{unplacedUnit:timelineUnplacedUnit}));if(sources!==lastSources){console.log('[overlapping-sources] '+sources);lastSources=sources;}};
    let rows;
    const terminal=createTerminalObservation(event.eventId,event.recordingLinkId);
    const consumePage=page=>terminal.consume(page,{timelineOrdinal:app.timelineSequence});
    let fullPageStatus='not-observed',changedCycles=0;
    const observedTimeline=async()=>{
      try{const page=await timeline(app,consumePage);fullPageStatus='complete';return page;}
      catch(error){
        fullPageStatus=error.message==='page-total-changed'?'page-total-changed':'error';
        if(error.message==='page-total-changed')changedCycles++;
        if(error.message==='latency-job-failed')failedReference=event.recordingLinkId;
        throw error;
      }
    };
    const observedWait=async run=>{
      const referenceSha256=crypto.createHash('sha256').update(event.recordingLinkId).digest('hex');let outcome='error';
      try{
        const value=await observeTransitionWait(run,{ordinal:()=>app.timelineSequence,referenceSha256,processOrdinal:app.ordinal,deadlineMs:30000,
          strictDeadline:true,timeoutLabel:latencyOnly?'latency-transition':'complete-two-outputs',
          report:row=>console.log('[transition-observation] '+JSON.stringify({...row,scope:latencyOnly?'terminal-observation':'full-page-two-outputs'})),invalid:()=>{transitionObservationInvalid++;}});
        outcome='complete';return value;
      }catch(error){outcome=error.message.endsWith('-timeout')?'timeout':'error';throw error;}
      finally{
        const summary={processOrdinal:app.ordinal,referenceSha256,unplacedUnit:timelineUnplacedUnit,...terminal.status(),fullPageStatus,changedCycles,waitOutcome:outcome};
        terminalObservations.push(summary);console.log('[terminal-observation] '+JSON.stringify(summary));
      }
    };
    if(latencyOnly){
      rows=await observedWait(()=>until('latency-transition',async()=>{
        try{const page=await observedTimeline();observe(page,'ok');}
        catch(e){if(e.message!=='page-total-changed')throw e;}
        const observed=terminal.outputs();return observed.length?observed:false;
      },30000));
      check(rows.length>0,'P0-HTTP02 same-reference durable transition observed (not completeness)');
      completedReference=event.recordingLinkId;
      const end=performance.now()+5000;
      do{try{await observedTimeline();}catch(e){if(e.message!=='page-total-changed')throw e;}await pause(100);}while(performance.now()<end);
      check(timelineTimings.length>0&&timelineTimings.every(t=>t.status===200&&t.outcome==='ok'&&t.totalElapsedMs<=4000),'P0-HTTP02 all timeline HTTP within unchanged 4000ms');
      console.log('[latency-result] '+JSON.stringify({requests:timelineTimings.length,maxMs:Math.max(...timelineTimings.map(t=>t.totalElapsedMs)),outputCount:rows.length,completeness:rows.map(r=>['complete','partial','unknown'].includes(r.completeness)?r.completeness:'other')}));
      latencyPass=true;return null;
    }
    try{rows=await observedWait(()=>until('complete-two-outputs',async()=>{let page;try{page=await observedTimeline();const outputs=eventOutputs(page,event.eventId,event.recordingLinkId);observe(page,'ok');return outputs;}catch(e){
      observe(page,e.message);
      if(['event-absent','event-not-complete','page-total-changed','expected-two-output-files'].includes(e.message))return false;throw e;}},30000));
    }catch(e){if(lastState)console.log('[timeline-final-state] '+lastState);throw e;}
    requireCompletionEvidence(rows,terminal.status(),fullPageStatus);
    check(rows.length===2,`S11-CI07 run${index} literal two output files all pages and independent terminal observation`);
    const outputs=[];for(const row of rows){const r=await response(app,row.playbackUrl);check(r.status===200&&r.bytes.length>0,`S11-CI07 run${index} output${outputs.length+1} HTTP200`);outputs.push({id:row.segmentId,hash:crypto.createHash('sha256').update(r.bytes).digest('hex'),bytes:r.bytes.length});}
    return {eventId:event.eventId,referenceId:event.recordingLinkId,jobId:rows[0].jobId,outputs,
      ruleId,tuplePts:tuple.pts};
  }finally{await request(app,'DELETE',`/lab/analysis/taps/${tap.tapId}`).catch(()=>{});}
}
async function awaitArchiveQuiescence(app,observed){
  const refs=[...new Set(events().filter(e=>e.metadata?.ruleId===observed.ruleId&&
    e.updateTime===Math.trunc(observed.tuplePts/1000000)&&typeof e.recordingLinkId==='string'&&e.recordingLinkId).map(e=>e.recordingLinkId))];
  if(!refs.includes(observed.referenceId)||refs.length>32)throw Error('archive-dispatch-reference-set');
  const referenceHashes=refs.map(ref=>crypto.createHash('sha256').update(ref).digest('hex'));
  let stableSince=null,polls=0,activeSeen=0,hardlinkSeen=0,lastStates=[];
  try{await until('archive-publication-not-settled',async()=>{
    const trace=app.completionTrace.snapshot();polls++;
    lastStates=referenceHashes.map(hash=>summarizeCompletion(trace,hash).terminal.map(row=>row.state));
    const terminal=lastStates.every(found=>found.length>0);
    if(!terminal){activeSeen++;stableSince=null;return false;}
    try{scan(path.join(root,'recordings'),{strict:true});}
    catch(e){if(e.message!=='archive-not-regular-single-link')throw e;hardlinkSeen++;stableSince=null;return false;}
    stableSince??=performance.now();
    if(performance.now()-stableSince<750)return false;
    console.log('[archive-quiescence] '+JSON.stringify({processOrdinal:app.ordinal,dispatchReferences:refs.length,polls,activeSeen,hardlinkSeen,
      terminalStates:lastStates,stableMs:Math.round(performance.now()-stableSince),budgetBasis:'source-wait-60000ms',
      oracle:'validated-server-completion-trace-plus-single-link-files'}));
    return true;
  },selectionTraceBudget.sourceWaitMs);}
  catch(e){console.log('[archive-quiescence-failure] '+JSON.stringify({processOrdinal:app.ordinal,polls,activeSeen,hardlinkSeen,lastStates,
    budgetBasis:'source-wait-60000ms'}));throw e;}
  check(true,`S11-CI11 product-${app.ordinal} dispatch publications settled before archive`);
}
async function diagnoseRestartBoundary(app){
  diagnosticReference=null;
  const tap=await request(app,'POST','/lab/analysis/taps?file=identity.mp4&va=1&fps=8&maxQueue=1&trackIds=1');
  let samples=0,ready=0,latestOrder=null,orderChanges=0;
  const untilMs=Math.min(deadline-5000,performance.now()+30000);
  try{
    while(performance.now()<untilMs){
      const page=await timeline(app);
      const sources=[...page.items,...page.unplacedItems].filter(x=>x.kind==='continuous'&&x.mediaRange?.endPts!==null&&x.mediaRange?.timeBaseNum==='1'&&x.mediaRange?.timeBaseDen==='1000000000');
      if(!sources.length){console.log('[restart-boundary-sample] '+JSON.stringify({processOrdinal:app.ordinal,kind:'no-source',timelineOrdinal:app.timelineSequence}));await pause(100);continue;}
      sources.sort((a,b)=>BigInt(a.orderSequence)<BigInt(b.orderSequence)?-1:1);
      const source=sources.at(-1),end=BigInt(source.mediaRange.endPts),order=String(source.orderSequence);
      if(latestOrder!==order){if(latestOrder!==null)orderChanges++;latestOrder=order;}
      const sourceIdSha256=crypto.createHash('sha256').update(source.segmentId).digest('hex');
      const selected=await observeInteriorBoundary(end,async()=>{
        const snapshot=await request(app,'GET',`/lab/analysis/taps/${tap.tapId}`),pts=snapshot.tap?.latestResult?.pts;
        const row={processOrdinal:app.ordinal,timelineOrdinal:app.timelineSequence,sourceIdSha256,sourceOrder:order,
          sourceStartPts:String(source.mediaRange.startPts),sourceEndPts:String(end),tapPts:Number.isSafeInteger(pts)?String(pts):null,
          latestFramePts:Number.isSafeInteger(snapshot.tap?.latestFramePts)?String(snapshot.tap.latestFramePts):null,
          deltaNs:Number.isSafeInteger(pts)?String(BigInt(pts)-end):null};
        if(++samples>512)throw Error('restart-boundary-sample-cap');
        console.log('[restart-boundary-sample] '+JSON.stringify(row));
        return Number.isSafeInteger(pts)?pts:null;
      },{pause:()=>pause(80)});
      if(selected)ready++;
      await pause(100);
    }
    console.log('[restart-boundary-summary] '+JSON.stringify({processOrdinal:app.ordinal,samples,ready,orderChanges,latestOrder}));
    check(samples>0,'LP26-O13 restart boundary bounded samples');
    return {samples,ready,orderChanges};
  }finally{await request(app,'DELETE',`/lab/analysis/taps/${tap.tapId}`).catch(()=>{});}
}
function archiveProbe(index,observed){
  budget();const original=path.join(root,'recordings'),before=scan(original,{hash:true,strict:true}),copy=path.join(root,`projection-copy-${index}`,'recordings');
  fs.mkdirSync(path.dirname(copy),{mode:0o700});fs.cpSync(original,copy,{recursive:true,dereference:false,errorOnExist:true});
  const copied=scan(copy,{hash:true,strict:true});check(JSON.stringify(before)===JSON.stringify(copied),`S11-CI11 copy${index} bytes/hash exact before Open`);
  const result=JSON.parse(execFileSync(path.join(root,'archive-probe'),[root,String(index),observed.referenceId],{env:{PATH:process.env.PATH},timeout:15000,maxBuffer:MiB,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  check(result.eventId===observed.eventId&&result.jobId===observed.jobId&&result.sources.length===2&&JSON.stringify(result.outputs.map(o=>o.id).sort())===JSON.stringify(observed.outputs.map(o=>o.id).sort()),`S11-CI11 copy${index} same-axis request two sources typed proof`);
  check(JSON.stringify(before)===JSON.stringify(scan(original,{hash:true,strict:true})),`S11-CI11 original${index} unchanged by copy recovery`);
  for(const output of observed.outputs){const expected=result.outputs.find(o=>o.id===output.id);check(expected&&expected.hash===output.hash&&expected.bytes===String(output.bytes)&&before.files.filter(f=>f.path===expected.relativePath&&f.bytes===output.bytes&&f.hash===output.hash).length===1,`S11-CI07 output owned regular hash ${output.id}`);}
  console.log(`[archive-proof] ${JSON.stringify({...result,outputs:result.outputs.map(({relativePath,...value})=>value)})}`);
}
try{
  for(const dir of ['input','state','events','recordings','tmp','gst-cache'])fs.mkdirSync(path.join(root,dir),{mode:0o700});
  fs.copyFileSync(path.join(repo,'video/imports/va_tracking_event_1280x720_30fps_h264.mp4'),path.join(root,'input/identity.mp4'));
  const keyframeProbe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-skip_frame','nokey','-show_entries',
    'frame=best_effort_timestamp:stream=time_base,duration','-of','json',path.join(root,'input/identity.mp4')],{encoding:'utf8',timeout:10000,maxBuffer:MiB}));
  const fixtureBoundary=fixtureFirstKeyframeBoundary(keyframeProbe);
  console.log('[fixture-keyframe-proof] '+JSON.stringify({boundaryPts:String(fixtureBoundary),timeBase:keyframeProbe.streams[0].time_base,
    duration:keyframeProbe.streams[0].duration,keyframeCount:keyframeProbe.frames.length}));
  execFileSync('/bin/bash',[path.join(repo,'scripts/internal/build_recording_current_archive_probe.sh'),root],{env:{PATH:process.env.PATH,HOME:root,TMPDIR:path.join(root,'tmp')},timeout:30000,stdio:['ignore','pipe','pipe']});
  udp=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});const stun=udp.address().port;
  const first=await launch(stun);
  await request(first,'POST','/ops/api/sources',{sourceId:'9101',displayName:'current isolated source',kind:'file',file:'identity.mp4',enabled:true,recording:{enabled:true,continuousMaxBytes:256*MiB,eventMaxBytes:256*MiB,continuousMaxAgeMs:3600000,eventMaxAgeMs:3600000,revision:1}});
  const before=await collectEvent(first,1,{fixtureBoundary});
  if(latencyOnly){await stop(first);}else{
  observedOutputCounts.push(before.outputs.length);await awaitArchiveQuiescence(first,before);await stop(first);archiveProbe(1,before);actualEventPass=true;
  const second=await launch(stun);const previous=eventOutputs(await timeline(second),before.eventId,before.referenceId),retained=[];
  for(const row of previous){const r=await response(second,row.playbackUrl);check(r.status===200,'S11-CI08 retained output HTTP200');retained.push({id:row.segmentId,hash:crypto.createHash('sha256').update(r.bytes).digest('hex'),bytes:r.bytes.length});}
  const after={eventId:before.eventId,referenceId:before.referenceId,jobId:previous[0].jobId,outputs:retained};
  if(boundaryDiagnostic){await diagnoseRestartBoundary(second);await stop(second);boundaryDiagnosticPass=true;}
  else{const fresh=await collectEvent(second,2,{fixtureBoundary});observedOutputCounts.push(fresh.outputs.length);check(verifyRestart(before,after,fresh),'S11-CI08 retained IDs/hash and new event/reference/job/output separated');
    await awaitArchiveQuiescence(second,fresh);await stop(second);archiveProbe(2,fresh);restartPass=true;}
  }
}catch(error){failed++;primaryError=error;console.error(`[fail] current actual app: ${error instanceof Error?error.message:'unknown'}`);}
const cleanup={rootAbsent:false,failureCount:0,processes:processEvidence};
for(const app of processes)try{await stop(app);}catch{cleanup.failureCount++;}
let latencyEvidencePreserved=true;
for(const app of processes){
  const evidencePath=path.join(repo,'docs/release-artifacts/v4.1.0/s11-preparation-mapping',`latency-${crypto.randomUUID()}.json`);
  try{
    const snapshot=app.latencyTrace.finish(app.timelineSequence);
    preserveLatencyEvidence(evidencePath,snapshot);
    console.log('[latency-trace-status] '+JSON.stringify({processOrdinal:app.ordinal,status:snapshot.status,code:snapshot.code,acceptedCount:snapshot.acceptedCount,expectedRequestCount:snapshot.expectedRequestCount,observedRequestCount:snapshot.observedRequestCount,evidenceFile:path.basename(evidencePath)}));
    if(snapshot.status!=='complete')failed++;
  }catch{latencyEvidencePreserved=false;failed++;console.error('[fail] latency-trace-evidence-unavailable');}
}
try{
  const rows=processes.flatMap(app=>{if(app.traceError)throw Error('selection-trace-invalid');return app.selectionTrace.finish();});
  // 검증된 고정 필드만 보존한다. 후속 복제본 진단과 별도로 남겨 진단 실패도 원인을 지우지 않는다.
  for(const row of rows)console.log('[selection-attempt] '+JSON.stringify(row));
  const reference=failedReference||completedReference;
  if(reference)check(matchSelectionTrace(rows,crypto.createHash('sha256').update(reference).digest('hex'),selectionTraceBudget).length>0,'LP09-J02 actual reference decision-time trace complete');
  else if(diagnosticReference){
    const hash=crypto.createHash('sha256').update(diagnosticReference).digest('hex'),selected=rows.filter(row=>row.reference_sha256===hash);
    let status='terminal-observed';try{matchSelectionTrace(rows,hash,selectionTraceBudget);}catch(error){status=error.message==='selection-trace-terminal-missing'?'terminal-not-observed':selected.length?'invalid':'observation-missing';}
    console.log('[selection-observation-status] '+JSON.stringify({referenceSha256:hash,attempts:selected.length,status}));
  }
}catch(error){failed++;let code='unknown';for(const app of processes)code=reportSelectionTraceFailure(app.selectionTrace,error,line=>console.log(line));console.error('[fail] LP09-J02 selection trace unavailable code='+code);}
const needsDiagnostic=Boolean(failedReference||completedReference||((primaryError||failed||cleanup.failureCount)&&diagnosticReference));
let completionEvidencePreserved=true;
try{
  for(const app of processes){
    const rows=app.completionTrace.finish();
    for(const row of rows)console.log('[completion-event] '+JSON.stringify({processOrdinal:app.ordinal,...row}));
    console.log('[completion-observation-status] '+JSON.stringify({processOrdinal:app.ordinal,...app.completionTrace.status(),selected:diagnosticReference?summarizeCompletion(rows,crypto.createHash('sha256').update(diagnosticReference).digest('hex')):null}));
    if(app.completionError||app.completionTrace.status().status==='loss')completionEvidencePreserved=false;
  }
  console.log('[timeline-page-observation-status] '+JSON.stringify(pageObservation.status()));
  if(pageObservation.status().invalid||transitionObservationInvalid)completionEvidencePreserved=false;
}catch{completionEvidencePreserved=false;console.error('[completion-observation-status] {"status":"invalid"}');}
if(!completionEvidencePreserved)failed++;
let diagnosticCleanupAllowed=!needsDiagnostic;
if(needsDiagnostic&&processes.every(app=>app.archiveSafe))try{
  if(performance.now()>=deadline)throw Error('diagnostic-deadline');
  const original=path.join(root,'recordings'),before=scan(original,{hash:true,strict:true});
  const diagnosticIndex=processes.length,replayIndex=diagnosticIndex+1;
  function probe(index,mode){
    if(performance.now()>=deadline)throw Error('diagnostic-deadline');
    const copy=path.join(root,`projection-copy-${index}/recordings`);
    if(!fs.existsSync(copy)){
      fs.mkdirSync(path.dirname(copy),{mode:0o700});fs.cpSync(original,copy,{recursive:true,dereference:false,errorOnExist:true});
      check(JSON.stringify(before)===JSON.stringify(scan(copy,{hash:true,strict:true})),'LP03-B diagnostic copy bytes/hash exact');scan(root);
    }else if(mode==='--diagnose-state'&&JSON.stringify(before)!==JSON.stringify(scan(copy,{hash:true,strict:true})))throw Error('diagnostic-copy-stale');
    return runDiagnosticProbe({binary:path.join(root,'archive-probe'),root,index,reference:diagnosticReference,mode,environmentScript:path.join(repo,'scripts/internal/env_common.sh'),env:{PATH:process.env.PATH,HOME:root,TMPDIR:path.join(root,'tmp'),MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst-cache-replay'),MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless'},deadline});
  }
  // 원본/복구 쓰기 가능한 복제본은 분리한다. 안전 요약만 저장소에 보존하며 raw media는 보존하지 않는다.
  const evidencePath=path.join(repo,'docs/release-artifacts/v4.1.0/s11-preparation-mapping',`state-${crypto.randomUUID()}.json`);
  let diagnosedState=null;
  const stateResult=captureStateEvidence({collect:()=>{const value=probe(diagnosticIndex,'--diagnose-state');diagnosedState=value.state;return value;},evidencePath,expectedReferenceSha256:crypto.createHash('sha256').update(diagnosticReference).digest('hex')});
  console.log('[job-state-diagnostic] '+JSON.stringify({...stateResult,evidenceFile:path.basename(evidencePath),detailRequested:Boolean(failedReference||completedReference||(stateResult.cleanupAllowed&&['complete','failed'].includes(diagnosedState)))}));
  if(!stateResult.cleanupAllowed)throw Error('state-evidence-unavailable');
  diagnosticCleanupAllowed=true;
  if(failedReference||completedReference||['complete','failed'].includes(diagnosedState)){
    const detailPath=evidencePath+'.detail.json';
    const result=failedReference?captureFailureEvidence({diagnose:()=>probe(diagnosticIndex,'--diagnose-basic'),collect:()=>probe(diagnosticIndex,'--diagnose-failed'),replay:()=>probe(replayIndex,'--replay-failed'),evidencePath:detailPath}):
      diagnosedState==='failed'?captureBasicFailureEvidence({diagnose:()=>probe(diagnosticIndex,'--diagnose-basic'),evidencePath:detailPath}):
      captureCompletenessEvidence({collect:()=>probe(diagnosticIndex,'--diagnose-completeness'),evidencePath:detailPath});
    diagnosticCleanupAllowed=result.cleanupAllowed;
    console.log('[job-diagnostic] '+JSON.stringify({...result,evidenceFile:path.basename(detailPath),basis:diagnosedState==='failed'&&!failedReference?'offline-after-wait-failure':'observed-during-wait'}));
    if(failedReference?(result.diagnosticEvidenceStatus!=='preserved'||result.replayStatus!=='complete'||result.replayEvidenceStatus!=='preserved'):result.evidenceStatus!=='preserved')failed++;
  }
  check(JSON.stringify(before)===JSON.stringify(scan(original,{hash:true,strict:true})),'LP03-B original unchanged after diagnostic');
}catch{diagnosticCleanupAllowed=false;failed++;console.error('[fail] LP03-B diagnostic unavailable');}
if(udp)try{await new Promise(resolve=>udp.close(resolve));udpClosed=true;}catch{cleanup.failureCount++;}else udpClosed=true;
let size=0;try{size=scan(root).bytes;if(processes.some(p=>!p.archiveSafe)||!udpClosed)throw Error('cleanup-ownership');removeDiagnosticRoot(root,rootStat,diagnosticCleanupAllowed&&latencyEvidencePreserved&&processEvidencePreserved&&completionEvidencePreserved);cleanup.rootAbsent=!fs.existsSync(root);}catch{cleanup.failureCount++;}
cleanup.evidencePreservedOrNotRequired=diagnosticCleanupAllowed&&latencyEvidencePreserved&&processEvidencePreserved&&completionEvidencePreserved;
console.log(`[cleanup] ${JSON.stringify({root,bytes:size,...cleanup,udpClosed})}`);
console.log(JSON.stringify({mode:boundaryDiagnostic?'restart-boundary-diagnostic':latencyOnly?'current-http-latency':'current-actual-app',timelineUnplacedUnit,terminalObservations,passed,failed,latencyPass,actualEventPass,restartPass,boundaryDiagnosticPass,expectedOutputCount:2,observedOutputCounts,cleanup,elapsedMs:Math.round(performance.now()-start)}));
process.exitCode=primaryError||failed||cleanup.failureCount||!cleanup.rootAbsent?1:0;
