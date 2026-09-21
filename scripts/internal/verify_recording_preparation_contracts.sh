#!/usr/bin/env bash
# PREP-C01~08 전용 격리 native 검사. 실제 서버/네트워크/모델 실행 없음.
set -euo pipefail
[[ $# == 0 ]] || exit 2
prep_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
prep_repo="$(cd "$prep_script/../.." && pwd)"
prep_build="$prep_repo/build-gst-onnx"
prep_root="$(mktemp -d "${TMPDIR:-/tmp}/media-server-preparation.XXXXXX")"
prep_root="$(cd "$prep_root" && pwd -P)"
chmod 700 "$prep_root"
SECONDS=0
cleanup() {
  local prior=$?
  trap - EXIT
  node - "$prep_root" "${TMPDIR:-/tmp}" <<'NODE'
const fs=require('fs'),path=require('path'),root=process.argv[2],parent=fs.realpathSync(process.argv[3]);
const stat=fs.lstatSync(root);
if(!/^media-server-preparation\.[A-Za-z0-9]{6}$/.test(path.basename(root))||stat.isSymbolicLink()||stat.uid!==process.getuid()||fs.realpathSync(root)!==root||path.dirname(root)!==parent)throw Error('cleanup-ownership');
function bytes(p){const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()?fs.readdirSync(p).reduce((n,k)=>n+bytes(path.join(p,k)),0):s.size;}
const size=bytes(root);fs.rmSync(root,{recursive:true});const absent=!fs.existsSync(root);console.log('[cleanup] '+JSON.stringify({root,bytes:size,absent}));if(!absent)process.exit(2);
NODE
  echo "[elapsed] seconds=$SECONDS"
  exit "$prior"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$prep_root/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$prep_root/registry.bin" GST_REGISTRY_1_0="$prep_root/registry.bin" GST_DEBUG=0
unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 GST_PLUGIN_FEATURE_RANK
unset MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH
unset GST_DEBUG_FILE GST_DEBUG_DUMP_DOT_DIR
source "$prep_script/env_common.sh"
media_server_apply_homebrew_gst_env
node - "$prep_repo" "$prep_build" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),repo=process.argv[2],build=process.argv[3];
const archive=path.join(build,'libmedia_server_runtime.a'),stamp=fs.statSync(archive).mtimeMs;
const files=['CMakeLists.txt','src/core/shared_stream.cpp','include/core/shared_stream.h','include/media_types.h','src/recording/gstreamer_segment_writer.cpp','src/recording/recording_catalog.cpp','src/recording/recording_journal.cpp','src/recording/recording_contracts.cpp','src/recording/recording_file_evidence.cpp','src/recording/recording_media_inspector.cpp','include/recording/gstreamer_segment_writer.h','include/recording/recording_catalog.h','include/recording/recording_journal.h','include/recording/recording_contracts.h','scripts/internal/recording_media_test_fixture.h','scripts/internal/recording_preparation_contracts.cpp','scripts/internal/verify_recording_preparation_contracts.sh'];
for(const name of files){const p=path.join(repo,name);if(!name.startsWith('scripts/')&&fs.statSync(p).mtimeMs>stamp)throw Error('stale-product-build');console.log('[source] '+name+' sha256='+crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'));}
console.log('[archive] sha256='+crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'));
console.log('[environment] '+JSON.stringify({utc:new Date().toISOString(),platform:process.platform,arch:process.arch,uid:process.getuid(),network:false}));
NODE
read -r -a prep_link < "$prep_build/CMakeFiles/media_server.dir/link.txt"
prep_libs=();prep_found=0
for token in "${prep_link[@]}";do
  if [[ "$token" == libmedia_server_runtime.a ]];then prep_found=1;prep_libs+=("$prep_build/$token");continue;fi
  if ((prep_found));then prep_libs+=("$token");fi
done
test "$prep_found" = 1
read -r -a prep_flags <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$prep_repo/include" "${prep_flags[@]}" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
  "$prep_script/recording_preparation_contracts.cpp" "${prep_libs[@]}" -o "$prep_root/probe"
node - "$prep_root" <<'NODE'
const {spawnSync}=require('child_process'),path=require('path'),crypto=require('crypto');
const root=process.argv[2],start=performance.now();
const r=spawnSync(path.join(root,'probe'),[root],{encoding:'utf8',timeout:180000,killSignal:'SIGKILL',maxBuffer:8*1024*1024});
const out=r.stdout??'',err=r.stderr??'',critical=(err.match(/CRITICAL/g)||[]).length,warning=(err.match(/WARNING/g)||[]).length;
process.stdout.write(out);
console.log('[stderr] '+JSON.stringify({bytes:Buffer.byteLength(err),sha256:crypto.createHash('sha256').update(err).digest('hex'),critical,warning,rawPublished:false}));
const complete=out.split('\n').includes('[summary] pass=8 fail=0 scope=preparation-contracts network=0 modelInferencePass=0 applicationRestartPass=0');
const code=r.error||r.signal||critical||warning?2:r.status===0&&!complete?2:r.status??2;
console.log('[execution] '+JSON.stringify({exit:code,nativeExit:r.status,signal:r.signal,error:r.error?.code??null,elapsedMs:performance.now()-start,complete,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));
process.exitCode=code;
NODE
