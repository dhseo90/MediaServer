#!/usr/bin/env bash
# 파일 용도: users file 계정 관리를 media_server 바이너리의 auth-user CLI로 위임한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

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

MEDIA_SERVER_ENABLE_AI="${MEDIA_SERVER_ENABLE_AI:-1}"
if [[ "${MEDIA_SERVER_ENABLE_AI}" == "1" ]]; then
  BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst-onnx}"
else
  BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst}"
fi
MEDIA_SERVER_BIN="${MEDIA_SERVER_BIN_PATH:-${BUILD_DIR}/media_server}"

if [[ "${MEDIA_SERVER_SKIP_BUILD:-0}" != "1" ]]; then
  "${SCRIPT_DIR}/build_server.sh" >/dev/null
fi

if [[ ! -x "${MEDIA_SERVER_BIN}" ]]; then
  echo "[auth-user] missing executable: ${MEDIA_SERVER_BIN}" >&2
  echo "[auth-user] run ./server.sh build first or set MEDIA_SERVER_BIN_PATH" >&2
  exit 1
fi

cd "${ROOT_DIR}"
exec "${MEDIA_SERVER_BIN}" auth-user "$@"
