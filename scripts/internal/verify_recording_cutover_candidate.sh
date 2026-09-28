#!/usr/bin/env bash
# 파일 용도: 녹화 카탈로그 cutover 후보 smoke의 빌드·실행·정리를 수행한다.
# 원본 불변의 비공개 cutover 후보 검사다. 게시/복구/기본 활성화 검사가 아니다.
set -euo pipefail
candidate_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
candidate_repo="$(cd "$candidate_script/../.." && pwd)"
candidate_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
candidate_root="$(mktemp -d "$candidate_parent/media-server-cutover-candidate.XXXXXX")"
candidate_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$candidate_root")"
candidate_cleanup() {
  local prior=$?
  if ! node -e '
const f=require("fs"),p=require("path"),root=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]);
const s=f.lstatSync(root);
if(p.dirname(root)!==parent||!/^media-server-cutover-candidate\.[A-Za-z0-9]+$/.test(p.basename(root))||
 !s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==expected.uid||
 s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(root)!==root)throw Error("cleanup ownership mismatch");
function bytes(name){const t=f.lstatSync(name);return t.isDirectory()?f.readdirSync(name).reduce((n,k)=>n+bytes(p.join(name,k)),0):t.size;}
const size=bytes(root);f.rmSync(root,{recursive:true});if(f.existsSync(root))throw Error("cleanup remains");
console.log(`[cleanup] path=${root} bytes=${size} removed=true`);' "$candidate_root" "$candidate_parent" "$candidate_identity"; then
    echo '[cleanup] removed=false'
    return 1
  fi
  return "$prior"
}
trap candidate_cleanup EXIT
read -r -a candidate_cflags <<< "$(pkg-config --cflags openssl)"
read -r -a candidate_libs <<< "$(pkg-config --libs openssl)"
candidate_sources=(
  "$candidate_repo/src/recording/recording_catalog.cpp"
  "$candidate_repo/src/recording/recording_catalog_cutover_candidate.cpp"
  "$candidate_repo/src/recording/recording_cutover_stage_writer.cpp"
  "$candidate_repo/src/recording/recording_catalog_snapshot_export.cpp"
  "$candidate_repo/src/recording/retention_coordinator.cpp"
  "$candidate_repo/src/recording/recording_finalize_recovery.cpp"
  "$candidate_repo/src/recording/recording_file_evidence.cpp"
  "$candidate_repo/src/recording/recording_media_inspector.cpp"
  "$candidate_repo/src/domain/strict_json.cpp"
  "$candidate_repo/src/recording/recording_contracts.cpp"
  "$candidate_repo/src/recording/recording_journal.cpp"
  "$candidate_repo/src/recording/recording_cutover_input.cpp"
  "$candidate_repo/src/recording/recording_generation_transaction.cpp" "$candidate_repo/src/recording/recording_generation_receipt.cpp"
  "$candidate_repo/src/recording/recording_generation_manifest.cpp" "$candidate_repo/src/recording/recording_generation_files.cpp"
  "$candidate_repo/src/recording/recording_generation_cold_mutation.cpp"
  "$candidate_repo/src/recording/recording_catalog_snapshot.cpp"
  "$candidate_repo/src/recording/recording_order_history_snapshot.cpp"
  "$candidate_repo/src/recording/recording_identity_shard.cpp"
  "$candidate_repo/src/recording/recording_derived_selection.cpp"
  "$candidate_repo/src/recording/recording_derived_job.cpp"
  "$candidate_repo/src/recording/recording_derived_job_ready.cpp"
  "$candidate_repo/src/recording/recording_catalog_generation_projection.cpp"
  "$candidate_repo/src/recording/recording_generation_active.cpp"
  "$candidate_script/recording_cutover_candidate_smoke.cpp"
)
echo '[scope] private cutover candidate; original immutable; no publication/default/RAM claim'
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
uname -sm
"${CXX:-c++}" --version | head -n 1
shasum -a 256 "${candidate_sources[@]}" "$candidate_repo/include/recording/recording_catalog_generation_projection.h" "$candidate_repo/include/recording/recording_journal.h" "$candidate_script/verify_recording_cutover_candidate.sh"
shasum -a 256 "$candidate_repo/include/recording/recording_catalog.h" "$candidate_repo/include/recording/recording_cutover_candidate.h" "$candidate_repo/include/recording/recording_cutover_stage_writer.h"
shasum -a 256 "$candidate_script/recording_catalog_generation_projection_smoke.cpp"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$candidate_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${candidate_cflags[@]}" "${candidate_sources[@]}" "${candidate_libs[@]}" -lz -o "$candidate_root/projection-crypto"
"$candidate_root/projection-crypto" "$candidate_root/crypto-fixtures"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$candidate_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=0 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 "${candidate_sources[@]}" -lz -o "$candidate_root/projection-no-crypto"
"$candidate_root/projection-no-crypto" "$candidate_root/no-crypto-fixtures"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$candidate_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=0 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${candidate_cflags[@]}" "${candidate_sources[@]}" "${candidate_libs[@]}" -lz -o "$candidate_root/backend-off"
"$candidate_root/backend-off" "$candidate_root/backend-off-fixtures"
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
