import test from 'node:test';
import assert from 'node:assert/strict';
import {selection,aSelection,costCollector} from './recording_accumulated_cost.mjs';
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {once} from 'node:events';
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
   let checkpoint=null;const context={performanceDiagnose:true,final:f.final,selectedBound:null,selectedTrace:{failure:()=>null,complete:()=>{if(mode==='partial')throw Error('partial-terminal');return f.trace;}},performanceCompletion:f.completion,performanceLogs:[true],processes:[{}],selectedBatchOrdinal:f.batches,searchPerformanceResult,failed:0,phaseResult:f.final.phase,latencyPassed:mode!=='latency',artifacts:{checkpoint:r=>checkpoint=r},console:{log(){}},process:{}};
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
