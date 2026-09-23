// 파일 용도: 실제 대기/서버 실행 없이 관측 시작간격의 독립 시간 oracle 검사.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as cadence from './recording_longrun_progress.mjs';
test('LP26-O10-G01 5초 시작간격은 이미 처리한 시간을 차감한다',()=>{
  assert.equal(typeof cadence.nextSampleDelay,'function');
  for(const [elapsed,expected] of [[0,5000],[1000,4000],[4500,500],[5000,0],[5340,0],[10000,0],[14999,0],[15000,0]])
    assert.equal(cadence.nextSampleDelay(20000,20000+elapsed,100000),expected);
});
test('LP26-O10-G01 종료 잔여시간까지만 대기한다',()=>{
  assert.equal(typeof cadence.nextSampleDelay,'function');
  assert.equal(cadence.nextSampleDelay(20000,21000,21300),300);
  assert.equal(cadence.nextSampleDelay(20000,21000,21000),0);
  assert.equal(cadence.nextSampleDelay(20000,21000,20900),0);
});
test('LP26-O10-G01 기존15초 초과는 즉시 실패한다',()=>{
  assert.equal(typeof cadence.nextSampleDelay,'function');
  assert.throws(()=>cadence.nextSampleDelay(20000,35001,100000),/^Error: sample-gap$/);
});
test('LP26-O10-G01 비정상 시간은 거부한다',()=>{
  assert.equal(typeof cadence.nextSampleDelay,'function');
  for(const args of [[NaN,1,2],[0,Infinity,2],[0,1,NaN],[-1,0,2],[2,1,3],[0,1,-1]])
    assert.throws(()=>cadence.nextSampleDelay(...args),/^Error: sample-cadence-clock$/);
});
