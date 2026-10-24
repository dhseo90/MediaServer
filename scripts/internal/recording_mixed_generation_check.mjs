// 파일 용도: R99 source-bound generation/copy 복구의 부모 수집·공간 보호. 제품 기본 설정에 접근하지 않는다.
import fs from 'node:fs';
import {resourceTraceCollector,collectResourceTrace,finishResourceTrace} from './recording_resource_trace.mjs';
import {snapshotTree,copyVerified} from './recording_archive_diagnostic_profile.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {collectProcess,completeFdObservation} from './recording_foundation_observer.mjs';
import {memoryAttributionCollector,collectMemoryAttribution,finishMemoryAttribution} from './recording_memory_attribution.mjs';
import {assertMixedFixtureInput} from './recording_longrun_progress.mjs';
import {verifyCurrentCyclicProgress,admitWorkspaceSnapshot,createWorkspaceFailureCapture,measureCurrentCopy,measureCurrentRootStable} from './recording_current_observer.mjs';
const [root,binary,collector,selection]=process.argv.slice(2),repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
if(selection!==undefined&&!['--state-preseed','--native-lifetime','--native-retention','--native-retention-history'].includes(selection)||process.argv.length>6)throw Error('generation-mode');
const preseed=selection==='--state-preseed',lifetime=selection==='--native-lifetime',retentionHistory=selection==='--native-retention-history',retention=selection==='--native-retention'||retentionHistory;
if(!root||fs.realpathSync(root)!==root||!/^\/private\/tmp\/media-server-|^\/tmp\/media-server-/.test(root))throw Error('owned-run');
const rs=fs.lstatSync(root);if(rs.uid!==process.getuid()||(rs.mode&511)!==448)throw Error('run-owner');
// Reuse the existing OS-level 240s supervisor, including owned detached descendants.
// This branch is not entered by the Mock tests or any existing mode.
if(lifetime&&process.env.MEDIA_SERVER_NATIVE_LIFETIME_WORKER!==String(process.ppid)){
 const supervision=String.raw`import importlib.util,json,os,pathlib,sys
os.umask(0o077)
repo,root,node,driver,binary,collector=sys.argv[1:]
root=pathlib.Path(root)
spec=importlib.util.spec_from_file_location('owned',pathlib.Path(repo)/'scripts/internal/run_v450_recording_a_mixed.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
registry=root/'lifetime-groups.jsonl'
with registry.open('x') as f: f.flush();os.fsync(f.fileno())
env=dict(os.environ,MEDIA_SERVER_NATIVE_LIFETIME_WORKER=str(os.getpid()),PYTHONDONTWRITEBYTECODE='1')
r=m.run_owned([node,driver,str(root),binary,collector,'--native-lifetime'],root/'lifetime-supervisor.log',240,repo,env,lambda pid: print(json.dumps({'processGroup':pid,'timeoutSeconds':240}),flush=True),registry)
b=(json.dumps(r,indent=2)+'\n').encode();p=root/'lifetime-execution.json'
with p.open('xb') as f: f.write(b);f.flush();os.fsync(f.fileno())
if p.read_bytes()!=b: raise RuntimeError('lifetime-execution-readback')
print(json.dumps(r),flush=True)
sys.exit(r['exit'])`;
 const supervisor=spawn('python3',['-B','-c',supervision,repo,root,process.execPath,fileURLToPath(import.meta.url),binary,collector],{cwd:repo,stdio:'inherit'});
 const exit=await new Promise(resolve=>{supervisor.once('error',()=>resolve(1));supervisor.once('close',(code,signal)=>resolve(signal||code===null?1:code));});process.exit(exit);
}
if(retention&&process.env.MEDIA_SERVER_NATIVE_RETENTION_WORKER!==String(process.ppid)){
 const supervision=String.raw`import importlib.util,json,os,pathlib,sys
os.umask(0o077)
repo,root,node,driver,binary,collector,history=sys.argv[1:]
root=pathlib.Path(root)
spec=importlib.util.spec_from_file_location('owned',pathlib.Path(repo)/'scripts/internal/run_v450_recording_a_mixed.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
registry=root/'retention-groups.jsonl'
with registry.open('x') as f: f.flush();os.fsync(f.fileno())
env=dict(os.environ,MEDIA_SERVER_NATIVE_RETENTION_WORKER=str(os.getpid()),PYTHONDONTWRITEBYTECODE='1')
if history=='1':
    r=m.run_owned([node,driver,str(root),binary,collector,'--native-retention-history'],root/'retention-supervisor.log',240,repo,env,lambda pid: print(json.dumps({'processGroup':pid,'timeoutSeconds':240}),flush=True),registry)
else:
    r=m.run_owned([node,driver,str(root),binary,collector,'--native-retention'],root/'retention-supervisor.log',240,repo,env,lambda pid: print(json.dumps({'processGroup':pid,'timeoutSeconds':240}),flush=True),registry)
b=(json.dumps(r,indent=2)+'\n').encode();p=root/'retention-execution.json'
with p.open('xb') as f: f.write(b);f.flush();os.fsync(f.fileno())
if p.read_bytes()!=b: raise RuntimeError('retention-execution-readback')
print(json.dumps(r),flush=True)
sys.exit(r['exit'])`;
 const supervisor=spawn('python3',['-B','-c',supervision,repo,root,process.execPath,fileURLToPath(import.meta.url),binary,collector,retentionHistory?'1':'0'],{cwd:repo,stdio:'inherit'});
 const exit=await new Promise(resolve=>{supervisor.once('error',()=>resolve(1));supervisor.once('close',(code,signal)=>resolve(signal||code===null?1:code));});process.exit(exit);
}
const capture=createWorkspaceFailureCapture(root),baseline={fixedBytes:0,capBytes:448*1024**2};
const data=path.join(root,'live'),copy=path.join(root,'copy');fs.mkdirSync(data,{mode:0o700});
let first=null,sampleCount=0,summary={schema:'r99-generation-cyclic-v1',status:'RUNNING',cyclicRecoveryPass:false,spacePass:false,fixtureProfile:'continuous-r114',sourceHead:spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).stdout.trim(),sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,'scripts/internal/recording_mixed_generation_fixture.h'))).digest('hex')};
if(preseed)Object.assign(summary,{schema:'state-preseed-qualification-v1',nativePreseedFunctional:false,baselineRecovery:false,statePreparationBudget:'UNPROVEN',stateCapacity:'UNPROVEN'});
if(lifetime){delete summary.cyclicRecoveryPass;Object.assign(summary,{schema:'native-lifetime-v1',nativeLifetimePass:false,scope:'object-lifetime-only',notCovered:['retention-deletion','history-stability','automatic-rotation','http-concurrency','heap-peak','sqlite-vm','search-performance','product-mixed'],supervisorLimitSeconds:240});}
if(retention){delete summary.cyclicRecoveryPass;Object.assign(summary,{schema:'native-retention-v1',retentionTwoCycles:false,scope:'synthetic-retention-two-cycles',notCovered:['long-history','automatic-rotation','http-concurrency','heap-peak','sqlite-vm','search-performance','product-mixed'],supervisorLimitSeconds:240});}
if(retentionHistory)Object.assign(summary,{scope:'synthetic-retention-eight-cycles',plannedCycles:8,fixedActiveGrowingHistory:false,measurementLimit:'Helper History/Deleted/ledger allocations are included in process allocator/RSS'});
const measure=dir=>{const s=fs.lstatSync(dir);return measureCurrentCopy(dir,{dev:s.dev,ino:s.ino});};
const samples=fs.openSync(path.join(root,'space.jsonl'),'wx',0o600);
function named(){
  const measurementStartedAt=performance.now(),live=measureCurrentRootStable(data),recovery=fs.existsSync(copy)?measureCurrentRootStable(copy).totalBytes:0;
  let parentBytes=0;for(const name of fs.readdirSync(root)){if(name==='live'||name==='copy')continue;const s=fs.lstatSync(path.join(root,name));if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.uid!==process.getuid())throw Error('parent-output-file');parentBytes+=s.size;}
  return {totalBytes:live.totalBytes+parentBytes,copyBytes:recovery,parentBytes,categories:live.categories,measurementStartedAt,measurementCompletedAt:performance.now()};
}
function tree(dir){let rows=[];const walk=d=>{for(const name of fs.readdirSync(d).sort()){const f=path.join(d,name),s=fs.lstatSync(f);if(s.isDirectory())walk(f);else {if(!s.isFile()||s.nlink!==1||s.isSymbolicLink())throw Error('tree-file');rows.push([path.relative(dir,f),s.size,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]);}}};walk(dir);return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
function validatePreseedReceipt(r,manifest,ledgerSha256){
 const need=(v,c)=>{if(!v)throw Error('preseed-receipt-'+c);},integer=n=>Number.isSafeInteger(n)&&n>=0;
 need(r?.schema==='state-preseed-v1'&&r.finish===true&&r.checkpointKind==='explicit-preparation-only'&&r.clockKind==='synthetic-past-input-schedule'&&r.journalBoundary==='next-mutation-ordinal-gte-cut','contract');
 need(typeof r.storeId==='string'&&r.storeId===manifest.storeId&&integer(r.generation)&&r.generation>0&&r.generation===manifest.generation&&integer(r.cutOrdinal)&&r.cutOrdinal>0&&r.cutOrdinal===manifest.cutOrdinal,'cut');
 need(/^[a-f0-9]{64}$/.test(r.manifestSha256)&&r.ledgerSha256===ledgerSha256&&/^[a-f0-9]{64}$/.test(ledgerSha256),'hash');
 need([r.anchorMs,r.preparedAtMs,r.elapsedMs,r.finishMs].every(integer)&&r.preparedAtMs>=r.anchorMs&&r.finishMs<=r.elapsedMs&&r.elapsedMs<=180000,'clock');
 need(Array.isArray(r.channels)&&r.channels.length===2&&r.channels.map(c=>c.channel).join(',')==='9101,9201','channels');
 for(const c of r.channels){need(['finalizedCount','finalizedBytes','pendingCount','pendingBytes','deletedCount','deletedBytes','createdCount','createdBytes','firstOrder','lastOrder','utcFirstMs','utcLastMs','epochs','sourceGenerationFirst','sourceGenerationLast','ptsMinNs','ptsMaxNs','visualFrames','fileProofCount','segmentDurationNs','samplesPerSegment'].every(k=>integer(c[k])),'numbers');
  need(c.finalizedCount>0&&c.finalizedCount<2048&&c.pendingCount===0&&c.pendingBytes===0&&c.finalizedCount+c.deletedCount===c.createdCount&&c.finalizedBytes+c.deletedBytes===c.createdBytes,'conservation');
  need(c.finalizedBytes+64*1024**2>108*1024**2&&c.finalizedBytes<108*1024**2,'admission');
  need(c.firstOrder>0&&c.lastOrder>=c.firstOrder&&c.lastOrder-c.firstOrder+1>=c.finalizedCount,'order');
  need(c.utcFirstMs>=r.preparedAtMs-3600000&&c.utcLastMs<=r.anchorMs&&c.utcLastMs>c.utcFirstMs,'utc');
  need(c.sourceGenerationFirst>0&&c.sourceGenerationLast>=c.sourceGenerationFirst&&c.sourceGenerationLast-c.sourceGenerationFirst+1===c.epochs&&c.ptsMinNs===0&&c.ptsMaxNs===3999999999,'epoch-pts');
  need(c.epochs>0&&c.epochs<=c.finalizedCount&&c.epochs*2>=c.finalizedCount&&c.visualFrames===2*c.finalizedCount&&c.fileProofCount===c.finalizedCount&&c.segmentDurationNs===1999999999&&c.samplesPerSegment===60,'visual-file');
 }
 return r;
}
function preseedArtifacts(dir){
 const read=name=>{const f=path.join(dir,name),s=fs.lstatSync(f);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.uid!==process.getuid()||(s.mode&511)!==384||s.size>1024**2)throw Error('preseed-artifact-owner-size');return fs.readFileSync(f);};
 const bytes=read('preseed-baseline.json'),manifest=fs.readFileSync(path.join(dir,'recordings/recording-generation.json')),ledger=read('preseed-media.txt'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 const r=validatePreseedReceipt(JSON.parse(bytes),JSON.parse(manifest),hash(ledger));if(r.manifestSha256!==hash(manifest))throw Error('preseed-manifest-sha');
 return {receipt:r,baselineSha256:hash(bytes),ledgerSha256:hash(ledger)};
}
// Native lifetime-only contracts. Existing modes keep their own phase and receipt rules.
function lifetimeOwner(row,index,prior){
 const stages=['held','appended','checkpoint-held','prepared-released','reader-released','direct-released','page-released','pool-released','evidence-released','objects-released'];
 const vectors=[[1,1,1,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,1,1],[0,0,1,1,1,1,1,1,1],[0,0,0,1,1,1,1,1,1],[0,0,0,0,1,1,1,1,1],[0,0,0,0,0,0,1,1,1],[0,0,0,0,0,0,1,0,1],[0,0,0,0,0,0,0,0,0]];
 const keys=['prepared','alias','oldDirect','page','pool','oldAlive','newModel','evidence','dto'];
 if(row.catalogHolds!==row.alias||row.stage!==stages[index]||!vectors[index]||keys.some((k,i)=>row[k]!==vectors[index][i])||!Number.isSafeInteger(row.oldId)||row.oldId<=0||!Number.isSafeInteger(row.newId)||row.newId<0||
    row.newModel&&(row.newId===0||row.newId===row.oldId)||!row.newModel&&row.newId!==0||prior&&(row.oldId!==prior.oldId||row.newModel&&prior.newModel&&row.newId!==prior.newId))throw Error('lifetime-owner-contract');
 return row;
}
function lifetimeMetrics(m,pid,identity){
 if(m.pid!==pid||!Number.isSafeInteger(pid)||pid<=1||!/^(macos:[1-9]\d*:\d{1,6}|linux:[1-9]\d*)$/.test(m.startIdentity??'')||identity!==null&&identity!==m.startIdentity||!completeFdObservation(m))throw Error('lifetime-process-identity');
}
function lifetimeRead(dir,name){
 const file=path.join(dir,name),st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.uid!==process.getuid()||(st.mode&511)!==384||st.size>1024**2)throw Error('lifetime-artifact-owner-size');
 return fs.readFileSync(file);
}
function lifetimeWrite(file,bytes){
 const data=Buffer.from(bytes),fd=fs.openSync(file,'wx',0o600);let error=null;
 try{if(fs.writeSync(fd,data)!==data.length)throw Error('lifetime-artifact-short-write');fs.fsyncSync(fd);}catch(e){error=e;}finally{try{fs.closeSync(fd);}catch(e){error??=e;}}
 if(error)throw error;if(!fs.readFileSync(file).equals(data))throw Error('lifetime-artifact-readback');
 const parent=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}
}
function validateLifetimeReceipt(r,phase,manifest,ledger,source,now){
 const need=(v,c)=>{if(!v)throw Error('lifetime-receipt-'+c);},integer=n=>Number.isSafeInteger(n)&&n>=0,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 const count=phase==='prepare'?2:4;
 need(r?.schema==='native-lifetime-v1'&&r.phase===phase&&r.scope==='object-lifetime-only'&&r.finish===true&&r.catalogHoldsAtFinish===0&&r.runtimeDestroyed===true&&r.checkpointKind==='explicit-only','contract');
 need(typeof r.storeId==='string'&&r.storeId.length>0&&r.storeId===manifest.storeId&&r.generation===manifest.generation&&r.cutOrdinal===manifest.cutOrdinal&&[r.generation,r.cutOrdinal,r.lastOrder].every(n=>integer(n)&&n>0),'store-cut-order');
 need(r.count===count&&integer(r.bytes)&&r.bytes>0&&r.bytes<=count*71237&&r.fileProofCount===count,'count-bytes');
 need(r.epochs===count/2&&r.sourceGenerations===count/2&&r.ptsMinNs===0&&r.ptsMaxNs===3999999999,'epoch-pts');
 need([r.anchorMs,r.utcFirstMs,r.utcLastMs].every(integer)&&r.anchorMs<=now&&r.utcFirstMs>=now-3600000&&r.utcFirstMs===r.anchorMs-60000&&r.utcLastMs===r.utcFirstMs+count*2000&&r.utcLastMs<=r.anchorMs,'utc');
 need(JSON.stringify(r.source)===JSON.stringify(source)&&typeof source.runtimeSha256==='string'&&/^[a-f0-9]{64}$/.test(source.runtimeSha256),'source');
 need(r.ledgerSha256===hash(ledger)&&/^[a-f0-9]{64}$/.test(r.manifestSha256??''),'sha');
 const rows=ledger.toString().trim().split('\n').map(line=>line.split(' '));let previous=0,total=0;const ids=new Set();
 for(const row of rows){need(row.length===6&&integer(Number(row[0]))&&Number(row[0])>previous&&row[1]&&!ids.has(row[1])&&integer(Number(row[2]))&&Number(row[2])>0&&Number(row[2])<=71237&&row.slice(3).every(h=>/^[a-f0-9]{64}$/.test(h)),'ledger');previous=Number(row[0]);total+=Number(row[2]);ids.add(row[1]);}
 need(rows.length===count&&previous===r.lastOrder&&total===r.bytes,'ledger-count-bytes');return r;
}
function lifetimeArtifacts(dir,phase,source){
 const raw=lifetimeRead(dir,`lifetime-${phase}.json`),ledger=lifetimeRead(dir,`lifetime-${phase}.ledger`),bytes=fs.readFileSync(path.join(dir,'recordings/recording-generation.json'));
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),r=validateLifetimeReceipt(JSON.parse(raw),phase,JSON.parse(bytes),ledger,source,Date.now());
 if(r.manifestSha256!==hash(bytes))throw Error('lifetime-manifest-sha');return {receipt:r,ledger:ledger.toString(),receiptSha256:hash(raw)};
}
function lifetimeBinding(){
 const paths=['scripts/internal/recording_mixed_generation_fixture.h','scripts/internal/recording_managed_writer_smoke.cpp','scripts/internal/recording_mixed_generation_check.mjs','scripts/internal/recording_memory_attribution.mjs','scripts/internal/recording_native_isolation.py'];
 const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 return {head:summary.sourceHead,sources:Object.fromEntries(paths.map(p=>[p,hash(path.join(repo,p))])),runtimeSha256:hash(path.join(repo,'build-gst-onnx/libmedia_server_runtime.a')),productSha256:hash(path.join(repo,'build-gst-onnx/media_server')),helperSha256:hash(binary),collectorSha256:hash(collector)};
}
async function lifetimeSequence({execute,artifacts,copyStore,clock=()=>performance.now()}){
 const started=clock(),deadline=started+180000,outer=started+240000;const result={};
 const remaining=()=>{const n=Math.floor(deadline-clock());if(n<=0)throw Object.assign(Error('lifetime-ab-deadline'),{phaseStatus:'BLOCKED'});return n;};
 const valid=r=>{if(r?.code!==0||r.signal||r.processGroupAbsent!==true||r.owner?.status!=='captured'||r.attribution?.finalOwnerZero!==true)throw Error('lifetime-phase-incomplete');};
 result.prepare=await execute('--lifetime-prepare',remaining());valid(result.prepare);result.baseline=artifacts('prepare');
 result.observe=await execute('--lifetime-observe',remaining());valid(result.observe);remaining();result.observed=artifacts('observe');
 const a=result.baseline.receipt,b=result.observed.receipt;
 if(a.storeId!==b.storeId||b.generation!==a.generation+1||b.cutOrdinal<=a.cutOrdinal||b.lastOrder<=a.lastOrder||b.count!==4||!result.observed.ledger.startsWith(result.baseline.ledger)||a.anchorMs!==b.anchorMs)throw Error('lifetime-append-boundary');
 await copyStore();if(clock()+15000>outer)throw Object.assign(Error('lifetime-supervisor-deadline'),{phaseStatus:'BLOCKED'});
 result.recovery=await execute('--lifetime-reopen',15000);valid(result.recovery);result.recovered=artifacts('reopen');
 if(clock()>outer)throw Error('lifetime-supervisor-deadline');
 const c=result.recovered.receipt;if(c.storeId!==b.storeId||c.generation!==b.generation||c.cutOrdinal!==b.cutOrdinal||c.lastOrder!==b.lastOrder||c.manifestSha256!==b.manifestSha256||result.recovered.ledger!==result.observed.ledger)throw Error('lifetime-recovery-binding');
 const identities=[result.prepare,result.observe,result.recovery].map(r=>`${r.pid}:${r.startIdentity}`);if(new Set(identities).size!==3)throw Error('lifetime-process-reuse');
 return result;
}
async function runLifetime(){
 const source=lifetimeBinding();lifetimeWrite(path.join(data,'lifetime-source.json'),JSON.stringify(source)+'\n');let before;
 const result=await lifetimeSequence({execute:(mode,limit)=>run(mode,mode==='--lifetime-reopen'?copy:data,mode==='--lifetime-reopen',limit,source),
  artifacts:phase=>lifetimeArtifacts(phase==='reopen'?copy:data,phase,source),
  copyStore:async()=>{before=tree(data);admitWorkspaceSnapshot({storage:{...named(),copyBytes:measure(data).bytes},baseline,context:{kind:'lifetime-copy-admission'}},capture);const snapshot=snapshotTree(data),storage=named();copyVerified(data,copy,snapshot,n=>admitWorkspaceSnapshot({storage:{...storage,copyBytes:n},baseline,context:{kind:'lifetime-copy-write'}},capture));if(tree(copy)!==before)throw Error('lifetime-copy-bytes');}});
 if(tree(data)!==before||JSON.stringify(lifetimeBinding())!==JSON.stringify(source))throw Error('lifetime-source-changed');
 lifetimeWrite(path.join(root,'lifetime-result.json'),JSON.stringify({source,...result})+'\n');return result;
}
function lifetimeGroup(event,pid){const fd=fs.openSync(path.join(root,'lifetime-groups.jsonl'),'a');try{const row=JSON.stringify({event,pid})+'\n';if(fs.writeSync(fd,row)!==Buffer.byteLength(row))throw Error('lifetime-group-write');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
// Separate receipt contract: baseline history never counts as observed progress.
function validateRetention(r,prior,baseline,ledger,source,windowMode=false){
 const need=(v,c)=>{if(!v)throw Error('retention-receipt-'+c);},int=n=>Number.isSafeInteger(n)&&n>=0,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 need(r?.schema==='native-retention-v1'&&r.channel==='9101'&&r.scope===(windowMode?'synthetic-retention-eight-cycles':'synthetic-retention-two-cycles')&&r.checkpointKind==='explicit-preparation-and-final-only','contract');
 const phases=retentionPhases(windowMode),total=windowMode?8:2,finalIndex=total+1,index=phases.indexOf(r.phase);need(index>=0,'phase');
 need(['generation','cutOrdinal','baselineGeneration','baselineCut','initialNextOrdinal','preparationMutations','initialCount','seedBytes','activeCount','activeBytes','lastOrder','pendingCount','deletedCount','newDeleted','removedBytes','observedFinalized','observedMutations','nextOrdinal','fileProofCount'].every(k=>int(r[k])),'numbers');
 need(r.initialCount===Math.floor(44*1024**2/r.seedBytes)+2&&r.initialCount>4&&r.initialCount<2048&&r.seedBytes>0&&r.seedBytes<=71237,'initial-count');
 need(typeof r.storeId==='string'&&r.storeId.length>0,'store');
 need(r.preparationMutations===r.baselineCut-r.initialNextOrdinal&&r.preparationMutations>0&&r.baselineGeneration>0&&r.baselineCut>0,'preparation-boundary');
 need(r.pendingCount===0&&r.admissionRejected===0&&r.fileProofCount===r.activeCount&&r.activeCount>3&&r.activeBytes===r.activeCount*r.seedBytes&&r.activeBytes<=108*1024**2,'active-bytes');
 need(r.holds===(index<finalIndex?2:0)&&r.pinCount===1&&r.protectedIds?.length===3&&new Set(r.protectedIds).size===3&&r.protectedIds.every(v=>typeof v==='string'&&v.length>0),'protection');
 need(r.deletedIds?.length===r.deletedCount&&new Set(r.deletedIds).size===r.deletedCount&&r.deletedIds.every(v=>typeof v==='string'&&!r.protectedIds.includes(v)),'deleted-set');
 const cycles=Math.min(index,total);need(r.observedFinalized===cycles&&r.activeCount+r.deletedCount===r.initialCount+cycles&&r.observedMutations===2*cycles+2*r.deletedCount&&r.nextOrdinal===r.baselineCut+r.observedMutations,'history-conservation');
 need(r.finish===(index===finalIndex)&&r.runtimeDestroyed===(index===finalIndex),'finish');
 need(r.generation===r.baselineGeneration+(index===finalIndex?1:0)&&r.cutOrdinal===(index===finalIndex?r.nextOrdinal:r.baselineCut),'generation');
 need(JSON.stringify(r.source)===JSON.stringify(source)&&/^[a-f0-9]{64}$/.test(source.runtimeSha256??'')&&r.ledgerSha256===hash(ledger)&&/^[a-f0-9]{64}$/.test(r.manifestSha256),'source-sha');
 const rows=ledger.toString().trim().split('\n').map(x=>x.split(' '));let order=0,bytes=0,pins=0;const ids=new Set();
 for(const row of rows){need(row.length===7&&int(+row[0])&&+row[0]>order&&!ids.has(row[1])&&int(+row[2])&&+row[2]===r.seedBytes&&row.slice(3,6).every(h=>/^[a-f0-9]{64}$/.test(h))&&['0','1'].includes(row[6]),'ledger');order=+row[0];bytes+=+row[2];ids.add(row[1]);pins+=+row[6];need((row[6]==='1')===(row[1]===r.protectedIds[1]),'pin-ledger');}
 need(rows.length===r.activeCount&&bytes===r.activeBytes&&order===r.lastOrder&&pins===1&&r.protectedIds.every(id=>ids.has(id))&&r.deletedIds.every(id=>!ids.has(id)),'ledger-shape');
 need(Array.isArray(r.historyRows)&&r.historyRows.length===r.observedMutations,'history-rows');const mutationIds=new Set(),pending=new Set(),deleted=new Set(),finalized=new Set();let reservations=0,chain='';
 for(let i=0;i<r.historyRows.length;i++){const row=r.historyRows[i];need(row.ordinal===r.baselineCut+i&&typeof row.id==='string'&&row.id.length>0&&!mutationIds.has(row.id)&&typeof row.entity==='string'&&row.entity.length>0&&/^[a-f0-9]{64}$/.test(row.rawSha256),'mutation');mutationIds.add(row.id);chain+=`${row.ordinal} ${row.id} ${row.rawSha256}\n`;
  if(row.type===16)reservations++;else if(row.type===18){need(!finalized.has(row.entity)&&ids.has(row.entity),'finalized-id');finalized.add(row.entity);}else if(row.type===19){need(!pending.has(row.entity),'pending-duplicate');pending.add(row.entity);}else if(row.type===20){need(pending.has(row.entity)&&!deleted.has(row.entity),'deleted-mutation');deleted.add(row.entity);}else need(false,'mutation-type');
 }
 need(hash(chain)===r.historySha256&&reservations===cycles&&finalized.size===cycles&&deleted.size===r.deletedCount&&pending.size===deleted.size&&r.deletedIds.every(id=>deleted.has(id)),'history-binding');
 if(index===0){need(!prior&&!baseline&&r.deletedCount===0&&r.newDeleted===0&&r.removedBytes===0&&r.observedMutations===0&&r.activeBytes+64*1024**2>108*1024**2,'baseline');}
 else {need(prior&&baseline&&['storeId','baselineGeneration','baselineCut','initialNextOrdinal','initialCount','seedBytes','preparationMutations'].every(k=>r[k]===baseline[k])&&JSON.stringify(r.protectedIds)===JSON.stringify(baseline.protectedIds),'baseline-binding');
  need(JSON.stringify(r.historyRows.slice(0,prior.historyRows.length))===JSON.stringify(prior.historyRows)&&prior.deletedIds.every(id=>r.deletedIds.includes(id)),'prefix');
  if(index<finalIndex){need(prior.phase===phases[index-1]&&prior.activeBytes+64*1024**2>108*1024**2&&r.newDeleted>0&&r.deletedCount===prior.deletedCount+r.newDeleted&&r.removedBytes===r.newDeleted*r.seedBytes&&r.activeCount+r.newDeleted===prior.activeCount+1&&r.activeBytes+r.removedBytes===prior.activeBytes+r.seedBytes&&r.lastOrder===prior.lastOrder+1&&r.observedMutations>prior.observedMutations,'cycle');}
  else need(prior.phase===phases[total]&&r.newDeleted===0&&r.removedBytes===0&&r.lastOrder===prior.lastOrder&&r.ledgerSha256===prior.ledgerSha256&&r.historySha256===prior.historySha256,'final-binding');
 }
 if(windowMode)validateHistoryWindow(r,prior,baseline,index);
 return r;
}
function retentionArtifacts(dir,source,through='final',windowMode=false){
 const result={};for(const phase of retentionPhases(windowMode)){
  const raw=lifetimeRead(dir,`retention-${phase}.json`),ledger=lifetimeRead(dir,`retention-${phase}.ledger`),keys=Object.keys(result),prior=keys.length?result[keys.at(-1)].receipt:null;
  const receipt=validateRetention(JSON.parse(raw),prior,result.baseline?.receipt??null,ledger,source,windowMode);result[phase]={receipt,receiptSha256:crypto.createHash('sha256').update(raw).digest('hex')};if(phase===through)break;
 }
 const last=result[through].receipt,manifest=lifetimeRead(path.join(dir,'recordings'),'recording-generation.json');
 const actualManifest=JSON.parse(manifest);if(last.manifestSha256!==crypto.createHash('sha256').update(manifest).digest('hex')||last.storeId!==actualManifest.storeId||last.generation!==actualManifest.generation||last.cutOrdinal!==actualManifest.cutOrdinal)throw Error('retention-artifact-manifest');return result;
}
async function retentionSequence({execute,artifacts,copyStore,recoveryReceipt,clock=()=>performance.now(),windowMode=false}){
 const started=clock(),valid=r=>{if(r?.code!==0||r.signal||!r.processGroupAbsent||r.owner?.status!=='captured'||r.attribution?.finalOwnerZero!==true)throw Error('retention-phase-incomplete');};
 const live=windowMode?await execute('--retention-history-live',180000):await execute('--retention-live',180000);valid(live);if(clock()-started>180000)throw Error('retention-ab-deadline');const observed=artifacts('live');if(windowMode)validateHistoryCoverage(live,observed);
 await copyStore();if(clock()-started+15000>240000)throw Error('retention-outer-deadline');const recovery=windowMode?await execute('--retention-history-reopen',15000):await execute('--retention-reopen',15000);valid(recovery);
 if(clock()-started>240000)throw Error('retention-outer-deadline');const recovered=artifacts('copy');
 if(JSON.stringify(recovered)!==JSON.stringify(observed)||`${live.pid}:${live.startIdentity}`===`${recovery.pid}:${recovery.startIdentity}`)throw Error('retention-recovery-binding');
 const receipt=recoveryReceipt();if(['finish','runtimeDestroyed','exactLedger','exactDeletedSet','reader','manifestUnchanged'].some(k=>receipt[k]!==true))throw Error('retention-recovery-incomplete');
 return {live,observed,recovery,recovered,recoveryReceipt:receipt};
}
async function runRetention(){
 const source=lifetimeBinding();lifetimeWrite(path.join(data,'retention-source.json'),JSON.stringify(source)+'\n');let before;
 const result=await retentionSequence({windowMode:retentionHistory,execute:(mode,limit)=>run(mode,mode.endsWith('-reopen')?copy:data,mode.endsWith('-reopen'),limit,source),
  artifacts:which=>retentionArtifacts(which==='copy'?copy:data,source,'final',retentionHistory),recoveryReceipt:()=>JSON.parse(lifetimeRead(copy,'retention-recovered.json')),
  copyStore:async()=>{before=tree(data);admitWorkspaceSnapshot({storage:{...named(),copyBytes:measure(data).bytes},baseline,context:{kind:'retention-copy-admission'}},capture);const snapshot=snapshotTree(data),storage=named();copyVerified(data,copy,snapshot,n=>admitWorkspaceSnapshot({storage:{...storage,copyBytes:n},baseline,context:{kind:'retention-copy-write'}},capture));if(tree(copy)!==before)throw Error('retention-copy-bytes');}});
 if(tree(data)!==before||JSON.stringify(lifetimeBinding())!==JSON.stringify(source))throw Error('retention-source-changed');
 lifetimeWrite(path.join(root,'retention-result.json'),JSON.stringify({source,...result})+'\n');return result;
}
function retentionGroup(event,pid){const fd=fs.openSync(path.join(root,'retention-groups.jsonl'),'a');try{const row=JSON.stringify({event,pid})+'\n';if(fs.writeSync(fd,row)!==Buffer.byteLength(row))throw Error('retention-group-write');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function retentionPhases(windowMode=false){return windowMode?['baseline','cycle-one','cycle-two','cycle-three','cycle-four','cycle-five','cycle-six','cycle-seven','cycle-eight','final']:['baseline','cycle-one','cycle-two','final'];}
function validateHistoryWindow(r,prior,baseline,index){
 const fail=c=>{throw Error('retention-window-'+c);},w=r.historyWindow,int=n=>Number.isSafeInteger(n)&&n>=0;
 if(!w||w.plannedCycles!==8||w.cycleIndex!==Math.min(index,8)||!int(w.pid)||w.pid<=1||!int(w.resourceSequence)||w.resourceSequence<1||!int(w.observedJournalBytes)||w.observedJournalBytes>1024**2||!/^[a-f0-9]{64}$/.test(w.observedJournalSha256??''))fail('shape');
 const times=['startMs','writerDoneMs','inspectDoneMs','historyDoneMs'];if(!times.every(k=>int(w[k])&&w[k]<=180000)||times.some((k,i)=>i&&w[k]<w[times[i-1]]))fail('clock');
 if(index===0){if(w.observedJournalBytes||w.observedJournalSha256!==crypto.createHash('sha256').update('').digest('hex')||times.some(k=>w[k]!==0))fail('baseline');}
 else if(index===9){if(JSON.stringify(w)!==JSON.stringify(prior.historyWindow))fail('final');}
 else {const p=prior.historyWindow;if(w.pid!==baseline.historyWindow.pid||w.resourceSequence!==p.resourceSequence+1||w.observedJournalBytes<=p.observedJournalBytes||w.observedJournalSha256===p.observedJournalSha256||w.startMs<p.historyDoneMs)fail('continuity');
  if(index>=2&&(r.newDeleted!==1||r.activeCount!==prior.activeCount||r.activeBytes!==prior.activeBytes))fail('fixed-active');}
}
function historyBudget(elapsedMs,completedCycles,maxCycleMs=6538){
 if(!Number.isFinite(elapsedMs)||elapsedMs<0||!Number.isInteger(completedCycles)||completedCycles<0||completedCycles>8||!Number.isFinite(maxCycleMs)||maxCycleMs<0)throw Error('retention-history-budget-shape');
 const requiredMs=(8-completedCycles)*2*Math.max(6538,maxCycleMs)+30000;
 if(elapsedMs>180000||requiredMs>180000-elapsedMs)throw Error('retention-history-budget-before-writer');
 return {elapsedMs,completedCycles,requiredMs,finishReserveMs:30000};
}
function historyBoundary({phase,receipt,receiptSha256,marker,pid,identity,resourceSequence,sampleIndex,measurementStartedAt,measurementCompletedAt,runElapsedMs}){
 const w=receipt.historyWindow,index=retentionPhases(true).indexOf(phase);
 if(index<0||index>8||receipt.phase!==phase||!w||w.cycleIndex!==index||w.plannedCycles!==8||w.pid!==pid||marker?.pid!==pid||marker.phase!==phase||marker.cycleIndex!==index||marker.resourceSequence!==w.resourceSequence||resourceSequence!==w.resourceSequence||marker.receiptSha256!==receiptSha256||!Number.isSafeInteger(marker.artifactSavedMs)||marker.artifactSavedMs<w.historyDoneMs||marker.artifactSavedMs>180000||!/^(macos:[1-9]\d*:\d{1,6}|linux:[1-9]\d*)$/.test(identity??'')||!Number.isSafeInteger(sampleIndex)||sampleIndex<=0||!Number.isFinite(measurementStartedAt)||measurementStartedAt<0||measurementCompletedAt<measurementStartedAt||!Number.isFinite(measurementCompletedAt)||!Number.isFinite(runElapsedMs)||runElapsedMs<0||runElapsedMs>180000)throw Error('retention-history-boundary');
 return {phase,cycleIndex:index,pid,startIdentity:identity,resourceSequence,sampleIndex,receiptSha256,artifactSavedMs:marker.artifactSavedMs,measurementStartedAt,measurementCompletedAt,runElapsedMs};
}
function validateHistoryCoverage(live,observed){
 const phases=retentionPhases(true).slice(0,-1),rows=live.historyBoundaries;
 if(!Array.isArray(rows)||rows.length!==9||!live.processGroupAbsent)throw Error('retention-history-coverage');
 for(let i=0;i<9;i++){const b=rows[i],a=observed[phases[i]],w=a?.receipt.historyWindow;
  if(!w||b.phase!==phases[i]||b.cycleIndex!==i||b.pid!==live.pid||b.startIdentity!==live.startIdentity||b.resourceSequence!==w.resourceSequence||b.receiptSha256!==a.receiptSha256||!Number.isSafeInteger(b.sampleIndex)||b.sampleIndex<=0||!Number.isFinite(b.runElapsedMs)||b.runElapsedMs<0||b.runElapsedMs>180000||i&&(b.sampleIndex<=rows[i-1].sampleIndex||b.resourceSequence!==rows[i-1].resourceSequence+1||b.runElapsedMs<rows[i-1].runElapsedMs))throw Error('retention-history-coverage-binding');
 }
 if(observed.final?.receipt.historyWindow?.cycleIndex!==8||observed.final.receipt.observedFinalized!==8)throw Error('retention-history-final');
}
async function run(mode,dir,isCopy,limitMs=null,sourceBinding=null){
  const lifetimeMode=mode.startsWith('--lifetime-'),retentionMode=mode.startsWith('--retention-'),historyMode=mode.startsWith('--retention-history-'),detailedMode=lifetimeMode||retentionMode;
  if(detailedMode&&(!Number.isSafeInteger(limitMs)||limitMs<=0||limitMs>(isCopy?15000:180000)))throw Error('lifetime-deadline-before-spawn');
  const startedAt=new Date().toISOString(),startedClock=performance.now();
  const raw=fs.openSync(path.join(root,mode.slice(2)+'.log'),'wx',0o600);
  let child;try{child=spawn('python3',[path.join(repo,'scripts/internal/recording_native_isolation.py'),dir,'--',binary,dir,mode],{cwd:repo,stdio:['pipe','pipe','pipe'],detached:true});}catch(e){fs.closeSync(raw);throw e;}
  let bytes=0,pid=null,identity=null,phase='spawn',pending='',observing=false,primary=null,closed=false,seen=0,stderrText='',killTimer=null;const phases=[],baselines={},progress=[],owners=[];let cut=null,attribution=null,attributionOffset=0;const historyMarkers=new Map(),historyBoundaries=[];let maxCycleMs=6538;
  function memory(){if(!detailedMode||!pid)return;attribution??=memoryAttributionCollector(pid,{strict:true});const chunk=stderrText.slice(attributionOffset);attributionOffset=stderrText.length;collectMemoryAttribution(attribution,Buffer.from(chunk));if(attribution.error)throw Error(attribution.error);}
  const stop=e=>{primary??=e;try{process.kill(-child.pid,'SIGTERM');}catch(x){if(x.code!=='ESRCH')primary??=x;}if(!killTimer)killTimer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')primary??=e;}},1000);};
  if(detailedMode){try{if(retentionMode)retentionGroup('started',child.pid);else lifetimeGroup('started',child.pid);}catch(e){stop(e);}}
  const interrupt=()=>stop(Error('native-interrupted'));process.once('SIGTERM',interrupt);process.once('SIGINT',interrupt);
  async function observe(ack=false){if(observing||!pid||closed)return;observing=true;try{
    let historyArtifact=null,historyMarker=null;
    if(historyMode&&ack&&!isCopy&&retentionPhases(true).slice(0,-1).includes(phase)){
      historyArtifact=retentionArtifacts(dir,sourceBinding,phase,true)[phase];historyMarker=historyMarkers.get(phase);
      if(!historyMarker)throw Error('retention-history-marker-missing');
      const expected=historyArtifact.receipt.historyWindow.resourceSequence;
      for(;;){memory();if(attribution?.count===expected+1&&!attribution.pendingResource)break;
        if(closed||performance.now()-startedClock>=limitMs||attribution?.count>expected+1)throw Error('retention-history-resource-binding');
        await new Promise(resolve=>setTimeout(resolve,10));}
    }
    const begin=performance.now(),m=await collectProcess(collector,pid);if(closed&&!ack&&!m.valid)return;if(!m.valid||m.error!==null||m.rssBytes>4*1024**3)throw Error('native-metric-budget');
    if(detailedMode)lifetimeMetrics(m,pid,identity);identity??=m.startIdentity;const storage=named();const decision=admitWorkspaceSnapshot({storage,baseline,metrics:{...m,measurementStartedAt:begin,measurementCompletedAt:performance.now()},expectedPid:pid,expectedStart:identity,anonymousInCopy:isCopy,context:{kind:'r99-generation',phase,sampleIndex:++sampleCount}},capture);
    const row=JSON.stringify({phase,pid,measurementStartedAt:begin,measurementCompletedAt:performance.now(),metrics:m,decision})+'\n';if(fs.fstatSync(samples).size+Buffer.byteLength(row)>4*1024**2)throw Error('space-log-cap');if(fs.writeSync(samples,row)!==Buffer.byteLength(row))throw Error('space-log-short-write');++seen;
    if(historyArtifact){
      const bound=historyBoundary({phase,receipt:historyArtifact.receipt,receiptSha256:historyArtifact.receiptSha256,marker:historyMarker,pid,identity,resourceSequence:attribution.count-1,sampleIndex:sampleCount,measurementStartedAt:begin,measurementCompletedAt:performance.now(),runElapsedMs:performance.now()-startedClock});
      const prior=historyBoundaries.at(-1);if(prior&&(bound.cycleIndex!==prior.cycleIndex+1||bound.sampleIndex<=prior.sampleIndex))throw Error('retention-history-boundary-order');
      historyBoundaries.push(bound);historyMarkers.delete(phase);
      if(prior)maxCycleMs=Math.max(maxCycleMs,bound.runElapsedMs-prior.runElapsedMs);
      if(bound.cycleIndex<8)bound.nextBudget=historyBudget(performance.now()-startedClock,bound.cycleIndex,maxCycleMs);
    }
    if(ack){if(retentionMode){memory();if(phase==='opened'&&!isCopy)assertMixedFixtureInput(fs.readFileSync(path.join(dir,'retention-input/mixed-input.mp4')),'continuous-r114');if(!historyMode&&['baseline','cycle-one','cycle-two'].includes(phase)&&!isCopy)retentionArtifacts(dir,sourceBinding,phase);if(phase==='opened'&&isCopy)retentionArtifacts(dir,sourceBinding,'final',historyMode);}if(lifetimeMode){memory();if(phase==='opened'&&!isCopy){const input=fs.readFileSync(path.join(dir,mode==='--lifetime-prepare'?'lifetime-input-a/mixed-input.mp4':'lifetime-input-b/mixed-input.mp4'));assertMixedFixtureInput(input,'continuous-r114');if(mode==='--lifetime-observe'){if(!input.equals(fs.readFileSync(path.join(dir,'lifetime-input-a/mixed-input.mp4'))))throw Error('lifetime-input-copy');lifetimeArtifacts(dir,'prepare',sourceBinding);}}if(phase==='opened'&&isCopy)lifetimeArtifacts(dir,'observe',sourceBinding);}if(mode==='--state-preseed'&&phase==='opened')assertMixedFixtureInput(fs.readFileSync(path.join(dir,'mixed-input.mp4')),'continuous-r114');if(phase==='baseline'){const bytes=fs.readFileSync(path.join(dir,'recordings/recording-generation.json'));const manifest=JSON.parse(bytes);if(!manifest.storeId||!Number.isSafeInteger(manifest.cutOrdinal))throw Error('baseline-manifest');cut={storeId:manifest.storeId,generation:manifest.generation,cutOrdinal:manifest.cutOrdinal,manifestSha256:crypto.createHash('sha256').update(bytes).digest('hex'),observedAt:performance.now()};}child.stdin.write('observed\n');}
  }catch(e){capture.capture(e,{phase,pid});stop(e);}finally{observing=false;}}
  function collect(b,stderr){try{bytes+=b.length;if(bytes>4*1024**2){stop(Error('native-log-cap'));return;}if(fs.writeSync(raw,b)!==b.length)throw Error('native-log-short-write');if(stderr){stderrText+=b.toString();memory();return;}
    pending+=b.toString();if(pending.length>65536){stop(Error('native-line-cap'));return;}let end;
    while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);const match=/^\[R99-phase\] ([a-z-]+) (\d+)$/.exec(line);
      if(historyMode&&line.startsWith('[retention-window] ')){const marker=JSON.parse(line.slice(19));if(isCopy||historyMarkers.has(marker.phase)||historyBoundaries.some(b=>b.phase===marker.phase)||!retentionPhases(true).slice(0,-1).includes(marker.phase))throw Error('retention-history-marker');historyMarkers.set(marker.phase,marker);}
      if(lifetimeMode&&line.startsWith('[lifetime-owner] ')){owners.push(lifetimeOwner(JSON.parse(line.slice(17)),owners.length,owners.at(-1)));}
      if(line.startsWith('[R99-baseline] ')){
        const fields=line.slice(15).trim().split(' '),channel=fields.shift(),values=Object.fromEntries(fields.map(v=>v.split('=')));
        if(baselines[channel]||!['9101','9201'].includes(channel))throw Error('baseline-duplicate');
        baselines[channel]={channel,count:Number(values.count),bytes:Number(values.bytes),order:Number(values.order)};
      }
      if(line.startsWith('[R99-progress] ')){
        const values=Object.fromEntries(line.slice(15).trim().split(' ').map(v=>v.split('='))),current=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,k==='channel'?v:Number(v)]));
        if(!cut||progress.some(p=>p.progress.channel===current.channel))throw Error('progress-cut');
        progress.push(verifyCurrentCyclicProgress(baselines[current.channel],current,'continuous-r114'));
      }
      if(match){phase=match[1];phases.push(phase);if(pid&&pid!==Number(match[2])){stop(Error('native-pid-change'));return;}pid=Number(match[2]);const ack=()=>{if(closed)return;if(observing)setTimeout(ack,10);else void observe(true);};ack();}
    }
  }catch(e){capture.capture(e,{kind:'native-collection',phase,pid});stop(e);}}
  child.stdout.on('data',b=>collect(b,false));child.stderr.on('data',b=>collect(b,true));child.on('error',stop);child.stdin.on('error',e=>{if(!closed)stop(e);});
  const timer=setTimeout(()=>stop(Error('native-timeout')),detailedMode?limitMs:isCopy?15000:180000),poll=setInterval(()=>void observe(),500);
  const result=await new Promise(resolve=>child.on('close',(code,signal)=>{closed=true;resolve({code,signal});}));clearTimeout(timer);clearInterval(poll);process.removeListener('SIGTERM',interrupt);process.removeListener('SIGINT',interrupt);while(observing)await new Promise(r=>setTimeout(r,10));try{fs.closeSync(raw);}catch(e){primary??=e;}
  // 부모 wrapper 종료가 같은 process group의 모든 후손 종료를 뜻하지는 않는다.
  const groupAlive=()=>{try{process.kill(-child.pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
  let cleanupError=null;
  try{if(groupAlive()){primary??=Error('native-group-remains');process.kill(-child.pid,'SIGKILL');
    const until=performance.now()+1000;while(groupAlive()&&performance.now()<until)await new Promise(r=>setTimeout(r,10));
    if(groupAlive())cleanupError='native-group-cleanup-failed';}}
  catch(e){cleanupError=e.message;}finally{clearTimeout(killTimer);}
  if(cleanupError){capture.capture(Error(cleanupError),{kind:'cleanup',primary:primary?.message??null});if(primary)primary.cleanupError=cleanupError;else primary=Error(cleanupError);}
  if(detailedMode&&!cleanupError){try{if(retentionMode)retentionGroup('closed',child.pid);else lifetimeGroup('closed',child.pid);}catch(e){primary??=e;}}
  const receipt={mode,pid,startIdentity:identity,processGroup:child.pid,startedAt,finishedAt:new Date().toISOString(),elapsedMs:performance.now()-startedClock,...result,samples:seen,bytes,phases,processGroupAbsent:cleanupError===null};
  if(historyMode)receipt.historyBoundaries=historyBoundaries;
  if(detailedMode){try{lifetimeWrite(path.join(root,mode.slice(2)+'-process.json'),JSON.stringify({...receipt,primaryError:primary?.message??null,cleanupError})+'\n');}catch(e){if(primary)primary.artifactError=e.message;else primary=e;}}
  if(primary){primary.processReceipt=receipt;throw primary;}if(pending||!stderrText.endsWith('\n'))throw Object.assign(Error('native-partial-output'),{processReceipt:receipt});if(result.code!==0||result.signal||seen===0)throw Object.assign(Error('native-child-failed:'+JSON.stringify(result)),{processReceipt:receipt});
  try{process.kill(-child.pid,0);throw Error('native-group-remains');}catch(e){if(e.code!=='ESRCH')throw e;}
  let owner;try{const trace=resourceTraceCollector(pid);collectResourceTrace(trace,Buffer.from(stderrText));owner=finishResourceTrace(trace);}catch(e){e.processReceipt=receipt;throw e;}
  if(retentionMode){try{memory();const ownerMemory=finishMemoryAttribution(attribution),expected=isCopy?['opened','baseline','released']:historyMode?['opened',...retentionPhases(true).slice(0,-1),'checkpoint','released']:['opened','baseline','cycle-one','cycle-two','checkpoint','released'];if(JSON.stringify(phases.filter(p=>p!=='prestate-progress'))!==JSON.stringify(expected))throw Error('retention-phase-missing');if(historyMode&&!isCopy&&(historyBoundaries.length!==9||historyMarkers.size))throw Error('retention-history-coverage');return {...receipt,owner,attribution:ownerMemory,cut};}catch(e){e.processReceipt=receipt;throw e;}}
  if(lifetimeMode){try{memory();const ownerMemory=finishMemoryAttribution(attribution);const expected=['opened','baseline',...(mode==='--lifetime-observe'?['held','appended','checkpoint-held','prepared-released','reader-released','direct-released','page-released','pool-released','evidence-released','objects-released']:[]),'released'];if(JSON.stringify(phases)!==JSON.stringify(expected)||owners.length!==(mode==='--lifetime-observe'?10:0))throw Error('lifetime-phase-missing');return {...receipt,owner,attribution:ownerMemory,owners,cut};}catch(e){e.processReceipt=receipt;throw e;}}
  const required=isCopy?['copy-opened','copy-released']:mode==='--state-preseed'?['opened','baseline','released']:['opened','baseline','cyclic','cyclic','checkpoint','released'];if(JSON.stringify(phases.filter(p=>p!=='prestate-progress'))!==JSON.stringify(required))throw Error('native-phase-missing');
  if(!isCopy&&(!cut||(mode!=='--state-preseed'&&progress.length!==2)))throw Error('cyclic-baseline-incomplete');
  return {...receipt,owner,cut,progress};
}
try{
  summary.live=retention?await runRetention():lifetime?await runLifetime():await run(preseed?'--state-preseed':'--mixed-generation',data,false);
  if(retention){if(retentionHistory)summary.fixedActiveGrowingHistory=true;else summary.retentionTwoCycles=true;summary.activeHistoryEvidence=true;summary.resourceReturn=true;summary.recoveryPass=true;summary.spacePass=true;summary.status='PASS';}else if(lifetime){summary.nativeLifetimePass=true;summary.spacePass=true;summary.status='PASS';}else{
  if(preseed){summary.baseline=preseedArtifacts(data);summary.nativePreseedFunctional=true;}
  const before=tree(data);admitWorkspaceSnapshot({storage:{...named(),copyBytes:measure(data).bytes},baseline,context:{kind:'r99-copy-admission'}},capture);
  const snapshot=snapshotTree(data),storage=named();copyVerified(data,copy,snapshot,n=>admitWorkspaceSnapshot({storage:{...storage,copyBytes:n},baseline,context:{kind:'r99-copy-write'}},capture));
  if(tree(copy)!==before)throw Error('copy-bytes');summary.recovery=await run(preseed?'--state-preseed-reopen':'--mixed-generation-reopen',copy,true);
  if(preseed){if(JSON.stringify(preseedArtifacts(copy))!==JSON.stringify(summary.baseline))throw Error('preseed-recovery-binding');summary.recoveryReceipt=JSON.parse(fs.readFileSync(path.join(copy,'preseed-recovery.json')));if(!summary.recoveryReceipt.recovery||!summary.recoveryReceipt.exactLedger||!summary.recoveryReceipt.manifestUnchanged||!summary.recoveryReceipt.finish)throw Error('preseed-recovery-receipt');summary.baselineRecovery=true;}
  if(tree(data)!==before)throw Error('original-changed');summary.originalUnchanged=true;summary.cyclicRecoveryPass=!preseed;summary.spacePass=true;summary.status='PASS';}
}catch(e){first=e;summary.status='FAIL';summary.error=e.message;summary.phaseStatus=e.phaseStatus??null;summary.cleanupError=e.cleanupError??null;if(lifetime||typeof retention!=='undefined'&&retention)summary.artifactError=e.artifactError??null;if(e.processReceipt)summary.failedProcess=e.processReceipt;}
finally{fs.closeSync(samples);try{capture.close();}catch(e){first??=e;summary.status='FAIL';summary.error??=e.message;}summary.workspace=capture.summary();summary.sampleCount=sampleCount;summary.observationLimit='sequential 500ms samples and paused boundary samples; not instantaneous peak';fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});}
console.log(JSON.stringify(summary));if(first)process.exitCode=1;
