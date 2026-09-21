// 파일 용도: 녹화 카탈로그 조회 계측의 스레드별 집계와 누락·중복 거부 조건을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateQuery,queryCases} from './recording_catalog_query_guard.mjs';
function fixture(){const rows=[];for(const stage of ['quiet','overlap']){
 rows.push({kind:'phase',stage,total:32,relevant:2,protected:2,samples:4096,attempts:8,fallbacks:stage==='quiet'?0:3,writes:stage==='quiet'?0:16});
 for(const thread of stage==='quiet'?['reader']:['reader','writer']){const reader=thread==='reader';const costs=[...(reader?[['query.call',8,2400,400]]:[]),['catalog.lock.wait',8,80,20],['catalog.lock.hold',8,800,200],...(reader?[['query.materialize',16,1600,200],['catalog.lock.hold/query.protection',8,400,100]]:[])];
 rows.push({kind:'thread',stage,thread,attempts:reader?8:0,fallbacks:reader&&stage==='overlap'?3:0,writes:reader?0:16,callCount:reader?8:0,wallNs:reader?2400:0,maxCallNs:reader?400:0,waitCount:8,waitNs:80,maxWaitNs:20,holdCount:8,holdNs:800,maxHoldNs:200,offlockCalls:reader?16:0,offlockNs:reader?1600:0,protectionCalls:reader?8:0,protectionNs:reader?400:0,metricRows:costs.length});
 for(const [scope,count,inclusiveNs,maximumNs] of costs)rows.push({kind:'cost',stage,thread,scope,count,inclusiveNs,exclusiveNs:inclusiveNs,maximumNs});
 }}rows.push({kind:'forced',total:32,attempts:1,fallbacks:1,writes:1,timed:false},{kind:'summary',total:32,relevant:2,protected:2,samples:4096,pass:6,fail:0,nativeFileEvidence:true});return rows;}
const encode=rows=>rows.map(r=>'[query] '+JSON.stringify(r)).join('\n')+'\n'+queryCases.map(s=>'[pass] '+s).join('\n');
test('LP21-H01 query thread totals and maxima retain separate ownership',()=>{assert(validateQuery(encode(fixture()),32));const rows=fixture();rows.find(r=>r.kind==='thread'&&r.thread==='reader').maxHoldNs++;assert(!validateQuery(encode(rows),32));});
test('LP21-H02 missing mixed duplicated and artificial timing observations reject',()=>{for(const change of [r=>r.filter(x=>x.kind!=='forced'),r=>[...r,r.find(x=>x.kind==='thread')],r=>{r.find(x=>x.kind==='cost').thread='other';return r;},r=>{r.find(x=>x.kind==='forced').timed=true;return r;},r=>{r.find(x=>x.kind==='phase').attempts=0;return r;},r=>{r.find(x=>x.kind==='summary').nativeFileEvidence=false;return r;}])assert(!validateQuery(encode(change(fixture())),32));});
test('LP21-H03 default sources cost output remains unchanged',()=>{const timer=fs.readFileSync(new URL('./recording_catalog_cost_probe_timer.h',import.meta.url),'utf8');const dump=timer.slice(timer.indexOf('inline void Dump('));assert(!dump.includes('maximum'));assert.match(dump,/inclusive_ns=/);assert.match(dump,/exclusive_ns=/);});
