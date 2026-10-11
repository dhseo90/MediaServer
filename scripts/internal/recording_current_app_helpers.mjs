// 파일 용도: 공개 DTO 관측 helper. 원장 replay/parser를 구현하지 않는다.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
export function summarizeOverlappingSources(page,eventMs,{unplacedUnit='mapping'}={}){
  need(['mapping','file'].includes(unplacedUnit),'source-diagnostic-unit');
  need(Number.isSafeInteger(eventMs),'source-diagnostic-time');
  const start=(BigInt(eventMs)-750n)*1000000n,end=(BigInt(eventMs)+750n)*1000000n;
  const rows=[],seen=new Set(),segments=new Set();let unknownCount=0;
  for(const row of [...page.items,...page.unplacedItems]){
    if(row.kind!=='continuous')continue;
    need(typeof row.segmentId==='string'&&row.segmentId.length<=512,'source-diagnostic-id');
    const range=row.mediaRange,num=v=>typeof v==='string'&&/^-?\d{1,20}$/.test(v);
    const key=JSON.stringify([row.segmentId,range?.startPts,range?.endPts,range?.timeBaseNum,range?.timeBaseDen,row.catalogState,row.playable]);
    if(seen.has(key))continue;seen.add(key);
    if(!range||range.timeBaseNum!=='1'||range.timeBaseDen!=='1000000000'||!num(range.startPts)||!num(range.endPts)){unknownCount++;continue;}
    if(BigInt(range.startPts)>=end||BigInt(range.endPts)<=start)continue;
    need(rows.length<128,'source-diagnostic-cap');
    segments.add(row.segmentId);
    rows.push({idHash:createHash('sha256').update(row.segmentId).digest('hex'),startPts:range.startPts,endPts:range.endPts,
      catalogState:['finalized','deleted','corrupt','deletion-pending','unknown'].includes(row.catalogState)?row.catalogState:'other',playable:row.playable===true});
  }
  return {temporalOnly:true,viewBasis:unplacedUnit==='file'?'timeline-known-mappings-unplaced-file-groups':'timeline-mapping-slices',segmentCount:segments.size,startNs:String(start),endNs:String(end),unknownCount,rows};
}
export function failedWindowGate(sourceEnd,tapPts){
  need(sourceEnd<=16500000000n,'reproduction-boundary-missed');
  need(tapPts<=16900000000n,'reproduction-frame-missed');
  return sourceEnd===16500000000n&&tapPts>=16766666666n;
}
// 타임라인 조회가 짧은 분석 PTS 창보다 오래 걸릴 수 있다. 같은 확정 원본 경계를
// 유지한 채 tap만 짧게 재관측하고, 창을 지나면 다음 경계를 조회한다.
export async function observeInteriorBoundary(sourceEnd,readPts,{pause=()=>Promise.resolve(),attempts=8}={}){
  need(typeof sourceEnd==='bigint'&&sourceEnd>=0n&&Number.isSafeInteger(attempts)&&attempts>=1&&attempts<=8,'interior-boundary-input');
  for(let i=0;i<attempts;++i){
    const pts=await readPts();
    if(pts!==null){
      need(Number.isSafeInteger(pts)&&pts>=0,'interior-boundary-pts');
      const delta=BigInt(pts)-sourceEnd;
      if(delta>=250000000n&&delta<=500000000n)return {pts,delta};
      if(delta>500000000n)return null;
    }
    if(i+1<attempts)await pause();
  }
  return null;
}
// 통합 검증 전용 고정 fixture의 실제 키프레임 증거만 소비한다.
// 제품 원본/UTC 변환이나 임의 시간 보정에 사용하지 않는다.
export function fixtureFirstKeyframeBoundary(probe){
  need(probe&&Array.isArray(probe.streams)&&probe.streams.length===1&&probe.streams[0].time_base==='1/15360'&&
    probe.streams[0].duration==='30.000000'&&Array.isArray(probe.frames)&&probe.frames.length===4,'fixture-keyframes-shape');
  const stamps=probe.frames.map(frame=>frame.best_effort_timestamp);
  need(stamps.every(Number.isSafeInteger)&&stamps.every((stamp,index)=>stamp===index*128000),'fixture-keyframes-changed');
  return 128000n*1000000000n/15360n;
}
export function requireFailedWindowDispatch(pts){need(pts===16900000000,'reproduction-dispatch-mismatch');}
// HTTP 지연 관측 전용이다. 요청 완전성·복수 출력 합격으로 사용하지 않는다.
export function latencyTransitionOutputs(page,eventId,referenceId){
  const rows=[...page.items,...page.unplacedItems].filter(x=>x.eventId===eventId);
  if(!rows.length)return null;
  need(rows.every(r=>r.kind==='event'&&r.referenceId===referenceId),'latency-lineage');
  need(!rows.some(r=>r.jobState==='failed'),'latency-job-failed');
  if(rows.some(r=>r.jobState!=='complete'))return null;
  need(rows.every(r=>typeof r.jobId==='string'&&r.jobId.length>0&&r.jobId===rows[0].jobId),'latency-lineage');
  const outputs=new Map();
  for(const row of rows){
    need(row.catalogState==='finalized'&&row.playable===true&&typeof row.segmentId==='string'&&row.segmentId.length>0&&row.playbackUrl===`/ops/api/recordings/media/${row.segmentId}`,'latency-media');
    outputs.set(row.segmentId,row);
  }
  return [...outputs.values()];
}
// 검증된 개별 페이지에서 terminal을 본 사실만 보존한다. 전체 조회/두 출력 PASS를 만들지 않는다.
export function createTerminalObservation(eventId,referenceId,{now=()=>performance.now()}={}){
  const outputs=new Map(),states=new Set();let job=null,firstObservedMs=null,firstPageOffset=null,firstTimelineOrdinal=null,failure=null;
  return {consume(page,{timelineOrdinal=null}={}){
    if(failure)throw failure;
    try{
      const matched=[...page.items,...page.unplacedItems].filter(row=>row.eventId===eventId||row.referenceId===referenceId);
      for(const row of matched){
        need(row.kind==='event'&&row.eventId===eventId&&row.referenceId===referenceId,'latency-lineage');
        need(['not-created','intent','ready','committed','complete','failed'].includes(row.jobState),'latency-state');
        need(row.jobState!=='failed','latency-job-failed');
        if(row.jobState==='not-created'&&row.jobId===''){
          need(row.segmentId===null&&row.completeness==='unknown'&&row.catalogState==='absent'&&row.playable===false,'latency-lineage');
          states.add(row.jobState);continue;
        }
        need(typeof row.jobId==='string'&&row.jobId.length>0&&(!job||job===row.jobId),'latency-lineage');job=row.jobId;
        states.add(row.jobState);
        if(row.jobState!=='complete')continue;
        latencyTransitionOutputs({items:[row],unplacedItems:[]},eventId,referenceId);
        need(outputs.has(row.segmentId)||outputs.size<8,'terminal-observation-cap');
        // job 출력 상한8에 결박한다. 전체 DTO/member 배열은 full-page 결과에만 보존한다.
        const value=Object.fromEntries(['kind','eventId','referenceId','jobId','jobState','segmentId','catalogState','playable','playbackUrl','completeness'].map(key=>[key,row[key]]));
        need(Buffer.byteLength(JSON.stringify(value))<=8192,'terminal-observation-cap');
        outputs.set(row.segmentId,value);
        if(firstObservedMs===null){const at=now();need(Number.isFinite(at)&&at>=0,'terminal-clock');
          need(timelineOrdinal===null||(Number.isSafeInteger(timelineOrdinal)&&timelineOrdinal>0),'terminal-ordinal');
          firstObservedMs=at;firstPageOffset=page.offset;firstTimelineOrdinal=timelineOrdinal;}
      }
    }catch(error){failure=error;throw error;}
  },outputs(){if(failure)throw failure;return [...outputs.values()];},
  status(){return {terminalObserved:firstObservedMs!==null,firstObservedMs,firstPageOffset,firstTimelineOrdinal,mixedStates:states.size>1,
    observedOutputCount:outputs.size,fullOutputPass:false,invalid:failure!==null};}};
}
export function summarizeEventState(page,eventId,referenceId,reason){
  const matched=[...page.items,...page.unplacedItems].filter(x=>x.eventId===eventId);
  const enumValue=(value,allowed)=>allowed.includes(value)?value:'other';
  const rows=matched.slice(0,8).map(r=>{
    const q=r.requestedRange,keys=['startTimeMs','endTimeMs','preMs','postMs'];
    const valid=q?.timeBasis==='media-pts-ms'&&keys.every(k=>typeof q[k]==='string'&&/^-?\d{1,20}$/.test(q[k]));
    return {jobState:enumValue(r.jobState,['not-created','intent','ready','committed','complete','failed']),
      completeness:enumValue(r.completeness,['complete','partial','unknown']),
      catalogState:enumValue(r.catalogState,['absent','finalized','deleted','corrupt','deletion-pending','unknown']),
      playable:r.playable===true,request:valid?Object.fromEntries([['timeBasis','media-pts-ms'],...keys.map(k=>[k,q[k]])]):null};
  });
  return {reason:enumValue(reason,['ok','event-absent','event-not-complete','page-total-changed','expected-two-output-files']),
    rowCount:matched.length,jobCount:new Set(matched.map(r=>r.jobId).filter(x=>typeof x==='string'&&x.length)).size,
    outputCount:new Set(matched.map(r=>r.segmentId).filter(x=>typeof x==='string'&&x.length)).size,
    referenceMatches:matched.every(r=>r.referenceId===referenceId),truncated:matched.length>8,rows};
}
export async function measuredHttpResponse({route,method='GET',request,report,maxBytes=64*1024*1024,now=()=>performance.now()}) {
  need(Number.isSafeInteger(maxBytes)&&maxBytes>0&&maxBytes<=64*1024*1024,'http-body-limit');
  const pathname=route.split('?')[0];
  const routes=[[/^\/health$/,'health'],[/^\/webrtc\/config$/,'ice'],
    [/^\/ops\/api\/recordings\/timeline$/,'timeline'],[/^\/ops\/api\/recordings\/media\/[^/]+$/,'media'],
    [/^\/ops\/api\/recordings\/status$/,'recording-status'],[/^\/ops\/api\/sources\/[^/]+$/,'source-item'],
    [/^\/ops\/api\/sources$/,'source'],[/^\/lab\/analysis\/taps$/,'tap-create'],
    [/^\/lab\/analysis\/taps\/[^/]+\/events$/,'tap-events'],[/^\/lab\/analysis\/taps\/[^/]+$/,'tap'],
    [/^\/lab\/analysis\/rules\/[^/]+$/,'rule']];
  const start=now();let header=null,bytes=0,phase='header',outcome='error',status=null;
  try {
    const response=await request();header=now();phase='body';status=response.status;
    const chunks=[];
    for await(const chunk of response.body){bytes+=chunk.length;if(bytes>maxBytes)throw Error('http-body-cap');chunks.push(chunk);}
    phase='complete';outcome='ok';
    return {status:response.status,headers:response.headers,bytes:Buffer.concat(chunks)};
  } catch(error) {
    outcome=['TimeoutError','AbortError'].includes(error?.name)?'timeout':'error';
    // 원문 message/cause에는 URL이나 응답 내용이 있을 수 있어 전달하지 않는다.
    throw Error(`http-${phase}-${outcome}`);
  } finally {
    const end=now();
    report({method:['GET','POST','PUT','DELETE','HEAD','PATCH'].includes(method)?method:'OTHER',
      routeClass:routes.find(([pattern])=>pattern.test(pathname))?.[1]??'other',status,
      headerElapsedMs:header===null?null:Math.round(header-start),
      bodyElapsedMs:header===null?null:Math.round(end-header),totalElapsedMs:Math.round(end-start),bytes,phase,outcome});
  }
}
function need(ok,reason){if(!ok)throw Error(reason);}
function pageBound(code,details){const error=Error(code);error.code=code;error.diagnostic=details;throw error;}
export async function allTimelinePages(fetchPage,{limit=100,maxItems=4096,maxLeaves=8192,maxBytes=64*1024*1024,observe,consumePage}={}){
  // 관측 callback 실패는 원래 페이지 결과/예외를 덮지 않는다.
  const notify=event=>{try{observe?.(event);}catch{}};
  try{
  need(Number.isSafeInteger(limit)&&limit>0&&limit<=1000,'page-limit');
  need(Number.isSafeInteger(maxItems)&&maxItems>0&&maxItems<=4096,'page-item-limit');
  need(Number.isSafeInteger(maxLeaves)&&maxLeaves>0&&maxLeaves<=8192,'page-leaf-limit');
  need(Number.isSafeInteger(maxBytes)&&maxBytes>0&&maxBytes<=64*1024*1024,'page-byte-limit');
  const items=[],unplacedItems=[],seen=new Set();let total,unplacedTotal,bytes=0,leaves=0;
  for(let offset=0;;offset+=limit){
    const page=await fetchPage(offset,limit);
    notify({kind:'page',offset,page});
    need(page&&!page.truncated&&Number.isSafeInteger(page.total)&&page.total>=0&&Number.isSafeInteger(page.unplacedTotal)&&page.unplacedTotal>=0,'page-total');
    const topLevel=Number.isSafeInteger(page.total+page.unplacedTotal)?page.total+page.unplacedTotal:null;
    if(page.total>maxItems||page.unplacedTotal>maxItems||topLevel===null||topLevel>maxItems)pageBound('page-bound-top-limit',{topLevel,maxItems});
    if(page.offset!==offset||page.limit!==limit)pageBound('page-bound-offset-limit',
      {expectedOffset:offset,observedOffset:Number.isSafeInteger(page.offset)?page.offset:null,
        expectedLimit:limit,observedLimit:Number.isSafeInteger(page.limit)?page.limit:null});
    const pageIds=new Set();
    const identify=item=>{need(item&&typeof item.itemId==='string'&&item.itemId.length>0&&!pageIds.has(item.itemId),'duplicate-item');pageIds.add(item.itemId);};
    for(const [key,count] of [['items',page.total],['unplacedItems',page.unplacedTotal]]){
      need(Array.isArray(page[key])&&page[key].length===Math.min(limit,Math.max(0,count-offset)),'page-incomplete');
      for(const item of page[key]){
        identify(item);
        if(item.rangeBasis==='file-group'){
          need(Array.isArray(item.members)&&item.members.length>0,'group-members');
          leaves+=item.members.length;
          if(leaves>maxLeaves)pageBound('page-bound-leaf-limit',{leaves,maxLeaves});
          for(const member of item.members){identify(member);need(!Object.hasOwn(member,'members'),'group-members');}
        }else{need(!Object.hasOwn(item,'members'),'group-members');leaves++;}
        if(leaves>maxLeaves)pageBound('page-bound-leaf-limit',{leaves,maxLeaves});
        bytes+=Buffer.byteLength(JSON.stringify(item));need(bytes<=maxBytes,'page-byte-cap');
      }
    }
    // 이 callback은 진단 observe와 달리 오류를 삼키지 않는다. cross-page 실패와 별개로 관측한다.
    await consumePage?.(page);
    if(total===undefined){total=page.total;unplacedTotal=page.unplacedTotal;}
    need(page.total===total&&page.unplacedTotal===unplacedTotal,'page-total-changed');
    for(const id of pageIds){need(!seen.has(id),'duplicate-item');seen.add(id);}
    items.push(...page.items);unplacedItems.push(...page.unplacedItems);
    if(offset+limit>=Math.max(total,unplacedTotal)){notify({kind:'complete'});return {total,unplacedTotal,items,unplacedItems};}
  }
  }catch(error){const bounded=['page-bound-top-limit','page-bound-offset-limit','page-bound-leaf-limit'].includes(error?.code);
    notify({kind:'failure',code:error?.message==='page-total-changed'?'page-total-changed':bounded?error.code:'page-failure',...(bounded?{details:error.diagnostic}:{})});throw error;}
}
// 독립 terminal 관측은 전체 페이지 적격을 대신하지 않고, 전체 페이지 성공도 terminal 관측을 대신하지 않는다.
export function requireCompletionEvidence(outputs,terminalStatus,fullPageStatus){
  need(Array.isArray(outputs)&&outputs.length===2,'expected-two-output-files');
  need(terminalStatus?.terminalObserved===true&&!terminalStatus.invalid,'independent-terminal-observation-missing');
  need(fullPageStatus==='complete','full-page-eligibility-missing');
  return outputs;
}
function decimal(value){need(typeof value==='string'&&/^-?(0|[1-9]\d*)$/.test(value),'precision-string');return BigInt(value);}
export function eventOutputs(page,eventId,referenceId){
  const rows=[...page.items,...page.unplacedItems].filter(x=>x.eventId===eventId);
  need(rows.length>0,'event-absent');const outputs=new Map();let job,request;
  if(rows.length===1){
    const row=rows[0];
    if(row.kind==='event'&&row.referenceId===referenceId&&row.jobId===''&&row.jobState==='not-created'&&
       row.segmentId===null&&row.completeness==='unknown'&&row.catalogState==='absent'&&row.playable===false)
      throw Error('event-not-complete');
  }
  for(const row of rows){
    need(row.kind==='event'&&row.referenceId===referenceId&&typeof row.jobId==='string'&&row.jobId.length>0,'event-lineage');
    job??=row.jobId;need(row.jobId===job,'multiple-jobs');
    need(row.jobState==='complete'&&row.completeness==='complete'&&row.playable===true,'event-not-complete');
    const q=row.requestedRange;need(q?.timeBasis==='media-pts-ms','request-axis');
    for(const key of ['startTimeMs','endTimeMs','preMs','postMs'])decimal(q[key]);
    need(decimal(q.endTimeMs)>=decimal(q.startTimeMs)&&decimal(q.preMs)>=0n&&decimal(q.postMs)>=0n&&decimal(q.endTimeMs)-decimal(q.startTimeMs)+decimal(q.preMs)+decimal(q.postMs)>0n,'request-range');
    const canonical=JSON.stringify(q);request??=canonical;need(request===canonical,'request-disagreement');
    need(typeof row.segmentId==='string'&&row.segmentId.length>0&&row.playbackUrl===`/ops/api/recordings/media/${row.segmentId}`,'media-link');
    const previous=outputs.get(row.segmentId);if(previous)need(previous.playbackUrl===row.playbackUrl,'file-disagreement');else outputs.set(row.segmentId,row);
  }
  need(outputs.size===2,'expected-two-output-files');return [...outputs.values()].sort((a,b)=>a.segmentId.localeCompare(b.segmentId));
}
export function verifyRestart(before,after,fresh){
  for(const key of ['eventId','referenceId','jobId'])need(before[key]===after[key]&&fresh[key]!==before[key]&&typeof fresh[key]==='string'&&fresh[key].length>0,'restart-identity');
  const sorted=x=>[...x.outputs].sort((a,b)=>a.id.localeCompare(b.id));
  need(before.outputs.length===2&&after.outputs.length===2&&fresh.outputs.length===2,'restart-output-count');
  need(JSON.stringify(sorted(before))===JSON.stringify(sorted(after)),'restart-file-changed');
  const prior=new Set(before.outputs.map(x=>x.id));need(new Set(fresh.outputs.map(x=>x.id)).size===2&&fresh.outputs.every(x=>!prior.has(x.id)),'new-production-absent');
  return true;
}

