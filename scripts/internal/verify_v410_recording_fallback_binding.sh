#!/usr/bin/env bash
# 파일 용도: 녹화 대체 미디어 식별자 결속 검증 실행.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
case "${1:-}" in ""|--red) ;; *) exit 2;; esac
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-binding.XXXXXX")"
RUN_DIR="$(cd "${RUN_DIR}" && pwd -P)"
completed=0
start_ms="$(node -p 'Date.now()')"
cleanup() {
  local original=$? result=0 size=0
  trap - EXIT
  size="$(node -e 'const f=require("fs"),p=require("path");function n(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((a,v)=>a+n(p.join(x,v)),0):s.size}console.log(n(process.argv[1]))' "${RUN_DIR}")" || result=1
  rm -rf -- "${RUN_DIR}" || result=1
  [[ ! -e "${RUN_DIR}" && ! -L "${RUN_DIR}" ]] || result=1
  echo "[cleanup] path=${RUN_DIR} bytes=${size} absent=$([[ ! -e "${RUN_DIR}" && ! -L "${RUN_DIR}" ]] && echo true || echo false)"
  echo "[elapsed] ms=$(( $(node -p 'Date.now()') - start_ms ))"
  if (( original != 0 )); then exit "${original}"; fi
  if (( result != 0 || completed != 1 )); then exit 1; fi
}
trap cleanup EXIT
read -r -a CRYPTO <<< "$(pkg-config --cflags --libs openssl)"
SOURCES=(recording_contracts recording_journal recording_catalog retention_coordinator event_recording_bridge event_clip_deriver recording_finalize_recovery recording_file_evidence recording_media_inspector recording_read_service)
INPUTS=()
for name in "${SOURCES[@]}"; do INPUTS+=("${ROOT_DIR}/src/recording/${name}.cpp"); done
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=0 -DMEDIA_SERVER_USE_GSTREAMER=0 \
  "${SCRIPT_DIR}/recording_fallback_binding_smoke.cpp" "${INPUTS[@]}" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" "${CRYPTO[@]}" -o "${RUN_DIR}/smoke"
"${RUN_DIR}/smoke" "${RUN_DIR}/fixture" "${1:---full}"
if [[ "${1:-}" != --red ]]; then
  "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
    -DMEDIA_SERVER_USE_OPENSSL=0 -DMEDIA_SERVER_USE_SQLITE3=0 -DMEDIA_SERVER_USE_GSTREAMER=0 \
    "${SCRIPT_DIR}/recording_fallback_binding_smoke.cpp" "${INPUTS[@]}" \
    "${ROOT_DIR}/src/domain/strict_json.cpp" -o "${RUN_DIR}/no-ssl"
  "${RUN_DIR}/no-ssl" "${RUN_DIR}/no-ssl-fixture" --nossl
fi
completed=1
