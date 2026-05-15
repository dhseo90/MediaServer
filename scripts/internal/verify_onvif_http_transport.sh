#!/usr/bin/env bash
# 파일 용도: ONVIF HTTP SOAP transport 단위 smoke를 빌드하고 실행한다.
# 동작 요약: 로컬 loopback HTTP 서버와 실제 socket POST로 transport와 sanitize된 오류를 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_ONVIF_HTTP_TRANSPORT_BUILD_DIR:-/tmp/media_server_onvif_http_transport-$$}"
CXX_BIN="${CXX:-c++}"

mkdir -p "${BUILD_DIR}"

echo "[verify] build ONVIF HTTP transport smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/onvif_http_transport_smoke.cpp" \
  "${ROOT_DIR}/src/ingress/onvif_live_import.cpp" \
  -o "${BUILD_DIR}/onvif_http_transport_smoke"

"${BUILD_DIR}/onvif_http_transport_smoke"
