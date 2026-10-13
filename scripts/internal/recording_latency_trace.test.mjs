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
for(const mode of ['enum','numeric','time','count','linecap','incomplete'])test(`LP13-T04 ${mode} 거부`,()=>{const c=trace.createLatencyTraceCollector(),v=row();if(mode==='enum')v.o=14;if(mode==='numeric')v.b=Infinity;if(mode==='time')v.e=9;if(mode==='count')v.n=2;c.append(mode==='linecap'?'[recording-latency] '+ 'x'.repeat(600)+'\n':mode==='incomplete'?line(v).slice(0,-1):line(v));assert.equal(c.finish().status,'incomplete');});
test('LP13-T05 cost instrumentation 신규wrapper 단일치환·trace중복거부',()=>{
  const output=fs.mkdtempSync(path.join(root,'media-server-catalog-cost.'));
  const env={PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'0'};
  const source=fs.readFileSync(path.join(repo,'src/recording/recording_catalog.cpp'),'utf8');
  const wrapper='recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__,false,__func__);';
  const tryWrapper='recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__,std::try_to_lock,__func__);';assert.equal(source.split(tryWrapper).length-1,1);
  const occurrences=(text,literal)=>text.split(literal).length-1,n=occurrences(source,wrapper);
  const named=['RetentionCapture','RetentionCurrent','RetentionDetach'].map(name=>'recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__,false,"'+name+'");');
  for(const literal of named)assert.equal(occurrences(source,literal),1);
  const total=n+1+named.length;assert(n>0);assert.equal(occurrences(source,'recording::latency::Lock lock('),total);
  const r=spawnSync(process.execPath,[path.join(repo,'scripts/internal/recording_catalog_cost_probe_instrument.cjs'),repo,output],{env,encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
  const instrumented=fs.readFileSync(path.join(output,'recording_catalog.cpp'),'utf8');
  const journal=fs.readFileSync(path.join(output,'recording_journal.cpp'),'utf8');

  const pair=wrapper;
  const exact=text=>{assert.equal(occurrences(text,'recording::latency::Lock lock('),total);assert.equal(occurrences(text,pair),n);assert.equal(occurrences(text,'catalog.lock.wait'),0);assert.equal(occurrences(text,'catalog.lock.hold'),0);};
  exact(instrumented);
  assert.throws(()=>exact(instrumented.replace(pair,'')));
  assert.throws(()=>exact(instrumented.replace(pair,pair+pair)));
  assert.match(r.stdout,/lock ownership preserved/);
  for(const scope of ['catalog.OpenLocked','catalog.ReadCatalogReplay','catalog.PreflightV2Locked','catalog.RebuildSqliteLocked','catalog.ReleaseInactiveDetailsLocked'])assert(instrumented.includes('fc_scope("'+scope+'")'));
  for(const scope of ['journal.Open','journal.OpenManagedLocked','journal.LoadManagedStateLocked'])assert(journal.includes('fc_scope("'+scope+'")'));
  console.log('[wrapper-pairs] '+JSON.stringify({input:n,pairs:occurrences(instrumented,pair),lockTiming:"unobserved-cost-copy; use split latency trace",remaining:n}));
  const duplicate=spawnSync(process.execPath,[path.join(repo,'scripts/internal/recording_catalog_cost_probe_instrument.cjs'),repo,output],{env:{...env,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1'},encoding:'utf8',timeout:10000});assert.equal(duplicate.status,1);assert.match(duplicate.stderr,/requires latency trace disabled/);
});

test('MEM82-C01 actual owned release/reacquire and new phase IDs',()=>{const {result}=run('cut-lock');assert.equal(result.status,'complete');for(const op of [11,12,13])assert(result.rows.some(r=>r.o===op));const prepare=result.rows.find(r=>r.o===12);assert.equal(prepare.m,0);assert(result.rows.filter(r=>r.k===0).length>=3);});

// 실제 C++ 요청-local 생성 경로와 최종 parser의 연결. 가짜 summary는 실패 변형에만 사용.
import {visualRequestSummary} from './recording_longrun_progress.mjs';
function visualRun(mode,setting='1') {const r=spawnSync(binary,[mode],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024,env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_VISUAL_REQUEST_TRACE:setting}});assert.equal(r.status,0);return r.stdout+r.stderr;}
test('V430-A01-APP request summary actual producer and late failure',()=>{const raw=visualRun('visual-summary'),v=visualRequestSummary(raw);assert.equal(v.status,'captured');assert.equal(v.rows.length,17);assert.equal(visualRequestSummary(raw.split('\n').filter(l=>!l.includes('\"id\":2,')).join('\n')).status,'incomplete');assert.equal(visualRequestSummary(raw.split('\n').filter(l=>!l.includes('\"id\":17,')).join('\n')).status,'incomplete');assert.equal(v.rows.at(-1).status,503);assert.equal(v.rows.at(-1).code,'visual-source-changed');assert(v.rows.every(r=>r.phases[0][0]===1&&r.counters[1]===3&&r.generation===7));assert.equal(visualRequestSummary(raw.replace('[visual-request-probe] 1','')).status,'incomplete');assert.equal(visualRequestSummary(raw.slice(0,-8)).status,'incomplete');assert.equal(visualRequestSummary(raw+raw.split('\n')[1]+'\n').status,'incomplete');});
for(const mode of ['visual-cap','visual-write'])test('V430-A01-APP '+mode+' collection fails',()=>{assert.equal(visualRequestSummary(visualRun(mode)).status,'incomplete');});
for(const setting of ['0','full','', '1 '])test('V430-A01-APP missing/invalid '+setting,()=>{assert.equal(visualRequestSummary(visualRun('visual-summary',setting)).status,'incomplete');});

test('V430-A01-APP actual holder producer and complete sampled windows',()=>{
 const r=spawnSync(binary,['holder'],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024,env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE:'1',MEDIA_SERVER_VERIFY_VISUAL_REQUEST_TRACE:'1'}});
 assert.equal(r.status,0,r.stderr);const raw=r.stdout+r.stderr,v=trace.catalogHolderSummary(raw);assert.equal(v.status,'captured',v.code);assert.equal(v.rows.length,6);assert(v.windows.every(w=>w.coveredNs>0&&w.unclassifiedNs>=0));assert.equal(trace.catalogHolderSummary(raw.replace(/^\[catalog-holder\].*\n/m,'')).status,'incomplete');assert.equal(trace.catalogHolderSummary(raw.replace(/^\[catalog-holder-end\].*\n/m,'')).status,'incomplete');assert.equal(trace.catalogHolderSummary(raw+raw.split('\n').find(l=>l.startsWith('[catalog-holder]'))+'\n').status,'incomplete');
});
test('V430-A01-APP changing holders, scheduling/unobserved gap and wrong mutex',()=>{
 const rows=[{id:1,m:1,t:2,r:0,l:2,work:3,site:'retention',b:110,a:110,e:140,counts:[1,1,7,70]},{id:2,m:1,t:3,r:0,l:3,work:4,site:'index',b:140,a:150,e:180,counts:[1,1,2,20]},{id:3,m:1,t:1,r:7,l:1,work:1,site:'search',b:100,a:200,e:210,counts:[1,0,0,0]}];
 const end={version:1,records:3,loss:false,inflight:0,endNs:6000000000,widthNs:1000000000,windows:[100,2000000000,4000000000]};
 const format=(rs,e=end)=>rs.map(v=>'[catalog-holder] '+JSON.stringify(v)+'\n').join('')+'[catalog-holder-end] '+JSON.stringify(e)+'\n';
 const v=trace.catalogHolderSummary(format(rows));assert.equal(v.status,'captured');assert.equal(v.windows[0].waitNs,100);assert.equal(v.windows[0].coveredNs,60);assert.equal(v.windows[0].unclassifiedNs,40);
 const different=rows.map(x=>({...x}));different[1].m=2;assert.equal(trace.catalogHolderSummary(format(different)).windows[0].coveredNs,30);
 const overlap=rows.map(x=>({...x}));overlap[1].a=130;overlap[1].b=120;assert.equal(trace.catalogHolderSummary(format(overlap)).code,'holder-overlap');
 for(const change of [{version:2},{loss:true},{inflight:1},{records:2},{windows:[100,2000000000,0]}])assert.equal(trace.catalogHolderSummary(format(rows,{...end,...change})).status,'incomplete');
 assert.equal(trace.catalogHolderSummary(format(rows)+'[catalog-holder-loss] write\n').status,'incomplete');
});

for(const mode of ['holder-whole','holder-projection','holder-overflow'])test('R101-H01 actual whole-request '+mode,()=>{
 const env={PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE:'1',MEDIA_SERVER_VERIFY_VISUAL_REQUEST_TRACE:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS:'1'};
 const r=spawnSync(binary,[mode],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024,env});assert.equal(r.status,0,r.stderr);
 const raw=r.stdout+r.stderr,v=trace.catalogHolderSummary(raw);
 if(mode==='holder-overflow'){assert.equal(v.status,'incomplete');return;}
 assert.equal(v.status,'captured',v.code);assert(v.windows[0].endNs-v.windows[0].beginNs>1000000000);assert(v.windows[0].coveredNs>1000000000);assert.equal(v.rows.length,6);
 if(mode==='holder-projection')assert.equal(v.rows.filter(x=>x.site==='SnapshotTimelineWithContext').length,3);
 const e=v.end;for(const change of [{ends:[0,...e.ends.slice(1)]},{requests:[7,41,77]},{loss:true}]){const bad=raw.replace(/^\[catalog-holder-end\].*$/m,'[catalog-holder-end] '+JSON.stringify({...e,...change}));assert.equal(trace.catalogHolderSummary(bad).status,'incomplete');}
 const invalid=spawnSync(binary,['holder-whole'],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024,env:{...env,MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS:'full'}});assert.equal(trace.catalogHolderSummary(invalid.stdout+invalid.stderr).status,'incomplete');
});

