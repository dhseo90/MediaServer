// 파일 용도: 녹화 보관소 진단의 단계 관측·소유 복제·원본 보존·정리 경계를 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsePhases,summarizeSpawnDiagnostic,validatedPhaseReceipt,diagnosticRootIdentity,sourceManifest,accumulationStoreReceipt,accumulationParentFailure,accumulationProcessDiagnostic,preserveDiagnosticReceipt,preserveAccumulationReceipt,receiptTree,ownedRoot,snapshotTree,copyVerified,cleanupAllowed,cleanupProfile,exact,instrumentCatalog,instrumentProbe,safeOutput,targetHash,selectReference} from './recording_archive_diagnostic_profile.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),parent=fs.realpathSync(os.tmpdir());
const line=(kind,phase,id,atUs,elapsedUs=0)=>'[archive-phase] '+JSON.stringify({kind,phase,id,atUs,elapsedUs})+'\n';
const complete=line('begin','catalog-open',1,0)+line('begin','open',2,1)+line('end','open',2,4,3)+line('end','catalog-open',1,5,5);
function owned(fn){const root=fs.realpathSync(fs.mkdtempSync(path.join(parent,'media-server-current-integration-')));fs.chmodSync(root,0o700);const identity=ownedRoot(root,parent);
  try{return fn(root,identity);}finally{if(fs.existsSync(root)){const result=cleanupProfile(root,parent,identity,{originalSame:true,sourceSame:true,groupClean:true,evidencePreserved:true});assert(result.removed);assert(!fs.existsSync(root));console.log('[profile-selftest-cleanup] '+JSON.stringify(result));}}}
