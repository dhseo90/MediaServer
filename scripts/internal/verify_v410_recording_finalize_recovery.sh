#!/usr/bin/env bash
# 파일 용도: 녹화 최종화 복구의 격리 검증 실행.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_DIR="$(mktemp -d /private/tmp/media-server-finalize-XXXXXX 2>/dev/null || mktemp -d /tmp/media-server-finalize-XXXXXX)"
cleanup(){ node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});if(f.existsSync(r))process.exit(1);console.log(`[cleanup] path=${r} bytes=${bytes} removed=true`)' "$RUN_DIR"; }
trap cleanup EXIT
source "$SCRIPT_DIR/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a GST_FLAGS <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0 gstreamer-video-1.0)"
if [[ "${1:-}" == "--integration" ]]; then
  shift
  read -r -a EXTRA_FLAGS <<< "$(pkg-config --cflags --libs sqlite3 openssl)"
  "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" \
    "$SCRIPT_DIR/recording_finalize_integration_smoke.cpp" \
    "$ROOT_DIR/src/recording/gstreamer_segment_writer.cpp" \
    "$ROOT_DIR/src/recording/recording_timeline_projection.cpp" \
    "$ROOT_DIR/src/recording/event_recording_bridge.cpp" "$ROOT_DIR/src/recording/recording_derived_event_worker.cpp" "$ROOT_DIR/src/recording/recording_derived_selection.cpp" "$ROOT_DIR/src/recording/recording_derived_job_service.cpp" "$ROOT_DIR/src/recording/recording_derived_remux.cpp" "$ROOT_DIR/src/recording/recording_read_service.cpp" "$ROOT_DIR/src/recording/event_clip_deriver.cpp" \
    "$ROOT_DIR/src/recording/recording_finalize_recovery.cpp" "$ROOT_DIR/src/recording/recording_media_inspector.cpp" \
    "$ROOT_DIR/src/recording/recording_catalog.cpp" "$ROOT_DIR/src/recording/recording_journal.cpp" \
    "$ROOT_DIR/src/recording/retention_coordinator.cpp" "$ROOT_DIR/src/recording/recording_derived_job.cpp" "$ROOT_DIR/src/recording/recording_derived_job_ready.cpp" "$ROOT_DIR/src/recording/recording_contracts.cpp" \
    "$ROOT_DIR/src/domain/strict_json.cpp" -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_GSTREAMER=1 \
    -DMEDIA_SERVER_USE_OPENSSL=1 "${GST_FLAGS[@]}" "${EXTRA_FLAGS[@]}" -o "$RUN_DIR/integration"
  "$RUN_DIR/integration" "$RUN_DIR" "$@"
  exit
fi
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" \
 "$SCRIPT_DIR/recording_finalize_recovery_smoke.cpp" "$ROOT_DIR/src/recording/recording_finalize_recovery.cpp" \
 "$ROOT_DIR/src/recording/recording_catalog.cpp" "$ROOT_DIR/src/recording/recording_journal.cpp" \
 "$ROOT_DIR/src/recording/recording_media_inspector.cpp" \
 "$ROOT_DIR/src/recording/recording_derived_job.cpp" "$ROOT_DIR/src/recording/recording_derived_job_ready.cpp" "$ROOT_DIR/src/recording/recording_contracts.cpp" "$ROOT_DIR/src/recording/retention_coordinator.cpp" \
 "$ROOT_DIR/src/domain/strict_json.cpp" -DMEDIA_SERVER_USE_SQLITE3=0 -DMEDIA_SERVER_USE_GSTREAMER=1 "${GST_FLAGS[@]}" -o "$RUN_DIR/smoke"
"$RUN_DIR/smoke" "$RUN_DIR" "$@"
