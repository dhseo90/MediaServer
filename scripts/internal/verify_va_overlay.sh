#!/usr/bin/env bash
# 파일 용도: YOLO/VA overlay 경로를 lab 상태, RTSP consume, WebRTC consume 기준으로 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" && "${MEDIA_SERVER_SKIP_LOCAL_ENV:-0}" != "1" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
elif [[ "${MEDIA_SERVER_SKIP_LOCAL_ENV:-0}" == "1" ]]; then
  echo "[env] skipped local override: ${ENV_FILE}"
fi

STD_AFX="${ROOT_DIR}/include/stdafx.h"
PORT_FILE="${ROOT_DIR}/.media_server.port"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TAP_ID=""

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
    log_fail "missing required command: $1"
    exit 1
  fi
}

run_with_timeout() {
  local timeout_s="$1"
  shift
  "$@" &
  local child_pid=$!
  local elapsed=0
  while kill -0 "${child_pid}" >/dev/null 2>&1; do
    if (( elapsed >= timeout_s )); then
      echo "[fail] command timed out after ${timeout_s}s: $*"
      kill "${child_pid}" >/dev/null 2>&1 || true
      sleep 2
      if kill -0 "${child_pid}" >/dev/null 2>&1; then
        kill -9 "${child_pid}" >/dev/null 2>&1 || true
      fi
      wait "${child_pid}" >/dev/null 2>&1 || true
      return 124
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  wait "${child_pid}"
}

urlencode() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
}

json_field() {
  local field="$1"
  python3 -c '
import json
import sys

field = sys.argv[1]
try:
    payload = json.load(sys.stdin)
except json.JSONDecodeError:
    print("")
    raise SystemExit(0)
value = payload
for part in field.split("."):
    if isinstance(value, dict):
        value = value.get(part, "")
    else:
        value = ""
        break
if isinstance(value, bool):
    print("true" if value else "false")
elif value is None:
    print("")
else:
    print(value)
' "$field"
}

resolve_port() {
  local env_value="$1"
  local file_path="$2"
  local const_name="$3"
  local fallback="$4"
  if [[ -n "${env_value}" ]]; then
    printf '%s' "${env_value}"
  elif [[ -f "${file_path}" ]]; then
    cat "${file_path}"
  else
    local parsed
    parsed="$(sed -nE "s/.*${const_name} = ([0-9]+).*/\\1/p" "${STD_AFX}" | head -n1)"
    printf '%s' "${parsed:-${fallback}}"
  fi
}

