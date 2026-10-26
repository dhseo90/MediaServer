import test from 'node:test';
import assert from 'node:assert/strict';
import {selection,aSelection,costCollector,checkpointSearchPerformanceReport,createOfficialObservationEvidence,verifyOfficialObservationEvidence,officialObservationKinds,officialObservationLimits,preserveOfficialHttpError,verifyOfficialHttpErrorEvidence,officialHttpBodyLimits,createOfficialRemainingEvidence,verifyOfficialRemainingEvidence,officialRemainingLimits} from './recording_accumulated_cost.mjs';
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {resourceTraceCollector,collectResourceTrace,currentResourceTrace} from './recording_resource_trace.mjs';
import {freezeCurrentWorkspace,measureCurrentWorkspace,measureCurrentRootStable,workspaceBounds,admitWorkspaceSnapshot,createWorkspaceFailureCapture} from './recording_current_observer.mjs';

// S03-REPLAY-INPUT-F01: 외부 자료 검사는 명시 opt-in이다. 일반 Mock/Gate와 별개.
// parent: S03_PARENT_OUTPUT_REPLAY=1 + S03_PARENT_OUTPUT_EVIDENCE (parent.log/diagnostic/report.json).
// closeout: S03_CLOSEOUT_REPLAY=1 + MEDIA_SERVER_S03_RUNNER_CANDIDATE,
// MEDIA_SERVER_S03_RUNNER_SHA256, MEDIA_SERVER_S03_FINALIZER (검토한 절대 경로/고정 SHA).
// Runner main()은 호출하지 않는다. 이미 소비한 패키지도 읽기 전용 Replay 가능하며 Claim은 불변이다.
const replayFlags={parent:'S03_PARENT_OUTPUT_REPLAY',closeout:'S03_CLOSEOUT_REPLAY'};
const finalizerSha='af234c2f9d1003220f79800a965962f01b820927517226430522256e2a81b200';
function replayFile(file,label,expectedSha){
 assert(file&&path.isAbsolute(file),label+' requires an absolute path');
 const st=fs.lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink(),label+' requires a regular file');
 if(expectedSha!==undefined){
  assert.match(expectedSha,/^[a-f0-9]{64}$/,label+' requires a SHA256');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),expectedSha,label+' SHA256 mismatch');
 }
 return file;
}
function replayInputs(kind,env=process.env){
 assert.equal(env[replayFlags[kind]],'1',replayFlags[kind]+' must equal 1');
 if(kind==='parent'){
  const root=env.S03_PARENT_OUTPUT_EVIDENCE;assert(root&&path.isAbsolute(root),'S03_PARENT_OUTPUT_EVIDENCE requires an absolute directory');
  replayFile(path.join(root,'parent.log'),'parent.log','2d6cd76d328e8bee6b16b85c439a6a07f85df515d7fc616bfda3c781030f611c');
  const report=replayFile(path.join(root,'diagnostic/report.json'),'report.json');JSON.parse(fs.readFileSync(report));
  return {root};
 }
 assert(env.MEDIA_SERVER_S03_RUNNER_SHA256,'MEDIA_SERVER_S03_RUNNER_SHA256 required');
 return {runner:replayFile(env.MEDIA_SERVER_S03_RUNNER_CANDIDATE,'MEDIA_SERVER_S03_RUNNER_CANDIDATE',env.MEDIA_SERVER_S03_RUNNER_SHA256),
  finalizer:replayFile(env.MEDIA_SERVER_S03_FINALIZER,'MEDIA_SERVER_S03_FINALIZER',finalizerSha)};
}
function replayClaim(runner){
 const file=path.join(path.dirname(runner),'claimed.json');
 try{const st=fs.lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink(),'replay claim regular file');
  return {bytes:fs.readFileSync(file),dev:st.dev,ino:st.ino,mode:st.mode,mtimeMs:st.mtimeMs};
 }catch(error){if(error.code==='ENOENT')return null;throw error;}
}
function replayTest(kind,name,run){
 test(name,{skip:process.env[replayFlags[kind]]===undefined?replayFlags[kind]+' not selected (external replay only)':false},async()=>{
  const input=replayInputs(kind),before=input.runner?replayClaim(input.runner):null;
  try{await run(input);}finally{if(input.runner)assert.deepEqual(replayClaim(input.runner),before,'read-only replay must preserve Claim');}
 });
}
test('external replay inputs: explicit selection and required paths fail closed',()=>{
 assert.throws(()=>replayInputs('parent',{}),/must equal 1/);
 assert.throws(()=>replayInputs('parent',{S03_PARENT_OUTPUT_REPLAY:'0'}),/must equal 1/);
 assert.throws(()=>replayInputs('parent',{S03_PARENT_OUTPUT_REPLAY:'1'}),/absolute directory/);
 assert.throws(()=>replayInputs('closeout',{S03_CLOSEOUT_REPLAY:'1'}),/SHA256 required/);
 assert.throws(()=>replayInputs('closeout',{S03_CLOSEOUT_REPLAY:'1',MEDIA_SERVER_S03_RUNNER_SHA256:'a'.repeat(64)}),/absolute path/);
 const root=fs.mkdtempSync('/private/tmp/media-server-replay-input-mock-');
 try{
  const file=path.join(root,'synthetic.py');fs.writeFileSync(file,'synthetic; never imported');
  assert.throws(()=>replayFile(path.join(root,'missing'),'missing'),{code:'ENOENT'});
  assert.throws(()=>replayFile(root,'directory'),/regular file/);
  assert.throws(()=>replayFile(file,'invalid','bad'),/requires a SHA256/);
  assert.throws(()=>replayFile(file,'mismatch','0'.repeat(64)),/SHA256 mismatch/);
  const digest=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(replayFile(file,'valid',digest),file);
  assert.throws(()=>replayInputs('closeout',{S03_CLOSEOUT_REPLAY:'1',MEDIA_SERVER_S03_RUNNER_CANDIDATE:file,MEDIA_SERVER_S03_RUNNER_SHA256:digest}),/MEDIA_SERVER_S03_FINALIZER requires an absolute path/);
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

// S03-REVIEW-PUBLICATION-F01: synthetic files; no product/helper/HTTP execution.
function reviewPublicationCase(run,{top='recordings',directory='va-reviews',data=Buffer.from('MSVAR03\n{"synthetic":true}')}={}){
 const root=fs.mkdtempSync('/private/tmp/media-server-review-focused-');fs.chmodSync(root,0o700);
 const dir=path.join(root,top,directory);fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const pending=path.join(dir,'.pending-review-v1'),final=path.join(dir,'vr-'+crypto.createHash('sha256').update(data).digest('hex')+'.review');
 fs.writeFileSync(pending,data,{flag:'wx',mode:0o600});fs.linkSync(pending,final);
 try{return run({root,dir,pending,final,data,options:{recordingTop:top}});}
 finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
}
for(const entry of ['pending','final'])for(const top of ['recordings','recording'])test('review publication: complete '+entry+' '+top,()=>reviewPublicationCase(({root,pending,final,data,options})=>{
 let completed=false,pendingReads=0;
 const measured=measureCurrentRootStable(root,{...options,lstat:file=>{
  const st=fs.lstatSync(file);
  // Force final-first observation without changing the physical pair.
  if(file===pending&&entry==='final'&&++pendingReads===1)return Object.assign(Object.create(st),{nlink:1});
  if(!completed&&((entry==='pending'&&file===final)||(entry==='final'&&file===pending&&pendingReads===2))){fs.unlinkSync(pending);completed=true;}
  return st;
 }});
 assert(completed);assert.equal(measured.transientTreeRetries,1);assert.equal(measured.totalBytes,data.length);
 assert.equal(measured.categories.recordingsOther.files,1);assert.equal(fs.lstatSync(final).nlink,1);
},{top}));
for(const mode of ['persistent','missing','wrong-name','different-inode','third-link','other-directory','other-top','symlink','mode','owner','magic','size','permission'])test('review publication: fail closed '+mode,()=>reviewPublicationCase(({root,dir,pending,final,data,options})=>{
 let expected=/root-unsafe-file/;let lstat=fs.lstatSync;
 if(mode==='persistent')expected=/root-review-publication-retry-exhausted/;
 if(mode==='missing')fs.renameSync(pending,path.join(dir,'unknown'));
 if(mode==='wrong-name')fs.renameSync(final,path.join(dir,'vr-'+'0'.repeat(64)+'.review'));
 if(mode==='different-inode'){fs.unlinkSync(final);fs.writeFileSync(final,data,{mode:0o600});fs.linkSync(pending,path.join(dir,'unknown'));}
 if(mode==='third-link')fs.linkSync(pending,path.join(dir,'third'));
 if(mode==='other-top')options.recordingTop='recording';
 if(mode==='symlink'){fs.unlinkSync(final);fs.symlinkSync(pending,final);expected=/root-unsafe-symlink/;}
 if(mode==='mode')fs.chmodSync(pending,0o644);
 if(mode==='owner')lstat=file=>{const st=fs.lstatSync(file);return st.isFile()?Object.assign(Object.create(st),{uid:process.getuid()+1}):st;};
 if(mode==='permission')lstat=file=>{if(file===pending)throw Object.assign(Error('denied'),{code:'EACCES'});return fs.lstatSync(file);};
 if(mode==='permission')assert.throws(()=>measureCurrentRootStable(root,{...options,lstat}),{code:'EACCES'});
 else assert.throws(()=>measureCurrentRootStable(root,{...options,lstat}),expected);
 assert(fs.existsSync(mode==='missing'?path.join(dir,'unknown'):pending)); // failed scanner never mutates evidence
},{directory:mode==='other-directory'?'other':'va-reviews',data:mode==='magic'?Buffer.from('NOTVAR03\n{}'):mode==='size'?Buffer.alloc(128*1024+9):undefined}));
test('review publication: already unlinked stale stat retries whole tree',()=>reviewPublicationCase(({root,pending,final,data})=>{
 let done=false;const r=measureCurrentRootStable(root,{lstat:file=>{const st=fs.lstatSync(file);if(!done&&file===pending){fs.unlinkSync(pending);done=true;}return st;}});
 assert(done);assert(r.transientTreeRetries>=1);assert.equal(r.totalBytes,data.length);
}));
test('review publication: existing media retry budget and single link accounting unchanged',()=>reviewPublicationCase(({root,dir,pending,final,data})=>{
 fs.unlinkSync(pending);assert.equal(measureCurrentRootStable(root).totalBytes,data.length);
 const media=path.join(dir,'test.mp4'),partial=media+'.partial.12345678-1234-1234-1234-123456789abc';fs.writeFileSync(partial,'12345',{mode:0o600});fs.linkSync(partial,media);
 assert.throws(()=>measureCurrentRootStable(root),/root-media-publication-retry-exhausted/);
 fs.unlinkSync(partial);assert.equal(measureCurrentRootStable(root).totalBytes,data.length+5);
}));
test('review publication: product publication and bounded retry contract binding',()=>{
 const src=fs.readFileSync('src/recording/va_review_store.cpp','utf8'),observer=fs.readFileSync('scripts/internal/recording_current_observer.mjs','utf8');
 for(const t of ['pending=".pending-review-v1"','::linkat(dir.n,pending,dir.n,(result+".review").c_str(),0)','::fsync(dir.n)||::unlinkat(dir.n,pending,0)||::fsync(dir.n)','const auto result="vr-"+digest','EvidenceSha256(bytes.data(),bytes.size())'])assert(src.includes(t),t);
 assert(fs.readFileSync('include/recording/va_review_store.h','utf8').includes('record_bytes{128*1024}'));
 assert(observer.includes('mediaPublicationRetries++>=31'));assert(observer.includes('missingRetries++>=2'));
 assert(observer.includes("if(stat.nlink!==1)throw rootFileRejection"));
 assert.equal(workspaceCap,469762048);assert.equal(workspaceReserve,6291456);
});

// S03-WORKSPACE-LIFETIME-F01: real file accounting with synthetic files only.
const workspaceCap=448*1024*1024,workspaceReserve=6*1024*1024;
function workspaceCase(run){
 const parent=fs.mkdtempSync('/private/tmp/media-server-workspace-focused-');fs.chmodSync(parent,0o700);
 const root=path.join(parent,'work/media-server-current-observer-s03');fs.mkdirSync(root,{recursive:true,mode:0o700});
 const put=(name,n)=>{const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true,mode:0o700});const fd=fs.openSync(p,'wx',0o600);try{fs.ftruncateSync(fd,n);}finally{fs.closeSync(fd);}return p;};
 try{for(const name of ['input/retention-9101.mp4','input/retention-9201.mp4','normalize','process-metrics','catalog-instrumented.cpp'])put(name,11);
  return run({parent,root,put,baseline:freezeCurrentWorkspace(root)});
 }finally{fs.rmSync(parent,{recursive:true});assert(!fs.existsSync(parent));}
}
test('official workspace: evidence reservation counted once, not allocated or a product quota',()=>{
 const observation=64*1024*1024+2*32768,http=4*1024*1024+2*32768,remaining=64*(1024*1024-1)+32768;
 assert.equal(observation,67174400);assert.equal(http,4259840);assert.equal(remaining,67141568);
 assert.equal(officialRemainingLimits.chunkBytes*officialRemainingLimits.chunks+officialRemainingLimits.manifestBytes,remaining);
 const evidence=observation+http+remaining,partial=evidence+2*108*1024*1024+64*1024*1024;
 assert.equal(evidence,138575808);assert.equal(partial,432177088);
 assert.equal(workspaceCap-partial-workspaceReserve,31293504);
 assert.equal(66+7+65,138);
 // This is a partial envelope. Native/index/DB and seed helper are not free.
 assert(partial+workspaceReserve<workspaceCap);
 assert(partial+workspaceReserve+32*1024*1024>=workspaceCap);
});
test('official workspace: actual fixed variable categories, both channels and atomic overlap',()=>workspaceCase(({root,put,baseline})=>{
 const rows=[['recordings/9101/a.mp4',101,'media'],['recordings/9201/b.mp4',103,'media'],
  ['recordings/recording-generation-catalog.sqlite3',107,'sqlite'],['recordings/recording-generation-catalog.sqlite3-wal',109,'wal'],
  ['recordings/recording-generation-catalog.sqlite3-journal',113,'sqliteAux'],['recordings/active-1.jsonl',127,'journal'],
  ['recordings/snapshot-1.jsonl',131,'generationSnapshot'],['recordings/.recording-generation-prepare-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/snapshot-2.jsonl',137,'generationTransaction'],
  ['recordings/visual-cache/index.v1',139,'recordingsOther'],['recordings/visual-cache/.visual-software-pending.v1',149,'recordingsOther'],
  ['recordings/va-reviews/test.review',151,'recordingsOther'],['recordings/evidence-packages/test.evp',157,'recordingsOther'],
  ['tmp/native-scratch',163,'tmp'],['state/sources.json',167,'state'],['events/metadata.jsonl',173,'events'],
  ['server-1.private.log',179,'log'],['review-seed',181,'other'],['input/a-seed.mp4',191,'input'],
  ['recordings/9101/a.mp4.partial.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',193,'mediaPartial']];
 const expected={input:22,tools:22,other:11};
 for(const [name,n,kind] of rows){put(name,n);expected[kind]=(expected[kind]??0)+n;}
 const measured=measureCurrentWorkspace(root,baseline),sum=rows.reduce((n,r)=>n+r[1],0);
 assert.equal(measured.fixedBytes,55);assert.equal(measured.variableBytes,sum);assert.equal(measured.copyBytes,0);
 for(const [kind,bytes] of Object.entries(expected))assert.equal(measured.categories[kind].bytes,bytes,kind);
 // Final and pending index/generation coexist until actual unlink/rename.
 const pending=path.join(root,rows[9][0]);assert.equal(measureCurrentWorkspace(root,baseline).variableBytes,sum);
 fs.unlinkSync(pending);assert(!fs.existsSync(pending));assert.equal(measureCurrentWorkspace(root,baseline).variableBytes,sum-149);
 fs.appendFileSync(path.join(root,'normalize'),'changed');assert.throws(()=>measureCurrentWorkspace(root,baseline),/workspace-fixed-changed/);
}));
test('official workspace: strict variable copy combined edges and closeout admission',()=>{
 const F=55,C=workspaceCap,R=workspaceReserve,sink={capture(){}};
 for(const [v,c] of [[0,0],[C-1,0],[0,C-1],[C-1,C-1]]){
  const r=workspaceBounds(F+v,F,c,C);assert.equal(r.combinedBytes,F+v+c);assert(r.combinedBytes<F+2*C);
 }
 for(const [v,c] of [[C,0],[C+1,0],[0,C],[C-1,C+1],[C,C]])assert.throws(()=>workspaceBounds(F+v,F,c,C),/workspace-(variable|copy)-cap/);
 // Combined equality is unreachable after both strict component checks pass.
 assert.equal(workspaceBounds(F+C-1,F,C-1,C).combinedCapBytes,F+2*C);
 const input={storage:{totalBytes:F+C-R-1,copyBytes:0},baseline:{fixedBytes:F,capBytes:C},additionalBytes:R};
 assert.equal(admitWorkspaceSnapshot(input,sink).variableBytes,C-1);
 assert.throws(()=>admitWorkspaceSnapshot({...input,additionalBytes:R+1},sink),/workspace-variable-cap/);
});
test('official workspace: native anonymous plus reservation and sticky original failure',()=>workspaceCase(({parent})=>{
 const sink=createWorkspaceFailureCapture(parent),identity='macos:100:200';
 const metrics={valid:true,pid:12,startIdentity:identity,anonymousFileBytes:7,anonymousAllocatedBytes:11,
  fdObservation:{scope:'complete-round-sequential-v1',complete:true,startIdentity:identity,startedAt:1,completedAt:2,roundStartedAt:1,roundCompletedAt:2,rounds:1,capacityRetries:0,closedRetries:0,detailCalls:1,failures:[]}};
 const input={storage:{totalBytes:workspaceCap-workspaceReserve-11,copyBytes:0},baseline:{fixedBytes:0,capBytes:workspaceCap},metrics,expectedPid:12,expectedStart:identity,additionalBytes:workspaceReserve};
 assert.throws(()=>admitWorkspaceSnapshot(input,sink),/workspace-variable-cap/);
 assert.equal(sink.summary().decision.actual,workspaceCap);assert.equal(sink.summary().decision.context.anonymousUsedBytes,11);
 sink.capture(Error('later cleanup failure'));assert.equal(sink.summary().primary,'workspace-variable-cap');sink.close();
 assert.equal(JSON.parse(fs.readFileSync(path.join(parent,'workspace-first-failure.json'))).primary,'workspace-variable-cap');
}));
test('official workspace: generated live scan includes parent once, reserves without double charge',()=>workspaceCase(({parent,root,put,baseline})=>{
 const source=parentOutputGenerated(true,s=>s),begin=source.indexOf('function storageNow('),end=source.indexOf('\nlet cancelled=',begin);
 assert(begin>=0&&end>begin);const evidence=path.join(parent,'evidence');fs.mkdirSync(evidence,{mode:0o700});fs.writeFileSync(path.join(evidence,'chunk.bin'),Buffer.alloc(13),{mode:0o600});put('tmp/scratch',17);
 const sizes=p=>{const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,x)=>n+sizes(path.join(p,x)),0):s.size;};
 const calls=[],sink={capture(){}};
 const storage=vm.runInNewContext('('+source.slice(begin,end).trim()+')',{fs,path,root,workspace:baseline,artifacts:{allowedRoot:parent},performance,performanceDiagnose:true,
  size:sizes,measureCurrentWorkspace,measureCurrentRootStable,workspaceFailure:sink,admitWorkspaceSnapshot:(v,c)=>{calls.push(v);return admitWorkspaceSnapshot(v,c);}});
 let r=storage();assert.equal(r.totalBytes,55+17+13);assert.equal(r.variableBytes,30);assert.equal(r.copyBytes,0);
 assert.equal(calls.filter(x=>x.additionalBytes===workspaceReserve).length,1);
 assert.equal(admitWorkspaceSnapshot({storage:r,baseline,additionalBytes:workspaceReserve+7},sink).variableBytes,30+workspaceReserve+7);
 // Sparse synthetic file reaches the live reserve boundary; no native writer.
 const p=put('tmp/growth',workspaceCap-workspaceReserve-30);
 assert.throws(()=>storage(),/workspace-variable-cap/);fs.unlinkSync(p);
 assert.equal(storage().variableBytes,30);
}));
test('official workspace: generated sample status reserve, old modes and copy path unchanged',()=>{
 const s=parentOutputGenerated(true,s=>s),legacy=parentOutputGenerated(false,s=>s);
 assert(s.includes('metrics:point,additionalBytes:performanceDiagnose?6*1024*1024:0,'));
 assert(s.includes('additionalBytes:bytes+(performanceDiagnose?6*1024*1024:0),'));
 assert(!legacy.includes('official-live-closeout-reserve'));assert(!legacy.includes('additionalBytes:bytes+(performanceDiagnose'));
 assert(s.includes('const stateDiagnose=performanceDiagnose||'));assert(s.includes('const diagnose=memoryDiagnose||contentionDiagnose||stateDiagnose||'));
 assert(s.includes('if(!diagnose){const before=await snapshot();'));
 for(const token of ['stateDiagnose?1800000','stateDiagnose?1870000','aLoad.start(begin,2700000)','nextEvidence+=15000','AbortSignal.timeout(5000)','<=2000','<=5000'])assert(s.includes(token),token);
 // No new stdout producer or evidence/Report format is introduced by reservation.
 assert.equal((s.match(/official-live-closeout-reserve/g)||[]).length,1);
 assert(!s.includes("console.log('[official-live-closeout-reserve]"));
});
test('official workspace: native file producers use owned recording tree and real caps',()=>{
 const read=n=>fs.readFileSync(n,'utf8');
 assert(read('src/application/media_server_application.cpp').includes('recording_root / "visual-cache"'));
 const a=read('src/ingress/va_review_application_service.cpp');assert(a.includes('root/"evidence-packages"'));assert(a.includes('root/"va-reviews"'));
 assert(read('src/recording/recording_catalog.cpp').includes('options_.media_root/"recording-generation-catalog.sqlite3"'));
 assert(read('src/recording/visual_index_store.cpp').includes('kMaxFile = 96ULL*1024*1024'));assert(read('src/recording/visual_index_store.cpp').includes('".visual-software-pending.v1"'));
 // The Evidence store is NOT a 64MiB store: its real larger cap is covered by
 // total Workspace observation, not silently placed inside the Review budget.
 assert(read('include/recording/evidence_package_store.h').includes('store_bytes{2ULL*1024*1024*1024}'));
 assert(read('include/recording/va_review_store.h').includes('bytes{64ULL*1024*1024}'));
});
const workspaceCloseoutPython=String.raw`
import pathlib,sys,os,hashlib,importlib.util,shutil,json
os.umask(0o077)
root=pathlib.Path(sys.argv[1]);mode=sys.argv[2]
spec=importlib.util.spec_from_file_location('s','scripts/internal/run_v450_recording_a_mixed.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
work=root/'work';run=work/s.OFFICIAL_RUN_DIRECTORY;run.mkdir(parents=True,mode=0o700)
names=['input/retention-9101.mp4','input/retention-9201.mp4','normalize','process-metrics','catalog-instrumented.cpp']
fixed={'root':str(run),'fixedBytes':55,'files':[]}
for n in names:
 p=run/n;p.parent.mkdir(exist_ok=True,mode=0o700);p.write_bytes(b'x'*11)
 fixed['files'].append({'name':n,'size':11,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
e=root/'evidence';e.mkdir(mode=0o700)
def put(p,n):
 with p.open('xb') as f:f.truncate(n)
def snapshot():return s.official_workspace(root,fixed)
assert snapshot()['variableBytes']==0
if mode=='reserve-boundary':
 p=run/'growth';put(p,s.OFFICIAL_WORKSPACE_CAP-s.OFFICIAL_CLOSEOUT_RESERVE-1)
 assert snapshot()['variableBytes']==463470591
 with p.open('r+b') as f:f.truncate(s.OFFICIAL_WORKSPACE_CAP-s.OFFICIAL_CLOSEOUT_RESERVE)
 try:snapshot();raise AssertionError('exact reserved limit accepted')
 except ValueError as x:assert str(x)=='official-final-workspace-cap'
elif mode=='original-copy-atomic':
 put(run/'server-1.private.log',4194304);put(e/'product.private.log',4194304)
 put(e/'ledger.json',1048576);put(e/'result.json',32768);put(e/'.pending-synthetic',32768)
 assert snapshot()['variableBytes']==2*4194304+1048576+2*32768
 assert snapshot()['copyBytes']==0
 before=snapshot();(e/'.pending-synthetic').unlink();assert snapshot()['variableBytes']==before['variableBytes']-32768
elif mode=='cleanup-release':
 put(run/'kept',31);put(e/'kept-evidence',37)
 before=snapshot()
 try:raise OSError('synthetic cleanup failure')
 except OSError:pass
 assert snapshot()==before and work.exists()
 shutil.rmtree(work);assert not work.exists()
 after=snapshot();assert after['fixedBytes']==0 and after['variableBytes']==37
elif mode=='unlisted-file':
 put(work/'unlisted-sibling',19);put(root/'prepared-input',23)
 assert snapshot()['variableBytes']==42
elif mode=='fixed-mismatch':
 (run/'normalize').write_bytes(b'y'*11)
 try:snapshot();raise AssertionError('fixed mutation accepted')
 except ValueError as x:assert str(x)=='official-fixed-sha'
else:raise AssertionError(mode)
print(json.dumps({'workspaceCase':mode,'status':'PASS','productExecutions':0}))
`;
for(const mode of ['reserve-boundary','original-copy-atomic','cleanup-release','unlisted-file','fixed-mismatch'])test('official workspace: closeout '+mode,()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-workspace-closeout-');fs.chmodSync(root,0o700);
 try{const p=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',workspaceCloseoutPython,root,mode],{encoding:'utf8',timeout:15000,maxBuffer:65536});console.log(p.stdout);assert.equal(p.status,0,p.stderr+p.stdout);}
 finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

// S03-PARENT-OUTPUT-F01: only generated output fragments run, never the Driver.
function parentOutputGenerated(official,run){
 const root=fs.mkdtempSync('/private/tmp/media-server-parent-output-mock-');fs.chmodSync(root,0o700);
 try{
  const script="import sys;from pathlib import Path;sys.path.insert(0,str(Path.cwd()/'scripts/internal'));from recording_accumulated_cost import generate;generate(Path(sys.argv[1]),mandatory_ledger=True,official_contract=Path(sys.argv[2]) if sys.argv[2] else None)";
  const out=path.join(root,'overlay'),p=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',script,out,official?path.join(root,'contract.json'):''],{encoding:'utf8',timeout:10000,maxBuffer:65536});
  assert.equal(p.status,0,p.stderr);const source=fs.readFileSync(path.join(out,'mixed.mjs'),'utf8');
  assert.equal(spawnSync(process.execPath,['--check',path.join(out,'mixed.mjs')],{encoding:'utf8'}).status,0);
  return run(source);
 }finally{
  const out=path.join(root,'overlay');if(fs.existsSync(out)){for(const name of fs.readdirSync(out)){const p=path.join(out,name),s=fs.lstatSync(p);assert(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1);fs.unlinkSync(p);}fs.rmdirSync(out);}fs.rmdirSync(root);
 }
}
function parentOutputCallback(source,artifacts,logs,firstFailure=null,observations=null){
 if(!observations){observations=createOfficialObservationEvidence(artifacts,{admit:()=>{}});for(const kind of officialObservationKinds){const n=kind==='root-storage'?3:kind==='visual-query-observation'?2:1;for(let i=0;i<n;i++)observations.append(kind,{synthetic:true,index:i});}}
 const remaining=createOfficialRemainingEvidence(artifacts,{admit:()=>{}});
 const begin=source.indexOf("report=>{if(report.status==='PASS'"),end=source.indexOf(':report=>artifacts.checkpoint(report)',begin);
 assert(begin>=0&&end>begin);
 return vm.runInNewContext('('+source.slice(begin,end)+')',{artifacts,checkpointSearchPerformanceReport,getOfficialObservations:()=>observations,getOfficialRemaining:()=>remaining,officialRemainingError:null,officialFirstFailure:firstFailure,console:{log:s=>logs.push(s)}});
}
test('official parent output: complete artifact replaces only duplicate final stdout',async()=>{
 const source=parentOutputGenerated(true,s=>s);
 assert(source.includes('if(!performanceDiagnose)console.log(JSON.stringify(final));process.exitCode='));
 for(const status of ['PASS','INCOMPLETE'])await compactArtifactCase((a,dir)=>{
  const logs=[],report={status,processCount:1,resources:{sampleCount:1},evidenceLoad:{searchSuccess:484,searchUnavailable:0,searchSuccessByClient:[241,241,1,1]},aLoad:{initialStore:{names:[]},schedule:[]},sample:{zero:0,text:'경고 원문',values:[null,false,1]}};
  const receipt=parentOutputCallback(source,a,logs)(report),saved=fs.readFileSync(path.join(dir,'report.json'));
  assert.deepEqual(JSON.parse(saved),{...report,artifactRoot:dir});assert.equal(logs.length,3);logs.splice(0,2);
  const reference=JSON.parse(logs[0].slice('[official-report-artifact] '.length));
  assert.deepEqual(reference,{file:'report.json',bytes:saved.length,sha256:crypto.createHash('sha256').update(saved).digest('hex')});
  assert.equal(receipt.sha256,reference.sha256);assert(!logs[0].includes('경고 원문'));
  // 1048576 is the existing storage bound; ten byte digits overbound it.
  assert(Buffer.byteLength(logs[0]+'\n')<=148);
 });
});
test('official parent output: artifact failure preserves first error and emits no success reference',async()=>{
 const source=parentOutputGenerated(true,s=>s);
 await compactArtifactCase((a,dir)=>{
  const logs=[],write=a.write,first={code:'original-observation-error',message:'원문'};
  a.write=(n,b)=>{if(n==='report.json')throw Error('synthetic-report-write');return write(n,b);};
  assert.throws(()=>parentOutputCallback(source,a,logs,first)({status:'INCOMPLETE'}),/synthetic-report-write/);
  assert(!logs.some(l=>l.startsWith('[official-report-artifact]')));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'report-storage-failure.json'))).firstFailure,first);
 });
});
test('official parent output: historical mode and unique sample producers remain intact',()=>{
 const normal=parentOutputGenerated(false,s=>s),official=parentOutputGenerated(true,s=>s);
 assert(!normal.includes('[official-report-artifact]'));assert(normal.includes('console.log(JSON.stringify(final));process.exitCode='));
 for(const prefix of ['memory-attribution-cycle','current-observation','visual-query-observation','root-storage','sample-gap','recording-status-failure','R165-first-failure']){
  const lines=s=>s.split('\n').filter(l=>l.includes("'['"+prefix)||l.includes("'["+prefix+']'));
  let restored=official;for(const kind of officialObservationKinds)restored=restored.replaceAll("officialObservation('"+kind+"',(","console.log('["+kind+"] '+JSON.stringify(");
  restored=restored.replaceAll("officialRemainingOutput('stdout',",'console.log(').replaceAll("officialRemainingOutput('stderr',",'console.error(');
  assert(lines(normal).length>0,prefix);assert.deepEqual(lines(restored),lines(normal),prefix);
 }
 for(const token of ['stateDiagnose?1800000','stateDiagnose?1870000','nextEvidence+=15000','AbortSignal.timeout(5000)','<=2000','<=5000','failureTrace','productOwnerSeq','sampleStartNs'])assert(official.includes(token),token);
});
replayTest('parent','official parent output: real prefix classification and unique evidence block full capacity',async({root})=>{
 const raw=fs.readFileSync(path.join(root,'parent.log'));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),'2d6cd76d328e8bee6b16b85c439a6a07f85df515d7fc616bfda3c781030f611c');
 const classes={},parsed={};
 for(const line of raw.toString().split(/(?<=\n)/)){if(!line)continue;const label=line.match(/^\[[^\]]+\]/)?.[0]??'other',n=Buffer.byteLength(line);const c=classes[label]??={count:0,bytes:0,maxBytes:0};c.count++;c.bytes+=n;c.maxBytes=Math.max(c.maxBytes,n);
  try{(parsed[label]??=[]).push(JSON.parse(line.slice(label.length+1)));}catch{}
 }
 assert.equal(Object.values(classes).reduce((s,x)=>s+x.bytes,0),2097152);
 for(const [tag,count,bytes] of [['memory-attribution-cycle',111,629542],['current-observation',111,423377],['visual-query-observation',74,287032],['root-storage',112,267398]]){
  assert.equal(classes['['+tag+']'].count,count);assert.equal(classes['['+tag+']'].bytes,bytes);
 }
 const report=JSON.parse(fs.readFileSync(path.join(root,'diagnostic/report.json')));
 const source=parentOutputGenerated(true,s=>s);
 await compactArtifactCase((a,dir)=>{
  const logs=[];parentOutputCallback(source,a,logs)(report);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),{...report,artifactRoot:dir});
  assert.equal(logs.length,3);
  assert.deepEqual(logs.map(line=>line.slice(0,line.indexOf(' '))),['[official-remaining-artifact]','[official-observation-artifact]','[official-report-artifact]']);
  assert(Buffer.byteLength(logs.at(-1)+'\n')<Buffer.byteLength(JSON.stringify(report)+'\n'));
 });
 assert.equal(report.resources.sampleCount,112);assert(!Object.hasOwn(report.resources.groups[0],'points'));
 assert(parsed['[current-observation]'][0].activeHistory);assert(parsed['[visual-query-observation]'][0].usedIndex);
 assert(!Object.hasOwn(report.evidenceLoad,'usedIndex'));assert(!Object.hasOwn(report.evidenceLoad,'items'));
 // Shape-combination counterexample, NOT a projection or an actual 30-minute run.
 // Omit memory, startup, shutdown, all requests and all A/error lines entirely.
 const envelope=360*classes['[current-observation]'].maxBytes+242*classes['[visual-query-observation]'].maxBytes+360*classes['[root-storage]'].maxBytes;
 assert(envelope>2097152);assert.equal(1800000/15000+1,121);assert.equal(121*2,242);
 console.log(JSON.stringify({scope:'parent-output-replay',classes,shapeCombinationBytes:envelope,cap:2097152,verdict:'HISTORICAL_STDOUT_COUNTEREXAMPLE',meaning:'observed record shapes combined with schedule counts; not a proved maximum or runtime prediction'}));
});

