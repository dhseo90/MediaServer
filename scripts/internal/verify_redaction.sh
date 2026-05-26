#!/usr/bin/env bash
# 파일 용도: 사람 객체 자동 모자이크(redaction)의 정적 이미지, RTSP overlay, 장기 검증 진입점을 한 번에 검증한다.
# 동작 요약: bbox 기반 pixel diff, live overlay decode/playback, 선택 event/tracker 호환 검증을 summary JSON으로 남긴다.
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
RUN_ID="redaction-$(date +%s)-$$"
WORK_DIR="${MEDIA_SERVER_VERIFY_REDACTION_WORK_DIR:-/tmp/media_server_${RUN_ID}}"
STEPS_FILE="${WORK_DIR}/steps.ndjson"
SUMMARY_FILE="${MEDIA_SERVER_VERIFY_REDACTION_SUMMARY_FILE:-/tmp/media_server_${RUN_ID}_summary.json}"
HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-}"
HTTP_BASE="${MEDIA_SERVER_VERIFY_REDACTION_HTTP_BASE:-}"
IMAGE_ASSET="${MEDIA_SERVER_VERIFY_REDACTION_IMAGE_ASSET:-va-four-scene-sample.png}"
IMAGE_FILE="${MEDIA_SERVER_VERIFY_REDACTION_IMAGE_FILE:-}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_REDACTION_FILE:-va_four_scene_sample.mp4}"
DURATION_S="${MEDIA_SERVER_VERIFY_REDACTION_DURATION_S:-12}"
REPEAT_COUNT="${MEDIA_SERVER_VERIFY_REDACTION_REPEAT:-1}"
REDACTION_CLASSES="${MEDIA_SERVER_VERIFY_REDACTION_CLASSES:-person}"
REDACTION_BLOCK_SIZE="${MEDIA_SERVER_VERIFY_REDACTION_BLOCK_SIZE:-20}"
REDACTION_MARGIN_RATIO="${MEDIA_SERVER_VERIFY_REDACTION_MARGIN_RATIO:-0.08}"
MIN_INSIDE_DIFF="${MEDIA_SERVER_VERIFY_REDACTION_MIN_INSIDE_DIFF:-2.0}"
RUN_STATIC=1
RUN_LIVE=1
RUN_EVENTS="${MEDIA_SERVER_VERIFY_REDACTION_INCLUDE_EVENTS:-0}"
RUN_TRACKER="${MEDIA_SERVER_VERIFY_REDACTION_INCLUDE_TRACKER:-0}"
RUN_URI="${MEDIA_SERVER_VERIFY_REDACTION_INCLUDE_URI:-0}"
REQUIRE_IDLE_PRECHECK="${MEDIA_SERVER_VERIFY_REDACTION_REQUIRE_IDLE_PRECHECK:-1}"
IDLE_PRECHECK_TIMEOUT_S="${MEDIA_SERVER_VERIFY_REDACTION_IDLE_PRECHECK_TIMEOUT_S:-35}"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

mkdir -p "${WORK_DIR}"
: >"${STEPS_FILE}"

# 사용 가능한 옵션과 기본 검증 범위를 출력한다.
usage() {
  cat <<EOF_USAGE
사람 객체 자동 모자이크 검증

Usage:
  ./server.sh verify-redaction [options]

Options:
  --http-base <url>          검증 대상 HTTP base. 기본 서버 설정/127.0.0.1
  --asset <name>             docs/assets 기준 정적 이미지. 기본 ${IMAGE_ASSET}
  --file <token>             video root 기준 정적 이미지
  --video <token>            live overlay 검증 영상. 기본 ${FILE_TOKEN}
  --duration <sec>           live decode/playback 유지 시간. 기본 ${DURATION_S}
  --repeat <n>               선택 장기 검증 반복 횟수. 기본 ${REPEAT_COUNT}
  --redaction-classes <csv>  모자이크 대상 category/class. 기본 ${REDACTION_CLASSES}
  --block-size <n>           mosaic block size. 기본 ${REDACTION_BLOCK_SIZE}
  --margin-ratio <n>         bbox 확장 비율. 기본 ${REDACTION_MARGIN_RATIO}
  --include-events           VA event 검증을 함께 실행해 redaction과 event 동시 사용성을 확인
  --include-tracker          tracker 안정성 검증을 함께 실행
  --include-uri              URI/HLS source 장기 검증 준비 상태를 summary에 포함
  --skip-idle-precheck       시작 시 runtime 잔여 session/stream/tap 확인을 건너뜀
  --idle-precheck-timeout <s> runtime idle 대기 시간. 기본 ${IDLE_PRECHECK_TIMEOUT_S}
  --long                     duration=30, repeat=2, events/tracker 포함
  --static-only              정적 이미지 redaction만 검증
  --live-only                RTSP/WebRTC live redaction만 검증
  --summary-file <path>      summary JSON 출력 경로
  -h, --help                 도움말 출력
EOF_USAGE
}

