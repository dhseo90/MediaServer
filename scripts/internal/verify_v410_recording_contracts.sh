#!/usr/bin/env bash
# 파일 용도: v4.1.0 녹화 v1 계약 smoke를 실제 C++로 빌드하고 golden fixture를 검증한다.
# 동작 요약: 독립 임시 빌드에서 parser/serializer/ID/시간/lifecycle/tombstone 경계를 실행한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_V410_RECORDING_CONTRACTS_BUILD_DIR:-/tmp/media_server_v410_recording_contracts-$$}"
CXX_BIN="${CXX:-c++}"

cleanup() {
  rm -rf "${BUILD_DIR}"
}
trap cleanup EXIT

mkdir -p "${BUILD_DIR}"

echo "[verify] build v4.1.0 recording contract smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -Wall -Wextra -Werror -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/recording_contract_smoke.cpp" \
  "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -o "${BUILD_DIR}/recording_contract_smoke"

"${BUILD_DIR}/recording_contract_smoke" "${ROOT_DIR}/test/fixtures/recording/v1"
