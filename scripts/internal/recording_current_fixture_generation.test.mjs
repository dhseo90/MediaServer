// 파일 용도: LP26-O07 생성기 비민감 결과 분류 자체검사. 생성기 실제 실행/장시간 PASS가 아니다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {summarizeFixtureGeneration} from './recording_current_observer.mjs';
const start=performance.now();let passed=0,failed=0;
const check=(title,run)=>{try{run();passed++;console.log('[pass] '+title);}catch{failed++;console.log('[fail] '+title);}};
check('LP26-O07-A successful and nonzero process exits remain distinct',()=>{
  const success=summarizeFixtureGeneration({status:0,signal:null,stdout:'',stderr:''},{elapsedMs:10,outputBytes:500});
  assert.equal(success.status,0);assert.equal(success.signal,null);assert.equal(success.errorCode,null);assert.equal(success.outputBytes,500);
  assert.equal(summarizeFixtureGeneration({status:1},{elapsedMs:10}).status,1);
});
for(const code of ['ETIMEDOUT','ENOENT','EACCES','ENOBUFS'])check('LP26-O07-A explicit '+code,()=>{
  const result=summarizeFixtureGeneration({status:null,signal:code==='ETIMEDOUT'?'SIGTERM':null,error:{code,message:'private text'}},{elapsedMs:30001});
  assert.equal(result.status,null);assert.equal(result.errorCode,code);assert.equal(result.signal,code==='ETIMEDOUT'?'SIGTERM':null);assert.equal(result.outputBytes,null);
});
check('LP26-O07-A fixed diagnostic categories exclude raw errors and paths',()=>{
  const result=summarizeFixtureGeneration({status:1,signal:'SECRET',error:{code:'PRIVATE_CODE'},stdout:'private-token',stderr:'no element private-element; could not link; plugin-scanner; Permission denied; No space left /private/path'}, {elapsedMs:1});
  assert.deepEqual(result.categories,{missingElement:true,negotiation:true,pluginScanner:true,permission:true,resource:true,macosService:false});
  assert.equal(result.signal,'other');assert.equal(result.errorCode,'other');assert.equal(result.rawBodyPublished,false);
  const json=JSON.stringify(result);for(const forbidden of ['private-token','private-element','/private/path','SECRET','PRIVATE_CODE'])assert(!json.includes(forbidden));
});
check('LP26-O15 macOS service failure is classified without raw stderr',()=>{
  const result=summarizeFixtureGeneration({status:null,signal:'SIGTERM',error:{code:'ETIMEDOUT'},stderr:'Connection Invalid error for service com.apple.hiservices-xpcservice. /private/hidden'}, {elapsedMs:30000});
  assert.equal(result.categories.macosService,true);assert.equal(result.rawBodyPublished,false);
  assert(!JSON.stringify(result).includes('/private/hidden'));
});
check('LP26-O07-B runner captures diagnostic before rejecting bounded fixture',()=>{
  const source=fs.readFileSync(new URL('./verify_recording_current_longrun.mjs',import.meta.url),'utf8');
  assert(source.indexOf("console.log('[fixture-generation] '")<source.indexOf("check(generated.status===0"));
  assert(source.includes('timeout:30000,maxBuffer:65536'));assert(source.includes('generatedBytes>0&&generatedBytes<96*1024*1024'));
});
console.log(JSON.stringify({scope:'fixture-generation-diagnostic-self-test',passed,failed,elapsedMs:Math.round(performance.now()-start),cleanup:'산출물 없음',generatorExecuted:false,longrunPass:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));
process.exitCode=failed?1:0;
