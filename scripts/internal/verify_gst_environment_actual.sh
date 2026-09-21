#!/usr/bin/env bash
# 파일 용도: ENV12 실제 플랫폼 검사. fixture/브라우저/장시간 검사를 대체하지 않는다.
set -euo pipefail
[[ $# == 0 ]] || { echo '[fail] ENV12 arguments'; exit 2; }
env12_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env12_repo="$(cd "$env12_script/../.." && pwd)"
env12_root="$(mktemp -d "${TMPDIR:-/tmp}/media-server-env12.XXXXXX")"
env12_root="$(cd "$env12_root" && pwd -P)"
chmod 700 "$env12_root"
umask 077
cleanup() {
  local prior=$?
  trap - EXIT
  node - "$env12_root" <<'NODE'
const fs=require('fs'),path=require('path'),root=process.argv[2];
if(!path.basename(root).startsWith('media-server-env12.')||fs.realpathSync(root)!==root||fs.lstatSync(root).isSymbolicLink())throw Error('ownership');
function size(p){const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()?fs.readdirSync(p).reduce((a,n)=>a+size(path.join(p,n)),0):s.size;}
const bytes=size(root);fs.rmSync(root,{recursive:true});const absent=!fs.existsSync(root);
console.log('[cleanup] '+JSON.stringify({root,bytes,absent}));if(!absent)process.exit(1);
NODE
  exit "$prior"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$env12_root/cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$env12_root/registry.bin" GST_REGISTRY_1_0="$env12_root/registry.bin"
unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH
source "$env12_script/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a env12_flags <<<"$(pkg-config --cflags --libs gstreamer-1.0)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror "$env12_script/gst_environment_actual_probe.cpp" "${env12_flags[@]}" -o "$env12_root/probe"
node - "$env12_root" "$env12_repo" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawnSync}=require('child_process');
const [root,repo]=process.argv.slice(2),begin=performance.now(),sample=path.join(repo,'video/sample_h264_video_only.mp4');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const original=hash(fs.readFileSync(sample));
let checks=0;
function check(ok,title){console.log((ok?'[pass] ':'[fail] ')+title);if(!ok)throw Error('check-failed');checks++;}
function run(command,args,timeout=30000){
  const r=spawnSync(command,args,{encoding:'utf8',timeout,maxBuffer:8*1024*1024});
  console.log('[process] '+JSON.stringify({command:path.basename(command),exit:r.status,signal:r.signal,error:r.error?.code??null,stderrBytes:Buffer.byteLength(r.stderr??''),stderrSha256:hash(r.stderr??'')}));
  if(r.status!==0||r.signal||r.error||r.stderr)throw Error('process-failed');return r.stdout;
}
function features(text){
  const total=text.match(/^Total count: (\d+) plugins(?: \((\d+) blacklist entr(?:y|ies) not shown\))?, (\d+) features$/m);
  if(!total)throw Error('total-shape');
  const rows=text.split('\n').filter(x=>/^[A-Za-z0-9_-]+:\s+\S/.test(x)&&!x.startsWith('Total count:')).sort();
  if(rows.length!==Number(total[3])||rows.length===0)throw Error('feature-count');
  return {rows,plugins:Number(total[1]),blacklist:Number(total[2]??0),features:Number(total[3])};
}
try{
  console.log('[environment] '+JSON.stringify({utc:new Date().toISOString(),platform:process.platform,arch:process.arch,node:process.version,sampleSha256:original,probeSourceSha256:hash(fs.readFileSync(path.join(repo,'scripts/internal/gst_environment_actual_probe.cpp'))),runnerSha256:hash(fs.readFileSync(path.join(repo,'scripts/internal/verify_gst_environment_actual.sh')))}));
  check(!fs.existsSync(process.env.GST_REGISTRY_1_0),'ENV12 cold registry absent');
  const cold=features(run('gst-inspect-1.0',[]));
  check(fs.existsSync(process.env.GST_REGISTRY_1_0),'ENV12 cold scan writes owned registry with zero stderr');
  const warm=features(run('gst-inspect-1.0',[]));
  check(JSON.stringify(cold)===JSON.stringify(warm),'ENV12 warm exact features and counts with zero stderr');
  console.log('[registry] '+JSON.stringify({plugins:cold.plugins,blacklist:cold.blacklist,features:cold.features,featureSha256:hash(cold.rows.join('\n')),blacklistIsRequiredFactoryFailure:false}));
  const names=run(path.join(root,'probe'),['--list']).trim().split('\n');
  if(names.length!==44||new Set(names).size!==44||names.some(n=>!/^[a-z][a-z0-9_]+$/.test(n)))throw Error('factory-list');
  for(const name of names){run('gst-inspect-1.0',[name]);check(true,'ENV12 inspect '+name);}
  const actual=run(path.join(root,'probe'),[sample],20000);
  const lines=actual.trim().split('\n');
  if(lines.length!==46||lines.some(x=>!x.startsWith('[pass] ENV12 ')))throw Error('probe-summary');
  for(const line of lines){console.log(line);checks++;}
  check(hash(fs.readFileSync(sample))===original,'ENV12 sample unchanged');
  console.log('[summary] '+JSON.stringify({checks,failed:0,elapsedMs:Math.round(performance.now()-begin),browser:false,longrun:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));
}catch(error){console.log('[fail] ENV12 '+(/^[a-z-]+$/.test(error.message)?error.message:'preparation'));process.exitCode=1;}
NODE
