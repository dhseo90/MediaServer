#!/usr/bin/env bash
# 파일 용도: V2 보존/재생의 GST 지원·미지원 경계를 소유 임시 root에서 검사한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMP_PARENT="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
RUN_DIR="$(mktemp -d "$TEMP_PARENT/media-server-retention-v2.XXXXXX")"
SECONDS=0
cleanup(){ node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],parent=process.argv[2];if(p.dirname(r)!==parent||!/^media-server-retention-v2\.[A-Za-z0-9]+$/.test(p.basename(r))||f.lstatSync(r).isSymbolicLink())process.exit(2);function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$RUN_DIR" "$TEMP_PARENT";echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"; }
trap cleanup EXIT
source "$SCRIPT_DIR/env_common.sh"
export MEDIA_SERVER_GST_CACHE_DIR="$RUN_DIR/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$RUN_DIR/registry.bin" GST_REGISTRY_1_0="$RUN_DIR/registry.bin"
unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH
media_server_apply_homebrew_gst_env
read -r -a BASE <<<"$(pkg-config --cflags --libs sqlite3 openssl)"
read -r -a GST <<<"$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0)"
compile(){
 local mode="$1";shift
 "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_GSTREAMER="$mode" \
 "$ROOT_DIR/src/recording/recording_timeline_projection.cpp" \
 "$SCRIPT_DIR/recording_retention_v2_smoke.cpp" "$ROOT_DIR/src/recording/recording_read_service.cpp" \
 "$ROOT_DIR/src/recording/recording_catalog.cpp" "$ROOT_DIR/src/recording/recording_journal.cpp" \
 "$ROOT_DIR/src/recording/recording_derived_job.cpp" "$ROOT_DIR/src/recording/recording_derived_job_ready.cpp" "$ROOT_DIR/src/recording/recording_contracts.cpp" "$ROOT_DIR/src/recording/recording_finalize_recovery.cpp" "$ROOT_DIR/src/recording/recording_file_evidence.cpp" \
 "$ROOT_DIR/src/recording/recording_media_inspector.cpp" "$ROOT_DIR/src/recording/retention_coordinator.cpp" \
 "$ROOT_DIR/src/domain/strict_json.cpp" "${BASE[@]}" "$@" -o "$RUN_DIR/test-$mode"
}
compile 1 "${GST[@]}"
"$RUN_DIR/test-1" "$RUN_DIR"
compile 0
"$RUN_DIR/test-0" "$RUN_DIR"
