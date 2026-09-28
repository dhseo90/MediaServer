// 파일 용도: PID별 관측 요약. 자원 정상 범위나 누수를 판정하지 않는다.
const types=['segment_finalized','event_link_created','observation_put','observation_v2_put','deletion_requested','deletion_completed','corruption_detected'];
const counters=['mutationCount','uniqueMutationIds','uniqueEntityIds','storedIdCount','idUtf8Bytes'];
const metrics=['rssBytes','threadCount','fdCount'];
const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
function reject(){throw Error('invalid-observation-summary-input');}
function point(s){return {sampledAt:s.sampledAt,rssBytes:s.rssBytes,threadCount:s.threadCount,fdCount:s.fdCount};}
function aggregate(points){
  const first=points[0],last=points.at(-1),max={},delta={};
  for(const key of metrics){max[key]=Math.max(...points.map(x=>x[key]));delta[key]=last[key]-first[key];}
  return {first,last,max,delta,elapsedMs:last.sampledAt-first.sampledAt};
}
export function summarizeRecordingObservations(samples, options) {
  const warmupMs=options?.warmupMs;
  if(!integer(warmupMs)||!Array.isArray(samples)||!samples.length||samples.length>10000)reject();
  const groups=new Map();let previousTime=0,previousCounters;
  for(const s of samples){
    if(!s||!integer(s.pid,1)||typeof s.startIdentity!=='string'||s.startIdentity.length>128||
      !/^(macos:\d+:\d+|linux:\d+)$/.test(s.startIdentity)||!integer(s.sampledAt,1)||s.sampledAt<=previousTime||
      !integer(s.rssBytes,1)||!integer(s.threadCount,1)||!integer(s.fdCount))reject();
    const current={};
    for(const key of counters){if(!integer(s[key]))reject();current[key]=s[key];}
    if(s.journal?.status!=='observed'||!integer(s.journal.consumedOffset))reject();
    current.consumedOffset=s.journal.consumedOffset;
    for(const key of types){if(!integer(s.typeCounts?.[key]))reject();current[key]=s.typeCounts[key];}
    if(previousCounters&&Object.keys(current).some(key=>current[key]<previousCounters[key]))reject();
    let group=groups.get(s.pid);
    if(group&&group.startIdentity!==s.startIdentity)reject();
    if(!group){
      if(groups.size>=64)reject();
      group={pid:s.pid,startIdentity:s.startIdentity,points:[],firstCounters:current};groups.set(s.pid,group);
    }
    group.points.push(point(s));group.lastCounters=current;
    previousTime=s.sampledAt;previousCounters=current;
  }
  const result=[];
  for(const g of groups.values()){
    const a=aggregate(g.points),post=g.points.filter(p=>p.sampledAt-a.first.sampledAt>=warmupMs);
    let maxGapMs=null;
    for(let i=1;i<g.points.length;i++)maxGapMs=Math.max(maxGapMs??0,g.points[i].sampledAt-g.points[i-1].sampledAt);
    const workloadDelta={};
    for(const key of Object.keys(g.lastCounters))workloadDelta[key]=g.lastCounters[key]-g.firstCounters[key];
    const postWarmup=post.length<2?{status:'insufficient',sampleCount:post.length,delta:null,elapsedMs:null,rssMiBPerMinute:null}:
      {...aggregate(post),status:'observed',sampleCount:post.length,rssMiBPerMinute:
        (post.at(-1).rssBytes-post[0].rssBytes)/1048576/((post.at(-1).sampledAt-post[0].sampledAt)/60000)};
    result.push({pid:g.pid,startIdentity:g.startIdentity,sampleCount:g.points.length,...a,maxGapMs,warmupMs,postWarmup,
      workload:{first:g.firstCounters,last:g.lastCounters,delta:workloadDelta}});
  }
  return {groups:result,sampleCount:samples.length,journalFinal:previousCounters,resourceTrendPass:false,reviewRequired:true};
}
