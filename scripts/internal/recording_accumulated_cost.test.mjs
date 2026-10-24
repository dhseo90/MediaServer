import test from 'node:test';
import assert from 'node:assert/strict';
import {selection,aSelection,costCollector} from './recording_accumulated_cost.mjs';
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {limitedSearchContract,limitedSearchSchedule,limitedSearchCapacity,assertLimitedSearchCapacity,runLimitedSearch} from './recording_accumulated_cost.mjs';
const names=['service-wait','service-hold','preparation-wait','preparation-hold','Refresh','WithPlayback','SnapshotBegin','CurrentnessJson'];
const server=id=>({id,class:id%3?1:3,loss:false,accepted:1,parsed:2,handler:3,prepared:30,sendBegin:31,sendEnd:32,end:33,sent:true});
const search=id=>({id,diagnosticId:id,status:200,loss:false,begin:4,end:29,phases:names.map(n=>[n,5,6])});
const client=id=>({id,loss:false,status:200,outcome:'ok',phase:'complete',bytes:1,totalElapsedMs:100});
const wire=(kind,r)=>Buffer.from(`[R154-${kind}] ${JSON.stringify(r)}\n`);
test('fixed selection, no visual, no outcome-dependent replacement',()=>{
 assert.deepEqual([0,40,80,92,100].flatMap(n=>[selection(n,0),selection(n,1)]),[1,2,4,5,7,8,10,11,13,14]);
 assert.deepEqual([0,10,20,23,25].map(aSelection),[3,6,9,12,15]);assert.equal(selection(1,0),0);assert.equal(selection(100,2),0);
});
test('parallel search before server; streams and split chunks',()=>{
 const c=costCollector();for(const id of [1,2])c.start(id);
 for(const id of [2,1]){const b=wire('search',search(id));c.append(b.subarray(0,17),1);c.append(b.subarray(17),1);c.client(client(id));c.append(wire('server',server(id)),1);}
 assert.equal(c.complete().server.length,2);
});
test('early diagnostic goal needs initial/middle/late, two slow Structured and actual counts',()=>{
 const c=costCollector();for(let id=1;id<=9;id++){c.start(id);c.client({...client(id),totalElapsedMs:[7,8].includes(id)?2100:100});c.append(wire('search',search(id)),1);c.append(wire('server',server(id)),1);}
 assert.equal(c.ready({'9101':{finalized:599},'9201':{finalized:600}}),false);
 assert.equal(c.ready({'9101':{finalized:600},'9201':{finalized:600}}),true);
 c.start(10);assert.equal(c.ready({'9101':{finalized:600},'9201':{finalized:600}}),false);
});
for(const [name,kind,mutate] of [
 ['duplicate','server',r=>r],['bad-id','server',r=>({...r,id:0})],['class','server',r=>({...r,class:3})],
 ['order','server',r=>({...r,prepared:1})],['loss','server',r=>({...r,loss:true})],['send','server',r=>({...r,sent:false})],
 ['phase-cap','search',r=>({...r,phases:Array(41).fill(['x',5,6])})],['missing-phase','search',r=>({...r,phases:[]})],
 ['counter-overflow','search',r=>({...r,end:2**64})],['wrong-search','search',r=>({...r,diagnosticId:2})]]){
 test(name+' fails sticky during append',()=>{const c=costCollector();c.start(1);const r=kind==='server'?server(1):search(1);
  if(name==='duplicate')c.append(wire(kind,r),1);c.append(wire(kind,mutate(r)),1);assert.ok(c.failure());const f=c.failure();c.append(wire('server',server(2)),1);assert.equal(c.failure(),f);assert.throws(()=>c.complete());});
}
test('missing/partial/malformed/cap and explicit loss',()=>{
 for(const b of [Buffer.from('[R154-loss] output-failure\n'),Buffer.from('[R154-server] bad\n'),Buffer.from('[R154-server] '+ 'x'.repeat(8192)+'\n')]){const c=costCollector();c.append(b,1);assert.ok(c.failure());}
 const c=costCollector();c.start(1);assert.throws(()=>c.complete());c.append(Buffer.from('[R154-search] {'),1);assert.throws(()=>c.complete());
});
test('client timeout/duplicate start and nested parent rejection',()=>{
 const c=costCollector();c.start(1);assert.throws(()=>c.start(1));
 const d=costCollector();d.start(1);assert.throws(()=>d.client({...client(1),totalElapsedMs:5001}));
 const e=costCollector();e.start(1);e.client(client(1));e.append(wire('server',server(1)),1);e.append(wire('search',{...search(1),begin:1}),1);assert.throws(()=>e.complete());
});
test('actual owned child loss immediately initiates TERM; group absent',async()=>{
 const child=spawn(process.execPath,['-e',`process.stdout.write('[R154-loss] forced\\n');setInterval(()=>process.stdout.write('continued\\n'),1000);`],{detached:true,stdio:['ignore','pipe','pipe']});
 const c=costCollector();let detected=null,signalled=null,raw='';
 child.stdout.on('data',b=>{raw+=b.toString();c.append(b,0);if(c.failure()&&detected===null){detected=performance.now();process.kill(-child.pid,'SIGTERM');signalled=performance.now();}});
 const timeout=setTimeout(()=>process.kill(-child.pid,'SIGKILL'),3000);
 try{const [code,signal]=await once(child,'exit');assert.equal(code,null);assert.equal(signal,'SIGTERM');assert.ok(signalled-detected<100);assert.match(raw,/forced/);assert.doesNotMatch(raw,/continued/);assert.throws(()=>process.kill(-child.pid,0),e=>e.code==='ESRCH');console.log(JSON.stringify({role:'R165-forced-loss',pid:child.pid,detectionToSignalMs:signalled-detected,groupAbsent:true}));}finally{clearTimeout(timeout);}
});

