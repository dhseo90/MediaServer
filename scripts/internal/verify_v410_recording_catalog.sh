#!/usr/bin/env bash
# 파일 용도: v4.1.0 S03 JSONL/SQLite catalog focused smoke를 독립 빌드한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_V410_RECORDING_CATALOG_BUILD_DIR:-/tmp/media_server_v410_recording_catalog-$$}"
CXX_BIN="${CXX:-c++}"
cleanup() { node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=f.existsSync(r)?size(r):0;f.rmSync(r,{recursive:true,force:true});if(f.existsSync(r))process.exit(1);console.log(`[cleanup] path=${r} bytes=${bytes} removed=true`)' "$BUILD_DIR"; }
trap cleanup EXIT
mkdir -p "${BUILD_DIR}"
SQLITE_CFLAGS=()
SQLITE_LIBS=()
SQLITE_DEFINE=0
CRYPTO_CFLAGS=()
CRYPTO_LIBS=()
CRYPTO_DEFINE=0
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists openssl; then
  read -r -a CRYPTO_CFLAGS <<<"$(pkg-config --cflags openssl)"
  read -r -a CRYPTO_LIBS <<<"$(pkg-config --libs openssl)"
  CRYPTO_DEFINE=1
fi
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists sqlite3; then
  read -r -a SQLITE_CFLAGS <<<"$(pkg-config --cflags sqlite3)"
  read -r -a SQLITE_LIBS <<<"$(pkg-config --libs sqlite3)"
  SQLITE_DEFINE=1
fi
compile_catalog() {
"${CXX_BIN}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  ${SQLITE_CFLAGS[*]-} ${CRYPTO_CFLAGS[*]-} -DMEDIA_SERVER_USE_OPENSSL="${CRYPTO_DEFINE}" -DMEDIA_SERVER_USE_SQLITE3="${SQLITE_DEFINE}" \
  -include "${SCRIPT_DIR}/recording_journal_fd_probe.h" \
  -c "${ROOT_DIR}/src/recording/recording_journal.cpp" -o "${BUILD_DIR}/recording_journal.o"
"${CXX_BIN}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  ${SQLITE_CFLAGS[*]-} \
  "${SCRIPT_DIR}/recording_catalog_smoke.cpp" \
  "${BUILD_DIR}/recording_journal.o" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
 "${ROOT_DIR}/src/recording/recording_finalize_recovery.cpp" "${ROOT_DIR}/src/recording/recording_file_evidence.cpp" \
 "${ROOT_DIR}/src/recording/recording_media_inspector.cpp" \
  "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/recording/recording_derived_job.cpp" "${ROOT_DIR}/src/recording/recording_derived_job_ready.cpp" "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -DMEDIA_SERVER_USE_SQLITE3="${SQLITE_DEFINE}" \
  ${SQLITE_LIBS[*]-} ${CRYPTO_LIBS[*]-} \
  -o "${BUILD_DIR}/recording_catalog_smoke"
}
compile_catalog
"${BUILD_DIR}/recording_catalog_smoke" "${BUILD_DIR}"
CRYPTO_DEFINE=0
CRYPTO_CFLAGS=()
CRYPTO_LIBS=()
compile_catalog
"${BUILD_DIR}/recording_catalog_smoke" --crypto-off "${BUILD_DIR}/crypto-off"

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
  "recording_storage.Open" "composition root 관리 저장소 선행 open"
check_contains "src/recording/recording_runtime_composition.cpp" \
  'return journal_->Open(error)&&catalog_->Open(error)' "composition helper journal 다음 catalog rebuild/open"
check_contains "src/application/media_server_application.cpp" \
  "recording_supervisor.Start" "서버 전 supervisor 시작"
check_contains "src/application/media_server_application.cpp" \
  "analysis::SetEventRecordingBridge(event_recording_bridge)" "ingress 전 event bridge 등록"
check_contains "src/application/media_server_application.cpp" \
  "recording_supervisor.Stop" "ingress 종료 뒤 recorder finalize"

line_of() { grep -nF "$2" "${ROOT_DIR}/$1" | head -1 | cut -d: -f1; }
line_of_last() { grep -nF "$2" "${ROOT_DIR}/$1" | tail -1 | cut -d: -f1; }
APP_FILE="src/application/media_server_application.cpp"
STORAGE_LINE="$(line_of "${APP_FILE}" "recording_storage.Open")"
RECOVERY_LINE="$(line_of "${APP_FILE}" "RecoverRuntimeRecordingAtStartup")"
SUPERVISOR_LINE="$(line_of "${APP_FILE}" "recording_supervisor.Start")"
BRIDGE_REGISTER_LINE="$(line_of "${APP_FILE}" "analysis::SetEventRecordingBridge(event_recording_bridge)")"
RTSP_START_LINE="$(line_of "${APP_FILE}" "gst_rtsp_server.Start")"
HTTP_START_LINE="$(line_of "${APP_FILE}" "webrtc_http_server.Start")"
HTTP_STOP_LINE="$(line_of_last "${APP_FILE}" "webrtc_http_server.Stop")"
RTSP_STOP_LINE="$(line_of_last "${APP_FILE}" "gst_rtsp_server.Stop")"
SUPERVISOR_STOP_LINE="$(line_of_last "${APP_FILE}" "recording_supervisor.Stop")"
EVENT_STOP_LINE="$(line_of_last "${APP_FILE}" "analysis::StopEventStorage")"
if (( STORAGE_LINE < RECOVERY_LINE && RECOVERY_LINE < BRIDGE_REGISTER_LINE &&
      BRIDGE_REGISTER_LINE < SUPERVISOR_LINE && SUPERVISOR_LINE < RTSP_START_LINE &&
      RTSP_START_LINE < HTTP_START_LINE &&
      HTTP_STOP_LINE < RTSP_STOP_LINE && RTSP_STOP_LINE < SUPERVISOR_STOP_LINE && SUPERVISOR_STOP_LINE < EVENT_STOP_LINE )); then
  echo "[pass] composition root 시작/종료 순서"
else
  echo "[fail] composition root 시작/종료 순서" >&2
  exit 1
fi
