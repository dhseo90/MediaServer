#!/usr/bin/env bash
# 파일 용도: 서버/외부 호출 없이 실제 내부 선택 모듈의 단기 fixture를 실행한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-derived-selection.XXXXXX")"
BUILD_DIR="$(cd "$BUILD_DIR" && pwd -P)"
SECONDS=0
cleanup() {
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}if(!p.basename(r).startsWith("media-server-derived-selection.")||f.lstatSync(r).isSymbolicLink()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup containment");const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$BUILD_DIR" "${TMPDIR:-/tmp}"
  echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"
}
trap cleanup EXIT
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -I"$ROOT_DIR/include" \
  "$SCRIPT_DIR/recording_derived_selection_smoke.cpp" \
  "$ROOT_DIR/src/recording/recording_derived_selection.cpp" \
  "$ROOT_DIR/src/recording/recording_contracts.cpp" "$ROOT_DIR/src/domain/strict_json.cpp" -o "$BUILD_DIR/check"
"$BUILD_DIR/check"
