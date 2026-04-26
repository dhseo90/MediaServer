#!/usr/bin/env bash
# 파일 용도: HTTP/HLS URI source 경로를 반복 검증해 장시간 안정성과 외부 URL 옵션 검증을 수행한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

ITERATIONS="${MEDIA_SERVER_VERIFY_URI_LONGRUN_ITERATIONS:-3}"
INCLUDE_EXTERNAL="${MEDIA_SERVER_VERIFY_URI_LONGRUN_INCLUDE_EXTERNAL:-0}"
SKIP_LOCAL_HTTP=0
SKIP_LOCAL_HLS=0
EXTERNAL_URLS="${MEDIA_SERVER_VERIFY_URI_EXTERNAL_URLS:-}"
EXTERNAL_RTSP_ROUTE_KEYS="${MEDIA_SERVER_VERIFY_URI_EXTERNAL_RTSP_ROUTE_KEYS:-default}"
USE_DEFAULT_EXTERNAL="${MEDIA_SERVER_VERIFY_URI_USE_DEFAULT_EXTERNAL:-0}"
DEFAULT_EXTERNAL_URLS="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8;https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RUN_ID="uri-longrun-$(date +%s)-$$"
SUMMARY_FILE="/tmp/media_server_${RUN_ID}_summary.json"
EXTERNAL_CONFIG_FILE=""

# 검증 진행 상황을 같은 형식으로 출력한다.
log_info() { echo "[info] $*"; }
# 성공 건수를 누적하고 통과 메시지를 출력한다.
log_pass() { echo "[pass] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
# 실패 건수를 누적하고 실패 메시지를 출력한다.
log_fail() { echo "[fail] $*"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
# 환경 의존으로 생략한 항목을 누적하고 이유를 출력한다.
log_skip() { echo "[skip] $*"; SKIP_COUNT=$((SKIP_COUNT + 1)); }

# verify-uri-longrun 명령의 사용법과 선택 검증 기준을 출력한다.
usage() {
  cat <<'EOF_USAGE'
HTTP/HLS URI source 장기 검증

Usage:
  ./server.sh verify-uri-longrun [options]

Options:
  --iterations <n>       반복 횟수. 기본 3
  --include-external     MEDIA_SERVER_VERIFY_URI_EXTERNAL_URLS에 지정한 외부 HTTP/HLS URL도 검증
  --use-default-external 공개 HLS advisory 후보 2개(Mux/Apple)를 외부 URL로 사용
  --external-urls <csv>  외부 URL 목록. 쉼표 또는 세미콜론으로 구분
  --external-rtsp-routes <csv>
                         외부 URL에서 검증할 RTSP route key 목록. 기본 default
  --skip-local-http      로컬 HTTP MP4 source 반복 검증 생략
  --skip-local-hls       로컬 HLS VOD source 반복 검증 생략
  -h, --help             도움말 출력

환경 변수:
  MEDIA_SERVER_VERIFY_URI_LONGRUN_ITERATIONS
  MEDIA_SERVER_VERIFY_URI_LONGRUN_INCLUDE_EXTERNAL=1
  MEDIA_SERVER_VERIFY_URI_USE_DEFAULT_EXTERNAL=1
  MEDIA_SERVER_VERIFY_URI_EXTERNAL_URLS="https://example/a.mp4,https://example/live.m3u8"
  MEDIA_SERVER_VERIFY_URI_EXTERNAL_RTSP_ROUTE_KEYS="default,h264"

기준:
  - 로컬 HTTP MP4와 로컬 HLS VOD는 네트워크 영향 없이 반복 검증합니다.
  - 외부 HTTP/HLS URL은 upstream, CDN, 방화벽 영향이 있으므로 명시적으로 켰을 때만 검증합니다.
  - 기본 외부 후보는 advisory 용도이며, upstream 상태 변화 때문에 기본 안정 기준에는 넣지 않습니다.
EOF_USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --iterations)
      ITERATIONS="$2"
      shift
      ;;
    --include-external)
      INCLUDE_EXTERNAL=1
      ;;
    --use-default-external)
      USE_DEFAULT_EXTERNAL=1
      ;;
    --external-urls)
      EXTERNAL_URLS="$2"
      shift
      ;;
    --external-rtsp-routes)
      EXTERNAL_RTSP_ROUTE_KEYS="$2"
      shift
      ;;
    --skip-local-http)
      SKIP_LOCAL_HTTP=1
      ;;
    --skip-local-hls)
      SKIP_LOCAL_HLS=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 verify-uri-longrun 옵션입니다: $1"
      echo
      usage
      exit 1
      ;;
  esac
  shift
