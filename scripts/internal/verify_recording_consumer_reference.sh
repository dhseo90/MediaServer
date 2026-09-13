#!/usr/bin/env bash
# 파일 용도: 실제 원장/catalog의 consumer reference 저장 fixture를 빌드·실행·정리한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-consumer-reference.XXXXXX")"
BUILD_DIR="$(cd "$BUILD_DIR" && pwd -P)"
SECONDS=0
cleanup() {
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}if(!p.basename(r).startsWith("media-server-consumer-reference.")||f.lstatSync(r).isSymbolicLink()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup containment");const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$BUILD_DIR" "${TMPDIR:-/tmp}"
  echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"
}
trap cleanup EXIT
read -r -a FLAGS <<<"$(pkg-config --cflags sqlite3 openssl)"
read -r -a LIBS <<<"$(pkg-config --libs sqlite3 openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" "${FLAGS[@]}" \
  -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_GSTREAMER=0 \
  "$SCRIPT_DIR/recording_consumer_reference_smoke.cpp" \
  "$ROOT_DIR/src/recording/recording_timeline_projection.cpp" \
  "$ROOT_DIR/src/recording/recording_read_service.cpp" \
  "$ROOT_DIR/src/recording/recording_catalog.cpp" "$ROOT_DIR/src/recording/recording_journal.cpp" \
  "$ROOT_DIR/src/recording/recording_finalize_recovery.cpp" "$ROOT_DIR/src/recording/recording_media_inspector.cpp" \
  "$ROOT_DIR/src/recording/recording_derived_job.cpp" "$ROOT_DIR/src/recording/recording_derived_job_ready.cpp" "$ROOT_DIR/src/recording/recording_contracts.cpp" "$ROOT_DIR/src/recording/retention_coordinator.cpp" \
  "$ROOT_DIR/src/domain/strict_json.cpp" "${LIBS[@]}" -o "$BUILD_DIR/check"
"$BUILD_DIR/check" "$BUILD_DIR"
