// 지연 관측과 요청 완전성 판정의 경계를 구분한다.
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
test('P0-HTTP01 pending은 전이 완료가 아님',()=>assert.equal(latencyTransitionOutputs(page([{...row,jobState:'intent'}]),'event','ref'),null));
test('P0-HTTP01 partial은 지연 관측만 가능',()=>assert.equal(latencyTransitionOutputs(page([row,row]),'event','ref').length,1));
test('P0-HTTP01 다른 참조와 모순 파일은 거부',()=>{
  assert.throws(()=>latencyTransitionOutputs(page([{...row,referenceId:'other'}]),'event','ref'),/latency-lineage/);
  assert.throws(()=>latencyTransitionOutputs(page([{...row,playbackUrl:'/other'}]),'event','ref'),/latency-media/);
});
test('P0-HTTP01 원래 완전 출력 검사는 부분 출력 거부 유지',()=>assert.throws(()=>eventOutputs(page([row]),'event','ref'),/event-not-complete/));
