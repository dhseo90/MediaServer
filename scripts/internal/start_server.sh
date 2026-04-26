#!/usr/bin/env bash
# 파일 용도: media_server를 AI 기본 빌드로 구성하고 LAN 접근 가능한 백그라운드 서비스로 시작한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  echo "[1/3] loaded env override: ${ENV_FILE}"
fi

PID_FILE="${ROOT_DIR}/.media_server.pid"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"
PORT_FILE="${ROOT_DIR}/.media_server.port"
LOG_FILE="${ROOT_DIR}/.media_server.log"
MODE_FILE="${ROOT_DIR}/.media_server.mode"
PLIST_FILE="${ROOT_DIR}/.media_server.launchd.plist"
STD_AFX="${ROOT_DIR}/include/stdafx.h"

DEFAULT_RTSP_PORT="$(sed -nE 's/.*kRtspListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
DEFAULT_HTTP_PORT="$(sed -nE 's/.*kHttpListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
DEFAULT_ROUTE="$(media_server_read_const_charp "${STD_AFX}" "kStreamRoute" || true)"
DEFAULT_FILE_ROOT="$(media_server_resolve_project_path "${ROOT_DIR}" "$(media_server_read_const_charp "${STD_AFX}" "kFileRootPath" || true)")"
DEFAULT_FILE_PATH="$(media_server_resolve_project_path "${ROOT_DIR}" "$(media_server_read_const_charp "${STD_AFX}" "kDefaultFilePath" || true)")"

DEFAULT_RTSP_PORT="${DEFAULT_RTSP_PORT:-8554}"
DEFAULT_HTTP_PORT="${DEFAULT_HTTP_PORT:-8080}"
DEFAULT_ROUTE="${DEFAULT_ROUTE:-dhseo}"

MEDIA_SERVER_ENABLE_AI="${MEDIA_SERVER_ENABLE_AI:-1}"
MEDIA_SERVER_LISTEN_ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS:-0.0.0.0}"
MEDIA_SERVER_HTTP_LISTEN_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-0.0.0.0}"
MEDIA_SERVER_HTTP_LISTEN_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-${DEFAULT_HTTP_PORT}}"
MEDIA_SERVER_PORT_CANDIDATES="${MEDIA_SERVER_PORT_CANDIDATES:-${MEDIA_SERVER_LISTEN_PORT:-${DEFAULT_RTSP_PORT},8555,8556}}"
MEDIA_SERVER_FORCE_RTSP_TCP="${MEDIA_SERVER_FORCE_RTSP_TCP:-1}"
MEDIA_SERVER_ANALYSIS_MODEL="${MEDIA_SERVER_ANALYSIS_MODEL:-models/yolo11n.onnx}"
MEDIA_SERVER_ANALYSIS_LABELS="${MEDIA_SERVER_ANALYSIS_LABELS:-models/coco.names}"
MEDIA_SERVER_AUTO_DIAGNOSE="${MEDIA_SERVER_AUTO_DIAGNOSE:-1}"
MEDIA_SERVER_SKIP_BUILD="${MEDIA_SERVER_SKIP_BUILD:-0}"
MEDIA_SERVER_SKIP_ENV_CHECK="${MEDIA_SERVER_SKIP_ENV_CHECK:-0}"
MEDIA_SERVER_START_STABILITY_WAIT_S="${MEDIA_SERVER_START_STABILITY_WAIT_S:-1}"
MEDIA_SERVER_START_MODE="${MEDIA_SERVER_START_MODE:-nohup}"
LAUNCHD_LABEL="com.dhseo.mediaserver"

client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

detect_onnxruntime_root() {
  local candidates=(
    "${MEDIA_SERVER_ONNXRUNTIME_ROOT:-}"
    "${ROOT_DIR}/third_party/onnxruntime"
    "/opt/homebrew/opt/onnxruntime"
    "/usr/local/opt/onnxruntime"
    "/usr/local"
    "/usr"
  )
  local candidate=""
  for candidate in "${candidates[@]}"; do
    [[ -n "${candidate}" ]] || continue
    if [[ -d "${candidate}/include" ]] && { [[ -d "${candidate}/lib" ]] || [[ -d "${candidate}/lib64" ]]; }; then
      printf '%s' "${candidate}"
      return 0
    fi
  done
  return 1
}

resolve_existing_project_path() {
  local value="$1"
  media_server_resolve_project_path "${ROOT_DIR}" "${value}"
}

find_media_server_listener_pids() {
  local port="$1"
  if [[ -z "${port}" || ! "${port}" =~ ^[0-9]+$ ]] || ! media_server_has_cmd lsof; then
    return 0
  fi
  { lsof -nP -iTCP:"${port}" -sTCP:LISTEN -Fp -c media_server 2>/dev/null || true; } \
    | sed -n 's/^p//p' \
    | sort -u
}

