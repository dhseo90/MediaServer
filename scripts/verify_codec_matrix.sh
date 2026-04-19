#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
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
LAUNCHER_LOGS=()
LAST_LAUNCHER_PID=""
LAST_LAUNCHER_LOG=""

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
  if [[ -f "${PORT_FILE}" ]]; then
    RTSP_PORT="$(cat "${PORT_FILE}")"
  else
    RTSP_PORT="$(sed -nE 's/.*kRtspListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  fi
  RTSP_PORT="${MEDIA_SERVER_LISTEN_PORT:-${RTSP_PORT:-8554}}"

  if [[ -f "${ADDRESS_FILE}" ]]; then
    RTSP_ADDRESS="$(cat "${ADDRESS_FILE}")"
  else
    RTSP_ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kRtspListenAddress" || true)"
  fi
  RTSP_ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS:-${RTSP_ADDRESS:-127.0.0.1}}"

  HTTP_PORT="$(sed -nE 's/.*kHttpListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-${HTTP_PORT:-8080}}"

  HTTP_ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)"
  HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-${HTTP_ADDRESS:-127.0.0.1}}"

  ROUTE="$(media_server_read_const_charp "${STD_AFX}" "kStreamRoute" || true)"
  ROUTE="${MEDIA_SERVER_ROUTE:-${ROUTE:-dhseo}}"
}

cleanup() {
  for pid in "${LAUNCHER_PIDS[@]:-}"; do
    if kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" >/dev/null 2>&1 || true
      wait "${pid}" 2>/dev/null || true
    fi
  done
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

start_whip_publisher() {
  local name="$1"
  local http_base="$2"
  local source_id="$3"
  local duration_s="$4"

  local log_file="/tmp/${name}.publisher.log"
  nohup bash -lc \
    "source \"${SCRIPT_DIR}/env_common.sh\" && media_server_apply_homebrew_gst_env && python3 -u \"${SCRIPT_DIR}/whip_publish_test.py\" --http-base \"${http_base}\" --source-id \"${source_id}\" --duration \"${duration_s}\"" \
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
      log_info "publisher ready: sourceId=${source_id}"
      return 0
    fi
    sleep 1
  done

  log_fail "${name}: WHIP publisher did not become ready"
  tail -n 80 "${log_file}" || true
  return 1
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
    log_info "launcher stopped: pid=${pid} log=${log_file}"
  fi
}

probe_rtsp_url() {
  local url="$1"
  local timeout_us="$2"
  ffprobe -v error -rtsp_transport tcp -rw_timeout "${timeout_us}" \
    -show_entries stream=index,codec_name,codec_type -of compact=p=0:nk=1 "${url}"
}

verify_rtsp_case() {
  local name="$1"
  local query="$2"
  local route_suffix="$3"
  local expect_video="$4"
  local expect_audio="$5"
  local timeout_us="$6"

  local url="rtsp://${RTSP_ADDRESS}:${RTSP_PORT}/${ROUTE}${route_suffix}?${query}"
  local output
  if ! output="$(probe_rtsp_url "${url}" "${timeout_us}" 2>&1)"; then
    log_fail "${name}: RTSP probe failed (${url})"
    echo "${output}" | sed 's/^/  /'
    return
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

  if [[ "${video_codec}" == "${expect_video}" && "${audio_codec}" == "${expect_audio}" ]]; then
    log_pass "${name}: RTSP ${route_suffix:-/default} -> ${video_codec}/${audio_codec}"
  else
    log_fail "${name}: RTSP ${route_suffix:-/default} expected ${expect_video}/${expect_audio}, got ${video_codec:-none}/${audio_codec:-none}"
  fi
}

emit_rtsp_route_matrix() {
  local verify_profile_json="$1"
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
  if ! response="$(curl -sS --max-time "${timeout_s}" -X POST "${url}")"; then
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

  curl -sS -X DELETE "http://${HTTP_ADDRESS}:${HTTP_PORT}/webrtc/session/${session_id}" >/dev/null 2>&1 || true
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
  if [[ -n "${verify_profile_json}" ]]; then
    local profile_ffprobe profile_preflight profile_webrtc_timeout
    profile_ffprobe="$(json_field "${verify_profile_json}" "ffprobe_timeout_us")"
    profile_preflight="$(json_field "${verify_profile_json}" "rtsp_preflight_timeout_ms")"
    profile_webrtc_timeout="$(json_field "${verify_profile_json}" "webrtc_http_timeout_s")"
    source_profile_label="$(json_field "${verify_profile_json}" "label")"
    source_server_env_hint="$(json_field "${verify_profile_json}" "server_env_hint")"
    source_webrtc_first="$(json_field "${verify_profile_json}" "run_webrtc_first")"
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
    local launcher_type launcher_port launcher_mount launcher_input launcher_video launcher_audio launcher_source_id launcher_duration
    launcher_type="$(json_field "${launcher_json}" "type")"
    launcher_port="$(json_field "${launcher_json}" "port")"
    launcher_mount="$(json_field "${launcher_json}" "mount")"
    launcher_input="$(json_field "${launcher_json}" "input")"
    launcher_video="$(json_field "${launcher_json}" "video_codec")"
    launcher_audio="$(json_field "${launcher_json}" "audio_codec")"
    launcher_source_id="$(json_field "${launcher_json}" "source_id")"
    launcher_duration="$(json_field "${launcher_json}" "duration_s")"
    if [[ "${launcher_type}" == "local_rtsp" ]]; then
      start_local_launcher "${name}" "${launcher_port}" "${launcher_mount}" "${launcher_input}" "${launcher_video}" "${launcher_audio}" || return
    elif [[ "${launcher_type}" == "whip_publish" ]]; then
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
    if [[ "${SKIP_RTSP}" != "1" ]]; then
      while IFS='|' read -r route_suffix expect_video expect_audio; do
        [[ -z "${route_suffix}${expect_video}${expect_audio}" ]] && continue
        verify_rtsp_case "${name}" "${query}" "${route_suffix}" "${expect_video}" "${expect_audio}" "${source_ffprobe_timeout_us}"
      done < <(emit_rtsp_route_matrix "${verify_profile_json}")
    else
      log_skip "${name}: RTSP verification skipped"
    fi
  }
  webrtc_runner() {
    if [[ "${SKIP_WEBRTC}" != "1" ]]; then
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

  log_info "server rtsp=${RTSP_ADDRESS}:${RTSP_PORT} route=${ROUTE}"
  log_info "server http=${HTTP_ADDRESS}:${HTTP_PORT}"
  if [[ -f "${PID_FILE}" ]]; then
    log_info "pid file: ${PID_FILE} ($(cat "${PID_FILE}" 2>/dev/null || true))"
  fi

  if [[ ! -x "${ROOT_DIR}/build-gst/media_server" ]]; then
    echo "[verify] missing build binary: ${ROOT_DIR}/build-gst/media_server"
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
