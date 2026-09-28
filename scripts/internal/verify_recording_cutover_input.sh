#!/usr/bin/env bash
# 파일 용도: 녹화 카탈로그 cutover 입력 smoke의 빌드·실행·정리를 수행한다.
set -euo pipefail
input_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
input_repo="$(cd "$input_script/../.." && pwd)"
input_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
input_root="$(mktemp -d "$input_parent/media-server-cutover-input.XXXXXX")"
input_identity="$(node -e 'const s=require("fs").lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$input_root")"
input_cleanup() {
  local prior=$?
  if ! node -e '
const f=require("fs"),p=require("path"),root=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]),s=f.lstatSync(root);
if(p.dirname(root)!==parent||!/^media-server-cutover-input\.[A-Za-z0-9]+$/.test(p.basename(root))||!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.uid!==expected.uid||s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(root)!==root)throw Error("cleanup ownership mismatch");
function bytes(n){const t=f.lstatSync(n);return t.isDirectory()?f.readdirSync(n).reduce((a,k)=>a+bytes(p.join(n,k)),0):t.size;}
const size=bytes(root);f.rmSync(root,{recursive:true});if(f.existsSync(root))throw Error("cleanup remains");console.log(`[cleanup] path=${root} bytes=${size} removed=true`);' "$input_root" "$input_parent" "$input_identity"; then return 1; fi
  return "$prior"
}
trap input_cleanup EXIT
read -r -a input_flags <<< "$(pkg-config --cflags openssl)"
read -r -a input_libs <<< "$(pkg-config --libs openssl)"
input_sources=("$input_repo/src/domain/strict_json.cpp" "$input_repo/src/recording/recording_contracts.cpp" "$input_repo/src/recording/recording_journal.cpp" "$input_repo/src/recording/recording_cutover_input.cpp" "$input_script/recording_cutover_input_smoke.cpp")
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
uname -sm
"${CXX:-c++}" --version | head -n 1
shasum -a 256 "${input_sources[@]}" "$input_repo/include/recording/recording_cutover_input.h" "$input_script/verify_recording_cutover_input.sh"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$input_repo/include" -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=0 "${input_flags[@]}" "${input_sources[@]}" "${input_libs[@]}" -lz -o "$input_root/crypto"
"$input_root/crypto" "$input_root/fixtures-on"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$input_repo/include" -DMEDIA_SERVER_USE_OPENSSL=0 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=0 "${input_sources[@]}" -lz -o "$input_root/off"
"$input_root/off" "$input_root/fixtures-off"
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
