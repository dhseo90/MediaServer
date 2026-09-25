// 파일 용도: 현행 managed 원장의 읽기 전용 compact 관측. 제품 catalog 수용·내구성 검증과 구분한다.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {RecordingJournalReader} from './recording_journal_reader.mjs';
const need=(ok,code)=>{if(!ok)throw Error(code);};
export const CURRENT_ROOT_CAP_BYTES=448*1024*1024;
// 격리 실행 root의 live 디렉터리를 비원자적으로 순회할 때만 사용한다.
// SQLite rollback journal은 목록화 직후 트랜잭션 종료로 사라질 수 있다.
// 정확한 한 파일의 ENOENT만 측정 시점의 부재로 취급하고 다른 오류는 숨기지 않는다.
export function isTransientSqliteJournalMiss(root,file,error){
  return error?.code==='ENOENT'&&file===path.join(root,'recordings','recording-generation-catalog.sqlite3-journal');
}
export function statCurrentRunEntry(root,file,stat=fs.lstatSync){
  try{return stat(file);}catch(error){
    if(isTransientSqliteJournalMiss(root,file,error))return null;
    throw error;
  }
}
// 공개 로그에 원문 mutation type을 반영하지 않도록 제품 enum의 알려진 이름만 누적한다.
export const CURRENT_JOURNAL_MUTATION_TYPES=Object.freeze(['segment_finalized','event_link_created','observation_put','observation_v2_put','deletion_requested','deletion_completed','corruption_detected','recording_order_reserved','segment_v2_finalized','segment_v2_bound_finalized','consumer_reference_put','derived_reference_accepted','referenced_observation_put','derived_job_intent','derived_job_files','derived_job_ready','derived_job_committed','derived_job_complete','derived_job_failed','segment_v2_state','segment_v2_deleted']);
const categoryTotal=(categories,names)=>names.reduce((total,name)=>({bytes:total.bytes+categories[name].bytes,files:total.files+categories[name].files}),{bytes:0,files:0});
// sqlite3는 read-only PRAGMA만 수행한다. 실행기를 찾지 못하거나 live DB를 읽지 못하면 관측을 실패로 만들지 않고 unavailable로 남긴다.
export function measureCurrentSqlitePages(root,run=spawnSync){
  // 파일 용량 관측만 담당한다. manifest 존재는 Catalog 유효성 판정이 아니다.
  // B가 선택된 root에서는 보존된 구형 cache를 현재 사용량으로 대체하지 않는다.
  const cache=fs.existsSync(path.join(root,'recordings','recording-generation.json'))?'recording-generation-catalog.sqlite3':'recording-catalog.sqlite3';
  const main=path.join(root,'recordings',cache),wal=path.join(root,'recordings',cache+'-wal');
  const mainBytes=fs.existsSync(main)?fs.lstatSync(main).size:0,walBytes=fs.existsSync(wal)?fs.lstatSync(wal).size:0;
  if(mainBytes===0)return {status:'absent',mainBytes,walBytes,pageSize:null,pageCount:null,freePageCount:null,livePageCount:null,liveBytes:null,freeBytes:null};
  let result;try{result=run('sqlite3',['-readonly',main,'PRAGMA page_size; PRAGMA page_count; PRAGMA freelist_count;'],{encoding:'utf8',timeout:3000,maxBuffer:1024,env:{PATH:process.env.PATH}});}catch{return {status:'unavailable',mainBytes,walBytes,pageSize:null,pageCount:null,freePageCount:null,livePageCount:null,liveBytes:null,freeBytes:null};}
  if(result.error||result.signal||result.status!==0)return {status:'unavailable',mainBytes,walBytes,pageSize:null,pageCount:null,freePageCount:null,livePageCount:null,liveBytes:null,freeBytes:null};
  const values=String(result.stdout).trim().split(/\s+/).filter(Boolean);
  if(values.length!==3||!values.every(value=>/^(0|[1-9]\d{0,15})$/.test(value)))return {status:'unavailable',mainBytes,walBytes,pageSize:null,pageCount:null,freePageCount:null,livePageCount:null,liveBytes:null,freeBytes:null};
  const [pageSize,pageCount,freePageCount]=values.map(Number),livePageCount=pageCount-freePageCount;
  if(!Number.isSafeInteger(pageSize)||!Number.isSafeInteger(pageCount)||!Number.isSafeInteger(freePageCount)||pageSize<=0||pageCount<0||freePageCount<0||freePageCount>pageCount||!Number.isSafeInteger(pageSize*pageCount))return {status:'unavailable',mainBytes,walBytes,pageSize:null,pageCount:null,freePageCount:null,livePageCount:null,liveBytes:null,freeBytes:null};
  return {status:'observed',mainBytes,walBytes,pageSize,pageCount,freePageCount,livePageCount,liveBytes:pageSize*livePageCount,freeBytes:pageSize*freePageCount};
}
export function summarizeFixtureGeneration(result,{elapsedMs,outputBytes=null}){
  const errorCode=result?.error?.code??null,signal=result?.signal??null,stderr=String(result?.stderr??'');
  return {status:Number.isInteger(result?.status)?result.status:null,
    signal:signal===null?null:(['SIGTERM','SIGKILL','SIGABRT','SIGSEGV','SIGBUS','SIGINT'].includes(signal)?signal:'other'),
    errorCode:errorCode===null?null:(['ETIMEDOUT','ENOENT','EACCES','ENOBUFS'].includes(errorCode)?errorCode:'other'),
    elapsedMs,timeoutMs:30000,stdoutBytes:Buffer.byteLength(String(result?.stdout??'')),stderrBytes:Buffer.byteLength(stderr),outputBytes,
    categories:{missingElement:/no element|no such element/i.test(stderr),negotiation:/not-negotiated|could not link/i.test(stderr),
      pluginScanner:/plugin.scanner|plugin loader/i.test(stderr),permission:/permission denied|operation not permitted/i.test(stderr),
      resource:/no space left|resource unavailable|resource temporarily unavailable/i.test(stderr),
      macosService:/Connection Invalid|com\.apple\.hiservices-xpcservice|LSNotification/i.test(stderr)},rawBodyPublished:false};
}
// 고정 범주만 내보낸다. 파일명/경로/본문은 비민감 관측 결과에 포함하지 않는다.
export function measureCurrentRoot(root,{sqlitePages=false,lstat=fs.lstatSync}={}){
  const categories=Object.fromEntries(['input','media','mediaPartial','journal','checkpoint','generationSnapshot','generationIdentity','generationEvidence','generationManifest','generationTransaction','sqlite','wal','sqliteAux','tmp','log','state','events','cache','tools','recordingsOther','other'].map(k=>[k,{bytes:0,files:0}]));
  let totalBytes=0,entries=0,transientJournalMisses=0;
  function category(parts){
    const top=parts[0],name=parts.at(-1);
    if(top==='input')return 'input';
    if(top==='tmp')return 'tmp';
    if(top==='gst-cache'||top==='registry.bin')return 'cache';
    if(top==='state'||top==='events')return top;
    if(parts.length===1&&/^server-\d+\.private\.log$/.test(name))return 'log';
    if(parts.length===1&&['normalize','process-metrics'].includes(name))return 'tools';
    if(top==='recordings'){
      if(name==='.recording-generation-transaction.json'||name==='.recording-generation-transaction.stage'||parts.some(part=>/^\.recording-generation-prepare-[a-f0-9]{32}$/.test(part)))return 'generationTransaction';
      if(name==='.recording-checkpoint.tmp')return 'checkpoint';
      if(/^recording-(?:generation-)?catalog\.sqlite3$/.test(name))return 'sqlite';
      if(/^recording-(?:generation-)?catalog\.sqlite3-wal$/.test(name))return 'wal';
      if(/^recording-(?:generation-)?catalog\.sqlite3-(?:shm|journal)$/.test(name))return 'sqliteAux';
      if(/^active-[1-9]\d*\.jsonl$/.test(name))return 'journal';
      if(/^snapshot-[1-9]\d*\.jsonl$/.test(name))return 'generationSnapshot';
      if(/^identity-[1-9]\d*\.jsonl$/.test(name))return 'generationIdentity';
      if(/^evidence-[1-9]\d*-(?:0|[1-9]\d*)\.jsonl$/.test(name))return 'generationEvidence';
      if(name==='recording-generation.json')return 'generationManifest';
      if(/^recording(?:-v2)?-mutations\.jsonl$/.test(name))return 'journal';
      if(/^.+\.(mp4|webm)\.partial\.[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(name))return 'mediaPartial';
      if(/\.(mp4|m4s|ts|mkv|webm)$/.test(name))return 'media';
      return 'recordingsOther';
    }
    return 'other';
  }
  function visit(file,parts){
    need(++entries<=100000,'root-entry-bound');
    const stat=statCurrentRunEntry(root,file,lstat);
    if(!stat){transientJournalMisses++;return;}
    if(stat.isSymbolicLink())need(parts.length>1&&parts[0]==='gst-cache','root-unsafe-symlink');
    else if(stat.isDirectory()){for(const name of fs.readdirSync(file))visit(path.join(file,name),[...parts,name]);return;}
    else need(stat.isFile()&&stat.nlink===1,'root-unsafe-file');
    need(Number.isSafeInteger(stat.size)&&stat.size>=0&&Number.isSafeInteger(totalBytes+stat.size),'root-size-bound');
    const item=categories[category(parts)];item.bytes+=stat.size;item.files++;totalBytes+=stat.size;
  }
  need(fs.lstatSync(root).isDirectory()&&!fs.lstatSync(root).isSymbolicLink(),'root-unsafe-directory');visit(root,[]);
  const ownership={productRecording:categoryTotal(categories,['media','mediaPartial','journal','checkpoint','generationSnapshot','generationIdentity','generationEvidence','generationManifest','generationTransaction','sqlite','wal','sqliteAux','recordingsOther']),
    fixtureInput:categoryTotal(categories,['input']),observerTools:categoryTotal(categories,['tools']),cache:categoryTotal(categories,['cache']),temporary:categoryTotal(categories,['tmp']),
    runtimeSupport:categoryTotal(categories,['log','state','events']),other:categoryTotal(categories,['other'])};
  need(Object.values(ownership).reduce((sum,item)=>sum+item.bytes,0)===totalBytes,'root-category-aggregate');
  return {totalBytes,capBytes:CURRENT_ROOT_CAP_BYTES,capExceeded:totalBytes>=CURRENT_ROOT_CAP_BYTES,entries,categories,ownership,transientJournalMisses,
    ...(sqlitePages?{sqlitePages:measureCurrentSqlitePages(root)}:{}),measurement:'logical-file-bytes-nonatomic',rawPathsPublished:false};
}
export function closedJournalComplete(result){return result?.partialBytes===0&&result.backlog===false&&result.busy!==true;}
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
  const inputLimit=33554432,batchLimit=524288,rowLimit=128;
  let totalInput=0,totalOutput=0;const output=[];let batch=[],batchBytes=0;
  const flush=()=>{
    if(!batch.length)return;
    const input=batch.join('\n')+'\n';
    const result=spawnSync(binary,['--normalize'],{input,encoding:'utf8',timeout:3000,maxBuffer:inputLimit,env:{PATH:process.env.PATH}});
    if(result.error?.code==='ETIMEDOUT')throw Error('observer-native-timeout');
    if(result.error?.code==='ENOBUFS')throw Error('observer-native-output-cap');
    if(result.error)throw Error('observer-native-spawn-error');
    need(!result.signal&&result.status===0,'observer-native-rejected');
    need(typeof result.stdout==='string'&&result.stdout.endsWith('\n'),'observer-native-output-invalid');
    totalOutput+=Buffer.byteLength(result.stdout);need(totalOutput<=inputLimit,'observer-native-output-cap');
    const lines=result.stdout.slice(0,-1).split('\n');need(lines.length===batch.length,'observer-native-count');
    try{output.push(...lines.map(JSON.parse));}catch{throw Error('observer-native-output-invalid');}
    batch=[];batchBytes=0;
  };
  for(const row of rows){
    const bytes=Buffer.byteLength(row)+1;totalInput+=bytes;need(totalInput<=inputLimit,'observer-input-cap');
    if(batch.length&&(batchBytes+bytes>batchLimit||batch.length>=rowLimit))flush();
    batch.push(row);batchBytes+=bytes;
    if(bytes>batchLimit)flush();
  }
  flush();need(output.length===rows.length,'observer-native-count');return output;
}
export class CurrentRecordingObserver {
  constructor(root,binary,budget=new CurrentObservationBudget()){this.root=root;this.binary=binary;this.budget=budget;this.reader=null;this.prefix=[];this.ids=new Set();this.bytes=0;this.cursor=0;this.replaying=false;this.rotations=0;this.error=null;this.typeCounts=Object.fromEntries(CURRENT_JOURNAL_MUTATION_TYPES.map(type=>[type,0]));}
  open(){return new RecordingJournalReader(this.root,'recording-v2-mutations.jsonl',{nativeLines:true,lineBytes:16777216,pollBytes:33554432});}
  pollGeneration(){
    this.reader?.close();this.reader=null;
    const result=spawnSync(this.binary,['--observe-generation',this.root,String(this.prefix.length)],{encoding:'utf8',timeout:3000,maxBuffer:33554432,env:{PATH:process.env.PATH}});
    if(result.error?.code==='ETIMEDOUT')throw Error('observer-native-timeout');
    if(result.error?.code==='ENOBUFS')throw Error('observer-native-output-cap');
    need(!result.error&&!result.signal&&result.status===0,'observer-native-rejected');
    let value;try{value=JSON.parse(result.stdout);}catch{throw Error('observer-native-output-invalid');}
    need(typeof value?.busy==='boolean','observer-native-output-invalid');
    if(value.busy)return {rows:[],busy:true,backlog:false,partialBytes:0,mutationCount:this.prefix.length,identityBytes:this.bytes,rotations:this.rotations,typeCounts:{...this.typeCounts},catalogAcceptancePass:false};
    need(/^[a-f0-9]{64}$/.test(value.storeHash)&&/^[1-9]\d{0,19}$/.test(value.generation)&&
      Array.isArray(value.prefix)&&value.prefix.length<=100000&&value.prefix.length>=this.prefix.length&&Array.isArray(value.rows)&&
      value.rows.length<=128&&value.prefix.length-this.prefix.length===value.rows.length&&typeof value.backlog==='boolean'&&
      Number.isSafeInteger(value.partialBytes)&&value.partialBytes>=0&&Number.isSafeInteger(value.consumedOffset)&&value.consumedOffset>=0,'observer-native-output-invalid');
    need(!this.storeHash||this.storeHash===value.storeHash,'observer-store-changed');
    need(!this.generation||BigInt(value.generation)>=BigInt(this.generation),'observer-generation-regressed');
    for(let i=0;i<this.prefix.length;i++)need(value.prefix[i]===this.prefix[i],'observer-checkpoint-prefix-mismatch');
    const before=this.prefix.length;
    for(const [index,row] of value.rows.entries()){
      need(typeof row.id==='string'&&typeof row.entity==='string'&&/^[a-f0-9]{64}$/.test(row.identity),'observer-compact-shape');
      need(typeof row.occurredAtMs==='string'&&/^-?(0|[1-9]\d*)$/.test(row.occurredAtMs),'observer-compact-time');
      const type=row.type==='event_link_receipt'?'event_link_created':row.type,token=JSON.stringify([row.id,row.entity,type,row.identity,row.occurredAtMs]);
      need(value.prefix[before+index]===token&&!this.ids.has(row.id)&&Object.hasOwn(this.typeCounts,type),'observer-generation-row-mismatch');
      const bytes=Buffer.byteLength(token);need(this.prefix.length<100000&&this.bytes+bytes<=33554432,'observer-id-cap');this.budget.reserve(2,bytes);
      this.ids.add(row.id);this.prefix.push(token);this.bytes+=bytes;this.typeCounts[type]++;
    }
    if(this.generation&&this.generation!==value.generation)this.rotations++;
    this.generation=value.generation;this.storeHash=value.storeHash;
    return {rows:value.rows,busy:false,backlog:value.backlog,partialBytes:value.partialBytes,consumedOffset:value.consumedOffset,
      mutationCount:this.prefix.length,identityBytes:this.bytes,rotations:this.rotations,typeCounts:{...this.typeCounts},catalogAcceptancePass:false};
  }
  poll(){
    if(this.error)throw this.error;
    try{
      if(this.generationMode||fs.existsSync(path.join(this.root,'recording-generation.json'))){this.generationMode=true;return this.pollGeneration();}
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
        const token=JSON.stringify([row.id,row.entity,canonicalType,row.identity,row.occurredAtMs]);
        if(this.cursor<this.prefix.length)need(this.prefix[this.cursor]===token,'observer-checkpoint-prefix-mismatch');
        else{
          need(!this.ids.has(row.id),'observer-duplicate-id');
          need(this.prefix.length<100000&&this.bytes+Buffer.byteLength(token)<=33554432,'observer-id-cap');
          this.budget.reserve(2,Buffer.byteLength(token)); // mutation/entity 두 위치를 반복도 포함해 보수적으로 계상
          this.ids.add(row.id);this.prefix.push(token);this.bytes+=Buffer.byteLength(token);
        need(Object.hasOwn(this.typeCounts,canonicalType),'observer-unknown-mutation-type');
        this.typeCounts[canonicalType]++;fresh.push(row);
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
