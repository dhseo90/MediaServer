#!/usr/bin/env bash
# 파일 용도: 설정 파일의 source/route matrix를 ffprobe와 WebRTC signaling으로 자동 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${MEDIA_SERVER_VERIFY_CONFIG:-${ROOT_DIR}/config/codec_test_sources.json}"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

STD_AFX="${ROOT_DIR}/include/stdafx.h"
PID_FILE="${ROOT_DIR}/.media_server.pid"
PORT_FILE="${ROOT_DIR}/.media_server.port"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"

INCLUDE_EXTERNAL="${MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL:-0}"
SKIP_RTSP="${MEDIA_SERVER_VERIFY_SKIP_RTSP:-0}"
SKIP_WEBRTC="${MEDIA_SERVER_VERIFY_SKIP_WEBRTC:-0}"
SOURCE_FILTER="${MEDIA_SERVER_VERIFY_SOURCE_FILTER:-}"
FFPROBE_TIMEOUT_US="${MEDIA_SERVER_VERIFY_RTSP_TIMEOUT_US:-8000000}"
RTSP_PREFLIGHT_TIMEOUT_MS="${MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS:-1500}"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

LAUNCHER_PIDS=()
LAUNCHER_PORTS=()
LAUNCHER_LOGS=()
LAST_LAUNCHER_PID=""
LAST_LAUNCHER_LOG=""
AUTH_COOKIE_FILE=""

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
    echo "[verify] missing required command: $1"
    exit 1
  fi
}

urlencode() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
}

json_field() {
  local json_text="$1"
  local field="$2"
  python3 - "$json_text" "$field" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
value = payload.get(sys.argv[2], "")
if isinstance(value, bool):
    print("true" if value else "false")
elif value is None:
    print("")
else:
    print(value)
PY
}

json_array_lines() {
  local json_text="$1"
  local field="$2"
  python3 - "$json_text" "$field" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
value = payload.get(sys.argv[2], [])
if isinstance(value, list):
    for item in value:
        print(item)
PY
}

client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

load_config() {
  if [[ ! -f "${CONFIG_FILE}" ]]; then
    echo "[verify] missing config file: ${CONFIG_FILE}"
    exit 1
  fi

  python3 - "${CONFIG_FILE}" <<'PY'
import json
import pathlib
import sys

config_path = pathlib.Path(sys.argv[1])
data = json.loads(config_path.read_text())
for source in data.get("sources", []):
    print(json.dumps(source, separators=(",", ":")))
PY
}

resolve_runtime_config() {
  # 실행 중인 서버가 기록한 포트 파일을 우선 사용하고, 없으면 stdafx.h/env 기본값으로 되돌린다.
  if [[ -f "${PORT_FILE}" ]]; then
    RTSP_PORT="$(cat "${PORT_FILE}")"
  else
    RTSP_PORT="$(sed -nE 's/.*kRtspListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  fi
  RTSP_PORT="${MEDIA_SERVER_LISTEN_PORT:-${RTSP_PORT:-8554}}"

  if [[ -f "${ADDRESS_FILE}" ]]; then
    RTSP_BIND_ADDRESS="$(cat "${ADDRESS_FILE}")"
  else
    RTSP_BIND_ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kRtspListenAddress" || true)"
  fi
  RTSP_BIND_ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS:-${RTSP_BIND_ADDRESS:-127.0.0.1}}"
  RTSP_ADDRESS="$(client_host "${MEDIA_SERVER_VERIFY_RTSP_HOST:-${RTSP_BIND_ADDRESS}}")"

  HTTP_PORT="$(sed -nE 's/.*kHttpListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-${HTTP_PORT:-8080}}"

  HTTP_BIND_ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)"
  HTTP_BIND_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-${HTTP_BIND_ADDRESS:-127.0.0.1}}"
  HTTP_ADDRESS="$(client_host "${MEDIA_SERVER_VERIFY_HTTP_HOST:-${HTTP_BIND_ADDRESS}}")"

  ROUTE="$(media_server_read_const_charp "${STD_AFX}" "kStreamRoute" || true)"
  ROUTE="${MEDIA_SERVER_ROUTE:-${ROUTE:-dhseo}}"
}

wait_until_tcp_listening() {
  local port="$1"
  local attempts="${2:-40}"
  local i=0
  while (( i < attempts )); do
    if media_server_is_tcp_listening "${port}"; then
      return 0
    fi
    sleep 0.25
    i=$((i + 1))
  done
  return 1
}