test('generated child explicitly enables completion while global latency remains off',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-completion-generator-'));
 try{
  const r=spawnSync('python3',['-B','-c',"import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]))",path.join(root,'overlay')],{encoding:'utf8',timeout:10000});
  assert.equal(r.status,0,r.stderr);
  const generated=fs.readFileSync(path.join(root,'overlay/mixed.mjs'),'utf8');
  const original=fs.readFileSync('scripts/internal/v450_recording_a_mixed.mjs','utf8');
  const environment=text=>text.slice(text.indexOf('function environment('),text.indexOf('async function request('));
  const context={path,process:{env:{PATH:process.env.PATH,HOME:root,R165_BINARY:'/owned/instrumented'}},root,repo:process.cwd(),diagnose:true,stateDiagnose:true,short:false,frameTraceMode:'bounded',memoryObserve:true,memoryDiagnose:false,contentionDiagnose:false};
  const actual=vm.runInNewContext('('+environment(generated)+')(1,2,3)',context);
  const before=vm.runInNewContext('('+environment(original)+')(1,2,3)',context);
  assert.equal(actual.MEDIA_SERVER_VERIFY_RECORDING_COMPLETION_TRACE,'1');
  assert.equal(actual.MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE,'0');
  assert.equal(actual.MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY,'0');
  assert.equal(before.MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE,'1');
  assert.equal(before.MEDIA_SERVER_VERIFY_RECORDING_COMPLETION_TRACE,undefined);
  for(const key of Object.keys(before))if(!['MEDIA_SERVER_BIN_PATH','MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE','MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE','MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY'].includes(key))assert.equal(actual[key],before[key],key);
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

// 사전 RED: 새 모드 거부(mixed-mode), 새 결과 계약 미구현(assertion).
test('search performance preparation is separate from deletion-required modes',async()=>{
 const {mixedPreparationContract}=await import('./recording_longrun_progress.mjs');
 assert.equal(mixedPreparationContract(['--search-performance-diagnostic']).requiresDeletion,false);
 for(const args of [['--state-diagnostic'],['--duration-minutes','120']])assert.equal(mixedPreparationContract(args).requiresDeletion,true);
});
test('search performance result contract exists',async()=>{
 const cost=await import('./recording_accumulated_cost.mjs');
 assert.equal(typeof cost.searchPerformanceResult,'function');
});

import {searchPerformanceResult,assertSearchPerformanceCapacity} from './recording_accumulated_cost.mjs';
import {completionCollection} from './recording_completion_collection.mjs';
import {captureBoundedProcessLog,mixedPreparationContract} from './recording_longrun_progress.mjs';
const completionLine='[recording-completion] '+JSON.stringify({v:1,event:10,begin:'1',end:'2',thread:1,request:1,reference:null,job:null,n:1,x:0,y:0})+'\n';
const receipt=(rows,bytes,extra={})=>'[recording-completion-end] '+JSON.stringify({v:1,rows,bytes,lost:false,writeError:false,complete:true,...extra})+'\n';
const collect=text=>{const c=completionCollection();c.append(text);return c.finish();};
function performanceFixture(){
 const c=costCollector();for(let id=1;id<=15;id++){c.start(id);c.client(client(id));c.append(wire('search',search(id)),0);c.append(wire('server',server(id)),1);}
 return {final:{failed:0,processCount:1,processesClosed:true,udpClosed:true,verifiedDurationMs:1800000,phase:{channels:{9101:{finalized:901,deleted:0},9201:{finalized:901,deleted:0}}},evidenceLoad:{cycles:3,searchSuccess:12,searchUnavailable:0,searchSuccessByClient:[3,3,3,3],searchLatencyMs:Array(12).fill(100),createComplete:3,visualResults:3,visualCreated:3,windows:Array.from({length:3},()=>({structured:1,visual:1,evidence:1,visualEvidence:1}))},aLoad:{completed:[{state:'completed',label:'main-0'}]}},trace:c.complete(),completion:[collect(completionLine+receipt(1,Buffer.byteLength(completionLine)))],logsCaptured:true,batches:3};
}
test('search-only zero deletions passes; every excluded qualification is NOT_RUN',()=>{
 const r=searchPerformanceResult(performanceFixture());assert.equal(r.status,'PASS');assert.equal(r.recordingProgression,'PASS');
 for(const k of ['retentionDeletion','retentionPostDeletionStability','memoryP0','readiness120','releaseQualification'])assert.equal(r[k],'NOT_RUN');
 assert.equal(r.outputBudget,'CAPACITY_UNPROVEN');assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});
test('unchanged latency limits, recording progress and shutdown failures',()=>{
 for(const times of [Array(12).fill(2000.1),[...Array(99).fill(100),5001]]){const f=performanceFixture();f.final.evidenceLoad.searchLatencyMs=times;f.final.evidenceLoad.searchSuccess=times.length;f.final.evidenceLoad.searchSuccessByClient=[1,1,1,times.length-3];f.batches=times.length/4;assert.equal(searchPerformanceResult(f).status,'FAIL');}
 const f=performanceFixture();f.final.evidenceLoad.searchLatencyMs=Array(20).fill(2000);f.final.evidenceLoad.searchLatencyMs[19]=5000;f.final.evidenceLoad.searchSuccess=20;f.final.evidenceLoad.searchSuccessByClient=[5,5,5,5];f.batches=5;assert.equal(searchPerformanceResult(f).latency.status,'PASS');
 for(const mutate of [f=>f.final.phase.channels[9101].finalized=0,f=>f.final.failed++,f=>f.final.processesClosed=false,f=>f.final.udpClosed=false]){const f=performanceFixture();mutate(f);assert.equal(searchPerformanceResult(f).status,'FAIL');}
});
test('Structured/Visual/Evidence/A, timing and selected completeness cannot be omitted',()=>{
 const mutations=[f=>f.final.evidenceLoad.searchSuccessByClient[0]=0,f=>f.final.evidenceLoad.searchSuccessByClient[2]=0,f=>f.final.evidenceLoad.createComplete=0,f=>f.final.evidenceLoad.visualCreated=0,f=>f.final.aLoad.completed=[],f=>f.final.evidenceLoad.windows[1].visual=0,f=>f.final.evidenceLoad.searchLatencyMs.pop(),f=>f.final.evidenceLoad.searchLatencyMs[0]=NaN,f=>f.final.verifiedDurationMs=1799999,f=>f.batches++,f=>f.trace=null];
 for(const kind of ['client','server','search'])mutations.push(f=>f.trace[kind].pop(),f=>f.trace[kind][0].id=2,f=>f.trace[kind][0].loss=true);
 for(const mutate of mutations){const f=performanceFixture();mutate(f);assert.equal(searchPerformanceResult(f).status,'INCOMPLETE');}
});
test('existing Completion rejection reaches diagnostic INCOMPLETE without relaxation',()=>{
 const bytes=Buffer.byteLength(completionLine);
 const evidence='[recording-evidence] '+JSON.stringify({stage:'a'.repeat(128),first:'b'.repeat(128),exception:0,builder:'c'.repeat(128),http:'d'.repeat(128),published:0,checked:1,current:1,captureRevision:1,checkRevision:1})+'\n';
 for(const text of [completionLine,completionLine+receipt(1,bytes,{lost:true}),completionLine+receipt(1,bytes,{writeError:true}),completionLine+receipt(1,bytes+1),'[recording-completion] {bad}\n','[recording-completion] {',completionLine.repeat(4096),evidence.repeat(3300)]){
  const f=performanceFixture();f.completion=[collect(text)];assert.equal(f.completion[0].status,'incomplete');assert.equal(searchPerformanceResult(f).status,'INCOMPLETE');
 }
 const app={bytes:4*1024*1024};let stopped=0;captureBoundedProcessLog(app,Buffer.from('x'),()=>assert.fail('cap must precede write'),()=>stopped++);assert.equal(stopped,1);assert.equal(app.captureError,'byte-cap');
 const f=performanceFixture();f.logsCaptured=false;assert.equal(searchPerformanceResult(f).status,'INCOMPLETE');
});
test('actual generated search mode keeps workload, old gates, environment and early capacity stop',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-search-performance-'));
 try{
  const out=path.join(root,'overlay');const r=spawnSync('python3',['-B','-c',"import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]))",out],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
  const generated=fs.readFileSync(path.join(out,'mixed.mjs'),'utf8'),original=fs.readFileSync('scripts/internal/v450_recording_a_mixed.mjs','utf8');
  assert.equal(spawnSync(process.execPath,['--check',path.join(out,'mixed.mjs')]).status,0);
  assert.equal(spawnSync('bash',['-n',path.join(out,'wrapper.sh')]).status,0);
  const modes=generated.slice(generated.indexOf('const stateDiagnose='),generated.indexOf('const fixtureProfile='));
  const gate=generated.match(/check\(Object\.values\(phaseResult.channels\)[^;]+;/)[0];
  for(const args of [['--state-diagnostic'],['--duration-minutes','120'],['--contention-diagnostic'],['--memory-attribution-diagnostic'],['--search-performance-diagnostic']]){
   const performanceDiagnose=args[0]==='--search-performance-diagnostic',context={args,performanceDiagnose,memoryObservationMode:a=>a[0]==='--state-diagnostic',mixedPreparationContract,phaseResult:{channels:{9101:{finalized:1,deleted:0},9201:{finalized:1,deleted:0}}},check:ok=>assert(ok)};
   vm.runInNewContext(modes+"globalThis.contract=preparationContract;globalThis.state=stateDiagnose;globalThis.isDiagnostic=diagnose;",context);
   assert.equal(context.contract.requiresDeletion,['--state-diagnostic','--duration-minutes'].includes(args[0]));
   context.contract.requiresDeletion?assert.throws(()=>vm.runInNewContext(gate,context)):vm.runInNewContext(gate,context);
   if(performanceDiagnose){assert.equal(context.state,true);assert.equal(context.isDiagnostic,true);}
  }
  for(const text of ['aLoad.start(begin,2700000)','stateDiagnose?1800000','stateDiagnose?1870000','if(!performanceDiagnose&&!aLoad.active&&selectedTrace.ready','app.completionTrace.append(chunk','selectedTrace.append(chunk','const bound=selectedTrace.complete();selectedBound=bound;','stateDiagnosticPass:false','final.searchPerformance.status'])assert(generated.includes(text),text);
  assert(generated.indexOf('if(performanceDiagnose)assertSearchPerformanceCapacity();')<generated.indexOf('const artifacts='));
  // No requests, sources, authentication, writer, collector or cleanup implementation changes.
  for(const [begin,end] of [['async function evidenceLoad(app){','async function launch('],['function environment(','async function request(']]){
   const actual=generated.slice(generated.indexOf(begin),generated.indexOf(end,generated.indexOf(begin)));
   if(begin.startsWith('async function evidenceLoad')){const before=original.slice(original.indexOf(begin),original.indexOf(end,original.indexOf(begin)));assert.equal(actual,before.replace("const all=await Promise.all(routes.map(route=>evidenceFetch(app,route)));","const selectedBatch=selectedBatchOrdinal++;const all=await Promise.all(routes.map((route,i)=>evidenceFetch(app,route,'GET',undefined,selection(selectedBatch,i))));"));}
   else{const env=vm.runInNewContext('('+actual+')(1,2,3)',{path,process:{env:{PATH:process.env.PATH,HOME:root,R165_BINARY:'/owned/instrumented'}},root,repo:process.cwd(),diagnose:true,stateDiagnose:true,short:false,frameTraceMode:'bounded',memoryObserve:true,memoryDiagnose:false,contentionDiagnose:false});assert.equal(env.MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE,'0');assert.equal(env.MEDIA_SERVER_VERIFY_RECORDING_COMPLETION_TRACE,'1');}
  }
  const terminal=generated.slice(generated.indexOf('if(performanceDiagnose){try{selectedBound='),generated.lastIndexOf('\n}'));
  for(const mode of ['pass','latency','completion','correlation','partial']){
   const f=performanceFixture();if(mode==='latency')f.final.evidenceLoad.searchLatencyMs.fill(2001);if(mode==='completion')f.completion=[collect(completionLine)];if(mode==='correlation')f.trace.search.pop();
   let checkpoint=null;const context={performanceDiagnose:true,final:f.final,selectedBound:null,selectedTrace:{failure:()=>null,complete:()=>{if(mode==='partial')throw Error('partial-terminal');return f.trace;}},performanceCompletion:f.completion,performanceLogs:[true],processes:[{}],selectedBatchOrdinal:f.batches,searchPerformanceResult,failed:0,resultFailed:false,phaseResult:f.final.phase,latencyPassed:mode!=='latency',artifacts:{checkpoint:r=>checkpoint=r},console:{log(){}},process:{}};
   vm.runInNewContext(terminal,context);const expected=mode==='pass'?'PASS':mode==='latency'?'FAIL':'INCOMPLETE';assert.equal(checkpoint.status,expected);assert.equal(checkpoint.diagnosticCompleted,expected==='PASS');assert.equal(context.process.exitCode,expected==='PASS'?0:1);
   assert.equal(context.final.searchPerformance.releaseQualification,'NOT_RUN');
  }
  const blocked=spawnSync('bash',[path.join(out,'wrapper.sh'),'--search-performance-diagnostic'],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH}});assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/CAPACITY_UNPROVEN/);assert.doesNotMatch(blocked.stderr,/owned parent run required/);assert.deepEqual(fs.readdirSync(root),['overlay']);
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

import {failureCollector,attributionError} from './recording_accumulated_cost.mjs';
const fw=(kind,r)=>Buffer.from(`[R171-${kind}] ${JSON.stringify(r)}\n`);
const fc=id=>({id,loss:false,status:503,phase:'complete',outcome:'ok',headerReceived:true,totalElapsedMs:3886,bytes:40,reason:'recording-search-unavailable'});
const fsrv=id=>({id,loss:false,dispatch:10,handler:20,prepared:900,sendBegin:910,sendEnd:920,end:930,status:503,sent:true});
const fq=id=>({id,loss:false,begin:30,end:890,diagnosticStatus:503,exception:'none',rejections:[0,0],detail:true,attempts:[{stage:'validate-source',reason:'search-source-changed',captured:7,current:8,authority:true},{stage:'validate-source',reason:'search-source-changed',captured:8,current:9,authority:true}],captures:[[1,0,0,40,300,8,8,900,100,120,8,7,10,110,7,1,7,7,0,0,true],[2,0,1,350,700,9,9,1000,110,200,9,8,10,120,8,1,8,8,0,0,true]],phases:[['Capture',40,301],['Capture',350,701]]});
function feed(c,id=1,q=fq(id)){c.start(id);c.append(fw('dispatch',{id,at:10,loss:false}),1);c.append(fw('search-enter',{id,at:30,loss:false}),1);c.append(fw('search',q),1);c.append(fw('server',fsrv(id)),1);c.client(fc(id));}
test('R171 separate IDs preserve selected contract and two Capture attempts',()=>{
 const c=failureCollector(),selected=costCollector();selected.start(1);selected.client(client(1));selected.append(wire('search',search(1)),1);selected.append(wire('server',server(1)),1);feed(c);
 assert.equal(selected.complete().search.length,1);const r=c.complete();assert.equal(r.requests[0].search.captures.length,2);assert.deepEqual(r.requests[0].search.captures.map(x=>x[2]),[0,1]);assert.equal(r.requests[0].client.reason,'recording-search-unavailable');
 const safe=attributionError(Buffer.from('{"error":"recording-search-unavailable"}'));assert.equal(safe,'recording-search-unavailable');assert.equal(attributionError(Buffer.from('{"error":"token /private/secret"}')),'UNKNOWN');
});
test('R171 header timeout never invents server entry or cause; terminal missing fails closed',()=>{
 const c=failureCollector();c.start(1);c.client({...fc(1),status:null,phase:'header',outcome:'timeout',headerReceived:false,bytes:0,totalElapsedMs:5003,reason:'UNKNOWN'});
 assert.equal(c.snapshot()[0].internalCause,'UNKNOWN');assert.equal(c.snapshot()[0].dispatchObserved,false);assert.throws(()=>c.complete(),/missing-terminal/);
});
test('R171 async split records and bounded normal success',()=>{
 const c=failureCollector();c.start(2);c.start(1);
 for(const id of [1,2]){c.append(fw('dispatch',{id,at:10,loss:false}),1);const q={...fq(id),detail:false,phases:[],captures:[],diagnosticStatus:200};c.append(fw('search-enter',{id,at:30,loss:false}),1);const bytes=fw('search',q);c.append(bytes.subarray(0,13),1);c.append(bytes.subarray(13),1);c.client({...fc(id),status:200,reason:'UNKNOWN'});c.append(fw('server',{...fsrv(id),status:200}),1);}
 assert.equal(c.complete().details,0);
});
test('R171 malformed duplicate ID wrong shape nested reversal and cost loss are sticky',()=>{
 for(const mutate of [q=>q.id=0,q=>q.id=2,q=>q.loss=true,q=>q.captures[1][2]=3,q=>q.captures[0][4]=1,q=>q.captures[0][8]=1000,q=>q.captures[0][10]=2**64,q=>q.captures[1][1]=1,q=>q.attempts[0].reason='/secret',q=>q.phases[0][1]=0]){
  const c=failureCollector();c.start(1);const q=fq(1);mutate(q);c.append(fw('search',q),1);assert(c.failure());const first=c.failure();c.append(fw('search',fq(1)),1);assert.equal(c.failure(),first);
 }
 for(const b of [Buffer.from('[R171-search] bad\n'),Buffer.from('[R171-search] '+'x'.repeat(16384)+'\n')]){const c=failureCollector();c.append(b,1);assert(c.failure());}
 const partial=failureCollector();partial.append(Buffer.from('[R171-search] {'),1);assert.throws(()=>partial.complete(),/tail/);
 const c=failureCollector();feed(c);c.append(fw('search',fq(1)),1);assert(c.failure());
 const starts=failureCollector();starts.start(1);assert.throws(()=>starts.start(1));assert.throws(()=>failureCollector().start(513));
});
test('R171 detail budget is explicit loss, never silently drops late slow captures',()=>{
 const c=failureCollector();for(let id=1;id<=24;id++)feed(c,id);assert.equal(c.complete().details,24);
 c.start(25);c.append(fw('search',fq(25)),1);assert.match(c.failure().code,/detail-cap/);
});
test('R171 actual generated overlay opt-in keeps old default and capacity guard',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-r171-generator-'));
 try{
  for(const enabled of [false,true]){const out=path.join(root,enabled?'on':'off');const r=spawnSync('python3',['-B','-c',"import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]),sys.argv[2]=='1')",out,enabled?'1':'0'],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
   const mixed=fs.readFileSync(path.join(out,'mixed.mjs'),'utf8');assert.equal(spawnSync(process.execPath,['--check',path.join(out,'mixed.mjs')],{encoding:'utf8'}).status,0);
   assert.equal(mixed.includes('VERIFY_SEARCH_ATTRIBUTION:1'),enabled);assert.equal(mixed.includes('X-R171-ID'),enabled);assert(mixed.includes('AbortSignal.timeout(5000)'));assert(mixed.includes('if(performanceDiagnose)assertSearchPerformanceCapacity();'));assert(mixed.includes('VERIFY_RECORDING_LATENCY_TRACE:0,VERIFY_RECORDING_COMPLETION_TRACE:1'));
   const source=fs.readFileSync(path.join(out,'recording_search_application_service.cpp'),'utf8');assert.equal(source.includes('r171::Search failure_request(diagnostic)'),enabled);
   if(enabled){assert(mixed.includes('failureTrace.append(chunk'));assert(mixed.includes('final.failureAttribution=failureTrace.complete()'));assert(mixed.includes("++failureOrdinal:0"));assert(mixed.includes("'X-R154-ID'"));}
  }
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

test('R171 actual capacity code/model stages and observed status must agree',()=>{
 assert.equal(attributionError(Buffer.from('{"error":"search-capacity-exceeded"}')),'search-capacity-exceeded');
 for(const stage of ['model-build','model-delta']){const c=failureCollector(),q=fq(1);q.attempts[0].stage=stage;q.attempts[0].reason='search-capacity-exceeded';feed(c,1,q);assert.equal(c.complete().status,'captured');}
 const c=failureCollector();c.start(1);c.append(fw('dispatch',{id:1,at:10,loss:false}),1);c.append(fw('search-enter',{id:1,at:30,loss:false}),1);c.append(fw('search',fq(1)),1);c.append(fw('server',{...fsrv(1),status:200}),1);c.client(fc(1));assert.throws(()=>c.complete(),/http-status/);
});

test('R171 live collector rejects invalid ID and signals owned child before continued work',async()=>{
 const child=spawn(process.execPath,['-e',`process.stdout.write('[R171-dispatch] {"id":0,"at":1,"loss":false}\\n');setInterval(()=>process.stdout.write('continued\\n'),1000);`],{detached:true,stdio:['ignore','pipe','pipe']});
 const c=failureCollector();let detected=null,signalled=null,raw='';
 child.stdout.on('data',b=>{raw+=b.toString();c.append(b,0);if(c.failure()&&detected===null){detected=performance.now();process.kill(-child.pid,'SIGTERM');signalled=performance.now();}});
 const timeout=setTimeout(()=>process.kill(-child.pid,'SIGKILL'),3000);
 try{const [code,signal]=await once(child,'exit');assert.equal(code,null);assert.equal(signal,'SIGTERM');assert.ok(signalled-detected<100);assert.doesNotMatch(raw,/continued/);assert.throws(()=>process.kill(-child.pid,0),e=>e.code==='ESRCH');console.log(JSON.stringify({role:'R171-invalid-ID',pid:child.pid,detectionToSignalMs:signalled-detected,groupAbsent:true}));}finally{clearTimeout(timeout);}
});

import {mandatoryRequestLedger,settleLedgerBatch} from './recording_accumulated_cost.mjs';
const ledgerProcess={pid:5001,startIdentity:'linux:42',valid:true,error:null};
function ledger(){const c=mandatoryRequestLedger();c.bindProcess(ledgerProcess,{pid:5001,seq:1});return c;}
const lstart=(c,id,kind='structured')=>c.start(id,{kind,pid:5001,startedMs:100});
const lc=(id,extra={})=>({v:2,id,pid:5001,status:200,phase:'complete',outcome:'ok',headerReceived:true,totalElapsedMs:100,endedMs:200,bytes:10,reason:'UNKNOWN',...extra});
const ls=(id,extra={})=>({v:2,id,pid:5001,dispatch:10,handler:20,prepared:2000000200,sendBegin:2000000300,sendEnd:2000000400,end:2000000500,status:200,sent:true,loss:false,...extra});
const lq=(id,ordinal=0,extra={})=>({v:2,id,pid:5001,begin:30,end:ordinal?2000000030:1030,diagnosticStatus:200,exception:'none',rejections:[0,0],loss:false,retry:0,waitNs:10,holdNs:100,
 detailEligible:!!ordinal,detailOrdinal:ordinal,detailState:ordinal?(ordinal<=24?'captured':'detail-cap'):'not-selected',attempts:[{stage:'refresh',reason:'none',captured:7,current:7,authority:true}],...extra});
const ld=id=>({v:2,pid:5001,id,captures:[],phases:[['preparation-wait',30,40],['preparation-hold',40,140]]});
function ledgerFinish(c,id,{kind='structured',ordinal=0,searchExtra={},clientExtra={},serverExtra={}}={}){
 if(kind==='structured'){const q=lq(id,ordinal,searchExtra);c.append(fw('search',q),1,5001);if(q.detailState==='captured')c.append(fw('detail',ld(id)),1,5001);}
 c.append(fw('server',ls(id,serverExtra)),1,5001);return c.client(lc(id,clientExtra));
}
for(const count of [23,24,25,160])test(`ledger v2 detail boundary ${count} preserves all mandatory terminals`,()=>{
 const c=ledger();for(let id=1;id<=count;id++)lstart(c,id);
 // Reverse completions exercise non-ID-ordered detail selection.
 for(let id=count;id>=1;id--)ledgerFinish(c,id,{ordinal:count-id+1});
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.requests.length,count);
 assert.equal(r.detail.eligible,count);assert.equal(r.detail.records,Math.min(24,count));assert.equal(r.detail.omittedCap,Math.max(0,count-24));
 assert.equal(r.metrics.structured.terminalMissing,0);assert.equal(r.detail.errors,0);
 if(count>24)assert.deepEqual(r.detail.firstOmission,{id:count-24,ordinal:25,reason:'detail-cap'});
});
test('ledger 160 Structured + 160 Visual, IDs159/160, separate exact nearest-rank metrics',()=>{
 const c=ledger();for(let id=1;id<=320;id++)lstart(c,id,id<=160?'structured':'visual');
 for(let id=320;id>=1;id--)ledgerFinish(c,id,{kind:id<=160?'structured':'visual',ordinal:id<=160?161-id:0,clientExtra:{totalElapsedMs:id<=160?10:100}});
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.metrics.combined.started,320);assert.equal(r.metrics.combined.completed,320);
 assert.deepEqual([r.metrics.structured.p50,r.metrics.structured.p90,r.metrics.structured.p95,r.metrics.structured.max],[10,10,10,10]);
 assert.equal(r.metrics.visual.p95,100);assert.equal(r.metrics.combined.p95,100);assert.equal(r.metrics.combined.validSamples,320);
 for(const id of [159,160])assert(r.requests.find(q=>q.id===id).client);
 assert.equal(r.requests[160].retry,null);assert.equal(r.requests[160].serverSearchLatencyMs,null);assert.equal(r.requests[160].searchObservation,'not-instrumented');
 assert(r.bytes.mandatoryServer<=384*1024&&r.bytes.optionalDetail<=128*1024&&r.bytes.client<=256*1024);
 assert.equal(r.full30minCapacity,'UNPROVEN');assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});
test('ledger 159/160 missing client is incomplete despite HTTP200',()=>{
 const c=ledger();for(let id=1;id<=160;id++){lstart(c,id);if(id<159)ledgerFinish(c,id);else{c.append(fw('server',ls(id)),1,5001);c.append(fw('search',lq(id)),1,5001);}}
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'incomplete');assert.equal(r.metrics.structured.terminalMissing,2);assert.equal(r.metrics.structured.validSamples,158);
 assert.equal(r.requests[159].state,'supervisor-incomplete');assert.equal(r.requests[159].client,null);
});
test('ledger producer loss retained; late inflight client survives and new start stops',()=>{
 const c=ledger();lstart(c,1);lstart(c,2);c.append(fw('search',lq(1,0,{loss:true})),1,5001);const first=c.failure();
 c.append(fw('server',ls(1)),1,5001);c.client(lc(1));ledgerFinish(c,2);assert.throws(()=>lstart(c,3),/stopped/);
 const r=c.report({cleanupComplete:true});assert.equal(r.firstFailure,first);assert.equal(r.metrics.combined.completed,2);assert.equal(r.status,'incomplete');
});
test('ledger malformed row does not poison following same-chunk or later terminals',()=>{
 const c=ledger();lstart(c,1);lstart(c,2);c.append(Buffer.concat([Buffer.from('[R171-search] bad\n'),fw('search',lq(1)),fw('server',ls(1))]),1,5001);c.client(lc(1));ledgerFinish(c,2);
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'incomplete');assert(r.requests.every(q=>q.client&&q.search&&q.server));
});
test('ledger duplicate, source revision shape, status and process identity fail closed',()=>{
 for(const mutate of [q=>q.pid++,q=>q.retry=3,q=>q.attempts[0].captured=-1,q=>q.detailOrdinal=25,q=>q.waitNs=2000,q=>q.attempts[0].reason='secret']){
  const c=ledger();lstart(c,1);const q=lq(1);mutate(q);c.append(fw('search',q),1,5001);assert(c.failure());
 }
 const c=ledger();lstart(c,1);ledgerFinish(c,1);assert.throws(()=>c.client(lc(1)),/duplicate/);
 const d=ledger();lstart(d,1);ledgerFinish(d,1,{serverExtra:{status:503}});assert.equal(d.failure().code,'ledger-search-binding');assert.throws(()=>lstart(d,2),/stopped/);assert.equal(d.report({cleanupComplete:true}).firstFailure.code,'ledger-search-binding');
 const e=ledger();lstart(e,1);e.append(fw('search',lq(1)),1,5002);assert.equal(e.failure().code,'ledger-stream-pid');
 for(const [m,r] of [[{...ledgerProcess,startIdentity:'linux:43'},{pid:5001,seq:2}],[ledgerProcess,{pid:5002,seq:2}],[{...ledgerProcess,startIdentity:null},{pid:5001,seq:2}],[ledgerProcess,{pid:5001,seq:0}]])assert.throws(()=>ledger().bindProcess(m,r));
 const f=ledger();lstart(f,1);assert.throws(()=>lstart(f,1),/start-id/);assert.throws(()=>lstart(ledger(),513),/start-id/);
});
test('ledger missing phases remain null; missing Search terminal and partial client stay incomplete',()=>{
 const c=ledger();lstart(c,1);ledgerFinish(c,1,{searchExtra:{waitNs:null,holdNs:null}});const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.requests[0].preparationWaitNs,null);
 const d=ledger();lstart(d,1);d.append(fw('server',ls(1)),1,5001);d.client(lc(1));assert.equal(d.report({cleanupComplete:true}).firstFailure.code,'ledger-missing-search');
 const e=ledger();lstart(e,1);ledgerFinish(e,1,{clientExtra:{phase:'body'}});assert.equal(e.report({cleanupComplete:true}).status,'incomplete');
});
test('ledger timeout/cancel/error and explicit no-timing are not synthetic success',()=>{
 const c=ledger();const outcomes=['timeout','cancelled','error','incomplete'];
 for(let i=0;i<4;i++)lstart(c,i+1,'visual');
 for(let i=0;i<4;i++){c.append(fw('server',ls(i+1,{status:0,sent:false,sendBegin:0,sendEnd:0})),1,5001);c.client(lc(i+1,{status:null,headerReceived:false,phase:i===3?'unobserved':'header',outcome:outcomes[i],totalElapsedMs:i===3?null:100,bytes:0}));}
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'incomplete');assert.deepEqual([r.metrics.visual.success,r.metrics.visual.timeouts,r.metrics.visual.cancelled,r.metrics.visual.errors,r.metrics.visual.terminalMissing],[0,1,1,1,1]);assert.equal(r.metrics.visual.p95,null);
 const d=ledger();lstart(d,1);ledgerFinish(d,1,{searchExtra:{diagnosticStatus:503},serverExtra:{status:503},clientExtra:{status:503,reason:'recording-search-unavailable'}});const dr=d.report({cleanupComplete:true});assert.equal(dr.status,'captured');assert.equal(dr.metrics.structured.errors,1);assert.equal(dr.metrics.structured.validSamples,0);
});
test('ledger optional budget omission is audited; malformed or missing detail stays failure',()=>{
 const c=ledger();lstart(c,1);ledgerFinish(c,1,{ordinal:1,searchExtra:{detailState:'detail-byte-budget'}});const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.detail.omittedBytes,1);assert.equal(r.detail.firstOmission.reason,'detail-byte-budget');
 const d=ledger();lstart(d,1);d.append(fw('search',lq(1,1)),1,5001);d.append(fw('server',ls(1)),1,5001);d.client(lc(1));assert.equal(d.report({cleanupComplete:true}).firstFailure.code,'ledger-missing-detail');
 const e=ledger();lstart(e,1);e.append(fw('search',lq(1,1)),1,5001);e.append(fw('detail',{...ld(1),phases:[['bad',50,1]]}),1,5001);e.client(lc(1));assert.equal(e.report({cleanupComplete:true}).detail.errors,1);
});
test('ledger mandatory/client/line caps remain failures without changing legacy limits',()=>{
 const c=ledger();lstart(c,1);assert.throws(()=>c.client(lc(1,{padding:'x'.repeat(600)})),/client-cap/);
 const d=ledger();lstart(d,1);d.append(Buffer.from('[R171-server] '+'x'.repeat(16384)+'\n'),1,5001);assert(d.failure());assert.doesNotThrow(()=>d.client(lc(1)));assert.equal(d.report({cleanupComplete:true}).status,'incomplete');
 const e=ledger();for(let id=1;id<=320;id++)lstart(e,id);for(let id=1;id<=320;id++){e.append(fw('search',lq(id,0,{padding:'x'.repeat(1000)})),1,5001);e.client(lc(id));}
 assert.equal(e.failure().code,'ledger-server-cap');assert.equal(e.report({cleanupComplete:true}).metrics.combined.completed,320);
 const header=fs.readFileSync('scripts/internal/recording_http_cost_probe.h','utf8');assert.match(header,/RequestCap=512,DetailCap=24/);assert.match(header,/ByteCap=512\*1024/);assert.match(header,/LedgerMandatoryCap=384\*1024,LedgerDetailCap=128\*1024/);assert.match(header,/LedgerMandatoryCap-192-ledgerMandatoryBytes/);
 assert(header.indexOf('LedgerWrite(b,n,sizeof(b))&&')<header.indexOf('LedgerWrite(detail,dn,sizeof(detail),true)'));
 assert.match(header,/if\(detail&&details.fetch_add\(1\)>=DetailCap\)\{r154::Lose\(175\);d.id=prior_id;return;/);
});
test('ledger allSettled drains inflight, reverse order and first failure; no subsequent batch',async()=>{
 const c=ledger(),completed=[];let resolveLate;
 const late=new Promise(r=>resolveLate=r);
 const run=settleLedgerBatch(c,[async()=>{lstart(c,1);throw Error('original-request-error');},async()=>{lstart(c,2,'visual');await late;ledgerFinish(c,2,{kind:'visual'});completed.push(2);}]);
 await new Promise(resolve=>setImmediate(resolve));assert(c.failure());resolveLate();await assert.rejects(run,/original-request-error/);assert.deepEqual(completed,[2]);
 let extra=0;await assert.rejects(()=>settleLedgerBatch(c,[()=>extra++]),/ledger-batch-failed/);assert.equal(extra,0);
 const r=c.report({cleanupComplete:false});assert.equal(r.firstFailure.code,'ledger-batch-failed');assert.equal(r.status,'incomplete');assert.equal(r.metrics.combined.terminalMissing,1);
 const d=ledger();lstart(d,1);ledgerFinish(d,1);assert.equal(d.report({cleanupComplete:false}).firstFailure.code,'ledger-cleanup-incomplete');
});
test('ledger generated opt-in links actual sample, all four requests and unchanged capacity guard',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-ledger-v2-'));
 try{
  const out=path.join(root,'overlay');const r=spawnSync('python3',['-B','-c',"import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]),mandatory_ledger=True)",out],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
  const mixed=fs.readFileSync(path.join(out,'mixed.mjs'),'utf8'),probe=fs.readFileSync(path.join(out,'recording_http_cost_probe.h'),'utf8'),runtime=fs.readFileSync(path.join(out,'webrtc_http_server_runtime.cpp'),'utf8');
  assert.equal(spawnSync(process.execPath,['--check',path.join(out,'mixed.mjs')],{encoding:'utf8'}).status,0);
  assert(probe.startsWith('#define MEDIA_SERVER_VERIFY_MANDATORY_LEDGER 1\n'));
  for(const text of ['failureTrace=mandatoryRequestLedger()','failureTrace.bindProcess(m,currentResourceTrace(app.resourceTrace))','failureTrace.append(chunk,stream===child.stdout?0:1,child.pid)','settleLedgerBatch(failureTrace,routes.map','settleLedgerBatch(failureTrace,[0,1]','failureTrace.report({cleanupComplete:','normalShutdownPass===true','if(!failureError)throw error','AbortSignal.timeout(5000)','if(performanceDiagnose)assertSearchPerformanceCapacity();'])assert(mixed.includes(text),text);
  assert(runtime.includes('request_opt->path=="/ops/api/recordings/visual-search"'));assert(mixed.includes("?'visual':null"));
  assert(!mixed.includes('failureTrace.complete()'));assert(!mixed.includes('failureTrace.snapshot()'));
  const {measuredHttpResponse}=await import('./recording_current_app_helpers.mjs');
  const fn=mixed.slice(mixed.indexOf('async function evidenceFetch('),mixed.indexOf('async function verifySavedEvidence('));
  for(const mode of ['success','cancelled','timeout','error','missing-timing']){
   const c=ledger(),writes=[];let clock=100;
   const context={performance:{now:()=>++clock},process:{stdout:{write:s=>writes.push(s)}},console:{log(){}},URLSearchParams,
    failureTrace:c,failureOrdinal:0,cancelled:false,selectedTrace:{failure:()=>null},aSelection:()=>0,aLoad:null,attributionError,
    AbortSignal:{timeout:ms=>{assert.equal(ms,5000);return {aborted:mode==='timeout',reason:mode==='timeout'?{name:'TimeoutError'}:undefined};}},
    measuredHttpResponse:mode==='missing-timing'?async()=>{throw Error('no-report');}:opts=>measuredHttpResponse({...opts,now:()=>++clock}),
    fetch:async(url,options)=>{assert(url.includes('channelIds=9101%2C9201'));const id=Number(options.headers['X-R171-ID']);assert.equal(id,1);
     c.append(fw('server',ls(id,mode==='success'?{}:{status:0,sent:false,sendBegin:0,sendEnd:0})),1,5001);
     if(mode!=='success'){const e=Error('sanitized');e.name=mode==='cancelled'?'AbortError':mode==='timeout'?'TimeoutError':'Error';throw e;}
     return {status:200,headers:{},body:(async function*(){yield Buffer.from('{}');})()};}
   };
   const call=vm.runInNewContext('('+fn+')',context),app={child:{pid:5001},base:'http://owned',cookie:'mock'};
   const task=call(app,'/ops/api/recordings/visual-search?channelIds=9101%2C9201');
   if(mode==='success')assert.equal((await task).status,200);else await assert.rejects(task);
   const r=c.report({cleanupComplete:true});assert.equal(r.requests.length,1);
   assert.equal(r.requests[0].client.outcome,mode==='success'?'ok':mode==='missing-timing'?'incomplete':mode);
   assert.equal(r.metrics.visual.success,mode==='success'?1:0);assert.equal(writes.length,2);
   if(mode!=='success')await assert.rejects(()=>call(app,'/ops/api/recordings/visual-search?channelIds=9101%2C9201'));
  }


  const hook=mixed.slice(mixed.indexOf('  for(const stream of [child.stdout,child.stderr])'),mixed.indexOf('\n  if(short){app.identity='));
  for(const mode of ['selected','completion','resource','memory','log']){
   const c=ledger();lstart(c,1);const handlers=[],signals=[];
   const child={pid:5001,stdout:{on:(event,fn)=>handlers.push(fn)},stderr:{on:(event,fn)=>handlers.push(fn)},kill:s=>signals.push(s)};
   const app={bytes:mode==='log'?4*1024*1024:0,logFd:1,completionTrace:{append(){if(mode==='completion')this.error='mock';}},resourceTrace:{},memoryTrace:{}};
   const context={child,app,captureBoundedProcessLog,fs:{writeSync:(fd,bytes)=>bytes.length},failureTrace:c,
    selectedTrace:{append(){},failure:()=>mode==='selected'?{code:'trace-loss'}:null},selectedFailureReported:false,cancelled:false,memoryObserve:true,
    collectResourceTrace:state=>{if(mode==='resource')state.error='mock';},collectMemoryAttribution:state=>{if(mode==='memory')state.error='mock';},console:{error(){}}};
   vm.runInNewContext(hook,context);handlers[1](Buffer.from('bounded mock log\n'));
   assert(c.failure(),mode);assert(signals.includes('SIGTERM'));assert.throws(()=>lstart(c,2),/stopped/);
   ledgerFinish(c,1);const r=c.report({cleanupComplete:true});assert(r.requests[0].client);assert.equal(r.status,'incomplete');
  }
  const budget=spawnSync('bash',[path.join(out,'wrapper.sh'),'--search-performance-diagnostic'],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH}});assert.notEqual(budget.status,0);assert.match(budget.stderr,/CAPACITY_UNPROVEN/);assert.deepEqual(fs.readdirSync(root),['overlay']);
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

// Limited profile: virtual clocks only, no server/build/network.
function limitedClock(){let time=0;return {set:t=>{time=t;},now:()=>time,s:limitedSearchSchedule({startedAt:0,now:()=>time})};}
test('limited exact interval and independent hard deadline',()=>{
 const {s,set}=limitedClock();s.begin();for(let i=0;i<4;i++)s.request();s.settled(true);
 set(14999);assert.equal(s.decision().reason,'interval');set(15000);assert.equal(s.decision().start,true);
 set(235000);assert.equal(s.decision().start,true);set(235001);assert.equal(s.decision().reason,'finish-reserve');
 set(300000);assert.equal(s.decision().reason,'limited-deadline');assert.equal(s.report({cleanupComplete:true}).status,'INCOMPLETE');
});
test('limited request cap and partial batch cannot claim completion',()=>{
 const {s}=limitedClock();s.begin();for(let i=0;i<4;i++)s.request();assert.throws(()=>s.request(),/request-bound/);s.settled(false);
 const r=s.report({cleanupComplete:true});assert.equal(r.startedRequests,4);assert.equal(r.completedBatches,0);assert.equal(r.all20Completed,false);
 assert.equal(limitedSearchContract.requests,80);assert.equal(limitedSearchContract.batches,20);
});
test('limited reserve is rechecked after sampling and before each request',async()=>{
 const {s,set}=limitedClock();let fetches=0;
 await runLimitedSearch({schedule:s,ledger:ledger(),sample:async()=>set(235001),routes:()=>[1,2,3,4],fetch:async()=>fetches++,pause:async()=>{}});
 assert.equal(fetches,0);assert.equal(s.report({cleanupComplete:true}).stopReason,'finish-reserve');
 const c=limitedClock();c.s.begin();c.set(235001);assert.throws(()=>c.s.request(),/request-deadline/);assert.equal(c.s.report({cleanupComplete:true}).startedRequests,0);
});
test('limited full virtual run records actual subset and 15s starts',async()=>{
 const c=limitedClock(),l=ledger(),starts=[];let requests=0;
 await runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>{},routes:()=>[1,2,3,4],fetch:async()=>{requests++;starts.push(c.now());},pause:async ms=>c.set(c.now()+ms)});
 const r=c.s.report({cleanupComplete:true});assert.equal(requests,64);assert.equal(r.completedBatches,16);assert.equal(r.all20Completed,false);
 assert.deepEqual(starts.filter((_,i)=>i%4===0),Array.from({length:16},(_,i)=>i*15000));
});
test('limited slow reverse completions preserve in-flight after first failure',async()=>{
 const c=limitedClock(),l=ledger();let launched=0,settled=0;const pending=[];
 const work=runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>{},routes:()=>[1,2,3,4],fetch:()=>{launched++;return new Promise((resolve,reject)=>pending.push({resolve,reject})).finally(()=>settled++);},pause:async()=>{}});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(launched,4);
 c.set(5000);pending[3].reject(Error('mock-http-timeout'));pending[2].resolve();pending[1].resolve();pending[0].resolve();
 await assert.rejects(work,/mock-http-timeout/);assert.equal(settled,4);assert.equal(launched,4);assert.equal(c.s.decision().start,false);
 assert.equal(c.s.report({cleanupComplete:false}).firstFailure.code,'mock-http-timeout');
});
for(const code of ['ledger-product-log','workspace-cap','ledger-resource-or-completion'])test('limited stops on '+code,async()=>{
 const c=limitedClock(),l=ledger();let n=0;l.fail(code);
 await assert.rejects(runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>{},routes:()=>[1,2,3,4],fetch:async()=>n++,pause:async()=>{}}),new RegExp(code));assert.equal(n,0);
});
test('limited capacity and official guard stay independently blocked',()=>{
 const c=limitedSearchCapacity();assert.equal(c.mandatoryServerBytes,122760);assert.equal(c.clientBytes,81920);assert.equal(c.optionalDetailBytes,131072);
 assert.equal(c.status,'BLOCKED');assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});
