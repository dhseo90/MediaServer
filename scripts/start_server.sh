#!/usr/bin/env bash
# 파일 용도: media_server를 빌드하고 백그라운드 서비스처럼 시작한다.
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
  echo "[1/3] loaded env override: ${ENV_FILE}"
fi

PID_FILE="${ROOT_DIR}/.media_server.pid"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"
PORT_FILE="${ROOT_DIR}/.media_server.port"
LOG_FILE="${ROOT_DIR}/.media_server.log"
MODE_FILE="${ROOT_DIR}/.media_server.mode"
PLIST_FILE="${ROOT_DIR}/.media_server.launchd.plist"
LAUNCH_LABEL="local.media_server"

STD_AFX="${ROOT_DIR}/include/stdafx.h"
BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst}"
MEDIA_SERVER_BIN="${MEDIA_SERVER_BIN_PATH:-${BUILD_DIR}/media_server}"
AUTO_DIAGNOSE="${MEDIA_SERVER_AUTO_DIAGNOSE:-1}"
START_PREFERENCE="${MEDIA_SERVER_START_MODE:-detached}"

read_config() {
  PORT="$(sed -nE 's/.*kRtspListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  if [[ -z "${PORT}" ]]; then
    PORT="8554"
  fi
  HTTP_PORT_DEFAULT="$(sed -nE 's/.*kHttpListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  if [[ -z "${HTTP_PORT_DEFAULT}" ]]; then
    HTTP_PORT_DEFAULT="8080"
  fi

  DEFAULT_ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kRtspListenAddress" || true)"
  if [[ -z "${DEFAULT_ADDRESS}" ]]; then
    DEFAULT_ADDRESS="127.0.0.1"
  fi
  DEFAULT_HTTP_ADDRESS="$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)"
  if [[ -z "${DEFAULT_HTTP_ADDRESS}" ]]; then
    DEFAULT_HTTP_ADDRESS="127.0.0.1"
  fi

  PORT_CANDIDATES_RAW="${MEDIA_SERVER_PORT_CANDIDATES:-${PORT}}"
  ADDRESS_CANDIDATES_RAW="${MEDIA_SERVER_LISTEN_ADDRESS_CANDIDATES:-${MEDIA_SERVER_LISTEN_ADDRESS:-${DEFAULT_ADDRESS}}}"
  HTTP_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-${HTTP_PORT_DEFAULT}}"
  HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-${DEFAULT_HTTP_ADDRESS}}"

  if [[ -z "${PORT_CANDIDATES_RAW}" ]]; then
    PORT_CANDIDATES_RAW="${PORT}"
  fi
  if [[ -z "${ADDRESS_CANDIDATES_RAW}" ]]; then
    ADDRESS_CANDIDATES_RAW="${DEFAULT_ADDRESS}"
  fi

  IFS=',' read -r -a PORT_CANDIDATES <<< "${PORT_CANDIDATES_RAW}"
  IFS=',' read -r -a ADDRESS_CANDIDATES <<< "${ADDRESS_CANDIDATES_RAW}"

  if [[ ${#PORT_CANDIDATES[@]} -eq 0 ]]; then
    PORT_CANDIDATES=("${PORT}")
  fi
  if [[ ${#ADDRESS_CANDIDATES[@]} -eq 0 ]]; then
    ADDRESS_CANDIDATES=("${DEFAULT_ADDRESS}")
  fi
}

read_config

if [[ -f "${PID_FILE}" ]]; then
  OLD_PID="$(cat "${PID_FILE}")"
  if kill -0 "${OLD_PID}" 2>/dev/null; then
    echo "media_server is already running (pid=${OLD_PID})"
    exit 0
  fi
  rm -f "${PID_FILE}"
fi
rm -f "${MODE_FILE}"

if [[ "${MEDIA_SERVER_SKIP_ENV_CHECK:-0}" != "1" ]]; then
  media_server_check_gst_dev_tools
fi

echo "[1/3] configure (GStreamer ON)"
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

echo "[2/3] build"
cmake --build "${BUILD_DIR}"

if [[ ! -x "${MEDIA_SERVER_BIN}" ]]; then
  echo "[start] missing executable after build: ${MEDIA_SERVER_BIN}"
  exit 1
fi

start_detached() {
  local p="$1"
  local addr="$2"
  local -a env_vars=(
    "MEDIA_SERVER_LISTEN_PORT=${p}"
    "MEDIA_SERVER_LISTEN_ADDRESS=${addr}"
    "MEDIA_SERVER_HTTP_LISTEN_PORT=${HTTP_PORT}"
    "MEDIA_SERVER_HTTP_LISTEN_ADDRESS=${HTTP_ADDRESS}"
  )
  for passthrough in HOMEBREW_PREFIX PATH PKG_CONFIG_PATH GI_TYPELIB_PATH GST_PLUGIN_SCANNER GST_PLUGIN_PATH DYLD_FALLBACK_LIBRARY_PATH DYLD_LIBRARY_PATH; do
    if [[ -n "${!passthrough:-}" ]]; then
      env_vars+=("${passthrough}=${!passthrough}")
    fi
  done

  if [[ -n "${MEDIA_SERVER_FORCE_RTSP_TCP:-}" ]]; then
    env_vars+=("MEDIA_SERVER_FORCE_RTSP_TCP=${MEDIA_SERVER_FORCE_RTSP_TCP}")
  fi
  if [[ -n "${MEDIA_SERVER_GST_ATTACH_CONTEXT:-}" ]]; then
    env_vars+=("MEDIA_SERVER_GST_ATTACH_CONTEXT=${MEDIA_SERVER_GST_ATTACH_CONTEXT}")
  fi
  if [[ -n "${MEDIA_SERVER_SKIP_ENV_CHECK:-}" ]]; then
    env_vars+=("MEDIA_SERVER_SKIP_ENV_CHECK=${MEDIA_SERVER_SKIP_ENV_CHECK}")
  fi
  (
    cd "${ROOT_DIR}"
    exec nohup env "${env_vars[@]}" "${MEDIA_SERVER_BIN}" < /dev/null > "${LOG_FILE}" 2>&1
  ) &
  NEW_PID=$!
  START_MODE="detached"
}

start_launchctl() {
  local p="$1"
  local addr="$2"
  local gst_attach_entry=""
  local gst_tcp_entry=""
  local launchctl_homebrew_env_entries=""
  if [[ -n "${MEDIA_SERVER_FORCE_RTSP_TCP:-}" ]]; then
    gst_tcp_entry="      <key>MEDIA_SERVER_FORCE_RTSP_TCP</key>
      <string>${MEDIA_SERVER_FORCE_RTSP_TCP}</string>"
  fi
  if [[ -n "${MEDIA_SERVER_GST_ATTACH_CONTEXT:-}" ]]; then
    gst_attach_entry="      <key>MEDIA_SERVER_GST_ATTACH_CONTEXT</key>
      <string>${MEDIA_SERVER_GST_ATTACH_CONTEXT}</string>"
  fi
  local launchctl_skip_env_entry=""
  if [[ -n "${MEDIA_SERVER_SKIP_ENV_CHECK:-}" ]]; then
    launchctl_skip_env_entry="      <key>MEDIA_SERVER_SKIP_ENV_CHECK</key>
      <string>${MEDIA_SERVER_SKIP_ENV_CHECK}</string>"
  fi
  for passthrough in HOMEBREW_PREFIX PATH PKG_CONFIG_PATH GI_TYPELIB_PATH GST_PLUGIN_SCANNER GST_PLUGIN_PATH DYLD_FALLBACK_LIBRARY_PATH DYLD_LIBRARY_PATH; do
    if [[ -n "${!passthrough:-}" ]]; then
      launchctl_homebrew_env_entries="${launchctl_homebrew_env_entries}
      <key>${passthrough}</key>
      <string>${!passthrough}</string>"
    fi
  done
  cat > "${PLIST_FILE}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${LAUNCH_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
      <string>${MEDIA_SERVER_BIN}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
      <key>MEDIA_SERVER_LISTEN_PORT</key>
      <string>${p}</string>
      <key>MEDIA_SERVER_LISTEN_ADDRESS</key>
      <string>${addr}</string>
      <key>MEDIA_SERVER_HTTP_LISTEN_PORT</key>
      <string>${HTTP_PORT}</string>
      <key>MEDIA_SERVER_HTTP_LISTEN_ADDRESS</key>
      <string>${HTTP_ADDRESS}</string>
${launchctl_skip_env_entry}
${gst_tcp_entry}
${gst_attach_entry}
${launchctl_homebrew_env_entries}
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${ROOT_DIR}</string>
    <key>StandardOutPath</key>
    <string>${LOG_FILE}</string>
    <key>StandardErrorPath</key>
    <string>${LOG_FILE}</string>
  </dict>
</plist>
EOF

  launchctl bootout "gui/$(id -u)" "${PLIST_FILE}" >/dev/null 2>&1 || true
  if launchctl bootstrap "gui/$(id -u)" "${PLIST_FILE}" >/dev/null 2>&1; then
    launchctl kickstart -k "gui/$(id -u)/${LAUNCH_LABEL}" >/dev/null 2>&1 || true
    NEW_PID="$(launchctl print "gui/$(id -u)/${LAUNCH_LABEL}" 2>/dev/null | sed -nE 's/.*pid = ([0-9]+).*/\1/p' | head -n1)"
    START_MODE="launchctl"
    return 0
  fi
  return 1
}

resolve_start_mode() {
  local requested="$1"
  case "${requested}" in
    detached|launchctl)
      printf '%s' "${requested}"
      return 0
      ;;
    auto)
      if [[ "${OSTYPE:-}" == "darwin"* ]] && command -v launchctl >/dev/null 2>&1; then
        printf 'detached'
      else
        printf 'detached'
      fi
      return 0
      ;;
    *)
      echo "[start] unknown MEDIA_SERVER_START_MODE='${requested}', fallback to detached"
      printf 'detached'
      return 0
      ;;
  esac
}

wait_listen() {
  local p="$1"
  for _ in {1..24}; do
    if [[ -n "${NEW_PID}" ]] && ! kill -0 "${NEW_PID}" 2>/dev/null; then
      return 2
    fi
    local rtsp_ok=1
    local http_ok=1
    if media_server_is_tcp_listening "${p}"; then
      rtsp_ok=0
    fi
    if media_server_is_tcp_listening "${HTTP_PORT}"; then
      if media_server_http_healthcheck "${HTTP_ADDRESS}" "${HTTP_PORT}" "/webrtc/test"; then
        http_ok=0
      elif ! media_server_has_cmd curl; then
        http_ok=0
      fi
    fi
    if [[ ${rtsp_ok} -eq 0 && ${http_ok} -eq 0 ]]; then
      return 0
    fi
    sleep 0.5
  done

  if ! media_server_has_listener_probe; then
    if [[ -n "${NEW_PID}" ]] && kill -0 "${NEW_PID}" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

START_MODE=""
NEW_PID=""
FOUND_PORT=""
FOUND_ADDRESS=""
EFFECTIVE_START_MODE="$(resolve_start_mode "${START_PREFERENCE}")"
for p in "${PORT_CANDIDATES[@]}"; do
  p="$(media_server_trim "${p}")"
  if [[ -z "${p}" ]]; then
    continue
  fi
  if ! [[ "${p}" =~ ^[0-9]+$ ]]; then
    echo "[start] skip non-numeric candidate port: ${p}"
    continue
  fi

    if media_server_is_tcp_listening "${p}"; then
      echo "[start] port ${p} is already in use. trying next."
      continue
    fi

    for a in "${ADDRESS_CANDIDATES[@]}"; do
    a="$(media_server_trim "${a}")"
    if [[ -z "${a}" ]]; then
      continue
    fi

    if media_server_is_tcp_bind_forbidden "${a}" "${p}"; then
      echo "[start] denied by environment policy: cannot bind ${a}:${p}. trying next address."
      continue
    fi

    echo "[3/3] start on ${a}:${p}"
    if [[ "${EFFECTIVE_START_MODE}" == "launchctl" ]]; then
      if start_launchctl "${p}" "${a}"; then
        START_MODE="launchctl"
      else
        echo "[start] launchctl bootstrap failed on ${a}:${p}; fallback to detached mode"
        start_detached "${p}" "${a}"
      fi
    else
      start_detached "${p}" "${a}"
    fi

    if wait_listen "${p}"; then
      FOUND_PORT="${p}"
      FOUND_ADDRESS="${a}"
      break 2
    fi

    echo "[start] failed to start on ${a}:${p}; recent log:"
    tail -n 40 "${LOG_FILE}" || true
    if [[ -n "${NEW_PID}" ]] && kill -0 "${NEW_PID}" 2>/dev/null; then
      kill "${NEW_PID}" >/dev/null 2>&1 || true
    fi
    NEW_PID=""
    START_MODE=""
  done
done

if [[ -z "${FOUND_PORT}" ]]; then
  echo "[start] no candidate port started successfully"
  echo "[start] hint: check environment permissions, executable, and port bindings"
  if [[ "${AUTO_DIAGNOSE}" == "1" ]]; then
    echo "[start] running diagnostics automatically (set MEDIA_SERVER_AUTO_DIAGNOSE=0 to skip)"
    "${SCRIPT_DIR}/diagnose_media_server.sh" || true
  fi
  exit 1
fi

PORT="${FOUND_PORT}"

echo "${NEW_PID}" > "${PID_FILE}"
echo "${PORT}" > "${PORT_FILE}"
echo "${FOUND_ADDRESS}" > "${ADDRESS_FILE}"
echo "${START_MODE}" > "${MODE_FILE}"

sleep 1
if [[ -n "${NEW_PID}" ]] && ! kill -0 "${NEW_PID}" 2>/dev/null; then
  echo "media_server exited right after listen; recent log:"
  tail -n 80 "${LOG_FILE}" || true
  exit 1
fi

ROUTE="$(sed -nE 's/.*kStreamRoute = "([^"]+)".*/\1/p' "${STD_AFX}" | head -n1)"
FILE_ROOT="$(media_server_resolve_project_path "${ROOT_DIR}" "$(media_server_read_const_charp "${STD_AFX}" "kFileRootPath")")"
H264_FILE_TOKEN="sample_h264.mp4"
H265_FILE_TOKEN="sample_h265.mp4"
if [[ -n "${FILE_ROOT}" ]]; then
  DEFAULT_FILE_FOR_TOKEN="$(media_server_resolve_project_path "${ROOT_DIR}" "$(media_server_read_const_charp "${STD_AFX}" "kDefaultFilePath")")"
  [[ -f "${FILE_ROOT}/${H264_FILE_TOKEN}" ]] || H264_FILE_TOKEN="$(basename "${DEFAULT_FILE_FOR_TOKEN}")"
  [[ -f "${FILE_ROOT}/${H265_FILE_TOKEN}" ]] || H265_FILE_TOKEN="$(basename "${DEFAULT_FILE_FOR_TOKEN}")"
fi

echo "started: pid=${NEW_PID}"
echo "mode: ${START_MODE}"
echo "listen: ${FOUND_ADDRESS}:${PORT}"
echo "http: ${HTTP_ADDRESS}:${HTTP_PORT}"
echo "log: ${LOG_FILE}"
echo "url(h264): rtsp://${FOUND_ADDRESS}:${PORT}/${ROUTE}?file=${H264_FILE_TOKEN}"
echo "url(h265): rtsp://${FOUND_ADDRESS}:${PORT}/${ROUTE}/h265?file=${H265_FILE_TOKEN}"
echo "webrtc: http://${HTTP_ADDRESS}:${HTTP_PORT}/webrtc/test"
