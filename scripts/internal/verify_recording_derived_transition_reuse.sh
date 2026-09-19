#!/usr/bin/env bash
# 내부 검증 전용: 소유 root의 source/header 복제본만 계측한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-transition-reuse.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
chmod 700 "$RUN_DIR"
SECONDS=0
cleanup(){
 local result=$?
 trap - EXIT
 local cleanup_result=0
 node - "$RUN_DIR" <<'NODE' || cleanup_result=$?
const fs=require('fs'),path=require('path'),root=process.argv[2];
if(!/^media-server-transition-reuse\.[A-Za-z0-9]+$/.test(path.basename(root))||fs.lstatSync(root).isSymbolicLink()||fs.realpathSync(root)!==root)throw Error('cleanup ownership');
function size(p){const s=fs.lstatSync(p);if(s.isSymbolicLink())return s.size;return s.isDirectory()?fs.readdirSync(p).reduce((sum,n)=>sum+size(path.join(p,n)),0):s.size;}
const bytes=size(root);fs.rmSync(root,{recursive:true});console.log('[cleanup] '+JSON.stringify({root,bytes,removed:!fs.existsSync(root)}));if(fs.existsSync(root))process.exitCode=1;
NODE
 if ((cleanup_result != 0));then echo "[cleanup] failed=true code=$cleanup_result";result=1;fi
 echo "[exit] code=$result elapsed_seconds=$SECONDS source=bash-SECONDS"
 exit "$result"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$RUN_DIR/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$RUN_DIR/registry.bin" GST_REGISTRY_1_0="$RUN_DIR/registry.bin"
unset GST_PLUGIN_PATH GST_PLUGIN_PATH_1_0 GST_PLUGIN_SYSTEM_PATH GST_PLUGIN_SYSTEM_PATH_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY MEDIA_SERVER_GST_MANAGED_PLUGIN_PATH MEDIA_SERVER_GST_INPUT_PLUGIN_PATH
export MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE=0
source "$SCRIPT_DIR/env_common.sh"
media_server_apply_homebrew_gst_env
node - "$ROOT_DIR" "$RUN_DIR" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),[repo,out]=process.argv.slice(2);
const exact=(s,a,b)=>{if(s.split(a).length!==2)throw Error('exact instrumentation');return s.replace(a,b);};
fs.mkdirSync(path.join(out,'include/recording'),{recursive:true});
const header=fs.readFileSync(path.join(repo,'include/recording/recording_catalog.h'),'utf8');
fs.writeFileSync(path.join(out,'include/recording/recording_catalog.h'),exact(header,'private:','public: // owned verification copy'));
fs.writeFileSync(path.join(out,'include/recording/recording_journal.h'),exact(fs.readFileSync(path.join(repo,'include/recording/recording_journal.h'),'utf8'),'private:','public: // owned verification copy'));
fs.writeFileSync(path.join(out,'recording_derived_transition_counter.h'),'#pragma once\n#include <array>\n#include <cstdint>\n#include <cstdlib>\nnamespace reuse_probe { inline bool enabled=false;inline std::uint64_t parses=0;inline std::array<std::uint64_t,5> updates{},parse_counts{};struct Measure { bool active;unsigned state;std::uint64_t before; explicit Measure(unsigned s):active(enabled),state(s),before(parses){if(active&&state>=updates.size())std::abort();} ~Measure(){if(active){++updates[state];parse_counts[state]+=parses-before;}}};}\n');
for(const name of ['recording_catalog.cpp','recording_derived_job_ready.cpp']){
 const original=fs.readFileSync(path.join(repo,'src/recording',name),'utf8');let text=original;
 if(name==='recording_catalog.cpp')text=exact(text,'bool RecordingCatalog::UpdateDerivedJob(const void* owner,const DerivedJobRecordV1& record,std::string* error) {','bool RecordingCatalog::UpdateDerivedJob(const void* owner,const DerivedJobRecordV1& record,std::string* error) { reuse_probe::Measure measured(static_cast<unsigned>(record.state));');
 else text=exact(text,'bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) {','bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) { if(reuse_probe::enabled)++reuse_probe::parses;');
 fs.writeFileSync(path.join(out,name),'#include "recording_derived_transition_counter.h"\n'+text);
 console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(original).digest('hex')}));
}
console.log('[environment] ownedCache=true ownedRegistry=true privateHeaderCopy=true productSerializerUnchanged=true');
NODE
read -r -a ORIGINAL_LINK < "$BUILD_DIR/CMakeFiles/media_server.dir/link.txt"
LINK_LIBS=();found=0
for token in "${ORIGINAL_LINK[@]}";do
 if [[ "$token" == libmedia_server_runtime.a ]];then found=1;LINK_LIBS+=("$BUILD_DIR/$token");continue;fi
 if ((found));then LINK_LIBS+=("$token");fi
done
test "$found" = 1
read -r -a FLAGS <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$RUN_DIR/include" -I"$ROOT_DIR/include" -I"$RUN_DIR" -I"$SCRIPT_DIR" -I"$ROOT_DIR/src/recording" "${FLAGS[@]}" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
 "$SCRIPT_DIR/recording_derived_transition_reuse_smoke.cpp" "$RUN_DIR/recording_catalog.cpp" "$RUN_DIR/recording_derived_job_ready.cpp" \
 "${LINK_LIBS[@]}" -o "$RUN_DIR/check"
"$RUN_DIR/check" "$RUN_DIR"
