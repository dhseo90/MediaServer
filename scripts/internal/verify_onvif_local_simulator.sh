#!/usr/bin/env bash
# 파일 용도: ONVIF 로컬 simulator fixture smoke를 빌드하고 실행한다.
# 동작 요약: 실장비 없이 loopback SOAP 서버와 실제 HTTP transport/probe adapter 성공 경로를 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_ONVIF_LOCAL_SIMULATOR_BUILD_DIR:-/tmp/media_server_onvif_local_simulator-$$}"
CXX_BIN="${CXX:-c++}"

mkdir -p "${BUILD_DIR}"

echo "[verify] build ONVIF local simulator smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/onvif_local_simulator_smoke.cpp" \
  "${ROOT_DIR}/src/ingress/onvif_live_import.cpp" \
  -o "${BUILD_DIR}/onvif_local_simulator_smoke"

"${BUILD_DIR}/onvif_local_simulator_smoke"
