// 실제 driver 함수 경계를 mock child/collector와 기존 artifact writer로 실행한다. 제품/native 실행은 없다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import * as identity from './recording_foundation_observer.mjs';
import {createReviewTestArtifacts} from './va_review_test_artifacts.mjs';
import {createProcessCleanup} from './recording_process_cleanup.mjs';
import {captureBoundedProcessLog,processLogCaptureComplete} from './recording_longrun_progress.mjs';

const source=fs.readFileSync(new URL('./v450_recording_a_mixed.mjs',import.meta.url),'utf8');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function metric(pid,startIdentity='macos:123:456'){
  return {pid,startIdentity,valid:true,error:null,rssBytes:1000,threadCount:1,fdCount:3,sampledAt:1,footprintBytes:null,
    fdObservation:{scope:'complete-round-sequential-v1',complete:true,startIdentity,startedAt:1,roundStartedAt:1,roundCompletedAt:2,completedAt:2,rounds:1,capacityRetries:0,closedRetries:0,detailCalls:1,failures:[]}};
}
function fixture(t,{short=true,pids=[101,102,103],collect,healthFailure=false,writeFailure=false,logFailure=false}={}){
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'mixed-identity-focused-')));fs.chmodSync(root,0o700);
  const artifacts=createReviewTestArtifacts('/mock-repo',{MEDIA_SERVER_TEST_ARTIFACT_ROOT:root,MEDIA_SERVER_TEST_OUTPUT_DIR:path.join(root,'artifacts')});
  const events=[],processes=[],samples=[];let nextPort=61000,collects=0,drains=0,authCalls=0;
  const context=vm.createContext({...identity,path,crypto,process,performance,Buffer,URLSearchParams,AbortSignal,
    fs:logFailure?{...fs,openSync(){throw Error('mock-log-open-failed');}}:fs,
    repo:'/mock-repo',root,short,stateDiagnose:false,memoryObserve:false,frameTraceMode:'bounded',duration:30000,ports:[],processes,samples,
    artifacts:writeFailure?{...artifacts,write(){throw Error('mock-disk-full');}}:artifacts,
    environment:()=>({MEDIA_SERVER_VERIFY_FRAME_TRACE:'bounded'}),assertMixedFrameTraceMode(){},reservePort:async()=>++nextPort,
    console:{log(line){events.push(line);}},
    spawn(){const child=new EventEmitter();Object.assign(child,{pid:pids[processes.length],exitCode:null,signalCode:null,stdout:new EventEmitter(),stderr:new EventEmitter(),kill(){throw Error('unexpected-kill');}});events.push('spawn');return child;},
    createProcessCleanup,stopServer:async child=>{events.push('stop');child.exitCode=0;child.emit('close');return {forced:false};},assertPortClosed:async()=>{},
    completionCollection:()=>({append(){},finish:()=>({status:'captured',rows:1})}),memoryAttributionCollector:()=>({}),resourceTraceCollector:pid=>({pid,receivedAt:1}),
    captureBoundedProcessLog,collectResourceTrace(){},collectMemoryAttribution(){},
    until:async fn=>{events.push('health');if(healthFailure)throw Error('observation-wait-timeout');assert.equal(await fn(),true);},
    request:async(app,method,route)=>{events.push(route);return {};},auth:null,passwords:['mock-password'],
    bootstrapRecordingUiAuth:async()=>{events.push('auth');authCalls++;return {cookies:['mock-cookie']};},
    fetch:async()=>{events.push('auth');authCalls++;return {status:302,headers:{getSetCookie:()=>['mock-cookie']},arrayBuffer:async()=>new ArrayBuffer(0)};},
    assertLocalIceConfig(){},check(ok,label){assert(ok,label);},collector:'/mock-collector',
    collectProcess:async(binary,pid)=>{collects++;events.push('collect');const app=processes.at(-1);
      assert.equal(typeof app.cleanup,'function');assert(app.child.stdout.listenerCount('data')>0);assert(app.child.stderr.listenerCount('data')>0);
      return collect?collect({pid,app,index:processes.length,calls:collects}):metric(pid,`macos:123:${processes.length}`);},
    observationStart:0,start:0,workspace:null,observer:{prefix:[],budget:{ids:0,bytes:0}},progress:{status:()=>({})},
    spawnSync:()=>({status:0,stdout:`${processes.at(-1).child.pid} 1 1\n`}),currentResourceTrace:()=>({}),
    assertSampleStep(){},drain:async()=>{drains++;return {mutationCount:1,typeCounts:{}};},rootDiagnostic:()=>({}),
    admitWorkspaceSnapshot(value){assert.equal(value.expectedStart,processes.at(-1).identity?.startIdentity??null);},
    workspaceFailure:{capture(error){events.push('failure:'+error.message);}},cadence(){},failed:0
  });
  const begin=source.indexOf('async function launch('),end=source.indexOf('function source(',begin);
  assert(begin>=0&&end>begin);vm.runInContext(source.slice(begin,end),context);
  const sampleBegin=source.indexOf('async function sample('),sampleEnd=source.indexOf('function fileHash(',sampleBegin);
  vm.runInContext(source.slice(sampleBegin,sampleEnd),context);
  const finalBegin=source.indexOf('  const identityCoverage='),finalEnd=source.indexOf('  const final=',finalBegin);
  assert(finalBegin>=0&&finalEnd>finalBegin);
  t.after(async()=>{
    for(const app of processes){await context.stop(app);if(app.logFd!==null){fs.closeSync(app.logFd);app.logFd=null;}}
    fs.rmSync(root,{recursive:true});assert.equal(fs.existsSync(root),false);
  });
  return {root,artifacts,context,events,processes,samples,
    counts:()=>({collects,drains,authCalls}),
    launch:(...args)=>context.launch(61003,...args),stop:app=>context.stop(app),sample:app=>context.sample(app),
    closeEvidence:async app=>{
      await context.stop(app);fs.closeSync(app.logFd);app.logFd=null;const bytes=fs.readFileSync(app.log);
      app.identityLog={file:path.basename(app.log),bytes:bytes.length,sha256:hash(bytes),complete:processLogCaptureComplete(app,bytes.length)};
      app.identityCompletion={status:'captured',rows:1};app.identityResource={status:'captured',count:1,final:{pid:app.child.pid}};
    },
    verdict:()=>vm.runInContext(`(()=>{${source.slice(finalBegin,finalEnd)}return {identityCoverage,resultFailed,startupPreparationPass:${source.match(/startupPreparationPass:([^,]+)/)[1]}}})()`,context)
  };
}

