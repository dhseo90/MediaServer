// 파일 용도: LP26-O10의 규모·독립계수·회전 oracle 경계. 실제 부하 테스트가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
const plan=await import('./recording_accumulation_plan.mjs').catch(()=>({}));
test('LP26-O10-A01 4N 독립 규모와 최대 bound',()=>{
  assert.equal(typeof plan.casePlan,'function');
  assert.deepEqual(plan.casePlan().map(x=>[x.sources,x.records]),[[16,64],[1020,4080],[2048,8192],[2049,8196]]);
});
test('O28-C01 2048 CLI·receipt 허용과 unknown case 거부가 정적으로 연결',async()=>{
  const fs=await import('node:fs'),run=fs.readFileSync(new URL('./recording_accumulation_run.mjs',import.meta.url),'utf8'),wrapper=fs.readFileSync(new URL('./verify_recording_accumulation_probe.sh',import.meta.url),'utf8'),native=fs.readFileSync(new URL('./recording_accumulation_probe.cpp',import.meta.url),'utf8');
  for(const source of [run,wrapper,native])assert(source.includes('2048'));
  assert(wrapper.includes('16|1020|2048|2049'));assert(native.includes('count==2048'));assert(native.includes('\\"cachePhaseInstrumented\\":true,\\"releasePhaseInstrumented\\":true'));assert(!run.includes("['16','1020','2049']"));
});
test('LP26-O10-B01 정확한 네 type·count·partial/backlog oracle',()=>{
  assert.equal(typeof plan.assertDrain,'function');const value={mutationCount:64,partialBytes:0,backlog:false,typeCounts:{recording_order_reserved:16,segment_v2_bound_finalized:16,segment_v2_state:16,segment_v2_deleted:16}};
  plan.assertDrain(value,16);
  for(const invalid of [{...value,mutationCount:63},{...value,partialBytes:1},{...value,backlog:true},{...value,typeCounts:{...value.typeCounts,segment_v2_deleted:15}}])assert.throws(()=>plan.assertDrain(invalid,16));
});
test('LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle',()=>{
  assert.equal(typeof plan.assertRotation,'function');plan.assertRotation({fresh:0,rotations:1});
  for(const value of [{fresh:1,rotations:1},{fresh:0,rotations:0}])assert.throws(()=>plan.assertRotation(value));
});
test('LP26-O10-F01 복구·checkpoint별15초 독립 경계와 정확한 순서',()=>{
  const events=[],tracker=plan.stageTracker(e=>events.push(e));
  for(const stage of ['recovery','timeline-projection','cold-binding','checkpoint-cold','checkpoint-repeat']){
    tracker.line('[probe-stage] '+stage+' begin');tracker.line('[probe-wall] '+JSON.stringify({stage,elapsedUs:15000000,ok:true}));
  }
  tracker.finish();assert.equal(events.length,10);
  const over=plan.stageTracker(()=>{});over.line('[probe-stage] recovery begin');
  assert.throws(()=>over.line('[probe-wall] '+JSON.stringify({stage:'recovery',elapsedUs:15000001,ok:true})),/stage-time-cap/);
  assert.throws(()=>plan.stageTracker(()=>{}).line('[probe-stage] checkpoint-repeat begin'),/stage-sequence/);
  assert.throws(()=>plan.stageTracker(()=>{}).line('[probe-wall] '+JSON.stringify({stage:null,elapsedUs:1,ok:true})),/stage-wall/);
  assert.throws(()=>plan.stageTracker(()=>{}).finish(),/stage-incomplete/);
});
test('O28-M01 ownership 수명 단계는 별도 allowlist와 동일 15초 경계를 쓴다',()=>{
  assert.equal(typeof plan.ownershipStageTracker,'function');
  const stages=['ownership-open','ownership-timeline','ownership-acquire','ownership-release','ownership-checkpoint'];
  const tracker=plan.ownershipStageTracker(()=>{});
  for(const stage of stages){tracker.line('[probe-stage] '+stage+' begin');tracker.line('[probe-wall] '+JSON.stringify({stage,elapsedUs:15000000,ok:true}));}
  tracker.finish();
  const reopen=plan.ownershipStageTracker(()=>{},true);reopen.line('[probe-stage] ownership-reopen begin');reopen.line('[probe-wall] '+JSON.stringify({stage:'ownership-reopen',elapsedUs:1,ok:true}));reopen.finish();
  const wrong=plan.ownershipStageTracker(()=>{});assert.throws(()=>wrong.line('[probe-stage] recovery begin'),/stage-sequence/);
});
test('O28-M01/M02 ownership CLI·collector·receipt 연결은 최대8 reader와 내용 oracle을 고정한다',async()=>{
  const fs=await import('node:fs'),native=fs.readFileSync(new URL('./recording_accumulation_probe.cpp',import.meta.url),'utf8'),run=fs.readFileSync(new URL('./recording_accumulation_run.mjs',import.meta.url),'utf8'),wrapper=fs.readFileSync(new URL('./verify_recording_accumulation_probe.sh',import.meta.url),'utf8');
  assert(wrapper.includes('--ownership-case'));assert(run.includes("args[0]==='--ownership'"));assert(native.includes('void Ownership('));
  assert(wrapper.includes('ownership_flags=(-DMEDIA_SERVER_ACCUMULATION_COST=1)'));assert(wrapper.includes('ownership_flags=(-DMEDIA_SERVER_ACCUMULATION_OWNERSHIP=1)'));
  assert(native.includes('std::min<unsigned>(count,8U)'));assert(native.includes('SerializeRecordingSourceBindingV1'));
  assert(native.includes('sameObject'));assert(!native.includes('Need(sameObject'));
  assert(run.includes("['--ownership',dir,String(sources)]"));
});
test('O28-M02 31열 owner와 fresh-process fingerprint collector가 손실·불일치를 거부한다',()=>{
  const feed=(collector,line)=>collector.line(line+'\n'.slice(1));
  const packed=(stage,owner)=>'[lp17] '+JSON.stringify({kind:'owner-packed',version:1,stage,owner,values:Array(31).fill(0)});
  const memory=stage=>'[lp17] '+JSON.stringify({kind:'memory',stage,sources:16,currentRssBytes:1,peakRssBytes:2});
  const stages=['pre-checkpoint','handles-held','handles-released','requery-released','post-checkpoint','fresh-reopen'],hash='a'.repeat(64);
  const complete=({skipMemory=null,skipOwner=null,initial={},fresh={}}={})=>{const collector=plan.ownershipCollector(16);for(const stage of stages){if(stage!==skipMemory)feed(collector,memory(stage));for(const owner of ['journal','live','shadow','prefix'])if(stage+':'+owner!==skipOwner)feed(collector,packed(stage,owner));}feed(collector,packed('snapshot-held','snapshot'));feed(collector,packed('snapshot-released','snapshot'));
    feed(collector,'[ownership-lifecycle] '+JSON.stringify({sources:16,readers:8,samplesPerBinding:60,mediaFiles:0,sameObject:8,heldDistinctObjects:8,expiredWeak:16,bindingSha256:hash,serializedEqual:true,deleted:true,snapshotReleased:true,handlesReleased:true,wholeHeapAttributed:false,rssLeakProven:false,...initial}));feed(collector,'[ownership-reopen] '+JSON.stringify({sources:16,readers:8,samplesPerBinding:60,bindingSha256:hash,serializedEqual:true,deleted:true,...fresh}));return collector;};
  const collector=complete();
  assert.equal(collector.finish().owners.length,26);
  assert.equal(complete({initial:{sameObject:0,heldDistinctObjects:16}}).finish().initial.heldDistinctObjects,16);
  assert.throws(()=>complete({skipMemory:'handles-released'}).finish(),/ownership-memory-missing/);
  assert.throws(()=>complete({skipOwner:'post-checkpoint:shadow'}).finish(),/ownership-owner-missing/);
  assert.throws(()=>complete({fresh:{bindingSha256:'b'.repeat(64)}}).finish(),/ownership-lifecycle/);
  assert.throws(()=>complete({initial:{heldDistinctObjects:9}}).finish(),/ownership-lifecycle/);
  assert.throws(()=>plan.ownershipCollector(16).line(packed('unknown','live')),/ownership-owner/);
});
