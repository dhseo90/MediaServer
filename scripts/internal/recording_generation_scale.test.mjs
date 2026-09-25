// B08-C01: 제품 실행 없이 bounded trace의 tail과 전체 완료 집계를 분리 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const parent=fs.realpathSync(os.tmpdir());
const root=fs.mkdtempSync(path.join(parent,'media-server-scale-trace-'));
fs.chmodSync(root,0o700);const owner=fs.lstatSync(root);
const source=path.join(root,'trace.cpp'),binary=path.join(root,'trace');
fs.writeFileSync(source,`#include "recording/recording_latency_trace.h"
#include <thread>
namespace L=recording::latency;
int main(){if(!L::Enabled())return 0;
 auto add=[](unsigned kind,unsigned long long wait,unsigned long long hold){
  L::Row r;r.k=kind;r.o=kind?7:1;r.b=1;r.a=1+wait;r.e=r.a+hold;L::Append(r,true);};
 for(unsigned i=0;i<20000;++i)add(0,1,10);
 add(0,40000000,50000000);add(1,0,70000000);
 for(unsigned i=0;i<80;++i)add(0,0,10000000);
 std::thread a([&]{for(unsigned i=0;i<1000;++i)add(0,1,10);});
 std::thread b([&]{for(unsigned i=0;i<1000;++i)add(0,1,10);});a.join();b.join();
 L::FinishThread();}
`,{mode:0o600});
test.before(()=>{
 const r=spawnSync(process.env.CXX||'c++',['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-I'+path.join(repo,'include'),source,'-o',binary],{encoding:'utf8',timeout:30000});
 assert.equal(r.status,0,r.stderr);
});
test.after(()=>{
 const current=fs.lstatSync(root);
 assert.equal(path.dirname(root),parent);assert(!current.isSymbolicLink());
 assert.equal(current.dev,owner.dev);assert.equal(current.ino,owner.ino);assert.equal(current.uid,process.getuid());
 assert.equal(fs.realpathSync(root),root);
 const bytes=fs.readdirSync(root).reduce((n,k)=>n+fs.lstatSync(path.join(root,k)).size,0);
 fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));
 console.log('[cleanup] '+JSON.stringify({root,bytes,removed:true}));
});
test('B08-C01 tail64 overwrite does not lose completed lock/span count and maxima',()=>{
 const r=spawnSync(binary,[],{encoding:'utf8',timeout:15000,maxBuffer:64*1024,
  env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY:'1'}});
 assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'');
 const lines=r.stderr.trim().split('\n');
 const rows=lines.filter(l=>l.startsWith('[recording-latency] ')).map(l=>JSON.parse(l.slice(20)));
 assert.equal(rows.length,64);assert(rows.every(r=>r.h===10000000&&r.w===0));
 const slow=JSON.parse(lines.find(l=>l.startsWith('[recording-slow-summary] ')).slice(25));
 assert.deepEqual(slow,{seen:82,retained:64,thresholdNs:10000000});
 const complete=lines.find(l=>l.startsWith('[recording-complete-summary] '));
 assert(complete,'missing independent completed-event summary');
 assert.deepEqual(JSON.parse(complete.slice(29)),{lockCount:22081,spanCount:1,maxWaitNs:40000000,maxHoldNs:50000000,maxSpanNs:70000000,countOverflow:false});
 assert(Buffer.byteLength(r.stderr)<=64*512+512);
});
test('B08-C01 disabled trace emits neither tail nor completed summary',()=>{
 const r=spawnSync(binary,[],{encoding:'utf8',timeout:15000,env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY:'1'}});
 assert.equal(r.status,0);assert.equal(r.stdout,'');assert.equal(r.stderr,'');
});
