// 파일 용도: 장시간 관측용 최소 상태. 제품 catalog 수용/내구성 또는 누수를 판정하지 않는다.
import {summarizeCurrentSamples} from './recording_current_observer.mjs';
import {validateLatencyRow} from './recording_latency_trace.mjs';
export function slowTraceSummary(text,normalShutdown) {
  const rows=[];let summary=null;
  try{
    if(Buffer.byteLength(text)>4*1024*1024)throw Error();
    for(const line of text.split('\n')){
      if(line.startsWith('[recording-latency] ')){
        if(rows.length===64||Buffer.byteLength(line)>512)throw Error();
        const row=validateLatencyRow(JSON.parse(line.slice('[recording-latency] '.length)));
        if(row.k>1||(row.w<10000000&&row.h<10000000))throw Error();rows.push(row);
      }else if(line.startsWith('[recording-slow-summary] ')){
        if(summary)throw Error();
        const value=JSON.parse(line.slice('[recording-slow-summary] '.length));
        if(Object.keys(value).sort().join(',')!=='retained,seen,thresholdNs'||!Number.isSafeInteger(value.seen)||value.seen<0||
           value.retained!==Math.min(value.seen,64)||value.thresholdNs!==10000000)throw Error();summary=value;
      }
    }
    if(!summary||summary.retained!==rows.length)throw Error();
    return {status:normalShutdown?'captured':'incomplete',...summary,rows,completedSpansOnly:true,rawBodyPublished:false};
  }catch{return {status:'unavailable',seen:null,retained:0,thresholdNs:10000000,rows:[],completedSpansOnly:true,rawBodyPublished:false};}
}
export function assertSampleStep(previous,current,start,pid) {
  if(!Number.isFinite(start)||!Number.isFinite(current?.phaseAt)||current.phaseAt<start||current.pid!==pid||
     (previous&&(current.phaseAt<=previous.phaseAt||current.startIdentity!==previous.startIdentity)))throw Error('sample-identity-clock');
  if(current.phaseAt-(previous?.phaseAt??start)>15000)throw Error('sample-gap');
}
export function nextSampleDelay(phaseAt,now,end) {
  if(![phaseAt,now,end].every(x=>Number.isFinite(x)&&x>=0)||now<phaseAt)throw Error('sample-cadence-clock');
  if(now-phaseAt>15000)throw Error('sample-gap');
  // 처리시간을 포함한 5초 시작간격 목표다. 느린 표본 뒤에는 추가 지연을 넣지 않는다.
  return Math.max(0,Math.min(5000-(now-phaseAt),end-now));
}
export function summarizeAvailableSamples(samples) {
  const unavailable=status=>({status,sampleCount:samples.length,resourceTrendPass:false,reviewRequired:true,groups:[]});
  if(samples.length<2)return unavailable('insufficient');
  try{return {status:'observed',...summarizeCurrentSamples(samples)};}catch{return unavailable('invalid');}
}
export function parseLongrunArgs(args) {
  if(args.length!==2||args[0]!=='--duration-minutes'||args[1]!=='120')throw Error('longrun requires --duration-minutes 120');
  return 7200000;
}
export function sampleContinuity(samples,start,end,pid,identity) {
  if(!Array.isArray(samples)||samples.length<2||samples.length>10000||!Number.isFinite(start)||!Number.isFinite(end)||end<start)return false;
  let previous;
  for(const s of samples){
    if(s.pid!==pid||s.startIdentity!==identity||!Number.isFinite(s.phaseAt)||s.phaseAt<start||s.phaseAt>end||
       (previous!==undefined&&(s.phaseAt<=previous||s.phaseAt-previous>15000)))return false;
    previous=s.phaseAt;
  }
  return samples[0].phaseAt-start<=15000&&end-samples.at(-1).phaseAt<=15000;
}
export function nextRecordingSettings(value,id,enabled) {
  const matches=value?.sources?.filter(s=>s.sourceId===id);
  if(!['9101','9201'].includes(id)||typeof enabled!=='boolean'||matches?.length!==1||
     !Number.isSafeInteger(matches[0].recording?.revision)||matches[0].recording.revision<1||
     matches[0].recording.revision>=Number.MAX_SAFE_INTEGER)throw Error('longrun-source-revision');
  return {enabled,revision:matches[0].recording.revision+1,continuousMaxBytes:134217728,eventMaxBytes:134217728,
    continuousMaxAgeMs:10800000,eventMaxAgeMs:10800000};
}
export function mediaAbsent(lstat) {
  try{lstat();return false;}catch(e){if(e.code==='ENOENT')return true;throw Error('longrun-media-stat-error');}
}
export class LongrunProgress {
  constructor(now) {
    if(!Number.isFinite(now)||now<0)throw Error('longrun-clock');
    this.start=now;this.last=now;this.ids=new Set();this.segments=new Map();this.bytes=0;
    this.channels=Object.fromEntries(['9101','9201'].map(id=>[id,{finalized:0,deleted:0,lastAt:now,startUTC:0,endUTC:0}]));
  }
  clock(now){if(!Number.isFinite(now)||now<this.last)throw Error('longrun-clock');this.last=now;}
  add(id){
    if(typeof id!=='string'||!id.length||this.ids.has(id))throw Error('longrun-duplicate-or-invalid-id');
    const n=Buffer.byteLength(id);
    if(this.ids.size+this.segments.size>=100000||this.bytes+n>33554432)throw Error('longrun-id-limit');
    this.ids.add(id);this.bytes+=n;
  }
  consume(rows,now){
    this.status(now);
    const completed=[];
    for(const r of rows){
      this.add(r.mutationId);
      if(r.mutationType==='segment_finalized'){
        const s=r.payload.segment,c=this.channels[s?.channel_id];if(!c)continue;
        if(s.retention_class!=='continuous')continue;
        if(s.segment_id!==r.entityId||this.segments.has(r.entityId)||
           s.lifecycle!=='finalized'||![s.start?.utc_ms,s.end?.utc_ms,s.size_bytes,s.finalized_at_ms].every(x=>Number.isSafeInteger(x)&&x>0)||
           s.end.utc_ms<=s.start.utc_ms||s.start.utc_ms<=c.startUTC||s.end.utc_ms<=c.endUTC||
           ![s.start.time_base_num,s.start.time_base_den].every(x=>Number.isSafeInteger(x)&&x>0)||
           s.start.time_base_num!==s.end.time_base_num||s.start.time_base_den!==s.end.time_base_den||
           !Number.isSafeInteger(s.start.pts)||!Number.isSafeInteger(s.end.pts)||s.end.pts<=s.start.pts||
           !/^[a-f0-9]{64}$/.test(s.checksum_sha256)){
          // 실패 판정은 위 식 그대로 유지한다. 원문 ID·경로·payload를 출력하지 않는다.
          const reasons=[];
          if(s.segment_id!==r.entityId)reasons.push('entity-mismatch');
          if(this.segments.has(r.entityId))reasons.push('duplicate-segment');
          if(s.lifecycle!=='finalized')reasons.push('lifecycle');
          if(![s.start?.utc_ms,s.end?.utc_ms,s.size_bytes,s.finalized_at_ms].every(x=>Number.isSafeInteger(x)&&x>0))reasons.push('positive-metadata');
          if(s.end?.utc_ms<=s.start?.utc_ms||s.start?.utc_ms<=c.startUTC||s.end?.utc_ms<=c.endUTC)reasons.push('utc-progress');
          if(![s.start?.time_base_num,s.start?.time_base_den].every(x=>Number.isSafeInteger(x)&&x>0)||
             s.start?.time_base_num!==s.end?.time_base_num||s.start?.time_base_den!==s.end?.time_base_den)reasons.push('timebase');
          if(!Number.isSafeInteger(s.start?.pts)||!Number.isSafeInteger(s.end?.pts)||s.end?.pts<=s.start?.pts)reasons.push('pts-range');
          if(!/^[a-f0-9]{64}$/.test(s.checksum_sha256))reasons.push('checksum');
          const number=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
          throw Error(`longrun-invalid-segment ${JSON.stringify({reasons,channel:c===this.channels['9101']?'9101':'9201',
            previousStartUTC:c.startUTC,previousEndUTC:c.endUTC,startUTC:number(s.start?.utc_ms),endUTC:number(s.end?.utc_ms),
            startPTS:number(s.start?.pts),endPTS:number(s.end?.pts),sizeBytes:number(s.size_bytes),finalizedAt:number(s.finalized_at_ms)})}`);
        }
        if(typeof r.payload.mediaRelpath!=='string'||!r.payload.mediaRelpath.length)throw Error('longrun-media-path-missing');
        const n=Buffer.byteLength(r.entityId)+Buffer.byteLength(r.payload.mediaRelpath);
        if(this.ids.size+this.segments.size>=100000||this.bytes+n>33554432)throw Error('longrun-id-limit');
        this.bytes+=n;this.segments.set(r.entityId,{channel:s.channel_id,mediaRelpath:r.payload.mediaRelpath,requested:false,deleted:false});
        c.finalized++;c.lastAt=now;c.startUTC=s.start.utc_ms;c.endUTC=s.end.utc_ms;
      }else if(r.mutationType==='deletion_requested'||r.mutationType==='deletion_completed'){
        const s=this.segments.get(r.entityId);if(!s)continue;
        if(r.mutationType==='deletion_requested'){
          if(s.requested||s.deleted)throw Error('longrun-delete-order');s.requested=true;
        }else{
          if(!s.requested||s.deleted)throw Error('longrun-delete-order');s.deleted=true;this.channels[s.channel].deleted++;
          completed.push({entityId:r.entityId,mediaRelpath:s.mediaRelpath});
        }
      }
    }
    return completed;
  }
  status(now){
    this.clock(now);for(const c of Object.values(this.channels))if(now-c.lastAt>30000)throw Error('longrun-finalize-stall');
    return {elapsedMs:now-this.start,channels:structuredClone(this.channels),storedIds:this.ids.size+this.segments.size,idBytes:this.bytes};
  }
  finish(now){const s=this.status(now);if(s.elapsedMs<7200000||Object.values(this.channels).some(c=>!c.finalized||!c.deleted))throw Error('longrun-incomplete');return s;}
}

