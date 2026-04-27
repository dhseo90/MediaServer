#!/usr/bin/env bash
# 파일 용도: 기능 개발 재개 전 smoke, 다채널, VA/event POST, cleanup, summary report를 한 번에 검증한다.
# 동작 요약: 테스트 서버를 직접 시작/종료하며 30~60분 단위 안정화 검증과 리포트 생성을 수행한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

BUILD_DIR="${MEDIA_SERVER_VERIFY_PREDEV_BUILD_DIR:-build-gst-onnx}"
RTSP_PORT="${MEDIA_SERVER_VERIFY_PREDEV_RTSP_PORT:-8555}"
HTTP_PORT="${MEDIA_SERVER_VERIFY_PREDEV_HTTP_PORT:-8081}"
HTTP_BASE="${MEDIA_SERVER_VERIFY_PREDEV_HTTP_BASE:-http://127.0.0.1:${HTTP_PORT}}"
SOAK_MINUTES="${MEDIA_SERVER_VERIFY_PREDEV_SOAK_MINUTES:-30}"
MULTICHANNEL_HOLD_MS="${MEDIA_SERVER_VERIFY_PREDEV_MULTICHANNEL_HOLD_MS:-7000}"
MULTICHANNEL_SINGLE_CLIENTS="${MEDIA_SERVER_VERIFY_PREDEV_SINGLE_CLIENTS:-2}"
MULTICHANNEL_CLIENTS_PER_SOURCE="${MEDIA_SERVER_VERIFY_PREDEV_CLIENTS_PER_SOURCE:-2}"
VA_EVENT_DURATION_S="${MEDIA_SERVER_VERIFY_PREDEV_VA_EVENT_DURATION_S:-30}"
RUN_ID="predev-$(date +%s)-$$"
WORK_DIR="/tmp/media_server_${RUN_ID}"
STEPS_FILE="${WORK_DIR}/steps.ndjson"
SUMMARY_FILE="${MEDIA_SERVER_VERIFY_PREDEV_SUMMARY_FILE:-/tmp/media_server_${RUN_ID}_summary.json}"
REPORT_FILE="${MEDIA_SERVER_VERIFY_PREDEV_REPORT_FILE:-/tmp/media_server_${RUN_ID}_report.md}"
SERVER_LOG="${WORK_DIR}/server.log"
SERVER_PID=""
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
SKIP_BUILD=0
QUICK_MODE=0

mkdir -p "${WORK_DIR}"

# 사용 가능한 옵션과 안정화 검증 기준을 출력한다.
usage() {
  cat <<EOF_USAGE
기능 개발 재개 전 안정화 검증

Usage:
  ./server.sh verify-predev [options]

Options:
  --soak-minutes <n>       다채널/VA/event POST 반복 안정화 시간. 기본 ${SOAK_MINUTES}
  --quick                  개발 중 빠른 확인. soak=1분, VA event duration=12초
  --skip-build             cmake build 단계를 생략
  --rtsp-port <port>       테스트 RTSP port. 기본 ${RTSP_PORT}
  --http-port <port>       테스트 HTTP port. 기본 ${HTTP_PORT}
  --summary-file <path>    predev summary JSON 출력 경로
  --report-file <path>     summarize-reports Markdown 출력 경로
  -h, --help               도움말 출력

기준:
  - 통합 smoke, 다채널 WebRTC, VA event, event POST schema/recovery/queue를 확인합니다.
  - 종료 시 runtime session/stream/tap cleanup과 8080/8081/8554/8555 listener 정리를 hard check합니다.
  - 외부 TURN credential이 없는 환경에서는 외부 TURN hard gate를 포함하지 않습니다.
EOF_USAGE
}

# CLI 옵션을 환경 기본값 위에 덮어쓴다.
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --soak-minutes)
        SOAK_MINUTES="${2:-}"
        shift 2
        ;;
      --quick)
        QUICK_MODE=1
        SOAK_MINUTES=1
        VA_EVENT_DURATION_S=30
        MULTICHANNEL_HOLD_MS=3500
        shift
        ;;
      --skip-build)
        SKIP_BUILD=1
        shift
        ;;
      --rtsp-port)
        RTSP_PORT="${2:-}"
        shift 2
        ;;
      --http-port)
        HTTP_PORT="${2:-}"
        HTTP_BASE="http://127.0.0.1:${HTTP_PORT}"
        shift 2
        ;;
      --summary-file)
        SUMMARY_FILE="${2:-}"
        shift 2
        ;;
      --report-file)
        REPORT_FILE="${2:-}"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "알 수 없는 verify-predev 옵션입니다: $1"
        usage
        exit 1
        ;;
    esac
  done
}

