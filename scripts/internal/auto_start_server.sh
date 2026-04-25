#!/usr/bin/env bash
# 파일 용도: 서버가 떠 있지 않으면 빌드 후 백그라운드로 자동 시작한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/env_common.sh"

export MEDIA_SERVER_AUTO_DIAGNOSE="${MEDIA_SERVER_AUTO_DIAGNOSE:-1}"
export MEDIA_SERVER_SKIP_ENV_CHECK="${MEDIA_SERVER_SKIP_ENV_CHECK:-0}"
export MEDIA_SERVER_PORT_CANDIDATES="${MEDIA_SERVER_PORT_CANDIDATES:-8554,8555,8556}"
export MEDIA_SERVER_LISTEN_ADDRESS="${MEDIA_SERVER_LISTEN_ADDRESS:-0.0.0.0}"
export MEDIA_SERVER_HTTP_LISTEN_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-0.0.0.0}"

if media_server_is_udp_env_restricted "127.0.0.1"; then
  if [[ "${MEDIA_SERVER_FORCE_RTSP_TCP:-0}" != "1" ]]; then
    echo "[auto] preflight: UDP bind restriction detected; forcing TCP transport"
  fi
  export MEDIA_SERVER_FORCE_RTSP_TCP=1
  export MEDIA_SERVER_GST_ATTACH_CONTEXT=default
fi

printf '[auto] stop existing\n'
"${SCRIPT_DIR}/stop_server.sh" || true

printf '[auto] start with auto-resolve candidates\n'
if "${SCRIPT_DIR}/start_server.sh"; then
  :
else
  START_RC=$?
  echo "[auto] first start attempt failed (rc=${START_RC})"
  if grep -Eq "Error binding to address .*:240[0-9]+: Operation not permitted" .media_server.log 2>/dev/null; then
    echo "[auto] detected UDP bind block; retrying with MEDIA_SERVER_FORCE_RTSP_TCP=1"
    export MEDIA_SERVER_FORCE_RTSP_TCP=1
    "${SCRIPT_DIR}/start_server.sh"
  else
    exit ${START_RC}
  fi
fi

printf '[auto] post-start check\n'
"${SCRIPT_DIR}/check_server.sh"