for(const count of [24,25])test('limited ledger detail '+count+' and distinct Structured/Visual',()=>{
 const c=ledger();for(let id=1;id<=count*2;id++)lstart(c,id,id%2?'structured':'visual');
 for(let id=count*2;id>=1;id--)ledgerFinish(c,id,{kind:id%2?'structured':'visual',ordinal:id%2?count-(id-1)/2:0});
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.detail.captured,24);assert.equal(r.detail.omittedCap,count-24);
 assert.equal(r.metrics.structured.started,count);assert.equal(r.metrics.visual.started,count);
});
for(const outcome of ['error','timeout','cancelled','incomplete'])test('limited actual client outcome '+outcome,()=>{
 const c=ledger();lstart(c,1);ledgerFinish(c,1,{clientExtra:{status:null,headerReceived:false,phase:'unobserved',outcome,totalElapsedMs:null},serverExtra:{status:200}});
 const r=c.report({cleanupComplete:true});assert.equal(r.requests[0].client.outcome,outcome);assert.equal(r.status,'incomplete');
});
test('limited missing terminal and failed cleanup remain failures',()=>{
 const c=ledger();lstart(c,1);assert.equal(c.report({cleanupComplete:true}).status,'incomplete');
 const d=limitedClock();d.s.begin();d.s.request();d.s.settled(false);const first=d.s.report({cleanupComplete:true}).firstFailure;
 assert.deepEqual(d.s.report({cleanupComplete:false}).firstFailure,first);
 const e=limitedClock();assert.equal(e.s.report().firstFailure.code,'limited-cleanup');
});
test('limited generated opt-in isolated; default and mandatory profiles unchanged',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-limited-mock-'));
 try{const code="import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]),mandatory_ledger=True,limited_search=True);generate(Path(sys.argv[2]),mandatory_ledger=True)";
 const r=spawnSync('python3',['-B','-c',code,path.join(root,'limited'),path.join(root,'normal')],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
 const s=fs.readFileSync(path.join(root,'limited/mixed.mjs'),'utf8'),normal=fs.readFileSync(path.join(root,'normal/mixed.mjs'),'utf8');
 assert(!normal.includes('limitedDiagnose'));assert(s.includes("if(limitedDiagnose)assertLimitedSearchCapacity();"));assert(s.indexOf('assertLimitedSearchCapacity();')<s.indexOf('const artifacts='));
 for(const t of ['if(performanceDiagnose)assertSearchPerformanceCapacity();','limitedDiagnose?300000','limitedSearchSchedule({startedAt:start})','failureTrace.bindProcess(m,currentResourceTrace(app.resourceTrace))','if(!limitedDiagnose&&!selectedId','AbortSignal.timeout(5000)','limited-http-failure'])assert(s.includes(t),t);
 assert.equal(spawnSync(process.execPath,['--check',path.join(root,'limited/mixed.mjs')],{encoding:'utf8',timeout:10000}).status,0);
 const wrapper=fs.readFileSync(path.join(root,'limited/wrapper.sh'),'utf8');assert(wrapper.indexOf('assertLimitedSearchCapacity')<wrapper.indexOf('observer_parent='));
 const a=fs.readFileSync(path.join(root,'limited/recording_http_cost_probe.h')),b=fs.readFileSync(path.join(root,'normal/recording_http_cost_probe.h'));assert(a.equals(b));
 }finally{fs.rmSync(root,{recursive:true});}
});
test('limited scheduler and unchanged ledger integrated virtual 64 requests',async()=>{
 const c=limitedClock(),l=ledger();let id=0,ordinal=0;
 await runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>l.bindProcess(ledgerProcess,{pid:5001,seq:id+1}),routes:()=>['structured','structured','visual','visual'],
 fetch:async kind=>{const n=++id,startedMs=c.now();l.start(n,{kind,pid:5001,startedMs});c.set(c.now()+100);ledgerFinish(l,n,{kind,ordinal:kind==='structured'?++ordinal:0,clientExtra:{endedMs:c.now()}});return {status:200};},pause:async ms=>c.set(c.now()+ms)});
 const r=l.report({cleanupComplete:true}),s=c.s.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.requests.length,64);assert.equal(s.startedRequests,64);assert.equal(s.completedBatches,16);
 assert.equal(r.detail.captured,24);assert.equal(r.detail.omittedCap,8);assert.equal(r.metrics.structured.started,32);assert.equal(r.metrics.visual.started,32);assert.equal(r.metrics.combined.terminalMissing,0);
});
test('limited zero work, invalid clock and 300s cleanup cannot pass',()=>{
 const a=limitedClock();assert.equal(a.s.report({cleanupComplete:true}).status,'INCOMPLETE');
 const b=limitedClock();b.set(-1);assert.throws(()=>b.s.decision(),/clock/);
 const c=limitedClock();c.s.begin();for(let n=0;n<4;n++)c.s.request();c.s.settled(true);c.set(300001);assert.equal(c.s.report({cleanupComplete:true}).firstFailure.code,'limited-deadline');
});

test('eligibility capacity retains unknown costs and existing capture contracts',()=>{
 const c=limitedSearchCapacity();assert.equal(c.status,'BLOCKED');assert.equal(c.costs.productLog.capBytes,4194304);assert.equal(c.costs.completion.rowCap,4096);
 for(const k of ['productLog','completion','resource','memory','startupShutdown','evidence','mediaSqliteJournal','copy','build'])assert.equal(c.costs[k].upperBytes,null,k);
 assert.equal(c.costs.parentLog.upperBytes,2097152);assert.equal(c.costs.parentReceipts.upperBytes,65536);assert.equal(c.costs.build.sharedSeconds,180);assert.equal(c.costs.copy.capBytes,469762048);assert.throws(assertLimitedSearchCapacity,/BLOCKED/);
});
test('eligibility isolated CMake, overlay, old archive and source/link rejection',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-eligibility-mock-');fs.chmodSync(root,0o700);
 const code=String.raw`
import sys,json,hashlib,subprocess
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal')
import recording_accumulated_cost as m
root=Path(sys.argv[1]);b=root/'build';plan=m.isolated_build_plan(b)
assert plan['limits']=={'sharedSeconds':180,'rssBytes':1073741824,'diskBytes':536870912,'outputBytes':2097152}
assert plan['commands'][1][-1]=='1' and plan['commands'][0][4]==str(b)
assert not any(str(m.REPO/'build-gst-onnx') in s for s in plan['commands'][0])
try:m.isolated_build_root(m.REPO/'build-gst-onnx');assert False
except ValueError:pass
m.generate(root/'overlay',mandatory_ledger=True,limited_search=True,build_root=b)
s=(root/'overlay/mixed.mjs').read_text();w=(root/'overlay/wrapper.sh').read_text()
assert 'BIN_PATH:'+json.dumps(str(root/'media_server')) in s
assert 'observer_build='+str(b) in w and 'observer_build="$observer_repo/build-gst-onnx"' not in w
assert w.index('assertLimitedSearchCapacity')<w.index('observer_parent=')
assert 'app.completionTrace.error||app.resourceTrace.error' in s and 'storage.capExceeded' in s and 'ledger-product-log' in s
b.mkdir();(b/'CMakeFiles/media_server_runtime.dir').mkdir(parents=True);(b/'CMakeFiles/media_server.dir').mkdir()
old=m.REPO/'build-gst-onnx';names=['libmedia_server_runtime.a','media_server','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt']
for n in names:(b/n).write_bytes((old/n).read_bytes() if n.endswith(('flags.make','link.txt')) else b'mock-build-not-product')
source='src/recording/recording_contracts.cpp';receipt={'head':'mock-head','buildRoot':str(b),'sourceSha256':{source:m.sha(m.REPO/source)},'buildSha256':{n:m.sha(b/n) for n in names}}
def git(cmd,**kw):return 'mock-head\n' if cmd[1]=='rev-parse' else (source+'\0').encode()
with patch.object(m.subprocess,'check_output',side_effect=git):
 assert m.verify_isolated_build_inputs(b,receipt)==b
 for key,value in [('head','old-head'),('sourceSha256',{}),('buildRoot',str(old)),('buildSha256',{})]:
  bad=dict(receipt);bad[key]=value
  try:m.verify_isolated_build_inputs(b,bad);assert False,key
  except ValueError:pass
names=['src/ingress/recording_search_application_service.cpp','src/ingress/webrtc_http_server_runtime.cpp','src/ingress/webrtc_http_server.cpp'];p={'sources':dict.fromkeys(names,{}),'objects':['/owned/'+Path(n).name+'.o' for n in names]};mapping='\n'.join(p['objects']);symbols='000 T RecordingApplicationService6Search\n001 T ReadHttpRequest\n'
m.verify_isolated_link(p,mapping,symbols)
for mapping,syms in [('',symbols),(mapping+' archive(recording_search_application_service.cpp.o)',symbols),(mapping,symbols+symbols)]:
 try:m.verify_isolated_link(p,mapping,syms);assert False
 except ValueError:pass
print('isolated binding synthetic checks PASS; no compiler/product')
`;
 try{const r=spawnSync('python3',['-B','-c',code,root],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stdout+r.stderr);}finally{fs.rmSync(root,{recursive:true});}
});
test('eligibility limited supervisor virtual clock includes cleanup and final binding',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-eligibility-supervisor-');
 const code=String.raw`
import sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal');import run_v450_recording_a_mixed as m
root=Path(sys.argv[1])
for elapsed,base in [(250,{'status':'PASS','exit':0}),(301,{'status':'PASS','exit':0}),(30,{'status':'FAIL','exit':1,'errorType':'mock-start-failure'}),(80,{'status':'FAIL','exit':1,'cleanupErrors':['mock-cleanup']})]:
 with patch.object(m,'run_owned',return_value=base.copy()) as run,patch.object(m.LimitedParentCapture,'preserve',return_value={'complete':True}),patch.object(m.time,'monotonic',side_effect=[0,elapsed]):
  r=m.run_limited_owned(['mock-only'],root/'unused',root,{},lambda _:None)
  assert run.call_args.args[2]==240
  assert r['finishReserveSeconds']==60 and r['hardDeadlineSeconds']==300
  assert r['status']==('PASS' if elapsed==250 else 'FAIL')
  if 'errorType' in base:assert r['errorType']==base['errorType']
  if 'cleanupErrors' in base:assert r['cleanupErrors']==base['cleanupErrors']
r=m.finish_limited_record(root/'receipt.json',{'status':'PASS','exit':0},300);assert r['status']=='FAIL'
print('supervisor Mock PASS; no process launched')
`;
 try{const r=spawnSync('python3',['-B','-c',code,root],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stdout+r.stderr);}finally{fs.rmSync(root,{recursive:true});}
});
test('eligibility preparation costs reduce actual starts, never increase deadline',async()=>{
 const c=limitedClock(),l=ledger();c.set(45000);let requests=0;
 await runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>{},routes:()=>[1,2,3,4],fetch:async()=>requests++,pause:async ms=>c.set(c.now()+ms)});
 assert.equal(requests,52);assert.equal(c.s.report({cleanupComplete:true}).all20Completed,false);
});
test('eligibility launcher uses limited adapter, guarded binding and unchanged legacy budgets',()=>{
 const s=fs.readFileSync('scripts/internal/run_v450_recording_a_mixed.py','utf8');
 assert(s.includes("sys.argv[1]=='--limited-search-diagnostic'"));assert(s.includes("raise SystemExit(limited_entry(Path(sys.argv[2])))"));
 const entry=s.slice(s.indexOf('def limited_entry('),s.indexOf('def source_binding('));
 assert(entry.indexOf('verify_isolated_build_inputs')<entry.indexOf('run_limited_owned('));assert(entry.indexOf('assertLimitedSearchCapacity();')<entry.indexOf('directory.mkdir'));
 assert(entry.includes('verify_isolated_link(link_plan'));assert(entry.includes('limited-overlay-binding'));assert(entry.includes('limited-postflight-binding'));
 assert(s.includes("if sys.argv[1] in ('--120', '--state-diagnostic')"));assert(s.includes("else 180 if sys.argv[1] == '--prepare'"));
});