// MEDIA-012-LEDGER-CAPACITY-F01. Run only /^ledger capacity regression:/.
replayTest('parent','official observation evidence: four producers round trip all preserved complete rows',async({root:evidence})=>{
 const raw=fs.readFileSync(path.join(evidence,'parent.log'));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),'2d6cd76d328e8bee6b16b85c439a6a07f85df515d7fc616bfda3c781030f611c');
 const records=[];let partial=0;
 for(const line of raw.toString().split('\n')){const kind=officialObservationKinds.find(k=>line.startsWith('['+k+'] '));if(!kind)continue;
  try{records.push([kind,JSON.parse(line.slice(kind.length+3))]);}catch{partial++;}
 }
 assert.equal(records.length,407);assert.equal(partial,1);
 await compactArtifactCase((a,dir)=>{
  const admitted=[],writer=createOfficialObservationEvidence(a,{admit:n=>admitted.push(n)});
  for(const [kind,value] of records)writer.append(kind,value);
  const ref=writer.finish(true),restored=[];
  const verified=verifyOfficialObservationEvidence(dir,{record:(kind,value,seq)=>restored.push([kind,value,seq])});
  assert.equal(verified.status,'COMPLETE');assert.equal(ref.records,407);assert.deepEqual(verified.counts,[111,111,74,111]);
  assert.deepEqual(restored.map(([k,v])=>[k,v]),records);assert.deepEqual(restored.map(x=>x[2]),Array.from({length:407},(_,i)=>i+1));
  assert(admitted.every(n=>n<=1048576+32768));
  const reconstructed=restored.map(([k,v])=>'['+k+'] '+JSON.stringify(v));
  assert.deepEqual(reconstructed.map(l=>JSON.parse(l.slice(l.indexOf('] ')+2))),records.map(x=>x[1]));
  console.log(JSON.stringify({scope:'observation-replay',records:407,incompleteOriginalRowsExcluded:1,counts:verified.counts,bytes:verified.dataBytes,manifestBytes:verified.bytes,mandatoryWireChanged:false}));
 });
});
test('official observation evidence: JSON values order precision and failure text remain exact',async()=>{
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialObservationEvidence(a,{admit:()=>{}}),value={pid:2147483647,startIdentity:'macos:1792902689:725876',time:9007199254740991,ns:1234567890123456,small:1.2345678901234567e-6,null:null,ring:[[3,2,1],[0]],empty:[],text:'오류\n"경고"\\\t😀',flags:[true,false],negative:-1};
  for(const k of officialObservationKinds)w.append(k,value);w.finish(true);const got=[];
  verifyOfficialObservationEvidence(dir,{record:(k,v)=>got.push(v)});assert.deepEqual(got,officialObservationKinds.map(()=>value));
 });
});
for(const mode of ['missing','duplicate','order','altered','extra','manifest-count','start','unsafe-name','partial','no-manifest'])test('official observation evidence: rejects '+mode,async()=>{
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialObservationEvidence(a,{admit:()=>{}});w.append('current-observation',{pid:1});w.append('root-storage',{totalBytes:0});w.finish(mode!=='partial');
  const file=path.join(dir,'s03-observation-0000.jsonl'),manifest=path.join(dir,'s03-observation-manifest.json');let m=JSON.parse(fs.readFileSync(manifest));
  if(mode==='missing')fs.unlinkSync(file);
  if(mode==='extra')fs.writeFileSync(path.join(dir,'s03-observation-unknown.jsonl'),'x',{mode:0o600});
  if(mode==='no-manifest')fs.unlinkSync(manifest);
  if(mode==='start')fs.appendFileSync(path.join(dir,'s03-observation-start.json'),' ');
  if(mode==='manifest-count'){m.storedRecords++;fs.writeFileSync(manifest,JSON.stringify(m));}
  if(mode==='unsafe-name'){m.files[0].file='../outside';fs.writeFileSync(manifest,JSON.stringify(m));}
  if(['duplicate','order','altered'].includes(mode)){
   const lines=fs.readFileSync(file,'utf8').trimEnd().split('\n').map(JSON.parse);
   if(mode==='duplicate')lines[1][0]=1;if(mode==='order')lines.reverse();if(mode==='altered')lines[0][2].pid=999;
   const bytes=Buffer.from(lines.map(x=>JSON.stringify(x)).join('\n')+'\n');fs.writeFileSync(file,bytes);
   // Even with per-file hashes recomputed, sequence/whole-stream digest must catch it.
   m.files[0].bytes=bytes.length;m.files[0].sha256=crypto.createHash('sha256').update(bytes).digest('hex');fs.writeFileSync(manifest,JSON.stringify(m));
  }
  assert.throws(()=>verifyOfficialObservationEvidence(dir));
  if(mode==='partial')assert.equal(verifyOfficialObservationEvidence(dir,{allowPartial:true}).status,'PARTIAL');
 });
});
test('official observation evidence: record boundary and first failure keep cleanup possible',async()=>{
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialObservationEvidence(a,{admit:()=>{}}),base=Buffer.byteLength(JSON.stringify([1,1,{s:''}])+'\n');
  w.append('current-observation',{s:'x'.repeat(1048575-base)});
  assert.throws(()=>w.append('current-observation',{s:'x'.repeat(1048576-base)}),/observation-record-cap/);
  assert.equal(w.append('root-storage',{reason:'failure-live'}),false);assert.equal(w.failure().message,'observation-record-cap');
  assert.throws(()=>w.finish(false,{message:'original error'}),/observation-record-cap/);
  const m=JSON.parse(fs.readFileSync(path.join(dir,'s03-observation-manifest.json')));assert.equal(m.storedRecords,1);assert.equal(m.dropped,2);assert.equal(m.observationFailure.message,'original error');
  assert.equal(verifyOfficialObservationEvidence(dir,{allowPartial:true}).dataBytes,1048575);
 });
});
test('official observation evidence: chunk count and total bytes are bounded without limit options',async()=>{
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialObservationEvidence(a,{admit:()=>{}}),payload={s:'x'.repeat(600000)};
  for(let i=0;i<64;i++)w.append('current-observation',payload);
  assert.throws(()=>w.append('current-observation',payload),/observation-chunk-cap/);
  assert.throws(()=>w.finish(false),/observation-chunk-cap/);
  const m=JSON.parse(fs.readFileSync(path.join(dir,'s03-observation-manifest.json')));assert.equal(m.files.length,64);assert.equal(m.storedRecords,64);assert(m.dataBytes<64*1048576);
  assert.equal(verifyOfficialObservationEvidence(dir,{allowPartial:true}).records,64);
 });
});
test('official observation evidence: visual count cannot exceed the 242 request contract',async()=>{
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialObservationEvidence(a,{admit:()=>{}});
  for(let i=0;i<242;i++)w.append('visual-query-observation',{request:i+1});
  assert.throws(()=>w.append('visual-query-observation',{request:243}),/observation-count-cap/);
  assert.throws(()=>w.finish(false),/observation-count-cap/);
  assert.deepEqual(verifyOfficialObservationEvidence(dir,{allowPartial:true}).counts,[0,0,242,0]);
 });
});
for(const mode of ['write','readback','admission'])test('official observation evidence: '+mode+' failure remains fail closed',async()=>{
 await compactArtifactCase((a,dir)=>{
  let fail=false;const write=a.write;
  a.write=(n,b)=>{if(fail&&n.endsWith('.jsonl')&&mode==='write')throw Error('synthetic-first-write');const r=write(n,b);if(fail&&n.endsWith('.jsonl')&&mode==='readback')fs.appendFileSync(path.join(dir,n),'!');return r;};
  const w=createOfficialObservationEvidence(a,{admit:()=>{if(fail&&mode==='admission')throw Error('synthetic-first-admission');}});
  w.append('current-observation',{s:'x'.repeat(600000)});fail=true;
  const expected=mode==='readback'?/observation-write-readback/:new RegExp('synthetic-first-'+mode);
  assert.throws(()=>w.append('current-observation',{s:'x'.repeat(600000)}),expected);
  const first=w.failure();assert.equal(w.append('root-storage',{reason:'cleanup'}),false);assert.deepEqual(w.failure(),first);
  assert.throws(()=>w.finish(false,{message:'earlier observation error'}),expected);
  assert.throws(()=>verifyOfficialObservationEvidence(dir));
 });
});
test('official observation evidence: successful report requires count binding and readback',async()=>{
 const source=parentOutputGenerated(true,s=>s);
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialObservationEvidence(a,{admit:()=>{}});for(const k of officialObservationKinds)w.append(k,{value:0});
  const report={status:'PASS',processCount:1,resources:{sampleCount:2},evidenceLoad:{searchSuccess:4,searchUnavailable:0,searchSuccessByClient:[1,1,1,1]},aLoad:{initialStore:{names:[]},schedule:[]}},logs=[];
  assert.throws(()=>parentOutputCallback(source,a,logs,null,w)(report),/official-observation-report-count/);
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'report.json')));assert.equal(saved.status,'INCOMPLETE');assert.equal(saved.exit,1);assert.deepEqual(saved.resources,report.resources);
  assert(!logs.some(x=>x.startsWith('[official-report-artifact]')));
 });
 assert(source.includes('officialObservations?.failure()'));assert(source.includes('additionalBytes:additionalBytes+6*1024*1024'));
 for(const k of officialObservationKinds){assert(source.includes("officialObservation('"+k+"',("));assert(!source.includes("console.log('["+k+"] '+JSON.stringify("));}
 assert(source.includes(".filter(n=>performanceDiagnose?n!=='work'"));
});
test('official observation evidence: failed start stays owned and is never recreated during cleanup',async()=>{
 await compactArtifactCase((a,dir)=>{
  const write=a.write;let starts=0;
  a.write=(n,b)=>{if(n==='s03-observation-start.json'){starts++;throw Error('synthetic-start-write');}return write(n,b);};
  const w=createOfficialObservationEvidence(a,{admit:()=>{}});
  assert.equal(w.failure().message,'synthetic-start-write');
  assert.throws(()=>w.append('root-storage',{reason:'first'}),/synthetic-start-write/);
  assert.equal(w.append('root-storage',{reason:'final-live'}),false);
  assert.equal(w.append('root-storage',{reason:'post-stop'}),false);assert.equal(starts,1);
  assert.throws(()=>w.finish(false,{message:'original'}),/synthetic-start-write/);assert.equal(starts,1);
  const m=JSON.parse(fs.readFileSync(path.join(dir,'s03-observation-manifest.json')));assert.equal(m.status,'PARTIAL');assert.equal(m.firstFailure.message,'synthetic-start-write');assert.equal(m.dropped,3);
 });
});
test('official observation evidence: 30 minute plan keeps separate static and runtime capacity verdicts',()=>{
 const l=officialObservationLimits;
 assert.deepEqual(l,{chunkBytes:1048576,chunks:64,metadataBytes:32768,records:32000});
 assert.equal(1800000/15000+1,121);assert.equal(121*4,484);
 assert.equal(l.chunks*l.chunkBytes+2*l.metadataBytes,67174400);assert(l.chunks*l.chunkBytes+2*l.metadataBytes+6291456<448*1048576);
 // This proves storage caps, NOT remaining product workspace or other stdout maxima.
 const source=fs.readFileSync('scripts/internal/v450_recording_a_mixed.mjs','utf8');
 assert(source.includes('maxBytes:4*1024*1024'));assert(source.includes('body:response.bytes.toString()'));
 const failure=JSON.stringify({method:'GET',route:'/synthetic',status:500,body:'x'.repeat(2097152)})+'\n';
 assert(Buffer.byteLength('[http-failed-response] '+failure)>2097152);
 console.log(JSON.stringify({scope:'observation-capacity',sidecarCapBytes:67174400,sidecarFiles:66,standaloneWithinWorkspace:true,fullWorkspaceFit:'UNPROVEN',parentStdoutFit:'BLOCKED: retained HTTP failure body can exceed 2MiB',officialRunner:'BLOCKED'}));
});

// S03-HTTP-ERROR-EVIDENCE-F01: synthetic bytes only; no network/product invocation.
const httpOptions=(bytes,extra={})=>({bytes,status:503,requestId:'control-42',method:'GET',route:'/health',admit:()=>{},...extra});
for(const [label,body] of [['empty',Buffer.alloc(0)],['binary',Buffer.from([0,255,254,10,13,34,92,0])],['chunk',Buffer.alloc(1048575,97)],['max',Buffer.alloc(4194304,0)]])test('official http evidence: '+label+' raw byte reconstruction',async()=>{
 await compactArtifactCase((a,dir)=>{
  const err=preserveOfficialHttpError(a,httpOptions(body));assert.equal(err.message,'http-status-503');assert.equal(err.httpReference.preservation,'COMPLETE');
  const v=verifyOfficialHttpErrorEvidence(dir);assert(v.bytes.equals(body));assert.equal(v.intent.requestId,'control-42');assert.equal(v.intent.mandatoryRequestId,null);assert.equal(v.intent.kind,'control');assert.equal(v.intent.status,503);
  assert.equal(v.receipt.chunks.length,Math.ceil(body.length/1048575));assert(v.receipt.chunks.every(c=>c.bytes<1048576));
  assert.equal(err.httpReference.bodySha256,crypto.createHash('sha256').update(body).digest('hex'));
  assert(Buffer.byteLength('[http-failed-response-artifact] '+JSON.stringify(err.httpReference)+'\n')<512);
 });
});
test('official http evidence: receive limit is unchanged and oversize never becomes complete',async()=>{
 const {measuredHttpResponse}=await import('./recording_current_app_helpers.mjs');const timing=[];
 await assert.rejects(()=>measuredHttpResponse({route:'/health',maxBytes:4194304,report:r=>timing.push(r),request:async()=>({status:503,body:(async function*(){yield Buffer.alloc(4194304);yield Buffer.from('x');})()})}),/http-body-error/);
 assert.equal(timing[0].bytes,4194305);assert.equal(timing[0].outcome,'error');
 await compactArtifactCase((a,dir)=>{const e=preserveOfficialHttpError(a,httpOptions(Buffer.alloc(4194305)));assert.equal(e.message,'http-status-503');assert.equal(e.httpReference.preservation,'PARTIAL');assert.equal(e.evidenceErrors[0].message,'http-evidence-input-cap');assert(!fs.readdirSync(dir).some(n=>n.endsWith('.bin')));});
});
for(const mode of ['missing','duplicate','order','tamper','whole-sha','extra','partial','intent-sha','count'])test('official http evidence: reject '+mode,async()=>{
 await compactArtifactCase((a,dir)=>{
  preserveOfficialHttpError(a,httpOptions(Buffer.alloc(1048576,99)));const file=path.join(dir,'s03-http-error-receipt.json'),m=JSON.parse(fs.readFileSync(file));
  if(mode==='missing')fs.unlinkSync(path.join(dir,m.chunks[0].file));
  if(mode==='duplicate')m.chunks[1]={...m.chunks[0]};
  if(mode==='order')m.chunks.reverse();
  if(mode==='tamper')fs.writeFileSync(path.join(dir,m.chunks[0].file),Buffer.from('changed'));
  if(mode==='whole-sha')m.storedBytes++;
  if(mode==='extra')fs.writeFileSync(path.join(dir,'s03-http-body-5.bin'),'x',{mode:0o600});
  if(mode==='partial')m.status='PARTIAL';
  if(mode==='intent-sha')m.intentSha256='0'.repeat(64);
  if(mode==='count')m.chunks=Array(6).fill(m.chunks[0]);
  fs.writeFileSync(file,JSON.stringify(m));assert.throws(()=>verifyOfficialHttpErrorEvidence(dir));
 });
});
for(const mode of ['write','partial-write','readback','workspace','receipt'])test('official http evidence: '+mode+' preserves first HTTP failure',async()=>{
 await compactArtifactCase((a,dir)=>{
  const original=a.write;a.write=(name,bytes)=>{
   if(mode==='write'&&name==='s03-http-body-0.bin'||mode==='partial-write'&&name==='s03-http-body-1.bin'||mode==='receipt'&&name==='s03-http-error-receipt.json')throw Error('synthetic-storage');
   const r=original(name,bytes);if(mode==='readback'&&name==='s03-http-body-0.bin')return {...r,sha256:'0'.repeat(64)};return r;
  };
  let admission=0;const e=preserveOfficialHttpError(a,httpOptions(Buffer.alloc(1048576),{admit:()=>{if(mode==='workspace'&&++admission===2)throw Error('workspace-cap');}}));
  assert.equal(e.message,'http-status-503');assert.equal(e.httpReference.preservation,'PARTIAL');assert(e.evidenceErrors.length>0);
  if(mode==='partial-write'){const v=verifyOfficialHttpErrorEvidence(dir,{allowPartial:true});assert.equal(v.receipt.storedBytes,1048575);assert.equal(v.receipt.firstFailure,e.message);}
  if(mode!=='receipt'){const m=JSON.parse(fs.readFileSync(path.join(dir,'s03-http-error-receipt.json')));assert.equal(m.status,'PARTIAL');assert.equal(m.firstFailure,e.message);}
 });
});
test('official http evidence: existing evidence is never replaced, later cleanup is separate',async()=>{
 await compactArtifactCase((a,dir)=>{
  const original=preserveOfficialHttpError(a,httpOptions(Buffer.from('first'))),before=fs.readFileSync(path.join(dir,'s03-http-error-receipt.json'));
  const next=preserveOfficialHttpError(a,httpOptions(Buffer.from('second'),{status:500,requestId:'control-43'}));
  assert.equal(next.message,'http-status-500');assert.equal(next.httpReference.preservation,'PARTIAL');assert(fs.readFileSync(path.join(dir,'s03-http-error-receipt.json')).equals(before));
  const result={firstFailure:original.message,cleanupErrors:['synthetic-cleanup']};assert.equal(result.firstFailure,'http-status-503');assert.equal(verifyOfficialHttpErrorEvidence(dir).bytes.toString(),'first');
 });
});
test('official http evidence: generated producer stops retry and cleanup requests after first error',async()=>{
 const source=parentOutputGenerated(true,s=>s),legacy=parentOutputGenerated(false,s=>s);
 assert(!legacy.includes('preserveOfficialHttpError'));assert(source.includes('maxBytes:4*1024*1024'));
 const start=source.indexOf('async function request('),end=source.indexOf('\nconst mixed=',start);assert(start>=0&&end>start);
 const prefix=source.slice(source.indexOf('function budget(){'),source.indexOf('function budget(){')+260);assert(prefix.startsWith('function budget(){if(performanceDiagnose&&officialRemainingError)throw officialRemainingError;if(performanceDiagnose&&officialHttpFailure)throw officialHttpFailure;'));
 await compactArtifactCase(async(a,dir)=>{
  let calls=0;const logs=[],ctx=vm.createContext({performanceDiagnose:true,performance,officialControlOrdinal:0,officialRemainingError:null,officialHttpFailure:null,officialFirstFailure:null,artifacts:a,preserveOfficialHttpError,
   measuredHttpResponse:async()=>{calls++;return {status:503,bytes:Buffer.from([255,0,34])};},console:{log:s=>logs.push(s)},officialRemainingOutput:(_s,t)=>logs.push(t),storageNow:()=>({}),workspace:null,workspaceFailure:{},admitWorkspaceSnapshot:()=>{}});
  vm.runInContext(prefix.split('if(performanceDiagnose&&officialObservations')[0]+'}\n'+source.slice(start,end),ctx);
  for(let i=0;i<3;i++)await assert.rejects(vm.runInContext("request({},'GET','/health')",ctx),/http-status-503/);
  assert.equal(calls,1);assert.equal(logs.filter(x=>x.startsWith('[http-failed-response-artifact]')).length,1);assert.equal(ctx.officialFirstFailure.message,'http-status-503');assert.equal(verifyOfficialHttpErrorEvidence(dir).intent.requestId,'control-1');
 });
});
test('official http evidence: independent item caps, workspace reservation and finalization manifest',async()=>{
 const src=parentOutputGenerated(true,s=>s);assert(src.includes("additionalBytes:additionalBytes+6*1024*1024,context:{kind:'official-http-error-write'}"));
 assert.deepEqual(officialHttpBodyLimits,{bodyBytes:4194304,chunkBytes:1048575,chunks:5,metadataBytes:32768});
 const http=4194304+2*32768,observation=64*1048576+2*32768;assert.equal(http,4259840);assert.equal(http+observation,71434240);assert.equal(66+7,73);
 await compactArtifactCase((a,dir)=>{
  const o=createOfficialObservationEvidence(a,{admit:()=>{}});o.append('current-observation',{pid:1,startIdentity:'mock',v:null});o.finish(true);
  preserveOfficialHttpError(a,httpOptions(Buffer.alloc(4194304)));assert.equal(verifyOfficialObservationEvidence(dir).records,1);assert.equal(verifyOfficialHttpErrorEvidence(dir).receipt.chunks.length,5);
 });
 const writer=fs.readFileSync('scripts/internal/va_review_test_artifacts.mjs','utf8');assert(writer.includes("fs.openSync(file,'wx',0o600)"));assert(!/owned\.size\s*[><=]/.test(writer));
 // 64 is observation chunk scope, not a global Writer file cap. Final manifest has a byte cap.
 const manifest=Array.from({length:64},(_,i)=>'a'.repeat(64)+'  diagnostic/s03-observation-'+String(i).padStart(4,'0')+'.jsonl\n').join('')+
 Array.from({length:5},(_,i)=>'b'.repeat(64)+'  diagnostic/s03-http-body-'+i+'.bin\n').join('');assert(Buffer.byteLength(manifest)<32768);
});
test('official http evidence: full parent output stays blocked by other complete response producers',()=>{
 const src=parentOutputGenerated(true,s=>s);assert(src.includes("'[evidence-create-responses] '+JSON.stringify(created.map(v=>({status:v.status,elapsedMs:v.elapsedMs,body:JSON.parse(v.bytes)})))"));
 assert(src.includes("currentSources:detail.currentSources"));
 const body=JSON.stringify({error:'unrecognized',message:'x'.repeat(2097152)});assert(Buffer.byteLength(body)<4194304);
 const emitted='[evidence-create-responses] '+JSON.stringify([{status:503,elapsedMs:1,body:JSON.parse(body)}])+'\n';assert(Buffer.byteLength(emitted)>2097152);
 // Printed before existing semantic assertion rejects the unexpected body. This is a failure-path counterexample, not a valid server fixture.
 console.log(JSON.stringify({scope:'http-evidence-capacity',httpBytes:4259840,observationAndHttpBytes:71434240,files:73,parentCap:2097152,failureCounterexampleBytes:Buffer.byteLength(emitted),normalBound:null,failureStaticFit:'BLOCKED',fullWorkspace:'BLOCKED_UNPROVEN'}));
});