test('LP23-DH01 phase nesting and completed diagnostic remain distinct from app PASS',()=>{
  const result=parsePhases(complete);assert(result.complete);assert.equal(result.rows.length,4);assert.deepEqual(result.openPhases,[]);assert(!Object.hasOwn(result,'applicationPass'));
  assert.throws(()=>parsePhases(line('begin','open',1,1)+line('end','query',1,2,1)));
  assert.throws(()=>parsePhases(line('begin','open',1,1)+line('end','open',1,4,2)));
});
test('LP23-DH02 timeout preserves last open phase without synthetic completion',()=>{
  const partial=line('begin','catalog-open',1,1)+line('begin','open',2,2)+line('begin','open-preflight',3,3);
  const result=parsePhases(partial,{timeout:true});assert.equal(result.complete,false);assert.equal(result.rows.filter(x=>x.kind==='end').length,0);
  assert.deepEqual(result.openPhases.map(x=>x.phase),['catalog-open','open','open-preflight']);assert.throws(()=>parsePhases(partial));
});
test('LP23-DH03 partial malformed unknown and secret-bearing trace rows reject',()=>owned(root=>{
  const secret='writer-secret-canary-not-for-output';
  for(const input of [complete.trimEnd(),'[archive-phase] {bad}\n',complete.replace('"open"','"unknown"'),complete.replace('"elapsedUs":0','"raw":"'+secret+'","elapsedUs":0')])assert.throws(()=>parsePhases(input));
  const redacted=parsePhases(secret+'\n'+complete);assert.equal(redacted.discardedLines,1);assert(!JSON.stringify(redacted).includes(secret));
  const value={state:'complete',managed:true,jobCount:1,referenceSha256:targetHash,capturedIntentSha256:'a'.repeat(64),sourceCount:2,outputCount:2,plannedOutputCount:2,fileReceiptCount:2,copyCatalogOpened:true,snapshotBasis:'offline-copy-at-query',failureTimeEquivalent:false,remuxPerformed:false};
  const dest=path.join(root,'state.json');assert.equal(safeOutput(JSON.stringify(value),true,dest).state,'complete');
  assert.throws(()=>safeOutput(JSON.stringify({...value,raw:secret}),true,path.join(root,'unsafe.json')));assert(!fs.existsSync(path.join(root,'unsafe.json')));
}));
test('O28-D01 child termination classes and bounded metadata remain distinct',()=>{
  const base={stdout:'{}\n',stderr:complete,status:1,signal:null,error:undefined};
  assert.deepEqual(summarizeSpawnDiagnostic(base,{elapsedMs:12.6}),{status:1,signal:null,errorCode:null,failureCode:null,elapsedMs:13,outputBytes:Buffer.byteLength('{}\n'+complete),lastOpenedPhase:'open',lastCompletedPhase:'catalog-open',traceStatus:'complete',traceLoss:false,rawOutputPublished:false});
  assert.equal(summarizeSpawnDiagnostic({...base,status:null,error:{code:'ETIMEDOUT'}}).errorCode,'timeout');
  assert.equal(summarizeSpawnDiagnostic({...base,status:null,error:{code:'ENOBUFS'}}).errorCode,'output-cap');
  assert.equal(summarizeSpawnDiagnostic({...base,status:null,error:{code:'ESECRET'},signal:'bad/path'}).errorCode,'unknown');
  assert.equal(summarizeSpawnDiagnostic({...base,status:null,error:{code:'ESECRET'},signal:'bad/path'}).signal,'unknown');
  assert.equal(summarizeSpawnDiagnostic({...base,status:null,signal:'SIGKILL'}).signal,'SIGKILL');
});
test('O28-D02 missing partial malformed loss and incomplete traces never synthesize completion',()=>{
  assert.equal(summarizeSpawnDiagnostic({stdout:'',stderr:'',status:1}).traceStatus,'missing');
  const partial=line('begin','catalog-open',1,0)+'[archive-phase] {"kind":"begin"';
  const p=summarizeSpawnDiagnostic({stdout:'',stderr:partial,status:null,error:{code:'ETIMEDOUT'}});assert.equal(p.traceStatus,'partial');assert.equal(p.lastOpenedPhase,'catalog-open');assert.equal(p.lastCompletedPhase,null);
  const malformed=summarizeSpawnDiagnostic({stdout:'',stderr:line('begin','catalog-open',1,0)+'[archive-phase] {bad}\n',status:1});assert.equal(malformed.traceStatus,'malformed');assert.equal(malformed.lastOpenedPhase,'catalog-open');
  const incomplete=summarizeSpawnDiagnostic({stdout:'',stderr:line('begin','catalog-open',1,0),status:1});assert.equal(incomplete.traceStatus,'incomplete');assert.equal(incomplete.traceLoss,false);
  const loss=summarizeSpawnDiagnostic({stdout:'',stderr:line('begin','catalog-open',1,0)+'[archive-phase] {"kind":"loss"}\n',status:1});assert.equal(loss.traceStatus,'loss');assert.equal(loss.traceLoss,true);
});
function receiptFixture(root,{childError=null,stderr=complete}={}){const entries=['catalog-source','catalog-instrumented','runtime-archive','native-source','trace-header'].map((name,index)=>{const file=path.join(root,'source-'+index);fs.writeFileSync(file,String(index),{mode:0o600});return {name,file};}),manifest=sourceManifest(entries),tree={bytes:5,count:2,sha256:'a'.repeat(64),items:[{pathSha256:'b'.repeat(64),bytes:5,sha256:'c'.repeat(64)}]};
  return {entries,receipt:{schema:'media-server.recording-diagnostic-receipt.v1',profile:'current-observer-snapshot',child:summarizeSpawnDiagnostic({status:childError?null:0,signal:null,error:childError?{code:childError}:undefined,stdout:'{}\n',stderr},{elapsedMs:7}),trace:validatedPhaseReceipt(stderr),
    command:{name:'recording-current-observer-native',args:['--snapshot','owned-copy'],timeoutMs:15000,maxBuffer:16384},sourceTree:tree,copyTree:structuredClone(tree),originalUnchanged:true,manifestUnchanged:true,groupClosed:childError===null,
    limits:{treeBytes:448*1024*1024,treeEntries:4096},manifest,rawPathsPublished:false}};}
