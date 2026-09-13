#!/usr/bin/env bash
# 파일 용도: S08-B1 실제 journal focused; 전용 mktemp root만 정리한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
node -e 'const f=require("fs"),a=require("assert/strict"),m=JSON.parse(f.readFileSync(process.argv[1],"utf8"));a.equal(m.schema,"media-server.recording-recovery-test-manifest.v1");a.equal(m.cases.length,17);for(let i=0;i<17;i++){const c=m.cases[i];a.equal(c.id,`V410-S08-B1-${String(i+1).padStart(2,"0")}`);a.ok(typeof c.lastSuccessfulStep==="string"&&c.lastSuccessfulStep.length>0);a.ok(typeof c.expectedOutcome==="string"&&c.expectedOutcome.length>0)}console.log("[manifest] 17 registered recovery definitions validated")' "${ROOT_DIR}/test/fixtures/recording/v1/recovery/manifest.json"
BUILD_DIR="$(mktemp -d /private/tmp/media-server-s08-b1-XXXXXX 2>/dev/null || mktemp -d /tmp/media-server-s08-b1-XXXXXX)"
cleanup() {
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const b=size(r);f.rmSync(r,{recursive:true,force:true});if(f.existsSync(r))process.exit(1);console.log(`[cleanup] path=${r} bytes=${b} removed=true`)' "$BUILD_DIR"
}
trap cleanup EXIT
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/recording_recovery_smoke.cpp" "${ROOT_DIR}/src/recording/recording_journal.cpp" \
  "${ROOT_DIR}/src/recording/recording_catalog.cpp" "${ROOT_DIR}/src/recording/retention_coordinator.cpp" \
 "${ROOT_DIR}/src/recording/recording_finalize_recovery.cpp" \
 "${ROOT_DIR}/src/recording/recording_media_inspector.cpp" \
  -DMEDIA_SERVER_USE_SQLITE3=0 \
  "${ROOT_DIR}/src/recording/recording_derived_job.cpp" "${ROOT_DIR}/src/recording/recording_derived_job_ready.cpp" "${ROOT_DIR}/src/recording/recording_contracts.cpp" "${ROOT_DIR}/src/domain/strict_json.cpp" \
  -o "${BUILD_DIR}/recording_recovery_smoke"
"${BUILD_DIR}/recording_recovery_smoke" "$BUILD_DIR" "$@"
