// LP24 복구 내용 비용의 격리 RED 준비. 제품/보존 자료는 열지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runBounded,cleanupOwned,treeBytes} from './recording_catalog_comparison_guard.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const labels=[
 'recovery first preflight retains strict content validation',
 'recovery actual apply reuses validated content and preserves transitions',
 'recovery sqlite preflight and projection reuse exact validated content',
 'recovery sqlite and jsonl return identical public values and durable bytes',
 'recovery new open performs fresh strict validation'];
const negativeLabels=[
 'recovery proof rejects changed envelope identity and payload',
 'recovery proof preserves physical ordinal and duplicate collision rules',
 'recovery proof never substitutes latest job for historical transition',
 'recovery reused content preserves reservation source deletion and hold checks',
 'recovery journal change invalidates reuse and retains strict corruption rejection',
 'recovery pending checkpoint uses strict fallback',
 'recovery budget exhaustion and admission exception preserve strict results',
 'recovery proof ownership ends on success failure and exception',
 'recovery noncanonical binding preserves existing sqlite canonical bytes'];
export function expectedRecovery(result,mode,full=false){
 if(!['red','green'].includes(mode)||result.code!==(mode==='red'?1:0)||result.signal||result.stopReason||!result.groupClean)return false;
 const lines=result.stdout.split('\n'),checks=lines.filter(x=>/^\[(pass|fail)\] /.test(x));
 const expected=full?[...labels,...negativeLabels]:labels;
 if(full&&mode!=='green')return false;
 if(checks.length!==expected.length||checks.some((x,i)=>x!==`[${mode==='red'&&(i===1||i===2)?'fail':'pass'}] ${expected[i]}`))return false;
 if(lines.filter(x=>x.startsWith('[summary] ')).join()!==(mode==='red'?'[summary] pass=3 fail=2':`[summary] pass=${expected.length} fail=0`))return false;
 if(lines.filter(x=>x.startsWith('[not-run] ')).join()!==(full?'[not-run] realistic fifteen-second fixture: 2':'[not-run] private recovery counterexamples and realistic fifteen-second fixture: 11'))return false;
 const rows=lines.filter(x=>x.startsWith('[recovery-count] '));if(rows.length!==1)return false;
 try{const c=JSON.parse(rows[0].slice('[recovery-count] '.length));
  return Object.keys(c).sort().join(',')==='actualApplyParses,firstPreflightParses,jobMutations,projectionParses,projectionSerializes,rebuildPreflightParses'&&
   Object.values(c).every(x=>Number.isSafeInteger(x)&&x>=0)&&c.jobMutations>0&&c.firstPreflightParses===c.jobMutations&&
   (mode==='red'?c.actualApplyParses>=c.jobMutations&&c.rebuildPreflightParses>=c.jobMutations&&c.projectionParses>0&&c.projectionSerializes>0:
    c.actualApplyParses===0&&c.rebuildPreflightParses===0&&c.projectionParses===0&&c.projectionSerializes===0);
 }catch{return false;}
}
export const expectedRed=result=>expectedRecovery(result,'red');
export const baselineTimedOut=(result,phase)=>phase==='strict-realistic'&&result.groupClean===true&&result.stopReason==='timeout';
export function recoveryPhasePlan(suite){
 if(['prepare-legacy','prepare-native'].includes(suite))return ['compile',suite];
 if(suite==='realistic')return ['compile','prepare-realistic','recover-realistic','jsonl-realistic','strict-realistic','verify-realistic'];
 if(['initial','full'].includes(suite))return ['compile','focused'];
 throw Error('recovery-suite');
}
export const canCleanupPreparation=({groupClean,artifactPreserved,diagnosticsPreserved})=>
 groupClean===true&&artifactPreserved===true&&diagnosticsPreserved===true;
