import test from 'node:test';
import assert from 'node:assert/strict';
import {runCurrentIntegration} from './recording_current_integration_suite.mjs';
import {allTimelinePages,eventOutputs,verifyRestart} from './recording_current_app_helpers.mjs';
import {dispatchTuple,correlatedEvent} from './recording_event_correlation.mjs';
const ids=['http-api','http-auth','http-lifecycle','default-composition','actual-app'];
const cleanup='[cleanup] PASS {"rootAbsent":true,"failureCount":0,"process":{"exitCode":0,"signalCode":null,"graceful":true},"ports":[{"kind":"http","closed":true},{"kind":"rtsp","closed":true}]}\n';
const outputs={
  'http-api':'[S06 HTTP API] checks=35 fail=0 authMode=off roleTests=NOT_RUN\n'+cleanup,
  'http-auth':'[S06 HTTP AUTH] checks=38 fail=0 actualUiActions=NOT_RUN\n'+cleanup,
  'http-lifecycle':'[S06 HTTP lifecycle] checks=12 fail=0 codecPlayback=NOT_RUN\n'+cleanup,
  'default-composition':'[summary] pass=24 fail=0\n[summary] pass=16 fail=0\n[summary] pass=1 fail=0\n'+Array.from({length:46},(_,i)=>`[pass] case-${i}`).join('\n')+'\n[process] committed child exit=23 expected=23\n[process] blocked child exit=23 expected=23\n[cleanup] path=/unit bytes=1 removed=true\n',
  'actual-app':JSON.stringify({mode:'current-actual-app',passed:25,failed:0,actualEventPass:true,restartPass:true,expectedOutputCount:2,observedOutputCounts:[2,2],cleanup:{rootAbsent:true,failureCount:0,processes:[1,2].map(()=>({exitCode:0,signalCode:null,graceful:true,ports:[{kind:'http',closed:true},{kind:'rtsp',closed:true}]}))}})+'\n'
};
test('S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박',async()=>{
  const called=[];const r=await runCurrentIntegration(async step=>{called.push(step.id);return {exit:0,stdout:outputs[step.id]};});
  assert.deepEqual(called,ids);assert.equal(r.currentIntegrationExecutionPass,true);assert.equal(r.stages.length,5);
});
test('S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부',()=>{
  const tap={tapId:'tap',streamKey:'raw-stream'},response={tapId:'tap',result:{sourceKey:'raw-stream',pts:2000000000},events:[{ruleId:'9102',type:'presence',object:{trackId:2}}]};
  const tuple=dispatchTuple(response,tap,'9102'),row={eventId:'new',streamId:'raw-stream',channelId:'raw-stream',eventType:'presence',trackId:2,updateTime:2000,metadata:{schema:'media-server.va.event-record.metadata.v1',ruleId:'9102',pts:2000000000}};
  assert.equal(correlatedEvent([row],new Set(),tuple).eventId,'new');
  assert.equal(dispatchTuple({...response,tapId:'other'},tap,'9102'),null);
  assert.equal(correlatedEvent([row],new Set(['new']),tuple),undefined);
  for(const change of [{streamId:'other'},{channelId:'other'},{trackId:3},{updateTime:2001},{metadata:{...row.metadata,ruleId:'wrong'}},{metadata:{...row.metadata,pts:2}},{metadata:{...row.metadata,schema:'unknown'}}])assert.equal(correlatedEvent([{...row,...change}],new Set(),tuple),undefined);
  assert.throws(()=>correlatedEvent([row,{...row,eventId:'another'}],new Set(),tuple));
});
for(const [name,change] of [
  ['nonzero',r=>({...r,exit:1})],['signal',r=>({...r,signal:'SIGTERM'})],['output-limit',r=>({...r,error:'child-output-limit'})],
  ['summary-missing',r=>({...r,stdout:cleanup})],['summary-duplicate',r=>({...r,stdout:r.stdout+r.stdout})],
  ['cleanup-failed',r=>({...r,stdout:r.stdout.replace('"rootAbsent":true','"rootAbsent":false')})],
  ['port-missing',r=>({...r,stdout:r.stdout.replace('"rtsp"','"other"')})]
])test(`S11-CI02 ${name} 실패 후 나머지 미실행`,async()=>{
  const calls=[];const result=await runCurrentIntegration(async s=>{calls.push(s.id);return change({exit:0,stdout:outputs[s.id]});});
  assert.equal(result.currentIntegrationExecutionPass,false);assert.deepEqual(calls,['http-api']);assert.deepEqual(result.notRun,ids.slice(1));
});
test('S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리',async()=>{
  const r=await runCurrentIntegration(async s=>({exit:0,stdout:outputs[s.id]}));
  assert.equal('integrationExecutionPass' in r,false);assert.equal(r.fullFoundationPass,false);assert.equal(r.uiFulltestPass,false);assert.equal(r.resourceTrendPass,false);
});
test('S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부',async()=>{
  for(const observed of [undefined,[],[2],[2,1]]){
    const r=await runCurrentIntegration(async s=>{
      if(s.id!=='actual-app')return {exit:0,stdout:outputs[s.id]};
      const summary=JSON.parse(outputs[s.id]);summary.observedOutputCounts=observed;
      return {exit:0,stdout:JSON.stringify(summary)+'\n'};
    });
    assert.equal(r.currentIntegrationExecutionPass,false);
  }
});
const output=(id,item=id)=>({itemId:item,segmentId:id,kind:'event',eventId:'event-one',referenceId:'reference-one',jobId:'job-one',jobState:'complete',completeness:'complete',playable:true,playbackUrl:'/ops/api/recordings/media/'+id,requestedRange:{timeBasis:'media-pts-ms',startTimeMs:'7000',endTimeMs:'8500',preMs:'500',postMs:'500'}});
test('S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup',async()=>{
  const items=[output('one','mapping1'),output('one','mapping2'),output('two')],unplaced=[{itemId:'unknown',segmentId:null}];let calls=0;
  const page=await allTimelinePages(async(offset,limit)=>{calls++;return {total:3,unplacedTotal:1,offset,limit,items:items.slice(offset,offset+limit),unplacedItems:unplaced.slice(offset,offset+limit)};},{limit:2});
  assert.equal(calls,2);assert.equal(page.items.length,3);assert.equal(page.unplacedItems.length,1);
  assert.equal(eventOutputs(page,'event-one','reference-one').length,2);
});
test('S11-CI05 누락·중복item·불안정total·truncated·cap 거부',async()=>{
  const good={total:2,unplacedTotal:0,offset:0,limit:2,items:[output('one'),output('two')],unplacedItems:[]};
  for(const bad of [{...good,items:[output('one')]},{...good,items:[output('one'),output('one')]},{...good,truncated:true},{...good,total:5000}])await assert.rejects(()=>allTimelinePages(async()=>bad,{limit:2}));
});
test('S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부',()=>{
  const good={items:[output('one'),output('two')],unplacedItems:[]};
  assert.equal(eventOutputs(good,'event-one','reference-one').length,2);
  for(const change of [{completeness:'partial'},{referenceId:'other'},{jobId:'other'},{jobState:'ready'},{requestedRange:{...output('x').requestedRange,startTimeMs:7000}}])assert.throws(()=>eventOutputs({items:[output('one'),{...output('two'),...change}],unplacedItems:[]},'event-one','reference-one'));
  assert.throws(()=>eventOutputs({items:[output('one')],unplacedItems:[]},'event-one','reference-one'));
});
test('S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부',()=>{
  const placeholder={...output('unused'),segmentId:null,jobId:'',jobState:'not-created',completeness:'unknown',catalogState:'absent',playable:false,playbackUrl:''};
  assert.throws(()=>eventOutputs({items:[],unplacedItems:[placeholder]},'event-one','reference-one'),/^Error: event-not-complete$/);
  for(const change of [{referenceId:'other'},{kind:'continuous'},{jobState:'complete'},{segmentId:'unexpected'}])
    assert.throws(()=>eventOutputs({items:[],unplacedItems:[{...placeholder,...change}]},'event-one','reference-one'),/^Error: event-lineage$/);
});
test('S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리',()=>{
  const before={eventId:'e1',referenceId:'r1',jobId:'j1',outputs:[{id:'o1',hash:'a',bytes:1},{id:'o2',hash:'b',bytes:2}]};
  const fresh={eventId:'e2',referenceId:'r2',jobId:'j2',outputs:[{id:'o3',hash:'c',bytes:3},{id:'o4',hash:'d',bytes:4}]};
  assert.equal(verifyRestart(before,structuredClone(before),fresh),true);
  for(const after of [{...before,outputs:before.outputs.slice(1)},{...before,outputs:[{...before.outputs[0],hash:'changed'},before.outputs[1]]}])assert.throws(()=>verifyRestart(before,after,fresh));
  for(const key of ['eventId','referenceId','jobId'])assert.throws(()=>verifyRestart(before,before,{...fresh,[key]:before[key]}));
  assert.throws(()=>verifyRestart(before,before,{...fresh,outputs:before.outputs}));
});
test('S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부',()=>{
  const rows=[output('one'),output('two')].map(x=>({...x,requestedRange:{...x.requestedRange,endTimeMs:'7000'}}));
  assert.equal(eventOutputs({items:rows,unplacedItems:[]},'event-one','reference-one').length,2);
  for(const q of [{endTimeMs:'6999'},{preMs:'0',postMs:'0'}])assert.throws(()=>eventOutputs({items:rows.map(x=>({...x,requestedRange:{...x.requestedRange,...q}})),unplacedItems:[]},'event-one','reference-one'));
});
