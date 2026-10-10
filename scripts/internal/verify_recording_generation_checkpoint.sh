#!/usr/bin/env bash
# 파일 용도: 녹화 세대 checkpoint smoke의 빌드·실행·정리를 수행한다.
# B 명시 opt-in 세대 회전 focused. 실서버/운영 자료에 접근하지 않는다.
set -euo pipefail
task_case="${1:-all}"
[[ "$task_case" == all || "$task_case" == residency || "$task_case" == history-product || "$task_case" == history-index || "$task_case" == scale || "$task_case" == scale-baseline || "$task_case" == scale-load || "$task_case" == scale-visual ]] || exit 2
task_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
task_repo="$(cd "$task_script/../.." && pwd)"
task_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
task_root="$(mktemp -d "$task_parent/media-server-generation-checkpoint.XXXXXX")"
task_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$task_root")"
cleanup() {
 local prior=$?
 node -e '
const f=require("fs"),p=require("path"),root=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]),s=f.lstatSync(root);
if(p.dirname(root)!==parent||!/^media-server-generation-checkpoint\.[A-Za-z0-9]+$/.test(p.basename(root))||!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==expected.uid||s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(root)!==root)throw Error("cleanup ownership");
function bytes(n){const s=f.lstatSync(n);return s.isDirectory()?f.readdirSync(n).reduce((v,k)=>v+bytes(p.join(n,k)),0):s.size;}
const size=bytes(root);f.rmSync(root,{recursive:true});if(f.existsSync(root))throw Error("cleanup remains");console.log(`[cleanup] path=${root} bytes=${size} removed=true`);' "$task_root" "$task_parent" "$task_identity" || return 1
 return "$prior"
}
trap cleanup EXIT
read -r -a task_cflags <<< "$(pkg-config --cflags openssl sqlite3)"
read -r -a task_libs <<< "$(pkg-config --libs openssl sqlite3)"
task_sources=(
 src/recording/recording_catalog.cpp src/recording/recording_catalog_snapshot_export.cpp
 src/recording/recording_catalog_cutover_candidate.cpp src/recording/recording_cutover_stage_writer.cpp
 src/recording/recording_timeline_projection.cpp
 src/recording/recording_read_service.cpp
 src/recording/retention_coordinator.cpp src/recording/recording_finalize_recovery.cpp src/recording/recording_finalize_ticket.cpp
 src/recording/recording_file_evidence.cpp src/recording/recording_media_inspector.cpp
 src/domain/strict_json.cpp src/recording/recording_contracts.cpp src/recording/recording_journal.cpp
 src/recording/recording_cutover_input.cpp
 src/recording/recording_generation_transaction.cpp src/recording/recording_generation_receipt.cpp
 src/recording/recording_generation_manifest.cpp src/recording/recording_generation_cold_mutation.cpp src/recording/recording_generation_files.cpp
 src/recording/recording_catalog_snapshot.cpp src/recording/recording_order_history_snapshot.cpp
 src/recording/recording_identity_shard.cpp src/recording/recording_derived_selection.cpp
 src/recording/recording_derived_job.cpp src/recording/recording_derived_job_ready.cpp
 src/recording/recording_catalog_generation_projection.cpp src/recording/recording_generation_active.cpp
 scripts/internal/recording_generation_checkpoint_smoke.cpp
)
cd "$task_repo"
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
uname -srm
"${CXX:-c++}" --version | head -1
shasum -a 256 "${task_sources[@]}" include/recording/recording_catalog.h include/recording/recording_journal.h include/recording/recording_generation_recovery_session.h \
 src/recording/recording_history_index.h scripts/internal/recording_history_index_experiment.h scripts/internal/recording_generation_checkpoint_sql_cases.inc include/recording/recording_generation_manifest.h include/recording/recording_generation_files.h \
 scripts/internal/recording_catalog_generation_scratch_smoke.cpp scripts/internal/recording_catalog_generation_projection_smoke.cpp scripts/internal/recording_journal_generation_readonly_smoke.cpp "$task_script/verify_recording_generation_checkpoint.sh"
task_configs=('1 1 1' '1 0 1' '0 1 1' '1 1 0')
if [[ "$task_case" == scale* ]]; then task_configs=('1 1 1'); fi
if [[ "$task_case" == scale-baseline ]]; then
 # R01 이전 불변 commit의 Journal에 현재 읽기 전용 probe만 삽입한다. 제품 트리는 덮어쓰지 않는다.
 git show f6d5cf83:src/recording/recording_journal.cpp > "$task_root/baseline-journal.cpp"
 python3 - "$task_root/baseline-journal.cpp" <<'PYBASE'
