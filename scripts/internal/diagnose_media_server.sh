#!/usr/bin/env bash
# 파일 용도: 서버 실행 상태와 로컬/외부 source 접근성을 진단한다.
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

PID_FILE="${ROOT_DIR}/.media_server.pid"
PORT_FILE="${ROOT_DIR}/.media_server.port"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"
STD_AFX="${ROOT_DIR}/include/stdafx.h"
LOG_FILE="${ROOT_DIR}/.media_server.log"
BUILD_BINARY="${MEDIA_SERVER_BIN_PATH:-${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst-onnx}/media_server}"
VERIFY_CONFIG_FILE="${MEDIA_SERVER_VERIFY_CONFIG:-${ROOT_DIR}/config/codec_test_sources.json}"
DIAG_INCLUDE_EXTERNAL="${MEDIA_SERVER_DIAG_INCLUDE_EXTERNAL:-0}"
DIAG_RTSP_PREFLIGHT_TIMEOUT_MS="${MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS:-1500}"
DIAG_EXTERNAL_RTSP_URL="${MEDIA_SERVER_DIAG_RTSP_URL:-}"
DIAG_FFPROBE_TIMEOUT_US="${MEDIA_SERVER_DIAG_FFPROBE_TIMEOUT_US:-10000000}"
DIAG_PROBE_WALL_TIMEOUT_S="${MEDIA_SERVER_DIAG_PROBE_WALL_TIMEOUT_S:-15}"

client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

load_default_external_rtsp_url() {
  if [[ -n "${DIAG_EXTERNAL_RTSP_URL}" || "${DIAG_INCLUDE_EXTERNAL}" != "1" ]]; then
    return
  fi
  if [[ ! -f "${VERIFY_CONFIG_FILE}" ]]; then
    return
  fi

  DIAG_EXTERNAL_RTSP_URL="$(
    python3 - "${VERIFY_CONFIG_FILE}" <<'PY'
import json
import pathlib
import sys

config_path = pathlib.Path(sys.argv[1])
data = json.loads(config_path.read_text())
for source in data.get("sources", []):
    if source.get("source_kind") == "rtsp" and source.get("requires_network") is True:
        print(source.get("source", ""))
        break
PY
  )"
}

read_config() {
  if [[ -f "${PORT_FILE}" ]]; then
    PORT="$(cat "${PORT_FILE}")"
  else
    PORT="$(sed -nE 's/.*kRtspListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  fi
  if [[ -n "${MEDIA_SERVER_LISTEN_PORT:-}" ]]; then
    PORT="${MEDIA_SERVER_LISTEN_PORT}"
  fi
  if [[ -z "${PORT}" ]]; then
    PORT="8554"
  fi
  HTTP_PORT="$(sed -nE 's/.*kHttpListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  if [[ -n "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" ]]; then
    HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT}"
  fi
  if [[ -z "${HTTP_PORT}" ]]; then
    HTTP_PORT="8080"
  fi
  ROUTE="$(sed -nE 's/.*kStreamRoute = "([^"]+)".*/\1/p' "${STD_AFX}" | head -n1)"

  if [[ -f "${ADDRESS_FILE}" ]]; then
    ADDRESS="$(cat "${ADDRESS_FILE}")"
  elif [[ -n "${MEDIA_SERVER_LISTEN_ADDRESS:-}" ]]; then
    ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS}"
  else
    ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kRtspListenAddress" || true)"
  fi
  if [[ -z "${ADDRESS}" ]]; then
    ADDRESS="127.0.0.1"
  fi
  if [[ -n "${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-}" ]]; then
    HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS}"
  else
    HTTP_ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)"
  fi
  if [[ -z "${HTTP_ADDRESS}" ]]; then
    HTTP_ADDRESS="127.0.0.1"
  fi

  FILE_ROOT="$(media_server_resolve_project_path "${ROOT_DIR}" "$(media_server_read_const_charp "${STD_AFX}" "kFileRootPath")")"
  DEFAULT_FILE="$(media_server_resolve_project_path "${ROOT_DIR}" "$(media_server_read_const_charp "${STD_AFX}" "kDefaultFilePath")")"
  DEFAULT_FILE_TOKEN="${DEFAULT_FILE#${FILE_ROOT}/}"
  if [[ "${DEFAULT_FILE}" == "${DEFAULT_FILE_TOKEN}" || -z "${DEFAULT_FILE_TOKEN}" ]]; then
    DEFAULT_FILE_TOKEN="$(basename "${DEFAULT_FILE}")"
  fi

  H264_FILE_TOKEN="sample_h264.mp4"
  H265_FILE_TOKEN="sample_h265.mp4"
  if [[ -n "${FILE_ROOT}" ]]; then
    [[ -f "${FILE_ROOT}/${H264_FILE_TOKEN}" ]] || H264_FILE_TOKEN="${DEFAULT_FILE_TOKEN}"
    [[ -f "${FILE_ROOT}/${H265_FILE_TOKEN}" ]] || H265_FILE_TOKEN="${DEFAULT_FILE_TOKEN}"
  fi

  RTSP_CLIENT_HOST="$(client_host "${MEDIA_SERVER_DIAG_RTSP_HOST:-${ADDRESS}}")"
  HTTP_CLIENT_HOST="$(client_host "${MEDIA_SERVER_DIAG_HTTP_HOST:-${HTTP_ADDRESS}}")"
  TEST_URL_H264="rtsp://${RTSP_CLIENT_HOST}:${PORT}/${ROUTE}?file=${H264_FILE_TOKEN}"
  TEST_URL_H265="rtsp://${RTSP_CLIENT_HOST}:${PORT}/${ROUTE}/h265?file=${H265_FILE_TOKEN}"
}