# 일반 진행 메시지를 같은 prefix로 출력한다.
log_info() { echo "[info] $*"; }

# 필수 도구가 없으면 검증을 시작하지 않는다.
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[fail] 필수 도구가 없습니다: $1"
    exit 1
  fi
}

# 양수 정수 옵션이 잘못 들어오면 조기 중단한다.
assert_non_negative_int() {
  local value="$1"
  local name="$2"
  if ! [[ "${value}" =~ ^[0-9]+$ ]]; then
    echo "[fail] ${name}은 0 이상의 정수여야 합니다: ${value}"
    exit 1
  fi
}

# step 결과를 summary에서 읽을 수 있도록 NDJSON으로 누적한다.
append_step() {
  local name="$1"
  local result="$2"
  local command="$3"
  local log_file="$4"
  local duration_sec="$5"
  python3 - "${STEPS_FILE}" "${name}" "${result}" "${command}" "${log_file}" "${duration_sec}" <<'PY'
import json
import pathlib
import sys

record = {
    "name": sys.argv[2],
    "result": sys.argv[3],
    "command": sys.argv[4],
    "logFile": sys.argv[5],
    "durationSec": float(sys.argv[6]),
}
with pathlib.Path(sys.argv[1]).open("a", encoding="utf-8") as handle:
    handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
PY
}

# shell command를 실행하고 성공/실패와 로그 경로를 기록한다.
run_step() {
  local name="$1"
  local command="$2"
  local log_file="${WORK_DIR}/${name//[^A-Za-z0-9_]/_}.log"
  local started_at="${SECONDS}"
  log_info "${name} 시작"
  if (cd "${ROOT_DIR}" && bash -lc "${command}") >"${log_file}" 2>&1; then
    local duration=$((SECONDS - started_at))
    PASS_COUNT=$((PASS_COUNT + 1))
    append_step "${name}" "pass" "${command}" "${log_file}" "${duration}"
    echo "[pass] ${name} (${duration}s)"
    return 0
  fi
  local duration=$((SECONDS - started_at))
  FAIL_COUNT=$((FAIL_COUNT + 1))
  append_step "${name}" "fail" "${command}" "${log_file}" "${duration}"
  echo "[fail] ${name} (${duration}s) log=${log_file}"
  tail -n 80 "${log_file}" || true
  return 1
}

# 지정 port에 listener가 남아 있는지 확인한다.
port_has_listener() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

# 테스트 서버 시작 전에 충돌할 port가 없는지 확인한다.
ensure_start_ports_free() {
  local busy=0
  for port in "${RTSP_PORT}" "${HTTP_PORT}"; do
    if port_has_listener "${port}"; then
      echo "[fail] port ${port}가 이미 사용 중입니다. 기존 서버를 정리한 뒤 다시 실행하세요."
      busy=1
    fi
  done
  [[ "${busy}" -eq 0 ]]
}

# health endpoint가 응답할 때까지 foreground 서버 기동을 기다린다.
wait_for_health() {
  local deadline=$((SECONDS + 60))
  while (( SECONDS < deadline )); do
    if curl -fsS --max-time 2 "${HTTP_BASE}/health" >/dev/null 2>&1; then
      return 0
    fi
    if [[ -n "${SERVER_PID}" ]] && ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
      return 1
    fi
    sleep 1
  done
  return 1
}

# event POST 설정을 포함한 테스트 서버를 foreground script 기반 background process로 시작한다.
start_server() {
  local queue_size="$1"
  if ! ensure_start_ports_free; then
    FAIL_COUNT=$((FAIL_COUNT + 1))
    append_step "server-start" "fail" "port preflight" "${SERVER_LOG}" 0
    return 1
  fi
  log_info "server 시작: rtsp=${RTSP_PORT} http=${HTTP_PORT} eventPostQueue=${queue_size}"
  (
    cd "${ROOT_DIR}"
    MEDIA_SERVER_BUILD_DIR="${BUILD_DIR}" \
    MEDIA_SERVER_SKIP_BUILD=1 \
    MEDIA_SERVER_LISTEN_PORT="${RTSP_PORT}" \
    MEDIA_SERVER_HTTP_LISTEN_PORT="${HTTP_PORT}" \
    MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 \
    MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE="${queue_size}" \
      ./scripts/internal/run_server_foreground.sh
  ) >"${SERVER_LOG}" 2>&1 &
  SERVER_PID="$!"
  if wait_for_health; then
    PASS_COUNT=$((PASS_COUNT + 1))
    append_step "server-start-queue-${queue_size}" "pass" "run_server_foreground" "${SERVER_LOG}" 0
    echo "[pass] server 시작 pid=${SERVER_PID}"
    return 0
  fi
  FAIL_COUNT=$((FAIL_COUNT + 1))
  append_step "server-start-queue-${queue_size}" "fail" "run_server_foreground" "${SERVER_LOG}" 60
  echo "[fail] server 시작 실패 log=${SERVER_LOG}"
  tail -n 120 "${SERVER_LOG}" || true
  return 1
}

