#!/usr/bin/env bash
# 파일 용도: WebRTC 다채널 client가 같은 source와 여러 source를 동시에 소비할 때 fan-out/dedup 상태를 검증한다.
# 동작 요약: headless Chrome playback, runtime session/stream/tap count, 반복 실행 summary를 함께 남긴다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

HTTP_BASE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_HTTP_BASE:-http://127.0.0.1:8081}"
PAGE_PATH="${MEDIA_SERVER_VERIFY_MULTICHANNEL_PAGE_PATH:-/webrtc/test}"
VA_PAGE_PATH="${MEDIA_SERVER_VERIFY_MULTICHANNEL_VA_PAGE_PATH:-/lab}"
SINGLE_SOURCE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_SINGLE_SOURCE:-sample_h264.mp4}"
MULTI_SOURCES_CSV="${MEDIA_SERVER_VERIFY_MULTICHANNEL_SOURCES:-sample_h264.mp4,va_four_scene_sample.mp4}"
VA_SINGLE_SOURCE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_VA_SINGLE_SOURCE:-va_four_scene_sample.mp4}"
VA_SOURCES_CSV="${MEDIA_SERVER_VERIFY_MULTICHANNEL_VA_SOURCES:-va_four_scene_sample.mp4,imports/va_tracking_event_1280x720_30fps_h264.mp4}"
SINGLE_CLIENTS="${MEDIA_SERVER_VERIFY_MULTICHANNEL_SINGLE_CLIENTS:-3}"
CLIENTS_PER_SOURCE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_CLIENTS_PER_SOURCE:-2}"
REPEAT_COUNT="${MEDIA_SERVER_VERIFY_MULTICHANNEL_REPEAT:-1}"
HOLD_MS="${MEDIA_SERVER_VERIFY_MULTICHANNEL_HOLD_MS:-10000}"
TIMEOUT_MS="${MEDIA_SERVER_VERIFY_MULTICHANNEL_TIMEOUT_MS:-60000}"
CONSUMER_TIMEOUT_MS="${MEDIA_SERVER_VERIFY_MULTICHANNEL_CONSUMER_TIMEOUT_MS:-35000}"
DEBUG_PORT_BASE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_DEBUG_PORT_BASE:-9400}"
VA_ANALYSIS_FPS="${MEDIA_SERVER_VERIFY_MULTICHANNEL_VA_FPS:-5}"
VA_REDACTION_MODE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_VA_REDACTION:-}"
VA_REDACTION_CLASSES="${MEDIA_SERVER_VERIFY_MULTICHANNEL_VA_REDACTION_CLASSES:-}"
VA_REDACTION_BLOCK_SIZE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_VA_REDACTION_BLOCK_SIZE:-}"
VA_REDACTION_MARGIN_RATIO="${MEDIA_SERVER_VERIFY_MULTICHANNEL_VA_REDACTION_MARGIN_RATIO:-}"
RUN_ID="multichannel-$(date +%s)-$$"
SUMMARY_FILE="${MEDIA_SERVER_VERIFY_MULTICHANNEL_SUMMARY_FILE:-/tmp/media_server_${RUN_ID}_summary.json}"
CASES_FILE="/tmp/media_server_${RUN_ID}_cases.ndjson"

RUN_SINGLE=1
RUN_MULTI=1
RUN_VA="${MEDIA_SERVER_VERIFY_MULTICHANNEL_INCLUDE_VA:-0}"
PASS_COUNT=0
FAIL_COUNT=0
CLIENT_RUN_INDEX=0
STARTED_CLIENT_PID=""
MATCHED_RUNTIME_STATUS=""

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
  --va-single-source <file>    VA overlay 같은 영상 다중 client 검증 파일
  --va-sources <a,b>           VA overlay 여러 영상 다중 client 검증 파일 목록
  --single-clients <n>         같은 영상에 붙일 client 수
  --clients-per-source <n>     여러 영상 검증에서 source마다 붙일 client 수
  --repeat <n>                 전체 case 반복 횟수
  --hold-ms <ms>               재생 확인 후 session 유지 시간
  --debug-port-base <port>     headless Chrome CDP 시작 port
  --include-va                 VA overlay 다채널 case도 실행
  --va-redaction <mode>        VA 다채널 overlay에 redaction mode를 적용. 예: person-mosaic
  --va-redaction-classes <csv> VA redaction 대상 category/class. 기본 person
  --va-redaction-block-size <n>
  --va-redaction-margin-ratio <n>
  --single-only                같은 영상 다중 client 검증만 실행
  --multi-only                 여러 영상 다중 client 검증만 실행
  --va-only                    VA overlay 다채널 case만 실행
