// 기본 검사는 합성 정보, 명시 opt-in은 보존된 실측 파일을 읽는다. 제품/HTTP/미디어 생성 없음.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {EARLY_STATE_INPUT as p,selectStateInputProfile,requireStateInputExecutable,stateInputArgs,stateInputProbeArgs,
  validateStateInputMedia,stateInputCapacity,assessSyntheticStateWriterSegments,validateQualifiedStateInput,STATE_BINDING_SHA,STATE_PRODUCT_SMOKE_SHA,assessQualifiedStateReview,stateHelperBytes} from './recording_state_input_profile.mjs';
import {workspaceBounds,freezeCurrentWorkspace,measureCurrentWorkspace} from './recording_current_observer.mjs';
import {mixedRecordingProfile} from './recording_longrun_progress.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceSha='a'.repeat(64),inputSha='b'.repeat(64);
const rows=()=>['9101','9201'].flatMap(channel=>[0,1,2].map(i=>({channel,id:`${channel}-${i}`,store:'store-1',order:i+1,
  writer:'GStreamerSegmentWriter',finalized:true,fileVerified:true,fileSha:'c'.repeat(64),sourceSha,inputSha,
  bytes:56000,catalogBytes:56000,startedMs:i*2000,finishedMs:(i+1)*2000,ptsStart:i*60,ptsEnd:(i+1)*60,timeBase:'1/30'})));
const probe=()=>({streams:[{codec_name:'h264',width:160,height:90,r_frame_rate:'30/1',avg_frame_rate:'30/1',time_base:'1/3000'}],
  frames:Array.from({length:120},(_,i)=>({width:160,height:90,pts:i*100,key_frame:i%30===0?1:0}))});