// S03-REMAINING-OUTPUT-F01: actual framed writer and generated call sites, no HTTP.
const remainingMeta=(i=1)=>({requestId:'response-'+i,method:'POST',route:'/ops/api/recordings/search/evidence',status:201,activeA:{jobId:'job-1'},mandatoryRequestId:null});
test('official remaining: binary UTF8 JSON max raw and previous oversized output round trip',async()=>{
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialRemainingEvidence(a,{admit:()=>{}}),bodies=[Buffer.alloc(0),Buffer.from([0,255,10,254]),Buffer.from('{"id":"é한글","value":null}'),Buffer.alloc(4194304,32)];
  for(const [i,b] of bodies.entries())w.response(b,remainingMeta(i+1));
  const text='[evidence-create-responses] '+JSON.stringify([{status:503,body:{error:'invalid',message:'x'.repeat(2097152)}}]);assert(Buffer.byteLength(text)>2097152);
  w.diagnostic('stdout',text);w.diagnostic('stderr','[fail] original semantic error');const ref=w.finish(false,{message:'original semantic error'});
  assert.equal(ref.status,'PARTIAL');const v=verifyOfficialRemainingEvidence(dir,{allowPartial:true});assert.equal(v.records.length,6);
  for(let i=0;i<4;i++){assert(v.records[i].body.equals(bodies[i]));assert.equal(v.records[i].meta.requestId,'response-'+(i+1));}
  assert.equal(v.records[4].body.toString(),text+'\n');assert.equal(v.records[5].body.toString(),'[fail] original semantic error\n');assert.equal(v.partialTailBytes,0);
  assert.throws(()=>verifyOfficialRemainingEvidence(dir),/remaining-incomplete/);
 });
});
test('official remaining: repeated original body uses earlier verified frame with separate request identity',async()=>{
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialRemainingEvidence(a,{admit:()=>{}}),b=Buffer.alloc(4194304,123);w.response(b,remainingMeta(1));w.response(b,remainingMeta(2));w.finish(true);
  const v=verifyOfficialRemainingEvidence(dir);assert(v.manifest.storedBytes<4194304+2048);assert.equal(v.records[1].reuse,1);assert(v.records[1].body.equals(b));assert.equal(v.records[1].meta.requestId,'response-2');assert(v.records[0].meta.validation.startsWith('NOT_EVALUATED'));
 });
});
for(const mode of ['missing','duplicate','order','changed','extra','whole','count','partial'])test('official remaining: rejects '+mode,async()=>{
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialRemainingEvidence(a,{admit:()=>{}});w.response(Buffer.alloc(2097152),remainingMeta());w.finish(true);
  const f=path.join(dir,'s03-remaining-manifest.json'),m=JSON.parse(fs.readFileSync(f));
  if(mode==='missing')fs.unlinkSync(path.join(dir,m.files[0].file));if(mode==='duplicate')m.files[1]={...m.files[0]};if(mode==='order')m.files.reverse();
  if(mode==='changed')fs.writeFileSync(path.join(dir,m.files[0].file),'changed');if(mode==='extra')fs.writeFileSync(path.join(dir,'s03-remaining-999.bin'),'x',{mode:0o600});
  if(mode==='whole')m.streamSha256='0'.repeat(64);if(mode==='count')m.acceptedRecords=32001;if(mode==='partial')m.status='PARTIAL';
  fs.writeFileSync(f,JSON.stringify(m));assert.throws(()=>verifyOfficialRemainingEvidence(dir));
 });
});
for(const mode of ['write','partial','readback','workspace','manifest'])test('official remaining: '+mode+' failure blocks new work and preserves prefix',async()=>{
 await compactArtifactCase((a,dir)=>{
  let admission=0;const orig=a.write;a.write=(n,b)=>{if(mode==='write'&&n==='s03-remaining-000.bin'||mode==='partial'&&n==='s03-remaining-001.bin'||mode==='manifest'&&n==='s03-remaining-manifest.json')throw Error('synthetic-'+mode);const r=orig(n,b);return mode==='readback'?{...r,sha256:'0'.repeat(64)}:r;};
  const w=createOfficialRemainingEvidence(a,{admit:()=>{if(mode==='workspace'&&++admission===2)throw Error('workspace-variable-cap');}});
  if(mode==='manifest'){w.diagnostic('stderr','original failure');assert.throws(()=>w.finish(false,{message:'original'}),/synthetic-manifest/);return;}
  assert.throws(()=>w.response(Buffer.alloc(4194304),remainingMeta()));assert(w.failure());assert.throws(()=>w.response(Buffer.from('next'),remainingMeta(2)));
  assert.throws(()=>w.finish(false,{message:'original functional error'}));
  const m=JSON.parse(fs.readFileSync(path.join(dir,'s03-remaining-manifest.json')));assert.equal(m.status,'PARTIAL');assert.equal(m.observationFailure.message,'original functional error');
 });
});
test('official remaining: body text header and cumulative capacity have finite fail closed bounds',async()=>{
 for(const [kind,b,meta] of [['body',Buffer.alloc(4194305),remainingMeta()],['text','x'.repeat(8388608),null],['header',Buffer.from('x'),{...remainingMeta(),route:'x'.repeat(16385)}]])await compactArtifactCase((a,dir)=>{
  const w=createOfficialRemainingEvidence(a,{admit:()=>{}});assert.throws(()=>kind==='text'?w.diagnostic('stdout',b):w.response(b,meta));assert(w.failure());assert.throws(()=>w.finish(false));assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'s03-remaining-manifest.json'))).status,'PARTIAL');
 });
 await compactArtifactCase((a,dir)=>{
  const w=createOfficialRemainingEvidence(a,{admit:()=>{}});let failed=false;
  for(let i=0;i<17;i++){try{w.response(Buffer.alloc(4194304,i),remainingMeta(i+1));}catch{failed=true;break;}}
  assert(failed);assert.equal(w.failure().message,'remaining-total-cap');assert.throws(()=>w.finish(false));
  const v=verifyOfficialRemainingEvidence(dir,{allowPartial:true});assert(v.manifest.files.length<=64);assert(v.manifest.storedBytes<=64*1048575);
 });
});
test('official remaining: generated A semantic rejection retains original buffer and diagnostics',async()=>{
 await compactArtifactCase(async(a,dir)=>{
  const w=createOfficialRemainingEvidence(a,{admit:()=>{}}),body=Buffer.from('{"error":"original unexpected","id":"job-1"}');
  const source=parentOutputGenerated(true,s=>{const file=s.match(/from "([^"\n]+s03_a_load\.mjs)"/)[1];return fs.readFileSync(file,'utf8');});
  assert(source.includes("this.output('[A-http]"));assert(!source.includes("console.log('[A-"));
  const begin=source.indexOf('async req('),end=source.indexOf('\n  async prepare(',begin),fn=vm.runInNewContext('(async function'+source.slice(begin+9,end)+')',{});
  const ctx={budget:()=>{},request:async()=>{w.response(body,{...remainingMeta(),status:503});return {status:503,bytes:body,elapsedMs:1};},output:t=>w.diagnostic('stdout',t),check:(ok,label)=>{if(!ok)throw Error(label);}};
  await assert.rejects(()=>fn.call(ctx,{},'/ops/api/recordings/a-record-reviews'),/A HTTP/);w.finish(false,{message:'A HTTP'});
  const v=verifyOfficialRemainingEvidence(dir,{allowPartial:true});assert(v.records[0].body.equals(body));assert(v.records[1].body.toString().includes('original unexpected'));
 });
});
test('official remaining: official call sites bound, no global console and historical path unchanged',()=>{
 parentOutputGenerated(true,s=>{
  assert(s.includes("officialRemainingOutput('stdout','[evidence-create-responses]"));assert(s.includes("officialRemainingOutput('stdout','[recording-status-judgment]"));assert(s.includes("officialRemainingOutput('stdout','[process-cleanup]"));
  assert(s.includes("getOfficialRemaining().response(result.bytes"));assert(s.includes("if(performanceDiagnose&&officialRemainingError)throw officialRemainingError"));assert(s.includes("additionalBytes:additionalBytes+6*1024*1024,context:{kind:'official-remaining-write'}"));
  assert(!/console\.(log|error)\s*=/.test(s));assert(s.includes('process.stdout.write(failureTrace.start'));assert(s.includes('process.stdout.write(failureTrace.client'));
  for(const token of ['stateDiagnose?1800000','stateDiagnose?1870000','nextEvidence+=15000','AbortSignal.timeout(5000)','<=2000','<=5000'])assert(s.includes(token));
  assert(s.includes("function officialObservation(kind,value){if(performanceDiagnose)getOfficialObservations().append(kind,value);else console.log('['+kind+'] '+JSON.stringify(value));}"));
  const retained=[...s.matchAll(/console\.(?:log|error)\(['"]\[([A-Za-z0-9_-]+)\]/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(retained)].sort(),['fixture-profile','http-failed-response-artifact','official-observation-artifact','official-remaining-artifact','official-report-artifact','remaining-evidence-incomplete'].sort());
 });
 const legacy=parentOutputGenerated(false,s=>s);assert(!legacy.includes('createOfficialRemainingEvidence'));assert(legacy.includes("console.log('[evidence-create-responses]"));
});
test('official remaining: successful Report requires complete remaining evidence and no sticky storage error',async()=>{
 const source=parentOutputGenerated(true,s=>s);
 await compactArtifactCase((a,dir)=>{
  const logs=[],report={status:'PASS',processCount:1,resources:{sampleCount:1},evidenceLoad:{searchSuccess:4,searchUnavailable:0,searchSuccessByClient:[1,1,1,1]},aLoad:{initialStore:{names:[]},schedule:[]}};
  parentOutputCallback(source,a,logs)(report);assert.equal(verifyOfficialRemainingEvidence(dir).manifest.status,'COMPLETE');assert(logs.some(x=>x.startsWith('[official-remaining-artifact]')));
 });
});
test('official remaining: outer fixed workspace consumer keeps its bounded original line',()=>{
 const source=parentOutputGenerated(true,s=>s),begin=source.indexOf('function officialRemainingOutput('),end=source.indexOf('function officialRemainingResponseRoute',begin),logs=[],stored=[];
 const context=vm.createContext({performanceDiagnose:true,officialRemainingError:null,officialRemainingFailurePrinted:false,Buffer,console:{log:s=>logs.push(s),error:s=>logs.push(s)},getOfficialRemaining:()=>({diagnostic:(stream,text)=>stored.push({stream,text})})});
 vm.runInContext(source.slice(begin,end),context);
 const line='[workspace-fixed] '+JSON.stringify({fixedBytes:42,files:[]});context.line=line;vm.runInContext("officialRemainingOutput('stdout',line)",context);
 assert.equal(logs[0],line);assert.equal(JSON.parse(logs[0].slice('[workspace-fixed] '.length)).fixedBytes,42);assert.equal(stored.length,0);
 context.line='[workspace-fixed] '+'x'.repeat(16384);vm.runInContext("officialRemainingOutput('stdout',line)",context);assert.equal(context.officialRemainingError.message,'official-fixed-line-cap');assert.equal(stored[0].text,context.line);assert.equal(logs.length,2);
});
test('official remaining: normal generated driver stdout budget has explicit remaining terms',async()=>{
 const {mixedRecordingProfile}=await import('./recording_longrun_progress.mjs');
 const fixture=Buffer.byteLength('[fixture-profile] '+JSON.stringify(mixedRecordingProfile('continuous-r114'))+'\n');assert(fixture<=1024);
 // Artifact root is a real macOS filesystem path (PC_PATH_MAX=1024 in preflight); allow4096 with prefix. No per-response diagnostic text remains in parent stdout.
 const terms={ledger:249528,fixture:1024,artifactPath:4096,fixedWorkspace:16384,observations:512,remaining:512,report:148};
 const total=Object.values(terms).reduce((a,b)=>a+b,0);assert.equal(total,272204);assert.equal(2097152-total,1824948);
 const source=parentOutputGenerated(true,s=>s);assert(source.includes('Buffer.byteLength(text)+1>16384'));assert(source.includes("if(!performanceDiagnose)console.log(JSON.stringify(final))"));
 console.log(JSON.stringify({scope:'normal-driver-parent-budget',terms,total,margin:2097152-total,meaning:'normal source-bound generated Driver and silent successful launch shell; failure uses existing2MiB fail-closed supervisor, not a claim every failure finishes within this normal sum'}));
});
test('official remaining: total reserved evidence and known product quotas do not establish workspace fit',()=>{
 const remaining=64*1048575+32768,old=71434240;assert.equal(remaining,67141568);assert.equal(old+remaining,138575808);assert.equal(73+65,138);
 // Include established two-channel108MiB and A64MiB ceilings, but do not invent an Evidence/DB/Journal/Index maximum or claim joint runtime attainment.
 const envelope=old+remaining+(216+64)*1048576;assert.equal(envelope,432177088);assert(envelope<448*1048576);
 console.log(JSON.stringify({scope:'remaining-capacity',remainingBytes:remaining,allNewEvidenceBytes:old+remaining,newFiles:138,variableCap:469762048,quotaEnvelopeBytes:envelope,workspace:'BLOCKED; maxima not jointly qualified',driverParentKnownLedgerBytes:249528,allParentNormalBound:null,terminal:'BLOCKED'}));
});

// Independent wire oracle; C++ format expansion below is STATIC, never native execution.
const capacityBinding={
 'scripts/internal/recording_http_cost_probe.h':'ad1eca0c1710c7605d1c0e9f8277ed2f77c92d50ba774f58ac5b9988ef6724b5',
 'scripts/internal/recording_accumulated_cost.mjs':'d4ceef8febef32f90862af5e8c190c9a41054de9ca688d48150d2cd7442ce277',
 'scripts/internal/recording_accumulated_cost.py':'81385e375f24698665e9dcb6b009b14da809ec7fad77de7137d564eca48b229b',
 'scripts/internal/v450_recording_a_mixed.mjs':'668bece372e7005ddd0a7fb2a47be185d8f369410bbfcb2b0c83cf529ea5e986',
 'include/recording/recording_search_diagnostic.h':'6e43c8ed03c5f3bfbcb8790559ac887797886bba44d98824a8c4c6dbba8372ef',
 'src/ingress/recording_search_application_service.cpp':'61f0482fe8735afab055891cb46c14670332f3c12392293f875f0b1a565cc46e',
 'src/recording/recording_search_reader.cpp':'136b84401aefd8d6233e2cdb5ce440e2e52945ef29e7af17625b39af0611afef',
 'src/recording/recording_search_source.cpp':'b77c5fe93183c9011e3006d70192e4f3884a4822951be8d31f60c9cae1c18d12',
 'scripts/internal/recording_current_app_helpers.mjs':'f31c2d430b7141b81fff8d3285340b1a15b7548d52cbaee041e85fe75793d166',
};
function capacityTest(name,run){test('ledger capacity regression: '+name,()=>{
 let assertions=0;const a=Object.fromEntries(['equal','deepEqual','ok','match','throws','notEqual'].map(k=>[k,(...args)=>{assertions++;return assert[k](...args);} ]));
 try{run(a);}finally{console.log(JSON.stringify({scope:'ledger-capacity-assertions',name,assertions}));}
});}
const capacityU64=18446744073709551615n,capacityPid=2147483647,capacitySafe=Number.MAX_SAFE_INTEGER;
const capacityFloat=0.0000012345678901234567;
const capacityIdentity='macos:'+'9'.repeat(88)+':9'; // admitted 96-char schema boundary, not a real OS sample
const capacityWire=(kind,row)=>`[R171-${kind}] ${JSON.stringify(row,(_,v)=>typeof v==='bigint'?v.toString():v).replace(/"(\d+)"/g,'$1')}\n`;
const capacityBytes=s=>Buffer.byteLength(s,'utf8');
const capacityServer=id=>({v:2,pid:capacityPid,id,dispatch:capacityU64,handler:capacityU64,prepared:capacityU64,sendBegin:capacityU64,sendEnd:capacityU64,end:capacityU64,status:503,sent:false,loss:false});
function capacitySearch(id,ordinal){return {v:2,pid:capacityPid,id,begin:capacityU64,end:capacityU64,diagnosticStatus:503,exception:'std-exception',rejections:[capacityU64,capacityU64],loss:false,retry:2,waitNs:capacityU64,holdNs:capacityU64,
 detailEligible:true,detailOrdinal:ordinal,detailState:ordinal<=24?'captured':'detail-cap',attempts:[0,1,2].map(i=>({stage:'reference-resolution',reason:i<2?'search-source-changed':'search-playback-candidate-capacity',captured:capacityU64,current:capacityU64,authority:false}))};}
const capacityDetail=id=>({v:2,pid:capacityPid,id,captures:Array.from({length:6},(_,i)=>[i+1,i,2,...Array(17).fill(capacityU64),false]),phases:Array.from({length:40},()=>['PlaybackNoCandidates',capacityU64,capacityU64])});
const capacityStart=(id,kind)=>({v:2,id,kind,pid:capacityPid,startIdentity:capacityIdentity,resourceSequence:capacitySafe,startedMs:capacityFloat});
const capacityClient=(id,extra={})=>({v:2,id,pid:capacityPid,status:503,phase:'complete',outcome:'ok',headerReceived:true,totalElapsedMs:capacityFloat,endedMs:capacityFloat,bytes:capacitySafe,reason:'search-event-evidence-incomplete',...extra});
function capacityCppFormats(){return [...fs.readFileSync('scripts/internal/recording_http_cost_probe.h','utf8').matchAll(/"(?:\\.|[^"\\])*"/g)].map(m=>JSON.parse(m[0]));}
function capacityPrintf(format,args){let i=0;const out=format.replace(/%(?:llu|ld|u|d|s)/g,()=>String(args[i++]));if(i!==args.length)throw Error('static printf argument count');return out;}

capacityTest('source binding, schedule and bounded vocabularies',a=>{
 for(const [file,sha] of Object.entries(capacityBinding)){
  const bytes=fs.readFileSync(file);a.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha,file+' requires bound review on drift');
  a.notEqual(crypto.createHash('sha256').update(Buffer.concat([bytes,Buffer.from('\n')])).digest('hex'),sha);
 }
 const driver=fs.readFileSync('scripts/internal/v450_recording_a_mixed.mjs','utf8'),generator=fs.readFileSync('scripts/internal/recording_accumulated_cost.py','utf8');
 a.match(driver,/while\(performance.now\(\)-begin<duration\)/);a.match(driver,/nextEvidence=begin/);a.match(driver,/if\(performance.now\(\)<nextEvidence\)return;nextEvidence\+=15000/);
 a.match(generator,/'stateDiagnose\?2700000','stateDiagnose\?1800000'/);
 a.match(driver,/const routes=\[0,1\]\.map/);a.match(driver,/concat\(\[0,1\]\.map/);
 // At most 120 starts before the boundary and one loop admitted before it which crosses it.
 const batches=1800000/15000+1,ids=Array.from({length:batches*4},(_,i)=>i+1),structured=ids.filter(id=>id%4===1||id%4===2);
 a.equal(batches,121);a.equal(ids.length,484);a.equal(structured.length,242);a.equal(ids.length-structured.length,242);
 a.equal(ids.reduce((n,id)=>n+3-String(id).length,0),108);a.equal(structured.reduce((n,id)=>n+3-String(id).length,0),55);
 a.deepEqual([9,10,99,100,484].map(id=>String(id).length),[1,2,2,3,3]);
 const collector=fs.readFileSync('scripts/internal/recording_accumulated_cost.mjs','utf8');
 for(const [key,max] of [['stages',20],['reasons',34]]){
  const section=collector.match(new RegExp('const '+key+'=new Set\\(\\[([^\\]]+)\\]\\)'))[1];
  const values=[...section.matchAll(/'([^']+)'/g)].map(m=>m[1]);a.equal(Math.max(...values.map(capacityBytes)),max);a.ok(values.every(v=>/^[a-z-]+$/.test(v)));
 }
 a.match(collector,/startIdentity.length<=96/);a.match(collector,/bytes<=512&&clientBytes\+bytes<=256\*1024/);
 a.match(collector,/r.retry<=2/);a.match(collector,/\['none','bad-alloc','length-error','retained-read','resource','std-exception'\]/);
 a.equal(capacityIdentity.length,96);a.match(capacityIdentity,/^macos:\d+:\d+$/);
 a.equal(String(capacityU64).length,20);a.equal(String(capacitySafe).length,16);a.equal(JSON.stringify(capacityFloat).length,24);
 a.equal(JSON.stringify(Number.MAX_VALUE).length<=24,true);a.equal(JSON.stringify(Number.MIN_VALUE).length<=24,true);
 a.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});

capacityTest('C++ format STATIC expansion matches independent wire schema',a=>{
 const formats=capacityCppFormats(),fmt=prefix=>formats.find(s=>s.startsWith(prefix));
 for(const id of [9,10,99,100,484]){
  const row=capacityServer(id),text=capacityPrintf(fmt('[R171-server] {"v":2'),Object.values(row).slice(1).map(v=>String(v)));
  a.equal(text,capacityWire('server',row));a.ok(capacityBytes(text)<=273);
  for(const ordinal of [1,9,24,25,99,100,242]){
   const q=capacitySearch(id,ordinal),header=capacityPrintf(fmt('[R171-search] {"v":2'),[q.pid,q.id,q.begin,q.end,q.diagnosticStatus,q.exception,...q.rejections,String(q.loss),q.retry,q.waitNs,q.holdNs,String(q.detailEligible),q.detailOrdinal,q.detailState]);
   const attempts=q.attempts.map((r,i)=>capacityPrintf(fmt('%s{"stage"'),[i?',':'',r.stage,r.reason,r.captured,r.current,String(r.authority)])).join('');
   a.equal(header+attempts+']}\n',capacityWire('search',q));a.ok(capacityBytes(header+attempts+']}\n')<=831);
  }
 }
 const detail=capacityDetail(484),text=capacityPrintf(fmt('[R171-detail]'),[detail.pid,detail.id])+detail.captures.map((r,i)=>capacityPrintf(fmt('%s[%u,%u,%u,'),[i?',':'',...r.map(String)])).join('')+'],"phases":['+detail.phases.map((r,i)=>capacityPrintf(fmt('%s["%s",'),[i?',':'',...r])).join('')+']}\n';
 a.equal(text,capacityWire('detail',detail));a.equal(capacityBytes(text),4978);a.equal(detail.captures[0].length,21);
 // This is a width envelope, not a claim that all fields attain their maxima together.
 const header=fs.readFileSync('scripts/internal/recording_http_cost_probe.h','utf8');
 a.match(header,/if\(ordinal>DetailCap\)return "detail-cap"/);a.match(header,/MandatoryLedger\)return/);
 a.match(header,/i<=d.attempt&&i<3/);a.match(header,/LedgerMandatoryCap=384\*1024,LedgerDetailCap=128\*1024/);
 a.match(header,/LedgerMandatoryCap-192-ledgerMandatoryBytes/);
 a.ok(24*capacityBytes(text)<128*1024); // detail-byte-budget cannot occur for these bound sources
});

capacityTest('independent byte arithmetic, ID digits and reserved totals',a=>{
 let server=0,searchBytes=0,clients=0,ordinal=0;
 for(let id=1;id<=484;id++){
  const structured=id%4===1||id%4===2;
  server+=capacityBytes(capacityWire('server',capacityServer(id)));
  if(structured)searchBytes+=capacityBytes(capacityWire('search',capacitySearch(id,++ordinal)));
  clients+=capacityBytes(capacityWire('start',capacityStart(id,structured?'structured':'visual')))+capacityBytes(capacityWire('client',capacityClient(id)));
 }
 a.equal(server,484*273-108);a.equal(searchBytes,9*827+15*828+75*830+143*831-55);
 a.equal(clients,242*(255+263)+242*(251+263)-216);
 const mandatory=server+searchBytes,detail=24*capacityBytes(capacityWire('detail',capacityDetail(484))),combined=mandatory+detail+192;
 a.deepEqual([mandatory,clients,detail,combined],[332915,249528,119472,452579]);
 a.deepEqual([393024-mandatory,262144-clients,131072-detail,524288-combined],[60109,12616,11600,71709]);
 const formats=capacityCppFormats(),loss=capacityPrintf(formats.find(s=>s.startsWith('[R154-loss] {')),[4294967295,capacityU64]),fallback=formats.find(s=>s==='[R154-loss] output-failure\n');
 a.equal(capacityBytes(loss),58);a.equal(capacityBytes(fallback),27);a.ok(capacityBytes(loss)+capacityBytes(fallback)<=192);
 console.log(JSON.stringify({scope:'ledger-capacity-bounds',mandatory,client:clients,detail,combined,sourceBinding:capacityBinding,cpp:'STATIC_ONLY',full30minCapacity:'BLOCKED'}));
});

capacityTest('actual JS start and terminal UTF-8 bytes for 484 requests',a=>{
 const c=mandatoryRequestLedger();c.bindProcess({valid:true,error:null,pid:capacityPid,startIdentity:capacityIdentity},{pid:capacityPid,seq:capacitySafe});
 let bytes=0;
 for(let id=1;id<=484;id++){
  const kind=id%4===1||id%4===2?'structured':'visual',row=capacityStart(id,kind),start=c.start(id,{kind,pid:capacityPid,startedMs:capacityFloat}),end=c.client(capacityClient(id));
  a.equal(start,capacityWire('start',row));a.equal(end,capacityWire('client',capacityClient(id)));
  a.ok(capacityBytes(start)<= (kind==='structured'?255:251));a.ok(capacityBytes(end)<=263);bytes+=capacityBytes(start)+capacityBytes(end);
 }
 a.equal(bytes,249528);a.equal(c.report({cleanupComplete:true}).bytes.client,bytes);
 // Missing server records stay INCOMPLETE even when all client bytes fit.
 a.equal(c.report({cleanupComplete:true}).status,'incomplete');
});

capacityTest('actual JS failure branches and fail-closed capacity',a=>{
 const variants=[
  {status:200,reason:'UNKNOWN'}, {},
  {phase:'body',outcome:'timeout',reason:'UNKNOWN'},
  {phase:'header',outcome:'cancelled',status:null,headerReceived:false,reason:'UNKNOWN',bytes:0},
  {phase:'header',outcome:'error',status:null,headerReceived:false,reason:'UNKNOWN',bytes:0},
  {phase:'unobserved',outcome:'incomplete',status:null,headerReceived:false,reason:'UNKNOWN',bytes:0,totalElapsedMs:null},
 ];
 for(const extra of variants){
  const c=mandatoryRequestLedger();c.bindProcess({valid:true,error:null,pid:capacityPid,startIdentity:capacityIdentity},{pid:capacityPid,seq:capacitySafe});c.start(484,{kind:'structured',pid:capacityPid,startedMs:capacityFloat});
  const row=capacityClient(484,extra),out=c.client(row);a.equal(out,capacityWire('client',row));a.ok(capacityBytes(out)<=263);
  a.throws(()=>c.client(row),/ledger-duplicate-client/);
 }
 const tooLong=ledger();a.throws(()=>tooLong.bindProcess({...ledgerProcess,startIdentity:'macos:'+'9'.repeat(89)+':9'},{pid:5001,seq:1}),/ledger-process-identity/);
 const overflow=ledger();lstart(overflow,1);a.throws(()=>overflow.client(lc(1,{padding:'x'.repeat(512)})),/ledger-client-cap/);
 const mandatory=ledger();lstart(mandatory,1);mandatory.append(Buffer.from('[R171-server] '+'x'.repeat(16384)+'\n'),1,5001);a.equal(mandatory.failure().code,'diagnostic-wire-cap');
 // Deliberately invalid extra fields exercise aggregate guards, not the producer bound.
 const serverCap=ledger();for(let id=1;id<=320;id++)lstart(serverCap,id);
 for(let id=1;id<=320;id++)serverCap.append(fw('search',lq(id,0,{padding:'x'.repeat(1000)})),1,5001);
 a.equal(serverCap.failure().code,'ledger-server-cap');
 const clientCap=ledger();a.throws(()=>{for(let id=1;id<=512;id++){lstart(clientCap,id);clientCap.client(lc(id,{padding:'x'.repeat(240)}));}},/ledger-client-cap/);
 const missing=ledger();lstart(missing,1);missing.append(fw('server',ls(1)),1,5001);missing.client(lc(1));a.equal(missing.report({cleanupComplete:true}).firstFailure.code,'ledger-missing-search');
 a.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});

capacityTest('484 complete mock receipts preserve 24-detail boundary and no visual search',a=>{
 const c=ledger();let ordinal=0;
 for(let id=1;id<=484;id++){
  const kind=id%4===1||id%4===2?'structured':'visual';lstart(c,id,kind);
  ledgerFinish(c,id,{kind,ordinal:kind==='structured'?++ordinal:0});
 }
 const r=c.report({cleanupComplete:true});a.equal(r.status,'captured');a.equal(r.requests.length,484);
 a.deepEqual([r.metrics.structured.started,r.metrics.visual.started,r.detail.records,r.detail.omittedCap],[242,242,24,218]);
 a.equal(r.metrics.combined.terminalMissing,0);a.equal(r.detail.errors,0);a.equal(r.full30minCapacity,'UNPROVEN');
 a.ok(r.requests.filter(q=>q.kind==='visual').every(q=>q.search===null&&q.searchObservation==='not-instrumented'));
 a.ok(r.bytes.mandatoryServer<=332915);a.ok(r.bytes.optionalDetail<=119472);a.ok(r.bytes.client<=249528);
 const d=ledger();lstart(d,1);d.append(fw('search',lq(1,1)),1,5001);d.append(fw('server',ls(1)),1,5001);d.client(lc(1));
 a.equal(d.report({cleanupComplete:true}).firstFailure.code,'ledger-missing-detail');
});
import {limitedSearchContract,limitedSearchSchedule,limitedSearchCapacity,assertLimitedSearchCapacity,runLimitedSearch} from './recording_accumulated_cost.mjs';
const names=['service-wait','service-hold','preparation-wait','preparation-hold','Refresh','WithPlayback','SnapshotBegin','CurrentnessJson'];
const server=id=>({id,class:id%3?1:3,loss:false,accepted:1,parsed:2,handler:3,prepared:30,sendBegin:31,sendEnd:32,end:33,sent:true});
const search=id=>({id,diagnosticId:id,status:200,loss:false,begin:4,end:29,phases:names.map(n=>[n,5,6])});
const client=id=>({id,loss:false,status:200,outcome:'ok',phase:'complete',bytes:1,totalElapsedMs:100});
const wire=(kind,r)=>Buffer.from(`[R154-${kind}] ${JSON.stringify(r)}\n`);
test('fixed selection, no visual, no outcome-dependent replacement',()=>{
 assert.deepEqual([0,40,80,92,100].flatMap(n=>[selection(n,0),selection(n,1)]),[1,2,4,5,7,8,10,11,13,14]);
 assert.deepEqual([0,10,20,23,25].map(aSelection),[3,6,9,12,15]);assert.equal(selection(1,0),0);assert.equal(selection(100,2),0);
});
test('parallel search before server; streams and split chunks',()=>{
 const c=costCollector();for(const id of [1,2])c.start(id);
 for(const id of [2,1]){const b=wire('search',search(id));c.append(b.subarray(0,17),1);c.append(b.subarray(17),1);c.client(client(id));c.append(wire('server',server(id)),1);}
 assert.equal(c.complete().server.length,2);
});
test('early diagnostic goal needs initial/middle/late, two slow Structured and actual counts',()=>{
 const c=costCollector();for(let id=1;id<=9;id++){c.start(id);c.client({...client(id),totalElapsedMs:[7,8].includes(id)?2100:100});c.append(wire('search',search(id)),1);c.append(wire('server',server(id)),1);}
 assert.equal(c.ready({'9101':{finalized:599},'9201':{finalized:600}}),false);
 assert.equal(c.ready({'9101':{finalized:600},'9201':{finalized:600}}),true);
 c.start(10);assert.equal(c.ready({'9101':{finalized:600},'9201':{finalized:600}}),false);
});
for(const [name,kind,mutate] of [
 ['duplicate','server',r=>r],['bad-id','server',r=>({...r,id:0})],['class','server',r=>({...r,class:3})],
 ['order','server',r=>({...r,prepared:1})],['loss','server',r=>({...r,loss:true})],['send','server',r=>({...r,sent:false})],
 ['phase-cap','search',r=>({...r,phases:Array(41).fill(['x',5,6])})],['missing-phase','search',r=>({...r,phases:[]})],
 ['counter-overflow','search',r=>({...r,end:2**64})],['wrong-search','search',r=>({...r,diagnosticId:2})]]){
 test(name+' fails sticky during append',()=>{const c=costCollector();c.start(1);const r=kind==='server'?server(1):search(1);
  if(name==='duplicate')c.append(wire(kind,r),1);c.append(wire(kind,mutate(r)),1);assert.ok(c.failure());const f=c.failure();c.append(wire('server',server(2)),1);assert.equal(c.failure(),f);assert.throws(()=>c.complete());});
}
test('missing/partial/malformed/cap and explicit loss',()=>{
 for(const b of [Buffer.from('[R154-loss] output-failure\n'),Buffer.from('[R154-server] bad\n'),Buffer.from('[R154-server] '+ 'x'.repeat(8192)+'\n')]){const c=costCollector();c.append(b,1);assert.ok(c.failure());}
 const c=costCollector();c.start(1);assert.throws(()=>c.complete());c.append(Buffer.from('[R154-search] {'),1);assert.throws(()=>c.complete());
});
test('client timeout/duplicate start and nested parent rejection',()=>{
 const c=costCollector();c.start(1);assert.throws(()=>c.start(1));
 const d=costCollector();d.start(1);assert.throws(()=>d.client({...client(1),totalElapsedMs:5001}));
 const e=costCollector();e.start(1);e.client(client(1));e.append(wire('server',server(1)),1);e.append(wire('search',{...search(1),begin:1}),1);assert.throws(()=>e.complete());
});
test('actual owned child loss immediately initiates TERM; group absent',async()=>{
 const child=spawn(process.execPath,['-e',`process.stdout.write('[R154-loss] forced\\n');setInterval(()=>process.stdout.write('continued\\n'),1000);`],{detached:true,stdio:['ignore','pipe','pipe']});
 const c=costCollector();let detected=null,signalled=null,raw='';
 child.stdout.on('data',b=>{raw+=b.toString();c.append(b,0);if(c.failure()&&detected===null){detected=performance.now();process.kill(-child.pid,'SIGTERM');signalled=performance.now();}});
 const timeout=setTimeout(()=>process.kill(-child.pid,'SIGKILL'),3000);
 try{const [code,signal]=await once(child,'exit');assert.equal(code,null);assert.equal(signal,'SIGTERM');assert.ok(signalled-detected<100);assert.match(raw,/forced/);assert.doesNotMatch(raw,/continued/);assert.throws(()=>process.kill(-child.pid,0),e=>e.code==='ESRCH');console.log(JSON.stringify({role:'R165-forced-loss',pid:child.pid,detectionToSignalMs:signalled-detected,groupAbsent:true}));}finally{clearTimeout(timeout);}
});

test('generated child explicitly enables completion while global latency remains off',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-completion-generator-'));
 try{
  const r=spawnSync('python3',['-B','-c',"import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]))",path.join(root,'overlay')],{encoding:'utf8',timeout:10000});
  assert.equal(r.status,0,r.stderr);
  const generated=fs.readFileSync(path.join(root,'overlay/mixed.mjs'),'utf8');
  const original=fs.readFileSync('scripts/internal/v450_recording_a_mixed.mjs','utf8');
  const environment=text=>text.slice(text.indexOf('function environment('),text.indexOf('async function request('));
  const context={stateExecution:null,path,process:{env:{PATH:process.env.PATH,HOME:root,R165_BINARY:'/owned/instrumented'}},root,repo:process.cwd(),diagnose:true,stateDiagnose:true,short:false,frameTraceMode:'bounded',memoryObserve:true,memoryDiagnose:false,contentionDiagnose:false};
  const actual=vm.runInNewContext('('+environment(generated)+')(1,2,3)',context);
  const before=vm.runInNewContext('('+environment(original)+')(1,2,3)',context);
  assert.equal(actual.MEDIA_SERVER_VERIFY_RECORDING_COMPLETION_TRACE,'1');
  assert.equal(actual.MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE,'0');
  assert.equal(actual.MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY,'0');
  assert.equal(before.MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE,'1');
  assert.equal(before.MEDIA_SERVER_VERIFY_RECORDING_COMPLETION_TRACE,undefined);
  for(const key of Object.keys(before))if(!['MEDIA_SERVER_BIN_PATH','MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE','MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE','MEDIA_SERVER_VERIFY_RECORDING_LATENCY_SLOW_ONLY'].includes(key))assert.equal(actual[key],before[key],key);
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

// 사전 RED: 새 모드 거부(mixed-mode), 새 결과 계약 미구현(assertion).
test('search performance preparation is separate from deletion-required modes',async()=>{
 const {mixedPreparationContract}=await import('./recording_longrun_progress.mjs');
 assert.equal(mixedPreparationContract(['--search-performance-diagnostic']).requiresDeletion,false);
 for(const args of [['--state-diagnostic'],['--duration-minutes','120']])assert.equal(mixedPreparationContract(args).requiresDeletion,true);
});
test('search performance result contract exists',async()=>{
 const cost=await import('./recording_accumulated_cost.mjs');
 assert.equal(typeof cost.searchPerformanceResult,'function');
});

import {searchPerformanceResult,assertSearchPerformanceCapacity} from './recording_accumulated_cost.mjs';
import {completionCollection} from './recording_completion_collection.mjs';
import {captureBoundedProcessLog,mixedPreparationContract} from './recording_longrun_progress.mjs';
const completionLine='[recording-completion] '+JSON.stringify({v:1,event:10,begin:'1',end:'2',thread:1,request:1,reference:null,job:null,n:1,x:0,y:0})+'\n';
const receipt=(rows,bytes,extra={})=>'[recording-completion-end] '+JSON.stringify({v:1,rows,bytes,lost:false,writeError:false,complete:true,...extra})+'\n';
const collect=text=>{const c=completionCollection();c.append(text);return c.finish();};
function performanceFixture(){
 const c=costCollector();for(let id=1;id<=15;id++){c.start(id);c.client(client(id));c.append(wire('search',search(id)),0);c.append(wire('server',server(id)),1);}
 return {final:{failed:0,processCount:1,processesClosed:true,udpClosed:true,verifiedDurationMs:1800000,phase:{channels:{9101:{finalized:901,deleted:0},9201:{finalized:901,deleted:0}}},evidenceLoad:{cycles:3,searchSuccess:12,searchUnavailable:0,searchSuccessByClient:[3,3,3,3],searchLatencyMs:Array(12).fill(100),createComplete:3,visualResults:3,visualCreated:3,windows:Array.from({length:3},()=>({structured:1,visual:1,evidence:1,visualEvidence:1}))},aLoad:{completed:[{state:'completed',label:'main-0'}]}},trace:c.complete(),completion:[collect(completionLine+receipt(1,Buffer.byteLength(completionLine)))],logsCaptured:true,batches:3};
}
test('search-only zero deletions passes; every excluded qualification is NOT_RUN',()=>{
 const r=searchPerformanceResult(performanceFixture());assert.equal(r.status,'PASS');assert.equal(r.recordingProgression,'PASS');
 for(const k of ['retentionDeletion','retentionPostDeletionStability','memoryP0','readiness120','releaseQualification'])assert.equal(r[k],'NOT_RUN');
 assert.equal(r.outputBudget,'CAPACITY_UNPROVEN');assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});
test('unchanged latency limits, recording progress and shutdown failures',()=>{
 for(const times of [Array(12).fill(2000.1),[...Array(99).fill(100),5001]]){const f=performanceFixture();f.final.evidenceLoad.searchLatencyMs=times;f.final.evidenceLoad.searchSuccess=times.length;f.final.evidenceLoad.searchSuccessByClient=[1,1,1,times.length-3];f.batches=times.length/4;assert.equal(searchPerformanceResult(f).status,'FAIL');}
 const f=performanceFixture();f.final.evidenceLoad.searchLatencyMs=Array(20).fill(2000);f.final.evidenceLoad.searchLatencyMs[19]=5000;f.final.evidenceLoad.searchSuccess=20;f.final.evidenceLoad.searchSuccessByClient=[5,5,5,5];f.batches=5;assert.equal(searchPerformanceResult(f).latency.status,'PASS');
 for(const mutate of [f=>f.final.phase.channels[9101].finalized=0,f=>f.final.failed++,f=>f.final.processesClosed=false,f=>f.final.udpClosed=false]){const f=performanceFixture();mutate(f);assert.equal(searchPerformanceResult(f).status,'FAIL');}
});
test('Structured/Visual/Evidence/A, timing and selected completeness cannot be omitted',()=>{
 const mutations=[f=>f.final.evidenceLoad.searchSuccessByClient[0]=0,f=>f.final.evidenceLoad.searchSuccessByClient[2]=0,f=>f.final.evidenceLoad.createComplete=0,f=>f.final.evidenceLoad.visualCreated=0,f=>f.final.aLoad.completed=[],f=>f.final.evidenceLoad.windows[1].visual=0,f=>f.final.evidenceLoad.searchLatencyMs.pop(),f=>f.final.evidenceLoad.searchLatencyMs[0]=NaN,f=>f.final.verifiedDurationMs=1799999,f=>f.batches++,f=>f.trace=null];
 for(const kind of ['client','server','search'])mutations.push(f=>f.trace[kind].pop(),f=>f.trace[kind][0].id=2,f=>f.trace[kind][0].loss=true);
 for(const mutate of mutations){const f=performanceFixture();mutate(f);assert.equal(searchPerformanceResult(f).status,'INCOMPLETE');}
});
test('existing Completion rejection reaches diagnostic INCOMPLETE without relaxation',()=>{
 const bytes=Buffer.byteLength(completionLine);
 const evidence='[recording-evidence] '+JSON.stringify({stage:'a'.repeat(128),first:'b'.repeat(128),exception:0,builder:'c'.repeat(128),http:'d'.repeat(128),published:0,checked:1,current:1,captureRevision:1,checkRevision:1})+'\n';
 for(const text of [completionLine,completionLine+receipt(1,bytes,{lost:true}),completionLine+receipt(1,bytes,{writeError:true}),completionLine+receipt(1,bytes+1),'[recording-completion] {bad}\n','[recording-completion] {',completionLine.repeat(4096),evidence.repeat(3300)]){
  const f=performanceFixture();f.completion=[collect(text)];assert.equal(f.completion[0].status,'incomplete');assert.equal(searchPerformanceResult(f).status,'INCOMPLETE');
 }
 const app={bytes:4*1024*1024};let stopped=0;captureBoundedProcessLog(app,Buffer.from('x'),()=>assert.fail('cap must precede write'),()=>stopped++);assert.equal(stopped,1);assert.equal(app.captureError,'byte-cap');
 const f=performanceFixture();f.logsCaptured=false;assert.equal(searchPerformanceResult(f).status,'INCOMPLETE');
});
test('actual generated search mode keeps workload, old gates, environment and early capacity stop',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-search-performance-'));
 try{
  const out=path.join(root,'overlay');const r=spawnSync('python3',['-B','-c',"import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]))",out],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
  const generated=fs.readFileSync(path.join(out,'mixed.mjs'),'utf8'),original=fs.readFileSync('scripts/internal/v450_recording_a_mixed.mjs','utf8');
  assert.equal(spawnSync(process.execPath,['--check',path.join(out,'mixed.mjs')]).status,0);
  assert.equal(spawnSync('bash',['-n',path.join(out,'wrapper.sh')]).status,0);
  const modes=generated.slice(generated.indexOf('const stateDiagnose='),generated.indexOf('const fixtureProfile='));
  const gate=generated.match(/check\(Object\.values\(phaseResult.channels\)[^;]+;/)[0];
  for(const args of [['--state-diagnostic'],['--duration-minutes','120'],['--contention-diagnostic'],['--memory-attribution-diagnostic'],['--search-performance-diagnostic']]){
   const performanceDiagnose=args[0]==='--search-performance-diagnostic',context={args,performanceDiagnose,memoryObservationMode:a=>a[0]==='--state-diagnostic',mixedPreparationContract,phaseResult:{channels:{9101:{finalized:1,deleted:0},9201:{finalized:1,deleted:0}}},check:ok=>assert(ok)};
   vm.runInNewContext(modes+"globalThis.contract=preparationContract;globalThis.state=stateDiagnose;globalThis.isDiagnostic=diagnose;",context);
   assert.equal(context.contract.requiresDeletion,['--state-diagnostic','--duration-minutes'].includes(args[0]));
   context.contract.requiresDeletion?assert.throws(()=>vm.runInNewContext(gate,context)):vm.runInNewContext(gate,context);
   if(performanceDiagnose){assert.equal(context.state,true);assert.equal(context.isDiagnostic,true);}
  }
  for(const text of ['aLoad.start(begin,2700000)','stateDiagnose?1800000','stateDiagnose?1870000','if(!performanceDiagnose&&!aLoad.active&&selectedTrace.ready','app.completionTrace.append(chunk','selectedTrace.append(chunk','const bound=selectedTrace.complete();selectedBound=bound;','stateDiagnosticPass:false','final.searchPerformance.status'])assert(generated.includes(text),text);
  assert(generated.indexOf('if(performanceDiagnose)assertSearchPerformanceCapacity();')<generated.indexOf('const artifacts='));
  // No requests, sources, authentication, writer, collector or cleanup implementation changes.
  for(const [begin,end] of [['async function evidenceLoad(app){','async function launch('],['function environment(','async function request(']]){
   const actual=generated.slice(generated.indexOf(begin),generated.indexOf(end,generated.indexOf(begin)));
   if(begin.startsWith('async function evidenceLoad')){const before=original.slice(original.indexOf(begin),original.indexOf(end,original.indexOf(begin)));assert.equal(actual,before.replace("const all=await Promise.all(routes.map(route=>evidenceFetch(app,route)));","const selectedBatch=selectedBatchOrdinal++;const all=await Promise.all(routes.map((route,i)=>evidenceFetch(app,route,'GET',undefined,selection(selectedBatch,i))));"));}
   else{const env=vm.runInNewContext('('+actual+')(1,2,3)',{stateExecution:null,path,process:{env:{PATH:process.env.PATH,HOME:root,R165_BINARY:'/owned/instrumented'}},root,repo:process.cwd(),diagnose:true,stateDiagnose:true,short:false,frameTraceMode:'bounded',memoryObserve:true,memoryDiagnose:false,contentionDiagnose:false});assert.equal(env.MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE,'0');assert.equal(env.MEDIA_SERVER_VERIFY_RECORDING_COMPLETION_TRACE,'1');}
  }
  const terminal=generated.slice(generated.indexOf('if(performanceDiagnose){try{selectedBound='),generated.lastIndexOf('\n}'));
  for(const mode of ['pass','latency','completion','correlation','partial']){
   const f=performanceFixture();if(mode==='latency')f.final.evidenceLoad.searchLatencyMs.fill(2001);if(mode==='completion')f.completion=[collect(completionLine)];if(mode==='correlation')f.trace.search.pop();
   let checkpoint=null;const context={officialFirstFailure:null,performanceDiagnose:true,final:f.final,selectedBound:null,selectedTrace:{failure:()=>null,complete:()=>{if(mode==='partial')throw Error('partial-terminal');return f.trace;}},performanceCompletion:f.completion,performanceLogs:[true],processes:[{}],selectedBatchOrdinal:f.batches,searchPerformanceResult,checkpointSearchPerformanceReport:(a,r)=>a.checkpoint(r),failed:0,resultFailed:false,phaseResult:f.final.phase,latencyPassed:mode!=='latency',artifacts:{checkpoint:r=>checkpoint=r},console:{log(){}},process:{}};
   vm.runInNewContext(terminal,context);const expected=mode==='pass'?'PASS':mode==='latency'?'FAIL':'INCOMPLETE';assert.equal(checkpoint.status,expected);assert.equal(checkpoint.diagnosticCompleted,expected==='PASS');assert.equal(context.process.exitCode,expected==='PASS'?0:1);
   assert.equal(context.final.searchPerformance.releaseQualification,'NOT_RUN');
  }
  const blocked=spawnSync('bash',[path.join(out,'wrapper.sh'),'--search-performance-diagnostic'],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH}});assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/CAPACITY_UNPROVEN/);assert.doesNotMatch(blocked.stderr,/owned parent run required/);assert.deepEqual(fs.readdirSync(root),['overlay']);
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

import {failureCollector,attributionError} from './recording_accumulated_cost.mjs';
const fw=(kind,r)=>Buffer.from(`[R171-${kind}] ${JSON.stringify(r)}\n`);
const fc=id=>({id,loss:false,status:503,phase:'complete',outcome:'ok',headerReceived:true,totalElapsedMs:3886,bytes:40,reason:'recording-search-unavailable'});
const fsrv=id=>({id,loss:false,dispatch:10,handler:20,prepared:900,sendBegin:910,sendEnd:920,end:930,status:503,sent:true});
const fq=id=>({id,loss:false,begin:30,end:890,diagnosticStatus:503,exception:'none',rejections:[0,0],detail:true,attempts:[{stage:'validate-source',reason:'search-source-changed',captured:7,current:8,authority:true},{stage:'validate-source',reason:'search-source-changed',captured:8,current:9,authority:true}],captures:[[1,0,0,40,300,8,8,900,100,120,8,7,10,110,7,1,7,7,0,0,true],[2,0,1,350,700,9,9,1000,110,200,9,8,10,120,8,1,8,8,0,0,true]],phases:[['Capture',40,301],['Capture',350,701]]});
function feed(c,id=1,q=fq(id)){c.start(id);c.append(fw('dispatch',{id,at:10,loss:false}),1);c.append(fw('search-enter',{id,at:30,loss:false}),1);c.append(fw('search',q),1);c.append(fw('server',fsrv(id)),1);c.client(fc(id));}
test('R171 separate IDs preserve selected contract and two Capture attempts',()=>{
 const c=failureCollector(),selected=costCollector();selected.start(1);selected.client(client(1));selected.append(wire('search',search(1)),1);selected.append(wire('server',server(1)),1);feed(c);
 assert.equal(selected.complete().search.length,1);const r=c.complete();assert.equal(r.requests[0].search.captures.length,2);assert.deepEqual(r.requests[0].search.captures.map(x=>x[2]),[0,1]);assert.equal(r.requests[0].client.reason,'recording-search-unavailable');
 const safe=attributionError(Buffer.from('{"error":"recording-search-unavailable"}'));assert.equal(safe,'recording-search-unavailable');assert.equal(attributionError(Buffer.from('{"error":"token /private/secret"}')),'UNKNOWN');
});
test('R171 header timeout never invents server entry or cause; terminal missing fails closed',()=>{
 const c=failureCollector();c.start(1);c.client({...fc(1),status:null,phase:'header',outcome:'timeout',headerReceived:false,bytes:0,totalElapsedMs:5003,reason:'UNKNOWN'});
 assert.equal(c.snapshot()[0].internalCause,'UNKNOWN');assert.equal(c.snapshot()[0].dispatchObserved,false);assert.throws(()=>c.complete(),/missing-terminal/);
});
test('R171 async split records and bounded normal success',()=>{
 const c=failureCollector();c.start(2);c.start(1);
 for(const id of [1,2]){c.append(fw('dispatch',{id,at:10,loss:false}),1);const q={...fq(id),detail:false,phases:[],captures:[],diagnosticStatus:200};c.append(fw('search-enter',{id,at:30,loss:false}),1);const bytes=fw('search',q);c.append(bytes.subarray(0,13),1);c.append(bytes.subarray(13),1);c.client({...fc(id),status:200,reason:'UNKNOWN'});c.append(fw('server',{...fsrv(id),status:200}),1);}
 assert.equal(c.complete().details,0);
});
test('R171 malformed duplicate ID wrong shape nested reversal and cost loss are sticky',()=>{
 for(const mutate of [q=>q.id=0,q=>q.id=2,q=>q.loss=true,q=>q.captures[1][2]=3,q=>q.captures[0][4]=1,q=>q.captures[0][8]=1000,q=>q.captures[0][10]=2**64,q=>q.captures[1][1]=1,q=>q.attempts[0].reason='/secret',q=>q.phases[0][1]=0]){
  const c=failureCollector();c.start(1);const q=fq(1);mutate(q);c.append(fw('search',q),1);assert(c.failure());const first=c.failure();c.append(fw('search',fq(1)),1);assert.equal(c.failure(),first);
 }
 for(const b of [Buffer.from('[R171-search] bad\n'),Buffer.from('[R171-search] '+'x'.repeat(16384)+'\n')]){const c=failureCollector();c.append(b,1);assert(c.failure());}
 const partial=failureCollector();partial.append(Buffer.from('[R171-search] {'),1);assert.throws(()=>partial.complete(),/tail/);
 const c=failureCollector();feed(c);c.append(fw('search',fq(1)),1);assert(c.failure());
 const starts=failureCollector();starts.start(1);assert.throws(()=>starts.start(1));assert.throws(()=>failureCollector().start(513));
});
test('R171 detail budget is explicit loss, never silently drops late slow captures',()=>{
 const c=failureCollector();for(let id=1;id<=24;id++)feed(c,id);assert.equal(c.complete().details,24);
 c.start(25);c.append(fw('search',fq(25)),1);assert.match(c.failure().code,/detail-cap/);
});
test('R171 actual generated overlay opt-in keeps old default and capacity guard',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-r171-generator-'));
 try{
  for(const enabled of [false,true]){const out=path.join(root,enabled?'on':'off');const r=spawnSync('python3',['-B','-c',"import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]),sys.argv[2]=='1')",out,enabled?'1':'0'],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
   const mixed=fs.readFileSync(path.join(out,'mixed.mjs'),'utf8');assert.equal(spawnSync(process.execPath,['--check',path.join(out,'mixed.mjs')],{encoding:'utf8'}).status,0);
   assert.equal(mixed.includes('VERIFY_SEARCH_ATTRIBUTION:1'),enabled);assert.equal(mixed.includes('X-R171-ID'),enabled);assert(mixed.includes('AbortSignal.timeout(5000)'));assert(mixed.includes('if(performanceDiagnose)assertSearchPerformanceCapacity();'));assert(mixed.includes('VERIFY_RECORDING_LATENCY_TRACE:0,VERIFY_RECORDING_COMPLETION_TRACE:1'));
   const source=fs.readFileSync(path.join(out,'recording_search_application_service.cpp'),'utf8');assert.equal(source.includes('r171::Search failure_request(diagnostic)'),enabled);
   if(enabled){assert(mixed.includes('failureTrace.append(chunk'));assert(mixed.includes('final.failureAttribution=failureTrace.complete()'));assert(mixed.includes("++failureOrdinal:0"));assert(mixed.includes("'X-R154-ID'"));}
  }
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

test('R171 actual capacity code/model stages and observed status must agree',()=>{
 assert.equal(attributionError(Buffer.from('{"error":"search-capacity-exceeded"}')),'search-capacity-exceeded');
 for(const stage of ['model-build','model-delta']){const c=failureCollector(),q=fq(1);q.attempts[0].stage=stage;q.attempts[0].reason='search-capacity-exceeded';feed(c,1,q);assert.equal(c.complete().status,'captured');}
 const c=failureCollector();c.start(1);c.append(fw('dispatch',{id:1,at:10,loss:false}),1);c.append(fw('search-enter',{id:1,at:30,loss:false}),1);c.append(fw('search',fq(1)),1);c.append(fw('server',{...fsrv(1),status:200}),1);c.client(fc(1));assert.throws(()=>c.complete(),/http-status/);
});

test('R171 live collector rejects invalid ID and signals owned child before continued work',async()=>{
 const child=spawn(process.execPath,['-e',`process.stdout.write('[R171-dispatch] {"id":0,"at":1,"loss":false}\\n');setInterval(()=>process.stdout.write('continued\\n'),1000);`],{detached:true,stdio:['ignore','pipe','pipe']});
 const c=failureCollector();let detected=null,signalled=null,raw='';
 child.stdout.on('data',b=>{raw+=b.toString();c.append(b,0);if(c.failure()&&detected===null){detected=performance.now();process.kill(-child.pid,'SIGTERM');signalled=performance.now();}});
 const timeout=setTimeout(()=>process.kill(-child.pid,'SIGKILL'),3000);
 try{const [code,signal]=await once(child,'exit');assert.equal(code,null);assert.equal(signal,'SIGTERM');assert.ok(signalled-detected<100);assert.doesNotMatch(raw,/continued/);assert.throws(()=>process.kill(-child.pid,0),e=>e.code==='ESRCH');console.log(JSON.stringify({role:'R171-invalid-ID',pid:child.pid,detectionToSignalMs:signalled-detected,groupAbsent:true}));}finally{clearTimeout(timeout);}
});

import {mandatoryRequestLedger,settleLedgerBatch} from './recording_accumulated_cost.mjs';
const ledgerProcess={pid:5001,startIdentity:'linux:42',valid:true,error:null};
function ledger(){const c=mandatoryRequestLedger();c.bindProcess(ledgerProcess,{pid:5001,seq:1});return c;}
// S03-LEDGER-RESOURCE-ZERO-F01: actual collector, synthetic native identity; no process launch.
test('ledger resource zero: opened sample binds unchanged and progresses',()=>{
 const state=resourceTraceCollector(5001),c=mandatoryRequestLedger();
 const row={pid:5001,seq:0,phase:'opened',elapsedMs:12,ram:1189540,ramPeak:2057915,ramLimit:671088640,ramRejected:0,scratchDisk:73728,scratchDiskPeak:90112,scratchDiskLimit:161901191168,scratchFd:4,scratchFdPeak:6,scratchFdLimit:1048572,scratchRam:1188864,preservedDisk:0,preservedFd:0,readerCleanupHealthy:true};
 collectResourceTrace(state,Buffer.from('[recording-resource] '+JSON.stringify(row)+'\n'));
 assert.equal(state.error,null);assert.equal(currentResourceTrace(state).seq,0);
 c.bindProcess(ledgerProcess,currentResourceTrace(state));c.bindProcess(ledgerProcess,currentResourceTrace(state));
 const start=JSON.parse(c.start(1,{kind:'structured',pid:5001,startedMs:1}).slice('[R171-start] '.length));
 assert.equal(start.resourceSequence,0);assert.equal(start.startIdentity,ledgerProcess.startIdentity);
 collectResourceTrace(state,Buffer.from('[recording-resource] '+JSON.stringify({...row,seq:1,phase:'sample',elapsedMs:13})+'\n'));
 c.bindProcess(ledgerProcess,currentResourceTrace(state));assert.equal(c.failure(),null);
 assert.throws(()=>c.bindProcess(ledgerProcess,{pid:5001,seq:0}),/ledger-resource-sequence/);
 assert.equal(c.report({cleanupComplete:false}).firstFailure.code,'ledger-resource-sequence');
});
test('ledger resource zero: invalid sequence identity and first failure remain closed',()=>{
 for(const seq of [-1,0.5,'0',null,undefined,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
  const c=mandatoryRequestLedger();assert.throws(()=>c.bindProcess(ledgerProcess,{pid:5001,seq}),/ledger-resource-binding/);
  assert.throws(()=>c.start(1,{kind:'structured',pid:5001,startedMs:1}),/ledger-stopped/);
  assert.equal(c.report({cleanupComplete:false}).firstFailure.code,'ledger-resource-binding');
 }
 const c=mandatoryRequestLedger();c.bindProcess(ledgerProcess,{pid:5001,seq:0});
 assert.throws(()=>c.bindProcess({...ledgerProcess,startIdentity:'linux:999'},{pid:5001,seq:0}),/ledger-identity-changed/);
 for(const [m,r,code] of [[ledgerProcess,{pid:5002,seq:0},'ledger-resource-binding'],[{...ledgerProcess,startIdentity:null},{pid:5001,seq:0},'ledger-process-identity']]){
  assert.throws(()=>mandatoryRequestLedger().bindProcess(m,r),new RegExp(code));
 }
});
replayTest('closeout','ledger resource zero: child exit and later evidence failures stay separate',({finalizer:officialFinalizer})=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-seq0-finalization-mock-');fs.chmodSync(root,0o700);
 try{
  const code=String.raw`
import os,sys,pathlib,json,importlib.util,hashlib
os.umask(0o077);root=pathlib.Path(sys.argv[1]);source=pathlib.Path(sys.argv[2])
assert hashlib.sha256(source.read_bytes()).hexdigest()=='af234c2f9d1003220f79800a965962f01b820927517226430522256e2a81b200'
spec=importlib.util.spec_from_file_location('finalizer',source);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
e=root/'evidence';e.mkdir(mode=0o700);(e/'diagnostic').mkdir(mode=0o700);(root/'work').mkdir(mode=0o700)
for name in ['claimed.json','source.json','runner.txt']:(root/name).write_text('{}')
(e/'diagnostic/report.json').write_text(json.dumps({'status':'INCOMPLETE','failureAttribution':{'firstFailure':{'code':'ledger-resource-binding'}}}))
(e/'diagnostic/ledger.json').write_text('{}')
def parent():
 assert json.loads((e/'execution.json').read_text())['execution']['childExit']==1
 return {'complete':False}
def post():raise ValueError('official-report-not-pass')
def cleanup():raise AssertionError('failed run must preserve work')
r=m.SearchFinalization(root,lambda:None).run(runner=root/'runner.txt',source_binding=root/'source.json',run_owned_call=lambda:{'status':'FAIL','exit':1,'childExit':1},preserve_parent=parent,postflight=post,owned_groups=lambda _:True,cleanup_work=cleanup)
assert r['firstFailure']['code']=='supervisor-return-failure' and r['firstFailure']['childExit']==1
assert [x['stage'] for x in r['evidenceErrors']]==['parent-receipt','postflight']
assert r['status']=='FINALIZATION_INCOMPLETE' and (root/'work').exists() and not r['cleanupErrors']
assert json.loads((e/'diagnostic/report.json').read_text())['failureAttribution']['firstFailure']['code']=='ledger-resource-binding'
assert json.loads((e/'finalization-complete.json').read_text())['status']=='FINALIZATION_INCOMPLETE'
print('PASS synthetic exit=1; original ledger error, later evidence errors and retained work remain distinct')
`;
  const p=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',code,root,officialFinalizer],{encoding:'utf8',timeout:10000,maxBuffer:32768});
  console.log(p.stdout);assert.equal(p.status,0,p.stderr);
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});
const lstart=(c,id,kind='structured')=>c.start(id,{kind,pid:5001,startedMs:100});
const lc=(id,extra={})=>({v:2,id,pid:5001,status:200,phase:'complete',outcome:'ok',headerReceived:true,totalElapsedMs:100,endedMs:200,bytes:10,reason:'UNKNOWN',...extra});
const ls=(id,extra={})=>({v:2,id,pid:5001,dispatch:10,handler:20,prepared:2000000200,sendBegin:2000000300,sendEnd:2000000400,end:2000000500,status:200,sent:true,loss:false,...extra});
const lq=(id,ordinal=0,extra={})=>({v:2,id,pid:5001,begin:30,end:ordinal?2000000030:1030,diagnosticStatus:200,exception:'none',rejections:[0,0],loss:false,retry:0,waitNs:10,holdNs:100,
 detailEligible:!!ordinal,detailOrdinal:ordinal,detailState:ordinal?(ordinal<=24?'captured':'detail-cap'):'not-selected',attempts:[{stage:'refresh',reason:'none',captured:7,current:7,authority:true}],...extra});
const ld=id=>({v:2,pid:5001,id,captures:[],phases:[['preparation-wait',30,40],['preparation-hold',40,140]]});
function ledgerFinish(c,id,{kind='structured',ordinal=0,searchExtra={},clientExtra={},serverExtra={}}={}){
 if(kind==='structured'){const q=lq(id,ordinal,searchExtra);c.append(fw('search',q),1,5001);if(q.detailState==='captured')c.append(fw('detail',ld(id)),1,5001);}
 c.append(fw('server',ls(id,serverExtra)),1,5001);return c.client(lc(id,clientExtra));
}
for(const count of [23,24,25,160])test(`ledger v2 detail boundary ${count} preserves all mandatory terminals`,()=>{
 const c=ledger();for(let id=1;id<=count;id++)lstart(c,id);
 // Reverse completions exercise non-ID-ordered detail selection.
 for(let id=count;id>=1;id--)ledgerFinish(c,id,{ordinal:count-id+1});
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.requests.length,count);
 assert.equal(r.detail.eligible,count);assert.equal(r.detail.records,Math.min(24,count));assert.equal(r.detail.omittedCap,Math.max(0,count-24));
 assert.equal(r.metrics.structured.terminalMissing,0);assert.equal(r.detail.errors,0);
 if(count>24)assert.deepEqual(r.detail.firstOmission,{id:count-24,ordinal:25,reason:'detail-cap'});
});
test('ledger 160 Structured + 160 Visual, IDs159/160, separate exact nearest-rank metrics',()=>{
 const c=ledger();for(let id=1;id<=320;id++)lstart(c,id,id<=160?'structured':'visual');
 for(let id=320;id>=1;id--)ledgerFinish(c,id,{kind:id<=160?'structured':'visual',ordinal:id<=160?161-id:0,clientExtra:{totalElapsedMs:id<=160?10:100}});
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.metrics.combined.started,320);assert.equal(r.metrics.combined.completed,320);
 assert.deepEqual([r.metrics.structured.p50,r.metrics.structured.p90,r.metrics.structured.p95,r.metrics.structured.max],[10,10,10,10]);
 assert.equal(r.metrics.visual.p95,100);assert.equal(r.metrics.combined.p95,100);assert.equal(r.metrics.combined.validSamples,320);
 for(const id of [159,160])assert(r.requests.find(q=>q.id===id).client);
 assert.equal(r.requests[160].retry,null);assert.equal(r.requests[160].serverSearchLatencyMs,null);assert.equal(r.requests[160].searchObservation,'not-instrumented');
 assert(r.bytes.mandatoryServer<=384*1024&&r.bytes.optionalDetail<=128*1024&&r.bytes.client<=256*1024);
 assert.equal(r.full30minCapacity,'UNPROVEN');assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});
test('ledger 159/160 missing client is incomplete despite HTTP200',()=>{
 const c=ledger();for(let id=1;id<=160;id++){lstart(c,id);if(id<159)ledgerFinish(c,id);else{c.append(fw('server',ls(id)),1,5001);c.append(fw('search',lq(id)),1,5001);}}
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'incomplete');assert.equal(r.metrics.structured.terminalMissing,2);assert.equal(r.metrics.structured.validSamples,158);
 assert.equal(r.requests[159].state,'supervisor-incomplete');assert.equal(r.requests[159].client,null);
});
test('ledger producer loss retained; late inflight client survives and new start stops',()=>{
 const c=ledger();lstart(c,1);lstart(c,2);c.append(fw('search',lq(1,0,{loss:true})),1,5001);const first=c.failure();
 c.append(fw('server',ls(1)),1,5001);c.client(lc(1));ledgerFinish(c,2);assert.throws(()=>lstart(c,3),/stopped/);
 const r=c.report({cleanupComplete:true});assert.equal(r.firstFailure,first);assert.equal(r.metrics.combined.completed,2);assert.equal(r.status,'incomplete');
});
test('ledger malformed row does not poison following same-chunk or later terminals',()=>{
 const c=ledger();lstart(c,1);lstart(c,2);c.append(Buffer.concat([Buffer.from('[R171-search] bad\n'),fw('search',lq(1)),fw('server',ls(1))]),1,5001);c.client(lc(1));ledgerFinish(c,2);
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'incomplete');assert(r.requests.every(q=>q.client&&q.search&&q.server));
});
test('ledger duplicate, source revision shape, status and process identity fail closed',()=>{
 for(const mutate of [q=>q.pid++,q=>q.retry=3,q=>q.attempts[0].captured=-1,q=>q.detailOrdinal=25,q=>q.waitNs=2000,q=>q.attempts[0].reason='secret']){
  const c=ledger();lstart(c,1);const q=lq(1);mutate(q);c.append(fw('search',q),1,5001);assert(c.failure());
 }
 const c=ledger();lstart(c,1);ledgerFinish(c,1);assert.throws(()=>c.client(lc(1)),/duplicate/);
 const d=ledger();lstart(d,1);ledgerFinish(d,1,{serverExtra:{status:503}});assert.equal(d.failure().code,'ledger-search-binding');assert.throws(()=>lstart(d,2),/stopped/);assert.equal(d.report({cleanupComplete:true}).firstFailure.code,'ledger-search-binding');
 const e=ledger();lstart(e,1);e.append(fw('search',lq(1)),1,5002);assert.equal(e.failure().code,'ledger-stream-pid');
 for(const [m,r] of [[{...ledgerProcess,startIdentity:'linux:43'},{pid:5001,seq:2}],[ledgerProcess,{pid:5002,seq:2}],[{...ledgerProcess,startIdentity:null},{pid:5001,seq:2}],[ledgerProcess,{pid:5001,seq:0}]])assert.throws(()=>ledger().bindProcess(m,r));
 const f=ledger();lstart(f,1);assert.throws(()=>lstart(f,1),/start-id/);assert.throws(()=>lstart(ledger(),513),/start-id/);
});
test('ledger missing phases remain null; missing Search terminal and partial client stay incomplete',()=>{
 const c=ledger();lstart(c,1);ledgerFinish(c,1,{searchExtra:{waitNs:null,holdNs:null}});const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.requests[0].preparationWaitNs,null);
 const d=ledger();lstart(d,1);d.append(fw('server',ls(1)),1,5001);d.client(lc(1));assert.equal(d.report({cleanupComplete:true}).firstFailure.code,'ledger-missing-search');
 const e=ledger();lstart(e,1);ledgerFinish(e,1,{clientExtra:{phase:'body'}});assert.equal(e.report({cleanupComplete:true}).status,'incomplete');
});
test('ledger timeout/cancel/error and explicit no-timing are not synthetic success',()=>{
 const c=ledger();const outcomes=['timeout','cancelled','error','incomplete'];
 for(let i=0;i<4;i++)lstart(c,i+1,'visual');
 for(let i=0;i<4;i++){c.append(fw('server',ls(i+1,{status:0,sent:false,sendBegin:0,sendEnd:0})),1,5001);c.client(lc(i+1,{status:null,headerReceived:false,phase:i===3?'unobserved':'header',outcome:outcomes[i],totalElapsedMs:i===3?null:100,bytes:0}));}
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'incomplete');assert.deepEqual([r.metrics.visual.success,r.metrics.visual.timeouts,r.metrics.visual.cancelled,r.metrics.visual.errors,r.metrics.visual.terminalMissing],[0,1,1,1,1]);assert.equal(r.metrics.visual.p95,null);
 const d=ledger();lstart(d,1);ledgerFinish(d,1,{searchExtra:{diagnosticStatus:503},serverExtra:{status:503},clientExtra:{status:503,reason:'recording-search-unavailable'}});const dr=d.report({cleanupComplete:true});assert.equal(dr.status,'captured');assert.equal(dr.metrics.structured.errors,1);assert.equal(dr.metrics.structured.validSamples,0);
});
test('ledger optional budget omission is audited; malformed or missing detail stays failure',()=>{
 const c=ledger();lstart(c,1);ledgerFinish(c,1,{ordinal:1,searchExtra:{detailState:'detail-byte-budget'}});const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.detail.omittedBytes,1);assert.equal(r.detail.firstOmission.reason,'detail-byte-budget');
 const d=ledger();lstart(d,1);d.append(fw('search',lq(1,1)),1,5001);d.append(fw('server',ls(1)),1,5001);d.client(lc(1));assert.equal(d.report({cleanupComplete:true}).firstFailure.code,'ledger-missing-detail');
 const e=ledger();lstart(e,1);e.append(fw('search',lq(1,1)),1,5001);e.append(fw('detail',{...ld(1),phases:[['bad',50,1]]}),1,5001);e.client(lc(1));assert.equal(e.report({cleanupComplete:true}).detail.errors,1);
});
test('ledger mandatory/client/line caps remain failures without changing legacy limits',()=>{
 const c=ledger();lstart(c,1);assert.throws(()=>c.client(lc(1,{padding:'x'.repeat(600)})),/client-cap/);
 const d=ledger();lstart(d,1);d.append(Buffer.from('[R171-server] '+'x'.repeat(16384)+'\n'),1,5001);assert(d.failure());assert.doesNotThrow(()=>d.client(lc(1)));assert.equal(d.report({cleanupComplete:true}).status,'incomplete');
 const e=ledger();for(let id=1;id<=320;id++)lstart(e,id);for(let id=1;id<=320;id++){e.append(fw('search',lq(id,0,{padding:'x'.repeat(1000)})),1,5001);e.client(lc(id));}
 assert.equal(e.failure().code,'ledger-server-cap');assert.equal(e.report({cleanupComplete:true}).metrics.combined.completed,320);
 const header=fs.readFileSync('scripts/internal/recording_http_cost_probe.h','utf8');assert.match(header,/RequestCap=512,DetailCap=24/);assert.match(header,/ByteCap=512\*1024/);assert.match(header,/LedgerMandatoryCap=384\*1024,LedgerDetailCap=128\*1024/);assert.match(header,/LedgerMandatoryCap-192-ledgerMandatoryBytes/);
 assert(header.indexOf('LedgerWrite(b,n,sizeof(b))&&')<header.indexOf('LedgerWrite(detail,dn,sizeof(detail),true)'));
 assert.match(header,/if\(detail&&details.fetch_add\(1\)>=DetailCap\)\{r154::Lose\(175\);d.id=prior_id;return;/);
});
test('ledger allSettled drains inflight, reverse order and first failure; no subsequent batch',async()=>{
 const c=ledger(),completed=[];let resolveLate;
 const late=new Promise(r=>resolveLate=r);
 const run=settleLedgerBatch(c,[async()=>{lstart(c,1);throw Error('original-request-error');},async()=>{lstart(c,2,'visual');await late;ledgerFinish(c,2,{kind:'visual'});completed.push(2);}]);
 await new Promise(resolve=>setImmediate(resolve));assert(c.failure());resolveLate();await assert.rejects(run,/original-request-error/);assert.deepEqual(completed,[2]);
 let extra=0;await assert.rejects(()=>settleLedgerBatch(c,[()=>extra++]),/ledger-batch-failed/);assert.equal(extra,0);
 const r=c.report({cleanupComplete:false});assert.equal(r.firstFailure.code,'ledger-batch-failed');assert.equal(r.status,'incomplete');assert.equal(r.metrics.combined.terminalMissing,1);
 const d=ledger();lstart(d,1);ledgerFinish(d,1);assert.equal(d.report({cleanupComplete:false}).firstFailure.code,'ledger-cleanup-incomplete');
});
test('ledger generated opt-in links actual sample, all four requests and unchanged capacity guard',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-ledger-v2-'));
 try{
  const out=path.join(root,'overlay');const r=spawnSync('python3',['-B','-c',"import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]),mandatory_ledger=True)",out],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
  const mixed=fs.readFileSync(path.join(out,'mixed.mjs'),'utf8'),probe=fs.readFileSync(path.join(out,'recording_http_cost_probe.h'),'utf8'),runtime=fs.readFileSync(path.join(out,'webrtc_http_server_runtime.cpp'),'utf8');
  assert.equal(spawnSync(process.execPath,['--check',path.join(out,'mixed.mjs')],{encoding:'utf8'}).status,0);
  assert(probe.startsWith('#define MEDIA_SERVER_VERIFY_MANDATORY_LEDGER 1\n'));
  for(const text of ['failureTrace=mandatoryRequestLedger()','failureTrace.bindProcess(m,currentResourceTrace(app.resourceTrace))','failureTrace.append(chunk,stream===child.stdout?0:1,child.pid)','settleLedgerBatch(failureTrace,routes.map','settleLedgerBatch(failureTrace,[0,1]','failureTrace.report({cleanupComplete:','normalShutdownPass===true','if(!failureError)throw error','AbortSignal.timeout(5000)','if(performanceDiagnose)assertSearchPerformanceCapacity();'])assert(mixed.includes(text),text);
  assert(runtime.includes('request_opt->path=="/ops/api/recordings/visual-search"'));assert(mixed.includes("?'visual':null"));
  assert(!mixed.includes('failureTrace.complete()'));assert(!mixed.includes('failureTrace.snapshot()'));
  const {measuredHttpResponse}=await import('./recording_current_app_helpers.mjs');
  const fn=mixed.slice(mixed.indexOf('async function evidenceFetch('),mixed.indexOf('async function verifySavedEvidence('));
  for(const mode of ['success','cancelled','timeout','error','missing-timing']){
   const c=ledger(),writes=[];let clock=100;
   const context={performance:{now:()=>++clock},process:{stdout:{write:s=>writes.push(s)}},console:{log(){}},URLSearchParams,
    failureTrace:c,failureOrdinal:0,cancelled:false,selectedTrace:{failure:()=>null},aSelection:()=>0,aLoad:null,attributionError,
    AbortSignal:{timeout:ms=>{assert.equal(ms,5000);return {aborted:mode==='timeout',reason:mode==='timeout'?{name:'TimeoutError'}:undefined};}},
    measuredHttpResponse:mode==='missing-timing'?async()=>{throw Error('no-report');}:opts=>measuredHttpResponse({...opts,now:()=>++clock}),
    fetch:async(url,options)=>{assert(url.includes('channelIds=9101%2C9201'));const id=Number(options.headers['X-R171-ID']);assert.equal(id,1);
     c.append(fw('server',ls(id,mode==='success'?{}:{status:0,sent:false,sendBegin:0,sendEnd:0})),1,5001);
     if(mode!=='success'){const e=Error('sanitized');e.name=mode==='cancelled'?'AbortError':mode==='timeout'?'TimeoutError':'Error';throw e;}
     return {status:200,headers:{},body:(async function*(){yield Buffer.from('{}');})()};}
   };
   const call=vm.runInNewContext('('+fn+')',context),app={child:{pid:5001},base:'http://owned',cookie:'mock'};
   const task=call(app,'/ops/api/recordings/visual-search?channelIds=9101%2C9201');
   if(mode==='success')assert.equal((await task).status,200);else await assert.rejects(task);
   const r=c.report({cleanupComplete:true});assert.equal(r.requests.length,1);
   assert.equal(r.requests[0].client.outcome,mode==='success'?'ok':mode==='missing-timing'?'incomplete':mode);
   assert.equal(r.metrics.visual.success,mode==='success'?1:0);assert.equal(writes.length,2);
   if(mode!=='success')await assert.rejects(()=>call(app,'/ops/api/recordings/visual-search?channelIds=9101%2C9201'));
  }


  const hook=mixed.slice(mixed.indexOf('  for(const stream of [child.stdout,child.stderr])'),mixed.indexOf('\n  if(short){app.identity='));
  for(const mode of ['selected','completion','resource','memory','log']){
   const c=ledger();lstart(c,1);const handlers=[],signals=[];
   const child={pid:5001,stdout:{on:(event,fn)=>handlers.push(fn)},stderr:{on:(event,fn)=>handlers.push(fn)},kill:s=>signals.push(s)};
   const app={bytes:mode==='log'?4*1024*1024:0,logFd:1,completionTrace:{append(){if(mode==='completion')this.error='mock';}},resourceTrace:{},memoryTrace:{}};
   const context={child,app,captureBoundedProcessLog,fs:{writeSync:(fd,bytes)=>bytes.length},failureTrace:c,
    selectedTrace:{append(){},failure:()=>mode==='selected'?{code:'trace-loss'}:null},selectedFailureReported:false,cancelled:false,memoryObserve:true,
    collectResourceTrace:state=>{if(mode==='resource')state.error='mock';},collectMemoryAttribution:state=>{if(mode==='memory')state.error='mock';},console:{error(){}}};
   vm.runInNewContext(hook,context);handlers[1](Buffer.from('bounded mock log\n'));
   assert(c.failure(),mode);assert(signals.includes('SIGTERM'));assert.throws(()=>lstart(c,2),/stopped/);
   ledgerFinish(c,1);const r=c.report({cleanupComplete:true});assert(r.requests[0].client);assert.equal(r.status,'incomplete');
  }
  const budget=spawnSync('bash',[path.join(out,'wrapper.sh'),'--search-performance-diagnostic'],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH}});assert.notEqual(budget.status,0);assert.match(budget.stderr,/CAPACITY_UNPROVEN/);assert.deepEqual(fs.readdirSync(root),['overlay']);
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});

// Limited profile: virtual clocks only, no server/build/network.
function limitedClock(){let time=0;return {set:t=>{time=t;},now:()=>time,s:limitedSearchSchedule({startedAt:0,now:()=>time})};}
test('limited exact interval and independent hard deadline',()=>{
 const {s,set}=limitedClock();s.begin();for(let i=0;i<4;i++)s.request();s.settled(true);
 set(14999);assert.equal(s.decision().reason,'interval');set(15000);assert.equal(s.decision().start,true);
 set(235000);assert.equal(s.decision().start,true);set(235001);assert.equal(s.decision().reason,'finish-reserve');
 set(300000);assert.equal(s.decision().reason,'limited-deadline');assert.equal(s.report({cleanupComplete:true}).status,'INCOMPLETE');
});
test('limited request cap and partial batch cannot claim completion',()=>{
 const {s}=limitedClock();s.begin();for(let i=0;i<4;i++)s.request();assert.throws(()=>s.request(),/request-bound/);s.settled(false);
 const r=s.report({cleanupComplete:true});assert.equal(r.startedRequests,4);assert.equal(r.completedBatches,0);assert.equal(r.all20Completed,false);
 assert.equal(limitedSearchContract.requests,80);assert.equal(limitedSearchContract.batches,20);
});
test('limited reserve is rechecked after sampling and before each request',async()=>{
 const {s,set}=limitedClock();let fetches=0;
 await runLimitedSearch({schedule:s,ledger:ledger(),sample:async()=>set(235001),routes:()=>[1,2,3,4],fetch:async()=>fetches++,pause:async()=>{}});
 assert.equal(fetches,0);assert.equal(s.report({cleanupComplete:true}).stopReason,'finish-reserve');
 const c=limitedClock();c.s.begin();c.set(235001);assert.throws(()=>c.s.request(),/request-deadline/);assert.equal(c.s.report({cleanupComplete:true}).startedRequests,0);
});
test('limited full virtual run records actual subset and 15s starts',async()=>{
 const c=limitedClock(),l=ledger(),starts=[];let requests=0;
 await runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>{},routes:()=>[1,2,3,4],fetch:async()=>{requests++;starts.push(c.now());},pause:async ms=>c.set(c.now()+ms)});
 const r=c.s.report({cleanupComplete:true});assert.equal(requests,64);assert.equal(r.completedBatches,16);assert.equal(r.all20Completed,false);
 assert.deepEqual(starts.filter((_,i)=>i%4===0),Array.from({length:16},(_,i)=>i*15000));
});
test('limited slow reverse completions preserve in-flight after first failure',async()=>{
 const c=limitedClock(),l=ledger();let launched=0,settled=0;const pending=[];
 const work=runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>{},routes:()=>[1,2,3,4],fetch:()=>{launched++;return new Promise((resolve,reject)=>pending.push({resolve,reject})).finally(()=>settled++);},pause:async()=>{}});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(launched,4);
 c.set(5000);pending[3].reject(Error('mock-http-timeout'));pending[2].resolve();pending[1].resolve();pending[0].resolve();
 await assert.rejects(work,/mock-http-timeout/);assert.equal(settled,4);assert.equal(launched,4);assert.equal(c.s.decision().start,false);
 assert.equal(c.s.report({cleanupComplete:false}).firstFailure.code,'mock-http-timeout');
});
for(const code of ['ledger-product-log','workspace-cap','ledger-resource-or-completion'])test('limited stops on '+code,async()=>{
 const c=limitedClock(),l=ledger();let n=0;l.fail(code);
 await assert.rejects(runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>{},routes:()=>[1,2,3,4],fetch:async()=>n++,pause:async()=>{}}),new RegExp(code));assert.equal(n,0);
});
test('limited capacity and official guard stay independently blocked',()=>{
 const c=limitedSearchCapacity();assert.equal(c.mandatoryServerBytes,122760);assert.equal(c.clientBytes,81920);assert.equal(c.optionalDetailBytes,131072);
 assert.equal(c.status,'BLOCKED');assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});