// 원래 프로세스 로그 상한을 유지한다. 짧은 쓰기도 수집 실패이며 다른 제품 로그를 필터링하지 않는다.
export function captureBoundedProcessLog(app,chunk,write,stop){
  app.bytes+=chunk.length;
  if(app.bytes>4*1024*1024){app.overflow=true;app.captureError='byte-cap';stop();return;}
  try{if(write(chunk)!==chunk.length)throw Error('short-write');}
  catch{app.overflow=true;app.captureError='write-failed';stop();return;}
  const marker=(app.traceTail??'')+chunk.toString('utf8');app.traceTail=marker.slice(-64);
  if(/\[visual-frame\] trace-(output-failed|config-invalid)/.test(marker)){
    app.overflow=true;app.captureError='decoder-trace-collection';stop();
  }
}
// 혼합 실행의 시간 모드와 진단 모드는 별개다. 제품 시작 전 생성/판정 불일치를 거부한다.
export function assertMixedFrameTraceMode(env,expected){
  if(expected!=='bounded'||env.MEDIA_SERVER_VERIFY_FRAME_TRACE!==expected)throw Error('mixed-frame-trace-mode');
}
// 실제 반환 실패와 성공 중 후보 element 관측을 구분한다. 없거나 잘린 진단은 적격 수집이 아니다.
export function frameTraceSummary(text,mode,required=true){
  const result={status:'captured',mode,required,records:0,successes:0,failures:0,issues:[]};
  if(!['full','bounded'].includes(mode))result.issues.push('invalid-expected-mode');
  for(const line of text.split('\n').filter(v=>v.startsWith('[visual-frame] '))){
    try{const r=JSON.parse(line.slice(15));
      if(r.mode!==mode||typeof r.succeeded!=='boolean'||!Array.isArray(r.events)||
        !['target','fd','bytes','budgetMs','requestStartNs','pid','samples','offsetBefore','offsetAfter','droppedEvents','droppedFactories'].every(k=>Number.isFinite(r[k]))||typeof r.first!=='string'||typeof r.error!=='string')throw Error();
      result.records++;if(r.succeeded)result.successes++;else result.failures++;
      if(r.droppedEvents||r.droppedFactories)result.issues.push('detail-truncated');
      // 이전 보존 trace에는 edges가 없다. 새 전이 계측을 제공한 기록의 실패/손상은 수집 완료가 아니다.
      if(Object.hasOwn(r,'edges')){
        const e=r.edges;
        if(!e||!['decoderInstances','probesAttached','probeFailures','pulls','emptyPulls'].every(k=>Number.isSafeInteger(e[k])&&e[k]>=0)||!Array.isArray(e.marks)||!Array.isArray(e.states))throw Error();
        if(e.probeFailures)result.issues.push('edge-probe-failed');
      }
    }catch{result.issues.push('invalid-or-write-failed-record');}
  }
  if(!result.records){if(required)result.issues.push('missing');else result.status='not-observed';}
  if(mode==='bounded'&&result.successes>3)result.issues.push('success-limit');
  result.issues=[...new Set(result.issues)];if(result.issues.length)result.status='incomplete';return result;
}

