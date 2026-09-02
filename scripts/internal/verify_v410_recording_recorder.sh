#!/usr/bin/env bash
# 파일 용도: v4.1.0 S02 recorder focused smoke를 독립 빌드한다.
# 동작 요약: product core와 writer를 같은 경고 정책으로 컴파일하고 실행한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_V410_RECORDING_RECORDER_BUILD_DIR:-/tmp/media_server_v410_recording_recorder-$$}"
CXX_BIN="${CXX:-c++}"

cleanup() { rm -rf "${BUILD_DIR}"; }
trap cleanup EXIT
mkdir -p "${BUILD_DIR}"

GST_CFLAGS=()
GST_LIBS=()
GST_DEFINE=0
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists gstreamer-1.0 gstreamer-app-1.0; then
  read -r -a GST_CFLAGS <<<"$(pkg-config --cflags gstreamer-1.0 gstreamer-app-1.0)"
  read -r -a GST_LIBS <<<"$(pkg-config --libs gstreamer-1.0 gstreamer-app-1.0)"
  GST_DEFINE=1
fi

"${CXX_BIN}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  "${GST_CFLAGS[@]}" \
  "${SCRIPT_DIR}/recording_segment_writer_smoke.cpp" \
  "${ROOT_DIR}/src/core/shared_stream.cpp" \
  "${ROOT_DIR}/src/app_config.cpp" \
  "${ROOT_DIR}/src/ingress/source_view_registry.cpp" \
  "${ROOT_DIR}/src/ingress/source_view_application_service.cpp" \
  "${ROOT_DIR}/src/recording/gstreamer_segment_writer.cpp" \
  "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -DMEDIA_SERVER_USE_GSTREAMER="${GST_DEFINE}" \
  "${GST_LIBS[@]}" \
  -o "${BUILD_DIR}/recording_segment_writer_smoke"

MEDIA_SERVER_SOURCE_REGISTRY="${BUILD_DIR}/sources.json" \
MEDIA_SERVER_PUBLISHED_VIEWS="${BUILD_DIR}/views.json" \
"${BUILD_DIR}/recording_segment_writer_smoke" "${BUILD_DIR}"
