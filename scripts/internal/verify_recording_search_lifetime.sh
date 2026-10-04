#!/usr/bin/env bash
# 파일 용도: 불변 검색 페이지·idle 만료·종료의 단기 native 검사. 서버/포트 없음.
set -euo pipefail
task_repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
task_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
task_root="$(mktemp -d "$task_parent/media-server-search-lifetime.XXXXXX")"
task_identity="$(node -e 'const s=require("fs").lstatSync(process.argv[1]);console.log(`${s.dev}:${s.ino}:${s.uid}`)' "$task_root")"
cleanup(){
 local prior=$?
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],s=f.lstatSync(r);if(p.dirname(r)!==process.argv[2]||!/^media-server-search-lifetime\.[A-Za-z0-9]+$/.test(p.basename(r))||s.isSymbolicLink()||!s.isDirectory()||f.realpathSync(r)!==r||`${s.dev}:${s.ino}:${s.uid}`!==process.argv[3]||s.uid!==process.getuid())throw Error("cleanup-ownership");f.rmSync(r,{recursive:true});if(f.existsSync(r))throw Error("cleanup-remains");console.log(`[cleanup] path=${r} removed=true`)' "$task_root" "$task_parent" "$task_identity" || return 1
 return "$prior"
}
trap cleanup EXIT
cd "$task_repo"
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
uname -sm
"${CXX:-c++}" --version | head -1
task_sources=(src/recording/recording_search_model.cpp src/recording/recording_search_snapshots.cpp scripts/internal/recording_search_cursor_smoke.cpp)
shasum -a 256 "${task_sources[@]}" include/recording/recording_search_model.h include/recording/recording_search_snapshots.h scripts/internal/verify_recording_search_lifetime.sh
read -r -a task_flags <<<"$(pkg-config --cflags openssl)"
read -r -a task_libs <<<"$(pkg-config --libs openssl)"
for task_crypto in 1 0; do
 echo "[config] crypto=$task_crypto"
 "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -Iinclude -DMEDIA_SERVER_USE_OPENSSL="$task_crypto" \
   "${task_flags[@]}" "${task_sources[@]}" "${task_libs[@]}" -o "$task_root/cursor-$task_crypto"
 "$task_root/cursor-$task_crypto"
done
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