# 일반 진행 로그를 한 형식으로 출력한다.
log_info() { echo "[info] $*"; }

# 통과 항목 counter와 step 파일을 같이 갱신한다.
log_pass() {
  echo "[pass] $*"
  PASS_COUNT=$((PASS_COUNT + 1))
}

# 실패 항목 counter와 step 파일을 같이 갱신한다.
log_fail() {
  echo "[fail] $*"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

# 선택 항목 제외를 summary에 남긴다.
log_skip() {
  echo "[skip] $*"
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

# 필수 명령이 없으면 이후 검증 결과가 오해되지 않도록 바로 중단한다.
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[fail] 필수 도구가 없습니다: $1"
    exit 1
  fi
}

# C++ 기본값과 env override를 합쳐 HTTP port를 결정한다.
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

# 0.0.0.0 bind 주소는 client 관점에서 loopback으로 바꿔 접근한다.
client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

# query token을 URL에 안전하게 넣는다.
urlencode_token() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse

print(urllib.parse.quote(sys.argv[1], safe="/._-"))
PY
}

# 서버 runtime status endpoint에서 현재 session/stream 숫자를 가져온다.
runtime_status() {
  curl -fsS --max-time 3 "${HTTP_BASE}/lab/runtime/status"
}

# dotted path로 runtime status JSON 숫자 필드를 추출한다.
json_number() {
  local json_text="$1"
  local json_path="$2"
  python3 - "${json_text}" "${json_path}" <<'PY'
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
value = payload
for key in sys.argv[2].split("."):
    value = value.get(key, 0) if isinstance(value, dict) else 0
print(int(value or 0))
PY
}

# redaction 장기 검증 시작 전에 남은 수동 세션/stream/tap이 있는지 확인해 결과 오염을 막는다.
assert_runtime_idle_precheck() {
  if [[ "${REQUIRE_IDLE_PRECHECK}" != "1" ]]; then
    skip_step "runtime-idle-precheck" "--skip-idle-precheck 지정"
    return 0
  fi
  local deadline=$((SECONDS + IDLE_PRECHECK_TIMEOUT_S))
  local status_json="" active_sessions=0 resource_streams=0 egress_sessions=0 analysis_taps=0
  log_info "runtime idle precheck 대기 최대 ${IDLE_PRECHECK_TIMEOUT_S}s"
  while (( SECONDS < deadline )); do
    status_json="$(runtime_status || true)"
    if [[ -n "${status_json}" ]]; then
      active_sessions="$(json_number "${status_json}" "sessionManager.activeSessions")"
      resource_streams="$(json_number "${status_json}" "sessionManager.resourceActiveStreams")"
      egress_sessions="$(json_number "${status_json}" "webrtcHttp.egressSessions")"
      analysis_taps="$(json_number "${status_json}" "sessionManager.activeAnalysisTaps")"
      if [[ "${active_sessions}" -eq 0 &&
            "${resource_streams}" -eq 0 &&
            "${egress_sessions}" -eq 0 &&
            "${analysis_taps}" -eq 0 ]]; then
        log_pass "runtime idle precheck ok"
        append_step "runtime-idle-precheck" "pass" "${HTTP_BASE}/lab/runtime/status" "" 0
        return 0
      fi
    fi
    sleep 0.5
  done
  if [[ -z "${status_json}" ]]; then
    log_fail "runtime idle precheck 실패: ${HTTP_BASE}/lab/runtime/status 호출 실패"
  else
    log_fail "runtime idle precheck 실패: activeSessions=${active_sessions}, resourceActiveStreams=${resource_streams}, egressSessions=${egress_sessions}, activeAnalysisTaps=${analysis_taps}"
  fi
  echo "${status_json}" | sed 's/^/  /'
  append_step "runtime-idle-precheck" "fail" "${HTTP_BASE}/lab/runtime/status" "" 0
  return 1
}

# step 결과를 NDJSON으로 남겨 마지막 summary에서 상세 원인을 볼 수 있게 한다.
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