wait_until_tcp_free() {
  local port="$1"
  local attempts="${2:-20}"
  local i=0
  while (( i < attempts )); do
    if ! media_server_is_tcp_listening "${port}"; then
      return 0
    fi
    sleep 0.25
    i=$((i + 1))
  done
  return 1
}

http_launcher_answers() {
  local port="$1"
  curl -fsS --max-time 2 "http://127.0.0.1:${port}/" >/dev/null 2>&1
}

cleanup() {
  for pid in "${LAUNCHER_PIDS[@]:-}"; do
    if kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" >/dev/null 2>&1 || true
      wait "${pid}" 2>/dev/null || true
    fi
  done
  for port in "${LAUNCHER_PORTS[@]:-}"; do
    wait_until_tcp_free "${port}" 20 || true
  done
  for log_file in "${LAUNCHER_LOGS[@]:-}"; do
    cleanup_whip_session_from_log "${log_file}"
  done
  if [[ -n "${AUTH_COOKIE_FILE}" ]]; then
    rm -f "${AUTH_COOKIE_FILE}"
  fi
}

prepare_auth_cookie() {
  if [[ -z "${MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD:-}" ]]; then
    return
  fi
  AUTH_COOKIE_FILE="$(mktemp "${TMPDIR:-/tmp}/media-server-codec-auth-cookie.XXXXXX")"
  chmod 600 "${AUTH_COOKIE_FILE}"
  local login_code
  login_code="$(curl -sS -o /dev/null -w '%{http_code}' -c "${AUTH_COOKIE_FILE}" \
    -X POST --data-urlencode "username=admin" \
    --data-urlencode "password=${MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD}" \
    "http://${HTTP_ADDRESS}:${HTTP_PORT}/login")"
  if [[ "${login_code}" != "302" ]]; then
    echo "[verify] admin authentication for codec WebRTC checks failed"
    exit 1
  fi
}

start_local_launcher() {
  local name="$1"
  local port="$2"
  local mount="$3"
  local input_rel="$4"
  local video_codec="$5"
  local audio_codec="$6"

  if media_server_is_tcp_listening "${port}"; then
    log_info "launcher already listening on ${port} (${name})"
    return 0
  fi

  local input_path="${ROOT_DIR}/${input_rel}"
  local log_file="/tmp/${name}.launcher.log"
  python3 "${SCRIPT_DIR}/serve_test_rtsp_source.py" \
    --port "${port}" \
    --mount "${mount}" \
    --input "${input_path}" \
    --video-codec "${video_codec}" \
    --audio-codec "${audio_codec}" \
    > "${log_file}" 2>&1 &
  local launcher_pid=$!
  LAUNCHER_PIDS+=("${launcher_pid}")
  LAUNCHER_LOGS+=("${log_file}")
  LAST_LAUNCHER_PID="${launcher_pid}"
  LAST_LAUNCHER_LOG="${log_file}"

  for _ in {1..20}; do
    if ! kill -0 "${launcher_pid}" 2>/dev/null; then
      log_fail "${name}: local launcher exited early"
      tail -n 40 "${log_file}" || true
      return 1
    fi
    if media_server_is_tcp_listening "${port}"; then
      log_info "launcher ready: rtsp://127.0.0.1:${port}${mount}"
      return 0
    fi
    sleep 0.5
  done

  log_fail "${name}: local launcher did not become ready"
  tail -n 40 "${log_file}" || true
  return 1
}

