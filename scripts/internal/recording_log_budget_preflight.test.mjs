// R141 collector regression; R140 historical observations remain in its artifact.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {memoryAttributionCollector,collectMemoryAttribution,finishMemoryAttribution} from './recording_memory_attribution.mjs';
import {captureBoundedProcessLog,processLogCaptureComplete,slowTraceSummary} from './recording_longrun_progress.mjs';
const names='unattributed model sourceBatch retryBatch sourceCut preparation matches page response preparedNative retainedRaw catalogRow scratch'.split(' ');
function row(i,phase){const ns=1+i*5000000000;return {pid:42,phase,sampleStartNs:ns,ownerCapturedNs:ns+1,rolesCapturedNs:ns+2,processCapturedNs:ns+3,sampleEndNs:ns+5,rssBytes:1000,footprintBytes:1000,residencyUsed:0,attributedSearchBytes:0,unattributedSearchBytes:0,valid:true,loss:false,tickets:Object.fromEntries(names.map(n=>[n,[0,0]])),models:[],snapshotPools:[],recentEvents:[],live:Array(14).fill(0),peak:Array(14).fill(0),totals:Array(20).fill(0),ticketWitness:{peak:0,peakNs:0,atPeak:Array(15).fill(0),atUnknownPeak:Array(15).fill(0),unknownLive:Array(15).fill(0),unknownPeak:Array(4).fill(0),sites:Array.from({length:15},()=>Array(13).fill(0)),allocator:[true,true,ns+3,ns+4,100,200,0,1]}};}
const phases=['opened','sample','before-Finish','after-Finish','after-storage-destruction'];
const resource=(i,p)=>'[recording-resource] '+JSON.stringify({pid:42,seq:i,phase:p})+'\n';
const owner=(i,p)=>'[memory-attribution] '+JSON.stringify(row(i,p))+'\n';
const feed=(s,b)=>collectMemoryAttribution(s,Buffer.from(b));
const fresh=()=>memoryAttributionCollector(42,{strict:true});
function complete(skip='',tail=''){const s=fresh();phases.forEach((p,i)=>{if(skip===p)return;feed(s,resource(i,p)+owner(i,p));});feed(s,tail);return s;}
assert.equal(finishMemoryAttribution(complete()).finalOwnerZero,true);
const rejected=[];
for(const p of phases){assert.throws(()=>finishMemoryAttribution(complete(p)));rejected.push('missing-'+p);}
for(const suffix of ['[memory-attribution] {bad}\n','[memory-attribution] {']){assert.throws(()=>finishMemoryAttribution(complete('',suffix)));rejected.push('bad-owner');}
for(const missing of ['owner','resource']){const s=fresh();feed(s,missing==='owner'?resource(0,'opened'):owner(0,'opened'));assert.throws(()=>finishMemoryAttribution(s));rejected.push('missing-'+missing);}
const lineBoundaries=[];
for(const size of [16382,16383,16384,16385,16386])for(const split of ['whole','middle','newline']){
 const s=fresh(),raw=owner(0,'opened'),padded=Buffer.from(raw.slice(0,-1)+' '.repeat(size-Buffer.byteLength(raw))+'\n');
 assert.equal(padded.length,size);feed(s,resource(0,'opened'));
 const at=split==='middle'?Math.floor(size/2):split==='newline'?size-1:size;
 collectMemoryAttribution(s,padded.subarray(0,at));collectMemoryAttribution(s,padded.subarray(at));
 assert.equal(!s.error,size<=16383);lineBoundaries.push({wireBytes:size,split,accepted:!s.error});
}
// Non-ASCII valid JSON whitespace field is ignored by schema, but wire bytes remain exact.
const unicode=Buffer.from(owner(0,'opened').replace('"pid":42','"note":"가😀","pid":42'));
for(let at=0;at<=unicode.length;++at){const s=fresh();feed(s,resource(0,'opened'));collectMemoryAttribution(s,unicode.subarray(0,at));collectMemoryAttribution(s,unicode.subarray(at));assert.equal(s.error,null);}
for(const invalid of [Buffer.from('[memory-attribution] {"x":"\xff"}\n','latin1'),Buffer.from('[memory-attribution] \xe3\x81\n','latin1')]){const s=fresh();collectMemoryAttribution(s,invalid);assert(s.error);}
for(const tail of [Buffer.from('[memory-attribution] \xe3\x81','latin1'),Buffer.from('[memory-attribution]')]){const s=complete();collectMemoryAttribution(s,tail);assert.throws(()=>finishMemoryAttribution(s));}
const cap=4194304,totalBoundaries=[];
for(const size of [cap-1,cap,cap+1]){let stopped=0,written=0;const app={bytes:0}; // two streams share one app accounting, not separate caps
 const out=Buffer.alloc(Math.floor(size/2),65),err=Buffer.alloc(size-out.length,66);
 for(const b of [out,err])captureBoundedProcessLog(app,b,x=>(written+=x.length,x.length),()=>stopped++);
 assert.equal(processLogCaptureComplete(app,written),size<=cap);assert.equal(stopped,size>cap?1:0);
 totalBoundaries.push({combinedBytes:size,capturedBytes:written,complete:processLogCaptureComplete(app,written),stopCalls:stopped});}
let stops=0;const short={bytes:0};captureBoundedProcessLog(short,Buffer.from('abc'),()=>2,()=>stops++);assert.equal(short.captureError,'write-failed');assert.equal(stops,1);
const loss='[recording-completion] {"v":1,"event":14,"begin":"0","end":"0","thread":0,"request":0,"reference":null,"job":null,"n":1,"x":0,"y":0}\n';
const lost={bytes:0};let saved=0;captureBoundedProcessLog(lost,Buffer.from(loss),x=>(saved+=x.length,x.length),()=>{throw Error('unexpected stop');});assert.equal(processLogCaptureComplete(lost,saved),true);
const slow='[recording-slow-summary] {"seen":0,"retained":0,"thresholdNs":10000000}\n';assert.equal(slowTraceSummary(loss+slow,true).status,'captured');
const mixed=fs.readFileSync(new URL('./v450_recording_a_mixed.mjs',import.meta.url),'utf8');assert(mixed.includes('completionTrace.append'));assert(mixed.includes('completionTrace.finish'));
// No fake deletion/generation stdout: those are journal mutations. Full budget unknown.
const emitter=fs.readFileSync(new URL('../../include/recording/recording_memory_diagnostic_output.h',import.meta.url),'utf8');assert(emitter.includes('std::size_t(n)>=sizeof(line)-offset'));assert(emitter.includes('complete&&sink(line,offset)'));
console.log(JSON.stringify({status:'PASS_COLLECTOR_BOUNDARIES_NOT_READINESS',negativeCases:rejected,lineBoundaries,totalBoundaries,shortWriteStopped:true,normalSyntheticFinalOwnerZero:true,completionLossTransportAccepted:true,completionLossConsumedSeparately:true,actualDeletionExecution:false,maximumLiveModelFeasibility:'unknown',productRuns:0,longRuns:0}));