test('R101-H02 overlapping windows only charge their selected waiter',()=>{
 const rows=[{id:1,m:1,t:9,r:0,l:2,work:3,site:'owner',b:100,a:100,e:150,counts:[1,0,0,0]},
 {id:2,m:1,t:1,r:1,l:3,work:1,site:'query',b:110,a:150,e:160,counts:[1,0,0,0]},
 {id:3,m:1,t:2,r:2,l:3,work:1,site:'query',b:120,a:160,e:170,counts:[1,0,0,0]}];
 const end={version:2,records:3,loss:false,inflight:0,endNs:300,requests:[1,2,3],windows:[100,110,200],ends:[180,190,250]};
 const raw=rows.map(r=>'[catalog-holder] '+JSON.stringify(r)+'\n').join('')+'[catalog-holder-end] '+JSON.stringify(end)+'\n';
 const v=trace.catalogHolderSummary(raw);assert.equal(v.status,'captured');assert.deepEqual(v.windows.map(w=>w.waitNs),[40,40,0]);assert.deepEqual(v.windows.map(w=>w.coveredNs),[40,40,0]);
});

test('R101-H03 actual late requests4/5/6 preserve complete intervals',()=>{
 const r=spawnSync(binary,['holder-late'],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024,env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY:'1',MEDIA_SERVER_VERIFY_VISUAL_REQUEST_TRACE:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS:'late'}});
 assert.equal(r.status,0,r.stderr);const v=trace.catalogHolderSummary(r.stdout+r.stderr);assert.equal(v.status,'captured',v.code);assert.deepEqual(v.windows.map(w=>w.selectedRequest),[4,5,6]);assert(v.windows[0].coveredNs>1000000000);assert.equal(v.rows.length,6);
});

