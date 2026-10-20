// R165: 기존 mixed 요청 중 사전 고정 15건만 결속. 제품/API/부하와 독립인 시험용 소비자.
import {diagnosticLines} from './recording_diagnostic_lines.mjs';
export const batches=[0,40,80,92,100], slots=[0,10,20,23,25];
const required=['service-wait','service-hold','preparation-wait','preparation-hold','Refresh','WithPlayback','SnapshotBegin','CurrentnessJson'];
const need=(b,m)=>{if(!b)throw Error(m);};
const number=n=>Number.isSafeInteger(n)&&n>=0;
export function selection(batch,client){const i=batches.indexOf(batch);return i<0||client>1?0:i*3+client+1;}
export function aSelection(slot){const i=slots.indexOf(slot);return i<0?0:i*3+3;}
export function costCollector(){
 const records={client:new Map(),server:new Map(),search:new Map()},started=new Set();let first=null;
 const lines=[0,1].map(()=>diagnosticLines(['[R154-','[search-cost-loss]','[search-failure-loss]'],8192));
 const fail=error=>{if(!first)first={code:error.message,detectedMs:performance.now()};return first;};
 function accept(kind,r){
  need(!first,'sticky-diagnostic-failure');need(records[kind]&&r&&number(r.id)&&r.id>=1&&r.id<=15,'request-identity');
  need(!records[kind].has(r.id),'duplicate-terminal');need(r.loss===false,'trace-loss');
  const order=keys=>{const a=keys.map(k=>r[k]);need(a.every(number)&&a.every((v,i)=>v>0&&(!i||v>=a[i-1])),'record-order');};
  if(kind==='server'){
   need(r.class===(r.id%3===0?3:1),'request-class');order(['accepted','parsed','handler','prepared','sendBegin','sendEnd','end']);need(r.sent===true,'send-incomplete');
  }else if(kind==='search'){
   order(['begin','end']);need(r.diagnosticId===r.id&&r.status===200,'search-identity-status');
   need(Array.isArray(r.phases)&&r.phases.length<=40,'phase-cap');
   for(const p of r.phases)need(Array.isArray(p)&&p.length===3&&typeof p[0]==='string'&&number(p[1])&&number(p[2])&&p[1]>0&&p[2]>=p[1]&&p[2]<=r.end,'phase-order');
   need(required.every(n=>r.phases.some(p=>p[0]===n)),'missing-phase');
  }else{
   need(started.has(r.id),'unstarted-client');need(r.status===200&&r.outcome==='ok'&&r.phase==='complete'&&r.bytes>0,'client-incomplete');
   need(number(r.totalElapsedMs)&&r.totalElapsedMs<=5000,'client-timeout');
  }
  records[kind].set(r.id,r);
 }
 return {
  start(id){try{need(number(id)&&id>=1&&id<=15&&!started.has(id),'duplicate-start');started.add(id);}catch(e){fail(e);throw e;}},
  client(r){try{accept('client',r);}catch(e){fail(e);throw e;}},
  append(chunk,stream){try{lines[stream].append(chunk,line=>{
   if(line.startsWith('[R154-loss]')||line.startsWith('[search-'))throw Error('trace-loss-marker');
   const m=line.match(/^\[R154-(server|search)\] (.*)$/);need(m,'unexpected-record');accept(m[1],JSON.parse(m[2]));
  });}catch(e){fail(e);}},
  failure(){return first;},
  complete(){for(const line of lines)line.finish();if(first)throw Error(first.code);
   for(const id of started){const c=records.client.get(id),s=records.server.get(id),q=records.search.get(id);need(c&&s&&q,'missing-terminal');
    need(s.handler<=q.begin&&q.end<=s.prepared,'search-outside-handler');
    need(q.phases.every(p=>p[1]>=s.handler&&p[2]<=q.end),'phase-outside-handler');}
   need(Object.values(records).every(m=>m.size===started.size),'unbound-terminal');return Object.fromEntries(Object.entries(records).map(([k,m])=>[k,[...m.values()]]));},
  ready(channels){return Array.from({length:9},(_,i)=>i+1).every(id=>started.has(id))&&Object.values(records).every(m=>m.size===started.size)&&[...records.client.values()].filter(r=>r.id%3!==0&&r.totalElapsedMs>=2000).length>=2&&['9101','9201'].every(k=>channels[k].finalized>=600);}
 };
}

