#!/usr/bin/env bash
# 영수증 값 codec만 검사한다. 제품 저장소/게시/복구를 실행하지 않는다.
set -euo pipefail
receipt_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
receipt_repo="$(cd "$receipt_script/../.." && pwd)"
receipt_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
receipt_root="$(mktemp -d "$receipt_parent/media-server-generation-receipt.XXXXXX")"
receipt_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$receipt_root")"
cleanup() {
 local prior=$?
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],parent=process.argv[2],e=JSON.parse(process.argv[3]),s=f.lstatSync(r);
if(p.dirname(r)!==parent||!/^media-server-generation-receipt\.[A-Za-z0-9]+$/.test(p.basename(r))||!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==e.uid||s.dev!==e.dev||s.ino!==e.ino||f.realpathSync(r)!==r)throw Error("cleanup ownership");
function bytes(n){const s=f.lstatSync(n);return s.isDirectory()?f.readdirSync(n).reduce((v,k)=>v+bytes(p.join(n,k)),0):s.size;}const size=bytes(r);f.rmSync(r,{recursive:true});if(f.existsSync(r))throw Error("cleanup remains");console.log(`[cleanup] path=${r} bytes=${size} removed=true`);' "$receipt_root" "$receipt_parent" "$receipt_identity" || return 1
 return "$prior"
}
trap cleanup EXIT
cd "$receipt_repo"
receipt_sources=(src/domain/strict_json.cpp src/recording/recording_generation_manifest.cpp src/recording/recording_generation_receipt.cpp scripts/internal/recording_generation_receipt_smoke.cpp)
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
uname -srm
"${CXX:-c++}" --version | head -1
shasum -a 256 "${receipt_sources[@]}" include/recording/recording_generation_receipt.h "$receipt_script/verify_recording_generation_receipt.sh"
read -r -a receipt_cflags <<< "$(pkg-config --cflags openssl)"
read -r -a receipt_libs <<< "$(pkg-config --libs openssl)"
for receipt_crypto in 1 0; do
 echo "[config] crypto=$receipt_crypto"
 "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -Iinclude -DMEDIA_SERVER_USE_OPENSSL="$receipt_crypto" \
  "${receipt_cflags[@]}" "${receipt_sources[@]}" "${receipt_libs[@]}" -o "$receipt_root/receipt-$receipt_crypto"
 "$receipt_root/receipt-$receipt_crypto"
done
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