for(const count of [24,25])test('limited ledger detail '+count+' and distinct Structured/Visual',()=>{
 const c=ledger();for(let id=1;id<=count*2;id++)lstart(c,id,id%2?'structured':'visual');
 for(let id=count*2;id>=1;id--)ledgerFinish(c,id,{kind:id%2?'structured':'visual',ordinal:id%2?count-(id-1)/2:0});
 const r=c.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.detail.captured,24);assert.equal(r.detail.omittedCap,count-24);
 assert.equal(r.metrics.structured.started,count);assert.equal(r.metrics.visual.started,count);
});
for(const outcome of ['error','timeout','cancelled','incomplete'])test('limited actual client outcome '+outcome,()=>{
 const c=ledger();lstart(c,1);ledgerFinish(c,1,{clientExtra:{status:null,headerReceived:false,phase:'unobserved',outcome,totalElapsedMs:null},serverExtra:{status:200}});
 const r=c.report({cleanupComplete:true});assert.equal(r.requests[0].client.outcome,outcome);assert.equal(r.status,'incomplete');
});
test('limited missing terminal and failed cleanup remain failures',()=>{
 const c=ledger();lstart(c,1);assert.equal(c.report({cleanupComplete:true}).status,'incomplete');
 const d=limitedClock();d.s.begin();d.s.request();d.s.settled(false);const first=d.s.report({cleanupComplete:true}).firstFailure;
 assert.deepEqual(d.s.report({cleanupComplete:false}).firstFailure,first);
 const e=limitedClock();assert.equal(e.s.report().firstFailure.code,'limited-cleanup');
});
test('limited generated opt-in isolated; default and mandatory profiles unchanged',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-limited-mock-'));
 try{const code="import sys;from pathlib import Path;sys.path.insert(0,'scripts/internal');from recording_accumulated_cost import generate;generate(Path(sys.argv[1]),mandatory_ledger=True,limited_search=True);generate(Path(sys.argv[2]),mandatory_ledger=True)";
 const r=spawnSync('python3',['-B','-c',code,path.join(root,'limited'),path.join(root,'normal')],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);
 const s=fs.readFileSync(path.join(root,'limited/mixed.mjs'),'utf8'),normal=fs.readFileSync(path.join(root,'normal/mixed.mjs'),'utf8');
 assert(!normal.includes('limitedDiagnose'));assert(s.includes("if(limitedDiagnose)assertLimitedSearchCapacity();"));assert(s.indexOf('assertLimitedSearchCapacity();')<s.indexOf('const artifacts='));
 for(const t of ['if(performanceDiagnose)assertSearchPerformanceCapacity();','limitedDiagnose?300000','limitedPreparationStart({originNs:process.env.MEDIA_SERVER_LIMITED_ORIGIN_NS})','limitedSearchSchedule({startedAt:0,now:()=>performance.now()-start})','failureTrace.bindProcess(m,currentResourceTrace(app.resourceTrace))','if(!limitedDiagnose&&!selectedId','AbortSignal.timeout(5000)','limited-http-failure'])assert(s.includes(t),t);
 assert.equal(spawnSync(process.execPath,['--check',path.join(root,'limited/mixed.mjs')],{encoding:'utf8',timeout:10000}).status,0);
 const wrapper=fs.readFileSync(path.join(root,'limited/wrapper.sh'),'utf8');assert(wrapper.indexOf('assertLimitedSearchCapacity')<wrapper.indexOf('observer_parent='));
 const a=fs.readFileSync(path.join(root,'limited/recording_http_cost_probe.h')),b=fs.readFileSync(path.join(root,'normal/recording_http_cost_probe.h'));assert(a.equals(b));
 }finally{fs.rmSync(root,{recursive:true});}
});
test('limited scheduler and unchanged ledger integrated virtual 64 requests',async()=>{
 const c=limitedClock(),l=ledger();let id=0,ordinal=0;
 await runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>l.bindProcess(ledgerProcess,{pid:5001,seq:id+1}),routes:()=>['structured','structured','visual','visual'],
 fetch:async kind=>{const n=++id,startedMs=c.now();l.start(n,{kind,pid:5001,startedMs});c.set(c.now()+100);ledgerFinish(l,n,{kind,ordinal:kind==='structured'?++ordinal:0,clientExtra:{endedMs:c.now()}});return {status:200};},pause:async ms=>c.set(c.now()+ms)});
 const r=l.report({cleanupComplete:true}),s=c.s.report({cleanupComplete:true});assert.equal(r.status,'captured');assert.equal(r.requests.length,64);assert.equal(s.startedRequests,64);assert.equal(s.completedBatches,16);
 assert.equal(r.detail.captured,24);assert.equal(r.detail.omittedCap,8);assert.equal(r.metrics.structured.started,32);assert.equal(r.metrics.visual.started,32);assert.equal(r.metrics.combined.terminalMissing,0);
});
test('limited zero work, invalid clock and 300s cleanup cannot pass',()=>{
 const a=limitedClock();assert.equal(a.s.report({cleanupComplete:true}).status,'INCOMPLETE');
 const b=limitedClock();b.set(-1);assert.throws(()=>b.s.decision(),/clock/);
 const c=limitedClock();c.s.begin();for(let n=0;n<4;n++)c.s.request();c.s.settled(true);c.set(300001);assert.equal(c.s.report({cleanupComplete:true}).firstFailure.code,'limited-deadline');
});

test('eligibility capacity retains unknown costs and existing capture contracts',()=>{
 const c=limitedSearchCapacity();assert.equal(c.status,'BLOCKED');assert.equal(c.costs.productLog.capBytes,4194304);assert.equal(c.costs.completion.rowCap,4096);
 for(const k of ['productLog','completion','resource','memory','startupShutdown','evidence','mediaSqliteJournal','copy','build'])assert.equal(c.costs[k].upperBytes,null,k);
 assert.equal(c.costs.parentLog.upperBytes,2097152);assert.equal(c.costs.parentReceipts.upperBytes,65536);assert.equal(c.costs.build.sharedSeconds,180);assert.equal(c.costs.copy.capBytes,469762048);assert.throws(assertLimitedSearchCapacity,/BLOCKED/);
});
test('eligibility isolated CMake, overlay, old archive and source/link rejection',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-eligibility-mock-');fs.chmodSync(root,0o700);
 const code=String.raw`
import sys,json,hashlib,subprocess
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal')
import recording_accumulated_cost as m
root=Path(sys.argv[1]);b=root/'build';plan=m.isolated_build_plan(b)
assert plan['limits']=={'sharedSeconds':180,'rssBytes':1073741824,'diskBytes':536870912,'outputBytes':2097152}
assert plan['commands'][1][-1]=='1' and plan['commands'][0][4]==str(b)
assert not any(str(m.REPO/'build-gst-onnx') in s for s in plan['commands'][0])
try:m.isolated_build_root(m.REPO/'build-gst-onnx');assert False
except ValueError:pass
m.generate(root/'overlay',mandatory_ledger=True,limited_search=True,build_root=b)
s=(root/'overlay/mixed.mjs').read_text();w=(root/'overlay/wrapper.sh').read_text()
assert 'BIN_PATH:'+json.dumps(str(root/'media_server')) in s
assert 'observer_build='+str(b) in w and 'observer_build="$observer_repo/build-gst-onnx"' not in w
assert w.index('assertLimitedSearchCapacity')<w.index('observer_parent=')
assert 'app.completionTrace.error||app.resourceTrace.error' in s and 'storage.capExceeded' in s and 'ledger-product-log' in s
b.mkdir();(b/'CMakeFiles/media_server_runtime.dir').mkdir(parents=True);(b/'CMakeFiles/media_server.dir').mkdir()
old=m.REPO/'build-gst-onnx';names=['libmedia_server_runtime.a','media_server','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt']
for n in names:(b/n).write_bytes((old/n).read_bytes() if n.endswith(('flags.make','link.txt')) else b'mock-build-not-product')
source='src/recording/recording_contracts.cpp';receipt={'head':'mock-head','buildRoot':str(b),'sourceSha256':{source:m.sha(m.REPO/source)},'buildSha256':{n:m.sha(b/n) for n in names}}
def git(cmd,**kw):return 'mock-head\n' if cmd[1]=='rev-parse' else (source+'\0').encode()
with patch.object(m.subprocess,'check_output',side_effect=git):
 assert m.verify_isolated_build_inputs(b,receipt)==b
 for key,value in [('head','old-head'),('sourceSha256',{}),('buildRoot',str(old)),('buildSha256',{})]:
  bad=dict(receipt);bad[key]=value
  try:m.verify_isolated_build_inputs(b,bad);assert False,key
  except ValueError:pass
names=['src/ingress/recording_search_application_service.cpp','src/ingress/webrtc_http_server_runtime.cpp','src/ingress/webrtc_http_server.cpp'];p={'sources':dict.fromkeys(names,{}),'objects':['/owned/'+Path(n).name+'.o' for n in names]};mapping='\n'.join(p['objects']);symbols='000 T RecordingApplicationService6Search\n001 T ReadHttpRequest\n'
m.verify_isolated_link(p,mapping,symbols)
for mapping,syms in [('',symbols),(mapping+' archive(recording_search_application_service.cpp.o)',symbols),(mapping,symbols+symbols)]:
 try:m.verify_isolated_link(p,mapping,syms);assert False
 except ValueError:pass
print('isolated binding synthetic checks PASS; no compiler/product')
`;
 try{const r=spawnSync('python3',['-B','-c',code,root],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stdout+r.stderr);}finally{fs.rmSync(root,{recursive:true});}
});
test('eligibility limited supervisor virtual clock includes cleanup and final binding',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-eligibility-supervisor-');
 const code=String.raw`
import sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal');import run_v450_recording_a_mixed as m
root=Path(sys.argv[1])
for elapsed,base in [(250,{'status':'PASS','exit':0}),(301,{'status':'PASS','exit':0}),(30,{'status':'FAIL','exit':1,'errorType':'mock-start-failure'}),(80,{'status':'FAIL','exit':1,'cleanupErrors':['mock-cleanup']})]:
 with patch.object(m,'run_owned',return_value=base.copy()) as run,patch.object(m.LimitedParentCapture,'preserve',return_value={'complete':True}),patch.object(m.time,'monotonic',side_effect=[0,elapsed]):
  r=m.run_limited_owned(['mock-only'],root/'unused',root,{},lambda _:None)
  assert run.call_args.args[2]==240
  assert r['finishReserveSeconds']==60 and r['hardDeadlineSeconds']==300
  assert r['status']==('PASS' if elapsed==250 else 'FAIL')
  if 'errorType' in base:assert r['errorType']==base['errorType']
  if 'cleanupErrors' in base:assert r['cleanupErrors']==base['cleanupErrors']
r=m.finish_limited_record(root/'receipt.json',{'status':'PASS','exit':0},300);assert r['status']=='FAIL'
print('supervisor Mock PASS; no process launched')
`;
 try{const r=spawnSync('python3',['-B','-c',code,root],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stdout+r.stderr);}finally{fs.rmSync(root,{recursive:true});}
});
test('eligibility preparation costs reduce actual starts, never increase deadline',async()=>{
 const c=limitedClock(),l=ledger();c.set(45000);let requests=0;
 await runLimitedSearch({schedule:c.s,ledger:l,sample:async()=>{},routes:()=>[1,2,3,4],fetch:async()=>requests++,pause:async ms=>c.set(c.now()+ms)});
 assert.equal(requests,52);assert.equal(c.s.report({cleanupComplete:true}).all20Completed,false);
});
test('eligibility launcher uses limited adapter, guarded binding and unchanged legacy budgets',()=>{
 const s=fs.readFileSync('scripts/internal/run_v450_recording_a_mixed.py','utf8');
 assert(s.includes("sys.argv[1]=='--limited-search-diagnostic'"));assert(s.includes("raise SystemExit(limited_entry(Path(sys.argv[2])))"));
 const entry=s.slice(s.indexOf('def limited_entry('),s.indexOf('def source_binding('));
 assert(entry.indexOf('verify_isolated_build_inputs')<entry.indexOf('run_limited_owned('));assert(entry.indexOf('assertLimitedSearchCapacity();')<entry.indexOf('directory.mkdir'));
 assert(entry.includes('verify_isolated_link(link_plan'));assert(entry.includes('limited-overlay-binding'));assert(entry.includes('limited-postflight-binding'));
 assert(s.includes("if sys.argv[1] in ('--120', '--state-diagnostic')"));assert(s.includes("else 180 if sys.argv[1] == '--prepare'"));
});

