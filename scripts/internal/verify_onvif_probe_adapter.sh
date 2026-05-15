#!/usr/bin/env bash
# 파일 용도: ONVIF probe adapter 단위 smoke를 빌드하고 실행한다.
# 동작 요약: fake SOAP transport로 endpoint/timeout 전달, parser 연결, 실패 요약 redaction을 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_ONVIF_PROBE_ADAPTER_BUILD_DIR:-/tmp/media_server_onvif_probe_adapter-$$}"
CXX_BIN="${CXX:-c++}"

mkdir -p "${BUILD_DIR}"

echo "[verify] build ONVIF probe adapter smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/onvif_probe_adapter_smoke.cpp" \
  "${ROOT_DIR}/src/ingress/onvif_live_import.cpp" \
  -o "${BUILD_DIR}/onvif_probe_adapter_smoke"

"${BUILD_DIR}/onvif_probe_adapter_smoke"
