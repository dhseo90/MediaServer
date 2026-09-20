// LP17 승인된 단기 진단 실행. 제품·기존 verifier는 수정하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {limits,runBounded,classify,manifest,cleanupOwned,treeBytes} from './recording_catalog_comparison_guard.mjs';
import {validateQuery} from './recording_catalog_query_guard.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
const [mode,id,...extra]=process.argv.slice(2);
 if(!['query','query-selftest','environment','selftest','small','sources','jobs'].includes(mode)||!id||!/^[a-z0-9-]{1,48}$/.test(id)||extra.length)throw Error('comparison-arguments');
const output=path.join(repo,'docs/release-artifacts/v4.1.0/s11-preparation-mapping',`lp17-${mode}-${id}.txt`);
const fd=fs.openSync(output,'wx',0o600);let recorded=0,root=null,canClean=true,ok=false,failure=null,artifactOverflow=false;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=[];
function emit(value,raw=false){
 let text=typeof value==='string'?value:JSON.stringify(value);
 if(root)text=text.split(root).join('<owned-root>');text=text.split(repo).join('<repo>');
 const bytes=Buffer.from(text.endsWith('\n')?text:text+'\n');
 const cap=raw?limits.output-16384:limits.output;
 if(recorded+bytes.length>cap){artifactOverflow=true;const kept=bytes.subarray(0,Math.max(0,cap-recorded));fs.writeSync(fd,kept);recorded+=kept.length;process.stdout.write(kept);return;}
 fs.writeSync(fd,bytes);recorded+=bytes.length;process.stdout.write(bytes);
}
function fixedError(e){return new Set(['preflight-host','preflight-memory','dependency-stale','source-changed','seed-changed','phase-failed','cleanup-ownership','cleanup-remains','artifact-output-cap','job-input-mismatch','unsupported-owned-entry']).has(e?.message)?e.message:'preparation-or-diagnostic';}
function read(command,args){const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:8*1024*1024,timeout:10000});if(r.status!==0)throw Error('preflight-host');return r.stdout;}
function sources(){
 const names=read('git',['ls-files','src','include','scripts/internal']).trim().split('\n');
 // 신규 진단 파일도 provenance에 포함한다. dirty 제품을 숨긴 HEAD-only 비교는 금지한다.
 for(const n of fs.readdirSync(here).filter(n=>n.startsWith('recording_catalog_comparison')||n.startsWith('recording_catalog_query')))names.push('scripts/internal/'+n);
 const unique=[...new Set(names)].sort();return sha(unique.map(n=>n+'\0'+sha(fs.readFileSync(path.join(repo,n)))).join('\n'));
}
const start=Date.now();let sourceBefore=null,seedBefore=null;
function safeEnv(){
 const env={};for(const name of ['PATH','LANG','LC_ALL','TMPDIR','SDKROOT','DEVELOPER_DIR','MACOSX_DEPLOYMENT_TARGET','PKG_CONFIG_PATH','CXX'])if(process.env[name])env[name]=process.env[name];
 const prefix=['/opt/homebrew','/usr/local'].find(p=>fs.existsSync(path.join(p,'lib/gstreamer-1.0')));
 if(prefix)env.HOMEBREW_PREFIX=prefix;
 Object.assign(env,{MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless',MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst-cache'),
  GST_REGISTRY:path.join(root,'registry.bin'),GST_REGISTRY_1_0:path.join(root,'registry.bin'),MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'0'});
 return env;
}
async function phase(label,command,args,expected=null,seconds=180){
 const shell=['-c','set -euo pipefail; source "$1"; shift; media_server_apply_homebrew_gst_env; exec "$@"','lp17',path.join(here,'env_common.sh'),command,...args];
 emit({kind:'command',label,command,args,seconds,rssSafetyBytes:limits.rss,diskCapBytes:limits.disk,outputCapBytes:limits.output});
 const r=await runBounded({root,command:'/bin/bash',args:shell,env:safeEnv(),seconds});
 const result=expected?classify({...r,expected}):{diagnosticPass:r.code===0&&r.signal===null&&!r.stopReason&&r.groupClean,
  historicalRssPass:null,observationValid:null,semanticPass:null,cleanupPass:r.groupClean,exitCode:r.code,signal:r.signal,stopReason:r.stopReason};
 canClean&&=r.groupClean;
 emit(r.stdout,true);emit(r.stderr,true);const row={kind:'phase-result',label,...result,elapsedMs:r.elapsedMs,groupPeakRssBytes:r.groupPeakRssBytes,observationFailure:r.observationFailure,outputBytes:r.outputBytes};rows.push(row);emit(row);
 if(artifactOverflow)throw Error('artifact-output-cap');
 if(!result.diagnosticPass)throw Error('phase-failed');
 if(sourceBefore&&sources()!==sourceBefore)throw Error('source-changed');
 return r.stdout;
}
function cleanStore(store){
 if(!canClean||path.dirname(store)!==root||!/^store-[ABC]$|^job-[BC]$|^query-(16|32)$/.test(path.basename(store))||fs.lstatSync(store).isSymbolicLink())throw Error('cleanup-ownership');
 const bytes=treeBytes(store);fs.rmSync(store,{recursive:true});emit({kind:'store-cleanup',store,bytes,removed:!fs.existsSync(store)});
 if(fs.existsSync(store))throw Error('cleanup-remains');
}
try{
 if(process.platform!=='darwin')throw Error('preflight-host');
 const physical=Number(read('/usr/sbin/sysctl',['-n','hw.memsize']).trim());
 const vm=read('/usr/bin/vm_stat',[]);const page=Number(vm.match(/page size of (\d+) bytes/)?.[1]);
 const pages=['free','inactive','speculative'].map(n=>Number(vm.match(new RegExp(`Pages ${n}:\\s+(\\d+)\\.`))?.[1]));
 const reclaimable=pages.reduce((a,b)=>a+b,0)*page;
 if(!Number.isSafeInteger(physical)||physical<8*1024**3||!Number.isSafeInteger(reclaimable)||reclaimable<2*1024**3)throw Error('preflight-memory');
 root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'media-server-catalog-cost.'));fs.chmodSync(root,0o700);
 sourceBefore=sources();emit({kind:'preflight',mode,id,head:read('git',['rev-parse','HEAD']).trim(),sourceManifest:sourceBefore,physicalBytes:physical,reclaimableEstimateBytes:reclaimable,
  rssSafetyBytes:limits.rss,historicalRssBytes:limits.historicalRss,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'unavailable',productPass:false});
 if(mode==='environment'){
  await phase('environment-observation',process.execPath,['-e','setTimeout(()=>{},1000)'],null,5);
 }else if(mode==='query-selftest'){
  const stdout=await phase('query-selftest',process.execPath,['--test','--test-reporter=tap',path.join(here,'recording_catalog_query.test.mjs')],null,60);
  if(!stdout.includes('# pass 3')||!stdout.includes('# fail 0'))throw Error('phase-failed');
 }else if(mode==='selftest'){
  const stdout=await phase('runner-selftest',process.execPath,['--test','--test-reporter=tap',path.join(here,'recording_catalog_comparison.test.mjs')],null,60);
  if(!stdout.includes('# pass 15')||!stdout.includes('# fail 0'))throw Error('phase-failed');
 }else{
  // 빌드 준비는 원인 비교가 아니다. 신선하지 않은 runtime으로 측정을 시작하지 않는다.
  await phase('runtime-freshness','cmake',['--build',path.join(repo,'build-gst-onnx'),'--target','media_server_runtime','--parallel','2'],null,60);
  await phase('compile','bash',[path.join(here,'recording_catalog_comparison_build.sh'),root,...(mode==='query'?['query']:[])],null,60);
  // 원본 비교와 작업 비교는 각각 2MiB 증적 상한을 갖는 독립 실행이다.
  // 실패한 작업만 재검증할 수 있게 하며 통과한 source 비교를 반복하지 않는다.
  if(mode!=='jobs'&&mode!=='query'){
  const samples=mode==='small'?32:4096,count=mode==='small'?2:32,seed=path.join(root,'seed'),binary=path.join(root,'comparison');
  await phase('prepare',binary,['prepare',seed,String(samples),String(count)],{mode:'prepare',arm:'seed',samples,count});
  seedBefore=manifest(seed);emit({kind:'seed',sha256:seedBefore,samples,count});
  for(const arm of ['A','B','C']){
   const store=path.join(root,'store-'+arm);
   await phase('scale-'+arm,binary,['scale',seed,store,arm,String(samples),String(count)],{mode:'scale',arm,samples,count});
   for(const sql of ['sqlite','jsonl'])await phase('reopen-'+arm+'-'+sql,binary,['reopen',seed,store,arm,String(samples),String(count),sql],{mode:'reopen',arm,samples,count});
   if(manifest(seed)!==seedBefore)throw Error('seed-changed');
   cleanStore(store);
  }
  }
  if(mode==='query'){
   const seed=path.join(root,'seed');
   await phase('prepare',path.join(root,'comparison'),['prepare',seed,'4096','32'],{mode:'prepare',arm:'seed',samples:4096,count:32});
   seedBefore=manifest(seed);emit({kind:'query-seed',sha256:seedBefore,samples:4096,count:32});
   for(const total of [16,32]){
    const store=path.join(root,'query-'+total);
    const stdout=await phase('query-'+total,path.join(root,'comparison-query'),[seed,store,String(total)]);
    const valid=validateQuery(stdout,total);emit({kind:'query-oracle',total,valid});if(!valid)throw Error('phase-failed');
    if(manifest(seed)!==seedBefore)throw Error('seed-changed');cleanStore(store);
   }
  }
  if(mode==='jobs'){
   const inputs=[];
   for(const arm of ['B','C']){
    const store=path.join(root,'job-'+arm);
    const stdout=await phase('job-'+arm,path.join(root,'comparison-job'),[store,arm],{mode:'job',arm,samples:501,count:2});
    const inputRows=stdout.split('\n').filter(l=>l.startsWith('[lp17] ')).map(l=>JSON.parse(l.slice(7))).filter(r=>r.kind==='jobInput');
    if(inputRows.length!==1||inputRows[0].samples!==501||!/^[a-f0-9]{64}$/.test(inputRows[0].canonicalSha256))throw Error('job-input-mismatch');
    inputs.push(inputRows[0].canonicalSha256);cleanStore(store);
   }
   if(inputs[0]!==inputs[1])throw Error('job-input-mismatch');emit({kind:'job-input-equality',sha256:inputs[0],equal:true});
  }
 }
 ok=true;
}catch(e){failure=fixedError(e);emit({kind:'diagnostic-failure',code:failure,nextPhases:'not-run'});}
finally{
 if(sourceBefore){const unchanged=sources()===sourceBefore;emit({kind:'source-unchanged',unchanged});if(!unchanged){ok=false;failure='source-changed';}}
 if(root){
  if(canClean){try{emit({kind:'cleanup',...cleanupOwned(root)});}catch{ok=false;failure='cleanup-failed';emit({kind:'cleanup',removed:false});}}
  else{ok=false;failure='cleanup-blocked';emit({kind:'cleanup',removed:false,reason:'process-group-not-confirmed'});}
 }
 ok&&=!artifactOverflow;
 emit({kind:'run-result',mode,id,diagnosticPass:ok,failure,phases:rows.length,elapsedMs:Date.now()-start,productPass:false,tokenConsumed:null});
 fs.closeSync(fd);process.exitCode=ok?0:1;
}
