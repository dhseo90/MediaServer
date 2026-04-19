#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

ENV_FILE="${SCRIPT_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
  echo "[env] loaded override: ${ENV_FILE}"
fi

STD_AFX="${ROOT_DIR}/include/stdafx.h"
BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst}"
MEDIA_SERVER_BIN="${MEDIA_SERVER_BIN_PATH:-${BUILD_DIR}/media_server}"

if [[ "${MEDIA_SERVER_SKIP_ENV_CHECK:-0}" != "1" ]]; then
  media_server_check_gst_dev_tools
fi

if [[ "${MEDIA_SERVER_SKIP_BUILD:-0}" != "1" ]]; then
  echo "[1/2] configure (GStreamer ON)"
  if ! cmake -S "${ROOT_DIR}" -B "${BUILD_DIR}" -DMEDIA_SERVER_USE_GSTREAMER=ON; then
    if [[ -f "${BUILD_DIR}/CMakeCache.txt" ]]; then
      echo "[configure] stale CMake cache detected. resetting ${BUILD_DIR}"
      rm -f "${BUILD_DIR}/CMakeCache.txt"
      rm -rf "${BUILD_DIR}/CMakeFiles"
      cmake -S "${ROOT_DIR}" -B "${BUILD_DIR}" -DMEDIA_SERVER_USE_GSTREAMER=ON
    else
      exit 1
    fi
  fi

  echo "[2/2] build"
  cmake --build "${BUILD_DIR}"
fi

if [[ ! -x "${MEDIA_SERVER_BIN}" ]]; then
  echo "[run] missing executable: ${MEDIA_SERVER_BIN}"
  exit 1
fi

RTSP_PORT="$(sed -nE 's/.*kRtspListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
HTTP_PORT="$(sed -nE 's/.*kHttpListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
RTSP_ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kRtspListenAddress" || true)"
HTTP_ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)"
ROUTE="$(media_server_read_const_charp "${STD_AFX}" "kStreamRoute" || true)"
FILE_ROOT="$(media_server_read_const_charp "${STD_AFX}" "kFileRootPath" || true)"
DEFAULT_FILE="$(media_server_read_const_charp "${STD_AFX}" "kDefaultFilePath" || true)"

RTSP_PORT="${MEDIA_SERVER_LISTEN_PORT:-${RTSP_PORT:-8554}}"
HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-${HTTP_PORT:-8080}}"
RTSP_ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS:-${RTSP_ADDRESS:-127.0.0.1}}"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-${HTTP_ADDRESS:-127.0.0.1}}"
ROUTE="${MEDIA_SERVER_ROUTE:-${ROUTE:-dhseo}}"
DEFAULT_FILE="${MEDIA_SERVER_DEFAULT_FILE:-${DEFAULT_FILE}}"
FILE_TOKEN="$(basename "${DEFAULT_FILE}")"

echo "run mode: foreground"
echo "listen: rtsp://${RTSP_ADDRESS}:${RTSP_PORT}/${ROUTE}"
echo "http: http://${HTTP_ADDRESS}:${HTTP_PORT}/webrtc/test"
if [[ -n "${FILE_ROOT}" ]]; then
  echo "file root: ${FILE_ROOT}"
fi
if [[ -n "${DEFAULT_FILE}" ]]; then
  echo "default file: ${DEFAULT_FILE}"
  echo "file test url: rtsp://${RTSP_ADDRESS}:${RTSP_PORT}/${ROUTE}?file=${FILE_TOKEN}"
fi
echo "stop: Ctrl-C"

exec env \
  MEDIA_SERVER_LISTEN_PORT="${RTSP_PORT}" \
  MEDIA_SERVER_LISTEN_ADDRESS="${RTSP_ADDRESS}" \
  MEDIA_SERVER_HTTP_LISTEN_PORT="${HTTP_PORT}" \
  MEDIA_SERVER_HTTP_LISTEN_ADDRESS="${HTTP_ADDRESS}" \
  "${MEDIA_SERVER_BIN}"