// LP26-O05 전용: 동일 수신 bytes를 판정하고 최초 실패 전에 부모 run에 보존한다.
// 정상 원문은 유지하지 않으며 최근8개 요약만 보유한다. caller가 기존 check를 수행한다.
export function createRecordingStatusCapture(outputDir,{write=(name,bytes)=>{
  const file=path.join(outputDir,name),fd=fs.openSync(file,'wx',0o600);
  try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
},admit=()=>{},now=()=>performance.now()}={}){
  const identity=fs.lstatSync(outputDir);need(identity.isDirectory()&&!identity.isSymbolicLink()&&identity.uid===process.getuid(),'status-output-owner');
  const persist=(name,bytes)=>{const current=fs.lstatSync(outputDir);need(current.dev===identity.dev&&current.ino===identity.ino&&!current.isSymbolicLink(),'status-output-replaced');write(name,bytes);};
  let ordinal=0,firstFailure=null;const recent=[];
  const shape=v=>v===null?'null':Array.isArray(v)?'array':typeof v;
  const field=(row,key)=>({present:row!==null&&typeof row==='object'&&Object.hasOwn(row,key),type:shape(row?.[key]),
    value:['boolean','number'].includes(typeof row?.[key])||row?.[key]===null?row[key]:typeof row?.[key]==='string'?row[key].slice(0,64):undefined});
  return {inspect(response,{startedAt,receivedAt,channelIds=['9101','9201']}={}){
    need(Buffer.isBuffer(response.bytes)&&response.bytes.length<=4*1024*1024,'status-response-cap');
    need(channelIds.length<=2&&channelIds.every(x=>typeof x==='string'&&/^[0-9]{1,8}$/.test(x)),'status-targets');
    const requestId=++ordinal;let parsed,parseFailure=false;
    try{parsed=JSON.parse(response.bytes.toString());}catch{parseFailure=true;}
    const channels=parsed?.channels,filterFailure=Array.isArray(channels)&&channels.some(x=>x===null),rows=channelIds.map(id=>{
      // 배열 이외의 filter 호출은 기존에도 실패였다. 진단에서는 별도 shape 실패로 보존한다.
      const c=Array.isArray(channels)?channels.filter(x=>x?.channelId===id):undefined;
      const count=c?.length,one=count===1,row=one?c[0]:null;
      return {channelId:id,matchCount:count??null,matches:(c??[]).slice(0,2).map(x=>Object.fromEntries(['enabled','active','storageBlocked'].map(k=>[k,field(x,k)]))),
        conditions:{exactlyOne:one,enabled:one?!!row.enabled:null,active:one?!!row.active:null,notStorageBlocked:one?!row.storageBlocked:null},
        passed:one&&!!row.enabled&&!!row.active&&!row.storageBlocked};});
    const summary={requestId,startedAt,receivedAt,judgedAt:now(),httpStatus:response.status,bytes:response.bytes.length,sha256:createHash('sha256').update(response.bytes).digest('hex'),parseFailure,
      channels:{present:parsed!==null&&typeof parsed==='object'&&Object.hasOwn(parsed,'channels'),type:shape(channels)},rows,
      passed:!parseFailure&&!filterFailure&&rows.every(x=>x.passed),filterFailure};
    if(!summary.passed&&!firstFailure){
      firstFailure={...summary,recent:[...recent],rawFile:`recording-status-${requestId}.private.json`,collectionErrors:[]};
      try{admit(response.bytes.length+16384);persist(firstFailure.rawFile,response.bytes);}catch(e){firstFailure.collectionErrors.push({stage:'raw',code:e.code??'capture-failed'});}
      try{const bytes=Buffer.from(JSON.stringify(firstFailure)+'\n');admit(bytes.length);persist(`recording-status-${requestId}.diagnostic.json`,bytes);}catch(e){firstFailure.collectionErrors.push({stage:'summary',code:e.code??'capture-failed'});}
    }
    if(summary.passed){recent.push({requestId,startedAt,receivedAt,judgedAt:summary.judgedAt,sha256:summary.sha256,rows:rows.map(x=>({channelId:x.channelId,passed:x.passed}))});if(recent.length>8)recent.shift();}
    return {parsed,summary};
  },failure:()=>firstFailure};
}