xml_escape() {
  local value="$1"
  value="${value//&/&amp;}"
  value="${value//</&lt;}"
  value="${value//>/&gt;}"
  value="${value//\"/&quot;}"
  value="${value//\'/&apos;}"
  printf '%s' "${value}"
}

write_launchd_plist() {
  local env_key env_value
  {
    cat <<EOF_PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>WorkingDirectory</key>
  <string>$(xml_escape "${ROOT_DIR}")</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml_escape "${MEDIA_SERVER_BIN}")</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
EOF_PLIST
    for item in "${env_vars[@]}"; do
      env_key="${item%%=*}"
      env_value="${item#*=}"
      [[ -n "${env_key}" ]] || continue
      cat <<EOF_ENV
    <key>$(xml_escape "${env_key}")</key>
    <string>$(xml_escape "${env_value}")</string>
EOF_ENV
    done
    cat <<EOF_PLIST
  </dict>
  <key>StandardOutPath</key>
  <string>$(xml_escape "${LOG_FILE}")</string>
  <key>StandardErrorPath</key>
  <string>$(xml_escape "${LOG_FILE}")</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>
EOF_PLIST
  } > "${PLIST_FILE}"
}

start_with_launchd() {
  local domain="gui/$(id -u)"
  write_launchd_plist
  launchctl bootout "${domain}" "${PLIST_FILE}" >/dev/null 2>&1 || true
  if launchctl bootstrap "${domain}" "${PLIST_FILE}" >/dev/null 2>&1; then
    NEW_PID=""
    echo "launchd" > "${MODE_FILE}"
    return 0
  fi
  return 1
}

is_recorded_server_alive() {
  if [[ -f "${PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PID_FILE}")"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      return 0
    fi
    rm -f "${PID_FILE}"
  fi
  return 1
}

print_existing_server() {
  local port="${MEDIA_SERVER_LISTEN_PORT:-}"
  local address="${MEDIA_SERVER_LISTEN_ADDRESS}"
  if [[ -f "${PORT_FILE}" ]]; then
    port="$(cat "${PORT_FILE}")"
  fi
  if [[ -f "${ADDRESS_FILE}" ]]; then
    address="$(cat "${ADDRESS_FILE}")"
  fi
  port="${port:-${DEFAULT_RTSP_PORT}}"
  echo "media_server is already running"
  echo "local lab: http://$(client_host "${MEDIA_SERVER_HTTP_LISTEN_ADDRESS}"):${MEDIA_SERVER_HTTP_LISTEN_PORT}/lab"
  echo "local rtsp: rtsp://$(client_host "${address}"):${port}/${DEFAULT_ROUTE}?file=sample_h264.mp4"
  echo "stop: ./server.sh stop"
}

check_already_running_on_candidates() {
  local candidate=""
  IFS=',' read -r -a candidate_ports <<< "${MEDIA_SERVER_PORT_CANDIDATES}"
  for candidate in "${candidate_ports[@]}"; do
    candidate="$(media_server_trim "${candidate}")"
    [[ -n "${candidate}" ]] || continue
    if [[ -n "$(find_media_server_listener_pids "${candidate}")" ]]; then
      echo "${candidate}" > "${PORT_FILE}"
      echo "${MEDIA_SERVER_LISTEN_ADDRESS}" > "${ADDRESS_FILE}"
      print_existing_server
      return 0
    fi
  done
  return 1
}

if is_recorded_server_alive; then
  print_existing_server
  exit 0
fi
rm -f "${PLIST_FILE}"
if check_already_running_on_candidates; then
  exit 0
fi

if [[ "${MEDIA_SERVER_SKIP_ENV_CHECK}" != "1" ]]; then
  media_server_check_gst_dev_tools
fi

if [[ "${MEDIA_SERVER_ENABLE_AI}" == "1" ]]; then
  BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst-onnx}"
  ONNXRUNTIME_ROOT="$(detect_onnxruntime_root || true)"
  if [[ -z "${ONNXRUNTIME_ROOT}" ]]; then
    echo "[start] ONNX Runtime root not found. Run: ./server.sh install"
    echo "[start] or set MEDIA_SERVER_ONNXRUNTIME_ROOT in scripts/.media_server.env"
    exit 1
  fi
  MODEL_PATH="$(resolve_existing_project_path "${MEDIA_SERVER_ANALYSIS_MODEL}")"
  LABELS_PATH="$(resolve_existing_project_path "${MEDIA_SERVER_ANALYSIS_LABELS}")"
  if [[ ! -f "${MODEL_PATH}" || ! -f "${LABELS_PATH}" ]]; then
    echo "[start] AI assets missing"
    echo "  model: ${MODEL_PATH}"
    echo "  labels: ${LABELS_PATH}"
    echo "  run: ./server.sh install"
    exit 1
  fi
  CMAKE_ARGS=(-DMEDIA_SERVER_USE_GSTREAMER=ON -DMEDIA_SERVER_USE_ONNXRUNTIME=ON -DMEDIA_SERVER_ONNXRUNTIME_ROOT="${ONNXRUNTIME_ROOT}")