test('R103-H01 actual mixed late77/78/79 complete producer and parser',()=>{
 const r=spawnSync(binary,['holder-mixed-late'],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024,env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY:'1',MEDIA_SERVER_VERIFY_VISUAL_REQUEST_TRACE:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS:'mixed-late'}});
 assert.equal(r.status,0,r.stderr);const raw=r.stdout+r.stderr,v=trace.catalogHolderSummary(raw);
 assert.equal(v.status,'captured',v.code);assert.deepEqual(v.windows.map(w=>w.selectedRequest),[77,78,79]);assert(v.windows[0].coveredNs>1000000000);assert.equal(v.rows.length,6);assert.equal(trace.catalogHolderSummary(raw,true,[77,78,79]).status,'captured');assert.equal(trace.catalogHolderSummary(raw,true,[1,2,3]).code,'holder-selection');
 assert.equal(trace.catalogHolderSummary(raw.replace(/^\[catalog-holder\].*\n/m,'')).status,'incomplete');
});

for(const mode of ['early','late','error','concurrent','none','overwrite','tail-cap','inflight','cost'])test('R104-H01 actual steady/mutex slow '+mode,()=>{
 const r=spawnSync(binary,['holder-slow-'+mode],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024,env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY:'1',MEDIA_SERVER_VERIFY_VISUAL_REQUEST_TRACE:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS:'slow-first'}});
 assert.equal(r.status,0,r.stderr);const raw=r.stdout+r.stderr,v=trace.catalogHolderSummary(raw,true,'slow-first');
 if(['overwrite','tail-cap','inflight'].includes(mode)){assert.equal(v.status,'incomplete');return;}
 assert.equal(v.status,'captured',v.code);if(mode==='none'){assert.equal(v.windows.length,0);assert.equal(v.selection,'no-completed-slow-request');for(const endNs of [undefined,-1,'bad']){const bad=raw.replace(/^\[catalog-holder-end\].*$/m,'[catalog-holder-end] '+JSON.stringify({...v.end,endNs}));assert.equal(trace.catalogHolderSummary(bad,true,'slow-first').status,'incomplete');}return;}assert.equal(v.windows.length,1);if(mode==='concurrent')assert([91,92].includes(v.windows[0].selectedRequest));else assert.equal(v.windows[0].selectedRequest,mode==='early'?3:91);
 assert(v.windows[0].coveredNs>=2000000000);const spanning=v.rows.find(x=>x.site==='spanning');assert(spanning.a<v.end.begin&&spanning.e>v.end.end);
 if(mode==='cost')assert.deepEqual(v.rows.find(x=>x.site==='RetentionChannel').counts,[101,202,303,404]);assert(v.end.overwrittenEndNs<=v.end.begin);assert.equal(trace.catalogHolderSummary(raw,true,[77,78,79]).status,'incomplete');
 for(const text of [raw.replace(/^\[catalog-holder\].*\n/m,''),raw.replace(/^\[visual-request-end\].*\n/m,''),raw.replace('"loss":false','"loss":true')])assert.equal(trace.catalogHolderSummary(text,true,'slow-first').status,'incomplete');
});

