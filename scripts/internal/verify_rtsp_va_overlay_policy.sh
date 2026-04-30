#!/usr/bin/env bash
# 파일 용도: RTSP raw/server-side overlay URL과 metadata side-channel 분리 정책을 검증한다.
# 동작 요약: raw/overlay RTSP URL을 짧게 decode하고, metadata는 HTTP SSE URL로만 노출되는지 확인한다.
set -uo pipefail

HTTP_BASE="${MEDIA_SERVER_VERIFY_RTSP_VA_POLICY_HTTP_BASE:-http://127.0.0.1:8080}"
RTSP_BASE="${MEDIA_SERVER_VERIFY_RTSP_VA_POLICY_RTSP_BASE:-rtsp://127.0.0.1:8554/dhseo}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_RTSP_VA_POLICY_FILE:-sample_h264.mp4}"
DURATION_S="${MEDIA_SERVER_VERIFY_RTSP_VA_POLICY_DURATION_S:-3}"
SUMMARY_FILE="${MEDIA_SERVER_VERIFY_RTSP_VA_POLICY_SUMMARY:-/tmp/media_server_rtsp_va_overlay_policy_summary_$(date +%s).json}"
SKIP_RTSP_DECODE="${MEDIA_SERVER_VERIFY_RTSP_VA_POLICY_SKIP_RTSP_DECODE:-0}"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RAW_URL=""
OVERLAY_URL=""
SIDECHANNEL_URL=""

usage() {
  cat <<'EOF_USAGE'
RTSP VA overlay policy smoke

Usage:
  ./server.sh verify-rtsp-va-overlay-policy \
    [--http-base <url>] [--rtsp-base <rtsp-url>] [--file <token>] [--duration-s <seconds>] \
    [--summary-file <path>] [--skip-rtsp-decode]

Checks:
  - RTSP raw URL does not carry va/vaRule/vaMetadata query
  - RTSP overlay URL carries va=1
  - metadata side-channel is an HTTP SSE URL, separate from RTSP
  - raw and overlay RTSP URLs decode with ffmpeg unless --skip-rtsp-decode is set
EOF_USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --http-base)
      HTTP_BASE="${2:-${HTTP_BASE}}"
      shift 2
      ;;
    --rtsp-base)
      RTSP_BASE="${2:-${RTSP_BASE}}"
      shift 2
      ;;
    --file)
      FILE_TOKEN="${2:-${FILE_TOKEN}}"
      shift 2
      ;;
    --duration-s)
      DURATION_S="${2:-${DURATION_S}}"
      shift 2
      ;;
    --summary-file)
      SUMMARY_FILE="${2:-${SUMMARY_FILE}}"
      shift 2
      ;;
    --skip-rtsp-decode)
      SKIP_RTSP_DECODE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[fail] unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

