#!/usr/bin/env bash
# 파일 용도: 실행 중인 media_server 프로세스를 PID/포트 기준으로 중지한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
PID_FILE="${ROOT_DIR}/.media_server.pid"
MODE_FILE="${ROOT_DIR}/.media_server.mode"
PORT_FILE="${ROOT_DIR}/.media_server.port"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"
PLIST_FILE="${ROOT_DIR}/.media_server.launchd.plist"
LAUNCH_LABEL="local.media_server"
STD_AFX="${ROOT_DIR}/include/stdafx.h"

cleanup_state_files() {
  rm -f "${PID_FILE}"
  rm -f "${MODE_FILE}"
  rm -f "${PORT_FILE}"
  rm -f "${ADDRESS_FILE}"
}

read_ports() {
  if [[ -f "${PORT_FILE}" ]]; then
    RTSP_PORT="$(cat "${PORT_FILE}")"
  else
    RTSP_PORT="$(sed -nE 's/.*kRtspListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  fi
  if [[ -z "${RTSP_PORT:-}" ]]; then
    RTSP_PORT="8554"
  fi

  HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-}"
  if [[ -z "${HTTP_PORT}" ]]; then
    HTTP_PORT="$(sed -nE 's/.*kHttpListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  fi
  if [[ -z "${HTTP_PORT}" ]]; then
    HTTP_PORT="8080"
  fi
}

find_media_server_listener_pids() {
  local port="$1"
  if [[ -z "${port}" || ! "${port}" =~ ^[0-9]+$ ]]; then
    return 0
  fi
  if ! media_server_has_cmd lsof; then
    return 0
  fi

  # 같은 포트를 쓰는 다른 프로세스를 죽이지 않도록 command 이름이 media_server인 listener만 대상으로 삼는다.
  { lsof -nP -iTCP:"${port}" -sTCP:LISTEN -Fp -c media_server 2>/dev/null || true; } \
    | sed -n 's/^p//p' \
    | sort -u
}

stop_pid() {
  local pid="$1"
  local label="$2"
  if [[ -z "${pid}" ]] || ! kill -0 "${pid}" 2>/dev/null; then
    return 1
  fi

  echo "stopping ${label} (pid=${pid})"
  kill "${pid}" 2>/dev/null || true

  for _ in {1..20}; do
    if ! kill -0 "${pid}" 2>/dev/null; then
      return 0
    fi
    sleep 0.2
  done

  echo "graceful stop timeout for pid=${pid}; sending SIGKILL"
  kill -9 "${pid}" 2>/dev/null || true
  return 0
}

stop_recorded_listener_pids() {
  local found=1
  local pid=""
  local seen=","
  for port in "${RTSP_PORT}" "${HTTP_PORT}"; do
    while IFS= read -r pid; do
      if [[ -z "${pid}" || "${seen}" == *",${pid},"* ]]; then
        continue
      fi
      seen="${seen}${pid},"
      found=0
      stop_pid "${pid}" "media_server listener on port ${port}" || true
    done < <(find_media_server_listener_pids "${port}")
  done
  return "${found}"
}

if [[ -f "${MODE_FILE}" ]] && [[ "$(cat "${MODE_FILE}")" == "launchctl" ]] && command -v launchctl >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)" "${PLIST_FILE}" >/dev/null 2>&1 || launchctl bootout "gui/$(id -u)/${LAUNCH_LABEL}" >/dev/null 2>&1 || true
fi

read_ports

if [[ ! -f "${PID_FILE}" ]]; then
  if stop_recorded_listener_pids; then
    echo "media_server listener stopped (no pid file)"
  else
    echo "media_server is not running (no pid file)"
  fi
  cleanup_state_files
  exit 0
fi

PID="$(cat "${PID_FILE}")"
if [[ -z "${PID}" ]]; then
  echo "empty pid file found; cleaning up"
  cleanup_state_files
  stop_recorded_listener_pids >/dev/null || true
  exit 0
fi
if ! kill -0 "${PID}" 2>/dev/null; then
  echo "stale pid file found; cleaning up"
  cleanup_state_files
  if stop_recorded_listener_pids; then
    echo "stopped stale media_server listener"
  else
    echo "no media_server listener found on recorded ports"
  fi
  exit 0
fi

stop_pid "${PID}" "media_server" || true
stop_recorded_listener_pids >/dev/null || true
cleanup_state_files
echo "stopped"
