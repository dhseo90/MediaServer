#!/usr/bin/env bash
# 파일 용도: 실행 중인 media_server를 PID/포트 기준으로 안전하게 중지한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"

ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

PID_FILE="${ROOT_DIR}/.media_server.pid"
MODE_FILE="${ROOT_DIR}/.media_server.mode"
PORT_FILE="${ROOT_DIR}/.media_server.port"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"
LOG_FILE="${ROOT_DIR}/.media_server.log"
PLIST_FILE="${ROOT_DIR}/.media_server.launchd.plist"
STD_AFX="${ROOT_DIR}/include/stdafx.h"

cleanup_state_files() {
  rm -f "${PID_FILE}" "${MODE_FILE}" "${PORT_FILE}" "${ADDRESS_FILE}" "${PLIST_FILE}"
}

stop_launchd_job() {
  if ! media_server_has_cmd launchctl; then
    return 1
  fi
  if [[ -f "${PLIST_FILE}" ]]; then
    echo "unloading launchd job: ${PLIST_FILE}"
    launchctl bootout "gui/$(id -u)" "${PLIST_FILE}" >/dev/null 2>&1 || true
    return 0
  fi
  if launchctl print "gui/$(id -u)/com.dhseo.mediaserver" >/dev/null 2>&1; then
    echo "unloading launchd job: com.dhseo.mediaserver"
    launchctl bootout "gui/$(id -u)/com.dhseo.mediaserver" >/dev/null 2>&1 || true
    return 0
  fi
  return 1
}

add_port() {
  local port="$1"
  [[ -n "${port}" && "${port}" =~ ^[0-9]+$ ]] || return 0
  if [[ ",${PORTS_SEEN}," != *",${port},"* ]]; then
    PORTS+=("${port}")
    PORTS_SEEN="${PORTS_SEEN},${port}"
  fi
}

collect_ports() {
  PORTS=()
  PORTS_SEEN=""
  local std_rtsp std_http p
  local -a candidate_ports=()
  std_rtsp="$(sed -nE 's/.*kRtspListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  std_http="$(sed -nE 's/.*kHttpListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"

  if [[ -n "${MEDIA_SERVER_LISTEN_PORT:-}" ]]; then
    add_port "${MEDIA_SERVER_LISTEN_PORT}"
  fi
  if [[ -f "${PORT_FILE}" ]]; then
    add_port "$(cat "${PORT_FILE}")"
  fi
  if [[ -n "${MEDIA_SERVER_PORT_CANDIDATES:-}" ]]; then
    IFS=',' read -r -a candidate_ports <<< "${MEDIA_SERVER_PORT_CANDIDATES}"
    for p in "${candidate_ports[@]}"; do
      add_port "$(media_server_trim "${p}")"
    done
  fi
  add_port "${std_rtsp:-8554}"
  add_port 8555
  add_port 8556
  add_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}"
  add_port "${std_http:-8080}"
  add_port 8081
}

find_media_server_listener_pids() {
  local port="$1"
  if [[ -z "${port}" || ! "${port}" =~ ^[0-9]+$ ]] || ! media_server_has_cmd lsof; then
    return 0
  fi
  { lsof -nP -a -iTCP:"${port}" -sTCP:LISTEN -Fp -c media_server 2>/dev/null || true; } \
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

stop_listener_pids() {
  local found=1
  local pid port
  local seen=","
  for port in "${PORTS[@]}"; do
    while IFS= read -r pid; do
      [[ -n "${pid}" ]] || continue
      if [[ "${seen}" == *",${pid},"* ]]; then
        continue
      fi
      seen="${seen}${pid},"
      if stop_pid "${pid}" "media_server listener on port ${port}"; then
        found=0
      else
        echo "found media_server listener on port ${port} (pid=${pid}) but could not signal it"
      fi
    done < <(find_media_server_listener_pids "${port}")
  done
  return "${found}"
}

collect_ports
STOPPED=1
if stop_launchd_job; then
  STOPPED=0
fi
if [[ -f "${PID_FILE}" ]]; then
  PID="$(cat "${PID_FILE}")"
  if stop_pid "${PID}" "media_server"; then
    STOPPED=0
  fi
fi
if stop_listener_pids; then
  STOPPED=0
fi
cleanup_state_files

if [[ "${STOPPED}" == "0" ]]; then
  echo "stopped"
else
  echo "media_server is not running"
fi
if [[ -f "${LOG_FILE}" ]]; then
  echo "log: ${LOG_FILE}"
fi
