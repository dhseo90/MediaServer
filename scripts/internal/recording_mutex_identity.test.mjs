// V450-MUTEX-LIFETIME-01: 실제 RAII/고정 registry 및 기존 collector의 손실 거부.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createLatencyTraceCollector,catalogHolderSummary} from './recording_latency_trace.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'recording-mutex-identity-'));
const binary=path.join(root,'smoke');
const build=spawnSync(process.env.CXX||'c++',['-std=c++17','-O2','-Wall','-Wextra','-Werror','-pthread','-I'+path.join(repo,'include'),path.join(repo,'scripts/internal/recording_mutex_identity_smoke.cpp'),'-o',binary],{encoding:'utf8',timeout:30000});
assert.equal(build.status,0,build.stderr);
process.on('exit',()=>{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));console.log('[cleanup] '+JSON.stringify({root,removed:true}));});
function run(mode,enabled=true){
 const r=spawnSync(binary,[mode],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024,env:{PATH:process.env.PATH,MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:enabled?'1':'0'}});
 assert.equal(r.status,0,r.stderr);assert.equal(r.stderr,'');
 const c=createLatencyTraceCollector();for(let i=0;i<r.stdout.length;i+=23)c.append(r.stdout.slice(i,i+23));
 const result=c.finish();const rawRows=r.stdout.split('\n').filter(l=>l.startsWith('[recording-latency] ')).map(l=>JSON.parse(l.slice(20)));
 const line=r.stdout.split('\n').find(l=>l.startsWith('[recording-mutex-summary] '));
 return {raw:r.stdout,result,rows:rawRows,summary:line?JSON.parse(line.slice(26)):null};
}
for(const n of [127,128])test(`active ${n} identities`,()=>{const v=run(String(n));assert.equal(v.result.status,'complete');assert.equal(v.rows.length,n);assert.equal(new Set(v.rows.map(x=>x.m)).size,n);assert.deepEqual(v.summary,{capacity:128,registered:n,active:0,peak:n,lossCount:0});});
test('129 sequential releases reuse bounded slots with distinct lifetime IDs',()=>{const v=run('sequential');assert.equal(v.result.status,'complete');assert.equal(v.rows.length,129);assert.equal(new Set(v.rows.map(x=>x.m)).size,129);assert.equal(v.summary.peak,1);assert.equal(v.summary.lossCount,0);});
test('129 active is explicit capacity loss and rejected by collector',()=>{const v=run('129');assert.equal(v.result.status,'incomplete');assert(v.rows.some(x=>x.k===3));assert.equal(v.summary.registered,128);assert.equal(v.summary.peak,128);assert.equal(v.summary.lossCount,2);});
test('same address distinct lifetimes survive destruction before final flush',()=>{const v=run('reuse-buffered');assert.equal(v.result.status,'complete');assert.equal(v.rows.length,2);assert(v.rows.every(x=>x.k===2&&x.r===7));assert.equal(new Set(v.rows.map(x=>x.m)).size,2);assert.equal(v.summary.active,0);});
test('parallel registration release and collection preserve 128 distinct lifetimes',()=>{const v=run('concurrent');assert.equal(v.result.status,'complete');assert.equal(v.rows.length,128);assert.equal(new Set(v.rows.map(x=>x.m)).size,128);assert.equal(new Set(v.rows.map(x=>x.t)).size,8);assert.equal(v.summary.lossCount,0);assert(v.summary.peak<=8);});
test('multiple threads on one live mutex share one lifetime token',()=>{const v=run('shared');assert.equal(v.result.status,'complete');assert.equal(v.rows.length,64);assert.equal(new Set(v.rows.map(x=>x.m)).size,1);assert.equal(new Set(v.rows.map(x=>x.t)).size,8);});
test('disabled does not allocate registry identities or emit output',()=>{const v=run('disabled',false);assert.equal(v.raw,'');assert.equal(v.result.status,'complete');});
test('missing owner registration reports loss',()=>{const v=run('unregistered');assert.equal(v.result.status,'incomplete');assert.equal(v.summary.lossCount,1);});
test('identity exhaustion saturates instead of wrapping or aliasing',()=>{const v=run('exhaustion');assert.equal(v.result.status,'incomplete');assert.equal(v.rows[0].m,4294967294);assert.equal(v.summary.registered,1);assert.equal(v.summary.lossCount,2);});
test('summary loss, active leak, duplicate and partial terminals are rejected',()=>{const v=run('128');for(const raw of [v.raw.replace('"lossCount":0','"lossCount":1'),v.raw.replace('"active":0','"active":1'),v.raw+v.raw.split('\n').find(x=>x.startsWith('[recording-mutex-summary]'))+'\n',v.raw.slice(0,-2)]){const c=createLatencyTraceCollector();c.append(raw);assert.equal(c.finish().status,'incomplete');}});
test('holder parser accepts lifetime IDs beyond capacity and refuses loss',()=>{const row={id:1,m:129,t:1,r:1,l:1,work:0,site:'test',b:1,a:2,e:3,counts:[0,0,0,0]};const end={version:2,records:1,loss:false,inflight:0,endNs:10,requests:[1,2,3],windows:[1,4,7],ends:[3,6,9]};const raw='[catalog-holder] '+JSON.stringify(row)+'\n[catalog-holder-end] '+JSON.stringify(end)+'\n';assert.equal(catalogHolderSummary(raw,true,[1,2,3]).status,'captured');assert.equal(catalogHolderSummary(raw.replace('"loss":false','"loss":true'),true,[1,2,3]).status,'incomplete');});

test('release at capacity admits a fresh lifetime without removing other owners',()=>{const v=run('release-at-capacity');assert.equal(v.result.status,'complete');assert.equal(v.rows.length,129);assert.equal(new Set(v.rows.map(x=>x.m)).size,129);assert.equal(v.summary.registered,129);assert.equal(v.summary.peak,128);});
test('duplicate owner misuse is explicit loss while original identity remains valid',()=>{const v=run('duplicate-owner');assert.equal(v.result.status,'incomplete');assert.equal(v.summary.registered,1);assert.equal(v.summary.lossCount,1);assert.equal(v.rows[0].m,1);});
test('oversized summary cannot hide diagnostic loss',()=>{const c=createLatencyTraceCollector();c.append('[recording-mutex-summary] '+ ' '.repeat(600)+'\n');assert.equal(c.finish().code,'latency-line-cap');});
