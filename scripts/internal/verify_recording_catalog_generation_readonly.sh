#!/usr/bin/env bash
# 공개 B 읽기 전용 focused. 실서버/운영 자료에 접근하지 않는다.
set -euo pipefail
task_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
task_repo="$(cd "$task_script/../.." && pwd)"
task_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
task_root="$(mktemp -d "$task_parent/media-server-generation-readonly.XXXXXX")"
task_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$task_root")"
cleanup() {
 local prior=$?
 node -e '
const f=require("fs"),p=require("path"),root=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]),s=f.lstatSync(root);
if(p.dirname(root)!==parent||!/^media-server-generation-readonly\.[A-Za-z0-9]+$/.test(p.basename(root))||!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==expected.uid||s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(root)!==root)throw Error("cleanup ownership");
function bytes(n){const s=f.lstatSync(n);return s.isDirectory()?f.readdirSync(n).reduce((v,k)=>v+bytes(p.join(n,k)),0):s.size;}
const size=bytes(root);f.rmSync(root,{recursive:true});if(f.existsSync(root))throw Error("cleanup remains");console.log(`[cleanup] path=${root} bytes=${size} removed=true`);' "$task_root" "$task_parent" "$task_identity" || return 1
 return "$prior"
}
trap cleanup EXIT
read -r -a task_cflags <<< "$(pkg-config --cflags openssl sqlite3)"
read -r -a task_libs <<< "$(pkg-config --libs openssl sqlite3)"
task_sources=(
 src/recording/recording_catalog.cpp src/recording/recording_catalog_snapshot_export.cpp
 src/recording/recording_timeline_projection.cpp
 src/recording/recording_read_service.cpp
 src/recording/retention_coordinator.cpp src/recording/recording_finalize_recovery.cpp
 src/recording/recording_file_evidence.cpp src/recording/recording_media_inspector.cpp
 src/domain/strict_json.cpp src/recording/recording_contracts.cpp src/recording/recording_journal.cpp
 src/recording/recording_generation_manifest.cpp src/recording/recording_generation_cold_mutation.cpp src/recording/recording_generation_files.cpp
 src/recording/recording_catalog_snapshot.cpp src/recording/recording_order_history_snapshot.cpp
 src/recording/recording_identity_shard.cpp src/recording/recording_derived_selection.cpp
 src/recording/recording_derived_job.cpp src/recording/recording_derived_job_ready.cpp
 src/recording/recording_catalog_generation_projection.cpp src/recording/recording_generation_active.cpp
 scripts/internal/recording_catalog_generation_readonly_smoke.cpp
)
cd "$task_repo"
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
uname -srm
"${CXX:-c++}" --version | head -1
shasum -a 256 "${task_sources[@]}" include/recording/recording_catalog.h include/recording/recording_journal.h include/recording/recording_generation_recovery_session.h \
 scripts/internal/recording_catalog_generation_scratch_smoke.cpp scripts/internal/recording_catalog_generation_projection_smoke.cpp scripts/internal/recording_journal_generation_readonly_smoke.cpp "$task_script/verify_recording_catalog_generation_readonly.sh"
for task_config in '1 1 1' '1 0 1' '0 1 1' '1 1 0'; do
 read -r task_crypto task_sqlite task_backend <<< "$task_config"
 echo "[config] crypto=$task_crypto sqlite=$task_sqlite backend=$task_backend"
 "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -Iinclude \
  -DMEDIA_SERVER_USE_OPENSSL="$task_crypto" -DMEDIA_SERVER_USE_SQLITE3="$task_sqlite" -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND="$task_backend" -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${task_cflags[@]}" "${task_sources[@]}" "${task_libs[@]}" -lz -o "$task_root/readonly-$task_crypto-$task_sqlite-$task_backend"
 "$task_root/readonly-$task_crypto-$task_sqlite-$task_backend" "$task_root/fixtures-$task_crypto-$task_sqlite-$task_backend"
done
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
