// State 입력 후보 전용. 입력 Decode와 실제 Writer Segment 적격성은 서로 다른 증거다.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
export function requireStateInputExecutable(profile){
  // 입력 생성 receipt를 Writer/Catalog 실측으로 승격하지 않는다. 후속 연결은 별도 승인.
  if(profile)throw Error('state-input-writer-segments-not-qualified');
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
