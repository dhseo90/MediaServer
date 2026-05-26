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
INPUT_LOG="/tmp/media_server_${RUN_ID}_input_size.ndjson"
SUMMARY_FILE="/tmp/media_server_${RUN_ID}_summary.json"

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
        "modelInputWidth": int(tap.get("modelInputWidth") or 0),
        "modelInputHeight": int(tap.get("modelInputHeight") or 0),
        "adaptiveInputSizeEnabled": bool(tap.get("adaptiveInputSizeEnabled")),
        "adaptiveInputSizeDisabled": bool(tap.get("adaptiveInputSizeDisabled")),
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
print("downshift_input_min=", min(v["modelInputWidth"] for v in values if v["modelInputWidth"] > 0), "x", min(v["modelInputHeight"] for v in values if v["modelInputHeight"] > 0))
if max_down <= 0:
    raise SystemExit("adaptive downshift가 발생하지 않음")
if min_fps > 3:
    raise SystemExit(f"targetFps가 충분히 내려가지 않음: min={min_fps}")
if last["analyzed"] <= 0:
    raise SystemExit("분석 packet이 증가하지 않음")
PY
}

assert_input_size_fallback() {
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
        "state": tap.get("adaptiveState") or "",
        "modelInputWidth": int(tap.get("modelInputWidth") or 0),
        "modelInputHeight": int(tap.get("modelInputHeight") or 0),
        "adaptiveInputSizeEnabled": bool(tap.get("adaptiveInputSizeEnabled")),
        "adaptiveInputSizeDisabled": bool(tap.get("adaptiveInputSizeDisabled")),
        "analyzed": int(tap.get("analyzedPackets") or 0),
    })

if len(values) < 5:
    raise SystemExit("snapshot sample 부족")
widths = [v["modelInputWidth"] for v in values if v["modelInputWidth"] > 0]
heights = [v["modelInputHeight"] for v in values if v["modelInputHeight"] > 0]
states = sorted({v["state"] for v in values if v["state"]})
disabled = any(v["adaptiveInputSizeDisabled"] for v in values)
print("input_size_initial=", values[0])
print("input_size_final=", values[-1])
print("input_size_min=", min(widths or [0]), "x", min(heights or [0]), "states=", states, "disabled=", disabled)
if not any(v["adaptiveInputSizeEnabled"] for v in values):
    raise SystemExit("adaptive input-size가 활성화된 snapshot이 없음")
if not disabled and not any(v["modelInputWidth"] <= 480 and v["modelInputHeight"] <= 480 for v in values):
    raise SystemExit("adaptive input-size가 줄지 않았고 fallback disabled 상태도 아님")
if values[-1]["analyzed"] <= 0:
    raise SystemExit("분석 packet이 증가하지 않음")
PY
}

input_size_result_modes() {
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
        "modelInputWidth": int(tap.get("modelInputWidth") or 0),
        "modelInputHeight": int(tap.get("modelInputHeight") or 0),
        "adaptiveInputSizeDisabled": bool(tap.get("adaptiveInputSizeDisabled")),
    })

downshift = any(
    value["modelInputWidth"] <= 480 and value["modelInputHeight"] <= 480
    for value in values
    if value["modelInputWidth"] > 0 and value["modelInputHeight"] > 0
)
fallback = any(value["adaptiveInputSizeDisabled"] for value in values)
modes = []
if downshift:
    modes.append("downshift")
if fallback:
    modes.append("fallback")
print(" ".join(modes))
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
        "modelInputWidth": int(tap.get("modelInputWidth") or 0),
        "modelInputHeight": int(tap.get("modelInputHeight") or 0),
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

INPUT_QUERY="file=${ENCODED_FILE}&va=1&detector=dummy&fps=8&maxQueue=1&adaptive=1&adaptiveInputSize=1&inputWidth=640&inputHeight=640&adaptiveMinFps=8&adaptiveMaxFps=8&adaptiveMinInputWidth=320&adaptiveMinInputHeight=320&adaptiveMaxInputWidth=640&adaptiveMaxInputHeight=640&adaptiveInputStep=160&adaptiveCooldownMs=250&detectorDelayMs=220"
create_tap "${INPUT_QUERY}"
INPUT_TAP="${CREATED_TAP_ID}"
log_pass "input-size tap 생성: ${INPUT_TAP}"
poll_tap "${INPUT_TAP}" "${INPUT_LOG}" "${POLL_COUNT}" "${POLL_INTERVAL_S}"
if assert_input_size_fallback "${INPUT_LOG}"; then
  INPUT_SIZE_MODES="$(input_size_result_modes "${INPUT_LOG}")"
  if [[ " ${INPUT_SIZE_MODES} " == *" downshift "* ]]; then
    log_pass "adaptive input-size downshift 검증"
  fi
  if [[ " ${INPUT_SIZE_MODES} " == *" fallback "* ]]; then
    log_pass "adaptive input-size fallback disabled 검증"
  fi
else
  log_fail "adaptive input-size 조정 기준 검증 실패"
fi
curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${INPUT_TAP}" >/dev/null 2>&1 || true

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

python3 - "${DOWN_LOG}" "${INPUT_LOG}" "${UP_LOG}" "${SUMMARY_FILE}" <<'PY'
import json
import pathlib
import sys

def load(path):
    items = []
    for line in pathlib.Path(path).read_text().splitlines():
        if not line.strip():
            continue
        tap = json.loads(line).get("tap") or {}
        items.append({
            "targetFps": tap.get("targetFps", 0),
            "modelInputWidth": tap.get("modelInputWidth", 0),
            "modelInputHeight": tap.get("modelInputHeight", 0),
            "state": tap.get("adaptiveState", ""),
            "downshiftCount": tap.get("adaptiveDownshiftCount", 0),
            "upshiftCount": tap.get("adaptiveUpshiftCount", 0),
            "averageAnalysisMs": tap.get("averageAnalysisMs", 0),
        })
    return items

summary = {
    "downshift": {
        "first": load(sys.argv[1])[0] if load(sys.argv[1]) else {},
        "last": load(sys.argv[1])[-1] if load(sys.argv[1]) else {},
        "states": sorted({item["state"] for item in load(sys.argv[1]) if item["state"]}),
    },
    "inputSize": {
        "first": load(sys.argv[2])[0] if load(sys.argv[2]) else {},
        "last": load(sys.argv[2])[-1] if load(sys.argv[2]) else {},
        "states": sorted({item["state"] for item in load(sys.argv[2]) if item["state"]}),
    },
    "upshift": {
        "first": load(sys.argv[3])[0] if load(sys.argv[3]) else {},
        "last": load(sys.argv[3])[-1] if load(sys.argv[3]) else {},
        "states": sorted({item["state"] for item in load(sys.argv[3]) if item["state"]}),
    },
}
pathlib.Path(sys.argv[4]).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
print("adaptive_summary=", summary)
PY
log_pass "adaptive 상태 전환 summary artifact 생성"

echo
echo "== adaptive tuner 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- downshift log: ${DOWN_LOG}"
echo "- input-size log: ${INPUT_LOG}"
echo "- upshift log: ${UP_LOG}"
echo "- summary: ${SUMMARY_FILE}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
