#!/usr/bin/env bash
# 파일 용도: 운영자가 공유할 수 있는 health/diagnostics/log/config 요약 bundle을 생성한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"

HTTP_BASE="${MEDIA_SERVER_OPS_BUNDLE_HTTP_BASE:-}"
OUTPUT_DIR="${MEDIA_SERVER_OPS_BUNDLE_OUTPUT_DIR:-}"
TIMEOUT_S="${MEDIA_SERVER_OPS_BUNDLE_TIMEOUT_S:-5}"
ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
STD_AFX="${ROOT_DIR}/include/stdafx.h"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --http-base)
      HTTP_BASE="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --timeout)
      TIMEOUT_S="${2:-5}"
      shift 2
      ;;
    *)
      echo "unknown option: $1" >&2
      exit 2
      ;;
  esac
done

client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

if [[ -z "${HTTP_BASE}" ]]; then
  http_port="$(sed -nE 's/.*kHttpListenPort = ([0-9]+).*/\1/p' "${STD_AFX}" | head -n1)"
  http_port="${MEDIA_SERVER_HTTP_LISTEN_PORT:-${http_port:-8080}}"
  http_address="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
  http_address="$(client_host "${http_address}")"
  HTTP_BASE="http://${http_address}:${http_port}"
fi
HTTP_BASE="${HTTP_BASE%/}"
http_target="${HTTP_BASE#http://}"
http_target="${http_target#https://}"
http_target="${http_target%%/*}"
if [[ "${http_target}" == *:* ]]; then
  export MEDIA_SERVER_HTTP_LISTEN_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-${http_target%%:*}}"
  export MEDIA_SERVER_HTTP_LISTEN_PORT="${MEDIA_SERVER_HTTP_LISTEN_PORT:-${http_target##*:}}"
  export MEDIA_SERVER_CHECK_HTTP_HOST="${MEDIA_SERVER_CHECK_HTTP_HOST:-${http_target%%:*}}"
  export MEDIA_SERVER_DIAG_HTTP_HOST="${MEDIA_SERVER_DIAG_HTTP_HOST:-${http_target%%:*}}"
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
if [[ -z "${OUTPUT_DIR}" ]]; then
  OUTPUT_DIR="${TMPDIR:-/tmp}/media_server_ops_bundle_${timestamp}_$$"
fi
mkdir -p "${OUTPUT_DIR}"

capture_command() {
  local name="$1"
  shift
  local output="${OUTPUT_DIR}/${name}.txt"
  set +e
  "$@" >"${output}" 2>&1
  local code=$?
  set -e
  printf '%s\n' "${code}" >"${OUTPUT_DIR}/${name}.exitcode"
  return 0
}

fetch_endpoint() {
  local path="$1"
  local output="$2"
  set +e
  curl -fsS --max-time "${TIMEOUT_S}" "${HTTP_BASE}${path}" >"${OUTPUT_DIR}/${output}" 2>"${OUTPUT_DIR}/${output}.stderr"
  local code=$?
  set -e
  if [[ "${code}" -ne 0 ]]; then
    mv "${OUTPUT_DIR}/${output}.stderr" "${OUTPUT_DIR}/${output}.error.txt"
    rm -f "${OUTPUT_DIR:?}/${output}"
  else
    rm -f "${OUTPUT_DIR}/${output}.stderr"
  fi
  printf '%s\n' "${code}" >"${OUTPUT_DIR}/${output}.exitcode"
}

redact_env_file() {
  local output="${OUTPUT_DIR}/config_redacted.env"
  if [[ ! -f "${ENV_FILE}" ]]; then
    printf '# %s not found\n' "${ENV_FILE}" >"${output}"
    return
  fi
  sed -E 's/^([^#=]*(PASSWORD|TOKEN|SECRET|KEY|COOKIE)[^=]*)=.*/\1=<redacted>/I' "${ENV_FILE}" >"${output}"
}

write_runtime_file_inventory() {
  {
    printf 'root=%s\n' "${ROOT_DIR}"
    for file in \
      ".media_server.pid" \
      ".media_server.port" \
      ".media_server.address" \
      ".media_server.mode" \
      ".media_server.log" \
      ".media_server.users.json" \
      ".media_server.sources.json" \
      ".media_server.views.json" \
      ".media_server.analysis_registry.json"; do
      if [[ -e "${ROOT_DIR}/${file}" ]]; then
        ls -l "${ROOT_DIR}/${file}"
      else
        printf 'missing %s\n' "${file}"
      fi
    done
  } >"${OUTPUT_DIR}/runtime_files.txt"
}

fetch_endpoint "/health" "health.json"
fetch_endpoint "/lab/runtime/status" "lab_runtime_status.json"
fetch_endpoint "/ops/api/runtime/status" "ops_runtime_status.json"
capture_command "check_server" "${SCRIPT_DIR}/check_server.sh"
capture_command "diagnose" "${SCRIPT_DIR}/diagnose_media_server.sh"
redact_env_file
write_runtime_file_inventory

if [[ -f "${ROOT_DIR}/.media_server.log" ]]; then
  tail -n 200 "${ROOT_DIR}/.media_server.log" >"${OUTPUT_DIR}/log_tail.txt"
else
  printf 'log file not found: %s\n' "${ROOT_DIR}/.media_server.log" >"${OUTPUT_DIR}/log_tail.txt"
fi

cat >"${OUTPUT_DIR}/manifest.json" <<JSON
{
  "schema": "media-server.ops-diagnostics-bundle.v1",
  "generatedAt": "${timestamp}",
  "httpBase": "${HTTP_BASE}",
  "root": "${ROOT_DIR}",
  "files": [
    "health.json",
    "lab_runtime_status.json",
    "ops_runtime_status.json",
    "check_server.txt",
    "diagnose.txt",
    "log_tail.txt",
    "runtime_files.txt",
    "config_redacted.env"
  ]
}
JSON

archive_path="${OUTPUT_DIR}.tar.gz"
tar -czf "${archive_path}" -C "$(dirname "${OUTPUT_DIR}")" "$(basename "${OUTPUT_DIR}")"

echo "[pass] ops diagnostics bundle: ${OUTPUT_DIR}"
echo "[pass] ops diagnostics archive: ${archive_path}"
