#!/usr/bin/env bash
# 파일 용도: v4.1.0 S02 recorder focused smoke를 독립 빌드한다.
# 동작 요약: product core와 writer를 같은 경고 정책으로 컴파일하고 실행한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_V410_RECORDING_RECORDER_BUILD_DIR:-/tmp/media_server_v410_recording_recorder-$$}"
CXX_BIN="${CXX:-c++}"

cleanup() { node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=f.existsSync(r)?size(r):0;f.rmSync(r,{recursive:true,force:true});if(f.existsSync(r))process.exit(1);console.log(`[cleanup] path=${r} bytes=${bytes} removed=true`)' "$BUILD_DIR"; }
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
  "${ROOT_DIR}/src/recording/recording_finalize_recovery.cpp" \
  "${ROOT_DIR}/src/recording/recording_media_inspector.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
  "${ROOT_DIR}/src/recording/recording_journal.cpp" \
  "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/recording/recording_derived_job.cpp" "${ROOT_DIR}/src/recording/recording_derived_job_ready.cpp" "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -DMEDIA_SERVER_USE_GSTREAMER="${GST_DEFINE}" \
  "${GST_LIBS[@]}" \
  -o "${BUILD_DIR}/recording_segment_writer_smoke"

MEDIA_SERVER_SOURCE_REGISTRY="${BUILD_DIR}/sources.json" \
MEDIA_SERVER_PUBLISHED_VIEWS="${BUILD_DIR}/views.json" \
"${BUILD_DIR}/recording_segment_writer_smoke" "${BUILD_DIR}"

grep -q 'currentRecordingPolicy = source.recording' \
  "${ROOT_DIR}/src/ingress/product_ui_ops_sources_script.cpp"
grep -q 'const previousRecording = currentRecordingPolicy' \
  "${ROOT_DIR}/src/ingress/product_ui_ops_sources_script.cpp"
