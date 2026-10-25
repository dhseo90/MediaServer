// 합성 정보만 사용한다. 미디어/Helper/제품/HTTP 실행 없음.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {EARLY_STATE_INPUT as p,selectStateInputProfile,requireStateInputExecutable,stateInputArgs,stateInputProbeArgs,
  validateStateInputMedia,stateInputCapacity,assessSyntheticStateWriterSegments} from './recording_state_input_profile.mjs';
import {workspaceBounds} from './recording_current_observer.mjs';
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
test('opt-in is state-only and always blocks unqualified product launch',()=>{
  assert.equal(selectStateInputProfile(['--state-diagnostic'],p.name),p);assert.throws(()=>requireStateInputExecutable(p),/not-qualified/);
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
