#!/usr/bin/env bash
# 파일 용도: 환경 파일을 읽지 않고 실제 앱 검증기의 종료 코드를 보존한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "${1:-}" == --current-integration ]]; then
  [[ $# == 1 ]] || exit 2
  exec node "${SCRIPT_DIR}/recording_current_integration_suite.mjs"
fi
if [[ "${1:-}" == --app-longrun ]]; then
  [[ $# == 3 && "${2:-}" == --duration-minutes && "${3:-}" == 120 ]] || { echo 'invalid longrun arguments' >&2; exit 2; }
  exec bash "${SCRIPT_DIR}/verify_recording_current_observer.sh" --duration-minutes 120
fi
if [[ "${1:-}" == --app-observe ]]; then
  [[ $# == 1 ]] || exit 2
  exec bash "${SCRIPT_DIR}/verify_recording_current_observer.sh" --app-observe
fi
if [[ "${1:---all}" == "--all" ]]; then
  exec node "${SCRIPT_DIR}/recording_foundation_suite.mjs"
fi
if [[ "${1:---all}" == "--app-auth" || "${1:---all}" == "--all" ]]; then
  node "${SCRIPT_DIR}/recording_foundation_auth_helpers.mjs"
fi
source "${SCRIPT_DIR}/env_common.sh"
GST_RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-s09-foundation-gst.XXXXXX")"
GST_RUN_DIR="$(cd "${GST_RUN_DIR}" && pwd -P)"
completed=0
cleanup() {
  local original=$? cleanup_result=0 size=0
  trap - EXIT
  size="$(node -e 'const f=require("fs"),p=require("path");function n(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((a,v)=>a+n(p.join(x,v)),0):s.size}console.log(n(process.argv[1]))' "${GST_RUN_DIR}")" || cleanup_result=1
  rm -rf -- "${GST_RUN_DIR}" || cleanup_result=1
  [[ ! -e "${GST_RUN_DIR}" && ! -L "${GST_RUN_DIR}" ]] || cleanup_result=1
  echo "[cleanup] path=${GST_RUN_DIR} bytes=${size} absent=$([[ ! -e "${GST_RUN_DIR}" && ! -L "${GST_RUN_DIR}" ]] && echo true || echo false)"
  if (( original != 0 )); then exit "${original}"; fi
  if (( cleanup_result != 0 || completed != 1 )); then exit 1; fi
  echo '[pass] AP wrapper completed and cleanup absent'
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="${GST_RUN_DIR}"
media_server_apply_homebrew_gst_env
if [[ "${1:-}" == "--app-observe" || "${1:-}" == "--app-longrun" ]]; then
  [[ "${1:-}" == --app-longrun || $# == 1 ]] || exit 2
  c++ -std=c++17 "${SCRIPT_DIR}/recording_process_metrics.cpp" -o "${GST_RUN_DIR}/recording-process-metrics"
  if [[ "${1:-}" == --app-longrun ]]; then
    node "${SCRIPT_DIR}/verify_v410_recording_foundation.mjs" --app-longrun "${GST_RUN_DIR}/recording-process-metrics" --duration-minutes 120
  else
    node "${SCRIPT_DIR}/verify_v410_recording_foundation.mjs" --app-observe "${GST_RUN_DIR}/recording-process-metrics"
  fi
else
  node "${SCRIPT_DIR}/verify_v410_recording_foundation.mjs" "$@"
fi
completed=1
