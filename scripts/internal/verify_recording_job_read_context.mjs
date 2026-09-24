// 파일 용도: 실제 앱 없이 현재 소스의 소유 복제본만 빌드하는 LP22 focused runner.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {runBounded,cleanupOwned} from './recording_catalog_comparison_guard.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const readContextLabels=[
  'LP22-R01 fixture actual Complete two outputs',
  'LP22-R02 public timeline canonical and media bytes unchanged',
  'LP22-R03 same job two outputs parse strictly once per request',
  'LP22-R04 next request revalidates cold job',
  'LP22-R05 context and media holds released after request'];
export const readContextNegativeLabels=[
  'LP22-R06 changed saved envelope falls back to strict parsing',
  'LP22-R06 replaced current mutation rejects without stale reuse',
  'LP22-R06 same resident with invalid provenance retains strict validation',
  'LP22-R07 changed current state rejects playback',
  'LP22-R07 changed thin metadata rejects stale content',
  'LP22-R07 changed current source segment rejects stale content',
  'LP22-R07 changed output path preserves strict rejection',
  'LP22-R07 duplicate output owner rejects playback',
  'LP22-R07 deleted output rejects playback',
  'LP22-R08 byte budget fallback preserves full timeline and owned limit',
  'LP22-R08 job budget fallback preserves strict playback',
  'LP22-R08 admission allocation failure preserves authority and strict result',
  'LP22-R09 file tamper rejects and releases holds',
  'LP22-R09 media exception releases context and holds',
  'LP22-R09 same size journal tamper rejects and clears owned output',
  'LP22-R09 detached authority rejects cold context reuse',
  'LP26-O23 cross-request candidate rejects same-size journal tamper',
  'LP26-O23-C nine complete jobs bounded with strict overflow and unchanged files holds',
  'LP26-O23-D channel A B A replaces relevant bounded candidates and revalidates',
  'LP26-O23-E deletion invalidates candidates and rejects stale playback',
  'LP26-O23-E reopen releases old residents and strictly rebuilds bounded candidates'];
