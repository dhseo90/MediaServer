import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeEventState,eventOutputs} from './recording_current_app_helpers.mjs';
const row={kind:'event',eventId:'event',referenceId:'ref',jobId:'job',jobState:'complete',completeness:'complete',catalogState:'finalized',playable:true,segmentId:'out',playbackUrl:'/ops/api/recordings/media/out',requestedRange:{timeBasis:'media-pts-ms',startTimeMs:'3000',endTimeMs:'3000',preMs:'750',postMs:'750'}};
const page=items=>({items,unplacedItems:[]});
test('P0-STATE01 complete1 count와 기존 two-output 거부 구분',()=>{
  assert.throws(()=>eventOutputs(page([row]),'event','ref'),/expected-two-output-files/);
  const s=summarizeEventState(page([row]),'event','ref','expected-two-output-files');
  assert.equal(s.outputCount,1);assert.equal(s.jobCount,1);assert.equal(s.rows[0].jobState,'complete');assert.equal(s.reason,'expected-two-output-files');
});
test('P0-STATE02 pending partial complete2 변화와 8개 상한',()=>{
  const pending={...row,jobId:'',jobState:'not-created',segmentId:null,completeness:'unknown',catalogState:'absent',playable:false};
  const p=summarizeEventState(page([pending]),'event','ref','event-not-complete');
  const partial=summarizeEventState(page([{...row,completeness:'partial'}]),'event','ref','event-not-complete');
  const complete=summarizeEventState(page([row,{...row,segmentId:'out2'}]),'event','ref','ok');
  assert.equal(p.jobCount,0);assert.equal(p.outputCount,0);assert.notDeepEqual(p,partial);assert.equal(complete.outputCount,2);
  const cap=summarizeEventState(page(Array.from({length:9},(_,i)=>({...row,segmentId:'o'+i}))), 'event','ref','ok');
  assert.equal(cap.rows.length,8);assert.equal(cap.truncated,true);assert.equal(cap.outputCount,9);
});
test('P0-STATE03 raw ID/path/unknown enum/request 비밀 미노출',()=>{
  const s=summarizeEventState(page([{...row,jobId:'SECRET',segmentId:'SECRET',playbackUrl:'SECRET',jobState:'SECRET',requestedRange:{...row.requestedRange,startTimeMs:'SECRET'}}]),'event','ref','SECRET');
  assert.equal(JSON.stringify(s).includes('SECRET'),false);assert.equal(s.rows[0].jobState,'other');assert.equal(s.rows[0].request,null);assert.equal(s.reason,'other');
});
