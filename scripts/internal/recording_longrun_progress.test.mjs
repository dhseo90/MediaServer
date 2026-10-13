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
  const context=vm.createContext({path,process,repo:'/owned-repo',root:'/owned-run',diagnose,stateDiagnose:false,contentionDiagnose:false,
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
check('state diagnostic2700 keeps bounded and holder off',()=>{const b=mixedBoundary();b.context.stateDiagnose=true;vm.runInContext(mixedSource.match(/^const duration=.*;$/m)[0].replace('const duration','globalThis.stateDuration'),b.context);assert.equal(b.context.stateDuration,2700000);assert.equal(childMode(b),'bounded');assert.equal(vm.runInContext('environment(1,2,3).MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE',b.context),'0');});
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
  let calls=0;const c=vm.createContext({diagnose,stateDiagnose,contentionDiagnose:false,workspace:null,root:'/owned',console:{log(){}},freezeCurrentWorkspace(){calls++;return {};}});
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
 const c=vm.createContext({fixtureProfile:profile,mixedRecordingSettings,nextRecordingSettings,assertMixedRecordingRegistry,check:ok=>assert(ok),
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
 const c=vm.createContext({fixtureProfile:mixedRecordingProfile('continuous-r98'),observer:{pollAsync:async()=>({rows:[{segment:{continuous:true,channel:'9101',sizeBytes}}],backlog:false})},progress:{consume(){consumed++;return [];}}});
 vm.runInContext(fn,c);await vm.runInContext('drain(1)',c);assert.equal(consumed,1);
 sizeBytes='36865';await assert.rejects(vm.runInContext('drain(2)',c),/mixed-fixture-segment-bound/);assert.equal(consumed,1);
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
