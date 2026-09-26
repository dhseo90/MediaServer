#!/usr/bin/env bash
# 파일 용도: 녹화 카탈로그 cutover 세션 smoke의 빌드·실행·정리를 수행한다.
# managed v1 원본 방문과 동기 쓰기 freeze만 검사한다. 전환 게시/Catalog domain 검사는 아니다.
set -euo pipefail
session_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
session_repo="$(cd "$session_script/../.." && pwd)"
session_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
session_root="$(mktemp -d "$session_parent/media-server-cutover-session-readonly.XXXXXX")"
session_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$session_root")"
session_cleanup() {
  local prior=$?
  if ! node -e '
const f=require("fs"),p=require("path"),root=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]);
const s=f.lstatSync(root);
if(p.dirname(root)!==parent||!/^media-server-cutover-session-readonly\.[A-Za-z0-9]+$/.test(p.basename(root))||
 !s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==expected.uid||
 s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(root)!==root)throw Error("cleanup ownership mismatch");
function bytes(name){const t=f.lstatSync(name);return t.isDirectory()?f.readdirSync(name).reduce((n,k)=>n+bytes(p.join(name,k)),0):t.size;}
const size=bytes(root);f.rmSync(root,{recursive:true});if(f.existsSync(root))throw Error("cleanup remains");
console.log(`[cleanup] path=${root} bytes=${size} removed=true`);' "$session_root" "$session_parent" "$session_identity"; then
    echo '[cleanup] removed=false'
    return 1
  fi
  return "$prior"
}
trap session_cleanup EXIT
read -r -a session_cflags <<< "$(pkg-config --cflags openssl)"
read -r -a session_libs <<< "$(pkg-config --libs openssl)"
session_sources=(
  "$session_repo/src/domain/strict_json.cpp"
  "$session_repo/src/recording/recording_contracts.cpp"
  "$session_repo/src/recording/recording_journal.cpp"
  "$session_repo/src/recording/recording_cutover_input.cpp"
  "$session_repo/src/recording/recording_generation_transaction.cpp" "$session_repo/src/recording/recording_generation_receipt.cpp"
  "$session_repo/src/recording/recording_generation_manifest.cpp" "$session_repo/src/recording/recording_generation_files.cpp"
  "$session_repo/src/recording/recording_generation_cold_mutation.cpp"
  "$session_repo/src/recording/recording_catalog_snapshot.cpp"
  "$session_repo/src/recording/recording_order_history_snapshot.cpp"
  "$session_repo/src/recording/recording_identity_shard.cpp"
  "$session_repo/src/recording/recording_derived_selection.cpp"
  "$session_repo/src/recording/recording_derived_job.cpp"
  "$session_repo/src/recording/recording_derived_job_ready.cpp"
  "$session_repo/src/recording/recording_catalog_generation_projection.cpp"
  "$session_repo/src/recording/recording_generation_active.cpp"
  "$session_script/recording_cutover_session_smoke.cpp"
)
echo '[scope] managed v1 cutover visitor; two-pass original FD; freeze writes, preserve read/cold authority; no publication/domain/RAM claim'
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
uname -sm
"${CXX:-c++}" --version | head -n 1
shasum -a 256 "${session_sources[@]}" "$session_repo/include/recording/recording_cutover_input.h" "$session_repo/include/recording/recording_catalog_generation_projection.h" "$session_repo/include/recording/recording_journal.h" "$session_script/verify_recording_cutover_session.sh"
echo '[config] backend=1 crypto=1'
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$session_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${session_cflags[@]}" "${session_sources[@]}" "${session_libs[@]}" -lz -o "$session_root/projection-crypto"
"$session_root/projection-crypto" "$session_root/crypto-fixtures"
echo '[config] backend=1 crypto=0'
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$session_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=0 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 "${session_sources[@]}" -lz -o "$session_root/projection-no-crypto"
"$session_root/projection-no-crypto" "$session_root/no-crypto-fixtures"
echo '[config] backend=0 crypto=1'
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$session_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=0 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${session_cflags[@]}" "${session_sources[@]}" "${session_libs[@]}" -lz -o "$session_root/backend-off"
"$session_root/backend-off" "$session_root/backend-off-fixtures"
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
