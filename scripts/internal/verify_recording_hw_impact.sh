#!/usr/bin/env bash
# 실제 RTSP builder의 디코더 경계 진단. 제품 정상/릴리즈 PASS를 생성하지 않는다.
set -euo pipefail
if [[ $# != 1 || ( $1 != --self-test && $1 != --rtsp-impact && $1 != --drain-diagnosis ) ]]; then
  echo '[fail] 허용 인자: --self-test, --rtsp-impact 또는 --drain-diagnosis' >&2
  exit 2
fi
impact_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
impact_repo="$(cd "$impact_script/../.." && pwd)"
impact_build="$impact_repo/build-gst-onnx"
impact_run="$(mktemp -d "${TMPDIR:-/tmp}/media-server-hw-impact.XXXXXX")"
impact_run="$(cd "$impact_run" && pwd -P)"
chmod 700 "$impact_run"
SECONDS=0
cleanup() {
  local prior=$?
  trap - EXIT
  node - "$impact_run" "${TMPDIR:-/tmp}" <<'NODE'
const fs=require('fs'),path=require('path'),root=process.argv[2],parent=process.argv[3];
if(!/^media-server-hw-impact\.[A-Za-z0-9]+$/.test(path.basename(root))||fs.lstatSync(root).isSymbolicLink()||fs.realpathSync(root)!==root||path.dirname(root)!==fs.realpathSync(parent))throw Error('cleanup-ownership');
function size(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,k)=>n+size(path.join(p,k)),0):s.size;}
const bytes=size(root);fs.rmSync(root,{recursive:true});const absent=!fs.existsSync(root);console.log('[cleanup] '+JSON.stringify({root,bytes,absent}));if(!absent)process.exit(1);
NODE
  echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"
  exit "$prior"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$impact_run/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$impact_run/registry.bin" GST_REGISTRY_1_0="$impact_run/registry.bin"
unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0
unset MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH GST_PLUGIN_FEATURE_RANK
# 상속 debug가 소유 root 밖 파일을 만들거나 관측 threshold를 바꾸지 못하게 한다.
# 진단 모드는 제품 graph 생존 중에만 전용 callback의 두 category를 활성화한다.
export GST_DEBUG=0
unset GST_DEBUG_FILE GST_DEBUG_DUMP_DOT_DIR
source "$impact_script/env_common.sh"
media_server_apply_homebrew_gst_env
node - "$impact_repo" "$impact_build" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),repo=process.argv[2],build=process.argv[3];
const archive=path.join(build,'libmedia_server_runtime.a'),stamp=fs.statSync(archive).mtimeMs;
const files=['src/ingress/gst_pipeline_builder.cpp','src/ingress/rtsp_egress_session.cpp','include/ingress/gst_pipeline_builder.h','scripts/internal/recording_hw_impact_probe.cpp','scripts/internal/verify_recording_hw_impact.sh','scripts/internal/recording_media_test_fixture.h'];
for(const name of files){const p=path.join(repo,name);if(!name.startsWith('scripts/')&&fs.statSync(p).mtimeMs>stamp)throw Error('stale-product-build');console.log('[source] '+name+' sha256='+crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'));}
console.log('[source] build-gst-onnx/libmedia_server_runtime.a sha256='+crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'));
NODE
printf '[environment] utc=%s platform=%s machine=%s head=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(uname -s)" "$(uname -m)" "$(git -C "$impact_repo" rev-parse HEAD)"
pkg-config --modversion gstreamer-1.0 gstreamer-app-1.0
read -r -a impact_link < "$impact_build/CMakeFiles/media_server.dir/link.txt"
impact_libs=(); impact_found=0
for token in "${impact_link[@]}";do
  if [[ "$token" == libmedia_server_runtime.a ]];then impact_found=1;impact_libs+=("$impact_build/$token");continue;fi
  if ((impact_found));then impact_libs+=("$token");fi
done
test "$impact_found" = 1
read -r -a impact_flags <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$impact_repo/include" "${impact_flags[@]}" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
  "$impact_script/recording_hw_impact_probe.cpp" "${impact_libs[@]}" -o "$impact_run/probe"
node - "$impact_run" "$1" <<'NODE'
const {spawnSync}=require('child_process'),path=require('path'),crypto=require('crypto');
const root=process.argv[2],mode=process.argv[3],started=Date.now();
// pipe stdout은 비동기이므로 process.exit로 강제 종료하면 긴 진단 뒷부분이 유실된다.
function emitResult(stdout,reports,code){
  if(stdout)process.stdout.write(stdout);
  for(const report of reports)console.log(report);
  process.exitCode=code;
}
function main(){
if(mode==='--self-test'){
  const large=spawnSync(process.execPath,['-e',`(${emitResult.toString()})('x'.repeat(262144),['[io-tail]'],7)`],{encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
  const pass=!large.error&&!large.signal&&large.status===7&&large.stdout==='x'.repeat(262144)+'[io-tail]\n'&&large.stderr==='';
  if(!pass){emitResult('',['[fail] HW-IO01 pipe output and exit status preserved'],2);return;}
  console.log('[pass] HW-IO01 pipe output and exit status preserved');
}
const result=spawnSync(path.join(root,'probe'),[root,mode],{encoding:'utf8',timeout:180000,killSignal:'SIGKILL',maxBuffer:8*1024*1024});
const stderr=result.stderr??'',critical=(stderr.match(/CRITICAL/g)||[]).length,warning=(stderr.match(/WARNING/g)||[]).length;
emitResult(result.stdout??'',[
  '[diagnostic-stderr] '+JSON.stringify({bytes:Buffer.byteLength(stderr),sha256:crypto.createHash('sha256').update(stderr).digest('hex'),critical,warning,rawPublished:false}),
  '[execution] '+JSON.stringify({mode,exit:result.status,signal:result.signal,error:result.error?.code??null,elapsedMs:Date.now()-started,productPass:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'})
],result.error||result.signal||critical||warning?2:result.status??2);
}
main();
NODE
