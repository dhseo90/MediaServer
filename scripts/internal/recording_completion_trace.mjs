// 파일 용도: 검증 전용: 원문은 반환하지 않고 고정 스키마와 hash만 보존한다.
import {createHash} from 'node:crypto';
// RequestMedia의 고정 작업 레이블이다. 사용자 reference/segment/job ID가 아니다.
const mediaPreparationReferences=new Set(['visual-index-build','visual-search-request']
  .map(label=>createHash('sha256').update(label).digest('hex')));
const prefix='[recording-completion] ';
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const hash=x=>x===null||(typeof x==='string'&&/^[a-f0-9]{64}$/.test(x));
const time=x=>typeof x==='string'&&/^(0|[1-9]\d{0,19})$/.test(x)&&BigInt(x)<=18446744073709551615n;
const keys=['v','event','begin','end','thread','request','reference','job','n','x','y'];
export function validateCompletionRow(x){
  if(!x||Array.isArray(x)||Object.keys(x).length!==keys.length||!keys.every(k=>Object.hasOwn(x,k))||x.v!==1||!integer(x.event)||x.event<1||x.event>15||!time(x.begin)||!time(x.end)||BigInt(x.end)<BigInt(x.begin)||!['thread','request','n','x','y'].every(k=>integer(x[k]))||!hash(x.reference)||!hash(x.job))throw Error('completion-invalid');
  if(x.event<10&&(!x.reference||(x.event>1&&!x.job)||x.begin!==x.end||x.request!==0))throw Error('completion-identity');
  if(x.event<10&&(!x.thread||x.x||x.y||(x.event===1&&x.job!==null)||(x.event===5?x.n>2:x.n!==0)))throw Error('completion-event');
  if(x.event>=10&&x.event<=13){
    // identity와 request는 독립 축이다. worker/구조화 playback 경로는 request0,
    // 공개 Timeline의 외부 Scope는 양수 request를 사용한다. 둘 다 실제 uint32 문맥이다.
    if(!x.thread||x.thread>0xffffffff||x.request>0xffffffff||x.job!==null)throw Error('completion-context');
    if(x.event===10){
      if(x.reference!==null){
        // preparation: n=prepared, x=reused(반복 sample이므로 n보다 클 수 있음), y=peak bytes.
        if(!mediaPreparationReferences.has(x.reference))throw Error('completion-media-reference');
      }else if(x.y!==0||x.x>x.n)throw Error('completion-media-payload'); // input rows / unique media
    }else{
      // FinishTimelineWithContext의 세 단계. request0 허용은 위 실제 caller에 한정된 wire 의미다.
      if(x.reference!==null)throw Error('completion-request');
      if(x.event<13?(x.x!==0||x.y!==0):(x.y===0||x.n>x.y))throw Error('completion-timeline-payload');
    }
  }
  if(x.event===14&&(x.reference!==null||x.job!==null||x.begin!=='0'||x.end!=='0'||x.thread||x.request||x.n!==1||x.x||x.y))throw Error('completion-loss-invalid');
  if(x.event===15&&(x.reference!==null||x.job!==null||!x.thread||![1,2,3,4,5,101,102,103,104,105,106].includes(x.n)))throw Error('completion-timeline-invalid');
  if(x.event===15&&x.n===106&&(x.begin!==x.end||x.x>x.y))throw Error('completion-timeline-memo-invalid');
  return x;
}
export function createCompletionTraceCollector(){
  let pending='',failure=null,bytes=0;const rows=[];
  const reject=code=>{failure??=code;throw Error(failure);};
  return {append(chunk){
    if(failure)throw Error(failure);pending+=chunk;
    for(;;){const end=pending.indexOf('\n');if(end<0)break;const line=pending.slice(0,end);pending=pending.slice(end+1);
      if(!line.startsWith(prefix))continue;
      bytes+=Buffer.byteLength(line)+1;if(bytes>2*1024*1024||rows.length>=4096)reject('completion-cap');
      let value;try{value=validateCompletionRow(JSON.parse(line.slice(prefix.length)));}catch{reject('completion-invalid');}
      rows.push(value);
    }
    if(Buffer.byteLength(pending)>2*1024*1024)reject('completion-line-cap');
  },snapshot(){if(failure)throw Error(failure);return rows.slice();},
  finish(){if(failure)throw Error(failure);if(pending.startsWith(prefix))reject('completion-partial');return rows.slice();},
  status(){return {status:failure?'invalid':rows.some(x=>x.event===14)?'loss':'observed',code:failure??'none',rows:rows.length,bytes};}};
}
export function summarizeCompletion(rows,reference){
  if(typeof reference!=='string'||!hash(reference))throw Error('completion-reference');
  rows.forEach(validateCompletionRow);
  const selected=rows.filter(x=>x.reference===reference).sort((a,b)=>BigInt(a.begin)<BigInt(b.begin)?-1:BigInt(a.begin)>BigInt(b.begin)?1:0);
  const jobs=new Map();let submitted=false;
  for(const row of selected){
    if(row.event===1){if(submitted)throw Error('completion-sequence');submitted=true;continue;}
    const state=jobs.get(row.job)??{last:0,durable:0};
    if(row.event>=2&&row.event<=4){if(row.event!==state.last+1&&!(row.event===2&&state.last===0))throw Error('completion-sequence');state.last=row.event;}
    if(row.event>=6&&row.event<=9){
      if((row.event===6&&state.durable!==0)||(row.event===7&&state.durable!==6)||(row.event===8&&state.durable!==7)||(row.event===9&&state.durable!==0))throw Error('completion-transition');state.durable=row.event;
    }
    if(row.event===5&&state.last!==4)throw Error('completion-sequence');
    jobs.set(row.job,state);
  }
  const terminal=selected.filter(x=>x.event===8||x.event===9);
  return {referenceSha256:reference,events:selected.length,jobs:jobs.size,status:rows.some(x=>x.event===14)?'observation-loss':!selected.length?'observation-missing':terminal.length?'terminal-observed':'terminal-not-observed',firstNs:selected[0]?.begin??null,lastNs:selected.at(-1)?.end??null,terminal:terminal.map(x=>({jobSha256:x.job,state:x.event===8?'complete':'failed',atNs:x.end}))};
}