const parentCaptureMock=String.raw`
import sys,io,json,hashlib,os
from pathlib import Path
from unittest.mock import patch,Mock
sys.path.insert(0,'scripts/internal');import run_v450_recording_a_mixed as m
root=Path(sys.argv[1]);mode=sys.argv[2];cap=m.LIMITED_PARENT_OUTPUT_BYTES
assert cap==2097152
count=0
def capture(chunks,eof=True,prior=False):
 global count
 count+=1;p=root/(str(count)+'.log');c=m.LimitedParentCapture()
 with p.open('xb') as f:
  c.output=f
  if prior:c.fail('child-diagnostic')
  for b in chunks:c.push(b)
  c.eof=eof
 # Each capture uses its own receipt directory.
 d=root/str(count);d.mkdir();p.rename(d/'run.log');p=d/'run.log'
 r=c.preserve(p);assert r['storedBytes']<=cap;assert r['readbackVerified'];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['storedSha256']
 assert (d/'parent-output-receipt.json').stat().st_size<=32768
 return c,r,p
if mode=='normal':
 for chunks in [[],[b'out'],[b'err'],[b'out\n',b'err\n'],[b'a',b'b',b'c'],[bytes([n]) for n in '한글🙂\n'.encode()]]:
  c,r,p=capture(chunks);assert r['complete'] and p.read_bytes()==b''.join(chunks);assert r['observedBytes']==len(b''.join(chunks))
if mode=='boundary':
 for chunks in [[b'x'*(cap-1)],[b'x'*cap],[b'x'*(cap+1)],[b'x'*100,b'y'*(cap-99)],[b'o'*(cap//2),b'e'*(cap//2+1)]]:
  c,r,p=capture(chunks);n=sum(map(len,chunks));assert r['storedBytes']==min(n,cap);assert r['complete']==(n<cap)
  if n>=cap:assert r['firstFailure']['code']=='parent-output-cap'
if mode=='first':
 c,r,p=capture([b'[R165-first-',b'failure] {"code":"original"}\n',b'x'*cap],eof=False)
 assert r['firstFailure']['code']=='child-diagnostic';assert [x['code'] for x in r['failureEvents']]==['child-diagnostic','parent-output-cap'];assert r['inFlightTerminals']=='UNVERIFIED';assert r['truncated']
 c,r,p=capture([b'x'*cap,b'after-stop'],eof=False,prior=True);assert r['storedBytes']==cap;assert r['observedBytes']==cap+10
if mode=='write':
 c=m.LimitedParentCapture();c.output=Mock();c.output.write.side_effect=OSError('disk');c.push(b'abc');assert c.first['code']=='parent-log-write'
 c.output.write.side_effect=None;c.output.write.return_value=3;c.push(b'more');assert c.written==0
 c=m.LimitedParentCapture();c.selector=Mock();c.selector.select.side_effect=OSError('collector');c.read(0);assert c.first['code']=='parent-log-collection'
 c.selector.close.side_effect=OSError('close');c.close();assert c.first['code']=='parent-log-collection';assert 'parent-log-close' in c.failure_events
if mode=='evidence':
 c,r,p=capture([b'ok']);again=c.preserve(p);assert not again['complete'] and again['evidenceErrors']==['parent-output-evidence']
 f=root/'final.json';r=m.finish_limited_record(f,{'status':'PASS','exit':0},10);assert r['receiptSaved']
 r=m.finish_limited_record(f,{'status':'FAIL','exit':124,'firstFailure':'original'},11);assert not r['receiptSaved'] and r['exit']==124 and r['firstFailure']=='original'
 r=m.finish_limited_record(root/'too-big.json',{'status':'PASS','exit':0,'data':'x'*32768},1);assert not r['receiptSaved'] and not (root/'too-big.json').exists()
if mode=='supervisor':
 for overflow,cleanup_fail in [(False,False),(True,False),(True,True)]:
  child=Mock();child.pid=54321;child.returncode=None;child.poll.side_effect=lambda:child.returncode
  c=m.LimitedParentCapture();calls=[]
  def attach(ch,output):c.output=output
  def read(timeout):
   calls.append('read');c.push(b'x'*cap if overflow else b'normal');c.eof=not overflow
   if not overflow:child.returncode=0
  def stop(ch):
   calls.append('stop');child.returncode=child.returncode if child.returncode is not None else -15
   return {'processGroupAbsent':not cleanup_fail,'cleanupErrors':['mock-group'] if cleanup_fail else []}
  p=root/('super-'+str(overflow)+str(cleanup_fail)+'.log')
  with patch.object(m.subprocess,'Popen',return_value=child) as popen,patch.object(c,'attach',side_effect=attach),patch.object(c,'read',side_effect=read),patch.object(m,'group_alive',side_effect=lambda _:child.returncode is None),patch.object(m,'stop_created_group',side_effect=stop),patch.object(m,'finish_registered_groups',return_value={'registeredGroupsAbsent':True}):
   r=m.run_owned(['mock-no-exec'],p,240,root,{},lambda _:None,limited_capture=c)
   assert popen.call_args.kwargs['stdout']==m.subprocess.PIPE and popen.call_args.kwargs['stderr']==m.subprocess.STDOUT
   assert r['status']==('FAIL' if overflow else 'PASS');assert calls==['read','stop']
   if overflow:assert c.first['code']=='parent-output-cap'
   if cleanup_fail:assert r['cleanupErrors']==['mock-group'] and not r['processGroupAbsent']
if mode=='legacy':
 child=Mock();child.pid=54321;child.returncode=0;child.poll.return_value=0
 with patch.object(m.subprocess,'Popen',return_value=child) as p,patch.object(m,'group_alive',return_value=False),patch.object(m,'stop_created_group',return_value={'processGroupAbsent':True}),patch.object(m,'finish_registered_groups',return_value={'registeredGroupsAbsent':True}):
  r=m.run_owned(['mock-no-exec'],root/'legacy.log',180,root,{},lambda _:None);assert r['status']=='PASS';assert p.call_args.kwargs['stdout']!=m.subprocess.PIPE
print(mode+' Mock PASS; no product or child process executed')
`;
for(const mode of ['normal','boundary','first','write','evidence','supervisor','legacy'])test('parent capture '+mode,()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-parent-capture-mock-');
 try{const r=spawnSync('python3',['-B','-c',parentCaptureMock,root,mode],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}finally{fs.rmSync(root,{recursive:true});}
});
test('parent capture cap provenance and limited-only binding',()=>{
 const guard=fs.readFileSync('scripts/internal/recording_catalog_comparison_guard.mjs','utf8'),runner=fs.readFileSync('scripts/internal/run_v450_recording_a_mixed.py','utf8');
 assert(guard.includes('output:2097152'));assert(runner.includes('LIMITED_PARENT_OUTPUT_BYTES = 2097152'));assert(runner.includes('registry,limited_capture=capture)'));
 assert(runner.includes('hardDeadlineSeconds=300'));assert(runner.includes('finishReserveSeconds=60'));assert(runner.includes('run_owned(command, log_path, 240'));
 assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);
});

