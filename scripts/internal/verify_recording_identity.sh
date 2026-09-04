#!/usr/bin/env bash
# 파일 용도: 실제 서비스 실행과 별도로 ID 매핑 focused 회귀를 독립 빌드한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-identity-unit.XXXXXX")"
cleanup() {
  find "${BUILD_DIR}" -type f -exec wc -c {} \; |
    awk '{ bytes += $1; files += 1 } END { printf "[identity-cleanup] files=%d bytes=%.0f\n", files, bytes }'
  rm -rf -- "${BUILD_DIR}"
  test ! -e "${BUILD_DIR}"
  echo "[identity-cleanup] absent=${BUILD_DIR}"
}
trap cleanup EXIT
read -r -a PKG_CFLAGS <<<"$(pkg-config --cflags sqlite3 openssl)"
read -r -a PKG_LIBS <<<"$(pkg-config --libs sqlite3 openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  "${PKG_CFLAGS[@]}" -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
  -DMEDIA_SERVER_USE_GSTREAMER=0 \
  "${SCRIPT_DIR}/recording_identity_smoke.cpp" \
  "${ROOT_DIR}/src/recording/event_recording_bridge.cpp" \
  "${ROOT_DIR}/src/recording/event_clip_deriver.cpp" \
  "${ROOT_DIR}/src/recording/recording_journal.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
  "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  "${ROOT_DIR}/src/recording/recording_session_service.cpp" \
  "${ROOT_DIR}/src/core/session_manager.cpp" \
  "${ROOT_DIR}/src/core/shared_stream.cpp" \
  "${ROOT_DIR}/src/core/stream_registry.cpp" \
  "${ROOT_DIR}/src/core/resource_guard.cpp" \
  "${ROOT_DIR}/src/core/source_request_parser.cpp" \
  "${ROOT_DIR}/src/core/stream_key.cpp" \
  "${ROOT_DIR}/src/app_config.cpp" \
  "${PKG_LIBS[@]}" -o "${BUILD_DIR}/identity-smoke"
"${BUILD_DIR}/identity-smoke" "${BUILD_DIR}"
