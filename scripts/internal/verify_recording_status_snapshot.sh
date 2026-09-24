#!/usr/bin/env bash
# 파일 용도: S11 상태 전용 checkpoint snapshot 집중 검사를 격리 빌드·정리한다.
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$script_dir/../.." && pwd)"
run="$(mktemp -d "${TMPDIR:-/tmp}/media-server-status-snapshot.XXXXXX")"
cleanup(){ node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=f.existsSync(r)?size(r):0;f.rmSync(r,{recursive:true,force:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$run"; }
trap cleanup EXIT
cp "$repo/src/recording/recording_catalog.cpp" "$run/recording_catalog.cpp"
node - "$run/recording_catalog.cpp" <<'NODE'
const fs=require('fs'),file=process.argv[2];let s=fs.readFileSync(file,'utf8');
const inject=(anchor,value)=>{if(!s.includes(anchor))return;s=s.replace(anchor,anchor+value)};
inject('CheckpointStatusGuard checkpoint_status(*this);','S11StatusCheckpointBarrier();if(S11StatusCheckpointForceFailure())return false;');
inject('bool RecordingCatalog::AdjustHoldCount(const std::string& segment_id,\n                                       std::int64_t delta,\n                                       std::string* error) {\n    recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__);','S11StatusOrdinaryBarrier();');
s='extern void S11StatusCheckpointBarrier();\nextern bool S11StatusCheckpointForceFailure();\nextern void S11StatusOrdinaryBarrier();\n'+s;fs.writeFileSync(file,s);
NODE
read -r -a sqlite_flags <<<"$(pkg-config --cflags --libs sqlite3)"
read -r -a crypto_flags <<<"$(pkg-config --cflags --libs openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$repo/include" -I"$repo/src/recording" \
 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
 "$script_dir/recording_status_snapshot_smoke.cpp" "$repo/src/recording/recording_journal.cpp" "$run/recording_catalog.cpp" \
 "$repo/src/recording/recording_read_service.cpp" "$repo/src/ingress/recording_application_service.cpp" \
 "$repo/src/recording/recording_finalize_recovery.cpp" "$repo/src/recording/recording_file_evidence.cpp" \
 "$repo/src/recording/recording_media_inspector.cpp" "$repo/src/recording/retention_coordinator.cpp" \
 "$repo/src/recording/recording_derived_job.cpp" "$repo/src/recording/recording_derived_job_ready.cpp" \
 "$repo/src/recording/recording_contracts.cpp" "$repo/src/recording/recording_timeline_projection.cpp" "$repo/src/domain/strict_json.cpp" \
 "${sqlite_flags[@]}" "${crypto_flags[@]}" -lz -o "$run/check"
"$run/check" "$run/store"
