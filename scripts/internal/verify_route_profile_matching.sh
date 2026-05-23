#!/usr/bin/env bash
# 파일 용도: 실제 RTSP overlay 세션에서 route별 profile/rule matching이 적용되는지 검증한다.
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
RUN_ID="route-profile-$(date +%s)-$$"
BASE_ID=$(( (($(date +%s) % 1000000) * 1000) + ($$ % 1000) ))
PROFILE_RTSP="$((BASE_ID + 11))"
RULE_RTSP="$((BASE_ID + 21))"
RTSP_FFMPEG_PID=""
RTSP_LOG="/tmp/media_server_${RUN_ID}_rtsp.log"
TAPS_FILE="/tmp/media_server_${RUN_ID}_taps.json"
PROFILE_RTSP_READ_FILE="/tmp/media_server_${RUN_ID}_profile_rtsp.json"
RULE_RTSP_READ_FILE="/tmp/media_server_${RUN_ID}_rule_rtsp.json"

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
  if [[ -n "${RTSP_FFMPEG_PID}" ]] && kill -0 "${RTSP_FFMPEG_PID}" >/dev/null 2>&1; then
    kill "${RTSP_FFMPEG_PID}" >/dev/null 2>&1 || true
  fi
  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${RULE_RTSP}" >/dev/null 2>&1 || true
  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_RTSP}" >/dev/null 2>&1 || true
}
trap cleanup_runtime_documents EXIT

wait_for_route_tap() {
  local route="$1"
  local expected_profile="$2"
  local expected_rule="$3"
  local expected_fps="$4"
  local timeout_s="$5"
  local started_at
  started_at="$(date +%s)"

  while (( $(date +%s) - started_at < timeout_s )); do
    if curl -fsS "${HTTP_BASE}/lab/analysis/taps" > "${TAPS_FILE}"; then
      if python3 - "${TAPS_FILE}" "${route}" "${expected_profile}" "${expected_rule}" "${expected_fps}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
route = sys.argv[2]
expected_profile = sys.argv[3]
expected_rule = sys.argv[4]
expected_fps = int(sys.argv[5])

for tap in payload.get("taps", []):
    context = tap.get("context") or {}
    selection = tap.get("profileSelection") or {}
    if context.get("sourceKind") != "file":
        continue
    if context.get("route") != route:
        continue
    if selection.get("source") != "rule":
        continue
    if selection.get("ruleId") != expected_rule:
        continue
    if not str(tap.get("profileKey", "")).startswith(expected_profile + ":"):
        continue
    if tap.get("detectorType") != "dummy":
        continue
    if int(tap.get("targetFps", 0)) != expected_fps:
        continue
    print(tap.get("tapId", ""))
    raise SystemExit(0)
raise SystemExit(1)
PY
      then
        return 0
      fi
    fi
    sleep 0.5
  done
  return 1
}

require_cmd curl
require_cmd python3
require_cmd ffmpeg

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
RTSP_PORT="$(resolve_port "${MEDIA_SERVER_LISTEN_PORT:-}" "kRtspListenPort" "8554")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
RTSP_ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kRtspListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_ROUTE_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
RTSP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_ROUTE_RTSP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${RTSP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_ROUTE_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
ROUTE="${MEDIA_SERVER_VERIFY_ROUTE_NAME:-$(media_server_read_const_charp "${STD_AFX}" "kStreamRoute" || true)}"
ROUTE="${ROUTE:-dhseo}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_ROUTE_FILE:-va_four_scene_sample.mp4}"
RTSP_DURATION_S="${MEDIA_SERVER_VERIFY_ROUTE_RTSP_DURATION_S:-14}"
WAIT_TIMEOUT_S="${MEDIA_SERVER_VERIFY_ROUTE_WAIT_TIMEOUT_S:-20}"
ENCODED_FILE="$(urlencode_file_token "${FILE_TOKEN}")"

log_info "http_base=${HTTP_BASE}"
log_info "rtsp=rtsp://${RTSP_HOST}:${RTSP_PORT}/${ROUTE}"
log_info "file=${FILE_TOKEN}"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

PROFILE_RTSP_JSON="{\"id\":\"${PROFILE_RTSP}\",\"detector\":\"dummy\",\"fps\":3,\"maxQueue\":1,\"confidence\":0.25,\"nms\":0.45,\"tracking\":false,\"adaptive\":false,\"trackingClasses\":[\"person\",\"vehicle\",\"animal\",\"food\"]}"
RULE_RTSP_JSON="{\"id\":\"${RULE_RTSP}\",\"priority\":120,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"rtsp\"},\"analysis\":{\"profileId\":\"${PROFILE_RTSP}\",\"classes\":[\"person\",\"vehicle\",\"animal\",\"food\"]},\"event\":{\"type\":\"presence\",\"minConfidence\":0.1,\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.0,\"y\":0.0},{\"x\":1.0,\"y\":0.0},{\"x\":1.0,\"y\":1.0},{\"x\":0.0,\"y\":1.0}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}"

curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_RTSP}" \
  -H 'Content-Type: application/json' --data "${PROFILE_RTSP_JSON}" >/dev/null
curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/rules/${RULE_RTSP}" \
  -H 'Content-Type: application/json' --data "${RULE_RTSP_JSON}" >/dev/null
log_pass "RTSP route profile/rule 저장"

if curl -fsS "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_RTSP}" > "${PROFILE_RTSP_READ_FILE}" &&
   curl -fsS "${HTTP_BASE}/lab/analysis/rules/${RULE_RTSP}" > "${RULE_RTSP_READ_FILE}"; then
  if python3 - \
    "${PROFILE_RTSP_READ_FILE}" \
    "${RULE_RTSP_READ_FILE}" <<'PY'
import json
import pathlib
import sys

profile_rtsp = json.loads(pathlib.Path(sys.argv[1]).read_text()).get("profile") or {}
rule_rtsp = json.loads(pathlib.Path(sys.argv[2]).read_text()).get("rule") or {}

expected_profile_rtsp = ["person", "vehicle", "animal", "food"]
expected_rule_rtsp = ["person", "vehicle", "animal", "food"]

def require_exact_list(name, value, expected):
    if value != expected:
        raise SystemExit(f"{name} mismatch: {value} != {expected}")

require_exact_list("profile rtsp trackingClasses", profile_rtsp.get("trackingClasses"), expected_profile_rtsp)
require_exact_list("rule rtsp classes", (rule_rtsp.get("analysis") or {}).get("classes"), expected_rule_rtsp)
PY
  then
    log_pass "Profile/Rule 카테고리 저장·복원 확인"
  else
    log_fail "Profile/Rule 카테고리 저장·복원 검증 실패"
  fi
else
  log_fail "Profile/Rule 카테고리 저장·복원 endpoint 호출 실패"
fi

RTSP_URL="rtsp://${RTSP_HOST}:${RTSP_PORT}/${ROUTE}?file=${ENCODED_FILE}&va=1"
log_info "rtsp_url=${RTSP_URL}"
ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -i "${RTSP_URL}" -t "${RTSP_DURATION_S}" -an -f null - \
  >"${RTSP_LOG}" 2>&1 &
RTSP_FFMPEG_PID=$!

if wait_for_route_tap "rtsp" "${PROFILE_RTSP}" "${RULE_RTSP}" "3" "${WAIT_TIMEOUT_S}"; then
  log_pass "RTSP overlay route=rtsp profile/rule matching 확인"
else
  log_fail "RTSP overlay route=rtsp profile/rule matching 실패"
  sed -n '1,120p' "${RTSP_LOG}" | sed 's/^/[rtsp] /'
fi

if wait "${RTSP_FFMPEG_PID}"; then
  log_pass "RTSP overlay probe decode ok"
else
  log_fail "RTSP overlay probe decode failed"
  sed -n '1,120p' "${RTSP_LOG}" | sed 's/^/[rtsp] /'
fi
RTSP_FFMPEG_PID=""

echo
echo "== route profile matching 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- RTSP 로그: ${RTSP_LOG}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
