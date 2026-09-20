// 공개 DTO 관측 helper. 원장 replay/parser를 구현하지 않는다.
import {createHash} from 'node:crypto';
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
export async function measuredHttpResponse({route,method='GET',request,report,now=()=>performance.now()}) {
  const pathname=route.split('?')[0];
  const routes=[[/^\/health$/,'health'],[/^\/webrtc\/config$/,'ice'],
    [/^\/ops\/api\/recordings\/timeline$/,'timeline'],[/^\/ops\/api\/recordings\/media\/[^/]+$/,'media'],
    [/^\/ops\/api\/sources$/,'source'],[/^\/lab\/analysis\/taps$/,'tap-create'],
    [/^\/lab\/analysis\/taps\/[^/]+\/events$/,'tap-events'],[/^\/lab\/analysis\/taps\/[^/]+$/,'tap'],
    [/^\/lab\/analysis\/rules\/[^/]+$/,'rule']];
  const start=now();let header=null,bytes=0,phase='header',outcome='error',status=null;
  try {
    const response=await request();header=now();phase='body';status=response.status;
    const chunks=[];
    for await(const chunk of response.body){bytes+=chunk.length;if(bytes>64*1024*1024)throw Error('http-body-cap');chunks.push(chunk);}
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
export async function allTimelinePages(fetchPage,{limit=100,maxItems=4096,maxBytes=64*1024*1024,observe,consumePage}={}){
  // 관측 callback 실패는 원래 페이지 결과/예외를 덮지 않는다.
  const notify=event=>{try{observe?.(event);}catch{}};
  try{
  need(Number.isSafeInteger(limit)&&limit>0&&limit<=1000,'page-limit');
  const items=[],unplacedItems=[],seen=new Set();let total,unplacedTotal,bytes=0,leaves=0;
  for(let offset=0;;offset+=limit){
    const page=await fetchPage(offset,limit);
    notify({kind:'page',offset,page});
    need(page&&!page.truncated&&Number.isSafeInteger(page.total)&&page.total>=0&&Number.isSafeInteger(page.unplacedTotal)&&page.unplacedTotal>=0,'page-total');
    need(page.total+page.unplacedTotal<=maxItems&&page.offset===offset&&page.limit===limit,'page-bound');
    const pageIds=new Set();
    const identify=item=>{need(item&&typeof item.itemId==='string'&&item.itemId.length>0&&!pageIds.has(item.itemId),'duplicate-item');pageIds.add(item.itemId);};
    for(const [key,count] of [['items',page.total],['unplacedItems',page.unplacedTotal]]){
      need(Array.isArray(page[key])&&page[key].length===Math.min(limit,Math.max(0,count-offset)),'page-incomplete');
      for(const item of page[key]){
        identify(item);
        if(item.rangeBasis==='file-group'){
          need(Array.isArray(item.members)&&item.members.length>0,'group-members');
          leaves+=item.members.length;
          need(leaves<=maxItems,'page-bound');
          for(const member of item.members){identify(member);need(!Object.hasOwn(member,'members'),'group-members');}
        }else{need(!Object.hasOwn(item,'members'),'group-members');leaves++;}
        need(leaves<=maxItems,'page-bound');
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
  }catch(error){notify({kind:'failure',code:error?.message==='page-total-changed'?'page-total-changed':'page-failure'});throw error;}
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
