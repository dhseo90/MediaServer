#!/usr/bin/env bash
# 파일 용도: YOLO ONNX output layout/box/score 조합을 실제 모델과 lab analysis tap으로 검증한다.
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
RUN_ID="yolo-layouts-$(date +%s)-$$"

YOLOV5_URL="${MEDIA_SERVER_VERIFY_YOLOV5_URL:-https://github.com/ultralytics/yolov5/releases/download/v7.0/yolov5n.onnx}"
YOLOV5_MODEL="${MEDIA_SERVER_VERIFY_YOLOV5_MODEL:-models/yolov5n.onnx}"
XYXY_URL="${MEDIA_SERVER_VERIFY_YOLO_XYXY_URL:-https://github.com/namas191297/yolov8-segmentation-end2end-onnxruntime/raw/main/models/yolov8n-640x640-end2end.onnx}"
XYXY_MODEL="${MEDIA_SERVER_VERIFY_YOLO_XYXY_MODEL:-models/yolov8n-640x640-end2end.onnx}"
XYXY_EXTRA_QUERY="${MEDIA_SERVER_VERIFY_YOLO_XYXY_EXTRA_QUERY:-}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_YOLO_LAYOUT_FILE:-va_four_scene_sample.mp4}"
DURATION_S="${MEDIA_SERVER_VERIFY_YOLO_LAYOUT_DURATION_S:-8}"
POLL_INTERVAL_S="${MEDIA_SERVER_VERIFY_YOLO_LAYOUT_POLL_INTERVAL_S:-1}"
MIN_DETECTIONS="${MEDIA_SERVER_VERIFY_YOLO_LAYOUT_MIN_DETECTIONS:-1}"
DOWNLOAD_OPTIONAL_MODELS="${MEDIA_SERVER_VERIFY_YOLO_LAYOUT_DOWNLOAD:-1}"

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
YOLO layout 검증

Usage:
  ./server.sh verify-yolo-layouts [options]

Options:
  --file <token>       video root 기준 테스트 파일 token
  --duration <seconds> case별 polling 시간
  --long               duration=30s로 늘려 parser 조합을 조금 더 길게 확인
  --no-download        optional YOLOv5 검증 모델 자동 다운로드 생략
  --xyxy-model <path>  xyxy + score-class 검증용 모델 경로
  -h, --help           도움말 출력

검증 범위:
  1. YOLO11 기본 모델: channels-first + cxcywh + class-only
  2. YOLOv5n 실제 모델: channels-last + cxcywh + objectness-class + fp16 입출력
  3. End2End 모델: uint8 HWC input + channels-last + xyxy + score-class
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

client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

urlencode() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse
print(urllib.parse.quote(sys.argv[1], safe="/._-"))
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

cleanup_runtime_documents() {
  if ((${#TAP_IDS[@]} > 0)); then
    for tap_id in "${TAP_IDS[@]}"; do
      curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${tap_id}" >/dev/null 2>&1 || true
    done
  fi
}
trap cleanup_runtime_documents EXIT

ensure_optional_model() {
  local model_path="$1"
  local url="$2"
  local label="$3"
  local resolved
  resolved="$(media_server_resolve_project_path "${ROOT_DIR}" "${model_path}")"
  if [[ -f "${resolved}" ]]; then
    printf '%s' "${model_path}"
    return 0
  fi
  if [[ "${DOWNLOAD_OPTIONAL_MODELS}" != "1" ]]; then
    log_skip "${label} 모델 없음: ${model_path}"
    return 1
  fi
  if ! command -v curl >/dev/null 2>&1; then
    log_skip "${label} 모델 다운로드용 curl 없음: ${model_path}"
    return 1
  fi
  mkdir -p "$(dirname "${resolved}")"
  log_info "${label} 모델 다운로드: ${url}"
  if curl -fL --retry 2 --connect-timeout 20 -o "${resolved}.tmp" "${url}"; then
    mv "${resolved}.tmp" "${resolved}"
    printf '%s' "${model_path}"
    return 0
  fi
  log_skip "${label} 모델 다운로드 실패: ${url}"
  return 1
}

poll_tap_until_ready() {
  local tap_id="$1"
  local label="$2"
  local started_at now status status_file
  started_at="$(date +%s)"
  status=""
  status_file="/tmp/media_server_${RUN_ID}_${label//[^A-Za-z0-9_]/_}.json"
  while true; do
    now="$(date +%s)"
    if (( now - started_at >= DURATION_S )); then
      break
    fi
    status="$(curl -fsS "${HTTP_BASE}/lab/analysis/taps/${tap_id}")"
    printf '%s\n' "${status}" > "${status_file}"
    local analyzed detections errors labels
    analyzed="$(printf '%s' "${status}" | json_field "tap.analyzedPackets")"
    errors="$(printf '%s' "${status}" | json_field "tap.decoderErrors")"
    detections="$(printf '%s' "${status}" | python3 -c 'import json,sys; p=json.load(sys.stdin).get("tap",{}); r=p.get("latestResult") or {}; print(len(r.get("detections") or []))')"
    labels="$(printf '%s' "${status}" | python3 -c 'import json,sys; p=json.load(sys.stdin).get("tap",{}); r=p.get("latestResult") or {}; print(",".join(sorted({d.get("label","") for d in (r.get("detections") or []) if d.get("label")}))[:160])')"
    log_info "${label}: analyzed=${analyzed:-0} detections=${detections:-0} errors=${errors:-0} labels=${labels}"
    if [[ "${detections:-0}" =~ ^[0-9]+$ ]] && (( detections >= MIN_DETECTIONS )); then
      return 0
    fi
    sleep "${POLL_INTERVAL_S}"
  done
  log_info "${label} 마지막 상태: ${status_file}"
  return 1
}

run_case() {
  local label="$1"
  local query="$2"
  local response tap_id
  log_info "case 시작: ${label}"
  response="$(curl -fsS -X POST "${HTTP_BASE}/lab/analysis/taps?${query}")"
  tap_id="$(printf '%s' "${response}" | json_field "tapId")"
  if [[ -z "${tap_id}" ]]; then
    log_fail "${label}: analysis tap 생성 실패"
    echo "${response}" | sed 's/^/  /'
    return
  fi
  TAP_IDS+=("${tap_id}")
  log_pass "${label}: analysis tap 생성: ${tap_id}"
  if poll_tap_until_ready "${tap_id}" "${label}"; then
    log_pass "${label}: detection 생성 확인"
  else
    log_fail "${label}: detection 생성 실패"
  fi
  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${tap_id}" >/dev/null 2>&1 || true
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      FILE_TOKEN="$2"
      shift
      ;;
    --duration)
      DURATION_S="$2"
      shift
      ;;
    --long)
      DURATION_S="${MEDIA_SERVER_VERIFY_YOLO_LAYOUT_LONG_DURATION_S:-30}"
      ;;
    --no-download)
      DOWNLOAD_OPTIONAL_MODELS=0
      ;;
    --xyxy-model)
      XYXY_MODEL="$2"
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

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_YOLO_LAYOUT_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_YOLO_LAYOUT_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
ENCODED_FILE="$(urlencode "${FILE_TOKEN}")"
LABELS_PATH="${MEDIA_SERVER_VERIFY_YOLO_LABELS:-models/coco.names}"
DEFAULT_MODEL="${MEDIA_SERVER_ANALYSIS_MODEL:-models/yolo11n.onnx}"

