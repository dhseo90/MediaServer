// State 입력 후보 전용. 입력 Decode와 실제 Writer Segment 적격성은 서로 다른 증거다.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {mixedRecordingProfile} from './recording_longrun_progress.mjs';

export const EARLY_STATE_INPUT = Object.freeze({
  name:'state-early-cbr224-v1', width:160, height:90, fps:30, frames:120,
  pattern:'smpte', bitrateKbit:224, keyIntMax:30, segmentSeconds:2,
  meanTargetBytes:Object.freeze([50*1024,60*1024]), maxSegmentBytes:71237,
  inputMaxBytes:1024*1024, timeoutMs:30000, maxBuffer:65536,
  stateSeconds:2700, launcherSeconds:2880, stateExecutable:false,
});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const need=(ok,code)=>assert(ok,code);

export function selectStateInputProfile(args,name){
  if(name===undefined||name==='')return null;
  need(args.length===1&&args[0]==='--state-diagnostic','state-input-mode');
  need(name===EARLY_STATE_INPUT.name,'state-input-profile');
  return EARLY_STATE_INPUT;
}
// 승인된 실제 Writer Review의 immutable anchors. 합성 receipt는 이 경로에 사용하지 않는다.
export const STATE_BINDING_SHA=Object.freeze({
  input:'7c0109b496212b1e78a45e1e22d63f32247e70a903560306badeacb302cf5ee8',
  product:'ed42ee3c55a3e48c2b30d564aa0397bf15c9acd5a89ad2145f1accc10546f4a8',
  runtime:'d9081c27bd5a0966e19719136b51b92433a3e67f79f4c56cbf70666f95a194b4',
  writerPlan:'402afa1c6925499e49fb4c735b8e6854449cf8781e633e1366b047ed17a4ccdd',
  reviewManifest:'d7e26c25a880005c6cde4d1edcc699bb7953ba7c47225ad73d2527afe4a0305c',
  originalManifest:'b168d7e12698529ab31e9b22f61676b49de39b37903008b4b1a58c8cf4bdb674',
});
// Writer 입력 적격성은 위 과거 실측에 유지하고, 실행 제품만 검증된 Build/Smoke에 결속한다.
export const STATE_PRODUCT_SMOKE_SHA=Object.freeze({
  product:'3f40e4b6530e9c89922d31004dd9c9b758cf338ec165989835aff9f5d042bddc',
  runtime:'da42acfb1d41fe4690a1440999d44a485591ee9c9b814ddb9c1e357b35c6bf83',
  result:'63fe3e5c8971bd3c5eceedc42ab445aa7b3e15d1941a326640dbf71d1d211b96',
  source:'b2f10911c88126bc35db78f335a7d74c57b8538e3f98928266be5bcdfa21be33',
  models:'7ef5ad7417ceaf245652bb92b6883e78498daf761918430987ca1617e6d82228',
});
function bindCurrentStateProduct(directory,product,runtime){
  need(typeof directory==='string'&&path.isAbsolute(directory),'state-product-smoke-path');
  const smoke=JSON.parse(boundFile(path.join(directory,'result.json'),STATE_PRODUCT_SMOKE_SHA.result));
  need(smoke.buildVerdict==='BUILD_LINK_VERIFIED'&&smoke.integrationVerdict==='HTTP_ONLY_PASS_RETENTION_UNPROVEN'&&
    smoke.actualExecution.launcherExit===0&&smoke.actualExecution.sourceBeginEndEqual===true,'state-product-smoke-status');
  const artifacts=smoke.binding.artifacts;
  need(product===artifacts.media_server.preserved&&runtime===artifacts['libmedia_server_runtime.a'].preserved,'state-product-smoke-selection');
  boundFile(product,STATE_PRODUCT_SMOKE_SHA.product);boundFile(runtime,STATE_PRODUCT_SMOKE_SHA.runtime);
  const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const currentScripts=new Set(['docs/project-feature-test-inventory.md','scripts/internal/recording_accumulated_cost.test.mjs','scripts/internal/recording_state_input_profile.mjs','scripts/internal/recording_state_input_profile.test.mjs']);
  const changed=execFileSync('git',['diff','--name-only',smoke.head,'--'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(Boolean);
  need(changed.every(p=>currentScripts.has(p)),'state-product-smoke-source-diff');
  let matched=0;
  for(const [manifest,digest] of [['source-manifest.json',STATE_PRODUCT_SMOKE_SHA.source],['model-sha256.json',STATE_PRODUCT_SMOKE_SHA.models]]){
    for(const [relative,expected] of Object.entries(JSON.parse(boundFile(path.join(directory,manifest),digest)))){
      if(currentScripts.has(relative))continue;
      need(!path.isAbsolute(relative)&&!relative.split('/').includes('..'),'state-product-smoke-source-path');
      need(sha(fs.readFileSync(path.join(repo,relative)))===expected,'state-source-asset-binding:'+relative);matched++;
    }
  }
  for(const [file,digest] of Object.entries(smoke.binding.dynamicLibrariesSHA256))
    need(sha(fs.readFileSync(file))===digest,'state-source-asset-binding:'+path.basename(file));
  // 기존 읽기 전용 target-aware Guard를 실제 빌드 그래프에 적용한다. 복사 산출물도 같은 SHA여야 한다.
  const freshness=JSON.parse(execFileSync('python3',[path.join(repo,'scripts/internal/recording_build_freshness.py'),
    '--repo',repo,'--build',path.dirname(artifacts.media_server.source)],{encoding:'utf8',timeout:20000,maxBuffer:65536}));
  need(freshness.status==='PASS_TARGET_AWARE_PREFLIGHT'&&freshness.graphSha256===smoke.freshness.graphSha256&&
    freshness.targets.media_server.artifactSha256===STATE_PRODUCT_SMOKE_SHA.product&&
    freshness.targets.media_server_runtime.artifactSha256===STATE_PRODUCT_SMOKE_SHA.runtime,'state-product-smoke-freshness');
  const helpers={};
  for(const name of ['normalize','process-metrics','review-seed']){
    const entry=smoke.helpers[name];boundFile(entry.preservedPath,entry.sha256);
    helpers[name]={path:entry.preservedPath,sha256:entry.sha256};
  }
  // State는 Snapshot/Recovery를 실행하지 않아 이미 삭제된 instrumentation 중간 소스가 필요 없다.
  return {helpers,matched,sha256:{...STATE_BINDING_SHA,product:STATE_PRODUCT_SMOKE_SHA.product,runtime:STATE_PRODUCT_SMOKE_SHA.runtime},
    productSmoke:directory,productSmokeSha256:STATE_PRODUCT_SMOKE_SHA.result,freshness};
}
export function validateQualifiedStateInput(bytes){
  need(Buffer.isBuffer(bytes)&&bytes.length===120647,'state-qualified-input-size');
  need(sha(bytes)===STATE_BINDING_SHA.input,'state-qualified-input-sha');
  return {profile:EARLY_STATE_INPUT.name,bytes:bytes.length,sha256:sha(bytes),origin:'preserved-input; not regenerated'};
}
function boundFile(file,digest){
  need(typeof file==='string'&&path.isAbsolute(file)&&fs.realpathSync(file)===file,'state-binding-path');
  const st=fs.lstatSync(file);need(st.isFile()&&st.nlink===1&&st.uid===process.getuid(),'state-binding-file');
  const bytes=fs.readFileSync(file);need(hash(digest)&&sha(bytes)===digest,'state-binding-sha:'+path.basename(file));return bytes;
}
function boundManifest(directory,expected){
  const entries=new Map(),bytes=boundFile(path.join(directory,'SHA256SUMS'),expected);
  for(const line of bytes.toString().trimEnd().split('\n')){
    const m=/^([a-f0-9]{64})  (.+)$/.exec(line);need(m&&!path.isAbsolute(m[2])&&!m[2].split('/').includes('..')&&!entries.has(m[2]),'state-binding-manifest');
    entries.set(m[2],boundFile(path.join(directory,m[2]),m[1]));
  }
  return entries;
}
export function assessQualifiedStateReview(review){
  need(review?.status==='STATE_WRITER_SEGMENT_MEASUREMENT_PASS'&&review.productExit===0&&review.actualProductExecutions===1,'state-writer-review-status');
  need(review.input?.sha256===STATE_BINDING_SHA.input&&review.input.bytes===120647&&review.maxBoundBytes===71237&&review.maxObservedSegmentBytes===64423,'state-writer-review-profile');
  need(review.fileBindingCount===132&&review.normalTwoSecondCount===130&&review.pendingOrIncompleteCatalogSegments===0&&review.unmappedMediaFiles===0,'state-writer-review-coverage');
  need(review.originalManifestSha256===STATE_BINDING_SHA.originalManifest,'state-writer-original-binding');
  for(const id of ['9101','9201']){
    const c=review.channels?.[id];need(c?.normalTwoSecond?.count===65&&c.normalTwoSecond.mean===3952839/65&&c.allFinalized.max===64423,'state-writer-channel-profile');
  }
  need(review.cleanup?.workAbsent===true&&review.cleanup.processGroupAbsent===true,'state-writer-cleanup');
}
export function requireStateInputExecutable(profile,env=process.env){
  if(!profile)return null;
  need(profile===EARLY_STATE_INPUT,'state-input-profile');
  const reviewDir=env.MEDIA_SERVER_STATE_WRITER_REVIEW,input=env.MEDIA_SERVER_STATE_INPUT_MEDIA,
    product=env.MEDIA_SERVER_STATE_PRODUCT,runtime=env.MEDIA_SERVER_STATE_RUNTIME;
  need([reviewDir,input,product,runtime].every(p=>typeof p==='string'&&path.isAbsolute(p)),'state-input-evidence-required');
  const parent=path.dirname(reviewDir),plan=JSON.parse(boundFile(path.join(parent,'plan.json'),STATE_BINDING_SHA.writerPlan));
  const reviewed=boundManifest(reviewDir,STATE_BINDING_SHA.reviewManifest);boundManifest(path.join(parent,'evidence'),STATE_BINDING_SHA.originalManifest);
  const review=JSON.parse(reviewed.get('result.json'));assessQualifiedStateReview(review);
  if(env.MEDIA_SERVER_STATE_PRODUCT_SMOKE!==undefined){
    need(plan.productSha===STATE_BINDING_SHA.product&&plan.inputSha===STATE_BINDING_SHA.input,'state-writer-plan-binding');
    validateQualifiedStateInput(boundFile(input,STATE_BINDING_SHA.input));
    return {profile:profile.name,input,product,runtime,writerReview:reviewDir,
      ...bindCurrentStateProduct(env.MEDIA_SERVER_STATE_PRODUCT_SMOKE,product,runtime)};
  }
  need(plan.product===product&&plan.productSha===STATE_BINDING_SHA.product&&plan.inputSha===STATE_BINDING_SHA.input,'state-product-plan-binding');
  validateQualifiedStateInput(boundFile(input,STATE_BINDING_SHA.input));
  boundFile(product,STATE_BINDING_SHA.product);boundFile(runtime,STATE_BINDING_SHA.runtime);
  need(plan.hashes[runtime]===STATE_BINDING_SHA.runtime,'state-runtime-plan-binding');
  // 현재 실행 스크립트는 Supervisor의 clean HEAD/source receipt에 결속한다.
  // 실측 뒤 수정한 비컴파일 소비자만 제외하고 C++/headers/Runtime/Helper/동적 의존성은 그대로 대조한다.
  const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const currentScripts=new Set(['docs/project-feature-test-inventory.md',...['recording_accumulated_cost.mjs','recording_accumulated_cost.py','recording_accumulated_cost.test.mjs','recording_current_observer.mjs','recording_current_fixture_generation.test.mjs','run_v450_recording_a_mixed.py','verify_v450_recording_a_mixed.sh','v450_recording_a_mixed.mjs','recording_state_input_profile.mjs','recording_state_input_profile.test.mjs'].map(n=>'scripts/internal/'+n)]);
  let matched=0;
  for(const [file,digest] of Object.entries(plan.hashes)){
    if(currentScripts.has(path.relative(repo,file)))continue;
    need(sha(fs.readFileSync(file))===digest,'state-source-asset-binding:'+path.basename(file));matched++;
  }
  const helpers={};
  for(const name of ['normalize','process-metrics','review-seed','catalog-instrumented.cpp']){
    const files=Object.keys(plan.hashes).filter(f=>f.includes('/artifacts/')&&path.basename(f)===name);need(files.length===1,'state-helper-binding');
    boundFile(files[0],plan.hashes[files[0]]);helpers[name]={path:files[0],sha256:plan.hashes[files[0]]};
  }
  return {profile:profile.name,input,product,runtime,helpers,matched,sha256:STATE_BINDING_SHA,writerReview:reviewDir};
}
// 기존 Wrapper의 opt-in 자산 설치만 담당한다. 프로세스/미디어 생성·감독 기능은 없다.
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  need(process.argv[2]==='--binding'||process.argv[2]==='--install-helpers','state-binding-command');
  const binding=requireStateInputExecutable(selectStateInputProfile(['--state-diagnostic'],process.env.MEDIA_SERVER_STATE_INPUT_PROFILE));
  need(binding,'state-binding-opt-in-required');
  if(process.argv[2]==='--install-helpers'){
    const root=process.argv[3];need(root&&path.isAbsolute(root)&&fs.realpathSync(root)===root,'state-helper-root');
    const st=fs.lstatSync(root);need(st.isDirectory()&&st.uid===process.getuid()&&(st.mode&0o777)===0o700,'state-helper-root');
    for(const [name,entry] of Object.entries(binding.helpers)){
      const bytes=boundFile(entry.path,entry.sha256),target=path.join(root,name);
      fs.writeFileSync(target,bytes,{flag:'wx',mode:name.endsWith('.cpp')?0o600:0o700});boundFile(target,entry.sha256);
    }
  }
  console.log(JSON.stringify(binding));
}
export function stateInputArgs(output){
  need(typeof output==='string'&&output.startsWith('/')&&!output.includes('\0'),'state-input-output');
  return ['-q','-e','videotestsrc','num-buffers=120','pattern=smpte','!',
    'video/x-raw,format=I420,width=160,height=90,framerate=30/1','!',
    'x264enc','tune=zerolatency','speed-preset=ultrafast','pass=cbr','bitrate=224','key-int-max=30','!',
    'h264parse','!','mp4mux','!','filesink',`location=${output}`];
}
export function stateInputProbeArgs(input){
  need(typeof input==='string'&&input.startsWith('/')&&!input.includes('\0'),'state-input-source');
  return ['-v','error','-select_streams','v:0','-show_frames','-show_streams','-show_entries',
    'stream=codec_name,width,height,r_frame_rate,avg_frame_rate,time_base:frame=pts,width,height,key_frame',
    '-of','json',input];
}
export function validateStateInputMedia({bytes,copy,expectedSha,sourceSha,expectedSourceSha,probe}){
  need(hash(sourceSha)&&sourceSha===expectedSourceSha,'state-input-source-binding');
  need(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=EARLY_STATE_INPUT.inputMaxBytes,'state-input-size');
  need(hash(expectedSha)&&sha(bytes)===expectedSha,'state-input-media-binding');
  need(Buffer.isBuffer(copy)&&copy.equals(bytes),'state-input-copy-binding');
  need(probe?.streams?.length===1,'state-input-stream');const s=probe.streams[0];
  need(s.codec_name==='h264'&&s.width===160&&s.height===90&&s.r_frame_rate==='30/1'&&s.avg_frame_rate==='30/1','state-input-format');
  need(typeof s.time_base==='string'&&/^[1-9]\d*\/[1-9]\d*$/.test(s.time_base),'state-input-time-base');
  const [num,den]=s.time_base.split('/').map(BigInt);
  need(num<=1000000000n&&den<=1000000000n,'state-input-time-base-range');
  need(probe.frames?.length===120,'state-input-frame-count');
  for(const [i,f] of probe.frames.entries()){
    need(f.width===160&&f.height===90&&Number.isSafeInteger(f.pts)&&f.pts>=0,'state-input-frame');
    need(BigInt(f.pts)*num*30n===BigInt(i)*den,'state-input-pts-order');
    need(f.key_frame===0||f.key_frame===1,'state-input-keyframe');
  }
  need(probe.frames[0].key_frame===1,'state-input-first-keyframe');
  return {profile:EARLY_STATE_INPUT.name,bytes:bytes.length,sha256:expectedSha,sourceSha,
    width:160,height:90,fps:30,frames:120,durationSeconds:4,timeBase:s.time_base,
    firstPts:probe.frames[0].pts,lastPts:probe.frames.at(-1).pts,decode:'VERIFIED_INPUT_ONLY',
    actualSegmentSize:'NOT_TESTED',writerOrder:'NOT_TESTED',expectedDeletionWindow:'UNPROVEN',stateReady:false};
}
export function stateInputCapacity({inputBytes,copyBytes,otherVariableBytes=0,otherCopyBytes=0,
  fixedBytes=0,endReserveBytes=6*1024*1024}){
  for(const n of [inputBytes,copyBytes,otherVariableBytes,otherCopyBytes,fixedBytes,endReserveBytes])
    need(Number.isSafeInteger(n)&&n>=0,'state-input-capacity-integer');
  need(inputBytes<=EARLY_STATE_INPUT.inputMaxBytes&&copyBytes===inputBytes,'state-input-copy-size');
  const p=mixedRecordingProfile('continuous-r114'),protectedBytes=643*71237,additionalProtectedBytes=71237;
  need(p.E===67108864&&p.continuousMaxBytes===113246208&&p.protectedFiles===643&&p.segmentBytes===71237,'state-input-r114-contract');
  const marginBytes=p.continuousMaxBytes-p.E-protectedBytes-additionalProtectedBytes;
  // 미디어 보호량과 Workspace는 다른 예산. 사본/종료 증거를 Quota에 중복 합산하지 않는다.
  const variableBytes=inputBytes+otherVariableBytes+endReserveBytes,copyTotal=copyBytes+otherCopyBytes;
  const combinedBytes=fixedBytes+variableBytes+copyTotal,cap=448*1024*1024;
  need([variableBytes,copyTotal,combinedBytes,fixedBytes+cap,fixedBytes+2*cap].every(Number.isSafeInteger),'state-input-capacity-overflow');
  need(marginBytes>=0&&variableBytes<cap&&copyTotal<cap&&combinedBytes<fixedBytes+2*cap,'INPUT_CAPACITY_BLOCKED');
  return {protectedFiles:643,protectedBytes,additionalProtectedBytes,reservationBytes:p.E,
    quotaBytes:p.continuousMaxBytes,marginBytes,maxSegmentBytes:71237,
    variableBytes,copyBytes:copyTotal,combinedBytes,endReserveBytes,workspaceCapEach:cap,
    scope:'conditional R114 envelope; supplied Workspace costs only, not complete State capacity'};
}
// 합성 Mock 전용: 1/30, exclusive 끝 PTS(60 tick), 정확한 wall-clock 2000ms, Epoch 없는 단일 연속열.
// 실제 Writer의 1/1e9 timebase, inclusive 끝 PTS, Epoch 전환 receipt에는 적용하지 않는다.
// 실제 Writer 적격성은 별도 실측 증거로만 판정한다.
export function assessSyntheticStateWriterSegments(rows,{sourceSha,inputSha}={}){
  if(rows===null)return {actualSegmentSize:'NOT_TESTED',expectedDeletionWindow:'UNPROVEN',stateReady:false};
  need(hash(sourceSha)&&hash(inputSha)&&Array.isArray(rows),'state-input-segment-binding');
  const channels={};const ids=new Set();
  for(const r of rows){
    need(['9101','9201'].includes(r.channel)&&r.sourceSha===sourceSha&&r.inputSha===inputSha,'state-input-segment-source');
    need(r.writer==='GStreamerSegmentWriter'&&r.finalized===true&&r.fileVerified===true&&hash(r.fileSha), 'state-input-segment-evidence');
    need(typeof r.id==='string'&&r.id.length>0&&!ids.has(r.id),'state-input-segment-id');ids.add(r.id);
    need(typeof r.store==='string'&&r.store.length>0&&Number.isSafeInteger(r.order)&&r.order>0,'state-input-segment-order');
    need(Number.isSafeInteger(r.bytes)&&r.bytes>0&&r.bytes===r.catalogBytes&&r.bytes<=71237,'state-input-segment-size');
    need([r.startedMs,r.finishedMs,r.ptsStart,r.ptsEnd].every(Number.isSafeInteger)&&r.startedMs>=0&&r.ptsStart>=0&&r.ptsEnd>r.ptsStart&&r.timeBase=== '1/30','state-input-segment-time');
    need(r.finishedMs-r.startedMs===2000&&r.ptsEnd-r.ptsStart===60,'state-input-segment-duration');
    const c=channels[r.channel]??={rows:[]},prior=c.rows.at(-1);
    if(prior)need(r.order>prior.order&&r.store===prior.store&&r.startedMs>=prior.finishedMs&&r.ptsStart>=prior.ptsEnd,'state-input-segment-sequence');
    c.rows.push(r);
  }
  for(const channel of ['9101','9201']){
    const list=channels[channel]?.rows;need(list?.length>=2,'state-input-segment-coverage');
    const sizes=list.map(r=>r.bytes),sum=sizes.reduce((a,b)=>a+b,0);need(Number.isSafeInteger(sum),'state-input-byte-overflow');
    const min=Math.min(...sizes),max=Math.max(...sizes),mean=sum/list.length;
    const elapsedMs=list.at(-1).finishedMs-list[0].startedMs,rate=sum/(elapsedMs/1000),boundary=46137344;
    channels[channel]={count:list.length,bytes:sum,minBytes:min,meanBytes:mean,maxBytes:max,
      sizeDistribution:Object.fromEntries([...new Set(sizes)].sort((a,b)=>a-b).map(b=>[b,sizes.filter(v=>v===b).length])),
      elapsedMs,bytesPerSecond:rate,meanTargetMet:mean>=51200&&mean<=61440,
      conditionalDeletionSeconds:boundary/rate,continuousTwoSecondRange:[boundary/max*2,boundary/min*2]};
  }
  return {actualSegmentSize:'NOT_TESTED',syntheticReceipt:'VALIDATED',channels,expectedDeletionWindow:'SYNTHETIC_ESTIMATE',stateReady:false,
    limitations:'synthetic single-epoch mock only; no product receipt/file verification, Hold/Pin/Admission/deletion timing or long-run guarantee'};
}
