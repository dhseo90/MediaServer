// 파일 용도: R184의 실제 managed Writer·Native Search를 격리된 fixture에서만 검사한다.
#define main MultiWriterFixtureMain
#include "recording_managed_writer_smoke.cpp"
#undef main
#include "recording/recording_search_diagnostic.h"
#include "ingress/recording_application_service.h"
#include "../../src/recording/recording_catalog_history.h"
#include <future>
namespace recording {
struct RecordingSearchRetryTestProbe {
 static void Fault(RecordingCatalog& c,const std::string& mode) {
  std::lock_guard lock(c.mu_);auto& log=*c.search_invalidations_;
  const auto at=[&](std::size_t back)->auto& {return log.receipts[(log.receipt_next+log.receipt_capacity-back)%log.receipt_capacity];};
  if(mode=="missing")at(2).epoch=0;
  if(mode=="duplicate")at(2)=at(3);
  if(mode=="reverse")std::swap(at(1),at(2));
  if(mode=="epoch")++at(2).epoch;
  if(mode=="ordinal")at(2).ordinal=at(3).ordinal;
  if(mode=="expired")at(2).issued_ns=1;
  if(mode=="id-duplicate")std::memcpy(at(2).id,at(3).id,sizeof(at(2).id));
  if(mode=="saturated")log.membership_epoch=0;
  if(mode=="authority")c.derived_job_state_authoritative_=false;
  if(mode=="binding"){
   auto& entry=c.source_bindings_.at(at(1).id);entry.source="wrong-source";entry.resident.reset();entry.weak.reset();
  }
 }
 static void Sizes(RecordingCatalog& c) {
  std::lock_guard lock(c.mu_);const auto& log=*c.search_invalidations_;
  std::cout<<"[receipt-bytes] receipt="<<sizeof(log.pending)<<" ring="<<sizeof(log.receipts)<<" pending="<<sizeof(log.pending)
   <<" metadataTotal="<<sizeof(log)<<" used="<<log.receipt_count*sizeof(log.pending)<<" count="<<log.receipt_count
   <<" max="<<log.receipt_capacity<<" rawLimit="<<log.raw_limit<<" ttlNs="<<log.receipt_lifetime_ns<<std::endl;
 }
};
}
namespace {
using namespace recording;
unsigned checks=0;
void Need(bool ok,const std::string& label) {if(!ok)throw std::runtime_error(label);++checks;std::cout<<"[pass] "<<label<<std::endl;}
bool Same(const RecordingSearchModel& a,const RecordingSearchModel& b) {
 if(a.documents().size()!=b.documents().size())return false;
 const auto fields=[](const auto& d){return std::tie(d.id,d.channel_id,d.kind,d.segment_id,d.source_id,d.store_id,d.media_epoch_id,
 d.playback_segment_id,d.playback_event_id,d.playback_job_id,d.observation_id,d.reference_id,d.analysis_namespace,
 d.stream_epoch_id,d.track_id,d.object,d.start_ns,d.end_ns,d.time_provenance,d.uncertainty_ns,d.media_pts,d.media_end_pts,
 d.time_base_num,d.time_base_den,d.event_ids,d.zone_ids,d.rule_ids,d.unavailable_reason);};
 for(std::size_t i=0;i<a.documents().size();++i){const auto& x=a.documents()[i];const auto& y=b.documents()[i];
  if(fields(x)!=fields(y)||x.event_facts.size()!=y.event_facts.size())return false;
  for(std::size_t j=0;j<x.event_facts.size();++j)if(std::tie(x.event_facts[j].event_id,x.event_facts[j].event_type,x.event_facts[j].scenario_name)!=
   std::tie(y.event_facts[j].event_id,y.event_facts[j].event_type,y.event_facts[j].scenario_name))return false;
 }return true;
}
struct Fixture {
 RecordingRuntimeStorage runtime;Encoded& input;std::string error;unsigned serial=0;
 explicit Fixture(const std::filesystem::path& root,Encoded& in):runtime(root),input(in){Need(runtime.Open(&error),"R184 runtime open");}
 void Append(const std::string& channel="a",unsigned duration=100000) {
  GStreamerSegmentWriter writer(runtime.WriterOptions(duration));
  Need(writer.Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"R184 Writer start");
  const auto name="multi-"+std::to_string(++serial);
  for(auto packet:input.packets){packet.observation->source_generation=name;writer.Push(packet,0);}writer.Stop();
 }
 std::shared_ptr<const RecordingSearchModel> Refresh(const std::vector<std::string>& channels,
  const std::shared_ptr<const RecordingSearchModel>& previous={}) {
  RecordingReadService media(runtime.catalog());RecordingSearchReader reader(runtime.catalog(),media);
  std::shared_ptr<const RecordingSearchModel> result;
  Need(reader.Refresh(channels,previous,&result,&error,{},false),"R184 Refresh "+error);return result;
 }
 void Oracle(const std::vector<std::string>& channels,const std::shared_ptr<const RecordingSearchModel>& candidate){
  const bool enabled=search_membership_test_enabled;search_membership_test_enabled=false;auto strict=Refresh(channels);
  search_membership_test_enabled=enabled;Need(Same(*candidate,*strict),"R184 all document fields/order equal strict oracle");
 }
 void Seed(unsigned calls=2) {for(unsigned i=0;i<calls;++i)Append(i%2?"b":"a",1000);Need(runtime.catalog().Checkpoint(&error),"R184 cold checkpoint");}
};
[[maybe_unused]] void Correctness(const std::filesystem::path& root,Encoded& input) {
 search_membership_test_enabled=true;
 for(const std::string mode:{"single","same","cross","missing","duplicate","reverse","epoch","ordinal","id-duplicate","expired",
  "capacity","overflow","raw-capacity","raw-overflow","saturated","receipt-loss","lifecycle","retention","delete","recovery","observation","binding","authority"}) {
  std::shared_ptr<SearchModelResidency> owner;std::shared_ptr<RecordingScratchResidency> scratch;
  {
   Fixture f(root/mode,input);f.Seed();auto& c=f.runtime.catalog();owner=c.SearchResidency();scratch=c.ScratchResidency();
   const std::vector<std::string> channels=(mode=="cross")?std::vector<std::string>{"a","b"}:std::vector<std::string>{"a"};
   auto base=f.Refresh(channels);const auto old_count=base->documents().size();
   const unsigned count=mode=="single"?1:mode=="capacity"?64:mode=="overflow"?65:mode=="raw-capacity"?32:mode=="raw-overflow"?33:3;
   for(unsigned i=0;i<count;++i){
    if(mode=="receipt-loss"&&i==1)search_receipt_drop_test=true;
    f.Append((mode=="cross"&&i%2)||(mode=="capacity"&&i)||(mode=="overflow"&&i)?"b":"a");
   }
   const auto victim=base->documents().front().segment_id;
   if(mode=="lifecycle")Need(c.MarkSegmentCorrupt(victim,"container-invalid",&f.error),"R184 lifecycle barrier");
   const auto delete_location=c.FindSegmentMediaLocation(victim);const auto delete_segment=c.FindSegmentV2ById(victim);
   if(mode=="retention"||mode=="delete")Need(c.RequestDeletion(victim,"continuous-capacity",&f.error),"R184 retention barrier");
   if(mode=="delete"){
    auto location=delete_location;auto segment=delete_segment;Need(bool(location)&&bool(segment),"R184 delete originals captured before pending");
    RecordingTombstoneV2 tomb;tomb.tombstone_id="gone-"+victim;tomb.segment=*segment;tomb.deletion_reason="continuous-capacity";tomb.deleted_at_ms=1792920000000LL;
    Need(std::filesystem::remove(location->first/location->second)&&c.CompleteDeletionV2(tomb,&f.error),"R184 exact owned fixture delete");
   }
   if(mode=="recovery"){
    auto segment=c.FindSegmentV2ById(victim);auto binding=c.FindSourceBinding(victim);auto location=c.FindSegmentMediaLocation(victim);bool inserted=false;
    Need(segment&&binding&&location,"R184 recovery fixture originals");
    c.RecoverBoundSegmentV2(*segment,*binding,(location->first/location->second).string(),&inserted,&f.error);
    Need(!inserted,"R184 recovery duplicate no insertion");f.Append();
   }
   if(mode=="observation"){
    AnalysisObservationV2 o;o.observation_id="observation-barrier";o.channel_id="b";o.analysis_namespace="multi";
    o.source_id="source";o.stream_epoch_id="epoch";o.track_id="video-0";o.pts=1500000000;
    o.class_label="person";o.confidence=.8;o.bbox={.1,.2,.3,.4};o.selection_reasons={"track-start"};
    o.first_seen_pts=o.pts;o.last_seen_pts=o.pts;o.created_at_ms=1500;
    Need(c.PutObservationV2(o,&f.error),"R184 other-channel observation barrier "+f.error);
   }
   RecordingSearchRetryTestProbe::Fault(c,mode);search_membership_work_test=0;search_projection_work_test={};
   RecordingReadService media(c);RecordingSearchReader reader(c,media);auto next=base;
   const bool ok=reader.Refresh(channels,base,&next,&f.error,{},false);
   const bool fast=mode=="single"||mode=="same"||mode=="cross"||mode=="capacity"||mode=="raw-capacity";
   if(mode=="binding"||mode=="authority")Need(!ok&&next==base,"R184 "+mode+" rejects without publication");
   else {
    Need(ok,"R184 "+mode+" completes via authenticated path: "+f.error);
    Need(search_membership_work_test==unsigned(fast),"R184 "+mode+" expected selection reason="+search_membership_reason_test);
    if(fast)Need(search_projection_work_test[0]==(mode=="capacity"?1:count),"R184 selected new Raw exactly once");
    f.Oracle(channels,next);Need(base->documents().size()==old_count,"R184 prior generation immutable");
    if(mode=="cross"){
     RecordingSearchSnapshots snapshots;RecordingSearchQuery query;query.channels=channels;query.include_unplaced=true;query.limit=1;
     query.start_time_ms=1789200000000LL;query.end_time_ms=1789200005000LL;RecordingSearchPage page,resumed;
     Need(snapshots.Begin(base,query,"owner","scope",&page,&f.error)&&!page.next_cursor.empty(),"R184 old snapshot admission");
     Need(snapshots.Resume(page.next_cursor,query,"owner","scope",&resumed,&f.error)&&resumed.model==base,"R184 old snapshot after multi publication");
     auto warm=f.Refresh(channels,next);Need(warm==next,"R184 same key reuse no duplicate docs");
    }
   }
   RecordingSearchRetryTestProbe::Sizes(c);Need(!search_receipt_drop_test,"R184 receipt failure hook consumed");
  }
  Need(owner->used()==0&&scratch->usage().disk_bytes==0&&scratch->usage().file_descriptors==0&&scratch->ReaderCleanupHealthy(),"R184 "+mode+" owner/scratch returned");
 }
 for(const std::string mode:{"other-before-publish","selected-before-publish","stop","exception","other-unsupported"}) {
  Fixture f(root/mode,input);f.Seed();auto& c=f.runtime.catalog();auto base=f.Refresh({"a"});f.Append();
  RecordingReadService media(c);RecordingSearchReader reader(c,media);auto next=base;bool injected=false;
  search_after_build_test=[&]{injected=true;
   if(mode=="stop")Need(f.runtime.Finish(&f.error),"R184 Stop runtime");else if(mode=="exception")throw std::bad_alloc();
   else if(mode=="other-unsupported"){
    auto other=f.Refresh({"b"});Need(c.MarkSegmentCorrupt(other->documents().front().segment_id,"container-invalid",&f.error),"R184 other-channel unsupported after build");
   } else f.Append(mode=="other-before-publish"?"b":"a");
  };
  // 무관한 피해 항목을 찾는 동안 hook이 재귀 호출되지 않게 한다.
  std::string other_id;if(mode=="other-unsupported"){
   auto hook=std::move(search_after_build_test);search_after_build_test={};other_id=f.Refresh({"b"})->documents().front().segment_id;
   search_after_build_test=[&]{injected=true;Need(c.MarkSegmentCorrupt(other_id,"container-invalid",&f.error),"R184 other-channel unsupported after build");};
  }
  bool ok=false,threw=false;try{ok=reader.Refresh({"a"},base,&next,&f.error,{},false);}catch(const std::bad_alloc&){threw=true;}
  search_after_build_test={};Need(injected,"R184 publish injection ran");
  if(mode=="other-before-publish"){
   Need(ok&&next!=base&&next->authenticated_membership(),"R184 unrelated Finalize tail authenticated under publication lock");
   f.Oracle({"a"},next);f.Append();search_membership_work_test=0;auto after=f.Refresh({"a"},next);
   Need(search_membership_work_test==1,"R184 change after publish uses correct advanced certificate");f.Oracle({"a"},after);
  }else Need(!ok&&next==base&&(mode!="exception"||threw),"R184 "+mode+" cannot exchange pointer");
 }
 {
  Fixture f(root/"different-keys",input);f.Seed();auto& c=f.runtime.catalog();RecordingReadService media(c);
  ingress::RecordingApplicationService app(media,c,true,{});
  const auto request=[&](const std::string& channel){
   const std::unordered_map<std::string,std::string> query{{"channelIds",channel},{"startTimeMs","1789200000000"},{"endTimeMs","1789200005000"},{"includeUnplaced","true"},{"limit","1"}};
   return app.Search(query,"owner","scope",[&](const auto& ch){return ch==channel;});
  };
  Need(request("a").status==200&&request("b").status==200,"R184 two source keys primed");f.Append("a");f.Append("b");f.Append("a");
  std::promise<void> start;auto gate=start.get_future().share();const auto invoke=[&](const std::string& channel){gate.wait();return request(channel);};
  auto a=std::async(std::launch::async,invoke,"a"),b=std::async(std::launch::async,invoke,"b");start.set_value();
  auto ra=a.get(),rb=b.get();Need(ra.status==200&&rb.status==200,"R184 different source keys concurrent success");
  Need(ra.body.find("\"channelId\":\"b\"")==std::string::npos&&rb.body.find("\"channelId\":\"a\"")==std::string::npos,"R184 distinct source scope isolation");
 }
}
}
#ifndef RECORDING_MULTIFINALIZE_NO_MAIN
int main(int argc,char** argv) {
 if(argc!=2)return 2;gst_init(nullptr,nullptr);
 try{auto input=Encode(true,30);Correctness(argv[1],input);std::cout<<"[multifinalize-result] passed="<<checks<<" failed=0\n";return 0;}
 catch(const std::exception& e){std::cerr<<"[multifinalize-fail] "<<e.what()<<" passed="<<checks<<std::endl;return 1;}
}

#endif
