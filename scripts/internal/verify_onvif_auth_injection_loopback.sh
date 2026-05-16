#!/usr/bin/env bash
# 파일 용도: ONVIF 인증 주입 reference-only loopback smoke를 빌드하고 실행한다.
# 동작 요약: credential reference가 있어도 HTTP auth/WS-Security secret material이 요청에 주입되지 않는지 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_ONVIF_AUTH_INJECTION_LOOPBACK_BUILD_DIR:-/tmp/media_server_onvif_auth_injection_loopback-$$}"
CXX_BIN="${CXX:-c++}"

mkdir -p "${BUILD_DIR}"

echo "[verify] build ONVIF auth injection loopback smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/onvif_auth_injection_loopback_smoke.cpp" \
  "${ROOT_DIR}/src/ingress/onvif_live_import.cpp" \
  "${ROOT_DIR}/src/ingress/onvif_credential_provider.cpp" \
  -o "${BUILD_DIR}/onvif_auth_injection_loopback_smoke"

"${BUILD_DIR}/onvif_auth_injection_loopback_smoke"