start_local_http_launcher() {
  local name="$1"
  local port="$2"
  local root_rel="$3"

  # HTTP URI source 검증은 로컬 MP4를 간단한 정적 HTTP 서버로 열어 MediaServer가 source=http로 가져가게 한다.
  # 연속 verify-codecs 프로세스가 같은 포트를 재사용하면 이전 launcher의 LISTEN이 남아
  # ready 오판 또는 bind 대기가 생긴다. listen과 HTTP GET을 함께 확인한다.
  if media_server_is_tcp_listening "${port}"; then
    if http_launcher_answers "${port}"; then
      log_info "HTTP launcher already listening on ${port} (${name})"
      return 0
    fi
    log_fail "${name}: port ${port} is occupied but does not serve HTTP"
    return 1
  fi
  if ! wait_until_tcp_free "${port}" 20; then
    log_fail "${name}: port ${port} stayed occupied after previous launcher"
    return 1
  fi

  local root_path="${ROOT_DIR}/${root_rel}"
  local log_file="/tmp/${name}.http.log"
  PYTHONUNBUFFERED=1 python3 -u -m http.server "${port}" --bind 127.0.0.1 --directory "${root_path}" \
    > "${log_file}" 2>&1 &
  local launcher_pid=$!
  LAUNCHER_PIDS+=("${launcher_pid}")
  LAUNCHER_PORTS+=("${port}")
  LAUNCHER_LOGS+=("${log_file}")
  LAST_LAUNCHER_PID="${launcher_pid}"
  LAST_LAUNCHER_LOG="${log_file}"

  local i=0
  while (( i < 40 )); do
    if ! kill -0 "${launcher_pid}" 2>/dev/null; then
      log_fail "${name}: local HTTP launcher exited early"
      tail -n 40 "${log_file}" || true
      return 1
    fi
    if media_server_is_tcp_listening "${port}" && http_launcher_answers "${port}"; then
      log_info "HTTP launcher ready: http://127.0.0.1:${port}/"
      return 0
    fi
    sleep 0.25
    i=$((i + 1))
  done

  log_fail "${name}: local HTTP launcher did not become ready"
  tail -n 40 "${log_file}" || true
  return 1
}

start_local_hls_launcher() {
  local name="$1"
  local port="$2"
  local input_rel="$3"

  # HLS URI source 검증은 로컬 MP4를 /tmp HLS VOD로 변환한 뒤 정적 HTTP 서버로 제공한다.
  if media_server_is_tcp_listening "${port}"; then
    log_info "HLS launcher already listening on ${port} (${name})"
    return 0
  fi

  local input_path="${ROOT_DIR}/${input_rel}"
  local hls_dir="/tmp/${name}_hls"
  local log_file="/tmp/${name}.hls.log"
  mkdir -p "${hls_dir}"
  if ! ffmpeg -hide_banner -loglevel error -y -stream_loop 3 -i "${input_path}" \
      -c copy -f hls -hls_time 1 -hls_list_size 0 -hls_flags independent_segments \
      "${hls_dir}/index.m3u8" > "${log_file}" 2>&1; then
    log_fail "${name}: failed to generate local HLS VOD"
    tail -n 40 "${log_file}" || true
    return 1
  fi

  python3 -m http.server "${port}" --bind 127.0.0.1 --directory "${hls_dir}" \
    >> "${log_file}" 2>&1 &
  local launcher_pid=$!
  LAUNCHER_PIDS+=("${launcher_pid}")
  LAUNCHER_LOGS+=("${log_file}")
  LAST_LAUNCHER_PID="${launcher_pid}"
  LAST_LAUNCHER_LOG="${log_file}"

  for _ in {1..20}; do
    if ! kill -0 "${launcher_pid}" 2>/dev/null; then
      log_fail "${name}: local HLS launcher exited early"
      tail -n 40 "${log_file}" || true
      return 1
    fi
    if media_server_is_tcp_listening "${port}"; then
      log_info "HLS launcher ready: http://127.0.0.1:${port}/index.m3u8"
      return 0
    fi
    sleep 0.5
  done

  log_fail "${name}: local HLS launcher did not become ready"
  tail -n 40 "${log_file}" || true
  return 1
}

start_whip_publisher() {
  local name="$1"
  local http_base="$2"
  local source_id="$3"
  local duration_s="$4"

  # WebRTC source 검증은 WHIP publisher를 먼저 띄우고 sourceId를 MediaServer consumer 요청에서 사용한다.
  # launcher PID가 실제 Python publisher를 가리키게 해야 SIGTERM 시 cleanup DELETE가 실행된다.
  local log_file="/tmp/${name}.publisher.log"
  local auth_args=()
  if [[ -n "${AUTH_COOKIE_FILE}" ]]; then
    auth_args=(--cookie-file "${AUTH_COOKIE_FILE}")
  fi
  nohup python3 -u "${SCRIPT_DIR}/whip_publish_test.py" \
    --http-base "${http_base}" \
    --source-id "${source_id}" \
    --duration "${duration_s}" \
    "${auth_args[@]+"${auth_args[@]}"}" \
    > "${log_file}" 2>&1 &
  local launcher_pid=$!
  LAUNCHER_PIDS+=("${launcher_pid}")
  LAUNCHER_LOGS+=("${log_file}")
  LAST_LAUNCHER_PID="${launcher_pid}"
  LAST_LAUNCHER_LOG="${log_file}"

  for _ in {1..30}; do
    if ! kill -0 "${launcher_pid}" 2>/dev/null; then
      log_fail "${name}: WHIP publisher exited early"
      tail -n 80 "${log_file}" || true
      return 1
    fi
    if grep -q "session created:" "${log_file}" 2>/dev/null; then
      local source_id_ready_status=0
      if wait_for_published_webrtc_source_ready "${http_base}" "${source_id}" 20; then
        source_id_ready_status=0
      else
        source_id_ready_status=$?
      fi
      local source_json_ready_status="${source_id_ready_status}"
      if (( source_json_ready_status > 0 )); then
        log_fail "${name}: SourceJson WHIP publisher registered but media tracks did not become ready"
        tail -n 80 "${log_file}" || true
        return 1
      fi
      if (( source_id_ready_status > 0 )); then
        log_fail "${name}: source_id registry readiness failed"
        return 1
      fi
      log_info "publisher ready: sourceId=${source_id}"
      return 0
    fi
    sleep 1
  done

  log_fail "${name}: WHIP publisher did not become ready"
  tail -n 80 "${log_file}" || true
  return 1
}