print_line() {
  local status="$1"
  local msg="$2"
  local indent="${3:-}"
  echo "${indent}[${status}] ${msg}"
}

collect_process_state() {
  print_line "INFO" "Process status:"
  if [[ -f "${PID_FILE}" ]]; then
    PID="$(cat "${PID_FILE}")"
    if [[ -z "${PID}" ]]; then
      print_line "WARN" "pid file exists but empty"
      OVERALL=1
      return
    fi
    print_line "INFO" "pid file exists (pid=${PID})" "  "
    if kill -0 "${PID}" 2>/dev/null; then
      print_line "PASS" "process alive"
    else
      if media_server_is_tcp_listening "${PORT}" || media_server_is_tcp_listening "${HTTP_PORT}"; then
        print_line "WARN" "stale pid file, but server ports are listening"
        print_line "TIP" "foreground 실행 또는 이전 detached 종료 후 남은 pid 파일일 수 있습니다." "  "
      else
        print_line "FAIL" "stale pid file"
        OVERALL=1
      fi
    fi
  else
    print_line "WARN" "pid file missing"
  fi
}

collect_net_state() {
  if media_server_is_tcp_listening "${PORT}"; then
    print_line "PASS" "TCP ${PORT} is listening"
  else
    print_line "FAIL" "TCP ${PORT} is not listening"
    LISTEN_FAIL=1
    OVERALL=1
    if media_server_has_listener_probe; then
      print_line "TIP" "포트 ${PORT}에서 LISTEN 상태가 감지되지 않았습니다."
    else
      print_line "TIP" "lsof/ss/netstat 도구가 없어 엄격한 리슨 검증이 제한됩니다."
    fi
  fi

  if media_server_is_tcp_listening "${HTTP_PORT}"; then
    print_line "PASS" "HTTP ${HTTP_PORT} is listening"
    if media_server_http_healthcheck "${HTTP_CLIENT_HOST}" "${HTTP_PORT}" "/health"; then
      print_line "PASS" "HTTP health check passed (/health)"
    else
      print_line "FAIL" "HTTP health check failed (/health)"
      OVERALL=1
    fi
  else
    print_line "FAIL" "HTTP ${HTTP_PORT} is not listening"
    OVERALL=1
  fi
}

collect_log_state() {
  print_line "INFO" "Recent log (${LOG_FILE}):"
  if [[ ! -f "${LOG_FILE}" ]]; then
    print_line "WARN" "log file not found"
    return
  fi

  if grep -q "failed to create socket\\|Operation not permitted\\|Error binding to address" "${LOG_FILE}"; then
    print_line "FAIL" "socket bind permission issue detected in log"
    if grep -q "Operation not permitted" "${LOG_FILE}"; then
      print_line "FAIL" "RTSP bind was denied by environment policy"
      BIND_DENIED=1
    fi
    OVERALL=1
  else
    print_line "PASS" "no bind-related errors in recent log"
  fi

  if grep -q "failed to attach RTSP server to main context" "${LOG_FILE}"; then
    print_line "FAIL" "server did not finish startup path"
    CONTEXT_FAIL=1
    OVERALL=1
  fi
  if grep -Eq "Error binding to address .*:240[0-9]+: Operation not permitted" "${LOG_FILE}"; then
    print_line "FAIL" "rtsp udp/rtp high-port bind was denied"
    UDP_BIND_BLOCKED=1
    OVERALL=1
  fi

  tail -n 30 "${LOG_FILE}" | sed 's/^/    /'
}

