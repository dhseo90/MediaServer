#!/usr/bin/env bash
# 파일 용도: ONVIF SOAP parser 단위 smoke를 빌드하고 실행한다.
# 동작 요약: 합성 SOAP 응답만 사용해 service/profile/stream URI parser가 live source 입력으로 축약되는지 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_ONVIF_PROBE_PARSER_BUILD_DIR:-/tmp/media_server_onvif_probe_parser-$$}"
CXX_BIN="${CXX:-c++}"

mkdir -p "${BUILD_DIR}"

echo "[verify] build ONVIF probe parser smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/onvif_probe_parser_smoke.cpp" \
  "${ROOT_DIR}/src/ingress/onvif_live_import.cpp" \
  "${ROOT_DIR}/src/ingress/onvif_credential_provider.cpp" \
  -o "${BUILD_DIR}/onvif_probe_parser_smoke"

"${BUILD_DIR}/onvif_probe_parser_smoke"