wait_for_published_webrtc_source_ready() {
  local http_base="$1"
  local source_id="$2"
  local timeout_s="$3"

  # WHIP HTTP 응답 직후에는 sourceId가 등록됐더라도 track descriptor가 아직 준비되지 않았을 수 있다.
  # 서버 runtime status에서 video/audio readiness를 확인한 뒤 consumer 검증으로 넘어간다.
  python3 - "${http_base}" "${source_id}" "${timeout_s}" "${AUTH_COOKIE_FILE}" <<'PY'
import http.cookiejar
import json
import sys
import time
import urllib.request

http_base = sys.argv[1].rstrip("/")
source_id = sys.argv[2]
deadline = time.time() + float(sys.argv[3])
cookie_file = sys.argv[4]
opener = urllib.request.build_opener()
if cookie_file:
    cookie_jar = http.cookiejar.MozillaCookieJar(cookie_file)
    cookie_jar.load(ignore_discard=True, ignore_expires=True)
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
last = {}
while time.time() < deadline:
    try:
        with opener.open(f"{http_base}/lab/runtime/status", timeout=3) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        last = {"error": str(exc)}
        time.sleep(0.5)
        continue
    for source in payload.get("webrtcHttp", {}).get("publishSources", []):
        if source.get("sourceId") == source_id:
            last = source
            if source.get("active") and source.get("hasVideo") and source.get("hasAudio"):
                print(
                    "published source ready: "
                    f"sourceId={source_id} hasVideo={source.get('hasVideo')} "
                    f"hasAudio={source.get('hasAudio')} subscribers={source.get('subscriberCount', 0)}"
                )
                raise SystemExit(0)
    time.sleep(0.5)
print(f"published source not ready: sourceId={source_id} last={json.dumps(last, ensure_ascii=False)}", file=sys.stderr)
raise SystemExit(1)
PY
}

cleanup_whip_session_from_log() {
  local log_file="$1"
  [[ -z "${log_file}" || ! -f "${log_file}" ]] && return 0

  # publisher가 비정상 종료되어 자체 cleanup을 못 해도 서버 session은 검증 스크립트가 회수한다.
  local session_id
  while IFS= read -r session_id; do
    [[ -z "${session_id}" ]] && continue
    local encoded_session
    encoded_session="$(urlencode "${session_id}")"
    local auth_args=()
    if [[ -n "${AUTH_COOKIE_FILE}" ]]; then
      auth_args=(-b "${AUTH_COOKIE_FILE}")
    fi
    if curl -fsS "${auth_args[@]+"${auth_args[@]}"}" -X DELETE "http://${HTTP_ADDRESS}:${HTTP_PORT}/whip/publish/session/${encoded_session}" >/dev/null 2>&1; then
      log_info "WHIP publish session deleted: ${session_id}"
    fi
  done < <(sed -n 's/.*session created: \([^ ]*\).*/\1/p' "${log_file}" | sort -u)
}

stop_tracked_launcher() {
  local pid="$1"
  local log_file="${2:-}"
  [[ -z "${pid}" ]] && return 0
  if kill -0 "${pid}" 2>/dev/null; then
    kill "${pid}" >/dev/null 2>&1 || true
    wait "${pid}" 2>/dev/null || true
  fi
  if [[ -n "${log_file}" && -f "${log_file}" ]]; then
    cleanup_whip_session_from_log "${log_file}"
    log_info "launcher stopped: pid=${pid} log=${log_file}"
  fi
}

