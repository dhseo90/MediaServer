#!/usr/bin/env bash
# LP15 소유 source 복제본 계측. 제품 파일/원장은 변경하지 않는다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-checkpoint-cache.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
chmod 700 "$RUN_DIR"
SECONDS=0
cleanup(){
 local result=$? cleanup_result=0
 trap - EXIT
 node - "$RUN_DIR" <<'NODE' || cleanup_result=$?
const fs=require('fs'),path=require('path'),root=process.argv[2];
if(!/^media-server-checkpoint-cache\.[A-Za-z0-9]+$/.test(path.basename(root))||fs.lstatSync(root).isSymbolicLink()||fs.realpathSync(root)!==root)throw Error('cleanup ownership');
function size(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,x)=>n+size(path.join(p,x)),0):s.size;}
const bytes=size(root);fs.rmSync(root,{recursive:true});console.log('[cleanup] '+JSON.stringify({root,bytes,removed:!fs.existsSync(root)}));if(fs.existsSync(root))process.exitCode=1;
NODE
 if ((cleanup_result != 0));then echo "[cleanup] failed=true code=$cleanup_result";result=2;fi
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
const original=fs.readFileSync(path.join(repo,'src/recording/recording_catalog.cpp'),'utf8');
fs.mkdirSync(path.join(out,'include/recording'),{recursive:true});
fs.writeFileSync(path.join(out,'include/recording/recording_catalog.h'),exact(fs.readFileSync(path.join(repo,'include/recording/recording_catalog.h'),'utf8'),'private:','public: // owned test copy'));
let source=exact(original,'bool RecordingCatalog::CheckpointLocked(bool recover_only,std::string* error,const DerivedJobContentProof* proof) {','bool RecordingCatalog::CheckpointLocked(bool recover_only,std::string* error,const DerivedJobContentProof* proof) { cache_probe::Scope cache_scope;');
source=exact(source,'    if(!journal_.ReadCheckpointRecords(this,&original,error))return false;','    if(!journal_.ReadCheckpointRecords(this,&original,error))return false;if(cache_probe::bad_suffix)original.push_back(std::make_shared<const RecordingMutationV1>(*cache_probe::bad_suffix));');
source=exact(source,'if(before->ProjectionSignatureLocked()!=after->ProjectionSignatureLocked())','if(cache_probe::mismatch||before->ProjectionSignatureLocked()!=after->ProjectionSignatureLocked())');
source=exact(source,'    const auto first=reuse?cached->prefix.size():0;','    const auto first=reuse?cached->prefix.size():0; cache_scope.first=first;cache_scope.records=original.size();');
source=exact(source,'    if(!journal_.CommitCheckpoint(this,candidate,recover_only,error))return false;','    if(cache_probe::fail_commit||!journal_.CommitCheckpoint(this,candidate,recover_only,error))return false;');
source=exact(source,'bool RecordingCatalog::UpdateDerivedJob(const void* owner,const DerivedJobRecordV1& record,std::string* error) {\n    recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__);','bool RecordingCatalog::UpdateDerivedJob(const void* owner,const DerivedJobRecordV1& record,std::string* error) {\n    recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__); cache_probe::Hold hold_scope;');
source=exact(source,'std::string* error,PreparedDerivedMutation* prepared,RecordingMutationHandle owned,\n                                           const SourceBindingPool* binding_pool,const DerivedJobPool* job_pool,const DerivedJobContentProof* proof) {',
 'std::string* error,PreparedDerivedMutation* prepared,RecordingMutationHandle owned,\n                                           const SourceBindingPool* binding_pool,const DerivedJobPool* job_pool,const DerivedJobContentProof* proof) {\n    if(cache_probe::depth){++cache_probe::applied;if(cache_probe::throw_apply)throw std::runtime_error("owned-injection");}');
fs.writeFileSync(path.join(out,'recording_checkpoint_cache_counter.h'),`#pragma once
#include <array>
#include <chrono>
#include <cstddef>
#include <stdexcept>
#include <optional>
#include "recording/recording_journal.h"
namespace cache_probe {
using Clock=std::chrono::steady_clock;
inline thread_local std::size_t depth=0,applied=0;
inline bool fail_commit=false,throw_apply=false,mismatch=false;
inline std::optional<recording::RecordingMutationV1> bad_suffix;
struct Row{std::size_t records,first,applied;long long us;};
inline std::array<Row,128> rows{};inline std::size_t count=0,dropped=0,holds=0;inline long long max_hold_us=0;
struct Scope{std::size_t before=applied,first=0,records=0;Clock::time_point start=Clock::now();Scope(){++depth;}~Scope(){--depth;const Row row{records,first,applied-before,std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-start).count()};if(count<rows.size())rows[count++]=row;else ++dropped;}};
struct Hold{Clock::time_point start=Clock::now();~Hold(){++holds;const auto us=std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-start).count();if(us>max_hold_us)max_hold_us=us;}};
}
`);
fs.writeFileSync(path.join(out,'recording_catalog.cpp'),'#include "recording_checkpoint_cache_counter.h"\n'+source);
for(const name of ['include/recording/recording_catalog.h','src/recording/recording_catalog.cpp','src/recording/recording_checkpoint_validation.h','scripts/internal/recording_checkpoint_cache_smoke.cpp','scripts/internal/verify_recording_checkpoint_cache.sh'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
console.log('[environment] ownedCache=true ownedRegistry=true productFilesUnchanged=true instrumentation=checkpoint-scope-apply-count');
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
 "$SCRIPT_DIR/recording_checkpoint_cache_smoke.cpp" "$RUN_DIR/recording_catalog.cpp" "${LINK_LIBS[@]}" -o "$RUN_DIR/check"
node - "$RUN_DIR" <<'NODE'
const fs=require('fs'),path=require('path'),{spawn}=require('child_process'),root=process.argv[2];
const child=spawn('/usr/bin/time',['-l',path.join(root,'check'),root],{stdio:['ignore','pipe','pipe'],detached:true});
let limit=false,bytes=0,force,stderr='';
function stop(){limit=true;try{process.kill(-child.pid,'SIGTERM');}catch{}if(!force)force=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},2000);}
for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{bytes+=b.length;if(bytes>4*1024*1024){stop();return;}process.stdout.write(b);});
child.stderr.on('data',b=>{if(stderr.length<4*1024*1024)stderr+=b.toString();});
function size(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,x)=>n+size(path.join(p,x)),0):s.size;}
const disk=setInterval(()=>{try{if(size(root)>512*1024*1024)stop();}catch{stop();}},200);
const timer=setTimeout(stop,60000);child.on('error',()=>{limit=true;});
child.on('close',(code,signal)=>{clearInterval(disk);clearTimeout(timer);clearTimeout(force);const match=stderr.match(/(\d+)\s+maximum resident set size/);const peakRssBytes=match?Number(match[1]):null;const rssPass=peakRssBytes!==null&&peakRssBytes<=512*1024*1024;console.log((rssPass?'[pass] ':'[fail] ')+'LP15-C04 peakRSS bytes='+peakRssBytes+' cap=536870912');console.log('[bounded] '+JSON.stringify({code,signal,limit,outputBytes:bytes,runtimeCapSeconds:60,diskCapBytes:536870912,peakRssBytes}));process.exitCode=limit||!rssPass?2:code===0?0:code===1?1:2;});
NODE
