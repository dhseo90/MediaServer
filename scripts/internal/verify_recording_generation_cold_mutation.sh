#!/usr/bin/env bash
# cold 지정 원문 사용 시 검증. 제품 Open/전체 과거 복구 검사가 아니다.
set -euo pipefail
cold_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cold_repo="$(cd "$cold_script/../.." && pwd)"
cold_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
cold_root="$(mktemp -d "$cold_parent/media-server-generation-cold.XXXXXX")"
cold_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$cold_root")"
cold_cleanup() {
  local prior=$?
  if ! node -e '
const f=require("fs"),p=require("path"),root=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]);
const s=f.lstatSync(root);
if(p.dirname(root)!==parent||!/^media-server-generation-cold\.[A-Za-z0-9]+$/.test(p.basename(root))||
 !s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==expected.uid||
 s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(root)!==root)throw Error("cleanup ownership mismatch");
function bytes(name){const t=f.lstatSync(name);return t.isDirectory()?f.readdirSync(name).reduce((n,k)=>n+bytes(p.join(name,k)),0):t.size;}
const size=bytes(root);f.rmSync(root,{recursive:true});if(f.existsSync(root))throw Error("cleanup remains");
console.log(`[cleanup] path=${root} bytes=${size} removed=true`);' "$cold_root" "$cold_parent" "$cold_identity"; then
    echo '[cleanup] removed=false'
    return 1
  fi
  return "$prior"
}
trap cold_cleanup EXIT
read -r -a cold_cflags <<< "$(pkg-config --cflags openssl)"
read -r -a cold_libs <<< "$(pkg-config --libs openssl)"
cold_sources=(
  "$cold_repo/src/domain/strict_json.cpp"
  "$cold_repo/src/recording/recording_contracts.cpp"
  "$cold_repo/src/recording/recording_journal.cpp"
  "$cold_repo/src/recording/recording_generation_manifest.cpp"
  "$cold_repo/src/recording/recording_generation_cold_mutation.cpp"
  "$cold_script/recording_generation_cold_mutation_smoke.cpp"
)
echo '[scope] cold selected row; full archive SHA IO; physical admission; legacy 16MiB logical decompression bound'
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
shasum -a 256 "${cold_sources[@]}" "$cold_repo/include/recording/recording_generation_cold_mutation.h" "$cold_script/verify_recording_generation_cold_mutation.sh"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$cold_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${cold_cflags[@]}" "${cold_sources[@]}" "${cold_libs[@]}" -lz -o "$cold_root/cold-crypto"
"$cold_root/cold-crypto" "$cold_root/crypto-fixtures"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$cold_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=0 "${cold_sources[@]}" -lz -o "$cold_root/cold-no-crypto"
"$cold_root/cold-no-crypto" "$cold_root/no-crypto-fixtures"
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
