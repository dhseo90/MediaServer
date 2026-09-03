#!/usr/bin/env bash
# 파일 용도: v4.1.0 S05 이벤트 녹화 연결 focused smoke를 독립 빌드·실행한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media_server_v410_event_recording.XXXXXX")"
CXX_BIN="${CXX:-c++}"
cleanup() { rm -rf -- "${BUILD_DIR}"; }
trap cleanup EXIT
node "${SCRIPT_DIR}/v410_s05_inventory.mjs"
node "${SCRIPT_DIR}/v410_s05_inventory.test.mjs"

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
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists gstreamer-1.0; then
  read -r -a GST_CFLAGS <<<"$(pkg-config --cflags gstreamer-1.0)"
  read -r -a GST_LIBS <<<"$(pkg-config --libs gstreamer-1.0)"
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
  "${ROOT_DIR}/src/recording/event_recording_bridge.cpp" \
  "${ROOT_DIR}/src/recording/event_clip_deriver.cpp" \
  "${ROOT_DIR}/src/recording/recording_journal.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
  "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -DMEDIA_SERVER_USE_SQLITE3="${SQLITE_DEFINE}" \
  -DMEDIA_SERVER_USE_GSTREAMER="${GST_DEFINE}" \
  -DMEDIA_SERVER_USE_OPENSSL="${OPENSSL_DEFINE}" \
  ${SQLITE_LIBS[*]-} ${GST_LIBS[*]-} ${OPENSSL_LIBS[*]-} \
  -o "${BUILD_DIR}/event_recording_link_smoke"

"${BUILD_DIR}/event_recording_link_smoke" "${BUILD_DIR}" \
  "${ROOT_DIR}/video/sample_h264_video_only.mp4" | tee "${BUILD_DIR}/assertions.log"

node "${SCRIPT_DIR}/verify_v390_event_storage_application_boundary.mjs" --application-only |
  tee "${BUILD_DIR}/application.log"
node "${SCRIPT_DIR}/verify_v410_event_storage_recording_runtime.mjs" |
  tee "${BUILD_DIR}/runtime.log"
node "${SCRIPT_DIR}/v410_s05_inventory.mjs" --results \
  "${BUILD_DIR}/assertions.log" "${BUILD_DIR}/application.log" "${BUILD_DIR}/runtime.log"