// 안전하게 보존된 실패 진단은 준비 성공이나 복구 PASS가 아니다.
export function inspectPreparationDiagnostics(result,profile){
 const invalid={prepared:false,diagnosticsPreserved:false};
 const fields=['phase','index','profile','selectionNative','selectedSources','plannedOutputs','bindingProofs','complete','blocked','hasJob','state','hasReady','verifiedOutput','outputCount','requestFullySatisfied','reason'];
 const reasons=['none','unknown','exception','job-remux: file-original-timestamp-mismatch','job-remux: source-binding-incomplete',
  'job-source-unavailable','job-cancelled-or-deadline','job-attempt-create','job-output-create','job-remux: media-budget-exceeded',
  'job-remux: work-cancelled','job-remux: output-byte-budget-exceeded'];
 try{
  if(!['native','legacy'].includes(profile))return invalid;
  const lines=result.stdout.split('\n').filter(x=>x.startsWith('[recovery-prepare-diagnostic]'));
  if(!lines.length||lines.length%2||lines.length>(profile==='native'?8:2))return invalid;
  const rows=lines.map(line=>JSON.parse(line.slice('[recovery-prepare-diagnostic] '.length)));
  const integer=x=>Number.isSafeInteger(x)&&x>=0;
  for(let i=0;i<rows.length;i++){
   const row=rows[i],after=i%2===1;
   if(Object.keys(row).sort().join()!==[...fields].sort().join()||row.phase!==(after?'after':'before')||row.index!==Math.floor(i/2)||
    !['native','legacy','unknown'].includes(row.profile)||typeof row.selectionNative!=='boolean'||
    !['selectedSources','plannedOutputs','bindingProofs'].every(key=>integer(row[key])))return invalid;
   if(!['complete','blocked','hasJob','hasReady','verifiedOutput','requestFullySatisfied'].every(key=>row[key]===null||typeof row[key]==='boolean')||
    !(row.outputCount===null||integer(row.outputCount))||!(row.state===null||['intent','ready','committed','complete','failed','unknown'].includes(row.state))||
    !(row.reason===null||reasons.includes(row.reason)))return invalid;
   if(!after){if(['complete','blocked','hasJob','state','hasReady','verifiedOutput','outputCount','requestFullySatisfied','reason'].some(key=>row[key]!==null))return invalid;}
   else{
    const before=rows[i-1];if(['profile','selectionNative','selectedSources','plannedOutputs','bindingProofs'].some(key=>row[key]!==before[key]))return invalid;
    if(row.reason===null)return invalid;
    if(row.reason==='exception'){
     if(['complete','blocked','hasJob','state','hasReady','verifiedOutput','outputCount','requestFullySatisfied'].some(key=>row[key]!==null))return invalid;
    }else if(typeof row.complete!=='boolean'||typeof row.blocked!=='boolean'||typeof row.hasJob!=='boolean'||
      (row.hasJob?(row.state===null||typeof row.hasReady!=='boolean'):(row.state!==null||row.hasReady!==null))||
      (row.hasReady===true?(typeof row.verifiedOutput!=='boolean'||row.outputCount===null||typeof row.requestFullySatisfied!=='boolean'):
       [row.verifiedOutput,row.outputCount,row.requestFullySatisfied].some(x=>x!==null)))return invalid;
    if(i<rows.length-1&&row.complete!==true)return invalid;
   }
  }
  const prepared=profile==='native'&&rows.length===8&&result.code===0&&!result.signal&&!result.stopReason&&result.groupClean===true&&
   rows.every(row=>row.profile==='native'&&row.selectionNative&&row.selectedSources===2&&row.plannedOutputs===2&&row.bindingProofs===2)&&
   rows.filter(row=>row.phase==='after').every(row=>row.complete===true&&row.blocked===false&&row.hasJob===true&&row.state==='complete'&&row.hasReady===true&&row.verifiedOutput===true&&row.outputCount===2&&row.reason==='none');
  return {prepared,diagnosticsPreserved:true};
 }catch{return invalid;}
}
export function expectedRealistic(result,phase){
 if(result.code!==0||result.signal||result.stopReason||!result.groupClean)return false;
 const lines=result.stdout.split('\n'),checks=lines.filter(x=>/^\[(pass|fail)\] /.test(x)),summaries=lines.filter(x=>x.startsWith('[summary] '));
 if(phase==='prepare-realistic'){
  if(checks.join()!=='[pass] recovery realistic six-source four-complete-job fixture preserves output evidence'||summaries.join()!=='[summary] pass=1 fail=0')return false;
  try{const rows=lines.filter(x=>x.startsWith('[recovery-realistic-shape] '));if(rows.length!==1)return false;
   const shape=JSON.parse(rows[0].slice('[recovery-realistic-shape] '.length));const jobs=lines.filter(x=>x.startsWith('[recovery-job-proof] ')).map(x=>JSON.parse(x.slice('[recovery-job-proof] '.length)));
   return shape.inputAU===1500&&shape.sources===6&&shape.samplesPerSource===250&&shape.sourceSamples===1500&&shape.sourceMappings>=900&&shape.sourceMappings<=1500&&shape.sourceFileEvidence===6&&
    shape.completeJobs===4&&shape.outputFiles===8&&shape.jobTransitions===24&&shape.journalBytes>0&&shape.historicalByteReproduction===false&&
    jobs.length===4&&jobs.every((job,i)=>job.index===i&&job.state==='complete'&&job.verifiedOutput===true&&job.outputs===2&&typeof job.requestFullySatisfied==='boolean'&&
      Number.isSafeInteger(job.unfulfilled)&&job.unfulfilled>=0&&job.canonicalBytes>0&&/^[0-9a-f]{64}$/.test(job.canonicalSha256))&&
    shape.fullySatisfiedJobs===jobs.filter(job=>job.requestFullySatisfied).length;
  }catch{return false;}
 }
 if(phase==='verify-realistic'){
  if(checks.length||summaries.join()!=='[summary] pass=0 fail=0')return false;
  try{const rows=lines.filter(x=>x.startsWith('[recovery-realistic-verification] ')).map(x=>JSON.parse(x.slice('[recovery-realistic-verification] '.length)));
   return rows.length===3&&rows.every((row,i)=>row.strictBaseline===(i===2)&&row.sqlite===(i!==1)&&row.coldBindings===6&&row.coldJobs===4&&
    row.canonicalAndBytesEqual===true&&row.proofReleased===true&&Number.isSafeInteger(row.totalUs)&&row.totalUs>=row.openUs);
  }catch{return false;}
 }
 const strict=phase==='strict-realistic';if(!strict&&!['recover-realistic','jsonl-realistic'].includes(phase))return false;
 if(checks.length||summaries.join()!=='[summary] pass=0 fail=0')return false;
 try{const rows=lines.filter(x=>x.startsWith('[recovery-realistic-result] '));if(rows.length!==1)return false;const row=JSON.parse(rows[0].slice('[recovery-realistic-result] '.length));
  return row.strictBaseline===strict&&row.sqlite===(phase!=='jsonl-realistic')&&row.openUs>=0&&row.totalUs>=row.openUs&&row.totalUs<15000000&&
   row.coldBindings===6&&row.coldJobs===4&&row.proofReleased===true&&row.jobCount===1&&row.state==='complete'&&row.outputs===2&&
   /^[0-9a-f]{64}$/.test(row.intentSha256)&&row.fullSemanticOracle===false;
 }catch{return false;}
}
async function main(){
 const [mode,id,suite='initial']=process.argv.slice(2),full=suite==='full',realistic=suite==='realistic',prepareOnly=['prepare-native','prepare-legacy'].includes(suite);
 const plan=recoveryPhasePlan(suite);
 if(!['red','green'].includes(mode)||((full||realistic||prepareOnly)&&mode!=='green')||!/^lp24-recovery-[a-z0-9-]+$/.test(id??''))throw Error('recovery-arguments');
 const files=[
  'include/recording/recording_catalog.h','include/recording/recording_journal.h','include/recording/recording_read_service.h',
  ...['recording_catalog.cpp','recording_read_service.cpp','recording_timeline_projection.cpp','recording_derived_job_ready.cpp','recording_derived_job_context.h'].map(x=>'src/recording/'+x),
  ...['recording_recovery_content_smoke.cpp','recording_recovery_content_counter.h','recording_recovery_content.test.mjs','verify_recording_recovery_content.mjs',
      'recording_public_media_smoke.cpp','recording_checkpoint_reproduction_smoke.cpp','recording_media_test_fixture.h','recording_catalog_comparison_guard.mjs','env_common.sh'].map(x=>'scripts/internal/'+x)];
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 const manifest=()=>files.map(file=>({file,sha256:sha(fs.readFileSync(path.join(repo,file)))}));
 const before=manifest(),parent=fs.realpathSync(os.tmpdir());
 const artifact=path.join(repo,'docs/release-artifacts/v4.1.0/s11-preparation-mapping',`${id}-${mode}.txt`);
 if(fs.existsSync(artifact))throw Error('recovery-artifact-exists');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(parent,'media-server-catalog-cost.')));fs.chmodSync(root,0o700);
 fs.mkdirSync(path.join(root,'tmp'),{mode:0o700});
 const env={PATH:process.env.PATH,HOMEBREW_PREFIX:'/opt/homebrew',TMPDIR:path.join(root,'tmp'),LANG:'C',LC_ALL:'C',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'0'};
 let raw='',groupSafe=true,failed=false,diagnosticsPreserved=true;
 const record=value=>{const text=typeof value==='string'?value:JSON.stringify(value);raw+=text+'\n';console.log(text);};
 const exact=(text,anchor,replacement)=>{if(text.split(anchor).length!==2)throw Error('recovery-exact');return text.replace(anchor,replacement);};
 try{
  record({kind:'preflight',mode,id,suite,plan,source:before,limits:{compileSeconds:60,focusedSeconds:60,realisticRecoverySeconds:15,rss:1073741824,disk:536870912,output:2097152},notRun:prepareOnly?16:realistic?14:full?2:11});
  const build=path.join(repo,'build-gst-onnx'),archive=path.join(build,'libmedia_server_runtime.a');
  const linkFile=path.join(build,'CMakeFiles/media_server.dir/link.txt'),flagsFile=path.join(build,'CMakeFiles/media_server_runtime.dir/flags.make');
  const link=fs.readFileSync(linkFile,'utf8').trim().split(/\s+/),index=link.indexOf('libmedia_server_runtime.a');if(index<0)throw Error('recovery-link');
  const archiveTime=fs.statSync(archive).mtimeMs;
  const freshness=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())freshness(file);else if(/\.(cpp|h|hpp)$/.test(entry.name)&&fs.statSync(file).mtimeMs>archiveTime)throw Error('recovery-build-stale');}};
  freshness(path.join(repo,'include'));freshness(path.join(repo,'src'));
  record({kind:'build-fingerprint',archiveSha256:sha(fs.readFileSync(archive)),archiveMtimeMs:archiveTime,
   linkSha256:sha(fs.readFileSync(linkFile)),flagsSha256:sha(fs.readFileSync(flagsFile)),serverSha256:sha(fs.readFileSync(path.join(build,'media_server'))),platform:process.platform,arch:process.arch,node:process.version});
  const header=fs.readFileSync(path.join(repo,'include/recording/recording_catalog.h'),'utf8');
  const recovery=header.includes('class RecoveryContentContext {');
  const include=path.join(root,'include/recording');fs.mkdirSync(include,{recursive:true});
  let exposed=exact(header,'private:','public: // 복구 시험 소유 복제본');
  if(recovery)exposed=exact(exposed,'class RecoveryContentContext {','class RecoveryContentContext { public: // 시험 전용 관찰');
  fs.writeFileSync(path.join(include,'recording_catalog.h'),exposed);
  const sources=[];
  for(const file of ['recording_catalog.cpp','recording_read_service.cpp','recording_timeline_projection.cpp','recording_derived_job_ready.cpp']){
   let text=fs.readFileSync(path.join(repo,'src/recording',file),'utf8');const originalSha256=sha(text);let insertions=0;
   if(file==='recording_catalog.cpp'){
    const preflight=text.match(/bool RecordingCatalog::PreflightV2Locked\([^]*?\) const \{/g);
    if(!preflight||preflight.length!==1)throw Error('recovery-preflight-anchor');
    text=exact(text,preflight[0],preflight[0]+' recovery_content_probe::Scope recovery_scope(recovery_content_probe::rebuilding?recovery_content_probe::Phase::RebuildPreflight:recovery_content_probe::Phase::Preflight);');
    text=exact(text,'bool RecordingCatalog::RebuildSqliteLocked(std::string* error) {','bool RecordingCatalog::RebuildSqliteLocked(std::string* error) { recovery_content_probe::Rebuild recovery_rebuild;');
    text=exact(text,'bool RecordingCatalog::ProjectMutationSqliteLocked(const RecordingMutationV1& mutation, std::string* error,PreparedDerivedMutation* prepared) {',
     'bool RecordingCatalog::ProjectMutationSqliteLocked(const RecordingMutationV1& mutation, std::string* error,PreparedDerivedMutation* prepared) { recovery_content_probe::Scope recovery_scope(recovery_content_probe::Phase::Projection);');insertions=3;
    if(recovery){
     text=exact(text,'RecoveryContentContext recovery(this);','RecoveryContentContext recovery(this); if(recovery_content_probe::strict_only)recovery.valid=false;');
     text=exact(text,'context->entries.push_back(std::move(entry));context->charge+=charge;','recovery_content_probe::Admission();context->entries.push_back(std::move(entry));context->charge+=charge;');insertions+=2;
    }
   }
   if(file==='recording_derived_job_ready.cpp'){
    text=exact(text,'bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) {','bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) { recovery_content_probe::Parse();');
    text=exact(text,'std::string SerializeDerivedJobRecord(const DerivedJobRecordV1& record){','std::string SerializeDerivedJobRecord(const DerivedJobRecordV1& record){recovery_content_probe::Serialize();');insertions=2;
   }
   const target=path.join(root,file);fs.writeFileSync(target,text);sources.push(target);record({kind:'copy',file,insertions,originalSha256,instrumentedSha256:sha(text)});
  }
  const flags=execFileSync('pkg-config',['--cflags','gstreamer-app-1.0','openssl','sqlite3'],{encoding:'utf8',timeout:5000,env}).trim().split(/\s+/);
  flags.push('-DLP24_RECOVERY_CONTENT='+(recovery?'1':'0'));
  const binary=path.join(root,'check');
  const phases=[{name:'compile',command:'c++',args:['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-DMEDIA_SERVER_USE_GSTREAMER=1','-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1',
   '-I'+path.join(root,'include'),'-I'+path.join(repo,'include'),'-I'+path.join(repo,'src/recording'),'-I'+path.join(repo,'scripts/internal'),'-include',path.join(repo,'scripts/internal/recording_recovery_content_counter.h'),...flags,...sources,
   path.join(repo,'scripts/internal/recording_recovery_content_smoke.cpp'),archive,...link.slice(index+1),'-o',binary]},
   {name:'focused',command:'/bin/bash',args:['-c','set -euo pipefail; source "$1"; export MEDIA_SERVER_GST_CACHE_DIR="$2/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless GST_REGISTRY="$2/registry.bin" GST_REGISTRY_1_0="$2/registry.bin"; unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH; media_server_apply_homebrew_gst_env; shift 3; exec "$@"','recovery-content',path.join(repo,'scripts/internal/env_common.sh'),root,binary,binary,root,...(full?['full']:[])]}];
  if(realistic||prepareOnly){const command=phases.pop();for(const name of plan.slice(1))phases.push({...command,name,args:[...command.args,name],seconds:name.startsWith('prepare-')||name==='verify-realistic'?60:15});}
  let targetIntentSha=null;
  for(const phase of phases){record({kind:'command',...phase});
   const result=await runBounded({root,command:phase.command,args:phase.args,seconds:phase.seconds??60,outputCap:Math.max(1,2097152-Buffer.byteLength(raw)-16384),env});
   const preparing=phase.name.startsWith('prepare-');
   const preparation=preparing?inspectPreparationDiagnostics(result,phase.name==='prepare-legacy'?'legacy':'native'):null;
   // 잘못된 진단 원문은 콘솔/증적에 복사하지 않는다. 충분한 진단 부재는 정리도 막는다.
   record(preparing&&!preparation.diagnosticsPreserved?result.stdout.split('\n').map(line=>
    line.startsWith('[recovery-prepare-diagnostic]')?'[recovery-prepare-diagnostic-rejected] fixed-invalid':line).join('\n'):result.stdout);
   record(result.stderr);groupSafe=result.groupClean;
   const baselineTimeout=realistic&&baselineTimedOut(result,phase.name);
   let ok=groupSafe&&!result.stopReason&&!result.signal&&(phase.name==='compile'?result.code===0:realistic?expectedRealistic(result,phase.name):expectedRecovery(result,mode,full));
   if(phase.name.startsWith('prepare-')){
    const profile=phase.name==='prepare-legacy'?'legacy':'native',diagnostic=preparation;
    diagnosticsPreserved=diagnostic.diagnosticsPreserved;
    const clean=result.code===0&&!result.signal&&!result.stopReason&&groupSafe;
    ok=clean&&diagnosticsPreserved&&(profile==='legacy'?result.stdout.includes('[summary] pass=0 fail=0'):
     diagnostic.prepared&&expectedRealistic(result,'prepare-realistic'));
    record({kind:'preparation-diagnostic',profile,...diagnostic,productPass:false});
   }
   if(ok&&realistic&&['recover-realistic','jsonl-realistic','strict-realistic'].includes(phase.name)){
    const row=JSON.parse(result.stdout.split('\n').find(x=>x.startsWith('[recovery-realistic-result] ')).slice('[recovery-realistic-result] '.length));
    if(targetIntentSha!==null&&row.intentSha256!==targetIntentSha)ok=false;else targetIntentSha=row.intentSha256;
   }
   record({kind:'phase',name:phase.name,expected:ok,...Object.fromEntries(Object.entries(result).filter(([k])=>!['stdout','stderr'].includes(k)))});
   if(baselineTimeout){record({kind:'strict-baseline',outcome:'timeout',diagnosticOnly:true,optimizedPassReplacement:false});continue;}
   if(!ok){failed=true;break;}if(phase.name==='compile')record({kind:'focused-binary',sha256:sha(fs.readFileSync(binary)),bytes:fs.statSync(binary).size});
  }
  if(realistic&&!failed)record('[pass] recovery realistic cold open completes within unchanged fifteen-second limit');
 }catch{failed=true;record('[preparation-failure] recovery-fixed');}
 finally{
  const unchanged=JSON.stringify(before)===JSON.stringify(manifest());if(!unchanged)failed=true;record({kind:'source-check',unchanged});
  const preserved=raw.length;fs.writeFileSync(artifact,raw,{flag:'wx',mode:0o600});
  const artifactPreserved=fs.readFileSync(artifact,'utf8')===raw;
  if(canCleanupPreparation({groupClean:groupSafe,artifactPreserved,diagnosticsPreserved})){
   try{record({kind:'cleanup',...cleanupOwned(root,parent)});}
   catch{failed=true;record({kind:'cleanup',removed:false,reason:'owned-cleanup-failed',root});}
  }else{
   failed=true;let owned=false,bytes=null;
   try{const status=fs.lstatSync(root);owned=path.dirname(root)===parent&&/^media-server-catalog-cost\.[A-Za-z0-9]+$/.test(path.basename(root))&&
    status.isDirectory()&&!status.isSymbolicLink()&&status.uid===process.getuid()&&fs.realpathSync(root)===root;
    if(owned)bytes=treeBytes(root);
   }catch{/* 확인 불가를 정상 정리로 승격하지 않는다. */}
   record({kind:'cleanup',removed:false,reason:!groupSafe?'group-unconfirmed':!artifactPreserved?'artifact-preservation-failed':'preparation-diagnostic-incomplete',root,owned,bytes});
  }
  fs.appendFileSync(artifact,raw.slice(preserved));
 }
 process.exitCode=failed?1:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