// 마지막 budget 이후 정상 종료와 경합한 수집 실패도 최종 판정에서 제거하지 않는다.
export function processLogCaptureComplete(app,capturedBytes){
  return !app.overflow&&!app.captureError&&app.bytes===capturedBytes&&app.bytes<=4*1024*1024;
}

// 요청 본문 없이 고정 크기 phase 쌍만 검증한다. captured는 수집 상태이며 제품 PASS가 아니다.
export function visualPhaseSummary(text,required=true) {
  const pending=new Map(),closed=new Set(),phases={};let rows=0;
  try {
    if(Buffer.byteLength(text)>4*1024*1024)throw Error('log-cap');
    for(const line of text.split('\n')) {
      if(line.startsWith('[visual-phase-loss]'))throw Error('loss');
      if(!line.startsWith('[visual-phase]'))continue;
      if(++rows>4096||Buffer.byteLength(line)>=256||!line.startsWith('[visual-phase] '))throw Error('row-cap');
      const v=JSON.parse(line.slice(15));
      if(Object.keys(v).sort().join(',')!=='end,id,ns,parent,phase,thread'||
         ![v.id,v.thread].every(x=>Number.isSafeInteger(x)&&x>0)||
         ![v.parent,v.ns].every(x=>Number.isSafeInteger(x)&&x>=0)||
         typeof v.end!=='boolean'||typeof v.phase!=='string'||!/^[-a-z]{1,64}$/.test(v.phase))throw Error('row');
      if(!v.end){
        if(pending.has(v.id)||closed.has(v.id))throw Error('duplicate');
        if(v.parent&&(!pending.has(v.parent)||pending.get(v.parent).thread!==v.thread))throw Error('parent');
        pending.set(v.id,v);
      } else {
        const start=pending.get(v.id);
        if(!start||start.thread!==v.thread||start.parent!==v.parent||start.phase!==v.phase||v.ns<start.ns)throw Error('pair');
        for(const child of pending.values())if(child.parent===v.id)throw Error('open-child');
        pending.delete(v.id);closed.add(v.id);
        const p=phases[v.phase]??={count:0,totalNs:0,maxNs:0};const ns=v.ns-start.ns;
        p.count++;p.totalNs+=ns;p.maxNs=Math.max(p.maxNs,ns);
      }
    }
    if(pending.size)throw Error('unfinished');
    if(required&&!rows)throw Error('missing');
    return {status:rows?'captured':'not-observed',rows,phases,overlappingPhasesNotAdditive:true};
  } catch(e) {return {status:'incomplete',reason:e.message,rows,open:pending.size,phases,overlappingPhasesNotAdditive:true};}
}