const parentCaptureMock=String.raw`
import sys,io,json,hashlib,os
from pathlib import Path
from unittest.mock import patch,Mock
sys.path.insert(0,'scripts/internal');import run_v450_recording_a_mixed as m
root=Path(sys.argv[1]);mode=sys.argv[2];cap=m.LIMITED_PARENT_OUTPUT_BYTES
assert cap==2097152
count=0
def capture(chunks,eof=True,prior=False):
 global count
 count+=1;p=root/(str(count)+'.log');c=m.LimitedParentCapture()
 with p.open('xb') as f:
  c.output=f
  if prior:c.fail('child-diagnostic')
  for b in chunks:c.push(b)
  c.eof=eof
 # Each capture uses its own receipt directory.
 d=root/str(count);d.mkdir();p.rename(d/'run.log');p=d/'run.log'
 r=c.preserve(p);assert r['storedBytes']<=cap;assert r['readbackVerified'];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['storedSha256']
 assert (d/'parent-output-receipt.json').stat().st_size<=32768
 return c,r,p
if mode=='normal':
 for chunks in [[],[b'out'],[b'err'],[b'out\n',b'err\n'],[b'a',b'b',b'c'],[bytes([n]) for n in '한글🙂\n'.encode()]]:
  c,r,p=capture(chunks);assert r['complete'] and p.read_bytes()==b''.join(chunks);assert r['observedBytes']==len(b''.join(chunks))
if mode=='boundary':
 for chunks in [[b'x'*(cap-1)],[b'x'*cap],[b'x'*(cap+1)],[b'x'*100,b'y'*(cap-99)],[b'o'*(cap//2),b'e'*(cap//2+1)]]:
  c,r,p=capture(chunks);n=sum(map(len,chunks));assert r['storedBytes']==min(n,cap);assert r['complete']==(n<cap)
  if n>=cap:assert r['firstFailure']['code']=='parent-output-cap'
if mode=='first':
 c,r,p=capture([b'[R165-first-',b'failure] {"code":"original"}\n',b'x'*cap],eof=False)
 assert r['firstFailure']['code']=='child-diagnostic';assert [x['code'] for x in r['failureEvents']]==['child-diagnostic','parent-output-cap'];assert r['inFlightTerminals']=='UNVERIFIED';assert r['truncated']
 c,r,p=capture([b'x'*cap,b'after-stop'],eof=False,prior=True);assert r['storedBytes']==cap;assert r['observedBytes']==cap+10
if mode=='write':
 c=m.LimitedParentCapture();c.output=Mock();c.output.write.side_effect=OSError('disk');c.push(b'abc');assert c.first['code']=='parent-log-write'
 c.output.write.side_effect=None;c.output.write.return_value=3;c.push(b'more');assert c.written==0
 c=m.LimitedParentCapture();c.selector=Mock();c.selector.select.side_effect=OSError('collector');c.read(0);assert c.first['code']=='parent-log-collection'
 c.selector.close.side_effect=OSError('close');c.close();assert c.first['code']=='parent-log-collection';assert 'parent-log-close' in c.failure_events
if mode=='evidence':
 c,r,p=capture([b'ok']);again=c.preserve(p);assert not again['complete'] and again['evidenceErrors']==['parent-output-evidence']
 f=root/'final.json';r=m.finish_limited_record(f,{'status':'PASS','exit':0},10);assert r['receiptSaved']
 r=m.finish_limited_record(f,{'status':'FAIL','exit':124,'firstFailure':'original'},11);assert not r['receiptSaved'] and r['exit']==124 and r['firstFailure']=='original'
 r=m.finish_limited_record(root/'too-big.json',{'status':'PASS','exit':0,'data':'x'*32768},1);assert not r['receiptSaved'] and not (root/'too-big.json').exists()
if mode=='supervisor':
 for overflow,cleanup_fail in [(False,False),(True,False),(True,True)]:
  child=Mock();child.pid=54321;child.returncode=None;child.poll.side_effect=lambda:child.returncode
  c=m.LimitedParentCapture();calls=[]
  def attach(ch,output):c.output=output
  def read(timeout):
   calls.append('read');c.push(b'x'*cap if overflow else b'normal');c.eof=not overflow
   if not overflow:child.returncode=0
  def stop(ch):
   calls.append('stop');child.returncode=child.returncode if child.returncode is not None else -15
   return {'processGroupAbsent':not cleanup_fail,'cleanupErrors':['mock-group'] if cleanup_fail else []}
  p=root/('super-'+str(overflow)+str(cleanup_fail)+'.log')
  with patch.object(m.subprocess,'Popen',return_value=child) as popen,patch.object(c,'attach',side_effect=attach),patch.object(c,'read',side_effect=read),patch.object(m,'group_alive',side_effect=lambda _:child.returncode is None),patch.object(m,'stop_created_group',side_effect=stop),patch.object(m,'finish_registered_groups',return_value={'registeredGroupsAbsent':True}):
   r=m.run_owned(['mock-no-exec'],p,240,root,{},lambda _:None,limited_capture=c)
   assert popen.call_args.kwargs['stdout']==m.subprocess.PIPE and popen.call_args.kwargs['stderr']==m.subprocess.STDOUT
   assert r['status']==('FAIL' if overflow else 'PASS');assert calls==['read','stop']
   if overflow:assert c.first['code']=='parent-output-cap'
   if cleanup_fail:assert r['cleanupErrors']==['mock-group'] and not r['processGroupAbsent']
if mode=='legacy':
 child=Mock();child.pid=54321;child.returncode=0;child.poll.return_value=0
 with patch.object(m.subprocess,'Popen',return_value=child) as p,patch.object(m,'group_alive',return_value=False),patch.object(m,'stop_created_group',return_value={'processGroupAbsent':True}),patch.object(m,'finish_registered_groups',return_value={'registeredGroupsAbsent':True}):
  r=m.run_owned(['mock-no-exec'],root/'legacy.log',180,root,{},lambda _:None);assert r['status']=='PASS';assert p.call_args.kwargs['stdout']!=m.subprocess.PIPE
print(mode+' Mock PASS; no product or child process executed')
`;
for(const mode of ['normal','boundary','first','write','evidence','supervisor','legacy'])test('parent capture '+mode,()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-parent-capture-mock-');
 try{const r=spawnSync('python3',['-B','-c',parentCaptureMock,root,mode],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}finally{fs.rmSync(root,{recursive:true});}
});
test('parent capture cap provenance and limited-only binding',()=>{
 const guard=fs.readFileSync('scripts/internal/recording_catalog_comparison_guard.mjs','utf8'),runner=fs.readFileSync('scripts/internal/run_v450_recording_a_mixed.py','utf8');
 assert(guard.includes('output:2097152'));assert(runner.includes('LIMITED_PARENT_OUTPUT_BYTES = 2097152'));
 const limited=runner.slice(runner.indexOf('def run_limited_owned('),runner.indexOf('\ndef ',runner.indexOf('def run_limited_owned(')+1));
 assert(limited.includes('capture=LimitedParentCapture()'));assert(limited.includes("kwargs={'limited_capture':capture}"));
 assert(limited.includes("if boundary:kwargs['limited_boundary']=boundary"));assert(limited.includes('registry,**kwargs)'));
 assert(runner.includes('hardDeadlineSeconds=300'));assert(runner.includes('finishReserveSeconds=60'));assert(runner.includes('run_owned(command, log_path, 240'));
 assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);
});

import {runLimitedIsolatedBuild} from './recording_accumulated_cost.mjs';
function buildMock(options={}){
 const root=fs.mkdtempSync('/private/tmp/media-server-build-budget-mock-');fs.chmodSync(root,0o700);
 let tick=0;const calls=[];const e=path.join(root,'evidence'),w=path.join(root,'work'),b=path.join(w,'build');
 const write=(n,v)=>fs.writeFileSync(path.join(e,n),JSON.stringify(v));
 const approved={head:'45b19bd88cd2ea9c7be48a25329580e562c2a3ee',status:'approved dirty source',sourceSha256:options.sourceSha256??{}};
 const hooks={now:()=>tick,runBounded:async o=>{
  const i=calls.length;calls.push(o);tick+=options.times?.[i]??100;
  const cmd=o.args.slice(4);
  if(i===7){
   if(options.map)options.map(path.join(w,'link.map'),root);
   else if(options.map!==false)fs.writeFileSync(path.join(w,'link.map'),'synthetic map');
  }
  if(cmd.includes('--limited-build-stage')){
   const stage=cmd.at(-2);
   if(stage==='plan')write('cmake-plan.json',{buildRoot:b,commands:[['mock-cmake-configure'],['mock-cmake-build']]});
   if(stage==='link-plan')write('link-plan.json',{cwd:b,archive:path.join(b,'libmedia_server_runtime.a'),commands:[['mock-cxx0'],['mock-cxx1'],['mock-cxx2'],['mock-link']]});
   if(stage==='verify')write('link-binding.json',{uniqueSymbols:true,outputs:{'work/link.map':fs.existsSync(path.join(w,'link.map'))?crypto.createHash('sha256').update(fs.readFileSync(path.join(w,'link.map'))).digest('hex'):null}});
  }
  const bytes=options.bytes?.[i]??3;
  return {code:0,signal:null,stdout:'ok\n',stderr:'',stopReason:null,groupClean:true,groupId:2000+i,groupPeakRssBytes:1000+i,
   observationFailure:null,outputBytes:bytes,elapsedMs:options.times?.[i]??100,...options.receipts?.[i]};
 }};
 if(options.disk)hooks.disk=()=>options.disk({tick,calls: calls.length,root});
 if(options.cleanup)hooks.cleanup=options.cleanup;
 if(options.save)hooks.save=(p,d)=>options.save(p,d,()=>tick,ms=>tick+=ms);
 return {root,calls,hooks,advance:ms=>tick+=ms,run:()=>runLimitedIsolatedBuild({root,approved,python:'/mock/python',env:{PATH:'/mock/bin'}},hooks),dispose:()=>fs.rmSync(root,{recursive:true})};
}
async function withBuild(options,fn){const m=buildMock(options);try{await fn(await m.run(),m);}finally{m.dispose();}}
test('build supervision normal ten stages share decreasing budget and root; no actual compiler',async()=>{
 await withBuild({},(r,m)=>{
  assert.equal(r.status,'PASS');assert.equal(r.steps.length,10);assert.equal(r.outputBytes,30);assert.equal(r.storedOutputBytes,30);
  assert.equal(r.elapsedMs,1000);assert.equal(r.peakRssBytes,1009);assert(r.workAbsent);
  for(let i=0;i<m.calls.length;i++){
   const c=m.calls[i];assert.equal(c.seconds,(180000-i*100)/1000);assert.equal(c.outputCap,2097152-i*3-1);
   assert.equal(c.rssCap,1073741824);assert.equal(c.diskCap,536870912);assert.equal(c.root,m.root);
   for(const k of ['HOME','TMPDIR','XDG_CACHE_HOME'])assert(c.env[k].startsWith(m.root+'/work/'));
   assert.equal(c.command,'/bin/sh');assert(c.args[1].includes('exec "$@"'));
  }
  assert(fs.existsSync(path.join(m.root,'evidence/link.map')));assert(fs.existsSync(path.join(m.root,'evidence/result.json')));
 });
});
for(const [label,ms,pass] of [['before',179999,true],['at',180000,false],['after',180001,false]])test('build supervision deadline '+label,async()=>{
 await withBuild({times:[ms-900,...Array(9).fill(100)]},r=>{assert.equal(r.status,pass?'PASS':'FAIL');if(!pass)assert.equal(r.firstFailure.code,'build-deadline');});
});
test('build supervision cumulative time and exhausted first command stop next launch',async()=>{
 for(const times of [[180000],[100000,80000],[90000,90001]])await withBuild({times},(r,m)=>{
  assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert.equal(m.calls.length,times.length);
  assert(r.workAbsent);assert(fs.existsSync(path.join(m.root,'evidence/result.json')));
 });
});
for(const [label,bytes] of [['at',[1048576,1048576]],['over',[1048576,1048577]],['late',[2097153]]])test('build supervision cumulative output '+label,async()=>{
 await withBuild({bytes},(r,m)=>{assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-output-cap');assert.equal(m.calls.length,bytes.length);assert.equal(r.outputBytes,bytes.reduce((a,b)=>a+b));});
});
for(const [name,index] of [['configure',1],['compiler',4],['linker',7]])test('build supervision first '+name+' failure persists despite later evidence/cleanup errors',async()=>{
 await withBuild({receipts:{[index]:{code:1,stderr:'first compiler diagnostic'}},cleanup:()=>{throw Error('mock-cleanup');}},(r,m)=>{
  assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(r.steps.at(-1).code,1);assert.equal(m.calls.length,index+1);
  assert.equal(r.cleanupErrors.at(-1).code,'mock-cleanup');assert.equal(r.status,'FAIL');assert(!r.workAbsent);
  assert.equal(fs.readFileSync(path.join(m.root,'evidence',r.steps.at(-1).stage+'.stderr.txt'),'utf8'),'first compiler diagnostic');
 });
});
for(const [label,receipt] of Object.entries({rss:{stopReason:'rss-safety-cap',groupPeakRssBytes:1073741825},
 disk:{stopReason:'disk-cap'},collection:{stopReason:'resource-observation',observationFailure:{part:'process',code:'EPERM'}},
 group:{groupClean:false},exit:{code:2,signal:'SIGTERM'},malformed:{outputBytes:null}}))test('build supervision '+label+' fails closed',async()=>{
 await withBuild({receipts:{0:receipt}},(r,m)=>{assert.equal(r.status,'FAIL');assert.equal(m.calls.length,1);if(label==='group')assert(r.cleanupDeferred);});
});
test('build supervision disk total and measurement failure stop before command',async()=>{
 for(const disk of [()=>536870913,()=>{throw Error('disk-unreadable');}])await withBuild({disk},(r,m)=>{assert.equal(r.status,'FAIL');assert.equal(m.calls.length,0);});
});
test('build supervision output limit during termination keeps primary supervisor failure',async()=>{
 await withBuild({receipts:{0:{stopReason:'timeout',code:null,signal:'SIGTERM',outputBytes:2097200,stdout:'x'.repeat(2097152),stderr:'late'}}},(r,m)=>{
  assert.equal(r.firstFailure.code,'timeout');assert.equal(m.calls.length,1);assert(r.errors.some(e=>e.code==='build-output-cap'));
  assert(r.errors.some(e=>e.code==='build-stored-output-cap'));assert.equal(r.storedOutputBytes,2097152);assert(!r.steps[0].outputComplete);
 });
});
function mockEvidenceSave(p,d){fs.writeFileSync(p,d,{flag:'wx',mode:0o600});return {path:path.basename(p),bytes:d.length};}
test('build supervision evidence failure preserves first error, no next command or deletion',async()=>{
 await withBuild({receipts:{0:{code:1,stderr:'first diagnostic survives stdout write failure'}},save:(p,d)=>{if(p.endsWith('plan.stdout.txt'))throw Error('mock-write');return mockEvidenceSave(p,d);}},(r,m)=>{
  assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(r.evidenceErrors[0].code,'mock-write');assert.equal(m.calls.length,1);assert(r.cleanupDeferred);
  assert.equal(fs.readFileSync(path.join(m.root,'evidence/plan.stderr.txt'),'utf8'),'first diagnostic survives stdout write failure');
 });
});
test('build supervision final evidence time and cleanup included in same 180 seconds',async()=>{
 await withBuild({save:(p,d,get,advance)=>{const r=mockEvidenceSave(p,d);if(p.endsWith('result.json'))advance(179000);return r;}},(r,m)=>{
  assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert(r.finalizationIncomplete);
  assert(fs.existsSync(path.join(m.root,'evidence/finalization-failure.json')));
 });
 await withBuild({cleanup:()=>{throw Error('cleanup-failed');}},r=>assert.equal(r.firstFailure.code,'build-cleanup'));
});
test('build supervision second invocation and owned symlink rejected without launch',async()=>{
 const m=buildMock();try{assert.equal((await m.run()).status,'PASS');const calls=m.calls.length;const again=await m.run();assert.equal(again.firstFailure.code,'build-root-not-fresh');assert.equal(m.calls.length,calls);}finally{m.dispose();}
 const n=buildMock();try{n.hooks.runBounded=async()=>{fs.symlinkSync('/private/tmp',path.join(n.root,'work','external'));return {code:0,signal:null,stdout:'',stderr:'',stopReason:null,groupClean:true,groupId:2,groupPeakRssBytes:1,outputBytes:0};};
  const r=await n.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-owned-entry');assert(r.cleanupErrors.length);
 }finally{n.dispose();}
});
test('build supervision source bridge is build-only and common guards/old modes remain separate',()=>{
 const p=fs.readFileSync('scripts/internal/recording_accumulated_cost.py','utf8');
 const bridge=p.slice(p.indexOf('def isolated_supervision_stage'),p.indexOf('def build(parent)'));
 assert(!bridge.includes('subprocess.run'));assert(bridge.includes('source_check()'));assert(bridge.includes('verify_isolated_build_inputs'));assert(bridge.includes('verify_isolated_link'));
 assert(bridge.includes("isolated-overlay-source"));assert(bridge.includes("isolated-old-archive"));assert(p.includes("else:build(Path(sys.argv[1]))"));
 assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);assert.throws(assertLimitedSearchCapacity,/BLOCKED/);
 assert.equal(limitedSearchCapacity().costs.parentLog.capBytes,2097152);
});
test('build supervision thrown guard leaves group and partial tree unconfirmed',async()=>{
 const m=buildMock();try{m.hooks.runBounded=async()=>{throw Error('missing-guard-receipt');};const r=await m.run();assert.equal(r.firstFailure.code,'missing-guard-receipt');assert(r.cleanupDeferred);assert(!r.workAbsent);}finally{m.dispose();}
});
test('build supervision bridge binds approved files, plans and final evidence with synthetic build artifacts',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-build-bridge-mock-');fs.chmodSync(root,0o700);
 const code=String.raw`
import sys,json,hashlib
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal');import recording_accumulated_cost as m
root=Path(sys.argv[1]);work=root/'work';work.mkdir(mode=0o700);e=root/'evidence';e.mkdir();b=work/'build'
source='src/recording/recording_contracts.cpp'
protected=[source]+['build-gst-onnx/'+n for n in ['CMakeCache.txt','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt','libmedia_server_runtime.a','media_server']]
a={'head':'mock-head','status':'approved','sourceSha256':{n:m.sha(m.REPO/n) for n in protected}}
(e/'approved.json').write_text(json.dumps(a))
def git(cmd,**kw):
 if cmd[1]=='rev-parse':return 'mock-head\n'
 if cmd[1]=='status':return 'approved'
 if cmd[1]=='branch':return 'v4.5.0\n'
 if cmd[1]=='diff':return b''
 if cmd[1]=='ls-files':return (source+'\0').encode()
 raise AssertionError(cmd)
with patch.object(m.subprocess,'check_output',side_effect=git):
 m.isolated_supervision_stage('plan',root)
 plan=json.loads((e/'cmake-plan.json').read_text());assert len(plan['commands'])==2 and plan['buildRoot']==str(b)
 # A changed approved source must be rejected before another plan is generated.
 a['sourceSha256'][source]='0'*64;(e/'approved.json').write_text(json.dumps(a))
 try:m.isolated_supervision_stage('plan',root);assert False
 except ValueError as ex:assert str(ex)=='isolated-source-changed'
 a['sourceSha256'][source]=m.sha(m.REPO/source);(e/'approved.json').write_text(json.dumps(a))
 # The production adapter now binds a separate manifest, retaining receipt caps.
 manifest=(json.dumps(a.pop('sourceSha256'))+'\n').encode();mf=e/'source-sha256.json';mf.write_bytes(manifest);mf.chmod(0o600)
 a['sourceManifest']={'path':mf.name,'bytes':len(manifest),'sha256':hashlib.sha256(manifest).hexdigest()}
 (e/'approved.json').write_text(json.dumps(a))
 b.mkdir();(b/'CMakeFiles/media_server_runtime.dir').mkdir(parents=True);(b/'CMakeFiles/media_server.dir').mkdir()
 names=['libmedia_server_runtime.a','media_server','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt'];old=m.REPO/'build-gst-onnx'
 for n in names:(b/n).write_bytes((old/n).read_bytes() if n.endswith(('flags.make','link.txt')) else b'synthetic-not-executable')
 m.isolated_supervision_stage('link-plan',root)
 link=json.loads((e/'link-plan.json').read_text());assert len(link['commands'])==4;assert link['archive']==str(b/'libmedia_server_runtime.a')
 assert '#define MEDIA_SERVER_VERIFY_MANDATORY_LEDGER 1' in (work/'overlay/recording_http_cost_probe.h').read_text()
 for obj in link['objects']:Path(obj).write_bytes(b'synthetic-object')
 (work/'media_server').write_bytes(b'synthetic-link');(work/'link.map').write_text('\n'.join(link['objects']))
 (e/'symbols.stdout.txt').write_text('000 T RecordingApplicationService6Search\n001 T ReadHttpRequest\n')
 m.isolated_supervision_stage('verify',root);r=json.loads((e/'link-binding.json').read_text());assert r['uniqueSymbols'];assert len(r['sources'])==3
 assert r['sourceManifest']==a['sourceManifest'] and 'sourceSha256' not in r
 (work/'overlay/webrtc_http_server.cpp').write_text('changed')
 try:m.isolated_supervision_stage('verify',root);assert False
 except ValueError as ex:assert str(ex)=='isolated-overlay-source'
print('bridge actual Python path with synthetic objects; compiler/link/product calls zero')
`;
 try{const r=spawnSync('python3',['-B','-c',code,root],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}finally{fs.rmSync(root,{recursive:true});}
});
test('build supervision short-command RSS and independently reported peak are not zero success',async()=>{
 await withBuild({receipts:{0:{groupPeakRssBytes:0}}},(r,m)=>{assert.equal(r.firstFailure.code,'build-rss-unobserved');assert.equal(m.calls.length,1);});
 await withBuild({receipts:{0:{groupPeakRssBytes:0,stderr:' 4096 maximum resident set size\n'}}},r=>{assert.equal(r.status,'PASS');assert.equal(r.peakRssBytes,4096);});
 await withBuild({receipts:{0:{stderr:' 1073741825 maximum resident set size\n'}}},(r,m)=>{assert.equal(r.firstFailure.code,'build-rss-cap');assert.equal(m.calls.length,1);});
});
test('build supervision SHA sealing failure retains work; successful seal precedes deletion',async()=>{
 await withBuild({save:(p,d)=>{if(p.endsWith('pre-cleanup-SHA256SUMS'))throw Error('seal-failed');return mockEvidenceSave(p,d);}},r=>{assert.equal(r.firstFailure.code,'seal-failed');assert(r.cleanupDeferred);});
 await withBuild({cleanup:p=>{assert(fs.existsSync(path.join(path.dirname(p),'evidence/pre-cleanup-SHA256SUMS')));fs.rmSync(p,{recursive:true});}},r=>assert.equal(r.status,'PASS'));
});
test('build supervision setup and cleanup reduce shared budget; cumulative disk remains charged',async()=>{
 await withBuild({save:(p,d,get,advance)=>{const r=mockEvidenceSave(p,d);if(p.endsWith('approved.json'))advance(1000);return r;}},(r,m)=>{assert.equal(r.status,'PASS');assert.equal(m.calls[0].seconds,179);assert.equal(r.elapsedMs,2000);});
 const m=buildMock();try{m.hooks.cleanup=p=>{m.advance(179000);fs.rmSync(p,{recursive:true});};const r=await m.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert(r.workAbsent);}finally{m.dispose();}
 await withBuild({disk:({calls})=>calls>=2?536870913:5000},(r,m)=>{assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-disk-cap');assert.equal(m.calls.length,2);assert.equal(r.peakDiskBytes,536870913);});
});
test('build supervision disk observation time is charged before next spawn and after final receipt',async()=>{
 const m=buildMock();let scans=0;try{
  m.hooks.disk=()=>{if(++scans===3)m.advance(180000);return 100;};const r=await m.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert.equal(m.calls.length,0);
 }finally{m.dispose();}
 const n=buildMock();try{
  n.hooks.disk=()=>{if(fs.existsSync(path.join(n.root,'evidence/result.json')))n.advance(180000);return 100;};
  const r=await n.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-deadline');assert(r.finalizationIncomplete);
 }finally{n.dispose();}
});
test('build supervision strict-greater common guard stops at shared cap; one byte cannot admit next step',async()=>{
 await withBuild({bytes:[2097151]},(r,m)=>{assert.equal(m.calls[0].outputCap+1,2097152);assert.equal(m.calls.length,1);assert.equal(r.firstFailure.code,'build-output-reserve');assert.equal(r.status,'FAIL');});
});

const mapBytes=Buffer.from([0,255,128,10,65]); // Raw bytes, not a UTF-8 rewrite.
const mapHash=crypto.createHash('sha256').update(mapBytes).digest('hex');
for(const [label,index,diagnostic] of [['link',7,'ld failed'],['duplicates',9,'isolated-duplicate-symbol'],['source',9,'isolated-overlay-source']])test('build map failed '+label+' preserves exact partial bytes before cleanup',async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,mapBytes),receipts:{[index]:{code:1,stderr:diagnostic}},cleanup:p=>{
  assert(fs.readFileSync(path.join(p,'link.map')).equals(mapBytes));
  assert(fs.readFileSync(path.join(path.dirname(p),'evidence/link.map')).equals(mapBytes));
  const before=JSON.parse(fs.readFileSync(path.join(path.dirname(p),'evidence/before-cleanup.json')));
  assert.equal(before.linkMap.status,'LINK_MAP_PRESERVED');assert.equal(before.linkMap.artifact.sha256,mapHash);
  assert(fs.existsSync(path.join(path.dirname(p),'evidence/pre-cleanup-SHA256SUMS')));fs.rmSync(p,{recursive:true});
 }},(r,m)=>{
  assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.stage,index===7?'link':'verify');assert.equal(r.firstFailure.code,'build-command-failed');
  assert.equal(m.calls.length,index+1);assert.equal(r.linkMap.linkVerified,false);assert(r.linkMap.validity.includes('NOT_VERIFIED'));
  assert.equal(r.linkMap.sourceSha256,mapHash);assert.equal(r.linkMap.artifact.bytes,5);assert(r.workAbsent);assert.equal(r.evidenceErrors.length,0);
  assert.equal(fs.statSync(path.join(m.root,'evidence/link.map')).mode&0o777,0o600);
  assert.equal(fs.readFileSync(path.join(m.root,'evidence',r.firstFailure.stage+'.stderr.txt'),'utf8'),diagnostic);
 });
});
test('build map successful link remains verified and absent failed link is distinct',async()=>{
 await withBuild({},r=>{assert.equal(r.status,'PASS');assert.equal(r.linkMap.status,'LINK_MAP_PRESERVED');assert.equal(r.linkMap.linkVerified,true);assert(r.workAbsent);});
 await withBuild({map:false,receipts:{7:{code:1}}},(r,m)=>{
  assert.equal(r.linkMap.status,'LINK_MAP_NOT_CREATED');assert.equal(r.firstFailure.stage,'link');assert.equal(m.calls.length,8);assert(r.workAbsent);
  assert(!fs.existsSync(path.join(m.root,'evidence/link.map')));
 });
 await withBuild({map:false},r=>{assert.equal(r.status,'FAIL');assert.equal(r.linkMap.status,'LINK_MAP_PRESERVATION_FAILED');assert.equal(r.linkMap.error,'build-map-missing');assert(r.cleanupDeferred);});
});
for(const kind of ['copy','sha','exclusive'])test('build map '+kind+' preservation failure keeps first error and work',async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,mapBytes),receipts:{7:{code:1,stderr:'first link error'}},save:(p,d)=>{
  if(p.endsWith('/link.map')){
   if(kind==='copy')throw Error('mock-map-write');
   if(kind==='exclusive')fs.writeFileSync(p,'previous-evidence');
   const saved=mockEvidenceSave(p,d);fs.writeFileSync(p,Buffer.alloc(d.length));return saved;
  }
  return mockEvidenceSave(p,d);
 }},(r,m)=>{
  assert.equal(r.firstFailure.stage,'link');assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(m.calls.length,8);
  assert.equal(r.linkMap.status,'LINK_MAP_PRESERVATION_FAILED');assert(r.evidenceErrors.some(e=>e.stage==='map-evidence'));assert(r.cleanupDeferred);
  assert(fs.readFileSync(path.join(m.root,'work/link.map')).equals(mapBytes));assert.equal(r.cleanupErrors.length,0);
  if(kind==='sha')assert.equal(r.linkMap.error,'build-map-evidence-readback');
  if(kind==='exclusive')assert.equal(fs.readFileSync(path.join(m.root,'evidence/link.map'),'utf8'),'previous-evidence');
 });
});
for(const size of [2097152,2097153])test('build map artifact byte cap '+size,async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(size),{mode:0o600}),receipts:{7:{code:1}}},(r,m)=>{
  assert.equal(r.firstFailure.stage,'link');assert.equal(r.linkMap.status,size===2097152?'LINK_MAP_PRESERVED':'LINK_MAP_CHUNKS_PRESERVED');
  assert.equal(r.workAbsent,true);if(size>2097152){assert.equal(r.linkMap.chunkCount,2);assert(!fs.existsSync(path.join(m.root,'evidence/link.map')));}
 });
});
for(const kind of ['external-symlink','dangling-symlink','directory','hardlink'])test('build map unsafe '+kind+' never read or deleted',async()=>{
 const outside=fs.mkdtempSync('/private/tmp/media-server-map-outside-mock-');const target=path.join(outside,'sentinel');fs.writeFileSync(target,'untouched');
 try{await withBuild({map:p=>{
  if(kind==='external-symlink')fs.symlinkSync(target,p);
  else if(kind==='dangling-symlink')fs.symlinkSync(path.join(outside,'absent'),p);
  else if(kind==='hardlink')fs.linkSync(target,p);
  else fs.mkdirSync(p);
 },receipts:{7:{code:1}}},(r,m)=>{
  assert.equal(r.linkMap.status,'LINK_MAP_UNSAFE_PATH');assert.equal(r.firstFailure.stage,'link');assert(r.cleanupDeferred);
  assert(!fs.existsSync(path.join(m.root,'evidence/link.map')));assert.equal(fs.readFileSync(target,'utf8'),'untouched');
 });}finally{fs.rmSync(outside,{recursive:true});}
});
test('build map unconfirmed group stops preservation without masking original link failure',async()=>{
 await withBuild({receipts:{7:{code:1,groupClean:false}}},(r,m)=>{
  assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(r.linkMap.status,'LINK_MAP_PRESERVATION_FAILED');
  assert.equal(r.linkMap.error,'build-map-group-unconfirmed');assert(r.cleanupErrors.some(e=>e.code==='build-group-remains'));
  assert(r.cleanupDeferred);assert(fs.existsSync(path.join(m.root,'work/link.map')));assert.equal(m.calls.length,8);
 });
});
test('build map copy workspace and time costs cannot bypass shared limits',async()=>{
 await withBuild({receipts:{7:{code:1}},disk:({calls})=>calls>=8?536870912:100},r=>{
  assert.equal(r.linkMap.error,'build-disk-cap');assert.equal(r.firstFailure.stage,'link');assert(r.cleanupDeferred);
 });
 await withBuild({save:(p,d,get,advance)=>{const v=mockEvidenceSave(p,d);if(p.endsWith('/link.map'))advance(180000);return v;}},r=>{
  assert.equal(r.status,'FAIL');assert.equal(r.linkMap.error,'build-deadline');assert(r.cleanupDeferred);
 });
});
test('build map source mutation during copy cannot authorize deletion',async()=>{
 await withBuild({receipts:{7:{code:1}},save:(p,d)=>{
  const r=mockEvidenceSave(p,d);if(p.endsWith('/link.map'))fs.writeFileSync(path.join(path.dirname(p),'../work/link.map'),'changed');return r;
 }},r=>{assert.equal(r.linkMap.error,'build-map-evidence-readback');assert(r.cleanupDeferred);assert.equal(r.firstFailure.stage,'link');});
});
test('build map preserved evidence survives cleanup failure independently',async()=>{
 await withBuild({receipts:{7:{code:1}},cleanup:()=>{throw Error('mock-cleanup');}},r=>{
  assert.equal(r.linkMap.status,'LINK_MAP_PRESERVED');assert.equal(r.firstFailure.stage,'link');assert.equal(r.cleanupErrors[0].code,'mock-cleanup');assert(!r.workAbsent);
 });
});
test('build map exhausted pre-link output reserve does not claim a link attempt',async()=>{
 await withBuild({bytes:[3,3,3,3,3,3,2097133]},(r,m)=>{
  assert.equal(m.calls.length,7);assert.equal(r.firstFailure.code,'build-output-reserve');assert.equal(r.linkMap.linkAttempted,false);
  assert.equal(r.linkMap.status,'LINK_MAP_NOT_CREATED');
 });
});
test('build map replaced evidence directory cannot redirect preservation or finalization',async()=>{
 const outside=fs.mkdtempSync('/private/tmp/media-server-map-destination-mock-');
 try{await withBuild({receipts:{7:{code:1}},save:(p,d)=>{
  const r=mockEvidenceSave(p,d);
  if(p.endsWith('/link.stderr.txt')){const e=path.dirname(p);fs.renameSync(e,e+'-original');fs.symlinkSync(outside,e);}
  return r;
 }},(r,m)=>{
  assert.equal(r.firstFailure.stage,'link');assert.equal(r.linkMap.status,'LINK_MAP_UNSAFE_PATH');assert(r.cleanupDeferred);
  assert(r.finalizationIncomplete);assert.deepEqual(fs.readdirSync(outside),[]);assert(fs.existsSync(path.join(m.root,'work/link.map')));
 });}finally{fs.rmSync(outside,{recursive:true});}
});

test('build plan full source manifest uses existing artifact cap and compact receipts',async()=>{
 const sourceSha256=Object.fromEntries(Array.from({length:1600},(_,i)=>['src/fixture-'+i+'.cpp','a'.repeat(64)]));
 await withBuild({sourceSha256},(r,m)=>{
  assert.equal(r.status,'PASS');const e=path.join(m.root,'evidence'),raw=fs.readFileSync(path.join(e,'source-sha256.json'));
  assert(raw.length>65536&&raw.length<2097152);assert.deepEqual(JSON.parse(raw),sourceSha256);
  const a=JSON.parse(fs.readFileSync(path.join(e,'approved.json')));assert.equal(a.sourceSha256,undefined);
  assert.equal(a.sourceManifest.bytes,raw.length);assert.equal(a.sourceManifest.sha256,crypto.createHash('sha256').update(raw).digest('hex'));
  assert(fs.statSync(path.join(e,'approved.json')).size<65536);assert(r.workAbsent);
 });
});
test('build plan manifest cap and first plan error stop before CMake',async()=>{
 await withBuild({sourceSha256:{x:'x'.repeat(2097152)}},(r,m)=>{assert.equal(r.firstFailure.code,'build-source-manifest-cap');assert.equal(m.calls.length,0);});
 await withBuild({receipts:{0:{code:1,stderr:'ValueError: isolated-source-manifest'}}},(r,m)=>{
  assert.equal(m.calls.length,1);assert.equal(r.firstFailure.stage,'plan');assert.equal(r.firstFailure.code,'build-command-failed');
  assert.equal(r.linkMap.linkAttempted,false);assert.equal(r.linkMap.status,'LINK_MAP_NOT_CREATED');assert(r.workAbsent);
  assert.equal(fs.readFileSync(path.join(m.root,'evidence/plan.stderr.txt'),'utf8'),'ValueError: isolated-source-manifest');
 });
});
test('build plan actual tracked input coverage, reference integrity and source rejection without compiler',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-plan-input-mock-');fs.chmodSync(root,0o700);
 const code=String.raw`
import sys,json,hashlib,subprocess
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal');import recording_accumulated_cost as m
root=Path(sys.argv[1]);w=root/'work';w.mkdir(mode=0o700);e=root/'evidence';e.mkdir(mode=0o700);b=w/'build'
git=m.subprocess.check_output
names=git(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=m.REPO).decode().split('\0')
required={n for n in names if n and (n.startswith(('src/','include/','scripts/internal/')) or n in ('CMakeLists.txt','VERSION'))}
required.update('build-gst-onnx/'+n for n in ['CMakeCache.txt','CMakeFiles/media_server_runtime.dir/flags.make','CMakeFiles/media_server.dir/link.txt','libmedia_server_runtime.a','media_server'])
expected={n:m.sha(m.REPO/n) for n in sorted(required)}
a={'head':git(['git','rev-parse','HEAD'],cwd=m.REPO,text=True).strip(),'status':git(['git','status','--short'],cwd=m.REPO,text=True)}
def git_only(cmd,**kw):
 assert cmd[0]=='git',cmd
 return git(cmd,**kw)
mf=e/'source-sha256.json'
def bind(values):
 data=(json.dumps(values,indent=2)+'\n').encode();mf.write_bytes(data);mf.chmod(0o600)
 a['sourceManifest']={'path':mf.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 (e/'approved.json').write_text(json.dumps(a));return data
def reject(code):
 try:m.isolated_supervision_stage('plan',root);raise AssertionError('unexpected success')
 except ValueError as ex:assert str(ex)==code,(code,str(ex))
with patch.object(m.subprocess,'check_output',side_effect=git_only):
 # Independent required-list oracle reproduces the prior partial-manifest failure.
 (e/'approved.json').write_text(json.dumps({**a,'sourceSha256':{'VERSION':expected['VERSION']}}));reject('isolated-source-manifest')
 raw=bind(expected);assert len(raw)>65536 and len(raw)<=2097152
 m.isolated_supervision_stage('plan',root);plan=json.loads((e/'cmake-plan.json').read_text())
 assert plan['commands'][1]==['cmake','--build',str(b),'--target','media_server_runtime','media_server','--parallel','1']
 assert plan['limits']=={'sharedSeconds':180,'rssBytes':1073741824,'diskBytes':536870912,'outputBytes':2097152}
 # All rejection cases fail before another plan write or any compiler call.
 missing=dict(expected);missing.pop('src/main.cpp');bind(missing);reject('isolated-source-manifest')
 wrong=dict(expected);wrong['src/main.cpp']='0'*64;bind(wrong);reject('isolated-source-changed')
 bind(expected);mf.write_bytes(raw.replace(b'a',b'b',1));reject('isolated-source-manifest-sha')
 bind(expected);mf.write_bytes(b'x'*2097153);reject('isolated-source-manifest-cap')
 bind(expected);a['sourceManifest']['path']='../outside';(e/'approved.json').write_text(json.dumps(a));reject('isolated-source-reference')
 bind(expected);mf.unlink();mf.symlink_to(m.REPO/'VERSION');reject('isolated-source-reference');mf.unlink()
 bind(expected);assert m.isolated_source_sha(a,b)==expected
print('Full required source set',len(required),'manifest bytes',len(raw),'plan only; compiler/link/product calls 0')
`;
 try{const r=spawnSync('python3',['-B','-c',code,root],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}
 finally{fs.rmSync(root,{recursive:true});}
});

