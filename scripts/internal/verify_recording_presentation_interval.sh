#!/usr/bin/env bash
# 파일 용도: 내부 정확 구간의 결정적 산술 검사. 파일 인증/실제 앱 통합 검사가 아니다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-presentation-interval.XXXXXX")"
cleanup() {
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];if(!p.basename(r).startsWith("media-server-presentation-interval.")||f.lstatSync(r).isSymbolicLink()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup containment");let bytes=0;for(const n of f.readdirSync(r)){const s=f.lstatSync(p.join(r,n));if(!s.isFile())throw Error("cleanup type");bytes+=s.size;}f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$RUN_DIR" "${TMPDIR:-/tmp}"
}
trap cleanup EXIT
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -I"$ROOT_DIR/include" "$SCRIPT_DIR/recording_presentation_interval_smoke.cpp" -o "$RUN_DIR/check"
"$RUN_DIR/check"
