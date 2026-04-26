#!/usr/bin/env bash
# 파일 용도: 정적 이미지 분석 metadata/snapshot/overlay HTTP API를 검증한다.
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
RUN_ID="image-analysis-$(date +%s)-$$"
METADATA_FILE="/tmp/media_server_${RUN_ID}_metadata.json"
SNAPSHOT_FILE="/tmp/media_server_${RUN_ID}_snapshot.jpg"
OVERLAY_FILE="/tmp/media_server_${RUN_ID}_overlay.jpg"
TRAVERSAL_FILE="/tmp/media_server_${RUN_ID}_traversal.json"
TRACKING_DEFAULT_FILE="/tmp/media_server_${RUN_ID}_tracking_default.json"
TRACKING_ANIMAL_FILE="/tmp/media_server_${RUN_ID}_tracking_animal.json"
TRACKING_ALL_FILE="/tmp/media_server_${RUN_ID}_tracking_all.json"

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

usage() {
  cat <<'EOF_USAGE'
정적 이미지 분석 API 검증

Usage:
  ./server.sh verify-image-analysis [options]

Options:
  --asset <name>       docs/assets 기준 이미지 파일. 기본 va-four-scene-sample.png
  --file <token>       video root 기준 이미지 파일
  -h, --help           도움말 출력

환경 변수:
  MEDIA_SERVER_VERIFY_IMAGE_ASSET
  MEDIA_SERVER_VERIFY_IMAGE_FILE
  MEDIA_SERVER_VERIFY_IMAGE_HTTP_HOST
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

urlencode_token() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse

print(urllib.parse.quote(sys.argv[1], safe="/._-"))
PY
}

ASSET_TOKEN="${MEDIA_SERVER_VERIFY_IMAGE_ASSET:-va-four-scene-sample.png}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_IMAGE_FILE:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --asset)
      ASSET_TOKEN="$2"
      FILE_TOKEN=""
      shift
      ;;
    --file)
      FILE_TOKEN="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 verify-image-analysis 옵션입니다: $1"
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
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_IMAGE_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_IMAGE_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"

if [[ -n "${FILE_TOKEN}" ]]; then
  QUERY="file=$(urlencode_token "${FILE_TOKEN}")"
  LABEL="file=${FILE_TOKEN}"
else
  QUERY="asset=$(urlencode_token "${ASSET_TOKEN}")"
  LABEL="asset=${ASSET_TOKEN}"
fi

log_info "http_base=${HTTP_BASE}"
log_info "${LABEL}"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

if curl -fsS "${HTTP_BASE}/lab/analysis/image?${QUERY}" > "${METADATA_FILE}"; then
  if python3 - "${METADATA_FILE}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
image = payload.get("image") or {}
result = payload.get("result") or {}
detections = result.get("detections") or []
if image.get("width", 0) <= 0 or image.get("height", 0) <= 0:
    raise SystemExit("이미지 크기가 유효하지 않음")
if not detections:
    raise SystemExit("검출 결과가 비어 있음")
print("image=", image)
print("detection_count=", len(detections))
PY
  then
    log_pass "image metadata 분석 결과 확인"
  else
    log_fail "image metadata 검증 실패"
  fi
else
  log_fail "image metadata endpoint 호출 실패"
fi

if curl -fsS "${HTTP_BASE}/lab/analysis/image?${QUERY}&tracking=1" > "${TRACKING_DEFAULT_FILE}" &&
   curl -fsS "${HTTP_BASE}/lab/analysis/image?${QUERY}&tracking=1&trackingClasses=animal" > "${TRACKING_ANIMAL_FILE}" &&
   curl -fsS "${HTTP_BASE}/lab/analysis/image?${QUERY}&tracking=1&trackingClasses=$(urlencode_token "*")" > "${TRACKING_ALL_FILE}"; then
  if python3 - "${TRACKING_DEFAULT_FILE}" "${TRACKING_ANIMAL_FILE}" "${TRACKING_ALL_FILE}" <<'PY'
