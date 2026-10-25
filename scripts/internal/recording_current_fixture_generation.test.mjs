// 파일 용도: LP26-O07 생성기 비민감 결과 분류 자체검사. 생성기 실제 실행/장시간 PASS가 아니다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {createReviewTestArtifacts} from './va_review_test_artifacts.mjs';
import {summarizeFixtureGeneration,captureRetentionFixture} from './recording_current_observer.mjs';
const start=performance.now();let passed=0,failed=0;
const check=(title,run)=>{try{run();passed++;console.log('[pass] '+title);}catch(error){failed++;console.log('[fail] '+title+' '+error.message);}};
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

const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const mixedSource=fs.readFileSync(new URL('./v450_recording_a_mixed.mjs',import.meta.url),'utf8');
const fixtureBlock=mixedSource.slice(mixedSource.indexOf('  const generationStart='),mixedSource.indexOf('\n  budget();',mixedSource.indexOf('  const generationStart=')));
const expectedArgs=['-q','-e','videotestsrc','num-buffers=120','pattern=ball','!','video/x-raw,format=I420,width=160,height=90,framerate=30/1','!',
  'x264enc','tune=zerolatency','speed-preset=ultrafast','pass=quant','quantizer=0','key-int-max=30','!','h264parse','!','mp4mux','!','filesink'];
