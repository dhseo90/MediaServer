// 파일 용도: LP26-O10 synthetic 저장 복구 진단. 제품 누적 쓰기 throughput 검증이 아니다.
#define main recording_file_evidence_unused_main
#include "recording_file_evidence_smoke.cpp"
#undef main
#include "recording_catalog_cost_probe_timer.h"
#include "recording_accumulation_counter.h"
#include "recording_checkpoint_validation.h"
#include "recording_process_memory_probe.h"
#include <atomic>
#include <map>
#include <thread>
#include <unordered_set>
namespace {
void Need(bool ok,const char* code){if(!ok)throw std::runtime_error(code);}
void Pass(const char* code){std::cout<<"[pass] "<<code<<'\n';}
void Memory(const char* stage){recording_memory_probe::Sample s;Need(recording_memory_probe::Read(&s),"rss-unavailable");
 std::cout<<"[probe-rss] {\"stage\":\""<<stage<<"\",\"currentBytes\":"<<s.current<<",\"peakBytes\":"<<s.peak<<"}\n";
 Need(s.current<=1073741824ULL&&s.peak<=1073741824ULL,"rss-cap");}
void Bounds(){
 using namespace recording::detail;
 std::vector<RecordingMutationV1> records(8192);Need(CheckpointCacheAdmissible(records),"8192-admission");Pass("LP26-O10-D01 records8192 admitted");
 records.emplace_back();Need(!CheckpointCacheAdmissible(records),"8193-rejection");Pass("LP26-O10-D01 records8193 rejected");
 records.clear();records.emplace_back();auto& m=records[0];const auto overhead=sizeof(m)+m.schema.size()+m.mutation_id.size()+m.entity_id.size();
 m.payload_json.assign(67108864-overhead,'x');Need(CheckpointCacheAdmissible(records),"64MiB-admission");Pass("LP26-O10-D01 charge64MiB admitted");
 m.payload_json.push_back('x');Need(!CheckpointCacheAdmissible(records),"64MiB-rejection");Pass("LP26-O10-D01 charge64MiBplus1 rejected");Memory("bounds");
}
void Generate(const std::filesystem::path& root,const std::vector<unsigned>& counts){
 gst_init(nullptr,nullptr);auto input=Encode(60,false,false,160,90,30,60);const auto outputs=Record(root/"seed",input);
 Need(outputs.size()==1&&outputs[0].binding.samples.size()==60&&Verify(outputs[0]),"seed-shape");const auto& original=outputs[0];
 for(const unsigned count:counts){
  const auto dir=root/("case-"+std::to_string(count));std::filesystem::create_directory(dir);
  {RecordingJournal journal(RecordingJournal::ManagedOptions{dir,"probe-store"});std::string error;Need(journal.Open(&error),"empty-managed-store");}
  std::ofstream file(dir/"recording-v2-mutations.jsonl",std::ios::binary|std::ios::trunc);Need(bool(file),"fixture-output");
  std::size_t bytes=0,charge=0;
  for(unsigned i=1;i<=count;++i){
   auto segment=original.segment;auto binding=original.binding;const auto id="lp10-segment-"+std::to_string(i),order="lp10-order-"+std::to_string(i);
   segment.segment_id=id;segment.order_request_id=order;segment.order_sequence=i;binding.segment_id=id;
   std::string error;Need(ValidateRecordingSourceBindingForSegment(binding,segment,&error),"bound-rebinding");
   RecordingSegmentStateV2 state;state.segment_id=id;state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-capacity";
   RecordingTombstoneV2 tombstone;tombstone.tombstone_id="lp10-tombstone-"+std::to_string(i);tombstone.segment=segment;tombstone.deletion_reason=state.reason;tombstone.deleted_at_ms=1789201000000LL+i;
   const std::array<std::pair<RecordingMutationType,std::string>,4> payloads{{
    {RecordingMutationType::RecordingOrderReserved,"{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\"probe-store\",\"requestId\":\""+order+"\",\"segmentId\":\""+id+"\",\"channelId\":\"probe-channel\",\"sequence\":"+std::to_string(i)+"}"},
    {RecordingMutationType::SegmentV2BoundFinalized,"{\"segment\":"+SerializeRecordingSegmentV2(segment)+",\"mediaRelpath\":\""+id+".mp4\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(binding)+"}"},
    {RecordingMutationType::SegmentV2State,SerializeRecordingSegmentStateV2(state)},
    {RecordingMutationType::SegmentV2Deleted,SerializeRecordingTombstoneV2(tombstone)}}};
   for(unsigned j=0;j<payloads.size();++j){RecordingMutationV1 mutation;mutation.entity_id=id;mutation.mutation_id=j==0?order:id+"-m"+std::to_string(j);
    mutation.mutation_type=payloads[j].first;mutation.payload_json=payloads[j].second;mutation.occurred_at_ms=1789201000000LL+i;
    const auto encoded=SerializeRecordingMutationV1(mutation);RecordingMutationV1 parsed;Need(ParseRecordingMutationV1(encoded,&parsed,&error),"mutation-envelope");
    charge+=sizeof(mutation)+mutation.schema.size()+mutation.mutation_id.size()+mutation.entity_id.size()+mutation.payload_json.size();bytes+=encoded.size()+1;
    file<<encoded<<'\n';Need(bool(file)&&bytes<335544320,"fixture-write-cap");
   }
  }
  file.close();Need(bool(file),"fixture-close");
  std::cout<<"[fixture-shape] {\"sources\":"<<count<<",\"records\":"<<4*count<<",\"journalBytes\":"<<bytes<<",\"cacheChargeBytes\":"<<charge<<",\"expectedCacheAdmission\":"<<((count*4<=8192&&charge<=67108864)?"true":"false")<<",\"mediaFiles\":0,\"samplesPerSource\":60}\n";
 }
 Need(std::filesystem::remove(original.file),"seed-media-remove");Pass("LP26-O10-A02 typed segment binding tombstone serialization and seed file verification");Memory("generated");
}
std::size_t Resident(RecordingCatalog& catalog){std::size_t n=0;for(const auto& value:catalog.source_bindings_)n+=bool(value.second.resident);return n;}
void NeedExactTimeline(RecordingCatalog& catalog,const RecordingTimelineResult& first,unsigned count,std::string* error){
 Need(first.v2_projection&&first.total+first.unplaced_total==count&&first.items.size()==first.total,"timeline-exact-total");
 std::unordered_set<std::string> ids,items;
 const auto collect=[&](const RecordingTimelineItem& row){
  Need(row.catalog_state=="deleted"&&!row.playable&&row.kind=="continuous"&&
       ids.insert(row.segment_id).second&&items.insert(row.item_id).second,"timeline-deleted-or-duplicate");
 };
 for(const auto& row:first.items)collect(row);
 std::size_t offset=0;
 while(offset<first.unplaced_total){
  RecordingTimelineResult page;
  if(offset==0)page=first;
  else Need(catalog.SnapshotTimelineV2({"probe-channel",0,std::numeric_limits<std::int64_t>::max(),offset,1000},&page,error),
            "timeline-page");
  Need(page.v2_projection&&page.total==first.total&&page.unplaced_total==first.unplaced_total&&
       page.unplaced_items.size()==std::min<std::size_t>(1000,first.unplaced_total-offset),"timeline-page-shape");
  for(const auto& row:page.unplaced_items)collect(row);
  offset+=page.unplaced_items.size();
 }
 Need(ids.size()==count&&items.size()==count,"timeline-exact-id-count");
 for(unsigned i=1;i<=count;++i)Need(ids.count("lp10-segment-"+std::to_string(i))==1,"timeline-expected-segment-id");
}
void DumpWorkerCosts(const std::map<std::string,fc::Metric>& metrics){
 for(const auto& [name,m]:metrics)std::cout<<"[cost] operation=checkpoint-manual-writer scope="<<name<<" count="<<m.count
  <<" inclusive_ns="<<m.inclusive<<" exclusive_ns="<<m.exclusive<<'\n';
}
std::uint64_t CostCount(const std::map<std::string,fc::Metric>& metrics,const char* suffix){
 std::uint64_t total=0;const std::string needle=suffix;
 for(const auto& [name,m]:metrics)if(name.size()>=needle.size()&&name.compare(name.size()-needle.size(),needle.size(),needle)==0)total+=m.count;
 return total;
}
std::uint64_t CostInclusiveNs(const std::map<std::string,fc::Metric>& metrics,const char* suffix){
 std::uint64_t total=0;const std::string needle=suffix;
 for(const auto& [name,m]:metrics)if(name.size()>=needle.size()&&name.compare(name.size()-needle.size(),needle.size(),needle)==0)total+=m.inclusive;
 return total;
}
std::uint64_t CostMaximumNs(const std::map<std::string,fc::Metric>& metrics,const char* suffix){
 std::uint64_t maximum=0;const std::string needle=suffix;
 for(const auto& [name,m]:metrics)if(name.size()>=needle.size()&&name.compare(name.size()-needle.size(),needle.size(),needle)==0)maximum=std::max(maximum,m.maximum);
 return maximum;
}
template<class F>void Measure(const char* stage,F&& call){
 std::cout<<"[probe-stage] "<<stage<<" begin\n";fc::enabled=true;const auto begin=Clock::now();const bool ok=call();const auto us=Us(begin);fc::enabled=false;
 fc::Dump(stage);std::cout<<"[probe-wall] {\"stage\":\""<<stage<<"\",\"elapsedUs\":"<<us<<",\"ok\":"<<(ok?"true":"false")<<"}\n";Memory(stage);Need(ok,"catalog-oracle");
}
std::size_t AutomaticCheckpointDue(RecordingCatalog& catalog){
 std::map<std::string,fc::Metric> automatic_costs;
 std::size_t automatic_appends=0,automatic_payload_bytes=0;bool automatic_ok=true;std::string error;
 std::uint64_t max_public_call_elapsed_us=0;const auto automatic_started=Clock::now();
 fc::enabled=true;
 while(automatic_payload_bytes<1024U*1024U){
   AnalysisObservationV2 observation;const auto suffix=std::to_string(automatic_appends++);
   observation.observation_id="lp10-auto-observation-"+suffix;observation.source_id="probe-source";observation.channel_id="probe-channel";
   observation.analysis_namespace="probe-tap";observation.stream_epoch_id="probe-epoch";observation.pts=1000000+automatic_appends;
   observation.locator_reason="unresolved";observation.track_id="probe-track-"+suffix;observation.class_label="person";
   observation.confidence=.5;observation.bbox={.1,.1,.2,.2};observation.selection_reasons={"interval"};
   observation.first_seen_pts=observation.pts;observation.last_seen_pts=observation.pts;observation.created_at_ms=1789204000000LL+automatic_appends;
   automatic_payload_bytes+=SerializeAnalysisObservationV2(observation).size();
   const auto entered=Clock::now();const bool appended=catalog.PutObservationV2(std::move(observation),&error);
   max_public_call_elapsed_us=std::max(max_public_call_elapsed_us,static_cast<std::uint64_t>(Us(entered)));
   if(!appended){automatic_ok=false;break;}
 }
 automatic_costs=fc::Take();fc::enabled=false;
 const auto automatic_elapsed=Us(automatic_started);
 const auto noop_attempts=CostCount(automatic_costs,"journal.TryAutomaticCheckpointNoop");
 const auto full_fallbacks=CostCount(automatic_costs,"catalog.CheckpointLocked");
 const auto full_checkpoint_us=CostInclusiveNs(automatic_costs,"catalog.CheckpointLocked")/1000;
 const auto writes=CostCount(automatic_costs,"checkpoint.write"),no_writes=CostCount(automatic_costs,"checkpoint.noWrite");
 const auto observations=catalog.QueryObservationsV2("probe-channel");
 Need(observations.size()==automatic_appends,"automatic-public-observation-count");
 std::cout<<"[automatic-checkpoint-path] {\"testId\":\"LP26-O14-A\",\"operation\":\"public-put-observation-v2\",\"automaticCheckpointDuePath\":true"
          <<",\"httpRequest\":false,\"appendCount\":"<<automatic_appends<<",\"publicPayloadBytes\":"<<automatic_payload_bytes
          <<",\"ok\":"<<(automatic_ok?"true":"false")<<",\"elapsedUs\":"<<automatic_elapsed<<",\"noopAttempts\":"<<noop_attempts
          <<",\"fullFallbacks\":"<<full_fallbacks<<",\"fullCheckpointInclusiveUs\":"<<full_checkpoint_us
          <<",\"maxPublicCallElapsedUs\":"<<max_public_call_elapsed_us<<",\"physicalWrites\":"<<writes<<",\"noWriteEvents\":"<<no_writes<<"}\n";
 Need(automatic_ok&&(noop_attempts>0||full_fallbacks>0),"automatic-checkpoint-due-path-oracle");
 Pass("LP26-O14-A public PutObservationV2 automatic CheckpointDue path classified");
 return automatic_appends;
}
void Automatic(const std::filesystem::path& root,unsigned count){
 std::size_t automatic_appends=0;
 {
  RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});RecordingCatalog catalog(journal,Store::Options(root));std::string error;
  Need(journal.Open(&error)&&catalog.Open(&error),"automatic-open");
  Need(catalog.segments_v2_.size()==count&&catalog.tombstones_v2_.size()==count,"automatic-shape");
  automatic_appends=AutomaticCheckpointDue(catalog);
 }
 RecordingJournal reopened_journal(RecordingJournal::ManagedOptions{root,"probe-store"});RecordingCatalog reopened(reopened_journal,Store::Options(root));std::string error;
 Need(reopened_journal.Open(&error)&&reopened.Open(&error),"automatic-reopen");
 const auto report=reopened.recovery_report();const auto observations=reopened.QueryObservationsV2("probe-channel");
 Need(report.corrupt_line_count==0&&report.projection_error_count==0&&report.writer_cleanup_error_count==0&&
      observations.size()==automatic_appends,"automatic-reopen-count");
 std::unordered_set<std::string> observation_ids;for(const auto& observation:observations)observation_ids.insert(observation.observation_id);
 for(std::size_t i=0;i<automatic_appends;++i)Need(observation_ids.count("lp10-auto-observation-"+std::to_string(i))==1,"automatic-reopen-id");
 std::cout<<"[automatic-checkpoint-reopen] {\"testId\":\"LP26-O14-A\",\"sameRoot\":true,\"observationCount\":"<<observations.size()
          <<",\"corruptLines\":"<<report.corrupt_line_count<<",\"projectionErrors\":"<<report.projection_error_count
          <<",\"writerCleanupErrors\":"<<report.writer_cleanup_error_count<<"}\n";
 Pass("LP26-O14-A public observation recovery exact IDs and zero corruption");
}
void DeletePublicV2(RecordingCatalog& catalog,const RecordingSegmentV2& segment,const std::filesystem::path& file,
                    const std::string& tombstone_id,std::int64_t deleted_at_ms,std::string* error){
 Need(catalog.RequestDeletion(segment.segment_id,"continuous-capacity",error),"public-delete-request");
 Need(std::filesystem::remove(file)&&!std::filesystem::exists(file),"public-delete-file-absent");
 RecordingTombstoneV2 tombstone;tombstone.tombstone_id=tombstone_id;tombstone.segment=segment;
 tombstone.deletion_reason="continuous-capacity";tombstone.deleted_at_ms=deleted_at_ms;
 Need(catalog.CompleteDeletionV2(tombstone,error),"public-delete-complete");
}
void AutomaticFull(const std::filesystem::path& root,unsigned count){
 // Record helper가 실제 writer의 public reservation/finalize를 만든 뒤, 동일 evidence를 새 public lifecycle에 사용한다.
 Need(count==2049,"public-full-count");
 gst_init(nullptr,nullptr);const auto seed_root=root/"lp10-public-full-seed";auto input=Encode(60,false,false,160,90,30,60);const auto seeded=Record(seed_root,input);Need(seeded.size()==1&&Verify(seeded.front()),"public-full-seed");
 const auto& seed=seeded.front();const auto template_file=root/"lp10-public-full-template.mp4";
 std::filesystem::copy_file(seed.file,template_file,std::filesystem::copy_options::overwrite_existing);Need(Verify({seed.segment,seed.binding,root,template_file}),"public-full-template-evidence");
 Need(std::filesystem::remove_all(seed_root)>0&&!std::filesystem::exists(seed_root),"public-full-seed-cleanup");
 RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});RecordingCatalog catalog(journal,Store::Options(root));std::string error;
 Need(journal.Open(&error)&&catalog.Open(&error),"public-full-open");
 std::map<std::string,fc::Metric> costs;std::size_t cycles=0;std::uint64_t max_public_operation_us=0;const auto started=Clock::now();fc::enabled=true;
 for(;cycles<96;++cycles){
  const auto suffix=std::to_string(cycles),id="lp10-full-segment-"+suffix,request="lp10-full-order-"+suffix;
  RecordingOrderReservationV1 order;Need(journal.ReserveRecordingOrder("probe-store",request,id,"probe-channel",&order,&error),"public-full-reserve");
  auto segment=seed.segment;segment.segment_id=id;segment.order_request_id=request;segment.order_sequence=order.sequence;
  auto binding=seed.binding;binding.segment_id=id;Need(ValidateRecordingSourceBindingForSegment(binding,segment,&error),"public-full-binding");
  const auto file=root/"lp10-public-full"/(id+".mp4");std::filesystem::create_directories(file.parent_path());
  std::filesystem::copy_file(template_file,file,std::filesystem::copy_options::overwrite_existing);Need(Verify({segment,binding,root,file}),"public-full-file-evidence");
  const auto operation_started=Clock::now();Need(catalog.FinalizeBoundSegmentV2(segment,binding,file.string(),&error),"public-full-finalize");
  DeletePublicV2(catalog,segment,file,"lp10-full-tombstone-"+suffix,1789205000001LL+cycles,&error);
  max_public_operation_us=std::max(max_public_operation_us,static_cast<std::uint64_t>(Us(operation_started)));
 }
 costs=fc::Take();fc::enabled=false;const auto elapsed=Us(started);
 Need(std::filesystem::remove(template_file)&&!std::filesystem::exists(template_file),"public-full-template-cleanup");
 const auto noop_attempts=CostCount(costs,"journal.TryAutomaticCheckpointNoop"),full_fallbacks=CostCount(costs,"catalog.CheckpointLocked");
 const auto full_checkpoint_us=CostInclusiveNs(costs,"catalog.CheckpointLocked")/1000;
 const auto full_checkpoint_max_us=CostMaximumNs(costs,"catalog.CheckpointLocked")/1000;
 const auto all_catalog_lock_hold_sum_us=CostInclusiveNs(costs,"catalog.lock.hold")/1000;
 const auto read_us=CostMaximumNs(costs,"checkpoint.ReadCheckpointRecords")/1000;
 const auto prepare_us=CostMaximumNs(costs,"journal.PrepareCheckpoint")/1000;
 const auto replay_us=CostMaximumNs(costs,"checkpoint.originalSemantic")/1000;
 const auto candidate_us=CostMaximumNs(costs,"checkpoint.candidateSemantic")/1000;
 const auto compare_us=CostMaximumNs(costs,"checkpoint.SameSequence")/1000;
 const auto commit_us=CostMaximumNs(costs,"journal.CommitCheckpoint")/1000;
 std::cout<<"[automatic-checkpoint-full-path] {\"testId\":\"LP26-O14-D\",\"operation\":\"public-reserve-finalize-delete-complete\",\"httpRequest\":false"
          <<",\"cycles\":"<<cycles<<",\"noopAttempts\":"<<noop_attempts<<",\"fullFallbacks\":"<<full_fallbacks
          <<",\"fullCheckpointInclusiveUs\":"<<full_checkpoint_us<<",\"fullCheckpointMaxUs\":"<<full_checkpoint_max_us
          <<",\"allCatalogLockHoldSumUs\":"<<all_catalog_lock_hold_sum_us<<",\"readCheckpointRecordsMaxUs\":"<<read_us
          <<",\"prepareCheckpointMaxUs\":"<<prepare_us<<",\"originalSemanticReplayMaxUs\":"<<replay_us
          <<",\"candidateSemanticMaxUs\":"<<candidate_us<<",\"sameSequenceMaxUs\":"<<compare_us
          <<",\"commitCheckpointMaxUs\":"<<commit_us<<",\"cachePhaseInstrumented\":false,\"releasePhaseInstrumented\":false"
          <<",\"maxPublicOperationUs\":"<<max_public_operation_us<<",\"elapsedUs\":"<<elapsed<<"}\n";
 Need(full_fallbacks>0,"public-full-checkpoint-fallback");
 Pass("LP26-O14-D public normal lifecycle automatic full fallback classified");
}
void AutomaticFullReopen(const std::filesystem::path& root,unsigned count){
 RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});RecordingCatalog catalog(journal,Store::Options(root));std::string error;
 Need(count==2049,"public-full-reopen-count");
 Need(journal.Open(&error)&&catalog.Open(&error),"public-full-reopen");const auto report=catalog.recovery_report();
 RecordingLocationCatalogSnapshot locations;Need(catalog.SnapshotLocationsV2("probe-channel",&locations,&error),"public-full-reopen-locations");
 Need(report.corrupt_line_count==0&&report.projection_error_count==0&&report.writer_cleanup_error_count==0&&locations.segments.empty()&&
      locations.deleted_segment_ids.size()==count+96,"public-full-existing-deleted-count");
 std::unordered_set<std::string> deleted_ids;for(const auto& id:locations.deleted_segment_ids)Need(deleted_ids.insert(id).second,"public-full-reopen-deleted-duplicate");
 for(unsigned i=1;i<=count;++i)Need(deleted_ids.count("lp10-segment-"+std::to_string(i))==1&&catalog.IsDeletedSegmentId("lp10-segment-"+std::to_string(i)),"public-full-existing-deleted-id");
 for(unsigned i=0;i<96;++i)Need(deleted_ids.count("lp10-full-segment-"+std::to_string(i))==1&&catalog.IsDeletedSegmentId("lp10-full-segment-"+std::to_string(i)),"public-full-reopen-id");
 const auto observations=catalog.QueryObservationsV2("probe-channel");Need(observations.size()==1526,"public-full-reopen-observations");
 std::unordered_set<std::string> observation_ids;for(const auto& observation:observations)Need(observation_ids.insert(observation.observation_id).second,"public-full-reopen-observation-duplicate");
 for(unsigned i=0;i<1526;++i)Need(observation_ids.count("lp10-auto-observation-"+std::to_string(i))==1,"public-full-reopen-observation-id");
 std::cout<<"[automatic-checkpoint-full-reopen] {\"testId\":\"LP26-O14-E\",\"sameRoot\":true,\"newDeletedCount\":96"
          <<",\"deletedCount\":"<<locations.deleted_segment_ids.size()<<",\"observationCount\":"<<observations.size()<<",\"corruptLines\":"<<report.corrupt_line_count
          <<",\"projectionErrors\":"<<report.projection_error_count<<",\"writerCleanupErrors\":"<<report.writer_cleanup_error_count<<"}\n";
 Pass("LP26-O14-E public normal lifecycle recovery IDs observations and zero corruption");
}
void Catalog(const std::filesystem::path& root,unsigned count){
 RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});RecordingCatalog catalog(journal,Store::Options(root));std::string error;
 Measure("recovery",[&]{return journal.Open(&error)&&catalog.Open(&error);});
 const auto r=catalog.recovery_report();Need(r.corrupt_line_count==0&&r.projection_error_count==0&&r.writer_cleanup_error_count==0&&catalog.segments_v2_.size()==count&&catalog.tombstones_v2_.size()==count&&catalog.mutation_ids_.size()==count*4,"strict-recovery-count");
 std::cout<<"[catalog-shape] {\"sources\":"<<count<<",\"records\":"<<catalog.mutation_ids_.size()<<",\"deleted\":"<<catalog.tombstones_v2_.size()<<",\"residentBindings\":"<<Resident(catalog)<<"}\n";Pass("LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors");
 Need(catalog.IsDeletedSegmentId("lp10-segment-1")&&!catalog.FindSourceBinding("lp10-segment-1"),"deleted-public-guard");
 RecordingTimelineResult timeline;
 Measure("timeline-projection",[&]{return catalog.SnapshotTimelineV2(
   {"probe-channel",0,std::numeric_limits<std::int64_t>::max(),0,1000},&timeline,&error);});
 NeedExactTimeline(catalog,timeline,count,&error);Pass("LP26-O14-B exact timeline count and deleted rows");
 Measure("cold-binding",[&]{std::lock_guard<std::mutex> lock(catalog.mu_);for(const auto i:{1U,count}){RecordingCatalog::SourceBindingHandle value;
   if(!catalog.AcquireSourceBindingOwnedLocked("lp10-segment-"+std::to_string(i),&value,&error)||!value||value->samples.size()!=60)return false;}return true;});
 for(unsigned run=1;run<=2;++run){lp10::records=lp10::first=0;const bool cacheBefore=bool(catalog.checkpoint_cache_);
  Measure(run==1?"checkpoint-cold":"checkpoint-repeat",[&]{return catalog.Checkpoint(&error);});
  const bool retained=bool(catalog.checkpoint_cache_);const auto applied=lp10::records-lp10::first;
  std::cout<<"[cache-path] {\"run\":"<<run<<",\"originalRecords\":"<<lp10::records<<",\"reusedPrefix\":"<<lp10::first<<",\"originalApplied\":"<<applied<<",\"cacheBefore\":"<<(cacheBefore?"true":"false")<<",\"cacheAfter\":"<<(retained?"true":"false")<<",\"residentBindings\":"<<Resident(catalog)<<"}\n";
  Need(lp10::records==count*4&&(run==1?applied==count*4:(cacheBefore?applied==0:applied==count*4)),"cache-reuse-oracle");
 }
 Pass("LP26-O10-C02 cache prefix or full fallback exact oracle");
 if(count==2049){
  // 이 호출은 HTTP/자동 CheckpointDue가 아닌 명시적 수동 Checkpoint다. cache를 비워 full replay를 요구한다.
  catalog.checkpoint_cache_.reset();
  std::atomic<bool> writer_entered{false},writer_finished{false};bool checkpoint_ok=false;std::string checkpoint_error;
  std::uint64_t writer_elapsed=0;std::size_t writer_records=0,writer_reused_prefix=0;std::map<std::string,fc::Metric> writer_costs;
  std::thread writer([&]{
   lp10::records=lp10::first=0;fc::enabled=true;writer_entered.store(true,std::memory_order_release);const auto started=Clock::now();
   checkpoint_ok=catalog.Checkpoint(&checkpoint_error);writer_elapsed=Us(started);writer_records=lp10::records;writer_reused_prefix=lp10::first;
   writer_costs=fc::Take();fc::enabled=false;writer_finished.store(true,std::memory_order_release);
  });
  while(!writer_entered.load(std::memory_order_acquire))std::this_thread::yield();
  bool writer_lock_owner_observed=false;
  for(unsigned i=0;i<1000&&!writer_finished.load(std::memory_order_acquire);++i){if(!catalog.mu_.try_lock()){writer_lock_owner_observed=true;break;}
   catalog.mu_.unlock();std::this_thread::sleep_for(std::chrono::milliseconds(1));}
  RecordingTimelineResult concurrent;const auto started=Clock::now();
  const bool queried=writer_lock_owner_observed&&catalog.SnapshotTimelineV2(
    {"probe-channel",0,std::numeric_limits<std::int64_t>::max(),0,1000},&concurrent,&error);
  const auto reader_elapsed=Us(started);writer.join();DumpWorkerCosts(writer_costs);
  const auto writer_applied=writer_records-writer_reused_prefix;
  std::cout<<"[manual-checkpoint-contention] {\"testId\":\"LP26-O14-A\",\"sources\":"<<count<<",\"operation\":\"manual-checkpoint\",\"automaticCheckpointDue\":false,\"httpRequest\":false"
           <<",\"writerCallEntered\":true,\"writerLockOwnerObserved\":"<<(writer_lock_owner_observed?"true":"false")
           <<",\"readerAttemptedWhileWriterHeldLock\":"<<(writer_lock_owner_observed?"true":"false")
           <<",\"writerOk\":"<<(checkpoint_ok?"true":"false")<<",\"writerElapsedUs\":"<<writer_elapsed
           <<",\"writerOriginalRecords\":"<<writer_records<<",\"writerReusedPrefix\":"<<writer_reused_prefix<<",\"writerOriginalApplied\":"<<writer_applied
           <<",\"readerOk\":"<<(queried?"true":"false")<<",\"readerElapsedUs\":"<<reader_elapsed
           <<",\"readerTimelineTotal\":"<<concurrent.total<<",\"readerTimelineUnplacedTotal\":"<<concurrent.unplaced_total<<"}\n";
  Need(writer_lock_owner_observed&&checkpoint_ok&&queried&&writer_records==count*4&&writer_reused_prefix==0&&writer_applied==count*4,
       "manual-full-checkpoint-contention-oracle");
  NeedExactTimeline(catalog,concurrent,count,&error);Pass("LP26-O14-A manual full checkpoint and same-lock timeline measurement");

 }
}
}
int main(int argc,char** argv){std::cout<<std::unitbuf;try{
 if(argc==2&&std::string(argv[1])=="--bounds"){Bounds();return 0;}
 if((argc==3||argc==4)&&std::string(argv[1])=="--generate"){
  std::vector<unsigned> counts{16U,1020U,2049U};if(argc==4){const auto count=std::stoul(argv[3]);Need(count==16||count==1020||count==2049,"count");counts={static_cast<unsigned>(count)};}Generate(argv[2],counts);return 0;}
 if(argc==4&&std::string(argv[1])=="--catalog"){const auto count=std::stoul(argv[3]);Need(count==16||count==1020||count==2049,"count");Catalog(argv[2],count);return 0;}
 if(argc==4&&std::string(argv[1])=="--automatic"){const auto count=std::stoul(argv[3]);Need(count==2049,"count");Automatic(argv[2],count);return 0;}
 if(argc==4&&std::string(argv[1])=="--automatic-full"){const auto count=std::stoul(argv[3]);Need(count==2049,"count");AutomaticFull(argv[2],count);return 0;}
 if(argc==4&&std::string(argv[1])=="--automatic-full-reopen"){const auto count=std::stoul(argv[3]);Need(count==2049,"count");AutomaticFullReopen(argv[2],count);return 0;}
 return 2;
 }catch(const std::exception& error){const std::string code=error.what();const bool safe=!code.empty()&&code.size()<80&&code.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-")==std::string::npos;
  std::cerr<<"[fail] LP26-O10 native "<<(safe?code:"stage-or-oracle")<<'\n';return 1;}}