const media=()=>{const bytes=Buffer.from('synthetic media; no actual decoding');return {bytes,copy:Buffer.from(bytes),expectedSha:sha(bytes),sourceSha,expectedSourceSha:sourceSha,probe:probe()};};
test('default profile and fixed R114 quota/input contract unchanged',()=>{
  assert.equal(selectStateInputProfile(['--state-diagnostic']),null);assert.equal(selectStateInputProfile(['--app-observe'],''),null);
  const r=mixedRecordingProfile('continuous-r114');assert.equal(r.continuousMaxBytes,113246208);assert.equal(r.E,67108864);
  assert.equal(r.segmentBytes,71237);assert.equal(r.protectedFiles,643);assert.equal(r.M,260716);
  assert.equal(r.inputNormalizedSha256,'baebad5cad233243c4748f6bfec06fa5d2da7f06ae9b1475c9b20bfbfb04e2e7');
});
test('opt-in is state-only and blocks missing real evidence',()=>{
  assert.equal(selectStateInputProfile(['--state-diagnostic'],p.name),p);assert.throws(()=>requireStateInputExecutable(p,{}),/state-input-evidence-required/);
  assert.doesNotThrow(()=>requireStateInputExecutable(null));
  for(const args of [[],['--app-observe'],['--duration-minutes','120'],['--state-diagnostic','extra']])assert.throws(()=>selectStateInputProfile(args,p.name));
  assert.throws(()=>selectStateInputProfile(['--state-diagnostic'],'unknown'));
});
test('exact encoder, resolution, FPS and GOP argument binding',()=>{
  assert.deepEqual(stateInputArgs('/owned/input.mp4'),['-q','-e','videotestsrc','num-buffers=120','pattern=smpte','!',
    'video/x-raw,format=I420,width=160,height=90,framerate=30/1','!','x264enc','tune=zerolatency','speed-preset=ultrafast',
    'pass=cbr','bitrate=224','key-int-max=30','!','h264parse','!','mp4mux','!','filesink','location=/owned/input.mp4']);
  assert.equal(p.segmentSeconds,2);assert.equal(p.timeoutMs,30000);assert.equal(p.maxBuffer,65536);
  assert(stateInputProbeArgs('/owned/input.mp4').includes('-show_frames'));
  assert.throws(()=>stateInputArgs('relative'));assert.throws(()=>stateInputProbeArgs('/bad\0file'));
});
test('input decode metadata is not Writer Segment evidence',()=>{
  const r=validateStateInputMedia(media());assert.equal(r.frames,120);assert.equal(r.durationSeconds,4);
  assert.equal(r.actualSegmentSize,'NOT_TESTED');assert.equal(r.writerOrder,'NOT_TESTED');assert.equal(r.stateReady,false);
  assert.equal(assessSyntheticStateWriterSegments(null).expectedDeletionWindow,'UNPROVEN');
});
for(const [label,change] of [
  ['source',m=>m.sourceSha='d'.repeat(64)],['media hash',m=>m.expectedSha='d'.repeat(64)],['copy',m=>m.copy=Buffer.from('other')],
  ['oversize',m=>m.bytes=Buffer.alloc(1048577)],['codec',m=>m.probe.streams[0].codec_name='hevc'],
  ['resolution',m=>m.probe.streams[0].width=320],['fps',m=>m.probe.streams[0].avg_frame_rate='25/1'],
  ['timebase',m=>m.probe.streams[0].time_base='0/1'],['frame count',m=>m.probe.frames.pop()],
  ['negative PTS',m=>m.probe.frames[0].pts=-1],['duplicate PTS',m=>m.probe.frames[1].pts=0],
  ['nonzero origin',m=>m.probe.frames.forEach(f=>f.pts+=100)],['keyframe',m=>m.probe.frames[0].key_frame=0],
])test(`input rejects ${label}`,()=>{const m=media();change(m);assert.throws(()=>validateStateInputMedia(m));});
test('protected bytes and Workspace original/copy/reserve are independent',()=>{
  const r=stateInputCapacity({inputBytes:120000,copyBytes:120000});assert.equal(r.protectedBytes,45805391);
  assert.equal(r.additionalProtectedBytes,71237);assert.equal(r.marginBytes,260716);
  assert.equal(r.variableBytes,6411456);assert.equal(r.copyBytes,120000);assert.equal(r.combinedBytes,6531456);
  assert.equal(r.quotaBytes-r.reservationBytes,46137344);
});
// 448MiB is EACH component cap; Combined cap is fixed + 896MiB.
for(const kind of ['variable','copy','combined'])for(const delta of [-1,0,1])test(`Workspace strict ${kind} edge ${delta}`,()=>{
  const cap=448*1048576,fixed=123,reserve=6*1048576;
  const variable=kind==='variable'?cap+delta:kind==='copy'?reserve:cap-1;
  const copy=kind==='copy'?cap+delta:kind==='variable'?0:cap+delta+1;
  const input={inputBytes:0,copyBytes:0,otherVariableBytes:variable-reserve,otherCopyBytes:copy,fixedBytes:fixed};
  // Combined -1 is already invalid: both components < cap imply Combined <= fixed+2*cap-2.
  if(delta<0&&kind!=='combined'){
    const r=stateInputCapacity(input),w=workspaceBounds(fixed+variable,fixed,copy,cap);
    assert.equal(r.variableBytes,w.variableBytes);assert.equal(r.copyBytes,w.copyBytes);assert.equal(r.combinedBytes,w.combinedBytes);
  }else{
    assert.throws(()=>stateInputCapacity(input),/INPUT_CAPACITY_BLOCKED/);
    assert.throws(()=>workspaceBounds(fixed+variable,fixed,copy,cap),/workspace-(variable|copy|combined)-cap/);
  }
});
test('Workspace largest reachable combined value and 448MiB combined preserve existing contract',()=>{
  const cap=448*1048576,fixed=123,reserve=6*1048576;
  const r=stateInputCapacity({inputBytes:0,copyBytes:0,otherVariableBytes:cap-1-reserve,otherCopyBytes:cap-1,fixedBytes:fixed});
  assert.equal(r.combinedBytes,fixed+2*cap-2);
  assert.equal(r.combinedBytes,workspaceBounds(fixed+cap-1,fixed,cap-1,cap).combinedBytes);
  assert.equal(stateInputCapacity({inputBytes:0,copyBytes:0,otherVariableBytes:cap/2-reserve,otherCopyBytes:cap/2}).combinedBytes,cap);
});
test('Workspace mismatched copy and arithmetic overflow fail',()=>{
  for(const v of [{inputBytes:1,copyBytes:0},{inputBytes:1,copyBytes:1,fixedBytes:Number.MAX_SAFE_INTEGER},{inputBytes:0,copyBytes:0,fixedBytes:Number.MAX_SAFE_INTEGER-448*1048576}])assert.throws(()=>stateInputCapacity(v));
});
test('synthetic per-channel bytes/duration determine conditional estimate, not whole input size',()=>{
  const r=assessSyntheticStateWriterSegments(rows(),{sourceSha,inputSha});for(const c of Object.values(r.channels)){
    assert.equal(c.minBytes,56000);assert.equal(c.maxBytes,56000);assert.equal(c.meanBytes,56000);
    assert.equal(c.bytesPerSecond,28000);assert.equal(c.conditionalDeletionSeconds,46137344/28000);
  }assert.equal(r.stateReady,false);assert.equal(r.actualSegmentSize,'NOT_TESTED');
  assert.equal(r.syntheticReceipt,'VALIDATED');assert.equal(r.expectedDeletionWindow,'SYNTHETIC_ESTIMATE');
});
test('mean target is descriptive; maximum bound is mandatory',()=>{
  const r=rows();r.forEach(v=>v.bytes=v.catalogBytes=34000);assert.equal(assessSyntheticStateWriterSegments(r,{sourceSha,inputSha}).channels['9101'].meanTargetMet,false);
  r[0].bytes=r[0].catalogBytes=71237;assert.doesNotThrow(()=>assessSyntheticStateWriterSegments(r,{sourceSha,inputSha}));
  r[0].bytes=r[0].catalogBytes=71238;assert.throws(()=>assessSyntheticStateWriterSegments(r,{sourceSha,inputSha}));
});
for(const [label,change] of [
  ['wrong channel',r=>r[0].channel='1'],['source mismatch',r=>r[0].sourceSha=inputSha],['input mismatch',r=>r[0].inputSha=sourceSha],
  ['input-only producer',r=>r[0].writer='gst-launch'],['partial file',r=>r[0].finalized=false],['unverified file',r=>r[0].fileVerified=false],
  ['catalog bytes',r=>r[0].catalogBytes++],['duplicate ID',r=>r[1].id=r[0].id],['order reversal',r=>r[1].order=1],
  ['store change',r=>r[1].store='store-2'],['PTS reversal',r=>{r[1].ptsStart=0;r[1].ptsEnd=60;}],
  ['product nanosecond timebase',r=>r[0].timeBase='1/1000000000'],['inclusive end PTS',r=>r[0].ptsEnd=59],
  ['duration',r=>r[0].finishedMs=1999],['missing channel',r=>r.splice(3)],['insufficient samples',r=>r.splice(1,2)],
])test(`synthetic Writer receipt rejects ${label}`,()=>{const r=rows();change(r);assert.throws(()=>assessSyntheticStateWriterSegments(r,{sourceSha,inputSha}));});
test('startup gaps lower measured production rate without promising deletion',()=>{
  const r=rows();r[2].startedMs+=2000;r[2].finishedMs+=2000;
  const c=assessSyntheticStateWriterSegments(r,{sourceSha,inputSha}).channels['9101'];assert.equal(c.bytesPerSecond,21000);
  assert(c.conditionalDeletionSeconds>46137344/28000);
});
test('existing Driver body, duration and protection guard remain bound',()=>{
  const driver=fs.readFileSync(new URL('./v450_recording_a_mixed.mjs',import.meta.url),'utf8');
  assert(driver.indexOf('requireStateInputExecutable(selectStateInputProfile(')<driver.indexOf('const stateDiagnose='));
  assert(driver.includes("num-buffers=120','pattern=ball'"));assert(driver.includes("'pass=quant','quantizer=0'"));
  assert(driver.includes('stateDiagnose?2700000'));assert(driver.includes('stateDiagnose?2880000'));
  const tail=driver.slice(driver.indexOf('  }catch(error){failed++;if(error.workspaceDecision)')).replace('fixtureGenerationEvidence,processIdentityEvidencePass:','processIdentityEvidencePass:');
  assert.equal(sha(tail),'c1c9880437a77522ce3caa4384df048c01d9e837826e0a28e524a0de482eb12a');
  const retention=fs.readFileSync(new URL('../../src/recording/retention_coordinator.cpp',import.meta.url),'utf8');
  assert(retention.includes('!candidate.Pinned() && candidate.hold_count == 0'));
});

