#!/usr/bin/env bash
# 파일 용도: 소유 임시 디렉터리에서 제품 내부 수락/최종화 단위검증을 실행한다.
set -euo pipefail
boundary_repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
boundary_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
boundary_run="$(mktemp -d "$boundary_parent/media-server-write-boundaries.XXXXXX")"
SECONDS=0
cleanup() {
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];if(p.dirname(r)!==process.argv[2]||!/^media-server-write-boundaries\.[A-Za-z0-9]+$/.test(p.basename(r))||f.lstatSync(r).isSymbolicLink())process.exit(2);function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$boundary_run" "$boundary_parent"
  echo "[elapsed] seconds=$SECONDS"
}
trap cleanup EXIT
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -I"$boundary_repo/include" "$boundary_repo/scripts/internal/recording_write_boundaries_smoke.cpp" -o "$boundary_run/check"
"$boundary_run/check" "$boundary_run"