import {preserveLargeLinkMap,verifyLinkMapChunks,linkMapChunkCapacity} from './recording_accumulated_cost.mjs';
const chunkHash=b=>crypto.createHash('sha256').update(b).digest('hex');
function chunkFixture(fn,size=4000001){
 const root=fs.mkdtempSync('/private/tmp/media-server-linkmap-chunk-mock-');fs.chmodSync(root,0o700);
 const source=path.join(root,'link.map'),evidence=path.join(root,'evidence');fs.mkdirSync(evidence,{mode:0o700});
 const data=Buffer.alloc(size,0xa5);data[0]=0;data[size-1]=0xff;fs.writeFileSync(source,data,{mode:0o600});
 const args={source,evidence,binding:{buildRoot:root,resultId:'original-failed-result',head:'approved'},expectedSha256:chunkHash(data),check:()=>{},usedBytes:()=>size};
 try{return fn(args,data);}finally{fs.rmSync(root,{recursive:true});}
}
test('map chunks boundary and last bytes preserve raw whole stream',()=>chunkFixture((a,data)=>{
 const r=preserveLargeLinkMap(a),m=JSON.parse(fs.readFileSync(path.join(a.evidence,r.artifact.path)));
 assert.deepEqual(m.chunks.map(c=>c.bytes),[2000000,2000000,1]);assert.equal(r.sourceSha256,chunkHash(data));
 assert.equal(verifyLinkMapChunks(a.evidence,m).sha256,chunkHash(data));
 assert.deepEqual(fs.readFileSync(a.source),data);assert.equal(fs.statSync(path.join(a.evidence,m.chunks[0].path)).mode&0o777,0o600);
}));
test('map chunks exact multiple has no empty trailing chunk',()=>chunkFixture(a=>{
 const r=preserveLargeLinkMap(a),m=JSON.parse(fs.readFileSync(path.join(a.evidence,r.artifact.path)));assert.deepEqual(m.chunks.map(c=>c.bytes),[2000000,2000000]);
},4000000));
for(const kind of ['order','missing','contents','whole-sha','count'])test('map chunks reject '+kind,()=>chunkFixture(a=>{
 const r=preserveLargeLinkMap(a),m=JSON.parse(fs.readFileSync(path.join(a.evidence,r.artifact.path)));
 if(kind==='order')m.chunks.reverse();if(kind==='missing')fs.unlinkSync(path.join(a.evidence,m.chunks[1].path));
 if(kind==='contents')fs.writeFileSync(path.join(a.evidence,m.chunks[0].path),Buffer.alloc(m.chunks[0].bytes));
 if(kind==='whole-sha')m.sourceSha256='0'.repeat(64);if(kind==='count')m.chunkCount++;
 assert.throws(()=>verifyLinkMapChunks(a.evidence,m));assert(fs.existsSync(a.source));
}));
test('map chunks source SHA mismatch refuses all writes',()=>chunkFixture(a=>{
 assert.throws(()=>preserveLargeLinkMap({...a,expectedSha256:'0'.repeat(64)}),/LINK_MAP_SOURCE_SHA/);assert.deepEqual(fs.readdirSync(a.evidence),[]);
}));
for(const [existing,ok] of [[55,true],[56,false]])test('map chunks combined item limit '+existing,()=>{
 const a={bytes:4000001,existing,reserved:5,external:0,used:0,manifestBytes:100};
 if(ok)assert.equal(linkMapChunkCapacity(a).items,64);else assert.throws(()=>linkMapChunkCapacity(a),/LINK_MAP_ITEM_CAP/);
});
for(const [manifestBytes,ok] of [[65536,true],[65537,false]])test('map chunks receipt cap '+manifestBytes,()=>{
 const a={bytes:4000001,existing:0,used:0,manifestBytes};if(ok)assert(linkMapChunkCapacity(a));else assert.throws(()=>linkMapChunkCapacity(a),/LINK_MAP_MANIFEST_CAP/);
});
test('map chunks disk duplication and metadata reserve before writes',()=>chunkFixture(a=>{
 assert.throws(()=>preserveLargeLinkMap({...a,usedBytes:()=>536870912-4000001}),/LINK_MAP_DISK_CAP/);assert.deepEqual(fs.readdirSync(a.evidence),[]);
}));
test('map chunks oversized binding receipt fails before writes',()=>chunkFixture(a=>{
 assert.throws(()=>preserveLargeLinkMap({...a,binding:{large:'x'.repeat(65536)}}),/LINK_MAP_MANIFEST_CAP/);assert.deepEqual(fs.readdirSync(a.evidence),[]);
}));
for(const kind of ['partial-write','manifest-write','manifest-corrupt','source-change','chunk-corrupt'])test('map chunks '+kind+' leaves original and incomplete evidence',()=>chunkFixture(a=>{
 let written=0;const save=(p,d)=>{
  if(kind==='partial-write'&&++written===2){fs.writeFileSync(p,d.subarray(0,10),{flag:'wx',mode:0o600});throw Error('mock-partial-write');}
  if(kind==='manifest-write'&&p.endsWith('.json'))throw Error('mock-manifest-write');
  const r=mockEvidenceSave(p,d);
  if(kind==='manifest-corrupt'&&p.endsWith('.json'))fs.writeFileSync(p,'{}');
  if(kind==='source-change'&&p.endsWith('001'))fs.writeFileSync(a.source,Buffer.alloc(4000001,1));
  if(kind==='chunk-corrupt'&&p.endsWith('001'))fs.writeFileSync(p,Buffer.alloc(d.length));
  return r;
 };
 assert.throws(()=>preserveLargeLinkMap({...a,save}));assert(fs.existsSync(a.source));
}));
for(const index of [7,9])test('map chunks adapter preserves initial link/source failure '+index,async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600}),receipts:{[index]:{code:1,stderr:'original failure'}}},(r,m)=>{
  assert.equal(r.firstFailure.stage,index===7?'link':'verify');assert.equal(r.linkMap.status,'LINK_MAP_CHUNKS_PRESERVED');assert.equal(r.linkMap.linkVerified,false);assert(r.workAbsent);
  assert.equal(m.calls.length,index+1);assert.equal(r.evidenceErrors.length,0);
 });
});
test('map chunks adapter success uses same source verification and final cleanup',async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600})},(r,m)=>{
  assert.equal(r.status,'PASS');assert.equal(m.calls.length,10);assert(r.linkMap.linkVerified);assert(r.workAbsent);assert(fs.readdirSync(path.join(m.root,'evidence')).length<=64);
 });
});
test('map chunks adapter partial save preserves first error and defers cleanup',async()=>{
 await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600}),receipts:{7:{code:1}},save:(p,d)=>{
  if(p.endsWith('002'))throw Error('mock-chunk-save');return mockEvidenceSave(p,d);
 }},(r,m)=>{assert.equal(r.firstFailure.stage,'link');assert(r.cleanupDeferred);assert(!r.workAbsent);assert.equal(r.linkMap.status,'LINK_MAP_PRESERVATION_FAILED');assert(fs.existsSync(path.join(m.root,'work/link.map')));});
});
test('map chunks adapter deadline and workspace failures retain original',async()=>{
 for(const kind of ['deadline','disk'])await withBuild({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600}),
  save:(p,d,get,advance)=>{const r=mockEvidenceSave(p,d);if(kind==='deadline'&&p.endsWith('001'))advance(180000);return r;},
  ...(kind==='disk'?{disk:({calls})=>calls>=10?536000000:0}:{})},r=>{assert.equal(r.status,'FAIL');assert(r.cleanupDeferred);assert(!r.workAbsent);});
});
test('map chunks source replacement during manifest save blocks completion',()=>chunkFixture(a=>{
 assert.throws(()=>preserveLargeLinkMap({...a,save:(p,d)=>{const r=mockEvidenceSave(p,d);if(p.endsWith('.json'))fs.writeFileSync(a.source,Buffer.alloc(4000001));return r;}}),/LINK_MAP_SOURCE_SHA/);
}));
test('map chunks verified link requires expected original map SHA',async()=>{
 const m=buildMock({map:p=>fs.writeFileSync(p,Buffer.alloc(2097153),{mode:0o600})});
 const prior=m.hooks.runBounded;m.hooks.runBounded=async o=>{const r=await prior(o);if(m.calls.length===10)fs.writeFileSync(path.join(m.root,'evidence/link-binding.json'),JSON.stringify({uniqueSymbols:true}));return r;};
 try{const r=await m.run();assert.equal(r.linkMap.error,'build-map-binding-missing');assert(r.cleanupDeferred);}finally{m.dispose();}
});
for(const kind of ['symlink','hardlink','destination'])test('map chunks unsafe '+kind+' rejects external target',()=>chunkFixture(a=>{
 const target=path.join(path.dirname(a.source),'other');
 if(kind==='destination'){fs.renameSync(a.evidence,target);fs.symlinkSync(target,a.evidence);}
 else{fs.renameSync(a.source,target);if(kind==='symlink')fs.symlinkSync(target,a.source);else fs.linkSync(target,a.source);}
 assert.throws(()=>preserveLargeLinkMap(a),/LINK_MAP_UNSAFE_PATH/);
}));

// Limited Helper-only: all child operations are injected receipts; never compile/run helpers.
function helperBindingMock(options={}){
 const root=fs.mkdtempSync('/private/tmp/media-server-helper-binding-mock-');fs.chmodSync(root,0o700);
 let tick=0;const calls=[],e=path.join(root,'evidence'),w=path.join(root,'work'),a=path.join(root,'artifacts');
 const names=['normalize','process-metrics','review-seed'],h={compiler:'/mock/c++',node:'/mock/node',pkgConfig:'/mock/pkg-config',referenceBuild:'/private/tmp/media-server-reference/work/build'};
 const write=(n,v)=>fs.writeFileSync(path.join(e,n),JSON.stringify(v));
 const approved={head:'45b19bd88cd2ea9c7be48a25329580e562c2a3ee',status:'mock',sourceSha256:{},helperBuild:h};
 const hooks={now:()=>tick,runBounded:async o=>{
  const i=calls.length;calls.push(o);tick+=options.times?.[i]??100;const c=o.args.slice(4);
  if(c.includes('--limited-build-stage')){
   const stage=c.at(-2);
   if(stage==='helper-inputs')write('helper-inputs.json',{flagsCommand:[h.pkgConfig,'--cflags','gstreamer-app-1.0','openssl','sqlite3']});
   if(stage==='helper-plan')write('helper-plan.json',{names,archive:path.join(h.referenceBuild,'libmedia_server_runtime.a'),instrument:[h.node,'mock-instrument'],commands:names.map(n=>[h.compiler,'mock-source','-o',path.join(w,'helpers',n)])});
   if(stage==='helper-verify'){
    fs.mkdirSync(a,{mode:0o700});const files={};
    for(const n of [...names,'catalog-instrumented.cpp']){const b=Buffer.from(n);fs.writeFileSync(path.join(a,n),b,{mode:0o600});files[n]={bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};}
    if(options.corrupt)fs.writeFileSync(path.join(a,'normalize'),'bad');
    write('helper-artifacts.json',{root:a,files});
   }
  }
  return {code:0,signal:null,stdout:'ok',stderr:'',stopReason:null,groupClean:true,groupId:5000+i,groupPeakRssBytes:1000,
   observationFailure:null,outputBytes:2,elapsedMs:100,...options.receipts?.[i]};
 }};
 if(options.disk)hooks.disk=()=>options.disk(calls.length);
 if(options.cleanup)hooks.cleanup=options.cleanup;
 if(options.save)hooks.save=options.save;
 return {root,calls,run:()=>runLimitedIsolatedBuild({root,approved,python:'/mock/python',env:{PATH:'/mock'},budgetStarted:options.budgetStarted},hooks),dispose:()=>fs.rmSync(root,{recursive:true})};
}
async function withHelperBinding(options,fn){const m=helperBindingMock(options);try{await fn(await m.run(),m);}finally{m.dispose();}}
test('helper binding eight supervised stages; three compilers only; artifacts survive work cleanup',async()=>withHelperBinding({},(r,m)=>{
 assert.equal(r.status,'PASS');assert.equal(m.calls.length,8);assert.equal(r.scope,'LIMITED_HELPER_BUILD_ONLY');assert.equal(r.linkMap,undefined);
 assert(r.workAbsent&&r.helperArtifacts.retained);assert(fs.existsSync(path.join(m.root,'artifacts/normalize')));
 assert.equal(m.calls.filter(c=>c.args.includes('/mock/c++')).length,3);assert(!JSON.stringify(m.calls).includes('cmake'));
 for(let i=0;i<8;i++){assert.equal(m.calls[i].seconds,180-i*.1);assert.equal(m.calls[i].outputCap,2097151-i*2);assert.equal(m.calls[i].rssCap,1073741824);assert.equal(m.calls[i].diskCap,536870912);}
}));
for(const [name,options,expected] of [
 ['first-helper-error',{receipts:{4:{code:1,stderr:'first compiler diagnostic'}}},'build-command-failed'],
 ['source-mismatch',{receipts:{0:{code:1,stderr:'helper-source-sha'}}},'build-command-failed'],
 ['dependency-failure',{receipts:{7:{code:1,stderr:'helper-dynamic-dependency'}}},'build-command-failed'],
 ['shared-time',{times:{4:180000}},'build-deadline'],
 ['preflight-budget',{budgetStarted:-180000},'build-deadline'],
 ['cumulative-output',{receipts:{3:{outputBytes:2097150}}},'build-output-cap'],
 ['rss',{receipts:{4:{groupPeakRssBytes:1073741825}}},'build-rss-cap'],
 ['disk',{disk:n=>n>=5?536870913:0},'build-disk-cap'],
 ['collection',{receipts:{4:{observationFailure:'unavailable'}}},'build-resource-observation'],
 ['artifact-sha',{corrupt:true},'helper-artifact-sha'],
 ['cleanup',{cleanup:()=>{throw Error('owned cleanup failure');}},'build-cleanup'],
 ['evidence',{save:(p,d)=>{if(p.endsWith('helper-normalize.stderr.txt'))throw Error('evidence failure');return mockEvidenceSave(p,d);}},'build-output-evidence'],
 ['first-plus-cleanup',{receipts:{4:{code:1}},cleanup:()=>{throw Error('cleanup');}},'build-command-failed'],
])test('helper binding fail closed '+name,async()=>withHelperBinding(options,(r,m)=>{
 assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,expected);
 if(name==='first-helper-error'||name==='first-plus-cleanup')assert.equal(m.calls.length,5);
 if(name==='source-mismatch')assert.equal(m.calls.length,1);
 assert.equal(r.productExecution,'NOT_TESTED');
}));
const helperBindingPython=String.raw`
import sys,json,struct,hashlib,os
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts/internal');import recording_accumulated_cost as m
root=Path(sys.argv[1]);mode=sys.argv[2]
def put(p,data):
 p.parent.mkdir(parents=True,exist_ok=True,mode=0o700);p.write_bytes(data);p.chmod(0o600);return m.sha(p)
def macho(name='/usr/lib/libSystem.B.dylib'):
 raw=name.encode()+b'\0';n=(24+len(raw)+7)//8*8
 return struct.pack('<8I',0xfeedfacf,0x100000c,0,2,1,n,0,0)+struct.pack('<6I',0xc,n,24,0,0,0)+raw+b'\0'*(n-24-len(raw))
if mode=='plan':
 b=root/'reference/build';b.mkdir(parents=True,mode=0o700);work=root/'work';work.mkdir(mode=0o700)
 original=(m.SCRIPTS/'verify_v450_recording_a_mixed.sh').read_text()
 put(b/'CMakeFiles/media_server.dir/link.txt',b'/usr/bin/c++ -o media_server libmedia_server_runtime.a /fixture/libone.dylib -pthread\n')
 with patch.object(m,'helper_inputs',return_value=({'compiler':'/usr/bin/c++','node':'/mock/node'},b)):
  plan=m.helper_plan(work,{'sourceManifest':{}},['-I/fixture/gst','-DFIXTURE=1'])
 assert len(plan['commands'])==3 and plan['runtimeConsumers']==['normalize','review-seed']
 c=plan['commands'];assert c[1]==['/usr/bin/c++','-std=c++17',str(m.SCRIPTS/'recording_process_metrics.cpp'),'-o',str(work/'helpers/process-metrics')]
 for i in (0,2):
  for flag in ['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-DMEDIA_SERVER_USE_GSTREAMER=1','-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1','-DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1']:assert flag in c[i] and flag in original
  assert c[i][-5:]==[str(b/'libmedia_server_runtime.a'),'/fixture/libone.dylib','-pthread','-o',str(work/'helpers'/m.HELPER_NAMES[i])]
 assert plan['instrumentSource']==original.split("<<'NODE'\n",1)[1].split('\nNODE\n',1)[0]
 assert not any('cmake' in v or v.endswith('/media_server') for c in c for v in c)
elif mode in ('stage-verify','stage-missing','stage-format'):
 work=root/'work';work.mkdir(mode=0o700);out=work/'helpers';out.mkdir(mode=0o700);e=root/'evidence';e.mkdir(mode=0o700)
 for n in m.HELPER_FILES:put(out/n,macho() if n in m.HELPER_NAMES else b'instrumented')
 put(e/'helper-plan.json',b'{"commands":[1,2,3]}')
 if mode=='stage-missing':(out/'review-seed').unlink()
 if mode=='stage-format':put(out/'normalize',b'wrong')
 def save(n,v):put(e/n,json.dumps(v).encode())
 with patch.object(m,'helper_inputs',return_value=({'inputs':{},'tools':{}},root)):
  if mode=='stage-verify':
   m.helper_stage('helper-verify',root,{'head':'mock','sourceManifest':{}},save)
   r=json.loads((e/'helper-artifacts.json').read_text());assert not out.exists() and set(r['files'])==set(m.HELPER_FILES)
   assert r['actualHelpersExecuted']==0 and r['planSha256']==m.sha(e/'helper-plan.json')
   for n,v in r['files'].items():assert m.sha(root/'artifacts'/n)==v['sha256']
  else:
   try:m.helper_stage('helper-verify',root,{'head':'mock','sourceManifest':{}},save)
   except ValueError:pass
   else:raise AssertionError('bad output accepted')
   assert out.exists() and not (root/'artifacts').exists()
elif mode=='wrapper':
 normal=root/'normal';limited=root/'limited';m.generate(normal,mandatory_ledger=True);m.generate(limited,mandatory_ledger=True,limited_search=True)
 n=(normal/'wrapper.sh').read_text();s=(limited/'wrapper.sh').read_text()
 assert '--install-limited-helpers' not in n and 'recording_process_metrics.cpp' in n
 branch=s.split('if [[ "$*" == --limited-search-diagnostic ]]; then')[-1].split('else\n')[0]
 assert '--install-limited-helpers' in branch and 'MANIFEST_SHA:?' in branch
 assert 'c++' not in branch and 'pkg-config' not in branch and 'recording_current_observer_native.cpp' not in branch
 assert 'assertLimitedSearchCapacity();' in s and 'assertSearchPerformanceCapacity();' in s
 assert s.index('--install-limited-helpers')<s.index('export MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN=')
else:
 package=root;root=package/'build';root.mkdir(mode=0o700)
 e=root/'evidence';e.mkdir(mode=0o700);a=root/'artifacts';a.mkdir(mode=0o700);d=root/'destination';d.mkdir(mode=0o700)
 source=root/'source';put(source,b'approved');source_name=str(source.relative_to(root))
 manifest={'version':1,'root':str(a),'files':{},'inputs':{}}
 for n in m.HELPER_FILES:
  p=a/n;put(p,macho() if n in m.HELPER_NAMES else b'instrumented');p.chmod(0o700 if n in m.HELPER_NAMES else 0o600)
  manifest['files'][n]={'bytes':p.stat().st_size,'sha256':m.sha(p),'mode':oct(p.stat().st_mode&0o777),**(m.helper_macho(p) if n in m.HELPER_NAMES else {})}
 raw=json.dumps({source_name:m.sha(source)}).encode();h=put(e/'source-sha256.json',raw);manifest['sourceManifest']={'path':'source-sha256.json','sha256':h}
 if mode=='dependency':
  p=a/'normalize';put(p,macho('/nonexistent/libbad.dylib'));p.chmod(0o700);manifest['files']['normalize'].update(bytes=p.stat().st_size,sha256=m.sha(p))
 if mode=='format':
  put(a/'normalize',b'not executable');(a/'normalize').chmod(0o700);manifest['files']['normalize'].update(bytes=14,sha256=m.sha(a/'normalize'))
 if mode=='missing':(a/'review-seed').unlink()
 if mode=='sha':put(a/'normalize',b'changed')
 if mode=='source':put(source,b'changed')
 if mode=='symlink':(a/'normalize').unlink();(a/'normalize').symlink_to(source)
 if mode=='hardlink':(a/'normalize').unlink();os.link(source,a/'normalize')
 expected=put(e/'helper-artifacts.json',json.dumps(manifest).encode())
 terminal=package/'evidence/result.json';terminal_sha=put(terminal,b'{"status":"LIMITED_HELPER_BUILD_PASS"}')
 put(e/'helper-handoff.json',json.dumps({'status':'HELPER_BUILD_ACTUAL_PASS','manifestSha256':expected,'terminalResult':str(terminal),'terminalResultSha256':terminal_sha}).encode())
 put(e/'result.json',json.dumps({'status':'FAIL' if mode=='failed-build' else 'PASS','helperArtifacts':{'sha256':expected}}).encode())
 if mode=='finalization':put(e/'finalization-failure.json',b'{}')
 if mode=='handoff':(e/'helper-handoff.json').unlink()
 if mode=='terminal-failure':put(package/'finalization-failure.json',b'{}')
 if mode=='manifest':expected='0'*64
 with patch.object(m,'REPO',root):
  if mode=='normal':
   m.install_limited_helpers(e/'helper-artifacts.json',expected,d)
   assert set(p.name for p in d.iterdir())==set(m.HELPER_FILES)
   for n in m.HELPER_FILES:assert m.sha(d/n)==m.sha(a/n)
  else:
   try:m.install_limited_helpers(e/'helper-artifacts.json',expected,d)
   except (ValueError,OSError,KeyError):pass
   else:raise AssertionError('invalid helper accepted: '+mode)
   assert not list(d.iterdir())
print('helper binding '+mode+' PASS')
`;
for(const mode of ['plan','stage-verify','stage-missing','stage-format','wrapper','normal','missing','format','sha','source','dependency','symlink','hardlink','manifest','failed-build','finalization','handoff','terminal-failure'])test('helper binding Python '+mode,()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-helper-python-mock-');fs.chmodSync(root,0o700);
 try{const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',helperBindingPython,root,mode],{encoding:'utf8',timeout:15000,maxBuffer:65536});assert.equal(r.status,0,r.stderr+r.stdout);}
 finally{fs.rmSync(root,{recursive:true});}
});
test('helper binding leaves official capacity and runtime limits unchanged',()=>{
 assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);
 const s=fs.readFileSync('scripts/internal/run_v450_recording_a_mixed.py','utf8');assert(s.includes('run_owned(command, log_path, 240'));assert(s.includes('hardDeadlineSeconds=300'));
});

import {limitedHelperPackageSnapshot,verifyLimitedHelperExternalInputs} from './recording_accumulated_cost.mjs';
test('helper evidence snapshots normal and first/middle/last null are distinct from zero or capacity excess',()=>{
 for(const at of [-1,0,1,2]){
  const values=[100,200,300];if(at>=0)values[at]=null;
  const snapshots=values.map((bytes,i)=>limitedHelperPackageSnapshot({treeBytes:()=>bytes},'/mock',i*100));
  assert.equal(snapshots.filter(s=>s.complete).length,at<0?3:2);
  if(at>=0){assert.equal(snapshots[at].bytes,null);assert.equal(snapshots[at].errors[0].code,'HELPER_PACKAGE_DISK_UNOBSERVED');}
 }
 const missing=limitedHelperPackageSnapshot(null,'/mock',0);assert.equal(missing.bytes,null);assert.equal(missing.errors[0].detail,'observer-not-initialized');
 const thrown=limitedHelperPackageSnapshot({treeBytes:()=>{throw Error('EIO');}},'/mock',1);assert.equal(thrown.errors[0].detail,'EIO');
 assert.equal(limitedHelperPackageSnapshot({treeBytes:()=>536870913},'/mock',1).errors[0].code,'HELPER_PACKAGE_DISK_CAP');
 assert.equal(limitedHelperPackageSnapshot({treeBytes:()=>100},'/mock',180000).errors[0].code,'HELPER_PACKAGE_DEADLINE');
});
for(const point of ['first','middle','last'])test('helper evidence adapter '+point+' null disk fails closed',async()=>{
 let m;m=helperBindingMock({disk:n=>point==='first'?null:point==='middle'&&n>=5?null:point==='last'&&fs.existsSync(path.join(m.root,'evidence/result.json'))?null:0});
 try{
  const r=await m.run();assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'build-disk-observation');
  if(point==='first')assert.equal(m.calls.length,0);
  if(point==='middle')assert.equal(m.calls.length,5);
  if(point==='last'){assert(r.finalizationIncomplete);assert(r.helperArtifacts.retained);assert(fs.existsSync(path.join(m.root,'artifacts/normalize')));}
 }finally{m.dispose();}
});
test('helper evidence disk observation then evidence failure keeps original',async()=>withHelperBinding({disk:()=>null,save:(p,d)=>{if(p.endsWith('before-cleanup.json'))throw Error('evidence-write');return mockEvidenceSave(p,d);}},r=>{
 assert.equal(r.firstFailure.code,'build-disk-observation');assert(r.evidenceErrors.some(e=>e.code==='evidence-write'));
}));
test('helper evidence first compiler failure plus cleanup failure stays separate',async()=>withHelperBinding({receipts:{4:{code:1,stderr:'original compile error'}},cleanup:()=>{throw Error('cleanup-error');}},(r,m)=>{
 assert.equal(m.calls.length,5);assert.equal(r.firstFailure.code,'build-command-failed');assert.equal(r.cleanupErrors.length,1);
}));
test('helper evidence artifact SHA mismatch and partial three-helper receipt never qualify',async()=>{
 await withHelperBinding({corrupt:true},r=>{assert.equal(r.status,'FAIL');assert.equal(r.firstFailure.code,'helper-artifact-sha');assert(!r.helperArtifacts);});
 await withHelperBinding({receipts:{7:{code:1,stderr:'missing review-seed'}}},r=>{assert.equal(r.status,'FAIL');assert(!r.helperArtifacts);});
});
test('helper evidence successful artifact stays retained after work cleanup',async()=>withHelperBinding({},(r,m)=>{
 assert.equal(r.status,'PASS');assert(r.helperArtifacts.retained&&r.workAbsent);assert(fs.existsSync(path.join(m.root,'artifacts/review-seed')));
}));
test('helper evidence external symlink input requires approved resolution and exact bytes',()=>{
 const r=fs.mkdtempSync('/private/tmp/media-server-helper-input-mock-');fs.chmodSync(r,0o700);
 try{
  const file=path.join(r,'libz.1.tbd'),alias=path.join(r,'libz.tbd');fs.writeFileSync(file,'approved sdk');fs.symlinkSync('libz.1.tbd',alias);
  const h=crypto.createHash('sha256').update('approved sdk').digest('hex');
  assert.equal(verifyLimitedHelperExternalInputs({[alias]:h},{[alias]:file}).matched,1);
  assert.throws(()=>verifyLimitedHelperExternalInputs({[alias]:h},{}),/input-set/);
  assert.throws(()=>verifyLimitedHelperExternalInputs({[alias]:h},{[alias]:alias}),/input-path/);
  fs.writeFileSync(file,'changed');assert.throws(()=>verifyLimitedHelperExternalInputs({[alias]:h},{[alias]:file}),/input-sha/);
  fs.writeFileSync(path.join(r,'other'),'approved sdk');fs.unlinkSync(alias);fs.symlinkSync('other',alias);
  assert.throws(()=>verifyLimitedHelperExternalInputs({[alias]:h},{[alias]:file}),/input-path/);
 }finally{fs.rmSync(r,{recursive:true});}
});
// Exercise the actual prepared runner's finally block with only injected reads/writes;
// no runner invocation, child process, compiler, or native executable.
const evidenceRunner=process.env.MEDIA_SERVER_HELPER_EVIDENCE_RUNNER;
for(const kind of ['early','write-failure','last-null','success','artifact','cleanup'])test('helper evidence prepared finalization '+kind,{skip:!evidenceRunner},async()=>{
 const text=fs.readFileSync(evidenceRunner,'utf8');
 const observe=text.slice(text.indexOf('function observePackage('),text.indexOf('function fail('));
 const tail=text.slice(text.indexOf('\nfinally{')+9,-2);
 const files=new Map(),failures=[],mockProcess={exitCode:null};let calls=0;
 const helperEvidence={limitedHelperPackageSnapshot};
 const guard=kind==='early'||kind==='write-failure'?null:{treeBytes:()=>kind==='last-null'&&++calls>=2?null:1000,processGroup:()=>({pids:[]})};
 const build=kind==='early'||kind==='write-failure'?null:{status:kind==='cleanup'?'FAIL':'PASS',steps:[],helperArtifacts:{sha256:'a'.repeat(64)},cleanupErrors:kind==='cleanup'?['cleanup-error']:[]};
 const bindings={fs:{existsSync:()=>false,readdirSync:()=>[...files.keys()]},path,performance:{now:()=>100},started:0,root:'/mock/package',helperEvidence,guard,
  writer:{outputDir:'/mock/package/evidence'},prepared:{limits:{disk:536870912},head:'mock'},buildRoot:build?'/mock/package/build':null,build,invocations:build?1:0,
  firstFailure:build?null:{stage:'package-preflight',code:'ELOOP'},stage:'test',postflightErrors:[],evidenceErrors:[],observations:[],packageSnapshots:[],sourcePostflight:'NOT_COMPLETED',groupsAbsent:null,adapterEvidence:null,
  buildStarted:null,buildFinished:null,verifyPackage:()=>{},verifySource:()=>{if(!build)throw Error('original preflight');},
  verifyAdapterEvidence:()=>{if(kind==='artifact')throw Error('HELPER_FILE_SHA');return {verified:true};},readOnly:()=>'',owned:()=>{},hashFile:()=> 'b'.repeat(64),
  write:(name,data)=>{if(kind==='write-failure'&&name==='result.json')throw Error('WRITE_FAILED');files.set(name,data);},
  exclusive:(p,data)=>{files.set(path.basename(p),data);},need:(v,c)=>{if(!v)throw Error(c);},now:()=> 'mock-time',
  process:mockProcess,console:{log:()=>{},error:(...v)=>failures.push(v)}};
 // fail closes over the same firstFailure variable as the original block.
 const code=observe+"\nfunction fail(e){firstFailure??={stage,code:e.message};}\n"+tail+'\nreturn {firstFailure,postflightErrors,packageSnapshots};';
 const result=await new (Object.getPrototypeOf(async function(){}).constructor)(...Object.keys(bindings),code)(...Object.values(bindings));
 if(kind==='early'||kind==='write-failure')assert.equal(result.firstFailure.code,'ELOOP');
 if(kind==='early'){assert.equal(mockProcess.exitCode,1);assert(files.has('result.json'));assert(!files.has('finalization-failure.json'));assert(files.get('result.json').packageSnapshots.every(s=>s.bytes===null));}
 if(kind==='write-failure'){assert.equal(files.get('finalization-failure.json').error,'WRITE_FAILED');assert.equal(files.get('finalization-failure.json').firstFailure.code,'ELOOP');}
 if(kind==='last-null'){assert.equal(mockProcess.exitCode,1);assert.equal(files.get('finalization-failure.json').error,'HELPER_PACKAGE_DISK_UNOBSERVED');}
 if(kind==='success'){assert.equal(mockProcess.exitCode,0);assert(files.has('helper-handoff.json'));}
 if(kind==='artifact'){assert.equal(mockProcess.exitCode,1);assert(!files.has('helper-handoff.json'));assert.equal(result.firstFailure.code,'HELPER_FILE_SHA');}
 if(kind==='cleanup'){assert.deepEqual(files.get('result.json').cleanup.errors,['cleanup-error']);assert.equal(mockProcess.exitCode,1);assert(!files.has('helper-handoff.json'));}
 assert(!JSON.stringify([...files.values()]).includes("reading 'treeBytes'"));
});
test('helper evidence fixed budget and ordinary capacity guards remain unchanged',()=>{
 assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);
 const src=fs.readFileSync('scripts/internal/recording_accumulated_cost.mjs','utf8');assert(src.includes('buildLimits.output-result.outputBytes'));assert(src.includes('rssCap:buildLimits.rss,diskCap:buildLimits.disk'));
});