// Terminal structured failures are independent of full performance phase tracing.
export function searchFailureSummary(text,required=true) {
  const issues=[],failures=[];let probes=0;
  for(const line of text.split('\n')) {
    if(!line.startsWith('[search-failure'))continue;
    if(line.startsWith('[search-failure-loss]')){issues.push('loss');continue;}
    try {
      const isProbe=line.startsWith('[search-failure-probe] ');
      const prefix=isProbe?'[search-failure-probe] ':'[search-failure] ';
      if(!line.startsWith(prefix)||Buffer.byteLength(line)>2048)throw Error('line');
      const row=JSON.parse(line.slice(prefix.length));
      if(row.version!==1)throw Error('version');
      if(isProbe){if(row.attempts!==3)throw Error('attempt-contract');probes++;continue;}
      if(row.status!==503||!Number.isSafeInteger(row.channels)||row.channels<0||row.channels>32||
        !Array.isArray(row.attempts)||row.attempts.length<1||row.attempts.length>3)throw Error('record');
      for(const k of ['resourceRejectionsBefore','resourceRejectionsAfter'])if(!Number.isSafeInteger(row[k])||row[k]<0)throw Error('resource-numeric');
      if(row.resourceRejectionsAfter<row.resourceRejectionsBefore)throw Error('resource-order');
      for(const a of row.attempts) {
        if(typeof a.stage!=='string'||!/^[-a-z]+$/.test(a.stage)||typeof a.reason!=='string'||!/^[-a-z]+$/.test(a.reason)||
          typeof a.rebuild!=='boolean'||typeof a.authority!=='boolean')throw Error('attempt');
        for(const k of ['instance','currentInstance','captured','current','documents','references'])if(!Number.isSafeInteger(a[k])||a[k]<0)throw Error('numeric');
      }
      failures.push(row);
    }catch{issues.push('invalid-record');}
  }
  if(probes>1||(required&&probes!==1))issues.push('probe');
  return {status:issues.length?'incomplete':probes?'captured':'not-observed',probes,failures,issues};
}