else
  BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst}"
  CMAKE_ARGS=(-DMEDIA_SERVER_USE_GSTREAMER=ON -DMEDIA_SERVER_USE_ONNXRUNTIME=OFF)
fi

MEDIA_SERVER_BIN="${MEDIA_SERVER_BIN_PATH:-${BUILD_DIR}/media_server}"

if [[ "${MEDIA_SERVER_SKIP_BUILD}" != "1" ]]; then
  echo "[2/3] configure: ${BUILD_DIR}"
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

  echo "[2/3] build"
  cmake --build "${BUILD_DIR}"
else
  echo "[2/3] build skipped: MEDIA_SERVER_SKIP_BUILD=1"
fi

if [[ ! -x "${MEDIA_SERVER_BIN}" ]]; then
  echo "[start] missing executable: ${MEDIA_SERVER_BIN}"
  exit 1
fi

start_detached() {
  local p="$1"
  local -a env_vars=(
    "MEDIA_SERVER_LISTEN_PORT=${p}"
    "MEDIA_SERVER_LISTEN_ADDRESS=${MEDIA_SERVER_LISTEN_ADDRESS}"
    "MEDIA_SERVER_HTTP_LISTEN_PORT=${MEDIA_SERVER_HTTP_LISTEN_PORT}"
    "MEDIA_SERVER_HTTP_LISTEN_ADDRESS=${MEDIA_SERVER_HTTP_LISTEN_ADDRESS}"
    "MEDIA_SERVER_FORCE_RTSP_TCP=${MEDIA_SERVER_FORCE_RTSP_TCP}"
  )

  while IFS='=' read -r name _; do
    [[ "${name}" == MEDIA_SERVER_* ]] || continue
    case "${name}" in
      MEDIA_SERVER_LISTEN_PORT|MEDIA_SERVER_LISTEN_ADDRESS|MEDIA_SERVER_HTTP_LISTEN_PORT|MEDIA_SERVER_HTTP_LISTEN_ADDRESS|MEDIA_SERVER_PORT_CANDIDATES)
        continue
        ;;
    esac
    env_vars+=("${name}=${!name}")
  done < <(env)

  for passthrough in HOMEBREW_PREFIX PATH PKG_CONFIG_PATH GI_TYPELIB_PATH GST_PLUGIN_SCANNER GST_PLUGIN_PATH DYLD_FALLBACK_LIBRARY_PATH DYLD_LIBRARY_PATH LD_LIBRARY_PATH; do
    if [[ -n "${!passthrough:-}" ]]; then
      env_vars+=("${passthrough}=${!passthrough}")
    fi
  done

  if [[ "$(uname -s)" == "Darwin" ]] && media_server_has_cmd launchctl &&
      [[ "${MEDIA_SERVER_START_MODE}" == "launchd" ]]; then
    if start_with_launchd; then
      return 0
    fi
    echo "[start] launchd start failed"
    return 1
  fi

  (
    cd "${ROOT_DIR}"
    exec nohup env "${env_vars[@]}" "${MEDIA_SERVER_BIN}" < /dev/null > "${LOG_FILE}" 2>&1
  ) &
  NEW_PID=$!
  disown "${NEW_PID}" >/dev/null 2>&1 || true
}

wait_listen() {
  local p="$1"
  local http_host
  http_host="$(client_host "${MEDIA_SERVER_HTTP_LISTEN_ADDRESS}")"
  for _ in {1..40}; do
    if [[ -n "${NEW_PID:-}" ]] && ! kill -0 "${NEW_PID}" 2>/dev/null; then
      return 2
    fi
    if media_server_is_tcp_listening "${p}" && media_server_is_tcp_listening "${MEDIA_SERVER_HTTP_LISTEN_PORT}"; then
      if media_server_http_healthcheck "${http_host}" "${MEDIA_SERVER_HTTP_LISTEN_PORT}" "/health" || ! media_server_has_cmd curl; then
        return 0
      fi
    fi
    sleep 0.5
  done
  return 1
}

