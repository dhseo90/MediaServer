#!/usr/bin/env bash
# 파일 용도: S07 focused smoke: 실행별 임시 root만 생성하고 종료 시 제거한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-s07.XXXXXX")"
cleanup() { du -sk "${RUN_DIR}"; rm -rf -- "${RUN_DIR}"; test ! -e "${RUN_DIR}"; echo '[pass] S07 temporary cleanup'; }
trap cleanup EXIT
SQLITE_FLAGS=()
SQLITE_DEFINE=0
if [[ "${1:-}" != "--no-sqlite" ]] && command -v pkg-config >/dev/null 2>&1 && pkg-config --exists sqlite3; then
  read -r -a SQLITE_FLAGS <<< "$(pkg-config --cflags --libs sqlite3)"
  SQLITE_DEFINE=1
fi
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -Wno-unused-lambda-capture -Wno-missing-field-initializers -pthread -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/recording_observation_smoke.cpp" \
  "${ROOT_DIR}/src/recording/recording_journal.cpp" \
  "${ROOT_DIR}/src/recording/recording_derived_job.cpp" "${ROOT_DIR}/src/recording/recording_derived_job_ready.cpp" "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
 "${ROOT_DIR}/src/recording/recording_finalize_recovery.cpp" "${ROOT_DIR}/src/recording/recording_file_evidence.cpp" \
 "${ROOT_DIR}/src/recording/recording_media_inspector.cpp" \
  "${ROOT_DIR}/src/recording/analysis_observation_projector.cpp" \
  "${ROOT_DIR}/src/analysis/object_tracker.cpp" \
  "${ROOT_DIR}/src/analysis/category_tokens.cpp" \
  "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -DMEDIA_SERVER_USE_SQLITE3="${SQLITE_DEFINE}" ${SQLITE_FLAGS[*]-} -lz -o "${RUN_DIR}/smoke"
"${RUN_DIR}/smoke" "${RUN_DIR}"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/recording_time_snapshot_smoke.cpp" -o "${RUN_DIR}/time-smoke"
"${RUN_DIR}/time-smoke"
