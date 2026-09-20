import test from 'node:test';
import assert from 'node:assert/strict';
import {allTimelinePages} from './recording_current_app_helpers.mjs';
import {latencyTransitionOutputs} from './recording_current_app_helpers.mjs';
import {createTimelineObservation,observeTransitionWait,boundedUntil} from './recording_completion_trace.mjs';
const page=(offset=0,total=1,state='ready')=>({total,unplacedTotal:0,offset,limit:1,truncated:false,items:[{itemId:`i${offset}`,jobState:state}],unplacedItems:[]});
test('LP22-O01 optional page observation preserves values and captures every page',async()=>{
  const fetch=async offset=>page(offset,2,offset?'complete':'ready'),rows=[];
  const expected=await allTimelinePages(fetch,{limit:1});
  const actual=await allTimelinePages(fetch,{limit:1,observe:x=>rows.push(x)});
  assert.deepEqual(actual,expected);assert.deepEqual(rows.map(x=>x.kind),['page','page','complete']);
  assert.deepEqual(rows.filter(x=>x.kind==='page').map(x=>x.offset),[0,1]);
});
test('LP22-O02 callback exceptions do not replace original page failure',async()=>{
  const original=Error('first-failure');let calls=0;
  await assert.rejects(allTimelinePages(async()=>{throw original;},{observe:()=>{calls++;throw Error('observer');}}),e=>e===original);
  assert.equal(calls,1);assert.deepEqual(await allTimelinePages(async()=>page(),{limit:1,observe:()=>{throw Error('observer');}}),await allTimelinePages(async()=>page(),{limit:1}));
});
test('LP22-O03 same total ready complete mixture retains individual page states',async()=>{
  let now=100;const rows=[],o=createTimelineObservation({now:()=>now,reference:()=> 'ref',report:x=>rows.push(x)}),c=o.begin(1);
  const value=await allTimelinePages(async offset=>{now+=25;c.ordinal(offset+1);const p=page(offset,2,offset?'complete':'ready');Object.assign(p.items[0],{referenceId:'ref',eventId:'event',kind:'event'});return p;},{limit:1,observe:c.observe});
  assert.equal(latencyTransitionOutputs(value,'event','ref'),null);
  assert.equal(rows[0].states.ready,1);assert.equal(rows[1].states.complete,1);assert.equal(rows[2].mixedStates,true);assert.equal(rows[2].totalChanged,false);assert.equal(rows[2].elapsedMs,50);assert.equal(rows[1].timelineOrdinal,2);
});
test('LP22-O04 changed totals fail then a fresh cycle fetches every page again',async()=>{
  const o=createTimelineObservation(),calls=[];let c=o.begin(1);
  await assert.rejects(allTimelinePages(async offset=>{calls.push(offset);return page(offset,offset?3:2);},{limit:1,observe:c.observe}),/page-total-changed/);
  c=o.begin(1);await allTimelinePages(async offset=>{calls.push(offset);return page(offset,2);},{limit:1,observe:c.observe});
  assert.deepEqual(calls,[0,1,0,1]);assert.equal(o.status().summaries[0].totalChanged,true);assert.equal(o.status().summaries[1].kind,'complete');assert.equal(o.status().cycles,2);
});
test('LP22-O05 late complete observation cannot erase the original transition timeout',async()=>{
  let now=0,ordinal=0;const rows=[];
  const p=page();Object.assign(p.items[0],{referenceId:'ref',eventId:'event',kind:'event',jobState:'ready',jobId:'job',segmentId:'out',playbackUrl:'/ops/api/recordings/media/out',catalogState:'finalized',playable:true});
  let first;
  try{await observeTransitionWait(()=>boundedUntil('latency-transition',async()=>{ordinal++;now=29999;return latencyTransitionOutputs(p,'event','ref');},{now:()=>now,deadline:180000,pause:async ms=>{now+=ms;},budget:()=>{}}),{now:()=>now,ordinal:()=>ordinal,report:x=>rows.push(x)});}catch(error){first=error;}
  assert.equal(first?.message,'latency-transition-timeout');assert.equal(rows.at(-1).outcome,'timeout');assert.equal(rows.at(-1).firstTimelineOrdinal,1);assert.equal(rows.at(-1).lastTimelineOrdinal,1);
  p.items[0].jobState='complete';assert.equal(latencyTransitionOutputs(p,'event','ref').length,1);
  assert.equal(rows.at(-1).outcome,'timeout');assert.equal(first.message,'latency-transition-timeout');
});
test('LP22-O04 wait keeps late successful return and reports its client deadline overrun',async()=>{
  let now=0,ordinal=4;const rows=[],value={complete:true};
  const result=await observeTransitionWait(()=>boundedUntil('wait',async()=>{ordinal++;now=30001;return value;},{now:()=>now,deadline:180000,pause:async()=>{},budget:()=>{}}),{now:()=>now,ordinal:()=>ordinal,report:x=>rows.push(x)});
  assert.equal(result,value);assert.equal(rows.at(-1).outcome,'complete');assert.equal(rows.at(-1).returnedAfterBudget,true);assert.equal(rows.at(-1).elapsedMs,30001);assert.equal(rows.at(-1).firstTimelineOrdinal,5);
});
test('LP22-O06 diagnostic report failure remains explicit without hiding primary error',async()=>{
  const original=Error('primary');const o=createTimelineObservation({report:()=>{throw Error('diagnostic');}}),c=o.begin(1);
  await assert.rejects(allTimelinePages(async()=>{throw original;},{observe:c.observe}),e=>e===original);
  assert.equal(o.status().invalid,1);assert.equal(o.status().summaries[0].kind,'failure');
});
