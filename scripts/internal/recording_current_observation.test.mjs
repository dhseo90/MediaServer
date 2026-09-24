// 파일 용도: 녹화 타임라인 페이지 수집과 독립 완료 관측의 검증·오류 전파 경계를 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {allTimelinePages} from './recording_current_app_helpers.mjs';
import {latencyTransitionOutputs} from './recording_current_app_helpers.mjs';
import * as helpers from './recording_current_app_helpers.mjs';
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
test('LP26-O19 strict actual-app gate rejects late successful page return without losing observation',async()=>{
  let now=0,ordinal=4;const rows=[];
  await assert.rejects(observeTransitionWait(()=>boundedUntil('complete-two-outputs',async()=>{
    ordinal++;now=30001;return [{segmentId:'out'}];
  },{now:()=>now,deadline:180000,pause:async()=>{},budget:()=>{}}),
  {now:()=>now,ordinal:()=>ordinal,report:x=>rows.push(x),strictDeadline:true,timeoutLabel:'complete-two-outputs'}),/complete-two-outputs-timeout/);
  assert.equal(rows.at(-1).outcome,'timeout');assert.equal(rows.at(-1).returnedAfterBudget,true);
  assert.equal(rows.at(-1).elapsedMs,30001);assert.equal(rows.at(-1).firstTimelineOrdinal,5);
});
test('LP26-O20-A page bounds report exact fixed code and safe counts, distinct from O18 timeout',async()=>{
  const cases=[
    ['page-bound-top-limit',()=>({...page(),total:3,unplacedTotal:0}),{maxItems:2},d=>assert.deepEqual(d,{topLevel:3,maxItems:2})],
    ['page-bound-offset-limit',()=>({...page(),offset:1}),{},d=>assert.deepEqual(d,{expectedOffset:0,observedOffset:1,expectedLimit:1,observedLimit:1})],
    ['page-bound-leaf-limit',()=>({...page(),items:[{itemId:'group',rangeBasis:'file-group',members:[{itemId:'m1'},{itemId:'m2'}]}]}),{maxItems:1},d=>assert.deepEqual(d,{leaves:2,maxItems:1})]
  ];
  for(const [code,make,options,diagnostic] of cases){const observed=[];
    await assert.rejects(allTimelinePages(async()=>make(),{limit:1,...options,observe:value=>observed.push(value)}),error=>error.code===code&&error.message===code);
    assert.equal(observed.at(-1).kind,'failure');assert.equal(observed.at(-1).code,code);diagnostic(observed.at(-1).details);
  }
  let now=0;
  await assert.rejects(observeTransitionWait(()=>boundedUntil('complete-two-outputs',async()=>{now=30001;return false;},
    {now:()=>now,deadline:180000,pause:async()=>{},budget:()=>{}}),
    {now:()=>now,ordinal:()=>1,strictDeadline:true,timeoutLabel:'complete-two-outputs'}),error=>error.message==='complete-two-outputs-timeout'&&!error.code);
});
test('LP22-O06 diagnostic report failure remains explicit without hiding primary error',async()=>{
  const original=Error('primary');const o=createTimelineObservation({report:()=>{throw Error('diagnostic');}}),c=o.begin(1);
  await assert.rejects(allTimelinePages(async()=>{throw original;},{observe:c.observe}),e=>e===original);
  assert.equal(o.status().invalid,1);assert.equal(o.status().summaries[0].kind,'failure');
});
const terminalRow=(id,state='complete')=>({itemId:id,kind:'event',eventId:'event',referenceId:'ref',jobId:'job',jobState:state,
  segmentId:id,catalogState:'finalized',playable:true,playbackUrl:`/ops/api/recordings/media/${id}`,completeness:'complete'});
