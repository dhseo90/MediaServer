import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import {captureBoundedProcessLog} from './recording_longrun_progress.mjs';
import {spawnSync} from 'node:child_process';
import {completionCollection} from './recording_completion_collection.mjs';
const line=(p,x)=>p+' '+JSON.stringify(x)+'\n';
const completion={v:1,event:10,begin:'1',end:'2',thread:1,request:1,reference:null,job:null,n:3,x:2,y:0};
const evidence={stage:'application',first:'evidence-exception',exception:1,builder:'',http:'evidence-create-failed',published:0,checked:1,current:0,captureRevision:1,checkRevision:1};
const a=line('[recording-completion]',completion),b=line('[recording-evidence]',evidence);
const end=(rows,bytes,extra={})=>line('[recording-completion-end]',{v:1,rows,bytes,lost:false,writeError:false,complete:true,...extra});
const good=a+b+end(2,Buffer.byteLength(a+b));
const verdict=(text)=>{const c=completionCollection();c.append(Buffer.from(text));return c.finish();};
assert.equal(verdict('\n'+good+'\n').status,'captured');
for(let at=0;at<=Buffer.byteLength(good);++at){const c=completionCollection(),buf=Buffer.from(good);c.append(buf.subarray(0,at));c.append(buf.subarray(at));assert.equal(c.finish().status,'captured');}
// Cross-stream delivery can arrive after stderr receipt; final aggregate reconciles both streams.
const multi=completionCollection();multi.append(b+end(2,Buffer.byteLength(a+b)),'stderr');multi.append(a,'stdout');assert.equal(multi.finish().status,'captured');
const negatives=[a,good+a,a+end(2,Buffer.byteLength(a)),a+end(1,1),a+end(1,Buffer.byteLength(a),{lost:true}),a+end(1,Buffer.byteLength(a),{writeError:true}),a+end(1,Buffer.byteLength(a),{complete:false}),
 line('[recording-completion]',{...completion,event:14,begin:'0',end:'0',request:0,n:1,x:0,y:0}),line('[recording-evidence]',{lost:true}),
 '[recording-completion] {bad}\n','[recording-evidence] {}\n','[recording-completion] ',
 line('[recording-evidence]',{...evidence,checked:2}),line('[recording-completion]',{...completion,unexpected:true}),
 '[recording-evidence] '+ ' '.repeat(768)+'\n', '[recording-completion-after-end] {"lost":true}\n'];
for(const text of negatives)for(const stream of ['stdout','stderr']){const c=completionCollection();c.append(text,stream);assert.equal(c.finish().status,'incomplete');}
assert.equal(verdict('unrelated event14 '+JSON.stringify(completion)+'\n'+good).status,'captured');
assert.equal(verdict('x'.repeat(100000)+'\n'+good).status,'captured');
const utf=completionCollection();utf.append(Buffer.from('[recording-evidence] {"stage":"\xff"}\n','latin1'));assert.equal(utf.finish().status,'incomplete');
// 실제 mixed on-data 연결을 격리 VM에서 실행한다. 서버/소켓은 만들지 않는다.
const source=fs.readFileSync(new URL('./v450_recording_a_mixed.mjs',import.meta.url),'utf8');
const handler=source.split('\n').find(l=>l.includes("for(const stream of [child.stdout,child.stderr])"));assert(handler);
for(const channel of ['stdout','stderr']){
 let stopped=0,saved=0;const child={stdout:new EventEmitter(),stderr:new EventEmitter(),kill(){stopped++;}};
 const app={logFd:7,bytes:0,completionTrace:completionCollection(),resourceTrace:{}};
 vm.runInNewContext(handler,{child,app,captureBoundedProcessLog,fs:{writeSync(_fd,b){saved+=b.length;return b.length;}},collectResourceTrace(){},memoryObserve:false});
 const loss=Buffer.from(line('[recording-evidence]',{lost:true}));
 child[channel].emit('data',loss.subarray(0,7));child[channel].emit('data',loss.subarray(7));
 assert.equal(stopped,1);assert.equal(saved,loss.length);assert.equal(app.completionTrace.finish().status,'incomplete');
}
const root=process.env.R141_ROOT||fs.mkdtempSync(path.join(os.tmpdir(),'media-server-r141-unit-'));
const binary=path.join(root,'receipt-smoke');
const flags=spawnSync('pkg-config',['--cflags','--libs','openssl'],{encoding:'utf8'});assert.equal(flags.status,0,flags.stderr);
const build=spawnSync(process.env.CXX||'c++',['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-DMEDIA_SERVER_USE_OPENSSL=1','-Iinclude','scripts/internal/recording_completion_receipt_smoke.cpp',...flags.stdout.trim().split(/\s+/),'-o',binary],{encoding:'utf8',timeout:30000});assert.equal(build.status,0,build.stderr);
const native=[];
for(const mode of ['normal','exception','short','flush','cap','bytes','abnormal','late']){
 const r=spawnSync(binary,[mode],{env:{...process.env,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1'},encoding:'utf8',timeout:10000,maxBuffer:3*1024*1024});assert.equal(r.status,0,r.stderr);
 fs.writeFileSync(path.join(root,'receipt-'+mode+'.log'),r.stdout+r.stderr,{flag:'wx'});
 assert(Buffer.byteLength(r.stdout+r.stderr)<=2*1024*1024);
 const result=verdict(r.stdout);assert.equal(result.status,mode==='normal'?'captured':'incomplete',mode);
 assert.equal((r.stdout.match(/\[recording-completion-end\]/g)||[]).length,1);
 if(mode==='normal')assert.equal(result.rows,2); // destructor row included before terminal
 native.push({mode,...result,wireBytes:Buffer.byteLength(r.stdout)});
}
const off=spawnSync(binary,['normal'],{env:{...process.env,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'0'},encoding:'utf8'});assert.equal(off.status,0);assert.equal(off.stdout+off.stderr,'');
console.log(JSON.stringify({status:'PASS',splitPositions:Buffer.byteLength(good)+1,negativeCases:negatives.length*2,native,productRuns:0,receiptTransportIsNotShutdownOrJournalProof:true}));
if(!process.env.R141_ROOT)fs.rmSync(root,{recursive:true});
