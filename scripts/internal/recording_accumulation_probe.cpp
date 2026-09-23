// 파일 용도: LP26-O10 synthetic 저장 복구 진단. 제품 누적 쓰기 throughput 검증이 아니다.
#define main recording_file_evidence_unused_main
#include "recording_file_evidence_smoke.cpp"
#undef main
#include "recording_catalog_cost_probe_timer.h"
#include "recording_accumulation_counter.h"
#include "recording_checkpoint_validation.h"
#include "recording_process_memory_probe.h"
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
template<class F>void Measure(const char* stage,F&& call){
 std::cout<<"[probe-stage] "<<stage<<" begin\n";fc::enabled=true;const auto begin=Clock::now();const bool ok=call();const auto us=Us(begin);fc::enabled=false;
 fc::Dump(stage);std::cout<<"[probe-wall] {\"stage\":\""<<stage<<"\",\"elapsedUs\":"<<us<<",\"ok\":"<<(ok?"true":"false")<<"}\n";Memory(stage);Need(ok,"catalog-oracle");
}
void Catalog(const std::filesystem::path& root,unsigned count){
 RecordingJournal journal(RecordingJournal::ManagedOptions{root,"probe-store"});RecordingCatalog catalog(journal,Store::Options(root));std::string error;
 Measure("recovery",[&]{return journal.Open(&error)&&catalog.Open(&error);});
 const auto r=catalog.recovery_report();Need(r.corrupt_line_count==0&&r.projection_error_count==0&&r.writer_cleanup_error_count==0&&catalog.segments_v2_.size()==count&&catalog.tombstones_v2_.size()==count&&catalog.mutation_ids_.size()==count*4,"strict-recovery-count");
 std::cout<<"[catalog-shape] {\"sources\":"<<count<<",\"records\":"<<catalog.mutation_ids_.size()<<",\"deleted\":"<<catalog.tombstones_v2_.size()<<",\"residentBindings\":"<<Resident(catalog)<<"}\n";Pass("LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors");
 Need(catalog.IsDeletedSegmentId("lp10-segment-1")&&!catalog.FindSourceBinding("lp10-segment-1"),"deleted-public-guard");
 Measure("cold-binding",[&]{std::lock_guard<std::mutex> lock(catalog.mu_);for(const auto i:{1U,count}){RecordingCatalog::SourceBindingHandle value;
   if(!catalog.AcquireSourceBindingOwnedLocked("lp10-segment-"+std::to_string(i),&value,&error)||!value||value->samples.size()!=60)return false;}return true;});
 for(unsigned run=1;run<=2;++run){lp10::records=lp10::first=0;const bool cacheBefore=bool(catalog.checkpoint_cache_);
  Measure(run==1?"checkpoint-cold":"checkpoint-repeat",[&]{return catalog.Checkpoint(&error);});
  const bool retained=bool(catalog.checkpoint_cache_);const auto applied=lp10::records-lp10::first;
  std::cout<<"[cache-path] {\"run\":"<<run<<",\"originalRecords\":"<<lp10::records<<",\"reusedPrefix\":"<<lp10::first<<",\"originalApplied\":"<<applied<<",\"cacheBefore\":"<<(cacheBefore?"true":"false")<<",\"cacheAfter\":"<<(retained?"true":"false")<<",\"residentBindings\":"<<Resident(catalog)<<"}\n";
  Need(lp10::records==count*4&&(run==1?applied==count*4:(cacheBefore?applied==0:applied==count*4)),"cache-reuse-oracle");
 }
 Pass("LP26-O10-C02 cache prefix or full fallback exact oracle");
}
}
int main(int argc,char** argv){std::cout<<std::unitbuf;try{
 if(argc==2&&std::string(argv[1])=="--bounds"){Bounds();return 0;}
 if((argc==3||argc==4)&&std::string(argv[1])=="--generate"){
  std::vector<unsigned> counts{16U,1020U,2049U};if(argc==4){const auto count=std::stoul(argv[3]);Need(count==16||count==1020||count==2049,"count");counts={static_cast<unsigned>(count)};}Generate(argv[2],counts);return 0;}
 if(argc==4&&std::string(argv[1])=="--catalog"){const auto count=std::stoul(argv[3]);Need(count==16||count==1020||count==2049,"count");Catalog(argv[2],count);return 0;}
 return 2;
 }catch(const std::exception& error){const std::string code=error.what();const bool safe=!code.empty()&&code.size()<80&&code.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-")==std::string::npos;
  std::cerr<<"[fail] LP26-O10 native "<<(safe?code:"stage-or-oracle")<<'\n';return 1;}}
