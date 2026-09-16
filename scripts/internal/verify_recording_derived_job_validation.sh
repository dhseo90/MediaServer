#!/usr/bin/env bash
# 독립 canonical validation 기준 측정. 서버/catalog/media 생성 없음.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-job-validation.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
cleanup() {
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}if(!p.basename(r).startsWith("media-server-job-validation.")||f.lstatSync(r).isSymbolicLink()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup containment");const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$RUN_DIR" "${TMPDIR:-/tmp}"
}
trap cleanup EXIT
read -r -a FLAGS <<<"$(pkg-config --cflags sqlite3 openssl)"
read -r -a LIBS <<<"$(pkg-config --libs sqlite3 openssl)"
echo '[build-profile] optimization=compiler-default NDEBUG=0 gstreamer=0 direct-source=1'
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" "${FLAGS[@]}" \
 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_GSTREAMER=0 \
 "$SCRIPT_DIR/recording_derived_job_validation_smoke.cpp" \
 "$ROOT_DIR/src/recording/recording_derived_job.cpp" "$ROOT_DIR/src/recording/recording_derived_job_ready.cpp" \
 "$ROOT_DIR/src/recording/recording_timeline_projection.cpp" \
 "$ROOT_DIR/src/recording/recording_derived_selection.cpp" "$ROOT_DIR/src/recording/recording_read_service.cpp" \
 "$ROOT_DIR/src/recording/recording_catalog.cpp" "$ROOT_DIR/src/recording/recording_journal.cpp" \
 "$ROOT_DIR/src/recording/recording_finalize_recovery.cpp" "$ROOT_DIR/src/recording/recording_file_evidence.cpp" "$ROOT_DIR/src/recording/recording_media_inspector.cpp" \
 "$ROOT_DIR/src/recording/recording_contracts.cpp" "$ROOT_DIR/src/recording/retention_coordinator.cpp" \
 "$ROOT_DIR/src/domain/strict_json.cpp" "${LIBS[@]}" -o "$RUN_DIR/check"
"$RUN_DIR/check" "$@"
