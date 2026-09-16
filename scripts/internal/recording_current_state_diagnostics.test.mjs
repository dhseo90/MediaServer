import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeEventState,eventOutputs} from './recording_current_app_helpers.mjs';
import * as helpers from './recording_current_app_helpers.mjs';
const row={kind:'event',eventId:'event',referenceId:'ref',jobId:'job',jobState:'complete',completeness:'complete',catalogState:'finalized',playable:true,segmentId:'out',playbackUrl:'/ops/api/recordings/media/out',requestedRange:{timeBasis:'media-pts-ms',startTimeMs:'3000',endTimeMs:'3000',preMs:'750',postMs:'750'}};
const page=items=>({items,unplacedItems:[]});
test('LP05-04 같은 원본의 앞선 비중첩 mapping 뒤 중첩 구간도 보존',()=>{
  const part=(start,end)=>({kind:'continuous',segmentId:'same',catalogState:'finalized',mediaRange:{startPts:start,endPts:end,timeBaseNum:'1',timeBaseDen:'1000000000'}});
  const result=helpers.summarizeOverlappingSources(page([part('0','1000000000'),part('2300000000','2500000000'),part('2500000000','3500000000')]),3000);
  assert.equal(result.rows.length,2);assert.equal(result.segmentCount,1);assert.equal(result.viewBasis,'timeline-mapping-slices');
});
test('LP05-04 겹치는 원본 전수·경계 제외·미상 분리·비밀 미노출',()=>{
  assert.equal(typeof helpers.summarizeOverlappingSources,'function');
  const source=(id,start,end)=>({kind:'continuous',segmentId:id,catalogState:'finalized',playable:true,mediaRange:{startPts:start,endPts:end,timeBaseNum:'1',timeBaseDen:'1000000000'}});
  const result=helpers.summarizeOverlappingSources(page([source('SECRET-1','1000000000','2500000000'),source('SECRET-2','2500000000','4000000000'),source('outside','4000000000','5000000000'),source('unknown',null,null)]),3000);
  assert.equal(result.rows.length,2);assert.equal(result.unknownCount,1);assert.equal(result.temporalOnly,true);
  assert.equal(JSON.stringify(result).includes('SECRET'),false);
  assert.throws(()=>helpers.summarizeOverlappingSources(page(Array.from({length:129},(_,i)=>source(String(i),'1000000000','4000000000'))),3000),/source-diagnostic-cap/);
});
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
