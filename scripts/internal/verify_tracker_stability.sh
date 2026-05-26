#!/usr/bin/env bash
# 파일 용도: 이동 테스트 영상에서 tracker ID 유지/분절 정도를 반복/장시간 통계로 측정한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

STD_AFX="${ROOT_DIR}/include/stdafx.h"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
CURRENT_TAP_ID=""
TAP_IDS=()
TEMP_RULE_ID=""
TEMP_VA_RULE_ID=""
RUN_ID="tracker-stability-$(date +%s)-$$"
SUMMARY_FILE="/tmp/media_server_${RUN_ID}_summary.ndjson"

log_info() {
  echo "[info] $*"
}

log_pass() {
  echo "[pass] $*"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
  echo "[fail] $*"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

log_skip() {
  echo "[skip] $*"
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

usage() {
  cat <<'EOF_USAGE'
Tracker stability 검증

Usage:
  ./server.sh verify-tracker-stability [options]

Options:
  --long                  장시간 기본값 적용: duration=120s, repeat=3
  --stress                장시간+겹침 중심+엄격 기준을 묶은 tracker stress preset
  --duration <seconds>    iteration당 polling 시간. poll-count보다 우선
  --repeat <count>        반복 횟수
  --interval <seconds>    polling 간격. 기본 0.2
  --poll-count <count>    duration 미지정 시 polling 횟수
  --max-fragmentation <v> fragmentation ratio 허용 상한
  --class-whitelist <csv> 통계에 포함할 객체 class. 기본 person, 전체는 *
  --min-track-samples <n> n회 미만 관측 track은 fragmentation 계산에서 제외
  --max-stale-ratio <v>   같은 PTS 반복 샘플 허용 비율. 기본 0.3
  --overlap-focus          동시 객체 겹침 구간 통계를 hard gate로 확인
  --overlap-min <n>        overlap 구간으로 볼 동시 track 수. 기본 3
  --max-overlap-fragmentation <v>
                           overlap 구간 fragmentation ratio 허용 상한. 기본 2.5
  --max-id-switch-risk <v>
                           fragmentation/stale/overlap 기반 ID switch 위험 점수 허용 상한. 기본 2.0
  --tracker-policy <name>   vaRule 기반 tracker policy를 강제합니다. 허용값: lite, kalman-lite, bytetrack
  --reid-policy <name>      vaRule 기반 Re-ID policy를 강제합니다. 허용값: off, assist
  --restart-between-iterations
                           반복마다 source idle cleanup을 기다려 파일을 처음부터 다시 검증
  --continuous-source     반복 사이 source를 재시작하지 않고 연속 스트림처럼 검증
  --no-segment-aware      PTS 역행/반복 경계별 segment 분리를 끔
  --no-long-sample        --long 기본 장기 샘플 자동 준비를 끔
  --file <token>          video root 기준 테스트 파일 token
  -h, --help              도움말 출력

환경 변수:
  MEDIA_SERVER_VERIFY_TRACKER_DURATION_S
  MEDIA_SERVER_VERIFY_TRACKER_REPEAT_COUNT
  MEDIA_SERVER_VERIFY_TRACKER_POLL_COUNT
  MEDIA_SERVER_VERIFY_TRACKER_POLL_INTERVAL_S
  MEDIA_SERVER_VERIFY_TRACKER_CLASS_WHITELIST
  MEDIA_SERVER_VERIFY_TRACKER_MIN_TRACK_SAMPLES
  MEDIA_SERVER_VERIFY_TRACKER_MAX_STALE_RATIO
  MEDIA_SERVER_VERIFY_TRACKER_MAX_ID_SWITCH_RISK
  MEDIA_SERVER_VERIFY_TRACKER_OVERLAP_FOCUS
  MEDIA_SERVER_VERIFY_TRACKER_OVERLAP_MIN_SIMULTANEOUS
  MEDIA_SERVER_VERIFY_TRACKER_MAX_OVERLAP_FRAGMENTATION_RATIO
  MEDIA_SERVER_VERIFY_TRACKER_POLICY
  MEDIA_SERVER_VERIFY_TRACKER_REID_POLICY
  MEDIA_SERVER_VERIFY_TRACKER_RESTART_BETWEEN_ITERATIONS
  MEDIA_SERVER_VERIFY_TRACKER_RESTART_WAIT_S
  MEDIA_SERVER_VERIFY_TRACKER_SEGMENT_AWARE
  MEDIA_SERVER_VERIFY_TRACKER_PREPARE_LONG_SAMPLE
EOF_USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_fail "필수 도구가 없습니다: $1"
    exit 1
  fi
}

resolve_port() {
  local env_value="$1"
  local const_name="$2"
  local fallback="$3"
  if [[ -n "${env_value}" ]]; then
    printf '%s' "${env_value}"
    return
  fi
  local parsed
  parsed="$(sed -nE "s/.*${const_name} = ([0-9]+).*/\\1/p" "${STD_AFX}" | head -n1)"
  printf '%s' "${parsed:-${fallback}}"
}

read_const_int() {
  local const_name="$1"
  local fallback="$2"
  local parsed
  parsed="$(sed -nE "s/.*${const_name} = ([0-9]+).*/\\1/p" "${STD_AFX}" | head -n1)"
  printf '%s' "${parsed:-${fallback}}"
}

client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

urlencode_file_token() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse

print(urllib.parse.quote(sys.argv[1], safe="/._-"))
PY
}

resolve_project_path() {
  local value="$1"
  if [[ -z "${value}" ]]; then
    return 0
  fi
  case "${value}" in
    /*)
      printf '%s' "${value}"
      ;;
    *)
      printf '%s/%s' "${ROOT_DIR}" "${value}"
      ;;
  esac
}

resolve_file_token_path() {
  local token="$1"
  local file_root="${MEDIA_SERVER_FILE_ROOT:-$(media_server_read_const_charp "${STD_AFX}" "kFileRootPath" || true)}"
  file_root="${file_root:-video}"
  case "${file_root}" in
    /*)
      printf '%s/%s' "${file_root}" "${token}"
      ;;
    *)
      printf '%s/%s/%s' "${ROOT_DIR}" "${file_root}" "${token}"
      ;;
  esac
}

file_duration_s() {
  local file_path="$1"
  if [[ ! -f "${file_path}" ]] || ! command -v ffprobe >/dev/null 2>&1; then
    printf '0'
    return
  fi
  ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${file_path}" 2>/dev/null | head -n1
}

create_tracker_policy_va_rule() {
  local tracker_policy="$1"
  local reid_policy="$2"
  if [[ -z "${tracker_policy}" && -z "${reid_policy}" ]]; then
    return 0
  fi
  TEMP_RULE_ID="9$(date +%s)$((RANDOM % 1000))"
  TEMP_VA_RULE_ID="$((TEMP_RULE_ID + 1))"
  local rule_body="/tmp/media_server_${RUN_ID}_rule.json"
  local va_rule_body="/tmp/media_server_${RUN_ID}_va_rule.json"
  python3 - "${TEMP_RULE_ID}" > "${rule_body}" <<'PY'
import json
import sys

rule_id = sys.argv[1]
print(json.dumps({
    "id": rule_id,
    "enabled": True,
    "ruleKind": "basic",
    "analysis": {"classes": ["person", "vehicle"]},
    "event": {
        "type": "presence",
        "region": {
            "type": "polygon",
            "points": [
                {"x": 0.0, "y": 0.0},
                {"x": 1.0, "y": 0.0},
                {"x": 1.0, "y": 1.0},
                {"x": 0.0, "y": 1.0},
            ],
        },
        "minConfidence": 0.10,
        "minDurationMs": 0,
    },
}, separators=(",", ":")))
PY
  python3 - "${TEMP_VA_RULE_ID}" "${TEMP_RULE_ID}" "${FILE_TOKEN}" "${tracker_policy}" "${reid_policy}" > "${va_rule_body}" <<'PY'
import json
import sys

va_rule_id, template_rule_id, file_token, tracker_policy, reid_policy = sys.argv[1:6]
print(json.dumps({
    "id": va_rule_id,
    "enabled": True,
    "priority": 900000 + (int(va_rule_id) % 1000),
    "source": {"kind": "file", "file": file_token},
    "analysis": {
        "profileId": "3",
        "classes": ["person", "vehicle"],
        "trackingPolicy": {"tracker": tracker_policy, "reid": reid_policy},
    },
    "templateStart": {"ruleId": template_rule_id},
}, separators=(",", ":")))
PY
  curl -fsS -X PUT -H "Content-Type: application/json" \
    --data-binary "@${rule_body}" \
    "${HTTP_BASE}/lab/analysis/rules/${TEMP_RULE_ID}" >/dev/null
  curl -fsS -X PUT -H "Content-Type: application/json" \
    --data-binary "@${va_rule_body}" \
    "${HTTP_BASE}/lab/analysis/va-rules/${TEMP_VA_RULE_ID}" >/dev/null
  log_pass "tracking policy vaRule 준비: tracker=${tracker_policy} reid=${reid_policy} vaRule=${TEMP_VA_RULE_ID}"
}

tap_create_url() {
  if [[ -n "${TEMP_VA_RULE_ID}" ]]; then
    printf '%s/lab/analysis/taps?vaRule=%s&fps=8&maxQueue=1&trackIds=1&trackTrails=1' \
      "${HTTP_BASE}" "${TEMP_VA_RULE_ID}"
  else
    printf '%s/lab/analysis/taps?file=%s&va=1&fps=8&maxQueue=1&trackIds=1&trackTrails=1' \
      "${HTTP_BASE}" "${ENCODED_FILE}"
  fi
}

verify_tap_tracking_policy() {
  local tap_id="$1"
  local expected_tracker="$2"
  local expected_reid="$3"
  if [[ -z "${expected_tracker}" && -z "${expected_reid}" ]]; then
    return 0
  fi
  local snapshot_tmp="/tmp/media_server_${RUN_ID}_${tap_id}_policy.json"
  local effective=""
  local requested=""
  local reid=""
  for _ in $(seq 1 10); do
    if curl -fsS "${HTTP_BASE}/lab/analysis/taps/${tap_id}" > "${snapshot_tmp}"; then
      effective="$(python3 - "${snapshot_tmp}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text() or "{}")
tap = payload.get("tap") if isinstance(payload, dict) else {}
policy = (tap or {}).get("trackingPolicy") or {}
print(policy.get("effectiveTracker") or "")
PY
)"
      requested="$(python3 - "${snapshot_tmp}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text() or "{}")
tap = payload.get("tap") if isinstance(payload, dict) else {}
policy = (tap or {}).get("trackingPolicy") or {}
print(policy.get("tracker") or "")
PY
)"
      reid="$(python3 - "${snapshot_tmp}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text() or "{}")
tap = payload.get("tap") if isinstance(payload, dict) else {}
policy = (tap or {}).get("trackingPolicy") or {}
print(policy.get("reid") or "")
PY
)"
      if [[ "${effective}" == "${expected_tracker}" && "${requested}" == "${expected_tracker}" && "${reid}" == "${expected_reid}" ]]; then
        log_pass "tap tracking policy 적용: tracker=${requested} effective=${effective} reid=${reid}"
        return 0
      fi
    fi
    sleep 0.1
  done
  log_fail "tap tracking policy 불일치: expectedTracker=${expected_tracker:-none} expectedReid=${expected_reid:-none} requested=${requested:-none} effective=${effective:-none} reid=${reid:-none}"
  exit 1
}

prepare_long_tracker_sample() {
  local source_token="$1"
  local target_token="$2"
  local min_duration_s="$3"
  local source_path target_path current_duration
  source_path="$(resolve_file_token_path "${source_token}")"
  target_path="$(resolve_file_token_path "${target_token}")"
  current_duration="$(file_duration_s "${target_path}")"

  if python3 - "${current_duration}" "${min_duration_s}" <<'PY' >/dev/null; then
import sys

current = float(sys.argv[1] or 0)
minimum = float(sys.argv[2])
raise SystemExit(0 if current >= minimum else 1)
PY
    log_info "long tracker sample exists: ${target_token} (${current_duration}s)"
    return 0
  fi
  if [[ ! -f "${source_path}" ]]; then
    log_skip "long tracker sample source 없음: ${source_token}"
    return 1
  fi
  if ! command -v ffmpeg >/dev/null 2>&1; then
    log_skip "ffmpeg가 없어 long tracker sample 자동 생성을 건너뜁니다"
    return 1
  fi
  if [[ -f "${target_path}" ]]; then
    log_skip "long tracker sample이 있지만 길이가 부족합니다: ${target_token} (${current_duration}s)"
    return 1
  fi

  mkdir -p "$(dirname "${target_path}")"
  log_info "long tracker sample 생성: ${target_token}"
  ffmpeg -hide_banner -loglevel error -y -i "${source_path}" \
    -filter_complex "[0:v]setpts=5*PTS,fps=30,scale=1280:720,setsar=1,format=yuv420p[v]" \
    -map "[v]" -an -c:v libx264 -preset veryfast -crf 23 -movflags +faststart "${target_path}"
  current_duration="$(file_duration_s "${target_path}")"
  log_info "long tracker sample ready: ${target_token} (${current_duration}s)"
}

cleanup_runtime_documents() {
  if ((${#TAP_IDS[@]} > 0)); then
    for tap_id in "${TAP_IDS[@]}"; do
      curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${tap_id}" >/dev/null 2>&1 || true
    done
  fi
  if [[ -n "${TEMP_VA_RULE_ID}" ]]; then
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/va-rules/${TEMP_VA_RULE_ID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${TEMP_RULE_ID}" ]]; then
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${TEMP_RULE_ID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup_runtime_documents EXIT

DEFAULT_FILE_TOKEN="imports/va_tracking_event_1280x720_30fps_h264.mp4"
LONG_FILE_TOKEN="${MEDIA_SERVER_VERIFY_TRACKER_LONG_FILE:-imports/va_tracking_event_slow_long_1280x720_30fps_h264.mp4}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_TRACKER_FILE:-${DEFAULT_FILE_TOKEN}}"
FILE_TOKEN_SET=0
LONG_MODE=0
STRESS_MODE=0
POLL_COUNT="${MEDIA_SERVER_VERIFY_TRACKER_POLL_COUNT:-150}"
POLL_INTERVAL_S="${MEDIA_SERVER_VERIFY_TRACKER_POLL_INTERVAL_S:-0.2}"
DURATION_S="${MEDIA_SERVER_VERIFY_TRACKER_DURATION_S:-}"
REPEAT_COUNT="${MEDIA_SERVER_VERIFY_TRACKER_REPEAT_COUNT:-1}"
REPEAT_COUNT_SET=0
if [[ -n "${MEDIA_SERVER_VERIFY_TRACKER_REPEAT_COUNT:-}" ]]; then
  REPEAT_COUNT_SET=1
fi
MIN_SAMPLES="${MEDIA_SERVER_VERIFY_TRACKER_MIN_SAMPLES:-20}"
MIN_MAX_SIMULTANEOUS="${MEDIA_SERVER_VERIFY_TRACKER_MIN_MAX_SIMULTANEOUS:-3}"
MAX_FRAGMENTATION_RATIO="${MEDIA_SERVER_VERIFY_TRACKER_MAX_FRAGMENTATION_RATIO:-3.0}"
CLASS_WHITELIST="${MEDIA_SERVER_VERIFY_TRACKER_CLASS_WHITELIST:-person}"
MIN_TRACK_SAMPLES="${MEDIA_SERVER_VERIFY_TRACKER_MIN_TRACK_SAMPLES:-3}"
MAX_STALE_RATIO="${MEDIA_SERVER_VERIFY_TRACKER_MAX_STALE_RATIO:-0.3}"
MAX_ID_SWITCH_RISK="${MEDIA_SERVER_VERIFY_TRACKER_MAX_ID_SWITCH_RISK:-2.0}"
TRACKER_POLICY="${MEDIA_SERVER_VERIFY_TRACKER_POLICY:-}"
REID_POLICY="${MEDIA_SERVER_VERIFY_TRACKER_REID_POLICY:-}"
OVERLAP_FOCUS="${MEDIA_SERVER_VERIFY_TRACKER_OVERLAP_FOCUS:-0}"
OVERLAP_MIN_SIMULTANEOUS="${MEDIA_SERVER_VERIFY_TRACKER_OVERLAP_MIN_SIMULTANEOUS:-3}"
MAX_OVERLAP_FRAGMENTATION_RATIO="${MEDIA_SERVER_VERIFY_TRACKER_MAX_OVERLAP_FRAGMENTATION_RATIO:-2.5}"
RESTART_BETWEEN_ITERATIONS="${MEDIA_SERVER_VERIFY_TRACKER_RESTART_BETWEEN_ITERATIONS:-}"
RESTART_WAIT_S="${MEDIA_SERVER_VERIFY_TRACKER_RESTART_WAIT_S:-}"
SEGMENT_AWARE="${MEDIA_SERVER_VERIFY_TRACKER_SEGMENT_AWARE:-1}"
PREPARE_LONG_SAMPLE="${MEDIA_SERVER_VERIFY_TRACKER_PREPARE_LONG_SAMPLE:-1}"
LONG_SAMPLE_SOURCE="${MEDIA_SERVER_VERIFY_TRACKER_LONG_SOURCE_FILE:-${DEFAULT_FILE_TOKEN}}"
LONG_SAMPLE_MIN_DURATION_S="${MEDIA_SERVER_VERIFY_TRACKER_LONG_MIN_DURATION_S:-125}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --long)
      LONG_MODE=1
      DURATION_S="${DURATION_S:-120}"
      if [[ "${REPEAT_COUNT_SET}" == "0" && "${REPEAT_COUNT}" == "1" ]]; then
        REPEAT_COUNT=3
      fi
      ;;
    --stress)
      STRESS_MODE=1
      LONG_MODE=1
      OVERLAP_FOCUS=1
      DURATION_S="${DURATION_S:-180}"
      MAX_FRAGMENTATION_RATIO=2.0
      MAX_OVERLAP_FRAGMENTATION_RATIO=2.0
      MAX_STALE_RATIO=0.2
      MIN_TRACK_SAMPLES=5
      if [[ "${REPEAT_COUNT_SET}" == "0" && "${REPEAT_COUNT}" == "1" ]]; then
        REPEAT_COUNT=3
      fi
      ;;
    --duration)
      DURATION_S="$2"
      shift
      ;;
    --repeat)
      REPEAT_COUNT="$2"
      REPEAT_COUNT_SET=1
      shift
      ;;
    --interval)
      POLL_INTERVAL_S="$2"
      shift
      ;;
    --poll-count)
      POLL_COUNT="$2"
      shift
      ;;
    --max-fragmentation)
      MAX_FRAGMENTATION_RATIO="$2"
      shift
      ;;
    --class-whitelist)
      CLASS_WHITELIST="$2"
      shift
      ;;
    --min-track-samples)
      MIN_TRACK_SAMPLES="$2"
      shift
      ;;
    --max-stale-ratio)
      MAX_STALE_RATIO="$2"
      shift
      ;;
    --max-id-switch-risk)
      MAX_ID_SWITCH_RISK="$2"
      shift
      ;;
    --tracker-policy)
      TRACKER_POLICY="$2"
      shift
      ;;
    --reid-policy)
      REID_POLICY="$2"
      shift
      ;;
    --overlap-focus)
      OVERLAP_FOCUS=1
      ;;
    --overlap-min)
      OVERLAP_MIN_SIMULTANEOUS="$2"
      shift
      ;;
    --max-overlap-fragmentation)
      MAX_OVERLAP_FRAGMENTATION_RATIO="$2"
      shift
      ;;
    --restart-between-iterations)
      RESTART_BETWEEN_ITERATIONS=1
      ;;
    --continuous-source)
      RESTART_BETWEEN_ITERATIONS=0
      ;;
    --no-segment-aware)
      SEGMENT_AWARE=0
      ;;
    --no-long-sample)
      PREPARE_LONG_SAMPLE=0
      ;;
    --file)
      FILE_TOKEN="$2"
      FILE_TOKEN_SET=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 옵션입니다: $1"
      echo
      usage
      exit 1
      ;;
  esac
  shift
done

require_cmd curl
require_cmd python3

TRACKER_POLICY="$(printf '%s' "${TRACKER_POLICY}" | tr '[:upper:]' '[:lower:]')"
if [[ "${TRACKER_POLICY}" == "default" ]]; then
  TRACKER_POLICY=""
fi
if [[ -n "${TRACKER_POLICY}" && "${TRACKER_POLICY}" != "lite" && "${TRACKER_POLICY}" != "kalman-lite" && "${TRACKER_POLICY}" != "bytetrack" ]]; then
  log_fail "지원하지 않는 tracker policy입니다: ${TRACKER_POLICY}"
  exit 1
fi
REID_POLICY="$(printf '%s' "${REID_POLICY}" | tr '[:upper:]' '[:lower:]')"
if [[ "${REID_POLICY}" == "default" ]]; then
  REID_POLICY=""
fi
if [[ -n "${REID_POLICY}" && "${REID_POLICY}" != "off" && "${REID_POLICY}" != "assist" ]]; then
  log_fail "지원하지 않는 Re-ID policy입니다: ${REID_POLICY}"
  exit 1
fi
RULE_TRACKER_POLICY=""
RULE_REID_POLICY=""
if [[ -n "${TRACKER_POLICY}" || -n "${REID_POLICY}" ]]; then
  RULE_TRACKER_POLICY="${TRACKER_POLICY:-lite}"
  RULE_REID_POLICY="${REID_POLICY:-off}"
fi

if [[ -z "${RESTART_BETWEEN_ITERATIONS}" ]]; then
  if [[ "${LONG_MODE}" == "1" ]]; then
    RESTART_BETWEEN_ITERATIONS=1
  else
    RESTART_BETWEEN_ITERATIONS=0
  fi
fi
if [[ -z "${RESTART_WAIT_S}" ]]; then
  idle_grace_ms="${MEDIA_SERVER_IDLE_GRACE_MS:-$(read_const_int "kIdleGracePeriodMs" "10000")}"
  RESTART_WAIT_S="$(python3 - "${idle_grace_ms}" <<'PY'
import math
import sys

idle_ms = max(0.0, float(sys.argv[1] or 0))
print(max(1, int(math.ceil(idle_ms / 1000.0)) + 1))
PY
)"
fi

if [[ "${LONG_MODE}" == "1" && "${FILE_TOKEN_SET}" == "0" && "${PREPARE_LONG_SAMPLE}" == "1" ]]; then
  if prepare_long_tracker_sample "${LONG_SAMPLE_SOURCE}" "${LONG_FILE_TOKEN}" "${LONG_SAMPLE_MIN_DURATION_S}"; then
    FILE_TOKEN="${LONG_FILE_TOKEN}"
  else
    log_skip "long tracker sample 준비 실패. 기본 파일로 계속 진행합니다: ${FILE_TOKEN}"
  fi
fi

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_TRACKER_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_TRACKER_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
ENCODED_FILE="$(urlencode_file_token "${FILE_TOKEN}")"

if [[ -n "${DURATION_S}" ]]; then
  POLL_COUNT="$(python3 - "${DURATION_S}" "${POLL_INTERVAL_S}" <<'PY'
import math
import sys

duration = float(sys.argv[1])
interval = max(0.01, float(sys.argv[2]))
print(max(1, int(math.ceil(duration / interval))))
PY
)"
fi

log_info "http_base=${HTTP_BASE}"
log_info "file=${FILE_TOKEN}"
log_info "trackerPolicy=${RULE_TRACKER_POLICY:-direct-source-default}"
log_info "reidPolicy=${RULE_REID_POLICY:-direct-source-default}"
log_info "repeat=${REPEAT_COUNT} poll=${POLL_COUNT} interval=${POLL_INTERVAL_S}s duration=${DURATION_S:-auto}"
log_info "stress=${STRESS_MODE} segmentAware=${SEGMENT_AWARE} classWhitelist=${CLASS_WHITELIST} minTrackSamples=${MIN_TRACK_SAMPLES} maxStaleRatio=${MAX_STALE_RATIO} maxIdSwitchRisk=${MAX_ID_SWITCH_RISK}"
log_info "overlapFocus=${OVERLAP_FOCUS} overlapMin=${OVERLAP_MIN_SIMULTANEOUS} maxOverlapFragmentation=${MAX_OVERLAP_FRAGMENTATION_RATIO}"
log_info "restartBetweenIterations=${RESTART_BETWEEN_ITERATIONS} restartWait=${RESTART_WAIT_S}s"
log_info "summary=${SUMMARY_FILE}"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

create_tracker_policy_va_rule "${RULE_TRACKER_POLICY}" "${RULE_REID_POLICY}"

: > "${SUMMARY_FILE}"

for iteration in $(seq 1 "${REPEAT_COUNT}"); do
  CURRENT_TAP_ID=""
  SNAPSHOTS_FILE="/tmp/media_server_${RUN_ID}_iteration_${iteration}.ndjson"
  SNAPSHOT_TMP="/tmp/media_server_${RUN_ID}_iteration_${iteration}_snapshot.json"
  METRICS_TMP="/tmp/media_server_${RUN_ID}_iteration_${iteration}_metrics.json"
  log_info "iteration ${iteration}/${REPEAT_COUNT} 시작"

  TAP_RESPONSE="$(curl -fsS -X POST "$(tap_create_url)")"
  CURRENT_TAP_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tapId",""))' <<<"${TAP_RESPONSE}")"
  if [[ -z "${CURRENT_TAP_ID}" ]]; then
    log_fail "analysis tap 생성 실패"
    echo "${TAP_RESPONSE}" | sed 's/^/  /'
    exit 1
  fi
  TAP_IDS+=("${CURRENT_TAP_ID}")
  log_pass "analysis tap 생성: ${CURRENT_TAP_ID}"
  verify_tap_tracking_policy "${CURRENT_TAP_ID}" "${RULE_TRACKER_POLICY}" "${RULE_REID_POLICY}"

  : > "${SNAPSHOTS_FILE}"
  for _ in $(seq 1 "${POLL_COUNT}"); do
    sleep "${POLL_INTERVAL_S}"
    curl -fsS "${HTTP_BASE}/lab/analysis/taps/${CURRENT_TAP_ID}" > "${SNAPSHOT_TMP}"
    if ! curl -fsS "${HTTP_BASE}/lab/analysis/taps/${CURRENT_TAP_ID}/metrics" > "${METRICS_TMP}"; then
      printf '{}' > "${METRICS_TMP}"
    fi
    python3 - "${SNAPSHOT_TMP}" "${METRICS_TMP}" >> "${SNAPSHOTS_FILE}" <<'PY'
import json
import pathlib
import sys

snapshot = json.loads(pathlib.Path(sys.argv[1]).read_text() or "{}")
metrics = json.loads(pathlib.Path(sys.argv[2]).read_text() or "{}")
tap = snapshot.get("tap") if isinstance(snapshot, dict) else None
if not isinstance(tap, dict):
    tap = snapshot if isinstance(snapshot, dict) else {}
print(json.dumps({"tap": tap, "metrics": metrics}, ensure_ascii=False))
PY
  done

  if python3 - \
    "${SNAPSHOTS_FILE}" \
    "${MIN_SAMPLES}" \
    "${MIN_MAX_SIMULTANEOUS}" \
    "${MAX_FRAGMENTATION_RATIO}" \
    "${iteration}" \
    "${SUMMARY_FILE}" \
    "${CLASS_WHITELIST}" \
    "${MIN_TRACK_SAMPLES}" \
    "${SEGMENT_AWARE}" \
    "${MAX_STALE_RATIO}" \
    "${OVERLAP_FOCUS}" \
    "${OVERLAP_MIN_SIMULTANEOUS}" \
    "${MAX_OVERLAP_FRAGMENTATION_RATIO}" \
    "${MAX_ID_SWITCH_RISK}" \
    "${STRESS_MODE}" <<'PY'
import collections
import json
import pathlib
import statistics
import sys

snapshots_file = pathlib.Path(sys.argv[1])
min_samples = int(sys.argv[2])
min_max_simultaneous = int(sys.argv[3])
max_fragmentation_ratio = float(sys.argv[4])
iteration = int(sys.argv[5])
summary_file = pathlib.Path(sys.argv[6])
class_whitelist_raw = sys.argv[7].strip()
min_track_samples = max(1, int(sys.argv[8]))
segment_aware = sys.argv[9] != "0"
max_stale_ratio = float(sys.argv[10])
overlap_focus = sys.argv[11] == "1"
overlap_min_simultaneous = max(1, int(sys.argv[12]))
max_overlap_fragmentation_ratio = float(sys.argv[13])
max_id_switch_risk = float(sys.argv[14])
stress_mode = sys.argv[15] == "1"
allowed_classes = {
    item.strip().lower()
    for item in class_whitelist_raw.split(",")
    if item.strip()
}
allow_all_classes = not allowed_classes or "*" in allowed_classes or "all" in allowed_classes
category_by_label = {
    "person": "person",
    "bicycle": "vehicle", "car": "vehicle", "motorcycle": "vehicle", "airplane": "vehicle",
    "bus": "vehicle", "train": "vehicle", "truck": "vehicle", "boat": "vehicle",
    "traffic light": "road", "fire hydrant": "road", "stop sign": "road", "parking meter": "road",
    "bird": "animal", "cat": "animal", "dog": "animal", "horse": "animal", "sheep": "animal",
    "cow": "animal", "elephant": "animal", "bear": "animal", "zebra": "animal", "giraffe": "animal",
    "frisbee": "sports", "skis": "sports", "snowboard": "sports", "sports ball": "sports",
    "kite": "sports", "baseball bat": "sports", "baseball glove": "sports",
    "skateboard": "sports", "surfboard": "sports", "tennis racket": "sports",
    "bottle": "tableware", "wine glass": "tableware", "cup": "tableware", "fork": "tableware",
    "knife": "tableware", "spoon": "tableware", "bowl": "tableware",
    "banana": "food", "apple": "food", "sandwich": "food", "orange": "food", "broccoli": "food",
    "carrot": "food", "hot dog": "food", "pizza": "food", "donut": "food", "cake": "food",
    "bench": "furniture", "chair": "furniture", "couch": "furniture", "potted plant": "furniture",
    "bed": "furniture", "dining table": "furniture", "toilet": "furniture", "sink": "furniture",
    "tv": "device", "laptop": "device", "mouse": "device", "remote": "device", "keyboard": "device",
    "cell phone": "device", "microwave": "device", "oven": "device", "toaster": "device",
    "refrigerator": "device", "clock": "device", "hair drier": "device",
}

raw_samples = []
for line in snapshots_file.read_text().splitlines():
    if not line.strip():
        continue
    payload = json.loads(line)
    tap = payload.get("tap") or {}
    metrics = payload.get("metrics") or {}
    latest = tap.get("latestResult") or {}
    pts = int(latest.get("pts") or 0)
    raw_samples.append({
        "tap": tap,
        "metrics": metrics,
        "latest": latest,
        "pts": pts,
        "tracks": latest.get("tracks") or [],
        "detections": latest.get("detections") or [],
        "analyzed": int(tap.get("analyzedPackets") or 0),
        "avgMs": float(tap.get("averageAnalysisMs") or 0.0),
    })

segments = [[]]
previous_pts = None
seen_pts_in_segment = set()
stale_pts_samples = 0
pts_regression_count = 0
for sample in raw_samples:
    pts = sample["pts"]
    if segment_aware and previous_pts is not None and pts > 0 and previous_pts > 0 and pts < previous_pts:
        pts_regression_count += 1
        segments.append([])
        seen_pts_in_segment = set()
    if segment_aware and pts > 0 and pts in seen_pts_in_segment:
        stale_pts_samples += 1
        previous_pts = pts
        continue
    segments[-1].append(sample)
    if pts > 0:
        seen_pts_in_segment.add(pts)
    previous_pts = pts

segments = [segment for segment in segments if segment]
effective_samples = [sample for segment in segments for sample in segment]
empty_detection_samples = sum(1 for sample in effective_samples if not sample["detections"])
analyzed_values = [sample["analyzed"] for sample in raw_samples]
avg_ms_values = [sample["avgMs"] for sample in raw_samples]
excluded_class_tracks = set()
excluded_short_tracks = set()

def class_allowed(label):
    if allow_all_classes:
        return True
    return str(label or "").lower() in allowed_classes

def summarize_segment(segment_index, segment):
    track_samples = collections.Counter()
    track_labels = {}
    track_first_pts = {}
    track_last_pts = {}
    class_sample_counts = collections.Counter()
    raw_track_ids = set()
    for sample in segment:
        for track in sample["tracks"]:
            track_id = int(track.get("trackId") or 0)
            if track_id <= 0:
                continue
            key = f"{segment_index}:{track_id}"
            raw_track_ids.add(key)
            label = track.get("label") or ""
            track_labels.setdefault(key, label)
            if not class_allowed(label):
                excluded_class_tracks.add(key)
                continue
            track_samples[key] += 1
            class_sample_counts[str(label or "").lower()] += 1
            pts = int(track.get("lastSeenPts") or sample["pts"] or 0)
            track_first_pts.setdefault(key, pts)
            track_last_pts[key] = pts

    eligible_track_ids = {
        key for key, count in track_samples.items()
        if count >= min_track_samples
    }
    excluded_short_tracks.update(set(track_samples) - eligible_track_ids)
    max_simultaneous = 0
    overlap_samples = 0
    overlap_track_ids = set()
    for sample in segment:
        simultaneous = 0
        for track in sample["tracks"]:
            track_id = int(track.get("trackId") or 0)
            if track_id <= 0:
                continue
            key = f"{segment_index}:{track_id}"
            if key in eligible_track_ids:
                simultaneous += 1
        max_simultaneous = max(max_simultaneous, simultaneous)
        if simultaneous >= overlap_min_simultaneous:
            overlap_samples += 1
            for track in sample["tracks"]:
                track_id = int(track.get("trackId") or 0)
                key = f"{segment_index}:{track_id}"
                if key in eligible_track_ids:
                    overlap_track_ids.add(key)

    unique_tracks = len(eligible_track_ids)
    class_track_counts = collections.Counter(str(track_labels.get(key, "")).lower() for key in eligible_track_ids)
    category_track_counts = collections.Counter()
    for label, track_count in class_track_counts.items():
        category_track_counts[category_by_label.get(label, "object")] += track_count
    category_sample_counts = collections.Counter()
    for label, sample_count in class_sample_counts.items():
        category_sample_counts[category_by_label.get(label, "object")] += sample_count
    fragmentation_ratio = unique_tracks / max(1, max_simultaneous)
    overlap_fragmentation_ratio = len(overlap_track_ids) / max(1, max_simultaneous)
    lifetimes = [track_samples[key] for key in eligible_track_ids]
    return {
        "segment": segment_index,
        "samples": len(segment),
        "firstPts": segment[0]["pts"] if segment else 0,
        "lastPts": segment[-1]["pts"] if segment else 0,
        "rawTracks": len(raw_track_ids),
        "uniqueTracks": unique_tracks,
        "maxSimultaneousTracks": max_simultaneous,
        "fragmentationRatio": round(fragmentation_ratio, 3),
        "overlapSampleCount": overlap_samples,
        "overlapUniqueTracks": len(overlap_track_ids),
        "overlapFragmentationRatio": round(overlap_fragmentation_ratio, 3),
        "medianTrackLifetimeSamples": statistics.median(lifetimes) if lifetimes else 0,
        "classTrackCounts": dict(sorted(class_track_counts.items())),
        "classSampleCounts": dict(sorted(class_sample_counts.items())),
        "categoryTrackCounts": dict(sorted(category_track_counts.items())),
        "categorySampleCounts": dict(sorted(category_sample_counts.items())),
        "trackSummary": [
            {
                "id": key,
                "label": track_labels.get(key, ""),
                "samples": track_samples[key],
                "firstPts": track_first_pts.get(key, 0),
                "lastPts": track_last_pts.get(key, 0),
            }
            for key in sorted(eligible_track_ids)
        ],
    }

segment_summaries = [
    summarize_segment(index, segment)
    for index, segment in enumerate(segments, start=1)
]
unique_tracks = sum(segment["uniqueTracks"] for segment in segment_summaries)
max_simultaneous = max((segment["maxSimultaneousTracks"] for segment in segment_summaries), default=0)
fragmentation_ratio = max((segment["fragmentationRatio"] for segment in segment_summaries), default=0.0)
overlap_sample_count = sum(segment["overlapSampleCount"] for segment in segment_summaries)
overlap_fragmentation_ratio = max((segment["overlapFragmentationRatio"] for segment in segment_summaries), default=0.0)
lifetimes = [
    track["samples"]
    for segment in segment_summaries
    for track in segment["trackSummary"]
]
class_track_counts = collections.Counter()
class_sample_counts = collections.Counter()
category_track_counts = collections.Counter()
category_sample_counts = collections.Counter()
for segment in segment_summaries:
    class_track_counts.update(segment.get("classTrackCounts") or {})
    class_sample_counts.update(segment.get("classSampleCounts") or {})
    category_track_counts.update(segment.get("categoryTrackCounts") or {})
    category_sample_counts.update(segment.get("categorySampleCounts") or {})
median_lifetime = statistics.median(lifetimes) if lifetimes else 0
final_analyzed = max(analyzed_values) if analyzed_values else 0
avg_ms = avg_ms_values[-1] if avg_ms_values else 0.0
stale_pts_ratio = stale_pts_samples / max(1, len(raw_samples))
id_switch_risk_score = (
    max(0.0, fragmentation_ratio - 1.0)
    + max(0.0, overlap_fragmentation_ratio - 1.0)
    + stale_pts_ratio * 2.0
    + pts_regression_count * 0.1
)
association_confidence_values = []
overlap_risk_values = []
center_jump_values = []
lost_count_values = []
reacquired_count_values = []
guard_decision_counts = collections.Counter()
issue_counts = collections.Counter()
issue_observation_counts = collections.Counter()
issue_keys_by_type = collections.defaultdict(set)
event_counts = collections.Counter()
scenario_counts = collections.Counter()
close_object_guard_applied_count = 0
rejected_by_close_object_guard_count = 0
track_issue_rows = []
for sample in effective_samples:
    tap = sample.get("tap") or {}
    latest = sample.get("latest") or {}
    metrics = sample.get("metrics") or {}
    track_state = ((tap.get("analyticsState") or {}).get("trackState") or {})
    lost_count_values.append(int(track_state.get("lostTracks") or 0))
    reacquired_count_values.append(int(track_state.get("reacquiredTracks") or 0))

    for track in ((latest.get("debugState") or {}).get("tracks") or []):
        label = track.get("label") or track.get("className") or ""
        if not class_allowed(label):
            continue
        health = track.get("trackHealth") or {}
        assoc = health.get("associationConfidence")
        overlap = health.get("overlapRisk")
        if isinstance(assoc, (int, float)):
            association_confidence_values.append(float(assoc))
        if isinstance(overlap, (int, float)):
            overlap_risk_values.append(float(overlap))

    for diagnostic in metrics.get("closeObjectDiagnostics") or []:
        if not class_allowed(diagnostic.get("className")):
            continue
        decision = str(diagnostic.get("guardDecision") or "unknown")
        guard_decision_counts[decision] += 1
        if diagnostic.get("closeObjectGuardApplied") is True:
            close_object_guard_applied_count += 1
        if diagnostic.get("rejected") is True:
            rejected_by_close_object_guard_count += 1
        center_jump = diagnostic.get("centerJump")
        if isinstance(center_jump, (int, float)):
            center_jump_values.append(float(center_jump))
        if len(track_issue_rows) < 200:
            track_issue_rows.append({
                "source": "close-object",
                "trackId": diagnostic.get("trackId"),
                "className": diagnostic.get("className"),
                "type": decision,
                "closeObjectRisk": diagnostic.get("closeObjectRisk"),
                "scoreMargin": diagnostic.get("scoreMargin"),
                "centerJump": diagnostic.get("centerJump"),
                "guardApplied": diagnostic.get("closeObjectGuardApplied"),
                "rejected": diagnostic.get("rejected"),
            })

    issue_report = metrics.get("trackingIssueReport") or {}
    for issue in issue_report.get("issues") or []:
        if not class_allowed(issue.get("className")):
            continue
        issue_type = str(issue.get("type") or issue.get("issueType") or "unknown")
        issue_observation_counts[issue_type] += 1
        issue_key = "{typ}:{class_name}:{track_id}".format(
            typ=issue_type,
            class_name=str(issue.get("className") or ""),
            track_id=str(issue.get("trackId") or ""),
        )
        issue_keys_by_type[issue_type].add(issue_key)
        health = issue.get("trackHealth") or {}
        assoc = health.get("associationConfidence")
        overlap = health.get("overlapRisk")
        if isinstance(assoc, (int, float)):
            association_confidence_values.append(float(assoc))
        if isinstance(overlap, (int, float)):
            overlap_risk_values.append(float(overlap))
        if len(track_issue_rows) < 200:
            track_issue_rows.append({
                "source": "tracking-issue",
                "trackId": issue.get("trackId"),
                "className": issue.get("className"),
                "type": issue_type,
                "associationConfidence": health.get("associationConfidence"),
                "overlapRisk": health.get("overlapRisk"),
                "missedFrameCount": health.get("missedFrameCount"),
                "directionChangeCount": health.get("directionChangeCount"),
            })

    metrics_report = metrics.get("metricsReport") or {}
    for key, value in (metrics_report.get("eventState") or {}).items():
        if isinstance(value, (int, float)):
            event_counts[key] = max(event_counts[key], int(value))
    for key, value in (metrics_report.get("scenarioState") or {}).items():
        if isinstance(value, (int, float)):
            scenario_counts[key] = max(scenario_counts[key], int(value))
issue_counts = collections.Counter({
    issue_type: len(keys)
    for issue_type, keys in issue_keys_by_type.items()
})
summary = {
    "iteration": iteration,
    "rawSamples": len(raw_samples),
    "samples": len(effective_samples),
    "segmentAware": segment_aware,
    "segmentCount": len(segment_summaries),
    "ptsRegressionCount": pts_regression_count,
    "stalePtsSamples": stale_pts_samples,
    "stalePtsRatio": round(stale_pts_ratio, 3),
    "stressMode": stress_mode,
    "idSwitchRiskScore": round(id_switch_risk_score, 3),
    "classWhitelist": sorted(allowed_classes) if not allow_all_classes else ["*"],
    "minTrackSamples": min_track_samples,
    "uniqueTracks": unique_tracks,
    "maxSimultaneousTracks": max_simultaneous,
    "fragmentationRatio": round(fragmentation_ratio, 3),
    "overlapFocus": overlap_focus,
    "overlapMinSimultaneous": overlap_min_simultaneous,
    "overlapSampleCount": overlap_sample_count,
    "overlapFragmentationRatio": round(overlap_fragmentation_ratio, 3),
    "excludedShortTracks": len(excluded_short_tracks),
    "excludedClassTracks": len(excluded_class_tracks),
    "classTrackCounts": dict(sorted(class_track_counts.items())),
    "classSampleCounts": dict(sorted(class_sample_counts.items())),
    "categoryTrackCounts": dict(sorted(category_track_counts.items())),
    "categorySampleCounts": dict(sorted(category_sample_counts.items())),
    "medianTrackLifetimeSamples": median_lifetime,
    "emptyDetectionSamples": empty_detection_samples,
    "finalAnalyzedPackets": final_analyzed,
    "averageAnalysisMs": round(avg_ms, 3),
    "minAssociationConfidence": round(min(association_confidence_values), 6)
    if association_confidence_values else None,
    "maxOverlapRisk": round(max(overlap_risk_values), 6) if overlap_risk_values else None,
    "maxCenterJump": round(max(center_jump_values), 6) if center_jump_values else None,
    "lostCount": max(lost_count_values) if lost_count_values else 0,
    "reacquiredCount": max(reacquired_count_values) if reacquired_count_values else 0,
    "missedFrameSpikeCount": int(issue_counts.get("missed-frame-spike", 0)),
    "directionChangeSpikeCount": int(issue_counts.get("direction-change-spike", 0)),
    "trackingIssueCounts": dict(sorted(issue_counts.items())),
    "trackingIssueObservationCounts": dict(sorted(issue_observation_counts.items())),
    "guardDecisionCounts": dict(sorted(guard_decision_counts.items())),
    "closeObjectGuardAppliedCount": close_object_guard_applied_count,
    "rejectedByCloseObjectGuardCount": rejected_by_close_object_guard_count,
    "eventScenarioSignature": {
        "eventState": dict(sorted(event_counts.items())),
        "scenarioState": dict(sorted(scenario_counts.items())),
    },
    "trackIssueTable": track_issue_rows,
    "segments": segment_summaries,
}
print("tracker_iteration_summary=", summary)
with summary_file.open("a") as handle:
    handle.write(json.dumps(summary, ensure_ascii=False) + "\n")

errors = []
if len(effective_samples) < min_samples:
    errors.append(f"effective snapshot sample 부족: {len(effective_samples)} < {min_samples}")
if max_simultaneous < min_max_simultaneous:
    errors.append(f"동시 track 수 부족: {max_simultaneous} < {min_max_simultaneous}")
if fragmentation_ratio > max_fragmentation_ratio:
    errors.append(
        f"track fragmentation ratio 초과: {fragmentation_ratio:.3f} > {max_fragmentation_ratio:.3f}"
    )
if stale_pts_ratio > max_stale_ratio:
    errors.append(f"stale PTS ratio 초과: {stale_pts_ratio:.3f} > {max_stale_ratio:.3f}")
if id_switch_risk_score > max_id_switch_risk:
    errors.append(f"ID switch 위험 점수 초과: {id_switch_risk_score:.3f} > {max_id_switch_risk:.3f}")
if overlap_focus and overlap_sample_count <= 0:
    errors.append(f"overlap sample 없음: simultaneous >= {overlap_min_simultaneous}")
if overlap_focus and overlap_fragmentation_ratio > max_overlap_fragmentation_ratio:
    errors.append(
        f"overlap fragmentation ratio 초과: {overlap_fragmentation_ratio:.3f} > {max_overlap_fragmentation_ratio:.3f}"
    )
if final_analyzed <= 0:
    errors.append("분석 packet이 증가하지 않음")

if errors:
    for error in errors:
        print("ERROR:", error)
    raise SystemExit(1)
PY
  then
    log_pass "tracker stability iteration ${iteration} 통계 기준 통과"
  else
    log_fail "tracker stability iteration ${iteration} 통계 기준 실패"
  fi

  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${CURRENT_TAP_ID}" >/dev/null 2>&1 || true
  CURRENT_TAP_ID=""
  if [[ "${RESTART_BETWEEN_ITERATIONS}" == "1" && "${iteration}" -lt "${REPEAT_COUNT}" ]]; then
    log_info "source 재시작 대기: ${RESTART_WAIT_S}s"
    sleep "${RESTART_WAIT_S}"
  fi
done

python3 - "${SUMMARY_FILE}" <<'PY'
import collections
import json
import pathlib
import statistics
import sys

items = [json.loads(line) for line in pathlib.Path(sys.argv[1]).read_text().splitlines() if line.strip()]
if not items:
    raise SystemExit(0)
ratios = [float(item["fragmentationRatio"]) for item in items]
overlap_ratios = [float(item.get("overlapFragmentationRatio", 0.0)) for item in items]
overlap_samples = [int(item.get("overlapSampleCount", 0)) for item in items]
stale_ratios = [float(item.get("stalePtsRatio", 0.0)) for item in items]
risk_scores = [float(item.get("idSwitchRiskScore", 0.0)) for item in items]
category_track_counts = collections.Counter()
category_sample_counts = collections.Counter()
class_track_counts = collections.Counter()
for item in items:
    category_track_counts.update(item.get("categoryTrackCounts") or {})
    category_sample_counts.update(item.get("categorySampleCounts") or {})
    class_track_counts.update(item.get("classTrackCounts") or {})
print("tracker_repeat_count=", len(items))
print("fragmentation_ratio_min=", min(ratios))
print("fragmentation_ratio_max=", max(ratios))
print("fragmentation_ratio_avg=", round(statistics.mean(ratios), 3))
print("overlap_fragmentation_ratio_max=", max(overlap_ratios))
print("overlap_sample_count_total=", sum(overlap_samples))
print("stale_pts_ratio_max=", max(stale_ratios))
print("id_switch_risk_score_max=", max(risk_scores))
print("category_track_counts=", dict(sorted(category_track_counts.items())))
print("category_sample_counts=", dict(sorted(category_sample_counts.items())))
print("class_track_counts=", dict(sorted(class_track_counts.items())))
PY
echo "[summary] tracker stability 반복 요약 생성"

echo
echo "== tracker stability 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- summary log: ${SUMMARY_FILE}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
