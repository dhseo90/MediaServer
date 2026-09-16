#!/usr/bin/env bash
# 파일 용도: 제품 코드를 직접 링크한 파일 시각 측정 및 소유 임시 산출물 정리.
set -euo pipefail
probe_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
probe_repo="$(cd "$probe_script/../.." && pwd)"
probe_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
probe_run="$(mktemp -d "$probe_parent/media-server-derived-time.XXXXXX")"
SECONDS=0
cleanup() {
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];if(p.dirname(r)!==process.argv[2]||!/^media-server-derived-time\.[A-Za-z0-9]+$/.test(p.basename(r))||f.lstatSync(r).isSymbolicLink())throw Error("cleanup containment");function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$probe_run" "$probe_parent"
  printf '[elapsed] seconds=%s source=bash-SECONDS\n' "$SECONDS"
}
trap cleanup EXIT
source "$probe_script/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a probe_flags <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0 sqlite3 openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$probe_repo/include" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
  "$probe_script/recording_derived_time_probe.cpp" "$probe_repo/src/recording/gstreamer_segment_writer.cpp" \
  "$probe_repo/src/recording/recording_catalog.cpp" "$probe_repo/src/recording/recording_journal.cpp" \
  "$probe_repo/src/recording/recording_finalize_recovery.cpp" "$probe_repo/src/recording/recording_file_evidence.cpp" "$probe_repo/src/recording/recording_media_inspector.cpp" \
  "$probe_repo/src/recording/recording_derived_job.cpp" "$probe_repo/src/recording/recording_derived_job_ready.cpp" "$probe_repo/src/recording/recording_contracts.cpp" "$probe_repo/src/recording/retention_coordinator.cpp" \
  "$probe_repo/src/domain/strict_json.cpp" "${probe_flags[@]}" -o "$probe_run/probe"
"$probe_run/probe" "$probe_run"