EOF_USAGE
}

# shell wrapper에서도 동일한 검증을 재현할 수 있도록 주요 값을 CLI/env 양쪽에서 받는다.
parse_args() {
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
      --va-single-source)
        VA_SINGLE_SOURCE="${2:-}"
        shift 2
        ;;
      --va-sources)
        VA_SOURCES_CSV="${2:-}"
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
      --repeat)
        REPEAT_COUNT="${2:-}"
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
      --include-va)
        RUN_VA=1
        shift
        ;;
      --va-redaction)
        VA_REDACTION_MODE="${2:-}"
        shift 2
        ;;
      --va-redaction-classes)
        VA_REDACTION_CLASSES="${2:-}"
        shift 2
        ;;
      --va-redaction-block-size)
        VA_REDACTION_BLOCK_SIZE="${2:-}"
        shift 2
        ;;
      --va-redaction-margin-ratio)
        VA_REDACTION_MARGIN_RATIO="${2:-}"
        shift 2
        ;;
      --single-only)
        RUN_SINGLE=1
        RUN_MULTI=0
        RUN_VA=0
        shift
        ;;
      --multi-only)
        RUN_SINGLE=0
        RUN_MULTI=1
        RUN_VA=0
        shift
        ;;
      --va-only)
        RUN_SINGLE=0
        RUN_MULTI=0
        RUN_VA=1
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

# 실패한 browser client가 session DELETE까지 도달하지 못한 경우 남은 analysis tap을 명시적으로 정리한다.
cleanup_active_analysis_taps() {
  local status_json="${1:-}"
  if [[ -z "${status_json}" ]]; then
    status_json="$(runtime_status || printf '{}')"
  fi
  python3 - "${status_json}" <<'PY' | while IFS= read -r tap_id; do
import json
import sys

text = sys.argv[1] or "{}"
payload = {}
while text:
    try:
        payload = json.loads(text)
        break
    except json.JSONDecodeError:
        if not text.endswith("}"):
            payload = {}
            break
        text = text[:-1]
for tap in ((payload.get("analysisMatching") or {}).get("activeTaps") or []):
    tap_id = str(tap.get("tapId") or "").strip()
    if tap_id:
        print(tap_id)
PY
    [[ -n "${tap_id}" ]] || continue
    log_info "남은 analysis tap 정리: ${tap_id}"
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${tap_id}" >/dev/null 2>&1 || true
  done
}