# shell command 기반 검증을 실행하고 로그와 counter를 기록한다.
run_step() {
  local name="$1"
  local command="$2"
  local log_file="${WORK_DIR}/${name//[^A-Za-z0-9_]/_}.log"
  local started_at="${SECONDS}"
  log_info "${name} 시작"
  set +e
  (cd "${ROOT_DIR}" && bash -lc "${command}") >"${log_file}" 2>&1
  local rc=$?
  set -e
  local duration=$((SECONDS - started_at))
  if [[ "${rc}" -eq 0 ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    append_step "${name}" "pass" "${command}" "${log_file}" "${duration}"
    echo "[pass] ${name} (${duration}s)"
    return 0
  fi
  FAIL_COUNT=$((FAIL_COUNT + 1))
  append_step "${name}" "fail" "${command}" "${log_file}" "${duration}"
  echo "[fail] ${name} (${duration}s) log=${log_file}"
  tail -n 80 "${log_file}" || true
  return 1
}

# skip step도 summary에서 빠지지 않게 명시적으로 기록한다.
skip_step() {
  local name="$1"
  local reason="$2"
  SKIP_COUNT=$((SKIP_COUNT + 1))
  append_step "${name}" "skip" "${reason}" "" 0
  echo "[skip] ${name}: ${reason}"
}

# CLI/env 값을 query string으로 직렬화해 모든 overlay 경로에 같은 redaction 옵션을 넣는다.
redaction_query() {
  printf 'redaction=person-mosaic&redactionClasses=%s&redactionBlockSize=%s&redactionMarginRatio=%s' \
    "$(urlencode_token "${REDACTION_CLASSES}")" \
    "${REDACTION_BLOCK_SIZE}" \
    "${REDACTION_MARGIN_RATIO}"
}

# 정적 이미지 metadata/snapshot/overlay를 받아 bbox 내부 pixel 차이를 계산한다.
run_static_redaction() {
  local query label encoded_token redaction_extra metadata normal_overlay redacted_overlay snapshot compare_report
  if [[ -n "${IMAGE_FILE}" ]]; then
    encoded_token="$(urlencode_token "${IMAGE_FILE}")"
    query="file=${encoded_token}"
    label="file=${IMAGE_FILE}"
  else
    encoded_token="$(urlencode_token "${IMAGE_ASSET}")"
    query="asset=${encoded_token}"
    label="asset=${IMAGE_ASSET}"
  fi
  redaction_extra="$(redaction_query)"
  metadata="${WORK_DIR}/static_metadata.json"
  normal_overlay="${WORK_DIR}/static_overlay.jpg"
  redacted_overlay="${WORK_DIR}/static_redaction_overlay.jpg"
  snapshot="${WORK_DIR}/static_snapshot.jpg"
  compare_report="${WORK_DIR}/static_pixel_diff.json"
  log_info "static redaction target=${label}"

  if ! curl -fsS "${HTTP_BASE}/lab/analysis/image?${query}" >"${metadata}"; then
    log_fail "static-redaction metadata 호출 실패"
    append_step "static-redaction" "fail" "metadata" "${metadata}" 0
    return 1
  fi
  if ! curl -fsS -o "${snapshot}" "${HTTP_BASE}/lab/analysis/image/snapshot.jpg?${query}&quality=88"; then
    log_fail "static-redaction snapshot 호출 실패"
    append_step "static-redaction" "fail" "snapshot" "${snapshot}" 0
    return 1
  fi
  if ! curl -fsS -o "${normal_overlay}" "${HTTP_BASE}/lab/analysis/image/overlay.jpg?${query}&quality=88&labelLang=ko&thickness=3"; then
    log_fail "static-redaction 일반 overlay 호출 실패"
    append_step "static-redaction" "fail" "normal overlay" "${normal_overlay}" 0
    return 1
  fi
  if ! curl -fsS -o "${redacted_overlay}" "${HTTP_BASE}/lab/analysis/image/overlay.jpg?${query}&quality=88&labelLang=ko&thickness=3&${redaction_extra}"; then
    log_fail "static-redaction redaction overlay 호출 실패"
    append_step "static-redaction" "fail" "redaction overlay" "${redacted_overlay}" 0
    return 1
  fi

  if python3 - "${metadata}" "${normal_overlay}" "${redacted_overlay}" "${compare_report}" "${MIN_INSIDE_DIFF}" "${REDACTION_MARGIN_RATIO}" <<'PY'
import json
import pathlib
import subprocess
import sys

metadata_path = pathlib.Path(sys.argv[1])
normal_path = pathlib.Path(sys.argv[2])
redacted_path = pathlib.Path(sys.argv[3])
report_path = pathlib.Path(sys.argv[4])
min_inside_diff = float(sys.argv[5])
margin_ratio = float(sys.argv[6])

payload = json.loads(metadata_path.read_text(encoding="utf-8"))
image = payload.get("image") or {}
width = int(image.get("width") or 0)
height = int(image.get("height") or 0)
if width <= 0 or height <= 0:
    raise SystemExit("metadata image size is invalid")

detections = (payload.get("result") or {}).get("detections") or []
person_boxes = []
for detection in detections:
    if str(detection.get("label") or "").lower() != "person":
        continue
    box = detection.get("box") or {}
    x = float(box.get("x") or 0.0)
    y = float(box.get("y") or 0.0)
    w = float(box.get("width") or 0.0)
    h = float(box.get("height") or 0.0)
    if w <= 0.0 or h <= 0.0:
        continue
    px1 = max(0, min(width - 1, round(x * width)))
    py1 = max(0, min(height - 1, round(y * height)))
    px2 = max(0, min(width - 1, round((x + w) * width)))
    py2 = max(0, min(height - 1, round((y + h) * height)))
    bw = max(1, px2 - px1 + 1)
    bh = max(1, py2 - py1 + 1)
    mx = round(bw * margin_ratio)
    my = round(bh * margin_ratio)
    person_boxes.append((
        max(0, px1 - mx),
        max(0, py1 - my),
        min(width - 1, px2 + mx),
        min(height - 1, py2 + my),
    ))

if not person_boxes:
    raise SystemExit("metadata has no person detection for redaction")

def decode_jpeg(path):
    result = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True,
        stdout=subprocess.PIPE,
    )
    expected = width * height * 3
    if len(result.stdout) != expected:
        raise SystemExit(f"decoded byte size mismatch: {path} {len(result.stdout)} != {expected}")
    return result.stdout

normal = decode_jpeg(normal_path)
redacted = decode_jpeg(redacted_path)
inside = bytearray(width * height)
for x1, y1, x2, y2 in person_boxes:
    for yy in range(y1, y2 + 1):
        row = yy * width
        inside[row + x1:row + x2 + 1] = b"\x01" * (x2 - x1 + 1)

inside_sum = 0
inside_count = 0
outside_sum = 0
outside_count = 0
for pixel in range(width * height):
    offset = pixel * 3
    diff = (
        abs(normal[offset] - redacted[offset])
        + abs(normal[offset + 1] - redacted[offset + 1])
        + abs(normal[offset + 2] - redacted[offset + 2])
    ) / 3.0
    if inside[pixel]:
        inside_sum += diff
        inside_count += 1
    else:
        outside_sum += diff
        outside_count += 1

inside_avg = inside_sum / max(1, inside_count)
outside_avg = outside_sum / max(1, outside_count)
report = {
    "image": {"width": width, "height": height},
    "personDetections": len(person_boxes),
    "insidePixels": inside_count,
    "outsidePixels": outside_count,
    "insideAvgDiff": inside_avg,
    "outsideAvgDiff": outside_avg,
    "minInsideDiff": min_inside_diff,
    "normalOverlay": str(normal_path),
    "redactedOverlay": str(redacted_path),
}
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
if inside_avg < min_inside_diff:
    raise SystemExit(f"redaction pixel diff too low: {inside_avg} < {min_inside_diff}")
PY
  then
    PASS_COUNT=$((PASS_COUNT + 1))
    append_step "static-redaction" "pass" "static image pixel diff" "${compare_report}" 0
    echo "[pass] static-redaction pixel diff ok"
    return 0
  fi

  FAIL_COUNT=$((FAIL_COUNT + 1))
  append_step "static-redaction" "fail" "static image pixel diff" "${compare_report}" 0
  echo "[fail] static-redaction pixel diff failed"
  [[ -f "${compare_report}" ]] && cat "${compare_report}"
  return 1
}

# RTSP overlay 경로에서 같은 redaction query가 decode/playback까지 통과하는지 확인한다.
run_live_redaction() {
  local query
  query="$(redaction_query)"
  run_step "live-va-redaction" \
    "MEDIA_SERVER_SKIP_LOCAL_ENV=${MEDIA_SERVER_SKIP_LOCAL_ENV:-0} MEDIA_SERVER_LISTEN_PORT=${MEDIA_SERVER_LISTEN_PORT:-} MEDIA_SERVER_HTTP_LISTEN_PORT=${HTTP_PORT} MEDIA_SERVER_VERIFY_VA_HTTP_BASE='${HTTP_BASE}' MEDIA_SERVER_VERIFY_VA_FILE='${FILE_TOKEN}' MEDIA_SERVER_VERIFY_VA_DURATION_S=${DURATION_S} MEDIA_SERVER_VERIFY_VA_EXTRA_QUERY='${query}' MEDIA_SERVER_VERIFY_VA_REDACTION=person-mosaic MEDIA_SERVER_VERIFY_VA_REDACTION_CLASSES='${REDACTION_CLASSES}' MEDIA_SERVER_VERIFY_VA_REDACTION_BLOCK_SIZE=${REDACTION_BLOCK_SIZE} MEDIA_SERVER_VERIFY_VA_REDACTION_MARGIN_RATIO=${REDACTION_MARGIN_RATIO} ./server.sh verify-va" || true
}

# redaction과 event rule을 함께 켰을 때 event 산출 경로가 깨지지 않는지 확인한다.
run_event_compatibility() {
  if [[ "${RUN_EVENTS}" != "1" ]]; then
    skip_step "event-redaction-compatibility" "--include-events 미지정"
    return 0
  fi
  local event_duration="${DURATION_S}"
  if [[ "${event_duration}" =~ ^[0-9]+$ ]] && [[ "${event_duration}" -lt 30 ]]; then
    event_duration=30
  fi
  run_step "event-redaction-compatibility" \
    "MEDIA_SERVER_SKIP_LOCAL_ENV=${MEDIA_SERVER_SKIP_LOCAL_ENV:-0} MEDIA_SERVER_HTTP_LISTEN_PORT=${HTTP_PORT} MEDIA_SERVER_VERIFY_VA_HTTP_BASE='${HTTP_BASE}' MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S=${event_duration} ./server.sh verify-va-events --duration ${event_duration}" || true
}

# redaction 승격 중 tracker 자체의 ID 유지 통계가 악화되지 않는지 별도 smoke로 확인한다.
run_tracker_compatibility() {
  if [[ "${RUN_TRACKER}" != "1" ]]; then
    skip_step "tracker-redaction-compatibility" "--include-tracker 미지정"
    return 0
  fi
  run_step "tracker-redaction-compatibility" \
    "./server.sh verify-tracker-stability --duration ${DURATION_S} --repeat ${REPEAT_COUNT}" || true
}

# URI/HLS redaction은 source 환경 의존도가 높아 explicit opt-in 준비 상태를 summary에 기록한다.
run_uri_readiness() {
  if [[ "${RUN_URI}" != "1" ]]; then
    skip_step "uri-redaction-readiness" "--include-uri 미지정"
    return 0
  fi
  run_step "uri-redaction-readiness" \
    "./server.sh verify-uri-longrun --iterations ${REPEAT_COUNT}" || true
}

# 전체 검증 summary를 JSON으로 남긴다.
write_summary() {
  python3 - "${SUMMARY_FILE}" "${STEPS_FILE}" "${PASS_COUNT}" "${FAIL_COUNT}" "${SKIP_COUNT}" "${HTTP_BASE}" "${WORK_DIR}" "${FILE_TOKEN}" "${IMAGE_ASSET}" "${IMAGE_FILE}" "${DURATION_S}" "${REPEAT_COUNT}" "${REDACTION_CLASSES}" "${REDACTION_BLOCK_SIZE}" "${REDACTION_MARGIN_RATIO}" <<'PY'
import json
import pathlib
import sys
import time

steps_path = pathlib.Path(sys.argv[2])
steps = []
if steps_path.exists():
    for line in steps_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            steps.append(json.loads(line))
summary = {
    "kind": "redaction",
    "status": "fail" if int(sys.argv[4]) > 0 else "pass",
    "pass": int(sys.argv[3]),
    "fail": int(sys.argv[4]),
    "skip": int(sys.argv[5]),
    "httpBase": sys.argv[6],
    "workDir": sys.argv[7],
    "videoFile": sys.argv[8],
    "imageAsset": sys.argv[9],
    "imageFile": sys.argv[10],
    "durationSec": int(sys.argv[11]),
    "repeat": int(sys.argv[12]),
    "redaction": {
        "mode": "person-mosaic",
        "classes": sys.argv[13],
        "blockSize": int(sys.argv[14]),
        "marginRatio": float(sys.argv[15]),
    },
    "finishedAtEpochMs": int(time.time() * 1000),
    "steps": steps,
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
  log_info "summary=${SUMMARY_FILE}"
}

# CLI 인자를 파싱해 smoke/long 범위를 결정한다.
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --http-base)
        HTTP_BASE="${2:-}"
        shift 2
        ;;
      --asset)
        IMAGE_ASSET="${2:-}"
        IMAGE_FILE=""
        shift 2
        ;;
      --file)
        IMAGE_FILE="${2:-}"
        shift 2
        ;;
      --video)
        FILE_TOKEN="${2:-}"
        shift 2
        ;;
      --duration)
        DURATION_S="${2:-}"
        shift 2
        ;;
      --repeat)
        REPEAT_COUNT="${2:-}"
        shift 2
        ;;
      --redaction-classes)
        REDACTION_CLASSES="${2:-}"
        shift 2
        ;;
      --block-size)
        REDACTION_BLOCK_SIZE="${2:-}"
        shift 2
        ;;
      --margin-ratio)
        REDACTION_MARGIN_RATIO="${2:-}"
        shift 2
        ;;
      --include-events)
        RUN_EVENTS=1
        shift
        ;;
      --include-tracker)
        RUN_TRACKER=1
        shift
        ;;
      --include-uri)
        RUN_URI=1
        shift
        ;;
      --skip-idle-precheck)
        REQUIRE_IDLE_PRECHECK=0
        shift
        ;;
      --idle-precheck-timeout)
        IDLE_PRECHECK_TIMEOUT_S="${2:-}"
        shift 2
        ;;
      --long)
        DURATION_S=30
        REPEAT_COUNT=2
        RUN_EVENTS=1
        RUN_TRACKER=1
        shift
        ;;
      --static-only)
        RUN_STATIC=1
        RUN_LIVE=0
        RUN_EVENTS=0
        RUN_TRACKER=0
        RUN_URI=0
        shift
        ;;
      --live-only)
        RUN_STATIC=0
        RUN_LIVE=1
        shift
        ;;
      --summary-file)
        SUMMARY_FILE="${2:-}"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "알 수 없는 verify-redaction 옵션입니다: $1"
        usage
        exit 1
        ;;
    esac
  done
}

