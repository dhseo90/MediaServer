#!/usr/bin/env bash
# 파일 용도: 현재 녹화 세대 active smoke의 빌드·실행·정리를 수행한다.
# 독립 active 후보 검사. 제품 Open/Append/Checkpoint나 과거 원문 검증이 아니다.
set -euo pipefail
active_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
active_repo="$(cd "$active_script/../.." && pwd)"
active_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
active_root="$(mktemp -d "$active_parent/media-server-generation-active.XXXXXX")"
active_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$active_root")"
active_cleanup() {
  local prior=$?
  if ! node -e '
const f=require("fs"),p=require("path"),root=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]);
const s=f.lstatSync(root);
if(p.dirname(root)!==parent||!/^media-server-generation-active\.[A-Za-z0-9]+$/.test(p.basename(root))||
 !s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==expected.uid||
 s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(root)!==root)throw Error("cleanup ownership mismatch");
function bytes(name){const t=f.lstatSync(name);return t.isDirectory()?f.readdirSync(name).reduce((n,k)=>n+bytes(p.join(name,k)),0):t.size;}
const size=bytes(root);f.rmSync(root,{recursive:true});if(f.existsSync(root))throw Error("cleanup remains");
console.log(`[cleanup] path=${root} bytes=${size} removed=true`);' "$active_root" "$active_parent" "$active_identity"; then
    echo '[cleanup] removed=false'
    return 1
  fi
  return "$prior"
}
trap active_cleanup EXIT
read -r -a active_cflags <<< "$(pkg-config --cflags openssl)"
read -r -a active_libs <<< "$(pkg-config --libs openssl)"
active_sources=(
  "$active_repo/src/domain/strict_json.cpp"
  "$active_repo/src/recording/recording_contracts.cpp"
  "$active_repo/src/recording/recording_journal.cpp"
  "$active_repo/src/recording/recording_generation_manifest.cpp"
  "$active_repo/src/recording/recording_generation_active.cpp"
  "$active_script/recording_generation_active_smoke.cpp"
)
echo '[scope] active bytes/locator only; historical/domain/product Open not verified'
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
shasum -a 256 "${active_sources[@]}" "$active_repo/include/recording/recording_generation_active.h" "$active_script/verify_recording_generation_active.sh"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$active_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${active_cflags[@]}" "${active_sources[@]}" "${active_libs[@]}" -lz -o "$active_root/active-crypto"
"$active_root/active-crypto" "$active_root/crypto-fixtures"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$active_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=0 "${active_sources[@]}" -lz -o "$active_root/active-no-crypto"
"$active_root/active-no-crypto" "$active_root/no-crypto-fixtures"
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
