// 파일 용도: 장시간 관측용 최소 상태. 제품 catalog 수용/내구성 또는 누수를 판정하지 않는다.
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
           !/^[a-f0-9]{64}$/.test(s.checksum_sha256))throw Error('longrun-invalid-segment');
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