# runtime status가 idle 상태인지 확인한다.
assert_runtime_idle() {
  local name="$1"
  local log_file="${WORK_DIR}/${name//[^A-Za-z0-9_]/_}.json"
  local status=""
  local deadline=$((SECONDS + 60))
  while (( SECONDS < deadline )); do
    status="$(curl -fsS --max-time 3 "${HTTP_BASE}/lab/runtime/status" || printf '{}')"
    printf '%s\n' "${status}" >"${log_file}"
    if python3 - "${log_file}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8") or "{}")
session = payload.get("sessionManager") or {}
webrtc = payload.get("webrtcHttp") or {}
checks = {
    "activeSessions": session.get("activeSessions", 0),
    "resourceActiveStreams": session.get("resourceActiveStreams", 0),
    "registryActiveStreams": session.get("registryActiveStreams", 0),
    "activeAnalysisTaps": session.get("activeAnalysisTaps", 0),
    "egressSessions": webrtc.get("egressSessions", 0),
}
bad = {key: value for key, value in checks.items() if int(value or 0) != 0}
if bad:
    print(json.dumps(bad, ensure_ascii=False))
    raise SystemExit(1)
PY
    then
      PASS_COUNT=$((PASS_COUNT + 1))
      append_step "${name}" "pass" "runtime idle check" "${log_file}" 0
      echo "[pass] ${name}"
      return 0
    fi
    sleep 1
  done
  FAIL_COUNT=$((FAIL_COUNT + 1))
  append_step "${name}" "fail" "runtime idle check" "${log_file}" 0
  echo "[fail] ${name} log=${log_file}"
  cat "${log_file}"
  return 1
}

# 서버 process를 종료하고 wait한다.
stop_server() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    log_info "server 종료 pid=${SERVER_PID}"
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
  SERVER_PID=""
  for port in "${RTSP_PORT}" "${HTTP_PORT}"; do
    while IFS= read -r pid; do
      [[ -n "${pid}" ]] || continue
      kill "${pid}" >/dev/null 2>&1 || true
      wait "${pid}" >/dev/null 2>&1 || true
    done < <(lsof -nP -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
  done
  sleep 1
}

