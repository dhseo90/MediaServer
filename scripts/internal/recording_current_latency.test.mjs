// 파일 용도: 지연 관측과 요청 완전성 판정의 경계를 구분한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as helpers from './recording_current_app_helpers.mjs';
const {eventOutputs}=helpers;
const latencyTransitionOutputs=(...args)=>{
  assert.equal(typeof helpers.latencyTransitionOutputs,'function','지연 전용 완료 판정이 구현되어야 함');
  return helpers.latencyTransitionOutputs(...args);
};
const row={kind:'event',eventId:'event',referenceId:'ref',jobId:'job',jobState:'complete',completeness:'partial',catalogState:'finalized',playable:true,segmentId:'out',playbackUrl:'/ops/api/recordings/media/out'};
const page=items=>({items,unplacedItems:[]});
test('LP04-A 목표 이전은 대기하고 해당 구간만 선택',()=>{
  assert.equal(typeof helpers.failedWindowGate,'function');
  assert.equal(helpers.failedWindowGate(16000000000n,16200000000n),false);
  assert.equal(helpers.failedWindowGate(16500000000n,16700000000n),false);
  assert.equal(helpers.failedWindowGate(16500000000n,16766666666n),true);
});
test('LP04-A 경계와 프레임을 놓치면 다른 구간으로 대체 금지',()=>{
  assert.equal(typeof helpers.failedWindowGate,'function');
  assert.throws(()=>helpers.failedWindowGate(16600000000n,16800000000n),/reproduction-boundary-missed/);
  assert.throws(()=>helpers.failedWindowGate(16500000000n,16933333333n),/reproduction-frame-missed/);
});
test('LP04-A 실제 dispatch 정확 일치만 허용',()=>{
  assert.equal(typeof helpers.requireFailedWindowDispatch,'function');
  assert.doesNotThrow(()=>helpers.requireFailedWindowDispatch(16900000000));
  assert.throws(()=>helpers.requireFailedWindowDispatch(16866666666),/reproduction-dispatch-mismatch/);
  assert.throws(()=>helpers.requireFailedWindowDispatch(16933333333),/reproduction-dispatch-mismatch/);
});
test('LP03-A failed는 완료 대기 대신 즉시 중단',()=>assert.throws(()=>latencyTransitionOutputs(page([{...row,jobState:'failed'}]),'event','ref'),/latency-job-failed/));
test('P0-HTTP01 pending은 전이 완료가 아님',()=>assert.equal(latencyTransitionOutputs(page([{...row,jobState:'intent'}]),'event','ref'),null));
test('P0-HTTP01 partial은 지연 관측만 가능',()=>assert.equal(latencyTransitionOutputs(page([row,row]),'event','ref').length,1));
test('P0-HTTP01 다른 참조와 모순 파일은 거부',()=>{
  assert.throws(()=>latencyTransitionOutputs(page([{...row,referenceId:'other'}]),'event','ref'),/latency-lineage/);
  assert.throws(()=>latencyTransitionOutputs(page([{...row,playbackUrl:'/other'}]),'event','ref'),/latency-media/);
});
test('P0-HTTP01 원래 완전 출력 검사는 부분 출력 거부 유지',()=>assert.throws(()=>eventOutputs(page([row]),'event','ref'),/event-not-complete/));
test('LP25-O02 terminal partial output is observation only and never completeness evidence',()=>{
  assert.equal(typeof helpers.createTerminalObservation,'function');
  const observation=helpers.createTerminalObservation('event','ref');observation.consume({...page([{...row,itemId:'partial'}]),offset:0});
  assert.equal(observation.status().terminalObserved,true);assert.equal(observation.status().fullOutputPass,false);
  assert.throws(()=>eventOutputs(page(observation.outputs()),'event','ref'),/event-not-complete/);
});
test('LP25-O04 source diagnostics state explicit file-group basis without changing default mapping basis',()=>{
  const source={kind:'continuous',segmentId:'source',catalogState:'finalized',playable:true,mediaRange:{startPts:'0',endPts:'1000000000',timeBaseNum:'1',timeBaseDen:'1000000000'}};
  assert.equal(helpers.summarizeOverlappingSources(page([source]),500).viewBasis,'timeline-mapping-slices');
  const grouped=helpers.summarizeOverlappingSources(page([source]),500,{unplacedUnit:'file'});
  assert.equal(grouped.viewBasis,'timeline-known-mappings-unplaced-file-groups');assert.equal(grouped.temporalOnly,true);
});
