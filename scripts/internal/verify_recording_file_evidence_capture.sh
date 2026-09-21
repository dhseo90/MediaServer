#!/usr/bin/env bash
# 파일 용도: collector 진단 전용 단기 검사. 소유 cache/media/temp는 EXIT에서 전부 정리한다.
set -euo pipefail
capture_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
capture_repo="$(cd "$capture_script/../.." && pwd)"
capture_root="$(mktemp -d /private/tmp/media-server-capture-diagnostic.XXXXXX)"
SECONDS=0
cleanup(){
  local result=$?
  trap - EXIT
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];if(p.dirname(r)!=="/private/tmp"||!/^media-server-capture-diagnostic\.[A-Za-z0-9]+$/.test(p.basename(r))||f.lstatSync(r).isSymbolicLink())throw Error("cleanup-ownership");function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(JSON.stringify({cleanupRoot:r,bytes,absent:!f.existsSync(r)}));if(f.existsSync(r))process.exit(1)' "$capture_root"
  printf '[elapsed] seconds=%s exit=%s\n' "$SECONDS" "$result"
  exit "$result"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$capture_root/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
unset GST_REGISTRY GST_REGISTRY_1_0 GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH
export GST_REGISTRY="$capture_root/registry.bin" GST_REGISTRY_1_0="$capture_root/registry.bin"
source "$capture_script/env_common.sh"
media_server_apply_homebrew_gst_env
printf '[environment] owned_root=%s headless=true optimized=false\n' "$capture_root"
read -r -a capture_flags <<< "$(pkg-config --cflags --libs gstreamer-1.0 openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$capture_repo/include" -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
 "$capture_script/recording_file_evidence_capture_smoke.cpp" "$capture_repo/src/recording/recording_contracts.cpp" "$capture_repo/src/domain/strict_json.cpp" "${capture_flags[@]}" -o "$capture_root/check"
"$capture_root/check"
