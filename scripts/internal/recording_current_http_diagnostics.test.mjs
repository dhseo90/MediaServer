// 파일 용도: 현행 녹화 HTTP 관측의 시간 계측·실패 유지·비밀 비노출을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {measuredHttpResponse,createRecordingStatusCapture,recordingStateSummary} from './recording_current_app_helpers.mjs';
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

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
test('LP26-O05 동일 실제 HTTP 응답의 실패 원문/조건 보존과 truthiness 유지',async()=>{
  const good={channelId:'9101',enabled:true,active:true,storageBlocked:false};
  const cases=[{channels:[]},{channels:[good,good]},...['enabled','active'].map(k=>({channels:[{...good,[k]:false}]})),
    {channels:[{...good,storageBlocked:true}]},{channels:[{...good,enabled:false,active:false,storageBlocked:true}]},
    {channels:null},{},{channels:[null,good]},'{bad', {channels:[{channelId:'9101'}]}];
  for(const input of cases){
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-status-case-'));let calls=0;
    const bytes=Buffer.from(typeof input==='string'?input:JSON.stringify(input));
    const server=http.createServer((req,res)=>{calls++;res.writeHead(200,{'Content-Type':'application/json'});res.end(bytes);});
    try{server.listen(0,'127.0.0.1');await once(server,'listening');
      const capture=createRecordingStatusCapture(dir);const response=await measuredHttpResponse({route:'/ops/api/recordings/status',report:()=>{},request:()=>fetch(`http://127.0.0.1:${server.address().port}/status`)});
      const result=capture.inspect(response,{startedAt:1,receivedAt:2,channelIds:['9101']});
      assert.equal(result.summary.passed,false);assert.equal(calls,1);const failure=capture.failure();
      assert.deepEqual(fs.readFileSync(path.join(dir,failure.rawFile)),bytes);assert.equal(failure.collectionErrors.length,0);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,`recording-status-1.diagnostic.json`))).rows,JSON.parse(JSON.stringify(result.summary.rows)));
    }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true});}
  }
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-status-bounds-'));
  try{const capture=createRecordingStatusCapture(dir);for(let i=0;i<20;i++)assert(capture.inspect({status:200,bytes:Buffer.from(JSON.stringify({channels:[{...good,enabled:'yes',storageBlocked:null}]}))},{channelIds:['9101']}).summary.passed);
    assert.equal(fs.readdirSync(dir).length,0);const r=capture.inspect({status:200,bytes:Buffer.from('{"channels":[]}')},{channelIds:['9101']});assert(!r.summary.passed);assert.equal(capture.failure().recent.length,8);
    const broken=createRecordingStatusCapture(dir,{write:()=>{throw Object.assign(Error('private'),{code:'ENOSPC'});}});
    assert(!broken.inspect({status:200,bytes:Buffer.from('{"channels":[]}')},{channelIds:['9101']}).summary.passed);assert.equal(broken.failure().collectionErrors.length,2);
  }finally{fs.rmSync(dir,{recursive:true});}
});

test('LP26-O05 state probe/end/sequence/write failure cannot masquerade as complete',()=>{
  const row=x=>'[recording-state] '+JSON.stringify(x)+'\n',p=row({type:'probe',version:1}),e=row({seq:0,atUs:1,channel:'9101',phase:'writer-started',reason:'ok'}),end=row({type:'end',count:1,writeError:false});
  assert.equal(recordingStateSummary(p+e+end).status,'captured');
  for(const text of ['',p+e,e+end,p+end,p+e+e+end,p+e+row({type:'end',count:1,writeError:true}),p+e+end+'[recording-state] overflow\n'])assert.equal(recordingStateSummary(text).status,'incomplete');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-status-admission-'));
  try{const c=createRecordingStatusCapture(dir,{admit:()=>{throw Error('budget');}});assert(!c.inspect({status:200,bytes:Buffer.from('{}')},{channelIds:['9101']}).summary.passed);assert.equal(c.failure().collectionErrors.length,2);assert.deepEqual(fs.readdirSync(dir),[]);}finally{fs.rmSync(dir,{recursive:true});}
});

import vm from 'node:vm';
import {spawn} from 'node:child_process';
test('LP26-O05 actual mixed request child preserves first failure to parent report',async()=>{
 const source=fs.readFileSync(new URL('./v450_recording_a_mixed.mjs',import.meta.url),'utf8');
 const begin=source.indexOf('async function request('),end=source.indexOf('const mixed=',begin);
 const finalField=source.match(/recordingStatusFailure:statusCapture.failure\(\)/)[0];
 for(const body of ['{"channels":[]}','{"channels":[{"channelId":"9101","enabled":true,"active":false,"storageBlocked":false}]}','{bad']){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-status-parent-'));
  const script=`import vm from 'node:vm';import http from 'node:http';import {once} from 'node:events';import {measuredHttpResponse,createRecordingStatusCapture} from ${JSON.stringify(new URL('./recording_current_app_helpers.mjs',import.meta.url).href)};
  let calls=0;const server=http.createServer((q,r)=>{calls++;r.end(${JSON.stringify(body)});});server.listen(0,'127.0.0.1');await once(server,'listening');
  const statusCapture=createRecordingStatusCapture(${JSON.stringify(dir)});
  const c=vm.createContext({measuredHttpResponse,statusCapture,fetch,AbortSignal,performance,console,budget(){},check(ok,label){if(!ok)throw Error(label);}});
  vm.runInContext(${JSON.stringify(source.slice(begin,end))},c);
  c.app={base:'http://127.0.0.1:'+server.address().port};let error;
  try{await vm.runInContext("request(app,'GET','/ops/api/recordings/status',undefined,true)",c);}catch(e){error=e.message;}
  const report=vm.runInContext(${JSON.stringify('({'+finalField+'})')},c);
  console.log('[parent-report] '+JSON.stringify({...report,error,calls}));await new Promise(r=>server.close(r));process.exitCode=error?1:0;`;
  try{
   const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['ignore','pipe','pipe']});let out='',err='';
   const timer=setTimeout(()=>child.kill('SIGTERM'),5000);child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);
   const [code]=await once(child,'close');clearTimeout(timer);assert.equal(code,1,err);
   const report=JSON.parse(out.split('\n').find(l=>l.startsWith('[parent-report] ')).slice(16));
   assert.equal(report.calls,1);assert(report.error);assert.equal(report.recordingStatusFailure.passed,false);
   assert.equal(fs.readFileSync(path.join(dir,report.recordingStatusFailure.rawFile),'utf8'),body);
  }finally{fs.rmSync(dir,{recursive:true});}
 }
});