collect_bind_probe() {
  if media_server_is_tcp_listening "${PORT}"; then
    print_line "INFO" "TCP probe bind skipped because ${ADDRESS}:${PORT} is already listening"
    print_line "TIP" "이미 리슨 중인 포트는 재바인딩할 수 없으므로 권한 문제로 판정하지 않습니다." "  "
    return
  fi

  if media_server_is_tcp_bind_forbidden "${ADDRESS}" "${PORT}"; then
    print_line "FAIL" "current environment cannot bind TCP on ${ADDRESS}:${PORT}"
    print_line "TIP" "runtime environment likely blocks socket creation (Operation not permitted)."
    OVERALL=1
  else
    print_line "PASS" "TCP probe bind on ${ADDRESS}:${PORT} passed"
  fi
}

collect_external_rtsp_state() {
  if [[ -z "${DIAG_EXTERNAL_RTSP_URL}" ]]; then
    print_line "INFO" "External RTSP preflight skipped"
    print_line "TIP" "set MEDIA_SERVER_DIAG_INCLUDE_EXTERNAL=1 or MEDIA_SERVER_DIAG_RTSP_URL=rtsp://... to test external reachability" "  "
    return
  fi

  print_line "INFO" "External RTSP preflight:"
  print_line "INFO" "url=${DIAG_EXTERNAL_RTSP_URL}" "  "
  local preflight_output=""
  if preflight_output="$(media_server_rtsp_preflight "${DIAG_EXTERNAL_RTSP_URL}" "${DIAG_RTSP_PREFLIGHT_TIMEOUT_MS}" 2>&1)"; then
    print_line "PASS" "${preflight_output}"
  else
    print_line "FAIL" "${preflight_output}"
    EXTERNAL_RTSP_FAIL=1
    OVERALL=1
  fi
}

collect_file_state() {
  print_line "INFO" "Config:"
  print_line "INFO" "address=${ADDRESS} port=${PORT} route=${ROUTE}" "  "
  print_line "INFO" "http_address=${HTTP_ADDRESS} http_port=${HTTP_PORT}" "  "
  print_line "INFO" "file_root=${FILE_ROOT}" "  "
  print_line "INFO" "default_file=${DEFAULT_FILE}" "  "
  print_line "INFO" "h264_url=${TEST_URL_H264}" "  "
  print_line "INFO" "h265_url=${TEST_URL_H265}" "  "

  if [[ -f "${DEFAULT_FILE}" ]]; then
    print_line "PASS" "default sample exists"
  else
    print_line "FAIL" "default sample missing: ${DEFAULT_FILE}"
    FILE_FAIL=1
    OVERALL=1
  fi
  if [[ -f "${FILE_ROOT}/${H264_FILE_TOKEN}" ]]; then
    print_line "PASS" "sample_h264.mp4 exists"
  else
    print_line "FAIL" "sample_h264.mp4 missing: ${FILE_ROOT}/${H264_FILE_TOKEN}"
    FILE_FAIL=1
    OVERALL=1
  fi
  if [[ -f "${FILE_ROOT}/${H265_FILE_TOKEN}" ]]; then
    print_line "PASS" "sample_h265.mp4 exists"
  else
    print_line "FAIL" "sample_h265.mp4 missing: ${FILE_ROOT}/${H265_FILE_TOKEN}"
    FILE_FAIL=1
    OVERALL=1
  fi

  if [[ "${MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE:-0}" == "1" &&
        ( "${MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE:-0}" == "1" ||
          "${MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT:-0}" == "1" ) ]]; then
    if command -v yt-dlp >/dev/null 2>&1; then
      print_line "PASS" "yt-dlp available for YouTube source/import features"
    else
      print_line "WARN" "yt-dlp not found; YouTube source/import features will fail until installed"
    fi
    if command -v deno >/dev/null 2>&1; then
      print_line "INFO" "deno available; yt-dlp can use jsc:deno for some YouTube JS challenges"
    else
      print_line "INFO" "deno not found; some YouTube JS challenges may fail even when yt-dlp is installed"
    fi
  else
    print_line "INFO" "experimental source=youtube and lab YouTube import are disabled or excluded from this build"
  fi
}