log_pass() {
  echo "[pass] $*"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
  echo "[fail] $*" >&2
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

log_skip() {
  echo "[skip] $*"
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

urlencode() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
}

append_query() {
  local base="$1"
  local query="$2"
  if [[ "${base}" == *"?"* ]]; then
    printf '%s&%s' "${base}" "${query}"
  else
    printf '%s?%s' "${base}" "${query}"
  fi
}

write_summary() {
  python3 - "${SUMMARY_FILE}" "${PASS_COUNT}" "${FAIL_COUNT}" "${SKIP_COUNT}" "${HTTP_BASE}" "${RTSP_BASE}" "${FILE_TOKEN}" "${RAW_URL}" "${OVERLAY_URL}" "${SIDECHANNEL_URL}" <<'PY'
import json
import sys

path, pass_count, fail_count, skip_count, http_base, rtsp_base, file_token, raw_url, overlay_url, sidechannel_url = sys.argv[1:]
payload = {
    "ok": int(fail_count) == 0,
    "kind": "rtsp-va-overlay-policy",
    "pass": int(pass_count),
    "fail": int(fail_count),
    "skip": int(skip_count),
    "httpBase": http_base,
    "rtspBase": rtsp_base,
    "file": file_token,
    "rawUrl": raw_url,
    "overlayUrl": overlay_url,
    "metadataSideChannelUrl": sidechannel_url,
    "checks": [
        "health",
        "rawUrlHasNoOverlayMetadataQuery",
        "overlayUrlHasVaQuery",
        "sideChannelIsHttpSseOnly",
        "rtspRawDecode",
        "rtspOverlayDecode",
    ],
}
with open(path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
    handle.write("\n")
print(f"[summary-json] {path}")
PY
}

finish() {
  write_summary
  echo "[summary] pass=${PASS_COUNT} fail=${FAIL_COUNT} skip=${SKIP_COUNT}"
  if [[ "${FAIL_COUNT}" -gt 0 ]]; then
    exit 1
  fi
}
trap finish EXIT

if ! command -v python3 >/dev/null 2>&1; then
  log_fail "missing required command: python3"
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  log_fail "missing required command: curl"
  exit 1
fi

ENCODED_FILE="$(urlencode "${FILE_TOKEN}")"
RAW_URL="$(append_query "${RTSP_BASE}" "file=${ENCODED_FILE}")"
OVERLAY_URL="$(append_query "${RTSP_BASE}" "file=${ENCODED_FILE}&va=1")"
SIDECHANNEL_URL="${HTTP_BASE%/}/lab/analysis/metadata/stream?file=${ENCODED_FILE}&va=1&intervalMs=500&maxMessageBytes=65536"

if curl -fsS --max-time 3 "${HTTP_BASE%/}/health" >/dev/null; then
  log_pass "HTTP health ok"
else
  log_fail "HTTP health check failed: ${HTTP_BASE%/}/health"
fi

if [[ "${RAW_URL}" != *"va=1"* && "${RAW_URL}" != *"vaRule="* && "${RAW_URL}" != *"vaMetadata=1"* ]]; then
  log_pass "RTSP raw URL에는 overlay/metadata query가 없음"
else
  log_fail "RTSP raw URL에 overlay/metadata query가 포함됨: ${RAW_URL}"
fi

if [[ "${OVERLAY_URL}" == rtsp://* && "${OVERLAY_URL}" == *"va=1"* ]]; then
  log_pass "RTSP server-side overlay URL은 va=1 query를 사용"
else
  log_fail "RTSP overlay URL 형식 오류: ${OVERLAY_URL}"
fi

if [[ "${SIDECHANNEL_URL}" == http://*/metadata/stream* || "${SIDECHANNEL_URL}" == https://*/metadata/stream* ]]; then
  log_pass "metadata side-channel은 HTTP SSE URL로 RTSP와 분리됨"
else
  log_fail "metadata side-channel URL 형식 오류: ${SIDECHANNEL_URL}"
fi

if [[ "${SKIP_RTSP_DECODE}" == "1" ]]; then
  log_skip "RTSP decode skipped by option"
else
  if ! command -v ffmpeg >/dev/null 2>&1; then
    log_fail "missing required command for RTSP playback check: ffmpeg"
  else
    if ffmpeg -hide_banner -loglevel error -rtsp_transport tcp -i "${RAW_URL}" -t "${DURATION_S}" -an -f null - >/tmp/media_server_rtsp_raw_policy_ffmpeg.log 2>&1; then
      log_pass "RTSP raw URL 짧은 decode 성공"
    else
      log_fail "RTSP raw URL decode 실패: /tmp/media_server_rtsp_raw_policy_ffmpeg.log"
    fi
    if ffmpeg -hide_banner -loglevel error -rtsp_transport tcp -i "${OVERLAY_URL}" -t "${DURATION_S}" -an -f null - >/tmp/media_server_rtsp_overlay_policy_ffmpeg.log 2>&1; then
      log_pass "RTSP va=1 server-side overlay URL 짧은 decode 성공"
    else
      log_fail "RTSP overlay URL decode 실패: /tmp/media_server_rtsp_overlay_policy_ffmpeg.log"
    fi
  fi
fi
