#!/usr/bin/env bash
# 격리된 cutover/checkpoint 게시·복구 검사. 기본 runtime/미디어/UI를 실행하지 않는다.
set -euo pipefail
transaction_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
transaction_repo="$(cd "$transaction_script/../.." && pwd)"
transaction_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
transaction_root="$(mktemp -d "$transaction_parent/media-server-cutover-transaction.XXXXXX")"
transaction_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$transaction_root")"
transaction_cleanup() {
  local prior=$?
  if ! node -e '
const f=require("fs"),p=require("path"),root=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]);
const s=f.lstatSync(root);
if(p.dirname(root)!==parent||!/^media-server-cutover-transaction\.[A-Za-z0-9]+$/.test(p.basename(root))||
 !s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==expected.uid||
 s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(root)!==root)throw Error("cleanup ownership mismatch");
function bytes(name){const t=f.lstatSync(name);return t.isDirectory()?f.readdirSync(name).reduce((n,k)=>n+bytes(p.join(name,k)),0):t.size;}
const size=bytes(root);f.rmSync(root,{recursive:true});if(f.existsSync(root))throw Error("cleanup remains");
console.log(`[cleanup] path=${root} bytes=${size} removed=true`);' "$transaction_root" "$transaction_parent" "$transaction_identity"; then
    echo '[cleanup] removed=false'
    return 1
  fi
  return "$prior"
}
trap transaction_cleanup EXIT
read -r -a transaction_cflags <<< "$(pkg-config --cflags openssl)"
read -r -a transaction_libs <<< "$(pkg-config --libs openssl)"
transaction_sources=(
  "$transaction_repo/src/recording/recording_catalog.cpp"
  "$transaction_repo/src/recording/recording_catalog_cutover_candidate.cpp"
  "$transaction_repo/src/recording/recording_cutover_stage_writer.cpp"
  "$transaction_repo/src/recording/recording_generation_transaction.cpp"
  "$transaction_repo/src/recording/recording_generation_receipt.cpp"
  "$transaction_repo/src/recording/recording_catalog_snapshot_export.cpp"
  "$transaction_repo/src/recording/retention_coordinator.cpp"
  "$transaction_repo/src/recording/recording_finalize_recovery.cpp"
  "$transaction_repo/src/recording/recording_file_evidence.cpp"
  "$transaction_repo/src/recording/recording_media_inspector.cpp"
  "$transaction_repo/src/domain/strict_json.cpp"
  "$transaction_repo/src/recording/recording_contracts.cpp"
  "$transaction_repo/src/recording/recording_journal.cpp"
  "$transaction_repo/src/recording/recording_cutover_input.cpp"
  "$transaction_repo/src/recording/recording_generation_manifest.cpp" "$transaction_repo/src/recording/recording_generation_files.cpp"
  "$transaction_repo/src/recording/recording_generation_cold_mutation.cpp"
  "$transaction_repo/src/recording/recording_catalog_snapshot.cpp"
  "$transaction_repo/src/recording/recording_order_history_snapshot.cpp"
  "$transaction_repo/src/recording/recording_identity_shard.cpp"
  "$transaction_repo/src/recording/recording_derived_selection.cpp"
  "$transaction_repo/src/recording/recording_derived_job.cpp"
  "$transaction_repo/src/recording/recording_derived_job_ready.cpp"
  "$transaction_repo/src/recording/recording_catalog_generation_projection.cpp"
  "$transaction_repo/src/recording/recording_generation_active.cpp"
  "$transaction_script/recording_generation_transaction_smoke.cpp"
)
echo '[scope] private cutover transaction; no runtime default/media/UI activation'
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
uname -sm
"${CXX:-c++}" --version | head -n 1
shasum -a 256 "${transaction_sources[@]}" "$transaction_repo/include/recording/recording_catalog_generation_projection.h" "$transaction_repo/include/recording/recording_journal.h" "$transaction_script/verify_recording_generation_transaction.sh"
shasum -a 256 "$transaction_repo/include/recording/recording_catalog.h" "$transaction_repo/include/recording/recording_generation_transaction.h" "$transaction_repo/include/recording/recording_generation_receipt.h" "$transaction_repo/include/recording/recording_cutover_stage_writer.h" "$transaction_repo/include/recording/recording_cutover_candidate.h"
shasum -a 256 "$transaction_script/recording_catalog_generation_projection_smoke.cpp"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$transaction_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${transaction_cflags[@]}" "${transaction_sources[@]}" "${transaction_libs[@]}" -lz -o "$transaction_root/projection-crypto"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$transaction_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=0 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 "${transaction_sources[@]}" -lz -o "$transaction_root/projection-no-crypto"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$transaction_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=0 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${transaction_cflags[@]}" "${transaction_sources[@]}" "${transaction_libs[@]}" -lz -o "$transaction_root/backend-off"
"$transaction_root/projection-crypto" "$transaction_root/crypto-fixtures"
"$transaction_root/projection-no-crypto" "$transaction_root/no-crypto-fixtures"
"$transaction_root/backend-off" "$transaction_root/backend-off-fixtures"
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
