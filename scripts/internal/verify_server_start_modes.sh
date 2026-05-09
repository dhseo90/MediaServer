#!/usr/bin/env bash
# 파일 용도: foreground/start 실행 모드가 격리 포트에서 health와 제품 route를 안정적으로 여는지 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TMP_ROOT="${TMPDIR:-/tmp}"
RUN_ID="start-modes-$(date +%s)-$$"
TMP_DIR="${TMP_ROOT}/media_server_${RUN_ID}"
BACKUP_DIR="${TMP_DIR}/state-backup"
FOREGROUND_LOG="${TMP_DIR}/foreground.log"
START_OUTPUT="${TMP_DIR}/start.out"
START_LOG="${ROOT_DIR}/.media_server.log"
STATE_FILES=(
  ".media_server.pid"
  ".media_server.address"
  ".media_server.port"
  ".media_server.mode"
  ".media_server.launchd.plist"
  ".media_server.log"
)

mkdir -p "${TMP_DIR}" "${BACKUP_DIR}"

pass_count=0
FOREGROUND_PID=""
DETACHED_PID=""

pass() {
  pass_count=$((pass_count + 1))
  echo "[pass] $*"
}

fail() {
  echo "[fail] $*" >&2
  if [[ -f "${FOREGROUND_LOG}" ]]; then
    echo "[foreground-log] ${FOREGROUND_LOG}" >&2
    tail -n 60 "${FOREGROUND_LOG}" >&2 || true
  fi
  if [[ -f "${START_OUTPUT}" ]]; then
    echo "[start-output] ${START_OUTPUT}" >&2
    tail -n 80 "${START_OUTPUT}" >&2 || true
  fi
  if [[ -f "${START_LOG}" ]]; then
    echo "[start-log] ${START_LOG}" >&2
    tail -n 80 "${START_LOG}" >&2 || true
  fi
  exit 1
}

choose_free_port() {
  local port="$1"
  local max="${2:-80}"
  local i=0
  while command -v lsof >/dev/null 2>&1 && \
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
    i=$((i + 1))
    if (( i > max )); then
      fail "free TCP port not found near ${port}"
    fi
  done
  echo "${port}"
}

wait_for_health() {
  local base="$1"
  local label="$2"
  local status=""
  for _ in {1..80}; do
    if status="$(curl -fsS --max-time 2 "${base}/health" 2>/dev/null)"; then
      if [[ "${status}" == *'"status":"ok"'* ]]; then
        pass "${label} health ok"
        return 0
      fi
    fi
    sleep 0.25
  done
  fail "${label} health timeout: ${base}/health"
}

expect_http_ok() {
  local url="$1"
  local label="$2"
  if curl -fsS --max-time 3 "${url}" >/dev/null; then
    pass "${label}"
    return 0
  fi
  fail "${label} failed: ${url}"
}

stop_pid() {
  local pid="$1"
  [[ -n "${pid}" ]] || return 0
  if ! kill -0 "${pid}" >/dev/null 2>&1; then
    return 0
  fi
  kill "${pid}" >/dev/null 2>&1 || true
  for _ in {1..30}; do
    if ! kill -0 "${pid}" >/dev/null 2>&1; then
      wait "${pid}" >/dev/null 2>&1 || true
      return 0
    fi
    sleep 0.2
  done
  kill -9 "${pid}" >/dev/null 2>&1 || true
  wait "${pid}" >/dev/null 2>&1 || true
}

wait_port_closed() {
  local port="$1"
  for _ in {1..100}; do
    if ! command -v lsof >/dev/null 2>&1 || \
       ! lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  fail "port did not close: ${port}"
}

backup_state() {
  local file
  for file in "${STATE_FILES[@]}"; do
    if [[ -e "${ROOT_DIR}/${file}" ]]; then
      cp -p "${ROOT_DIR}/${file}" "${BACKUP_DIR}/${file}"
    fi
  done
}

clear_state() {
  local file
  for file in "${STATE_FILES[@]}"; do
    rm -f "${ROOT_DIR:?}/${file}"
  done
}

restore_state() {
  local file
  clear_state
  for file in "${STATE_FILES[@]}"; do
    if [[ -e "${BACKUP_DIR}/${file}" ]]; then
      cp -p "${BACKUP_DIR}/${file}" "${ROOT_DIR}/${file}"
    fi
  done
}

