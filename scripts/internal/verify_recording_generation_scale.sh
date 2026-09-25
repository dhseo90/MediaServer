#!/usr/bin/env bash
# 파일 용도: 기존 제품 archive의 실제 B 누적 검증. small과 deleted 실행 승인은 구분한다.
set -euo pipefail
task_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
task_repo="$(cd "$task_script/../.." && pwd)"
task_mode="${1:-small}"
[[ "$task_mode" == small || "$task_mode" == deleted ]] || exit 2
task_build="$task_repo/build-gst-onnx"
node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],stamp=f.statSync(process.argv[2]).mtimeMs;function scan(d){for(const n of f.readdirSync(d)){const q=p.join(d,n),s=f.statSync(q);if(s.isDirectory())scan(q);else if(/\.(h|hpp|cpp)$/.test(n)&&s.mtimeMs>stamp)throw Error("stale-product-archive")}}scan(p.join(r,"src"));scan(p.join(r,"include"))' "$task_repo" "$task_build/libmedia_server_runtime.a"
task_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
task_root="$(mktemp -d "$task_parent/media-server-generation-scale.XXXXXX")"
chmod 700 "$task_root"
task_identity="$(node -e 'const s=require("fs").lstatSync(process.argv[1]);console.log(`${s.dev}:${s.ino}:${s.uid}`)' "$task_root")"
SECONDS=0
task_execution_started=0
cleanup(){
 local status=$?
 trap - EXIT
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],s=f.lstatSync(r);if(p.dirname(r)!==process.argv[2]||!/^media-server-generation-scale\.[A-Za-z0-9]+$/.test(p.basename(r))||s.isSymbolicLink()||f.realpathSync(r)!==r||`${s.dev}:${s.ino}:${s.uid}`!==process.argv[3]||s.uid!==process.getuid())throw Error("cleanup-ownership");function size(q){const v=f.lstatSync(q);return v.isDirectory()?f.readdirSync(q).reduce((n,k)=>n+size(p.join(q,k)),0):v.size}const bytes=size(r);if(process.argv[4]!=="0"&&process.argv[5]==="1"){console.log(`[cleanup] path=${r} bytes=${bytes} removed=false preserved=execution-failure dev=${s.dev} ino=${s.ino} uid=${s.uid}`);process.exit(0)}f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$task_root" "$task_parent" "$task_identity" "$status" "$task_execution_started" || exit 1
 printf '[end] exit=%s elapsed_seconds=%s\n' "$status" "$SECONDS"
 exit "$status"
}
trap cleanup EXIT
printf '[start] utc=%s mode=%s root=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$task_mode" "$task_root"
uname -sm
"${CXX:-c++}" --version | head -1
shasum -a 256 "$task_script/recording_generation_scale_probe.cpp" "$task_script/verify_recording_generation_scale.sh" "$task_script/recording_file_evidence_smoke.cpp" "$task_script/recording_media_test_fixture.h" "$task_script/recording_generation_observation.h" "$task_repo/include/recording/recording_latency_trace.h" "$task_repo/include/recording/recording_catalog.h" "$task_repo/include/recording/recording_journal.h" "$task_repo/src/recording/recording_catalog.cpp" "$task_repo/src/recording/recording_journal.cpp" "$task_repo/src/recording/recording_runtime_composition.cpp" "$task_build/libmedia_server_runtime.a"
export MEDIA_SERVER_GST_CACHE_DIR="$task_root/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$task_root/registry.bin" GST_REGISTRY_1_0="$task_root/registry.bin"
unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH
source "$task_script/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a task_original_link < "$task_build/CMakeFiles/media_server.dir/link.txt"
task_libs=();task_found=0
for token in "${task_original_link[@]}";do
 if [[ "$token" == libmedia_server_runtime.a ]];then task_found=1;task_libs+=("$task_build/$token");continue;fi
 if ((task_found));then task_libs+=("$token");fi
done
test "$task_found" = 1
read -r -a task_flags <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$task_repo/include" "${task_flags[@]}" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 \
 "$task_script/recording_generation_scale_probe.cpp" "${task_libs[@]}" -o "$task_root/probe"
mkdir -m 700 "$task_root/data"
export MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE=1
printf '[scope] observer=file-index-only normalize=synthetic js-semantic=not-run historical-detail-io-counter=not-instrumented\n'
task_execution_started=1
"$task_root/probe" "$task_root/data" "$task_mode"