import json
import pathlib
import sys

def tracked_labels(path):
    payload = json.loads(pathlib.Path(path).read_text())
    detections = (payload.get("result") or {}).get("detections") or []
    tracked = [item for item in detections if int(item.get("trackId") or 0) > 0]
    return {
        "total": len(detections),
        "tracked": len(tracked),
        "labels": sorted({str(item.get("label") or "") for item in tracked}),
    }

default = tracked_labels(sys.argv[1])
animal = tracked_labels(sys.argv[2])
all_classes = tracked_labels(sys.argv[3])
print("tracking_default=", default)
print("tracking_animal=", animal)
print("tracking_all=", all_classes)

expected_default = {"person", "bicycle", "car", "motorcycle", "bus", "truck", "airplane", "train", "boat"}
if default["tracked"] <= 0:
    raise SystemExit("기본 tracking 결과가 비어 있음")
if not set(default["labels"]).issubset(expected_default):
    raise SystemExit(f"기본 tracking에 person/vehicle 외 label 포함: {default['labels']}")
if not {"bird", "dog"}.issubset(set(animal["labels"])):
    raise SystemExit(f"animal tracking에 기대 label이 없음: {animal['labels']}")
if any(label in set(animal["labels"]) for label in ("person", "car", "bus", "motorcycle", "bicycle")):
    raise SystemExit(f"animal tracking에 비동물 label 포함: {animal['labels']}")
if all_classes["tracked"] != all_classes["total"]:
    raise SystemExit(f"전체 tracking 수 불일치: {all_classes['tracked']} != {all_classes['total']}")
PY
  then
    log_pass "trackingClasses category/all 정책 확인"
  else
    log_fail "trackingClasses category/all 정책 검증 실패"
  fi
else
  log_fail "trackingClasses category/all endpoint 호출 실패"
fi

if curl -fsS -o "${SNAPSHOT_FILE}" "${HTTP_BASE}/lab/analysis/image/snapshot.jpg?${QUERY}&quality=80"; then
  bytes="$(wc -c < "${SNAPSHOT_FILE}" | tr -d ' ')"
  if [[ "${bytes}" -gt 1024 ]]; then
    log_pass "image snapshot JPEG 생성 (${bytes} bytes)"
  else
    log_fail "image snapshot JPEG 크기가 너무 작음 (${bytes} bytes)"
  fi
else
  log_fail "image snapshot endpoint 호출 실패"
fi

if curl -fsS -o "${OVERLAY_FILE}" "${HTTP_BASE}/lab/analysis/image/overlay.jpg?${QUERY}&quality=88&labelLang=ko&thickness=3"; then
  bytes="$(wc -c < "${OVERLAY_FILE}" | tr -d ' ')"
  if [[ "${bytes}" -gt 1024 ]]; then
    log_pass "image overlay JPEG 생성 (${bytes} bytes)"
  else
    log_fail "image overlay JPEG 크기가 너무 작음 (${bytes} bytes)"
  fi
else
  log_fail "image overlay endpoint 호출 실패"
fi

status="$(curl -sS -o "${TRAVERSAL_FILE}" -w '%{http_code}' "${HTTP_BASE}/lab/analysis/image?asset=../stream-verification.md" || true)"
if [[ "${status}" == "400" ]]; then
  log_pass "image path traversal 방어 확인"
else
  log_fail "image path traversal 방어 실패: status=${status}"
fi

echo
echo "== image analysis 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- metadata: ${METADATA_FILE}"
echo "- tracking default: ${TRACKING_DEFAULT_FILE}"
echo "- tracking animal: ${TRACKING_ANIMAL_FILE}"
echo "- tracking all: ${TRACKING_ALL_FILE}"
echo "- snapshot: ${SNAPSHOT_FILE}"
echo "- overlay: ${OVERLAY_FILE}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