cleanup() {
  stop_pid "${FOREGROUND_PID}"
  stop_pid "${DETACHED_PID}"
  restore_state
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

run_foreground_check() {
  local rtsp_port http_port base
  rtsp_port="$(choose_free_port "${MEDIA_SERVER_VERIFY_START_RTSP_PORT:-8660}")"
  http_port="$(choose_free_port "${MEDIA_SERVER_VERIFY_START_HTTP_PORT:-8190}")"
  base="http://127.0.0.1:${http_port}"

  (
    cd "${ROOT_DIR}"
    exec env \
      MEDIA_SERVER_SKIP_LOCAL_ENV=1 \
      MEDIA_SERVER_SKIP_BUILD=1 \
      MEDIA_SERVER_AUTH_MODE=off \
      MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 \
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 \
      MEDIA_SERVER_LISTEN_PORT="${rtsp_port}" \
      MEDIA_SERVER_HTTP_LISTEN_PORT="${http_port}" \
      MEDIA_SERVER_FORCE_RTSP_TCP=1 \
      ./server.sh foreground
  ) >"${FOREGROUND_LOG}" 2>&1 &
  FOREGROUND_PID=$!

  wait_for_health "${base}" "foreground"
  grep -q "run mode: foreground" "${FOREGROUND_LOG}" || fail "foreground log missing run mode"
  grep -q "ops: ${base}/ops/home" "${FOREGROUND_LOG}" || fail "foreground log missing ops URL"
  pass "foreground startup log contract"
  expect_http_ok "${base}/ops/home" "foreground ops route ok"
  expect_http_ok "${base}/client/live" "foreground client route ok"

  stop_pid "${FOREGROUND_PID}"
  FOREGROUND_PID=""
  wait_port_closed "${rtsp_port}"
  wait_port_closed "${http_port}"
  pass "foreground stop ok"
}

run_start_check() {
  local rtsp_port http_port base pid_file
  rtsp_port="$(choose_free_port "${MEDIA_SERVER_VERIFY_START_DETACHED_RTSP_PORT:-8680}")"
  http_port="$(choose_free_port "${MEDIA_SERVER_VERIFY_START_DETACHED_HTTP_PORT:-8210}")"
  base="http://127.0.0.1:${http_port}"
  pid_file="${ROOT_DIR}/.media_server.pid"

  clear_state
  (
    cd "${ROOT_DIR}"
    MEDIA_SERVER_SKIP_LOCAL_ENV=1 \
    MEDIA_SERVER_SKIP_BUILD=1 \
    MEDIA_SERVER_AUTH_MODE=off \
    MEDIA_SERVER_START_MODE=nohup \
    MEDIA_SERVER_AUTO_DIAGNOSE=0 \
    MEDIA_SERVER_START_STABILITY_WAIT_S=0.2 \
    MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 \
    MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 \
    MEDIA_SERVER_LISTEN_PORT="${rtsp_port}" \
    MEDIA_SERVER_PORT_CANDIDATES="${rtsp_port}" \
    MEDIA_SERVER_HTTP_LISTEN_PORT="${http_port}" \
    MEDIA_SERVER_FORCE_RTSP_TCP=1 \
      ./server.sh start
  ) >"${START_OUTPUT}" 2>&1 || fail "start command failed"

  grep -q "\[1/3\] skipped env override" "${START_OUTPUT}" || fail "start did not skip local env override"
  grep -q "started: pid=" "${START_OUTPUT}" || fail "start output missing pid"
  grep -q "mode: detached" "${START_OUTPUT}" || fail "start output missing detached mode"
  [[ -f "${pid_file}" ]] || fail "start pid file missing"
  DETACHED_PID="$(cat "${pid_file}")"
  [[ -n "${DETACHED_PID}" ]] || fail "start pid file empty"
  kill -0 "${DETACHED_PID}" >/dev/null 2>&1 || fail "detached pid is not alive"
  pass "start detached process recorded"

  wait_for_health "${base}" "start"
  expect_http_ok "${base}/ops/home" "start ops route ok"
  expect_http_ok "${base}/client/live" "start client route ok"

  stop_pid "${DETACHED_PID}"
  DETACHED_PID=""
  clear_state
  pass "start detached stop ok"
}

backup_state
run_foreground_check
run_start_check

echo ""
echo "== Server start modes 검증 요약 =="
echo "- 통과: ${pass_count}"
echo "- 실패: 0"
