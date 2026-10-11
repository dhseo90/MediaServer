#!/usr/bin/env bash
# 파일 용도: v4.1.0 S02 recorder focused smoke를 독립 빌드한다.
# 동작 요약: product core와 writer를 같은 경고 정책으로 컴파일하고 실행한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_V410_RECORDING_RECORDER_BUILD_DIR:-/tmp/media_server_v410_recording_recorder-$$}"
CXX_BIN="${CXX:-c++}"

# Reject an existing/aliased root before creating anything or arming cleanup.
umask 077
BUILD_DIR="$(python3 -B - "$SCRIPT_DIR" "$BUILD_DIR" <<'PYROOT'
import os, pathlib, sys
sys.path.insert(0, sys.argv[1])
from recording_native_isolation import environment
p = pathlib.Path(sys.argv[2])
# /tmp is a platform alias; resolve only its existing parent, never an existing target.
if not p.is_absolute() or p.exists() or p.is_symlink():
    raise SystemExit('exclusive test root required')
p = p.parent.resolve(strict=True) / p.name
base = pathlib.Path('/tmp').resolve()
if base not in p.parents or not p.relative_to(base).parts[0].startswith(('media-server-', 'media_server_')):
    raise SystemExit('test namespace required')
parent = p.parent
while parent != base:
    st = parent.lstat()
    if not parent.is_dir() or st.st_uid != os.getuid() or st.st_mode & 0o022:
        raise SystemExit('unsafe parent')
    parent = parent.parent
p.mkdir(mode=0o700)
try:
    environment(p)
except Exception:
    # Preserve preparation evidence; never recurse on an unvalidated root.
    raise
print(p)
PYROOT
)"
TASK_ROOT_ID="$(python3 -B -c 'import os,sys,json;s=os.lstat(sys.argv[1]);print(json.dumps([s.st_dev,s.st_ino,s.st_uid]))' "$BUILD_DIR")"
cleanup() {
 local prior=$?
 python3 -B - "$BUILD_DIR" "$TASK_ROOT_ID" <<'PYCLEAN'
import os, pathlib, sys, json, shutil, stat
p=pathlib.Path(sys.argv[1]);s=p.lstat()
if not stat.S_ISDIR(s.st_mode) or p.resolve()!=p or [s.st_dev,s.st_ino,s.st_uid]!=json.loads(sys.argv[2]) or s.st_uid!=os.getuid():
    raise SystemExit('cleanup identity mismatch')
shutil.rmtree(p)
if p.exists(): raise SystemExit('cleanup remains')
print('[cleanup] owned writer root removed=true')
PYCLEAN
 local cleaned=$?
 ((cleaned==0)) || return "$cleaned"
 return "$prior"
}
trap cleanup EXIT

GST_CFLAGS=()
GST_LIBS=()
GST_DEFINE=0
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists gstreamer-1.0 gstreamer-app-1.0; then
  read -r -a GST_CFLAGS <<<"$(pkg-config --cflags gstreamer-1.0 gstreamer-app-1.0)"
  read -r -a GST_LIBS <<<"$(pkg-config --libs gstreamer-1.0 gstreamer-app-1.0)"
  GST_DEFINE=1
fi

"${CXX_BIN}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  "${GST_CFLAGS[@]}" \
  "${SCRIPT_DIR}/recording_segment_writer_smoke.cpp" \
  "${ROOT_DIR}/src/core/shared_stream.cpp" \
  "${ROOT_DIR}/src/app_config.cpp" \
  "${ROOT_DIR}/src/ingress/source_view_registry.cpp" \
  "${ROOT_DIR}/src/ingress/source_view_application_service.cpp" \
  "${ROOT_DIR}/src/recording/gstreamer_segment_writer.cpp" \
  "${ROOT_DIR}/src/recording/recording_finalize_recovery.cpp" "${ROOT_DIR}/src/recording/recording_finalize_ticket.cpp" "${ROOT_DIR}/src/recording/recording_file_evidence.cpp" \
  "${ROOT_DIR}/src/recording/recording_media_inspector.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog_snapshot.cpp" \
  "${ROOT_DIR}/src/recording/recording_identity_shard.cpp" \
  "${ROOT_DIR}/src/recording/recording_journal.cpp" \
  "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
  "${ROOT_DIR}/src/recording/recording_derived_job.cpp" "${ROOT_DIR}/src/recording/recording_derived_job_ready.cpp" "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
  "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -DMEDIA_SERVER_USE_GSTREAMER="${GST_DEFINE}" \
  "${GST_LIBS[@]}" -lz \
  -o "${BUILD_DIR}/recording_segment_writer_smoke"

python3 "${SCRIPT_DIR}/recording_native_isolation.py" "$BUILD_DIR" -- "${BUILD_DIR}/recording_segment_writer_smoke" "$BUILD_DIR"

grep -q 'currentRecordingPolicy = source.recording' \
  "${ROOT_DIR}/src/ingress/product_ui_ops_sources_script.cpp"
grep -q 'const previousRecording = currentRecordingPolicy' \
  "${ROOT_DIR}/src/ingress/product_ui_ops_sources_script.cpp"
