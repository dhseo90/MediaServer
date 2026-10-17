// R142: native formatter roundtrip + bounded decoder negatives + passive historical replay.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {memoryAttributionCollector,collectMemoryAttribution,finishMemoryAttribution,restoreMemoryEvents} from './recording_memory_attribution.mjs';
const root=process.env.R142_ROOT;assert(root&&fs.realpathSync(root)===root);
const repo=path.resolve(new URL('../..',import.meta.url).pathname),binary=path.join(root,'compact-native');
const build=spawnSync(process.env.CXX||'c++',['-std=c++17','-pthread','-I'+repo+'/include',repo+'/scripts/internal/recording_memory_compact_smoke.cpp','-o',binary],{encoding:'utf8'});fs.writeFileSync(path.join(root,'native-build.log'),build.stdout+build.stderr);assert.equal(build.status,0,build.stderr);
const run=spawnSync(binary,[],{encoding:'utf8'});fs.writeFileSync(path.join(root,'native.log'),run.stdout+run.stderr);assert.equal(run.status,0,run.stderr);
const parse=l=>JSON.parse(l.slice(l.indexOf('{'))),lines=run.stdout.split('\n'),old=lines.filter(l=>l.startsWith('V1 ')).map(parse),next=lines.filter(l=>l.startsWith('V2 ')).map(parse),pid=old[0].pid;
const wire=r=>'[memory-attribution] '+JSON.stringify(r)+'\n',feed=(s,r)=>collectMemoryAttribution(s,Buffer.from(wire(r)));
const s=memoryAttributionCollector(pid);
next.forEach((r,i)=>{feed(s,r);assert.equal(s.error,null);assert.deepEqual(s.last,old[i]);assert(s.last.recentEvents.length<=32);});
assert.equal(finishMemoryAttribution(s).finalOwnerZero,true);
const initial=memoryAttributionCollector(pid);feed(initial,parse(lines.find(l=>l.startsWith('INITIAL '))));assert.equal(initial.error,null);assert.equal(initial.last.recentEvents.length,32);
const neg=[];
function reject(name,mutate,prior=next[0]){const state=memoryAttributionCollector(pid);feed(state,prior);feed(state,mutate(structuredClone(next[1])));assert(state.error,name);neg.push({name,error:state.error});}
reject('gap',r=>({...r,eventStartSequence:1,eventSequence:2,totals:r.totals.map((v,i)=>i===8?2:v)}));
reject('duplicate-sequence',r=>({...r,recentEvents:[[0,...r.recentEvents[0].slice(1)],[0,...r.recentEvents[0].slice(1)]],eventSequence:2,totals:r.totals.map((v,i)=>i===8?2:v)}));
reject('reorder',r=>({...r,recentEvents:[[1,...r.recentEvents[0].slice(1)],[0,...r.recentEvents[0].slice(1)]],eventSequence:2,totals:r.totals.map((v,i)=>i===8?2:v)}));
reject('missing-event',r=>({...r,recentEvents:[]}));
reject('second-full',r=>({...r,eventFull:true}));
reject('unknown-version',r=>({...r,schemaVersion:3}));
reject('v1-downgrade',()=>old[1]);
reject('boolean-event',r=>{r.recentEvents[0][2]=true;return r;});
reject('unsafe-sequence',r=>({...r,eventSequence:Number.MAX_SAFE_INTEGER+1}));
reject('totals-mismatch',r=>({...r,eventSequence:2}));
const overflowState=memoryAttributionCollector(pid);next.forEach(r=>feed(overflowState,r));feed(overflowState,parse(lines.find(l=>l.startsWith('OVERFLOW '))));assert.equal(overflowState.error,'memory-event-range');neg.push({name:'overflow-33',error:overflowState.error});
const rollback=memoryAttributionCollector(pid);next.slice(0,2).forEach(r=>feed(rollback,r));feed(rollback,{...next[2],eventStartSequence:0,eventSequence:0,totals:next[2].totals.map((v,i)=>i===8?0:v),recentEvents:[]});assert.equal(rollback.error,'memory-event-gap');
const missing=memoryAttributionCollector(pid);feed(missing,next[1]);assert(missing.error);
for(const tail of ['[memory-attribution] {','[memory-attribution] {x}\n']){const state=memoryAttributionCollector(pid);next.forEach(r=>feed(state,r));collectMemoryAttribution(state,Buffer.from(tail));assert.throws(()=>finishMemoryAttribution(state));}
const v1=memoryAttributionCollector(pid);old.forEach(r=>feed(v1,r));assert.equal(finishMemoryAttribution(v1).finalOwnerZero,true);
// Whole/split newline-inclusive transport cap, same frozen owner values.
for(const bytes of [16382,16383,16384]){const state=memoryAttributionCollector(pid),raw=wire(next[0]),padded=raw.slice(0,-1)+' '.repeat(bytes-Buffer.byteLength(raw))+'\n';for(const ch of Buffer.from(padded))collectMemoryAttribution(state,Buffer.from([ch]));assert.equal(!state.error,bytes<=16383);}
// Actual ResourceTrace → Emit opt-in wiring; no server. Linux lacks process memory
// metrics/allocator by design, so this wiring check does not claim a valid runtime row.
for(const compact of ['0','1']){const r=spawnSync(binary,['trace'],{encoding:'utf8',env:{...process.env,MEDIA_SERVER_VERIFY_MEMORY_ATTRIBUTION:'1',MEDIA_SERVER_VERIFY_MEMORY_COMPACT:compact}});assert.equal(r.status,0,r.stderr);const a=r.stderr.split('\n').filter(l=>l.startsWith('[memory-attribution] ')).map(parse);assert.equal(a.length,5);if(process.platform==='darwin'){const trace=memoryAttributionCollector(a[0].pid,{strict:true});collectMemoryAttribution(trace,Buffer.from(r.stderr));assert.equal(finishMemoryAttribution(trace).finalOwnerZero,true);}assert(a.every(v=>compact==='1'?v.schemaVersion===2:v.schemaVersion===undefined));fs.writeFileSync(path.join(root,'trace-'+compact+'.log'),r.stderr);}
const mixed=fs.readFileSync(path.join(repo,'scripts/internal/v450_recording_a_mixed.mjs'),'utf8');assert(mixed.includes('if(stateDiagnose)values.VERIFY_MEMORY_COMPACT=1;'));
// Re-encode ONLY preserved R137 numeric rows. No witness fields synthesized into them.
let replay=null;const input=path.join(root,'r137-server.log');
if(fs.existsSync(input)){
 const records=fs.readFileSync(input,'utf8').split(/(?<=\n)/).filter(l=>l.startsWith('[memory-attribution] '));const st=memoryAttributionCollector(parse(records[0]).pid);let previous=null,oldBytes=0,newBytes=0,eventsBytes=0,arrayBytes=0;const sizes=[];const outputs=[];
 for(const line of records){const row=parse(line),end=row.totals[8],start=previous??Math.max(0,end-32);assert(end-start<=32&&end>=start);const encoded={...row,schemaVersion:2,eventFull:previous===null,eventStartSequence:start,eventSequence:end,recentEvents:row.recentEvents.slice(row.recentEvents.length-(end-start)).map((v,i)=>[start+i,...v])};if(end===start)encoded.recentEvents=[];
  feed(st,encoded);assert.equal(st.error,null);assert.deepEqual(st.last,row);oldBytes+=Buffer.byteLength(line);const n=Buffer.byteLength(wire(encoded));newBytes+=n;sizes.push(n);eventsBytes+=Buffer.byteLength(JSON.stringify(row.recentEvents));arrayBytes+=Buffer.byteLength(JSON.stringify(row.models))+Buffer.byteLength(JSON.stringify(row.snapshotPools));outputs.push(wire(encoded));previous=end;
 }
 assert.equal(finishMemoryAttribution(st).finalOwnerZero,true);fs.writeFileSync(path.join(root,'r137-v2-replay.jsonl'),outputs.join(''));
 const saved=oldBytes-newBytes;replay={rows:records.length,oldBytes,newBytes,savedBytes:saved,savedPercent:100*saved/oldBytes,oldMean:oldBytes/records.length,newMean:newBytes/records.length,oldMax:Math.max(...records.map(v=>Buffer.byteLength(v))),newMax:Math.max(...sizes),recentEventsArrayBytes:eventsBytes,modelPoolArrayBytes:arrayBytes,remainingWireBytes:oldBytes-eventsBytes-arrayBytes,scenario580:{method:'historical average delta saving * 580; scenario only, no new maximum or 45 minute proof',historicalR139Representative:3456040,projectedSaving:saved/records.length*580,representativeAfter:3456040-saved/records.length*580,remainingMargin:4194304-(3456040-saved/records.length*580)}};
}
const synthetic={rows:old.length,v1Bytes:old.reduce((n,r)=>n+Buffer.byteLength(wire(r)),0),v2Bytes:next.reduce((n,r)=>n+Buffer.byteLength(wire(r)),0),largeWitnessValueBytes:Buffer.byteLength(JSON.stringify(old[0].ticketWitness)),description:'frozen synthetic witness/model/eviction/zero-owner changes; not R137 observations'};
const result={status:'PASS',nativeFrozenRoundtrip:old.length,negativeCases:neg,initialFull32:true,deltaCounts:[0,1,32],boundedRing:32,resourceTraceModeWiring:true,v1Compatibility:true,synthetic,replay,productExecutions:0};fs.writeFileSync(path.join(root,'compact-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
