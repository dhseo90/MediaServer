#!/usr/bin/env bash
# 파일 용도: v4.1.0 S05 이벤트 녹화 연결 focused smoke를 독립 빌드·실행한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FOCUSED_MODE="${1:-}"
if [[ $# -gt 1 || ( -n "$FOCUSED_MODE" && "$FOCUSED_MODE" != --enqueue-only && "$FOCUSED_MODE" != --bridge-only ) ]]; then exit 2; fi
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media_server_v410_event_recording.XXXXXX")"
CXX_BIN="${CXX:-c++}"
cleanup() { node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=f.existsSync(r)?size(r):0;f.rmSync(r,{recursive:true,force:true});if(f.existsSync(r))process.exit(1);console.log(`[cleanup] path=${r} bytes=${bytes} removed=true`)' "$BUILD_DIR"; }
trap cleanup EXIT
if [[ -z "$FOCUSED_MODE" ]]; then
  node "${SCRIPT_DIR}/v410_s05_inventory.mjs"
  node "${SCRIPT_DIR}/v410_s05_inventory.test.mjs"
fi

SQLITE_CFLAGS=()
SQLITE_LIBS=()
SQLITE_DEFINE=0
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists sqlite3; then
  read -r -a SQLITE_CFLAGS <<<"$(pkg-config --cflags sqlite3)"
  read -r -a SQLITE_LIBS <<<"$(pkg-config --libs sqlite3)"
  SQLITE_DEFINE=1
fi
GST_CFLAGS=()
GST_LIBS=()
GST_DEFINE=0
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists gstreamer-1.0 gstreamer-app-1.0 gstreamer-video-1.0; then
  read -r -a GST_CFLAGS <<<"$(pkg-config --cflags gstreamer-1.0 gstreamer-app-1.0 gstreamer-video-1.0)"
  read -r -a GST_LIBS <<<"$(pkg-config --libs gstreamer-1.0 gstreamer-app-1.0 gstreamer-video-1.0)"
  GST_DEFINE=1
fi
OPENSSL_CFLAGS=()
OPENSSL_LIBS=()
OPENSSL_DEFINE=0
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists openssl; then
  read -r -a OPENSSL_CFLAGS <<<"$(pkg-config --cflags openssl)"
  read -r -a OPENSSL_LIBS <<<"$(pkg-config --libs openssl)"
  OPENSSL_DEFINE=1
fi

"${CXX_BIN}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  ${SQLITE_CFLAGS[*]-} ${GST_CFLAGS[*]-} ${OPENSSL_CFLAGS[*]-} \
  "${SCRIPT_DIR}/event_recording_link_smoke.cpp" \
  "$ROOT_DIR/src/recording/recording_timeline_projection.cpp" \
  "${ROOT_DIR}/src/recording/event_recording_bridge.cpp" "${ROOT_DIR}/src/recording/recording_derived_event_worker.cpp" "${ROOT_DIR}/src/recording/recording_derived_selection.cpp" "${ROOT_DIR}/src/recording/recording_derived_job_service.cpp" "${ROOT_DIR}/src/recording/recording_derived_remux.cpp" "${ROOT_DIR}/src/recording/recording_read_service.cpp" \
  "${ROOT_DIR}/src/recording/event_clip_deriver.cpp" \
  "${ROOT_DIR}/src/recording/recording_journal.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
 "${ROOT_DIR}/src/recording/recording_finalize_recovery.cpp" "${ROOT_DIR}/src/recording/recording_file_evidence.cpp" \
 "${ROOT_DIR}/src/recording/recording_media_inspector.cpp" \
  "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/recording/recording_derived_job.cpp" "${ROOT_DIR}/src/recording/recording_derived_job_ready.cpp" "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -DMEDIA_SERVER_USE_SQLITE3="${SQLITE_DEFINE}" \
  -DMEDIA_SERVER_USE_GSTREAMER="${GST_DEFINE}" \
  -DMEDIA_SERVER_USE_OPENSSL="${OPENSSL_DEFINE}" \
  ${SQLITE_LIBS[*]-} ${GST_LIBS[*]-} ${OPENSSL_LIBS[*]-} -lz \
  -o "${BUILD_DIR}/event_recording_link_smoke"

if [[ -n "$FOCUSED_MODE" ]]; then
  "${BUILD_DIR}/event_recording_link_smoke" "${BUILD_DIR}" \
    "${ROOT_DIR}/video/sample_h264_video_only.mp4" "$FOCUSED_MODE"
  exit 0
fi
"${BUILD_DIR}/event_recording_link_smoke" "${BUILD_DIR}" \
  "${ROOT_DIR}/video/sample_h264_video_only.mp4" | tee "${BUILD_DIR}/assertions.log"

node "${SCRIPT_DIR}/verify_v390_event_storage_application_boundary.mjs" --application-only |
  tee "${BUILD_DIR}/application.log"
node "${SCRIPT_DIR}/verify_v410_event_storage_recording_runtime.mjs" |
  tee "${BUILD_DIR}/runtime.log"
node "${SCRIPT_DIR}/v410_s05_inventory.mjs" --results \
  "${BUILD_DIR}/assertions.log" "${BUILD_DIR}/application.log" "${BUILD_DIR}/runtime.log"
