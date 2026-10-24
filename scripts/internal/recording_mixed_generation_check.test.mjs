// 파일 용도: R99 실제 부모 run 함수의 수집·실패 전파 반례. 합성 자식이며 제품 실행 근거가 아니다.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {EventEmitter} from 'node:events';
import {resourceTraceCollector,collectResourceTrace,finishResourceTrace} from './recording_resource_trace.mjs';
import {verifyCurrentCyclicProgress} from './recording_current_observer.mjs';
const source=fs.readFileSync(new URL('./recording_mixed_generation_check.mjs',import.meta.url),'utf8');
const actual=source.slice(source.indexOf('async function run('),source.indexOf('\ntry{\n  summary.live='));
let passed=0;
async function scenario(fault,preseedMode=false){
 const child=new EventEmitter();child.pid=100;child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
 let closed=false,alive=true,ack=0,rawClosed=false,spawned=false,writes=0,captured=null,killed=false;
 const end=(code=0,signal=null)=>{if(closed)return;closed=true;if(fault!=='descendant')alive=false;child.emit('close',code,signal);};
 const row=(phase,seq)=>'[recording-resource] '+JSON.stringify({pid:101,seq,elapsedMs:seq,phase,ram:0,ramPeak:1,ramLimit:640*1024*1024,ramRejected:0,scratchDisk:0,scratchDiskPeak:1,scratchDiskLimit:100,scratchFd:0,scratchFdPeak:1,scratchFdLimit:100,scratchRam:0,preservedDisk:0,preservedFd:0,readerCleanupHealthy:true})+'\n';
 child.stdin.write=()=>{if(fault==='stdin'){queueMicrotask(()=>child.stdin.emit('error',Error('EPIPE')));return;}
   if(++ack===1&&preseedMode){child.stdout.emit('data',Buffer.from('[R99-phase] baseline 101\n'));}
   else if(ack===(preseedMode?2:1)){child.stderr.emit('data',Buffer.from(row('before-Finish',1)+row('after-Finish',2)));child.stdout.emit('data',Buffer.from(`[R99-phase] ${preseedMode?'released':'copy-released'} 101\n`));}
   else {child.stderr.emit('data',Buffer.from(fault==='trace-missing'?'other\n':row('after-storage-destruction',3)));
     if(fault==='partial')child.stdout.emit('data',Buffer.from('truncated'));
     end(fault==='child-exit'?2:0,fault==='signal'?'SIGABRT':null);}};
 const proc=new EventEmitter();proc.kill=(pid,signal)=>{assert.equal(pid,-100);if(!alive)throw Object.assign(Error(),{code:'ESRCH'});if(signal===0)return;
   if(signal==='SIGKILL'){killed=true;alive=false;}queueMicrotask(()=>end(1,signal));};
 const context={root:'/owned',repo:'/repo',binary:'/binary',collector:'/collector',samples:2,baseline:{},sampleCount:0,
  fs:{openSync(){if(fault==='open')throw Error('open-failed');return 1;},readFileSync:()=>Buffer.from('{"storeId":"store","generation":2,"cutOrdinal":99}'),writeSync(fd,b){writes++;if(fault==='write')throw Error('write-failed');if(fault==='short')return 0;if(fault==='last-write'&&closed&&fd===2)throw Error('last-write-failed');return Buffer.byteLength(b);},fstatSync:()=>({size:0}),closeSync:()=>{rawClosed=true;}},
  assertMixedFixtureInput(_bytes,profile){assert.equal(profile,'continuous-r114');if(fault==='input-sha')throw Error('fixture-sha');},crypto,
  spawn(){spawned=true;if(fault==='spawn')throw Error('spawn-failed');setImmediate(()=>{child.stderr.emit('data',Buffer.from(row('opened',0)));child.stdout.emit('data',Buffer.from(`[R99-phase] ${preseedMode?'opened':'copy-opened'} 101\n`));});return child;},
  collectProcess:async()=>{if(fault==='last-write')end();return {valid:fault!=='probe',error:null,rssBytes:10,startIdentity:'linux:1'};},
  named:()=>({}),admitWorkspaceSnapshot(){if(fault==='space')throw Error('workspace-variable-cap');return {};},
  capture:{capture(e){captured??=e.message;}},process:proc,path,performance,Buffer,setTimeout,clearTimeout,setInterval,clearInterval,resourceTraceCollector,collectResourceTrace,finishResourceTrace};
 vm.createContext(context);vm.runInContext(actual,context);
 let result,error;try{result=await vm.runInContext(preseedMode?"run('--state-preseed','/live',false)":"run('--mixed-generation-reopen','/copy',true)",context);}catch(e){error=e;}
 if(!fault){assert.equal(result.owner.status,'captured');assert.equal(error,undefined);}else assert(error,`fault escaped: ${fault}`);
 if(fault==='open')assert.equal(spawned,false);else assert(rawClosed);
 if(['space','last-write','write','short'].includes(fault))assert(captured);
 if(fault==='descendant')assert(killed);
 assert.equal(alive,false,fault==='open'||fault==='spawn'?'unused placeholder':undefined);
 return {fault,result,error,writes};
}
for(const fault of [null,'write','short','last-write','stdin','partial','trace-missing','probe','space','child-exit','signal','descendant']){
 await scenario(fault);passed++;console.log('[pass] actual parent '+(fault??'normal'));
}
// spawn 전 실패에는 소유 자식이 없으므로 다른 프로세스를 종료하지 않는다.
for(const fault of ['open','spawn']){
 // 아직 존재하지 않는 합성 PID와 실제 생성 경계를 별도 확인한다.
 let spawned=false,closed=false;const context={performance,fs:{openSync(){if(fault==='open')throw Error('open-failed');return 1;},closeSync(){closed=true;}},root:'/owned',repo:'/repo',path,binary:'x',spawn(){spawned=true;throw Error('spawn-failed');}};
 vm.createContext(context);vm.runInContext(actual,context);await assert.rejects(vm.runInContext("run('--mixed-generation-reopen','/copy',true)",context));assert.equal(spawned,fault==='spawn');assert.equal(closed,fault==='spawn');passed++;
}
const b={channel:'9101',count:696,bytes:24147904,order:697};
const c={channel:'9101',newFinalized:1,newDeleted:2,alive:695,bytes:24133180,availableEvidenceAfterDelete:1};
verifyCurrentCyclicProgress(b,c);passed++;
for(const change of [{newFinalized:0,alive:694},{newDeleted:0,alive:697},{availableEvidenceAfterDelete:0},{bytes:87*1024*1024+1},{channel:'9201'},{alive:696},{newDeleted:NaN}]){assert.throws(()=>verifyCurrentCyclicProgress(b,{...c,...change}));passed++;}
console.log(JSON.stringify({passed,failed:0,scope:'synthetic child events through actual parent function; baseline predicates; no product execution'}));

verifyCurrentCyclicProgress(b,{...c,bytes:108*1024*1024},'continuous-r114');
assert.throws(()=>verifyCurrentCyclicProgress(b,{...c,bytes:108*1024*1024+1},'continuous-r114'));
assert.throws(()=>verifyCurrentCyclicProgress(b,c,'arbitrary-quota'));
console.log('[pass] R114 named quota boundary; legacy R99 predicate unchanged');

