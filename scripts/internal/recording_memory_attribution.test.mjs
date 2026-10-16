import assert from 'node:assert/strict';
import {validateMemoryAttribution,collectMemoryAttribution,memoryAttributionCollector,finishMemoryAttribution} from './recording_memory_attribution.mjs';
import {mixedPreparationContract} from './recording_longrun_progress.mjs';
const names=['unattributed','model','sourceBatch','retryBatch','sourceCut','preparation','matches','page','response','preparedNative','retainedRaw','catalogRow','scratch'];
const row={pid:42,phase:'opened',sampleStartNs:1,ownerCapturedNs:2,rolesCapturedNs:3,processCapturedNs:4,sampleEndNs:5,residencyUsed:100,attributedSearchBytes:80,unattributedSearchBytes:20,valid:true,loss:false,tickets:Object.fromEntries(names.map(n=>[n,[n==='model'?80:n==='unattributed'?20:0,0]])),models:[],snapshotPools:[],recentEvents:[],live:Array(14).fill(0),peak:Array(14).fill(0),totals:Array(20).fill(0),rssBytes:1000,footprintBytes:1000};
assert.equal(validateMemoryAttribution(row,42),row);
for(const patch of [{live:undefined},{totals:[]},{rssBytes:-1},{phase:'unknown'},{attributedSearchBytes:101},{unattributedSearchBytes:19},{loss:true},{valid:false},{pid:43},{ownerCapturedNs:6},{snapshotPools:[[1,9,1,1,9,1,1,1,1,true]]}])assert.throws(()=>validateMemoryAttribution({...row,...patch},42));
const state=memoryAttributionCollector(42),line='[memory-attribution] '+JSON.stringify(row)+'\n';for(const ch of line)collectMemoryAttribution(state,Buffer.from(ch));assert.equal(state.count,1);assert.equal(state.error,null);
assert.equal(mixedPreparationContract(['--memory-attribution-diagnostic']).requiresDeletion,false);
assert.equal(mixedPreparationContract(['--state-diagnostic']).requiresDeletion,true);
assert.equal(mixedPreparationContract(['--frame-diagnostic']).requiresDeletion,true);
console.log('[pass] R137 negative difference, overlap, fragment and dedicated mode boundary');

const send=(s,r)=>collectMemoryAttribution(s,Buffer.from('[memory-attribution] '+JSON.stringify(r)+'\n'));
const complete=()=>{const s=memoryAttributionCollector(42);for(const [i,phase] of ['opened','sample','before-Finish','after-Finish','after-storage-destruction'].entries())send(s,{...row,phase,sampleStartNs:10*i+1,ownerCapturedNs:10*i+2,rolesCapturedNs:10*i+3,processCapturedNs:10*i+4,sampleEndNs:10*i+5,residencyUsed:0,attributedSearchBytes:0,unattributedSearchBytes:0,tickets:Object.fromEntries(names.map(n=>[n,[0,0]]))});return s;};
assert.equal(finishMemoryAttribution(complete()).status,'captured');
assert.throws(()=>finishMemoryAttribution(state),/missing/);
const tail=complete();collectMemoryAttribution(tail,Buffer.from('[memory-attribution] {'));assert.throws(()=>finishMemoryAttribution(tail),/tail/);
const late=complete();send(late,{...row,live:[]});assert.throws(()=>finishMemoryAttribution(late));
const repeat=complete();send(repeat,repeat.last);assert.throws(()=>finishMemoryAttribution(repeat),/reversal/);
const reverse=memoryAttributionCollector(42);send(reverse,{...row,phase:'sample'});assert.throws(()=>finishMemoryAttribution(reverse),/open/);
console.log('[pass] R137 schema, late failure, final owners, phases and tail');

const witness={peak:100,peakNs:2,atPeak:[100,...Array(14).fill(0)],unknownPeak:[20,2,100,1],atUnknownPeak:[20,...Array(14).fill(0)],unknownLive:[20,...Array(14).fill(0)],sites:Array.from({length:15},(_,i)=>i===0?[100,1,1,0,100,2,100,1,100,2,0,0,0]:Array(13).fill(0)),allocator:[true,true,4,5,100,200,300,1]};
validateMemoryAttribution({...row,ticketWitness:witness},42);
for(const change of [{peak:99},{unknownLive:Array(15).fill(0)},{atUnknownPeak:Array(15).fill(0)},{sites:[...witness.sites,witness.sites[0]]},{path:'/private/secret'},{allocator:[false,true,4,5,0,0,0,0]}])assert.throws(()=>validateMemoryAttribution({...row,ticketWitness:{...witness,...change}},42));
const cap=memoryAttributionCollector(42);collectMemoryAttribution(cap,Buffer.from('[memory-attribution] '+ ' '.repeat(16385)+'\n'));assert.match(cap.error,/cap/);
console.log('[pass] R138 witness same-domain sums, duplicate/unknown/coverage/privacy shape and unchanged output cap');
