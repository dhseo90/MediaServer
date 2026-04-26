#!/usr/bin/env bash
# 파일 용도: adaptive tuner가 과부하/저부하 상황에서 fps를 자동 조절하는지 장시간 검증한다.
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
TAP_IDS=()
CREATED_TAP_ID=""
RUN_ID="adaptive-$(date +%s)-$$"
DOWN_LOG="/tmp/media_server_${RUN_ID}_downshift.ndjson"
UP_LOG="/tmp/media_server_${RUN_ID}_upshift.ndjson"

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

cleanup_runtime_documents() {
  if ((${#TAP_IDS[@]} > 0)); then
    for tap_id in "${TAP_IDS[@]}"; do
      curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${tap_id}" >/dev/null 2>&1 || true
    done
  fi
}
trap cleanup_runtime_documents EXIT

create_tap() {
  local query="$1"
  local response
  response="$(curl -fsS -X POST "${HTTP_BASE}/lab/analysis/taps?${query}")"
  local tap_id
  tap_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tapId",""))' <<<"${response}")"
  if [[ -z "${tap_id}" ]]; then
    log_fail "analysis tap 생성 실패"
    echo "${response}" | sed 's/^/  /'
    exit 1
  fi
  TAP_IDS+=("${tap_id}")
  CREATED_TAP_ID="${tap_id}"
}

poll_tap() {
  local tap_id="$1"
  local output_file="$2"
  local count="$3"
  local interval="$4"
  : > "${output_file}"
  for _ in $(seq 1 "${count}"); do
    sleep "${interval}"
    curl -fsS "${HTTP_BASE}/lab/analysis/taps/${tap_id}" >> "${output_file}"
    printf '\n' >> "${output_file}"
  done
}

assert_downshift() {
  python3 - "$1" <<'PY'
import json
import pathlib
import sys

values = []
for line in pathlib.Path(sys.argv[1]).read_text().splitlines():
    if not line.strip():
        continue
    tap = json.loads(line).get("tap") or {}
    values.append({
        "targetFps": int(tap.get("targetFps") or 0),
        "down": int(tap.get("adaptiveDownshiftCount") or 0),
        "up": int(tap.get("adaptiveUpshiftCount") or 0),
        "state": tap.get("adaptiveState") or "",
        "avgMs": float(tap.get("averageAnalysisMs") or 0.0),
        "analyzed": int(tap.get("analyzedPackets") or 0),
    })

if len(values) < 5:
    raise SystemExit("snapshot sample 부족")
last = values[-1]
min_fps = min(v["targetFps"] for v in values if v["targetFps"] > 0)
max_down = max(v["down"] for v in values)
print("downshift_initial=", values[0])
print("downshift_final=", last)
print("downshift_min_fps=", min_fps, "max_downshift_count=", max_down)
if max_down <= 0:
    raise SystemExit("adaptive downshift가 발생하지 않음")
if min_fps > 3:
    raise SystemExit(f"targetFps가 충분히 내려가지 않음: min={min_fps}")
if last["analyzed"] <= 0:
    raise SystemExit("분석 packet이 증가하지 않음")
PY
}

assert_upshift() {
  python3 - "$1" <<'PY'
import json
import pathlib
import sys

values = []
for line in pathlib.Path(sys.argv[1]).read_text().splitlines():
    if not line.strip():
        continue
    tap = json.loads(line).get("tap") or {}
    values.append({
        "targetFps": int(tap.get("targetFps") or 0),
        "down": int(tap.get("adaptiveDownshiftCount") or 0),
        "up": int(tap.get("adaptiveUpshiftCount") or 0),
        "state": tap.get("adaptiveState") or "",
        "avgMs": float(tap.get("averageAnalysisMs") or 0.0),
        "analyzed": int(tap.get("analyzedPackets") or 0),
    })

if len(values) < 5:
    raise SystemExit("snapshot sample 부족")
last = values[-1]
max_fps = max(v["targetFps"] for v in values)
max_up = max(v["up"] for v in values)
print("upshift_initial=", values[0])
print("upshift_final=", last)
print("upshift_max_fps=", max_fps, "max_upshift_count=", max_up)
if max_up <= 0:
    raise SystemExit("adaptive upshift가 발생하지 않음")
if max_fps < 4:
    raise SystemExit(f"targetFps가 충분히 올라가지 않음: max={max_fps}")
if last["analyzed"] <= 0:
    raise SystemExit("분석 packet이 증가하지 않음")
PY
}

require_cmd curl
require_cmd python3

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_ADAPTIVE_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_ADAPTIVE_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_ADAPTIVE_FILE:-va_four_scene_sample.mp4}"
ENCODED_FILE="$(urlencode_file_token "${FILE_TOKEN}")"
POLL_COUNT="${MEDIA_SERVER_VERIFY_ADAPTIVE_POLL_COUNT:-80}"
POLL_INTERVAL_S="${MEDIA_SERVER_VERIFY_ADAPTIVE_POLL_INTERVAL_S:-0.25}"

log_info "http_base=${HTTP_BASE}"
log_info "file=${FILE_TOKEN}"
log_info "poll=${POLL_COUNT} interval=${POLL_INTERVAL_S}s"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

DOWN_QUERY="file=${ENCODED_FILE}&va=1&detector=dummy&fps=8&maxQueue=1&adaptive=1&adaptiveInputSize=1&inputWidth=640&inputHeight=640&adaptiveMinFps=2&adaptiveMaxFps=8&adaptiveMinInputWidth=320&adaptiveMinInputHeight=320&adaptiveMaxInputWidth=640&adaptiveMaxInputHeight=640&adaptiveInputStep=160&adaptiveCooldownMs=250&detectorDelayMs=220"
create_tap "${DOWN_QUERY}"
DOWN_TAP="${CREATED_TAP_ID}"
log_pass "downshift tap 생성: ${DOWN_TAP}"
poll_tap "${DOWN_TAP}" "${DOWN_LOG}" "${POLL_COUNT}" "${POLL_INTERVAL_S}"
if assert_downshift "${DOWN_LOG}"; then
  log_pass "adaptive downshift 장시간 검증"
else
  log_fail "adaptive downshift 장시간 검증 실패"
fi
curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${DOWN_TAP}" >/dev/null 2>&1 || true

UP_QUERY="file=${ENCODED_FILE}&va=1&detector=dummy&fps=2&maxQueue=2&adaptive=1&adaptiveInputSize=0&adaptiveMinFps=2&adaptiveMaxFps=6&adaptiveCooldownMs=250&detectorDelayMs=0"
create_tap "${UP_QUERY}"
UP_TAP="${CREATED_TAP_ID}"
log_pass "upshift tap 생성: ${UP_TAP}"
poll_tap "${UP_TAP}" "${UP_LOG}" "${POLL_COUNT}" "${POLL_INTERVAL_S}"
if assert_upshift "${UP_LOG}"; then
  log_pass "adaptive upshift 장시간 검증"
else
  log_fail "adaptive upshift 장시간 검증 실패"
fi
curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${UP_TAP}" >/dev/null 2>&1 || true

echo
echo "== adaptive tuner 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- downshift log: ${DOWN_LOG}"
echo "- upshift log: ${UP_LOG}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