const terminalPage=(offset,total,row)=>({...page(offset,total),items:[row]});
function terminalObservation(options={}){
  assert.equal(typeof helpers.createTerminalObservation,'function','LP25 strict terminal observation helper must exist');
  return helpers.createTerminalObservation('event','ref',options);
}
test('LP25-O01 complete page survives later total change while full collection fails',async()=>{
  let now=10;const observation=terminalObservation({now:()=>now});
  await assert.rejects(allTimelinePages(async offset=>{now+=10;return terminalPage(offset,offset?3:2,terminalRow(`out${offset}`));},
    {limit:1,consumePage:observation.consume}),/page-total-changed/);
  assert.equal(observation.status().terminalObserved,true);assert.equal(observation.status().firstObservedMs,20);
  assert.equal(observation.status().firstPageOffset,0);assert.equal(observation.status().fullOutputPass,false);
  assert.equal(observation.outputs().length,2);
});
test('LP25-O01 changed page is independently validated and observed before total mismatch',async()=>{
  const observation=terminalObservation();
  await assert.rejects(allTimelinePages(async offset=>terminalPage(offset,offset?3:2,terminalRow(`out${offset}`,offset?'complete':'ready')),
    {limit:1,consumePage:observation.consume}),/page-total-changed/);
  assert.equal(observation.status().terminalObserved,true);assert.equal(observation.status().firstPageOffset,1);
});
for(const changed of [false,true])test(`LP25-O01 cross-page duplicate ${changed?'with total change retains retry reason':'with stable total remains fatal'}`,async()=>{
  const observation=terminalObservation();
  await assert.rejects(allTimelinePages(async offset=>terminalPage(offset,changed&&offset?3:2,terminalRow('same')),
    {limit:1,consumePage:observation.consume}),changed?/page-total-changed/:/duplicate-item/);
  assert.equal(observation.status().terminalObserved,true);
});
test('LP25-O02 ready complete mixture is observed but never promoted to complete full page',async()=>{
  const observation=terminalObservation();
  const value=await allTimelinePages(async offset=>terminalPage(offset,2,terminalRow(`out${offset}`,offset?'complete':'ready')),
    {limit:1,consumePage:observation.consume});
  assert.equal(observation.status().terminalObserved,true);assert.equal(observation.status().mixedStates,true);
  assert.equal(latencyTransitionOutputs(value,'event','ref'),null);
  assert.throws(()=>helpers.eventOutputs(value,'event','ref'),/event-not-complete/);
});
test('LP25-O02 strict consumer exceptions propagate independently of swallowed diagnostic errors',async()=>{
  const error=Error('strict-failure');let consumed=0;
  await assert.rejects(allTimelinePages(async()=>page(),{limit:1,observe:()=>{throw Error('diagnostic');},consumePage:()=>{consumed++;throw error;}}),e=>e===error);
  assert.equal(consumed,1);
});
for(const [name,change,code] of [
  ['reference',{referenceId:'another'},'latency-lineage'],['job',{jobId:'another'},'latency-lineage'],
  ['state',{jobState:'unrecognized'},'latency-state'],
  ['failed',{jobState:'failed'},'latency-job-failed'],['media',{playbackUrl:'/wrong'},'latency-media']
])test(`LP25-O02 ${name} conflict after complete cannot disappear behind prior terminal observation`,async()=>{
  const observation=terminalObservation();
  await assert.rejects(allTimelinePages(async offset=>terminalPage(offset,2,{...terminalRow(`out${offset}`),...(offset?change:{})}),
    {limit:1,consumePage:observation.consume}),new RegExp(code));
  assert.equal(observation.status().terminalObserved,true);
});
test('LP25-O03 complete observation cannot erase a following HTTP failure',async()=>{
  const observation=terminalObservation(),error=Error('http-header-timeout');
  await assert.rejects(allTimelinePages(async offset=>{if(offset)throw error;return terminalPage(0,2,terminalRow('out'));},
    {limit:1,consumePage:observation.consume}),e=>e===error);
  assert.equal(observation.status().terminalObserved,true);
});
test('LP25-O03 no terminal state retains original thirty second wait timeout',async()=>{
  let now=0;const observation=terminalObservation({now:()=>now});
  await assert.rejects(boundedUntil('latency-transition',async()=>{
    await allTimelinePages(async()=>terminalPage(0,1,terminalRow('out','ready')),{limit:1,consumePage:observation.consume});
    now=29999;return observation.outputs().length?observation.outputs():false;
  },{now:()=>now,deadline:180000,pause:async ms=>{now+=ms;},budget:()=>{}}),/latency-transition-timeout/);
  assert.equal(observation.status().terminalObserved,false);assert.equal(now,30099);
});
test('LP25-O02 terminal retention stays bounded across cycles and does not retain group members',()=>{
  const observation=terminalObservation();
  for(let i=0;i<8;i++)observation.consume(terminalPage(0,1,{...terminalRow(`out${i}`),members:[{itemId:`member${i}`}]}),{timelineOrdinal:i+1});
  assert.equal(observation.outputs().length,8);assert.equal(observation.status().firstTimelineOrdinal,1);
  assert.ok(observation.outputs().every(row=>!Object.hasOwn(row,'members')));
  assert.throws(()=>observation.consume(terminalPage(0,1,terminalRow('ninth'))),/terminal-observation-cap/);
  assert.equal(observation.status().terminalObserved,true);assert.equal(observation.status().invalid,true);
});
test('LP26-O20-C independent terminal observation and full-page eligibility are both mandatory',()=>{
  const outputs=[terminalRow('out1'),terminalRow('out2')],status={terminalObserved:true,invalid:false};
  assert.equal(helpers.requireCompletionEvidence(outputs,status,'complete'),outputs);
  assert.throws(()=>helpers.requireCompletionEvidence(outputs,{terminalObserved:false,invalid:false},'complete'),/independent-terminal-observation-missing/);
  assert.throws(()=>helpers.requireCompletionEvidence(outputs,status,'page-total-changed'),/full-page-eligibility-missing/);
  assert.throws(()=>helpers.requireCompletionEvidence(outputs.slice(0,1),status,'complete'),/expected-two-output-files/);
});
for(const [name,change] of [
  ['offset',p=>({...p,offset:9})],['limit',p=>({...p,limit:2})],['count',p=>({...p,items:[]})],
  ['duplicate',p=>({...p,total:2,limit:2,items:[p.items[0],p.items[0]]})],['truncated',p=>({...p,truncated:true})]
])test(`LP25-O04 invalid ${name} page is rejected before strict consumer`,async()=>{
  let called=0;const p=change(terminalPage(0,1,terminalRow('out')));
  await assert.rejects(allTimelinePages(async()=>p,{limit:name==='duplicate'?2:1,consumePage:()=>{called++;}}));
  assert.equal(called,0);
});