test('R107-H01 optional subcost basis and per-request fields fail closed',()=>{
 const r=spawnSync(binary,['holder-whole'],{encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024,env:{PATH:process.env.PATH,
 MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'1',MEDIA_SERVER_VERIFY_CATALOG_HOLDER_TRACE:'1',MEDIA_SERVER_VERIFY_VISUAL_REQUEST_TRACE:'1',
 MEDIA_SERVER_VERIFY_CATALOG_HOLDER_WHOLE_REQUESTS:'1',MEDIA_SERVER_VERIFY_CATALOG_SUBCOSTS:'1'}});
 assert.equal(r.status,0,r.stderr);const raw=r.stdout+r.stderr,basis='journal-wait,managed-authority,identity-lookup,cold-read-inclusive';
 const holder=trace.catalogHolderSummary(raw,true,[1,2,3],basis);if(holder.status!=='captured')console.error('[R107-failure-raw] '+JSON.stringify(raw));assert.equal(holder.status,'captured',holder.code);
 const summary=visualRequestSummary(raw,true,true);assert.equal(summary.status,'captured',summary.reason);
 assert.equal(trace.catalogHolderSummary(raw.replace(/^\[catalog-subcost-basis\].*\n/m,''),true,[1,2,3],basis).status,'incomplete');
 assert.equal(visualRequestSummary(raw.replace(/,"journalCostNs":\[[^\]]*\]/g,''),true,true).status,'incomplete');
 assert.equal(visualRequestSummary(raw.replace(/"journalCostNs":\[[^\]]*\]/,'"journalCostNs":[0,0,0,-1]'),true,true).status,'incomplete');
});