client_host() {
  local value="$1"
  if [[ "${value}" == "0.0.0.0" || "${value}" == "::" || -z "${value}" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

append_extra_query() {
  local extra="$1"
  if [[ -n "${extra}" ]]; then
    printf '&%s' "${extra#&}"
  fi
}

cleanup() {
  if [[ -n "${TAP_ID}" ]]; then
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

require_cmd python3
require_cmd curl

RTSP_PORT="$(resolve_port "${MEDIA_SERVER_LISTEN_PORT:-}" "${PORT_FILE}" "kRtspListenPort" "8554")"
HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "/dev/null" "kHttpListenPort" "8080")"

if [[ -f "${ADDRESS_FILE}" ]]; then
  RTSP_ADDRESS="$(cat "${ADDRESS_FILE}")"
else
  RTSP_ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kRtspListenAddress" || true)}"
fi
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"

VERIFY_HOST="${MEDIA_SERVER_VERIFY_HOST:-}"
RTSP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_VA_RTSP_HOST:-${VERIFY_HOST:-${RTSP_ADDRESS}}}")"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_VA_HTTP_HOST:-${VERIFY_HOST:-${HTTP_ADDRESS}}}")"
ROUTE="$(sed -nE 's/.*kStreamRoute = "([^"]+)".*/\1/p' "${STD_AFX}" | head -n1)"
ROUTE="${MEDIA_SERVER_VERIFY_VA_ROUTE:-${ROUTE:-dhseo}}"

HTTP_BASE="${MEDIA_SERVER_VERIFY_VA_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
RTSP_BASE="${MEDIA_SERVER_VERIFY_VA_RTSP_BASE:-rtsp://${RTSP_HOST}:${RTSP_PORT}/${ROUTE}}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_VA_FILE:-va_four_scene_sample.mp4}"
MODEL_PATH="$(media_server_resolve_project_path "${ROOT_DIR}" "${MEDIA_SERVER_ANALYSIS_MODEL:-models/yolo11n.onnx}")"
LABELS_PATH="$(media_server_resolve_project_path "${ROOT_DIR}" "${MEDIA_SERVER_ANALYSIS_LABELS:-models/coco.names}")"
DURATION_S="${MEDIA_SERVER_VERIFY_VA_DURATION_S:-15}"
FFMPEG_TIMEOUT_S="${MEDIA_SERVER_VERIFY_VA_FFMPEG_TIMEOUT_S:-}"
POLL_INTERVAL_S="${MEDIA_SERVER_VERIFY_VA_POLL_INTERVAL_S:-2}"
REQUIRE_DETECTIONS="${MEDIA_SERVER_VERIFY_VA_REQUIRE_DETECTIONS:-1}"
EXTRA_QUERY="${MEDIA_SERVER_VERIFY_VA_EXTRA_QUERY:-}"
REDACTION_MODE="${MEDIA_SERVER_VERIFY_VA_REDACTION:-}"
REDACTION_CLASSES="${MEDIA_SERVER_VERIFY_VA_REDACTION_CLASSES:-}"
REDACTION_BLOCK_SIZE="${MEDIA_SERVER_VERIFY_VA_REDACTION_BLOCK_SIZE:-}"
REDACTION_MARGIN_RATIO="${MEDIA_SERVER_VERIFY_VA_REDACTION_MARGIN_RATIO:-}"
SKIP_LAB="${MEDIA_SERVER_VERIFY_VA_SKIP_LAB:-0}"
SKIP_RTSP="${MEDIA_SERVER_VERIFY_VA_SKIP_RTSP:-0}"

log_info "http_base=${HTTP_BASE}"
log_info "rtsp_base=${RTSP_BASE}"
log_info "file=${FILE_TOKEN}"
log_info "duration_s=${DURATION_S}"

if ! [[ "${DURATION_S}" =~ ^[0-9]+$ ]] || (( DURATION_S <= 0 )); then
  log_fail "invalid duration_s: ${DURATION_S}"
  exit 1
fi
if [[ -z "${FFMPEG_TIMEOUT_S}" ]]; then
  FFMPEG_TIMEOUT_S=$((DURATION_S + 60))
fi
if ! [[ "${FFMPEG_TIMEOUT_S}" =~ ^[0-9]+$ ]] || (( FFMPEG_TIMEOUT_S <= DURATION_S )); then
  log_fail "invalid ffmpeg_timeout_s: ${FFMPEG_TIMEOUT_S}"
  exit 1
fi
log_info "ffmpeg_timeout_s=${FFMPEG_TIMEOUT_S}"

if [[ ! -f "${MODEL_PATH}" ]]; then
  log_fail "missing YOLO model: ${MODEL_PATH}"
  exit 1
fi
if [[ ! -f "${LABELS_PATH}" ]]; then
  log_fail "missing YOLO labels: ${LABELS_PATH}"
  exit 1
fi

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check failed: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

run_lab_regression() {
  if [[ "${SKIP_LAB}" == "1" ]]; then
    log_skip "lab analysis regression skipped"
    return
  fi

  local profile_id="va-regression-$(date +%s)"
  local query="file=$(urlencode "${FILE_TOKEN}")&profileId=${profile_id}&va=1$(append_extra_query "${EXTRA_QUERY}")"
  local response
  response="$(curl -fsS -X POST "${HTTP_BASE}/lab/analysis/taps?${query}")"
  TAP_ID="$(printf '%s' "${response}" | json_field "tapId")"
  if [[ -z "${TAP_ID}" ]]; then
    log_fail "failed to create analysis tap"
    echo "${response}" | sed 's/^/  /'
    return
  fi
  log_info "analysis tap=${TAP_ID}"

  local started_at now status
  started_at="$(date +%s)"
  status=""
  while true; do
    now="$(date +%s)"
    if (( now - started_at >= DURATION_S )); then
      break
    fi
    status="$(curl -fsS "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}")"
    python3 -c '
import json
import sys

payload = json.load(sys.stdin).get("tap", {})
result = payload.get("latestResult") or {}
detections = result.get("detections") or []
labels = sorted({item.get("label", "") for item in detections if item.get("label")})
label_text = ",".join(labels[:8])
decoded = payload.get("decodedFrames", 0)
analyzed = payload.get("analyzedPackets", 0)
pending = payload.get("pendingFrames", 0)
target_fps = payload.get("targetFps", 0)
average_ms = payload.get("averageAnalysisMs", 0)
adaptive_state = payload.get("adaptiveState", "")
print(
    "[tap] "
    f"decoded={decoded} "
    f"analyzed={analyzed} "
    f"pending={pending} "
    f"targetFps={target_fps} "
    f"avgMs={average_ms} "
    f"adaptive={adaptive_state} "
    f"detections={len(detections)} "
    f"labels={label_text}"
)
' <<<"${status}"
    sleep "${POLL_INTERVAL_S}"
  done

  status="$(curl -fsS "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}")"
  if python3 -c '
import json
import sys

require_detections = sys.argv[1] == "1"
payload = json.load(sys.stdin).get("tap", {})
result = payload.get("latestResult") or {}
detections = result.get("detections") or []
errors = []
if payload.get("decodedFrames", 0) <= 0:
    errors.append("decodedFrames did not increase")
if payload.get("analyzedPackets", 0) <= 0:
    errors.append("analyzedPackets did not increase")
if payload.get("decoderErrors", 0) != 0:
    errors.append(f"decoderErrors={payload.get('decoderErrors')}")
if not payload.get("hasResult", False):
    errors.append("missing latest analysis result")
if require_detections and len(detections) <= 0:
    errors.append("missing detections")
if errors:
    print("; ".join(errors))
    raise SystemExit(1)
labels = sorted({item.get("label", "") for item in detections if item.get("label")})
label_text = ",".join(labels[:8])
decoded = payload.get("decodedFrames")
analyzed = payload.get("analyzedPackets")
target_fps = payload.get("targetFps")
adaptive_state = payload.get("adaptiveState")
print(
    f"decoded={decoded} analyzed={analyzed} "
    f"detections={len(detections)} labels={label_text} "
    f"targetFps={target_fps} adaptive={adaptive_state}"
)
' "${REQUIRE_DETECTIONS}" <<<"${status}"
  then
    log_pass "lab YOLO analysis status ok"
  else
    log_fail "lab YOLO analysis status failed"
    echo "${status}" | sed 's/^/  /'
  fi

  local overlay_file
  overlay_file="$(mktemp "${TMPDIR:-/tmp}/media-server-overlay.XXXXXX")"
  if curl -fsS "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}/overlay.jpg?quality=80&thickness=3&drawLabels=1$(append_extra_query "${EXTRA_QUERY}")" -o "${overlay_file}" &&
     python3 - "${overlay_file}" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
data = path.read_bytes()
if len(data) < 1024 or data[:2] != b"\xff\xd8":
    raise SystemExit(1)
print(f"overlay_jpeg_bytes={len(data)}")
PY
  then
    log_pass "lab overlay snapshot ok"
    log_info "lab overlay snapshot saved: ${overlay_file}"
  else
    log_fail "lab overlay snapshot failed"
  fi
}

run_rtsp_regression() {
  if [[ "${SKIP_RTSP}" == "1" ]]; then
    log_skip "RTSP VA overlay regression skipped"
    return
  fi
  require_cmd ffmpeg

  local rtsp_query="file=$(urlencode "${FILE_TOKEN}")&va=1$(append_extra_query "${EXTRA_QUERY}")"
  local rtsp_url="${MEDIA_SERVER_VERIFY_VA_RTSP_URL:-${RTSP_BASE}?${rtsp_query}}"
  local max_attempts="${MEDIA_SERVER_VERIFY_VA_RTSP_ATTEMPTS:-2}"
  if ! [[ "${max_attempts}" =~ ^[0-9]+$ ]] || (( max_attempts < 1 )); then
    max_attempts=1
  fi
  log_info "rtsp_url=${rtsp_url}"
  local attempt=1
  local rc=0
  while (( attempt <= max_attempts )); do
    if run_with_timeout "${FFMPEG_TIMEOUT_S}" ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -i "${rtsp_url}" -t "${DURATION_S}" -an -f null -; then
      log_pass "RTSP VA overlay decode ok"
      return
    fi
    rc=$?
    if (( rc == 124 && attempt < max_attempts )); then
      log_info "RTSP VA overlay decode timeout; retry ${attempt}/${max_attempts}"
      sleep 2
      attempt=$((attempt + 1))
      continue
    fi
    log_fail "RTSP VA overlay decode failed"
    return
  done
}

run_lab_regression
run_rtsp_regression

echo
echo "[summary] pass=${PASS_COUNT} fail=${FAIL_COUNT} skip=${SKIP_COUNT}"
if (( FAIL_COUNT > 0 )); then
  exit 1
fi