# 입력값과 서버 상태를 확인한 뒤 선택된 검증들을 순차 실행한다.
main() {
  parse_args "$@"
  require_cmd curl
  require_cmd ffmpeg
  require_cmd python3
  require_cmd node

  if [[ -z "${HTTP_BASE}" ]]; then
    HTTP_PORT="$(resolve_port "${HTTP_PORT}" "kHttpListenPort" "8080")"
    local http_address
    http_address="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
    HTTP_BASE="http://$(client_host "${MEDIA_SERVER_VERIFY_HOST:-${http_address}}"):${HTTP_PORT}"
  fi
  HTTP_BASE="${HTTP_BASE%/}"

  log_info "http_base=${HTTP_BASE}"
  log_info "video=${FILE_TOKEN}"
  log_info "duration=${DURATION_S}, repeat=${REPEAT_COUNT}"
  log_info "redaction=person-mosaic classes=${REDACTION_CLASSES} block=${REDACTION_BLOCK_SIZE} margin=${REDACTION_MARGIN_RATIO}"

  if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
    log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
    append_step "health" "fail" "${HTTP_BASE}/health" "" 0
    write_summary
    exit 1
  fi
  log_pass "HTTP health ok"
  append_step "health" "pass" "${HTTP_BASE}/health" "" 0

  if ! assert_runtime_idle_precheck; then
    write_summary
    exit 1
  fi

  if [[ "${RUN_STATIC}" == "1" ]]; then
    run_static_redaction || true
  else
    skip_step "static-redaction" "--static-only/--live-only 설정으로 제외"
  fi
  if [[ "${RUN_LIVE}" == "1" ]]; then
    run_live_redaction
  else
    skip_step "live-va-redaction" "--static-only 설정으로 제외"
  fi
  run_event_compatibility
  run_tracker_compatibility
  run_uri_readiness

  write_summary
  echo
  echo "== redaction 검증 요약 =="
  echo "- 통과: ${PASS_COUNT}"
  echo "- 실패: ${FAIL_COUNT}"
  echo "- 건너뜀: ${SKIP_COUNT}"
  echo "- summary: ${SUMMARY_FILE}"
  echo "- logs: ${WORK_DIR}"
  if [[ "${FAIL_COUNT}" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
