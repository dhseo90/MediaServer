#!/usr/bin/env bash
# 파일 용도: LP26-O10 소유 복제본·synthetic 원장 단회 진단. 제품 source/데이터를 쓰지 않는다.
set -euo pipefail
probe_selection=""
probe_mode="cost"
if [[ "$#" == 1 && "$1" == --run ]];then :
elif [[ "$#" == 2 && "$1" == --case && "$2" =~ ^(16|1020|2048|2049)$ ]];then probe_selection="$2"
elif [[ "$#" == 2 && "$1" == --ownership-case && "$2" =~ ^(16|1020|2048|2049)$ ]];then probe_selection="$2";probe_mode="ownership"
else echo 'usage: accumulation-probe --run | --case 16|1020|2048|2049 | --ownership-case 16|1020|2048|2049' >&2; exit 2;fi
probe_scripts="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
probe_repo="$(cd "$probe_scripts/../.." && pwd)"
probe_root="$(mktemp -d "${TMPDIR:-/tmp}/media-server-catalog-cost.XXXXXX")"
probe_root="$(cd "$probe_root" && pwd -P)"
chmod 700 "$probe_root"
probe_receipts="$probe_repo/docs/release-artifacts/v4.1.0/lp26-o10-accumulation-20260923"
[[ -d "$probe_receipts" && ! -L "$probe_receipts" ]] || exit 2
export MEDIA_SERVER_ACCUMULATION_RECEIPT="$probe_receipts/o28-accumulation-$(basename "$probe_root").json"
SECONDS=0
cleanup(){
 local result=$? cleanup_result=0
 trap - EXIT
 PROBE_PRIOR="$result" node - "$probe_root" <<'NODE' || cleanup_result=$?
const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=process.argv[2];
if(!/^media-server-catalog-cost\.[A-Za-z0-9]+$/.test(path.basename(root))||fs.realpathSync(root)!==root||fs.lstatSync(root).isSymbolicLink())throw Error('cleanup-ownership');
if(Number(process.env.PROBE_PRIOR)!==0){console.log('[cleanup] '+JSON.stringify({preserved:true,reason:'failed-run'}));process.exit(0);}
if(!fs.existsSync(path.join(root,'.receipt-preserved'))){console.log('[cleanup] '+JSON.stringify({preserved:true,reason:'evidence-missing'}));process.exit(1);}
const receiptBytes=fs.readFileSync(process.env.MEDIA_SERVER_ACCUMULATION_RECEIPT),marker=fs.readFileSync(path.join(root,'.receipt-preserved'),'utf8'),receipt=JSON.parse(receiptBytes).receipt;
if(crypto.createHash('sha256').update(receiptBytes).digest('hex')!==marker||receipt?.outcome!=='pass'||receipt?.groupClosed!==true||receipt?.manifestUnchanged!==true){console.log('[cleanup] '+JSON.stringify({preserved:true,reason:'evidence-unverified'}));process.exit(1);}
function size(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,k)=>n+size(path.join(p,k)),0):s.size;}
const bytes=size(root);fs.rmSync(root,{recursive:true});const absent=!fs.existsSync(root);console.log('[cleanup] '+JSON.stringify({root,bytes,absent}));if(!absent)process.exitCode=1;
NODE
 if ((cleanup_result));then result=2;fi
 printf '[exit] code=%s elapsed_seconds=%s source=bash-SECONDS token_usage=unavailable\n' "$result" "$SECONDS"
 exit "$result"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$probe_root/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$probe_root/registry.bin" GST_REGISTRY_1_0="$probe_root/registry.bin"
export MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE=0
source "$probe_scripts/env_common.sh"
media_server_apply_homebrew_gst_env
git -C "$probe_repo" rev-parse HEAD
uname -sm
"${CXX:-c++}" --version
pkg-config --modversion gstreamer-1.0 sqlite3 openssl
shasum -a 256 "$probe_scripts/recording_accumulation_probe.cpp" "$probe_scripts/recording_accumulation_run.mjs" "$probe_scripts/recording_accumulation_prepare.mjs" "$probe_scripts/recording_current_observer.mjs"
if [[ "$probe_mode" == ownership ]];then
 node "$probe_scripts/recording_catalog_comparison_instrument.cjs" "$probe_repo" "$probe_root"
else
 node "$probe_scripts/recording_catalog_cost_probe_instrument.cjs" "$probe_repo" "$probe_root"
fi
node "$probe_scripts/recording_accumulation_prepare.mjs" "$probe_repo" "$probe_root"
cmake --build "$probe_repo/build-gst-onnx" --target media_server_runtime --parallel 2
runtime_archive="$probe_repo/build-gst-onnx/libmedia_server_runtime.a"
test -f "$runtime_archive"
printf '[linked-archive] testId=LP26-O14-C source=cmake-target:media_server_runtime archive=%s sha256=%s\n' \
 "$runtime_archive" "$(shasum -a 256 "$runtime_archive" | awk '{print $1}')"
read -r -a probe_flags <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0 sqlite3 openssl)"
ownership_flags=(-DMEDIA_SERVER_ACCUMULATION_COST=1);if [[ "$probe_mode" == ownership ]];then ownership_flags=(-DMEDIA_SERVER_ACCUMULATION_OWNERSHIP=1);fi
node "$probe_scripts/recording_catalog_cost_bounded.cjs" 60 "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread \
 -I"$probe_root/include" -I"$probe_repo/include" -I"$probe_root" -I"$probe_scripts" -I"$probe_repo/src/recording" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
 "${ownership_flags[@]}" \
 "$probe_scripts/recording_accumulation_probe.cpp" "$probe_repo/src/recording/gstreamer_segment_writer.cpp" \
 "$probe_root/recording_catalog.cpp" "$probe_root/recording_journal.cpp" "$probe_root/recording_contracts.cpp" \
 "$probe_repo/src/recording/recording_finalize_recovery.cpp" "$probe_repo/src/recording/recording_file_evidence.cpp" "$probe_repo/src/recording/recording_media_inspector.cpp" \
 "$probe_repo/src/recording/recording_derived_job.cpp" "$probe_repo/src/recording/recording_derived_job_ready.cpp" \
 "$probe_repo/src/recording/retention_coordinator.cpp" "$probe_repo/src/domain/strict_json.cpp" \
 "$probe_repo/build-gst-onnx/libmedia_server_runtime.a" "${probe_flags[@]}" -lz -o "$probe_root/probe"
read -r -a probe_link < "$probe_repo/build-gst-onnx/CMakeFiles/media_server.dir/link.txt"
probe_libs=();probe_found=0
for token in "${probe_link[@]}";do
 if [[ "$token" == libmedia_server_runtime.a ]];then probe_found=1;probe_libs+=("$probe_repo/build-gst-onnx/$token");continue;fi
 if ((probe_found));then probe_libs+=("$token");fi
done
test "$probe_found" = 1
node "$probe_scripts/recording_catalog_cost_bounded.cjs" 60 "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$probe_repo/include" -I"$probe_scripts" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
 "$probe_scripts/recording_current_observer_native.cpp" "${probe_flags[@]}" "${probe_libs[@]}" -o "$probe_root/normalize"
node "$probe_scripts/recording_catalog_cost_bounded.cjs" 60 "${CXX:-c++}" -std=c++17 "$probe_scripts/recording_process_metrics.cpp" -o "$probe_root/metrics"
if [[ "$probe_mode" == ownership ]];then node "$probe_scripts/recording_accumulation_run.mjs" "$probe_root" "$probe_selection" ownership
elif [[ -n "$probe_selection" ]];then node "$probe_scripts/recording_accumulation_run.mjs" "$probe_root" "$probe_selection"
else node "$probe_scripts/recording_accumulation_run.mjs" "$probe_root";fi
