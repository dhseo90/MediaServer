#!/usr/bin/env bash
# 파일 용도: 실제 미디어와 managed V2 writer의 격리 단기 계약을 검사한다.
set -euo pipefail
writer_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
writer_repo="$(cd "$writer_script/../.." && pwd)"
writer_run="$(mktemp -d "${TMPDIR:-/tmp}/media-server-managed-writer.XXXXXX")"
writer_run="$(cd "$writer_run" && pwd -P)"
SECONDS=0
cleanup() {
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`)' "$writer_run"
  printf '[elapsed] seconds=%s source=bash-SECONDS\n' "$SECONDS"
}
trap cleanup EXIT
source "$writer_script/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a writer_flags <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0 sqlite3 openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$writer_repo/include" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
  "$writer_script/recording_managed_writer_smoke.cpp" "$writer_repo/src/recording/gstreamer_segment_writer.cpp" \
  "$writer_repo/src/recording/recording_catalog.cpp" "$writer_repo/src/recording/recording_journal.cpp" \
  "$writer_repo/src/recording/recording_finalize_recovery.cpp" "$writer_repo/src/recording/recording_media_inspector.cpp" \
  "$writer_repo/src/recording/recording_derived_job.cpp" "$writer_repo/src/recording/recording_derived_job_ready.cpp" "$writer_repo/src/recording/recording_contracts.cpp" "$writer_repo/src/recording/retention_coordinator.cpp" \
  "$writer_repo/src/domain/strict_json.cpp" "${writer_flags[@]}" -o "$writer_run/probe"
"$writer_run/probe" "$writer_run"
