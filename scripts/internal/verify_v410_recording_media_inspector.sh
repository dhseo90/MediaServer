#!/usr/bin/env bash
# 파일 용도: 실제 media 검사 focused. mktemp root만 생성/정리한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != --red && "$1" != --boundaries && "$1" != --limits ) ]]; then exit 2; fi
RUN_DIR="$(mktemp -d /private/tmp/media-server-inspector-XXXXXX 2>/dev/null || mktemp -d /tmp/media-server-inspector-XXXXXX)"
cleanup(){
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function bytes(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+bytes(p.join(x,k)),0):s.size}const b=bytes(r);f.rmSync(r,{recursive:true,force:true});if(f.existsSync(r))process.exit(1);console.log(`[cleanup] path=${r} bytes=${b} removed=true`)' "$RUN_DIR"
}
trap cleanup EXIT
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a GST_FLAGS <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0)"
if [[ ${1:-} == --limits ]]; then
 "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/recording_media_inspector_limits_smoke.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" "${ROOT_DIR}/src/recording/recording_journal.cpp" \
 "${ROOT_DIR}/src/recording/recording_finalize_recovery.cpp" \
  "${ROOT_DIR}/src/recording/recording_derived_job.cpp" "${ROOT_DIR}/src/recording/recording_derived_job_ready.cpp" "${ROOT_DIR}/src/recording/recording_contracts.cpp" "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=0 \
  "${GST_FLAGS[@]}" -o "$RUN_DIR/limits-smoke"
 "$RUN_DIR/limits-smoke" "$RUN_DIR"
 exit 0
fi
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
 "${SCRIPT_DIR}/recording_media_inspector_smoke.cpp" "${ROOT_DIR}/src/recording/recording_media_inspector.cpp" \
 "${ROOT_DIR}/src/recording/recording_catalog.cpp" "${ROOT_DIR}/src/recording/recording_journal.cpp" \
 "${ROOT_DIR}/src/recording/recording_finalize_recovery.cpp" \
 "${ROOT_DIR}/src/recording/recording_derived_job.cpp" "${ROOT_DIR}/src/recording/recording_derived_job_ready.cpp" "${ROOT_DIR}/src/recording/recording_contracts.cpp" "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
 "${ROOT_DIR}/src/domain/strict_json.cpp" -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=0 \
 "${GST_FLAGS[@]}" -o "$RUN_DIR/smoke"
"$RUN_DIR/smoke" "$RUN_DIR" "$@"
if [[ $# -eq 0 ]]; then
 "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/recording_media_inspector_smoke.cpp" "${ROOT_DIR}/src/recording/recording_media_inspector.cpp" \
  -DMEDIA_SERVER_USE_GSTREAMER=0 -DMEDIA_SERVER_USE_SQLITE3=0 -o "$RUN_DIR/no-gst-smoke"
 "$RUN_DIR/no-gst-smoke" "$RUN_DIR"
fi
