// 파일 용도: 녹화 관측기의 집계·자식 종료·오류 경계 검사.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FoundationObserver,collectProcess,observationCompleted,newLaunchIdentity,captureLaunchIdentity,assertLaunchMetrics} from './recording_foundation_observer.mjs';
const start=Date.now(),root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'s09-observer-'))),observers=[];
let passed=0,failed=0;
const row=(id,type='segment_finalized',entity='e')=>JSON.stringify({schema:'media-server.recording-mutation.v1',mutationId:id,mutationType:type,entityId:entity,occurredAtMs:1,payload:{}})+'\n';
const metric=pid=>({pid,startIdentity:'macos:1:2',rssBytes:1000,threadCount:1,fdCount:3,sampledAt:Date.now(),valid:true,error:null});
function observer(file='journal',collect=async pid=>metric(pid),options={}){const o=new FoundationObserver({root,file,collect,...options});observers.push(o);return o;}
async function check(name,fn){try{await fn();passed++;console.log(`[pass] ${name}`);}catch(e){failed++;console.log(`[fail] ${name}`);throw e;}}
try{
  fs.writeFileSync(path.join(root,'journal'),row('m1'));
  const o=observer();
  await check('OBS01 first mutation counted',async()=>assert.equal((await o.tick(123)).mutationCount,1));
  await check('OBS01 no duplicate poll count',async()=>{const s=await o.tick(123);assert.equal(s.mutationCount,1);assert.equal(s.uniqueMutationIds,1);assert.equal(s.uniqueEntityIds,1);});
  fs.appendFileSync(path.join(root,'journal'),row('m1')+row('m2','observation_v2_put','obs'));
  await check('OBS02 raw rows distinct from unique IDs',async()=>{const s=await o.tick(123);assert.equal(s.mutationCount,3);assert.equal(s.uniqueMutationIds,2);assert.equal(s.uniqueEntityIds,2);assert.equal(s.storedIdCount,4);assert.equal(s.idUtf8Bytes,8);});
  await check('OBS03 new PID distinct group same cursor',async()=>{await o.tick(124);assert.equal(o.groups.size,2);assert.equal(o.counts().mutationCount,3);});
  const all=['segment_finalized','event_link_created','observation_put','observation_v2_put','deletion_requested','deletion_completed','corruption_detected'];
  fs.writeFileSync(path.join(root,'types'),all.map((t,i)=>row('t'+i,t)).join(''));
  await check('OBS01 all seven type counts',async()=>{const s=await observer('types').tick(10);assert.deepEqual(Object.values(s.typeCounts),[1,1,1,1,1,1,1]);assert.equal(s.resourceTrendPass,false);});
  const pending=observer('future');
  await check('OBS04 initial absent journal pending not zero',async()=>assert.deepEqual((await pending.tick(5)).journal,{status:'pending'}));
  fs.writeFileSync(path.join(root,'future'),row('future'));
  await check('OBS04 journal created later observed',async()=>assert.equal((await pending.tick(5)).journal.status,'observed'));
  await check('OBS04 final unmeasured rejected',async()=>assert.throws(()=>observer('never').close(),/unmeasured/));
  const nojournal=observer('never2');await nojournal.tick(7);
  await check('OBS04 final pending rejected',async()=>assert.throws(()=>nojournal.close(),/unmeasured/));
  await check('OBS02 total ID count bound',async()=>await assert.rejects(()=>observer('journal',undefined,{maxIds:2}).tick(8),/id-limit/));
  fs.writeFileSync(path.join(root,'unicode'),row('영상','segment_finalized','e'));
  await check('OBS02 UTF8 byte bound',async()=>await assert.rejects(()=>observer('unicode',undefined,{maxIdBytes:6}).tick(8),/id-limit/));
  await check('LP26-O06 collector exit preserves bounded original diagnosis to reserved parent evidence',async()=>{
    const file=path.join(root,'collector-fail.sh');fs.writeFileSync(file,"#!/bin/sh\nprintf '%s\\n' '{\"pid\":123,\"valid\":false,\"anonymousFileBytes\":null,\"error\":\"fd-observation-incomplete:capacity=0:closed=4\",\"secret\":\"not retained\"}'\nexit 1\n",{mode:0o700});
    const {createWorkspaceFailureCapture}=await import('./recording_current_observer.mjs');
    const out=path.join(root,'failure');fs.mkdirSync(out,{mode:0o700});const sink=createWorkspaceFailureCapture(out);
    await assert.rejects(()=>collectProcess(file,123),error=>{sink.capture(error);return error.collectorDiagnostic.exitCode===1&&error.collectorDiagnostic.measurement.error.endsWith('closed=4')&&!Object.hasOwn(error.collectorDiagnostic.measurement,'secret');});
    sink.close();const saved=JSON.parse(fs.readFileSync(path.join(out,'workspace-first-failure.json'),'utf8'));
    assert.equal(saved.collectorDiagnostic.measurement.anonymousFileBytes,null);assert.equal(saved.primary,'observer-collector-unavailable');
  });
  const fdScope={scope:'complete-round-sequential-v1',complete:true,startIdentity:'macos:1:2',startedAt:1,completedAt:2,roundStartedAt:1,roundCompletedAt:2,rounds:1,capacityRetries:0,closedRetries:0,detailCalls:1,failures:[]};
  const launchIdentity=()=>newLaunchIdentity({launchId:'00000000-0000-4000-8000-000000000001',launchIndex:1,phase:'initial',pid:123,spawnObservedAt:'2026-10-22T00:00:00.000Z',logFile:'server-1.private.log'});
  const identityMetric={...metric(123),fdObservation:fdScope};
  const captureOptions={collect:async()=>identityMetric,isRunning:()=>true,write:(file,bytes)=>({file,bytes:Buffer.byteLength(bytes),sha256:'mock'}),now:()=> '2026-10-22T00:00:01.000Z'};
  for(const startIdentity of ['macos:1:2','linux:987654'])await check(`IDENTITY-F01 native ${startIdentity} value preserved`,async()=>{
    const i=launchIdentity(),m={...identityMetric,startIdentity,fdObservation:{...fdScope,startIdentity}};
    await captureLaunchIdentity(i,{...captureOptions,collect:async()=>m});assert.equal(i.startIdentity,startIdentity);assert.notEqual(i.startIdentity,i.spawnObservedAt);assertLaunchMetrics(i,m);
  });
  for(const [name,change,code] of [['PID',{pid:124},'pid-mismatch'],['null',{startIdentity:null},'value-invalid'],['invalid',{startIdentity:'2026-10-22'},'value-invalid'],['FD',{fdObservation:{...fdScope,complete:false}},'fd-incomplete'],['invalid metrics',{valid:false},'metrics-invalid']])await check(`IDENTITY-F01 ${name} rejected and failure persisted`,async()=>{
    const i=launchIdentity();let saved;
    await assert.rejects(()=>captureLaunchIdentity(i,{...captureOptions,collect:async()=>({...identityMetric,...change}),write:(file,bytes)=>{saved=JSON.parse(bytes);return {file};}}),new RegExp(code));
    assert.equal(saved.status,'failed');assert.equal(saved.startIdentity,null);assert.equal(saved.error,'identity-'+code);
  });
  await check('IDENTITY-F01 same launch changed identity is sticky',async()=>{
    const i=launchIdentity();await captureLaunchIdentity(i,captureOptions);
    assert.throws(()=>assertLaunchMetrics(i,{...identityMetric,startIdentity:'macos:2:3'}),/identity-changed/);
    assertLaunchMetrics(i,identityMetric);assert.equal(i.bindingError,'identity-changed');
  });
  for(const [name,diagnostic,code] of [['permission',{spawnCode:'EPERM'},'permission'],['timeout',{killed:true,signal:'SIGKILL'},'timeout'],['collector',{exitCode:1},'collector-error']])await check(`IDENTITY-F01 ${name} fixed error`,async()=>{
    const i=launchIdentity();await assert.rejects(()=>captureLaunchIdentity(i,{...captureOptions,collect:async()=>{const e=Error('private-detail');e.collectorDiagnostic=diagnostic;throw e;}}),new RegExp('identity-'+code));
    assert.equal(i.error,'identity-'+code);assert(!JSON.stringify(i).includes('private-detail'));
  });
  await check('IDENTITY-F01 process exits during collection',async()=>{
    let running=true;const i=launchIdentity();await assert.rejects(()=>captureLaunchIdentity(i,{...captureOptions,isRunning:()=>running,collect:async()=>{running=false;return identityMetric;}}),/identity-process-exited/);assert.equal(i.status,'failed');
  });
  await check('IDENTITY-F01 artifact error never becomes collected success',async()=>{
    const i=launchIdentity();await assert.rejects(()=>captureLaunchIdentity(i,{...captureOptions,write:()=>{throw Error('ENOSPC');}}),/identity-artifact-write-failed/);assert.equal(i.artifactError,'identity-artifact-write-failed');assert.equal(i.artifact,undefined);
  });
  await check('IDENTITY-F01 bounded native FD failure receipt survives capture failure',async()=>{
    const receipt={...fdScope,complete:false,failures:[{fd:7,listedType:1,returned:-1,errno:1,nextType:0,at:2}]};let saved;
    const i=launchIdentity();await assert.rejects(()=>captureLaunchIdentity(i,{...captureOptions,
      collect:async()=>{const e=Error('private-detail');e.collectorDiagnostic={exitCode:1,stdoutBytes:333,secret:'private-detail',measurement:{pid:123,startIdentity:'macos:1:2',fdObservation:receipt}};throw e;},
      write:(file,bytes)=>{saved=JSON.parse(bytes);assert(Buffer.byteLength(bytes)<=4096);return {file};}}),/identity-fd-incomplete/);
    assert.deepEqual(saved.collectionFailure.fdObservation,receipt);assert.equal(saved.collectionFailure.observedPid,123);assert.equal(saved.collectionFailure.exitCode,1);assert(!JSON.stringify(saved).includes('private-detail'));
  });
  await check('R149-Prep bounded delayed complete sample accepted by real consumer',async()=>{
    const file=path.join(root,'collector-delay.js'),value={...metric(123),fdObservation:fdScope};
    fs.writeFileSync(file,`#!${process.execPath}\nsetTimeout(()=>console.log(${JSON.stringify(JSON.stringify(value))}),250);\n`,{mode:0o700});
    const begin=performance.now(),sample=await collectProcess(file,123),elapsed=performance.now()-begin;
    assert.equal(sample.valid,true);assert.ok(elapsed>=250&&elapsed<3000);
    console.log('[consumer-timing] '+JSON.stringify({kind:'delayed-complete',elapsedMs:elapsed}));
  });
  await check('R149-Prep unchanged 3000ms timeout kills native substitute without children',async()=>{
    const file=path.join(root,'collector-timeout.js');
    fs.writeFileSync(file,`#!${process.execPath}\nsetInterval(()=>{},1000);\n`,{mode:0o700});
    const begin=performance.now();
    await assert.rejects(()=>collectProcess(file,123),error=>error.collectorDiagnostic.killed&&error.collectorDiagnostic.signal==='SIGKILL');
    console.log('[consumer-timing] '+JSON.stringify({kind:'timeout',elapsedMs:performance.now()-begin,timeoutMs:3000}));
  });
  await check('R149-Prep unchanged 16384 byte output rejection',async()=>{
    const file=path.join(root,'collector-output.js'),value={...metric(123),fdObservation:fdScope,padding:'x'.repeat(32768)};
    fs.writeFileSync(file,`#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(JSON.stringify(value))});\n`,{mode:0o700});
    await assert.rejects(()=>collectProcess(file,123),error=>
      error.collectorDiagnostic.spawnCode==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER');
  });
  for(const [name,change] of [['missing',undefined],['incomplete',{...fdScope,complete:false}],['identity',{...fdScope,startIdentity:'macos:2:3'}],['short-structure',{scope:fdScope.scope}],['wrong-scope',{...fdScope,scope:'atomic'}]]){
    await check(`R102-F01 exit0 ${name} observation rejected`,async()=>{
      const file=path.join(root,`collector-${name}.sh`),value={...metric(123),fdObservation:change};
      fs.writeFileSync(file,`#!/bin/sh\nprintf '%s\\n' '${JSON.stringify(value)}'\n`,{mode:0o700});
      await assert.rejects(()=>collectProcess(file,123),/observer-collector-unavailable/);
    });
  }
  await check('R102-F01 exact failed-round diagnosis reaches reserved parent record',async()=>{
    const diagnosis={...fdScope,complete:false,roundCompletedAt:0,rounds:4,closedRetries:4,failures:[{fd:200,listedType:1,returned:0,errno:9,nextType:6,at:2}]};
    const file=path.join(root,'collector-scope-fail.sh'),value={pid:123,valid:false,error:'fd-observation-incomplete:capacity=0:closed=4',anonymousFileBytes:null,fdObservation:{...diagnosis,secret:'not retained'}};
    fs.writeFileSync(file,`#!/bin/sh\nprintf '%s\\n' '${JSON.stringify(value)}'\nexit 1\n`,{mode:0o700});
    const {createWorkspaceFailureCapture}=await import('./recording_current_observer.mjs');
    const out=path.join(root,'scope-failure');fs.mkdirSync(out,{mode:0o700});const sink=createWorkspaceFailureCapture(out);
    await assert.rejects(()=>collectProcess(file,123),error=>{sink.capture(error);return error.collectorDiagnostic.measurement.fdObservation.complete===false;});sink.close();
    const saved=JSON.parse(fs.readFileSync(path.join(out,'workspace-first-failure.json'),'utf8'));
    assert.deepEqual(saved.collectorDiagnostic.measurement.fdObservation,diagnosis);assert.equal(saved.primary,'observer-collector-unavailable');
  });
  await check('OBS03 missing collector binary fails',async()=>await assert.rejects(()=>collectProcess(path.join(root,'missing-binary'),1),/collector-unavailable/));
  for(const [name,bad] of [['null',null],['invalid',{...metric(1),valid:false}],['wrongpid',metric(2)],['missingfd',{...metric(1),fdCount:null}],['rsszero',{...metric(1),rssBytes:0}]])
    await check(`OBS03 ${name} sample rejected`,async()=>await assert.rejects(()=>observer('journal',async()=>bad).tick(1),/incomplete/));
  let changed=false;const identity=observer('journal',async pid=>({...metric(pid),startIdentity:changed?'macos:2:3':'macos:1:2'}));await identity.tick(77);changed=true;
  await check('OBS03 live identity change rejected',async()=>await assert.rejects(()=>identity.tick(77),/identity-changed/));
  changed=false;
  await check('OBS03 identity error latched',async()=>await assert.rejects(()=>identity.tick(77),/identity-changed/));
  fs.writeFileSync(path.join(root,'truncate'),row('x'));const truncated=observer('truncate');await truncated.tick(11);fs.truncateSync(path.join(root,'truncate'),0);
  await check('OBS03 reader error not empty archive',async()=>await assert.rejects(()=>truncated.tick(11),/truncated/));
  let resolve,calls=0;const blocked=observer('journal',pid=>{calls++;return new Promise(r=>{resolve=()=>r(metric(pid));});});
  const tick=blocked.tick(88);
  await check('OBS04 duplicate tick not launched',async()=>{assert.equal(await blocked.tick(88),null);assert.equal(calls,1);});
  let paused=false;const pause=blocked.pause().then(()=>{paused=true;});
  await check('OBS04 pause waits active tick',async()=>{await Promise.resolve();assert.equal(paused,false);resolve();await tick;await pause;assert.equal(paused,true);});
  await check('OBS04 measured close returns groups not resource pass',async()=>{const s=blocked.close();assert.equal(s.groups.length,1);assert.equal(s.resourceTrendPass,false);});
  await check('OBS04 closed tick rejected',async()=>await assert.rejects(()=>blocked.tick(88),/closed/));
  fs.writeFileSync(path.join(root,'partial'),row('partial')+'{"unfinished":');
  const partial=observer('partial');
  await check('OBS04 live partial observed without consuming tail',async()=>{const s=await partial.tick(9);assert.equal(s.mutationCount,1);assert.equal(s.journal.partialBytes,14);});
  await check('OBS04 final partial rejected and reader closed',async()=>{assert.throws(()=>partial.close(),/unmeasured/);assert.throws(()=>partial.reader.poll(),/closed/);});
  await check('OBS04 failure cleanup closes reader',async()=>{const fd=truncated.reader.fd;truncated.close(false);assert.equal(truncated.reader.fd,null);assert.throws(()=>fs.fstatSync(fd),{code:'EBADF'});assert.throws(()=>truncated.reader.poll(),/truncated/);});
  const complete={enabled:true,final:{groups:[{}]},failed:0,error:null,processesClosed:true};
  await check('OBS04 complete observation predicate positive',async()=>assert.equal(observationCompleted(complete),true));
  for(const [name,change] of [['failure',{failed:1}],['process-unclosed',{processesClosed:false}],['no-final',{final:null}],['error',{error:'failure'}],['disabled',{enabled:false}]])
    await check(`OBS04 ${name} completion rejected`,async()=>assert.equal(observationCompleted({...complete,...change}),false));
}catch(e){console.error(e.stack);if(!failed){failed++;console.log('[fail] fixture setup');}}
finally{
  for(const o of observers){try{await o.pause();o.close(false);}catch{failed++;}}
  function bytes(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,x)=>n+bytes(path.join(p,x)),0):s.size;}
  const size=bytes(root);fs.rmSync(root,{recursive:true});let absent=false;try{fs.lstatSync(root);}catch(e){absent=e.code==='ENOENT';}
  if(!absent)failed++;console.log(`[cleanup] path=${root} bytes=${size} absent=${absent}`);
  console.log(JSON.stringify({passed,failed,elapsedMs:Date.now()-start,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'하위작업별자동집계없음',scope:'observer-unit-only'}));process.exitCode=failed?1:0;
}
