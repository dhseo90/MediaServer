// 파일 용도: 녹화 선택 추적의 안전한 행 수집·입력 상한·시도 순서 판정을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as trace from './recording_selection_trace.mjs';
const row=(attempt=1)=>({reference_sha256:'a'.repeat(64),attempt,attempt_limit:2,elapsed_ms:String(attempt),wait_ms:'3750',deadline_exhausted:false,attempt_exhausted:attempt===2,selection_complete:false,expanded_start_ns:'7816000000',expanded_end_ns:'9316000000',source_count:0,unknown_count:1,sources_truncated:false,unknown_truncated:false,sources:[],decoded:{namespace_valid:true,range_comparable:true,incomplete:false,frames_truncated:false,frame_count:0,relevant_count:0,identity_matched:0,identity_rejected:0,generation_mismatch:0,pts_mismatch:0,duration_invalid:0,minimum_pts_ns:null,maximum_pts_ns:null,maximum_valid_end_ns:null},slice_state_counts:[0,1,0,0,0,0],reason_counts:[0,1,0,0,0,0,0,0,0,0],unknown_ranges:[{start_ns:'7816000000',end_ns:'9316000000',reason:1}]});
test('LP09-J01 분할 로그에서 안전한 행만 수집',()=>{const c=trace.createSelectionTraceCollector();const line='[recording-selection-attempt] '+JSON.stringify(row())+'\n';c.append('unrelated log\n'+line.slice(0,80));c.append(line.slice(80));assert.deepEqual(c.finish(),[row()]);});
for(const kind of ['extra','hash','enum','range','count'])test(`LP09-J01 ${kind} 필드 거부`,()=>{const value=row();if(kind==='extra')value.secret='private-canary';if(kind==='hash')value.reference_sha256='private-canary';if(kind==='enum')value.unknown_ranges[0].reason=99;if(kind==='range')value.expanded_end_ns='0';if(kind==='count')value.reason_counts=[0];assert.throws(()=>trace.validateSelectionTrace(value),/selection-trace-invalid/);});
test('LP09-J01 로그 상한과 미완성 행 거부',()=>{const c=trace.createSelectionTraceCollector();assert.throws(()=>c.append('x'.repeat(262145)),/selection-trace-line-cap/);const d=trace.createSelectionTraceCollector();d.append('[recording-selection-attempt] {');assert.throws(()=>d.finish(),/selection-trace-incomplete/);});
test('LP09-J02 정확한 참조와 연속 시도 종결 확인',()=>{assert.deepEqual(trace.matchSelectionTrace([row(),row(2)],'a'.repeat(64)),[row(),row(2)]);for(const rows of [[],[row()],[row(2)],[row(),row()],[row(),{...row(2),reference_sha256:'b'.repeat(64)}]])assert.throws(()=>trace.matchSelectionTrace(rows,'a'.repeat(64)),/selection-trace/);});
const profile={baseWaitMs:3750,baseAttemptLimit:9,sourceWaitMs:60000,sourceAttemptLimit:121};
const runtimeRow=(attempt,source=true,elapsed=(attempt-1)*500)=>({...row(attempt),attempt_limit:source?121:9,wait_ms:source?'60000':'3750',elapsed_ms:String(elapsed),attempt_exhausted:attempt>=(source?121:9),deadline_exhausted:elapsed>=(source?60000:3750)});
test('LP11-T01 source에서 base로 복귀한 초과 effective attempt 정상 종결',()=>{
 const rows=Array.from({length:10},(_,i)=>runtimeRow(i+1,i!==9));
 assert.doesNotThrow(()=>rows.forEach(r=>trace.validateSelectionTrace(r,profile)));
 assert.deepEqual(trace.matchSelectionTrace(rows,'a'.repeat(64),profile),rows);
});
test('LP11-T02 base에서 source 전환과 절대 attempt121 경계',()=>{
 const rows=Array.from({length:121},(_,i)=>runtimeRow(i+1,i>0));
 assert.deepEqual(trace.matchSelectionTrace(rows,'a'.repeat(64),profile),rows);
});
for(const kind of ['budget-pair','attempt122','wait60001','attempt-flag','deadline-flag'])test(`LP11-T03 ${kind} 정합성 거부`,()=>{
 const r=runtimeRow(10,false);if(kind==='budget-pair')r.attempt_limit=10;if(kind==='attempt122'){r.attempt=122;r.attempt_limit=121;r.wait_ms='60000';r.deadline_exhausted=false;}if(kind==='wait60001')r.wait_ms='60001';if(kind==='attempt-flag')r.attempt_exhausted=false;if(kind==='deadline-flag')r.deadline_exhausted=false;
 assert.throws(()=>trace.validateSelectionTrace(r,profile),/selection-trace/);
});
for(const kind of ['skip','elapsed','range','unterminated','after-terminal'])test(`LP11-T04 ${kind} sequence 거부`,()=>{
 const rows=[runtimeRow(1),{...runtimeRow(2),selection_complete:true}];
 if(kind==='skip')rows[1].attempt=3;if(kind==='elapsed')rows[0].elapsed_ms='501';if(kind==='range')rows[1].expanded_end_ns='9999999999';if(kind==='unterminated')rows[1].selection_complete=false;if(kind==='after-terminal')rows[0].selection_complete=true;
 assert.throws(()=>trace.matchSelectionTrace(rows,'a'.repeat(64),profile),/selection-trace/);
});
test('LP11-T05 parser 오류 증거는 고정 코드와 safe numeric counts만 보존',()=>{
 const c=trace.createSelectionTraceCollector(profile);c.append('[recording-selection-attempt] '+JSON.stringify(runtimeRow(1))+'\n');
 const invalid={...runtimeRow(2),secret:'/private/raw-secret-canary',reference_sha256:'secret-id-canary',attempt_limit:999};
 assert.throws(()=>c.append('[recording-selection-attempt] '+JSON.stringify(invalid)+'\n'));
 assert.equal(typeof c.diagnostic,'function');const status=c.diagnostic();
 assert.deepEqual(status,{code:'selection-trace-invalid',acceptedCount:1,rejectedCount:1,numeric:{attempt:2,attempt_limit:null,elapsed_ms:'500',wait_ms:'60000'}});
 assert.doesNotMatch(JSON.stringify(status),/canary|private|reference/);
});
test('LP11-T06 profile collector split 및 incomplete 안전 보고',()=>{
 const c=trace.createSelectionTraceCollector(profile),line='[recording-selection-attempt] '+JSON.stringify(runtimeRow(1))+'\n';c.append(line.slice(0,37));c.append(line.slice(37));c.append('[recording-selection-attempt] {');assert.throws(()=>c.finish(),/selection-trace-incomplete/);
 assert.equal(typeof c.diagnostic,'function');assert.deepEqual(c.diagnostic(),{code:'selection-trace-incomplete',acceptedCount:1,rejectedCount:1,numeric:{attempt:null,attempt_limit:null,elapsed_ms:null,wait_ms:null}});
});
test('LP11-T06 actual runner 공통 오류 reporter는 원문 없이 status를 출력',()=>{
 const c=trace.createSelectionTraceCollector(profile);assert.throws(()=>c.append('[recording-selection-attempt] private-canary\n'));
 assert.equal(typeof trace.reportSelectionTraceFailure,'function');const output=[];
 const code=trace.reportSelectionTraceFailure(c,new Error('/private/secret-canary'),line=>output.push(line));
 assert.equal(code,'unknown');assert.equal(output.length,1);assert.deepEqual(JSON.parse(output[0].slice('[selection-trace-status] '.length)),{code:'selection-trace-invalid',acceptedCount:0,rejectedCount:1,numeric:{attempt:null,attempt_limit:null,elapsed_ms:null,wait_ms:null}});assert.doesNotMatch(output.join(''),/canary|private/);
});
