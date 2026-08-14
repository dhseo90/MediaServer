#!/usr/bin/env bash
# 파일 용도: v2.5.0 S01 Event/incident text projection 단위 smoke를 빌드하고 실행한다.
# 동작 요약: EventRecord/audit/source health/alert dry-run fixture가 redacted searchable document로 투영되는지 확인한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_V250_INCIDENT_TEXT_BUILD_DIR:-/tmp/media_server_v250_incident_text_projection-$$}"
CXX_BIN="${CXX:-c++}"

fail() {
  echo "[fail] $1" >&2
  exit 1
}

mkdir -p "${BUILD_DIR}"

echo "[verify] build v2.5.0 incident text projection smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/incident_text_projection_smoke.cpp" \
  "${ROOT_DIR}/src/analysis/incident_memory.cpp" \
  -o "${BUILD_DIR}/incident_text_projection_smoke"

smoke_output="$("${BUILD_DIR}/incident_text_projection_smoke")"
assert_IncidentProjectionDocumentJson() {
  if ( [[ "${smoke_output}" != *"IncidentProjectionDocumentJson"* ]] ); then
    fail "incident text projection runtime readback missing canonical serializer"
  fi
}
assert_IncidentProjectionDocumentJson
printf '%s\n' "${smoke_output}"