from pathlib import Path
import sys
current=Path('src/recording/recording_journal.cpp').read_text()
start=current.index('#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)\nvoid RecordingJournal::ProbeGenerationIdentityStorage')
end=current.index('struct RecordingJournal::ColdReadProof',start)
p=Path(sys.argv[1]);s=p.read_text();at=s.index('struct RecordingJournal::ColdReadProof');p.write_text(s[:at]+current[start:end]+s[at:])
PYBASE
 for task_index in "${!task_sources[@]}"; do
  if [[ "${task_sources[$task_index]}" == src/recording/recording_journal.cpp ]]; then task_sources[$task_index]="$task_root/baseline-journal.cpp"; fi
 done
 shasum -a 256 "$task_root/baseline-journal.cpp"
fi
for task_config in "${task_configs[@]}"; do
 read -r task_crypto task_sqlite task_backend <<< "$task_config"
 echo "[config] crypto=$task_crypto sqlite=$task_sqlite backend=$task_backend"
 "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -Iinclude -Isrc/recording \
  -DMEDIA_SERVER_USE_OPENSSL="$task_crypto" -DMEDIA_SERVER_USE_SQLITE3="$task_sqlite" -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND="$task_backend" -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${task_cflags[@]}" "${task_sources[@]}" "${task_libs[@]}" -lz -o "$task_root/checkpoint-$task_crypto-$task_sqlite-$task_backend"
 if [[ "$task_case" == scale-load || "$task_case" == scale-visual ]]; then
  "$task_root/checkpoint-$task_crypto-$task_sqlite-$task_backend" "$task_root/load" scale-100000
  task_build="$task_repo/build-gst-onnx"
  read -r -a task_product_link < "$task_build/CMakeFiles/media_server.dir/link.txt"
  task_product_libs=();task_found=0
  for task_token in "${task_product_link[@]}"; do
   if [[ "$task_token" == libmedia_server_runtime.a ]]; then task_found=1;task_product_libs+=("$task_build/$task_token");continue;fi
   if ((task_found));then task_product_libs+=("$task_token");fi
  done
  test "$task_found" = 1
  read -r -a task_gst_flags <<< "$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
  task_load_source="$task_script/recording_search_runtime_load_smoke.cpp"
  task_model_args=()
  if [[ "$task_case" == scale-visual ]]; then
   task_load_source="$task_script/visual_search_runtime_load_smoke.cpp"
   task_model_args+=("$task_repo/models/v430-siglip2")
  fi
  shasum -a 256 "$task_load_source" "$task_build/libmedia_server_runtime.a"
  "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -Iinclude "${task_gst_flags[@]}" \
   -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 \
   "$task_load_source" "${task_product_libs[@]}" -o "$task_root/runtime-load"
  export GST_REGISTRY="$task_root/gst-registry.bin" GST_REGISTRY_1_0="$task_root/gst-registry.bin" MEDIA_SERVER_SKIP_LOCAL_ENV=1
  python3 - "$task_root/runtime-load" "$task_root/load/scale" "${task_model_args[@]}" <<'PYLOAD'
import subprocess,sys,time,pathlib,hashlib
evidence=pathlib.Path(sys.argv[2])/'evidence-1-0.jsonl'
before=hashlib.file_digest(evidence.open('rb'),'sha256').hexdigest()
start=time.monotonic();print('[mixed-command]',sys.argv[1:], 'existing',flush=True)
r=subprocess.run([sys.argv[1],sys.argv[2],'existing',*sys.argv[3:]],timeout=90)
print('[mixed-exit]',r.returncode,'elapsedSeconds',time.monotonic()-start,flush=True)
assert hashlib.file_digest(evidence.open('rb'),'sha256').hexdigest()==before
print('[mixed-evidence] originalSha256='+before+' unchanged=true',flush=True)
sys.exit(r.returncode)
PYLOAD
  continue
 fi
 if [[ "$task_case" == scale || "$task_case" == scale-baseline ]]; then
  for task_count in 1000 100000; do
   "$task_root/checkpoint-$task_crypto-$task_sqlite-$task_backend" "$task_root/scale-$task_count" "$task_case-$task_count"
  done
  continue
 fi
 task_args=("$task_root/fixtures-$task_crypto-$task_sqlite-$task_backend")
 if [[ "$task_case" == residency || "$task_case" == history-index || "$task_case" == history-product ]]; then task_args+=("$task_case"); fi
 "$task_root/checkpoint-$task_crypto-$task_sqlite-$task_backend" "${task_args[@]}"
done
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