test('O28-R01 known failure와 timeout receipt를 원문 없이 immutable 선보존',()=>owned(root=>{for(const [name,error] of [['exit',null],['timeout','ETIMEDOUT']]){const {receipt}=receiptFixture(root,{childError:error}),file=path.join(root,name+'.json'),saved=preserveDiagnosticReceipt({evidencePath:file,receipt});assert(saved.preserved);assert.equal(fs.statSync(file).mode&0o777,0o600);assert(!fs.readFileSync(file,'utf8').includes(root));assert.throws(()=>preserveDiagnosticReceipt({evidencePath:file,receipt}));}}));
test('O28-R02 partial trace는 검증된 prefix/open phase만 receipt에 보존',()=>owned(root=>{const stderr=line('begin','catalog-open',1,0)+'[archive-phase] {"kind":"begin"',{receipt}=receiptFixture(root,{childError:'ETIMEDOUT',stderr});const file=path.join(root,'partial.json');preserveDiagnosticReceipt({evidencePath:file,receipt});const saved=JSON.parse(fs.readFileSync(file)).receipt;assert.equal(saved.trace.status,'partial');assert.equal(saved.trace.rows.length,1);assert.equal(saved.trace.openPhases[0].phase,'catalog-open');assert(!JSON.stringify(saved).includes('[archive-phase]'));}));
test('O28-R02 loss row는 고정형만 receipt에 보존',()=>owned(root=>{const stderr=line('begin','catalog-open',1,0)+'[archive-phase] {"kind":"loss"}\n',{receipt}=receiptFixture(root,{childError:'ENOBUFS',stderr}),file=path.join(root,'loss.json');preserveDiagnosticReceipt({evidencePath:file,receipt});const saved=JSON.parse(fs.readFileSync(file)).receipt;assert.equal(saved.trace.status,'loss');assert.deepEqual(saved.trace.rows.at(-1),{kind:'loss'});}));
test('O28-R03 source manifest symlink와 receipt schema 변조를 fail closed',()=>owned(root=>{const {entries,receipt}=receiptFixture(root),target=entries[0].file,alias=path.join(root,'alias');fs.symlinkSync(target,alias);assert.throws(()=>sourceManifest([{name:'catalog-source',file:alias}]));for(const changed of [{...receipt,rawPathsPublished:true},{...receipt,manifestUnchanged:'yes'},{...receipt,command:{...receipt.command,timeoutMs:15001}}])assert.throws(()=>preserveDiagnosticReceipt({evidencePath:path.join(root,crypto.randomUUID()+'.json'),receipt:changed}));}));
test('O28-R04 동일 입력 receipt 재실행 동등성과 cleanup proof 네 조건',()=>owned(root=>{const {receipt}=receiptFixture(root),a=path.join(root,'a.json'),b=path.join(root,'b.json');preserveDiagnosticReceipt({evidencePath:a,receipt});preserveDiagnosticReceipt({evidencePath:b,receipt});assert.deepEqual(fs.readFileSync(a),fs.readFileSync(b));const proof={originalSame:true,sourceSame:true,groupClean:true,evidencePreserved:true};assert(cleanupAllowed(proof));for(const key of Object.keys(proof))assert(!cleanupAllowed({...proof,[key]:false}));const parent=fs.realpathSync(os.tmpdir()),diagnostic=fs.realpathSync(fs.mkdtempSync(path.join(parent,'media-server-current-observer-copy-')));fs.chmodSync(diagnostic,0o700);const identity=diagnosticRootIdentity(diagnostic,parent,'current-observer-snapshot');assert.throws(()=>diagnosticRootIdentity(diagnostic,parent,'accumulation-probe'));assert.throws(()=>cleanupProfile(diagnostic,parent,{dev:Number(identity.dev),ino:Number(identity.ino)+1},proof));fs.rmSync(diagnostic,{recursive:true});}));
test('O28-R04 accumulation receipt는 최초 실패·미종료 group·고정 진단을 결속',()=>owned(root=>{const {receipt}=receiptFixture(root),manifest=receipt.manifest.slice(0,5),process=accumulationProcessDiagnostic({mode:'--catalog',selectedCase:'2048',status:0,stop:'time-cap',elapsedMs:3.6,groupClosed:false}),value={schema:'media-server.recording-accumulation-receipt.v1',profile:'accumulation-probe',outcome:'fail',selectedCase:'2048',parentFailureCode:'time-cap',groupClosed:false,manifestUnchanged:true,processes:[process],firstFailureIndex:0,command:{name:'recording-accumulation-run',args:['2048']},storeManifest:receipt.sourceTree,manifest,rawPathsPublished:false},file=path.join(root,'accumulation.json');assert.deepEqual(process,{mode:'--catalog',selectedCase:'2048',status:0,signal:null,stop:'time-cap',elapsedMs:4,groupClosed:false});assert(preserveAccumulationReceipt({evidencePath:file,receipt:value}).preserved);for(const changed of [{...value,selectedCase:'2047'},{...value,groupClosed:true},{...value,firstFailureIndex:null},{...value,processes:[{...process,detail:'secret'}]}])assert.throws(()=>preserveAccumulationReceipt({evidencePath:path.join(root,crypto.randomUUID()+'.json'),receipt:changed}));}));
test('O28-R04 parent drain 실패는 성공 child와 별도로 receipt에 보존',()=>owned(root=>{const {receipt}=receiptFixture(root),process=accumulationProcessDiagnostic({mode:'--generate',selectedCase:'16',status:0,groupClosed:true}),value={schema:'media-server.recording-accumulation-receipt.v1',profile:'accumulation-probe',outcome:'fail',selectedCase:'16',parentFailureCode:accumulationParentFailure(Error('drain-oracle')),groupClosed:true,manifestUnchanged:true,processes:[process],firstFailureIndex:null,command:{name:'recording-accumulation-run',args:['16']},storeManifest:receipt.sourceTree,manifest:receipt.manifest.slice(0,5),rawPathsPublished:false};assert(preserveAccumulationReceipt({evidencePath:path.join(root,'parent.json'),receipt:value}).preserved);assert.equal(accumulationParentFailure(Error('/private/secret')),'unknown');assert.throws(()=>preserveAccumulationReceipt({evidencePath:path.join(root,'bad-parent.json'),receipt:{...value,parentFailureCode:'raw-secret'}}));}));
test('O28-R04 실제 synthetic child group의 열린 상태와 종료를 구분',async()=>{const child=spawn(process.execPath,['-e','setInterval(()=>{},100)'],{stdio:'ignore',detached:true}),closed=once(child,'close');await once(child,'spawn');try{assert.doesNotThrow(()=>process.kill(-child.pid,0));const diagnostic=accumulationProcessDiagnostic({mode:'--catalog',selectedCase:'16',status:null,stop:'time-cap',groupClosed:false});assert.equal(diagnostic.stop,'time-cap');assert.equal(diagnostic.groupClosed,false);}finally{try{process.kill(-child.pid,'SIGTERM');}catch{}await closed;}assert.throws(()=>process.kill(-child.pid,0),error=>error?.code==='ESRCH');});
test('O28-R04 source manifest는 실행 전 snapshot과 동일 길이 사후 변조를 구분',()=>owned(root=>{const file=path.join(root,'source');fs.writeFileSync(file,'before',{mode:0o600});const entries=[{name:'accumulation-runner',file}],before=sourceManifest(entries);fs.writeFileSync(file,'after!');const after=sourceManifest(entries);assert.equal(before[0].bytes,after[0].bytes);assert.notEqual(before[0].sha256,after[0].sha256);assert.notDeepEqual(before,after);}));
test('O28-M01 ownership receipt는 성공 전체·generate 실패 prefix·default null command를 구분',()=>owned(root=>{const {receipt}=receiptFixture(root),manifest=receipt.manifest.slice(0,5),base={schema:'media-server.recording-accumulation-receipt.v1',profile:'accumulation-probe',parentFailureCode:null,groupClosed:true,manifestUnchanged:true,storeManifest:receipt.sourceTree,manifest,rawPathsPublished:false},processes=[accumulationProcessDiagnostic({mode:'--generate',selectedCase:'16',status:0,groupClosed:true}),accumulationProcessDiagnostic({mode:'--ownership',selectedCase:'16',status:0,groupClosed:true}),accumulationProcessDiagnostic({mode:'--ownership-reopen',selectedCase:'16',status:0,groupClosed:true})],value={...base,outcome:'pass',selectedCase:'16',processes,firstFailureIndex:null,command:{name:'recording-accumulation-run',args:['16','ownership']}};assert(preserveAccumulationReceipt({evidencePath:path.join(root,'ownership.json'),receipt:value}).preserved);assert.throws(()=>preserveAccumulationReceipt({evidencePath:path.join(root,'wrong.json'),receipt:{...value,command:{...value.command,args:['16']}}}));
 const failed=accumulationProcessDiagnostic({mode:'--generate',selectedCase:'16',status:1,groupClosed:true});assert(preserveAccumulationReceipt({evidencePath:path.join(root,'prefix.json'),receipt:{...base,outcome:'fail',selectedCase:'16',processes:[failed],firstFailureIndex:0,command:{name:'recording-accumulation-run',args:['16','ownership']}}}).preserved);
 const bounds=accumulationProcessDiagnostic({mode:'--bounds',status:0,groupClosed:true});assert(preserveAccumulationReceipt({evidencePath:path.join(root,'default.json'),receipt:{...base,outcome:'pass',selectedCase:null,processes:[bounds],firstFailureIndex:null,command:{name:'recording-accumulation-run',args:[]}}}).preserved);
}));
test('O28-C04 accumulation store receipt는 case 저장소만 결속하고 root 도구 symlink는 제외',()=>{const root=fs.realpathSync(fs.mkdtempSync(path.join(parent,'media-server-catalog-cost.'))),alias=root+'-alias';fs.chmodSync(root,0o700);try{for(const value of ['16','1020','2048','2049']){const dir=path.join(root,'case-'+value);fs.mkdirSync(dir,{mode:0o700});fs.writeFileSync(path.join(dir,'journal'),value,{mode:0o600});}fs.symlinkSync('/dev/null',path.join(root,'tool-link'));assert.throws(()=>snapshotTree(root),/tree-owner/);const receipt=accumulationStoreReceipt(root);assert.equal(receipt.items.length,4);assert.equal(receipt.bytes,14);const selected=accumulationStoreReceipt(root,'2048');assert.equal(selected.items.length,1);assert.equal(selected.bytes,4);assert.throws(()=>accumulationStoreReceipt(root,'2047'),/accumulation-case/);fs.symlinkSync(root,alias);assert.throws(()=>accumulationStoreReceipt(alias,'16'));fs.unlinkSync(alias);fs.symlinkSync('/dev/null',path.join(root,'case-2048','bad'));assert.throws(()=>accumulationStoreReceipt(root,'2048'),/tree-owner/);}finally{try{fs.unlinkSync(alias);}catch(error){if(error?.code!=='ENOENT')throw error;}fs.rmSync(root,{recursive:true,force:true});assert(!fs.existsSync(root));}});
test('LP23-DH04 owned nofollow copy preserves every byte and rejects foreign scope',()=>owned(root=>{
  const source=path.join(root,'recordings');fs.mkdirSync(source,{mode:0o700});fs.mkdirSync(path.join(source,'empty'),{mode:0o700});
  fs.writeFileSync(path.join(source,'input.bin'),Buffer.from([0,10,13,255]),{mode:0o600});const before=snapshotTree(source);
  const copy=copyVerified(source,path.join(root,'projection-copy-1/recordings'),before);assert.equal(copy.sha256,before.sha256);assert(fs.existsSync(path.join(root,'projection-copy-1/recordings/empty')));
  assert.throws(()=>ownedRoot(root,path.join(parent,'foreign')));fs.symlinkSync(path.join(source,'input.bin'),path.join(source,'alias'));assert.throws(()=>snapshotTree(source));fs.unlinkSync(path.join(source,'alias'));
  fs.linkSync(path.join(source,'input.bin'),path.join(source,'hard'));assert.throws(()=>snapshotTree(source));fs.unlinkSync(path.join(source,'hard'));
  const reference='fixture-reference',journal=path.join(source,'journal');fs.writeFileSync(journal,JSON.stringify({mutationType:'consumer_reference_put',entityId:reference,payload:{reference:{reference_id:reference}}})+'\n');
  assert.equal(selectReference(journal,crypto.createHash('sha256').update(reference).digest('hex')),reference);assert.throws(()=>selectReference(journal));
}));
test('LP23-DH05 changed original or unconfirmed child blocks cleanup',()=>owned((root,identity)=>{
  const source=path.join(root,'recordings');fs.mkdirSync(source,{mode:0o700});fs.writeFileSync(path.join(source,'row'),Buffer.from('a'),{mode:0o600});const before=snapshotTree(source);
  fs.writeFileSync(path.join(source,'row'),Buffer.from('b'));assert.notEqual(snapshotTree(source).sha256,before.sha256);
  const proof={originalSame:true,sourceSame:true,groupClean:true,evidencePreserved:true};
  for(const key of Object.keys(proof)){assert.equal(cleanupAllowed({...proof,[key]:false}),false);assert.throws(()=>cleanupProfile(root,parent,identity,{...proof,[key]:false}));assert(fs.existsSync(root));}
  assert.throws(()=>cleanupProfile(root,parent,{...identity,ino:identity.ino+1},proof));
}));
test('B06-V04 generation observation 실제 header fingerprint를 receipt에 보존',()=>owned(root=>{
  const {entries,receipt}=receiptFixture(root),file=path.join(here,'recording_generation_observation.h');
  const entry={name:'generation-observation',file};const raw=fs.readFileSync(file);
  receipt.manifest=sourceManifest([...entries,entry]);
  const expected={name:entry.name,bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex')};
  assert.deepEqual(receipt.manifest.at(-1),expected);
  const evidencePath=path.join(root,'generation.json');assert(preserveDiagnosticReceipt({evidencePath,receipt}).preserved);
  assert.deepEqual(JSON.parse(fs.readFileSync(evidencePath)).receipt.manifest.at(-1),expected);
  assert.throws(()=>sourceManifest([...entries,entry,entry]),/manifest-name/);
  assert.throws(()=>sourceManifest([{...entry,name:'generation-observation-other'}]),/manifest-name/);
}));
test('LP23-DH06 exact instrumentation drift and trace bounds fail closed',()=>owned(root=>{
  assert.throws(()=>exact('a a','a','b'));assert.throws(()=>exact('','a','b'));
  const catalog=fs.readFileSync(path.resolve(here,'../../src/recording/recording_catalog.cpp'),'utf8');
  const probe=fs.readFileSync(path.join(here,'recording_current_archive_probe.cpp'),'utf8');
  const instrumented=instrumentCatalog(catalog);assert(instrumented.includes('Phase::RebuildProject'));assert(instrumented.includes('Phase::RebuildPreflight'));assert(instrumentProbe(probe).includes('copy,true)'));assert(instrumentProbe(probe,{jsonl:true}).includes('copy,false)'));
  const journalAnchor='recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{copy,{},limits});';
  assert(instrumentProbe(probe).includes('std::make_unique<recording::RecordingJournal>(recording::RecordingJournal::ManagedOptions{copy,{},limits})'));
  assert.throws(()=>instrumentProbe(probe.replace(journalAnchor,journalAnchor+journalAnchor)),/instrument-anchor/);
  assert.throws(()=>instrumentProbe(probe.replace(journalAnchor,journalAnchor.replace(',{},limits',',{}'))),/instrument-anchor/);
  assert.throws(()=>instrumentCatalog(catalog.replace('bool RecordingCatalog::OpenLocked(std::string* error) {','changed')));
  const cpp=path.join(root,'collector.cpp'),binary=path.join(root,'collector');
  fs.writeFileSync(cpp,'#include "recording_archive_phase_trace.h"\nint main(){try{archive_phase::Scope s(archive_phase::Phase::Query);throw 1;}catch(...){}for(int i=0;i<200;++i){archive_phase::Scope s(archive_phase::Phase::Release);}return 0;}\n',{mode:0o600});
  const env={PATH:process.env.PATH,TMPDIR:root,LANG:'C',LC_ALL:'C',MEDIA_SERVER_ARCHIVE_PHASE_TRACE:'1'};
  const compile=spawnSync('c++',['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-I'+here,cpp,'-o',binary],{env,encoding:'utf8',timeout:30000,maxBuffer:131072});assert.equal(compile.status,0,'native collector compile');
  const run=spawnSync(binary,[],{env,encoding:'utf8',timeout:10000,maxBuffer:131072});assert.equal(run.status,0,'native collector exit');
  console.log('[profile-native] '+JSON.stringify({compileExit:compile.status,runExit:run.status,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(cpp)).digest('hex'),binarySha256:crypto.createHash('sha256').update(fs.readFileSync(binary)).digest('hex')}));
  const trace=parsePhases(run.stderr,{timeout:true});assert.equal(trace.rows.length,256);assert(trace.loss);assert.equal(trace.rows[1].kind,'end');assert.equal(trace.rows[1].phase,'query');assert(Buffer.byteLength(run.stderr)<=131072);assert.equal(run.stdout,'');
}));