// 검색 전용 결과는 장시간/삭제/메모리/릴리즈 적격성을 부여하지 않는다.
export function assertSearchPerformanceCapacity(){
 // 요청당 출력 크기는 bounded지만 background/retry/runtime 출력 총량은 미입증.
 // 환경변수나 CLI override로 우회하지 않는다. 새 용량 근거 검토 전에는 실행 금지.
 throw Error('CAPACITY_UNPROVEN: background/retry completion and total runtime output');
}
export function searchPerformanceResult({final,trace,completion,logsCaptured,batches}){
 const omitted={retentionDeletion:'NOT_RUN',retentionPostDeletionStability:'NOT_RUN',memoryP0:'NOT_RUN',readiness120:'NOT_RUN',releaseQualification:'NOT_RUN'};
 const m=final.evidenceLoad,a=final.aLoad, channels=final.phase?.channels;
 const progression=['9101','9201'].every(id=>Number.isSafeInteger(channels?.[id]?.finalized)&&channels[id].finalized>0);
 const latencies=m?.searchLatencyMs;
 const timing=Array.isArray(latencies)&&latencies.length>0&&latencies.every(n=>Number.isFinite(n)&&n>=0)&&latencies.length===m.searchSuccess;
 const ordered=timing?[...latencies].sort((a,b)=>a-b):[];
 const p95=ordered.at(Math.ceil(ordered.length*.95)-1)??null,max=ordered.at(-1)??null;
 const latency=timing?(p95<=2000&&max<=5000?'PASS':'FAIL'):'INCOMPLETE';
 const bound=['client','server','search'].every(kind=>Array.isArray(trace?.[kind])&&trace[kind].length===15&&new Set(trace[kind].map(r=>r.id)).size===15&&trace[kind].every(r=>Number.isInteger(r.id)&&r.id>=1&&r.id<=15&&r.loss===false));
 const collection=Array.isArray(completion)&&completion.length===final.processCount&&completion.length>0&&completion.every(c=>c.status==='captured')&&logsCaptured===true;
 const workload=Number.isSafeInteger(batches)&&batches>0&&m?.searchSuccessByClient?.length===4&&m.searchSuccessByClient.every(n=>Number.isSafeInteger(n)&&n>0)&&m.searchSuccessByClient.reduce((a,b)=>a+b,0)===m.searchSuccess&&Number.isSafeInteger(m.searchUnavailable)&&m.searchUnavailable>=0&&m.searchSuccess+m.searchUnavailable===batches*4&&m.cycles>0&&m.createComplete>0&&m.visualResults>0&&m.visualCreated>0&&m.windows?.length===3&&m.windows.every(w=>['structured','visual','evidence','visualEvidence'].every(k=>w[k]>0))&&a?.completed?.some(r=>r.state==='completed'&&r.label?.startsWith('main-'));
 const complete=timing&&bound&&collection&&workload&&final.verifiedDurationMs>=1800000;
 const status=!complete?'INCOMPLETE':final.failed!==0||!progression||latency==='FAIL'||final.processesClosed!==true||final.udpClosed!==true?'FAIL':'PASS';
 return {...omitted,status,recordingProgression:progression?'PASS':'FAIL',latency:{status:latency,count:ordered.length,p95,max,limitP95:2000,limitMax:5000},requestCompleteness:workload?'PASS':'INCOMPLETE',selectedCorrelation:bound?'PASS':'INCOMPLETE',completionCollection:collection?'PASS':'INCOMPLETE',outputBudget:'CAPACITY_UNPROVEN'};
}
