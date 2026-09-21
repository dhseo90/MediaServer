// 파일 용도: 현행 managed 원장의 읽기 전용 compact 관측. 제품 catalog 수용·내구성 검증과 구분한다.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {RecordingJournalReader} from './recording_journal_reader.mjs';
const need=(ok,code)=>{if(!ok)throw Error(code);};
export function closedJournalComplete(result){return result?.partialBytes===0&&result.backlog===false;}
export function disabledChannelsExact(status,expected){
  const channels=status?.channels;if(!Array.isArray(channels)||!Array.isArray(expected))return false;
  const actual=channels.map(c=>c?.channelId);
  return expected.length>0&&new Set(expected).size===expected.length&&new Set(actual).size===actual.length&&
    JSON.stringify([...actual].sort())===JSON.stringify([...expected].sort())&&channels.every(c=>c.enabled===false&&c.active===false);
}
// 두 관측 구조를 합친 보수적 논리 상한. RSS 합격 수치가 아니다.
export class CurrentObservationBudget {
  constructor({maxIds=100000,maxBytes=33554432}={}){need(Number.isSafeInteger(maxIds)&&maxIds>0&&maxIds<=100000&&Number.isSafeInteger(maxBytes)&&maxBytes>0&&maxBytes<=33554432,'observer-budget-config');this.maxIds=maxIds;this.maxBytes=maxBytes;this.ids=0;this.bytes=0;}
  reserve(ids,bytes){need(Number.isSafeInteger(ids)&&ids>0&&Number.isSafeInteger(bytes)&&bytes>0&&this.ids+ids<=this.maxIds&&this.bytes+bytes<=this.maxBytes,'observer-combined-cap');this.ids+=ids;this.bytes+=bytes;}
}
export function normalizeCurrentRows(binary,rows){
  if(!rows.length)return [];
  const input=rows.join('\n')+'\n';need(Buffer.byteLength(input)<=33554432,'observer-input-cap');
  const result=spawnSync(binary,['--normalize'],{input,encoding:'utf8',timeout:3000,maxBuffer:33554432,env:{PATH:process.env.PATH}});
  need(!result.error&&!result.signal&&result.status===0,'observer-native-rejected');
  const output=result.stdout.trim().split('\n').map(JSON.parse);need(output.length===rows.length,'observer-native-count');return output;
}
export class CurrentRecordingObserver {
  constructor(root,binary,budget=new CurrentObservationBudget()){this.root=root;this.binary=binary;this.budget=budget;this.reader=null;this.prefix=[];this.ids=new Set();this.bytes=0;this.cursor=0;this.replaying=false;this.rotations=0;this.error=null;this.typeCounts={};}
  open(){return new RecordingJournalReader(this.root,'recording-v2-mutations.jsonl',{nativeLines:true,lineBytes:16777216,pollBytes:33554432});}
  poll(){
    if(this.error)throw this.error;
    try{
      if(!this.reader){this.reader=this.open();this.cursor=0;}
      let read;
      try{read=this.reader.poll();}catch(error){
        if(error.code!=='file-replaced-or-unsafe')throw error;
        // 임의 replacement 허용이 아니다. 새 fd의 안전성과 모든 완료 prefix identity를 대조한다.
        this.reader.close();this.reader=this.open();this.cursor=0;this.replaying=true;this.rotations++;read=this.reader.poll();
      }
      const rows=normalizeCurrentRows(this.binary,read.batch),fresh=[];
      for(const row of rows){
        need(typeof row.id==='string'&&typeof row.entity==='string'&&/^[a-f0-9]{64}$/.test(row.identity),'observer-compact-shape');
        const canonicalType=row.type==='event_link_receipt'?'event_link_created':row.type;
        const token=JSON.stringify([row.id,row.entity,canonicalType,row.identity]);
        if(this.cursor<this.prefix.length)need(this.prefix[this.cursor]===token,'observer-checkpoint-prefix-mismatch');
        else{
          need(!this.ids.has(row.id),'observer-duplicate-id');
          need(this.prefix.length<100000&&this.bytes+Buffer.byteLength(token)<=33554432,'observer-id-cap');
          this.budget.reserve(2,Buffer.byteLength(token)); // mutation/entity 두 위치를 반복도 포함해 보수적으로 계상
          this.ids.add(row.id);this.prefix.push(token);this.bytes+=Buffer.byteLength(token);
          this.typeCounts[canonicalType]=(this.typeCounts[canonicalType]??0)+1;fresh.push(row);
        }
        this.cursor++;
      }
      if(this.replaying&&!read.backlog)need(this.cursor>=this.prefix.length,'observer-checkpoint-prefix-missing');
      if(this.cursor===this.prefix.length)this.replaying=false;
      return {rows:fresh,backlog:read.backlog,partialBytes:read.partialBytes,consumedOffset:read.consumedOffset,
        mutationCount:this.prefix.length,identityBytes:this.bytes,rotations:this.rotations,typeCounts:{...this.typeCounts},catalogAcceptancePass:false};
    }catch(error){this.error=error;throw error;}
  }
  close(){this.reader?.close();}
}
const integer=x=>typeof x==='string'&&/^(0|[1-9]\d{0,19})$/.test(x);
export class CurrentLongrunProgress {
  constructor(now,channels=['9101','9201'],budget=new CurrentObservationBudget()){need(Number.isFinite(now)&&now>=0,'progress-clock');this.budget=budget;this.start=now;this.last=now;this.records=new Map();this.bytes=0;
    this.channels=Object.fromEntries(channels.map(id=>[id,{finalized:0,deleted:0,lastAt:now,order:'0',store:null,knownMappings:0,unknownMappings:0}]));}
  status(now){need(Number.isFinite(now)&&now>=this.last,'progress-clock');this.last=now;
    if(!this.suspended)for(const c of Object.values(this.channels))need(now-c.lastAt<=30000,'longrun-finalize-stall');
    return {elapsedMs:now-this.start,channels:structuredClone(this.channels),records:this.records.size,logicalBytes:this.bytes};}
  consume(rows,now){this.status(now);const deleted=[];
    for(const row of rows){
      if(['segment_v2_finalized','segment_v2_bound_finalized'].includes(row.type)){
        const s=row.segment,c=this.channels[s?.channel];if(!c||s.continuous!==true)continue;
        need(s.id===row.entity&&!this.records.has(s.id)&&integer(s.order)&&BigInt(s.order)>BigInt(c.order)&&
          integer(s.sizeBytes)&&BigInt(s.sizeBytes)>0n&&/^[a-f0-9]{64}$/.test(s.sha256)&&/^[a-f0-9]{64}$/.test(s.metadataHash), 'longrun-segment-identity');
        need(c.store===null||c.store===s.storeHash,'longrun-store-changed');
        need(typeof row.mediaRelpath==='string'&&row.mediaRelpath.length>0&&!path.isAbsolute(row.mediaRelpath)&&
          row.mediaRelpath.split('/').every(p=>p!==''&&p!=='.'&&p!=='..'),'longrun-media-path');
        const bytes=Buffer.byteLength(JSON.stringify(s))+Buffer.byteLength(row.mediaRelpath);
        need(this.records.size<100000&&this.bytes+bytes<=33554432,'longrun-id-limit');this.budget.reserve(1,bytes);this.bytes+=bytes;
        this.records.set(s.id,{...s,mediaRelpath:row.mediaRelpath,state:'finalized'});
        c.order=s.order;c.store=s.storeHash;c.finalized++;c.lastAt=now;c.knownMappings+=s.knownMappings;c.unknownMappings+=s.unknownMappings;
      }else if(row.type==='segment_v2_state'){
        const prior=this.records.get(row.entity);if(!prior)continue;
        need(row.state==='deletion-pending'&&prior.state==='finalized','longrun-state-transition');prior.state=row.state;
      }else if(row.type==='segment_v2_deleted'){
        const prior=this.records.get(row.entity);if(!prior)continue;
        need(prior.state==='deletion-pending'&&prior.metadataHash===row.segment?.metadataHash,'longrun-delete-transition');
        prior.state='deleted';this.channels[prior.channel].deleted++;deleted.push({id:row.entity,mediaRelpath:prior.mediaRelpath});
      }
    }return deleted;
  }
  setActive(now,active){need(Number.isFinite(now)&&now>=this.last&&typeof active==='boolean','progress-clock');this.last=now;this.suspended=!active;this.wasPaused=true;for(const c of Object.values(this.channels))c.lastAt=now;}
  finish(now){const result=this.status(now);need(!this.wasPaused&&result.elapsedMs>=7200000&&Object.values(this.channels).every(c=>c.finalized>0&&c.deleted>0),'longrun-incomplete');return result;}
}
export function summarizeCurrentSamples(samples,{warmupMs=300000}={}){
  need(Array.isArray(samples)&&samples.length>=2&&samples.length<=10000&&Number.isSafeInteger(warmupMs)&&warmupMs>=0,'sample-count');
  const groups=new Map();let prior;
  for(const s of samples){
    need(Number.isSafeInteger(s.pid)&&s.pid>0&&/^(macos:\d+:\d+|linux:\d+)$/.test(s.startIdentity)&&
      Number.isFinite(s.phaseAt)&&Number.isSafeInteger(s.sampledAt)&&
      Number.isSafeInteger(s.rssBytes)&&s.rssBytes>0&&Number.isSafeInteger(s.threadCount)&&s.threadCount>0&&Number.isSafeInteger(s.fdCount)&&s.fdCount>=0&&
      Number.isSafeInteger(s.mutationCount)&&s.mutationCount>=0,'sample-metric');
    if(prior)need(s.phaseAt>prior.phaseAt&&s.mutationCount>=prior.mutationCount,'sample-clock-counter');prior=s;
    let g=groups.get(s.pid);if(g)need(g.identity===s.startIdentity,'sample-pid-reused');
    else{need(groups.size<64,'sample-group-cap');g={identity:s.startIdentity,points:[]};groups.set(s.pid,g);}g.points.push(s);
  }
  return {resourceTrendPass:false,reviewRequired:true,sampleCount:samples.length,groups:[...groups].map(([pid,g])=>{
    const first=g.points[0],last=g.points.at(-1),post=g.points.filter(p=>p.phaseAt-first.phaseAt>=warmupMs);
    const point=s=>({phaseAt:s.phaseAt,sampledAt:s.sampledAt,rssBytes:s.rssBytes,threadCount:s.threadCount,fdCount:s.fdCount,mutationCount:s.mutationCount});
    const max=Object.fromEntries(['rssBytes','threadCount','fdCount'].map(k=>[k,Math.max(...g.points.map(p=>p[k]))]));
    const delta=(a,b)=>Object.fromEntries(['rssBytes','threadCount','fdCount','mutationCount'].map(k=>[k,b[k]-a[k]]));
    const gaps=g.points.slice(1).map((p,i)=>p.phaseAt-g.points[i].phaseAt);
    return {pid,startIdentity:g.identity,sampleCount:g.points.length,first:point(first),last:point(last),max,delta:delta(first,last),
      elapsedMs:last.phaseAt-first.phaseAt,maxGapMs:gaps.length?Math.max(...gaps):null,warmupMs,
      postWarmup:post.length<2?{status:'insufficient',sampleCount:post.length,delta:null,elapsedMs:null,rssMiBPerMinute:null}:
        {status:'observed',sampleCount:post.length,delta:delta(post[0],post.at(-1)),elapsedMs:post.at(-1).phaseAt-post[0].phaseAt,
        rssMiBPerMinute:(post.at(-1).rssBytes-post[0].rssBytes)/1048576/((post.at(-1).phaseAt-post[0].phaseAt)/60000)}};
  })};
}