export function classifyReadContext(result,mode){
  if(!['red','green'].includes(mode)||!result.groupClean||result.stopReason||result.signal||result.code!==(mode==='red'?1:0))return false;
  const lines=result.stdout.trim().split('\n'),checks=lines.filter(x=>/^\[(pass|fail)\] /.test(x));
  const labels=mode==='red'?readContextLabels:[...readContextLabels,...readContextNegativeLabels];
  if(checks.length!==labels.length||checks.some((x,i)=>x!==`[${mode==='red'&&i===2?'fail':'pass'}] ${labels[i]}`))return false;
  const summaries=lines.filter(x=>x.startsWith('[summary] ')),counts=lines.filter(x=>x.startsWith('[read-context-count] '));
  if(summaries.length!==1||summaries[0]!==`[summary] pass=${mode==='red'?4:26} fail=${mode==='red'?1:0}`||counts.length!==1)return false;
  try{const count=JSON.parse(counts[0].slice('[read-context-count] '.length));return Object.keys(count).sort().join(',')==='firstParses,secondParses'&&count.firstParses===(mode==='red'?5:1)&&count.secondParses===(mode==='red'?5:0);}catch{return false;}
}
async function main(){
const [mode,id]=process.argv.slice(2);
if(!['red','green'].includes(mode)||!/^lp22-media-[a-z0-9-]+$/.test(id??''))throw Error('read-context-arguments');
const files=['include/recording/recording_catalog.h','include/recording/recording_read_service.h','include/recording/recording_journal.h','include/recording/recording_timeline.h',
  ...['recording_catalog.cpp','recording_read_service.cpp','recording_timeline_projection.cpp','recording_derived_job_ready.cpp','recording_derived_job_context.h'].map(x=>'src/recording/'+x),
  ...['recording_job_read_context_smoke.cpp','recording_job_read_context_counter.h','recording_job_read_context.test.mjs','recording_public_media_smoke.cpp','recording_media_test_fixture.h','recording_catalog_comparison_guard.mjs','verify_recording_job_read_context.mjs','env_common.sh'].map(x=>'scripts/internal/'+x)];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=()=>files.map(file=>({file,sha256:sha(fs.readFileSync(path.join(repo,file)))}));
const before=manifest(),parent=fs.realpathSync(os.tmpdir()),root=fs.realpathSync(fs.mkdtempSync(path.join(parent,'media-server-catalog-cost.')));
fs.chmodSync(root,0o700);
fs.mkdirSync(path.join(root,'tmp'),{mode:0o700});
const env={PATH:process.env.PATH,HOME:root,TMPDIR:path.join(root,'tmp'),LANG:'C',LC_ALL:'C',MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'0'};
const artifact=path.join(repo,'docs/release-artifacts/v4.1.0/s11-preparation-mapping',`lp22-read-context-${mode}-${id}.txt`);
if(fs.existsSync(artifact)){cleanupOwned(root,parent);throw Error('read-context-artifact-exists');}
let raw='',groupSafe=true,failed=false;
const record=text=>{raw+=text+'\n';console.log(text);};
const exact=(text,a,b)=>{if(text.split(a).length!==2)throw Error('read-context-exact');return text.replace(a,b);};
try{
  record(JSON.stringify({kind:'preflight',mode,id,source:before,limits:{compileSeconds:60,runSeconds:60,rss:1073741824,disk:536870912,output:2097152}}));
  const build=path.join(repo,'build-gst-onnx'),archive=path.join(build,'libmedia_server_runtime.a');
  const link=fs.readFileSync(path.join(build,'CMakeFiles/media_server.dir/link.txt'),'utf8').trim().split(/\s+/),index=link.indexOf('libmedia_server_runtime.a');
  if(index<0)throw Error('read-context-link');
  const archiveTime=fs.statSync(archive).mtimeMs;
  record(JSON.stringify({kind:'build-fingerprint',archiveSha256:sha(fs.readFileSync(archive)),linkSha256:sha(fs.readFileSync(path.join(build,'CMakeFiles/media_server.dir/link.txt'))),serverSha256:sha(fs.readFileSync(path.join(build,'media_server'))),archiveMtimeMs:archiveTime,platform:process.platform,arch:process.arch,node:process.version}));
  const freshness=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())freshness(file);else if(/\.(cpp|h|hpp)$/.test(entry.name)&&fs.statSync(file).mtimeMs>archiveTime)throw Error('read-context-build-stale');}};
  freshness(path.join(repo,'include'));freshness(path.join(repo,'src'));
  const include=path.join(root,'include/recording');fs.mkdirSync(include,{recursive:true});
  for(const file of ['recording_catalog.h','recording_read_service.h','recording_journal.h']){
    let text=fs.readFileSync(path.join(repo,'include/recording',file),'utf8');
    if(file==='recording_catalog.h')text=exact(text,'private:','public: // 소유 시험 복제본');
    else if(file==='recording_read_service.h')text=exact(text,'private:\n    RecordingCatalog& catalog_;','public: // 소유 시험 복제본\n    RecordingCatalog& catalog_;');
    else text=exact(text,'private:\n    friend class RecordingCatalog;','public: // 소유 시험 복제본\n    friend class RecordingCatalog;');
    fs.writeFileSync(path.join(include,file),text);
  }
  const sources=[];
  const contextual=fs.readFileSync(path.join(repo,'include/recording/recording_catalog.h'),'utf8').includes('struct JobReadContext {');
  for(const file of ['recording_catalog.cpp','recording_read_service.cpp','recording_timeline_projection.cpp','recording_derived_job_ready.cpp']){
    let text=fs.readFileSync(path.join(repo,'src/recording',file),'utf8');const original=sha(text);
    let insertions=0;
    if(file==='recording_derived_job_ready.cpp'){
      text=exact(text,'bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) {','bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) { job_read_probe::Parse();');
      text=exact(text,'std::string SerializeDerivedJobRecord(const DerivedJobRecordV1& record){','std::string SerializeDerivedJobRecord(const DerivedJobRecordV1& record){job_read_probe::Serialize();');insertions+=2;
    }
    if(contextual&&file==='recording_catalog.cpp'){
      text=exact(text,'try {context->entries.push_back({*out,envelope,entry.mutation});}','try {job_read_probe::Admission();context->entries.push_back({*out,envelope,entry.mutation});}');++insertions;
    }
    if(contextual&&file==='recording_read_service.cpp'){
      text=exact(text,'RecordingCatalog::JobReadContext context;','RecordingCatalog::JobReadContext context; if(job_read_probe::zero_budget)context.budget=0; job_read_probe::Observe<RecordingCatalog::JobReadContext> observed{context};');
      text=exact(text,'SnapshotTimelineWithContext(query,result,error,&context)','SnapshotTimelineWithContext(query,result,error,job_read_probe::strict_only?nullptr:&context)');
      text=exact(text,'FinishTimelineWithContext(query,result,error,&context)','FinishTimelineWithContext(query,result,error,job_read_probe::strict_only?nullptr:&context)');
      text=exact(text,'const auto inspected=InspectRecordingPhysicalMediaFd(media->fd_,{','job_read_probe::Media();const auto inspected=InspectRecordingPhysicalMediaFd(media->fd_,{');insertions+=4;
    }
    const target=path.join(root,file);fs.writeFileSync(target,text);sources.push(target);
    record(JSON.stringify({kind:'copy',file,originalSha256:original,instrumentedSha256:sha(text),insertions}));
  }
  const flags=execFileSync('pkg-config',['--cflags','gstreamer-app-1.0','openssl','sqlite3'],{encoding:'utf8',timeout:5000,env}).trim().split(/\s+/);
  if(contextual)flags.push('-DLP22_JOB_READ_CONTEXT=1');
  const binary=path.join(root,'check');
  const phases=[{name:'compile',command:process.env.CXX||'c++',args:['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-DMEDIA_SERVER_USE_GSTREAMER=1','-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1','-I'+path.join(root,'include'),'-I'+path.join(repo,'include'),'-I'+path.join(repo,'src/recording'),'-I'+path.join(repo,'scripts/internal'),'-include',path.join(repo,'scripts/internal/recording_job_read_context_counter.h'),...flags,...sources,path.join(repo,'scripts/internal/recording_job_read_context_smoke.cpp'),archive,...link.slice(index+1),'-o',binary]},
    {name:'focused',command:'/bin/bash',args:['-c','set -euo pipefail; source "$1"; export MEDIA_SERVER_GST_CACHE_DIR="$2/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless GST_REGISTRY="$2/registry.bin" GST_REGISTRY_1_0="$2/registry.bin"; unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH; media_server_apply_homebrew_gst_env; exec "$3" "$2"','read-context',path.join(repo,'scripts/internal/env_common.sh'),root,binary]}];
  for(const phase of phases){
    record(JSON.stringify({kind:'command',phase:phase.name,command:phase.command,args:phase.args}));
    const result=await runBounded({root,command:phase.command,args:phase.args,seconds:60,outputCap:Math.max(1,2097152-Buffer.byteLength(raw)-16384),env});
    record(result.stdout);record(result.stderr);groupSafe=result.groupClean;
    const pass=(result.stdout.match(/^\[pass\] /gm)||[]).length,fail=(result.stdout.match(/^\[fail\] /gm)||[]).length;
    const expected=phase.name==='compile'?result.code===0:classifyReadContext(result,mode);
    const ok=expected&&result.groupClean&&!result.stopReason&&!result.signal;
    record(JSON.stringify({kind:'phase',name:phase.name,pass,fail,expected:ok,...Object.fromEntries(Object.entries(result).filter(([k])=>!['stdout','stderr'].includes(k)))}));
    if(!ok){failed=true;break;}
    if(phase.name==='compile')record(JSON.stringify({kind:'focused-binary',sha256:sha(fs.readFileSync(binary)),bytes:fs.statSync(binary).size}));
  }
}catch{failed=true;record('[preparation-failure] read-context-fixed');}
finally{
  const unchanged=JSON.stringify(before)===JSON.stringify(manifest());if(!unchanged)failed=true;record(JSON.stringify({kind:'source-check',unchanged}));
  const preservedLength=raw.length;fs.writeFileSync(artifact,raw,{flag:'wx',mode:0o600});
  if(groupSafe){const cleanup=cleanupOwned(root,parent);record(JSON.stringify({kind:'cleanup',...cleanup}));}else{failed=true;record(JSON.stringify({kind:'cleanup',removed:false,reason:'group-unconfirmed',root}));}
  fs.appendFileSync(artifact,raw.slice(preservedLength));
}
process.exitCode=failed?1:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
