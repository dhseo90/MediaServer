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
