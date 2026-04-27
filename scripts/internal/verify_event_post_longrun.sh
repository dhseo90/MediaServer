#!/usr/bin/env bash
# 파일 용도: event POST dispatch 검증을 여러 번 반복해 worker 안정성과 복구 시나리오를 장시간 관찰한다.
# 동작 요약: 이미 실행 중인 서버를 대상으로 schema/recovery/선택 queue 검증을 반복하고 summary JSON을 남긴다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

ITERATIONS="${MEDIA_SERVER_VERIFY_EVENT_POST_LONGRUN_ITERATIONS:-3}"
HTTP_BASE="${MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE:-http://127.0.0.1:${MEDIA_SERVER_HTTP_LISTEN_PORT:-8080}}"
MODES="${MEDIA_SERVER_VERIFY_EVENT_POST_LONGRUN_MODES:-schema,recovery}"
INCLUDE_QUEUE="${MEDIA_SERVER_VERIFY_EVENT_POST_LONGRUN_INCLUDE_QUEUE:-0}"
RUN_ID="evtpost-longrun-$(date +%s)-$$"
WORK_DIR="/tmp/media_server_${RUN_ID}"
STEPS_FILE="${WORK_DIR}/steps.ndjson"
SUMMARY_FILE="${MEDIA_SERVER_VERIFY_EVENT_POST_LONGRUN_SUMMARY_FILE:-/tmp/media_server_${RUN_ID}_summary.json}"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
STARTED_AT="${SECONDS}"

mkdir -p "${WORK_DIR}"

# 사용법과 반복 검증 범위를 출력한다.
usage() {
  cat <<EOF_USAGE
event POST 장시간 반복 검증

Usage:
  ./server.sh verify-event-post-longrun [options]

Options:
  --iterations <n>     반복 횟수. 기본 ${ITERATIONS}
  --http-base <url>    실행 중인 서버 HTTP base. 기본 ${HTTP_BASE}
  --modes <csv>        반복할 verify-event-post mode. 기본 schema,recovery
  --include-queue      queue drop 검증도 포함. 서버가 작은 queue로 시작되어 있어야 함
  --summary-file <p>   summary JSON 출력 경로
  -h, --help           도움말 출력

기준:
  - schema/recovery는 event POST worker가 켜진 서버에서 반복 실행합니다.
  - queue mode는 서버 queue 크기 의존성이 커서 명시적으로 켠 경우에만 hard gate로 실행합니다.
EOF_USAGE
}

# 공통 진행 메시지를 출력한다.
log_info() { echo "[info] $*"; }

# step 결과를 summary용 NDJSON에 누적한다.
append_step() {
  local name="$1"
  local result="$2"
  local mode="$3"
  local log_file="$4"
  local duration_sec="$5"
  python3 - "${STEPS_FILE}" "${name}" "${result}" "${mode}" "${log_file}" "${duration_sec}" <<'PY'
import json
import pathlib
import sys

record = {
    "name": sys.argv[2],
    "result": sys.argv[3],
    "mode": sys.argv[4],
    "logFile": sys.argv[5],
    "durationSec": float(sys.argv[6]),
}
with pathlib.Path(sys.argv[1]).open("a", encoding="utf-8") as handle:
    handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
PY
}

# 단일 event POST mode를 실행하고 pass/fail counter와 로그를 남긴다.
run_event_post_mode() {
  local iteration="$1"
  local mode="$2"
  local name="iteration-${iteration}-${mode}"
  local log_file="${WORK_DIR}/${name}.log"
  local started_at="${SECONDS}"
  log_info "${name} 시작"
  if MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE="${HTTP_BASE}" \
      "${ROOT_DIR}/server.sh" verify-event-post --mode "${mode}" --http-base "${HTTP_BASE}" >"${log_file}" 2>&1; then
    local duration=$((SECONDS - started_at))
    PASS_COUNT=$((PASS_COUNT + 1))
    append_step "${name}" "pass" "${mode}" "${log_file}" "${duration}"
    echo "[pass] ${name} (${duration}s)"
    return 0
  fi
  local duration=$((SECONDS - started_at))
  FAIL_COUNT=$((FAIL_COUNT + 1))
  append_step "${name}" "fail" "${mode}" "${log_file}" "${duration}"
  echo "[fail] ${name} (${duration}s) log=${log_file}"
  tail -n 80 "${log_file}" || true
  return 1
}

