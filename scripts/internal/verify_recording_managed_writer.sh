#!/usr/bin/env bash
# 파일 용도: 실제 미디어와 managed V2 writer의 격리 단기 계약을 검사한다.
set -euo pipefail
if [[ $# -gt 1 || ( $# -eq 1 && $1 != --decoder-comparison && $1 != --decoder-comparison-bframes && $1 != --decode-oracle-tests ) ]]; then
  printf '[fail] 지원하지 않는 writer 검사 인자\n' >&2
  exit 2
fi
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
export MEDIA_SERVER_GST_CACHE_DIR="$writer_run/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$writer_run/registry.bin" GST_REGISTRY_1_0="$writer_run/registry.bin"
unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH
source "$writer_script/env_common.sh"
media_server_apply_homebrew_gst_env
printf '[environment] started_utc=%s platform=%s machine=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(uname -s)" "$(uname -m)"
printf '[environment] head=%s\n' "$(git -C "$writer_repo" rev-parse HEAD)"
pkg-config --modversion gstreamer-1.0 gstreamer-app-1.0 sqlite3 openssl
node - "$writer_repo" <<'NODE'
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = process.argv[2];
const files = ['scripts/internal/verify_recording_managed_writer.sh',
  'scripts/internal/recording_managed_writer_smoke.cpp',
  'scripts/internal/recording_writer_decode_diagnostics.h',
  'scripts/internal/recording_writer_decode_oracle.h',
  'include/media/gstreamer_sample_observation.h',
  ...fs.readdirSync(path.join(root, 'include/recording')).filter(n => n.endsWith('.h')).map(n => 'include/recording/' + n),
  ...fs.readdirSync(path.join(root, 'src/recording')).filter(n => n.endsWith('.cpp')).map(n => 'src/recording/' + n),
  'src/domain/strict_json.cpp'];
for (const file of files.sort()) {
  console.log('[source] ' + file + ' sha256=' + crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'));
}
NODE
read -r -a writer_flags <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0 sqlite3 openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$writer_repo/include" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
  "$writer_script/recording_managed_writer_smoke.cpp" "$writer_repo/src/recording/gstreamer_segment_writer.cpp" \
  "$writer_repo/src/recording/recording_catalog.cpp" "$writer_repo/src/recording/recording_journal.cpp" \
  "$writer_repo/src/recording/recording_finalize_recovery.cpp" "$writer_repo/src/recording/recording_file_evidence.cpp" "$writer_repo/src/recording/recording_media_inspector.cpp" \
  "$writer_repo/src/recording/recording_derived_job.cpp" "$writer_repo/src/recording/recording_derived_job_ready.cpp" "$writer_repo/src/recording/recording_contracts.cpp" "$writer_repo/src/recording/retention_coordinator.cpp" \
  "$writer_repo/src/domain/strict_json.cpp" "${writer_flags[@]}" -o "$writer_run/probe"
"$writer_run/probe" "$writer_run" "$@"