done

if ! [[ "${ITERATIONS}" =~ ^[0-9]+$ ]] || [[ "${ITERATIONS}" -lt 1 ]]; then
  log_fail "--iterations는 1 이상의 정수여야 합니다: ${ITERATIONS}"
  exit 1
fi

if [[ "${INCLUDE_EXTERNAL}" == "1" && -z "${EXTERNAL_URLS}" && "${USE_DEFAULT_EXTERNAL}" == "1" ]]; then
  EXTERNAL_URLS="${DEFAULT_EXTERNAL_URLS}"
fi

# verify-codecs의 source filter를 한 번 실행해 반복 검증 결과를 누적한다.
run_codec_filter_once() {
  local filter="$1"
  local label="$2"
  local iteration="$3"
  log_info "${label}: ${iteration}/${ITERATIONS} 반복 검증 시작"
  if MEDIA_SERVER_VERIFY_SOURCE_FILTER="${filter}" "${ROOT_DIR}/server.sh" verify-codecs; then
    log_pass "${label}: ${iteration}/${ITERATIONS} 통과"
  else
    log_fail "${label}: ${iteration}/${ITERATIONS} 실패"
  fi
}

# 사용자가 지정한 외부 URL 목록을 verify-codecs가 읽을 수 있는 임시 source config로 변환한다.
make_external_config() {
  local urls="$1"
  local route_keys="$2"
  local output="/tmp/media_server_uri_external_config_$(date +%s)_$$.json"
  python3 - "${urls}" "${route_keys}" "${output}" <<'PY'
import json
import pathlib
import re
import sys

raw = sys.argv[1]
route_keys = [item.strip() for item in re.split(r"[,;]", sys.argv[2]) if item.strip()]
output = pathlib.Path(sys.argv[3])
tokens = [item.strip() for item in re.split(r"[,;]", raw) if item.strip()]
if not route_keys:
    route_keys = ["default"]
sources = []
for index, url in enumerate(tokens, 1):
    lower = url.lower()
    source_kind = "hls" if ".m3u8" in lower else "http"
    sources.append({
        "name": f"external_{source_kind}_{index}",
        "source_kind": source_kind,
        "source": url,
        "enabled": True,
        "requires_network": True,
        "notes": "User-provided external HTTP/HLS URI source for long-run regression.",
        "verify_profile": {
            "label": "external-uri",
            "ffprobe_timeout_us": 30000000,
            "webrtc_http_timeout_s": 45,
            "rtsp_route_keys": route_keys,
            "server_env_hint": "MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS=20000 MEDIA_SERVER_RTSP_TRACK_SETTLE_MAX_MS=15000"
        }
    })
output.write_text(json.dumps({"sources": sources}, indent=2), encoding="utf-8")
print(output)
PY
}

echo "HTTP/HLS URI source 장기 검증 시작"
echo "- 반복 횟수: ${ITERATIONS}"
echo "- 외부 URL 포함: ${INCLUDE_EXTERNAL}"
echo "- 외부 RTSP route keys: ${EXTERNAL_RTSP_ROUTE_KEYS}"
if [[ "${INCLUDE_EXTERNAL}" == "1" && -n "${EXTERNAL_URLS}" ]]; then
  echo "- 외부 URL: ${EXTERNAL_URLS}"