# 전체 반복 결과를 JSON으로 저장한다.
write_summary() {
  python3 - "${SUMMARY_FILE}" "${STEPS_FILE}" "${ITERATIONS}" "${MODES}" "${INCLUDE_QUEUE}" "${PASS_COUNT}" "${FAIL_COUNT}" "${SKIP_COUNT}" "${HTTP_BASE}" "${WORK_DIR}" "$((SECONDS - STARTED_AT))" <<'PY'
import json
import pathlib
import sys
import time

steps = []
steps_path = pathlib.Path(sys.argv[2])
if steps_path.exists():
    for line in steps_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            steps.append(json.loads(line))
summary = {
    "kind": "event-post-longrun",
    "status": "fail" if int(sys.argv[7]) > 0 else "pass",
    "iterations": int(sys.argv[3]),
    "modes": [item.strip() for item in sys.argv[4].split(",") if item.strip()],
    "includeQueue": sys.argv[5] == "1",
    "pass": int(sys.argv[6]),
    "fail": int(sys.argv[7]),
    "skip": int(sys.argv[8]),
    "httpBase": sys.argv[9],
    "workDir": sys.argv[10],
    "durationSec": int(float(sys.argv[11])),
    "finishedAtEpochMs": int(time.time() * 1000),
    "steps": steps,
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
}

# CLI 옵션을 파싱한다.
while [[ $# -gt 0 ]]; do
  case "$1" in
    --iterations)
      ITERATIONS="${2:-}"
      shift
      ;;
    --http-base)
      HTTP_BASE="${2:-}"
      shift
      ;;
    --modes)
      MODES="${2:-}"
      shift
      ;;
    --include-queue)
      INCLUDE_QUEUE=1
      ;;
    --summary-file)
      SUMMARY_FILE="${2:-}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 verify-event-post-longrun 옵션입니다: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

if ! [[ "${ITERATIONS}" =~ ^[0-9]+$ ]] || [[ "${ITERATIONS}" -lt 1 ]]; then
  echo "[fail] --iterations는 1 이상의 정수여야 합니다: ${ITERATIONS}"
  exit 1
fi

MODE_LIST=()
SEEN_MODES_CSV=","

# mode 오타나 중복으로 장시간 검증이 엉뚱하게 반복되지 않도록 시작 전에 정규화한다.
add_mode() {
  local mode="$1"
  mode="$(printf '%s' "${mode}" | xargs)"
  [[ -n "${mode}" ]] || return 0
  case "${mode}" in
    schema|recovery|queue)
      ;;
    *)
      echo "[fail] 지원하지 않는 event POST longrun mode입니다: ${mode}"
      exit 1
      ;;
  esac
  if [[ "${SEEN_MODES_CSV}" != *",${mode},"* ]]; then
    MODE_LIST+=("${mode}")
    SEEN_MODES_CSV+="${mode},"
  fi
}

IFS=',' read -r -a RAW_MODE_LIST <<<"${MODES}"
for mode in "${RAW_MODE_LIST[@]}"; do
  add_mode "${mode}"
done
if [[ "${INCLUDE_QUEUE}" == "1" ]]; then
  add_mode "queue"
fi
if [[ "${#MODE_LIST[@]}" -eq 0 ]]; then
  echo "[fail] 실행할 event POST longrun mode가 없습니다"
  exit 1
fi
MODES="$(IFS=,; printf '%s' "${MODE_LIST[*]}")"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  echo "[fail] HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi

: >"${STEPS_FILE}"
for ((iteration = 1; iteration <= ITERATIONS; iteration += 1)); do
  for mode in "${MODE_LIST[@]}"; do
    mode="$(printf '%s' "${mode}" | xargs)"
    [[ -n "${mode}" ]] || continue
    run_event_post_mode "${iteration}" "${mode}" || true
  done
done

write_summary

echo
echo "== event POST 장시간 반복 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- summary: ${SUMMARY_FILE}"
echo "- logs: ${WORK_DIR}"
if [[ "${FAIL_COUNT}" -gt 0 ]]; then
  exit 1
fi
