// R139: 제품/장시간 실행 없이 고정45분 collector 계약을 검증한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {memoryObservationMode,memoryAttributionCollector,collectMemoryAttribution,memoryAttributionSnapshot,finishMemoryAttribution} from './recording_memory_attribution.mjs';
import {captureBoundedProcessLog,processLogCaptureComplete,mixedPreparationContract} from './recording_longrun_progress.mjs';
const names=['unattributed','model','sourceBatch','retryBatch','sourceCut','preparation','matches','page','response','preparedNative','retainedRaw','catalogRow','scratch'];
function row(i,phase='sample'){
 const ns=1+i*5000000000;
 return {pid:42,phase,sampleStartNs:ns,ownerCapturedNs:ns+1,rolesCapturedNs:ns+2,processCapturedNs:ns+3,sampleEndNs:ns+5,rssBytes:1000,footprintBytes:1000,residencyUsed:0,attributedSearchBytes:0,unattributedSearchBytes:0,valid:true,loss:false,tickets:Object.fromEntries(names.map(n=>[n,[0,0]])),models:[],snapshotPools:[],recentEvents:[],live:Array(14).fill(0),peak:Array(14).fill(0),totals:Array(20).fill(0),ticketWitness:{peak:0,peakNs:0,atPeak:Array(15).fill(0),atUnknownPeak:Array(15).fill(0),unknownLive:Array(15).fill(0),unknownPeak:Array(4).fill(0),sites:Array.from({length:15},()=>Array(13).fill(0)),allocator:[true,true,ns+3,ns+4,100,200,0,1]}};
}
const resource=(i,phase)=>'[recording-resource] '+JSON.stringify({pid:42,seq:i,phase})+'\n';
const owner=r=>'[memory-attribution] '+JSON.stringify(r)+'\n';
const feed=(s,text)=>collectMemoryAttribution(s,Buffer.from(text));
function send(s,i,phase='sample',change={}){feed(s,resource(i,phase)+owner({...row(i,phase),...change}));}
const fresh=()=>memoryAttributionCollector(42,{strict:true});
const complete=()=>{const s=fresh();for(const [i,p] of ['opened','sample','before-Finish','after-Finish','after-storage-destruction'].entries())send(s,i,p);return s;};
assert.equal(finishMemoryAttribution(complete()).resourcePaired,true);
const duration=fresh();send(duration,0,'opened');for(let i=1;i<=576;i++)send(duration,i);for(const [j,p] of ['before-Finish','after-Finish','after-storage-destruction'].entries())send(duration,577+j,p);
assert.equal(finishMemoryAttribution(duration).count,580); // synthetic upper2880s/5s+4; no sleeping/product run.
const chunks=fresh(),raw=resource(0,'opened')+'[unrelated] ok\n'+owner(row(0,'opened'));
for(const c of raw)feed(chunks,c);assert.equal(chunks.error,null);assert.equal(chunks.count,1);
const bad=[];
let s=fresh();feed(s,resource(0,'opened'));feed(s,resource(1,'sample'));bad.push(s); // missing owner
s=fresh();send(s,0,'opened');send(s,2);bad.push(s); // both records missing, seq gap
s=fresh();feed(s,owner(row(0,'opened')));bad.push(s); // missing resource
s=fresh();feed(s,resource(0,'opened')+owner(row(0,'sample')));bad.push(s);
s=fresh();send(s,0,'opened',{ticketWitness:undefined});bad.push(s);
s=fresh();const unsupported=row(0,'opened');unsupported.ticketWitness.allocator[0]=false;unsupported.ticketWitness.allocator[1]=false;feed(s,resource(0,'opened')+owner(unsupported));bad.push(s);
s=complete();feed(s,'[memory-attribution] {broken}\n');bad.push(s);
s=complete();feed(s,resource(5,'after-storage-destruction'));bad.push(s); // unmatched final
s=complete();feed(s,'[memory-attribution] {');bad.push(s);
s=fresh();feed(s,'[memory-attribution] '+' '.repeat(16385)+'\n');bad.push(s);
s=fresh();send(s,0,'opened');for(let i=1;i<=1600;i++)send(s,i);bad.push(s);
for(const state of bad)assert.throws(()=>finishMemoryAttribution(state));
s=complete();s.receivedNs=Number(process.hrtime.bigint())-15000000001;assert.throws(()=>memoryAttributionSnapshot(s),/stale/);
s=fresh();feed(s,'x'.repeat(17000));feed(s,owner(row(0,'opened')));assert.equal(s.count,0); // unrelated line tail cannot become a forged record
const app={bytes:0};let stopped=0,written=0;const write=b=>(written+=b.length,b.length);captureBoundedProcessLog(app,Buffer.alloc(4*1024*1024),write,()=>stopped++);assert.equal(processLogCaptureComplete(app,written),true);captureBoundedProcessLog(app,Buffer.from('x'),write,()=>stopped++);assert.equal(stopped,1);assert.equal(processLogCaptureComplete(app,written),false);
assert.equal(memoryObservationMode(['--state-diagnostic']),true);assert.equal(memoryObservationMode(['--memory-attribution-diagnostic']),true);for(const m of ['--contention-diagnostic','--frame-diagnostic','--app-observe'])assert.equal(memoryObservationMode([m]),false);
assert.equal(mixedPreparationContract(['--state-diagnostic']).requiresDeletion,true);
const mixed=fs.readFileSync(new URL('./v450_recording_a_mixed.mjs',import.meta.url),'utf8');
for(const text of ['stateDiagnose?2700000','stateDiagnose?2880000','if(!memoryDiagnose)check(orderedLatencies','VERIFY_CATALOG_HOLDER_TRACE:diagnose&&!stateDiagnose?1:0','if(memoryDiagnose)values.VERIFY_CATALOG_SUBCOSTS=1','strict:stateDiagnose','if(memoryObserve)collectMemoryAttribution','memoryObserve&&app.memoryTrace.error','if(memoryObserve)console.log(\'[memory-attribution-summary]','if(memoryObserve)values.VERIFY_MEMORY_ATTRIBUTION=1'])assert(mixed.includes(text),text);
console.log(JSON.stringify({status:'PASS',syntheticRows:580,negativeCollectorCases:bad.length,overflowStops:true,modeAndFunctionalGateAssertions:true,productOrLongrunExecuted:false}));