probe_stream() {
  local codec="$1"
  local url="$2"
  local probe_rc="/tmp/media_server_probe_${codec}.rc"
  local probe_out="/tmp/media_server_probe_${codec}.txt"
  rm -f "${probe_rc}" "${probe_out}"

  if [[ "${MEDIA_SERVER_FFMPEG_FREE:-0}" == "1" ]]; then
    print_line "INFO" "MEDIA_SERVER_FFMPEG_FREE=1; skip ffprobe probe (${codec})"
    return
  fi

  if ! command -v ffprobe >/dev/null 2>&1; then
    print_line "WARN" "ffprobe not found; skip probe (${codec})"
    return
  fi

  (
    ffprobe -v error -rw_timeout "${DIAG_FFPROBE_TIMEOUT_US}" -rtsp_transport tcp -show_streams "${url}" \
      > "${probe_out}" 2>&1
    echo $? > "${probe_rc}"
  ) >/dev/null 2>&1 &
  local probe_pid=$!
  local waited=0
  while kill -0 "${probe_pid}" 2>/dev/null; do
    if [[ ${waited} -ge $((DIAG_PROBE_WALL_TIMEOUT_S * 5)) ]]; then
      kill -9 "${probe_pid}" 2>/dev/null || true
      print_line "FAIL" "${codec} RTSP probe timeout"
      PROBE_FAIL=1
      OVERALL=1
      return
    fi
    sleep 0.2
    waited=$((waited + 1))
  done

  local rc=1
  if [[ -f "${probe_rc}" ]]; then
    rc="$(cat "${probe_rc}")"
  fi

  if [[ "${rc}" == "0" ]]; then
    print_line "PASS" "${codec} RTSP probe success"
    sed -n '1,8p' "${probe_out}" | sed 's/^/    /'
  else
    print_line "FAIL" "${codec} RTSP probe failed"
    sed -n '1,12p' "${probe_out}" | sed 's/^/    /'
    PROBE_FAIL=1
    OVERALL=1
  fi
}

print_recommendations() {
  if [[ ${OVERALL} -eq 0 ]]; then
    return
  fi

  echo
  echo "=== recommendations ==="
  if [[ ${FILE_FAIL} -eq 1 ]]; then
    print_line "TIP" "샘플 파일을 확인하세요. video 폴더에 sample_h264.mp4/sample_h265.mp4가 존재해야 합니다."
  fi
  if [[ ${BIND_DENIED} -eq 1 || ${LISTEN_FAIL} -eq 1 ]]; then
    print_line "TIP" "바인딩/권한 문제일 가능성이 큽니다. 환경 정책 때문에 127.0.0.1:${PORT} 바인딩이 막힐 수 있습니다."
    print_line "TIP" "환경이 다르면 실행 전 MEDIA_SERVER_LISTEN_ADDRESS_CANDIDATES=127.0.0.1,0.0.0.0 또는 IP를 지정해 재시도하세요."
  fi
  if [[ ${CONTEXT_FAIL} -eq 1 ]]; then
    print_line "TIP" "RTSP attach 단계 실패입니다. GStreamer 의존성(플러그인/권한) 점검이 필요합니다."
    print_line "TIP" "예: GST_DEBUG=2 ${BUILD_BINARY} 2>&1 | tail -n 120"
  fi
  if [[ ${UDP_BIND_BLOCKED} -eq 1 ]]; then
    print_line "TIP" "환경이 UDP 포트 바인딩을 제한합니다. TCP-only 모드로 실행해 보세요."
    print_line "TIP" "export MEDIA_SERVER_FORCE_RTSP_TCP=1"
  fi
  if [[ ${PROBE_FAIL} -eq 1 && ${LISTEN_FAIL} -eq 0 ]]; then
    print_line "TIP" "포트는 열렸으나 미디어 라우팅이 실패했습니다. URL 경로 (/dhseo, /dhseo/h265) 및 파일 권한을 점검하세요."
  fi
  if [[ ${EXTERNAL_RTSP_FAIL} -eq 1 ]]; then
    print_line "TIP" "외부 RTSP source는 현재 환경에서 host:port reachability 단계부터 실패했습니다."
    print_line "TIP" "방화벽, outbound 554/tcp 제한, remote source 상태를 먼저 확인하세요."
  fi
}

BIND_DENIED=0
LISTEN_FAIL=0
FILE_FAIL=0
CONTEXT_FAIL=0
UDP_BIND_BLOCKED=0
PROBE_FAIL=0
EXTERNAL_RTSP_FAIL=0
OVERALL=0

read_config
load_default_external_rtsp_url
collect_file_state
echo
collect_process_state
echo
collect_net_state
echo
collect_log_state
echo
collect_bind_probe
echo
collect_external_rtsp_state
echo
probe_stream "h264" "${TEST_URL_H264}"
echo
probe_stream "h265" "${TEST_URL_H265}"
echo

if [[ ${OVERALL} -eq 0 ]]; then
  print_line "PASS" "diagnosis: service looks healthy"
  print_recommendations
  exit 0
fi

print_line "FAIL" "diagnosis: issues found"
print_recommendations
exit 1
