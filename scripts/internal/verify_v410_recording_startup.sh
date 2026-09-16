#!/usr/bin/env bash
# 파일 용도: 녹화 시작 복구의 격리 단위 검증 실행.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-startup-unit.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
STARTUP_UNIT_COMPLETED=0
cleanup() {
    local result=$?
    trap - EXIT
    if [[ "$STARTUP_UNIT_COMPLETED" != 1 && "$result" == 0 ]]; then result=1; fi
    if ! node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});if(f.existsSync(r))process.exit(1);console.log(`[cleanup] path=${r} bytes=${bytes} removed=true`)' "$RUN_DIR"; then
        result=1
    fi
    exit "$result"
}
trap cleanup EXIT
source "$SCRIPT_DIR/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a FLAGS <<< "$(pkg-config --cflags --libs sqlite3 gstreamer-1.0 gstreamer-app-1.0)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" \
 "$SCRIPT_DIR/recording_startup_smoke.cpp" "$ROOT_DIR/src/recording/recording_startup_recovery.cpp" \
 "$ROOT_DIR/src/recording/recording_catalog.cpp" "$ROOT_DIR/src/recording/recording_journal.cpp" \
 "$ROOT_DIR/src/recording/recording_finalize_recovery.cpp" "$ROOT_DIR/src/recording/recording_file_evidence.cpp" "$ROOT_DIR/src/recording/recording_media_inspector.cpp" \
 "$ROOT_DIR/src/recording/recording_derived_job.cpp" "$ROOT_DIR/src/recording/recording_derived_job_ready.cpp" "$ROOT_DIR/src/recording/recording_contracts.cpp" "$ROOT_DIR/src/recording/retention_coordinator.cpp" \
 "$ROOT_DIR/src/domain/strict_json.cpp" -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_GSTREAMER=1 "${FLAGS[@]}" -o "$RUN_DIR/smoke"
"$RUN_DIR/smoke" "$RUN_DIR" "$ROOT_DIR/video/sample_h264_video_only.mp4"
STARTUP_UNIT_COMPLETED=1