import {runLimitedIsolatedBuild} from './recording_accumulated_cost.mjs';
function buildMock(options={}){
 const root=fs.mkdtempSync('/private/tmp/media-server-build-budget-mock-');fs.chmodSync(root,0o700);
 let tick=0;const calls=[];const e=path.join(root,'evidence'),w=path.join(root,'work'),b=path.join(w,'build');
 const write=(n,v)=>fs.writeFileSync(path.join(e,n),JSON.stringify(v));
 const approved={head:'45b19bd88cd2ea9c7be48a25329580e562c2a3ee',status:'approved dirty source',sourceSha256:options.sourceSha256??{}};
 const hooks={now:()=>tick,runBounded:async o=>{
  const i=calls.length;calls.push(o);tick+=options.times?.[i]??100;
  const cmd=o.args.slice(4);
  if(i===7){
   if(options.map)options.map(path.join(w,'link.map'),root);
   else if(options.map!==false)fs.writeFileSync(path.join(w,'link.map'),'synthetic map');
  }
  if(cmd.includes('--limited-build-stage')){
   const stage=cmd.at(-2);
   if(stage==='plan')write('cmake-plan.json',{buildRoot:b,commands:[['mock-cmake-configure'],['mock-cmake-build']]});
   if(stage==='link-plan')write('link-plan.json',{cwd:b,archive:path.join(b,'libmedia_server_runtime.a'),commands:[['mock-cxx0'],['mock-cxx1'],['mock-cxx2'],['mock-link']]});
   if(stage==='verify')write('link-binding.json',{uniqueSymbols:true,outputs:{'work/link.map':fs.existsSync(path.join(w,'link.map'))?crypto.createHash('sha256').update(fs.readFileSync(path.join(w,'link.map'))).digest('hex'):null}});
  }
  const bytes=options.bytes?.[i]??3;
  return {code:0,signal:null,stdout:'ok\n',stderr:'',stopReason:null,groupClean:true,groupId:2000+i,groupPeakRssBytes:1000+i,
   observationFailure:null,outputBytes:bytes,elapsedMs:options.times?.[i]??100,...options.receipts?.[i]};
 }};
 if(options.disk)hooks.disk=()=>options.disk({tick,calls: calls.length,root});
 if(options.cleanup)hooks.cleanup=options.cleanup;
 if(options.save)hooks.save=(p,d)=>options.save(p,d,()=>tick,ms=>tick+=ms);
 return {root,calls,hooks,advance:ms=>tick+=ms,run:()=>runLimitedIsolatedBuild({root,approved,python:'/mock/python',env:{PATH:'/mock/bin'}},hooks),dispose:()=>fs.rmSync(root,{recursive:true})};
}
async function withBuild(options,fn){const m=buildMock(options);try{await fn(await m.run(),m);}finally{m.dispose();}}
test('build supervision normal ten stages share decreasing budget and root; no actual compiler',async()=>{
 await withBuild({},(r,m)=>{
  assert.equal(r.status,'PASS');assert.equal(r.steps.length,10);assert.equal(r.outputBytes,30);assert.equal(r.storedOutputBytes,30);
  assert.equal(r.elapsedMs,1000);assert.equal(r.peakRssBytes,1009);assert(r.workAbsent);
  for(let i=0;i<m.calls.length;i++){
   const c=m.calls[i];assert.equal(c.seconds,(180000-i*100)/1000);assert.equal(c.outputCap,2097152-i*3-1);
   assert.equal(c.rssCap,1073741824);assert.equal(c.diskCap,536870912);assert.equal(c.root,m.root);
   for(const k of ['HOME','TMPDIR','XDG_CACHE_HOME'])assert(c.env[k].startsWith(m.root+'/work/'));
   assert.equal(c.command,'/bin/sh');assert(c.args[1].includes('exec "$@"'));
  }
  assert(fs.existsSync(path.join(m.root,'evidence/link.map')));assert(fs.existsSync(path.join(m.root,'evidence/result.json')));
 });
});
for(const [label,ms,pass] of [['before',179999,true],['at',180000,false],['after',180001,false]])test('build supervision deadline '+label,async()=>{
 await withBuild({times:[ms-900,...Array(9).fill(100)]},r=>{assert.equal(r.status,pass?'PASS':'FAIL');if(!pass)assert.equal(r.firstFailure.code,'build-deadline');});
});
test('build supervision cumulative time and exhausted first command stop next launch',async()=>{
 for(const times of [[180000],[100000,80000],[90000,90001]])await withBuild({times},(r,m)=>{
  assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert.equal(m.calls.length,times.length);
  assert(r.workAbsent);assert(fs.existsSync(path.join(m.root,'evidence/result.json')));
 });
});
for(const [label,bytes] of [['at',[1048576,1048576]],['over',[1048576,1048577]],['late',[2097153]]])test('build supervision cumulative output '+label,async()=>{
 await withBuild({bytes},(r,m)=>{assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-output-cap');assert.equal(m.calls.length,bytes.length);assert.equal(r.outputBytes,bytes.reduce((a,b)=>a+b));});
});
for(const [name,index] of [['configure',1],['compiler',4],['linker',7]])test('build supervision first '+name+' failure persists despite later evidence/cleanup errors',async()=>{
 await withBuild({receipts:{[index]:{code:1,stderr:'first compiler diagnostic'}},cleanup:()=>{throw Error('mock-cleanup');}},(r,m)=>{
  assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(r.steps.at(-1).code,1);assert.equal(m.calls.length,index+1);
  assert.equal(r.cleanupErrors.at(-1).code,'mock-cleanup');assert.equal(r.status,'FAIL');assert(!r.workAbsent);
  assert.equal(fs.readFileSync(path.join(m.root,'evidence',r.steps.at(-1).stage+'.stderr.txt'),'utf8'),'first compiler diagnostic');
 });
});
for(const [label,receipt] of Object.entries({rss:{stopReason:'rss-safety-cap',groupPeakRssBytes:1073741825},
 disk:{stopReason:'disk-cap'},collection:{stopReason:'resource-observation',observationFailure:{part:'process',code:'EPERM'}},
 group:{groupClean:false},exit:{code:2,signal:'SIGTERM'},malformed:{outputBytes:null}}))test('build supervision '+label+' fails closed',async()=>{
 await withBuild({receipts:{0:receipt}},(r,m)=>{assert.equal(r.status,'FAIL');assert.equal(m.calls.length,1);if(label==='group')assert(r.cleanupDeferred);});
});
test('build supervision disk total and measurement failure stop before command',async()=>{
 for(const disk of [()=>536870913,()=>{throw Error('disk-unreadable');}])await withBuild({disk},(r,m)=>{assert.equal(r.status,'FAIL');assert.equal(m.calls.length,0);});
});
test('build supervision output limit during termination keeps primary supervisor failure',async()=>{
 await withBuild({receipts:{0:{stopReason:'timeout',code:null,signal:'SIGTERM',outputBytes:2097200,stdout:'x'.repeat(2097152),stderr:'late'}}},(r,m)=>{
  assert.equal(r.firstFailure.code,'timeout');assert.equal(m.calls.length,1);assert(r.errors.some(e=>e.code==='build-output-cap'));
  assert(r.errors.some(e=>e.code==='build-stored-output-cap'));assert.equal(r.storedOutputBytes,2097152);assert(!r.steps[0].outputComplete);
 });
});
function mockEvidenceSave(p,d){fs.writeFileSync(p,d,{flag:'wx',mode:0o600});return {path:path.basename(p),bytes:d.length};}
test('build supervision evidence failure preserves first error, no next command or deletion',async()=>{
 await withBuild({receipts:{0:{code:1,stderr:'first diagnostic survives stdout write failure'}},save:(p,d)=>{if(p.endsWith('plan.stdout.txt'))throw Error('mock-write');return mockEvidenceSave(p,d);}},(r,m)=>{
  assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(r.evidenceErrors[0].code,'mock-write');assert.equal(m.calls.length,1);assert(r.cleanupDeferred);
  assert.equal(fs.readFileSync(path.join(m.root,'evidence/plan.stderr.txt'),'utf8'),'first diagnostic survives stdout write failure');
 });
});
test('build supervision final evidence time and cleanup included in same 180 seconds',async()=>{
 await withBuild({save:(p,d,get,advance)=>{const r=mockEvidenceSave(p,d);if(p.endsWith('result.json'))advance(179000);return r;}},(r,m)=>{
  assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert(r.finalizationIncomplete);
  assert(fs.existsSync(path.join(m.root,'evidence/finalization-failure.json')));
 });
 await withBuild({cleanup:()=>{throw Error('cleanup-failed');}},r=>assert.equal(r.firstFailure.code,'build-cleanup'));
});
test('build supervision second invocation and owned symlink rejected without launch',async()=>{
 const m=buildMock();try{assert.equal((await m.run()).status,'PASS');const calls=m.calls.length;const again=await m.run();assert.equal(again.firstFailure.code,'build-root-not-fresh');assert.equal(m.calls.length,calls);}finally{m.dispose();}
 const n=buildMock();try{n.hooks.runBounded=async()=>{fs.symlinkSync('/private/tmp',path.join(n.root,'work','external'));return {code:0,signal:null,stdout:'',stderr:'',stopReason:null,groupClean:true,groupId:2,groupPeakRssBytes:1,outputBytes:0};};
  const r=await n.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-owned-entry');assert(r.cleanupErrors.length);
 }finally{n.dispose();}
});
test('build supervision source bridge is build-only and common guards/old modes remain separate',()=>{
 const p=fs.readFileSync('scripts/internal/recording_accumulated_cost.py','utf8');
 const bridge=p.slice(p.indexOf('def isolated_supervision_stage'),p.indexOf('def build(parent)'));
 assert(!bridge.includes('subprocess.run'));assert(bridge.includes('source_check()'));assert(bridge.includes('verify_isolated_build_inputs'));assert(bridge.includes('verify_isolated_link'));
 assert(bridge.includes("isolated-overlay-source"));assert(bridge.includes("isolated-old-archive"));assert(p.includes("else:build(Path(sys.argv[1]))"));
 assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);assert.throws(assertLimitedSearchCapacity,/BLOCKED/);
 assert.equal(limitedSearchCapacity().costs.parentLog.capBytes,2097152);
});
test('build supervision thrown guard leaves group and partial tree unconfirmed',async()=>{
 const m=buildMock();try{m.hooks.runBounded=async()=>{throw Error('missing-guard-receipt');};const r=await m.run();assert.equal(r.firstFailure.code,'missing-guard-receipt');assert(r.cleanupDeferred);assert(!r.workAbsent);}finally{m.dispose();}
});
test('build supervision bridge binds approved files, plans and final evidence with synthetic build artifacts',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-build-bridge-mock-');fs.chmodSync(root,0o700);
 const code=String.raw`
import sys,json,hashlib
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal');import recording_accumulated_cost as m
root=Path(sys.argv[1]);work=root/'work';work.mkdir(mode=0o700);e=root/'evidence';e.mkdir();b=work/'build'
source='src/recording/recording_contracts.cpp'
protected=[source]+['build-gst-onnx/'+n for n in ['CMakeCache.txt','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt','libmedia_server_runtime.a','media_server']]
a={'head':'mock-head','status':'approved','sourceSha256':{n:m.sha(m.REPO/n) for n in protected}}
(e/'approved.json').write_text(json.dumps(a))
def git(cmd,**kw):
 if cmd[1]=='rev-parse':return 'mock-head\n'
 if cmd[1]=='status':return 'approved'
 if cmd[1]=='branch':return 'v4.5.0\n'
 if cmd[1]=='diff':return b''
 if cmd[1]=='ls-files':return (source+'\0').encode()
 raise AssertionError(cmd)
with patch.object(m.subprocess,'check_output',side_effect=git):
 m.isolated_supervision_stage('plan',root)
 plan=json.loads((e/'cmake-plan.json').read_text());assert len(plan['commands'])==2 and plan['buildRoot']==str(b)
 # A changed approved source must be rejected before another plan is generated.
 a['sourceSha256'][source]='0'*64;(e/'approved.json').write_text(json.dumps(a))
 try:m.isolated_supervision_stage('plan',root);assert False
 except ValueError as ex:assert str(ex)=='isolated-source-changed'
 a['sourceSha256'][source]=m.sha(m.REPO/source);(e/'approved.json').write_text(json.dumps(a))
 # The production adapter now binds a separate manifest, retaining receipt caps.
 manifest=(json.dumps(a.pop('sourceSha256'))+'\n').encode();mf=e/'source-sha256.json';mf.write_bytes(manifest);mf.chmod(0o600)
 a['sourceManifest']={'path':mf.name,'bytes':len(manifest),'sha256':hashlib.sha256(manifest).hexdigest()}
 (e/'approved.json').write_text(json.dumps(a))
 b.mkdir();(b/'CMakeFiles/media_server_runtime.dir').mkdir(parents=True);(b/'CMakeFiles/media_server.dir').mkdir()
 names=['libmedia_server_runtime.a','media_server','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt'];old=m.REPO/'build-gst-onnx'
 for n in names:(b/n).write_bytes((old/n).read_bytes() if n.endswith(('flags.make','link.txt')) else b'synthetic-not-executable')
 m.isolated_supervision_stage('link-plan',root)
 link=json.loads((e/'link-plan.json').read_text());assert len(link['commands'])==4;assert link['archive']==str(b/'libmedia_server_runtime.a')
 assert '#define MEDIA_SERVER_VERIFY_MANDATORY_LEDGER 1' in (work/'overlay/recording_http_cost_probe.h').read_text()
 for obj in link['objects']:Path(obj).write_bytes(b'synthetic-object')
 (work/'media_server').write_bytes(b'synthetic-link');(work/'link.map').write_text('\n'.join(link['objects']))
 (e/'symbols.stdout.txt').write_text('000 T RecordingApplicationService6Search\n001 T ReadHttpRequest\n')
 m.isolated_supervision_stage('verify',root);r=json.loads((e/'link-binding.json').read_text());assert r['uniqueSymbols'];assert len(r['sources'])==3
 assert r['sourceManifest']==a['sourceManifest'] and 'sourceSha256' not in r
 (work/'overlay/webrtc_http_server.cpp').write_text('changed')
 try:m.isolated_supervision_stage('verify',root);assert False
 except ValueError as ex:assert str(ex)=='isolated-overlay-source'
print('bridge actual Python path with synthetic objects; compiler/link/product calls zero')
`;
 try{const r=spawnSync('python3',['-B','-c',code,root],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}finally{fs.rmSync(root,{recursive:true});}
});
test('build supervision short-command RSS and independently reported peak are not zero success',async()=>{
 await withBuild({receipts:{0:{groupPeakRssBytes:0}}},(r,m)=>{assert.equal(r.firstFailure.code,'build-rss-unobserved');assert.equal(m.calls.length,1);});
 await withBuild({receipts:{0:{groupPeakRssBytes:0,stderr:' 4096 maximum resident set size\n'}}},r=>{assert.equal(r.status,'PASS');assert.equal(r.peakRssBytes,4096);});
 await withBuild({receipts:{0:{stderr:' 1073741825 maximum resident set size\n'}}},(r,m)=>{assert.equal(r.firstFailure.code,'build-rss-cap');assert.equal(m.calls.length,1);});
});
test('build supervision SHA sealing failure retains work; successful seal precedes deletion',async()=>{
 await withBuild({save:(p,d)=>{if(p.endsWith('pre-cleanup-SHA256SUMS'))throw Error('seal-failed');return mockEvidenceSave(p,d);}},r=>{assert.equal(r.firstFailure.code,'seal-failed');assert(r.cleanupDeferred);});
 await withBuild({cleanup:p=>{assert(fs.existsSync(path.join(path.dirname(p),'evidence/pre-cleanup-SHA256SUMS')));fs.rmSync(p,{recursive:true});}},r=>assert.equal(r.status,'PASS'));
});
test('build supervision setup and cleanup reduce shared budget; cumulative disk remains charged',async()=>{
 await withBuild({save:(p,d,get,advance)=>{const r=mockEvidenceSave(p,d);if(p.endsWith('approved.json'))advance(1000);return r;}},(r,m)=>{assert.equal(r.status,'PASS');assert.equal(m.calls[0].seconds,179);assert.equal(r.elapsedMs,2000);});
 const m=buildMock();try{m.hooks.cleanup=p=>{m.advance(179000);fs.rmSync(p,{recursive:true});};const r=await m.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert(r.workAbsent);}finally{m.dispose();}
 await withBuild({disk:({calls})=>calls>=2?536870913:5000},(r,m)=>{assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-disk-cap');assert.equal(m.calls.length,2);assert.equal(r.peakDiskBytes,536870913);});
});
test('build supervision disk observation time is charged before next spawn and after final receipt',async()=>{
 const m=buildMock();let scans=0;try{
  m.hooks.disk=()=>{if(++scans===3)m.advance(180000);return 100;};const r=await m.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert.equal(m.calls.length,0);
 }finally{m.dispose();}
 const n=buildMock();try{
  n.hooks.disk=()=>{if(fs.existsSync(path.join(n.root,'evidence/result.json')))n.advance(180000);return 100;};
  const r=await n.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert(r.finalizationIncomplete);
 }finally{n.dispose();}
});
test('build supervision strict-greater common guard stops at shared cap; one byte cannot admit next step',async()=>{
 await withBuild({bytes:[2097151]},(r,m)=>{assert.equal(m.calls[0].outputCap+1,2097152);assert.equal(m.calls.length,1);assert.equal(r.firstFailure.code,'build-output-reserve');assert.equal(r.status,'FAIL');});
});

const mapBytes=Buffer.from([0,255,128,10,65]); // Raw bytes, not a UTF-8 rewrite.
const mapHash=crypto.createHash('sha256').update(mapBytes).digest('hex');
for(const [label,index,diagnostic] of [['link',7,'ld failed'],['duplicates',9,'isolated-duplicate-symbol'],['source',9,'isolated-overlay-source']])test('build map failed '+label+' preserves exact partial bytes before cleanup',async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,mapBytes),receipts:{[index]:{code:1,stderr:diagnostic}},cleanup:p=>{
  assert(fs.readFileSync(path.join(p,'link.map')).equals(mapBytes));
  assert(fs.readFileSync(path.join(path.dirname(p),'evidence/link.map')).equals(mapBytes));
  const before=JSON.parse(fs.readFileSync(path.join(path.dirname(p),'evidence/before-cleanup.json')));
  assert.equal(before.linkMap.status,'LINK_MAP_PRESERVED');assert.equal(before.linkMap.artifact.sha256,mapHash);
  assert(fs.existsSync(path.join(path.dirname(p),'evidence/pre-cleanup-SHA256SUMS')));fs.rmSync(p,{recursive:true});
 }},(r,m)=>{
  assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.stage,index===7?'link':'verify');assert.equal(r.firstFailure.code,'build-command-failed');
  assert.equal(m.calls.length,index+1);assert.equal(r.linkMap.linkVerified,false);assert(r.linkMap.validity.includes('NOT_VERIFIED'));
  assert.equal(r.linkMap.sourceSha256,mapHash);assert.equal(r.linkMap.artifact.bytes,5);assert(r.workAbsent);assert.equal(r.evidenceErrors.length,0);
  assert.equal(fs.statSync(path.join(m.root,'evidence/link.map')).mode&0o777,0o600);
  assert.equal(fs.readFileSync(path.join(m.root,'evidence',r.firstFailure.stage+'.stderr.txt'),'utf8'),diagnostic);
 });
});
test('build map successful link remains verified and absent failed link is distinct',async()=>{
 await withBuild({},r=>{assert.equal(r.status,'PASS');assert.equal(r.linkMap.status,'LINK_MAP_PRESERVED');assert.equal(r.linkMap.linkVerified,true);assert(r.workAbsent);});
 await withBuild({map:false,receipts:{7:{code:1}}},(r,m)=>{
  assert.equal(r.linkMap.status,'LINK_MAP_NOT_CREATED');assert.equal(r.firstFailure.stage,'link');assert.equal(m.calls.length,8);assert(r.workAbsent);
  assert(!fs.existsSync(path.join(m.root,'evidence/link.map')));
 });
 await withBuild({map:false},r=>{assert.equal(r.status,'FAIL');assert.equal(r.linkMap.status,'LINK_MAP_PRESERVATION_FAILED');assert.equal(r.linkMap.error,'build-map-missing');assert(r.cleanupDeferred);});
});
for(const kind of ['copy','sha','exclusive'])test('build map '+kind+' preservation failure keeps first error and work',async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,mapBytes),receipts:{7:{code:1,stderr:'first link error'}},save:(p,d)=>{
  if(p.endsWith('/link.map')){
   if(kind==='copy')throw Error('mock-map-write');
   if(kind==='exclusive')fs.writeFileSync(p,'previous-evidence');
   const saved=mockEvidenceSave(p,d);fs.writeFileSync(p,Buffer.alloc(d.length));return saved;
  }
  return mockEvidenceSave(p,d);
 }},(r,m)=>{
  assert.equal(r.firstFailure.stage,'link');assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(m.calls.length,8);
  assert.equal(r.linkMap.status,'LINK_MAP_PRESERVATION_FAILED');assert(r.evidenceErrors.some(e=>e.stage==='map-evidence'));assert(r.cleanupDeferred);
  assert(fs.readFileSync(path.join(m.root,'work/link.map')).equals(mapBytes));assert.equal(r.cleanupErrors.length,0);
  if(kind==='sha')assert.equal(r.linkMap.error,'build-map-evidence-readback');
  if(kind==='exclusive')assert.equal(fs.readFileSync(path.join(m.root,'evidence/link.map'),'utf8'),'previous-evidence');
 });
});
for(const size of [2097152,2097153])test('build map artifact byte cap '+size,async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(size),{mode:0o600}),receipts:{7:{code:1}}},(r,m)=>{
  assert.equal(r.firstFailure.stage,'link');assert.equal(r.linkMap.status,size===2097152?'LINK_MAP_PRESERVED':'LINK_MAP_CHUNKS_PRESERVED');
  assert.equal(r.workAbsent,true);if(size>2097152){assert.equal(r.linkMap.chunkCount,2);assert(!fs.existsSync(path.join(m.root,'evidence/link.map')));}
 });
});
for(const kind of ['external-symlink','dangling-symlink','directory','hardlink'])test('build map unsafe '+kind+' never read or deleted',async()=>{
 const outside=fs.mkdtempSync('/private/tmp/media-server-map-outside-mock-');const target=path.join(outside,'sentinel');fs.writeFileSync(target,'untouched');
 try{await withBuild({map:p=>{
  if(kind==='external-symlink')fs.symlinkSync(target,p);
  else if(kind==='dangling-symlink')fs.symlinkSync(path.join(outside,'absent'),p);
  else if(kind==='hardlink')fs.linkSync(target,p);
  else fs.mkdirSync(p);
 },receipts:{7:{code:1}}},(r,m)=>{
  assert.equal(r.linkMap.status,'LINK_MAP_UNSAFE_PATH');assert.equal(r.firstFailure.stage,'link');assert(r.cleanupDeferred);
  assert(!fs.existsSync(path.join(m.root,'evidence/link.map')));assert.equal(fs.readFileSync(target,'utf8'),'untouched');
 });}finally{fs.rmSync(outside,{recursive:true});}
});
test('build map unconfirmed group stops preservation without masking original link failure',async()=>{
 await withBuild({receipts:{7:{code:1,groupClean:false}}},(r,m)=>{
  assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(r.linkMap.status,'LINK_MAP_PRESERVATION_FAILED');
  assert.equal(r.linkMap.error,'build-map-group-unconfirmed');assert(r.cleanupErrors.some(e=>e.code==='build-group-remains'));
  assert(r.cleanupDeferred);assert(fs.existsSync(path.join(m.root,'work/link.map')));assert.equal(m.calls.length,8);
 });
});
test('build map copy workspace and time costs cannot bypass shared limits',async()=>{
 await withBuild({receipts:{7:{code:1}},disk:({calls})=>calls>=8?536870912:100},r=>{
  assert.equal(r.linkMap.error,'build-disk-cap');assert.equal(r.firstFailure.stage,'link');assert(r.cleanupDeferred);
 });
 await withBuild({save:(p,d,get,advance)=>{const v=mockEvidenceSave(p,d);if(p.endsWith('/link.map'))advance(180000);return v;}},r=>{
  assert.equal(r.status,'FAIL');assert.equal(r.linkMap.error,'build-deadline');assert(r.cleanupDeferred);
 });
});
test('build map source mutation during copy cannot authorize deletion',async()=>{
 await withBuild({receipts:{7:{code:1}},save:(p,d)=>{
  const r=mockEvidenceSave(p,d);if(p.endsWith('/link.map'))fs.writeFileSync(path.join(path.dirname(p),'../work/link.map'),'changed');return r;
 }},r=>{assert.equal(r.linkMap.error,'build-map-evidence-readback');assert(r.cleanupDeferred);assert.equal(r.firstFailure.stage,'link');});
});
test('build map preserved evidence survives cleanup failure independently',async()=>{
 await withBuild({receipts:{7:{code:1}},cleanup:()=>{throw Error('mock-cleanup');}},r=>{
  assert.equal(r.linkMap.status,'LINK_MAP_PRESERVED');assert.equal(r.firstFailure.stage,'link');assert.equal(r.cleanupErrors[0].code,'mock-cleanup');assert(!r.workAbsent);
 });
});
test('build map exhausted pre-link output reserve does not claim a link attempt',async()=>{
 await withBuild({bytes:[3,3,3,3,3,3,2097133]},(r,m)=>{
  assert.equal(m.calls.length,7);assert.equal(r.firstFailure.code,'build-output-reserve');assert.equal(r.linkMap.linkAttempted,false);
  assert.equal(r.linkMap.status,'LINK_MAP_NOT_CREATED');
 });
});
test('build map replaced evidence directory cannot redirect preservation or finalization',async()=>{
 const outside=fs.mkdtempSync('/private/tmp/media-server-map-destination-mock-');
 try{await withBuild({receipts:{7:{code:1}},save:(p,d)=>{
  const r=mockEvidenceSave(p,d);
  if(p.endsWith('/link.stderr.txt')){const e=path.dirname(p);fs.renameSync(e,e+'-original');fs.symlinkSync(outside,e);}
  return r;
 }},(r,m)=>{
  assert.equal(r.firstFailure.stage,'link');assert.equal(r.linkMap.status,'LINK_MAP_UNSAFE_PATH');assert(r.cleanupDeferred);
  assert(r.finalizationIncomplete);assert.deepEqual(fs.readdirSync(outside),[]);assert(fs.existsSync(path.join(m.root,'work/link.map')));
 });}finally{fs.rmSync(outside,{recursive:true});}
});

test('build plan full source manifest uses existing artifact cap and compact receipts',async()=>{
 const sourceSha256=Object.fromEntries(Array.from({length:1600},(_,i)=>['src/fixture-'+i+'.cpp','a'.repeat(64)]));
 await withBuild({sourceSha256},(r,m)=>{
  assert.equal(r.status,'PASS');const e=path.join(m.root,'evidence'),raw=fs.readFileSync(path.join(e,'source-sha256.json'));
  assert(raw.length>65536&&raw.length<2097152);assert.deepEqual(JSON.parse(raw),sourceSha256);
  const a=JSON.parse(fs.readFileSync(path.join(e,'approved.json')));assert.equal(a.sourceSha256,undefined);
  assert.equal(a.sourceManifest.bytes,raw.length);assert.equal(a.sourceManifest.sha256,crypto.createHash('sha256').update(raw).digest('hex'));
  assert(fs.statSync(path.join(e,'approved.json')).size<65536);assert(r.workAbsent);
 });
});
test('build plan manifest cap and first plan error stop before CMake',async()=>{
 await withBuild({sourceSha256:{x:'x'.repeat(2097152)}},(r,m)=>{assert.equal(r.firstFailure.code,'build-source-manifest-cap');assert.equal(m.calls.length,0);});
 await withBuild({receipts:{0:{code:1,stderr:'ValueError: isolated-source-manifest'}}},(r,m)=>{
  assert.equal(m.calls.length,1);assert.equal(r.firstFailure.stage,'plan');assert.equal(r.firstFailure.code,'build-command-failed');
  assert.equal(r.linkMap.linkAttempted,false);assert.equal(r.linkMap.status,'LINK_MAP_NOT_CREATED');assert(r.workAbsent);
  assert.equal(fs.readFileSync(path.join(m.root,'evidence/plan.stderr.txt'),'utf8'),'ValueError: isolated-source-manifest');
 });
});
test('build plan actual tracked input coverage, reference integrity and source rejection without compiler',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-plan-input-mock-');fs.chmodSync(root,0o700);
 const code=String.raw`
import sys,json,hashlib,subprocess
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal');import recording_accumulated_cost as m
root=Path(sys.argv[1]);w=root/'work';w.mkdir(mode=0o700);e=root/'evidence';e.mkdir(mode=0o700);b=w/'build'
git=m.subprocess.check_output
names=git(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=m.REPO).decode().split('\0')
required={n for n in names if n and (n.startswith(('src/','include/','scripts/internal/')) or n in ('CMakeLists.txt','VERSION'))}
required.update('build-gst-onnx/'+n for n in ['CMakeCache.txt','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt','libmedia_server_runtime.a','media_server'])
expected={n:m.sha(m.REPO/n) for n in sorted(required)}
a={'head':git(['git','rev-parse','HEAD'],cwd=m.REPO,text=True).strip(),'status':git(['git','status','--short'],cwd=m.REPO,text=True)}
def git_only(cmd,**kw):
 assert cmd[0]=='git',cmd
 return git(cmd,**kw)
mf=e/'source-sha256.json'
def bind(values):
 data=(json.dumps(values,indent=2)+'\n').encode();mf.write_bytes(data);mf.chmod(0o600)
 a['sourceManifest']={'path':mf.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 (e/'approved.json').write_text(json.dumps(a));return data
def reject(code):
 try:m.isolated_supervision_stage('plan',root);raise AssertionError('unexpected success')
 except ValueError as ex:assert str(ex)==code,(code,str(ex))
with patch.object(m.subprocess,'check_output',side_effect=git_only):
 # Independent required-list oracle reproduces the prior partial-manifest failure.
 (e/'approved.json').write_text(json.dumps({**a,'sourceSha256':{'VERSION':expected['VERSION']}}));reject('isolated-source-manifest')
 raw=bind(expected);assert len(raw)>65536 and len(raw)<=2097152
 m.isolated_supervision_stage('plan',root);plan=json.loads((e/'cmake-plan.json').read_text())
 assert plan['commands'][1]==['cmake','--build',str(b),'--target','media_server_runtime','media_server','--parallel','1']
 assert plan['limits']=={'sharedSeconds':180,'rssBytes':1073741824,'diskBytes':536870912,'outputBytes':2097152}
 # All rejection cases fail before another plan write or any compiler call.
 missing=dict(expected);missing.pop('src/main.cpp');bind(missing);reject('isolated-source-manifest')
 wrong=dict(expected);wrong['src/main.cpp']='0'*64;bind(wrong);reject('isolated-source-changed')
 bind(expected);mf.write_bytes(raw.replace(b'a',b'b',1));reject('isolated-source-manifest-sha')
 bind(expected);mf.write_bytes(b'x'*2097153);reject('isolated-source-manifest-cap')
 bind(expected);a['sourceManifest']['path']='../outside';(e/'approved.json').write_text(json.dumps(a));reject('isolated-source-reference')
 bind(expected);mf.unlink();mf.symlink_to(m.REPO/'VERSION');reject('isolated-source-reference');mf.unlink()
 bind(expected);assert m.isolated_source_sha(a,b)==expected
print('Full required source set',len(required),'manifest bytes',len(raw),'plan only; compiler/link/product calls 0')
`;
 try{const r=spawnSync('python3',['-B','-c',code,root],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}
 finally{fs.rmSync(root,{recursive:true});}
});

