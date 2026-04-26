#!/usr/bin/env bash
# 파일 용도: WebRTC 다채널 client가 같은 source와 여러 source를 동시에 소비할 때 fan-out/dedup 상태를 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

HTTP_BASE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_HTTP_BASE:-http://127.0.0.1:8081}"
PAGE_PATH="${MEDIA_SERVER_VERIFY_MULTICHANNEL_PAGE_PATH:-/webrtc/test}"
SINGLE_SOURCE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_SINGLE_SOURCE:-sample_h264.mp4}"
MULTI_SOURCES_CSV="${MEDIA_SERVER_VERIFY_MULTICHANNEL_SOURCES:-sample_h264.mp4,va_four_scene_sample.mp4}"
SINGLE_CLIENTS="${MEDIA_SERVER_VERIFY_MULTICHANNEL_SINGLE_CLIENTS:-3}"
CLIENTS_PER_SOURCE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_CLIENTS_PER_SOURCE:-2}"
HOLD_MS="${MEDIA_SERVER_VERIFY_MULTICHANNEL_HOLD_MS:-10000}"
TIMEOUT_MS="${MEDIA_SERVER_VERIFY_MULTICHANNEL_TIMEOUT_MS:-60000}"
CONSUMER_TIMEOUT_MS="${MEDIA_SERVER_VERIFY_MULTICHANNEL_CONSUMER_TIMEOUT_MS:-35000}"
DEBUG_PORT_BASE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_DEBUG_PORT_BASE:-9400}"
SUMMARY_FILE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_SUMMARY_FILE:-/tmp/media_server_multichannel_summary_$$.json}"

RUN_SINGLE=1
RUN_MULTI=1
PASS_COUNT=0
FAIL_COUNT=0
CLIENT_RUN_INDEX=0
STARTED_CLIENT_PID=""

# 일반 진행 메시지를 출력한다.
log_info() {
  echo "[info] $*"
}

# 통과 항목을 기록하고 summary counter를 올린다.
log_pass() {
  echo "[pass] $*"
  PASS_COUNT=$((PASS_COUNT + 1))
}

# 실패 항목을 기록하고 summary counter를 올린다.
log_fail() {
  echo "[fail] $*"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

# CLI 옵션과 기본값을 안내한다.
usage() {
  cat <<EOF_USAGE
Usage:
  ./server.sh verify-multichannel [options]

Options:
  --http-base <url>            기본값: ${HTTP_BASE}
  --single-source <file>       같은 영상 다중 client 검증 파일
  --sources <a,b>              여러 영상 다중 client 검증 파일 목록
  --single-clients <n>         같은 영상에 붙일 client 수
  --clients-per-source <n>     여러 영상 검증에서 source마다 붙일 client 수
  --hold-ms <ms>               재생 확인 후 session 유지 시간
  --debug-port-base <port>     headless Chrome CDP 시작 port
  --single-only                같은 영상 다중 client 검증만 실행
  --multi-only                 여러 영상 다중 client 검증만 실행
EOF_USAGE
}

parse_args() {
  # shell wrapper에서도 동일한 검증을 재현할 수 있도록 주요 값을 CLI/env 양쪽에서 받는다.
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --http-base)
        HTTP_BASE="${2:-}"
        shift 2
        ;;
      --single-source)
        SINGLE_SOURCE="${2:-}"
        shift 2
        ;;
      --sources)
        MULTI_SOURCES_CSV="${2:-}"
        shift 2
        ;;
      --single-clients)
        SINGLE_CLIENTS="${2:-}"
        shift 2
        ;;
      --clients-per-source)
        CLIENTS_PER_SOURCE="${2:-}"
        shift 2
        ;;
      --hold-ms)
        HOLD_MS="${2:-}"
        shift 2
        ;;
      --debug-port-base)
        DEBUG_PORT_BASE="${2:-}"
        shift 2
        ;;
      --single-only)
        RUN_MULTI=0
        shift
        ;;
      --multi-only)
        RUN_SINGLE=0
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "[verify] unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
  HTTP_BASE="${HTTP_BASE%/}"
}

# 검증에 필요한 외부 명령이 있는지 확인한다.
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[verify] missing required command: $1"
    exit 1
  fi
}

# 서버 runtime status endpoint에서 현재 session/stream 숫자를 가져온다.
runtime_status() {
  curl -fsS --max-time 3 "${HTTP_BASE}/lab/runtime/status"
}

# 간단한 dotted path로 JSON 숫자 필드를 추출한다.
json_number() {
  local json_text="$1"
  local path="$2"
  python3 - "${json_text}" "${path}" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
value = payload
for key in sys.argv[2].split("."):
    value = value.get(key, 0) if isinstance(value, dict) else 0
print(int(value or 0))
PY
}