// 고정 요청 요약. 중첩 단계의 누적값은 합산하지 않는다.
export function visualRequestSummary(text,required=true) {
 const rows=[];let probes=0,completion=null;const seen=new Set();
 try {
  if(Buffer.byteLength(text)>4*1024*1024)throw Error('log-cap');
  for(const line of text.split('\n')) {
   if(line.startsWith('[visual-request-loss]'))throw Error('loss');
   if(line==='[visual-request-probe] 1'){probes++;continue;}
   if(line.startsWith('[visual-request-end] ')){if(completion)throw Error('duplicate-completion');completion=JSON.parse(line.slice(21));continue;}
   if(!line.startsWith('[visual-request]'))continue;
   if(!line.startsWith('[visual-request] ')||Buffer.byteLength(line)>=3072||rows.length>=1024)throw Error('row-cap');
   const v=JSON.parse(line.slice(17)),num=x=>Number.isSafeInteger(x)&&x>=0;
   if(!num(v.id)||v.id===0||seen.has(v.id)||!num(v.startNs)||!num(v.elapsedNs)||!num(v.generation)||!num(v.documents)||
     ![200,400,403,410,503].includes(v.status)||!/^[-a-z0-9]{1,79}$/.test(v.code)||
     !Array.isArray(v.phases)||v.phases.length!==17||!v.phases.every(x=>Array.isArray(x)&&x.length===2&&x.every(num))||
     !Array.isArray(v.counters)||v.counters.length!==6||!v.counters.every(num)||
     !Array.isArray(v.locks)||v.locks.length!==5||!v.locks.every(x=>Array.isArray(x)&&x.length===3&&x.every(num)))throw Error('row');
   seen.add(v.id);rows.push(v);
  }
  if(probes>1||(required&&probes!==1)||(required&&!rows.length))throw Error('missing-probe-or-requests');
  if(rows.length){if(!completion||completion.started!==rows.length||completion.completed!==rows.length)throw Error('request-completeness');for(let id=1;id<=rows.length;++id)if(!seen.has(id))throw Error('request-gap');}
  return {status:rows.length?'captured':'not-observed',probes,completion,rows,lockCountersRequireRecordingLatencyTrace:true,overlappingPhasesNotAdditive:true,unmeasured:['HTTP send','unwrapped syscalls/bytes','background per-request cost']};
 }catch(e){return {status:'incomplete',reason:e.message,probes,rows};}
}
