// 파일 용도: 프로세스별 자원 관측 요약의 입력 및 분리 계약 검사.
import assert from 'node:assert/strict';
import {summarizeRecordingObservations as summarize} from './recording_longrun_summary.mjs';
const started=Date.now();let passed=0,failed=0;
const types=['segment_finalized','event_link_created','observation_put','observation_v2_put','deletion_requested','deletion_completed','corruption_detected'];
function sample(pid,t,rss,n=0){return {pid,startIdentity:`macos:${pid}:1`,sampledAt:t,rssBytes:rss,threadCount:2,fdCount:0,
  mutationCount:n,uniqueMutationIds:n,uniqueEntityIds:n,storedIdCount:2*n,idUtf8Bytes:10*n,
  typeCounts:Object.fromEntries(types.map((x,i)=>[x,i===0?n:0])),journal:{status:'observed',consumedOffset:100*n,partialBytes:0,backlogBytes:0,backlog:false}};}
function check(name,fn){try{fn();passed++;console.log(`[pass] ${name}`);}catch(e){failed++;console.log(`[fail] ${name}`);throw e;}}
try{
  if(process.argv[2]==='--fixture-error')throw Error('fixture-private-detail');
  check('LS01 separate restart PID groups',()=>assert.equal(summarize([sample(1,1,1048576),sample(2,2,2097152)],{warmupMs:0}).groups.length,2));
  const data=[sample(1,1000,1048576,1),sample(1,61000,3145728,2),sample(1,121000,2097152,3),sample(2,122000,10485760,4),sample(2,182000,11534336,5)];
  const summary=summarize(data,{warmupMs:60000}),g=summary.groups[0];
  check('LS01 literal first last max delta elapsed',()=>{assert.equal(g.first.rssBytes,1048576);assert.equal(g.last.rssBytes,2097152);assert.equal(g.max.rssBytes,3145728);assert.equal(g.delta.rssBytes,1048576);assert.equal(g.elapsedMs,120000);});
  check('LS01 postwarmup negative rate literal',()=>{assert.equal(g.postWarmup.status,'observed');assert.equal(g.postWarmup.delta.rssBytes,-1048576);assert.equal(g.postWarmup.elapsedMs,60000);assert.equal(g.postWarmup.rssMiBPerMinute,-1);});
  check('LS01 new PID warmup resets and insufficient null',()=>{const p=summary.groups[1].postWarmup;assert.equal(p.sampleCount,1);assert.equal(p.status,'insufficient');assert.equal(p.delta,null);assert.equal(p.rssMiBPerMinute,null);});
  check('LS01 zero warmup rate separate PIDs',()=>{const s=summarize(data,{warmupMs:0});assert.equal(s.groups[0].postWarmup.rssMiBPerMinute,0.5);assert.equal(s.groups[1].postWarmup.rssMiBPerMinute,1);});
  check('LS03 same PID gap explicitly measured',()=>assert.equal(summarize([sample(1,1,1),sample(1,600001,2)],{warmupMs:0}).groups[0].maxGapMs,600000));
  check('LS03 one sample gap and trend insufficient',()=>{const s=summarize([sample(1,1,1)],{warmupMs:0}).groups[0];assert.equal(s.maxGapMs,null);assert.equal(s.postWarmup.elapsedMs,null);});
  check('LS02 FD zero valid',()=>assert.equal(g.first.fdCount,0));
  check('LS03 no resource or longrun pass',()=>{assert.equal(summary.resourceTrendPass,false);assert.equal(summary.reviewRequired,true);assert.equal('longrunComplete' in summary,false);});
  check('LS03 workload delta not reset by PID',()=>{assert.equal(summary.journalFinal.mutationCount,5);assert.equal(summary.groups[1].workload.first.mutationCount,4);assert.equal(g.workload.delta.mutationCount,2);});
  check('LS03 raw input excluded from output',()=>{const s=sample(1,1,1);s.rawSource='DO-NOT-RETURN';s.payload={secret:'DO-NOT-RETURN'};assert.equal(JSON.stringify(summarize([s],{warmupMs:0})).includes('DO-NOT-RETURN'),false);});
  for(const [name,change] of [['missing-rss',{rssBytes:undefined}],['zero-rss',{rssBytes:0}],['negative-rss',{rssBytes:-1}],['infinite-rss',{rssBytes:Infinity}],['nan-rss',{rssBytes:NaN}],['zero-thread',{threadCount:0}],['negative-fd',{fdCount:-1}],['missing-fd',{fdCount:undefined}],['zero-pid',{pid:0}],['zero-time',{sampledAt:0}],['invalid-identity',{startIdentity:'raw-source-secret'}],['missing-counter',{mutationCount:undefined}],['missing-types',{typeCounts:undefined}],['pending-journal',{journal:{status:'pending'}}]])
    check(`LS02 ${name} rejected`,()=>assert.throws(()=>summarize([{...sample(1,1,1),...change}],{warmupMs:0}),{message:'invalid-observation-summary-input'}));
  check('LS02 duplicate time rejected',()=>assert.throws(()=>summarize([sample(1,1,1),sample(1,1,2)],{warmupMs:0})));
  check('LS02 backward time rejected',()=>assert.throws(()=>summarize([sample(1,2,1),sample(2,1,2)],{warmupMs:0})));
  check('LS02 same PID identity change rejected',()=>assert.throws(()=>summarize([sample(1,1,1),{...sample(1,2,2),startIdentity:'macos:2:2'}],{warmupMs:0})));
  check('LS02 global counters cannot reset at restart',()=>assert.throws(()=>summarize([sample(1,1,1,2),sample(2,2,1,1)],{warmupMs:0})));
  for(const key of [...types,...countersForTest()])
    check(`LS02 cumulative ${key} decrease rejected`,()=>{const a=sample(1,1,1,2),b=sample(2,2,1,2);if(types.includes(key)){a.typeCounts[key]=2;b.typeCounts[key]=1;}else if(key==='consumedOffset')b.journal.consumedOffset=0;else b[key]=0;assert.throws(()=>summarize([a,b],{warmupMs:0}));});
  for(const warmupMs of [undefined,-1,0.5,Infinity])
    check(`LS02 invalid warmup ${String(warmupMs)}`,()=>assert.throws(()=>summarize(data,{warmupMs})));
  check('LS02 empty input rejected',()=>assert.throws(()=>summarize([],{warmupMs:0})));
  check('LS02 10000 samples accepted',()=>assert.equal(summarize(Array.from({length:10000},(_,i)=>sample(1,i+1,1)),{warmupMs:0}).sampleCount,10000));
  check('LS02 over 10000 samples rejected',()=>assert.throws(()=>summarize(Array.from({length:10001},(_,i)=>sample(1,i+1,1)),{warmupMs:0})));
  check('LS02 64 PID groups accepted',()=>assert.equal(summarize(Array.from({length:64},(_,i)=>sample(i+1,i+1,1)),{warmupMs:0}).groups.length,64));
  check('LS02 over 64 groups rejected',()=>assert.throws(()=>summarize(Array.from({length:65},(_,i)=>sample(i+1,i+1,1)),{warmupMs:0})));
}catch{
  if(!failed){failed++;console.log('[fail] LS harness unhandled fixture error');}
}finally{
  if(!failed&&passed!==51){failed++;console.log('[fail] LS harness incomplete case count');}
  console.log(JSON.stringify({passed,failed,elapsedMs:Date.now()-started,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'하위작업별자동집계없음',scope:'synthetic-summary-unit',cleanup:'no-temp-no-child'}));
  process.exitCode=failed?1:0;
}
function countersForTest(){return ['mutationCount','uniqueMutationIds','uniqueEntityIds','storedIdCount','idUtf8Bytes','consumedOffset'];}
