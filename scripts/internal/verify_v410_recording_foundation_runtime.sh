#!/usr/bin/env bash
# 파일 용도: 실제 runtime archive만 사용하며 운영 env 파일을 로드하지 않는다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
case "${1:-}" in ""|--oracle-negative|--fail-after-source) ;; *) echo 'unsupported argument' >&2; exit 2;; esac
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env
BUILD_DIR="${ROOT_DIR}/build-gst-onnx"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-s09-runtime.XXXXXX")"
RUN_DIR="$(cd "${RUN_DIR}" && pwd -P)"
completed=0
start_ms="$(node -p 'Date.now()')"
cleanup() {
  local original=$? cleanup_result=0 bytes=0
  trap - EXIT
  bytes="$(node -e 'const f=require("fs"),p=require("path");function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,v)=>n+size(p.join(x,v)),0):s.size;}console.log(size(process.argv[1]));' "${RUN_DIR}")" || cleanup_result=1
  rm -rf -- "${RUN_DIR}" || cleanup_result=1
  [[ ! -e "${RUN_DIR}" ]] || cleanup_result=1
  echo "[cleanup] path=${RUN_DIR} bytes=${bytes} absent=$([[ ! -e "${RUN_DIR}" ]] && echo true || echo false)"
  echo "[elapsed] ms=$(( $(node -p 'Date.now()') - start_ms ))"
  if (( original != 0 )); then exit "${original}"; fi
  if (( cleanup_result != 0 || completed != 1 )); then exit 1; fi
  echo '[pass] RT08 wrapper completed and cleanup absent'
}
trap cleanup EXIT
read -r -a ORIGINAL_LINK < "${BUILD_DIR}/CMakeFiles/media_server.dir/link.txt"
LINK_LIBS=(); found=0
for token in "${ORIGINAL_LINK[@]}"; do
  if [[ "${token}" == libmedia_server_runtime.a ]]; then found=1; LINK_LIBS+=("${BUILD_DIR}/${token}"); continue; fi
  if (( found )); then LINK_LIBS+=("${token}"); fi
done
test "${found}" = 1
read -r -a CFLAGS <<< "$(pkg-config --cflags gstreamer-app-1.0 openssl)"
"${CXX:-c++}" -std=c++17 -pthread -I"${ROOT_DIR}/include" "${CFLAGS[@]}" \
  "${SCRIPT_DIR}/recording_foundation_runtime_smoke.cpp" "${LINK_LIBS[@]}" -o "${RUN_DIR}/runtime"
if [[ "${1:-}" == --oracle-negative ]]; then
  "${RUN_DIR}/runtime" --oracle-negative
else
  mkdir "${RUN_DIR}/input" "${RUN_DIR}/state"
  cp "${ROOT_DIR}/video/imports/va_tracking_event_1280x720_30fps_h264.mp4" "${RUN_DIR}/input/identity.mp4"
  test -s "${ROOT_DIR}/models/yolo11n.onnx"
  test -s "${ROOT_DIR}/models/coco.names"
  (cd "${RUN_DIR}" && env -i PATH="${PATH}" HOME="${HOME}" TMPDIR="${RUN_DIR}" \
    GST_PLUGIN_PATH="${GST_PLUGIN_PATH:-}" GST_PLUGIN_SYSTEM_PATH="${GST_PLUGIN_SYSTEM_PATH:-}" \
    GST_PLUGIN_SCANNER="${GST_PLUGIN_SCANNER:-}" GST_REGISTRY="${RUN_DIR}/gst-registry.bin" \
    MEDIA_SERVER_FILE_ROOT="${RUN_DIR}/input" MEDIA_SERVER_DEFAULT_FILE="${RUN_DIR}/input/identity.mp4" \
    MEDIA_SERVER_STATE_DIR="${RUN_DIR}/state" MEDIA_SERVER_SOURCE_REGISTRY="${RUN_DIR}/state/sources.json" \
    MEDIA_SERVER_PUBLISHED_VIEWS="${RUN_DIR}/state/views.json" MEDIA_SERVER_ANALYSIS_REGISTRY="${RUN_DIR}/state/analysis.json" \
    MEDIA_SERVER_AUTH_MODE=off MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED=0 \
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED=0 MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED=0 \
    MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=0 MEDIA_SERVER_RECORDING_STORAGE_ROOT="${RUN_DIR}/recordings" \
    "${RUN_DIR}/runtime" "${RUN_DIR}" "${ROOT_DIR}" ${1:+"$1"})
fi
completed=1