# 쉼표로 받은 source 목록을 줄 단위로 바꾼다.
csv_to_lines() {
  local csv="$1"
  python3 - "${csv}" <<'PY'
import sys

for item in sys.argv[1].split(","):
    value = item.strip()
    if value:
        print(value)
PY
}

# 양수 정수 옵션이 잘못 들어온 경우 검증을 중단한다.
assert_positive_int() {
  local value="$1"
  local name="$2"
  if ! [[ "${value}" =~ ^[0-9]+$ ]] || [[ "${value}" -le 0 ]]; then
    echo "[verify] ${name} must be a positive integer: ${value}"
    exit 1
  fi
}

# 기본 file root 아래에 검증용 source 파일이 있는지 먼저 확인한다.
assert_source_file_exists() {
  local file_name="$1"
  local file_path="${ROOT_DIR}/video/${file_name}"
  if [[ ! -f "${file_path}" ]]; then
    echo "[verify] missing source file: ${file_path}"
    exit 1
  fi
}

# 이전 검증의 idle stream이 사라져 stream 수 판정이 깨끗해질 때까지 기다린다.
wait_for_idle_runtime() {
  # 이전 검증의 file/VOD idle grace가 남아 있으면 stream 수 판정이 흐려지므로 시작 전에 비어질 때까지 기다린다.
  local deadline=$((SECONDS + 35))
  local last_status=""
  while (( SECONDS < deadline )); do
    last_status="$(runtime_status || true)"
    if [[ -n "${last_status}" ]]; then
      local active_sessions resource_streams egress_sessions
      active_sessions="$(json_number "${last_status}" "sessionManager.activeSessions")"
      resource_streams="$(json_number "${last_status}" "sessionManager.resourceActiveStreams")"
      egress_sessions="$(json_number "${last_status}" "webrtcHttp.egressSessions")"
      if [[ "${active_sessions}" -eq 0 && "${resource_streams}" -eq 0 && "${egress_sessions}" -eq 0 ]]; then
        return 0
      fi
    fi
    sleep 0.5
  done
  log_fail "runtime idle 대기 실패"
  [[ -n "${last_status}" ]] && echo "${last_status}" | sed 's/^/  /'
  return 1
}

# 동시 client가 붙은 동안 session 수와 dedup stream 수가 기대값과 일치하는지 반복 확인한다.
wait_for_runtime_counts() {
  local label="$1"
  local expected_sessions="$2"
  local expected_streams="$3"
  local deadline=$((SECONDS + 45))
  local last_status=""
  while (( SECONDS < deadline )); do
    last_status="$(runtime_status || true)"
    if [[ -n "${last_status}" ]]; then
      local active_sessions resource_streams registry_streams egress_sessions
      active_sessions="$(json_number "${last_status}" "sessionManager.activeSessions")"
      resource_streams="$(json_number "${last_status}" "sessionManager.resourceActiveStreams")"
      registry_streams="$(json_number "${last_status}" "sessionManager.registryActiveStreams")"
      egress_sessions="$(json_number "${last_status}" "webrtcHttp.egressSessions")"
      if [[ "${active_sessions}" -eq "${expected_sessions}" &&
            "${egress_sessions}" -eq "${expected_sessions}" &&
            "${resource_streams}" -eq "${expected_streams}" &&
            "${registry_streams}" -eq "${expected_streams}" ]]; then
        log_pass "${label}: runtime activeSessions=${active_sessions}, activeStreams=${resource_streams}"
        return 0
      fi
    fi
    sleep 0.5
  done
  log_fail "${label}: runtime count mismatch"
  [[ -n "${last_status}" ]] && echo "${last_status}" | sed 's/^/  /'
  return 1
}

# 하나의 headless Chrome client를 띄워 지정 file source를 WebRTC로 재생한다.
start_client() {
  local label="$1"
  local file_name="$2"
  local debug_port="$3"
  local log_file="$4"

  # 각 client는 독립 headless Chrome을 사용해 실제 WebRTC media playback까지 확인한다.
  node "${SCRIPT_DIR}/browser_webrtc_publish_consume_check.mjs" \
    --http-base "${HTTP_BASE}" \
    --page-path "${PAGE_PATH}" \
    --mode simple \
    --file "${file_name}" \
    --debug-port "${debug_port}" \
    --post-playback-hold-ms "${HOLD_MS}" \
    --consumer-playback-timeout-ms "${CONSUMER_TIMEOUT_MS}" \
    --timeout-ms "${TIMEOUT_MS}" \
    > "${log_file}" 2>&1 &
  STARTED_CLIENT_PID="$!"
}