import {preserveLargeLinkMap,verifyLinkMapChunks,linkMapChunkCapacity} from './recording_accumulated_cost.mjs';
const chunkHash=b=>crypto.createHash('sha256').update(b).digest('hex');
function chunkFixture(fn,size=4000001){
 const root=fs.mkdtempSync('/private/tmp/media-server-linkmap-chunk-mock-');fs.chmodSync(root,0o700);
 const source=path.join(root,'link.map'),evidence=path.join(root,'evidence');fs.mkdirSync(evidence,{mode:0o700});
 const data=Buffer.alloc(size,0xa5);data[0]=0;data[size-1]=0xff;fs.writeFileSync(source,data,{mode:0o600});
 const args={source,evidence,binding:{buildRoot:root,resultId:'original-failed-result',head:'approved'},expectedSha256:chunkHash(data),check:()=>{},usedBytes:()=>size};
 try{return fn(args,data);}finally{fs.rmSync(root,{recursive:true});}
}
test('map chunks boundary and last bytes preserve raw whole stream',()=>chunkFixture((a,data)=>{
 const r=preserveLargeLinkMap(a),m=JSON.parse(fs.readFileSync(path.join(a.evidence,r.artifact.path)));
 assert.deepEqual(m.chunks.map(c=>c.bytes),[2000000,2000000,1]);assert.equal(r.sourceSha256,chunkHash(data));
 assert.equal(verifyLinkMapChunks(a.evidence,m).sha256,chunkHash(data));
 assert.deepEqual(fs.readFileSync(a.source),data);assert.equal(fs.statSync(path.join(a.evidence,m.chunks[0].path)).mode&0o777,0o600);
}));
test('map chunks exact multiple has no empty trailing chunk',()=>chunkFixture(a=>{
 const r=preserveLargeLinkMap(a),m=JSON.parse(fs.readFileSync(path.join(a.evidence,r.artifact.path)));assert.deepEqual(m.chunks.map(c=>c.bytes),[2000000,2000000]);
},4000000));
for(const kind of ['order','missing','contents','whole-sha','count'])test('map chunks reject '+kind,()=>chunkFixture(a=>{
 const r=preserveLargeLinkMap(a),m=JSON.parse(fs.readFileSync(path.join(a.evidence,r.artifact.path)));
 if(kind==='order')m.chunks.reverse();if(kind==='missing')fs.unlinkSync(path.join(a.evidence,m.chunks[1].path));
 if(kind==='contents')fs.writeFileSync(path.join(a.evidence,m.chunks[0].path),Buffer.alloc(m.chunks[0].bytes));
 if(kind==='whole-sha')m.sourceSha256='0'.repeat(64);if(kind==='count')m.chunkCount++;
 assert.throws(()=>verifyLinkMapChunks(a.evidence,m));assert(fs.existsSync(a.source));
}));
test('map chunks source SHA mismatch refuses all writes',()=>chunkFixture(a=>{
 assert.throws(()=>preserveLargeLinkMap({...a,expectedSha256:'0'.repeat(64)}),/LINK_MAP_SOURCE_SHA/);assert.deepEqual(fs.readdirSync(a.evidence),[]);
}));
for(const [existing,ok] of [[55,true],[56,false]])test('map chunks combined item limit '+existing,()=>{
 const a={bytes:4000001,existing,reserved:5,external:0,used:0,manifestBytes:100};
 if(ok)assert.equal(linkMapChunkCapacity(a).items,64);else assert.throws(()=>linkMapChunkCapacity(a),/LINK_MAP_ITEM_CAP/);
});
for(const [manifestBytes,ok] of [[65536,true],[65537,false]])test('map chunks receipt cap '+manifestBytes,()=>{
 const a={bytes:4000001,existing:0,used:0,manifestBytes};if(ok)assert(linkMapChunkCapacity(a));else assert.throws(()=>linkMapChunkCapacity(a),/LINK_MAP_MANIFEST_CAP/);
});
test('map chunks disk duplication and metadata reserve before writes',()=>chunkFixture(a=>{
 assert.throws(()=>preserveLargeLinkMap({...a,usedBytes:()=>536870912-4000001}),/LINK_MAP_DISK_CAP/);assert.deepEqual(fs.readdirSync(a.evidence),[]);
}));
test('map chunks oversized binding receipt fails before writes',()=>chunkFixture(a=>{
 assert.throws(()=>preserveLargeLinkMap({...a,binding:{large:'x'.repeat(65536)}}),/LINK_MAP_MANIFEST_CAP/);assert.deepEqual(fs.readdirSync(a.evidence),[]);
}));
for(const kind of ['partial-write','manifest-write','manifest-corrupt','source-change','chunk-corrupt'])test('map chunks '+kind+' leaves original and incomplete evidence',()=>chunkFixture(a=>{
 let written=0;const save=(p,d)=>{
  if(kind==='partial-write'&&++written===2){fs.writeFileSync(p,d.subarray(0,10),{flag:'wx',mode:0o600});throw Error('mock-partial-write');}
  if(kind==='manifest-write'&&p.endsWith('.json'))throw Error('mock-manifest-write');
  const r=mockEvidenceSave(p,d);
  if(kind==='manifest-corrupt'&&p.endsWith('.json'))fs.writeFileSync(p,'{}');
  if(kind==='source-change'&&p.endsWith('001'))fs.writeFileSync(a.source,Buffer.alloc(4000001,1));
  if(kind==='chunk-corrupt'&&p.endsWith('001'))fs.writeFileSync(p,Buffer.alloc(d.length));
  return r;
 };
 assert.throws(()=>preserveLargeLinkMap({...a,save}));assert(fs.existsSync(a.source));
}));
for(const index of [7,9])test('map chunks adapter preserves initial link/source failure '+index,async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600}),receipts:{[index]:{code:1,stderr:'original failure'}}},(r,m)=>{
  assert.equal(r.firstFailure.stage,index===7?'link':'verify');assert.equal(r.linkMap.status,'LINK_MAP_CHUNKS_PRESERVED');assert.equal(r.linkMap.linkVerified,false);assert(r.workAbsent);
  assert.equal(m.calls.length,index+1);assert.equal(r.evidenceErrors.length,0);
 });
});
test('map chunks adapter success uses same source verification and final cleanup',async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600})},(r,m)=>{
  assert.equal(r.status,'PASS');assert.equal(m.calls.length,10);assert(r.linkMap.linkVerified);assert(r.workAbsent);assert(fs.readdirSync(path.join(m.root,'evidence')).length<=64);
 });
});
test('map chunks adapter partial save preserves first error and defers cleanup',async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600}),receipts:{7:{code:1}},save:(p,d)=>{
  if(p.endsWith('002'))throw Error('mock-chunk-save');return mockEvidenceSave(p,d);
 }},(r,m)=>{assert.equal(r.firstFailure.stage,'link');assert(r.cleanupDeferred);assert(!r.workAbsent);assert.equal(r.linkMap.status,'LINK_MAP_PRESERVATION_FAILED');assert(fs.existsSync(path.join(m.root,'work/link.map')));});
});
test('map chunks adapter deadline and workspace failures retain original',async()=>{
 for(const kind of ['deadline','disk'])await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600}),
  save:(p,d,get,advance)=>{const r=mockEvidenceSave(p,d);if(kind==='deadline'&&p.endsWith('001'))advance(180000);return r;},
  ...(kind==='disk'?{disk:({calls})=>calls>=10?536000000:0}:{})},r=>{assert.equal(r.status,'FAIL');assert(r.cleanupDeferred);assert(!r.workAbsent);});
});
test('map chunks source replacement during manifest save blocks completion',()=>chunkFixture(a=>{
 assert.throws(()=>preserveLargeLinkMap({...a,save:(p,d)=>{const r=mockEvidenceSave(p,d);if(p.endsWith('.json'))fs.writeFileSync(a.source,Buffer.alloc(4000001));return r;}}),/LINK_MAP_SOURCE_SHA/);
}));
test('map chunks verified link requires expected original map SHA',async()=>{
 const m=buildMock({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600})});
 const prior=m.hooks.runBounded;m.hooks.runBounded=async o=>{const r=await prior(o);if(m.calls.length===10)fs.writeFileSync(path.join(m.root,'evidence/link-binding.json'),JSON.stringify({uniqueSymbols:true}));return r;};
 try{const r=await m.run();assert.equal(r.linkMap.error,'build-map-binding-missing');assert(r.cleanupDeferred);}finally{m.dispose();}
});
for(const kind of ['symlink','hardlink','destination'])test('map chunks unsafe '+kind+' rejects external target',()=>chunkFixture(a=>{
 const target=path.join(path.dirname(a.source),'other');
 if(kind==='destination'){fs.renameSync(a.evidence,target);fs.symlinkSync(target,a.evidence);}
 else{fs.renameSync(a.source,target);if(kind==='symlink')fs.symlinkSync(target,a.source);else fs.linkSync(target,a.source);}
 assert.throws(()=>preserveLargeLinkMap(a),/LINK_MAP_UNSAFE_PATH/);
}));

// Limited Helper-only: all child operations are injected receipts; never compile/run helpers.
function helperBindingMock(options={}){
 const root=fs.mkdtempSync('/private/tmp/media-server-helper-binding-mock-');fs.chmodSync(root,0o700);
 let tick=0;const calls=[],e=path.join(root,'evidence'),w=path.join(root,'work'),a=path.join(root,'artifacts');
 const names=['normalize','process-metrics','review-seed'],h={compiler:'/mock/c++',node:'/mock/node',pkgConfig:'/mock/pkg-config',referenceBuild:'/private/tmp/media-server-reference/work/build'};
 const write=(n,v)=>fs.writeFileSync(path.join(e,n),JSON.stringify(v));
 const approved={head:'45b19bd88cd2ea9c7be48a25329580e562c2a3ee',status:'mock',sourceSha256:{},helperBuild:h};
 const hooks={now:()=>tick,runBounded:async o=>{
  const i=calls.length;calls.push(o);tick+=options.times?.[i]??100;const c=o.args.slice(4);
  if(c.includes('--limited-build-stage')){
   const stage=c.at(-2);
   if(stage==='helper-inputs')write('helper-inputs.json',{flagsCommand:[h.pkgConfig,'--cflags','gstreamer-app-1.0','openssl','sqlite3']});
   if(stage==='helper-plan')write('helper-plan.json',{names,archive:path.join(h.referenceBuild,'libmedia_server_runtime.a'),instrument:[h.node,'mock-instrument'],commands:names.map(n=>[h.compiler,'mock-source','-o',path.join(w,'helpers',n)])});
   if(stage==='helper-verify'){
    fs.mkdirSync(a,{mode:0o700});const files={};
    for(const n of [...names,'catalog-instrumented.cpp']){const b=Buffer.from(n);fs.writeFileSync(path.join(a,n),b,{mode:0o600});files[n]={bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};}
    if(options.corrupt)fs.writeFileSync(path.join(a,'normalize'),'bad');
    write('helper-artifacts.json',{root:a,files});
   }
  }
  return {code:0,signal:null,stdout:'ok',stderr:'',stopReason:null,groupClean:true,groupId:5000+i,groupPeakRssBytes:1000,
   observationFailure:null,outputBytes:2,elapsedMs:100,...options.receipts?.[i]};
 }};
 if(options.disk)hooks.disk=()=>options.disk(calls.length);
 if(options.cleanup)hooks.cleanup=options.cleanup;
 if(options.save)hooks.save=options.save;
 return {root,calls,run:()=>runLimitedIsolatedBuild({root,approved,python:'/mock/python',env:{PATH:'/mock'},budgetStarted:options.budgetStarted},hooks),dispose:()=>fs.rmSync(root,{recursive:true})};
}
async function withHelperBinding(options,fn){const m=helperBindingMock(options);try{await fn(await m.run(),m);}finally{m.dispose();}}
test('helper binding eight supervised stages; three compilers only; artifacts survive work cleanup',async()=>withHelperBinding({},(r,m)=>{
 assert.equal(r.status,'PASS');assert.equal(m.calls.length,8);assert.equal(r.scope,'LIMITED_HELPER_BUILD_ONLY');assert.equal(r.linkMap,undefined);
 assert(r.workAbsent&&r.helperArtifacts.retained);assert(fs.existsSync(path.join(m.root,'artifacts/normalize')));
 assert.equal(m.calls.filter(c=>c.args.includes('/mock/c++')).length,3);assert(!JSON.stringify(m.calls).includes('cmake'));
 for(let i=0;i<8;i++){assert.equal(m.calls[i].seconds,180-i*.1);assert.equal(m.calls[i].outputCap,2097151-i*2);assert.equal(m.calls[i].rssCap,1073741824);assert.equal(m.calls[i].diskCap,536870912);}
}));
for(const [name,options,expected] of [
 ['first-helper-error',{receipts:{4:{code:1,stderr:'first compiler diagnostic'}}},'build-command-failed'],
 ['source-mismatch',{receipts:{0:{code:1,stderr:'helper-source-sha'}}},'build-command-failed'],
 ['dependency-failure',{receipts:{7:{code:1,stderr:'helper-dynamic-dependency'}}},'build-command-failed'],
 ['shared-time',{times:{4:180000}},'build-deadline'],
 ['preflight-budget',{budgetStarted:-180000},'build-deadline'],
 ['cumulative-output',{receipts:{3:{outputBytes:2097150}}},'build-output-cap'],
 ['rss',{receipts:{4:{groupPeakRssBytes:1073741825}}},'build-rss-cap'],
 ['disk',{disk:n=>n>=5?536870913:0},'build-disk-cap'],
 ['collection',{receipts:{4:{observationFailure:'unavailable'}}},'build-resource-observation'],
 ['artifact-sha',{corrupt:true},'helper-artifact-sha'],
 ['cleanup',{cleanup:()=>{throw Error('owned cleanup failure');}},'build-cleanup'],
 ['evidence',{save:(p,d)=>{if(p.endsWith('helper-normalize.stderr.txt'))throw Error('evidence failure');return mockEvidenceSave(p,d);}},'build-output-evidence'],
 ['first-plus-cleanup',{receipts:{4:{code:1}},cleanup:()=>{throw Error('cleanup');}},'build-command-failed'],
])test('helper binding fail closed '+name,async()=>withHelperBinding(options,(r,m)=>{
 assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,expected);
 if(name==='first-helper-error'||name==='first-plus-cleanup')assert.equal(m.calls.length,5);
 if(name==='source-mismatch')assert.equal(m.calls.length,1);
 assert.equal(r.productExecution,'NOT_TESTED');
}));
const helperBindingPython=String.raw`
import sys,json,struct,hashlib,os
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal');import recording_accumulated_cost as m
root=Path(sys.argv[1]);mode=sys.argv[2]
def put(p,data):
 p.parent.mkdir(parents=True,exist_ok=True,mode=0o700);p.write_bytes(data);p.chmod(0o600);return m.sha(p)
def macho(name='/usr/lib/libSystem.B.dylib'):
 raw=name.encode()+b'\0';n=(24+len(raw)+7)//8*8
 return struct.pack('<8I',0xfeedfacf,0x100000c,0,2,1,n,0,0)+struct.pack('<6I',0xc,n,24,0,0,0)+raw+b'\0'*(n-24-len(raw))
if mode=='plan':
 b=root/'reference/build';b.mkdir(parents=True,mode=0o700);work=root/'work';work.mkdir(mode=0o700)
 original=(m.SCRIPTS/'verify_v450_recording_a_mixed.sh').read_text()
 put(b/'CMakeFiles/media_server.dir/link.txt',b'/usr/bin/c++ -o media_server libmedia_server_runtime.a /fixture/libone.dylib -pthread\n')
 with patch.object(m,'helper_inputs',return_value=({'compiler':'/usr/bin/c++','node':'/mock/node'},b)):
  plan=m.helper_plan(work,{'sourceManifest':{}},['-I/fixture/gst','-DFIXTURE=1'])
 assert len(plan['commands'])==3 and plan['runtimeConsumers']==['normalize','review-seed']
 c=plan['commands'];assert c[1]==['/usr/bin/c++','-std=c++17',str(m.SCRIPTS/'recording_process_metrics.cpp'),'-o',str(work/'helpers/process-metrics')]
 for i in (0,2):
  for flag in ['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-DMEDIA_SERVER_USE_GSTREAMER=1','-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1','-DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1']:assert flag in c[i] and flag in original
  assert c[i][-5:]==[str(b/'libmedia_server_runtime.a'),'/fixture/libone.dylib','-pthread','-o',str(work/'helpers'/m.HELPER_NAMES[i])]
 assert plan['instrumentSource']==original.split("<<'NODE'\n",1)[1].split('\nNODE\n',1)[0]
 assert not any('cmake' in v or v.endswith('/media_server') for c in c for v in c)
elif mode in ('stage-verify','stage-missing','stage-format'):
 work=root/'work';work.mkdir(mode=0o700);out=work/'helpers';out.mkdir(mode=0o700);e=root/'evidence';e.mkdir(mode=0o700)
 for n in m.HELPER_FILES:put(out/n,macho() if n in m.HELPER_NAMES else b'instrumented')
 put(e/'helper-plan.json',b'{"commands":[1,2,3]}')
 if mode=='stage-missing':(out/'review-seed').unlink()
 if mode=='stage-format':put(out/'normalize',b'wrong')
 def save(n,v):put(e/n,json.dumps(v).encode())
 with patch.object(m,'helper_inputs',return_value=({'inputs':{},'tools':{}},root)):
  if mode=='stage-verify':
   m.helper_stage('helper-verify',root,{'head':'mock','sourceManifest':{}},save)
   r=json.loads((e/'helper-artifacts.json').read_text());assert not out.exists() and set(r['files'])==set(m.HELPER_FILES)
   assert r['actualHelpersExecuted']==0 and r['planSha256']==m.sha(e/'helper-plan.json')
   for n,v in r['files'].items():assert m.sha(root/'artifacts'/n)==v['sha256']
  else:
   try:m.helper_stage('helper-verify',root,{'head':'mock','sourceManifest':{}},save)
   except ValueError:pass
   else:raise AssertionError('bad output accepted')
   assert out.exists() and not (root/'artifacts').exists()
elif mode=='wrapper':
 normal=root/'normal';limited=root/'limited';m.generate(normal,mandatory_ledger=True);m.generate(limited,mandatory_ledger=True,limited_search=True)
 n=(normal/'wrapper.sh').read_text();s=(limited/'wrapper.sh').read_text()
 assert '--install-limited-helpers' not in n and 'recording_process_metrics.cpp' in n
 branch=s.split('if [[ "$*" == --limited-search-diagnostic ]]; then')[-1].split('else\n')[0]
 assert '--install-limited-helpers' in branch and 'MANIFEST_SHA:?' in branch
 assert 'c++' not in branch and 'pkg-config' not in branch and 'recording_current_observer_native.cpp' not in branch
 assert 'assertLimitedSearchCapacity();' in s and 'assertSearchPerformanceCapacity();' in s
 assert s.index('--install-limited-helpers')<s.index('export MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN=')
else:
 package=root;root=package/'build';root.mkdir(mode=0o700)
 e=root/'evidence';e.mkdir(mode=0o700);a=root/'artifacts';a.mkdir(mode=0o700);d=root/'destination';d.mkdir(mode=0o700)
 source=root/'source';put(source,b'approved');source_name=str(source.relative_to(root))
 manifest={'version':1,'root':str(a),'files':{},'inputs':{}}
 for n in m.HELPER_FILES:
  p=a/n;put(p,macho() if n in m.HELPER_NAMES else b'instrumented');p.chmod(0o700 if n in m.HELPER_NAMES else 0o600)
  manifest['files'][n]={'bytes':p.stat().st_size,'sha256':m.sha(p),'mode':oct(p.stat().st_mode&0o777),**(m.helper_macho(p) if n in m.HELPER_NAMES else {})}
 raw=json.dumps({source_name:m.sha(source)}).encode();h=put(e/'source-sha256.json',raw);manifest['sourceManifest']={'path':'source-sha256.json','sha256':h}
 if mode=='dependency':
  p=a/'normalize';put(p,macho('/nonexistent/libbad.dylib'));p.chmod(0o700);manifest['files']['normalize'].update(bytes=p.stat().st_size,sha256=m.sha(p))
 if mode=='format':
  put(a/'normalize',b'not executable');(a/'normalize').chmod(0o700);manifest['files']['normalize'].update(bytes=14,sha256=m.sha(a/'normalize'))
 if mode=='missing':(a/'review-seed').unlink()
 if mode=='sha':put(a/'normalize',b'changed')
 if mode=='source':put(source,b'changed')
 if mode=='symlink':(a/'normalize').unlink();(a/'normalize').symlink_to(source)
 if mode=='hardlink':(a/'normalize').unlink();os.link(source,a/'normalize')
 expected=put(e/'helper-artifacts.json',json.dumps(manifest).encode())
 terminal=package/'evidence/result.json';terminal_sha=put(terminal,b'{"status":"LIMITED_HELPER_BUILD_PASS"}')
 put(e/'helper-handoff.json',json.dumps({'status':'HELPER_BUILD_ACTUAL_PASS','manifestSha256':expected,'terminalResult':str(terminal),'terminalResultSha256':terminal_sha}).encode())
 put(e/'result.json',json.dumps({'status':'FAIL' if mode=='failed-build' else 'PASS','helperArtifacts':{'sha256':expected}}).encode())
 if mode=='finalization':put(e/'finalization-failure.json',b'{}')
 if mode=='handoff':(e/'helper-handoff.json').unlink()
 if mode=='terminal-failure':put(package/'finalization-failure.json',b'{}')
 if mode=='manifest':expected='0'*64
 with patch.object(m,'REPO',root):
  if mode=='normal':
   m.install_limited_helpers(e/'helper-artifacts.json',expected,d)
   assert set(p.name for p in d.iterdir())==set(m.HELPER_FILES)
   for n in m.HELPER_FILES:assert m.sha(d/n)==m.sha(a/n)
  else:
   try:m.install_limited_helpers(e/'helper-artifacts.json',expected,d)
   except (ValueError,OSError,KeyError):pass
   else:raise AssertionError('invalid helper accepted: '+mode)
   assert not list(d.iterdir())
print('helper binding '+mode+' PASS')
`;
for(const mode of ['plan','stage-verify','stage-missing','stage-format','wrapper','normal','missing','format','sha','source','dependency','symlink','hardlink','manifest','failed-build','finalization','handoff','terminal-failure'])test('helper binding Python '+mode,()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-helper-python-mock-');fs.chmodSync(root,0o700);
 try{const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',helperBindingPython,root,mode],{encoding:'utf8',timeout:15000,maxBuffer:65536});assert.equal(r.status,0,r.stderr+r.stdout);}
 finally{fs.rmSync(root,{recursive:true});}
});
test('helper binding leaves official capacity and runtime limits unchanged',()=>{
 assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);
 const s=fs.readFileSync('scripts/internal/run_v450_recording_a_mixed.py','utf8');assert(s.includes('run_owned(command, log_path, 240'));assert(s.includes('hardDeadlineSeconds=300'));
});

