#!/usr/bin/env bash
# 파일 용도: 기존 runtime archive에 실제 decoder/manager smoke를 링크한다. 운영 env 파일은 읽지 않는다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env
BUILD_DIR="${MEDIA_SERVER_S07_RUNTIME_BUILD_DIR:-${ROOT_DIR}/build-gst-onnx}"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-s07-runtime.XXXXXX")"
cleanup() { du -sk "${RUN_DIR}"; rm -rf -- "${RUN_DIR}"; test ! -e "${RUN_DIR}"; echo '[pass] runtime temporary cleanup'; }
trap cleanup EXIT
read -r -a ORIGINAL_LINK < "${BUILD_DIR}/CMakeFiles/media_server.dir/link.txt"
LINK_LIBS=()
found=0
for token in "${ORIGINAL_LINK[@]}"; do
  if [[ "${token}" == libmedia_server_runtime.a ]]; then found=1; LINK_LIBS+=("${BUILD_DIR}/${token}"); continue; fi
  if (( found )); then LINK_LIBS+=("${token}"); fi
done
test "${found}" = 1
read -r -a GST_CFLAGS <<< "$(pkg-config --cflags gstreamer-app-1.0)"
"${CXX:-c++}" -std=c++17 -pthread -I"${ROOT_DIR}/include" "${GST_CFLAGS[@]}" \
  "${SCRIPT_DIR}/recording_observation_runtime_smoke.cpp" "${LINK_LIBS[@]}" -o "${RUN_DIR}/runtime"
(cd "${RUN_DIR}" && ./runtime)
