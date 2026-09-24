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
