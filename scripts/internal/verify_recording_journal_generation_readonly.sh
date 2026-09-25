#!/usr/bin/env bash
# B Journal의 읽기 전용 권위와 v1 호환 집중 검증이다. Catalog B Open/SQLite/게시 검사는 아니다.
set -euo pipefail
projection_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
projection_repo="$(cd "$projection_script/../.." && pwd)"
projection_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
projection_root="$(mktemp -d "$projection_parent/media-server-journal-generation-readonly.XXXXXX")"
projection_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$projection_root")"
projection_cleanup() {
  local prior=$?
  if ! node -e '
const f=require("fs"),p=require("path"),root=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]);
const s=f.lstatSync(root);
if(p.dirname(root)!==parent||!/^media-server-journal-generation-readonly\.[A-Za-z0-9]+$/.test(p.basename(root))||
 !s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==expected.uid||
 s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(root)!==root)throw Error("cleanup ownership mismatch");
function bytes(name){const t=f.lstatSync(name);return t.isDirectory()?f.readdirSync(name).reduce((n,k)=>n+bytes(p.join(name,k)),0):t.size;}
const size=bytes(root);f.rmSync(root,{recursive:true});if(f.existsSync(root))throw Error("cleanup remains");
console.log(`[cleanup] path=${root} bytes=${size} removed=true`);' "$projection_root" "$projection_parent" "$projection_identity"; then
    echo '[cleanup] removed=false'
    return 1
  fi
  return "$prior"
}
trap projection_cleanup EXIT
read -r -a projection_cflags <<< "$(pkg-config --cflags openssl)"
read -r -a projection_libs <<< "$(pkg-config --libs openssl)"
projection_sources=(
  "$projection_repo/src/domain/strict_json.cpp"
  "$projection_repo/src/recording/recording_contracts.cpp"
  "$projection_repo/src/recording/recording_journal.cpp"
  "$projection_repo/src/recording/recording_cutover_input.cpp"
  "$projection_repo/src/recording/recording_generation_transaction.cpp" "$projection_repo/src/recording/recording_generation_receipt.cpp"
  "$projection_repo/src/recording/recording_generation_manifest.cpp" "$projection_repo/src/recording/recording_generation_files.cpp"
  "$projection_repo/src/recording/recording_generation_cold_mutation.cpp"
  "$projection_repo/src/recording/recording_catalog_snapshot.cpp"
  "$projection_repo/src/recording/recording_order_history_snapshot.cpp"
  "$projection_repo/src/recording/recording_identity_shard.cpp"
  "$projection_repo/src/recording/recording_derived_selection.cpp"
  "$projection_repo/src/recording/recording_derived_job.cpp"
  "$projection_repo/src/recording/recording_derived_job_ready.cpp"
  "$projection_repo/src/recording/recording_catalog_generation_projection.cpp"
  "$projection_repo/src/recording/recording_generation_active.cpp"
  "$projection_script/recording_journal_generation_readonly_smoke.cpp"
)
echo '[scope] B read-only Journal; blocked Catalog/Append/Replay; no RAM/completion claim'
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
shasum -a 256 "${projection_sources[@]}" "$projection_repo/include/recording/recording_catalog_generation_projection.h" "$projection_repo/include/recording/recording_journal.h" "$projection_script/verify_recording_journal_generation_readonly.sh"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$projection_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${projection_cflags[@]}" "${projection_sources[@]}" "${projection_libs[@]}" -lz -o "$projection_root/projection-crypto"
"$projection_root/projection-crypto" "$projection_root/crypto-fixtures"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$projection_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=0 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 "${projection_sources[@]}" -lz -o "$projection_root/projection-no-crypto"
"$projection_root/projection-no-crypto" "$projection_root/no-crypto-fixtures"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$projection_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=0 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${projection_cflags[@]}" "${projection_sources[@]}" "${projection_libs[@]}" -lz -o "$projection_root/backend-off"
"$projection_root/backend-off" "$projection_root/backend-off-fixtures"
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