# 검증 종료 후 대표 port listener가 남지 않았는지 확인한다.
assert_ports_clean() {
  local log_file="${WORK_DIR}/ports-clean.log"
  : >"${log_file}"
  local busy=0
  for port in 8080 8081 8554 8555; do
    if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >>"${log_file}" 2>&1; then
      busy=1
    fi
  done
  if [[ "${busy}" -eq 0 ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    append_step "ports-clean" "pass" "lsof representative ports" "${log_file}" 0
    echo "[pass] ports-clean"
    return 0
  fi
  FAIL_COUNT=$((FAIL_COUNT + 1))
  append_step "ports-clean" "fail" "lsof representative ports" "${log_file}" 0
  echo "[fail] ports-clean log=${log_file}"
  cat "${log_file}"
  return 1
}

# event POST queue 모드처럼 별도 서버 설정이 필요한 검증을 위해 서버를 재기동한다.
restart_server_with_queue() {
  local queue_size="$1"
  stop_server
  start_server "${queue_size}"
}

# 지정 시간 동안 다채널, VA event, event POST schema/recovery를 반복 실행한다.
run_soak_loop() {
  local deadline=$((SECONDS + SOAK_MINUTES * 60))
  local iteration=1
  if [[ "${SOAK_MINUTES}" -eq 0 ]]; then
    echo "[skip] soak loop: --soak-minutes 0"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    append_step "soak-loop" "skip" "disabled" "" 0
    return 0
  fi
  while (( SECONDS < deadline || iteration == 1 )); do
    log_info "soak iteration ${iteration} 시작"
    run_step "soak-${iteration}-multichannel" \
      "MEDIA_SERVER_LISTEN_PORT=${RTSP_PORT} MEDIA_SERVER_HTTP_LISTEN_PORT=${HTTP_PORT} ./server.sh verify-multichannel --http-base ${HTTP_BASE} --include-va --repeat 1 --single-clients ${MULTICHANNEL_SINGLE_CLIENTS} --clients-per-source ${MULTICHANNEL_CLIENTS_PER_SOURCE} --hold-ms ${MULTICHANNEL_HOLD_MS}" || true
    run_step "soak-${iteration}-va-events" \
      "MEDIA_SERVER_HTTP_LISTEN_PORT=${HTTP_PORT} MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=${VA_EVENT_DURATION_S} ./server.sh verify-va-events --duration ${VA_EVENT_DURATION_S}" || true
    run_step "soak-${iteration}-event-post-schema" \
      "MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=${HTTP_BASE} ./server.sh verify-event-post --mode schema" || true
    run_step "soak-${iteration}-event-post-recovery" \
      "MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=${HTTP_BASE} ./server.sh verify-event-post --mode recovery" || true
    assert_runtime_idle "soak-${iteration}-runtime-idle" || true
    iteration=$((iteration + 1))
  done
}

# 전체 predev summary JSON을 생성한다.
write_summary() {
  local duration_sec="$1"
  python3 - "${SUMMARY_FILE}" "${STEPS_FILE}" "${PASS_COUNT}" "${FAIL_COUNT}" "${SKIP_COUNT}" "${duration_sec}" "${REPORT_FILE}" "${SOAK_MINUTES}" "${QUICK_MODE}" <<'PY'
import json
import pathlib
import sys

steps = []
steps_path = pathlib.Path(sys.argv[2])
if steps_path.exists():
    for line in steps_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            steps.append(json.loads(line))
summary = {
    "kind": "predev",
    "pass": int(sys.argv[3]),
    "fail": int(sys.argv[4]),
    "skip": int(sys.argv[5]),
    "durationSec": int(float(sys.argv[6])),
    "reportFile": sys.argv[7],
    "soakMinutes": int(sys.argv[8]),
    "quickMode": sys.argv[9] == "1",
    "steps": steps,
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
  echo "[info] predev summary=${SUMMARY_FILE}"
}

# 종료 시 남은 서버를 반드시 정리한다.
cleanup() {
  stop_server
}
trap cleanup EXIT

# predev 안정화 검증을 순서대로 실행한다.
main() {
  parse_args "$@"
  assert_non_negative_int "${SOAK_MINUTES}" "soak-minutes"
  require_cmd bash
  require_cmd cmake
  require_cmd curl
  require_cmd lsof
  require_cmd node
  require_cmd python3

  local started_at="${SECONDS}"
  : >"${STEPS_FILE}"

  if [[ "${SKIP_BUILD}" -eq 0 ]]; then
    run_step "build" "cmake --build ${BUILD_DIR}" || true
  else
    SKIP_COUNT=$((SKIP_COUNT + 1))
    append_step "build" "skip" "--skip-build" "" 0
    echo "[skip] build: --skip-build"
  fi

  start_server 256 || true
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    run_step "integrated-smoke" \
      "MEDIA_SERVER_LISTEN_PORT=${RTSP_PORT} MEDIA_SERVER_HTTP_LISTEN_PORT=${HTTP_PORT} ./server.sh test --no-start --include-rules --include-rule-ui --include-va-events --include-image-analysis" || true
    run_soak_loop
    assert_runtime_idle "main-runtime-idle" || true
  fi

  if restart_server_with_queue 2; then
    run_step "event-post-queue" \
      "MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE=${HTTP_BASE} ./server.sh verify-event-post --mode queue" || true
    assert_runtime_idle "queue-runtime-idle" || true
  fi
  stop_server
  assert_ports_clean || true

  write_summary "$((SECONDS - started_at))"
  run_step "summary-report" \
    "./server.sh summarize-reports /tmp/media_server_*summary*.json --output ${REPORT_FILE}" || true
  write_summary "$((SECONDS - started_at))"

  echo
  echo "== predev 안정화 검증 요약 =="
  echo "- 통과: ${PASS_COUNT}"
  echo "- 실패: ${FAIL_COUNT}"
  echo "- 건너뜀: ${SKIP_COUNT}"
  echo "- summary: ${SUMMARY_FILE}"
  echo "- report: ${REPORT_FILE}"
  echo "- logs: ${WORK_DIR}"
  if [[ "${FAIL_COUNT}" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
