#!/usr/bin/env bash
# 파일 용도: 제품 코드를 직접 링크한 파일 시각 측정 및 소유 임시 산출물 정리.
set -euo pipefail
profile_suffix=""
if [[ ${1:-} == --track-only && $# == 1 ]]; then
  export MEDIA_SERVER_TIMING_PROFILE_TRACK_ONLY=1
  profile_suffix="-track"
elif (( $# != 0 )); then
  exit 2
else
  unset MEDIA_SERVER_TIMING_PROFILE_TRACK_ONLY
fi
probe_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
probe_repo="$(cd "$probe_script/../.." && pwd)"
probe_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
probe_run="$(mktemp -d "$probe_parent/media-server-timing-profile.XXXXXX")"
SECONDS=0
cleanup() {
  # 성공·실패 모두 numeric/hash 원출력을 먼저 보존한다. 미생성 파일은 복원하지 않는다.
  node - "$probe_run" "$probe_repo/docs/release-artifacts/v4.1.0/s11-preparation-mapping/timing-profile${profile_suffix}-data" <<'NODE'
const fs=require('fs'),p=require('path'),crypto=require('crypto');const [root,dest]=process.argv.slice(2);fs.mkdirSync(dest,{recursive:true});const manifest=['path,bytes,sha256'];for(const name of fs.readdirSync(root)){const input=p.join(root,name);if(fs.lstatSync(input).isDirectory()&&/^([NT]P|NP-T)0[1-4](-L)?$/.test(name)){fs.mkdirSync(p.join(dest,name),{recursive:true});for(const f of fs.readdirSync(input))if(f.endsWith('.csv')||f.endsWith('.json'))copy(p.join(name,f));}else if(name.endsWith('.log'))copy(name);}function copy(rel){const a=fs.readFileSync(p.join(root,rel));fs.writeFileSync(p.join(dest,rel),a);if(!a.equals(fs.readFileSync(p.join(dest,rel))))throw Error('copy mismatch');manifest.push(rel+','+a.length+','+crypto.createHash('sha256').update(a).digest('hex'));}fs.writeFileSync(p.join(dest,'manifest.csv'),manifest.join('\n')+'\n');console.log('[evidence] copied='+ (manifest.length-1)+' verified=true');
NODE
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];if(p.dirname(r)!==process.argv[2]||!/^media-server-timing-profile\.[A-Za-z0-9]+$/.test(p.basename(r))||f.lstatSync(r).isSymbolicLink())throw Error("cleanup containment");function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$probe_run" "$probe_parent"
  printf '[elapsed] seconds=%s source=bash-SECONDS\n' "$SECONDS"
}
trap cleanup EXIT
source "$probe_script/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a probe_flags <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0 sqlite3 openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$probe_repo/include" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
  "$probe_script/recording_timing_profile_probe.cpp" "$probe_script/recording_timing_profile_writer.cpp" \
  "$probe_repo/src/recording/recording_catalog.cpp" "$probe_repo/src/recording/recording_journal.cpp" \
  "$probe_repo/src/recording/recording_finalize_recovery.cpp" "$probe_repo/src/recording/recording_media_inspector.cpp" \
  "$probe_repo/src/recording/recording_derived_job.cpp" "$probe_repo/src/recording/recording_derived_job_ready.cpp" "$probe_repo/src/recording/recording_contracts.cpp" "$probe_repo/src/recording/retention_coordinator.cpp" \
  "$probe_repo/src/domain/strict_json.cpp" "${probe_flags[@]}" -o "$probe_run/probe"
set +e
GST_DEBUG_NO_COLOR=1 GST_DEBUG=2 "$probe_run/probe" "$probe_run" 2>&1 | tee "$probe_run/capture.log"
profile_capture_exit=${PIPESTATUS[0]}
node "$probe_script/recording_timing_profile_analyze.js" "$probe_run" 2>&1 | tee "$probe_run/analyze.log"
profile_analyze_exit=${PIPESTATUS[0]}
set -e
printf '[exit] capture=%s analyze=%s\n' "$profile_capture_exit" "$profile_analyze_exit"
if (( profile_capture_exit != 0 || profile_analyze_exit != 0 )); then exit 1; fi