// 이 fixture는 Review의 의미 검사만 시험한다. 실행 적격성은 고정 SHA manifest 검증 후에만 부여된다.
const qualifiedReview=()=>({status:'STATE_WRITER_SEGMENT_MEASUREMENT_PASS',productExit:0,actualProductExecutions:1,
  input:{sha256:STATE_BINDING_SHA.input,bytes:120647},maxBoundBytes:71237,maxObservedSegmentBytes:64423,
  fileBindingCount:132,normalTwoSecondCount:130,pendingOrIncompleteCatalogSegments:0,unmappedMediaFiles:0,
  originalManifestSha256:STATE_BINDING_SHA.originalManifest,cleanup:{workAbsent:true,processGroupAbsent:true},
  channels:Object.fromEntries(['9101','9201'].map(id=>[id,{normalTwoSecond:{count:65,mean:3952839/65},allFinalized:{max:64423}}]))});
test('qualified input rejects size and SHA substitution',()=>{
  for(const size of [67929,120646,120648])assert.throws(()=>validateQualifiedStateInput(Buffer.alloc(size)),/state-qualified-input-size/);
  assert.throws(()=>validateQualifiedStateInput(Buffer.alloc(120647)),/state-qualified-input-sha/);
});
test('real review semantics cannot be replaced by synthetic receipt or incomplete measurement',()=>{
  assert.doesNotThrow(()=>assessQualifiedStateReview(qualifiedReview()));
  for(const change of [r=>r.status='VALIDATED',r=>r.productExit=1,r=>r.actualProductExecutions=0,
    r=>r.input.bytes=67929,r=>r.input.sha256=inputSha,r=>r.maxObservedSegmentBytes=71238,
    r=>r.pendingOrIncompleteCatalogSegments=1,r=>r.unmappedMediaFiles=1,r=>r.fileBindingCount=131,
    r=>r.originalManifestSha256=inputSha,r=>delete r.channels['9201'],r=>r.channels['9101'].normalTwoSecond.count=64,
    r=>r.cleanup.processGroupAbsent=false]){const r=qualifiedReview();change(r);assert.throws(()=>assessQualifiedStateReview(r));}
});
test('State consumer preserves duration, source guard, fixture branch and default build path',()=>{
  const read=n=>fs.readFileSync(new URL('./'+n,import.meta.url),'utf8');
  const driver=read('v450_recording_a_mixed.mjs'),supervisor=read('run_v450_recording_a_mixed.py'),wrapper=read('verify_v450_recording_a_mixed.sh');
  for(const token of ['stateDiagnose?2700000','stateDiagnose?2880000','values.BIN_PATH=stateExecution.product','values.BUILD_DIR=path.dirname(stateExecution.runtime)',
    'stateExecution?validateQualifiedStateInput','assertMixedFixtureInput','regenerated:false'])assert(driver.includes(token),token);
  assert(supervisor.includes("2880 if sys.argv[1] == '--state-diagnostic'"));assert(supervisor.includes("2700 if sys.argv[1] == '--state-diagnostic'"));
  assert(supervisor.includes("subprocess.check_output(['git', 'status', '--porcelain'], cwd=repo)"));
  assert(supervisor.indexOf("raise SystemExit('commit source before long observation')")<supervisor.indexOf('directory.mkdir(mode=0o700)',supervisor.indexOf('def main():')));
  assert(wrapper.includes('node "$observer_script/recording_state_input_profile.mjs" --install-helpers "$observer_run"\nelse\nobserver_build="$observer_repo/build-gst-onnx"'));
});
const replay=process.env.MEDIA_SERVER_STATE_BINDING_TEST;
test('required generated helper rejects missing source, changed bytes, size and SHA',()=>{
  const entry={path:path.resolve('src/recording/recording_catalog.cpp'),generator:'instrumentCatalog',bytes:376755,
    sha256:'03dba9c9c535f97202ac40e7c817aeea0c82aae72abe6478da99ec0a3fc00817'};
  assert.equal(stateHelperBytes(entry).length,376755);
  const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-state-source-test-')));
  try{
    const changed=path.join(dir,'catalog.cpp');fs.writeFileSync(changed,fs.readFileSync(entry.path,'utf8')+'\n');
    for(const patch of [{path:changed},{bytes:376754},{sha256:'0'.repeat(64)}])
      assert.throws(()=>stateHelperBytes({...entry,...patch}),/state-helper-generated-binding/);
    assert.throws(()=>stateHelperBytes({...entry,path:path.join(dir,'missing')}),/ENOENT/);
    assert.throws(()=>stateHelperBytes({...entry,generator:'unknown'}),/state-helper-generator/);
  }finally{fs.rmSync(dir,{recursive:true});assert(!fs.existsSync(dir));}
});
assert(replay===undefined||replay==='1','MEDIA_SERVER_STATE_BINDING_TEST must be unset or 1');
test('qualified State binding: preserved real evidence and stale/missing assets', {skip:replay!=='1'},()=>{
  const env=process.env,binding=requireStateInputExecutable(p,env);
  assert.equal(binding.product,env.MEDIA_SERVER_STATE_PRODUCT);assert.equal(binding.runtime,env.MEDIA_SERVER_STATE_RUNTIME);
  const verified=env.MEDIA_SERVER_STATE_VERIFIED_RESULT!==undefined;
  const current=env.MEDIA_SERVER_STATE_PRODUCT_SMOKE!==undefined&&!verified;
  assert.equal(binding.sha256.product,verified?'d5b561dc58b203cbbca20e5450afb850a3a84507f466fe99eb70b23715719a67':current?'3f40e4b6530e9c89922d31004dd9c9b758cf338ec165989835aff9f5d042bddc':'ed42ee3c55a3e48c2b30d564aa0397bf15c9acd5a89ad2145f1accc10546f4a8');
  assert.equal(binding.sha256.runtime,verified?'cca20ab07bb1ae3a39bad63a2fa91cb1e25c2099db90604d5427f8a9e63de974':current?'da42acfb1d41fe4690a1440999d44a485591ee9c9b814ddb9c1e357b35c6bf83':'d9081c27bd5a0966e19719136b51b92433a3e67f79f4c56cbf70666f95a194b4');
  if(verified){
    const sources=JSON.parse(fs.readFileSync(path.join(path.dirname(env.MEDIA_SERVER_STATE_VERIFIED_RESULT),'source-manifest.json')));
    const models=JSON.parse(fs.readFileSync(path.join(env.MEDIA_SERVER_STATE_PRODUCT_SMOKE,'model-sha256.json')));
    assert.equal(binding.matched,Object.keys(sources).length+Object.keys(models).length);
  }else assert(binding.matched>1500);
  assert.equal(Object.keys(binding.helpers).length,4);
  assert.equal(validateQualifiedStateInput(fs.readFileSync(binding.input)).bytes,120647);
  const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-state-binding-test-')));fs.chmodSync(dir,0o700);
  try{
    const changed=path.join(dir,'input.mp4');fs.writeFileSync(changed,Buffer.alloc(120647));
    if(verified){
      assert.equal(binding.verifiedResultSha256,'3d612a61529bbea52db695d88b2af06652c7e403999a6894a3188657cbe1d5d7');
      assert.equal(binding.freshness.status,'PASS_TARGET_AWARE_PREFLIGHT');
      const cli=spawnSync(process.execPath,['scripts/internal/recording_state_input_profile.mjs','--binding'],{env,encoding:'utf8',timeout:20000});
      assert.equal(cli.status,0,cli.stderr);assert.deepEqual(JSON.parse(cli.stdout),binding);
      const original=JSON.parse(fs.readFileSync(env.MEDIA_SERVER_STATE_VERIFIED_RESULT));
      fs.copyFileSync(path.join(path.dirname(env.MEDIA_SERVER_STATE_VERIFIED_RESULT),'source-manifest.json'),path.join(dir,'source-manifest.json'));
      const altered=path.join(dir,'result.json');
      // 테스트에서만 변형 결과에 별도 기대 digest를 제공해 최초 SHA 검사 이후 오류 경계를 검사한다.
      const reject=(name,mutate,pattern)=>{
        const value=structuredClone(original);mutate(value);
        const bytes=Buffer.from(JSON.stringify(value));fs.writeFileSync(altered,bytes);
        fs.writeFileSync(path.join(dir,'build-binding.json'),JSON.stringify(value.binding));
        assert.throws(()=>requireStateInputExecutable(p,{...env,MEDIA_SERVER_STATE_VERIFIED_RESULT:altered,
          MEDIA_SERVER_STATE_VERIFIED_RESULT_SHA256:sha(bytes)}),pattern,name);
        console.log(JSON.stringify({scope:'verified-result-rejection',name,passed:true}));
      };
      reject('missing build field',v=>{delete v.build;},/state-verified-result-status/);
      reject('unsupported schema',v=>{v.schema='unsupported';},/state-verified-result-schema/);
      reject('failed build',v=>{v.build.exit=1;},/state-verified-result-status/);
      reject('incomplete HTTP',v=>{delete v.integration.sourceEnd;},/state-verified-source-binding/);
      reject('source mismatch',v=>{v.integration.sourceStart.head='0'.repeat(40);},/state-verified-source-binding/);
      reject('product SHA mismatch',v=>{v.binding.artifacts.media_server.sha256='0'.repeat(64);},/state-verified-source-product/);
      reject('runtime SHA mismatch',v=>{v.binding.artifacts['libmedia_server_runtime.a'].sha256='0'.repeat(64);},/state-binding-sha/);
      reject('source manifest mismatch',v=>{v.binding.sourceManifestSHA256='0'.repeat(64);},/state-binding-sha/);
      reject('helper missing',v=>{v.analysis.fixedBinding[0].root=dir;},/ENOENT/);
      reject('helper altered digest',v=>{v.analysis.helperHashes.normalize.sha256='0'.repeat(64);},/state-binding-sha/);
      reject('missing helper field',v=>{delete v.analysis.helperHashes.normalize;},/state-verified-helper-field/);
      for(const patch of [{MEDIA_SERVER_STATE_VERIFIED_RESULT:path.join(dir,'absent')},
        {MEDIA_SERVER_STATE_VERIFIED_RESULT_SHA256:'0'.repeat(64)},
        {MEDIA_SERVER_STATE_VERIFIED_RESULT_SHA256:undefined},
        {MEDIA_SERVER_STATE_VERIFIED_RESULT:undefined},
        {MEDIA_SERVER_STATE_PRODUCT:'/private/tmp/media-server-product-smoke-aa3wkyf0/build/media_server'},
        {MEDIA_SERVER_STATE_RUNTIME:'/private/tmp/media-server-product-smoke-aa3wkyf0/build/libmedia_server_runtime.a'}])
        assert.throws(()=>requireStateInputExecutable(p,{...env,...patch}));
      // 旧 인터페이스를 최신 증거로 대체하면 고정 SHA 거부를 유지한다.
      assert.throws(()=>requireStateInputExecutable(p,{...env,MEDIA_SERVER_STATE_VERIFIED_RESULT:undefined,
        MEDIA_SERVER_STATE_VERIFIED_RESULT_SHA256:undefined,MEDIA_SERVER_STATE_PRODUCT_SMOKE:path.dirname(env.MEDIA_SERVER_STATE_VERIFIED_RESULT)}),/state-binding-sha/);
    }

    if(current){
      assert.equal(binding.productSmokeSha256,STATE_PRODUCT_SMOKE_SHA.result);
      assert.equal(binding.freshness.status,'PASS_TARGET_AWARE_PREFLIGHT');
      for(const patch of [{MEDIA_SERVER_STATE_PRODUCT_SMOKE:''},{MEDIA_SERVER_STATE_PRODUCT_SMOKE:dir},
        {MEDIA_SERVER_STATE_PRODUCT:'/private/tmp/media-server-limited-build-hStVHv/work/media_server'},
        {MEDIA_SERVER_STATE_RUNTIME:'/private/tmp/media-server-limited-build-hStVHv/work/build/libmedia_server_runtime.a'},
        {MEDIA_SERVER_STATE_PRODUCT_SMOKE:undefined}])assert.throws(()=>requireStateInputExecutable(p,{...env,...patch}));
      fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({buildVerdict:'BUILD_LINK_VERIFIED'}));
      assert.throws(()=>requireStateInputExecutable(p,{...env,MEDIA_SERVER_STATE_PRODUCT_SMOKE:dir}),/state-binding-sha/);
    }
    for(const patch of [{MEDIA_SERVER_STATE_INPUT_MEDIA:changed},{MEDIA_SERVER_STATE_WRITER_REVIEW:dir},
      {MEDIA_SERVER_STATE_INPUT_MEDIA:path.join(dir,'absent')},{MEDIA_SERVER_STATE_PRODUCT:path.resolve('build-gst-onnx/media_server')},
      {MEDIA_SERVER_STATE_RUNTIME:path.resolve('build-gst-onnx/libmedia_server_runtime.a')}])assert.throws(()=>requireStateInputExecutable(p,{...env,...patch}));
    fs.copyFileSync(path.join(path.dirname(env.MEDIA_SERVER_STATE_WRITER_REVIEW),'plan.json'),path.join(dir,'plan.json'));
    const review=path.join(dir,'review');fs.mkdirSync(review);fs.writeFileSync(path.join(review,'SHA256SUMS'),'invalid manifest');
    assert.throws(()=>requireStateInputExecutable(p,{...env,MEDIA_SERVER_STATE_WRITER_REVIEW:review}),/state-binding-sha/);
    const helpers=path.join(dir,'helpers');fs.mkdirSync(helpers,{mode:0o700});
    const run=spawnSync(process.execPath,['scripts/internal/recording_state_input_profile.mjs','--install-helpers',helpers],{env,encoding:'utf8',timeout:20000});
    assert.equal(run.status,0,run.stderr);
    for(const [name,entry] of Object.entries(binding.helpers))assert.equal(sha(fs.readFileSync(path.join(helpers,name))),entry.sha256);
    // 실제 opt-in CLI 설치물에 검증된 두 입력을 놓고 제품과 동일한 Freeze/측정 경로를 실행한다.
    fs.mkdirSync(path.join(helpers,'input'));
    for(const id of ['9101','9201'])fs.copyFileSync(binding.input,path.join(helpers,'input',`retention-${id}.mp4`));
    const frozen=freezeCurrentWorkspace(helpers);
    assert.deepEqual(frozen.files.map(f=>f.name),['input/retention-9101.mp4','input/retention-9201.mp4','normalize','process-metrics','catalog-instrumented.cpp']);
    for(const f of frozen.files){
      assert.equal(f.sha256,f.name.startsWith('input/')?STATE_BINDING_SHA.input:binding.helpers[f.name].sha256);
      assert.equal(f.size,fs.statSync(path.join(helpers,f.name)).size);
    }
    if(current){
      const source=frozen.files.find(f=>f.name==='catalog-instrumented.cpp');
      assert.equal(source.size,376755);assert.equal(source.sha256,'03dba9c9c535f97202ac40e7c817aeea0c82aae72abe6478da99ec0a3fc00817');
    }
    assert.equal(measureCurrentWorkspace(helpers,frozen).fixedBytes,frozen.fixedBytes);
    const sourceFile=path.join(helpers,'catalog-instrumented.cpp'),original=fs.readFileSync(sourceFile);
    fs.writeFileSync(sourceFile,Buffer.concat([original,Buffer.from('\n')]));
    assert.throws(()=>measureCurrentWorkspace(helpers,frozen),/workspace-fixed-changed/);
    fs.writeFileSync(sourceFile,original);
    for(const name of frozen.files.map(f=>f.name)){
      const file=path.join(helpers,name),saved=file+'.saved';fs.renameSync(file,saved);
      try{assert.throws(()=>freezeCurrentWorkspace(helpers),/ENOENT/);}finally{fs.renameSync(saved,file);}
    }
    assert.doesNotThrow(()=>freezeCurrentWorkspace(helpers));
    console.log(JSON.stringify({scope:'actual-state-install-freeze',files:frozen.files.map(({name,size,sha256})=>({name,size,sha256})),missingFilesRejected:5,installedMutationRejected:true}));
  }finally{fs.rmSync(dir,{recursive:true});assert(!fs.existsSync(dir));}
});