export function recordingStateSummary(text,required=true){
  const lines=text.split('\n').filter(l=>l.startsWith('[recording-state] ')),issues=[],rows=[];
  if(!lines.length)return {status:required?'incomplete':'not-observed',issues:required?['missing-probe']:[]};
  for(const line of lines){try{need(line.length<=1024,'state-row-cap');rows.push(JSON.parse(line.slice('[recording-state] '.length)));}catch{issues.push('invalid-row');}}
  const probes=rows.filter(r=>r.type==='probe'),ends=rows.filter(r=>r.type==='end'),events=rows.filter(r=>r.type===undefined);
  if(probes.length!==1||probes[0].version!==1||ends.length!==1)issues.push('probe-end');
  if(ends.length===1&&(!Number.isInteger(ends[0].count)||ends[0].count<0||ends[0].count>128||ends[0].count!==events.length||ends[0].writeError!==false))issues.push('count-write');
  const ids=new Set();for(const e of events){if(!Number.isSafeInteger(e.seq)||e.seq<0||e.seq>=events.length||ids.has(e.seq)||!Number.isSafeInteger(e.atUs)||typeof e.phase!=='string'||typeof e.reason!=='string'||typeof e.channel!=='string')issues.push('event-shape');ids.add(e.seq);}
  return {status:issues.length?'incomplete':'captured',count:events.length,events,issues};
}