// One-shot recovery package tests: no compiler, native Helper, or runner invocation.
const recoveryPackage=process.env.MEDIA_SERVER_HELPER_RECOVERY_PACKAGE;
const recoveryCheck=recoveryPackage?await import('file://'+path.join(recoveryPackage,'artifact-check.mjs')):null;
const recoveryTest=(name,fn)=>test('helper postflight '+name,{skip:!recoveryPackage},fn);
function withRecoveryFile(fn){
 const root=fs.mkdtempSync('/private/tmp/media-server-helper-postflight-mock-');fs.chmodSync(root,0o700);
 const name='normalize',file=path.join(root,name),data=Buffer.from('synthetic helper bytes; never executable');
 fs.writeFileSync(file,data,{mode:0o700});fs.chmodSync(file,0o700);
 const entry={mode:'0o700',uid:process.getuid(),links:1,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};
 try{return fn({root,name,file,entry});}finally{fs.rmSync(root,{recursive:true});}
}
recoveryTest('Python oct receipt reproduces original parseInt rejection and verifies corrected regular file',()=>withRecoveryFile(({root,name,entry})=>{
 assert.equal(parseInt(entry.mode,8),0);assert.equal(recoveryCheck.artifactMode(name,entry),448);
 assert.equal(recoveryCheck.verifyArtifact(root,name,entry).sha256,entry.sha256);
}));
for(const mode of ['700','0o600','0o700junk','0o777','0o4700',700])recoveryTest('reject mode '+mode,()=>withRecoveryFile(({root,name,entry})=>{
 assert.throws(()=>recoveryCheck.verifyArtifact(root,name,{...entry,mode}),/MODE_CONTRACT/);
}));
for(const kind of ['symlink','hardlink','execute-missing','owner','sha','size'])recoveryTest('file safety '+kind,()=>withRecoveryFile(({root,name,file,entry})=>{
 if(kind==='symlink'){fs.renameSync(file,path.join(root,'other'));fs.symlinkSync('other',file);}
 if(kind==='hardlink')fs.linkSync(file,path.join(root,'other'));
 if(kind==='execute-missing')fs.chmodSync(file,0o600);
 if(kind==='owner'){
  const st=fs.lstatSync(file),wrong={...st,uid:st.uid+1,isFile:()=>true,isSymbolicLink:()=>false};
  assert.throws(()=>recoveryCheck.checkAttributes(wrong,name,entry),/FILE_UNSAFE/);return;
 }
 if(kind==='sha')entry.sha256='0'.repeat(64);
 if(kind==='size')entry.bytes++;
 assert.throws(()=>recoveryCheck.verifyArtifact(root,name,entry),/FILE_UNSAFE|FILE_SHA|FILE_SIZE/);
}));
function completeRecoveryBuild(){
 return {status:'PASS',firstFailure:null,errors:[],cleanupErrors:[],evidenceErrors:[],workAbsent:true,
  limits:{seconds:180,rssBytes:1073741824,diskBytes:536870912,outputBytes:2097152},elapsedMs:8000,peakRssBytes:500000000,peakDiskBytes:35000000,outputBytes:7000,storedOutputBytes:7000,
  steps:['helper-inputs','helper-flags','helper-plan','helper-instrument','helper-normalize','helper-process-metrics','helper-review-seed','helper-verify'].map((stage,i)=>({stage,code:0,signal:null,stopReason:null,groupClean:true,observationFailure:null,outputComplete:true,groupId:100+i,startedMs:i*100,endedMs:i*100+90,remainingMs:180000-i*100,timePeakRssBytes:1000000,groupPeakRssBytes:0}))};
}
recoveryTest('complete previous three-helper build is reusable without rebuilding',()=>assert.deepEqual(recoveryCheck.verifyBuildReceipt(completeRecoveryBuild()),{builds:3,steps:8,executions:0}));
for(const kind of ['partial','exit','observation','output','deadline','rss','disk','cleanup'])recoveryTest('reject previous build '+kind,()=>{
 const b=completeRecoveryBuild();
 if(kind==='partial')b.steps.pop();if(kind==='exit')b.steps[6].code=1;if(kind==='observation')b.steps[4].observationFailure={part:'disk'};
 if(kind==='output')b.storedOutputBytes--;if(kind==='deadline')b.elapsedMs=180000;if(kind==='rss')b.peakRssBytes=1073741825;if(kind==='disk')b.peakDiskBytes=536870913;if(kind==='cleanup')b.cleanupErrors.push('unconfirmed');
 assert.throws(()=>recoveryCheck.verifyBuildReceipt(b),/PRIOR_/);
});
recoveryTest('current Source mismatch rejects before copy',()=>{
 const src=fs.readFileSync(path.join(recoveryPackage,'run-once.mjs'),'utf8');
 const body=src.slice(src.indexOf('function sourceCheck(){'),src.indexOf('function snapshot(){'));
 const invoke=new Function('fs','path','prepared','approval','support','sha','need','readOnly',body+';sourceCheck();');
 assert.throws(()=>invoke({realpathSync:p=>p},path,{repo:'/approved'},{sourceSha256:{'src/input.cpp':'a'.repeat(64)}},{},()=> 'b'.repeat(64),(v,c)=>{if(!v)throw Error(c);},()=>''),/SOURCE_CHANGED:src\/input.cpp/);
});
recoveryTest('first postflight error is not overwritten by evidence failure',()=>{
 const src=fs.readFileSync(path.join(recoveryPackage,'run-once.mjs'),'utf8'),body=src.slice(src.indexOf('function fail('),src.indexOf('function readOnly('));
 const run=new Function('writer','Buffer','path','sha','need',"let firstFailure=null,stage='postflight';const evidenceErrors=[];"+body+"fail(Error('HELPER_FILE_UNSAFE'));try{write('result.json',{});}catch(e){fail(e);}return {firstFailure,evidenceErrors};");
 const r=run({write:()=>{throw Error('EIO');}},Buffer,path,()=>'',()=>{});
 assert.equal(r.firstFailure.code,'HELPER_FILE_UNSAFE');assert.equal(r.evidenceErrors[0].code,'EIO');
});
for(const mode of ['normal','existing','symlink','hardlink','source-sha','execute','source-receipt','source-receipt-sha','source-receipt-path'])recoveryTest('safe Python artifact copy '+mode,()=>{
 const code=String.raw`
import importlib.util,sys,pathlib,tempfile,os,hashlib,json
sys.path.insert(0,str(pathlib.Path.cwd()/'scripts/internal'))
import recording_accumulated_cost as existing
s=importlib.util.spec_from_file_location('copy_only',pathlib.Path(sys.argv[1])/'verify-copy.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
with tempfile.TemporaryDirectory(prefix='media-server-copy-mock-',dir='/private/tmp') as tmp:
 root=pathlib.Path(tmp);(root/'src').mkdir(mode=0o700);(root/'dst').mkdir(mode=0o700)
 p=root/'src/normalize';d=root/'dst/normalize';p.write_bytes(b'non executable mock');p.chmod(0o700)
 e={'mode':'0o700','uid':os.getuid(),'links':1,'bytes':p.stat().st_size,'sha256':m.digest(p)};mode=sys.argv[2]
 if mode.startswith('source-receipt'):
  source=root/'source-sha256.json';data={'src/mock.cpp':'a'*64};source.write_text(json.dumps(data))
  receipt={'path':source.name,'bytes':source.stat().st_size,'sha256':m.digest(source)}
  if mode=='source-receipt-sha':receipt['sha256']='0'*64
  if mode=='source-receipt-path':receipt['path']='../source-sha256.json'
  try:m.source_manifest(root,receipt,data)
  except ValueError:assert mode!='source-receipt'
  else:assert mode=='source-receipt'
  print('COPY_MOCK_PASS');sys.exit(0)
 if mode=='existing':d.write_bytes(b'preserved')
 if mode=='symlink':p.rename(p.with_name('real'));p.symlink_to('real')
 if mode=='hardlink':os.link(p,p.with_name('alias'))
 if mode=='source-sha':e['sha256']='0'*64
 if mode=='execute':p.chmod(0o600)
 try:m.copy_artifact(p,d,e,existing.helper_owned)
 except (ValueError,OSError):
  assert mode!='normal'
  if mode=='existing':assert d.read_bytes()==b'preserved'
 else:
  assert mode=='normal' and p.read_bytes()==d.read_bytes() and m.digest(d)==e['sha256'] and d.stat().st_nlink==1 and (d.stat().st_mode&0o777)==0o700
print('COPY_MOCK_PASS')
`;
 const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',code,recoveryPackage,mode],{encoding:'utf8',timeout:5000,maxBuffer:65536});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/COPY_MOCK_PASS/);
});
recoveryTest('recovery uses existing bounded supervision and no build or native invocation',()=>{
 const r=fs.readFileSync(path.join(recoveryPackage,'run-once.mjs'),'utf8'),p=fs.readFileSync(path.join(recoveryPackage,'verify-copy.py'),'utf8');
 assert.equal((r.match(/await guard\.runBounded\(/g)||[]).length,1);
 assert(r.includes('seconds:remaining,outputCap:2097151,rssCap:1073741824,diskCap:536870912'));
 assert(r.includes("exclusive(path.join(root,'CLAIMED.json')"));assert(r.includes('COPY_GROUP_REMAINS'));
 assert(!r.includes('runLimitedIsolatedBuild(')&&!p.includes('subprocess')&&!p.includes('.chmod('));
 assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});

// Limited preparation only: virtual clocks/processes; no native collector,
// Helper, server, compiler or HTTP request is executed by these tests.
import {limitedPreparationStart} from './recording_accumulated_cost.mjs';
test('limited preparation shared origin includes preparation and rejects missing/future/expired clocks',()=>{
 const origin='1000000000000';
 for(const seconds of [0,100,235,236,240,299]){
  const start=limitedPreparationStart({originNs:origin,nowNs:()=>1000000000000n+BigInt(seconds)*1000000000n,now:()=>10});
  assert.equal(10-start,seconds*1000);
  const schedule=limitedSearchSchedule({startedAt:0,now:()=>10-start});
  assert.equal(schedule.decision().start,seconds<=235);
 }
 for(const originNs of [undefined,'0','invalid','1000000000001','1'])assert.throws(()=>limitedPreparationStart({originNs,nowNs:()=>1000000000000n,now:()=>10}));
});
const preparationPython=String.raw`
import sys,copy,io,os,ast
from pathlib import Path
from unittest.mock import Mock,patch
sys.path.insert(0,'scripts/internal');import run_v450_recording_a_mixed as m
root=Path(sys.argv[1]);mode=sys.argv[2];tick=[100.0];observations=[];cap=448*1024**2
row={'pid':101,'pgid':100,'expectedPgid':100,'startIdentity':'macos:100:200','valid':True,'error':None,'rssBytes':1024,
 'observedStartNs':'100000000000','observedEndNs':'100000000001','fdObservation':{'complete':True,'startIdentity':'macos:100:200'}}
value={'complete':True,'expectedPids':[101],'processes':[row],'workspace':{'totalBytes':10,'fixedBytes':0,'copyBytes':0,'anonymousBytes':5}}
def observe(child):observations.append(child);return copy.deepcopy(value)
b=m.LimitedPreparationBoundary(observe,now=lambda:tick[0],origin=100)
def fails(code,phase='prepare',work=True):
 try:b.sample(phase,work=work)
 except ValueError as e:assert str(e)==code,(str(e),code)
 else:raise AssertionError('accepted '+code)
 assert b.first['code']==code
if mode=='normal':
 b.sample('before-copy');tick[0]=150;b.sample('seed');tick[0]=200;b.sample('fixture')
 assert b.remaining()==140 and b.samples==3 and b.peaks=={101:1024}
 assert b.report()['capacityPreflight']=='BLOCKED' and 'shared pages' in b.last_snapshot['rssMeaning']
 value['processes'].append(dict(row,pid=102,rssBytes=2048));value['expectedPids'].append(102);b.sample('wrapper-helper')
 assert b.last_snapshot['rssSumBytes']==3072 and len(b.identities)==2
elif mode=='clock':
 tick[0]=339.999;b.sample('last-work');tick[0]=340;fails('limited-work-deadline');assert len(observations)==1
 tick[0]=399.999;b.sample('shutdown',work=False);assert b.samples==2
 tick[0]=400
 try:b.sample('finalization',work=False)
 except ValueError as e:assert str(e)=='limited-finalization-deadline'
 else:raise AssertionError('hard limit accepted')
 assert b.first['code']=='limited-work-deadline' and b.secondary[-1]['code']=='limited-finalization-deadline'
elif mode=='clock-regression':tick[0]=99;fails('limited-clock')
elif mode=='clock-nan':tick[0]=float('nan');fails('limited-clock')
elif mode=='collection-delay':
 def delayed(child):tick[0]=341;return value
 b.observe=delayed;fails('limited-work-deadline')
elif mode=='missing':value['complete']=False;fails('limited-observation-missing')
elif mode=='coverage':value['expectedPids'].append(102);fails('limited-process-coverage')
elif mode=='identity':row['startIdentity']=None;fails('limited-process-identity')
elif mode=='identity-format':row['startIdentity']='macos:x';fails('limited-process-identity')
elif mode=='pid-reuse':b.sample('baseline');row['startIdentity']='macos:101:200';row['fdObservation']['startIdentity']=row['startIdentity'];fails('limited-process-identity-changed')
elif mode=='group-escape':row['pgid']=200;fails('limited-group-escape')
elif mode=='fd':row['fdObservation']['complete']=False;fails('limited-native-observation')
elif mode=='rss-missing':row['rssBytes']=None;fails('limited-rss-missing')
elif mode=='rss-cap':row['rssBytes']=4*1024**3+1;fails('limited-rss-cap')
elif mode=='sample-clock':row['observedEndNs']='1';fails('limited-observation-clock')
elif mode=='workspace-missing':value['workspace']['totalBytes']=None;fails('limited-workspace-unobserved')
elif mode in ('media','sqlite','journal','shutdown-file'):
 value['workspace']['totalBytes']=cap-5;fails('limited-workspace-variable-cap',mode,mode!='shutdown-file')
elif mode=='copy':value['workspace']['copyBytes']=cap;fails('limited-workspace-copy-cap')
elif mode=='combined':
 # Combined is dominated by the two strict component bounds. Never accept an
 # individually allowed but combined-overflow pair using a different baseline.
 value['workspace'].update(totalBytes=cap-6,copyBytes=cap-1);b.sample('copy-near-limit')
 value['workspace']['anonymousBytes']=7;fails('limited-workspace-variable-cap')
elif mode=='sample-cap':b.samples=1600;fails('limited-observation-sample-cap')
elif mode=='first':
 b.fail('seed-failed','seed');b.fail('cleanup-failed','cleanup')
 with patch.object(m.subprocess,'Popen') as launch:
  r=m.run_owned(['never-executed'],root/'blocked.log',240,root,{},lambda _:None,limited_boundary=b)
 assert launch.call_count==0 and r['status']=='FAIL' and b.first['code']=='seed-failed'
 assert any(e['code']=='cleanup-failed' for e in b.secondary)
elif mode in ('supervisor','shutdown-output','supervisor-error','cleanup-error'):
 child=Mock();child.pid=100;child.returncode=None;child.poll.side_effect=lambda:child.returncode
 capture=m.LimitedParentCapture();events=[];calls=[0]
 def attach(ch,out):capture.output=out;capture.pipe=io.BytesIO()
 def read(timeout):
  events.append('read');capture.push(b'shutdown\n' if child.returncode is not None else b'work\n')
  if child.returncode is not None:
   if mode=='shutdown-output':capture.push(b'x'*m.LIMITED_PARENT_OUTPUT_BYTES)
   capture.eof=True
  else:capture.push(b'[R165-first-failure] {"code":"seed-failed"}\n')
 def observation(ch):
  calls[0]+=1
  if mode in ('supervisor-error','cleanup-error') and calls[0]>=2:raise ValueError('identity-unavailable' if calls[0]==2 else 'cleanup-observation')
  return copy.deepcopy(value)
 b.observe=observation
 def stop(ch):events.append('stop');child.returncode=-15;return {'processGroupAbsent':mode!='cleanup-error','cleanupErrors':['group-residual'] if mode=='cleanup-error' else []}
 with patch.object(m.subprocess,'Popen',return_value=child) as launch,patch.object(capture,'attach',side_effect=attach),patch.object(capture,'read',side_effect=read),patch.object(m,'stop_created_group',side_effect=stop),patch.object(m,'group_alive',return_value=False),patch.object(m,'finish_registered_groups',return_value={'registeredGroupsAbsent':True}):
  r=m.run_owned(['synthetic-only'],root/'run.log',240,root,{},lambda _:None,limited_capture=capture,limited_boundary=b)
 assert launch.call_count==1 and r['status']=='FAIL' and events.count('stop')==1
 assert b.first['code']==('identity-unavailable' if mode in ('supervisor-error','cleanup-error') else 'child-diagnostic')
 assert b'shutdown' in (root/'run.log').read_bytes() and capture.eof
 assert (root/'run.log').stat().st_size<=2097152
 if mode=='shutdown-output':assert 'parent-output-cap' in capture.failure_events
 if mode=='cleanup-error':assert not r['processGroupAbsent'] and r['cleanupErrors']==['group-residual'] and b.secondary[-1]['code']=='cleanup-observation'
elif mode=='observer-evidence-error':
 observer=m.LimitedPreparationNativeObserver(root,'/mock/collector','0'*64,'/mock/node',100)
 observer.trace=Mock();observer.trace.write.side_effect=OSError('evidence-write')
 with patch.object(m.subprocess,'Popen',side_effect=OSError('spawn-error')),patch.object(m.time,'monotonic',return_value=100):
  try:observer(None)
  except OSError as e:assert str(e)=='spawn-error'
  else:raise AssertionError('missing first failure')
 assert observer.secondary_errors==['evidence-write']
elif mode=='legacy':
 child=Mock();child.pid=100;child.returncode=0;child.poll.return_value=0
 with patch.object(m.subprocess,'Popen',return_value=child) as launch,patch.object(m,'stop_created_group',return_value={'processGroupAbsent':True}),patch.object(m,'group_alive',return_value=False),patch.object(m,'finish_registered_groups',return_value={'registeredGroupsAbsent':True}):
  r=m.run_owned(['synthetic-only'],root/'legacy.log',180,root,{},lambda _:None)
 assert r['status']=='PASS' and len(observations)==0 and launch.call_args.kwargs['stdout']!=m.subprocess.PIPE
else:raise AssertionError(mode)
print('PASS synthetic '+mode+'; native/helper/product launches=0')
`;
for(const mode of ['normal','clock','clock-regression','clock-nan','collection-delay','missing','coverage','identity','identity-format','pid-reuse','group-escape','fd','rss-missing','rss-cap','sample-clock','workspace-missing','media','sqlite','journal','shutdown-file','copy','combined','sample-cap','first','supervisor','shutdown-output','supervisor-error','cleanup-error','observer-evidence-error','legacy'])test('limited preparation boundary '+mode,()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-preparation-mock-');fs.chmodSync(root,0o700);
 try{const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',preparationPython,root,mode],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}
 finally{fs.rmSync(root,{recursive:true});}
});
function preparationProducerMock(mode){
 const source=fs.readFileSync('scripts/internal/recording_accumulated_cost.mjs','utf8');
 const body=source.slice(source.indexOf('export async function observeLimitedPreparation'),source.indexOf('const buildScript=')).replace('export async function','async function');
 let tables=0,ns=1000n;const calls=[];const rootStat={uid:501,mode:0o700,dev:1,ino:1,isDirectory:()=>true,isSymbolicLink:()=>false};
 const processRows='10 1 10\n20 10 20\n21 20 20\n999 10 999\n1000 999 999\n';
 const sandbox={process:{pid:999,getuid:()=>501,hrtime:{bigint:()=>ns++}},path,crypto,Number,JSON,Set,Error,
  need:(v,m)=>{if(!v)throw Error(m);},number:v=>Number.isSafeInteger(v)&&v>=0,
  fs:{lstatSync:p=>p==='/collector'?{...rootStat,isFile:()=>true,nlink:1}:{...rootStat,isSymbolicLink:()=>mode==='root-symlink'},realpathSync:p=>p,readFileSync:()=>Buffer.from('collector')},
  preparationSpawnSync:(command,args,options)=>{calls.push({command,args,options});tables++;return {status:mode==='table-error'?1:0,stdout:processRows+(mode==='tree-churn'&&tables===2?'22 20 20\n':'')};},
  preparationCollectProcess:async(file,pid)=>{calls.push({collector:file,pid});if(mode==='collector-error')throw Error('native-failure');return {pid:mode==='wrong-pid'?pid+1:pid,anonymousFileBytes:mode==='anonymous-missing'?null:1,anonymousAllocatedBytes:2};},
  preparationMeasureRoot:()=>({totalBytes:10}),preparationMeasureCopy:()=>({bytes:20}),
  preparationWorkspaceBounds:(total,fixed,copy)=>{calls.push({total,fixed,copy});if(mode==='workspace')throw Error('workspace-exceeded');}
 };
 const fn=vm.runInNewContext(body+'\nobserveLimitedPreparation',sandbox);
 return {calls,run:()=>fn({root:'/owned',rootIdentity:{dev:1,ino:1},copyRoot:mode==='copy-overlap'?'/owned':'/copy',copyIdentity:{dev:1,ino:1},launcherPid:10,childPid:20,collector:'/collector',collectorSha256:mode==='sha'?'0'.repeat(64):crypto.createHash('sha256').update('collector').digest('hex')})};
}
test('limited preparation producer observes launcher wrapper helper; excludes its own observation descendants explicitly',async()=>{
 const m=preparationProducerMock('normal'),r=await m.run();assert.deepEqual(Array.from(r.expectedPids),[10,20,21]);
 assert.deepEqual(Array.from(r.processes,p=>p.expectedPgid),[10,20,20]);assert.equal(r.workspace.anonymousBytes,6);assert.equal(r.workspace.copyBytes,20);
 assert(r.coverage.includes('NOT_PROVEN'));assert.equal(r.writeAdmission,'NOT_BOUND');assert.equal(m.calls.filter(c=>c.collector).length,3);
 for(const c of m.calls.filter(c=>c.command)){assert.equal(c.command,'/bin/ps');assert.equal(c.options.timeout,1000);assert.equal(c.options.maxBuffer,1048576);}
});
for(const [mode,error] of [['table-error','limited-process-table'],['tree-churn','limited-process-tree-changed'],['collector-error','native-failure'],['wrong-pid','limited-native-pid'],['anonymous-missing','limited-anonymous-unobserved'],['root-symlink','limited-root-identity'],['copy-overlap','limited-copy-overlap'],['sha','limited-collector-sha'],['workspace','workspace-exceeded']])test('limited preparation producer fail closed '+mode,async()=>{await assert.rejects(preparationProducerMock(mode).run(),new RegExp(error));});
test('limited preparation overlay clock and unchanged general wrapper, helper rejection and build prohibition',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-preparation-overlay-mock-');
 const code=String.raw`
import sys,ast
from pathlib import Path
sys.path.insert(0,'scripts/internal');import recording_accumulated_cost as m
root=Path(sys.argv[1]);m.generate(root/'normal',mandatory_ledger=True);m.generate(root/'limited',mandatory_ledger=True,limited_search=True)
normal=(root/'normal/wrapper.sh').read_text();limited=(root/'limited/wrapper.sh').read_text();driver=(root/'limited/mixed.mjs').read_text()
assert 'MEDIA_SERVER_LIMITED_ORIGIN_NS' in driver and 'startedAt:0,now:()=>performance.now()-start' in driver
assert 'limitedDiagnose?limitedPreparationStart' in driver
assert '--install-limited-helpers' not in normal
branch=limited.split('if [[ "$*" == --limited-search-diagnostic ]]; then')[-1].split('else\n')[0]
assert '--install-limited-helpers' in branch and 'MANIFEST_SHA:?' in branch
assert all(s not in branch for s in ('c++','cmake','pkg-config'))
assert 'assertLimitedSearchCapacity();' in limited and 'assertSearchPerformanceCapacity();' in limited
for n in ('recording_accumulated_cost.py','run_v450_recording_a_mixed.py'):ast.parse((m.SCRIPTS/n).read_text())
print('overlay and syntax static PASS; no native execution')
`;
 try{const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',code,root],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}
 finally{fs.rmSync(root,{recursive:true});}
 assert.throws(assertLimitedSearchCapacity,/LIMITED_CAPACITY_BLOCKED/);assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
});
for(const mode of ['normal','sha','missing'])test('limited preparation existing helper installer '+mode,()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-preparation-install-mock-');fs.chmodSync(root,0o700);
 try{const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',helperBindingPython,root,mode],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stdout+r.stderr);}
 finally{fs.rmSync(root,{recursive:true});}
});
test('limited preparation preserves output workspace and build limits; cannot manufacture readiness',()=>{
 const c=limitedSearchCapacity();assert.equal(c.status,'BLOCKED');
 const text=fs.readFileSync('scripts/internal/recording_accumulated_cost.mjs','utf8');
 for(const contract of ['capBytes:4*1024*1024','capBytes:2*1024*1024,rowCap:4096','detailBytes<=128*1024','serverBytes<=384*1024-192','clientBytes+bytes<=256*1024'])assert(text.includes(contract),contract);
 const launcher=fs.readFileSync('scripts/internal/run_v450_recording_a_mixed.py','utf8');
 const entry=launcher.slice(launcher.indexOf('def limited_entry('),launcher.indexOf('def source_binding('));
 assert(entry.indexOf('began=time.monotonic()')<entry.indexOf('verify_isolated_build_inputs(plan'));
 assert(entry.indexOf('assertLimitedSearchCapacity();')<entry.indexOf('LimitedPreparationNativeObserver(directory'));
 assert(launcher.includes('LIMITED_PARENT_OUTPUT_BYTES = 2097152'));
 const guard=fs.readFileSync('scripts/internal/recording_catalog_comparison_guard.mjs','utf8');
 assert(guard.includes('seconds:180'));assert(guard.includes('output:2097152'));
});

// S03-OFFICIAL-INTEGRATION-F01: final artifact representation, not ledger wire sizing.
function officialCompactLedger(boundary,count=484){
 const c=mandatoryRequestLedger(),pid=boundary?2147483647:5001,identity=boundary?capacityIdentity:'macos:1792673776:277918';
 c.bindProcess({valid:true,error:null,pid,startIdentity:identity},{pid,seq:1000});
 const origin=1000000000000000;let ordinal=0;
 for(let id=1;id<=count;id++){
  const structured=id%4===1||id%4===2,kind=structured?'structured':'visual',b=origin+id*10000000000;
  c.start(id,{kind,pid,startedMs:boundary?capacityFloat:1000000+id*15000});
  if(structured){
   const n=++ordinal;
   c.append(fw('search',lq(id,n,{pid,begin:b+30,end:b+2100000030,retry:2,waitNs:1000000000,holdNs:1000000000,
    attempts:[0,1,2].map(i=>({stage:boundary?'reference-resolution':i<2?'validate-source':'currentness-json',reason:boundary?'search-playback-candidate-capacity':i<2?'search-source-changed':'none',captured:boundary?Number.MAX_SAFE_INTEGER:123456789012345+i,current:boundary?Number.MAX_SAFE_INTEGER:123456789012346+i,authority:i===2}))})),1,pid);
   if(n<=24)c.append(fw('detail',{v:2,pid,id,captures:[],phases:[['preparation-wait',b+30,b+1000000030],['preparation-hold',b+1000000030,b+2000000030]]}),1,pid);
  }
  c.append(fw('server',ls(id,{pid,dispatch:b+10,handler:b+20,prepared:b+2100000200,sendBegin:b+2100000300,sendEnd:b+2100000400,end:b+2100000500})),1,pid);
  c.client(lc(id,{pid,totalElapsedMs:boundary?capacityFloat:2101,endedMs:boundary?capacityFloat:1000000+id*15000+2101,bytes:boundary?Number.MAX_SAFE_INTEGER:10000}));
 }
 const ledgerReport=c.report({cleanupComplete:true});
 assert.equal(ledgerReport.status,'captured');assert.equal(ledgerReport.requests.length,count);
 assert.equal(ledgerReport.metrics.structured.started,count/2);assert.equal(ledgerReport.metrics.visual.started,count/2);
 return ledgerReport;
}
for(const profile of ['ordinary','schema boundary','with A boundary'])test('official final report: '+profile+' 484-request envelope admission',async()=>{
 const boundary=profile!=='ordinary';
 const {createReviewTestArtifacts}=await import('./va_review_test_artifacts.mjs');
 const ledgerReport=officialCompactLedger(boundary),pid=boundary?2147483647:5001;
 // This is a strict subset of the real report: samples/summary/Evidence/A are NOT
 // added. If this subset exceeds the cap, the full pretty report cannot fit.
 const parent=fs.mkdtempSync('/private/tmp/media-server-s03-report-mock-');fs.chmodSync(parent,0o700);
 const dir=path.join(parent,'diagnostic'),a=createReviewTestArtifacts(process.cwd(),{MEDIA_SERVER_TEST_ARTIFACT_ROOT:parent,MEDIA_SERVER_TEST_OUTPUT_DIR:dir});
 try{
  const report={failureAttribution:ledgerReport};
  if(profile==='with A boundary'){
   const {AOpportunities,MixedALoad}=await import('./v450_recording_a_load.mjs');
   const schedule=new AOpportunities(0,2700000),completed=[];
   for(let i=0;i<30;i++){
    const row=schedule.take(i*60000,false),id=String(i).padStart(32,'0');
    Object.assign(row,{label:'main-'+i,packageId:id,snapshotId:id,hitId:id,draftId:id,revision:1,
     preparedAt:i*60000+100,pid,jobId:id,admittedAt:i*60000+200,lastState:'completed',
     state:'completed',reviewId:id,completedAt:i*60000+1000,jobElapsedMs:800,resultHash:'a'.repeat(64)});
    completed.push({...row});
   }
   report.aLoad=MixedALoad.prototype.report.call({schedule,completed,controlsResult:{},
    initial:{names:[],bytes:0},inventory:()=>({names:[],bytes:0}),immutable:new Map()});
   assert.equal(report.aLoad.schedule.length,30);assert.equal(report.aLoad.completed.length,30);
  }
  const receipt=checkpointSearchPerformanceReport(a,report),bytes=fs.readFileSync(path.join(dir,'report.json'));
  const pretty=Buffer.from(JSON.stringify({...report,artifactRoot:dir},null,2)+'\n');
  const expected=Buffer.from(JSON.stringify({...report,artifactRoot:dir})+'\n');
  assert.deepEqual(JSON.parse(pretty),JSON.parse(expected));
  if(profile==='with A boundary')assert.ok(pretty.length>1048576,'preserve the previous oversized pretty counterexample');
  assert.deepEqual(bytes,expected);assert.equal(receipt.bytes,bytes.length);
  assert.equal(receipt.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(JSON.parse(bytes).failureAttribution,ledgerReport);
  const compactBytes=Buffer.byteLength(JSON.stringify({...report,artifactRoot:dir})+'\n');
  const result={scope:'official-final-report-admission',profile,boundary,requests:484,ledgerStatus:ledgerReport.status,
   artifactBytes:bytes.length,artifactCap:1048576,excessBytes:Math.max(0,bytes.length-1048576),
   prettyBytes:pretty.length,compactBytes,compactApplied:true,sha256:receipt.sha256,
   fullReport:'NOT_CONSTRUCTED; measured envelope is a strict subset',
   preflight:bytes.length>1048576?'BLOCKED_REPORT_CAP':'REPORT_SUBSET_FITS_FULL_UNPROVEN'};
  console.log(JSON.stringify(result));
  preserveCompactCase(profile,{pretty,compact:bytes,receipt,result});
  assert.ok(bytes.length<=1048576,`official report subset ${bytes.length} exceeds 1048576 bytes; do not prepare Runner`);
 }finally{
  for(const name of ['report.json','started.json']){const p=path.join(dir,name),s=fs.lstatSync(p);assert(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1);fs.unlinkSync(p);}
  fs.rmdirSync(dir);fs.rmdirSync(parent);assert(!fs.existsSync(parent));
 }
});

// S03-REPORT-COMPACT-F01: preserve inspectable mock bytes, never a runtime receipt.
function preserveCompactCase(name,{pretty,compact,receipt,result}){
 const root=process.env.MEDIA_SERVER_S03_REPORT_EVIDENCE;if(!root)return;
 const s=fs.lstatSync(root);assert(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&511)===448);
 const prefix=name.replace(/[^a-z0-9-]/gi,'-');
 for(const [suffix,bytes] of [['pretty.json',pretty],['compact.json',compact],['receipt.json',Buffer.from(JSON.stringify({receipt,result},null,2)+'\n')]]){
  const file=path.join(root,prefix+'.'+suffix),fd=fs.openSync(file,'wx',0o600);
  try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  assert.deepEqual(fs.readFileSync(file),bytes);
 }
}
async function compactArtifactCase(run){
 const {createReviewTestArtifacts}=await import('./va_review_test_artifacts.mjs');
 const parent=fs.mkdtempSync('/private/tmp/media-server-s03-compact-mock-'),dir=path.join(parent,'diagnostic');fs.chmodSync(parent,0o700);
 try{return await run(createReviewTestArtifacts(process.cwd(),{MEDIA_SERVER_TEST_ARTIFACT_ROOT:parent,MEDIA_SERVER_TEST_OUTPUT_DIR:dir}),dir);}
 finally{for(const name of fs.readdirSync(dir)){const f=path.join(dir,name),s=fs.lstatSync(f);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.uid===process.getuid());fs.unlinkSync(f);}fs.rmdirSync(dir);fs.rmdirSync(parent);assert(!fs.existsSync(parent));}
}
test('official compact report: exact UTF-8 cap, overflow, exclusive file and errors',async()=>{
 await compactArtifactCase((a,dir)=>{
  const record={status:'INCOMPLETE',firstFailure:{code:'original-timeout'},value:'한글',payload:''};
  const overhead=Buffer.byteLength(JSON.stringify({...record,artifactRoot:dir})+'\n'),n=1048576-overhead;
  record.payload='é'.repeat(Math.floor(n/2))+'x'.repeat(n%2);
  const bytes=Buffer.from(JSON.stringify({...record,artifactRoot:dir})+'\n');assert.equal(bytes.length,1048576);
  const receipt=checkpointSearchPerformanceReport(a,record);assert.equal(receipt.bytes,1048576);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),JSON.parse(bytes));
  const before=fs.readFileSync(path.join(dir,'report.json'));
  assert.throws(()=>checkpointSearchPerformanceReport(a,record),e=>e.code==='EEXIST');
  assert.deepEqual(fs.readFileSync(path.join(dir,'report.json')),before);
 });
 await compactArtifactCase((a,dir)=>{
  let writes=0;const original=a.write;a.write=(...args)=>{if(args[0]==='report.json')writes++;return original(...args);};
  const report={firstFailure:{code:'timeout'},payload:''};
  const overhead=Buffer.byteLength(JSON.stringify({...report,artifactRoot:dir})+'\n');report.payload='x'.repeat(1048577-overhead);
  assert.throws(()=>checkpointSearchPerformanceReport(a,report),/search-report-cap/);assert.equal(writes,0);assert.equal(report.firstFailure.code,'timeout');
  assert(!fs.existsSync(path.join(dir,'report.json')));
 });
 await compactArtifactCase(a=>{
  const first=Object.assign(Error('write-full'),{code:'ENOSPC'});a.write=()=>{throw first;};
  assert.throws(()=>checkpointSearchPerformanceReport(a,{status:'FAIL'}),e=>e===first);
  const circular={};circular.self=circular;assert.throws(()=>checkpointSearchPerformanceReport(a,circular),TypeError);
 });
 await compactArtifactCase((a,dir)=>{
  const write=a.write;a.write=(n,b)=>{const r=write(n,b);const copy=Buffer.from(b);copy[0]=32;fs.writeFileSync(path.join(dir,n),copy);return r;};
  assert.throws(()=>checkpointSearchPerformanceReport(a,{status:'FAIL',firstFailure:{code:'timeout'}}),/search-report-readback/);
 });
});

test('official compact report: shared checkpoint remains pretty and JSON consumers are compatible',async()=>{
 await compactArtifactCase((a,dir)=>{
  const value={status:'FAIL',nested:{nullValue:null,number:0,array:[1,null,'오류']},firstFailure:{code:'timeout'}};
  a.checkpoint(value);const actual=fs.readFileSync(path.join(dir,'report.json'));
  assert.deepEqual(actual,Buffer.from(JSON.stringify({...value,artifactRoot:dir},null,2)+'\n'));
  assert.deepEqual(JSON.parse(actual),JSON.parse(JSON.stringify({...value,artifactRoot:dir})));
  a.checkpoint({...value,status:'INCOMPLETE'});assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'report.json'))).status,'INCOMPLETE');
 });
 const consumer=fs.readFileSync('scripts/internal/va_review_test_artifacts.mjs','utf8');
 assert.match(consumer,/JSON.parse\(fs.readFileSync\(path.join\(outputDir,'report.json'\),'utf8'\)\)/);
 assert.match(consumer,/JSON.stringify\(\{\.\.\.report,artifactRoot:outputDir\},null,2\)/);
});

async function exerciseFullReportProfiles(profiles,transform=report=>report){
 const {CurrentLongrunProgress,summarizeCurrentSamples}=await import('./recording_current_observer.mjs');
 const {AOpportunities,MixedALoad}=await import('./v450_recording_a_load.mjs');
 const {mixedRecordingProfile}=await import('./recording_longrun_progress.mjs');
 const parent=fs.mkdtempSync('/private/tmp/media-server-s03-compact-generated-'),out=path.join(parent,'overlay');fs.chmodSync(parent,0o700);
 try{
  const generated=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',"import sys;from pathlib import Path;sys.path.insert(0,str(Path.cwd()/'scripts/internal'));from recording_accumulated_cost import generate;generate(Path(sys.argv[1]),mandatory_ledger=True)",out],{encoding:'utf8',timeout:10000});
  assert.equal(generated.status,0,generated.stderr);
  const source=fs.readFileSync(path.join(out,'mixed.mjs'),'utf8');
  assert.equal(spawnSync(process.execPath,['--check',path.join(out,'mixed.mjs')],{encoding:'utf8'}).status,0);
  assert(source.includes('performanceDiagnose?report=>checkpointSearchPerformanceReport(artifacts,report,officialFirstFailure):report=>artifacts.checkpoint(report)'));
  if(profiles.includes('producer-full')){
   const begin=source.indexOf('}catch(error){failed++;if(performanceDiagnose&&officialFirstFailure===null)'),end=source.indexOf('if(!selectedFailureReported)',begin);
   assert(begin>=0&&end>begin);const capture=source.slice(begin+'}catch(error){'.length,end);
   const first=Object.assign(Error('first observation error'),{code:'FIRST'}),c={performanceDiagnose:true,officialFirstFailure:null,failed:0,error:first};
   vm.runInNewContext(capture,c);c.error=Error('later error');vm.runInNewContext(capture,c);
   assert.equal(c.officialFirstFailure.message,first.message);assert.equal(c.officialFirstFailure.code,'FIRST');
   const legacy={performanceDiagnose:false,officialFirstFailure:null,failed:0,error:first};vm.runInNewContext(capture,legacy);assert.equal(legacy.officialFirstFailure,null);
  }
  const tail=source.slice(source.indexOf('  const identityCoverage='),source.lastIndexOf('\n}'));
  const original=fs.readFileSync('scripts/internal/v450_recording_a_mixed.mjs','utf8');
  const mixedExpression=original.slice(original.indexOf('const mixed=')+12,original.indexOf(';let nextEvidence='));
  const f=performanceFixture();assert.equal(f.trace.client.length,15);assert.equal(f.completion[0].status,'captured');
  for(const profile of profiles)await compactArtifactCase((a,dir)=>{
   const boundary=profile!=='ordinary-full',bad=profile==='incomplete-full',count=boundary?484:60,batches=count/4;
   // Both sizes use the real collector. These are samples, NOT upper bounds.
   const ledgerReport=officialCompactLedger(boundary,count);
   if(bad){ledgerReport.status='incomplete';ledgerReport.firstFailure={code:'ledger-missing-client',id:1,detectedMs:1};Object.assign(ledgerReport.requests[0].client,{status:null,outcome:'timeout',phase:'body',headerReceived:false});Object.assign(ledgerReport.requests[1].client,{status:null,outcome:'cancelled',phase:'header',headerReceived:false});}
   const pid=5001,progress=new CurrentLongrunProgress(0,['9101','9201'],undefined,{observeActiveHistory:true});
   for(const c of Object.values(progress.channels))Object.assign(c,{finalized:900,deleted:0,lastAt:1800000,order:'900',store:'a'.repeat(64),knownMappings:108000,unknownMappings:0});
   for(const c of Object.values(progress.activeHistory.channels))for(const key of ['observedFinalized','finalized','pending','deleted','finalizedAfterFirstDeleted'])Object.assign(c[key],{count:boundary?100000:1,bytes:boundary?18446744073709551615n:34724n});
   const activeHistory=progress.activeHistorySnapshot();assert.equal(activeHistory.channels['9101'].finalized.bytes,boundary?'18446744073709551615':'34724');
   const samples=[0,300000,1800000].map((t,i)=>({pid,startIdentity:'macos:1792673776:277918',phaseAt:t,sampledAt:t+1,rssBytes:boundary?4294967296:1048576,footprintBytes:1048576,threadCount:10,fdCount:34,mutationCount:i,cpuPercent:1}));
   const resources=summarizeCurrentSamples(samples);
   const mixed=vm.runInNewContext('('+mixedExpression+')');
   Object.assign(mixed,{cycles:batches,searchSuccess:count,searchUnavailable:0,searchSuccessByClient:Array(4).fill(batches),createComplete:batches,createSuccess:2*batches,createLatencyMs:Array(2*batches).fill(20),searchLatencyMs:Array(count).fill(100),visualResults:count/2,visualCreated:batches,visualIndexObservations:Array.from({length:batches},(_,cycle)=>({cycle,state:'ready',error:null,channels:['9101','9201'].map(channelId=>({channelId,indexedFrames:100}))})),windows:Array.from({length:3},()=>({structured:1,visual:1,evidence:1,visualEvidence:1}))});
   const schedule=new AOpportunities(0,2700000),completed=[],immutable=new Map();
   for(let i=0;i<30;i++){
    const row=schedule.take(i*60000,false),id=String(i).padStart(32,'0');
    Object.assign(row,{label:'main-'+i,packageId:id,snapshotId:id,hitId:id,draftId:id,revision:1,preparedAt:i*60000+100,pid,jobId:id,admittedAt:i*60000+200,lastState:'completed',state:'completed',reviewId:id,completedAt:i*60000+1000,jobElapsedMs:800,resultHash:'a'.repeat(64)});
    completed.push({...row});for(const rel of ['evidence-packages/'+id+'.evp','va-reviews/'+id+'.review'])immutable.set(rel,{bytes:1024,sha256:'a'.repeat(64)});
   }
   const aState={schedule,completed,controlsResult:{},initial:{names:['seed.review'],bytes:1024},inventory:()=>({names:['seed.review',...completed.map(r=>r.reviewId+'.review')],bytes:31744}),immutable};
   const aLoad={report:()=>MixedALoad.prototype.report.call(aState)};
   let saved=null;const context={short:false,memoryDiagnose:false,contentionDiagnose:false,frameTraceMode:'bounded',stateDiagnose:true,diagnose:true,performanceDiagnose:true,passed:233,failed:bad?1:0,
    workspaceFailure:{summary:()=>({status:bad?'failed':'no-workspace-failure',primary:bad?'workspace-variable-cap':null,decision:null,collectorDiagnostic:null,context:null,collectionError:null,capacityBytes:32768})},
    statusCapture:{failure:()=>null},preparationContract:mixedPreparationContract(['--search-performance-diagnostic']),performance:{now:()=>1800500},start:0,phaseResult:progress.status(1800000),fixtureProfile:mixedRecordingProfile('continuous-r114'),
    mixed,aLoad,summary:resources,processes:[{result:{normalShutdownPass:!bad}}],udpClosed:!bad,progress,samples,
    failureTrace:{report:()=>ledgerReport},selectedTrace:{complete:()=>f.trace,failure:()=>null},selectedBound:null,performanceCompletion:bad?[]:f.completion,performanceLogs:[true],selectedBatchOrdinal:batches,
    officialFirstFailure:null,searchPerformanceResult,latencyPassed:!bad,artifacts:a,checkpointSearchPerformanceReport:(artifacts,report)=>{report=transform(report);saved=JSON.parse(JSON.stringify(report));return checkpointSearchPerformanceReport(artifacts,report);},console:{log(){}},process:{}};
   vm.runInNewContext(tail,context);assert(saved);assert.equal(saved.failureAttribution.requests.length,count);
   for(const key of ['workspaceFailure','decoderTraceMode','preparationContract','mode','passed','failed','elapsedMs','verifiedDurationMs','fixtureProfile','recordingStatusFailure','evidenceLoad','aLoad','phase','resources','activeHistory','searchPerformance','processCount','processesClosed','udpClosed','footprintState','cpu','tokenStart','tokenEnd','tokenConsumed','tokenSource','status','exit','diagnosticCompleted','latencyPassed'])assert(Object.hasOwn(saved,key),key);
   assert.equal(saved.aLoad.completed.length,profile==='producer-full'?45:30);assert.equal(saved.aLoad.immutableFiles.length,profile==='producer-full'?93:60);assert.equal(saved.evidenceLoad.visualIndexObservations.length,batches);assert.equal(saved.resources.groups[0].max.fdCount,34);
   assert.equal(saved.searchPerformance.selectedCorrelation,'PASS');assert.equal(saved.searchPerformance.completionCollection,bad?'INCOMPLETE':'PASS');
   if(bad){assert.notEqual(saved.status,'PASS');assert.equal(saved.failureAttribution.requests[0].client.outcome,'timeout');assert.equal(saved.failureAttribution.requests[1].client.outcome,'cancelled');}
   const compact=fs.readFileSync(path.join(dir,'report.json')),pretty=Buffer.from(JSON.stringify({...saved,artifactRoot:dir},null,2)+'\n');
   assert.deepEqual(JSON.parse(compact),JSON.parse(pretty));assert.ok(compact.length<=1048576);
   const result={profile,allExistingTopLevelFields:Object.keys(saved),prettyBytes:pretty.length,compactBytes:compact.length,limit:1048576,remaining:1048576-compact.length,capacityVerdict:'FULL_REPORT_UNPROVEN',scope:'complete actual generated schema with synthetic values; variable-field maxima not proven',r154RecordsConsumed:15,completionInput:bad?'incomplete':'captured',rawOwnerMemoryAndCompletion:'existing product/parent logs, not extra report fields'};
   console.log(JSON.stringify(result));preserveCompactCase(profile,{pretty,compact,receipt:{sha256:crypto.createHash('sha256').update(compact).digest('hex')},result});
  });
  // Exact missing bounds: do not invent small-value maxima or truncate them.
  const aSource=fs.readFileSync('scripts/internal/v450_recording_a_load.mjs','utf8');
  assert(aSource.includes('slot.error=error.message'));assert(aSource.includes('snapshotId:found.snapshotId,hitId:hit.id'));
  assert(original.includes('state:state.state,error:state.error,channels:state.channels.map'));
  assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
 }finally{
  if(fs.existsSync(out)){for(const name of fs.readdirSync(out)){const p=path.join(out,name),s=fs.lstatSync(p);assert(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1);fs.unlinkSync(p);}fs.rmdirSync(out);}fs.rmdirSync(parent);assert(!fs.existsSync(parent));
 }
}
test('official compact report: generated full schema, bounded samples and unproven variable fields',()=>exerciseFullReportProfiles(['ordinary-full','boundary-full','incomplete-full']));

