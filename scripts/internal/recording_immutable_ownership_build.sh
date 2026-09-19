#!/usr/bin/env bash
# 호출자가 생성·정리하는 소유 root에서만 빌드. 실행은 별도 승인한다.
set -euo pipefail
lp_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
lp_repo="$(cd "$lp_script/../.." && pwd)"
lp_root="${1:?owned root required}"
lp_mode="${2:-envelope}"
if [[ "$lp_mode" != envelope && "$lp_mode" != job ]];then exit 2;fi
node - "$lp_repo" "$lp_root" "$lp_mode" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),[repo,out,mode]=process.argv.slice(2);
if(!/^media-server-immutable-ownership\.[A-Za-z0-9]+$/.test(path.basename(out))||fs.lstatSync(out).isSymbolicLink()||fs.realpathSync(out)!==out)throw Error('LP18_ROOT');
function exact(s,a,b){if(s.split(a).length!==2)throw Error('LP18_EXACT');return s.replace(a,b);}
fs.mkdirSync(path.join(out,'include/recording'),{recursive:true});
for(const name of ['recording_catalog.h','recording_journal.h']){const file=path.join(repo,'include/recording',name);fs.writeFileSync(path.join(out,'include/recording',name),exact(fs.readFileSync(file,'utf8'),'private:','public: // LP18 owned test copy'));}
const source=fs.readFileSync(path.join(repo,'src/recording/recording_journal.cpp'),'utf8');
const helper='\nnamespace ownership_probe { using History=decltype(std::declval<recording::RecordingCatalog::CheckpointProjectionCache>().prefix); History JournalView(const recording::RecordingJournal& j){std::lock_guard lock(j.mu_);return j.managed_state_->records;} }\n';
fs.writeFileSync(path.join(out,'recording_journal.cpp'),'#include "recording/recording_catalog.h"\n'+source+helper);
fs.writeFileSync(path.join(out,'ownership_flags'),source.includes('RecordingMutationHandles records;')?'-DLP18_SHARED_RECORDS=1':'');
const catalogHeader=fs.readFileSync(path.join(repo,'include/recording/recording_catalog.h'),'utf8');
fs.writeFileSync(path.join(out,'accepted_flags'),/unordered_map<std::string,\s*RecordingMutationHandle>\s+accepted_segment_state_mutations_/.test(catalogHeader)?'-DLP18_ACCEPTED_SHARED=1':'');
const bindingShared=catalogHeader.includes('SourceBindingPool source_bindings_;');
const jobShared=catalogHeader.includes('DerivedJobPool derived_jobs_;');
fs.writeFileSync(path.join(out,'job_flags'),jobShared?'-DLP18_JOB_SHARED=1':'');
fs.writeFileSync(path.join(out,'binding_flags'),bindingShared?'-DLP18_BINDING_SHARED=1':'');
let catalog=fs.readFileSync(path.join(repo,'src/recording/recording_catalog.cpp'),'utf8');
if(bindingShared){
 catalog=exact(catalog,'if(binding_pool)shared_binding=FindSourceBindingOwned(*binding_pool,v.segment_id);','if(binding_pool){++ownership_probe::binding_pool_lookups;shared_binding=FindSourceBindingOwned(*binding_pool,v.segment_id);}\n                if(shared_binding)++ownership_probe::binding_pool_comparisons;');
}
if(jobShared){catalog=exact(catalog,'const auto found=pool->find(record.intent.job_id);','++ownership_probe::job_pool_lookups;const auto found=pool->find(record.intent.job_id);\n        if(found!=pool->end()&&found->second)++ownership_probe::job_pool_comparisons;');}
const counters='#include <cstddef>\nnamespace ownership_probe { std::size_t binding_pool_lookups=0,binding_pool_comparisons=0,job_pool_lookups=0,job_pool_comparisons=0; void ResetJobPoolCounts(){job_pool_lookups=job_pool_comparisons=0;} std::size_t JobPoolLookups(){return job_pool_lookups;} std::size_t JobPoolComparisons(){return job_pool_comparisons;} void ResetBindingPoolCounts(){binding_pool_lookups=binding_pool_comparisons=0;} std::size_t BindingPoolLookups(){return binding_pool_lookups;} std::size_t BindingPoolComparisons(){return binding_pool_comparisons;} }\n';
fs.writeFileSync(path.join(out,'recording_catalog.cpp'),counters+catalog);
console.log('[instrument] catalog_sha256='+crypto.createHash('sha256').update(counters+catalog).digest('hex')+' binding_exact_insertions='+(bindingShared?1:0)+' job_exact_insertions='+(jobShared?1:0));
for(const name of ['include/recording/recording_journal.h','include/recording/recording_catalog.h','src/recording/recording_journal.cpp','src/recording/recording_catalog.cpp','src/recording/recording_checkpoint_validation.h','scripts/internal/recording_immutable_ownership_smoke.cpp'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
if(mode==='job')for(const name of ['scripts/internal/recording_job_ownership_smoke.cpp','src/recording/recording_timeline_projection.cpp'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
NODE
read -r -a lp_original_link < "$lp_repo/build-gst-onnx/CMakeFiles/media_server.dir/link.txt"
lp_libs=(); lp_found=0
for lp_token in "${lp_original_link[@]}";do
 if [[ "$lp_token" == libmedia_server_runtime.a ]];then lp_found=1;lp_libs+=("$lp_repo/build-gst-onnx/$lp_token");continue;fi
 if ((lp_found));then lp_libs+=("$lp_token");fi
done
test "$lp_found" = 1
read -r -a lp_flags <<< "$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
lp_shared=(-DLP18_SHARED_RECORDS=0); if [[ -s "$lp_root/ownership_flags" ]];then lp_shared=(-DLP18_SHARED_RECORDS=1);fi
lp_accepted=(-DLP18_ACCEPTED_SHARED=0); if [[ -s "$lp_root/accepted_flags" ]];then lp_accepted=(-DLP18_ACCEPTED_SHARED=1);fi
lp_binding=(-DLP18_BINDING_SHARED=0); if [[ -s "$lp_root/binding_flags" ]];then lp_binding=(-DLP18_BINDING_SHARED=1);fi
lp_job=(-DLP18_JOB_SHARED=0); if [[ -s "$lp_root/job_flags" ]];then lp_job=(-DLP18_JOB_SHARED=1);fi
lp_sources=("$lp_script/recording_immutable_ownership_smoke.cpp")
if [[ "$lp_mode" == job ]];then lp_sources=("$lp_script/recording_job_ownership_smoke.cpp" "$lp_repo/src/recording/recording_timeline_projection.cpp");fi
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$lp_root/include" -I"$lp_repo/include" -I"$lp_script" -I"$lp_repo/src/recording" "${lp_flags[@]}" "${lp_shared[@]}" \
 "${lp_accepted[@]}" "${lp_binding[@]}" "${lp_job[@]}" -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
 "${lp_sources[@]}" "$lp_root/recording_journal.cpp" "$lp_root/recording_catalog.cpp" "${lp_libs[@]}" -o "$lp_root/check"
