#!/usr/bin/env bash
# 파일 용도: v4.1.0 S04 순환 보존 focused smoke를 독립 빌드·실행한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_V410_RECORDING_RETENTION_BUILD_DIR:-/tmp/media_server_v410_recording_retention-$$}"
CXX_BIN="${CXX:-c++}"
cleanup() { rm -rf "${BUILD_DIR}"; }
trap cleanup EXIT
mkdir -p "${BUILD_DIR}"
SQLITE_CFLAGS=()
SQLITE_LIBS=()
SQLITE_DEFINE=0
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists sqlite3; then
  read -r -a SQLITE_CFLAGS <<<"$(pkg-config --cflags sqlite3)"
  read -r -a SQLITE_LIBS <<<"$(pkg-config --libs sqlite3)"
  SQLITE_DEFINE=1
fi
"${CXX_BIN}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  ${SQLITE_CFLAGS[*]-} \
  "${SCRIPT_DIR}/recording_retention_smoke.cpp" \
  "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/recording/recording_journal.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
  "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -DMEDIA_SERVER_USE_SQLITE3="${SQLITE_DEFINE}" \
  ${SQLITE_LIBS[*]-} \
  -o "${BUILD_DIR}/recording_retention_smoke"
"${BUILD_DIR}/recording_retention_smoke" "${BUILD_DIR}"
