import {visualPhaseSummary} from './recording_longrun_progress.mjs';
// 파일 용도: 장시간 관측 진행·표본 연속성·삭제 확인 계약 검사.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {mixedRecordingProfile,mixedRecordingSettings,assertMixedRecordingRegistry,assertMixedFixtureInput,searchFailureSummary,parseLongrunArgs, LongrunProgress, sampleContinuity,nextRecordingSettings,mediaAbsent,frameTraceSummary,captureBoundedProcessLog,processLogCaptureComplete,assertMixedFrameTraceMode} from './recording_longrun_progress.mjs';
let passed=0,failed=0; const start=Date.now();
function check(name,fn){try{fn();passed++;console.log(`[pass] ${name}`);}catch(error){failed++;console.log(`[fail] ${name}: ${error.message}`);}}
check('explicit 120 minutes accepted',()=>assert.equal(parseLongrunArgs(['--duration-minutes','120']),7200000));
for(const args of [[],['120'],['--duration-minutes','30'],['--duration-minutes','120','extra'],['--unknown','120']])
  check(`invalid CLI ${JSON.stringify(args)}`,()=>assert.throws(()=>parseLongrunArgs(args)));
const row=(id,ch,time)=>({mutationId:`m-${id}`,entityId:id,mutationType:'segment_finalized',payload:{mediaRelpath:`channel/${id}.mp4`,segment:{segment_id:id,channel_id:ch,retention_class:'continuous',lifecycle:'finalized',start:{utc_ms:time,pts:time,time_base_num:1,time_base_den:1000},end:{utc_ms:time+1,pts:time+1,time_base_num:1,time_base_den:1000},size_bytes:8,checksum_sha256:'a'.repeat(64),finalized_at_ms:time+1}}});
const deletion=(id,type)=>({mutationId:`${type}-${id}`,entityId:id,mutationType:type,payload:{}});
check('two channels progress and ordered deletion',()=>{const p=new LongrunProgress(0);p.consume([row('a','9101',1),row('b','9201',1)],1000);p.consume(['a','b'].flatMap(id=>[deletion(id,'deletion_requested'),deletion(id,'deletion_completed')]),2000);assert.equal(p.status(2000).channels['9101'].deleted,1);assert.equal(p.status(2000).channels['9201'].finalized,1);});
check('stall rejected',()=>assert.throws(()=>new LongrunProgress(0).status(30001)));
check('duplicate rejected',()=>{const p=new LongrunProgress(0);assert.throws(()=>p.consume([row('a','9101',1),row('a','9101',1)],1));});
check('UTC regression rejected',()=>{const p=new LongrunProgress(0);p.consume([row('a','9101',3)],1);assert.throws(()=>p.consume([row('b','9101',2)],2));});
check('completion without request rejected',()=>{const p=new LongrunProgress(0);p.consume([row('a','9101',1)],1);assert.throws(()=>p.consume([deletion('a','deletion_completed')],2));});
check('invalid media metadata rejected',()=>{const p=new LongrunProgress(0),r=row('a','9101',1);r.payload.segment.size_bytes=0;assert.throws(()=>p.consume([r],1));});
check('duration cannot be shortened',()=>{const p=new LongrunProgress(0);assert.throws(()=>p.finish(1));});
check('unknown channel cannot satisfy progress',()=>{const p=new LongrunProgress(0);p.consume([row('a','9999',1)],1);assert.throws(()=>p.status(30001));});
check('backward clock rejected',()=>{const p=new LongrunProgress(10);assert.throws(()=>p.status(9));});
const samples=[{pid:5,startIdentity:'linux:1',phaseAt:0},{pid:5,startIdentity:'linux:1',phaseAt:5000}];
check('sample continuous accepted',()=>assert(sampleContinuity(samples,0,5000,5,'linux:1')));
check('sample gap rejected',()=>assert(!sampleContinuity([samples[0],{...samples[1],phaseAt:16000}],0,16000,5,'linux:1')));
check('sample wrong PID rejected',()=>assert(!sampleContinuity(samples,0,5000,6,'linux:1')));
check('sample wrong identity rejected',()=>assert(!sampleContinuity(samples,0,5000,5,'linux:2')));
check('sample missing beginning rejected',()=>assert(!sampleContinuity(samples,-16000,5000,5,'linux:1')));
check('sample missing end rejected',()=>assert(!sampleContinuity(samples,0,21000,5,'linux:1')));
check('sample insufficient rejected',()=>assert(!sampleContinuity(samples.slice(0,1),0,0,5,'linux:1')));
check('actual golden schema accepted',()=>{const s=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/recording/v1/segments.jsonl',import.meta.url),'utf8').split('\n')[0]);s.channel_id='9101';const p=new LongrunProgress(0);p.consume([{mutationId:'golden',entityId:s.segment_id,mutationType:'segment_finalized',payload:{segment:s,mediaRelpath:'golden.mp4'}}],1);assert.equal(p.status(1).channels['9101'].finalized,1);});
check('full duration distributed progress accepted',()=>{const p=new LongrunProgress(0);for(let t=5000;t<=7200000;t+=5000){const rows=['9101','9201'].flatMap(c=>{const id=`${c}-${t}`;return[row(id,c,t),deletion(id,'deletion_requested'),deletion(id,'deletion_completed')];});p.consume(rows,t);}assert.equal(p.finish(7200000).elapsedMs,7200000);});
check('last moment only cannot pass',()=>assert.throws(()=>new LongrunProgress(0).consume([row('a','9101',1)],7200000)));
check('ID limit rejected',()=>{const p=new LongrunProgress(0);assert.throws(()=>{for(let i=0;i<=100000;i++)p.add(`x${i}`);});});
check('UTF8 byte limit rejected',()=>{const p=new LongrunProgress(0);assert.throws(()=>p.add('가'.repeat(11184811)));});
const registry={sources:[{sourceId:'9101',recording:{revision:8}}]};
check('queried revision advanced disable',()=>assert.deepEqual(nextRecordingSettings(registry,'9101',false),{enabled:false,revision:9,continuousMaxBytes:134217728,eventMaxBytes:134217728,continuousMaxAgeMs:10800000,eventMaxAgeMs:10800000}));
check('missing source rejected',()=>assert.throws(()=>nextRecordingSettings({sources:[]},'9101',true)));
check('duplicate source rejected',()=>assert.throws(()=>nextRecordingSettings({sources:[...registry.sources,...registry.sources]},'9101',true)));
check('invalid revision rejected',()=>assert.throws(()=>nextRecordingSettings({sources:[{sourceId:'9101',recording:{revision:0}}]},'9101',true)));
for(const args of [[],['120'],['--duration-minutes','30'],['--duration-minutes','120','extra'],['--unknown','120']]){
  check(`public CLI rejects ${JSON.stringify(args)}`,()=>{const r=spawnSync('bash',['scripts/internal/verify_v410_recording_longrun.sh',...args],{encoding:'utf8',timeout:3000,env:{PATH:process.env.PATH,TMPDIR:'/path-must-not-be-used'}});assert.equal(r.status,2);assert.equal(r.stdout,'');assert.match(r.stderr,/usage:/);});
}
check('completed batch returns media path once',()=>{const p=new LongrunProgress(0),r=row('a','9101',1);r.payload.mediaRelpath='channel/a.mp4';p.consume([r,deletion('a','deletion_requested')],1);assert.deepEqual(p.consume([deletion('a','deletion_completed')],2),[{entityId:'a',mediaRelpath:'channel/a.mp4'}]);assert.deepEqual(p.consume([],3),[]);});
check('missing media path rejected',()=>{const p=new LongrunProgress(0),r=row('a','9101',1);delete r.payload.mediaRelpath;assert.throws(()=>p.consume([r],1));});
check('media path byte limit rejected',()=>{const p=new LongrunProgress(0),r=row('a','9101',1);r.payload.mediaRelpath='x'.repeat(33554432);assert.throws(()=>p.consume([r],1));});
check('ENOENT media absent',()=>assert(mediaAbsent(()=>{throw Object.assign(Error(),{code:'ENOENT'});})));
check('regular media present rejected',()=>assert(!mediaAbsent(()=>({isFile:()=>true}))));
check('dangling symlink present rejected',()=>assert(!mediaAbsent(()=>({isSymbolicLink:()=>true}))));
check('media permission error rejected',()=>assert.throws(()=>mediaAbsent(()=>{throw Object.assign(Error(),{code:'EACCES'});})));
check('S09-LD01 invalid segment diagnostics are specific and redacted',()=>{
  for(const [reason,mutate] of [
    ['positive-metadata',s=>{s.size_bytes=0;}],
    ['utc-progress',s=>{s.start.utc_ms=1;s.end.utc_ms=2;}],
    ['pts-range',s=>{s.end.pts=s.start.pts;}],
    ['checksum',s=>{s.checksum_sha256='secret-checksum-text';}],
  ]){
    const p=new LongrunProgress(0);p.consume([row('first','9101',10)],1);
    const r=row('secret-id','9101',20);r.payload.mediaRelpath='secret-source-path';mutate(r.payload.segment);
    assert.throws(()=>p.consume([r],2),e=>{
      assert.match(e.message,/^longrun-invalid-segment /);
      const d=JSON.parse(e.message.slice('longrun-invalid-segment '.length));
      assert(d.reasons.includes(reason));assert.equal(d.previousStartUTC,10);
      assert(!e.message.includes('secret'));return true;
    });
  }
});
check('S09-LD01 missing timestamp diagnostics remain specific and redacted',()=>{
  for(const field of ['start','end']){
    const p=new LongrunProgress(0),r=row('secret-id','9101',20);
    delete r.payload.segment[field];
    r.payload.mediaRelpath='secret-source-path';
    assert.throws(()=>p.consume([r],2),e=>{
      assert.match(e.message,/^longrun-invalid-segment /);
      const d=JSON.parse(e.message.slice('longrun-invalid-segment '.length));
      assert(d.reasons.includes('positive-metadata'));
      assert.equal(d[field==='start'?'startUTC':'endUTC'],null);
      assert(!e.message.includes('secret'));return true;
    });
  }
});
const diagnostic={mode:'bounded',succeeded:true,events:[],target:0,fd:3,bytes:100,budgetMs:5000,requestStartNs:1,pid:2,samples:1,offsetBefore:37,offsetAfter:37,droppedEvents:0,droppedFactories:0,first:'',error:''};
const trace=r=>'[visual-frame] '+JSON.stringify(r)+'\n';
check('trace late actual failure is not successful fallback observation',()=>{const r=frameTraceSummary(trace({...diagnostic,first:'bus-error'})+trace({...diagnostic,succeeded:false,first:'eos-no-target',error:'visual-frame-unavailable'}),'bounded');assert.equal(r.status,'captured');assert.equal(r.successes,1);assert.equal(r.failures,1);});
check('trace absent partial invalid setting write failure rejected',()=>{for(const s of ['', '[visual-frame] {', '[visual-frame] trace-config-invalid', '[visual-frame] trace-output-failed'])assert.equal(frameTraceSummary(s,'bounded').status,'incomplete');});
check('trace detail truncation and wrong mode rejected',()=>{for(const r of [{...diagnostic,droppedEvents:1},{...diagnostic,droppedFactories:1},{...diagnostic,mode:'full'}])assert.equal(frameTraceSummary(trace(r),'bounded').status,'incomplete');assert.equal(frameTraceSummary(trace(diagnostic),'invalid').status,'incomplete');});
check('trace success limit never suppresses failure coverage',()=>{assert.equal(frameTraceSummary(trace(diagnostic).repeat(4),'bounded').status,'incomplete');assert.equal(frameTraceSummary(trace({...diagnostic,succeeded:false}).repeat(10),'bounded').failures,10);});
check('process capture preserves bytes and enforces original4MiB cap',()=>{const a={bytes:0};let stops=0,written=0;captureBoundedProcessLog(a,Buffer.alloc(4*1024*1024),b=>{written+=b.length;return b.length;},()=>stops++);assert.equal(stops,0);captureBoundedProcessLog(a,Buffer.from('x'),()=>{throw Error();},()=>stops++);assert.equal(stops,1);assert.equal(written,4*1024*1024);assert.equal(a.captureError,'byte-cap');});
check('process capture write failure and short write stop child',()=>{for(const write of [()=>{throw Error('injected');},()=>0]){const a={bytes:0};let stops=0;captureBoundedProcessLog(a,Buffer.from('x'),write,()=>stops++);assert.equal(stops,1);assert.equal(a.captureError,'write-failed');assert.equal(a.overflow,true);}});
check('split diagnostic write failure marker stops capture without dropping product logs',()=>{const a={bytes:0};let stops=0,text='';const write=b=>{text+=b;return b.length;};for(const v of ['product error\n[visual-fr','ame] trace-output-failed\n'])captureBoundedProcessLog(a,Buffer.from(v),write,()=>stops++);assert.equal(stops,1);assert.equal(a.captureError,'decoder-trace-collection');assert.match(text,/product error/);assert(a.traceTail.length<=64);});
check('readback without decode is explicitly not observed; required decode missing still fails',()=>{assert.equal(frameTraceSummary('','bounded',false).status,'not-observed');assert.equal(frameTraceSummary('','bounded',true).status,'incomplete');assert.equal(frameTraceSummary('[visual-frame] trace-output-failed','bounded',false).status,'incomplete');});
check('late capture error survives successful child exit and previously valid trace',()=>{assert(processLogCaptureComplete({bytes:1},1));for(const a of [{bytes:1,overflow:true},{bytes:1,captureError:'write-failed'},{bytes:2},{bytes:4194305}])assert.equal(processLogCaptureComplete({...a,childExit:0},1),false);});
if(passed+failed!==54)failed++;

// 전이 probe의 명시 실패를 정상 수집으로 승격하지 않는다. 기존 보존 trace의 읽기는 유지한다.
check('edge probe failure reaches parent incomplete collection',()=>{
  const edges={decoderInstances:1,probesAttached:3,probeFailures:0,pulls:1,emptyPulls:0,marks:[],states:[]};
  assert.equal(frameTraceSummary(trace({...diagnostic,edges}),'bounded').status,'captured');
  const result=frameTraceSummary(trace({...diagnostic,edges:{...edges,probeFailures:1}}),'bounded');
  assert.equal(result.status,'incomplete');assert(result.issues.includes('edge-probe-failed'));
});
check('malformed provided edge collection cannot be captured',()=>{
  for(const edges of [null,{}, {probeFailures:-1}])assert.equal(frameTraceSummary(trace({...diagnostic,edges}),'bounded').status,'incomplete');
});
// 실제 실행기의 환경/launch/종료 요약을 실행한다. 제품 서버는 명시적인 Node 자식 대역이다.
const mixedSource=fs.readFileSync(new URL('./v450_recording_a_mixed.mjs',import.meta.url),'utf8');
function mixedBoundary(source=mixedSource,diagnose=true){
  const context=vm.createContext({path,process,repo:'/owned-repo',root:'/owned-run',stateExecution:null,diagnose,stateDiagnose:false,memoryDiagnose:false,memoryObserve:false,contentionDiagnose:false,
    http:61001,rtsp:61002,stun:61003,frameTraceSummary,assertMixedFrameTraceMode,parseLongrunArgs,
    short:false,args:diagnose?['--frame-diagnostic']:['--duration-minutes','120'],console:{log(){}}});
  const declaration=(source.match(/^const frameTraceMode=.*;$/m)?.[0]??'')+'\n'+source.match(/^const duration=.*;$/m)[0];
  const first=source.indexOf('function environment('),last=source.indexOf('async function request(',first);
  assert(first>=0&&last>first);vm.runInContext(declaration+'\n'+source.slice(first,last),context);
  const launchStart=source.indexOf('  const childEnv=',source.indexOf('async function launch('));
  const childStart=source.indexOf('  const child=spawn(',source.indexOf('async function launch('));
  const end=source.indexOf('  const log=',childStart);assert(childStart>=0&&end>childStart);
  return {context,launch:source.slice(launchStart>=0?launchStart:childStart,end),
    summary:source.match(/const frameTrace=frameTraceSummary\([^;]+;/)?.[0]};
}
function childMode(boundary){
  let called=0;boundary.context.spawn=(command,args,options)=>{
    called++;assert.equal(command,'/owned-repo/server.sh');assert.equal(args.join(','),'foreground');
    const child=spawnSync(process.execPath,['-e','process.stdout.write(JSON.stringify({trace:process.env.MEDIA_SERVER_VERIFY_FRAME_TRACE}))'],
      {...options,stdio:undefined,cwd:process.cwd(),encoding:'utf8',timeout:3000});
    assert.equal(child.status,0);return JSON.parse(child.stdout);
  };
  vm.runInContext(boundary.launch+'\nglobalThis.childResult=child;',boundary.context);
  assert.equal(called,1);return boundary.context.childResult.trace;
}
check('state diagnostic2700 keeps bounded and holder off',()=>{const b=mixedBoundary();b.context.stateDiagnose=true;b.context.memoryObserve=true;vm.runInContext(mixedSource.match(/^const duration=.*;$/m)[0].replace('const duration','globalThis.stateDuration'),b.context);assert.equal(b.context.stateDuration,2700000);assert.equal(childMode(b),'bounded');assert.equal(vm.runInContext('environment(1,2,3).MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE',b.context),'0');
  assert.equal(vm.runInContext('environment(1,2,3).MEDIA_SERVER_BIN_PATH',b.context),'/owned-repo/build-gst-onnx/media_server');
  b.context.stateExecution={product:'/qualified/build/media_server',runtime:'/qualified/build/libmedia_server_runtime.a'};
  assert.equal(vm.runInContext('environment(1,2,3).MEDIA_SERVER_BIN_PATH',b.context),b.context.stateExecution.product);
  assert.equal(vm.runInContext('environment(1,2,3).MEDIA_SERVER_BUILD_DIR',b.context),'/qualified/build');
  const opt=mixedBoundary();Object.assign(opt.context,{stateDiagnose:true,memoryObserve:true,stateExecution:b.context.stateExecution});
  assert.equal(childMode(opt),'bounded');
});
check('R72-V1 actual600 child environment receives bounded',()=>{const b=mixedBoundary();assert.equal(vm.runInContext('duration',b.context),600000);assert.equal(childMode(b),'bounded');});
check('R72-V1 actual600 final summary expects the child bounded mode',()=>{
  const b=mixedBoundary();b.context.text=trace(diagnostic);b.context.app={requiresFrameTrace:true};
  assert(b.summary);vm.runInContext(b.summary+'\nglobalThis.summaryResult=frameTrace;',b.context);
  assert.equal(b.context.summaryResult.mode,'bounded');assert.equal(b.context.summaryResult.status,'captured');
});
for(const value of ['1','0','undefined'])check(`mixed generated ${value} rejected before child spawn`,()=>{
  const changed=mixedSource.replace('VERIFY_FRAME_TRACE:frameTraceMode',`VERIFY_FRAME_TRACE:${value}`);
  assert.notEqual(changed,mixedSource);const b=mixedBoundary(changed);let called=0;b.context.spawn=()=>{called++;};
  assert.throws(()=>vm.runInContext(b.launch,b.context),/mixed-frame-trace-mode/);assert.equal(called,0);
});
check('mixed full generation and full expectation rejected before spawn',()=>{
  const changed=mixedSource.replace("const frameTraceMode='bounded';","const frameTraceMode='full';");
  assert.notEqual(changed,mixedSource);const b=mixedBoundary(changed);let called=0;b.context.spawn=()=>{called++;};
  assert.throws(()=>vm.runInContext(b.launch,b.context),/mixed-frame-trace-mode/);assert.equal(called,0);
});
check('mixed bounded generation with full summary mutation rejected',()=>{
  const changed=mixedSource.replace('frameTraceSummary(text,frameTraceMode,','frameTraceSummary(text,\'full\',');
  assert.notEqual(changed,mixedSource);const b=mixedBoundary(changed);assert.equal(childMode(b),'bounded');
  b.context.text=trace(diagnostic);b.context.app={requiresFrameTrace:true};
  vm.runInContext(b.summary+'\nglobalThis.summaryResult=frameTrace;',b.context);assert.equal(b.context.summaryResult.status,'incomplete');
});
check('mixed120 keeps actual bounded child and final expectation',()=>{
  const b=mixedBoundary(mixedSource,false);assert.equal(vm.runInContext('duration',b.context),7200000);assert.equal(childMode(b),'bounded');
  b.context.text=trace(diagnostic);b.context.app={requiresFrameTrace:true};
  vm.runInContext(b.summary+'\nglobalThis.summaryResult=frameTrace;',b.context);assert.equal(b.context.summaryResult.status,'captured');
});
check('MEM88 phase collection rejects missing/loss/late or broken pairs',()=>{
  const row=(v)=>'[visual-phase] '+JSON.stringify(v)+'\n';
  const begin={id:1,parent:0,thread:1,phase:'visual-search',end:false,ns:10};
  const end={...begin,end:true,ns:20};const complete=row(begin)+row(end);
  assert.equal(visualPhaseSummary(complete).status,'captured');
  assert.equal(visualPhaseSummary('').status,'incomplete');
  assert.equal(visualPhaseSummary('',false).status,'not-observed');
  for(const raw of [row(begin),row(end),complete+'[visual-phase-loss] cap\n',complete+'[visual-phase-loss] write\n',row(begin)+row({...end,thread:2}),complete+complete])assert.equal(visualPhaseSummary(raw).status,'incomplete');
  assert.equal(visualPhaseSummary(complete).phases['visual-search'].totalNs,10);
});
console.log(`[summary] passed=${passed} failed=${failed} elapsedMs=${Date.now()-start}`);process.exitCode=failed?1:0;

check('search terminal collector requires probe and rejects loss, partial, wrong attempts',()=>{
 const probe='[search-failure-probe] {"version":1,"attempts":3}\n';
 assert.equal(searchFailureSummary(probe).status,'captured');
 for(const text of ['',probe+probe,probe+'[search-failure-loss]\n',probe+'[search-failure] {',probe+'[search-failure] {"version":1,"status":503,"channels":1,"attempts":[]}\n'])assert.equal(searchFailureSummary(text).status,'incomplete');
 assert.equal(searchFailureSummary('',false).status,'not-observed');
});

check('state diagnostic preserves120 workspace accounting and excludes disabled holder collector',()=>{
 const workspaceLine=mixedSource.split('\n').find(s=>s.includes('workspace=freezeCurrentWorkspace(root)'));
 const holderLine=mixedSource.split('\n').find(s=>s.includes('const holders=catalogHolderSummary'));
 for(const [diagnose,stateDiagnose,expected] of [[true,true,true],[true,false,false],[false,false,true]]){
  let calls=0;const c=vm.createContext({diagnose,stateDiagnose,memoryDiagnose:false,contentionDiagnose:false,workspace:null,root:'/owned',console:{log(){}},freezeCurrentWorkspace(){calls++;return {};}});
  vm.runInContext(workspaceLine,c);assert.equal(calls,Number(expected));
 }
 const c=vm.createContext({diagnose:true,stateDiagnose:true,catalogHolderSummary(){throw Error('disabled holder collector');}});vm.runInContext(holderLine,c);
});
if(failed)process.exitCode=1;

check('R98 named profiles retain protection and derive continuous Q from E/H/P',()=>{
 const p=mixedRecordingProfile('continuous-r98');assert.equal(p.continuousMaxBytes,91226112);
 assert.equal(p.E+p.H+p.P+p.M,p.continuousMaxBytes);assert.equal(p.H,643*36864);
 assert.equal(mixedRecordingProfile('protection-r97').continuousMaxBytes,67371008);
 for(const name of [undefined,null,'','continuous','128MiB',{},1])assert.throws(()=>mixedRecordingProfile(name));
});
try{await (async()=>{
 const sourceFn=mixedSource.slice(mixedSource.indexOf('function source(id)'),mixedSource.indexOf('async function drain('));
 const profile=mixedRecordingProfile('continuous-r98');let registry={sources:['9101','9201'].map(sourceId=>({sourceId,recording:mixedRecordingSettings(profile.name,1,true)}))};
 const c=vm.createContext({stateDiagnose:false,fixtureProfile:profile,mixedRecordingSettings,nextRecordingSettings,assertMixedRecordingRegistry,check:ok=>assert(ok),
  request:async(_app,method,route,body)=>{if(method==='GET')return structuredClone(registry);const row=registry.sources.find(r=>r.sourceId===body.sourceId);row.recording=structuredClone(body.recording);return {source:structuredClone(row)};}});
 vm.runInContext(sourceFn,c);
 for(const id of ['9101','9201'])assert.equal(vm.runInContext(`source('${id}').recording.continuousMaxBytes`,c),profile.continuousMaxBytes);
 // 실제 함수의 비동기 설정 호출을 모두 기다린다.
 await vm.runInContext('settings({},false)',c);assertMixedRecordingRegistry(registry,profile.name,false);
 const disk=JSON.stringify(registry);registry=JSON.parse(disk);assertMixedRecordingRegistry(registry,profile.name,false);
 await vm.runInContext('settings({},true)',c);assertMixedRecordingRegistry(registry,profile.name,true);
 registry.sources[0].recording.continuousMaxBytes=134217728;assert.throws(()=>assertMixedRecordingRegistry(registry,profile.name,true));
})();passed++;console.log('[pass] R98 actual mixed source settings/restart contract');}catch(error){failed++;console.log('[fail] R98 actual mixed source settings/restart: '+error.message);}
check('R98 invalid revision and input binding are fail closed',()=>{
 for(const revision of [0,-1,Number.MAX_SAFE_INTEGER+1,Infinity,NaN])assert.throws(()=>mixedRecordingSettings('continuous-r98',revision,true));
 assert.throws(()=>nextRecordingSettings({sources:[{sourceId:'9101',recording:{revision:Number.MAX_SAFE_INTEGER}}]},'9101',true,'continuous-r98'));
 for(const b of [Buffer.alloc(0),Buffer.alloc(67929),Buffer.alloc(67930)])assert.throws(()=>assertMixedFixtureInput(b,'continuous-r98'));
});
console.log(`[final-summary] passed=${passed} failed=${failed}`);if(failed)process.exitCode=1;

try{await(async()=>{
 const fn=mixedSource.slice(mixedSource.indexOf('async function drain('),mixedSource.indexOf('async function sample('));
 let sizeBytes='36864',consumed=0;
 const c=vm.createContext({stateDiagnose:false,fixtureProfile:mixedRecordingProfile('continuous-r98'),observer:{pollAsync:async()=>({rows:[{segment:{continuous:true,channel:'9101',sizeBytes}}],backlog:false})},progress:{consume(){consumed++;return [];}}});
 vm.runInContext(fn,c);await vm.runInContext('drain(1)',c);assert.equal(consumed,1);
 for(sizeBytes of ['36865','37606']){await assert.rejects(vm.runInContext('drain(2)',c),/mixed-fixture-segment-bound/);assert.equal(consumed,1);}
})();passed++;console.log('[pass] R98 actual drain rejects output beyond fixed envelope before progress');}catch(error){failed++;console.log('[fail] R98 actual drain: '+error.message);}
console.log(`[R98-final-summary] passed=${passed} failed=${failed}`);if(failed)process.exitCode=1;

// R99: 실제 함수/최종 조건을 VM에서 호출한다. 기동과 순환을 같은 PASS로 집계하지 않는다.
const {mixedPreparationContract,mixedPreparationBundle}=await import('./recording_longrun_progress.mjs');
for(const args of [['--app-observe'],['--frame-diagnostic'],['--state-diagnostic'],['--duration-minutes','120']])check('R99 actual progress/recovery gate '+args.join(' '),()=>{
 const preparationContract=mixedPreparationContract(args),startup=args[0]==='--app-observe';
 const context=vm.createContext({preparationContract,phaseResult:{channels:{'9101':{finalized:1,deleted:0},'9201':{finalized:1,deleted:0}}},result:{catalogRecovered:true,available:2,deleted:0},check:ok=>assert(ok)});
 const progressGate=mixedSource.match(/check\(Object\.values\(phaseResult.channels\)[^;]+;/)[0];
 const recoveryGate=mixedSource.match(/check\(result.catalogRecovered[^;]+;/)[0];
 for(const gate of [progressGate,recoveryGate])startup?vm.runInContext(gate,context):assert.throws(()=>vm.runInContext(gate,context));
 context.phaseResult.channels['9101'].finalized=0;assert.throws(()=>vm.runInContext(progressGate,context));
});
check('R99 preparation bundle rejects every missing/failed component',()=>{
 for(const startup of ['PASS','FAIL','not-run'])for(const cyclicRecovery of ['PASS','FAIL','not-run'])for(const space of ['PASS','FAIL','not-run'])
 assert.equal(mixedPreparationBundle({startup,cyclicRecovery,space}).shortPreparationPass,[startup,cyclicRecovery,space].every(s=>s==='PASS'));
 assert.throws(()=>mixedPreparationContract(['--app-observe','extra']));
});
check('R99 actual usage gate retains deleted file absence even for startup',()=>{
 const fn=mixedSource.slice(mixedSource.indexOf('function verifyStatusUsage('),mixedSource.indexOf('async function snapshot('));
 for(const startup of [true,false]){
  let present=false;const context=vm.createContext({root:'/owned',path,console:{log(){}},preparationContract:{requiresDeletion:!startup},progress:{records:new Map([['x',{channel:'9101',sizeBytes:'8',mediaRelpath:'a.mp4',state:'finalized'}],['y',{channel:'9201',sizeBytes:'8',mediaRelpath:'b.mp4',state:'finalized'}]])},fs:{existsSync:()=>present,lstatSync:()=>({isFile:()=>true,isSymbolicLink:()=>false,nlink:1n,size:8n})},check:ok=>assert(ok)});
  vm.runInContext(fn,context);context.status={channels:['9101','9201'].map(channelId=>({channelId,continuousBytes:8,eventBytes:0}))};
  startup?vm.runInContext('verifyStatusUsage(status)',context):assert.throws(()=>vm.runInContext('verifyStatusUsage(status)',context));
  context.progress.records.set('d',{channel:'9101',sizeBytes:'8',mediaRelpath:'d.mp4',state:'deleted'});present=true;
  assert.throws(()=>vm.runInContext('verifyStatusUsage(status)',context),/status-deleted-media-present/);
 }
});
try{await(async()=>{
 const fn=mixedSource.slice(mixedSource.indexOf('async function verifySavedEvidence('),mixedSource.indexOf('async function evidenceLoad('));
 for(const requiresDeletion of [false,true]){
  const context=vm.createContext({preparationContract:{requiresDeletion},savedEvidence:null,savedStructuredEvidence:null,mixed:{deletedSourceObserved:false},check:ok=>assert(ok)});
  vm.runInContext(fn,context);if(requiresDeletion)await assert.rejects(vm.runInContext('verifySavedEvidence({},true)',context));else await vm.runInContext('verifySavedEvidence({},true)',context);
 }
})();passed++;console.log('[pass] R99 actual saved evidence restart gate separated');}catch(e){failed++;console.log('[fail] R99 saved evidence '+e.message);}
console.log(`[R99-final-summary] passed=${passed} failed=${failed}`);if(failed)process.exitCode=1;

check('R103 actual900 environment child and final holder collector are connected',()=>{
 const b=mixedBoundary();b.context.contentionDiagnose=true;
 vm.runInContext(mixedSource.match(/^const duration=.*;$/m)[0].replace('const duration','globalThis.diagnosticDuration'),b.context);assert.equal(b.context.diagnosticDuration,900000);
 b.context.spawn=(command,args,options)=>{
  const r=spawnSync(process.execPath,['-e','process.stdout.write(JSON.stringify([process.env.MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE,process.env.MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS,process.env.MEDIA_SERVER_VERIFY_FRAME_TRACE]))'],{...options,stdio:undefined,cwd:process.cwd(),encoding:'utf8',timeout:3000});assert.equal(r.status,0);assert.deepEqual(JSON.parse(r.stdout),['1','slow-first','bounded']);return {};
 };
 vm.runInContext(b.launch,b.context);
 let calls=0,saved=null;b.context.text='actual-child-output';b.context.app={requiresFrameTrace:true,child:{pid:123}};
 b.context.catalogHolderSummary=(text,required,expected)=>{assert.equal(expected,'slow-first');assert.equal(text,'actual-child-output');assert.equal(required,true);calls++;return {status:'incomplete',code:'holder-missing'};};
 b.context.fs={writeFileSync(p,body){saved=JSON.parse(body);}};b.context.failed=0;
 vm.runInContext(mixedSource.split('\n').find(s=>s.includes('const holders=catalogHolderSummary')),b.context);
 assert.equal(calls,1);assert.equal(saved.status,'incomplete');assert.equal(b.context.failed,1);
 assert.equal(mixedPreparationContract(['--contention-diagnostic']).requiresDeletion,false);
 for(const mode of ['--state-diagnostic','--duration-minutes 120'])assert.equal(mixedPreparationContract(mode.split(' ')).requiresDeletion,true);
});
console.log(`[R103-final-summary] passed=${passed} failed=${failed}`);if(failed)process.exitCode=1;

check('R114 profile derives every dependent byte without changing product E',()=>{
 const p=mixedRecordingProfile('continuous-r114');assert.equal(p.segmentBytes,71237);assert.equal(p.H,45805391);assert.equal(p.P,71237);assert.equal(p.E,67108864);assert.equal(p.M,260716);assert.equal(p.continuousMaxBytes,108*1024*1024);
 const h=fs.readFileSync(new URL('./recording_mixed_profile.h',import.meta.url),'utf8');assert(h.includes('66504')&&h.includes('877 + 120 * (8 + 4 + 12 + 8) + 4 * 4'));
 assert(mixedSource.includes("mixedRecordingProfile('continuous-r114')"));
 assert(fs.readFileSync(new URL('./run_v450_recording_a_mixed.py',import.meta.url),'utf8').includes("'fixtureProfile': 'continuous-r114'"));
});
try{await(async()=>{
 const profile=mixedRecordingProfile('continuous-r114');
 const fn=mixedSource.slice(mixedSource.indexOf('function source(id)'),mixedSource.indexOf('async function drain('));
 let registry={sources:['9101','9201'].map(sourceId=>({sourceId,recording:mixedRecordingSettings(profile.name,1,true)}))};
 const context=vm.createContext({stateDiagnose:false,fixtureProfile:profile,mixedRecordingSettings,nextRecordingSettings,assertMixedRecordingRegistry,check:ok=>assert(ok),request:async(_app,method,route,body)=>{if(method==='GET')return structuredClone(registry);const row=registry.sources.find(r=>r.sourceId===body.sourceId);row.recording=structuredClone(body.recording);return {source:structuredClone(row)};}});
 vm.runInContext(fn,context);assert.equal(vm.runInContext("source('9101').recording.continuousMaxBytes",context),profile.continuousMaxBytes);
 await vm.runInContext('settings({},false)',context);registry=JSON.parse(JSON.stringify(registry));assertMixedRecordingRegistry(registry,profile.name,false);
 await vm.runInContext('settings({},true)',context);assertMixedRecordingRegistry(registry,profile.name,true);
 registry.sources[0].recording.continuousMaxBytes=87*1024*1024;assert.throws(()=>assertMixedRecordingRegistry(registry,profile.name,true));
 const drain=mixedSource.slice(mixedSource.indexOf('async function drain('),mixedSource.indexOf('async function sample('));
 let sizeBytes='71237',consumed=0;const c=vm.createContext({stateDiagnose:false,fixtureProfile:profile,observer:{pollAsync:async()=>({rows:[{segment:{continuous:true,channel:'9201',sizeBytes}}],backlog:false})},progress:{consume(){consumed++;return [];}}});
 vm.runInContext(drain,c);await vm.runInContext('drain(1)',c);assert.equal(consumed,1);
 sizeBytes='71238';await assert.rejects(vm.runInContext('drain(2)',c),/mixed-fixture-segment-bound/);assert.equal(consumed,1);
})();passed++;console.log('[pass] R114 actual initialization/reactivation/restart and output boundary');}catch(e){failed++;console.log('[fail] R114 '+e.message);}
console.log(`[R114-summary] passed=${passed} failed=${failed}`);if(failed)process.exitCode=1;

if(process.argv[2])check('R114 fixed original input and codec/sample mutations fail closed',()=>{
 const input=fs.readFileSync(process.argv[2]);for(const profile of ['continuous-r98','continuous-r114']){
  assertMixedFixtureInput(input,profile);
  for(const box of ['mdat','avcC','stts','stsz']){const offset=input.indexOf(Buffer.from(box));assert(offset>0);const changed=Buffer.from(input);changed[offset+12]^=1;assert.throws(()=>assertMixedFixtureInput(changed,profile));}
  assert.throws(()=>assertMixedFixtureInput(input.subarray(1),profile));
 }
});
console.log(`[R114-input-summary] passed=${passed} failed=${failed}`);if(failed)process.exitCode=1;


// MEDIA-012-ACTIVE-HISTORY-F01: compact V2 rows and the actual driver boundary only;
// no product, native helper, fixture generation or network calls.
const {CurrentLongrunProgress,CurrentObservationBudget,CurrentRecordingObserver}=await import('./recording_current_observer.mjs');
const v2=(id,channel='9101',order='1',sizeBytes='8')=>({type:'segment_v2_bound_finalized',entity:id,occurredAtMs:'-100',mediaRelpath:`private/${id}.mp4`,
  segment:{id,channel,order,sizeBytes,continuous:true,sha256:'a'.repeat(64),metadataHash:'b'.repeat(64),storeHash:'c'.repeat(64),knownMappings:1,unknownMappings:0}});
const pending=id=>({type:'segment_v2_state',entity:id,state:'deletion-pending',occurredAtMs:'-90'});
const removed=id=>({type:'segment_v2_deleted',entity:id,segment:{metadataHash:'b'.repeat(64)},occurredAtMs:'-80'});
const tracked=(budget)=>new CurrentLongrunProgress(0,['9101','9201'],budget,{observeActiveHistory:true});
const receipt=(count,at,more={})=>({mutationCount:count,generation:'1',rotations:0,busy:false,backlog:false,partialBytes:0,drainStartedAt:at,drainCompletedAt:at+.5,...more});
function feed(p,rows,at,more={}){return p.consume(rows,at,receipt(p.activeHistory.consumedRows+rows.length,at,more));}
const channel=(p,id='9101')=>p.activeHistorySnapshot().channels[id];
check('AH01 zero deletion preserves observed scope and finalized growth',()=>{
 const p=tracked();feed(p,[v2('a')],1);feed(p,[v2('b','9101','2','13')],2);
 const c=channel(p);assert.deepEqual(c.observedFinalized,{count:2,bytes:'21'});assert.deepEqual(c.finalized,c.observedFinalized);
 assert.deepEqual(c.pending,{count:0,bytes:'0'});assert.deepEqual(c.deleted,{count:0,bytes:'0'});
 assert.equal(c.observedHistoryRecords,2);assert.equal(c.deletionObservation,'NO_DELETION_OBSERVED');assert.equal(c.firstDeletedObservedAt,null);
 const s=p.activeHistorySnapshot();assert.equal(s.scope,'observed-drained-v2-prefix');assert.equal(s.coverage.status,'COMPLETE_DRAINED_PREFIX');
 for(const k of ['fixedActiveStability','productActive','lifetimeOverlap','wholeHeapPeak','sqliteVmMemory'])assert.equal(s[k],'NOT_PROVEN');
});
check('AH02 pending remains owned state; deleted retains History and physical return path',()=>{
 const p=tracked();feed(p,[v2('a')],1);const old=p.status(1);feed(p,[pending('a')],2);
 assert.deepEqual(channel(p).finalized,{count:0,bytes:'0'});assert.deepEqual(channel(p).pending,{count:1,bytes:'8'});assert.equal(channel(p).deleted.count,0);
 assert.equal(channel(p).firstPendingObservedAt,2.5);assert.equal(channel(p).firstDeletedObservedAt,null);
 assert.deepEqual(feed(p,[removed('a')],3),[{id:'a',mediaRelpath:'private/a.mp4'}]);
 const c=channel(p);assert.deepEqual(c.pending,{count:0,bytes:'0'});assert.deepEqual(c.deleted,{count:1,bytes:'8'});assert.equal(c.observedHistoryRecords,1);
 assert.equal(c.firstDeletedObservedAt,3.5);assert.equal(c.lastTransitionObservedAt,3.5);assert.equal(p.records.get('a').state,'deleted');
 const after=p.status(3);assert.equal(after.records,old.records);assert.equal(after.logicalBytes,old.logicalBytes);assert.equal(after.channels['9101'].finalized,1);
 assert.equal(c.deletionObservation,'DELETION_OBSERVED');
});
check('AH03 later finalize and independent channels retain cumulative bytes',()=>{
 const p=tracked();feed(p,[v2('a'),v2('b','9201','1','17')],1);feed(p,[pending('a'),removed('a')],2);
 feed(p,[v2('c','9101','2','29')],3);feed(p,[pending('c'),removed('c'),v2('d','9101','3','31')],4);
 const a=channel(p),b=channel(p,'9201');assert.deepEqual(a.observedFinalized,{count:3,bytes:'68'});assert.deepEqual(a.finalized,{count:1,bytes:'31'});
 assert.deepEqual(a.deleted,{count:2,bytes:'37'});assert.deepEqual(a.finalizedAfterFirstDeleted,{count:2,bytes:'60'});
 assert.equal(a.firstPendingObservedAt,2.5);assert.equal(a.firstDeletedObservedAt,2.5);assert.equal(a.observedHistoryRecords,3);
 assert.deepEqual(b.finalized,{count:1,bytes:'17'});assert.equal(b.deletionObservation,'NO_DELETION_OBSERVED');
 assert.equal(p.activeHistorySnapshot().fixedActiveStability,'NOT_PROVEN'); // count stayed one; bytes grew
});
for(const [name,setup,bad] of [
 ['duplicate-finalized',p=>feed(p,[v2('a')],1),v2('a')],
 ['duplicate-pending',p=>feed(p,[v2('a'),pending('a')],1),pending('a')],
 ['delete-before-pending',p=>feed(p,[v2('a')],1),removed('a')],
 ['duplicate-deleted',p=>feed(p,[v2('a'),pending('a'),removed('a')],1),removed('a')],
 ['pending-after-deleted',p=>feed(p,[v2('a'),pending('a'),removed('a')],1),pending('a')],
 ['wrong-state',p=>feed(p,[v2('a')],1),{...pending('a'),state:'finalized'}],
 ['wrong-metadata',p=>feed(p,[v2('a'),pending('a')],1),{...removed('a'),segment:{metadataHash:'d'.repeat(64)}}],
 ['regressed-order',p=>feed(p,[v2('a','9101','2')],1),v2('b')],
])check('AH04 reject '+name+' without aggregate change and latch incomplete',()=>{
 const p=tracked();setup(p);const before=channel(p);assert.throws(()=>feed(p,[bad],2));assert.deepEqual(channel(p),before);
 assert(p.activeHistorySnapshot().coverage.issues.includes('MUTATION_REJECTED'));
 assert.throws(()=>feed(p,[v2('valid','9201')],3),/active-history-rejected/);
});
check('AH05 uint64 media and totals beyond uint64 retain exact decimal values',()=>{
 const p=tracked();feed(p,[v2('a','9101','1','18446744073709551615'),v2('b','9101','2','18446744073709551615')],1);
 assert.equal(channel(p).observedFinalized.bytes,'36893488147419103230');
 feed(p,[pending('a'),removed('a')],2);assert.equal(channel(p).finalized.bytes,'18446744073709551615');
 assert.equal(channel(p).deleted.bytes,'18446744073709551615');assert.doesNotThrow(()=>JSON.stringify(p.activeHistorySnapshot()));
 const q=tracked();feed(q,[v2('x','9101','1','9007199254740993')],1);assert.equal(channel(q).finalized.bytes,'9007199254740993');
});
for(const bytes of ['18446744073709551616','99999999999999999999','0','-1','01','1.5',9007199254740992,8n])
 check('AH06 invalid or overflowing media bytes '+String(bytes),()=>{const p=tracked();assert.throws(()=>feed(p,[v2('a','9101','1',bytes)],1));assert.equal(p.records.size,0);assert.equal(channel(p).observedFinalized.count,0);});
check('AH07 failed shared budget does not commit aggregate or record',()=>{
 const budget=new CurrentObservationBudget({maxIds:1,maxBytes:33554432}),p=tracked(budget);feed(p,[v2('a')],1);const before=channel(p);
 assert.throws(()=>feed(p,[v2('b','9101','2')],2),/combined-cap/);assert.deepEqual(channel(p),before);assert.equal(p.records.size,1);assert.equal(budget.ids,1);
});
check('AH08 missing prefix receipt remains incomplete after a later receipt',()=>{
 const p=tracked();p.consume([v2('a')],1);feed(p,[],2);assert(p.activeHistorySnapshot().coverage.issues.includes('DRAIN_RECEIPT_MISSING'));
 assert.equal(channel(p).lastTransitionObservedAt,null);
});
check('AH09 count gap and unmatched lifecycle cannot become complete',()=>{
 for(const run of [p=>feed(p,[v2('a')],1,{mutationCount:2}),p=>feed(p,[pending('unknown')],1)]){
  const p=tracked();run(p);feed(p,[],2);assert.equal(p.activeHistorySnapshot().coverage.status,'INCOMPLETE');
 }
});
for(const [key,value,issue] of [['partialBytes',7,'PARTIAL_TAIL'],['backlog',true,'PREFIX_BACKLOG'],['busy',true,'OBSERVER_BUSY'],['generation',null,'GENERATION_UNOBSERVED']])
 check('AH10 '+issue+' is not a complete drain; later valid prefix may complete',()=>{
  const p=tracked();feed(p,[],1,{[key]:value});assert(p.activeHistorySnapshot().coverage.issues.includes(issue));feed(p,[],2);
  assert.equal(p.activeHistorySnapshot().coverage.status,'COMPLETE_DRAINED_PREFIX');assert.equal(p.activeHistorySnapshot().fixedActiveStability,'NOT_PROVEN');
 });
check('AH11 malformed count, clock, generation and regression fail coverage',()=>{
 for(const change of [{mutationCount:NaN},{mutationCount:Number.MAX_SAFE_INTEGER+1},{partialBytes:-1},{backlog:undefined},{drainStartedAt:-1},{drainCompletedAt:0},{generation:1},{rotations:Infinity}]){
  const p=tracked();feed(p,[],1,change);assert.equal(p.activeHistorySnapshot().coverage.status,'INCOMPLETE');
 }
 const p=tracked();feed(p,[],1,{generation:'3',rotations:2});feed(p,[],2,{generation:'2',rotations:1});assert(p.activeHistorySnapshot().coverage.issues.includes('DRAIN_REGRESSION'));
});
check('AH12 snapshot is detached, private fields excluded, no whole Map scan',()=>{
 const p=tracked();feed(p,[v2('secret-id')],1);
 for(const method of ['values','entries','forEach',Symbol.iterator])p.records[method]=()=>{throw Error('full-map-scan');};
 feed(p,[pending('secret-id')],2);const s=p.activeHistorySnapshot();s.channels['9101'].pending.count=42;s.coverage.drain.mutationCount=42;
 assert.equal(channel(p).pending.count,1);assert.equal(p.activeHistorySnapshot().coverage.drain.mutationCount,2);
 assert(!JSON.stringify(p.activeHistorySnapshot()).includes('secret'));assert(!JSON.stringify(p.activeHistorySnapshot()).includes('private/'));
});
check('AH13 independent full-state oracle matches every increment',()=>{
 const p=tracked(),oracle=new Map();let time=1,order=0;
 for(let i=0;i<40;i++){
  const id='oracle-'+i,ch=i%2?'9201':'9101',bytes=BigInt(i+1)*9007199254740993n;
  const batches=[[v2(id,ch,String(++order),String(bytes))],...(i%3?[[pending(id)]]:[]),...(i%3===2?[[removed(id)]]:[])];
  for(const rows of batches){
   feed(p,rows,time++);
   for(const r of rows){if(r.type==='segment_v2_bound_finalized')oracle.set(r.entity,{ch,bytes,state:'finalized'});else oracle.get(r.entity).state=r.type==='segment_v2_state'?'pending':'deleted';}
   for(const channelId of ['9101','9201']){
    const all=[...oracle.values()].filter(v=>v.ch===channelId),c=channel(p,channelId);
    for(const state of ['finalized','pending','deleted']){const selected=all.filter(v=>v.state===state);assert.deepEqual(c[state],{count:selected.length,bytes:String(selected.reduce((n,v)=>n+v.bytes,0n))});}
    assert.deepEqual(c.observedFinalized,{count:all.length,bytes:String(all.reduce((n,v)=>n+v.bytes,0n))});assert.equal(c.observedHistoryRecords,all.length);
   }
  }
 }
});
check('AH14 opt-out keeps legacy status, limits, stall and shared records semantics',()=>{
 const legacy=new CurrentLongrunProgress(0),observed=tracked();const rows=[v2('a'),pending('a'),removed('a'),v2('b','9201')];
 legacy.consume(rows,1);feed(observed,rows,1);assert.deepEqual(observed.status(1),legacy.status(1));assert.equal(legacy.activeHistorySnapshot(),null);
 assert.deepEqual([...observed.records],[...legacy.records]);assert.throws(()=>observed.status(30002),/finalize-stall/);
 const q=tracked();assert.throws(()=>q.finish(1),/longrun-incomplete/);
});
check('AH15 malformed native prefix still rejects before aggregate acceptance',()=>{
 const observer=new CurrentRecordingObserver('/not-used','/must-not-run');
 assert.throws(()=>observer.acceptGeneration({busy:false,generation:'1',storeHash:'c'.repeat(64),prefix:[],rows:[{}],backlog:false,partialBytes:0,consumedOffset:0}),/observer-native-output-invalid/);
});

async function ahAsync(name,fn){try{await fn();passed++;console.log('[pass] '+name);}catch(e){failed++;console.log('[fail] '+name+': '+e.stack);}}
function sampleBoundary(stateDiagnose,{short=false,memoryObserve=stateDiagnose}={}){
 let clock=10;const logs=[],calls={metrics:0,poll:0,root:0,cadence:0,cpu:0,step:0,admit:0};
 const progress=new CurrentLongrunProgress(0,['9101','9201'],undefined,{observeActiveHistory:stateDiagnose});
 const observer={prefix:[],generation:'1',budget:{ids:0,bytes:0},async pollAsync(){calls.poll++;return {rows:[],mutationCount:0,typeCounts:{},identityBytes:0,rotations:0,partialBytes:0,backlog:false,busy:false};}};
 const metric={valid:true,error:null,pid:42,startIdentity:'linux:10',sampledAt:100,rssBytes:1024,threadCount:2,fdCount:4,footprintBytes:1024,anonymousFileBytes:0,anonymousAllocatedBytes:0,anonymousFiles:0,fdObservation:{complete:true}};
 const context=vm.createContext({stateDiagnose,short,memoryObserve,progress,observer,performance:{now:()=>++clock},process:{hrtime:{bigint:()=>BigInt(++clock)*1000000n}},
  fixtureProfile:mixedRecordingProfile('continuous-r114'),root:'/never-read',collector:'/never-executed',path,samples:[],observationStart:0,start:0,workspace:null,
  console:{log:s=>logs.push(s)},collectProcess:async()=>{calls.metrics++;return {...metric};},
  spawnSync:(cmd)=>{assert.equal(cmd,'ps');calls.cpu++;return {status:0,stdout:'42 1 0\n'};},
  currentResourceTrace:()=>({seq:7,ram:256}),rootDiagnostic:()=>{calls.root++;return {variableBytes:0,totalBytes:0};},
  assertSampleStep:()=>calls.step++,assertLaunchMetrics:()=>{},memoryAttributionSnapshot:()=>({receivedNs:12,sample:{pid:42,phase:'sample',sampleStartNs:1,sampleEndNs:10}}),
  admitWorkspaceSnapshot:()=>calls.admit++,cadence:()=>calls.cadence++,check:ok=>assert(ok),
  workspaceFailure:{capture(){throw Error('unexpected-workspace-failure');}}});
 vm.runInContext(mixedSource.slice(mixedSource.indexOf('async function drain('),mixedSource.indexOf('function fileHash(')),context);
 return {context,logs,calls,progress,observer,app:{child:{pid:42},identity:{startIdentity:'linux:10'},resourceTrace:{receivedAt:0},identitySampleIndexes:[]}};
}
for(const mode of ['state','memory','contention','prepare','120','frame'])await ahAsync('AH16 actual sample/drain boundary '+mode,async()=>{
 const b=sampleBoundary(mode==='state',{short:mode==='prepare',memoryObserve:['state','memory'].includes(mode)});b.context.app=b.app;
 await vm.runInContext('sample(app)',b.context);
 assert.deepEqual(b.calls,{metrics:1,poll:1,root:1,cadence:1,cpu:1,step:1,admit:1});assert.equal(b.context.samples.length,1);
 const observation=JSON.parse(b.logs.find(s=>s.startsWith('[current-observation] ')).slice('[current-observation] '.length));
 assert.equal(Object.hasOwn(observation,'activeHistory'),mode==='state');assert.equal(observation.resourceTrendPass,false);
 const mem=b.logs.find(s=>s.startsWith('[memory-attribution-cycle] '));
 if(mode==='state'){
  const a=observation.activeHistory,m=JSON.parse(mem.slice('[memory-attribution-cycle] '.length));
  assert.equal(a.sampleIndex,1);assert.equal(m.sampleIndex,1);assert.equal(a.sampleStartNs,m.sampleStartNs);assert.equal(a.processCapturedNs,m.processCapturedNs);
  assert(a.metricsCompletedAt<=a.drainStartedAt);assert(a.coverage.drain.drainStartedAt>=a.drainStartedAt);assert(a.coverage.drain.drainCompletedAt<=a.drainCompletedAt);
  assert.equal(a.productOwnerSeq,observation.productOwner.seq);assert.equal(a.coverage.drain.generation,'1');assert.equal(a.atomic,false);
 }else if(mem)assert.equal(Object.hasOwn(JSON.parse(mem.slice('[memory-attribution-cycle] '.length)),'sampleIndex'),false);
});
await ahAsync('AH17 actual multi-page drain is observed once per existing page; no added poll',async()=>{
 const b=sampleBoundary(true);let n=0;
 b.observer.pollAsync=async()=>{n++;return {rows:n===1?[v2('a')]:[],mutationCount:1,rotations:1,partialBytes:0,backlog:n===1,busy:false};};
 b.observer.generation='7';await vm.runInContext('drain(1)',b.context);assert.equal(n,2);
 assert.equal(channel(b.progress).observedFinalized.count,1);assert.equal(b.progress.activeHistorySnapshot().coverage.status,'COMPLETE_DRAINED_PREFIX');
 assert.equal(b.progress.activeHistorySnapshot().coverage.drain.generation,'7');assert.equal(b.progress.activeHistorySnapshot().coverage.drain.rotations,1);
});
await ahAsync('AH18 native drain failure preserves first error and invalidates coverage',async()=>{
 const b=sampleBoundary(true);b.observer.pollAsync=async()=>{throw Error('observer-checkpoint-prefix-mismatch');};
 await assert.rejects(vm.runInContext('drain(1)',b.context),/observer-checkpoint-prefix-mismatch/);
 assert(b.progress.activeHistorySnapshot().coverage.issues.includes('DRAIN_FAILED'));
});
check('AH19 state-only constructor/report wiring and original observation order retained',()=>{
 assert(mixedSource.includes("new CurrentLongrunProgress(begin,['9101','9201'],observationBudget,{observeActiveHistory:stateDiagnose})"));
 assert(mixedSource.includes('...(stateDiagnose?{activeHistory:progress?.activeHistorySnapshot()??null}:{})'));
 assert(mixedSource.includes("await sample(first);await request(first,'GET','/ops/api/recordings/status',undefined,true);\n    await evidenceLoad(first);await aLoad.tick(first);cadence();"));
 assert(mixedSource.includes('const sleepMs=nextSampleDelay(samples.at(-1).phaseAt,performance.now(),begin+duration);'));
 assert(mixedSource.includes('if(!memoryDiagnose)check(orderedLatencies.at(Math.ceil(orderedLatencies.length*.95)-1)<=2000&&orderedLatencies.at(-1)<=5000'));
});
check('AH20 bounded aggregate size independent of History payload count',()=>{
 const p=tracked();for(let i=0;i<300;i++)feed(p,[v2('private-'+i,i%2?'9101':'9201',String(i+1),'18446744073709551615')],i+1);
 const bytes=Buffer.byteLength(JSON.stringify(p.activeHistorySnapshot()));assert(bytes<4096); // encoding envelope, not a product/memory gate
 console.log('[active-history-encoding] '+JSON.stringify({records:p.records.size,channels:2,snapshotBytes:bytes,fullMapScans:0,actual45MinuteCapacity:'NOT_PROVEN'}));
});
console.log(`[ACTIVE-HISTORY-summary] passed=${passed} failed=${failed}`);if(failed)process.exitCode=1;