probe_rtsp_url() {
  local url="$1"
  local timeout_us="$2"
  local command_timeout_s
  command_timeout_s="$(python3 - "${timeout_us}" <<'PY'
import math
import sys

timeout_us = int(sys.argv[1])
print(max(10, min(120, math.ceil(timeout_us / 1000000) + 10)))
PY
)"

  # ffprobe의 RTSP rw_timeout만으로 종료되지 않는 외부 upstream 대기 상태를 프로세스 단위로 제한한다.
  python3 - "${command_timeout_s}" "${timeout_us}" "${url}" <<'PY'
import subprocess
import sys

command_timeout_s = float(sys.argv[1])
timeout_us = sys.argv[2]
url = sys.argv[3]
cmd = [
    "ffprobe",
    "-v", "error",
    "-rtsp_transport", "tcp",
    "-rw_timeout", timeout_us,
    "-show_entries", "stream=index,codec_name,codec_type",
    "-of", "compact=p=0:nk=1",
    url,
]

try:
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=command_timeout_s,
    )
except subprocess.TimeoutExpired as exc:
    if exc.stdout:
        sys.stdout.write(exc.stdout if isinstance(exc.stdout, str) else exc.stdout.decode("utf-8", "replace"))
    if exc.stderr:
        sys.stderr.write(exc.stderr if isinstance(exc.stderr, str) else exc.stderr.decode("utf-8", "replace"))
    sys.stderr.write(f"ffprobe command timed out after {command_timeout_s:.0f}s\n")
    raise SystemExit(124)

sys.stdout.write(result.stdout)
sys.stderr.write(result.stderr)
raise SystemExit(result.returncode)
PY
}

verify_rtsp_case() {
  local name="$1"
  local query="$2"
  local route_suffix="$3"
  local expect_video="$4"
  local expect_audio="$5"
  local timeout_us="$6"

  # ffprobe 결과의 codec_name/codec_type만 비교해 route별 transcoding 결과를 빠르게 확인한다.
  local url="rtsp://${RTSP_ADDRESS}:${RTSP_PORT}/${ROUTE}${route_suffix}?${query}"
  local output
  if ! output="$(probe_rtsp_url "${url}" "${timeout_us}" 2>&1)"; then
    log_fail "${name}: OnMediaConfigure RTSP probe failed (${url})"
    echo "${output}" | sed 's/^/  /'
    return 1
  fi

  local video_codec=""
  local audio_codec=""
  while IFS='|' read -r _ codec kind; do
    if [[ "${kind}" == "video" ]]; then
      video_codec="${codec}"
    elif [[ "${kind}" == "audio" ]]; then
      audio_codec="${codec}"
    fi
  done <<< "${output}"

  local normalized_video="${video_codec:-none}"
  local normalized_audio="${audio_codec:-none}"
  local OnMediaConfigure_readback="${normalized_video}/${normalized_audio}"
  if [[ "${OnMediaConfigure_readback}" == "${expect_video}/${expect_audio}" ]]; then
    log_pass "${name}: RTSP ${route_suffix:-/default} -> ${normalized_video}/${normalized_audio}"
  else
    log_fail "${name}: RTSP ${route_suffix:-/default} expected ${expect_video}/${expect_audio}, got ${normalized_video}/${normalized_audio}"
  fi
}

emit_rtsp_route_matrix() {
  local verify_profile_json="$1"
  # source별 verify_profile.rtsp_route_keys가 있으면 전체 route 대신 지정 subset만 검증한다.
  python3 - "$verify_profile_json" <<'PY'
import json
import sys

default_routes = [
    ("", "h264", "aac"),
    ("/h264", "h264", "aac"),
    ("/h265", "hevc", "aac"),
    ("/opus", "h264", "opus"),
    ("/h265/opus", "hevc", "opus"),
    ("/pcmu", "h264", "pcm_mulaw"),
    ("/h265/pcmu", "hevc", "pcm_mulaw"),
    ("/pcma", "h264", "pcm_alaw"),
    ("/h265/pcma", "hevc", "pcm_alaw"),
]
route_map = {
    "default": default_routes[0],
    "h264": default_routes[1],
    "h265": default_routes[2],
    "opus": default_routes[3],
    "h265_opus": default_routes[4],
    "pcmu": default_routes[5],
    "h265_pcmu": default_routes[6],
    "pcma": default_routes[7],
    "h265_pcma": default_routes[8],
}

profile_arg = sys.argv[1]
if profile_arg:
    profile = json.loads(profile_arg)
    route_expectations = profile.get("rtsp_routes")
    if isinstance(route_expectations, list) and route_expectations:
        for item in route_expectations:
            if not isinstance(item, dict):
                continue
            route_suffix = item.get("route_suffix")
            if route_suffix is None:
                route = route_map.get(item.get("route_key", "default"))
                route_suffix = route[0] if route is not None else ""
            expect_video = item.get("expect_video", "h264")
            expect_audio = item.get("expect_audio", "aac")
            print("|".join([route_suffix, expect_video, expect_audio]))
        raise SystemExit(0)
    keys = profile.get("rtsp_route_keys")
    if isinstance(keys, list) and keys:
        for key in keys:
            route = route_map.get(key)
            if route is not None:
                print("|".join(route))
        raise SystemExit(0)

for route in default_routes:
    print("|".join(route))
PY
}

