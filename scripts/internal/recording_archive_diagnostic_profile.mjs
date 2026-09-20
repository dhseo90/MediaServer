// 보존 원본은 파일로만 읽고, 별도 소유 복제본에서만 기존 archive 진단을 실행한다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {runBounded,treeBytes} from './recording_catalog_comparison_guard.mjs';
import {captureStateEvidence,captureCompletenessEvidence} from './recording_failure_capture.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const targetHash='268a395031147be5bd22b4c3459cf4777478e0fbdf111c76b3918c1ea2cb24b9';
export const phases=Object.freeze('journal-open catalog-open open open-replay open-preflight open-apply sqlite-open rebuild rebuild-replay rebuild-preflight rebuild-clear rebuild-project release query output destruct catalog-destruct'.split(' '));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const requireSafe=(ok,code)=>{if(!ok)throw Error(code);};
let deadline=Infinity;
export function exact(text,anchor,replacement){requireSafe(text.split(anchor).length===2,'instrument-anchor');return text.replace(anchor,replacement);}
export function parsePhases(stderr,{timeout=false}={}){
  const rows=[],stack=[],seen=new Set();let previous=0,phaseBytes=0,discarded=0,loss=false;
  for(const line of stderr.split('\n').slice(0,-1)){
    if(!line.startsWith('[archive-phase] ')){if(line)++discarded;continue;}
    phaseBytes+=Buffer.byteLength(line)+1;requireSafe(rows.length<256&&phaseBytes<=131072,'phase-cap');
    let r;try{r=JSON.parse(line.slice(16));}catch{throw Error('phase-json');}
    if(r?.kind==='loss'){requireSafe(Object.keys(r).join(',')==='kind'&&!loss,'phase-loss');loss=true;rows.push(r);continue;}
    requireSafe(!loss&&r&&Object.keys(r).sort().join(',')==='atUs,elapsedUs,id,kind,phase'&&['begin','end'].includes(r.kind)&&phases.includes(r.phase),'phase-shape');
    requireSafe(['id','atUs','elapsedUs'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&r.id>0&&r.atUs>=previous&&r.elapsedUs<=r.atUs,'phase-clock');previous=r.atUs;
    if(r.kind==='begin'){requireSafe(!seen.has(r.id)&&r.elapsedUs===0,'phase-begin');seen.add(r.id);stack.push(r);}
    else{const open=stack.pop();requireSafe(open&&open.id===r.id&&open.phase===r.phase&&r.elapsedUs===r.atUs-open.atUs,'phase-order');}
    rows.push(r);
  }
  requireSafe(!stderr.split('\n').at(-1).startsWith('[archive-phase] '),'phase-partial');
  requireSafe(rows.length>0&&(timeout||(!loss&&stack.length===0)),'phase-incomplete');
  return {rows,openPhases:stack.map(r=>({phase:r.phase,id:r.id,atUs:r.atUs})),loss,discardedLines:discarded,complete:!loss&&stack.length===0};
}
function stable(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;}
function directory(p,uid){const s=fs.lstatSync(p);requireSafe(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===uid&&fs.realpathSync(p)===p,'directory-owner');return s;}
export function ownedRoot(root,parent,{existing=false}={}){
  requireSafe(path.resolve(root)===root&&path.dirname(root)===parent&&/^media-server-current-integration-[A-Za-z0-9_-]+$/.test(path.basename(root)),'root-containment');
  const s=directory(root,process.getuid());requireSafe((s.mode&0o777)===0o700,'root-mode');return {dev:s.dev,ino:s.ino,existing};
}
function readFileChecked(file,uid,consume){
  const before=fs.lstatSync(file);requireSafe(before.isFile()&&!before.isSymbolicLink()&&before.uid===uid&&before.nlink===1&&before.size<=536870912,'file-owner');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{
    requireSafe(stable(before,fs.fstatSync(fd)),'file-replaced');const sum=crypto.createHash('sha256'),chunk=Buffer.alloc(65536);let offset=0;
    while(offset<before.size){requireSafe(Date.now()<deadline,'total-budget');const n=fs.readSync(fd,chunk,0,Math.min(chunk.length,before.size-offset),offset);requireSafe(n>0,'file-short-read');const bytes=chunk.subarray(0,n);sum.update(bytes);consume?.(bytes);offset+=n;}
    requireSafe(stable(before,fs.fstatSync(fd))&&stable(before,fs.lstatSync(file)),'file-changed');return {bytes:before.size,sha256:sum.digest('hex')};
  }finally{fs.closeSync(fd);}
}
export function snapshotTree(root){
  const uid=process.getuid(),entries=[],directories=[];let bytes=0,count=0;
  function visit(p){requireSafe(++count<=4096,'tree-count');const st=fs.lstatSync(p);requireSafe(st.uid===uid&&!st.isSymbolicLink(),'tree-owner');
    if(st.isDirectory()){
      directory(p,uid);directories.push(path.relative(root,p));const fd=fs.openSync(p,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_DIRECTORY);
      try{requireSafe(stable(st,fs.fstatSync(fd)),'directory-replaced');for(const name of fs.readdirSync(p).sort())visit(path.join(p,name));
        requireSafe(stable(st,fs.fstatSync(fd))&&stable(st,fs.lstatSync(p)),'directory-changed');}finally{fs.closeSync(fd);}
    }else{const value=readFileChecked(p,uid);bytes+=value.bytes;requireSafe(bytes<=536870912,'tree-bytes');entries.push({relative:path.relative(root,p),...value});}
  }visit(root);return {entries,directories,bytes,count,sha256:hash(JSON.stringify({entries,directories}))};
}
export function copyVerified(original,destination,before){
  requireSafe(!fs.existsSync(destination),'copy-existing');fs.mkdirSync(destination,{recursive:true,mode:0o700});
  for(const relative of before.directories){requireSafe(!relative.startsWith('..')&&!path.isAbsolute(relative),'copy-containment');fs.mkdirSync(path.join(destination,relative),{recursive:true,mode:0o700});}
  for(const e of before.entries){const target=path.join(destination,e.relative);requireSafe(path.relative(destination,target)===e.relative&&!e.relative.startsWith('..'),'copy-containment');
    fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});const fd=fs.openSync(target,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
    try{const observed=readFileChecked(path.join(original,e.relative),process.getuid(),chunk=>{let written=0;while(written<chunk.length){const n=fs.writeSync(fd,chunk,written,chunk.length-written);requireSafe(n>0,'copy-short-write');written+=n;}});
      requireSafe(observed.sha256===e.sha256&&observed.bytes===e.bytes,'copy-source-changed');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  }
  const copied=snapshotTree(destination);requireSafe(copied.sha256===before.sha256&&snapshotTree(original).sha256===before.sha256,'copy-mismatch');return copied;
}
export function cleanupAllowed({originalSame,sourceSame,groupClean,evidencePreserved}){return originalSame===true&&sourceSame===true&&groupClean===true&&evidencePreserved===true;}
export function cleanupProfile(root,parent,identity,proof){
  requireSafe(cleanupAllowed(proof),'cleanup-proof');const current=ownedRoot(root,parent);requireSafe(current.dev===identity.dev&&current.ino===identity.ino,'cleanup-identity');
  const bytes=treeBytes(root);fs.rmSync(root,{recursive:true});requireSafe(!fs.existsSync(root),'cleanup-remains');return {bytes,removed:true};
}
export function selectReference(journal,expectedHash=targetHash){
  let pending=Buffer.alloc(0);const matches=new Set();
  const line=bytes=>{if(!bytes.toString('utf8').trim())return;let m;try{m=JSON.parse(bytes.toString('utf8'));}catch{throw Error('reference-json');}
    if(m.mutationType==='consumer_reference_put'){const ref=m.payload?.reference?.reference_id;
      if(typeof ref==='string'&&hash(ref)===expectedHash){requireSafe(m.entityId===ref&&ref.length<=256&&!/[\x00-\x20\x7f]/.test(ref),'reference-binding');matches.add(ref);}}};
  readFileChecked(journal,process.getuid(),chunk=>{pending=Buffer.concat([pending,chunk]);let end;
    while((end=pending.indexOf(10))>=0){line(pending.subarray(0,end));pending=pending.subarray(end+1);}requireSafe(pending.length<=16*1024*1024,'reference-line-cap');});
  requireSafe(pending.length===0&&matches.size===1,'reference-match');return [...matches][0];
}
function section(text,start,end,edit){const i=text.indexOf(start),j=text.indexOf(end,i+start.length);requireSafe(i>=0&&j>i&&text.indexOf(start,i+1)<0,'instrument-section');return text.slice(0,i)+edit(text.slice(i,j))+text.slice(j);}
export function instrumentCatalog(text){
  const scope=p=>`archive_phase::Scope archive_scope(archive_phase::Phase::${p});`;
  for(const [signature,p] of [['RecordingCatalog::~RecordingCatalog() {','CatalogDestruct'],['bool RecordingCatalog::OpenSqliteLocked(std::string* error) {','SqliteOpen'],['bool RecordingCatalog::ReleaseInactiveDetailsLocked(const std::string* changed,std::string* error) {','Release']])text=exact(text,signature,signature+'\n    '+scope(p));
  const decorate=(body,p)=>{
    body=exact(body,'RecordingMutationHandles owned;',scope(p)+'\n    RecordingMutationHandles owned;');
    body=exact(body,'ReadCatalogReplay(&owned,&replay,error,&views)',`archive_phase::Call(archive_phase::Phase::${p}Replay,[&]{return ReadCatalogReplay(&owned,&replay,error,&views);})`);
    body=exact(body,'PreflightV2Locked(replay,error,nullptr,{},nullptr,owned,views)',`archive_phase::Call(archive_phase::Phase::${p}Preflight,[&]{return PreflightV2Locked(replay,error,nullptr,{},nullptr,owned,views);})`);return body;};
  text=section(text,'bool RecordingCatalog::OpenLocked(std::string* error) {','std::string RecordingCatalog::catalog_mode()',body=>{
    body=decorate(body,'Open');body=exact(body,'    for (std::size_t ordinal = 0; ordinal < replay.mutations.size(); ++ordinal) {','    { '+scope('OpenApply')+'\n    for (std::size_t ordinal = 0; ordinal < replay.mutations.size(); ++ordinal) {');
    return exact(body,'    if (options_.prefer_sqlite && OpenSqliteLocked(error)) {','    }\n    if (options_.prefer_sqlite && OpenSqliteLocked(error)) {');});
  text=section(text,'bool RecordingCatalog::RebuildSqliteLocked(std::string* error) {','bool RecordingCatalog::ProjectMutationSqliteLocked(',body=>{
    body=decorate(body,'Rebuild');const clear=body.split('\n').filter(l=>l.includes('BEGIN; DELETE FROM recording_derived_accepted_references;'));requireSafe(clear.length===1,'instrument-clear');
    body=exact(body,clear[0],'{ '+scope('RebuildClear')+'\n'+clear[0]+'\n}');
    body=exact(body,'    for (std::size_t ordinal = 0; ordinal < replay.mutations.size(); ++ordinal) {','    { '+scope('RebuildProject')+'\n    for (std::size_t ordinal = 0; ordinal < replay.mutations.size(); ++ordinal) {');
    return exact(body,'    return true;\n#endif','    }\n    return true;\n#endif');});return text;
}
export function instrumentProbe(text,{jsonl=false}={}){
  text=exact(text,'const fs::path root=argv[1];const std::string index=argv[2],reference=argv[3];',
    'const fs::path root=argv[1];const std::string index=argv[2];const char* selected=std::getenv("MEDIA_SERVER_ARCHIVE_PROFILE_REFERENCE");Require(selected,"profile-reference");const std::string reference=selected;Require(Sha(reference)=="'+targetHash+'","profile-reference-hash");');
  text=exact(text,'recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{copy,{}});','auto journal_owner=std::make_unique<recording::RecordingJournal>(recording::RecordingJournal::ManagedOptions{copy,{}});auto& journal=*journal_owner;');
  text=exact(text,'journal.Open(&error)','archive_phase::Call(archive_phase::Phase::JournalOpen,[&]{return journal.Open(&error);})');
  text=exact(text,'recording::RecordingCatalog::Options options(copy/"recording-catalog.sqlite3",copy,true);','recording::RecordingCatalog::Options options(copy/"recording-catalog.sqlite3",copy,'+(!jsonl)+');');
  text=exact(text,'recording::RecordingCatalog catalog(journal,options);','auto catalog_owner=std::make_unique<recording::RecordingCatalog>(journal,options);auto& catalog=*catalog_owner;auto teardown=archive_phase::OnExit([&]{archive_phase::Scope scope(archive_phase::Phase::Destruct);catalog_owner.reset();journal_owner.reset();});');
  text=exact(text,'catalog.Open(&error)','archive_phase::Call(archive_phase::Phase::CatalogOpen,[&]{return catalog.Open(&error);})');
  text=exact(text,'catalog.QueryDerivedReferenceResult(reference,&result,&error)','archive_phase::Call(archive_phase::Phase::Query,[&]{return catalog.QueryDerivedReferenceResult(reference,&result,&error);})');
  text=exact(text,'        if(state){','        archive_phase::Scope output_phase(archive_phase::Phase::Output);auto output_flush=archive_phase::OnExit([]{std::cout.flush();});\n        if(state){');
  return text;
}
export function safeOutput(stdout,state,evidencePath){
  const lines=stdout.trim().split('\n');requireSafe(lines.length===1,'output-lines');let value;try{value=JSON.parse(lines[0]);}catch{throw Error('output-json');}
  const captured=state?captureStateEvidence({collect:()=>value,evidencePath,expectedReferenceSha256:targetHash}):captureCompletenessEvidence({collect:()=>value,evidencePath});
  requireSafe(captured.cleanupAllowed&&captured.evidenceStatus==='preserved','output-validation');
  return {state:value.state,sha256:hash(stdout),bytes:Buffer.byteLength(stdout),detail:state?'state':'completeness'};
}
async function main(){
  const [originalArg,id,...flags]=process.argv.slice(2);requireSafe(/^lp23-[a-z0-9-]+$/.test(id??'')&&flags.every(x=>['--jsonl','--state'].includes(x))&&new Set(flags).size===flags.length,'arguments');
  const started=Date.now();deadline=started+120000;
  const tmpParent=fs.realpathSync(os.tmpdir());
  const original=path.resolve(originalArg),originalIdentity=ownedRoot(original,tmpParent,{existing:true});
  const recordings=path.join(original,'recordings'),before=snapshotTree(recordings),reference=selectReference(path.join(recordings,'recording-v2-mutations.jsonl'));
  const files=['include/recording/recording_catalog.h','include/recording/recording_journal.h','src/recording/recording_catalog.cpp','scripts/internal/recording_current_archive_probe.cpp','scripts/internal/build_recording_current_archive_probe.sh','scripts/internal/recording_archive_phase_trace.h','scripts/internal/recording_archive_diagnostic_profile.mjs','scripts/internal/recording_archive_diagnostic_profile.test.mjs','scripts/internal/recording_catalog_comparison_guard.mjs','scripts/internal/recording_failure_capture.mjs'];
  const manifest=()=>files.map(file=>({file,sha256:hash(fs.readFileSync(path.join(repo,file)))})),source=manifest();
  const artifact=path.join(repo,'docs/release-artifacts/v4.1.0/s11-preparation-mapping',id+'.txt');requireSafe(!fs.existsSync(artifact),'artifact-exists');
  const outputEvidence=artifact.replace(/\.txt$/,'.json');requireSafe(!fs.existsSync(outputEvidence),'artifact-exists');
  const parent=fs.realpathSync(os.tmpdir()),root=fs.realpathSync(fs.mkdtempSync(path.join(parent,'media-server-current-integration-')));fs.chmodSync(root,0o700);const identity=ownedRoot(root,parent);
  let raw='',groupClean=true,originalSame=false,sourceSame=false,failed=false,evidenceSafe=true;
  const record=row=>{const line=typeof row==='string'?row:JSON.stringify(row);requireSafe(Buffer.byteLength(raw)+Buffer.byteLength(line)+1<2097152,'evidence-cap');raw+=line+'\n';console.log(line);};
  try{
    record({kind:'profile',id,ownedRoot:root,referenceSha256:targetHash,index:flags.includes('--jsonl')?'jsonl':'sqlite',detail:flags.includes('--state')?'state':'completeness',source,original:{sha256:before.sha256,bytes:before.bytes,count:before.count},originalRootSha256:hash(original),limits:{runMs:15000,compileMs:60000,totalMs:120000,disk:536870912,rss:1073741824,output:2097152}});
    const copied=copyVerified(recordings,path.join(root,'projection-copy-1/recordings'),before);record({kind:'copy',sha256:copied.sha256,bytes:copied.bytes,count:copied.count});
    const build=path.join(repo,'build-gst-onnx'),archive=path.join(build,'libmedia_server_runtime.a'),server=path.join(build,'media_server'),linkPath=path.join(build,'CMakeFiles/media_server.dir/link.txt');
    const link=fs.readFileSync(linkPath,'utf8').trim().split(/\s+/),at=link.indexOf('libmedia_server_runtime.a');requireSafe(at>=0,'build-link');
    const archiveTime=fs.statSync(archive).mtimeMs,serverTime=fs.statSync(server).mtimeMs,app=new Set([...fs.readFileSync(linkPath,'utf8').matchAll(/CMakeFiles\/media_server\.dir\/(src\/[^ ]+)\.o/g)].map(m=>m[1]));
    function freshness(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())freshness(p);else if(/\.(cpp|hpp|h)$/.test(e.name))requireSafe(fs.statSync(p).mtimeMs<=(app.has(path.relative(repo,p))?serverTime:archiveTime),'build-stale');}}
    freshness(path.join(repo,'include'));freshness(path.join(repo,'src'));
    record({kind:'build',archiveSha256:hash(fs.readFileSync(archive)),serverSha256:hash(fs.readFileSync(server)),linkSha256:hash(fs.readFileSync(linkPath)),flagsSha256:hash(fs.readFileSync(path.join(build,'CMakeFiles/media_server_runtime.dir/flags.make'))),platform:process.platform,arch:process.arch,node:process.version});
    const copies=[];for(const [file,transform] of [['src/recording/recording_catalog.cpp',instrumentCatalog],['scripts/internal/recording_current_archive_probe.cpp',t=>instrumentProbe(t,{jsonl:flags.includes('--jsonl')})]]){
      const text=fs.readFileSync(path.join(repo,file),'utf8'),instrumented=transform(text),dest=path.join(root,path.basename(file));fs.writeFileSync(dest,instrumented,{mode:0o600});copies.push(dest);record({kind:'instrument',file,before:hash(text),after:hash(instrumented)});}
    fs.mkdirSync(path.join(root,'tmp'),{mode:0o700});const env={PATH:process.env.PATH,TMPDIR:path.join(root,'tmp'),LANG:'C',LC_ALL:'C',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'0'};
    const cflags=execFileSync('pkg-config',['--cflags','gstreamer-app-1.0','openssl','sqlite3'],{env,encoding:'utf8',timeout:5000}).trim().split(/\s+/),binary=path.join(root,'archive-profile');
    const compileArgs=['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-DMEDIA_SERVER_USE_GSTREAMER=1','-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1','-I'+path.join(repo,'include'),'-I'+path.join(repo,'src/recording'),'-include',path.join(repo,'scripts/internal/recording_archive_phase_trace.h'),...cflags,...copies,archive,...link.slice(at+1),'-o',binary];
    record({kind:'command',phase:'compile',command:'c++',args:compileArgs});
    const compile=await runBounded({root,command:'c++',args:compileArgs,env,seconds:Math.min(60,(120000-(Date.now()-started))/1000),outputCap:Math.max(1,2097152-Buffer.byteLength(raw)-16384)});
    groupClean=compile.groupClean;record({kind:'compile',...compile,stdout:undefined,stderr:undefined,stdoutSha256:hash(compile.stdout),stderrSha256:hash(compile.stderr)});requireSafe(compile.code===0&&!compile.signal&&!compile.stopReason&&groupClean,'compile-failed');
    record({kind:'binary',sha256:hash(fs.readFileSync(binary)),bytes:fs.statSync(binary).size});requireSafe(Date.now()-started<105000,'total-budget');
    const runArgs=[root,'1','hash-selected',flags.includes('--state')?'--diagnose-state':'--diagnose-completeness'];record({kind:'command',phase:'run',command:binary,args:runArgs,referenceSha256:targetHash});
    const result=await runBounded({root,command:binary,args:runArgs,env:{...env,MEDIA_SERVER_ARCHIVE_PROFILE_REFERENCE:reference},seconds:15,outputCap:Math.max(1,2097152-compile.outputBytes-Buffer.byteLength(raw)-16384)});
    groupClean=result.groupClean;const timeout=result.stopReason==='timeout';evidenceSafe=false;
    let trace;
    try{trace=parsePhases(result.stderr,{timeout});}
    catch{let prefix='',safe=null;for(const line of result.stderr.split('\n').slice(0,-1)){prefix+=line+'\n';try{safe=parsePhases(prefix,{timeout:true});}catch{if(line.startsWith('[archive-phase] '))break;}}
      if(safe){for(const row of safe.rows)record({kind:'trace',event:row});record({kind:'incomplete-trace',openPhases:safe.openPhases});}throw Error('phase-invalid');}
    for(const row of trace.rows)record({kind:'trace',event:row});
    record({kind:'run',...result,stdout:undefined,stderr:undefined,stdoutSha256:hash(result.stdout),stderrSha256:hash(result.stderr),trace:{...trace,rows:undefined},diagnosticOnly:true,applicationPass:false});
    if(result.code===0&&!result.signal&&!result.stopReason)record({kind:'output',...safeOutput(result.stdout,flags.includes('--state'),outputEvidence)});
    else failed=true;
    evidenceSafe=!trace.loss&&(timeout||result.code===0);
  }catch{failed=true;record({kind:'failure',code:'archive-profile-failed'});}
  finally{
    try{const now=ownedRoot(original,tmpParent,{existing:true});originalSame=now.dev===originalIdentity.dev&&now.ino===originalIdentity.ino&&snapshotTree(recordings).sha256===before.sha256;}catch{}
    try{sourceSame=JSON.stringify(source)===JSON.stringify(manifest());}catch{}if(!originalSame||!sourceSame)failed=true;
    record({kind:'preservation',originalSame,sourceSame,elapsedMs:Date.now()-started});
    fs.writeFileSync(artifact,raw,{flag:'wx',mode:0o600});const length=raw.length;
    if(cleanupAllowed({originalSame,sourceSame,groupClean,evidencePreserved:evidenceSafe}))record({kind:'cleanup',...cleanupProfile(root,parent,identity,{originalSame,sourceSame,groupClean,evidencePreserved:evidenceSafe})});
    else{failed=true;record({kind:'cleanup',removed:false,ownedRoot:root});}
    fs.appendFileSync(artifact,raw.slice(length));
  }process.exitCode=failed?1:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main().catch(()=>{console.error('{"kind":"failure","code":"archive-profile-preparation"}');process.exitCode=1;});
