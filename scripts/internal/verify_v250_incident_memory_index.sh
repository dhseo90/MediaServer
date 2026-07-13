#!/usr/bin/env bash
# 파일 용도: v2.5.0 S02 Local incident memory index 단위 smoke를 빌드하고 실행한다.
# 동작 요약: SQLite FTS5 primary와 JSONL+BM25 fallback의 deterministic search parity를 확인한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_V250_INCIDENT_MEMORY_INDEX_BUILD_DIR:-/tmp/media_server_v250_incident_memory_index-$$}"
WORK_DIR="${MEDIA_SERVER_VERIFY_V250_INCIDENT_MEMORY_INDEX_WORK_DIR:-${BUILD_DIR}/work}"
CXX_BIN="${CXX:-c++}"

fail() {
  echo "[fail] $1" >&2
  exit 1
}

mkdir -p "${BUILD_DIR}" "${WORK_DIR}"

SQLITE_CFLAGS=""
SQLITE_LIBS=""
SQLITE_DEFINE="-DMEDIA_SERVER_USE_SQLITE3=0"
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists sqlite3; then
  SQLITE_CFLAGS="$(pkg-config --cflags sqlite3)"
  SQLITE_LIBS="$(pkg-config --libs sqlite3)"
  SQLITE_DEFINE="-DMEDIA_SERVER_USE_SQLITE3=1"
fi

echo "[verify] build v2.5.0 incident memory index smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" "${SQLITE_DEFINE}" \
  ${SQLITE_CFLAGS} \
  "${SCRIPT_DIR}/incident_memory_index_smoke.cpp" \
  "${ROOT_DIR}/src/analysis/incident_memory.cpp" \
  -o "${BUILD_DIR}/incident_memory_index_smoke" \
  ${SQLITE_LIBS}

smoke_output="$("${BUILD_DIR}/incident_memory_index_smoke" "${WORK_DIR}")"
assert_fallback() {
  if ( [[ "${smoke_output}" != *"fallback"* ]] ); then
    fail "incident memory index runtime readback missing fallback parity"
  fi
}
assert_fallback
printf '%s\n' "${smoke_output}"