verify_webrtc_case() {
  local name="$1"
  local query="$2"
  local timeout_s="$3"
  local url="http://${HTTP_ADDRESS}:${HTTP_PORT}/webrtc/session?${query}"
  local response
  local auth_args=()
  if [[ -n "${AUTH_COOKIE_FILE}" ]]; then
    auth_args=(-b "${AUTH_COOKIE_FILE}")
  fi
  if ! response="$(curl -sS "${auth_args[@]+"${auth_args[@]}"}" --max-time "${timeout_s}" -X POST "${url}")"; then
    log_fail "${name}: WebRTC session create failed (${url})"
    return
  fi

  local session_id
  session_id="$(python3 - "${response}" <<'PY'
import json
import sys
try:
    payload = json.loads(sys.argv[1])
except json.JSONDecodeError:
    print("")
    raise SystemExit(0)
print(payload.get("sessionId", ""))
PY
)"

  local offer
  offer="$(python3 - "${response}" <<'PY'
import json
import sys
try:
    payload = json.loads(sys.argv[1])
except json.JSONDecodeError:
    print("")
    raise SystemExit(0)
print(payload.get("offer", ""))
PY
)"

  if [[ -z "${session_id}" || -z "${offer}" ]]; then
    log_fail "${name}: WebRTC response missing sessionId/offer"
    echo "${response}" | sed 's/^/  /'
    return
  fi

  curl -sS "${auth_args[@]+"${auth_args[@]}"}" -X DELETE "http://${HTTP_ADDRESS}:${HTTP_PORT}/webrtc/session/${session_id}" >/dev/null 2>&1 || true
  log_pass "${name}: WebRTC signaling session created (${session_id})"
}

verify_source() {
  local source_json="$1"
  local name source_kind source enabled requires_network notes
  name="$(json_field "${source_json}" "name")"
  source_kind="$(json_field "${source_json}" "source_kind")"
  source="$(json_field "${source_json}" "source")"
  enabled="$(json_field "${source_json}" "enabled")"
  requires_network="$(json_field "${source_json}" "requires_network")"
  notes="$(json_field "${source_json}" "notes")"
  local verify_profile_json
  verify_profile_json="$(python3 - "${source_json}" <<'PY'
import json
import sys
payload = json.loads(sys.argv[1])
profile = payload.get("verify_profile")
print("" if profile is None else json.dumps(profile, separators=(",", ":")))
PY
)"
  local source_ffprobe_timeout_us="${FFPROBE_TIMEOUT_US}"
  local source_rtsp_preflight_timeout_ms="${RTSP_PREFLIGHT_TIMEOUT_MS}"
  local source_webrtc_timeout_s="${MEDIA_SERVER_VERIFY_WEBRTC_HTTP_TIMEOUT_S:-15}"
  local source_profile_label=""
  local source_server_env_hint=""
  local source_webrtc_first="false"
  local source_skip_rtsp="false"
  local source_skip_webrtc="false"
  if [[ -n "${verify_profile_json}" ]]; then
    local profile_ffprobe profile_preflight profile_webrtc_timeout
    profile_ffprobe="$(json_field "${verify_profile_json}" "ffprobe_timeout_us")"
    profile_preflight="$(json_field "${verify_profile_json}" "rtsp_preflight_timeout_ms")"
    profile_webrtc_timeout="$(json_field "${verify_profile_json}" "webrtc_http_timeout_s")"
    source_profile_label="$(json_field "${verify_profile_json}" "label")"
    source_server_env_hint="$(json_field "${verify_profile_json}" "server_env_hint")"
    source_webrtc_first="$(json_field "${verify_profile_json}" "run_webrtc_first")"
    source_skip_rtsp="$(json_field "${verify_profile_json}" "skip_rtsp")"
    source_skip_webrtc="$(json_field "${verify_profile_json}" "skip_webrtc")"
    [[ -n "${profile_ffprobe}" ]] && source_ffprobe_timeout_us="${profile_ffprobe}"
    [[ -n "${profile_preflight}" ]] && source_rtsp_preflight_timeout_ms="${profile_preflight}"
    [[ -n "${profile_webrtc_timeout}" ]] && source_webrtc_timeout_s="${profile_webrtc_timeout}"
  fi

  if [[ "${enabled}" != "true" ]]; then
    log_skip "${name}: disabled in config"
    return
  fi
  if [[ -n "${SOURCE_FILTER}" && "${name}" != *"${SOURCE_FILTER}"* ]]; then
    log_skip "${name}: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=${SOURCE_FILTER}"
    return
  fi
  if [[ "${requires_network}" == "true" && "${INCLUDE_EXTERNAL}" != "1" ]]; then
    log_skip "${name}: external source skipped (set MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=1)"
    return
  fi

  local launcher_json
  LAST_LAUNCHER_PID=""
  LAST_LAUNCHER_LOG=""
  launcher_json="$(python3 - "${source_json}" <<'PY'
