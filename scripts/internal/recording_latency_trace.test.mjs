// 파일 용도: 녹화 지연 추적 수집의 집계 정확성과 제한·오류 판정을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as trace from './recording_latency_trace.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {before,after} from 'node:test';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-latency-'))),binary=path.join(root,'smoke');
fs.chmodSync(root,0o700);
before(()=>{const r=spawnSync(process.env.CXX||'c++',['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-I'+path.join(repo,'include'),path.join(repo,'scripts/internal/recording_latency_trace_smoke.cpp'),'-o',binary],{encoding:'utf8',timeout:30000});if(r.status)console.error(r.stderr);assert.equal(r.status,0);});
after(()=>{let bytes=0;function size(p){const s=fs.lstatSync(p);if(s.isDirectory())for(const name of fs.readdirSync(p))size(path.join(p,name));else bytes+=s.size;}size(root);fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));console.log('[cleanup] '+JSON.stringify({root,bytes,removed:true}));});
function run(mode,env='1'){const r=spawnSync(binary,[mode],{encoding:'utf8',timeout:15000,maxBuffer:3*1024*1024,env:{PATH:process.env.PATH,...(env===null?{}:{MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:env})}});assert.equal(r.status,0,r.stderr);assert.equal(r.stderr,'');const c=trace.createLatencyTraceCollector();c.append(r.stdout);return {raw:r.stdout,result:c.finish()};}
const row=()=>({k:0,o:1,s:1,l:300,m:1,t:1,r:1,b:10,a:20,e:30,n:1,w:10,h:10,x:10,y:10});
const line=v=>'[recording-latency] '+JSON.stringify(v)+'\n';
test('LP26-O09-C01 slow-only 초기20000행 생략·마지막64·33KiB 상한',()=>{
  const r=spawnSync(binary,['slow-tail'],{encoding:'utf8',timeout:15000,maxBuffer:3*1024*1024,
    env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY:'1'}});
  assert.equal(r.status,0);assert.equal(r.stdout,'');
  const rows=r.stderr.split('\n').filter(l=>l.startsWith('[recording-latency] ')).map(l=>JSON.parse(l.slice('[recording-latency] '.length)));
  assert.equal(rows.length,64);assert.deepEqual(rows.map(r=>r.l),Array.from({length:64},(_,i)=>i+17));
  assert(Buffer.byteLength(r.stderr)<=64*512+512);assert.match(r.stderr,/\[recording-slow-summary\]/);
});
test('LP26-O09-C03 slow flag만으로 trace 활성화 금지',()=>{
  const r=spawnSync(binary,['slow-tail'],{encoding:'utf8',timeout:15000,env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY:'1'}});
  assert.equal(r.status,0);assert.equal(r.stdout,'');assert.equal(r.stderr,'');
});
test('LP13-T01 collector 존재',()=>assert.equal(typeof trace.createLatencyTraceCollector,'function'));
for(const env of [null,'','0','true','01','1 '])test(`LP13-T01 disabled/invalid ${JSON.stringify(env)} 무출력`,()=>assert.equal(run('contention',env).raw,''));
test('LP13-T02 fast aggregate count/sum/max 정확',()=>{const {result}=run('aggregate');assert.equal(result.status,'complete');const [r]=result.rows;assert.equal(result.rows.length,1);assert.deepEqual([r.k,r.o,r.m,r.n,r.w,r.h,r.x,r.y],[2,1,1,2,15,40,10,30]);});
test('LP13-T04 부분증거 parent/target 실패와 phase누락 미완료',()=>{const c=trace.createLatencyTraceCollector();c.append(line({...row(),k:1,o:2,b:10,a:10,e:30,w:0,h:20,x:0,y:20}));const value=c.finish(1);assert.equal(value.code,'latency-phase-missing');assert.equal(value.status,'incomplete');assert.throws(()=>trace.preserveLatencyEvidence(path.join(root,'missing','evidence.json'),value));const file=path.join(root,'partial.json');trace.preserveLatencyEvidence(file,value);assert.throws(()=>trace.preserveLatencyEvidence(file,value));assert.equal(JSON.parse(fs.readFileSync(file)).status,'incomplete');assert.throws(()=>trace.preserveLatencyEvidence(path.join(root,'unsafe.json'),{...value,raw:'canary'}));assert(!fs.existsSync(path.join(root,'unsafe.json')));});
test('LP13-T02 실제 동일 mutex 경합·다른 mutex·unlock 후 sink',()=>{const {result}=run('contention');assert.equal(result.status,'complete');const locks=result.rows.filter(r=>r.k===0),shared=locks.filter(r=>r.m===locks[0].m);assert.equal(shared.length,2);const owner=shared.find(r=>r.w<1000000),waiter=shared.find(r=>r.w>=1000000);assert(owner&&waiter);assert(owner.a<=waiter.b&&waiter.b<owner.e&&owner.e<=waiter.a);assert(locks.some(r=>r.m!==owner.m));assert(result.rows.some(r=>r.o===6&&r.m===owner.m&&r.t===owner.t));});
for(const [mode,requests] of [['load600',600],['load1800',1800]])test(`LP13-T03 ${requests} poll·15fastlocks/poll·5400worker 합성 예산`,()=>{const {raw,result}=run(mode);assert.equal(result.status,'complete');const client=trace.createLatencyTraceCollector();client.append(raw);assert.equal(client.finish(requests).status,'complete');const total=result.rows.filter(r=>r.o===1).reduce((n,r)=>n+r.n,0);assert.equal(total,requests*16+5400);assert(result.rows.length<=16384);assert(Buffer.byteLength(raw)<2*1024*1024);console.log('[load] '+JSON.stringify({requests,locks:total,rows:result.rows.length,bytes:Buffer.byteLength(raw),sha256:crypto.createHash('sha256').update(raw).digest('hex')}));});
for(const mode of ['tls-cap','cap'])test(`LP13-T03 ${mode} 손실 명시`,()=>{const {result}=run(mode);assert.equal(result.status,'incomplete');assert.equal(result.code,'latency-dropped');assert(result.rows.some(r=>r.k===3));});
test('LP13-T04 split·safe부분보존·순번누락',()=>{const c=trace.createLatencyTraceCollector(),text=line(row());c.append(text.slice(0,7));c.append(text.slice(7));assert.equal(c.finish().acceptedCount,1);assert.equal(c.finish(1).code,'latency-request-missing');const d=trace.createLatencyTraceCollector();d.append(text+line({...row(),raw:'secret-canary'}));assert.equal(d.finish().code,'latency-invalid');assert.deepEqual(d.finish().rows,[row()]);assert(!JSON.stringify(d.finish()).includes('canary'));const file=path.join(root,'safe.json');trace.preserveLatencyEvidence(file,d.finish());assert.equal(fs.statSync(file).mode&0o777,0o600);assert.throws(()=>trace.preserveLatencyEvidence(file,d.finish()));assert.deepEqual(JSON.parse(fs.readFileSync(file)).rows,[row()]);});
for(const mode of ['enum','numeric','time','count','linecap','incomplete'])test(`LP13-T04 ${mode} 거부`,()=>{const c=trace.createLatencyTraceCollector(),v=row();if(mode==='enum')v.o=11;if(mode==='numeric')v.b=Infinity;if(mode==='time')v.e=9;if(mode==='count')v.n=2;c.append(mode==='linecap'?'[recording-latency] '+ 'x'.repeat(600)+'\n':mode==='incomplete'?line(v).slice(0,-1):line(v));assert.equal(c.finish().status,'incomplete');});
test('LP13-T05 cost instrumentation 신규wrapper 단일치환·trace중복거부',()=>{
  const output=fs.mkdtempSync(path.join(root,'media-server-catalog-cost.'));
  const env={PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'0'};
  const source=fs.readFileSync(path.join(repo,'src/recording/recording_catalog.cpp'),'utf8');
  const wrapper='recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__);';
  const occurrences=(text,literal)=>text.split(literal).length-1,n=occurrences(source,wrapper);
  assert(n>0);assert.equal(occurrences(source,'recording::latency::Lock lock('),n);
  const r=spawnSync(process.execPath,[path.join(repo,'scripts/internal/recording_catalog_cost_probe_instrument.cjs'),repo,output],{env,encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
  const instrumented=fs.readFileSync(path.join(output,'recording_catalog.cpp'),'utf8');
  const wait='fc::Measure("catalog.lock.wait",[&]{lock.lock();});',hold='fc::Scope fc_hold("catalog.lock.hold");';
  const pair='std::unique_lock<std::mutex> lock(mu_,std::defer_lock);'+wait+hold;
  const exact=text=>{assert.equal(occurrences(text,'recording::latency::Lock lock('),0);assert.equal(occurrences(text,pair),n);assert.equal(occurrences(text,'catalog.lock.wait'),n);assert.equal(occurrences(text,'catalog.lock.hold'),n);};
  exact(instrumented);
  assert.throws(()=>exact(instrumented.replace(pair,'')));
  assert.throws(()=>exact(instrumented.replace(pair,pair+pair)));
  assert.throws(()=>exact(instrumented.replace(hold,'')));
  console.log('[wrapper-pairs] '+JSON.stringify({input:n,pairs:occurrences(instrumented,pair),wait:occurrences(instrumented,wait),hold:occurrences(instrumented,hold),remaining:0}));
  const duplicate=spawnSync(process.execPath,[path.join(repo,'scripts/internal/recording_catalog_cost_probe_instrument.cjs'),repo,output],{env:{...env,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1'},encoding:'utf8',timeout:10000});assert.equal(duplicate.status,1);assert.match(duplicate.stderr,/requires latency trace disabled/);
});
