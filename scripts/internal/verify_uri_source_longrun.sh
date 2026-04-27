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
EXTERNAL_INPUT_CONFIG="${MEDIA_SERVER_VERIFY_URI_EXTERNAL_CONFIG:-}"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RUN_ID="uri-longrun-$(date +%s)-$$"
SUMMARY_FILE="/tmp/media_server_${RUN_ID}_summary.json"
FAILURE_FILE="/tmp/media_server_${RUN_ID}_failures.ndjson"
EXTERNAL_CONFIG_FILE=""

# 검증 진행 상황을 같은 형식으로 출력한다.
log_info() { echo "[info] $*"; }
# 성공 건수를 누적하고 통과 메시지를 출력한다.
log_pass() { echo "[pass] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
# 실패 건수를 누적하고 실패 메시지를 출력한다.
log_fail() { echo "[fail] $*"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
# 환경 의존으로 생략한 항목을 누적하고 이유를 출력한다.
log_skip() { echo "[skip] $*"; SKIP_COUNT=$((SKIP_COUNT + 1)); }

# 실패 label을 로그 파일명에 넣을 수 있도록 안전한 token으로 줄인다.
safe_token() {
  printf '%s' "$1" | tr -c 'A-Za-z0-9_' '_'
}

# verify-codecs 로그를 보고 DNS/HTTP/playlist/not-linked/timeout 같은 원인을 1차 분류한다.
classify_failure_log() {
  local log_file="$1"
  python3 - "${log_file}" <<'PY'
import pathlib
import re
import sys

text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace").lower()
rules = [
    ("dns", [r"could not resolve", r"name or service not known", r"temporary failure in name resolution", r"nodename nor servname"]),
    ("http-status", [r"http\s+(4\d\d|5\d\d)", r"server returned 4\d\d", r"server returned 5\d\d", r"status code"]),
    ("playlist-parse", [r"playlist", r"m3u8", r"no uri handler", r"parse"]),
    ("pad-not-linked", [r"not-linked", r"not linked", r"internal data stream error"]),
    ("timeout", [r"timed out", r"timeout", r"operation timed out", r"ffprobe.*exit"]),
    ("connection", [r"connection refused", r"connection reset", r"no route to host", r"network is unreachable"]),
]
matches = []
for name, patterns in rules:
    if any(re.search(pattern, text) for pattern in patterns):
        matches.append(name)
print(",".join(matches) if matches else "unknown")
PY
}

# 실패 분류 결과를 summary JSON에서 읽을 수 있도록 NDJSON에 누적한다.
append_failure_record() {
  local label="$1"
  local iteration="$2"
  local log_file="$3"
  local classification="$4"
  python3 - "${FAILURE_FILE}" "${label}" "${iteration}" "${log_file}" "${classification}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
record = {
    "label": sys.argv[2],
    "iteration": int(sys.argv[3]),
    "logFile": sys.argv[4],
    "classification": [item for item in sys.argv[5].split(",") if item],
}
with path.open("a", encoding="utf-8") as handle:
    handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
PY
}

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
  --external-config <path>
                         외부 URI source config JSON. 지정 시 --include-external을 자동 적용
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
  MEDIA_SERVER_VERIFY_URI_EXTERNAL_CONFIG="config/external_uri_sources.example.json"
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
    --external-config)
      EXTERNAL_INPUT_CONFIG="$2"
      INCLUDE_EXTERNAL=1
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
  local log_file="/tmp/media_server_${RUN_ID}_$(safe_token "${label}")_${iteration}.log"
  log_info "${label}: ${iteration}/${ITERATIONS} 반복 검증 시작"
  if MEDIA_SERVER_VERIFY_SOURCE_FILTER="${filter}" "${ROOT_DIR}/server.sh" verify-codecs >"${log_file}" 2>&1; then
    cat "${log_file}"
    log_pass "${label}: ${iteration}/${ITERATIONS} 통과"
  else
    cat "${log_file}"
    local classification
    classification="$(classify_failure_log "${log_file}")"
    append_failure_record "${label}" "${iteration}" "${log_file}" "${classification}"
    log_fail "${label}: ${iteration}/${ITERATIONS} 실패 classification=${classification} log=${log_file}"
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

# 사용자가 관리하는 외부 URI config에서 source URL과 route key를 추출해 summary에 반영한다.
load_external_config_metadata() {
  local config_path="$1"
  python3 - "${config_path}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
payload = json.loads(path.read_text(encoding="utf-8"))
urls = []
routes = []

def add_routes(values):
    if isinstance(values, str):
        values = [item.strip() for item in values.replace(";", ",").split(",")]
    if isinstance(values, list):
        for item in values:
            text = str(item).strip()
            if text and text not in routes:
                routes.append(text)

if isinstance(payload, dict):
    if isinstance(payload.get("urls"), list):
        urls.extend(str(item).strip() for item in payload["urls"] if str(item).strip())
    add_routes(payload.get("rtspRouteKeys") or payload.get("externalRtspRoutes") or payload.get("routeKeys"))
    sources = payload.get("sources") if isinstance(payload.get("sources"), list) else []
    for source in sources:
        if not isinstance(source, dict):
            continue
        url = str(source.get("source") or source.get("url") or "").strip()
        if url:
            urls.append(url)
        verify_profile = source.get("verify_profile") or source.get("verifyProfile") or {}
        if isinstance(verify_profile, dict):
            add_routes(verify_profile.get("rtsp_route_keys") or verify_profile.get("rtspRouteKeys"))

print(";".join(dict.fromkeys(urls)))
print(",".join(routes or ["default"]))
PY
}

if [[ -n "${EXTERNAL_INPUT_CONFIG}" ]]; then
  if [[ ! -f "${EXTERNAL_INPUT_CONFIG}" ]]; then
    log_fail "external config 파일이 없습니다: ${EXTERNAL_INPUT_CONFIG}"
    exit 1
  fi
  external_config_metadata="$(load_external_config_metadata "${EXTERNAL_INPUT_CONFIG}")"
  EXTERNAL_URLS="$(printf '%s\n' "${external_config_metadata}" | sed -n '1p')"
  EXTERNAL_RTSP_ROUTE_KEYS="$(printf '%s\n' "${external_config_metadata}" | sed -n '2p')"
  EXTERNAL_RTSP_ROUTE_KEYS="${EXTERNAL_RTSP_ROUTE_KEYS:-default}"
  EXTERNAL_CONFIG_FILE="${EXTERNAL_INPUT_CONFIG}"
  INCLUDE_EXTERNAL=1
fi

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
    if [[ -n "${EXTERNAL_INPUT_CONFIG}" ]]; then
      external_config="${EXTERNAL_INPUT_CONFIG}"
    else
      external_config="$(make_external_config "${EXTERNAL_URLS}" "${EXTERNAL_RTSP_ROUTE_KEYS}")"
      EXTERNAL_CONFIG_FILE="${external_config}"
    fi
    log_info "external URI config: ${external_config}"
    for ((iteration = 1; iteration <= ITERATIONS; iteration += 1)); do
      external_log="/tmp/media_server_${RUN_ID}_external_${iteration}.log"
      log_info "external HTTP/HLS URI: ${iteration}/${ITERATIONS} 반복 검증 시작"
      if MEDIA_SERVER_VERIFY_CONFIG="${external_config}" MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=1 "${ROOT_DIR}/server.sh" verify-codecs >"${external_log}" 2>&1; then
        cat "${external_log}"
        log_pass "external HTTP/HLS URI: ${iteration}/${ITERATIONS} 통과"
      else
        cat "${external_log}"
        classification="$(classify_failure_log "${external_log}")"
        append_failure_record "external HTTP/HLS URI" "${iteration}" "${external_log}" "${classification}"
        log_fail "external HTTP/HLS URI: ${iteration}/${ITERATIONS} 실패 classification=${classification} log=${external_log}"
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
python3 - "${SUMMARY_FILE}" "${ITERATIONS}" "${INCLUDE_EXTERNAL}" "${USE_DEFAULT_EXTERNAL}" "${EXTERNAL_URLS}" "${EXTERNAL_RTSP_ROUTE_KEYS}" "${PASS_COUNT}" "${FAIL_COUNT}" "${SKIP_COUNT}" "${EXTERNAL_CONFIG_FILE}" "${FAILURE_FILE}" <<'PY'
import json
import pathlib
import re
import sys

urls = [item.strip() for item in re.split(r"[,;]", sys.argv[5]) if item.strip()]
failure_path = pathlib.Path(sys.argv[11])
failures = []
if failure_path.exists():
    for line in failure_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            failures.append(json.loads(line))
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
    "failureClassifications": failures,
    "advisory": "외부 URL은 upstream/CDN 상태에 영향을 받으므로 선택 검증 결과로만 해석한다.",
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
PY
echo "- summary: ${SUMMARY_FILE}"
echo "- failure classifications: ${FAILURE_FILE}"

if [[ ${FAIL_COUNT} -gt 0 ]]; then
  echo "실패 원인 후보: 서버 readiness, HTTP/HLS launcher, URI source timeout, EOS/reconnect 로그, ffprobe/WebRTC signaling, 외부 upstream 상태를 확인하세요."
  exit 1
fi
exit 0
