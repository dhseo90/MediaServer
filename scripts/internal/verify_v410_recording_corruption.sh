#!/usr/bin/env bash
# 파일 용도: S08-B2a 실제 catalog focused. 자동 파일 손상 검출은 검사하지 않는다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MODE="${1:-}"
node -e 'const a=require("assert/strict"),f=require("fs"),m=JSON.parse(f.readFileSync(process.argv[1],"utf8"));a.equal(m.schema,"media-server.recording-corruption-test-manifest.v1");a.equal(m.cases.length,14);m.cases.forEach((c,i)=>{a.equal(c.id,`V410-S08-B2a-${String(i+1).padStart(2,"0")}`);a.ok(c.lastSuccessfulStep&&c.expectedOutcome)});console.log("[manifest] 14 state transition definitions validated")' "${ROOT_DIR}/test/fixtures/recording/v1/recovery/corruption-manifest.json"
if [[ $# -gt 1 || ( -n "$MODE" && "$MODE" != --red && "$MODE" != --red-order ) ]]; then exit 2; fi
RUN_DIR="$(mktemp -d /private/tmp/media-server-s08-b2a-XXXXXX 2>/dev/null || mktemp -d /tmp/media-server-s08-b2a-XXXXXX)"
cleanup() {
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function bytes(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+bytes(p.join(x,k)),0):s.size}const b=bytes(r);f.rmSync(r,{recursive:true,force:true});if(f.existsSync(r))process.exit(1);console.log(`[cleanup] path=${r} bytes=${b} removed=true`)' "$RUN_DIR"
}
trap cleanup EXIT
read -r -a SQLITE_FLAGS <<< "$(pkg-config --cflags --libs sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
 "${SCRIPT_DIR}/recording_corruption_smoke.cpp" "${ROOT_DIR}/src/recording/recording_catalog.cpp" \
 "${ROOT_DIR}/src/recording/recording_finalize_recovery.cpp" \
 "${ROOT_DIR}/src/recording/recording_media_inspector.cpp" \
 "${ROOT_DIR}/src/recording/recording_journal.cpp" "${ROOT_DIR}/src/recording/recording_derived_job.cpp" "${ROOT_DIR}/src/recording/recording_contracts.cpp" \
 "${ROOT_DIR}/src/recording/retention_coordinator.cpp" "${ROOT_DIR}/src/domain/strict_json.cpp" \
 -DMEDIA_SERVER_USE_SQLITE3=1 -DB2A_RED_ONLY="$([[ "$MODE" == --red ]] && echo 1 || echo 0)" \
 "${SQLITE_FLAGS[@]}" -o "$RUN_DIR/smoke"
"$RUN_DIR/smoke" "$RUN_DIR" "$MODE"
