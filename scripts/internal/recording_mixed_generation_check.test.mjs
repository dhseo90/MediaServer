// 파일 용도: R99 실제 부모 run 함수의 수집·실패 전파 반례. 합성 자식이며 제품 실행 근거가 아니다.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {resourceTraceCollector,collectResourceTrace,finishResourceTrace} from './recording_resource_trace.mjs';
import {verifyCurrentCyclicProgress} from './recording_current_observer.mjs';
const source=fs.readFileSync(new URL('./recording_mixed_generation_check.mjs',import.meta.url),'utf8');
const actual=source.slice(source.indexOf('async function run('),source.indexOf('\ntry{\n  summary.live='));
let passed=0;
async function scenario(fault){
 const child=new EventEmitter();child.pid=100;child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
 let closed=false,alive=true,ack=0,rawClosed=false,spawned=false,writes=0,captured=null,killed=false;
 const end=(code=0,signal=null)=>{if(closed)return;closed=true;if(fault!=='descendant')alive=false;child.emit('close',code,signal);};
 const row=(phase,seq)=>'[recording-resource] '+JSON.stringify({pid:101,seq,elapsedMs:seq,phase,ram:0,ramPeak:1,ramLimit:640*1024*1024,ramRejected:0,scratchDisk:0,scratchDiskPeak:1,scratchDiskLimit:100,scratchFd:0,scratchFdPeak:1,scratchFdLimit:100,scratchRam:0,preservedDisk:0,preservedFd:0,readerCleanupHealthy:true})+'\n';
 child.stdin.write=()=>{if(fault==='stdin'){queueMicrotask(()=>child.stdin.emit('error',Error('EPIPE')));return;}
   if(++ack===1){child.stderr.emit('data',Buffer.from(row('before-Finish',1)+row('after-Finish',2)));child.stdout.emit('data',Buffer.from('[R99-phase] copy-released 101\n'));}
   else {child.stderr.emit('data',Buffer.from(fault==='trace-missing'?'other\n':row('after-storage-destruction',3)));
     if(fault==='partial')child.stdout.emit('data',Buffer.from('truncated'));
     end(fault==='child-exit'?2:0,fault==='signal'?'SIGABRT':null);}};
 const proc=new EventEmitter();proc.kill=(pid,signal)=>{assert.equal(pid,-100);if(!alive)throw Object.assign(Error(),{code:'ESRCH'});if(signal===0)return;
   if(signal==='SIGKILL'){killed=true;alive=false;}queueMicrotask(()=>end(1,signal));};
 const context={root:'/owned',repo:'/repo',binary:'/binary',collector:'/collector',samples:2,baseline:{},sampleCount:0,
  fs:{openSync(){if(fault==='open')throw Error('open-failed');return 1;},writeSync(fd,b){writes++;if(fault==='write')throw Error('write-failed');if(fault==='short')return 0;if(fault==='last-write'&&closed&&fd===2)throw Error('last-write-failed');return Buffer.byteLength(b);},fstatSync:()=>({size:0}),closeSync:()=>{rawClosed=true;}},
  spawn(){spawned=true;if(fault==='spawn')throw Error('spawn-failed');setImmediate(()=>{child.stderr.emit('data',Buffer.from(row('opened',0)));child.stdout.emit('data',Buffer.from('[R99-phase] copy-opened 101\n'));});return child;},
  collectProcess:async()=>{if(fault==='last-write')end();return {valid:fault!=='probe',error:null,rssBytes:10,startIdentity:'linux:1'};},
  named:()=>({}),admitWorkspaceSnapshot(){if(fault==='space')throw Error('workspace-variable-cap');return {};},
  capture:{capture(e){captured??=e.message;}},process:proc,path,performance,Buffer,setTimeout,clearTimeout,setInterval,clearInterval,resourceTraceCollector,collectResourceTrace,finishResourceTrace};
 vm.createContext(context);vm.runInContext(actual,context);
 let result,error;try{result=await vm.runInContext("run('--mixed-generation-reopen','/copy',true)",context);}catch(e){error=e;}
 if(!fault){assert.equal(result.owner.status,'captured');assert.equal(error,undefined);}else assert(error,`fault escaped: ${fault}`);
 if(fault==='open')assert.equal(spawned,false);else assert(rawClosed);
 if(['space','last-write','write','short'].includes(fault))assert(captured);
 if(fault==='descendant')assert(killed);
 assert.equal(alive,false,fault==='open'||fault==='spawn'?'unused placeholder':undefined);
 return {fault,result,error,writes};
}
for(const fault of [null,'write','short','last-write','stdin','partial','trace-missing','probe','space','child-exit','signal','descendant']){
 await scenario(fault);passed++;console.log('[pass] actual parent '+(fault??'normal'));
}
// spawn 전 실패에는 소유 자식이 없으므로 다른 프로세스를 종료하지 않는다.
for(const fault of ['open','spawn']){
 // 아직 존재하지 않는 합성 PID와 실제 생성 경계를 별도 확인한다.
 let spawned=false,closed=false;const context={fs:{openSync(){if(fault==='open')throw Error('open-failed');return 1;},closeSync(){closed=true;}},root:'/owned',repo:'/repo',path,binary:'x',spawn(){spawned=true;throw Error('spawn-failed');}};
 vm.createContext(context);vm.runInContext(actual,context);await assert.rejects(vm.runInContext("run('--mixed-generation-reopen','/copy',true)",context));assert.equal(spawned,fault==='spawn');assert.equal(closed,fault==='spawn');passed++;
}
const b={channel:'9101',count:696,bytes:24147904,order:697};
const c={channel:'9101',newFinalized:1,newDeleted:2,alive:695,bytes:24133180,availableEvidenceAfterDelete:1};
verifyCurrentCyclicProgress(b,c);passed++;
for(const change of [{newFinalized:0,alive:694},{newDeleted:0,alive:697},{availableEvidenceAfterDelete:0},{bytes:87*1024*1024+1},{channel:'9201'},{alive:696},{newDeleted:NaN}]){assert.throws(()=>verifyCurrentCyclicProgress(b,{...c,...change}));passed++;}
console.log(JSON.stringify({passed,failed:0,scope:'synthetic child events through actual parent function; baseline predicates; no product execution'}));

verifyCurrentCyclicProgress(b,{...c,bytes:108*1024*1024},'continuous-r114');
assert.throws(()=>verifyCurrentCyclicProgress(b,{...c,bytes:108*1024*1024+1},'continuous-r114'));
assert.throws(()=>verifyCurrentCyclicProgress(b,c,'arbitrary-quota'));
console.log('[pass] R114 named quota boundary; legacy R99 predicate unchanged');
