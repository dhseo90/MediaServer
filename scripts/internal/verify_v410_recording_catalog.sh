#!/usr/bin/env bash
# 파일 용도: v4.1.0 S03 JSONL/SQLite catalog focused smoke를 독립 빌드한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_V410_RECORDING_CATALOG_BUILD_DIR:-/tmp/media_server_v410_recording_catalog-$$}"
CXX_BIN="${CXX:-c++}"
cleanup() { rm -rf "${BUILD_DIR}"; }
trap cleanup EXIT
mkdir -p "${BUILD_DIR}"
SQLITE_CFLAGS=()
SQLITE_LIBS=()
SQLITE_DEFINE=0
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists sqlite3; then
  read -r -a SQLITE_CFLAGS <<<"$(pkg-config --cflags sqlite3)"
  read -r -a SQLITE_LIBS <<<"$(pkg-config --libs sqlite3)"
  SQLITE_DEFINE=1
fi
"${CXX_BIN}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  ${SQLITE_CFLAGS[*]-} \
  "${SCRIPT_DIR}/recording_catalog_smoke.cpp" \
  "${ROOT_DIR}/src/recording/recording_journal.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
  "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -DMEDIA_SERVER_USE_SQLITE3="${SQLITE_DEFINE}" \
  ${SQLITE_LIBS[*]-} \
  -o "${BUILD_DIR}/recording_catalog_smoke"
"${BUILD_DIR}/recording_catalog_smoke" "${BUILD_DIR}"

check_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if ! grep -Fq "${needle}" "${ROOT_DIR}/${file}"; then
    echo "[fail] ${label}: ${needle}" >&2
    exit 1
  fi
  echo "[pass] ${label}"
}

check_contains "src/recording/recording_supervisor.cpp" \
  "SetSourceMutationCallback" "source 저장 callback reconcile 연결"
check_contains "src/recording/recording_supervisor.cpp" \
  "state.active && state.revision == source.recording.revision" "policy revision idempotency"
check_contains "src/recording/recording_supervisor.cpp" \
  "std::chrono::seconds(5)" "5초 safety reconcile"
check_contains "src/application/media_server_application.cpp" \
  "recording_journal.Open" "composition root journal 선행 open"
check_contains "src/application/media_server_application.cpp" \
  "recording_catalog.Open" "composition root catalog rebuild/open"
check_contains "src/application/media_server_application.cpp" \
  "recording_supervisor.Start" "서버 전 supervisor 시작"
check_contains "src/application/media_server_application.cpp" \
  "recording_supervisor.Stop" "ingress 종료 뒤 recorder finalize"

line_of() { grep -nF "$2" "${ROOT_DIR}/$1" | head -1 | cut -d: -f1; }
line_of_last() { grep -nF "$2" "${ROOT_DIR}/$1" | tail -1 | cut -d: -f1; }
APP_FILE="src/application/media_server_application.cpp"
JOURNAL_LINE="$(line_of "${APP_FILE}" "recording_journal.Open")"
CATALOG_LINE="$(line_of "${APP_FILE}" "recording_catalog.Open")"
SUPERVISOR_LINE="$(line_of "${APP_FILE}" "recording_supervisor.Start")"
RTSP_START_LINE="$(line_of "${APP_FILE}" "gst_rtsp_server.Start")"
HTTP_STOP_LINE="$(line_of_last "${APP_FILE}" "webrtc_http_server.Stop")"
RTSP_STOP_LINE="$(line_of_last "${APP_FILE}" "gst_rtsp_server.Stop")"
SUPERVISOR_STOP_LINE="$(line_of_last "${APP_FILE}" "recording_supervisor.Stop")"
EVENT_STOP_LINE="$(line_of_last "${APP_FILE}" "analysis::StopEventStorage")"
if (( JOURNAL_LINE < CATALOG_LINE && CATALOG_LINE < SUPERVISOR_LINE && SUPERVISOR_LINE < RTSP_START_LINE &&
      HTTP_STOP_LINE < RTSP_STOP_LINE && RTSP_STOP_LINE < SUPERVISOR_STOP_LINE && SUPERVISOR_STOP_LINE < EVENT_STOP_LINE )); then
  echo "[pass] composition root 시작/종료 순서"
else
  echo "[fail] composition root 시작/종료 순서" >&2
  exit 1
fi
