#!/usr/bin/env bash
# 파일 용도: 실행 중인 media_server의 포트, 프로세스, 로그 상태를 점검한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

PID_FILE="${ROOT_DIR}/.media_server.pid"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"
PORT_FILE="${ROOT_DIR}/.media_server.port"
MODE_FILE="${ROOT_DIR}/.media_server.mode"
LOG_FILE="${ROOT_DIR}/.media_server.log"
STD_AFX="${ROOT_DIR}/include/stdafx.h"
PLIST_FILE="${ROOT_DIR}/.media_server.launchd.plist"
LAUNCH_LABEL="local.media_server"

if [[ -f "${PORT_FILE}" ]]; then
  PORT="$(cat "${PORT_FILE}")"
else
  PORT="$(sed -nE 's/.*kRtspListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
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
if [[ -n "${FILE_ROOT}" ]] && [[ ! -f "${FILE_ROOT}/${H264_FILE_TOKEN}" ]]; then
  H264_FILE_TOKEN="${DEFAULT_FILE_TOKEN}"
fi
H265_FILE_TOKEN="sample_h265.mp4"
if [[ -n "${FILE_ROOT}" ]] && [[ ! -f "${FILE_ROOT}/${H265_FILE_TOKEN}" ]]; then
  H265_FILE_TOKEN="${DEFAULT_FILE_TOKEN}"
fi

TEST_URL_H264="rtsp://${ADDRESS}:${PORT}/${ROUTE}?file=${H264_FILE_TOKEN}"
TEST_URL_H265="rtsp://${ADDRESS}:${PORT}/${ROUTE}/h265?file=${H265_FILE_TOKEN}"

echo "[config] address=${ADDRESS} port=${PORT} route=${ROUTE}"
echo "[config] http_address=${HTTP_ADDRESS} http_port=${HTTP_PORT}"
echo "[config] file_root=${FILE_ROOT}"
echo "[config] default_file=${DEFAULT_FILE}"
echo "[config] file_h264=${H264_FILE_TOKEN}"
echo "[config] file_h265=${H265_FILE_TOKEN}"
echo "[config] test_url_h264=${TEST_URL_H264}"
echo "[config] test_url_h265=${TEST_URL_H265}"
echo

if [[ -f "${MODE_FILE}" ]]; then
  echo "[mode] $(cat "${MODE_FILE}")"
else
  echo "[mode] unknown"
fi
if [[ -f "${MODE_FILE}" ]] && [[ "$(cat "${MODE_FILE}")" == "launchctl" ]] && [[ "${OSTYPE:-}" == "darwin"* ]] && command -v launchctl >/dev/null 2>&1; then
  if launchctl print "gui/$(id -u)/${LAUNCH_LABEL}" >/tmp/media_server_launchctl.txt 2>&1; then
    echo "[launchctl] loaded (${LAUNCH_LABEL})"
    awk '/state =|pid =/{print "[launchctl] " $0}' /tmp/media_server_launchctl.txt | head -n 4
  else
    echo "[launchctl] not loaded (${LAUNCH_LABEL})"
  fi
fi
if [[ -f "${PLIST_FILE}" ]]; then
  echo "[launchctl] plist: ${PLIST_FILE}"
fi
echo

if [[ -f "${PID_FILE}" ]]; then
  PID="$(cat "${PID_FILE}")"
  echo "[pid] file exists: ${PID_FILE} (pid=${PID})"
  if kill -0 "${PID}" 2>/dev/null; then
    echo "[pid] process alive"
  else
    echo "[pid] process NOT alive (stale pid file)"
  fi
else
  echo "[pid] pid file missing"
fi

if media_server_is_tcp_listening "${PORT}"; then
  echo "[port] LISTEN ok on ${PORT}"
else
  echo "[port] not listening on ${PORT}"
  if media_server_has_listener_probe; then
  echo "[port] listener probe tool available, but no LISTEN state on requested port"
  else
    echo "[port] cannot confirm with local tools (lsof/ss/netstat missing)"
  fi
fi

if media_server_is_tcp_listening "${HTTP_PORT}"; then
  echo "[http] LISTEN ok on ${HTTP_PORT}"
  if media_server_http_healthcheck "${HTTP_ADDRESS}" "${HTTP_PORT}" "/webrtc/test"; then
    echo "[http] health ok: /webrtc/test"
  else
    echo "[http] health failed: /webrtc/test"
  fi
else
  echo "[http] not listening on ${HTTP_PORT}"
fi

if [[ -f "${DEFAULT_FILE}" ]]; then
  echo "[file] default file exists"
  ls -lh "${DEFAULT_FILE}"
else
  echo "[file] default file missing: ${DEFAULT_FILE}"
fi

if command -v ffprobe >/dev/null 2>&1; then
  echo
  echo "[probe] ffprobe test (h264)"
  if ffprobe -v error -rtsp_transport tcp -show_streams "${TEST_URL_H264}" >/tmp/media_server_ffprobe.txt 2>&1; then
    echo "[probe] h264 success"
    sed -n '1,12p' /tmp/media_server_ffprobe.txt
  else
    echo "[probe] h264 failed"
    cat /tmp/media_server_ffprobe.txt
  fi
  echo
  echo "[probe] ffprobe test (h265)"
  if ffprobe -v error -rtsp_transport tcp -show_streams "${TEST_URL_H265}" >/tmp/media_server_ffprobe.txt 2>&1; then
    echo "[probe] h265 success"
    sed -n '1,12p' /tmp/media_server_ffprobe.txt
  else
    echo "[probe] h265 failed"
    cat /tmp/media_server_ffprobe.txt
  fi
else
  echo "[probe] ffprobe not found"
fi

if [[ -f "${LOG_FILE}" ]]; then
  echo
  echo "[log] tail ${LOG_FILE}"
  tail -n 80 "${LOG_FILE}" || true
else
  echo "[log] log file missing: ${LOG_FILE}"
fi