import json
import sys
payload = json.loads(sys.argv[1])
launcher = payload.get("launcher")
print("" if launcher is None else json.dumps(launcher, separators=(",", ":")))
PY
)"

  if [[ -n "${launcher_json}" ]]; then
    local launcher_type launcher_port launcher_mount launcher_input launcher_video launcher_audio launcher_source_id launcher_duration launcher_root
    launcher_type="$(json_field "${launcher_json}" "type")"
    launcher_port="$(json_field "${launcher_json}" "port")"
    launcher_mount="$(json_field "${launcher_json}" "mount")"
    launcher_input="$(json_field "${launcher_json}" "input")"
    launcher_video="$(json_field "${launcher_json}" "video_codec")"
    launcher_audio="$(json_field "${launcher_json}" "audio_codec")"
    launcher_source_id="$(json_field "${launcher_json}" "source_id")"
    launcher_duration="$(json_field "${launcher_json}" "duration_s")"
    launcher_root="$(json_field "${launcher_json}" "root")"
    if [[ "${launcher_type}" == "local_rtsp" ]]; then
      start_local_launcher "${name}" "${launcher_port}" "${launcher_mount}" "${launcher_input}" "${launcher_video}" "${launcher_audio}" || return
    elif [[ "${launcher_type}" == "local_http" ]]; then
      start_local_http_launcher "${name}" "${launcher_port}" "${launcher_root}" || return
    elif [[ "${launcher_type}" == "local_hls" ]]; then
      start_local_hls_launcher "${name}" "${launcher_port}" "${launcher_input}" || return
    elif [[ "${launcher_type}" == "whip_publish" ]]; then
      # 서버 registry에 이전 publisher가 잠시 남아 있어도 matrix 재실행이 충돌하지 않도록 매번 고유 sourceId를 쓴다.
      launcher_source_id="${launcher_source_id:-publisher-verify}-$$-${RANDOM}"
      source="${launcher_source_id}"
      start_whip_publisher "${name}" "http://${HTTP_ADDRESS}:${HTTP_PORT}" "${launcher_source_id}" "${launcher_duration:-60}" || return
    fi
  fi

  if [[ "${source_kind}" == "rtsp" ]]; then
    local preflight_output=""
    if preflight_output="$(media_server_rtsp_preflight "${source}" "${source_rtsp_preflight_timeout_ms}" 2>&1)"; then
      log_info "${name}: ${preflight_output}"
    else
      if [[ "${requires_network}" == "true" ]]; then
        log_fail "${name}: ${preflight_output}"
        if [[ -n "${source_server_env_hint}" ]]; then
          echo "  server-env-hint: ${source_server_env_hint}"
        fi
        return
      fi
      log_fail "${name}: RTSP source preflight failed"
      echo "${preflight_output}" | sed 's/^/  /'
      return
    fi
  fi

  local query=""
  case "${source_kind}" in
    file)
      query="file=$(urlencode "${source}")"
      ;;
    rtsp)
      query="url=$(urlencode "${source}")"
      ;;
    webrtc)
      query="url=$(urlencode "${source}")&source=webrtc"
      ;;
    hls|http|youtube)
      if [[ "${source_kind}" == "youtube" &&
            ( "${MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE:-0}" != "1" ||
              "${MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE:-0}" != "1" ) ]]; then
        log_skip "${name}: source=youtube is excluded by default; set MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=1 at build time and MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1 at runtime to run this lab-only experimental case"
        stop_tracked_launcher "${LAST_LAUNCHER_PID}" "${LAST_LAUNCHER_LOG}"
        return
      fi
      query="url=$(urlencode "${source}")&source=${source_kind}"
      ;;
    *)
      log_skip "${name}: unsupported source kind '${source_kind}'"
      return
      ;;
  esac

  log_info "source ${name}: ${notes}"
  if [[ -n "${source_profile_label}" ]]; then
    log_info "source ${name}: verify profile=${source_profile_label} rtsp_preflight_timeout_ms=${source_rtsp_preflight_timeout_ms} ffprobe_timeout_us=${source_ffprobe_timeout_us} webrtc_http_timeout_s=${source_webrtc_timeout_s}"
  fi
  if [[ -n "${source_server_env_hint}" ]]; then
    log_info "source ${name}: server env hint=${source_server_env_hint}"
  fi

  local rtsp_runner webrtc_runner
  rtsp_runner() {
    if [[ "${SKIP_RTSP}" != "1" && "${source_skip_rtsp}" != "true" ]]; then
      while IFS='|' read -r route_suffix expect_video expect_audio; do
        [[ -z "${route_suffix}${expect_video}${expect_audio}" ]] && continue
        verify_rtsp_case "${name}" "${query}" "${route_suffix}" "${expect_video}" "${expect_audio}" "${source_ffprobe_timeout_us}" || true
      done < <(emit_rtsp_route_matrix "${verify_profile_json}")
    else
      log_skip "${name}: RTSP verification skipped"
    fi
  }
  webrtc_runner() {
    if [[ "${SKIP_WEBRTC}" != "1" && "${source_skip_webrtc}" != "true" ]]; then
      verify_webrtc_case "${name}" "${query}" "${source_webrtc_timeout_s}"
    else
      log_skip "${name}: WebRTC verification skipped"
    fi
  }

  if [[ "${source_webrtc_first}" == "true" ]]; then
    webrtc_runner
    rtsp_runner
  else
    rtsp_runner
    webrtc_runner
  fi

  stop_tracked_launcher "${LAST_LAUNCHER_PID}" "${LAST_LAUNCHER_LOG}"
}

