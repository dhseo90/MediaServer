#!/usr/bin/env bash
# 파일 용도: AVC framing 전용 단기 실제 writer 검사. 공개 저장/API는 바꾸지 않는다.
set -euo pipefail
avc_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
avc_repo="$(cd "$avc_script/../.." && pwd)"
avc_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
avc_root="$(mktemp -d "$avc_parent/media-server-file-avc.XXXXXX")"
SECONDS=0
cleanup(){
 local result=$?
 trap - EXIT
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];if(p.dirname(r)!==process.argv[2]||!/^media-server-file-avc\.[A-Za-z0-9]+$/.test(p.basename(r))||f.lstatSync(r).isSymbolicLink())throw Error("cleanup ownership");function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(JSON.stringify({cleanupRoot:r,bytes,absent:!f.existsSync(r)}));if(f.existsSync(r))process.exit(1)' "$avc_root" "$avc_parent"
 printf '[elapsed] seconds=%s exit=%s\n' "$SECONDS" "$result"
 exit "$result"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$avc_root/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless MEDIA_SERVER_SKIP_LOCAL_ENV=1
unset GST_REGISTRY GST_REGISTRY_1_0 GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH
export GST_REGISTRY="$avc_root/registry.bin" GST_REGISTRY_1_0="$avc_root/registry.bin"
source "$avc_script/env_common.sh"
media_server_apply_homebrew_gst_env
printf '[environment] owned_root=%s headless=true optimized=false\n' "$avc_root"
read -r -a avc_flags <<< "$(pkg-config --cflags --libs gstreamer-app-1.0 sqlite3 openssl)"
avc_sources=(gstreamer_segment_writer recording_catalog recording_journal recording_finalize_recovery recording_file_evidence recording_media_inspector recording_derived_job recording_derived_job_ready recording_contracts retention_coordinator)
avc_inputs=();for name in "${avc_sources[@]}";do avc_inputs+=("$avc_repo/src/recording/$name.cpp");done
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$avc_repo/include" -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
 "$avc_script/recording_file_evidence_avc_smoke.cpp" "${avc_inputs[@]}" "$avc_repo/src/domain/strict_json.cpp" "${avc_flags[@]}" -o "$avc_root/check"
"$avc_root/check" "$avc_root"