import {limitedHelperPackageSnapshot,verifyLimitedHelperExternalInputs} from './recording_accumulated_cost.mjs';
test('helper evidence snapshots normal and first/middle/last null are distinct from zero or capacity excess',()=>{
 for(const at of [-1,0,1,2]){
  const values=[100,200,300];if(at>=0)values[at]=null;
  const snapshots=values.map((bytes,i)=>limitedHelperPackageSnapshot({treeBytes:()=>bytes},'/mock',i*100));
  assert.equal(snapshots.filter(s=>s.complete).length,at<0?3:2);
  if(at>=0){assert.equal(snapshots[at].bytes,null);assert.equal(snapshots[at].errors[0].code,'HELPER_PACKAGE_DISK_UNOBSERVED');}
 }
 const missing=limitedHelperPackageSnapshot(null,'/mock',0);assert.equal(missing.bytes,null);assert.equal(missing.errors[0].detail,'observer-not-initialized');
 const thrown=limitedHelperPackageSnapshot({treeBytes:()=>{throw Error('EIO');}},'/mock',1);assert.equal(thrown.errors[0].detail,'EIO');
 assert.equal(limitedHelperPackageSnapshot({treeBytes:()=>536870913},'/mock',1).errors[0].code,'HELPER_PACKAGE_DISK_CAP');
 assert.equal(limitedHelperPackageSnapshot({treeBytes:()=>100},'/mock',180000).errors[0].code,'HELPER_PACKAGE_DEADLINE');
});
for(const point of ['first','middle','last'])test('helper evidence adapter '+point+' null disk fails closed',async()=>{
 let m;m=helperBindingMock({disk:n=>point==='first'?null:point==='middle'&&n>=5?null:point==='last'&&fs.existsSync(path.join(m.root,'evidence/result.json'))?null:0});
 try{
  const r=await m.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-disk-observation');
  if(point==='first')assert.equal(m.calls.length,0);
  if(point==='middle')assert.equal(m.calls.length,5);
  if(point==='last'){assert(r.finalizationIncomplete);assert(r.helperArtifacts.retained);assert(fs.existsSync(path.join(m.root,'artifacts/normalize')));}
 }finally{m.dispose();}
});
test('helper evidence disk observation then evidence failure keeps original',async()=>withHelperBinding({disk:()=>null,save:(p,d)=>{if(p.endsWith('before-cleanup.json'))throw Error('evidence-write');return mockEvidenceSave(p,d);}},r=>{
 assert.equal(r.firstFailure.code,'build-disk-observation');assert(r.evidenceErrors.some(e=>e.code==='evidence-write'));
}));
test('helper evidence first compiler failure plus cleanup failure stays separate',async()=>withHelperBinding({receipts:{4:{code:1,stderr:'original compile error'}},cleanup:()=>{throw Error('cleanup-error');}},(r,m)=>{
 assert.equal(m.calls.length,5);assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(r.cleanupErrors.length,1);
}));
test('helper evidence artifact SHA mismatch and partial three-helper receipt never qualify',async()=>{
 await withHelperBinding({corrupt:true},r=>{assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'helper-artifact-sha');assert(!r.helperArtifacts);});
 await withHelperBinding({receipts:{7:{code:1,stderr:'missing review-seed'}}},r=>{assert.equal(r.status,'FAIL');assert(!r.helperArtifacts);});
});
test('helper evidence successful artifact stays retained after work cleanup',async()=>withHelperBinding({},(r,m)=>{
 assert.equal(r.status,'PASS');assert(r.helperArtifacts.retained&&r.workAbsent);assert(fs.existsSync(path.join(m.root,'artifacts/review-seed')));
}));
test('helper evidence external symlink input requires approved resolution and exact bytes',()=>{
 const r=fs.mkdtempSync('/private/tmp/media-server-helper-input-mock-');fs.chmodSync(r,0o700);
 try{
  const file=path.join(r,'libz.1.tbd'),alias=path.join(r,'libz.tbd');fs.writeFileSync(file,'approved sdk');fs.symlinkSync('libz.1.tbd',alias);
  const h=crypto.createHash('sha256').update('approved sdk').digest('hex');
  assert.equal(verifyLimitedHelperExternalInputs({[alias]:h},{[alias]:file}).matched,1);
  assert.throws(()=>verifyLimitedHelperExternalInputs({[alias]:h},{}),/input-set/);
  assert.throws(()=>verifyLimitedHelperExternalInputs({[alias]:h},{[alias]:alias}),/input-path/);
  fs.writeFileSync(file,'changed');assert.throws(()=>verifyLimitedHelperExternalInputs({[alias]:h},{[alias]:file}),/input-sha/);
  fs.writeFileSync(path.join(r,'other'),'approved sdk');fs.unlinkSync(alias);fs.symlinkSync('other',alias);
  assert.throws(()=>verifyLimitedHelperExternalInputs({[alias]:h},{[alias]:file}),/input-path/);
 }finally{fs.rmSync(r,{recursive:true});}
});
// Exercise the actual prepared runner's finally block with only injected reads/writes;
// no runner invocation, child process, compiler, or native executable.
const evidenceRunner=process.env.MEDIA_SERVER_HELPER_EVIDENCE_RUNNER;
for(const kind of ['early','write-failure','last-null','success','artifact','cleanup'])test('helper evidence prepared finalization '+kind,{skip:!evidenceRunner},async()=>{
 const text=fs.readFileSync(evidenceRunner,'utf8');
 const observe=text.slice(text.indexOf('function observePackage('),text.indexOf('function fail('));
 const tail=text.slice(text.indexOf('\nfinally{')+9,-2);
 const files=new Map(),failures=[],mockProcess={exitCode:null};let calls=0;
 const helperEvidence={limitedHelperPackageSnapshot};
 const guard=kind==='early'||kind==='write-failure'?null:{treeBytes:()=>kind==='last-null'&&++calls>=2?null:1000,processGroup:()=>({pids:[]})};
 const build=kind==='early'||kind==='write-failure'?null:{status:kind==='cleanup'?'FAIL':'PASS',steps:[],helperArtifacts:{sha256:'a'.repeat(64)},cleanupErrors:kind==='cleanup'?['cleanup-error']:[]};
 const bindings={fs:{existsSync:()=>false,readdirSync:()=>[...files.keys()]},path,performance:{now:()=>100},started:0,root:'/mock/package',helperEvidence,guard,
  writer:{outputDir:'/mock/package/evidence'},prepared:{limits:{disk:536870912},head:'mock'},buildRoot:build?'/mock/package/build':null,build,invocations:build?1:0,
  firstFailure:build?null:{stage:'package-preflight',code:'ELOOP'},stage:'test',postflightErrors:[],evidenceErrors:[],observations:[],packageSnapshots:[],sourcePostflight:'NOT_COMPLETED',groupsAbsent:null,adapterEvidence:null,
  buildStarted:null,buildFinished:null,verifyPackage:()=>{},verifySource:()=>{if(!build)throw Error('original preflight');},
  verifyAdapterEvidence:()=>{if(kind==='artifact')throw Error('HELPER_FILE_SHA');return {verified:true};},readOnly:()=>'',owned:()=>{},hashFile:()=> 'b'.repeat(64),
  write:(name,data)=>{if(kind==='write-failure'&&name==='result.json')throw Error('WRITE_FAILED');files.set(name,data);},
  exclusive:(p,data)=>{files.set(path.basename(p),data);},need:(v,c)=>{if(!v)throw Error(c);},now:()=> 'mock-time',
  process:mockProcess,console:{log:()=>{},error:(...v)=>failures.push(v)}};
 // fail closes over the same firstFailure variable as the original block.
 const code=observe+"\nfunction fail(e){firstFailure??={stage,code:e.message};}\n"+tail+'\nreturn {firstFailure,postflightErrors,packageSnapshots};';
 const result=await new (Object.getPrototypeOf(async function(){}).constructor)(...Object.keys(bindings),code)(...Object.values(bindings));
 if(kind==='early'||kind==='write-failure')assert.equal(result.firstFailure.code,'ELOOP');
 if(kind==='early'){assert.equal(mockProcess.exitCode,1);assert(files.has('result.json'));assert(!files.has('finalization-failure.json'));assert(files.get('result.json').packageSnapshots.every(s=>s.bytes===null));}
 if(kind==='write-failure'){assert.equal(files.get('finalization-failure.json').error,'WRITE_FAILED');assert.equal(files.get('finalization-failure.json').firstFailure.code,'ELOOP');}
 if(kind==='last-null'){assert.equal(mockProcess.exitCode,1);assert.equal(files.get('finalization-failure.json').error,'HELPER_PACKAGE_DISK_UNOBSERVED');}
 if(kind==='success'){assert.equal(mockProcess.exitCode,0);assert(files.has('helper-handoff.json'));}
 if(kind==='artifact'){assert.equal(mockProcess.exitCode,1);assert(!files.has('helper-handoff.json'));assert.equal(result.firstFailure.code,'HELPER_FILE_SHA');}
 if(kind==='cleanup'){assert.deepEqual(files.get('result.json').cleanup.errors,['cleanup-error']);assert.equal(mockProcess.exitCode,1);assert(!files.has('helper-handoff.json'));}
 assert(!JSON.stringify([...files.values()]).includes("reading 'treeBytes'"));
});
test('helper evidence fixed budget and ordinary capacity guards remain unchanged',()=>{
 assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);
 const src=fs.readFileSync('scripts/internal/recording_accumulated_cost.mjs','utf8');assert(src.includes('buildLimits.output-result.outputBytes'));assert(src.includes('rssCap:buildLimits.rss,diskCap:buildLimits.disk'));
});