FOUND_PORT=""
NEW_PID=""
IFS=',' read -r -a PORT_CANDIDATES <<< "${MEDIA_SERVER_PORT_CANDIDATES}"
for port in "${PORT_CANDIDATES[@]}"; do
  port="$(media_server_trim "${port}")"
  [[ -n "${port}" ]] || continue
  if ! [[ "${port}" =~ ^[0-9]+$ ]]; then
    echo "[start] skip non-numeric port: ${port}"
    continue
  fi
  if media_server_is_tcp_listening "${port}"; then
    echo "[start] port ${port} is already in use. trying next."
    continue
  fi
  if media_server_is_tcp_bind_forbidden "${MEDIA_SERVER_LISTEN_ADDRESS}" "${port}"; then
    echo "[start] cannot bind ${MEDIA_SERVER_LISTEN_ADDRESS}:${port}. trying next."
    continue
  fi

  echo "[3/3] start: ${MEDIA_SERVER_LISTEN_ADDRESS}:${port}, http ${MEDIA_SERVER_HTTP_LISTEN_ADDRESS}:${MEDIA_SERVER_HTTP_LISTEN_PORT}"
  start_detached "${port}"
  if wait_listen "${port}"; then
    if [[ -z "${NEW_PID}" ]]; then
      NEW_PID="$(find_media_server_listener_pids "${port}" | head -n1)"
    fi
    if [[ "${MEDIA_SERVER_START_STABILITY_WAIT_S}" != "0" ]]; then
      sleep "${MEDIA_SERVER_START_STABILITY_WAIT_S}"
      if [[ -n "${NEW_PID}" ]] && ! kill -0 "${NEW_PID}" 2>/dev/null; then
        echo "[start] process exited during stability wait; recent log:"
        tail -n 80 "${LOG_FILE}" || true
        NEW_PID=""
        continue
      fi
    fi
    FOUND_PORT="${port}"
    break
  fi

  echo "[start] failed on ${port}; recent log:"
  tail -n 60 "${LOG_FILE}" || true
  if [[ -n "${NEW_PID}" ]] && kill -0 "${NEW_PID}" 2>/dev/null; then
    kill "${NEW_PID}" >/dev/null 2>&1 || true
  fi
  NEW_PID=""
done

if [[ -z "${FOUND_PORT}" ]]; then
  echo "[start] no candidate port started successfully"
  if [[ "${MEDIA_SERVER_AUTO_DIAGNOSE}" == "1" ]]; then
    echo "[start] running diagnostics automatically"
    "${SCRIPT_DIR}/diagnose_media_server.sh" || true
  fi
  exit 1
fi

echo "${NEW_PID}" > "${PID_FILE}"
echo "${FOUND_PORT}" > "${PORT_FILE}"
echo "${MEDIA_SERVER_LISTEN_ADDRESS}" > "${ADDRESS_FILE}"
echo "detached" > "${MODE_FILE}"

H264_FILE_TOKEN="sample_h264.mp4"
H265_FILE_TOKEN="sample_h265.mp4"
if [[ -n "${DEFAULT_FILE_ROOT}" ]]; then
  [[ -f "${DEFAULT_FILE_ROOT}/${H264_FILE_TOKEN}" ]] || H264_FILE_TOKEN="$(basename "${DEFAULT_FILE_PATH}")"
  [[ -f "${DEFAULT_FILE_ROOT}/${H265_FILE_TOKEN}" ]] || H265_FILE_TOKEN="$(basename "${DEFAULT_FILE_PATH}")"
fi

LOCAL_RTSP_HOST="$(client_host "${MEDIA_SERVER_LISTEN_ADDRESS}")"
LOCAL_HTTP_HOST="$(client_host "${MEDIA_SERVER_HTTP_LISTEN_ADDRESS}")"

echo "started: pid=${NEW_PID}"
echo "mode: detached"
echo "ai: ${MEDIA_SERVER_ENABLE_AI}"
echo "build: ${BUILD_DIR}"
echo "log: ${LOG_FILE}"
echo "local lab: http://${LOCAL_HTTP_HOST}:${MEDIA_SERVER_HTTP_LISTEN_PORT}/lab"
echo "local h264: rtsp://${LOCAL_RTSP_HOST}:${FOUND_PORT}/${DEFAULT_ROUTE}?file=${H264_FILE_TOKEN}"
echo "local h265: rtsp://${LOCAL_RTSP_HOST}:${FOUND_PORT}/${DEFAULT_ROUTE}/h265?file=${H265_FILE_TOKEN}"
echo "external bind: rtsp://${MEDIA_SERVER_LISTEN_ADDRESS}:${FOUND_PORT}/${DEFAULT_ROUTE}"
echo "external bind: http://${MEDIA_SERVER_HTTP_LISTEN_ADDRESS}:${MEDIA_SERVER_HTTP_LISTEN_PORT}/lab"
echo "stop: ./server.sh stop"