test('IDENTITY-F01 최초 + 두 재시작은 health 뒤/업무 전 수집, 종료 후 각 artifact와 로그 연결',async t=>{
  const f=fixture(t);
  for(let n=0;n<3;n++){
    const app=await f.launch(n!==1);const saved=JSON.parse(fs.readFileSync(path.join(f.artifacts.outputDir,app.identity.artifact.file)));
    assert.equal(saved.pid,101+n);assert.equal(saved.status,'captured');assert.equal(app.child.exitCode,null);
    assert.equal(saved.phase,['initial','disabled-restart','reactivated-restart'][n]);assert.equal(saved.logFile,`server-${n+1}.private.log`);
    app.child.stdout.emit('data',Buffer.from('mock product line\n'));
    assert.equal(app.identity.artifact.bytes<=4096,true);await f.closeEvidence(app);
  }
  assert.equal(new Set(f.processes.map(a=>a.identity.launchId)).size,3);
  assert.deepEqual(f.counts(),{collects:3,drains:0,authCalls:3});assert.equal(f.samples.length,0);
  const order=f.events.filter(x=>['spawn','health','collect','auth','stop'].includes(x));assert.deepEqual(order,Array(3).fill(['spawn','health','collect','auth','stop']).flat());
  const v=f.verdict();assert.equal(v.identityCoverage.status,'PASS');assert.equal(v.resultFailed,false);assert.equal(v.startupPreparationPass,true);
  assert(v.identityCoverage.launches.every(x=>x.log.sha256&&x.completion.status==='captured'&&x.resource.final.pid===x.identity.pid&&x.cleanup.normalShutdownPass));
});

test('IDENTITY-F01 가운데 재시작 identity 누락은 업무/세 번째 실행 차단, cleanup 보존',async t=>{
  const f=fixture(t,{collect:({pid,index})=>metric(pid,index===2?null:'macos:123:1')});
  await f.closeEvidence(await f.launch());await assert.rejects(()=>f.launch(false),/identity-value-invalid/);
  assert.equal(f.processes.length,2);assert.equal(f.counts().authCalls,1);await f.closeEvidence(f.processes[1]);
  assert.equal(f.verdict().identityCoverage.status,'FAIL');assert.equal(f.processes[1].identity.error,'identity-value-invalid');
});