fi

for ((iteration = 1; iteration <= ITERATIONS; iteration += 1)); do
  if [[ "${SKIP_LOCAL_HTTP}" == "1" ]]; then
    log_skip "local HTTP URI: 옵션으로 생략"
  else
    run_codec_filter_once "http_local_h264_aac" "local HTTP H264/AAC" "${iteration}"
    run_codec_filter_once "http_local_h264_video_only" "local HTTP video-only" "${iteration}"
  fi

  if [[ "${SKIP_LOCAL_HLS}" == "1" ]]; then
    log_skip "local HLS URI: 옵션으로 생략"
  else
    run_codec_filter_once "hls_local_h264_aac" "local HLS H264/AAC" "${iteration}"
  fi
done

if [[ "${INCLUDE_EXTERNAL}" == "1" ]]; then
  if [[ -z "${EXTERNAL_URLS}" ]]; then
    log_skip "external HTTP/HLS URI: MEDIA_SERVER_VERIFY_URI_EXTERNAL_URLS 또는 --external-urls가 비어 있어 생략"
  else
    external_config="$(make_external_config "${EXTERNAL_URLS}" "${EXTERNAL_RTSP_ROUTE_KEYS}")"
    EXTERNAL_CONFIG_FILE="${external_config}"
    log_info "external URI config: ${external_config}"
    for ((iteration = 1; iteration <= ITERATIONS; iteration += 1)); do
      log_info "external HTTP/HLS URI: ${iteration}/${ITERATIONS} 반복 검증 시작"
      if MEDIA_SERVER_VERIFY_CONFIG="${external_config}" MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=1 "${ROOT_DIR}/server.sh" verify-codecs; then
        log_pass "external HTTP/HLS URI: ${iteration}/${ITERATIONS} 통과"
      else
        log_fail "external HTTP/HLS URI: ${iteration}/${ITERATIONS} 실패"
      fi
    done
  fi
else
  log_skip "external HTTP/HLS URI: 외부 네트워크 의존 항목이라 --include-external 없이는 생략"
fi

echo
echo "HTTP/HLS URI source 장기 검증 결과"
echo "- pass: ${PASS_COUNT}"
echo "- fail: ${FAIL_COUNT}"
echo "- skip: ${SKIP_COUNT}"
python3 - "${SUMMARY_FILE}" "${ITERATIONS}" "${INCLUDE_EXTERNAL}" "${USE_DEFAULT_EXTERNAL}" "${EXTERNAL_URLS}" "${EXTERNAL_RTSP_ROUTE_KEYS}" "${PASS_COUNT}" "${FAIL_COUNT}" "${SKIP_COUNT}" "${EXTERNAL_CONFIG_FILE}" <<'PY'
import json
import pathlib
import re
import sys

urls = [item.strip() for item in re.split(r"[,;]", sys.argv[5]) if item.strip()]
summary = {
    "iterations": int(sys.argv[2]),
    "includeExternal": sys.argv[3] == "1",
    "useDefaultExternal": sys.argv[4] == "1",
    "externalUrls": urls,
    "externalRtspRoutes": [item.strip() for item in sys.argv[6].split(",") if item.strip()],
    "pass": int(sys.argv[7]),
    "fail": int(sys.argv[8]),
    "skip": int(sys.argv[9]),
    "externalConfig": sys.argv[10],
    "advisory": "외부 URL은 upstream/CDN 상태에 영향을 받으므로 선택 검증 결과로만 해석한다.",
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
PY
echo "- summary: ${SUMMARY_FILE}"

if [[ ${FAIL_COUNT} -gt 0 ]]; then
  echo "실패 원인 후보: 서버 readiness, HTTP/HLS launcher, URI source timeout, EOS/reconnect 로그, ffprobe/WebRTC signaling, 외부 upstream 상태를 확인하세요."
  exit 1
fi
exit 0
