// LP26 O01~04: 실제 제품 writer/parser + 관측기 자체검사. 장시간/실제 UI PASS가 아니다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {CurrentRecordingObserver,CurrentLongrunProgress,CurrentObservationBudget,normalizeCurrentRows,summarizeCurrentSamples,closedJournalComplete,disabledChannelsExact} from './recording_current_observer.mjs';
import {sampleContinuity,parseLongrunArgs} from './recording_longrun_progress.mjs';
const root=process.argv[2],binary=path.join(root,'normalize'),start=performance.now(),readers=[];
let passed=0,failed=0;
const check=(id,fn)=>{try{fn();passed++;console.log('[pass] '+id);}catch(error){failed++;console.log('[fail] '+id);throw error;}};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const row=(id,type,payload={})=>JSON.stringify({schema:'media-server.recording-mutation.v1',mutationId:id,mutationType:type,occurredAtMs:1,entityId:'entity',payload});
let seq=0;
function observer(text){const dir=path.join(root,'case-'+(++seq));fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'recording-v2-mutations.jsonl'),text);const o=new CurrentRecordingObserver(dir,binary);readers.push(o);return o;}
try{
  check('LP26-O02 final stopped tail must be complete and fully drained',()=>{assert(closedJournalComplete({partialBytes:0,backlog:false}));for(const r of [null,{}, {partialBytes:1,backlog:false},{partialBytes:0,backlog:true}])assert(!closedJournalComplete(r));});
  check('LP26-O05 initial plus added channels exact disabled on restart',()=>{const channels=['1','9101','9201'].map(channelId=>({channelId,enabled:false,active:false}));assert(disabledChannelsExact({channels},['9201','9101','1']));assert(!disabledChannelsExact({channels},['9101','9201']));assert(!disabledChannelsExact({channels:[...channels,channels[0]]},['1','9101','9201']));assert(!disabledChannelsExact({channels:channels.map((c,i)=>({...c,active:i===1}))},['1','9101','9201']));});
  const fixture=spawnSync(binary,['--fixture',path.join(root,'recordings')],{encoding:'utf8',timeout:15000,maxBuffer:33554432});
  check('LP26-O01 actual managed writer fixture',()=>assert.equal(fixture.status,0));
  const raw=fixture.stdout.trim().split('\n'),rows=normalizeCurrentRows(binary,raw),segments=rows.filter(r=>r.type==='segment_v2_bound_finalized'||r.type==='segment_v2_finalized');
  check('LP26-O01 native exact row count and two channel segments',()=>{assert.equal(rows.length,raw.length);assert(segments.filter(r=>r.segment.channel==='9101').length>=2);assert(segments.filter(r=>r.segment.channel==='9201').length>=2);});
  check('LP26-O01 compact excludes binding samples source URL and payload',()=>{const json=JSON.stringify(rows);for(const key of ['payload','samples','source_id','observed_utc_ns'])assert(!json.includes('"'+key+'"'));});
  const original=path.join(root,'recordings/recording-v2-mutations.jsonl'),before=hash(fs.readFileSync(original));
  const live=new CurrentRecordingObserver(path.dirname(original),binary);readers.push(live);const observed=live.poll();
  check('LP26-O02 actual store read preserves original bytes',()=>{assert.equal(observed.rows.length,rows.length);assert.equal(before,hash(fs.readFileSync(original)));assert.equal(live.poll().rows.length,0);});
  const snapshot=()=>spawnSync(binary,['--snapshot',path.dirname(original)],{encoding:'utf8',timeout:15000,maxBuffer:16384});
  check('LP26-O05 actual deleted and survivor Catalog recovery twice',()=>{const a=snapshot(),b=snapshot();assert.equal(a.status,0);assert.equal(b.status,0);assert.deepEqual(JSON.parse(a.stdout),JSON.parse(b.stdout));const v=JSON.parse(a.stdout);assert.equal(v.deleted,2);assert(v.available>=2);assert.equal(before,hash(fs.readFileSync(original)));});
  const source=fs.readFileSync(new URL('../../src/recording/recording_journal.cpp',import.meta.url),'utf8');
  const types=[...source.matchAll(/case RecordingMutationType::\w+: return "([^"]+)";/g)].map(m=>m[1]).filter(t=>t!=='unknown');
  const strictTypes=new Set(['recording_order_reserved','segment_v2_state','segment_v2_deleted','event_link_receipt','segment_v2_finalized','segment_v2_bound_finalized']);
  for(const type of types.filter(t=>!strictTypes.has(t)))check('LP26-O01 known envelope '+type,()=>assert.equal(normalizeCurrentRows(binary,[row('case',type)])[0].type,type));
  for(const [label,value] of [['unknown',row('bad','unknown')],['duplicate-key',row('bad','observation_put').replace('"occurredAtMs":1','"occurredAtMs":1,"occurredAtMs":2')],['invalid-json','{'],['unsafe-id',row('bad\n','observation_put')],['bad-segment',row('bad','segment_v2_finalized')],['bad-state',row('bad','segment_v2_state')],['bad-deleted',row('bad','segment_v2_deleted')]])
    check('LP26-O01 reject '+label,()=>assert.throws(()=>normalizeCurrentRows(binary,[value]),/native-rejected/));
  const a=row('a','event_link_created',{note:'observed'}),b=row('b','observation_put');
  const o=observer(a+'\n'+b);check('LP26-O02 partial line not consumed',()=>{const r=o.poll();assert.equal(r.rows.length,1);assert(r.partialBytes>0);});
  fs.appendFileSync(path.join(o.root,'recording-v2-mutations.jsonl'),'\n');check('LP26-O02 partial append consumed once',()=>assert.equal(o.poll().rows.length,1));
  const identity=normalizeCurrentRows(binary,[a])[0].identity;
  const receipt=row('a','event_link_receipt',{schema:'media-server.recording-receipt.v1',originalType:'event_link_created',originalSha256:identity});
  const replace=(target,text)=>{const file=path.join(target.root,'recording-v2-mutations.jsonl');fs.writeFileSync(file+'.new',text);fs.renameSync(file+'.new',file);};
  replace(o,receipt+'\n'+b+'\n'+row('c','consumer_reference_put')+'\n');
  check('LP26-O02 exact checkpoint receipt prefix and suffix',()=>{const r=o.poll();assert.equal(r.rotations,1);assert.equal(r.rows.length,1);assert.equal(r.rows[0].id,'c');});
  for(const [label,text] of [['changed',row('a','event_link_created',{changed:true})+'\n'+b+'\n'],['missing',a+'\n']]){
    const p=observer(a+'\n'+b+'\n');p.poll();replace(p,text);check('LP26-O02 checkpoint '+label+' refused',()=>assert.throws(()=>p.poll(),/prefix/));
  }
  const truncated=observer(a+'\n');truncated.poll();fs.truncateSync(path.join(truncated.root,'recording-v2-mutations.jsonl'),0);
  check('LP26-O02 truncation latched',()=>{assert.throws(()=>truncated.poll(),/truncated/);assert.throws(()=>truncated.poll(),/truncated/);});
  const duplicated=observer(a+'\n'+a+'\n');check('LP26-O02 duplicate mutation rejected',()=>assert.throws(()=>duplicated.poll(),/duplicate/));
  const symlink=observer(a+'\n');fs.renameSync(path.join(symlink.root,'recording-v2-mutations.jsonl'),path.join(symlink.root,'original'));fs.symlinkSync('original',path.join(symlink.root,'recording-v2-mutations.jsonl'));
  check('LP26-O02 symlink rejected',()=>assert.throws(()=>symlink.poll(),/unsafe/));
  const p=new CurrentLongrunProgress(0);p.consume(rows,1);
  check('LP26-O02 observer and progress share one total identity budget',()=>{const q=observer(raw[0]+'\n');const b=new CurrentObservationBudget({maxIds:2,maxBytes:33554432});q.budget=b;q.poll();assert.equal(b.ids,2);assert.throws(()=>new CurrentLongrunProgress(0,['9101','9201'],b).consume([segments[0]],1),/combined-cap/);assert.equal(b.ids,2);});
  check('LP26-O02 total byte cap and invalid cap cannot be increased',()=>{const b=new CurrentObservationBudget({maxIds:3,maxBytes:20});b.reserve(1,11);assert.throws(()=>b.reserve(1,10),/combined-cap/);assert.equal(b.bytes,11);assert.throws(()=>new CurrentObservationBudget({maxIds:100001}));assert.throws(()=>new CurrentObservationBudget({maxBytes:33554433}));});
  check('LP26-O03 actual native order advances independent of UTC',()=>{const s=p.status(1);assert(s.channels['9101'].finalized>=2);assert(s.channels['9201'].finalized>=2);});
  const first=segments[0],copy=structuredClone(first);copy.id='changed';copy.entity='new-segment';copy.segment.id=copy.entity;copy.segment.order='9007199254740993';copy.segment.epochHash='b'.repeat(64);copy.segment.startPts='0';copy.segment.endPts='1';copy.segment.knownMappings=0;copy.segment.unknownMappings=1;
  check('LP26-O03 huge order unknown UTC new epoch PTS reset accepted',()=>{p.consume([copy],2);assert.equal(p.channels['9101'].order,'9007199254740993');});
  check('LP26-O03 duplicate segment rejected',()=>assert.throws(()=>p.consume([copy],3),/identity/));
  const regression=structuredClone(copy);regression.entity=regression.segment.id='other-segment';regression.segment.order='9007199254740992';
  check('LP26-O03 persistent order regression rejected',()=>assert.throws(()=>p.consume([regression],3),/identity/));
  const state={type:'segment_v2_state',entity:first.entity,state:'deletion-pending'},deleted={type:'segment_v2_deleted',entity:first.entity,segment:first.segment};
  check('LP26-O03 completion without pending rejected',()=>assert.throws(()=>new CurrentLongrunProgress(0).consume([first,deleted],1),/delete-transition/));
  check('LP26-O03 pending completed physical target once',()=>{const q=new CurrentLongrunProgress(0);assert.deepEqual(q.consume([first,state,deleted],1),[{id:first.entity,mediaRelpath:first.mediaRelpath}]);assert.throws(()=>q.consume([deleted],2),/delete-transition/);});
  check('LP26-O03 changed tombstone rejected',()=>assert.throws(()=>new CurrentLongrunProgress(0).consume([first,state,{...deleted,segment:{...first.segment,metadataHash:'0'.repeat(64)}}],1),/delete-transition/));
  check('LP26-O04 stall clock and shortened finish rejected',()=>{assert.throws(()=>new CurrentLongrunProgress(0).status(30001));assert.throws(()=>new CurrentLongrunProgress(10).status(9));assert.throws(()=>new CurrentLongrunProgress(0).finish(1));});
  check('LP26-O04 exactly120 argument only',()=>{assert.equal(parseLongrunArgs(['--duration-minutes','120']),7200000);assert.throws(()=>parseLongrunArgs(['--duration-minutes','1']));});
  check('LP26-O04 monotonic sample independent wallclock',()=>{const s=[{pid:1,startIdentity:'linux:1',phaseAt:0,sampledAt:200},{pid:1,startIdentity:'linux:1',phaseAt:5000,sampledAt:100}];assert(sampleContinuity(s,0,5000,1,'linux:1'));assert(!sampleContinuity(s,0,21001,1,'linux:1'));});
  check('LP26-O04 pause time cannot satisfy 120 minutes',()=>{const q=new CurrentLongrunProgress(0);q.setActive(1,false);q.setActive(7200000,true);assert.throws(()=>q.finish(7200000));});
  const samples=[{pid:1,startIdentity:'linux:1',phaseAt:0,sampledAt:200,rssBytes:4096,threadCount:1,fdCount:0,mutationCount:1},
    {pid:1,startIdentity:'linux:1',phaseAt:5000,sampledAt:100,rssBytes:8192,threadCount:2,fdCount:1,mutationCount:2}];
  check('LP26-O04 current resources use monotonic not wallclock',()=>{const s=summarizeCurrentSamples(samples,{warmupMs:0});assert.equal(s.groups[0].elapsedMs,5000);assert.equal(s.resourceTrendPass,false);assert(s.reviewRequired);assert.equal(s.groups[0].postWarmup.status,'observed');});
  check('LP26-O04 literal delta gap and insufficient warmup statistics',()=>{const g=summarizeCurrentSamples(samples,{warmupMs:0}).groups[0];assert.deepEqual(g.delta,{rssBytes:4096,threadCount:1,fdCount:1,mutationCount:1});assert.equal(g.maxGapMs,5000);assert.deepEqual(g.postWarmup.delta,g.delta);assert.equal(summarizeCurrentSamples(samples).groups[0].postWarmup.delta,null);});
  for(const [label,delta] of [['rss',{rssBytes:0}],['fd',{fdCount:-1}],['pid',{pid:0}],['identity',{startIdentity:'linux:2'}],['counter',{mutationCount:0}],['clock',{phaseAt:0}]])
    check('LP26-O04 invalid resource '+label,()=>assert.throws(()=>summarizeCurrentSamples([samples[0],{...samples[1],...delta}])));
  check('LP26-O05 current public dispatch avoids legacy longrun prelude',()=>{
    const publicRunner=fs.readFileSync(new URL('./verify_v410_recording_longrun.sh',import.meta.url),'utf8');
    assert(publicRunner.includes('verify_recording_current_observer.sh'));assert(!publicRunner.includes('verify_v410_recording_foundation.sh'));
    const runner=fs.readFileSync(new URL('./verify_recording_current_longrun.mjs',import.meta.url),'utf8');
    assert(runner.includes('longrunObservationCompleted:!short&&failed===0'));assert(!runner.includes('recording-mutations.jsonl'));assert(!runner.includes('derived_segment_id'));
  });
}catch{if(!failed){failed++;console.log('[fail] LP26 observer setup/runtime');}}
finally{for(const o of readers)o.close();console.log(JSON.stringify({scope:'current-observer-short-self-test',passed,failed,elapsedMs:Math.round(performance.now()-start),longrunPass:false,uiFulltestPass:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));process.exitCode=failed?1:0;}
