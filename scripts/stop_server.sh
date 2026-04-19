#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PID_FILE="${ROOT_DIR}/.media_server.pid"
MODE_FILE="${ROOT_DIR}/.media_server.mode"
PORT_FILE="${ROOT_DIR}/.media_server.port"
ADDRESS_FILE="${ROOT_DIR}/.media_server.address"
PLIST_FILE="${ROOT_DIR}/.media_server.launchd.plist"
LAUNCH_LABEL="local.media_server"

if [[ -f "${MODE_FILE}" ]] && [[ "$(cat "${MODE_FILE}")" == "launchctl" ]] && command -v launchctl >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)" "${PLIST_FILE}" >/dev/null 2>&1 || launchctl bootout "gui/$(id -u)/${LAUNCH_LABEL}" >/dev/null 2>&1 || true
fi

if [[ ! -f "${PID_FILE}" ]]; then
  echo "media_server is not running (no pid file)"
  rm -f "${MODE_FILE}"
  rm -f "${PORT_FILE}"
  rm -f "${ADDRESS_FILE}"
  exit 0
fi

PID="$(cat "${PID_FILE}")"
if [[ -z "${PID}" ]]; then
  echo "empty pid file found; cleaning up"
  rm -f "${PID_FILE}" "${MODE_FILE}" "${PORT_FILE}"
  exit 0
fi
if ! kill -0 "${PID}" 2>/dev/null; then
  echo "stale pid file found; cleaning up"
  rm -f "${PID_FILE}"
  rm -f "${MODE_FILE}"
  rm -f "${PORT_FILE}"
  rm -f "${ADDRESS_FILE}"
  exit 0
fi

echo "stopping media_server (pid=${PID})"
kill "${PID}"

for _ in {1..20}; do
  if ! kill -0 "${PID}" 2>/dev/null; then
    rm -f "${PID_FILE}"
    rm -f "${MODE_FILE}"
    rm -f "${PORT_FILE}"
    rm -f "${ADDRESS_FILE}"
    echo "stopped"
    exit 0
  fi
  sleep 0.2
done

echo "graceful stop timeout; sending SIGKILL"
kill -9 "${PID}" 2>/dev/null || true
rm -f "${PID_FILE}"
rm -f "${MODE_FILE}"
rm -f "${PORT_FILE}"
rm -f "${ADDRESS_FILE}"
echo "stopped (forced)"