for(const [name,options,code] of [
  ['PID',{collect:({pid})=>metric(pid+1)},'identity-pid-mismatch'],
  ['FD receipt',{collect:({pid})=>({...metric(pid),fdObservation:null})},'identity-fd-incomplete'],
  ['process exit',{collect:({pid,app})=>{app.child.exitCode=7;return metric(pid);}},'identity-process-exited'],
  ['permission',{collect:()=>{const e=Error('private');e.collectorDiagnostic={spawnCode:'EPERM'};throw e;}},'identity-permission'],
  ['timeout',{collect:()=>{const e=Error('private');e.collectorDiagnostic={killed:true,signal:'SIGKILL'};throw e;}},'identity-timeout'],
  ['collector',{collect:()=>{throw Error('private');}},'identity-collector-error'],
  ['artifact write',{writeFailure:true},'identity-artifact-write-failed'],
  ['health',{healthFailure:true},'observation-wait-timeout'],
  ['private log open',{logFailure:true},'mock-log-open-failed']
])test(`IDENTITY-F01 ${name} 실패는 auth 이전에 중단하고 등록된 cleanup 수행`,async t=>{
  const f=fixture(t,options);await assert.rejects(()=>f.launch(),new RegExp(code));assert.equal(f.counts().authCalls,0);assert.equal(f.processes.length,1);
  await f.stop(f.processes[0]);assert.equal(f.processes[0].result.archiveSafe,true);assert.equal(f.verdict().resultFailed,true);
  if(name==='health')assert.equal(f.processes[0].identity.error,'identity-health-failed');
  if(name==='artifact write')assert.equal(f.processes[0].identity.artifactError,code);
  if(name==='PID')assert.equal(f.processes[0].identity.collectionFailure.observedPid,102);
  if(name==='permission')assert.equal(f.processes[0].identity.collectionFailure.spawnCode,'EPERM');
});

test('IDENTITY-F01 PID 재사용은 OS identity와 Launch ID가 다른 별도 실행으로 보존',async t=>{
  const f=fixture(t,{pids:[101,101,101]});for(let n=0;n<3;n++)await f.closeEvidence(await f.launch());
  assert.equal(new Set(f.processes.map(a=>a.identity.launchId)).size,3);assert.equal(f.verdict().identityCoverage.status,'PASS');
});

test('IDENTITY-F01 동일 PID/OS identity의 중복 실행 증거 거부',async t=>{
  const f=fixture(t,{pids:[101,101],collect:({pid})=>metric(pid)});await f.closeEvidence(await f.launch());await f.closeEvidence(await f.launch());
  assert.equal(f.verdict().identityCoverage.launches[1].error,'identity-duplicate');
});

test('IDENTITY-F01 신규 수집은 sample/drain 미호출, 기존 sample 1회만 시계열에 결속',async t=>{
  const f=fixture(t),app=await f.launch();assert.equal(f.samples.length,0);assert.equal(f.counts().drains,0);
  await f.sample(app);assert.equal(f.samples.length,1);assert.equal(f.counts().collects,2);assert.equal(f.counts().drains,1);
  assert.deepEqual(Array.from(app.identitySampleIndexes),[0]);assert.equal(f.events.filter(x=>x.startsWith('/')).length,2);
  await f.closeEvidence(app);assert.equal(f.verdict().identityCoverage.status,'PASS');
});

test('IDENTITY-F01 첫 정규 sample도 launch의 OS identity와 비교하여 혼합 표본 거부',async t=>{
  const f=fixture(t,{collect:({pid,calls})=>metric(pid,`macos:123:${calls}`)}),app=await f.launch();
  await assert.rejects(()=>f.sample(app),/identity-changed/);assert.equal(f.samples.length,0);assert.equal(f.counts().drains,0);
  await f.closeEvidence(app);assert.equal(f.verdict().identityCoverage.launches[0].error,'identity-changed');
});