// State 사전 적재 receipt의 독립 기대값. 실제 미디어/복구 증거를 대체하지 않는다.
const preseedContext=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function validatePreseedReceipt('),source.indexOf('function preseedArtifacts(')),preseedContext);
const validate=preseedContext.validatePreseedReceipt;
const manifest={storeId:'owned-store',generation:5,cutOrdinal:9000},ledgerHash='b'.repeat(64);
const channel={channel:'9101',finalizedCount:1342,finalizedBytes:46168000,pendingCount:0,pendingBytes:0,deletedCount:2,deletedBytes:68000,createdCount:1344,createdBytes:46236000,firstOrder:3,lastOrder:1344,utcFirstMs:10004000,utcLastMs:12688000,epochs:671,sourceGenerationFirst:2,sourceGenerationLast:672,ptsMinNs:0,ptsMaxNs:3999999999,visualFrames:2684,fileProofCount:1342,segmentDurationNs:1999999999,samplesPerSegment:60};
const baselineReceipt={schema:'state-preseed-v1',storeId:manifest.storeId,generation:5,cutOrdinal:9000,manifestSha256:'a'.repeat(64),ledgerSha256:ledgerHash,anchorMs:13000000,preparedAtMs:13080000,elapsedMs:80000,finishMs:2,finish:true,checkpointKind:'explicit-preparation-only',clockKind:'synthetic-past-input-schedule',journalBoundary:'next-mutation-ordinal-gte-cut',channels:[channel,{...channel,channel:'9201',firstOrder:1347,lastOrder:2688}]};
assert.equal(validate(baselineReceipt,manifest,ledgerHash),baselineReceipt);passed++;
const invalid=[
 ['missing baseline',r=>delete r.channels],['channel alias',r=>r.channels[1].channel='9101'],
 ['count conservation',r=>r.channels[0].createdCount++],['byte conservation',r=>r.channels[0].createdBytes++],
 ['pending deletion',r=>r.channels[0].pendingCount=1],['next admission not reached',r=>{r.channels[0].finalizedBytes=44*1024**2;r.channels[0].createdBytes=r.channels[0].finalizedBytes+68000;}],
 ['order reversal',r=>r.channels[0].lastOrder=1],['old UTC',r=>r.channels[0].utcFirstMs=r.preparedAtMs-3600001],
 ['future UTC',r=>r.channels[0].utcLastMs=r.anchorMs+1],['zero time',r=>r.channels[0].utcLastMs=r.channels[0].utcFirstMs],
 ['epoch alias',r=>r.channels[0].epochs=1],['generation reversal',r=>r.channels[0].sourceGenerationLast=1],
 ['PTS mismatch',r=>r.channels[0].ptsMaxNs=5000000000],['visual omission',r=>r.channels[0].visualFrames--],
 ['file proof omitted',r=>r.channels[0].fileProofCount--],['duration changed',r=>r.channels[0].segmentDurationNs++],
 ['sample count',r=>r.channels[0].samplesPerSegment=59],['store mismatch',r=>r.storeId='other'],
 ['generation mismatch',r=>r.generation++],['cut mismatch',r=>r.cutOrdinal++],['ledger mismatch',r=>r.ledgerSha256='c'.repeat(64)],
 ['Finish missing',r=>r.finish=false],['manual as automatic',r=>r.checkpointKind='automatic'],['synthetic as actual',r=>r.clockKind='actual-recording'],
 ['mutation boundary',r=>r.journalBoundary='after-last-order'],['generation deadline',r=>r.elapsedMs=180001],['non-finite count',r=>r.channels[0].finalizedCount=NaN]
];
for(const [label,mutate] of invalid){const r=structuredClone(baselineReceipt);mutate(r);assert.throws(()=>validate(r,manifest,ledgerHash),/preseed-receipt-/);passed++;console.log('[pass] preseed rejects '+label);}
for(const fault of [null,'input-sha','space','probe','write','short','child-exit','descendant']){const {result}=await scenario(fault,true);if(!fault){assert.equal(result.cut.cutOrdinal,99);assert.equal(result.progress.length,0);assert.equal(result.startIdentity,'linux:1');assert.equal(result.processGroupAbsent,true);}passed++;console.log('[pass] preseed parent '+(fault??'normal'));}

// 임시 산출물 반환값만 모의한다. symlink/권한/저장 결손을 성공으로 승격하지 않는다.
const artifactContext=vm.createContext({validatePreseedReceipt:validate,path,crypto,process:{getuid:()=>501},fs:{
 lstatSync:()=>({isFile:()=>true,isSymbolicLink:()=>false,nlink:1,uid:501,mode:0o600,size:100}),
 readFileSync:f=>{if(f.endsWith('preseed-baseline.json'))return Buffer.from(JSON.stringify(artifactReceipt));if(f.endsWith('recording-generation.json'))return manifestBytes;return ledgerBytes;}
}});
const manifestBytes=Buffer.from(JSON.stringify(manifest)),ledgerBytes=Buffer.from('owned exact ledger\n'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const artifactReceipt={...baselineReceipt,manifestSha256:sha(manifestBytes),ledgerSha256:sha(ledgerBytes)};
vm.runInContext(source.slice(source.indexOf('function preseedArtifacts('),source.indexOf('async function run(')),artifactContext);
assert.equal(artifactContext.preseedArtifacts('/owned').baselineSha256,sha(Buffer.from(JSON.stringify(artifactReceipt))));passed++;
const normalStat=artifactContext.fs.lstatSync;
for(const change of [{uid:502},{mode:0o644},{nlink:2},{size:1024**2+1},{isSymbolicLink:()=>true}]){artifactContext.fs.lstatSync=()=>({...normalStat(),...change});assert.throws(()=>artifactContext.preseedArtifacts('/owned'),/owner-size/);passed++;}
artifactContext.fs.lstatSync=normalStat;
const normalRead=artifactContext.fs.readFileSync;artifactContext.fs.readFileSync=()=>{throw Error('artifact-unreadable');};assert.throws(()=>artifactContext.preseedArtifacts('/owned'),/artifact-unreadable/);passed++;
artifactContext.fs.readFileSync=normalRead;artifactReceipt.manifestSha256='0'.repeat(64);assert.throws(()=>artifactContext.preseedArtifacts('/owned'),/manifest-sha/);passed++;
// StatePreseed의 생성자 연결만 정적으로 검증한다. Catalog의 실제 삭제/복구 실행 증거가 아니다.
const fixture=fs.readFileSync(new URL('./recording_mixed_generation_fixture.h',import.meta.url),'utf8');
const expectedRetention=`    RetentionCoordinator retention(catalog,[&](auto* bytes,auto*){*bytes=std::filesystem::space(media).available;return true;},
        [&](const auto& file,auto* e){auto& c=counters[file.parent_path().filename()=="9101"?0:1];const auto size=std::filesystem::file_size(file);const bool ok=RemoveContainedMediaFile(media,file,e,{},true);if(ok){++c.deleted;c.deleted_bytes+=size;R99Need(!std::filesystem::exists(file),"preseed-unlink");}return ok;},{0,E,media});`;
function requirePreseedNativeRetention(text){
 const start=text.indexOf('int StatePreseed('),end=text.indexOf('int StatePreseedReopen(');
 assert(start>=0&&end>start,'StatePreseed scope');
 const body=text.slice(start,end),begin=body.indexOf('    RetentionCoordinator retention('),after=body.indexOf('\n    for(auto& c:counters){RetentionPolicy policy;');
 assert(begin>=0&&after>begin,'StatePreseed retention boundary');
 assert.equal(body.slice(begin,after),expectedRetention,'Catalog overload; unchanged free-space/unlink/options');
 assert(body.includes('Q==108ULL*1024*1024&&E==64ULL*1024*1024&&input.packets.size()==120'),'fixed quota/reservation/input');
}
requirePreseedNativeRetention(fixture);passed++;console.log('[pass] static StatePreseed Catalog overload and preserved callbacks/options');
for(const [label,before,after] of [
 ['generic snapshot provider','retention(catalog,','retention(catalog,[&]{return catalog.RetentionSnapshot();},'],
 ['free-space callback','*bytes=std::filesystem::space(media).available','*bytes=UINT64_MAX'],
 ['unlink callback','RemoveContainedMediaFile(media,file,e,{},true)','true'],
 ['reservation option','{0,E,media}','{0,1,media}']
]){
 const mutation=expectedRetention.replace(before,after);assert.notEqual(mutation,expectedRetention);
 assert.throws(()=>requirePreseedNativeRetention(fixture.replace(expectedRetention,mutation)),/Catalog overload/);passed++;
 console.log('[pass] static StatePreseed rejects '+label);
}
const legacyEnd=fixture.indexOf('\n// State 전용:');assert(legacyEnd>0);
// State 추가 전 R99/R114 본문의 고정 SHA. 현재 source에서 기대값을 생성하지 않는다.
assert.equal(sha(fixture.slice(0,legacyEnd)),'8aabac3fbf39a9633900ae2b7da9458ee3e8b5975db5d6c42ad088d663c476de');passed++;
console.log('[pass] static original R99/R114 fixture body unchanged');
console.log(JSON.stringify({passed,failed:0,scope:'existing parent/receipt/artifact mocks + static StatePreseed retention binding; no native execution'}));

// NATIVE-LIFETIME-01: only VM/mocks; no native binary, compiler or subprocess.
const {memoryAttributionCollector,collectMemoryAttribution,finishMemoryAttribution}=await import('./recording_memory_attribution.mjs');
const {completeFdObservation}=await import('./recording_foundation_observer.mjs');
const lifeContext=vm.createContext({crypto,Buffer,path,performance,Date});
vm.runInContext(source.slice(source.indexOf('function lifetimeOwner('),source.indexOf('async function run(')),lifeContext);
const check=(label,fn)=>{fn();passed++;console.log('[pass] lifetime '+label);};
const ownerStages=['held','appended','checkpoint-held','prepared-released','reader-released','direct-released','page-released','pool-released','evidence-released','objects-released'];
const ownerRow=i=>({stage:ownerStages[i],prepared:Number(i<3),alias:Number(i<4),catalogHolds:Number(i<4),oldDirect:Number(i<5),page:Number(i<6),pool:Number(i<7),oldAlive:Number(i<7),newModel:Number(i>0&&i<9),evidence:Number(i<8),dto:Number(i<9),oldId:11,newId:i>0&&i<9?22:0});
check('ten independent lifetime boundaries',()=>{for(let i=0;i<10;i++)lifeContext.lifetimeOwner(ownerRow(i),i,i?ownerRow(i-1):null);});
for(const [label,index,key,value] of [['early reader',2,'prepared',0],['alias lost',3,'alias',0],['alias retained',4,'alias',1],['direct held',5,'oldDirect',1],['page lost',5,'page',0],['pool lost',6,'oldAlive',0],['last model retained',7,'oldAlive',1],['package retained',8,'evidence',1],['DTO retained',9,'dto',1],['model alias',1,'newId',11],['foreign old',2,'oldId',12],['phase order',4,'stage','held']])check(label,()=>assert.throws(()=>lifeContext.lifetimeOwner({...ownerRow(index),[key]:value},index,ownerRow(index-1)),/owner-contract/));
for(const [label,index,value] of [['hold missing',0,undefined],['hold released early',3,0],['hold leaked after alias',4,1]])check(label,()=>assert.throws(()=>lifeContext.lifetimeOwner({...ownerRow(index),catalogHolds:value},index,index?ownerRow(index-1):null),/owner-contract/));
const lifeSource={head:'18a68e83c120a896ef8de25f281d778bc920a3fa',runtimeSha256:'d'.repeat(64)};
const lifeLedger='1 segment-a 34000 '+['a','b','c'].map(c=>c.repeat(64)).join(' ')+'\n2 segment-b 34001 '+['d','e','f'].map(c=>c.repeat(64)).join(' ')+'\n';
const lifeManifest={storeId:'store-native',generation:2,cutOrdinal:5};
const lifeReceipt={schema:'native-lifetime-v1',phase:'prepare',scope:'object-lifetime-only',finish:true,catalogHoldsAtFinish:0,runtimeDestroyed:true,checkpointKind:'explicit-only',storeId:'store-native',generation:2,cutOrdinal:5,lastOrder:2,count:2,bytes:68001,fileProofCount:2,epochs:1,sourceGenerations:1,ptsMinNs:0,ptsMaxNs:3999999999,anchorMs:1000000,utcFirstMs:940000,utcLastMs:944000,source:lifeSource,ledgerSha256:sha(lifeLedger),manifestSha256:'a'.repeat(64)};
const validateLife=(r=lifeReceipt,ledger=lifeLedger)=>lifeContext.validateLifetimeReceipt(r,'prepare',lifeManifest,Buffer.from(ledger),lifeSource,1000010);
check('bounded baseline receipt',()=>validateLife());
for(const value of [undefined,1])check('Finish hold missing or retained '+value,()=>assert.throws(()=>validateLife({...lifeReceipt,catalogHoldsAtFinish:value}),/receipt-contract/));
for(const [label,change] of [['no Finish',{finish:false}],['runtime alive',{runtimeDestroyed:false}],['wrong phase',{phase:'observe'}],['store',{storeId:'foreign'}],['generation',{generation:3}],['cut',{cutOrdinal:6}],['order',{lastOrder:3}],['count',{count:4}],['bytes',{bytes:68002}],['file proof',{fileProofCount:1}],['epoch',{epochs:2}],['source generation',{sourceGenerations:0}],['PTS',{ptsMaxNs:4000000000}],['future',{anchorMs:1000020}],['UTC',{utcFirstMs:940001}],['runtime SHA',{source:{...lifeSource,runtimeSha256:'f'.repeat(64)}}],['automatic claim',{checkpointKind:'automatic'}],['Memory P0 promotion',{scope:'memory-p0-pass'}],['ledger SHA',{ledgerSha256:'0'.repeat(64)}]])check('receipt rejects '+label,()=>assert.throws(()=>validateLife({...lifeReceipt,...change}),/lifetime-receipt-/));
for(const [label,text] of [['duplicate ID',lifeLedger.replace('segment-b','segment-a')],['order reversal',lifeLedger.replace('2 segment-b','1 segment-b')],['missing file',lifeLedger.split('\n')[0]+'\n']])check('ledger rejects '+label,()=>assert.throws(()=>validateLife({...lifeReceipt,ledgerSha256:sha(text)},text),/ledger/));

async function sequenceCase(fault){
 let now=0;const calls=[];let copies=0;const ledgers={prepare:lifeLedger,observe:lifeLedger+'3 segment-c\n4 segment-d\n'};
 const receipts={prepare:lifeReceipt,observe:{...lifeReceipt,phase:'observe',count:4,generation:3,cutOrdinal:9,lastOrder:4},reopen:{...lifeReceipt,phase:'reopen',count:4,generation:3,cutOrdinal:9,lastOrder:4}};
 const env={clock:()=>now,execute:async(mode,limit)=>{calls.push([mode,limit]);const i=calls.length;
   if(fault==='A throws'&&i===1)throw Error('first-A-error');
   if(fault==='A deadline'&&i===1)now=180000;else if(fault==='B deadline'&&i===2)now=180001;else now+=i===1?1234:100;
   return {code:0,signal:null,pid:100+i,startIdentity:'linux:'+i,processGroupAbsent:!(fault==='cleanup'&&i===1),owner:{status:'captured'},attribution:{finalOwnerZero:!(fault==='missing attribution'&&i===1)}};},
  artifacts:phase=>{if(fault==='missing baseline'&&phase==='prepare')throw Error('baseline-missing');return {receipt:receipts[phase],ledger:ledgers[phase==='reopen'?'observe':phase]};},
  copyStore:async()=>{copies++;if(fault==='copy failure')throw Error('copy-failed');if(fault==='outer deadline')now=230000;}};
 if(fault==='store change')receipts.observe.storeId='other';if(fault==='bad recovery')receipts.reopen.lastOrder=5;
 let result,error;try{result=await lifeContext.lifetimeSequence(env);}catch(e){error=e;}
 if(!fault){assert(result);assert.deepEqual(calls,[['--lifetime-prepare',180000],['--lifetime-observe',178766],['--lifetime-reopen',15000]]);assert.equal(copies,1);}
 else {assert(error,fault);const expected=['A throws','A deadline','cleanup','missing attribution','missing baseline'].includes(fault)?1:['B deadline','store change','copy failure','outer deadline'].includes(fault)?2:3;assert.equal(calls.length,expected,fault);if(expected===1)assert.equal(copies,0);if(fault==='A throws')assert.equal(error.message,'first-A-error');}
 passed++;console.log('[pass] lifetime sequence '+(fault??'A-B-C shared deadline'));
}
for(const fault of [null,'A throws','A deadline','B deadline','cleanup','missing attribution','missing baseline','store change','copy failure','outer deadline','bad recovery'])await sequenceCase(fault);

async function lifetimeParentCase(fault,mode='--lifetime-observe'){
 const child=new EventEmitter();child.pid=700;child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
 let closed=false,alive=true,index=0,seq=0,metrics=0,primary=null,cleaned=false,receipt=null;
 const historyMode=mode.startsWith('--retention-history-');
 const phases=historyMode?(mode.endsWith('-reopen')?['opened','baseline','released']:['opened',...historyNames.slice(0,-1),'checkpoint','released']):mode==='--retention-live'?['opened','baseline','cycle-one','cycle-two','checkpoint','released']:['opened','baseline',...(mode==='--lifetime-observe'?ownerStages:[]),'released'];
 const end=(code=0,signal=null)=>{if(closed)return;closed=true;if(fault!=='cleanup-after-space')alive=false;child.emit('close',code,signal);};
 function emitMemory(phase){
  const n=++seq*10;const r={pid:701,seq:seq-1,elapsedMs:seq,phase,ram:0,ramPeak:1,ramLimit:640*1024**2,ramRejected:0,scratchDisk:0,scratchDiskPeak:1,scratchDiskLimit:100,scratchFd:0,scratchFdPeak:1,scratchFdLimit:100,scratchRam:0,preservedDisk:0,preservedFd:0,readerCleanupHealthy:true};
  const names=['unattributed','model','sourceBatch','retryBatch','sourceCut','preparation','matches','page','response','preparedNative','retainedRaw','catalogRow','scratch'];
  const a={pid:701,phase,sampleStartNs:n,ownerCapturedNs:n+1,rolesCapturedNs:n+2,processCapturedNs:n+3,sampleEndNs:n+5,residencyUsed:0,attributedSearchBytes:0,unattributedSearchBytes:0,valid:true,loss:false,tickets:Object.fromEntries(names.map(k=>[k,[0,0]])),models:[],snapshotPools:[],recentEvents:[],live:Array(14).fill(0),peak:Array(14).fill(0),totals:Array(20).fill(0),rssBytes:1,footprintBytes:1,ticketWitness:{peak:0,peakNs:0,atPeak:Array(15).fill(0),unknownPeak:Array(4).fill(0),atUnknownPeak:Array(15).fill(0),unknownLive:Array(15).fill(0),sites:Array.from({length:15},()=>Array(13).fill(0)),allocator:[true,true,n+3,n+4,1,2,3,1]}};
  if(fault==='allocator')a.ticketWitness.allocator[0]=false;if(fault==='loss')a.loss=true;if(fault==='final owner'&&phase==='after-storage-destruction'){a.live[0]=1;a.peak[0]=1;}
  child.stderr.emit('data',Buffer.from('[recording-resource] '+JSON.stringify(r)+'\n'+(fault==='memory missing'?'':'[memory-attribution] '+JSON.stringify(a)+'\n')));
 }
 function send(){if(closed)return;const phase=phases[index],phaseIndex=index;
  // Delay only a retained boundary pair; the callback keeps its original phase.
  const delayed=fault==='pipe order'&&historyNames.slice(0,-1).includes(phase);
  const memory=()=>{if(phase==='released'){emitMemory('before-Finish');if(fault!=='Finish missing')emitMemory('after-Finish');}else emitMemory(phaseIndex===0?'opened':'sample');};
  if(!delayed)memory();
  if(historyMode&&!mode.endsWith('-reopen')&&historyNames.slice(0,-1).includes(phase)){
    const f=historyFixtures[historyNames.indexOf(phase)],w=f.receipt.historyWindow;
    const marker={phase,cycleIndex:w.cycleIndex,resourceSequence:w.resourceSequence,pid:701,artifactSavedMs:w.historyDoneMs+1,receiptSha256:sha(JSON.stringify(f.receipt))};
    if(fault==='marker identity')marker.pid=702;if(fault==='marker hash')marker.receiptSha256='0'.repeat(64);if(fault==='marker sequence')marker.resourceSequence++;
    if(fault!=='marker missing')child.stdout.emit('data',Buffer.from('[retention-window] '+JSON.stringify(marker)+'\n'));
    if(fault==='duplicate marker')child.stdout.emit('data',Buffer.from('[retention-window] '+JSON.stringify(marker)+'\n'));
  }
  if(delayed)setImmediate(memory);
  if(ownerStages.includes(phase)){const row=ownerRow(ownerStages.indexOf(phase));if(fault==='owner'&&phase==='pool-released')row.oldAlive=1;child.stdout.emit('data',Buffer.from('[lifetime-owner] '+JSON.stringify(row)+'\n'));}
  child.stdout.emit('data',Buffer.from(`[R99-phase] ${phase} 701\n`));
 }
 child.stdin.write=()=>{if(fault==='short history'&&index===4){emitMemory('after-storage-destruction');end();return;}if(++index===phases.length){emitMemory('after-storage-destruction');end();}else setImmediate(send);};
 const proc=new EventEmitter();proc.kill=(pid,signal)=>{assert.equal(pid,-700);if(!alive)throw Object.assign(Error(),{code:'ESRCH'});if(signal===0)return;if(signal==='SIGKILL'){if(fault==='cleanup-after-space')throw Error('cleanup-denied');alive=false;cleaned=true;}queueMicrotask(()=>end(1,signal));};
 const context={root:'/owned',repo:'/repo',binary:'/binary',collector:'/collector',samples:2,baseline:{},sampleCount:0,path,crypto,performance,Buffer,process:proc,setTimeout,clearTimeout,setInterval,clearInterval,
  fs:{openSync:()=>1,writeSync:(_fd,b)=>Buffer.byteLength(b),fstatSync:()=>({size:fault==='space log'?4*1024**2:0}),closeSync(){},readFileSync:()=>Buffer.from('{"storeId":"store","generation":2,"cutOrdinal":5}')},
  spawn(){setImmediate(()=>{if(fault==='native log')child.stderr.emit('data',Buffer.alloc(4*1024**2+1));else send();});return child;},
  collectProcess:async()=>{metrics++;const identity=fault==='identity change'&&metrics>1?'linux:2':'linux:1';return {pid:fault==='pid'?702:701,startIdentity:identity,valid:true,error:null,rssBytes:1,fdObservation:{scope:'complete-round-sequential-v1',complete:fault!=='FD incomplete',startIdentity:identity,startedAt:1,roundStartedAt:2,roundCompletedAt:3,completedAt:4,rounds:1,capacityRetries:0,closedRetries:0,detailCalls:1,failures:[]}};},
  named:()=>({}),admitWorkspaceSnapshot(){if(['space','cleanup-after-space'].includes(fault))throw Error('workspace-variable-cap');return {};},capture:{capture(e){primary??=e.message;}},
  retentionGroup(){},retentionArtifacts(_dir,_source,through='final',windowMode=false){if(fault==='baseline')throw Error('baseline-invalid');if(!windowMode)return;
    const result={};for(let i=0;i<historyFixtures.length;i++){const f=historyFixtures[i],r=structuredClone(f.receipt);
      if(fault==='middle deletion'&&i===4)r.newDeleted=0;
      retentionContext.validateRetention(r,i?historyFixtures[i-1].receipt:null,i?historyFixtures[0].receipt:null,f.ledger,retentionSource,true);
      result[r.phase]={receipt:r,receiptSha256:sha(JSON.stringify(r))};if(r.phase===through)break;}return result;},lifetimeGroup(){},lifetimeWrite(_f,b){receipt=JSON.parse(b);if(fault==='artifact'||fault==='cleanup-after-space')throw Error('artifact-failed');},lifetimeArtifacts(){if(fault==='baseline')throw Error('baseline-invalid');},assertMixedFixtureInput(){},
  completeFdObservation,resourceTraceCollector,collectResourceTrace,finishResourceTrace,memoryAttributionCollector,collectMemoryAttribution,finishMemoryAttribution,
  lifetimeOwner:lifeContext.lifetimeOwner,lifetimeMetrics:lifeContext.lifetimeMetrics,
  retentionPhases:lifeContext.retentionPhases,historyBoundary:lifeContext.historyBoundary,historyBudget:lifeContext.historyBudget};
 if(historyMode&&fault==='budget')context.performance={now:()=>index>=1?50000:0};
 if(historyMode&&fault==='late budget')context.performance={now:()=>index>=4?160000:0};
 // The predicate's FD dependency remains the actual collector contract.
 lifeContext.completeFdObservation=completeFdObservation;
 vm.createContext(context);vm.runInContext(actual,context);
 let result,error;try{result=await vm.runInContext(`run('${mode}','/live',${mode==='--lifetime-reopen'||mode==='--retention-reopen'||mode==='--retention-history-reopen'},1000,{})`,context);}catch(e){error=e;}
 if(!fault||fault==='pipe order'){assert.ifError(error);assert.equal(result.attribution.finalOwnerZero,true);if(!mode.startsWith('--retention-'))assert.equal(result.owners.length,mode==='--lifetime-observe'?10:0);assert.equal(result.startIdentity,'linux:1');assert(receipt);}
 else {assert(error,fault);if(fault==='cleanup-after-space'){assert.equal(error.message,'workspace-variable-cap');assert.equal(error.artifactError,'artifact-failed');assert.equal(error.cleanupError,'cleanup-denied');}if(fault==='owner')assert.match(error.message,/owner-contract/);}
 assert.equal(alive,fault==='cleanup-after-space');if(fault==='cleanup-after-space')assert(!cleaned);
 passed++;console.log('[pass] lifetime actual parent '+(fault??mode));if(historyMode&&fault==='budget')assert.equal(index,1,'no cycle Writer ACK after baseline budget failure');
 if(historyMode&&fault==='late budget')assert.equal(index,4,'no next Writer ACK after budget failure');
 return {result,error,primary};
}
for(const mode of ['--lifetime-prepare','--lifetime-observe','--lifetime-reopen'])await lifetimeParentCase(null,mode);
for(const fault of ['baseline','pid','identity change','FD incomplete','memory missing','allocator','loss','final owner','Finish missing','owner','space','space log','native log','artifact','cleanup-after-space'])await lifetimeParentCase(fault);
check('final failure summary preserves primary, artifact and cleanup errors',()=>{
 const failure=Object.assign(Error('workspace-variable-cap'),{artifactError:'artifact-failed',cleanupError:'cleanup-denied',processReceipt:{pid:701}});
 const context=vm.createContext({failure,first:null,summary:{},lifetime:true});
 const begin=source.indexOf('}catch(e){first=e;summary.status='),end=source.indexOf('\nfinally{fs.closeSync(samples)',begin);
 assert(begin>=0&&end>begin);vm.runInContext('try{throw failure;'+source.slice(begin,end),context);
 assert.equal(context.first,failure);assert.equal(context.summary.error,'workspace-variable-cap');assert.equal(context.summary.artifactError,'artifact-failed');assert.equal(context.summary.cleanupError,'cleanup-denied');assert.equal(context.summary.failedProcess.pid,701);
});

// Native source checks are wiring evidence, NOT compilation/RAII/FD execution.
const native=fixture.slice(fixture.indexOf('// NATIVE-LIFETIME-01:'));
const helper=fs.readFileSync(new URL('./recording_managed_writer_smoke.cpp',import.meta.url),'utf8');
check('old complete R114 and StatePreseed fixture unchanged',()=>assert.equal(sha(fixture.slice(0,fixture.indexOf('\n// NATIVE-LIFETIME-01:'))),'1fcf21b4e5253f99a9f0fe0398f4c5578c8bb2e01d87fa93f1609c6779668ec6'));
check('opt-in precedes native initialization',()=>{const dispatch=helper.slice(helper.indexOf('int main('),helper.indexOf('    if(argc==3&&std::string(argv[2])=="--state-preseed")'));assert(dispatch.indexOf('setenv("MEDIA_SERVER_VERIFY_MEMORY_ATTRIBUTION"')<dispatch.indexOf('gst_init'));assert(dispatch.includes('MEDIA_SERVER_VERIFY_MEMORY_COMPACT'));});
check('fresh Catalog hold authority before trace and Finish',()=>{const begin=native.indexOf('std::uint64_t CatalogHolds('),end=native.indexOf('void SaveState(',begin);const body=native.slice(begin,end);assert(body.includes('catalog.RetentionSnapshot()'));assert(body.includes('snapshot.authoritative'));assert(body.includes('row.hold_count'));assert(!body.includes('dto'));assert(native.includes('Need(held==(alias?1U:0U),"catalog-hold-return")'));assert(native.includes('Need(CatalogHolds(catalog,{})==0,"finish-holds");Need(trace.Emit("before-Finish")'));});
check('public handles and normal Writer only',()=>{for(const token of ['PreparedSource','prepared->Hold()','RecordingSearchSnapshots','RecordingSearchPage','store.Open(package','std::optional<RetentionSnapshot>','writer.Stop()','VerifyRecordingFileEvidenceFd','SourceSeekPrepared','weak_media.expired()','weak_package.expired()','weak_old.expired()'])assert(native.includes(token),token);assert(!native.includes('MakeMutationLink'));assert(!native.includes('SourceBindingHandle'));});
check('release before Runtime Finish',()=>{const begin=native.indexOf('else if(observe)');const body=native.slice(begin);assert(body.indexOf('alias.reset()')<body.indexOf('runtime.Finish'));assert(body.indexOf('pool.reset()')<body.indexOf('runtime.Finish'));assert(body.indexOf('dto.reset();next.reset()')<body.indexOf('runtime.Finish'));});
check('same baseline input and bounded current schedule',()=>{assert(native.includes('input.packets.size()==120'));assert(native.includes('generation<=2'));assert(native.includes('anchor-60000'));assert(native.includes('expected==2||expected==4'));assert(helper.includes('root/"lifetime-input-a/mixed-input.mp4"'));});
check('existing supervisor 240 seconds and registered group cleanup',()=>{assert(source.includes('m.run_owned([node,driver,str(root),binary,collector,\'--native-lifetime\'],root/\'lifetime-supervisor.log\',240'));assert(source.includes("lifetimeGroup('started',child.pid)"));assert(source.includes("lifetimeGroup('closed',child.pid)"));});
check('new scope cannot promote product/rotation/history',()=>{for(const x of ['retention-deletion','history-stability','automatic-rotation','http-concurrency','heap-peak','sqlite-vm','search-performance','product-mixed'])assert(source.includes("'"+x+"'"));assert(source.includes('delete summary.cyclicRecoveryPass'));assert(!source.includes('memoryP0Pass=true'));});
console.log(JSON.stringify({passed,failed:0,scope:'legacy and Native lifetime actual-parent VM mocks + static wiring; no build/native/product execution'}));

// NATIVE-RETENTION-01 independent synthetic ledger/Journal, never a native PASS.
const retentionContext=vm.createContext({crypto,Buffer,performance});
vm.runInContext(source.slice(source.indexOf('function validateRetention('),source.indexOf('async function run(')),retentionContext);
const retentionSource={runtimeSha256:'9'.repeat(64)},N=706,S=65536,cut=2000;
const retentionRow=i=>[i,'segment-'+i,S,'a'.repeat(64),'b'.repeat(64),'c'.repeat(64),i===2?1:0].join(' ');
const retHistory=[];let retOrdinal=cut;
function addMutation(type,entity){retHistory.push({ordinal:retOrdinal,id:'mutation-'+retOrdinal++,entity:'segment-'+entity,type,rawSha256:'d'.repeat(64)});}
function retentionFixture(phase){
 const cycle=phase==='baseline'?0:phase==='cycle-one'?1:2,deleted=cycle===0?[]:cycle===1?[4,5]:[4,5,6];
 if(cycle===1&&retHistory.length===0){for(const id of [4,5]){addMutation(19,id);addMutation(20,id);}addMutation(16,707);addMutation(18,707);}
 if(cycle===2&&retHistory.length===6){addMutation(19,6);addMutation(20,6);addMutation(16,708);addMutation(18,708);}
 const historyRows=structuredClone(cycle===0?[]:retHistory),ledger=Array.from({length:N+cycle},(_,i)=>i+1).filter(i=>!deleted.includes(i)).map(retentionRow).join('\n')+'\n';
 const chain=historyRows.map(r=>`${r.ordinal} ${r.id} ${r.rawSha256}\n`).join('');
 return {ledger,receipt:{schema:'native-retention-v1',phase,channel:'9101',scope:'synthetic-retention-two-cycles',storeId:'store-retention',generation:phase==='final'?6:5,cutOrdinal:phase==='final'?cut+historyRows.length:cut,baselineGeneration:5,baselineCut:cut,initialNextOrdinal:1,preparationMutations:1999,initialCount:N,seedBytes:S,activeCount:N+cycle-deleted.length,activeBytes:(N+cycle-deleted.length)*S,lastOrder:N+cycle,pendingCount:0,deletedCount:deleted.length,newDeleted:phase==='cycle-one'?2:phase==='cycle-two'?1:0,removedBytes:(phase==='cycle-one'?2:phase==='cycle-two'?1:0)*S,observedFinalized:cycle,observedMutations:historyRows.length,nextOrdinal:cut+historyRows.length,historySha256:sha(chain),historyRows,holds:phase==='final'?0:2,pinCount:1,protectedIds:['segment-1','segment-2','segment-3'],deletedIds:deleted.map(i=>'segment-'+i),admissionRejected:0,fileProofCount:N+cycle-deleted.length,ledgerSha256:sha(ledger),manifestSha256:'f'.repeat(64),source:retentionSource,finish:phase==='final',runtimeDestroyed:phase==='final',checkpointKind:'explicit-preparation-and-final-only'}};
}
const retFixtures=['baseline','cycle-one','cycle-two','final'].map(retentionFixture);
const retCheck=(label,fn)=>{fn();passed++;console.log('[pass] retention '+label);};
const validateRet=(index,mutation=r=>r)=>{const f=retFixtures[index];return retentionContext.validateRetention(mutation(structuredClone(f.receipt)),index?retFixtures[index-1].receipt:null,index?retFixtures[0].receipt:null,f.ledger,retentionSource);};
for(let i=0;i<4;i++)retCheck('normal '+retFixtures[i].receipt.phase,()=>validateRet(i));
for(const [label,index,mutate] of [
 ['missing Store',0,r=>delete r.storeId],['empty Store',0,r=>r.storeId=''], ['baseline count',0,r=>r.initialCount++],['wrong store',1,r=>r.storeId='foreign'],['wrong order',1,r=>r.lastOrder++],['quota boundary',0,r=>r.seedBytes=1],
 ['no deletion',1,r=>r.newDeleted=0],['second deletion absent',2,r=>r.newDeleted=0],['pending remains',2,r=>r.pendingCount=1],['hold missing',1,r=>r.holds=1],['pin missing',2,r=>r.pinCount=0],
 ['protected deleted',2,r=>r.deletedIds[0]='segment-1'],['active/history confusion',2,r=>r.observedMutations=r.activeCount],['duplicate mutation',2,r=>r.historyRows[6].id=r.historyRows[0].id],
 ['changed history prefix',2,r=>r.historyRows[0].rawSha256='0'.repeat(64)],['ordinal gap',2,r=>r.historyRows[6].ordinal++],['missing pending',2,r=>r.historyRows[6].type=16],
 ['untracked mutation',2,r=>r.historyRows[6].type=1],['unexpected rotation',1,r=>r.generation++],['file proof missing',2,r=>r.fileProofCount--],['wrong byte release',2,r=>r.removedBytes++],
 ['admission rejection',2,r=>r.admissionRejected=1],['Finish missing',3,r=>r.finish=false],['runtime remains',3,r=>r.runtimeDestroyed=false],['cold as observed',1,r=>r.observedMutations+=r.preparationMutations],
 ['source mismatch',2,r=>r.source={}],['ledger mismatch',2,r=>r.ledgerSha256='0'.repeat(64)],['final new progress',3,r=>r.newDeleted=1]
])retCheck('reject '+label,()=>assert.throws(()=>validateRet(index,r=>{mutate(r);return r;}),/retention-receipt-/));
retCheck('deleted file in active ledger',()=>{const f=retFixtures[2],ledger=f.ledger+retentionRow(6)+'\n';assert.throws(()=>retentionContext.validateRetention({...f.receipt,ledgerSha256:sha(ledger)},retFixtures[1].receipt,retFixtures[0].receipt,ledger,retentionSource),/retention-receipt-/);});
async function retentionSequenceCase(fault){let now=0,copies=0;const calls=[];const observed={proof:'valid'};
 const env={clock:()=>now,execute:async(mode,limit)=>{calls.push([mode,limit]);if(fault==='first failure'&&calls.length===1)throw Error('first-live-error');now+=calls.length===1?(fault==='deadline'?180001:100):10;return {code:0,signal:null,pid:100+calls.length,startIdentity:'linux:'+calls.length,processGroupAbsent:fault!=='cleanup',owner:{status:'captured'},attribution:{finalOwnerZero:fault!=='owner'}};},
 artifacts:which=>fault==='baseline'?(()=>{throw Error('bad-baseline');})():which==='copy'&&fault==='recovery'?{proof:'other'}:observed,
 copyStore:async()=>{copies++;if(fault==='copy')throw Error('copy');if(fault==='outer deadline')now=230000;},recoveryReceipt:()=>Object.fromEntries(['finish','runtimeDestroyed','exactLedger','exactDeletedSet','reader','manifestUnchanged'].map(k=>[k,fault!=='receipt']))};
 if(fault){await assert.rejects(retentionContext.retentionSequence(env));assert.equal(calls.length,['recovery','receipt'].includes(fault)?2:1);if(['first failure','deadline','cleanup','owner','baseline'].includes(fault))assert.equal(copies,0);}
 else {await retentionContext.retentionSequence(env);assert.deepEqual(calls,[['--retention-live',180000],['--retention-reopen',15000]]);assert.equal(copies,1);}
 passed++;console.log('[pass] retention sequence '+(fault??'live-copy-reopen'));
}
for(const fault of [null,'first failure','deadline','cleanup','owner','baseline','copy','outer deadline','recovery','receipt'])await retentionSequenceCase(fault);
for(const mode of ['--retention-live','--retention-reopen'])await lifetimeParentCase(null,mode);
for(const fault of ['baseline','pid','identity change','FD incomplete','memory missing','allocator','loss','final owner','Finish missing','space','space log','native log','artifact','cleanup-after-space'])await lifetimeParentCase(fault,'--retention-live');
retCheck('old complete fixture including NativeLifetime unchanged',()=>assert.equal(sha(fixture.slice(0,fixture.indexOf('\n// NATIVE-RETENTION-01:'))),'7c9059e5e8a23387e08bfcf7ebb6cf355456826ba7fb28e0a0f74e32c2988bbb'));
const retNative=fixture.slice(fixture.indexOf('// NATIVE-RETENTION-01:'));
retCheck('normal APIs and authoritative deletion',()=>{for(const token of ['ReadRecordingGenerationActive','ReserveRecordingOrder','FinalizeBoundSegmentV2','VerifyRecordingFileEvidenceFd','SnapshotLocationsV2','ParseRecordingTombstoneV2','errno==ENOENT','callback_error','reader.ResolveMedia','writer.Stop()','protected_ids[2]','row.pinned=i==1'])assert(retNative.includes(token),token);assert(!retNative.includes('.Replay('));assert(!retNative.includes('IsDeletedSegmentId'));assert.equal((retNative.match(/RetentionCoordinator retention\(/g)||[]).length,1);assert(retNative.indexOf('RetentionCoordinator retention(')<retNative.indexOf('for(unsigned cycle=1;cycle<=cycles;'));assert(retNative.includes('const unsigned cycles=window?8U:2U;'));});
retCheck('dedicated mode same limits and no closed-scope rerun',()=>{assert(source.includes("'--native-retention'],root/'retention-supervisor.log',240"));assert(source.includes("execute('--retention-live',180000)"));assert(source.includes("execute('--retention-reopen',15000)"));assert(source.includes('4*1024**2'));assert(!retNative.includes('NativeLifetime('));assert(!retNative.includes('StatePreseed('));});
console.log(JSON.stringify({passed,failed:0,scope:'legacy151 + retention receipts/actual-parent VM/sequence/static wiring; no native/product execution'}));

// Bind the claimed final cut to actual manifest bytes, not just their hash.
const retManifest={storeId:'store-retention',generation:6,cutOrdinal:2010};
let manifestFault=null;
retentionContext.lifetimeRead=(_dir,name)=>{
 if(name==='recording-generation.json')return Buffer.from(JSON.stringify({...retManifest,...manifestFault}));
 const phase=name.replace('retention-','').replace(/\.(json|ledger)$/,'');const f=retFixtures.find(x=>x.receipt.phase===phase);
 if(name.endsWith('.ledger'))return Buffer.from(f.ledger);
 const r=structuredClone(f.receipt);if(phase==='final')r.manifestSha256=sha(JSON.stringify({...retManifest,...manifestFault}));return Buffer.from(JSON.stringify(r));
};retentionContext.path=path;
retCheck('actual manifest bound',()=>retentionContext.retentionArtifacts('/owned',retentionSource));
for(const [key,value] of [['storeId','foreign'],['generation',7],['cutOrdinal',2011]]){manifestFault={[key]:value};retCheck('reject actual manifest '+key,()=>assert.throws(()=>retentionContext.retentionArtifacts('/owned',retentionSource),/retention-artifact-manifest/));}
console.log(JSON.stringify({passed,failed:0,scope:'retention manifest/source binding plus previous focused contracts; no native/product execution'}));

// NATIVE-RETENTION-HISTORY-01: independent fixed-size input, eight cycles, no subprocess.
const historyNames=['baseline','cycle-one','cycle-two','cycle-three','cycle-four','cycle-five','cycle-six','cycle-seven','cycle-eight','final'];
const historyFixtures=[];let growingRows=[];
for(let index=0;index<10;index++){
 const cycle=Math.min(index,8),isFinal=index===9,deleted=Array.from({length:cycle?cycle+1:0},(_,i)=>i+4);
 if(index>0&&!isFinal){const ids=index===1?[4,5]:[index+4];growingRows.push({type:16,entity:'segment-'+(N+cycle)});for(const id of ids)growingRows.push({type:19,entity:'segment-'+id},{type:20,entity:'segment-'+id});growingRows.push({type:18,entity:'segment-'+(N+cycle)});}
 const rows=growingRows.map((r,i)=>({...r,ordinal:cut+i,id:'growth-'+i,rawSha256:sha('raw-'+i)}));
 const ledger=Array.from({length:N+cycle},(_,i)=>i+1).filter(i=>!deleted.includes(i)).map(retentionRow).join('\n')+'\n';
 const w={plannedCycles:8,cycleIndex:cycle,pid:701,resourceSequence:cycle+1,observedJournalBytes:cycle?12000+(cycle-1)*11000:0,observedJournalSha256:sha(cycle?'journal-'+cycle:''),startMs:cycle?cycle*6000:0,writerDoneMs:cycle?cycle*6000+10:0,inspectDoneMs:cycle?cycle*6000+5000:0,historyDoneMs:cycle?cycle*6000+5100:0};
 const receipt={...structuredClone(retFixtures[0].receipt),phase:historyNames[index],scope:'synthetic-retention-eight-cycles',historyWindow:w,
   generation:isFinal?6:5,cutOrdinal:isFinal?cut+rows.length:cut,activeCount:N+cycle-deleted.length,activeBytes:(N+cycle-deleted.length)*S,lastOrder:N+cycle,deletedCount:deleted.length,newDeleted:isFinal||!cycle?0:cycle===1?2:1,removedBytes:isFinal||!cycle?0:(cycle===1?2:1)*S,
   observedFinalized:cycle,observedMutations:rows.length,nextOrdinal:cut+rows.length,historyRows:rows,historySha256:sha(rows.map(r=>`${r.ordinal} ${r.id} ${r.rawSha256}\n`).join('')),holds:isFinal?0:2,deletedIds:deleted.map(i=>'segment-'+i),fileProofCount:N+cycle-deleted.length,ledgerSha256:sha(ledger),finish:isFinal,runtimeDestroyed:isFinal};
 historyFixtures.push({receipt,ledger});
}
const historyCheck=(label,fn)=>{fn();passed++;console.log('[pass] fixed-active '+label);};
function validateWindow(index,mutate=()=>{}){const f=historyFixtures[index],r=structuredClone(f.receipt);mutate(r);return retentionContext.validateRetention(r,index?historyFixtures[index-1].receipt:null,index?historyFixtures[0].receipt:null,f.ledger,retentionSource,true);}
for(let i=0;i<10;i++)historyCheck('eight-cycle receipt '+historyNames[i],()=>validateWindow(i));
historyCheck('independent final counts',()=>{const r=historyFixtures[9].receipt;assert.equal(r.activeCount,705);assert.equal(r.activeBytes,46202880);assert.equal(r.deletedCount,9);assert.equal(r.observedFinalized,8);assert.equal(r.observedMutations,34);assert.equal(r.nextOrdinal,2034);assert.equal(r.lastOrder,714);});
for(const [label,index,mutate] of [
 ['not eight',1,r=>r.historyWindow.plannedCycles=7],['missing window',0,r=>delete r.historyWindow],['wrong index',4,r=>r.historyWindow.cycleIndex=3],
 ['middle deletion',4,r=>r.newDeleted=0],['second deletion in steady state',4,r=>r.newDeleted=2],['Active drift',5,r=>r.activeCount++],['bytes drift',5,r=>r.activeBytes++],
 ['Store change',5,r=>r.storeId='other'],['Order reuse',5,r=>r.lastOrder--],['Pending',5,r=>r.pendingCount=1],['Hold released',5,r=>r.holds=1],['Pin released',5,r=>r.pinCount=0],['protected deleted',5,r=>r.deletedIds[0]=r.protectedIds[0]],
 ['duplicate mutation',5,r=>r.historyRows[9].id=r.historyRows[0].id],['history rewrite',5,r=>r.historyRows[0].rawSha256=sha('other')],['rotation',5,r=>r.generation++],
 ['empty journal',1,r=>r.historyWindow.observedJournalBytes=0],['journal overflow',3,r=>r.historyWindow.observedJournalBytes=1048577],['journal regression',3,r=>r.historyWindow.observedJournalBytes=12000],['journal SHA',3,r=>r.historyWindow.observedJournalSha256='invalid'],
 ['wrong PID',3,r=>r.historyWindow.pid=702],['sequence gap',3,r=>r.historyWindow.resourceSequence++],['clock reversed',3,r=>r.historyWindow.writerDoneMs=r.historyWindow.startMs-1],['prior clock overlap',3,r=>r.historyWindow.startMs=0],['clock deadline',3,r=>r.historyWindow.historyDoneMs=180001],
 ['final incomplete',9,r=>r.observedFinalized=7],['final window changed',9,r=>r.historyWindow.observedJournalBytes++],['Finish missing',9,r=>r.finish=false]
])historyCheck('reject '+label,()=>assert.throws(()=>validateWindow(index,mutate),/retention-/));
historyCheck('legacy rejects new scope',()=>assert.throws(()=>retentionContext.validateRetention(historyFixtures[0].receipt,null,null,historyFixtures[0].ledger,retentionSource),/contract/));
historyCheck('new mode rejects legacy scope',()=>assert.throws(()=>retentionContext.validateRetention(retFixtures[0].receipt,null,null,retFixtures[0].ledger,retentionSource,true),/contract/));
historyCheck('budget before first Writer',()=>{assert.equal(retentionContext.historyBudget(28000,0).requiredMs,134608);assert.throws(()=>retentionContext.historyBudget(50000,0),/budget-before-writer/);});
historyCheck('budget includes observed slower cycle and finish reserve',()=>{assert.equal(retentionContext.historyBudget(60000,3,8000).requiredMs,110000);assert.throws(()=>retentionContext.historyBudget(80000,3,8000),/budget-before-writer/);});
for(const args of [[NaN,0],[0,9],[0,-1],[0,1,Infinity]])historyCheck('invalid budget '+args,()=>assert.throws(()=>retentionContext.historyBudget(...args),/budget-shape/));
const boundaryInput=i=>{const r=historyFixtures[i].receipt,w=r.historyWindow;return {phase:r.phase,receipt:r,receiptSha256:sha(JSON.stringify(r)),marker:{phase:r.phase,cycleIndex:i,resourceSequence:w.resourceSequence,pid:701,artifactSavedMs:w.historyDoneMs+1,receiptSha256:sha(JSON.stringify(r))},pid:701,identity:'linux:1',resourceSequence:w.resourceSequence,sampleIndex:i+1,measurementStartedAt:i*7000,measurementCompletedAt:i*7000+1,runElapsedMs:i*7000+2};};
const boundRows=Array.from({length:9},(_,i)=>retentionContext.historyBoundary(boundaryInput(i)));
for(const [label,mutate] of [['marker missing',b=>b.marker=null],['marker SHA',b=>b.marker.receiptSha256=sha('bad')],['marker PID',b=>b.marker.pid=702],['resource sequence',b=>b.resourceSequence++],['OS identity missing',b=>b.identity=null],['ACK sample missing',b=>b.sampleIndex=0],['save before history',b=>b.marker.artifactSavedMs=0],['sample clock',b=>b.measurementCompletedAt=-1]])historyCheck('boundary rejects '+label,()=>{const b=structuredClone(boundaryInput(3));mutate(b);assert.throws(()=>retentionContext.historyBoundary(b),/history-boundary/);});
const observedHistory=Object.fromEntries(historyFixtures.map(f=>[f.receipt.phase,{receipt:f.receipt,receiptSha256:sha(JSON.stringify(f.receipt))}]));
const liveHistory={pid:701,startIdentity:'linux:1',processGroupAbsent:true,historyBoundaries:boundRows};
historyCheck('complete coverage',()=>retentionContext.validateHistoryCoverage(liveHistory,observedHistory));
for(const [label,mutate] of [['fewer than8',r=>r.historyBoundaries.pop()],['duplicate cycle',r=>r.historyBoundaries[3]=r.historyBoundaries[2]],['PID mixed',r=>r.historyBoundaries[3].pid=702],['OS identity mixed',r=>r.historyBoundaries[3].startIdentity='linux:2'],['ACK reused',r=>r.historyBoundaries[3].sampleIndex=1],['receipt unbound',r=>r.historyBoundaries[3].receiptSha256=sha('other')]])historyCheck('coverage rejects '+label,()=>{const r=structuredClone(liveHistory);mutate(r);assert.throws(()=>retentionContext.validateHistoryCoverage(r,observedHistory),/history-coverage/);});
// Actual sequence consumer must reject partial live evidence before any copy/reopen.
for(const incomplete of [false,true]){
 const calls=[];let copies=0;
 const live={...structuredClone(liveHistory),code:0,signal:null,owner:{status:'captured'},attribution:{finalOwnerZero:true}};
 if(incomplete)live.historyBoundaries.pop();
 const env={windowMode:true,clock:()=>0,execute:async(mode,limit)=>{calls.push([mode,limit]);return calls.length===1?live:{...live,pid:702,startIdentity:'linux:2'};},
  artifacts:()=>observedHistory,copyStore:async()=>{copies++;},recoveryReceipt:()=>({finish:true,runtimeDestroyed:true,exactLedger:true,exactDeletedSet:true,reader:true,manifestUnchanged:true})};
 if(incomplete){await assert.rejects(retentionContext.retentionSequence(env),/history-coverage/);assert.equal(copies,0);assert.equal(calls.length,1);}
 else {await retentionContext.retentionSequence(env);assert.deepEqual(calls,[['--retention-history-live',180000],['--retention-history-reopen',15000]]);assert.equal(copies,1);}
 passed++;console.log('[pass] fixed-active sequence '+(incomplete?'partial blocks copy/reopen':'opt-in shared deadlines'));
}
for(const mode of ['--retention-history-live','--retention-history-reopen'])await lifetimeParentCase(null,mode);
await lifetimeParentCase('pipe order','--retention-history-live').then(({result})=>{assert.equal(result.historyBoundaries.length,9);});
for(const fault of ['budget','late budget','short history','middle deletion','marker missing','marker identity','marker hash','marker sequence','duplicate marker','pid','identity change','FD incomplete','memory missing','allocator','loss','final owner','Finish missing','space','space log','native log','artifact','cleanup-after-space'])await lifetimeParentCase(fault,'--retention-history-live');
historyCheck('native opt-in wiring preserves guards',()=>{
 for(const t of ['cycles=window?8U:2U','cycle<=cycles','window&&cycle>=2','removed.size()==1&&current.count==previous.count&&current.bytes==previous.bytes','history-budget-before-writer','30000','2*max_cycle_ms','unexpected-generation-transition','ReadRecordingGenerationActive(media,1024*1024','a.active_file.size','a.active_file.sha256','PreseedSave(root/(stem+".json")','resource_seq+1'])assert(retNative.includes(t),t);
 assert(retNative.indexOf('history-budget-before-writer')<retNative.indexOf('start_ms=elapsed();Need(previous.bytes+E>Q'));
 for(const n of historyNames.slice(1,-1))assert(retNative.includes('"'+n+'"'));
 assert(helper.includes('--retention-history-live'));assert(source.includes("'--native-retention-history'],root/'retention-supervisor.log',240"));
 assert(source.includes("execute('--retention-history-live',180000)"));assert(source.includes("execute('--retention-history-reopen',15000)"));
 assert(source.includes('if(historyMode)receipt.historyBoundaries=historyBoundaries'));
});
console.log(JSON.stringify({passed,failed:0,scope:'legacy217 + fixed Active/eight-cycle receipt, budget, ACK/identity/sequence VM mocks and static wiring; NO build/native/product execution'}));