// One-shot recovery package tests: no compiler, native Helper, or runner invocation.
const recoveryPackage=process.env.MEDIA_SERVER_HELPER_RECOVERY_PACKAGE;
const recoveryCheck=recoveryPackage?await import('file://'+path.join(recoveryPackage,'artifact-check.mjs')):null;
const recoveryTest=(name,fn)=>test('helper postflight '+name,{skip:!recoveryPackage},fn);
function withRecoveryFile(fn){
 const root=fs.mkdtempSync('/private/tmp/media-server-helper-postflight-mock-');fs.chmodSync(root,0o700);
 const name='normalize',file=path.join(root,name),data=Buffer.from('synthetic helper bytes; never executable');
 fs.writeFileSync(file,data,{mode:0o700});fs.chmodSync(file,0o700);
 const entry={mode:'0o700',uid:process.getuid(),links:1,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};
 try{return fn({root,name,file,entry});}finally{fs.rmSync(root,{recursive:true});}
}
recoveryTest('Python oct receipt reproduces original parseInt rejection and verifies corrected regular file',()=>withRecoveryFile(({root,name,entry})=>{
 assert.equal(parseInt(entry.mode,8),0);assert.equal(recoveryCheck.artifactMode(name,entry),448);
 assert.equal(recoveryCheck.verifyArtifact(root,name,entry).sha256,entry.sha256);
}));
for(const mode of ['700','0o600','0o700junk','0o777','0o4700',700])recoveryTest('reject mode '+mode,()=>withRecoveryFile(({root,name,entry})=>{
 assert.throws(()=>recoveryCheck.verifyArtifact(root,name,{...entry,mode}),/MODE_CONTRACT/);
}));
for(const kind of ['symlink','hardlink','execute-missing','owner','sha','size'])recoveryTest('file safety '+kind,()=>withRecoveryFile(({root,name,file,entry})=>{
 if(kind==='symlink'){fs.renameSync(file,path.join(root,'other'));fs.symlinkSync('other',file);}
 if(kind==='hardlink')fs.linkSync(file,path.join(root,'other'));
 if(kind==='execute-missing')fs.chmodSync(file,0o600);
 if(kind==='owner'){
  const st=fs.lstatSync(file),wrong={...st,uid:st.uid+1,isFile:()=>true,isSymbolicLink:()=>false};
  assert.throws(()=>recoveryCheck.checkAttributes(wrong,name,entry),/FILE_UNSAFE/);return;
 }
 if(kind==='sha')entry.sha256='0'.repeat(64);
 if(kind==='size')entry.bytes++;
 assert.throws(()=>recoveryCheck.verifyArtifact(root,name,entry),/FILE_UNSAFE|FILE_SHA|FILE_SIZE/);
}));
function completeRecoveryBuild(){
 return {status:'PASS',firstFailure:null,errors:[],cleanupErrors:[],evidenceErrors:[],workAbsent:true,
  limits:{seconds:180,rssBytes:1073741824,diskBytes:536870912,outputBytes:2097152},elapsedMs:8000,peakRssBytes:500000000,peakDiskBytes:35000000,outputBytes:7000,storedOutputBytes:7000,
  steps:['helper-inputs','helper-flags','helper-plan','helper-instrument','helper-normalize','helper-process-metrics','helper-review-seed','helper-verify'].map((stage,i)=>({stage,code:0,signal:null,stopReason:null,groupClean:true,observationFailure:null,outputComplete:true,groupId:100+i,startedMs:i*100,endedMs:i*100+90,remainingMs:180000-i*100,timePeakRssBytes:1000000,groupPeakRssBytes:0}))};
}
recoveryTest('complete previous three-helper build is reusable without rebuilding',()=>assert.deepEqual(recoveryCheck.verifyBuildReceipt(completeRecoveryBuild()),{builds:3,steps:8,executions:0}));
for(const kind of ['partial','exit','observation','output','deadline','rss','disk','cleanup'])recoveryTest('reject previous build '+kind,()=>{
 const b=completeRecoveryBuild();
 if(kind==='partial')b.steps.pop();if(kind==='exit')b.steps[6].code=1;if(kind==='observation')b.steps[4].observationFailure={part:'disk'};
 if(kind==='output')b.storedOutputBytes--;if(kind==='deadline')b.elapsedMs=180000;if(kind==='rss')b.peakRssBytes=1073741825;if(kind==='disk')b.peakDiskBytes=536870913;if(kind==='cleanup')b.cleanupErrors.push('unconfirmed');
 assert.throws(()=>recoveryCheck.verifyBuildReceipt(b),/PRIOR_/);
});
recoveryTest('current Source mismatch rejects before copy',()=>{
 const src=fs.readFileSync(path.join(recoveryPackage,'run-once.mjs'),'utf8');
 const body=src.slice(src.indexOf('function sourceCheck(){'),src.indexOf('function snapshot(){'));
 const invoke=new Function('fs','path','prepared','approval','support','sha','need','readOnly',body+';sourceCheck();');
 assert.throws(()=>invoke({realpathSync:p=>p},path,{repo:'/approved'},{sourceSha256:{'src/input.cpp':'a'.repeat(64)}},{},()=> 'b'.repeat(64),(v,c)=>{if(!v)throw Error(c);},()=>''),/SOURCE_CHANGED:src\/input.cpp/);
});
recoveryTest('first postflight error is not overwritten by evidence failure',()=>{
 const src=fs.readFileSync(path.join(recoveryPackage,'run-once.mjs'),'utf8'),body=src.slice(src.indexOf('function fail('),src.indexOf('function readOnly('));
 const run=new Function('writer','Buffer','path','sha','need',"let firstFailure=null,stage='postflight';const evidenceErrors=[];"+body+"fail(Error('HELPER_FILE_UNSAFE'));try{write('result.json',{});}catch(e){fail(e);}return {firstFailure,evidenceErrors};");
 const r=run({write:()=>{throw Error('EIO');}},Buffer,path,()=>'',()=>{});
 assert.equal(r.firstFailure.code,'HELPER_FILE_UNSAFE');assert.equal(r.evidenceErrors[0].code,'EIO');
});
for(const mode of ['normal','existing','symlink','hardlink','source-sha','execute','source-receipt','source-receipt-sha','source-receipt-path'])recoveryTest('safe Python artifact copy '+mode,()=>{
 const code=String.raw`
import importlib.util,sys,pathlib,tempfile,os,hashlib,json
sys.path.insert(0,str(pathlib.Path.cwd()/'scripts/internal'))
import recording_accumulated_cost as existing
s=importlib.util.spec_from_file_location('copy_only',pathlib.Path(sys.argv[1])/'verify-copy.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
with tempfile.TemporaryDirectory(prefix='media-server-copy-mock-',dir='/private/tmp') as tmp:
 root=pathlib.Path(tmp);(root/'src').mkdir(mode=0o700);(root/'dst').mkdir(mode=0o700)
 p=root/'src/normalize';d=root/'dst/normalize';p.write_bytes(b'non executable mock');p.chmod(0o700)
 e={'mode':'0o700','uid':os.getuid(),'links':1,'bytes':p.stat().st_size,'sha256':m.digest(p)};mode=sys.argv[2]
 if mode.startswith('source-receipt'):
  source=root/'source-sha256.json';data={'src/mock.cpp':'a'*64};source.write_text(json.dumps(data))
  receipt={'path':source.name,'bytes':source.stat().st_size,'sha256':m.digest(source)}
  if mode=='source-receipt-sha':receipt['sha256']='0'*64
  if mode=='source-receipt-path':receipt['path']='../source-sha256.json'
  try:m.source_manifest(root,receipt,data)
  except ValueError:assert mode!='source-receipt'
  else:assert mode=='source-receipt'
  print('COPY_MOCK_PASS');sys.exit(0)
 if mode=='existing':d.write_bytes(b'preserved')
 if mode=='symlink':p.rename(p.with_name('real'));p.symlink_to('real')
 if mode=='hardlink':os.link(p,p.with_name('alias'))
 if mode=='source-sha':e['sha256']='0'*64
 if mode=='execute':p.chmod(0o600)
 try:m.copy_artifact(p,d,e,existing.helper_owned)
 except (ValueError,OSError):
  assert mode!='normal'
  if mode=='existing':assert d.read_bytes()==b'preserved'
 else:
  assert mode=='normal' and p.read_bytes()==d.read_bytes() and m.digest(d)==e['sha256'] and d.stat().st_nlink==1 and (d.stat().st_mode&0o777)==0o700
print('COPY_MOCK_PASS')
`;
 const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',code,recoveryPackage,mode],{encoding:'utf8',timeout:5000,maxBuffer:65536});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/COPY_MOCK_PASS/);
});
recoveryTest('recovery uses existing bounded supervision and no build or native invocation',()=>{
 const r=fs.readFileSync(path.join(recoveryPackage,'run-once.mjs'),'utf8'),p=fs.readFileSync(path.join(recoveryPackage,'verify-copy.py'),'utf8');
 assert.equal((r.match(/await guard\.runBounded\(/g)||[]).length,1);
 assert(r.includes('seconds:remaining,outputCap:2097151,rssCap:1073741824,diskCap:536870912'));
 assert(r.includes("exclusive(path.join(root,'CLAIMED.json')"));assert(r.includes('COPY_GROUP_REMAINS'));
 assert(!r.includes('runLimitedIsolatedBuild(')&&!p.includes('subprocess')&&!p.includes('.chmod('));
 assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});

// Limited preparation only: virtual clocks/processes; no native collector,
// Helper, server, compiler or HTTP request is executed by these tests.
import {limitedPreparationStart} from './recording_accumulated_cost.mjs';
test('limited preparation shared origin includes preparation and rejects missing/future/expired clocks',()=>{
 const origin='1000000000000';
 for(const seconds of [0,100,235,236,240,299]){
  const start=limitedPreparationStart({originNs:origin,nowNs:()=>1000000000000n+BigInt(seconds)*1000000000n,now:()=>10});
  assert.equal(10-start,seconds*1000);
  const schedule=limitedSearchSchedule({startedAt:0,now:()=>10-start});
  assert.equal(schedule.decision().start,seconds<=235);
 }
 for(const originNs of [undefined,'0','invalid','1000000000001','1'])assert.throws(()=>limitedPreparationStart({originNs,nowNs:()=>1000000000000n,now:()=>10}));
});
const preparationPython=String.raw`
import sys,copy,io,os,ast
from pathlib import Path
from unittest.mock import Mock,patch
sys.path.insert(0,'scripts/internal');import run_v450_recording_a_mixed as m
root=Path(sys.argv[1]);mode=sys.argv[2];tick=[100.0];observations=[];cap=448*1024**2
row={'pid':101,'pgid':100,'expectedPgid':100,'startIdentity':'macos:100:200','valid':True,'error':None,'rssBytes':1024,
 'observedStartNs':'100000000000','observedEndNs':'100000000001','fdObservation':{'complete':True,'startIdentity':'macos:100:200'}}
value={'complete':True,'expectedPids':[101],'processes':[row],'workspace':{'totalBytes':10,'fixedBytes':0,'copyBytes':0,'anonymousBytes':5}}
def observe(child):observations.append(child);return copy.deepcopy(value)
b=m.LimitedPreparationBoundary(observe,now=lambda:tick[0],origin=100)
def fails(code,phase='prepare',work=True):
 try:b.sample(phase,work=work)
 except ValueError as e:assert str(e)==code,(str(e),code)
 else:raise AssertionError('accepted '+code)
 assert b.first['code']==code
if mode=='normal':
 b.sample('before-copy');tick[0]=150;b.sample('seed');tick[0]=200;b.sample('fixture')
 assert b.remaining()==140 and b.samples==3 and b.peaks=={101:1024}
 assert b.report()['capacityPreflight']=='BLOCKED' and 'shared pages' in b.last_snapshot['rssMeaning']
 value['processes'].append(dict(row,pid=102,rssBytes=2048));value['expectedPids'].append(102);b.sample('wrapper-helper')
 assert b.last_snapshot['rssSumBytes']==3072 and len(b.identities)==2
elif mode=='clock':
 tick[0]=339.999;b.sample('last-work');tick[0]=340;fails('limited-work-deadline');assert len(observations)==1
 tick[0]=399.999;b.sample('shutdown',work=False);assert b.samples==2
 tick[0]=400
 try:b.sample('finalization',work=False)
 except ValueError as e:assert str(e)=='limited-finalization-deadline'
 else:raise AssertionError('hard limit accepted')
 assert b.first['code']=='limited-work-deadline' and b.secondary[-1]['code']=='limited-finalization-deadline'
elif mode=='clock-regression':tick[0]=99;fails('limited-clock')
elif mode=='clock-nan':tick[0]=float('nan');fails('limited-clock')
elif mode=='collection-delay':
 def delayed(child):tick[0]=341;return value
 b.observe=delayed;fails('limited-work-deadline')
elif mode=='missing':value['complete']=False;fails('limited-observation-missing')
elif mode=='coverage':value['expectedPids'].append(102);fails('limited-process-coverage')
elif mode=='identity':row['startIdentity']=None;fails('limited-process-identity')
elif mode=='identity-format':row['startIdentity']='macos:x';fails('limited-process-identity')
elif mode=='pid-reuse':b.sample('baseline');row['startIdentity']='macos:101:200';row['fdObservation']['startIdentity']=row['startIdentity'];fails('limited-process-identity-changed')
elif mode=='group-escape':row['pgid']=200;fails('limited-group-escape')
elif mode=='fd':row['fdObservation']['complete']=False;fails('limited-native-observation')
elif mode=='rss-missing':row['rssBytes']=None;fails('limited-rss-missing')
elif mode=='rss-cap':row['rssBytes']=4*1024**3+1;fails('limited-rss-cap')
elif mode=='sample-clock':row['observedEndNs']='1';fails('limited-observation-clock')
elif mode=='workspace-missing':value['workspace']['totalBytes']=None;fails('limited-workspace-unobserved')
elif mode in ('media','sqlite','journal','shutdown-file'):
 value['workspace']['totalBytes']=cap-5;fails('limited-workspace-variable-cap',mode,mode!='shutdown-file')
elif mode=='copy':value['workspace']['copyBytes']=cap;fails('limited-workspace-copy-cap')
elif mode=='combined':
 # Combined is dominated by the two strict component bounds. Never accept an
 # individually allowed but combined-overflow pair using a different baseline.
 value['workspace'].update(totalBytes=cap-6,copyBytes=cap-1);b.sample('copy-near-limit')
 value['workspace']['anonymousBytes']=7;fails('limited-workspace-variable-cap')
elif mode=='sample-cap':b.samples=1600;fails('limited-observation-sample-cap')
elif mode=='first':
 b.fail('seed-failed','seed');b.fail('cleanup-failed','cleanup')
 with patch.object(m.subprocess,'Popen') as launch:
  r=m.run_owned(['never-executed'],root/'blocked.log',240,root,{},lambda _:None,limited_boundary=b)
 assert launch.call_count==0 and r['status']=='FAIL' and b.first['code']=='seed-failed'
 assert any(e['code']=='cleanup-failed' for e in b.secondary)
elif mode in ('supervisor','shutdown-output','supervisor-error','cleanup-error'):
 child=Mock();child.pid=100;child.returncode=None;child.poll.side_effect=lambda:child.returncode
 capture=m.LimitedParentCapture();events=[];calls=[0]
 def attach(ch,out):capture.output=out;capture.pipe=io.BytesIO()
 def read(timeout):
  events.append('read');capture.push(b'shutdown\n' if child.returncode is not None else b'work\n')
  if child.returncode is not None:
   if mode=='shutdown-output':capture.push(b'x'*m.LIMITED_PARENT_OUTPUT_BYTES)
   capture.eof=True
  else:capture.push(b'[R165-first-failure] {"code":"seed-failed"}\n')
 def observation(ch):
  calls[0]+=1
  if mode in ('supervisor-error','cleanup-error') and calls[0]>=2:raise ValueError('identity-unavailable' if calls[0]==2 else 'cleanup-observation')
  return copy.deepcopy(value)
 b.observe=observation
 def stop(ch):events.append('stop');child.returncode=-15;return {'processGroupAbsent':mode!='cleanup-error','cleanupErrors':['group-residual'] if mode=='cleanup-error' else []}
 with patch.object(m.subprocess,'Popen',return_value=child) as launch,patch.object(capture,'attach',side_effect=attach),patch.object(capture,'read',side_effect=read),patch.object(m,'stop_created_group',side_effect=stop),patch.object(m,'group_alive',return_value=False),patch.object(m,'finish_registered_groups',return_value={'registeredGroupsAbsent':True}):
  r=m.run_owned(['synthetic-only'],root/'run.log',240,root,{},lambda _:None,limited_capture=capture,limited_boundary=b)
 assert launch.call_count==1 and r['status']=='FAIL' and events.count('stop')==1
 assert b.first['code']==('identity-unavailable' if mode in ('supervisor-error','cleanup-error') else 'child-diagnostic')
 assert b'shutdown' in (root/'run.log').read_bytes() and capture.eof
 assert (root/'run.log').stat().st_size<=2097152
 if mode=='shutdown-output':assert 'parent-output-cap' in capture.failure_events
 if mode=='cleanup-error':assert not r['processGroupAbsent'] and r['cleanupErrors']==['group-residual'] and b.secondary[-1]['code']=='cleanup-observation'
elif mode=='observer-evidence-error':
 observer=m.LimitedPreparationNativeObserver(root,'/mock/collector','0'*64,'/mock/node',100)
 observer.trace=Mock();observer.trace.write.side_effect=OSError('evidence-write')
 with patch.object(m.subprocess,'Popen',side_effect=OSError('spawn-error')),patch.object(m.time,'monotonic',return_value=100):
  try:observer(None)
  except OSError as e:assert str(e)=='spawn-error'
  else:raise AssertionError('missing first failure')
 assert observer.secondary_errors==['evidence-write']
elif mode=='legacy':
 child=Mock();child.pid=100;child.returncode=0;child.poll.return_value=0
 with patch.object(m.subprocess,'Popen',return_value=child) as launch,patch.object(m,'stop_created_group',return_value={'processGroupAbsent':True}),patch.object(m,'group_alive',return_value=False),patch.object(m,'finish_registered_groups',return_value={'registeredGroupsAbsent':True}):
  r=m.run_owned(['synthetic-only'],root/'legacy.log',180,root,{},lambda _:None)
 assert r['status']=='PASS' and len(observations)==0 and launch.call_args.kwargs['stdout']!=m.subprocess.PIPE
else:raise AssertionError(mode)
print('PASS synthetic '+mode+'; native/helper/product launches=0')
`;
for(const mode of ['normal','clock','clock-regression','clock-nan','collection-delay','missing','coverage','identity','identity-format','pid-reuse','group-escape','fd','rss-missing','rss-cap','sample-clock','workspace-missing','media','sqlite','journal','shutdown-file','copy','combined','sample-cap','first','supervisor','shutdown-output','supervisor-error','cleanup-error','observer-evidence-error','legacy'])test('limited preparation boundary '+mode,()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-preparation-mock-');fs.chmodSync(root,0o700);
 try{const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',preparationPython,root,mode],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}
 finally{fs.rmSync(root,{recursive:true});}
});
function preparationProducerMock(mode){
 const source=fs.readFileSync('scripts/internal/recording_accumulated_cost.mjs','utf8');
 const body=source.slice(source.indexOf('export async function observeLimitedPreparation'),source.indexOf('const buildScript=')).replace('export async function','async function');
 let tables=0,ns=1000n;const calls=[];const rootStat={uid:501,mode:0o700,dev:1,ino:1,isDirectory:()=>true,isSymbolicLink:()=>false};
 const processRows='10 1 10\n20 10 20\n21 20 20\n999 10 999\n1000 999 999\n';
 const sandbox={process:{pid:999,getuid:()=>501,hrtime:{bigint:()=>ns++}},path,crypto,Number,JSON,Set,Error,
  need:(v,m)=>{if(!v)throw Error(m);},number:v=>Number.isSafeInteger(v)&&v>=0,
  fs:{lstatSync:p=>p==='/collector'?{...rootStat,isFile:()=>true,nlink:1}:{...rootStat,isSymbolicLink:()=>mode==='root-symlink'},realpathSync:p=>p,readFileSync:()=>Buffer.from('collector')},
  preparationSpawnSync:(command,args,options)=>{calls.push({command,args,options});tables++;return {status:mode==='table-error'?1:0,stdout:processRows+(mode==='tree-churn'&&tables===2?'22 20 20\n':'')};},
  preparationCollectProcess:async(file,pid)=>{calls.push({collector:file,pid});if(mode==='collector-error')throw Error('native-failure');return {pid:mode==='wrong-pid'?pid+1:pid,anonymousFileBytes:mode==='anonymous-missing'?null:1,anonymousAllocatedBytes:2};},
  preparationMeasureRoot:()=>({totalBytes:10}),preparationMeasureCopy:()=>({bytes:20}),
  preparationWorkspaceBounds:(total,fixed,copy)=>{calls.push({total,fixed,copy});if(mode==='workspace')throw Error('workspace-exceeded');}
 };
 const fn=vm.runInNewContext(body+'\nobserveLimitedPreparation',sandbox);
 return {calls,run:()=>fn({root:'/owned',rootIdentity:{dev:1,ino:1},copyRoot:mode==='copy-overlap'?'/owned':'/copy',copyIdentity:{dev:1,ino:1},launcherPid:10,childPid:20,collector:'/collector',collectorSha256:mode==='sha'?'0'.repeat(64):crypto.createHash('sha256').update('collector').digest('hex')})};
}
test('limited preparation producer observes launcher wrapper helper; excludes its own observation descendants explicitly',async()=>{
 const m=preparationProducerMock('normal'),r=await m.run();assert.deepEqual(Array.from(r.expectedPids),[10,20,21]);
 assert.deepEqual(Array.from(r.processes,p=>p.expectedPgid),[10,20,20]);assert.equal(r.workspace.anonymousBytes,6);assert.equal(r.workspace.copyBytes,20);
 assert(r.coverage.includes('NOT_PROVEN'));assert.equal(r.writeAdmission,'NOT_BOUND');assert.equal(m.calls.filter(c=>c.collector).length,3);
 for(const c of m.calls.filter(c=>c.command)){assert.equal(c.command,'/bin/ps');assert.equal(c.options.timeout,1000);assert.equal(c.options.maxBuffer,1048576);}
});
for(const [mode,error] of [['table-error','limited-process-table'],['tree-churn','limited-process-tree-changed'],['collector-error','native-failure'],['wrong-pid','limited-native-pid'],['anonymous-missing','limited-anonymous-unobserved'],['root-symlink','limited-root-identity'],['copy-overlap','limited-copy-overlap'],['sha','limited-collector-sha'],['workspace','workspace-exceeded']])test('limited preparation producer fail closed '+mode,async()=>{await assert.rejects(preparationProducerMock(mode).run(),new RegExp(error));});
test('limited preparation overlay clock and unchanged general wrapper, helper rejection and build prohibition',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-preparation-overlay-mock-');
 const code=String.raw`
import sys,ast
from pathlib import Path
sys.path.insert(0,'scripts/internal');import recording_accumulated_cost as m
root=Path(sys.argv[1]);m.generate(root/'normal',mandatory_ledger=True);m.generate(root/'limited',mandatory_ledger=True,limited_search=True)
normal=(root/'normal/wrapper.sh').read_text();limited=(root/'limited/wrapper.sh').read_text();driver=(root/'limited/mixed.mjs').read_text()
assert 'MEDIA_SERVER_LIMITED_ORIGIN_NS' in driver and 'startedAt:0,now:()=>performance.now()-start' in driver
assert 'limitedDiagnose?limitedPreparationStart' in driver
assert '--install-limited-helpers' not in normal
branch=limited.split('if [[ "$*" == --limited-search-diagnostic ]]; then')[-1].split('else\n')[0]
assert '--install-limited-helpers' in branch and 'MANIFEST_SHA:?' in branch
assert all(s not in branch for s in ('c++','cmake','pkg-config'))
assert 'assertLimitedSearchCapacity();' in limited and 'assertSearchPerformanceCapacity();' in limited
for n in ('recording_accumulated_cost.py','run_v450_recording_a_mixed.py'):ast.parse((m.SCRIPTS/n).read_text())
print('overlay and syntax static PASS; no native execution')
`;
 try{const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',code,root],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}
 finally{fs.rmSync(root,{recursive:true});}
 assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});
for(const mode of ['normal','sha','missing'])test('limited preparation existing helper installer '+mode,()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-preparation-install-mock-');fs.chmodSync(root,0o700);
 try{const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',helperBindingPython,root,mode],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}
 finally{fs.rmSync(root,{recursive:true});}
});
test('limited preparation preserves output workspace and build limits; cannot manufacture readiness',()=>{
 const c=limitedSearchCapacity();assert.equal(c.status,'BLOCKED');
 const text=fs.readFileSync('scripts/internal/recording_accumulated_cost.mjs','utf8');
 for(const contract of ['capBytes:4*1024*1024','capBytes:2*1024*1024,rowCap:4096','detailBytes<=128*1024','serverBytes<=384*1024-192','clientBytes+bytes<=256*1024'])assert(text.includes(contract),contract);
 const launcher=fs.readFileSync('scripts/internal/run_v450_recording_a_mixed.py','utf8');
 const entry=launcher.slice(launcher.indexOf('def limited_entry('),launcher.indexOf('def source_binding('));
 assert(entry.indexOf('began=time.monotonic()')<entry.indexOf('verify_isolated_build_inputs(plan'));
 assert(entry.indexOf('assertLimitedSearchCapacity();')<entry.indexOf('LimitedPreparationNativeObserver(directory'));
 assert(launcher.includes('LIMITED_PARENT_OUTPUT_BYTES = 2097152'));
 const guard=fs.readFileSync('scripts/internal/recording_catalog_comparison_guard.mjs','utf8');
 assert(guard.includes('seconds:180'));assert(guard.includes('output:2097152'));
});