// S03-REPORT-PRODUCERS-F01. Production bounds, not average observed strings.
const producerFloat=-1.2345678901234567e+308;
const producerBytes=v=>Buffer.byteLength(JSON.stringify(v));
const inflateReportNumbers=v=>typeof v==='number'?producerFloat:Array.isArray(v)?v.map(inflateReportNumbers):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,inflateReportNumbers(x)])):v;
function producerAEnvelope(){
 const row={slot:44,state:'completed',elapsedMs:producerFloat,label:'main-44',packageId:'ep-'+'a'.repeat(64),snapshotId:'a'.repeat(32),
  // Observation ID <=128 bytes, Key adds 4, prefix adds 3; optional range adds <=48.
  hitId:'o2:128:'+'a'.repeat(128)+':range:'+'9'.repeat(20)+':'+'9'.repeat(20),draftId:'ad-'+'a'.repeat(64),revision:'a'.repeat(64),
  preparedAt:producerFloat,pid:2147483647,jobId:'vj-'+'a'.repeat(32)+'-'+'9'.repeat(20),admittedAt:producerFloat,lastState:'completed',
  reviewId:'vr-'+'a'.repeat(64),completedAt:producerFloat,jobElapsedMs:producerFloat,resultHash:'a'.repeat(64)};
 const name='vr-'+'a'.repeat(64)+'.review',record={bytes:producerFloat,sha256:'a'.repeat(64)};
 return {schedule:Array.from({length:45},()=>({...row})),completed:Array.from({length:45},()=>({...row})),controls:{},
  initialStore:{names:Array(3).fill(name),bytes:producerFloat},finalStore:{names:Array(48).fill(name),bytes:producerFloat},
  immutableFiles:[...Array.from({length:48},()=>({path:'va-reviews/'+name,...record})),...Array.from({length:45},()=>({path:'evidence-packages/ep-'+'a'.repeat(64)+'.evp',...record}))]};
}
function producerVisualEnvelope(){return Array.from({length:121},()=>({cycle:producerFloat,state:'unavailable',error:'visual-index-build-failed',
 channels:['9101','9201','1'].map(channelId=>({channelId,indexedFrames:producerFloat}))}));}

const reportProducerBinding={
 'src/application/media_server_application.cpp':'d8eeebcfaffe92df43afac6212feb2071d098e497dbbaf0fb137ee6b84db05c5',
 "scripts/internal/v450_recording_a_load.mjs": "fcb30638d05d9899f081c5825fb76e61f0f462a479e9501179bcad8a57f6e31f",
 "scripts/internal/v450_recording_a_mixed.mjs": "668bece372e7005ddd0a7fb2a47be185d8f369410bbfcb2b0c83cf529ea5e986",
 "scripts/internal/recording_current_observer.mjs": "75ef4b8987c5583f8955db674de3cf4a9e23d8590cf3492df247f7a4d429aaf3",
 "scripts/internal/va_review_smoke.cpp": "992d43b0edc954414eff4ea44f38ddcb52580a2d5d87e402dde91dbcf47527df",
 "scripts/internal/va_review_confirmed_checks.h": "787409e75deec2f646ac7131c675bd58753f68cafb8c92082c9a2a6aaf7a8b7b",
 "src/recording/evidence_package_store.cpp": "6c38e8747cf50460b230f7fd81899c75d80db0e918e50da6e0c40dfd524bf639",
 "src/recording/va_review_store.cpp": "a8334e8b727f748f6833e9d68264e9f722ea44099b4ec36f6848b064492dc976",
 "src/recording/va_review_service.cpp": "2ac2d47cbca173c8d2dd35d68766b5275b6ac9810891c0949b29644ce42d6bd0",
 "src/recording/recording_search_snapshots.cpp": "daaa7f5fbec47958cc5e0d46b38853e297ec52f46466d447973246b5bfff90a3",
 "src/recording/recording_search_source.cpp": "b77c5fe93183c9011e3006d70192e4f3884a4822951be8d31f60c9cae1c18d12",
 "src/recording/recording_search_reader.cpp": "136b84401aefd8d6233e2cdb5ce440e2e52945ef29e7af17625b39af0611afef",
 "src/recording/recording_contracts.cpp": "e57e5656dff8da95caa3ee63fa62be2f2b67e8882b0eae5391ca6021680a9c9f",
 "src/recording/visual_index_worker.cpp": "e709f98e74ea27e39b2df2fa62256341ed027a82c493893d47db851b1e257869",
 "src/ingress/visual_search_application_service.cpp": "04bef8cdc15a67b0cb44d62c8a95163d9f71e7c672b65acfbe0013500b45589e",
 "src/ingress/a_record_review_application_service.cpp": "3abf45e7f5ca47b6d7866e3a1ae15feb2fe750a44d39f9ae3dad211f0b3ea91b"
};
test('official report producers: bound production identifiers, states and receive/escape limits',()=>{
 for(const [file,sha] of Object.entries(reportProducerBinding))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sha,file+' producer bound must be reviewed on drift');
 const read=f=>fs.readFileSync(f,'utf8');
 assert.match(read('src/recording/evidence_package_store.cpp'),/id.size\(\)==67.*id.rfind\("ep-",0\)==0/);
 assert.match(read('src/recording/va_review_store.cpp'),/id.size\(\)==67.*id.rfind\("vr-",0\)==0/);
 assert.match(read('src/recording/recording_search_snapshots.cpp'),/unsigned char id\[16\]/);
 assert.match(read('src/ingress/a_record_review_application_service.cpp'),/draft.id="ad-"\+c.revision/);
 assert.match(read('src/recording/va_review_service.cpp'),/id.size\(\)>56/);
 assert.match(read('src/recording/recording_contracts.cpp'),/value.size\(\) > 128/);
 assert.match(read('src/recording/recording_search_source.cpp'),/return std::to_string\(value.size\(\)\) \+ ":" \+ value/);
 assert.match(read('src/recording/visual_index_worker.cpp'),/status_.error=error=="visual-index-capacity"\?error:"visual-index-build-failed"/);
 assert.match(read('src/ingress/visual_search_application_service.cpp'),/channels.size\(\)>32/);
 const driver=read('scripts/internal/v450_recording_a_mixed.mjs'),a=read('scripts/internal/v450_recording_a_load.mjs');
 assert.match(driver,/maxBytes:4\*1024\*1024/);assert(driver.includes("for(const id of ['9101','9201'])await request(first,'POST','/ops/api/sources',source(id));"));
 assert(driver.includes("{sources:[{sourceId:'1',displayName:'Synthetic A observations'"));
 assert(read('src/application/media_server_application.cpp').includes('for (const auto& source : sources) channels->push_back(source.source_id);'));
 assert.match(a,/duration===2700000\?45:120/);assert.match(driver,/if\(!diagnose\)await aLoad.controls/);
 assert.match(read('scripts/internal/va_review_confirmed_checks.h'),/CreateAnalysisReviewRecord\(packages,store/);
 assert.match(read('scripts/internal/va_review_confirmed_checks.h'),/store.Publish\(v1/);
 assert.match(read('scripts/internal/va_review_smoke.cpp'),/if\(channel\[0\]=='1'\)/);
 const row=producerAEnvelope().completed[0];assert.equal(row.packageId.length,67);assert.equal(row.reviewId.length,67);assert.equal(row.snapshotId.length,32);assert.equal(row.revision.length,64);assert.equal(row.jobId.length,56);assert.equal(row.hitId.length,183);
 assert.equal(producerAEnvelope().immutableFiles.length,93);assert.equal(producerVisualEnvelope().length,121);
 // Mock parser acceptance is not claimed: current Harness JSON.parse alone does not validate these lengths.
 assert(!/^ep-[a-f0-9]{64}$/.test('ep-'+'a'.repeat(65)));
 assert.equal(producerBytes('\u0001'.repeat(128)),128*6+2);assert.equal(producerBytes('한'.repeat(128)),128*3+2);
 assert(!['starting','stopped','indexing','ready','degraded','unavailable'].includes('x'.repeat(4096)));
 console.log(JSON.stringify({scope:'three-producers',ids:{package:67,review:67,snapshot:32,draft:67,revision:64,job:56,observationHitWithRange:183},initialReviewFilesAtMost:3,aSlotsAtMost:45,visualObservationsAtMost:121,configuredChannels:3,httpReceive:4194304,parser:'JSON.parse; existing product bounds, not new Harness input caps'}));
});

test('official report producers: complete normal report conservative bound',async()=>{
 await exerciseFullReportProfiles(['producer-full'],report=>{
  const a=producerAEnvelope();Object.assign(report.aLoad,a);report.evidenceLoad.visualIndexObservations=producerVisualEnvelope();
  // Calculate a separate over-approximation. Do not mutate recorded verdicts/counters into a real execution claim.
  const envelope=inflateReportNumbers(structuredClone(report)),ledger=envelope.failureAttribution;delete envelope.failureAttribution;
  envelope.aLoad=inflateReportNumbers(report.aLoad);envelope.evidenceLoad.searchLatencyMs=Array(484).fill(producerFloat);envelope.evidenceLoad.createLatencyMs=Array(242).fill(producerFloat);
  for(const c of Object.values(envelope.phase.channels)){c.store='a'.repeat(128);c.order='9'.repeat(20);}
  for(const g of envelope.resources.groups)g.startIdentity=capacityIdentity;
  const h=envelope.activeHistory;h.coverage={status:'COMPLETE_DRAINED_PREFIX',issues:[],consumedRows:producerFloat,drain:{mutationCount:producerFloat,generation:'9'.repeat(20),rotations:producerFloat,busy:false,backlog:false,partialBytes:0,drainStartedAt:producerFloat,drainCompletedAt:producerFloat}};
  for(const c of Object.values(h.channels)){for(const key of ['observedFinalized','finalized','pending','deleted','finalizedAfterFirstDeleted'])c[key].bytes='9'.repeat(25);for(const key of ['firstPendingObservedAt','firstDeletedObservedAt','lastTransitionObservedAt'])c[key]=producerFloat;}
  // Native path bound is <=4096 bytes; JSON escape can cost six bytes per path byte.
  envelope.artifactRoot='\u0001'.repeat(4096);envelope.footprintState='partially-or-not-measured';
  h.coverage.issues=['PREFIX_COUNT_RANGE','DRAIN_RECEIPT_MISSING','DRAIN_RECEIPT_INVALID','PREFIX_COUNT_MISMATCH','DRAIN_REGRESSION','DRAIN_FAILED','NO_DRAIN_RECEIPT','OBSERVER_BUSY','PREFIX_BACKLOG','PARTIAL_TAIL','GENERATION_UNOBSERVED','UNMATCHED_STATE_ROW','MUTATION_REJECTED'];
  for(const c of Object.values(h.channels))c.deletionObservation='NO_DELETION_OBSERVED';
  delete ledger.requests;ledger.firstFailure=null;ledger.detail.firstOmission={id:484,ordinal:242,reason:'detail-byte-budget'};
  // Existing wire bounds reused verbatim. Optional detail payload is NOT copied into Report.
  const mandatoryWire=332915,clientWire=249528;
  const extra={client:null,server:null,search:null,detail:{captured:true},state:'supervisor-incomplete',clientTerminalMissing:false,serverTerminalMissing:false,searchTerminalMissing:false,
   serverSearchLatencyMs:producerFloat,retry:producerFloat,preparationWaitNs:producerFloat,preparationHoldNs:producerFloat,searchObservation:'not-instrumented',terminalMissing:false};
  // Includes redundant braces/null placeholders and retained wire prefixes: conservative, not an attainable combination.
  const perRequestExtra=producerBytes(extra),headerBytes=producerBytes(ledger),envelopeBytes=producerBytes(envelope)+1;
  const upper=mandatoryWire+clientWire+484*perRequestExtra+headerBytes+envelopeBytes+32;
  assert.equal(report.failureAttribution.requests.length,484);assert(upper<1048576,JSON.stringify({upper,perRequestExtra,headerBytes,envelopeBytes}));
  const output={scope:'normal-full-report-bound',mandatoryWire,clientWire,perRequestExtra,headerBytes,envelopeBytes,fieldInsertionReserve:32,upperBytes:upper,limit:1048576,remaining:1048576-upper,
   verdict:'NORMAL_REPORT_STATIC_FIT',conditions:'current fixed three-channel fresh seed, <=3 initial reviews, <=45 A slots, 484 requests, one product identity; normal failure fields null. Independent maxima over-approximate attainable combinations; no runtime PASS.'};
  console.log(JSON.stringify(output));
  if(process.env.MEDIA_SERVER_S03_REPORT_EVIDENCE){const file=path.join(process.env.MEDIA_SERVER_S03_REPORT_EVIDENCE,'normal-bound.json'),fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(output,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
  return report;
 });
});

test('official report producers: storage rejection preserves first error and separates preservation failure',async()=>{
 const {createWorkspaceFailureCapture}=await import('./recording_current_observer.mjs');
 await compactArtifactCase((a,dir)=>{
  const slot=createWorkspaceFailureCapture(dir),first={name:'Error',code:'OWNED_FAILURE',message:'원문 "오류"\\경로\n'+'x'.repeat(33000)};
  slot.capture(Object.assign(Error(first.message),{code:first.code}),{kind:'sample-collection',path:'owned-path'});
  const summary=slot.summary();assert.equal(summary.collectionError,'workspace-evidence-cap');assert.equal(summary.primary,first.message);assert.throws(()=>slot.close(),/workspace-evidence-cap/);
  const report={status:'FAIL',workspaceFailure:summary,aLoad:{schedule:[{slot:0,state:'failed',error:first.message}]},payload:'x'.repeat(1048576)};
  let caught;try{checkpointSearchPerformanceReport(a,report,first);}catch(e){caught=e;}
  assert.equal(caught.message,'search-report-cap');assert.equal(caught.reportPreservation.status,'PRESERVED');assert(!fs.existsSync(path.join(dir,'report.json')));
  const bytes=fs.readFileSync(path.join(dir,'report-storage-failure.json')),saved=JSON.parse(bytes);
  assert.deepEqual(saved.firstFailure,first);assert.deepEqual(saved.workspaceFailure,summary);assert.equal(saved.aFailures[0].error,first.message);
  assert.equal(saved.reportComplete,false);assert.equal(saved.status,'INCOMPLETE');assert.equal(saved.reportStorageError.message,'search-report-cap');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),caught.reportPreservation.receipt.sha256);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'workspace-first-failure.json'))).status,'reserved');
  if(process.env.MEDIA_SERVER_S03_REPORT_EVIDENCE){const fd=fs.openSync(path.join(process.env.MEDIA_SERVER_S03_REPORT_EVIDENCE,'preserved-storage-failure.json'),'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
 });
 await compactArtifactCase(a=>{
  const report={status:'FAIL',workspaceFailure:{primary:'x'.repeat(1048576)}};
  let caught;try{checkpointSearchPerformanceReport(a,report);}catch(e){caught=e;}
  assert.equal(caught.message,'search-report-cap');assert.equal(caught.reportPreservation.status,'EVIDENCE_INCOMPLETE');assert.equal(caught.reportPreservation.error.message,'search-report-cap');
 });
 await compactArtifactCase(a=>{
  const original=Object.assign(Error('original storage I/O'),{code:'ENOSPC'});a.write=()=>{throw original;};
  assert.throws(()=>checkpointSearchPerformanceReport(a,{status:'FAIL'},{message:'earlier observation failure'}),e=>e===original&&e.reportPreservation.status==='EVIDENCE_INCOMPLETE');
 });
});

// S03-OFFICIAL-CLOSEOUT-F01. Synthetic supervisor only; never launch a product.
replayTest('closeout','official closeout integration: guarded profile and immutable implementation binding',({runner:officialRunner,finalizer:officialFinalizer})=>{
 const parent=fs.mkdtempSync('/private/tmp/media-server-official-guard-');
 try{
  const source=path.join(parent,'source.json');fs.writeFileSync(source,'{}',{mode:0o600});
  const files={runner:officialRunner,supervisor:path.resolve('scripts/internal/run_v450_recording_a_mixed.py'),generator:path.resolve('scripts/internal/recording_accumulated_cost.py'),consumer:path.resolve('scripts/internal/recording_accumulated_cost.mjs'),finalizer:officialFinalizer,sourceBinding:source};
  const contract={profile:'s03-official-closeout-v1',channels:3,initialReviews:3,aSlots:45,requests:484,batches:121,identities:1,observationMs:1800000,driverMs:1870000,launcherSeconds:1900,parentBytes:2097152,reportBytes:1048576,normalReportUpperBytes:993381,closeoutReserveBytes:6291456,finalizerSha256:'af234c2f9d1003220f79800a965962f01b820927517226430522256e2a81b200',files:Object.fromEntries(Object.entries(files).map(([k,p])=>[k,{path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}]))};
  assert.equal(assertSearchPerformanceCapacity(contract).status,'PRE_RUN_READY');assert.throws(assertSearchPerformanceCapacity,/CAPACITY_UNPROVEN/);
  for(const k of ['channels','initialReviews','aSlots','requests','batches','identities','observationMs','driverMs','launcherSeconds','parentBytes','reportBytes','closeoutReserveBytes'])assert.throws(()=>assertSearchPerformanceCapacity({...contract,[k]:contract[k]+1}),/CAPACITY_UNPROVEN/);
  fs.appendFileSync(source,' ');assert.throws(()=>assertSearchPerformanceCapacity(contract),/file sha/);
 }finally{fs.rmSync(parent,{recursive:true});}
});
const officialPython=String.raw`
import os,sys,json,hashlib,pathlib,io,shutil,importlib.util,ast
from unittest.mock import patch
os.umask(0o077)
root=pathlib.Path(sys.argv[1]);mode=sys.argv[2];candidate=pathlib.Path(sys.argv[3]);finalizer=pathlib.Path(sys.argv[4])
def load(name,p):
 spec=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
sup=load('sup',pathlib.Path('scripts/internal/run_v450_recording_a_mixed.py'))
r=load('candidate',candidate);fm=load('fm',finalizer)
# main() owns Claim consumption. Import + synthetic finish_run never call main().
# The JS wrapper verifies the original Claim remains byte/identity identical.
ast.parse(candidate.read_text())
work=root/'work';work.mkdir(mode=0o700);run_root=work/sup.OFFICIAL_RUN_DIRECTORY;run_root.mkdir(mode=0o700);e=root/'evidence';e.mkdir(mode=0o700);d=e/'diagnostic';d.mkdir(mode=0o700)
for p in [root/'run-once.py',root/'source-binding.json',root/'claimed.json'] :r.save(p,{'synthetic':True})
r.save(run_root/'server-1.private.log',b'[synthetic resource] complete\n')
report={'status':'PASS','exit':0,'failed':0,'workspaceFailure':{'status':'no-workspace-failure','collectionError':None},'processCount':1,'processesClosed':True,'udpClosed':True,'verifiedDurationMs':1800000,'searchPerformance':{'status':'PASS'},'aLoad':{'initialStore':{'names':[]},'schedule':[]},'evidenceLoad':{'searchSuccess':4,'searchUnavailable':0},'failureAttribution':{'status':'captured','requests':[]}}
if mode=='workspace-failure':report['workspaceFailure']['status']='failed'
if mode=='premise':report['aLoad']['schedule']=[{}]*46
if mode=='report-storage':r.save(d/'report-storage-failure.json',{'status':'INCOMPLETE','firstFailure':{'code':'original'}})
r.save(d/'report.json',report,1048576)
c=sup.LimitedParentCapture();output=(e/'parent.log').open('xb');c.output=output
if mode in ['boundary','over']:
 for i in range(32):c.push(b'x'*65536)
 if mode=='over':c.push(b'x')
 assert c.first['code']=='parent-output-cap' and c.written==2097152
elif mode=='write':
 class Bad:
  def write(self,b):raise OSError('synthetic-write-failure')
 c.output=Bad();c.push(b'x');assert c.first['code']=='parent-log-write'
else:c.push(b'[synthetic parent] complete\n')
c.eof=True;output.close()
# Exactly 6MiB remains reserved, including the original+copied log and atomic temps.
checks=[]
def budget():
 value=sup.official_workspace(root);checks.append(value);return value
f=fm.SearchFinalization(root,budget)
original_atomic=f.atomic
seen_execution=[]
def atomic(name,value):
 if name=='execution.json':seen_execution.append(not (e/'parent-output-receipt.json').exists())
 if mode=='atomic' and name=='execution.json':
  with patch.object(fm.os,'replace',side_effect=OSError('synthetic-atomic-failure')):return original_atomic(name,value)
 return original_atomic(name,value)
f.atomic=atomic
if mode=='manifest':f.verify_manifest=lambda *args:(_ for _ in ()).throw(ValueError('synthetic-manifest-sha'))
def call():
 if mode=='exception':raise ValueError('synthetic-supervisor-error')
 if mode=='badtype':return None
 return {'status':'FAIL' if mode in ['badexit','first-cleanup'] else 'PASS','exit':1 if mode in ['badexit','first-cleanup'] else 0,'childExit':1 if mode in ['badexit','first-cleanup'] else 0,'processGroupAbsent':True,'registeredGroupsAbsent':True}
def inspect():
 assert (e/'execution.json').exists() or mode in ['exception','atomic']
 if mode=='growth':
  with (work/'grown').open('wb') as stream:stream.truncate(448*1024*1024-6*1024*1024)
 return {'status':'clean','meaning':'synthetic approved snapshot'}
def cleanup():
 if mode=='cleanup':raise OSError('synthetic-cleanup')
 shutil.rmtree(work)
result=r.finish_run(root,sup,f,call,c,inspect,lambda execution:mode!='first-cleanup',cleanup,budget)
if mode=='normal':
 assert result['status']=='FINALIZATION_PASS' and not work.exists()
 assert sup.verify_official_completion(e)['markerVerified']
 assert seen_execution==[True] and len(checks)>10
 marker=(e/'finalization-complete.json').read_bytes();(e/'finalization-complete.json').unlink()
 try:sup.verify_official_completion(e);raise AssertionError('missing marker accepted')
 except FileNotFoundError:pass
 r.save(e/'finalization-complete.json',marker)
 (d/'ledger.json').write_text('{}')
 try:sup.verify_official_completion(e);raise AssertionError('changed manifest accepted')
 except ValueError:pass
else:
 assert result['status']=='FINALIZATION_INCOMPLETE',result
 assert work.exists(),mode
 if mode not in ['growth'] :assert result['firstFailure'],result
 if mode=='first-cleanup':assert result['firstFailure']['code']=='supervisor-return-failure' and result['cleanupErrors']
 if mode=='cleanup':assert result['cleanupErrors']
 if mode=='exception':assert 'synthetic-supervisor-error' in result['firstFailure']['message']
 if mode in ['premise','report-storage','workspace-failure']:assert result['firstFailure']['stage']=='postflight'
print(json.dumps({'case':mode,'status':'PASS','executionBeforeParent':seen_execution,'workspaceChecks':len(checks),'productExecutions':0}))
`;
for(const mode of ['normal','boundary','over','write','premise','report-storage','workspace-failure','growth','atomic','exception','badexit','badtype','manifest','cleanup','first-cleanup'])replayTest('closeout','official closeout integration: '+mode,({runner:officialRunner,finalizer:officialFinalizer})=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-official-closeout-mock-');fs.chmodSync(root,0o700);
 try{const p=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',officialPython,root,mode,officialRunner,officialFinalizer],{encoding:'utf8',timeout:20000,maxBuffer:65536});console.log(p.stdout);assert.equal(p.status,0,p.stderr+p.stdout);}
 finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});
test('official closeout integration: generated opt-in and unchanged official workloads',()=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-official-generation-mock-'),out=path.join(root,'overlay');
 try{
  const script="import sys,pathlib;sys.path.insert(0,'scripts/internal');import recording_accumulated_cost as m;m.generate(pathlib.Path(sys.argv[1]),mandatory_ledger=True,official_contract=pathlib.Path(sys.argv[2]));";
  const p=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',script,out,path.join(root,'capacity.json')],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(p.status,0,p.stderr);
  const s=fs.readFileSync(path.join(out,'mixed.mjs'),'utf8');
  for(const text of ['assertSearchPerformanceCapacity(JSON.parse','stateDiagnose?1800000','stateDiagnose?1870000','aLoad.start(begin,2700000)','settleLedgerBatch','checkpointSearchPerformanceReport','report.status===\'PASS\'','official-report-premise',"n!=='work'",'BIN_PATH:process.env.R165_BINARY'])assert(s.includes(text),text);
  const syntax=spawnSync(process.execPath,['--check',path.join(out,'mixed.mjs')],{encoding:'utf8',timeout:10000});assert.equal(syntax.status,0,syntax.stderr);
  const shared=fs.readFileSync('scripts/internal/run_v450_recording_a_mixed.py','utf8');assert(shared.includes('os.read(key.fd,65536)'));
  const input=fs.readFileSync('scripts/internal/v450_recording_a_mixed.mjs','utf8');assert(input.includes('await evidenceLoad(first);await aLoad.tick(first);cadence();'));
  assert(s.includes("!path.basename(root).startsWith('media-server-current-observer-')"));
  assert(fs.readFileSync('scripts/internal/recording_current_observer_native.cpp','utf8').includes('root.parent_path().filename().string().rfind("media-server-current-observer-",0)==0'));
  assert(shared.includes("OFFICIAL_RUN_DIRECTORY = 'media-server-current-observer-s03'"));
 }finally{fs.rmSync(root,{recursive:true});}
});
replayTest('closeout','official closeout integration: external runner workload and Claim contract',({runner:officialRunner})=>{
  const runner=fs.readFileSync(officialRunner,'utf8');
  assert.match(runner,/1900-\(time.monotonic\(\)-start\)/);assert.match(runner,/sup.run_owned\(command,evidence\/'parent.log'.*limited_capture=capture/);
  assert.match(runner,/if __name__=='__main__':sys.exit\(main\(\)\)/);assert.match(runner,/sup.verify_official_completion\(evidence\);budget\(\)/);
  assert(runner.includes('run_root=work/sup.OFFICIAL_RUN_DIRECTORY'));assert(!runner.includes("(evidence/'diagnostic').mkdir"));
  assert(runner.includes("if (root/'claimed.json').exists() or (root/'preclaim-failure.json').exists():"));
  assert(runner.includes("try:save(root/'claimed.json'"));assert(runner.includes('os.O_EXCL'));
});
replayTest('closeout','official closeout integration: shared read-only input target is bound separately from owned output',({runner:officialRunner})=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-official-input-mock-');
 try{
  const code=String.raw`import sys,pathlib,importlib.util,hashlib,os,stat
p=pathlib.Path(sys.argv[1]);spec=importlib.util.spec_from_file_location('r',sys.argv[2]);r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
a=p/'real';a.write_bytes(b'original');b=p/'link';b.symlink_to(a);s=a.stat();h=hashlib.sha256(a.read_bytes()).hexdigest();binding={'resolved':str(a),'uid':s.st_uid,'links':s.st_nlink,'mode':stat.S_IMODE(s.st_mode)}
r.check_binding(b,h,binding)
try:r.check_binding(b,h);raise AssertionError('owned symlink accepted')
except ValueError:pass
other=p/'other';other.write_bytes(b'original');b.unlink();b.symlink_to(other)
try:r.check_binding(b,h,binding);raise AssertionError('same-byte different target accepted')
except ValueError:pass
b.unlink();b.symlink_to(a);a.write_bytes(b'changed')
try:r.check_binding(b,h,binding);raise AssertionError('changed bytes accepted')
except ValueError:pass
# Claim preservation is verified by the JS wrapper; main() is never called.
`;
  const r=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',code,root,officialRunner],{encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(r.status,0,r.stderr);
 }finally{fs.rmSync(root,{recursive:true});}
});

// S03-PARENT-DRAIN-F01: synthetic pipes/children only; never invoke a Terminal package.
const officialDrainMock=String.raw`
import sys,os,json,hashlib,signal,io,importlib.util
from pathlib import Path
from unittest.mock import patch,Mock
sys.path.insert(0,'scripts/internal');import run_v450_recording_a_mixed as m
os.umask(0o077);root=Path(sys.argv[1]);mode=sys.argv[2];cap=m.LIMITED_PARENT_OUTPUT_BYTES
assert cap==2097152
prefix=b'[R165-first-failure] {"code":"ledger-resource-binding"}\n'
def receipt(c,p):
 r=c.preserve(p);assert r['storedBytes']<=cap
 assert r['storedSha256']==hashlib.sha256(p.read_bytes()).hexdigest()
 return r
if mode=='profile-conflict':
 with patch.object(m.subprocess,'Popen') as popen:
  try:m.run_owned(['never'],root/'never.log',1900,root,{},lambda _:None,limited_capture=m.LimitedParentCapture(official=True),limited_boundary=Mock())
  except ValueError as error:assert str(error)=='official-parent-boundary-conflict'
  else:raise AssertionError('mixed deadlines admitted')
  assert not popen.called and not (root/'never.log').exists()
elif mode in ['normal','exit1','diagnostic-tail']:
 c=m.LimitedParentCapture(official=True);p=root/'parent.log'
 if mode=='diagnostic-tail':
  code='import os,signal,time\ndef end(s,f):\n os.write(1,b"TAIL-OUT\\n"+b"x"*131072);os.write(2,b"TAIL-ERR\\n");raise SystemExit(1)\nsignal.signal(signal.SIGTERM,end)\nos.write(1,'+repr(prefix)+')\nwhile True:time.sleep(.01)'
 else:code='import os;os.write(1,b"OUT\\n");os.write(2,b"ERR\\n");raise SystemExit('+('1' if mode=='exit1' else '0')+')'
 r=m.run_owned([sys.executable,'-I','-B','-c',code],p,5,root,dict(os.environ),lambda pid:None,limited_capture=c)
 v=receipt(c,p);assert r['childExit']==(0 if mode=='normal' else 1),r
 assert r['status']==('PASS' if mode=='normal' else 'FAIL') and v['complete'] and v['eof'],(r,v)
 assert r['processGroupAbsent'] and not r['cleanupErrors'] and not v['shutdown']['deadlineExceeded']
 if mode=='diagnostic-tail':
  assert p.read_bytes()==prefix+b'TAIL-OUT\n'+b'x'*131072+b'TAIL-ERR\n'
  assert v['firstFailure']['code']=='child-diagnostic' and 'ledger-resource-binding' in v['firstFailure']['diagnostic']
  assert v['shutdown']['additionalObservedBytes']==131090 and v['shutdown']['childExit']==1
 else:assert p.read_bytes()==b'OUT\nERR\n'
elif mode in ['deadline','no-eof','cleanup-failure','signal','exit0-no-eof','exception']:
 clock=[0.0];child=Mock();child.pid=54321;child.returncode=None;child.poll.side_effect=lambda:child.returncode
 c=m.LimitedParentCapture(official=True);p=root/'parent.log';reads=[0]
 def attach(ch,out):c.output=out;c.pipe=Mock()
 def read(t):
  reads[0]+=1;clock[0]+=t
  if reads[0]==1:
   c.push(b'normal\n' if mode=='exit0-no-eof' else prefix)
   if mode=='exit0-no-eof':child.returncode=0
   if mode=='exception':raise ValueError('synthetic-read-exception')
  elif mode not in ['deadline','no-eof','exit0-no-eof']:
   c.push(b'LAST\n');c.eof=True
 def stop(ch,**kw):
  assert kw['deadline']==.5 and kw['capture'] is c
  child.returncode=-15 if mode=='signal' else 0 if mode=='exit0-no-eof' else 1
  if mode=='deadline':clock[0]=.5
  return {'processGroupAbsent':mode!='cleanup-failure','cleanupErrors':['synthetic-group-error'] if mode=='cleanup-failure' else []}
 with patch.object(m.time,'monotonic',side_effect=lambda:clock[0]),patch.object(m.subprocess,'Popen',return_value=child),patch.object(c,'attach',side_effect=attach),patch.object(c,'read',side_effect=read),patch.object(m,'group_alive',return_value=True),patch.object(m,'stop_created_group',side_effect=stop),patch.object(m,'finish_registered_groups',return_value={'registeredGroupsAbsent':True}):
  r=m.run_owned(['synthetic-no-exec'],p,.5,root,{},lambda _:None,limited_capture=c)
 v=receipt(c,p);assert r['status']=='FAIL';assert reads[0]<=7
 if mode in ['deadline','no-eof','exit0-no-eof']:
  assert not v['eof'] and not v['complete'] and v['shutdown']['deadlineExceeded']
  assert 'parent-drain-deadline' in [x['code'] for x in v['failureEvents']]
 else:assert v['complete'] and v['eof']
 if mode!='exit0-no-eof':assert v['firstFailure']['code']=='child-diagnostic'
 if mode=='cleanup-failure':assert v['shutdown']['cleanup']['cleanupErrors']==['synthetic-group-error']
 if mode=='signal':assert v['shutdown']['childSignal']=='SIGTERM' and v['shutdown']['childExit'] is None
 if mode=='exception':assert r['errorType']=='ValueError' and r['parentFirstFailure']['code']=='child-diagnostic'
elif mode in ['cap-exact','cap-over','write','readback']:
 c=m.LimitedParentCapture(official=True);p=root/'parent.log'
 with p.open('xb') as f:
  c.output=f;c.push(prefix);c.begin_shutdown()
  if mode.startswith('cap-'):
   remaining=cap-len(prefix)+(1 if mode=='cap-over' else 0)
   while remaining:
    n=min(65536,remaining);c.push(b'x'*n);remaining-=n
   c.eof=True
  elif mode=='write':
   c.output=Mock();c.output.write.side_effect=OSError('synthetic-disk-full');c.push(b'TAIL\n');c.eof=True
  else:c.push(b'TAIL\n');c.eof=True
 if mode=='readback':p.write_bytes(p.read_bytes().replace(b'TAIL',b'FAIL'))
 v=c.preserve(p);assert not v['complete'] and v['firstFailure']['code']=='child-diagnostic'
 expected='parent-output-cap' if mode.startswith('cap-') else 'parent-log-write' if mode=='write' else 'parent-log-readback'
 assert expected in [x['code'] for x in v['failureEvents']]
 assert v['storedBytes']<=cap
 if mode.startswith('cap-'):assert v['storedBytes']==cap and v['outputLimitExceeded']
 if mode=='readback':assert not v['readbackVerified']
elif mode=='cleanup-deadline':
 clock=[0.0];child=Mock();child.pid=54321;child.returncode=None;c=m.LimitedParentCapture(official=True);c.pipe=Mock();signals=[]
 def read(t):clock[0]+=t
 with patch.object(m.time,'monotonic',side_effect=lambda:clock[0]),patch.object(c,'read',side_effect=read),patch.object(m,'group_alive',return_value=True),patch.object(m.os,'killpg',side_effect=lambda p,s:signals.append((p,s))):
  r=m.stop_created_group(child,capture=c,deadline=.2)
 assert clock[0]<=.2 and not r['processGroupAbsent']
 assert signals==[(54321,signal.SIGTERM),(54321,signal.SIGKILL)]
 # Registered groups keep the same ownership source and deadline; no real signal.
 clock[0]=0;signals.clear()
 with patch.object(m.time,'monotonic',side_effect=lambda:clock[0]),patch.object(c,'read',side_effect=read),patch.object(m,'registered_groups',return_value={54321}),patch.object(m,'group_alive',return_value=True),patch.object(m.os,'killpg',side_effect=lambda p,s:signals.append((p,s))):
  r=m.finish_registered_groups(None,capture=c,deadline=.2)
 assert clock[0]<=.2 and not r['registeredGroupsAbsent'] and len(signals)==2
elif mode in ['final-normal','final-child-fail','final-incomplete']:
 finalizer=Path(sys.argv[3])
 assert hashlib.sha256(finalizer.read_bytes()).hexdigest()=='af234c2f9d1003220f79800a965962f01b820927517226430522256e2a81b200'
 spec=importlib.util.spec_from_file_location('finalizer',finalizer);fm=importlib.util.module_from_spec(spec);spec.loader.exec_module(fm)
 e=root/'evidence';e.mkdir(mode=0o700);(e/'diagnostic').mkdir(mode=0o700);work=root/'work';work.mkdir(mode=0o700)
 for n in ['claimed.json','runner.txt','source.json']:(root/n).write_text('{}')
 failed=mode=='final-child-fail'
 (e/'diagnostic/report.json').write_text(json.dumps({'status':'INCOMPLETE' if failed else 'PASS'}));(e/'diagnostic/ledger.json').write_text('{}')
 c=m.LimitedParentCapture(official=True)
 with (e/'parent.log').open('xb') as f:
  c.output=f;c.push(prefix if failed else b'normal\n');c.push(b'last\n');c.eof=mode!='final-incomplete'
 def parent():
  assert (e/'execution.json').exists()
  return c.preserve(e/'parent.log')
 def cleanup():work.rmdir()
 r=fm.SearchFinalization(root,lambda:None).run(runner=root/'runner.txt',source_binding=root/'source.json',run_owned_call=lambda:{'status':'FAIL' if failed else 'PASS','exit':1 if failed else 0,'childExit':1 if failed else 0},preserve_parent=parent,postflight=lambda:{'status':'clean'},owned_groups=lambda _:True,cleanup_work=cleanup)
 assert r['status']==('FINALIZATION_PASS' if mode=='final-normal' else 'FINALIZATION_INCOMPLETE'),r
 if failed:assert r['firstFailure']['code']=='supervisor-return-failure' and not r['evidenceErrors'] and work.exists()
 if mode=='final-incomplete':assert r['firstFailure']['stage']=='parent-receipt' and work.exists()
else:raise AssertionError(mode)
print(json.dumps({'case':mode,'status':'PASS','productExecutions':0}))
`;
for(const mode of ['profile-conflict','normal','exit1','diagnostic-tail','deadline','no-eof','cleanup-failure','signal','exit0-no-eof','exception','cap-exact','cap-over','write','readback','cleanup-deadline','final-normal','final-child-fail','final-incomplete']){
 const register=mode.startsWith('final-')?(name,fn)=>replayTest('closeout',name,fn):test;
 register('official parent drain: '+mode,({finalizer}={})=>{
 const root=fs.mkdtempSync('/private/tmp/media-server-parent-drain-mock-');fs.chmodSync(root,0o700);
 try{
  const p=spawnSync('/opt/homebrew/opt/python@3.14/bin/python3.14',['-I','-B','-c',officialDrainMock,root,mode,finalizer??''],{encoding:'utf8',timeout:15000,maxBuffer:65536});
  console.log(p.stdout);assert.equal(p.status,0,p.stderr+p.stdout);
 }finally{fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));}
});
}