const okResult={pid:1234,status:0,signal:null,stdout:'',stderr:''};
// 실제 artifact writer와 filesystem만 사용. 외부 프로세스 실행기는 모든 경우 mock이다.
function fixture(test){
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-fixture-evidence-test-')));
  fs.chmodSync(root,0o700);const repo=process.cwd(),output=path.join(root,'retention.mp4');fs.writeFileSync(output,'valid mock output');
  const artifacts=createReviewTestArtifacts(repo,{MEDIA_SERVER_TEST_ARTIFACT_ROOT:root,MEDIA_SERVER_TEST_OUTPUT_DIR:path.join(root,'evidence')});
  const options={encoding:'utf8',timeout:30000,maxBuffer:65536,env:{TMPDIR:root,GST_PLUGIN_SYSTEM_PATH:'',AUTH_TOKEN:'do-not-copy'}};
  let calls=0,admitted=0;
  const run=(result=okResult,extra={})=>captureRetentionFixture({command:'gst-launch-1.0',argv:[...expectedArgs,`location=${output}`],options,
    root,repo,output,artifacts,admit:n=>{admitted+=n;},run:()=>{calls++;return result;},...extra});
  try{test({root,repo,output,artifacts,options,run,calls:()=>calls,admitted:()=>admitted});}
  finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
}
check('LP26-O07-C success intent precedes spawn and private artifacts reverify with 0600 SHA',()=>fixture(t=>{
  let tick=0,spawned=0,fsyncs=0;const original=fs.fsyncSync;fs.fsyncSync=(...args)=>{fsyncs++;return original(...args);};
  let r;try{r=t.run(okResult,{now:()=>tick,artifacts:{...t.artifacts,write:(...args)=>{tick+=25;return t.artifacts.write(...args);}},run:()=>{
    spawned++;assert(fs.existsSync(path.join(t.artifacts.outputDir,'retention-fixture-1.intent.json')));tick+=7;return okResult;
  }});}finally{fs.fsyncSync=original;}
  assert.equal(spawned,1);assert.equal(r.ok,true);assert.equal(r.elapsedMs,7);assert.equal(r.evidence.evidenceIoMs,100);assert.equal(fsyncs,4);
  const intent=JSON.parse(fs.readFileSync(path.join(t.artifacts.outputDir,'retention-fixture-1.intent.json')));
  assert.equal(intent.environment.GST_PLUGIN_SYSTEM_PATH,'');assert(!('AUTH_TOKEN' in intent.environment));assert.equal(intent.returnEvidence,'NOT_YET_OBSERVED');
  assert.equal(intent.timeoutMs,30000);assert.equal(intent.maxBuffer,65536);assert.equal(intent.cwd,'[repo]');
  for(const item of Object.values(r.evidence.artifacts)){
    const file=path.join(t.artifacts.outputDir,item.file),bytes=fs.readFileSync(file);assert.equal(fs.statSync(file).mode&0o777,0o600);
    assert.equal(item.bytes,bytes.length);assert.equal(item.sha256,hash(bytes));assert.throws(()=>t.artifacts.write(item.file,'overwrite'));
  }
  assert.equal(t.admitted(),Object.values(r.evidence.artifacts).reduce((n,a)=>n+a.bytes,0));
  const receipt=JSON.parse(fs.readFileSync(path.join(t.artifacts.outputDir,'retention-fixture-1.receipt.json')));
  assert.equal(receipt.pid,1234);assert.equal(receipt.cleanupState,'PENDING_EXISTING_RUNNER_FINALLY');assert.equal(receipt.cleanupCorrelation,r.evidence.id);
}));
for(const [title,result,reason] of [
  ['timeout SIGTERM',{...okResult,status:null,signal:'SIGTERM',error:{code:'ETIMEDOUT',message:'private'},stderr:'Connection Invalid: diagnostic preserved'},'ETIMEDOUT'],
  ['nonzero exit',{...okResult,status:1,stderr:'could not link element'},'NONZERO_EXIT'],
  ['spawn error',{status:null,pid:0,stdout:null,stderr:null,error:{code:'ENOENT'}},'ENOENT'],
  ['output cap error',{...okResult,error:{code:'ENOBUFS'}},'ENOBUFS']
])check('LP26-O07-D '+title,()=>fixture(t=>{
  const r=t.run(result);assert.equal(r.ok,false);assert.equal(r.evidence.fixtureFailure,reason);assert.equal(r.evidence.artifactState,'CAPTURED');
  assert.equal(r.evidence.summary.errorCode,result.error?.code??null);
  assert.equal(fs.readFileSync(path.join(t.artifacts.outputDir,'retention-fixture-1.stderr.txt'),'utf8'),result.stderr??'');
  assert(!JSON.stringify(r.evidence).includes('diagnostic preserved'));assert(!JSON.stringify(r.evidence).includes('could not link element'));
}));
check('LP26-O07-E empty stdout stderr are captured, absent PID is null not fabricated',()=>fixture(t=>{
  const r=t.run({...okResult,pid:undefined});assert(r.ok);assert.equal(r.evidence.pid,null);
  for(const stream of Object.values(r.evidence.streams)){assert.equal(stream.recordedBytes,0);assert.equal(stream.sha256,hash(''));assert(!stream.incomplete);}
}));
check('LP26-O07-F UTF-8 sanitization preserves diagnostic text privately and hashes re-encoded bytes',()=>fixture(t=>{
  const text=`오류 plugin-scanner ${t.root}/input Authorization: Bearer secret\nhttps://private.invalid/path token=secret /Users/person/config\nlast diagnostic`;
  const r=t.run({...okResult,stderr:text});const stream=r.evidence.streams.stderr;
  const saved=fs.readFileSync(path.join(t.artifacts.outputDir,'retention-fixture-1.stderr.txt'),'utf8');
  assert(saved.includes('오류 plugin-scanner'));assert(saved.includes('last diagnostic'));assert(!saved.includes('secret'));assert(!saved.includes('/Users/person'));
  assert(stream.redacted);assert.equal(stream.recordedBytes,Buffer.byteLength(saved));assert.equal(stream.sha256,hash(saved));assert.equal(stream.returnedUtf8Bytes,Buffer.byteLength(text));
  assert(stream.representation.includes('not original pipe bytes'));assert.equal(r.evidence.rawBodyPublished,false);
}));
for(const name of ['stdout','stderr'])check('LP26-O07-G '+name+' cap and partial collection fail closed',()=>fixture(t=>{
  const r=t.run({...okResult,[name]:'가'.repeat(23000)});assert(!r.ok);assert.equal(r.evidence.collection,'INCOMPLETE');
  assert(r.evidence.streams[name].truncated);assert(r.evidence.streams[name].recordedBytes<=65536);
  const text=fs.readFileSync(path.join(t.artifacts.outputDir,`retention-fixture-1.${name}.txt`),'utf8');assert(!text.includes('\ufffd'));
}));
check('LP26-O07-G missing stream is unavailable, not an empty complete pipe',()=>fixture(t=>{
  const r=t.run({...okResult,stdout:null});assert(!r.ok);assert.equal(r.evidence.streams.stdout.available,false);assert.equal(r.evidence.streams.stdout.returnedUtf8Bytes,null);
}));
for(const kind of ['missing','directory','symlink','hardlink','lstat-error'])check('LP26-O07-H output '+kind,()=>fixture(t=>{
  let extra={};
  if(kind==='lstat-error')extra={lstat:()=>{throw Object.assign(Error('private path'),{code:'EACCES'});}};
  else if(kind==='hardlink')fs.linkSync(t.output,t.output+'.link');
  else{fs.unlinkSync(t.output);if(kind==='directory')fs.mkdirSync(t.output);if(kind==='symlink')fs.symlinkSync('missing-target',t.output);}
  const r=t.run(okResult,extra);assert(!r.ok);assert.equal(r.evidence.fixtureFailure,'OUTPUT_INVALID');
  if(kind==='missing')assert.equal(r.evidence.output.exists,false);
  if(kind==='lstat-error')assert.equal(r.evidence.output.lstatError,'EACCES');
  if(kind==='symlink')assert.equal(r.evidence.output.symlink,true);
}));
check('LP26-O07-I pre-call write failure prevents spawn',()=>fixture(t=>{
  const r=t.run(okResult,{artifacts:{...t.artifacts,write:()=>{throw Object.assign(Error('private'),{code:'ENOSPC'});}}});
  assert.equal(t.calls(),0);assert.equal(r.evidence.fixtureState,'NOT_RUN');assert.equal(r.evidence.artifactState,'FAIL');assert.equal(r.evidence.errors[0].code,'ENOSPC');
}));
check('LP26-O07-I workspace admission failure prevents spawn',()=>fixture(t=>{
  const r=t.run(okResult,{admit:()=>{throw Error('workspace-cap');}});assert.equal(t.calls(),0);assert(!r.ok);
}));
check('LP26-O07-J post-call artifact failure never overwrites timeout',()=>fixture(t=>{
  const r=t.run({...okResult,status:null,signal:'SIGTERM',error:{code:'ETIMEDOUT'}},{artifacts:{...t.artifacts,write:(name,bytes)=>{
    if(name.endsWith('stderr.txt'))throw Object.assign(Error('private'),{code:'ENOSPC'});return t.artifacts.write(name,bytes);
  }}});
  assert.equal(t.calls(),1);assert.equal(r.evidence.fixtureFailure,'ETIMEDOUT');assert.equal(r.evidence.artifactState,'FAIL');assert.equal(r.evidence.errors[0].code,'ENOSPC');
  const receipt=JSON.parse(fs.readFileSync(path.join(t.artifacts.outputDir,'retention-fixture-1.receipt.json')));assert.equal(receipt.fixtureFailure,'ETIMEDOUT');assert.equal(receipt.errors[0].artifact,'stderr.txt');
}));
for(const damage of ['sha','missing','permission'])check('LP26-O07-K artifact reread '+damage+' failure',()=>fixture(t=>{
  const r=t.run(okResult,{artifacts:{...t.artifacts,write:(name,bytes)=>{
    const item=t.artifacts.write(name,bytes);if(name.endsWith('intent.json')){
      const f=path.join(t.artifacts.outputDir,name);if(damage==='sha')fs.writeFileSync(f,Buffer.alloc(item.bytes,32));
      if(damage==='missing')fs.unlinkSync(f);if(damage==='permission')fs.chmodSync(f,0o644);
    }return item;
  }}});assert.equal(t.calls(),0);assert.equal(r.evidence.errors[0].stage,'verify');assert(!r.ok);
}));
check('LP26-O07-K receipt save failure is explicit and fail closed',()=>fixture(t=>{
  const r=t.run(okResult,{artifacts:{...t.artifacts,write:(name,bytes)=>{
    if(name.endsWith('receipt.json'))throw Object.assign(Error('full'),{code:'ENOSPC'});return t.artifacts.write(name,bytes);
  }}});assert(!r.ok);assert.equal(r.evidence.fixtureState,'PASS');assert.equal(r.evidence.errors.at(-1).artifact,'receipt.json');
}));
// 실제 mixed runner의 생성 구간을 실행한다. finally 본문은 아래 byte 결속으로 기존 경로와 대조한다.
function mixedMock(t,{short=true,result=okResult,breakIntent=false}={}){
  const input=path.join(t.root,'input');fs.mkdirSync(input);fs.writeFileSync(path.join(input,'retention.mp4'),'media');
  let launches=0,downstream=0,cleanup=0,argvSeen,optionsSeen,now=0;
  const spawnMock=(command,argv,options)=>{launches++;assert.equal(command,'gst-launch-1.0');argvSeen=argv;optionsSeen=options;now+=9;return result;};
  const fakeArtifacts=breakIntent?{...t.artifacts,write:()=>{throw Error('mock-artifact-failure');}}:t.artifacts;
  const context={short,root:t.root,repo:t.repo,path,fs,process,performance:{now:()=>now},console:{log:()=>{}},artifacts:fakeArtifacts,
    captureRetentionFixture:args=>captureRetentionFixture({...args,run:spawnMock,now:()=>now}),spawnSync:spawnMock,
    workspace:null,workspaceFailure:{},storageNow:()=>({totalBytes:1}),admitWorkspaceSnapshot:()=>{},fixtureGenerationEvidence:null,
    stateExecution:null,summarizeFixtureGeneration,check:(ok,label)=>assert(ok,label),assertMixedFixtureInput:()=>({mock:true}),fixtureProfile:{name:'continuous-r114'}};
  let error=null;try{vm.runInNewContext(fixtureBlock,context);downstream++;}catch(e){error=e;}finally{cleanup++;}
  return {launches,downstream,cleanup,argvSeen,optionsSeen,evidence:context.fixtureGenerationEvidence,error};
}
for(const [title,opts,expected] of [
  ['success',{},1],['timeout',{result:{...okResult,status:null,signal:'SIGTERM',error:{code:'ETIMEDOUT'}}},0],
  ['artifact failure',{breakIntent:true},0],['cap',{result:{...okResult,stderr:'x'.repeat(65537)}},0]
])check('LP26-O07-L actual mixed prepare fragment '+title+' gates downstream and reaches cleanup',()=>fixture(t=>{
  const r=mixedMock(t,opts);assert.equal(r.downstream,expected);assert.equal(r.cleanup,1);assert.equal(r.launches,opts.breakIntent?0:1);
  if(expected)assert.equal(r.evidence.elapsedMs,9);else assert(r.error);
  if(r.launches){assert.deepEqual(Array.from(r.argvSeen),[...expectedArgs,`location=${path.join(t.root,'input/retention.mp4')}`]);
    assert.equal(r.optionsSeen.encoding,'utf8');assert.equal(r.optionsSeen.timeout,30000);assert.equal(r.optionsSeen.maxBuffer,65536);
    assert.equal(r.optionsSeen.env.TMPDIR,path.join(t.root,'tmp'));assert.equal(r.optionsSeen.cwd,undefined);
    assert.deepEqual({...r.optionsSeen.env},{...process.env,TMPDIR:path.join(t.root,'tmp')});}
}));
check('LP26-O07-M non-prepare directly uses unchanged spawn options with no evidence writes',()=>fixture(t=>{
  const r=mixedMock(t,{short:false});assert.equal(r.downstream,1);assert.equal(r.evidence,null);assert.equal(r.launches,1);
  assert.deepEqual(fs.readdirSync(t.artifacts.outputDir),['started.json']);assert.equal(r.optionsSeen.timeout,30000);assert.equal(r.optionsSeen.maxBuffer,65536);
}));
check('LP26-O07-N existing catch/finally and Identity cleanup remain byte-equivalent except additive evidence reference',()=>{
  const tail=mixedSource.slice(mixedSource.indexOf('  }catch(error){failed++;if(error.workspaceDecision)'))
    .replace('fixtureGenerationEvidence,processIdentityEvidencePass:','processIdentityEvidencePass:');
  // 승인된 state 전용 Active/History report 필드를 포함한 종료부에 결속한다.
  assert.equal(hash(tail),'c1c9880437a77522ce3caa4384df048c01d9e837826e0a28e524a0de482eb12a');
  assert(mixedSource.includes("short=args.length===1&&args[0]==='--app-observe'"));
});

// FINAL_RESULT
console.log(JSON.stringify({scope:'fixture-generation-diagnostic-self-test',passed,failed,elapsedMs:Math.round(performance.now()-start),cleanup:'소유 mock 임시 root 삭제·부재 확인',generatorExecuted:false,longrunPass:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));
process.exitCode=failed?1:0;
