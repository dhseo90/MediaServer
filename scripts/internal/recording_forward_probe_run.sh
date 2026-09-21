#!/usr/bin/env bash
# 파일 용도: 실제 writer 경계 계측. 기존 mux 설정을 바꾸지 않으며 실행 전 등록된 FW01~04만 수행한다.
set -euo pipefail
probe_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
probe_repo="$(cd "$probe_script/../.." && pwd)"
probe_dest="$probe_repo/docs/release-artifacts/v4.1.0/s11-preparation-mapping/forward-probe-data"
if [[ "${1:-}" != --run ]]; then
  mkdir -p "$probe_dest"
  bash "$probe_script/recording_forward_probe_run.sh" --run 2>&1 | tee "$probe_dest/forward-probe-output.txt"
  exit $?
fi
probe_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
probe_run="$(mktemp -d "$probe_parent/media-server-forward-probe.XXXXXX")"
SECONDS=0
mkdir -p "$probe_dest"
cleanup() {
  local result=$?
  trap - EXIT
  node - "$probe_run" "$probe_parent" "$probe_dest" "$result" <<'NODE'
const fs=require('fs'),p=require('path');const [root,parent,dest,exit]=process.argv.slice(2);
if(p.dirname(root)!==parent||!/^media-server-forward-probe\.[A-Za-z0-9]+$/.test(p.basename(root))||fs.lstatSync(root).isSymbolicLink())throw Error('cleanup containment');
let exported=0;
for(const id of ['TP01','TP02','TP03','TP04']){
 const dir=p.join(root,id);if(!fs.existsSync(dir))continue;
 const out=p.join(dest,id);fs.mkdirSync(out,{recursive:true});
 for(const name of fs.readdirSync(dir)){
  if(!/^(input|manifest|segment-\d+-(demux|parse)|forward-\d+-(accepted|mux|events|binding|mapping))\.csv$/.test(name)&&!/^forward-\d+-native\.json$/.test(name))continue;
  const file=p.join(dir,name),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2*1024*1024)throw Error('export file bound');
  const data=fs.readFileSync(file),text=data.toString('utf8');
  if(/(?:rtsp|https?):\/\/|password|token|authorization/i.test(text))throw Error('export redaction');
  fs.writeFileSync(p.join(out,name),data);if(!fs.readFileSync(p.join(out,name)).equals(data))throw Error('export comparison');exported++;
 }
}
function size(file){const stat=fs.lstatSync(file);return stat.isDirectory()?fs.readdirSync(file).reduce((sum,n)=>sum+size(p.join(file,n)),0):stat.size}
const bytes=size(root);fs.rmSync(root,{recursive:true});const removed=!fs.existsSync(root);
console.log(`[evidence] exported=${exported} raw_media_preserved=false run_exit=${exit}`);
console.log(`[cleanup] path=${root} bytes=${bytes} removed=${removed}`);if(!removed)process.exit(1);
NODE
  local cleanup_result=$?
  printf '[elapsed] seconds=%s source=bash-SECONDS\n' "$SECONDS"
  if [[ "$cleanup_result" -ne 0 ]]; then exit "$cleanup_result"; fi
  exit "$result"
}
trap cleanup EXIT
printf '[run] root=%s scope=FW01-FW04\n' "$probe_run"
source "$probe_script/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a probe_flags <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0 sqlite3 openssl)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$probe_repo/include" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
  "$probe_script/recording_forward_probe_main.cpp" "$probe_script/recording_forward_probe_writer.cpp" \
  "$probe_repo/src/recording/recording_catalog.cpp" "$probe_repo/src/recording/recording_journal.cpp" \
  "$probe_repo/src/recording/recording_finalize_recovery.cpp" "$probe_repo/src/recording/recording_file_evidence.cpp" "$probe_repo/src/recording/recording_media_inspector.cpp" \
  "$probe_repo/src/recording/recording_derived_job.cpp" "$probe_repo/src/recording/recording_derived_job_ready.cpp" \
  "$probe_repo/src/recording/recording_contracts.cpp" "$probe_repo/src/recording/retention_coordinator.cpp" \
  "$probe_repo/src/domain/strict_json.cpp" "${probe_flags[@]}" -o "$probe_run/probe"
"$probe_run/probe" "$probe_run"
node "$probe_script/recording_forward_probe_verify.cjs" "$probe_run"
