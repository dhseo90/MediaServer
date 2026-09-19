#!/usr/bin/env bash
# 호출자가 생성·정리하는 소유 root에서만 빌드. 실행은 별도 승인한다.
set -euo pipefail
lp_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
lp_repo="$(cd "$lp_script/../.." && pwd)"
lp_root="${1:?owned root required}"
lp_mode="${2:-envelope}"
if [[ "$lp_mode" != envelope && "$lp_mode" != job && "$lp_mode" != content && "$lp_mode" != envelope-cost && "$lp_mode" != context && "$lp_mode" != transition-comparison && "$lp_mode" != intent-comparison && "$lp_mode" != journal-location && "$lp_mode" != journal-location-crypto-off && "$lp_mode" != journal-cold && "$lp_mode" != journal-checkpoint-snapshot && "$lp_mode" != journal-logical && "$lp_mode" != catalog-thin ]];then exit 2;fi
node - "$lp_repo" "$lp_root" "$lp_mode" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),[repo,out,mode]=process.argv.slice(2);
const locationMode=['journal-location','journal-location-crypto-off','journal-cold','journal-checkpoint-snapshot','journal-logical','catalog-thin'].includes(mode);
if(!/^media-server-immutable-ownership\.[A-Za-z0-9]+$/.test(path.basename(out))||fs.lstatSync(out).isSymbolicLink()||fs.realpathSync(out)!==out)throw Error('LP18_ROOT');
function exact(s,a,b){if(s.split(a).length!==2)throw Error('LP18_EXACT');return s.replace(a,b);}
fs.mkdirSync(path.join(out,'include/recording'),{recursive:true});
for(const name of ['recording_catalog.h','recording_journal.h']){const file=path.join(repo,'include/recording',name);let header=exact(fs.readFileSync(file,'utf8'),'private:','public: // LP18 owned test copy');if(mode==='content'&&name==='recording_catalog.h')header=exact(header,'class DerivedJobContentProof {','class DerivedJobContentProof { public: // LP18 owned negative test only');fs.writeFileSync(path.join(out,'include/recording',name),header);}
const source=fs.readFileSync(path.join(repo,'src/recording/recording_journal.cpp'),'utf8');
const helper='\nnamespace ownership_probe { using History=recording::RecordingMutationHandles; History JournalView(const recording::RecordingJournal& j){std::lock_guard lock(j.mu_);return j.managed_state_->records;} }\n';
let journal=source;
if(locationMode&&source.includes('RecordingJournal::AcquireLocatedRecord(')){
 journal=exact(journal,'auto location=std::make_shared<RecordingJournalRecordLocation>();','location_probe::BeforeLocation();auto location=std::make_shared<RecordingJournalRecordLocation>();');
 journal=exact(journal,"std::string raw(static_cast<std::size_t>(location->length),'\\0');","location_probe::BeforeAcquire();std::string raw(static_cast<std::size_t>(location->length),'\\0');");
 journal='#include "recording_journal_location_counter.h"\n'+journal;
 console.log('[instrument] location_exception_exact_insertions=2');
}
if(locationMode&&source.includes('RecordingJournal::AcquireRecordRef(')){
 journal=exact(journal,'auto ref=std::shared_ptr<RecordingJournalRecordRef>(new RecordingJournalRecordRef);','location_probe::BeforeRef();auto ref=std::shared_ptr<RecordingJournalRecordRef>(new RecordingJournalRecordRef);');
 console.log('[instrument] logical_ref_exception_exact_insertions=1');
}
if(mode==='envelope-cost'){
 journal=exact(journal,'std::string SerializeRecordingMutationV1(const RecordingMutationV1& value) {','std::string SerializeRecordingMutationV1(const RecordingMutationV1& value) { ++envelope_cost_probe::serializations;');
 const byteSignatures=['std::string JournalBytes(const RecordingMutationHandles& records) {','std::string JournalBytes(const RecordingMutationHandles& records,std::vector<std::pair<std::size_t,std::size_t>>* spans=nullptr) {'];
 const byteMatches=byteSignatures.filter(s=>journal.includes(s));if(byteMatches.length!==1)throw Error('LP18_EXACT');
 journal=exact(journal,byteMatches[0],byteMatches[0]+' ++envelope_cost_probe::journal_bytes_calls;');
 journal='#include <cstddef>\nnamespace envelope_cost_probe { std::size_t serializations=0,journal_bytes_calls=0; void Reset(){serializations=journal_bytes_calls=0;} std::size_t Serializations(){return serializations;} std::size_t JournalBytesCalls(){return journal_bytes_calls;} }\n'+journal;
}
const journalCopy='#include "recording/recording_catalog.h"\n'+journal+helper;
if(locationMode)console.log('[instrument] location_journal_original_sha256='+crypto.createHash('sha256').update(source).digest('hex')+' location_journal_instrumented_sha256='+crypto.createHash('sha256').update(journalCopy).digest('hex'));
fs.writeFileSync(path.join(out,'recording_journal.cpp'),journalCopy);
if(mode==='envelope-cost')console.log('[instrument] envelope_exact_insertions=2 journal_original_sha256='+crypto.createHash('sha256').update(source).digest('hex')+' journal_instrumented_sha256='+crypto.createHash('sha256').update(journalCopy).digest('hex'));
fs.writeFileSync(path.join(out,'ownership_flags'),source.includes('RecordingMutationHandles records;')?'-DLP18_SHARED_RECORDS=1':'');
const catalogHeader=fs.readFileSync(path.join(repo,'include/recording/recording_catalog.h'),'utf8');
if(locationMode){
 const header=fs.readFileSync(path.join(repo,'include/recording/recording_journal.h'),'utf8');
 const counts=['ReadRecordLocations','AcquireLocatedRecord'].map(name=>(header.match(new RegExp('\\b'+name+'\\s*\\(','g'))||[]).length);
 if(!counts.every(n=>n===0)&&!counts.every(n=>n===1))throw Error('LP18_LOCATION_DECLARATIONS');
 fs.writeFileSync(path.join(out,'location_flags'),'-DLP18_LOCATED_RECORDS='+Number(counts.every(n=>n===1)));
 const coldCount=(header.match(/\bReleaseRecordResidents\s*\(/g)||[]).length;
 if(coldCount>1)throw Error('LP18_COLD_DECLARATIONS');
 fs.writeFileSync(path.join(out,'cold_flags'),'-DLP18_COLD_RECORDS='+Number(coldCount===1));
 const snapshotCount=(header.match(/using RecordingCheckpointReadSnapshotHandle\s*=/g)||[]).length;
 if(snapshotCount>1)throw Error('LP18_SNAPSHOT_DECLARATIONS');
 fs.writeFileSync(path.join(out,'snapshot_flags'),'-DLP18_CHECKPOINT_SNAPSHOT='+Number(snapshotCount===1));
 const refCounts=['ReadRecordRefs','AcquireRecordRef'].map(name=>(header.match(new RegExp('\\b'+name+'\\s*\\(','g'))||[]).length);
 if(!refCounts.every(n=>n===0)&&!refCounts.every(n=>n===1))throw Error('LP18_REF_DECLARATIONS');
 fs.writeFileSync(path.join(out,'ref_flags'),'-DLP18_LOGICAL_REFS='+Number(refCounts.every(n=>n===1)));
 const thinCount=(header.match(/class RecordingMutationLink\b/g)||[]).length;
 if(thinCount>1)throw Error('LP18_THIN_DECLARATIONS');
 fs.writeFileSync(path.join(out,'thin_flags'),'-DLP18_THIN_LINKS='+Number(thinCount===1));
 console.log('[instrument] location_declarations='+counts.join(',')+' location_header_sha256='+crypto.createHash('sha256').update(header).digest('hex'));
}
fs.writeFileSync(path.join(out,'accepted_flags'),/unordered_map<std::string,\s*RecordingMutation(?:Handle|Link)>\s+accepted_segment_state_mutations_/.test(catalogHeader)?'-DLP18_ACCEPTED_SHARED=1':'');
const bindingShared=catalogHeader.includes('SourceBindingPool source_bindings_;');
const jobShared=catalogHeader.includes('DerivedJobPool derived_jobs_;');
fs.writeFileSync(path.join(out,'job_flags'),jobShared?'-DLP18_JOB_SHARED=1':'');
fs.writeFileSync(path.join(out,'binding_flags'),bindingShared?'-DLP18_BINDING_SHARED=1':'');
let catalog=fs.readFileSync(path.join(repo,'src/recording/recording_catalog.cpp'),'utf8');
if(bindingShared){
 catalog=exact(catalog,'if(binding_pool)shared_binding=FindSourceBindingOwned(*binding_pool,v.segment_id);','if(binding_pool){++ownership_probe::binding_pool_lookups;shared_binding=FindSourceBindingOwned(*binding_pool,v.segment_id);}\n                if(shared_binding)++ownership_probe::binding_pool_comparisons;');
}
if(jobShared){catalog=exact(catalog,'const auto found=pool->find(record.intent.job_id);','++ownership_probe::job_pool_lookups;const auto found=pool->find(record.intent.job_id);\n        if(found!=pool->end()&&found->second)++ownership_probe::job_pool_comparisons;');}
if(mode==='content'){
 catalog=exact(catalog,'bool RecordingCatalog::UpdateDerivedJob(const void* owner,const DerivedJobRecordV1& record,std::string* error) {','bool RecordingCatalog::UpdateDerivedJob(const void* owner,const DerivedJobRecordV1& record,std::string* error) { proof_probe::Update proof_update(record);');
 catalog=exact(catalog,'bool RecordingCatalog::CheckpointLocked(bool recover_only,std::string* error,const DerivedJobContentProof* proof) {','bool RecordingCatalog::CheckpointLocked(bool recover_only,std::string* error,const DerivedJobContentProof* proof) { proof_probe::Checkpoint proof_checkpoint;');
 catalog=exact(catalog,'bool RecordingCatalog::ApplyDerivedJobMutationLocked(const RecordingMutationV1& mutation,std::string* error,bool apply,PreparedDerivedMutation* prepared,const DerivedJobPool* job_pool,const DerivedJobContentProof* proof) {','bool RecordingCatalog::ApplyDerivedJobMutationLocked(const RecordingMutationV1& mutation,std::string* error,bool apply,PreparedDerivedMutation* prepared,const DerivedJobPool* job_pool,const DerivedJobContentProof* proof) { proof_probe::Apply(mutation.payload_json);');
 catalog=exact(catalog,'content_proof=DerivedJobContentProof{this,owned,prepared->applied};','content_proof=DerivedJobContentProof{this,owned,prepared->applied};\n    if(content_proof)proof_probe::Inspect(*content_proof);');
 catalog='#include "recording_job_content_proof_counter.h"\n'+catalog;
 const ready=fs.readFileSync(path.join(repo,'src/recording/recording_derived_job_ready.cpp'),'utf8');
 const instrumented='#include "recording_job_content_proof_counter.h"\n'+exact(ready,'bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) {','bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) { proof_probe::Parse(json);');
 fs.writeFileSync(path.join(out,'recording_derived_job_ready.cpp'),instrumented);
 console.log('[instrument] proof_exact_insertions=5 proof_header_exact_insertions=1 ready_sha256='+crypto.createHash('sha256').update(instrumented).digest('hex'));
}
if(mode==='transition-comparison'||mode==='intent-comparison'){
 for(const [signature,observer] of [
  ['bool RecordingCatalog::UpdateDerivedJob(const void* owner,const DerivedJobRecordV1& record,std::string* error) {','transition_compare_probe::UpdateScope comparison_update(record);'],
  ['bool RecordingCatalog::ApplyDerivedJobMutationLocked(const RecordingMutationV1& mutation,std::string* error,bool apply,PreparedDerivedMutation* prepared,const DerivedJobPool* job_pool,const DerivedJobContentProof* proof) {','transition_compare_probe::Scope comparison_apply(transition_compare_probe::Phase::Apply);'],
  ['RecordingCatalog::DerivedJobHandle RecordingCatalog::ShareValidatedJob(DerivedJobRecordV1 record,const DerivedJobPool* pool) {','transition_compare_probe::Scope comparison_pool(transition_compare_probe::Phase::Pool);']
 ])catalog=exact(catalog,signature,signature+' '+observer);
 catalog='#include "recording_job_transition_comparison_counter.h"\n'+catalog;
 const original=fs.readFileSync(path.join(repo,'src/recording/recording_derived_job_ready.cpp'),'utf8');let ready=original;
 for(const [signature,observer] of [['std::string SerializeDerivedJobRecord(const DerivedJobRecordV1& record){','Serialize'],['bool ParseDerivedJobRecord(const std::string& json,DerivedJobRecordV1* out,std::string* error) {','Parse']])ready=exact(ready,signature,signature+' transition_compare_probe::'+observer+'();');
 ready='#include "recording_job_transition_comparison_counter.h"\n'+ready;
 fs.writeFileSync(path.join(out,'recording_derived_job_ready.cpp'),ready);
 console.log('[instrument] transition_exact_insertions=5 ready_original_sha256='+crypto.createHash('sha256').update(original).digest('hex')+' ready_instrumented_sha256='+crypto.createHash('sha256').update(ready).digest('hex'));
}
if(mode==='intent-comparison'){
 const original=fs.readFileSync(path.join(repo,'src/recording/recording_derived_job.cpp'),'utf8');let job=original;
 for(const [signature,observer] of [['IntentAnalysis Validate(const DerivedJobIntentV1& job){','Validate'],['DerivedRecordingSelection Restore(const DerivedJobIntentV1& job){','Restore'],['std::string Json(const DerivedJobIntentV1& job){','Json']])job=exact(job,signature,signature+' transition_compare_probe::'+observer+'();');
 job='#include "recording_job_transition_comparison_counter.h"\n'+job;fs.writeFileSync(path.join(out,'recording_derived_job.cpp'),job);
 console.log('[instrument] intent_exact_insertions=3 job_original_sha256='+crypto.createHash('sha256').update(original).digest('hex')+' job_instrumented_sha256='+crypto.createHash('sha256').update(job).digest('hex'));
}
if(mode==='context'){
 for(const name of ['recording_derived_job.cpp','recording_derived_job_ready.cpp']){
  const original=fs.readFileSync(path.join(repo,'src/recording',name),'utf8');let text=original;
  if(name==='recording_derived_job.cpp'){
   for(const [signature,observer] of [['IntentAnalysis Validate(const DerivedJobIntentV1& job){','Validate'],['DerivedRecordingSelection Restore(const DerivedJobIntentV1& job){','Restore'],['std::string Json(const DerivedJobIntentV1& job){','Json']])text=exact(text,signature,signature+' intent_context_probe::'+observer+'();');
  }else{
   const signature='bool BuildDerivedJobReady(const DerivedJobRecordV1& input,const DerivedRemuxResult& remux,\n    const std::vector<std::int64_t>& orders,std::int64_t now,DerivedJobRecordV1* out,std::string* error) {';
   text=exact(text,signature,signature+' intent_context_probe::BuildScope context_build;');
  }
  text='#include "recording_job_validation_context_counter.h"\n'+text;
  fs.writeFileSync(path.join(out,name),text);
  console.log('[instrument] context_file='+name+' original_sha256='+crypto.createHash('sha256').update(original).digest('hex')+' instrumented_sha256='+crypto.createHash('sha256').update(text).digest('hex'));
 }
 console.log('[instrument] context_exact_insertions=4');
}
const counters='#include <cstddef>\nnamespace ownership_probe { std::size_t binding_pool_lookups=0,binding_pool_comparisons=0,job_pool_lookups=0,job_pool_comparisons=0; void ResetJobPoolCounts(){job_pool_lookups=job_pool_comparisons=0;} std::size_t JobPoolLookups(){return job_pool_lookups;} std::size_t JobPoolComparisons(){return job_pool_comparisons;} void ResetBindingPoolCounts(){binding_pool_lookups=binding_pool_comparisons=0;} std::size_t BindingPoolLookups(){return binding_pool_lookups;} std::size_t BindingPoolComparisons(){return binding_pool_comparisons;} }\n';
fs.writeFileSync(path.join(out,'recording_catalog.cpp'),counters+catalog);
console.log('[instrument] catalog_sha256='+crypto.createHash('sha256').update(counters+catalog).digest('hex')+' binding_exact_insertions='+(bindingShared?1:0)+' job_exact_insertions='+(jobShared?1:0));
for(const name of ['include/recording/recording_journal.h','include/recording/recording_catalog.h','src/recording/recording_journal.cpp','src/recording/recording_catalog.cpp','src/recording/recording_checkpoint_validation.h','scripts/internal/recording_immutable_ownership_smoke.cpp'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
if(mode==='job')for(const name of ['scripts/internal/recording_job_ownership_smoke.cpp','src/recording/recording_timeline_projection.cpp'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
if(mode==='content')for(const name of ['scripts/internal/recording_job_content_proof_smoke.cpp','scripts/internal/recording_job_content_proof_counter.h','scripts/internal/recording_checkpoint_reproduction_smoke.cpp','src/recording/recording_derived_job_ready.cpp','src/recording/recording_timeline_projection.cpp'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
if(mode==='envelope-cost')for(const name of ['scripts/internal/recording_checkpoint_envelope_cost_smoke.cpp','scripts/internal/recording_immutable_ownership_build.sh'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
if(mode==='context')for(const name of ['scripts/internal/recording_job_validation_context_smoke.cpp','scripts/internal/recording_job_validation_context_counter.h','scripts/internal/recording_immutable_ownership_build.sh','scripts/internal/recording_derived_job_service_smoke.cpp','scripts/internal/recording_media_test_fixture.h','src/recording/recording_derived_job.cpp','src/recording/recording_derived_job_ready.cpp','src/recording/recording_derived_job_context.h','src/recording/recording_timeline_projection.cpp'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
if(mode==='transition-comparison'||mode==='intent-comparison')for(const name of ['scripts/internal/recording_job_transition_comparison_smoke.cpp','scripts/internal/recording_job_transition_comparison_counter.h','scripts/internal/recording_immutable_ownership_build.sh','scripts/internal/recording_derived_job_service_smoke.cpp','scripts/internal/recording_media_test_fixture.h','src/recording/recording_derived_job.cpp','src/recording/recording_derived_job_ready.cpp','src/recording/recording_derived_job_context.h','src/recording/recording_timeline_projection.cpp'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
if(locationMode)for(const name of ['scripts/internal/recording_journal_location_smoke.cpp','scripts/internal/recording_journal_location_counter.h','scripts/internal/recording_immutable_ownership_build.sh'])console.log('[source] '+JSON.stringify({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
if(mode==='catalog-thin')console.log('[source] '+JSON.stringify({name:'scripts/internal/recording_catalog_thin_link_smoke.cpp',sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,'scripts/internal/recording_catalog_thin_link_smoke.cpp'))).digest('hex')}));
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
lp_location_crypto=(-DLP18_LOCATION_CRYPTO_OFF=0)
if [[ "$lp_mode" == journal-location-crypto-off ]];then lp_location_crypto=(-DLP18_LOCATION_CRYPTO_OFF=1 -UMEDIA_SERVER_USE_OPENSSL -DMEDIA_SERVER_USE_OPENSSL=0);fi
if [[ "$lp_mode" == journal-location || "$lp_mode" == journal-location-crypto-off || "$lp_mode" == journal-cold || "$lp_mode" == journal-checkpoint-snapshot || "$lp_mode" == journal-logical ]];then read -r lp_location_flag < "$lp_root/location_flags" || [[ -n "$lp_location_flag" ]];read -r lp_cold_flag < "$lp_root/cold_flags" || [[ -n "$lp_cold_flag" ]];lp_flags+=("$lp_location_flag" "$lp_cold_flag");lp_sources=("$lp_script/recording_journal_location_smoke.cpp");fi
if [[ "$lp_mode" == journal-cold ]];then lp_flags+=(-DLP18_COLD_SUITE=1);fi
if [[ "$lp_mode" == journal-checkpoint-snapshot ]];then read -r lp_snapshot_flag < "$lp_root/snapshot_flags" || [[ -n "$lp_snapshot_flag" ]];lp_flags+=("$lp_snapshot_flag" -DLP18_CHECKPOINT_SNAPSHOT_SUITE=1);fi
if [[ "$lp_mode" == journal-logical || "$lp_mode" == journal-location-crypto-off ]];then read -r lp_ref_flag < "$lp_root/ref_flags" || [[ -n "$lp_ref_flag" ]];lp_flags+=("$lp_ref_flag");fi
if [[ "$lp_mode" == journal-logical ]];then lp_flags+=(-DLP18_LOGICAL_SUITE=1);fi
if [[ "$lp_mode" == catalog-thin ]];then read -r lp_thin_flag < "$lp_root/thin_flags" || [[ -n "$lp_thin_flag" ]];lp_flags+=("$lp_thin_flag");lp_sources=("$lp_script/recording_catalog_thin_link_smoke.cpp");fi
if [[ "$lp_mode" == intent-comparison ]];then lp_flags+=(-DLP18_INTENT_COMPARISON=1);lp_sources=("$lp_script/recording_job_transition_comparison_smoke.cpp" "$lp_root/recording_derived_job.cpp" "$lp_root/recording_derived_job_ready.cpp" "$lp_repo/src/recording/recording_timeline_projection.cpp");fi
if [[ "$lp_mode" == job ]];then lp_sources=("$lp_script/recording_job_ownership_smoke.cpp" "$lp_repo/src/recording/recording_timeline_projection.cpp");fi
if [[ "$lp_mode" == content ]];then lp_sources=("$lp_script/recording_job_content_proof_smoke.cpp" "$lp_root/recording_derived_job_ready.cpp" "$lp_repo/src/recording/recording_timeline_projection.cpp");fi
if [[ "$lp_mode" == envelope-cost ]];then lp_sources=("$lp_script/recording_checkpoint_envelope_cost_smoke.cpp");fi
if [[ "$lp_mode" == transition-comparison ]];then lp_sources=("$lp_script/recording_job_transition_comparison_smoke.cpp" "$lp_root/recording_derived_job_ready.cpp" "$lp_repo/src/recording/recording_timeline_projection.cpp");fi
if [[ "$lp_mode" == context ]];then lp_sources=("$lp_script/recording_job_validation_context_smoke.cpp" "$lp_root/recording_derived_job.cpp" "$lp_root/recording_derived_job_ready.cpp" "$lp_repo/src/recording/recording_timeline_projection.cpp");fi
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$lp_root/include" -I"$lp_repo/include" -I"$lp_script" -I"$lp_repo/src/recording" "${lp_flags[@]}" "${lp_shared[@]}" \
 "${lp_accepted[@]}" "${lp_binding[@]}" "${lp_job[@]}" -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
 "${lp_location_crypto[@]}" "${lp_sources[@]}" "$lp_root/recording_journal.cpp" "$lp_root/recording_catalog.cpp" "${lp_libs[@]}" -o "$lp_root/check"
