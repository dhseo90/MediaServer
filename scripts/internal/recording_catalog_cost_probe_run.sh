#!/usr/bin/env bash
# FC01 임시 계측만 수행한다. 제품 source/저장 계약과 최적화 flags는 변경하지 않는다.
set -euo pipefail
fc_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fc_repo="$(cd "$fc_script/../.." && pwd)"
fc_label="${2:-baseline}"
[[ "$fc_label" =~ ^[a-zA-Z0-9-]+$ ]] || exit 2
if [[ "${1:-}" != --run ]]; then
 fc_label="${1:-baseline}"
 [[ "$fc_label" =~ ^[a-zA-Z0-9-]+$ ]] || exit 2
 fc_log="$fc_repo/docs/release-artifacts/v4.1.0/s11-preparation-mapping/catalog-cost-output-$fc_label.txt"
 [[ ! -e "$fc_log" ]] || { echo 'refusing existing output'; exit 2; }
 bash "$fc_script/recording_catalog_cost_probe_run.sh" --run "$fc_label" 2>&1 | node -e 'const fs=require("fs");const fd=fs.openSync(process.argv[1],"wx");let n=0;process.stdin.on("data",b=>{n+=b.length;if(n>2*1024*1024){console.error("output cap exceeded");process.exit(2)}fs.writeSync(fd,b);process.stdout.write(b)});process.stdin.on("end",()=>fs.closeSync(fd));' "$fc_log"
 exit $?
fi
fc_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
fc_root="$(mktemp -d "$fc_parent/media-server-catalog-cost.XXXXXX")"
SECONDS=0
cleanup(){
 local result=$?
 trap - EXIT
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];if(p.dirname(r)!==process.argv[2]||!/^media-server-catalog-cost\.[A-Za-z0-9]+$/.test(p.basename(r))||f.lstatSync(r).isSymbolicLink())throw Error("cleanup containment");function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$fc_root" "$fc_parent"
 printf '[exit] code=%s elapsed_seconds=%s token_usage=unavailable source=bash-SECONDS\n' "$result" "$SECONDS"
 exit "$result"
}
trap cleanup EXIT
printf '[run] label=%s owned_root=%s\n' "$fc_label" "$fc_root"
source "$fc_script/env_common.sh"
media_server_apply_homebrew_gst_env
"${CXX:-c++}" --version
uname -sm
pkg-config --modversion gstreamer-1.0 sqlite3 openssl
git -C "$fc_repo" rev-parse HEAD
shasum -a 256 "$fc_script/recording_catalog_cost_probe.cpp" "$fc_script/recording_catalog_cost_probe_timer.h" "$fc_script/recording_catalog_cost_probe_instrument.cjs" "$fc_script/recording_file_evidence_smoke.cpp" "$fc_repo/src/recording/recording_file_evidence.cpp"
fc_mode=cost
fc_main="$fc_script/recording_catalog_cost_probe.cpp"
fc_json="$fc_repo/src/domain/strict_json.cpp"
if [[ "$fc_label" == parse-* ]]; then
 fc_mode=parse
 fc_main="$fc_script/recording_catalog_parse_probe.cpp"
 fc_json="$fc_root/strict_json.cpp"
fi
if [[ "$fc_label" == compaction* ]]; then fc_main="$fc_script/recording_catalog_compaction_probe.cpp"; fi
fc_compile_prefix=()
if [[ "$fc_label" == scale-32* ]]; then
 fc_main="$fc_script/recording_catalog_scale_probe.cpp"
 fc_compile_prefix=(node "$fc_script/recording_catalog_cost_bounded.cjs" 60)
fi
shasum -a 256 "$fc_main" "$fc_script/recording_catalog_cost_probe_run.sh"
node "$fc_script/recording_catalog_cost_probe_instrument.cjs" "$fc_repo" "$fc_root" "$fc_mode"
read -r -a fc_flags <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0 sqlite3 openssl)"
"${fc_compile_prefix[@]}" "${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$fc_root/include" -I"$fc_repo/include" -I"$fc_script" -I"$fc_repo/src/recording" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_USE_OPENSSL=1 \
 "$fc_main" "$fc_repo/src/recording/gstreamer_segment_writer.cpp" \
 "$fc_root/recording_catalog.cpp" "$fc_root/recording_journal.cpp" "$fc_root/recording_contracts.cpp" \
 "$fc_repo/src/recording/recording_finalize_recovery.cpp" "$fc_repo/src/recording/recording_file_evidence.cpp" "$fc_repo/src/recording/recording_media_inspector.cpp" \
 "$fc_repo/src/recording/recording_derived_job.cpp" "$fc_repo/src/recording/recording_derived_job_ready.cpp" \
 "$fc_repo/src/recording/retention_coordinator.cpp" "$fc_json" "${fc_flags[@]}" -o "$fc_root/check"
if [[ "$fc_label" == scale-32* ]]; then
 node "$fc_script/recording_catalog_cost_bounded.cjs" 180 "$fc_root/check" "$fc_root"
else
 "$fc_root/check" "$fc_root"
fi