export function createTimelineObservation({now=()=>performance.now(),report=()=>{},reference=()=>null}={}){
  let cycle=0,invalid=0,emitted=0,bytes=0,lost=false;const summaries=[];
  return {begin(processOrdinal){
    const id=++cycle,start=now(),pages=[];let ordinal=0;
    const send=value=>{try{
      const size=Buffer.byteLength(JSON.stringify(value));
      if(++emitted>4095||bytes+size>2*1024*1024-512){lost=true;invalid++;report({kind:'loss',code:'page-observation-cap'});return;}
      bytes+=size;report(value);
    }catch{invalid++;}};
    return {ordinal(value){ordinal=value;},observe(event){
      try{
        if(lost)return;
        const elapsedMs=now()-start;if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw Error('clock');
        const base={cycle:id,processOrdinal,timelineOrdinal:ordinal,kind:event.kind,elapsedMs};
        if(event.kind==='page'){
          if(!integer(event.offset)||!integer(event.page?.total)||!integer(event.page?.unplacedTotal)||!Array.isArray(event.page.items)||!Array.isArray(event.page.unplacedItems))throw Error('page-shape');
          const states={intent:0,ready:0,committed:0,complete:0,failed:0,other:0};
          const target=reference();for(const row of [...event.page.items,...event.page.unplacedItems]){
            if(!target||row.referenceId!==target)continue;
            states[Object.hasOwn(states,row.jobState)?row.jobState:'other']++;
          }
          const value={...base,offset:event.offset,total:event.page.total,unplacedTotal:event.page.unplacedTotal,states};pages.push(value);send(value);
        }else{
          const changed=pages.some(p=>p.total!==pages[0].total||p.unplacedTotal!==pages[0].unplacedTotal);
          const states=new Set(pages.flatMap(p=>Object.entries(p.states).filter(([,n])=>n).map(([key])=>key)));
          const value={...base,pages:pages.length,totalChanged:changed,mixedStates:states.size>1,code:event.kind==='failure'?(event.code==='page-total-changed'?'page-total-changed':'page-failure'):'none'};
          summaries.push(value);send(value);
        }
      }catch{invalid++;}
    }};
  },status(){return {cycles:cycle,invalid,summaries:summaries.slice()};}};
}

export async function boundedUntil(label,fn,{now=()=>performance.now(),pause,budget,deadline,timeout=30000}){
  const end=Math.min(deadline,now()+timeout);
  while(now()<end){budget();const result=await fn();if(result)return result;await pause(100);}
  throw Error(label+'-timeout');
}
export async function observeTransitionWait(run,{now=()=>performance.now(),ordinal,report=()=>{},invalid=()=>{},referenceSha256,processOrdinal,deadlineMs=30000,strictDeadline=false,timeoutLabel='transition'}={}){
  const started=now(),before=ordinal();let outcome='error';
  const send=row=>{try{report(row);}catch{invalid();}};
  send({kind:'start',referenceSha256,processOrdinal,clientAtMs:started,deadlineMs,beforeTimelineOrdinal:before});
  try{const value=await run();if(strictDeadline&&now()-started>deadlineMs)throw Error(timeoutLabel+'-timeout');outcome='complete';return value;}
  catch(error){outcome=typeof error?.message==='string'&&error.message.endsWith('-timeout')?'timeout':'error';throw error;}
  finally{const ended=now(),last=ordinal();send({kind:'end',referenceSha256,processOrdinal,clientAtMs:ended,elapsedMs:ended-started,deadlineMs,returnedAfterBudget:ended-started>deadlineMs,outcome,firstTimelineOrdinal:last>before?before+1:null,lastTimelineOrdinal:last>before?last:null});}
}
