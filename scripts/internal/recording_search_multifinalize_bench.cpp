// 파일 용도: R184-P01의 동일 binary에서 한도가 있는 A/B/B/A를 비교하며 HTTP·제품 server는 시작하지 않는다.
#define RECORDING_MULTIFINALIZE_NO_MAIN
#include "recording_search_multifinalize_smoke.cpp"
namespace {
thread_local std::array<char,6144> measured_trace{};thread_local std::size_t measured_size=0;
void MeasureSink(const char* data,std::size_t size) noexcept {
 if(std::string_view(data,size).find("[search-request-cost] ")==0){measured_size=std::min(size,measured_trace.size());std::memcpy(measured_trace.data(),data,measured_size);}
}
void ResetBudget() {
 SearchDiagnostic::sequence=0;auto& b=SearchDiagnostic::Budget();for(auto& n:b.kept)n=0;for(auto& n:b.dropped)n=0;b.unselected=0;
}
void Resources(unsigned rows,unsigned round,const std::string& mode,RecordingCatalog& c) {
 auto& d=memory_diagnostic::Data();std::lock_guard lock(d.mutex);
 std::uint64_t models=0,old=0,pages=0;for(const auto& m:d.models)if(m.id){++models;if(!m.current&&m.snapshotReferences)++old;}
 for(const auto& p:d.pools)pages+=p.entries;
 std::cout<<"[multi-resources] {\"rows\":"<<rows<<",\"round\":"<<round<<",\"mode\":\""<<mode<<"\",\"ownerUsed\":"<<c.SearchResidency()->used()
 <<",\"ownerPeak\":"<<c.SearchResidency()->peak()<<",\"liveModels\":"<<models<<",\"snapshotRetainedModels\":"<<old<<",\"snapshotEntries\":"<<pages
 <<",\"responseHolds\":"<<d.live[memory_diagnostic::ResponseHolds]<<",\"preparedReaders\":"<<d.live[memory_diagnostic::PreparedReaders]
 <<",\"diagnosticLoss\":"<<(d.loss?"true":"false")<<"}"<<std::endl;
}
void Bench(const std::filesystem::path& root,Encoded& input) {
 for(unsigned rows:{192U,1200U})for(unsigned round=0;round<4;++round){
  const bool fast=round==1||round==2;search_membership_test_enabled=fast;
  std::shared_ptr<SearchModelResidency> owner;std::shared_ptr<RecordingScratchResidency> scratch;
  {
   Fixture f(root/(std::to_string(rows)+"-"+std::to_string(round)),input);f.Seed(rows/3);
   auto& c=f.runtime.catalog();owner=c.SearchResidency();scratch=c.ScratchResidency();
   RecordingReadService media(c);RecordingSearchReader reader(c,media);
   for(const std::string mode:{"single","multiple","cross","same-key-pair","unsupported","overflow"}) {
    auto base=f.Refresh({"a","b"});
    if(mode=="single")Need(base->documents().size()==rows,"R184-P01 initial raw/document size exact");
    const auto before_rows=base->documents().size();
    RecordingSearchQuery q;q.channels={"a","b"};q.start_time_ms=1789200000000LL;q.end_time_ms=1789200005000LL;q.include_unplaced=true;q.limit=1;
    RecordingSearchSnapshots held;RecordingSearchPage held_page,resumed;
    Need(held.Begin(base,q,"owner","scope",&held_page,&f.error),"R184-P01 retain previous snapshot");
    ingress::RecordingApplicationService app(media,c,true,{});
    const std::unordered_map<std::string,std::string> query{{"channelIds","a,b"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200005000"},{"includeUnplaced","true"},{"limit","1"}};
    const auto allowed=[](const auto& ch){return ch=="a"||ch=="b";};
    Need(app.Search(query,"owner","scope",allowed).status==200,"R184-P01 service primed");
    const unsigned additions=mode=="single"?1:mode=="overflow"?65:3;
    const auto writer_begin=SearchDiagnostic::Tick();
    for(unsigned i=0;i<additions;++i)f.Append((mode=="cross"||mode=="same-key-pair"||mode=="overflow")&&i%2?"b":"a");
    const auto writer_ns=SearchDiagnostic::Tick()-writer_begin;
    if(mode=="unsupported")Need(c.MarkSegmentCorrupt(base->documents().front().segment_id,"container-invalid",&f.error),"R184-P01 unsupported barrier");
    search_membership_work_test=0;search_projection_work_test={};search_build_shared_ns_test=0;
    const auto decode_before=latency::segment_decode_cost[0];const auto refresh_begin=SearchDiagnostic::Tick();
    auto next=f.Refresh({"a","b"},base);const auto refresh_ns=SearchDiagnostic::Tick()-refresh_begin;
    const auto raw=search_projection_work_test[0];const auto selected=search_membership_work_test,build_ns=search_build_shared_ns_test;
    const auto decodes=latency::segment_decode_cost[0]-decode_before;const std::string reason=search_membership_reason_test;
    const bool expected=fast&&mode!="unsupported"&&mode!="overflow";
    Need(selected==unsigned(expected),"R184-P01 measured refresh selection");f.Oracle({"a","b"},next);
    Need(held.Resume(held_page.next_cursor,q,"owner","scope",&resumed,&f.error)&&resumed.model==base,"R184-P01 retained snapshot unchanged");
    std::cout<<"[multi-refresh] {\"rows\":"<<rows<<",\"round\":"<<round<<",\"fastEnabled\":"<<(fast?"true":"false")<<",\"mode\":\""<<mode
     <<"\",\"beforeRows\":"<<before_rows<<",\"newRows\":"<<additions<<",\"fast\":"<<selected<<",\"reason\":\""<<reason
     <<"\",\"rawRows\":"<<raw<<",\"decodeCalls\":"<<decodes<<",\"refreshNs\":"<<refresh_ns<<",\"buildSharedNs\":"<<build_ns
     <<",\"writerStartPushStopNs\":"<<writer_ns<<"}"<<std::endl;
    const unsigned clients=mode=="same-key-pair"?2:1;
    std::array<std::uint64_t,2> times{},work{},captures{},builds{},raws{},decodes_per_request{},shared_ns{};
    std::array<std::string,2> traces{},reasons{};std::array<int,2> statuses{};std::array<std::exception_ptr,2> exceptions{};
    std::promise<void> start;auto gate=start.get_future().share();ResetBudget();
    const auto request=[&](unsigned id){
     try{
      search_membership_test_enabled=fast;search_membership_work_test=0;search_projection_work_test={};search_build_shared_ns_test=0;
      measured_size=0;search_diagnostic_sink_test=MeasureSink;
      search_after_capture_test=[&]{++captures[id];if(!reasons[id].empty())reasons[id]+=",";reasons[id]+=search_membership_reason_test;};
      search_after_build_test=[&]{++builds[id];};gate.wait();const auto decode_start=latency::segment_decode_cost[0];
      const auto begin=SearchDiagnostic::Tick();auto result=app.Search(query,"owner","scope",allowed);times[id]=SearchDiagnostic::Tick()-begin;
      statuses[id]=result.status;work[id]=search_membership_work_test;raws[id]=search_projection_work_test[0];
      decodes_per_request[id]=latency::segment_decode_cost[0]-decode_start;shared_ns[id]=search_build_shared_ns_test;traces[id].assign(measured_trace.data(),measured_size);
     }catch(...){exceptions[id]=std::current_exception();}
     search_after_capture_test={};search_after_build_test={};search_diagnostic_sink_test=nullptr;
    };
    std::thread one(request,0);std::optional<std::thread> two;if(clients==2)two.emplace(request,1);
    const auto pair_begin=SearchDiagnostic::Tick();start.set_value();one.join();if(two)two->join();const auto pair_ns=SearchDiagnostic::Tick()-pair_begin;
    for(unsigned i=0;i<clients;++i){if(exceptions[i])std::rethrow_exception(exceptions[i]);Need(statuses[i]==200,"R184-P01 whole Native service success");
     std::cout<<"[multi-request] {\"rows\":"<<rows<<",\"round\":"<<round<<",\"mode\":\""<<mode<<"\",\"client\":"<<i<<",\"fastEnabled\":"<<(fast?"true":"false")
     <<",\"requestNs\":"<<times[i]<<",\"pairNs\":"<<pair_ns<<",\"fast\":"<<work[i]<<",\"captures\":"<<captures[i]<<",\"builds\":"<<builds[i]<<",\"reason\":\""<<reasons[i]
     <<"\",\"rawRows\":"<<raws[i]<<",\"decodeCalls\":"<<decodes_per_request[i]<<",\"buildSharedNs\":"<<shared_ns[i]<<"}"<<std::endl;
     std::cout<<"[multi-phase-key] "<<rows<<' '<<round<<' '<<mode<<' '<<i<<'\n'<<traces[i];
    }
    Need(work[0]+work[1]==unsigned(expected)&&builds[0]+builds[1]==1,"R184-P01 exactly one update per same key");
    Resources(rows,round,mode,c);RecordingSearchRetryTestProbe::Sizes(c);
   }
  }
  Need(owner->used()==0&&scratch->usage().disk_bytes==0&&scratch->usage().file_descriptors==0&&scratch->ReaderCleanupHealthy(),"R184-P01 full fixture owners returned");
 }
}
}
int main(int argc,char** argv){
 if(argc!=2)return 2;setenv("MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE","1",1);setenv("MEDIA_SERVER_VERIFY_MEMORY_ATTRIBUTION","1",1);gst_init(nullptr,nullptr);
 try{auto input=Encode(true,30);Bench(argv[1],input);std::cout<<"[multifinalize-bench-result] passed="<<checks<<" failed=0\n";return 0;}
 catch(const std::exception& e){std::cerr<<"[multifinalize-bench-fail] "<<e.what()<<" passed="<<checks<<std::endl;return 1;}
}
