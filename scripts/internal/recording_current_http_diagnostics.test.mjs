// 파일 용도: 현행 녹화 HTTP 관측의 시간 계측·실패 유지·비밀 비노출을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {measuredHttpResponse} from './recording_current_app_helpers.mjs';
const clock=values=>()=>{assert.ok(values.length);return values.shift();};
test('LP26-O09-B01 status/source-item 안전 분류',async()=>{
  for(const [route,routeClass] of [['/ops/api/recordings/status?secret=DO_NOT_REPORT','recording-status'],['/ops/api/sources/DO_NOT_REPORT','source-item']]){
    let report;
    await measuredHttpResponse({route,report:r=>{report=r;},request:async()=>({status:200,headers:{},body:(async function*(){})()})});
    assert.equal(report.routeClass,routeClass);assert(!JSON.stringify(report).includes('DO_NOT_REPORT'));
  }
});
test('LP26-O09-B02 지정4MiB 초과는 body 실패',async()=>{
  let report;
  await assert.rejects(()=>measuredHttpResponse({route:'/ops/api/recordings/status',maxBytes:4*1024*1024,report:r=>{report=r;},
    request:async()=>({status:200,headers:{},body:(async function*(){yield Buffer.alloc(4*1024*1024+1);})()})}),/http-body-error/);
  assert.equal(report.outcome,'error');
});
test('P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출',async()=>{
  const reports=[];
  const value=await measuredHttpResponse({route:'/ops/api/recordings/timeline?secret=DO_NOT_REPORT',method:'GET',
    now:clock([100,120,155]),report:x=>reports.push(x),request:async()=>({status:200,headers:{},body:(async function*(){yield Buffer.from('abc');})()})});
  assert.deepEqual(reports,[{method:'GET',routeClass:'timeline',status:200,headerElapsedMs:20,bodyElapsedMs:35,totalElapsedMs:55,bytes:3,phase:'complete',outcome:'ok'}]);
  assert.equal(value.bytes.toString(),'abc');assert.equal(JSON.stringify(reports).includes('DO_NOT_REPORT'),false);
});
test('P0-DIAG02 header timeout 고정 진단과 실패 유지',async()=>{
  const reports=[];
  await assert.rejects(()=>measuredHttpResponse({route:'/secret/DO_NOT_REPORT',method:'unknown',now:clock([0,4000]),report:x=>reports.push(x),
    request:async()=>{throw new DOMException('DO_NOT_REPORT','TimeoutError');}}),/^Error: http-header-timeout$/);
  assert.deepEqual(reports,[{method:'OTHER',routeClass:'other',status:null,headerElapsedMs:null,bodyElapsedMs:null,totalElapsedMs:4000,bytes:0,phase:'header',outcome:'timeout'}]);
});
test('P0-DIAG03 body timeout 부분 수신 측정·완료 거부',async()=>{
  const reports=[];
  await assert.rejects(()=>measuredHttpResponse({route:'/ops/api/recordings/media/DO_NOT_REPORT',method:'GET',now:clock([0,15,4000]),report:x=>reports.push(x),
    request:async()=>({status:200,headers:{},body:(async function*(){yield Buffer.from('abc');throw new DOMException('DO_NOT_REPORT','TimeoutError');})()})}),/^Error: http-body-timeout$/);
  assert.deepEqual(reports,[{method:'GET',routeClass:'media',status:200,headerElapsedMs:15,bodyElapsedMs:3985,totalElapsedMs:4000,bytes:3,phase:'body',outcome:'timeout'}]);
});