test('IDENTITY-F01 sample collector FD 오류도 별도 evidence gate에 남는다',async t=>{
  const f=fixture(t,{collect:({pid,calls})=>{if(calls===1)return metric(pid);const e=Error('observer-collector-unavailable');e.collectorDiagnostic={measurement:{...metric(pid),fdObservation:{...metric(pid).fdObservation,complete:false}}};throw e;}}),app=await f.launch();
  await assert.rejects(()=>f.sample(app),/collector-unavailable/);await f.closeEvidence(app);
  assert.equal(f.verdict().identityCoverage.launches[0].error,'identity-fd-incomplete');
});

test('IDENTITY-F01 status 계측도 launch에 결속하고 정규 시계열에 추가하지 않음',async t=>{
  let changed=false;const f=fixture(t,{collect:({pid})=>metric(pid,changed?'macos:999:1':'macos:123:1')}),app=await f.launch();
  Object.assign(f.context,{budget(){},statusAdmissionMetrics:null,workspaceAnonymousBytes(){},
    measuredHttpResponse:async()=>({status:200,bytes:Buffer.from('{}')}),
    statusCapture:{inspect:()=>({summary:{passed:true,rows:[]},parsed:{}})}});
  const begin=source.indexOf('async function request('),end=source.indexOf('const mixed=',begin);
  vm.runInContext(source.slice(begin,end),f.context);
  await f.context.request(app,'GET','/ops/api/recordings/status',undefined,true);
  assert.equal(app.identityStatusSamples,1);assert.equal(f.context.statusAdmissionMetrics.expectedStart,app.identity.startIdentity);
  assert.equal(f.samples.length,0);assert.equal(f.counts().drains,0);
  changed=true;await assert.rejects(()=>f.context.request(app,'GET','/ops/api/recordings/status',undefined,true),/identity-changed/);
  assert.equal(app.identityStatusSamples,1);await f.closeEvidence(app);assert.equal(f.verdict().identityCoverage.status,'FAIL');
});

for(const mode of ['120','state','contention','memory','frame'])test(`IDENTITY-F01 ${mode} 모드는 추가 collector/artifact/gate 없음`,async t=>{
  const f=fixture(t,{short:false});f.context.stateDiagnose=mode==='state';f.context.memoryObserve=['state','memory'].includes(mode);
  const app=await f.launch();assert.equal(app.identity,undefined);assert.equal(f.counts().collects,0);
  assert.deepEqual(fs.readdirSync(f.artifacts.outputDir),['started.json']);await f.stop(app);
  const v=f.verdict();assert.equal(v.identityCoverage,null);assert.equal(v.resultFailed,false);assert.equal(v.startupPreparationPass,false);
});

for(const kind of ['deleted','changed','log','cleanup','duplicate-launch'])test(`IDENTITY-F01 종료 후 ${kind} 증거 거부, 기존 기능 PASS와 별도 실패`,async t=>{
  const f=fixture(t);await f.closeEvidence(await f.launch());const app=f.processes[0],file=path.join(f.artifacts.outputDir,app.identity.artifact.file);
  if(kind==='deleted')fs.unlinkSync(file);
  if(kind==='changed')fs.writeFileSync(file,'{}');
  if(kind==='log')app.identityLog.file='other.private.log';
  if(kind==='cleanup')app.result={...app.result,normalShutdownPass:false};
  if(kind==='duplicate-launch')f.processes.push({...app});
  const v=f.verdict();assert.equal(v.startupPreparationPass,true);assert.equal(v.identityCoverage.status,'FAIL');assert.equal(v.resultFailed,true);
  if(kind==='duplicate-launch')f.processes.pop(); // 같은 mock fd의 중복 cleanup 방지
});

test('IDENTITY-F01 최종 report 쓰기 실패는 완료 cleanup 뒤 실패를 전파',async t=>{
  const f=fixture(t);await f.closeEvidence(await f.launch());const app=f.processes[0];assert(app.result.normalShutdownPass);
  const begin=source.indexOf(';try{artifacts.checkpoint(');assert(begin>0);
  const tail=source.slice(begin+1,source.lastIndexOf('\n}'));
  f.context.final={startupPreparationPass:true};f.context.resultFailed=false;
  f.context.artifacts={checkpoint(){throw Error('mock-report-write-failed');}};
  assert.throws(()=>vm.runInContext(tail,f.context),/mock-report-write-failed/);
  assert(f.events.includes('[fail] report-artifact-write-failed'));
});