# 모든 client 프로세스가 playback 검증을 통과했는지 확인하고 실패 로그를 보여준다.
wait_clients() {
  local label="$1"
  shift
  local failed=0
  local pid log_file
  while [[ $# -gt 0 ]]; do
    pid="$1"
    log_file="$2"
    shift 2
    if ! wait "${pid}"; then
      failed=1
      log_fail "${label}: client failed pid=${pid} log=${log_file}"
      tail -n 80 "${log_file}" || true
    fi
  done
  if [[ "${failed}" -eq 0 ]]; then
    log_pass "${label}: 모든 client playback 통과"
    return 0
  fi
  return 1
}

# 같은 source/여러 source 케이스를 공통 절차로 실행한다.
run_multichannel_case() {
  local label="$1"
  local expected_streams="$2"
  shift 2
  local files=("$@")
  local expected_sessions="${#files[@]}"
  local pairs=()
  local source_file debug_port log_file pid

  wait_for_idle_runtime || return 1
  log_info "${label}: clients=${expected_sessions}, expectedStreams=${expected_streams}, holdMs=${HOLD_MS}"

  for source_file in "${files[@]}"; do
    CLIENT_RUN_INDEX=$((CLIENT_RUN_INDEX + 1))
    debug_port=$((DEBUG_PORT_BASE + CLIENT_RUN_INDEX))
    log_file="/tmp/media_server_multichannel_${label//[^A-Za-z0-9_]/_}_${CLIENT_RUN_INDEX}.log"
    start_client "${label}" "${source_file}" "${debug_port}" "${log_file}"
    pid="${STARTED_CLIENT_PID}"
    pairs+=("${pid}" "${log_file}")
    log_info "${label}: client pid=${pid} file=${source_file} debugPort=${debug_port}"
  done

  wait_for_runtime_counts "${label}" "${expected_sessions}" "${expected_streams}" || true
  wait_clients "${label}" "${pairs[@]}" || return 1
  wait_for_idle_runtime || return 1
}

# 마지막 runtime 상태와 pass/fail 카운터를 JSON 파일로 남긴다.
write_summary() {
  # CI와 수동 점검에서 같은 결과를 참조할 수 있도록 마지막 카운터를 JSON으로 남긴다.
  local status_json
  status_json="$(runtime_status || printf '{}')"
  python3 - "${SUMMARY_FILE}" "${PASS_COUNT}" "${FAIL_COUNT}" "${HTTP_BASE}" "${status_json}" <<'PY'
import json
import pathlib
import sys

out = {
    "pass": int(sys.argv[2]),
    "fail": int(sys.argv[3]),
    "httpBase": sys.argv[4],
    "finalStatus": json.loads(sys.argv[5] or "{}"),
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
PY
  log_info "summary=${SUMMARY_FILE}"
}

# 입력 검증, 단일 source fan-out, 다중 source fan-out 검증을 순서대로 실행한다.
main() {
  parse_args "$@"
  require_cmd curl
  require_cmd node
  require_cmd python3
  assert_positive_int "${SINGLE_CLIENTS}" "single-clients"
  assert_positive_int "${CLIENTS_PER_SOURCE}" "clients-per-source"
  assert_positive_int "${HOLD_MS}" "hold-ms"
  assert_positive_int "${DEBUG_PORT_BASE}" "debug-port-base"

  if ! runtime_status >/dev/null; then
    echo "[verify] runtime status API unavailable: ${HTTP_BASE}/lab/runtime/status"
    echo "[verify] start server first, for example: MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh foreground"
    exit 1
  fi

  if [[ "${RUN_SINGLE}" -eq 1 ]]; then
    assert_source_file_exists "${SINGLE_SOURCE}"
    local single_files=()
    for _ in $(seq 1 "${SINGLE_CLIENTS}"); do
      single_files+=("${SINGLE_SOURCE}")
    done
    run_multichannel_case "single-source" 1 "${single_files[@]}" || true
  fi

  if [[ "${RUN_MULTI}" -eq 1 ]]; then
    local multi_files=()
    local unique_sources=0
    while IFS= read -r source_file; do
      assert_source_file_exists "${source_file}"
      unique_sources=$((unique_sources + 1))
      for _ in $(seq 1 "${CLIENTS_PER_SOURCE}"); do
        multi_files+=("${source_file}")
      done
    done < <(csv_to_lines "${MULTI_SOURCES_CSV}")
    if [[ "${unique_sources}" -eq 0 ]]; then
      echo "[verify] --sources must include at least one file"
      exit 1
    fi
    run_multichannel_case "multi-source" "${unique_sources}" "${multi_files[@]}" || true
  fi

  write_summary
  echo
  echo "[summary] pass=${PASS_COUNT} fail=${FAIL_COUNT}"
  if [[ "${FAIL_COUNT}" -ne 0 ]]; then
    exit 1
  fi
}

main "$@"