# 간단한 dotted path로 JSON 숫자 필드를 추출한다.
json_number() {
  local json_text="$1"
  local path="$2"
  python3 - "${json_text}" "${path}" <<'PY'
import json
import sys

def parse_json(text):
    while text:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            if not text.endswith("}"):
                raise
            text = text[:-1]
    return {}

payload = parse_json(sys.argv[1])
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

# 배열 값을 summary에 넣기 쉬운 쉼표 구분 문자열로 만든다.
join_by_comma() {
  local IFS=","
  echo "$*"
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

# status JSON을 파일에 쓰기 전에 파싱 가능한 형태로 정규화한다.
write_status_json_file() {
  local output_file="$1"
  local json_text="${2:-{}}"
  python3 - "${output_file}" "${json_text}" <<'PY'
import json
import pathlib
import sys

text = sys.argv[2] or "{}"
payload = {}
while text:
    try:
        payload = json.loads(text)
        break
    except json.JSONDecodeError:
        if not text.endswith("}"):
            payload = {}
            break
        text = text[:-1]
pathlib.Path(sys.argv[1]).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
PY
}

# 이전 검증의 idle stream/tap이 사라져 stream 수 판정이 깨끗해질 때까지 기다린다.
wait_for_idle_runtime() {
  local deadline=$((SECONDS + 35))
  local last_status=""
  while (( SECONDS < deadline )); do
    last_status="$(runtime_status || true)"
    if [[ -n "${last_status}" ]]; then
      local active_sessions resource_streams egress_sessions analysis_taps
      active_sessions="$(json_number "${last_status}" "sessionManager.activeSessions")"
      resource_streams="$(json_number "${last_status}" "sessionManager.resourceActiveStreams")"
      egress_sessions="$(json_number "${last_status}" "webrtcHttp.egressSessions")"
      analysis_taps="$(json_number "${last_status}" "sessionManager.activeAnalysisTaps")"
      if [[ "${active_sessions}" -eq 0 &&
            "${resource_streams}" -eq 0 &&
            "${egress_sessions}" -eq 0 &&
            "${analysis_taps}" -eq 0 ]]; then
        MATCHED_RUNTIME_STATUS="${last_status}"
        return 0
      fi
    fi
    sleep 0.5
  done
  log_fail "runtime idle 대기 실패"
  [[ -n "${last_status}" ]] && echo "${last_status}" | sed 's/^/  /'
  return 1
}

# 동시 client가 붙은 동안 session 수, dedup stream 수, analysis tap 수가 기대값과 일치하는지 반복 확인한다.
wait_for_runtime_counts() {
  local label="$1"
  local expected_sessions="$2"
  local expected_streams="$3"
  local expected_analysis_taps="$4"
  local deadline=$((SECONDS + 45))
  local last_status=""
  MATCHED_RUNTIME_STATUS=""
  while (( SECONDS < deadline )); do
    last_status="$(runtime_status || true)"
    if [[ -n "${last_status}" ]]; then
      local active_sessions resource_streams registry_streams egress_sessions analysis_taps
      active_sessions="$(json_number "${last_status}" "sessionManager.activeSessions")"
      resource_streams="$(json_number "${last_status}" "sessionManager.resourceActiveStreams")"
      registry_streams="$(json_number "${last_status}" "sessionManager.registryActiveStreams")"
      egress_sessions="$(json_number "${last_status}" "webrtcHttp.egressSessions")"
      analysis_taps="$(json_number "${last_status}" "sessionManager.activeAnalysisTaps")"
      if [[ "${active_sessions}" -eq "${expected_sessions}" &&
            "${egress_sessions}" -eq "${expected_sessions}" &&
            "${resource_streams}" -eq "${expected_streams}" &&
            "${registry_streams}" -eq "${expected_streams}" &&
            "${analysis_taps}" -eq "${expected_analysis_taps}" ]]; then
        MATCHED_RUNTIME_STATUS="${last_status}"
        log_pass "${label}: runtime activeSessions=${active_sessions}, activeStreams=${resource_streams}, activeAnalysisTaps=${analysis_taps}"
        return 0
      fi
    fi
    sleep 0.5
  done
  log_fail "${label}: runtime count mismatch"
  [[ -n "${last_status}" ]] && echo "${last_status}" | sed 's/^/  /'
  MATCHED_RUNTIME_STATUS="${last_status}"
  return 1
}

# 하나의 headless Chrome client를 띄워 지정 file source를 WebRTC로 재생한다.
start_client() {
  local file_name="$1"
  local debug_port="$2"
  local log_file="$3"
  local va_enabled="$4"
  local page_path="${PAGE_PATH}"
  local command=(node "${SCRIPT_DIR}/browser_webrtc_publish_consume_check.mjs"
    --http-base "${HTTP_BASE}"
    --mode simple
    --file "${file_name}"
    --debug-port "${debug_port}"
    --post-playback-hold-ms "${HOLD_MS}"
    --consumer-playback-timeout-ms "${CONSUMER_TIMEOUT_MS}"
    --timeout-ms "${TIMEOUT_MS}")

  if [[ "${va_enabled}" == "1" ]]; then
    page_path="${VA_PAGE_PATH}"
    command+=(--va --analysis-fps "${VA_ANALYSIS_FPS}")
    if [[ -n "${VA_REDACTION_MODE}" ]]; then
      command+=(--redaction "${VA_REDACTION_MODE}")
    fi
    if [[ -n "${VA_REDACTION_CLASSES}" ]]; then
      command+=(--redaction-classes "${VA_REDACTION_CLASSES}")
    fi
    if [[ -n "${VA_REDACTION_BLOCK_SIZE}" ]]; then
      command+=(--redaction-block-size "${VA_REDACTION_BLOCK_SIZE}")
    fi
    if [[ -n "${VA_REDACTION_MARGIN_RATIO}" ]]; then
      command+=(--redaction-margin-ratio "${VA_REDACTION_MARGIN_RATIO}")
    fi
  fi
  command+=(--page-path "${page_path}")

  # 각 client는 독립 headless Chrome을 사용해 실제 WebRTC media playback까지 확인한다.
  "${command[@]}" > "${log_file}" 2>&1 &
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

# case 실행 결과를 NDJSON으로 남겨 마지막 summary에서 상세 배열로 합친다.
append_case_summary() {
  local label="$1"
  local iteration="$2"
  local va_enabled="$3"
  local expected_sessions="$4"
  local expected_streams="$5"
  local expected_analysis_taps="$6"
  local result="$7"
  local sources_csv="$8"
  local logs_csv="$9"
  local active_status_file="${10:-}"
  local final_status_file="${11:-}"
  python3 - "${CASES_FILE}" "${label}" "${iteration}" "${va_enabled}" \
    "${expected_sessions}" "${expected_streams}" "${expected_analysis_taps}" \
    "${result}" "${sources_csv}" "${logs_csv}" "${active_status_file}" "${final_status_file}" <<'PY'
import json
import pathlib
import sys

def parse_json_file(path):
    if not path:
        return {}
    try:
        return json.loads(pathlib.Path(path).read_text(encoding="utf-8") or "{}")
    except (OSError, json.JSONDecodeError):
        return {}

def parse_browser_log(path):
    report = {"logFile": path}
    try:
        text = pathlib.Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        report["error"] = str(exc)
        return report
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < start:
        report["error"] = "missing JSON report"
        return report
    try:
        payload = json.loads(text[start:end + 1])
    except json.JSONDecodeError as exc:
        report["error"] = f"invalid JSON report: {exc}"
        return report
    state = payload.get("state") or payload.get("publisherState") or {}
    stats = state.get("stats") or {}
    report.update({
        "ok": bool(payload.get("ok")),
        "mode": payload.get("mode"),
        "sourceId": payload.get("sourceId"),
        "connectionState": state.get("consumerConnectionState") or state.get("publisherConnectionState") or "",
        "iceConnectionState": state.get("consumerIceConnectionState") or state.get("publisherIceConnectionState") or "",
        "consumerTrackKinds": state.get("consumerTrackKinds", []),
        "consumerVideoWidth": state.get("consumerVideoWidth", 0),
        "consumerVideoHeight": state.get("consumerVideoHeight", 0),
        "stats": {
            "inboundVideoBytes": stats.get("inboundVideoBytes", 0),
            "inboundVideoFramesDecoded": stats.get("inboundVideoFramesDecoded", 0),
            "inboundAudioBytes": stats.get("inboundAudioBytes", 0),
        },
    })
    return report

client_reports = [
    parse_browser_log(item)
    for item in sys.argv[10].split(",")
    if item
]
payload = {
    "label": sys.argv[2],
    "iteration": int(sys.argv[3]),
    "va": sys.argv[4] == "1",
    "expected": {
        "sessions": int(sys.argv[5]),
        "streams": int(sys.argv[6]),
        "analysisTaps": int(sys.argv[7]),
    },
    "result": sys.argv[8],
    "sourceFiles": [item for item in sys.argv[9].split(",") if item],
    "clientLogs": [item for item in sys.argv[10].split(",") if item],
    "clientReports": client_reports,
    "activeStatus": parse_json_file(sys.argv[11]),
    "finalStatus": parse_json_file(sys.argv[12]),
}
with pathlib.Path(sys.argv[1]).open("a", encoding="utf-8") as fh:
    fh.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
PY
}

# 같은 source/여러 source case를 공통 절차로 실행한다.
run_multichannel_case() {
  local label="$1"
  local iteration="$2"
  local expected_streams="$3"
  local va_enabled="$4"
  shift 4
  local files=("$@")
  local expected_sessions="${#files[@]}"
  local expected_analysis_taps=0
  local pairs=()
  local logs=()
  local source_file debug_port log_file pid runtime_ok=0 clients_ok=0 final_idle_ok=0 result="fail"
  local active_status="" final_status=""
  local safe_label="${label//[^A-Za-z0-9_]/_}"
  local active_status_file="/tmp/media_server_${RUN_ID}_${safe_label}_${iteration}_active.json"
  local final_status_file="/tmp/media_server_${RUN_ID}_${safe_label}_${iteration}_final.json"

  if [[ "${va_enabled}" == "1" ]]; then
    expected_analysis_taps="${expected_sessions}"
  fi

  wait_for_idle_runtime || {
    write_status_json_file "${final_status_file}" "$(runtime_status || printf '{}')"
    append_case_summary "${label}" "${iteration}" "${va_enabled}" "${expected_sessions}" "${expected_streams}" \
      "${expected_analysis_taps}" "fail" "$(join_by_comma "${files[@]}")" "" "" "${final_status_file}"
    return 1
  }

  log_info "${label}: iteration=${iteration}, va=${va_enabled}, clients=${expected_sessions}, expectedStreams=${expected_streams}, expectedAnalysisTaps=${expected_analysis_taps}, holdMs=${HOLD_MS}"

  for source_file in "${files[@]}"; do
    CLIENT_RUN_INDEX=$((CLIENT_RUN_INDEX + 1))
    debug_port=$((DEBUG_PORT_BASE + CLIENT_RUN_INDEX))
    log_file="/tmp/media_server_${RUN_ID}_${label//[^A-Za-z0-9_]/_}_${iteration}_${CLIENT_RUN_INDEX}.log"
    start_client "${source_file}" "${debug_port}" "${log_file}" "${va_enabled}"
    pid="${STARTED_CLIENT_PID}"
    pairs+=("${pid}" "${log_file}")
    logs+=("${log_file}")
    log_info "${label}: client pid=${pid} file=${source_file} debugPort=${debug_port} log=${log_file}"
  done

  if wait_for_runtime_counts "${label}" "${expected_sessions}" "${expected_streams}" "${expected_analysis_taps}"; then
    runtime_ok=1
  fi
  active_status="${MATCHED_RUNTIME_STATUS:-$(runtime_status || printf '{}')}"
  write_status_json_file "${active_status_file}" "${active_status:-{}}"

  if wait_clients "${label}" "${pairs[@]}"; then
    clients_ok=1
  else
    cleanup_active_analysis_taps "$(runtime_status || printf '{}')"
  fi
  if wait_for_idle_runtime; then
    final_idle_ok=1
  else
    cleanup_active_analysis_taps "$(runtime_status || printf '{}')"
    wait_for_idle_runtime >/dev/null 2>&1 || true
  fi
  final_status="${MATCHED_RUNTIME_STATUS:-$(runtime_status || printf '{}')}"
  write_status_json_file "${final_status_file}" "${final_status:-{}}"

  if [[ "${runtime_ok}" -eq 1 && "${clients_ok}" -eq 1 && "${final_idle_ok}" -eq 1 ]]; then
    result="pass"
  fi
  append_case_summary "${label}" "${iteration}" "${va_enabled}" "${expected_sessions}" "${expected_streams}" \
    "${expected_analysis_taps}" "${result}" "$(join_by_comma "${files[@]}")" "$(join_by_comma "${logs[@]}")" \
    "${active_status_file}" "${final_status_file}"

  [[ "${result}" == "pass" ]]
}

# 여러 source와 source별 client 수로 실행할 파일 배열을 만든다.
expand_source_clients() {
  local csv="$1"
  local clients_per_source="$2"
  local out_var="$3"
  local unique_var="$4"
  local expanded=()
  local unique=0
  local source_file
  while IFS= read -r source_file; do
    assert_source_file_exists "${source_file}"
    unique=$((unique + 1))
    for _ in $(seq 1 "${clients_per_source}"); do
      expanded+=("${source_file}")
    done
  done < <(csv_to_lines "${csv}")
  if [[ "${unique}" -eq 0 ]]; then
    echo "[verify] source list must include at least one file"
    exit 1
  fi
  eval "${out_var}=(\"\${expanded[@]}\")"
  eval "${unique_var}=\"${unique}\""
}

# 마지막 runtime 상태와 case별 상세 결과를 JSON 파일로 남긴다.
write_summary() {
  local status_json
  status_json="$(runtime_status || printf '{}')"
  python3 - "${SUMMARY_FILE}" "${CASES_FILE}" "${PASS_COUNT}" "${FAIL_COUNT}" "${HTTP_BASE}" "${status_json}" <<'PY'
import json
import pathlib
import sys

def parse_json(text):
    while text:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            if not text.endswith("}"):
                return {}
            text = text[:-1]
    return {}

cases_path = pathlib.Path(sys.argv[2])
cases = []
if cases_path.exists():
    for line in cases_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            cases.append(json.loads(line))
out = {
    "pass": int(sys.argv[3]),
    "fail": int(sys.argv[4]),
    "httpBase": sys.argv[5],
    "cases": cases,
    "finalStatus": parse_json(sys.argv[6] or "{}"),
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
  log_info "summary=${SUMMARY_FILE}"
}

# 입력 검증, 단일 source fan-out, 다중 source fan-out, VA overlay 조합을 순서대로 실행한다.
main() {
  parse_args "$@"
  : > "${CASES_FILE}"
  require_cmd curl
  require_cmd node
  require_cmd python3
  assert_positive_int "${SINGLE_CLIENTS}" "single-clients"
  assert_positive_int "${CLIENTS_PER_SOURCE}" "clients-per-source"
  assert_positive_int "${REPEAT_COUNT}" "repeat"
  assert_positive_int "${HOLD_MS}" "hold-ms"
  assert_positive_int "${DEBUG_PORT_BASE}" "debug-port-base"

  if ! runtime_status >/dev/null; then
    echo "[verify] runtime status API unavailable: ${HTTP_BASE}/lab/runtime/status"
    echo "[verify] start server first, for example: MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh foreground"
    exit 1
  fi

  local iteration
  for iteration in $(seq 1 "${REPEAT_COUNT}"); do
    if [[ "${RUN_SINGLE}" -eq 1 ]]; then
      assert_source_file_exists "${SINGLE_SOURCE}"
      local single_files=()
      for _ in $(seq 1 "${SINGLE_CLIENTS}"); do
        single_files+=("${SINGLE_SOURCE}")
      done
      run_multichannel_case "single-source" "${iteration}" 1 0 "${single_files[@]}" || true
    fi

    if [[ "${RUN_MULTI}" -eq 1 ]]; then
      local multi_files=()
      local unique_sources=0
      expand_source_clients "${MULTI_SOURCES_CSV}" "${CLIENTS_PER_SOURCE}" multi_files unique_sources
      run_multichannel_case "multi-source" "${iteration}" "${unique_sources}" 0 "${multi_files[@]}" || true
    fi

    if [[ "${RUN_VA}" == "1" || "${RUN_VA}" == "true" || "${RUN_VA}" == "yes" ]]; then
      assert_source_file_exists "${VA_SINGLE_SOURCE}"
      local va_single_files=()
      for _ in $(seq 1 "${SINGLE_CLIENTS}"); do
        va_single_files+=("${VA_SINGLE_SOURCE}")
      done
      run_multichannel_case "va-single-source" "${iteration}" 1 1 "${va_single_files[@]}" || true

      local va_multi_files=()
      local va_unique_sources=0
      expand_source_clients "${VA_SOURCES_CSV}" "${CLIENTS_PER_SOURCE}" va_multi_files va_unique_sources
      run_multichannel_case "va-multi-source" "${iteration}" "${va_unique_sources}" 1 "${va_multi_files[@]}" || true
    fi
  done

  write_summary
  echo
  echo "[summary] pass=${PASS_COUNT} fail=${FAIL_COUNT}"
  if [[ "${FAIL_COUNT}" -ne 0 ]]; then
    exit 1
  fi
}

main "$@"
