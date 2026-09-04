#!/usr/bin/env bash
# 파일 용도: 개발 디버깅용으로 media_server를 foreground에서 빌드/실행한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"

ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" && "${MEDIA_SERVER_SKIP_LOCAL_ENV:-0}" != "1" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
  echo "[env] loaded override: ${ENV_FILE}"
elif [[ "${MEDIA_SERVER_SKIP_LOCAL_ENV:-0}" == "1" ]]; then
  echo "[env] skipped local override: ${ENV_FILE}"
fi

media_server_apply_homebrew_gst_env

STD_AFX="${ROOT_DIR}/include/stdafx.h"
MEDIA_SERVER_ENABLE_AI="${MEDIA_SERVER_ENABLE_AI:-1}"
MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE="${MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE:-0}"
if [[ "${MEDIA_SERVER_ENABLE_AI}" == "1" ]]; then
  BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst-onnx}"
else
  BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst}"
fi
MEDIA_SERVER_BIN="${MEDIA_SERVER_BIN_PATH:-${BUILD_DIR}/media_server}"

if [[ "${MEDIA_SERVER_SKIP_ENV_CHECK:-0}" != "1" ]]; then
  media_server_check_gst_dev_tools
fi

if [[ "${MEDIA_SERVER_SKIP_BUILD:-0}" != "1" ]]; then
  CMAKE_ARGS=(-DMEDIA_SERVER_USE_GSTREAMER=ON -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE="${MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE}")
  if [[ "${MEDIA_SERVER_ENABLE_AI}" == "1" ]]; then
    ONNXRUNTIME_ROOT="${MEDIA_SERVER_ONNXRUNTIME_ROOT:-}"
    if [[ -z "${ONNXRUNTIME_ROOT}" ]]; then
      for candidate in "${ROOT_DIR}/third_party/onnxruntime" /opt/homebrew/opt/onnxruntime /usr/local/opt/onnxruntime /usr/local /usr; do
        if [[ -d "${candidate}/include" ]] && { [[ -d "${candidate}/lib" ]] || [[ -d "${candidate}/lib64" ]]; }; then
          ONNXRUNTIME_ROOT="${candidate}"
          break
        fi
      done
    fi
    if [[ -z "${ONNXRUNTIME_ROOT}" ]]; then
      echo "[run] ONNX Runtime root not found. Run: ./server.sh install"
      exit 1
    fi
    CMAKE_ARGS+=(-DMEDIA_SERVER_USE_ONNXRUNTIME=ON -DMEDIA_SERVER_ONNXRUNTIME_ROOT="${ONNXRUNTIME_ROOT}")
  else
    CMAKE_ARGS+=(-DMEDIA_SERVER_USE_ONNXRUNTIME=OFF)
  fi

  echo "[1/2] configure (GStreamer ON, AI ${MEDIA_SERVER_ENABLE_AI}, YouTube ${MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE})"
  if ! cmake -S "${ROOT_DIR}" -B "${BUILD_DIR}" "${CMAKE_ARGS[@]}"; then
    if [[ -f "${BUILD_DIR}/CMakeCache.txt" ]]; then
      echo "[configure] stale CMake cache detected. resetting ${BUILD_DIR}"
      rm -f "${BUILD_DIR}/CMakeCache.txt"
      rm -rf "${BUILD_DIR}/CMakeFiles"
      cmake -S "${ROOT_DIR}" -B "${BUILD_DIR}" "${CMAKE_ARGS[@]}"
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
FILE_ROOT="$(media_server_resolve_project_path "${ROOT_DIR}" "$(media_server_read_const_charp "${STD_AFX}" "kFileRootPath" || true)")"
DEFAULT_FILE="$(media_server_resolve_project_path "${ROOT_DIR}" "$(media_server_read_const_charp "${STD_AFX}" "kDefaultFilePath" || true)")"

RTSP_PORT="${MEDIA_SERVER_LISTEN_PORT:-${RTSP_PORT:-8554}}"
HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-${HTTP_PORT:-8080}}"
RTSP_ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS:-0.0.0.0}"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-0.0.0.0}"
ROUTE="${MEDIA_SERVER_ROUTE:-${ROUTE:-dhseo}}"
DEFAULT_FILE="${MEDIA_SERVER_DEFAULT_FILE:-${DEFAULT_FILE}}"
FILE_TOKEN="$(basename "${DEFAULT_FILE}")"

echo "run mode: foreground"
echo "listen: rtsp://${RTSP_ADDRESS}:${RTSP_PORT}/${ROUTE}"
echo "ops: http://${HTTP_ADDRESS}:${HTTP_PORT}/ops/home"
echo "client: http://${HTTP_ADDRESS}:${HTTP_PORT}/client/live"
if [[ -n "${FILE_ROOT}" ]]; then
  echo "file root: ${FILE_ROOT}"
fi
if [[ -n "${DEFAULT_FILE}" ]]; then
  echo "default file: ${DEFAULT_FILE}"
  echo "file test url: rtsp://${RTSP_ADDRESS}:${RTSP_PORT}/${ROUTE}?file=${FILE_TOKEN}"
fi
echo "stop: Ctrl-C"

cd "${ROOT_DIR}"
exec env \
  MEDIA_SERVER_LISTEN_PORT="${RTSP_PORT}" \
  MEDIA_SERVER_LISTEN_ADDRESS="${RTSP_ADDRESS}" \
  MEDIA_SERVER_HTTP_LISTEN_PORT="${HTTP_PORT}" \
  MEDIA_SERVER_HTTP_LISTEN_ADDRESS="${HTTP_ADDRESS}" \
  MEDIA_SERVER_FORCE_RTSP_TCP="${MEDIA_SERVER_FORCE_RTSP_TCP:-1}" \
  "${MEDIA_SERVER_BIN}"