main() {
  require_cmd python3
  require_cmd curl
  require_cmd ffprobe

  resolve_runtime_config
  trap cleanup EXIT

  log_info "server rtsp=${RTSP_BIND_ADDRESS:-${RTSP_ADDRESS}}:${RTSP_PORT} route=${ROUTE} client=${RTSP_ADDRESS}"
  log_info "server http=${HTTP_BIND_ADDRESS:-${HTTP_ADDRESS}}:${HTTP_PORT} client=${HTTP_ADDRESS}"
  if [[ -f "${PID_FILE}" ]]; then
    log_info "pid file: ${PID_FILE} ($(cat "${PID_FILE}" 2>/dev/null || true))"
  fi

  local verify_binary="${MEDIA_SERVER_BIN_PATH:-${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst-onnx}/media_server}"
  if [[ ! -x "${verify_binary}" ]]; then
    echo "[verify] missing build binary: ${verify_binary}"
    echo "[verify] build first: ./server.sh start"
    exit 1
  fi

  if ! media_server_is_tcp_listening "${RTSP_PORT}"; then
    echo "[verify] RTSP server is not listening on ${RTSP_PORT}"
    exit 1
  fi
  if ! media_server_is_tcp_listening "${HTTP_PORT}"; then
    echo "[verify] HTTP server is not listening on ${HTTP_PORT}"
    exit 1
  fi
  prepare_auth_cookie

  while IFS= read -r source_json; do
    [[ -z "${source_json}" ]] && continue
    verify_source "${source_json}"
  done < <(load_config)

  echo
  echo "[summary] pass=${PASS_COUNT} fail=${FAIL_COUNT} skip=${SKIP_COUNT}"
  if [[ ${FAIL_COUNT} -ne 0 ]]; then
    exit 1
  fi
}

main "$@"
