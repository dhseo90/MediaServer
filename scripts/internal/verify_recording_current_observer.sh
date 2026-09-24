#!/usr/bin/env bash
# 파일 용도: 현행 관측 준비/120분 실행 연결. 기본 실행이나 짧은 시간을 120분으로 승격하지 않는다.
set -euo pipefail
case "$*" in
  --self-test|--app-observe|--diagnose-status-1020|--diagnose-status-1020-original|"--duration-minutes 120") ;;
  *) echo 'usage: current-observer --self-test | --app-observe | --diagnose-status-1020 | --diagnose-status-1020-original | --duration-minutes 120' >&2; exit 2 ;;
esac
observer_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
observer_repo="$(cd "$observer_script/../.." && pwd)"
observer_receipts="$observer_repo/docs/release-artifacts/v4.1.0/lp26-o10-accumulation-20260923"
[[ -d "$observer_receipts" && ! -L "$observer_receipts" ]] || exit 2
export MEDIA_SERVER_RECORDING_RECEIPT_DIR="$observer_receipts"
observer_run="$(mktemp -d "${TMPDIR:-/tmp}/media-server-current-observer-XXXXXX")"
observer_run="$(cd "$observer_run" && pwd -P)"
chmod 700 "$observer_run"
cleanup() {
  local prior=$?
  trap - EXIT
  OBSERVER_PRIOR="$prior" node - "$observer_run" <<'NODE'
const fs=require('fs'),path=require('path'),root=process.argv[2];
if(!path.basename(root).startsWith('media-server-current-observer-')||fs.realpathSync(root)!==root||fs.lstatSync(root).isSymbolicLink())throw Error('cleanup ownership');
if(Number(process.env.OBSERVER_PRIOR)!==0){console.log('[cleanup] '+JSON.stringify({preserved:true,reason:'failed-run'}));process.exit(0);}
if(fs.existsSync(path.join(root,'cleanup-blocked')))throw Error('cleanup blocker: preserve root');
function size(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,k)=>n+size(path.join(p,k)),0):s.size;}
const bytes=size(root);fs.rmSync(root,{recursive:true});const absent=!fs.existsSync(root);console.log('[cleanup] '+JSON.stringify({root,bytes,absent}));if(!absent)process.exit(1);
NODE
  exit "$prior"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$observer_run/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$observer_run/registry.bin" GST_REGISTRY_1_0="$observer_run/registry.bin"
source "$observer_script/env_common.sh"
media_server_apply_homebrew_gst_env
observer_build="$observer_repo/build-gst-onnx"
node - "$observer_repo" "$observer_build" <<'NODE'
const fs=require('fs'),path=require('path'),root=process.argv[2],build=process.argv[3];
const stamp=fs.statSync(path.join(build,'libmedia_server_runtime.a')).mtimeMs;
function check(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name),s=fs.statSync(p);if(s.isDirectory())check(p);else if(/\.(h|hpp|cpp)$/.test(name)&&s.mtimeMs>stamp)throw Error('stale-product-build');}}check(path.join(root,'include/recording'));check(path.join(root,'src/recording'));
NODE
read -r -a observer_link < "$observer_build/CMakeFiles/media_server.dir/link.txt"
observer_libs=();observer_found=0
for token in "${observer_link[@]}";do
  if [[ "$token" == libmedia_server_runtime.a ]];then observer_found=1;observer_libs+=("$observer_build/$token");continue;fi
  if ((observer_found));then observer_libs+=("$token");fi
done
test "$observer_found" = 1
read -r -a observer_flags <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
node --input-type=module - "$observer_repo" "$observer_run/catalog-instrumented.cpp" <<'NODE'
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const [repo,destination]=process.argv.slice(2),{instrumentCatalog}=await import(pathToFileURL(path.join(repo,'scripts/internal/recording_archive_diagnostic_profile.mjs'))),source=fs.readFileSync(path.join(repo,'src/recording/recording_catalog.cpp'),'utf8');
fs.writeFileSync(destination,instrumentCatalog(source),{flag:'wx',mode:0o600});
NODE
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$observer_repo/include" -I"$observer_repo/src/recording" "${observer_flags[@]}" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
  -include "$observer_script/recording_archive_phase_trace.h" "$observer_run/catalog-instrumented.cpp" \
  "$observer_script/recording_current_observer_native.cpp" "${observer_libs[@]}" -o "$observer_run/normalize"
if [[ "$1" == --self-test ]];then
  node "$observer_script/recording_current_observer.test.mjs" "$observer_run"
else
  c++ -std=c++17 "$observer_script/recording_process_metrics.cpp" -o "$observer_run/process-metrics"
  node "$observer_script/verify_recording_current_longrun.mjs" "$observer_run" "$@"
fi