log_info "http_base=${HTTP_BASE}"
log_info "file=${FILE_TOKEN}"
log_info "duration=${DURATION_S}s"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

if [[ ! -f "$(media_server_resolve_project_path "${ROOT_DIR}" "${DEFAULT_MODEL}")" ]]; then
  log_fail "기본 YOLO 모델 없음: ${DEFAULT_MODEL}"
  exit 1
fi
if [[ ! -f "$(media_server_resolve_project_path "${ROOT_DIR}" "${LABELS_PATH}")" ]]; then
  log_fail "YOLO label 파일 없음: ${LABELS_PATH}"
  exit 1
fi

run_case \
  "yolo11_channels_first_class_only" \
  "file=${ENCODED_FILE}&profileId=layout-yolo11-${RUN_ID}&va=1&model=$(urlencode "${DEFAULT_MODEL}")&labels=$(urlencode "${LABELS_PATH}")&fps=4&maxQueue=1&inputWidth=640&inputHeight=640&confidence=0.25&nms=0.45&outputLayout=channels-first&boxFormat=cxcywh&scoreMode=class-only"

if yolo5_model_token="$(ensure_optional_model "${YOLOV5_MODEL}" "${YOLOV5_URL}" "YOLOv5n")"; then
  run_case \
    "yolov5_channels_last_objectness_fp16" \
    "file=${ENCODED_FILE}&profileId=layout-yolov5-${RUN_ID}&va=1&model=$(urlencode "${yolo5_model_token}")&labels=$(urlencode "${LABELS_PATH}")&fps=4&maxQueue=1&inputWidth=640&inputHeight=640&confidence=0.20&nms=0.45&outputLayout=channels-last&boxFormat=cxcywh&scoreMode=objectness-class"
fi

if xyxy_model_token="$(ensure_optional_model "${XYXY_MODEL}" "${XYXY_URL}" "YOLOv8 end2end xyxy")"; then
  extra="${XYXY_EXTRA_QUERY:+&${XYXY_EXTRA_QUERY#&}}"
  run_case \
    "yolo_xyxy_score_class" \
    "file=${ENCODED_FILE}&profileId=layout-xyxy-${RUN_ID}&va=1&model=$(urlencode "${xyxy_model_token}")&labels=$(urlencode "${LABELS_PATH}")&fps=4&maxQueue=1&inputWidth=640&inputHeight=640&confidence=0.20&nms=0.45&outputLayout=channels-last&boxFormat=xyxy&scoreMode=score-class${extra}"
else
  log_skip "xyxy + score-class 실제 모델 검증을 건너뜁니다. MEDIA_SERVER_VERIFY_YOLO_XYXY_MODEL 또는 --xyxy-model로 지정하면 재시도할 수 있습니다."
fi

echo
echo "== YOLO layout 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
