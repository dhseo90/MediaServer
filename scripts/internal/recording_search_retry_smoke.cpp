// R131: 실제 generation/cold 원본의 요청 내 재사용. 기존 writer fixture만 재사용한다.
#define main RetryWriterFixtureMain
#include "recording_managed_writer_smoke.cpp"
#undef main
#include "recording/recording_search_reader.h"
#include "recording/recording_search_diagnostic.h"
#include "recording/recording_search_snapshots.h"
#include "ingress/recording_application_service.h"
#include "domain/strict_json.h"
#include <future>
#include <limits>
#ifdef RECORDING_SEARCH_TESTING
namespace {
std::array<char,512> http_line{};std::size_t http_size=0;
std::array<char,6144> diagnostic_line{};std::size_t diagnostic_size=0,diagnostic_writes=0;
void DiagnosticSink(const char* data,std::size_t size) noexcept {
 ++diagnostic_writes;
 if(std::string_view(data,size).find("[search-http-cost] ")==0){http_size=std::min(size,http_line.size());std::memcpy(http_line.data(),data,http_size);}
 if(std::string_view(data,size).find("[search-request-cost] ")==0){
  diagnostic_size=std::min(size,diagnostic_line.size());std::memcpy(diagnostic_line.data(),data,diagnostic_size);
 }
}
void ResetDetailBudget() {
 auto& budget=recording::SearchDiagnostic::Budget();
 for(auto& x:budget.kept)x=0;for(auto& x:budget.dropped)x=0;budget.unselected=0;
}
}
#endif
namespace recording {
struct RecordingSearchRetryTestProbe {
 static std::size_t Spans(const SearchSourceBatch& b){return b.segment_spans_.size();}
 static std::size_t Reused(const SearchSourceBatch& b){return b.reused_segments_;}
#ifdef RECORDING_SEARCH_TESTING
 static std::string SharedSpan(SearchSourceBatch& b,const std::string& fault) {
  if(fault=="instance")++b.catalog_instance;
  for(auto& [id,span]:b.segment_spans_)if(span.shared_count){
   // Earlier cases leave corrupt/pending rows in this shared fixture. This
   // case must perform a real Finalized -> Corrupt transition, never a no-op
   // or a rejected transition selected by unordered_map iteration order.
   if((fault=="lifecycle"||fault=="pending"||fault=="retired")&&span.lifecycle!=RecordingLifecycle::Finalized)continue;
   if(fault=="digest")span.digest[0]^=1;
   if(fault=="size")++span.raw_bytes;
   if(fault=="range")span.shared_begin=b.shared_documents_.size();
   return id;
  }
  return {};
 }
 static void RefuseCoverage(RecordingCatalog& c,bool floor) {
  std::lock_guard lock(c.mu_);
  if(floor)c.search_invalidations_->floor=c.source_snapshot_revision_;
  else {auto& log=*c.search_invalidations_;log.entries[(log.next+log.entries.size()-1)%log.entries.size()].retention=2;}
 }
 static std::size_t InvalidationBytes(){return sizeof(RecordingCatalog::SearchInvalidations::Entry);}
 static bool RepeatPending(RecordingCatalog& c,const std::string& id,unsigned count,std::string* error) {
  latency::Lock lock(c.mu_,latency::Source::Test,__LINE__);
  RecordingSegmentStateV2 state;state.segment_id=id;state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-capacity";
  for(unsigned i=0;i<count;++i){RecordingMutationV1 m;m.mutation_type=RecordingMutationType::SegmentV2State;m.entity_id=id;
   m.payload_json=SerializeRecordingSegmentStateV2(state);if(!c.AppendAndApplyLocked(std::move(m),error))return false;}
  return true;
 }
 static std::array<std::uint64_t,3> RingState(RecordingCatalog& c) {
  std::lock_guard lock(c.mu_);return {c.search_invalidations_->floor,c.source_snapshot_revision_,c.search_invalidations_->count};
 }
#endif
};
}
int main(int argc,char** argv){
 if(argc!=2)return 2;
 gst_init(nullptr,nullptr);using namespace recording;
 unsigned passed=0;bool shared_projection=false;
 const auto need=[&](bool ok,const char* name){if(!ok)throw std::runtime_error(name);++passed;std::cout<<"[pass] "<<name<<std::endl;};
 try{
#ifdef RECORDING_SEARCH_TESTING
  // Synthetic clocks test retention, not HTTP latency or client cancellation.
  {
   using Budget=SearchDiagnostic::DetailBudget;
   Budget budget;
   need(budget.Select(17,1999999999ULL,200,"none")==-1,"diagnostic ordinary late requests are explicitly unsampled");
   need(budget.Select(17,2000000000ULL,200,"none")==1&&budget.Select(129,5000000000ULL,200,"none")==2,
        "diagnostic exact slow and very-late boundaries include late server 200");
   need(budget.Select(130,0,503,"none")==2&&budget.Select(131,0,200,"bad_alloc")==2,
        "diagnostic late failures and exception completion retain reserved priority");
   Budget concurrent;std::array<std::thread,4> writers;
   for(auto& worker:writers)worker=std::thread([&]{for(unsigned i=0;i<200;++i){
    concurrent.Select(1,0,200,"none");concurrent.Select(129,2000000000ULL,200,"none");concurrent.Select(130,5000000000ULL,200,"none");}});
   for(auto& worker:writers)worker.join();
   for(unsigned i=0;i<3;++i)need(concurrent.kept[i]==Budget::limits[i]&&concurrent.dropped[i]==800-Budget::limits[i],
        "diagnostic concurrent fixed budget and loss accounting");
   need(16+80+31+1==128&&127*6144+512<=128*6144,"diagnostic detail and summary fit original total output budget");
   const char* old_env=std::getenv("MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE");
   const bool had_env=old_env;const std::string saved=old_env?old_env:"";
   setenv("MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE","0",1);search_diagnostic_sink_test=DiagnosticSink;
   diagnostic_size=diagnostic_writes=0;
   {SearchDiagnostic d;SearchDiagnostic::Phase phase("disabled");d.status=200;need(!d.id&&!phase.begin,"diagnostic disabled performs no phase clock collection");}
   need(!diagnostic_writes,"diagnostic disabled emits nothing");
   {SearchDiagnostic d;d.id=77;d.entered=SearchDiagnostic::Tick();d.status=200;SearchDiagnostic::CostRow("overlay",d.entered,d.entered);}
   need(std::string(diagnostic_line.data(),diagnostic_size).find("\"id\":77")!=std::string::npos,
        "diagnostic external proof overlay ID remains independent of opt-in budget");
   setenv("MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE","1",1);SearchDiagnostic::sequence=128;ResetDetailBudget();
   for(auto invalid:{std::string{},std::string(65,'a'),std::string("bad\nID"),std::string("bad\"ID"),std::string("a,b")}){
    SearchDiagnostic::HttpRequest request(invalid);
    need(!request.dispatch&&!request.client[0],"diagnostic invalid or oversized header cannot enter output");
   }
   for(auto code:{200,503}){
    diagnostic_size=0;
    http_size=0;
    {SearchDiagnostic::HttpRequest request(std::string(64,'a'));
    {SearchDiagnostic d;d.status=code;d.entered-=5000000000ULL;d.attempt=2;
     for(auto& a:d.attempts){a.instance=a.current_instance=a.captured=a.current=std::numeric_limits<std::uint64_t>::max();a.authority=true;}
     d.capture_count=6;
     for(unsigned i=0;i<6;++i){auto& c=d.captures[i];c.attempt=i/2;c.parent=i%2;c.observed=0x1ff0f;c.complete=i!=5;c.begin=1;c.end=1+std::uint64_t(UINT32_MAX)*1000;
      c.catalog_lock.fill(std::uint64_t(UINT32_MAX)*1000);c.history_cost.fill(std::uint64_t(UINT32_MAX)*1000);
      c.read_ns=c.outside_ns=c.parse_ns=std::uint64_t(UINT32_MAX)*1000;c.rows=c.cut_rows=c.raw_bytes=c.decode_calls=c.decode_hits=c.shared=c.materialized=UINT32_MAX;}
     for(unsigned i=0;i<41;++i)SearchDiagnostic::CostRow("PlaybackCandidates",std::numeric_limits<std::uint64_t>::max(),std::numeric_limits<std::uint64_t>::max());}
    request.Prepared(code);request.SendBegin();request.SendEnd(false);}
    const std::string line(diagnostic_line.data(),diagnostic_size);ingress::StrictJsonObjectDocument json;std::string detail;
    need(diagnostic_size<5632&&ingress::ParseStrictJsonObjectDocument(line.substr(line.find('{')),&json,&detail),
         "diagnostic maximum phase and revision widths form complete bounded JSON");
    need(json.Find("loss")->bool_value&&json.Find("selection")->raw=="2"&&std::stoul(json.Find("id")->raw)>128,
         "diagnostic late success or failure preserves phases and explicit overflow");
    need(json.Find("clientRequestId")->string_value==std::string(64,'a')&&json.Find("revisions")->raw.size()>100,
         "diagnostic one HTTP identity spans all three revision attempts");
    need(json.Find("captureVersion")->raw=="1"&&json.Find("captureUnit")->string_value=="us"&&
         json.Find("captures")->raw.find("4294967295")!=std::string::npos&&!json.Find("captureLoss")->bool_value&&!json.Find("captureValueLoss")->bool_value,
         "diagnostic six maximum-width captures fit alongside forty phases and three revisions");
    const std::string terminal(http_line.data(),http_size);ingress::StrictJsonObjectDocument wire;
    need(http_size<512&&ingress::ParseStrictJsonObjectDocument(terminal.substr(terminal.find('{')),&wire,&detail)&&
         wire.Find("id")->raw==json.Find("id")->raw&&wire.Find("clientRequestId")->string_value==std::string(64,'a')&&
         wire.Find("status")->raw==std::to_string(code)&&!wire.Find("sent")->bool_value,
         "diagnostic HTTP failed send preserves late service status and identical IDs");
   }
   diagnostic_size=0;
   try{SearchDiagnostic d;d.status=503;d.exception="bad_alloc";d.capture_count=1;
    auto& c=d.captures[0];c.begin=1;c.end=17001;c.observed=1;c.catalog_lock[1]=UINT64_MAX;c.rows=UINT64_MAX;
    SearchDiagnostic::Phase phase("exception-unwind");throw std::bad_alloc();}
   catch(const std::bad_alloc&){}
   need(diagnostic_size&&SearchDiagnostic::active==nullptr,"diagnostic exception unwinding preserves terminal record and restores TLS");
   {const std::string line(diagnostic_line.data(),diagnostic_size);ingress::StrictJsonObjectDocument json;std::string detail;
    need(ingress::ParseStrictJsonObjectDocument(line.substr(line.find('{')),&json,&detail)&&json.Find("captureValueLoss")->bool_value&&
      json.Find("captures")->raw.find("\"complete\":false")!=std::string::npos&&json.Find("captures")->raw.find("[17,0,null,null,null")!=std::string::npos,
      "diagnostic exception preserves partial Capture; absent stages and overflow are null, observed zero remains zero");}
   search_diagnostic_sink_test=nullptr;ResetDetailBudget();SearchDiagnostic::sequence=0;
   if(had_env)setenv("MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE",saved.c_str(),1);else unsetenv("MEDIA_SERVER_VERIFY_RECORDING_SEARCH_TRACE");
  }
#endif
  std::string error;RecordingRuntimeStorage runtime(std::filesystem::path(argv[1])/"recording");need(runtime.Open(&error),"generation runtime open");
  auto& catalog=runtime.catalog();auto input=Encode(true,30);
  const auto write=[&](const std::string& generation,const std::string& channel="channel-1"){
   GStreamerSegmentWriter writer(runtime.WriterOptions(1000));need(writer.Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"actual writer start");
   for(auto packet:input.packets){packet.observation->source_generation=generation;writer.Push(packet,0);}writer.Stop();
  };
  write("first");need(catalog.Checkpoint(&error),"actual cold checkpoint");
  SearchSourceBatch first,empty,second,fresh;
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&first,&error,{},false,&empty)&&RecordingSearchRetryTestProbe::Spans(first)>0,"actual cold raw span path entered");
  const auto old_count=first.delta.upserts.size();write("second");
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&second,&error,{},false,&first)&&first.memory.bytes()==0&&
    RecordingSearchRetryTestProbe::Reused(second)>0&&second.delta.upserts.size()>old_count,"current cold raw reuses old spans and includes real new writer");
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&fresh,&error,{},false),"independent no-reuse full capture");
  const auto same=[](const auto& a,const auto& b){
   if(a.size()!=b.size())return false;
   for(std::size_t i=0;i<a.size();++i){const auto& x=a[i];const auto& y=b[i];
    const auto fields=[](const auto& d){return std::tie(d.id,d.channel_id,d.kind,d.segment_id,d.source_id,d.store_id,d.media_epoch_id,
      d.playback_segment_id,d.playback_event_id,d.playback_job_id,d.observation_id,d.reference_id,d.analysis_namespace,
      d.stream_epoch_id,d.track_id,d.object,d.start_ns,d.end_ns,d.time_provenance,d.uncertainty_ns,d.media_pts,d.media_end_pts,
      d.time_base_num,d.time_base_den,d.event_ids,d.zone_ids,d.rule_ids,d.unavailable_reason);};
    if(fields(x)!=fields(y)||x.event_facts.size()!=y.event_facts.size())return false;
    for(std::size_t j=0;j<x.event_facts.size();++j)if(std::tie(x.event_facts[j].event_id,x.event_facts[j].event_type,x.event_facts[j].scenario_name)!=
      std::tie(y.event_facts[j].event_id,y.event_facts[j].event_type,y.event_facts[j].scenario_name))return false;
   }return true;
  };
  need(same(second.delta.upserts,fresh.delta.upserts),"all recording source fields agree with independent full capture");
  std::size_t bytes=sizeof(SearchSourceBatch),peak=bytes,capacity=0,count=0;
  for(const auto& d:fresh.delta.upserts){need(AccountOwnedSearchDocument(d,&bytes,SIZE_MAX),"independent owned document charge");
   const auto required=++count;const auto next=capacity<required?required+std::min(capacity?capacity-1:std::size_t{0},std::size_t{1023}):capacity;
   peak=std::max(peak,bytes+(next-required+(capacity<required?capacity:0))*sizeof(SearchDocument));capacity=next;
  }
  SearchSourceBatch bounded;
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&bounded,&error,{100000,peak},false,&empty)&&
    same(bounded.delta.upserts,fresh.delta.upserts)&&RecordingSearchRetryTestProbe::Spans(bounded)==0,
    "cold optional spans yield to exact document and vector capacity envelope");
  std::shared_ptr<const RecordingSearchModel> compact_model;
  need(RecordingSearchModel::BuildOwned(std::move(fresh.delta.upserts),fresh.delta.source_instance,fresh.delta.revision,&compact_model,&error),
    "R132 allocation hint does not survive as model index slack");
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&fresh,&error,{},false),"R132 independent source restored after model ownership transfer");
  const auto id=second.delta.upserts.front().segment_id;
  need(catalog.MarkSegmentCorrupt(id,"container-invalid",&error),"separate lifecycle changed without segment raw change");
  SearchSourceBatch current;
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&current,&error,{},false,&second)&&RecordingSearchRetryTestProbe::Reused(current)>0&&
    std::any_of(current.delta.upserts.begin(),current.delta.upserts.end(),[&](const auto& d){return d.segment_id==id&&d.unavailable_reason=="corrupt";}),
    "cold reused neighbors retain current corrupt lifecycle for changed segment");
  SearchSourceBatch range;
  need(catalog.CaptureSearchSource({"other-channel"},nullptr,&range,&error,{},false,&current)&&range.delta.upserts.empty()&&RecordingSearchRetryTestProbe::Reused(range)==0,
    "nonempty cold prior cannot cross normalized source scope");
  SearchSourceBatch prior;const SearchModelLimits exact(fresh.delta.upserts.size(),64*1024*1024);
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&prior,&error,exact,false,&empty)&&RecordingSearchRetryTestProbe::Spans(prior)>0,"cold exact-count prior created");
  write("third");SearchSourceBatch unchanged;unchanged.delta.source_instance="sentinel";
  need(!catalog.CaptureSearchSource({"channel-1"},nullptr,&unchanged,&error,exact,false,&prior)&&error=="search-capacity-exceeded"&&
    prior.memory.bytes()==0&&unchanged.delta.source_instance=="sentinel","cold growth rejection consumes prior once and preserves output");
#ifdef RECORDING_SEARCH_TESTING
  RecordingReadService reads(catalog);RecordingSearchReader reader(catalog,reads);
  std::shared_ptr<const RecordingSearchModel> prior_model,post_model,oracle;
  need(reader.Refresh({"channel-1"},{},&prior_model,&error,{},false),"R132 initial immutable model");
  SearchSourceBatch post_retry;
  unsigned post_calls=0;
  search_after_build_test=[&]{++post_calls;write("post-build-new");};
  need(!reader.Refresh({"channel-1"},{},&post_model,&error,{},false,&post_retry)&&
    error=="search-source-changed"&&!post_model&&post_retry.memory.bytes()>0&&
    RecordingSearchRetryTestProbe::Spans(post_retry)>0&&post_calls==1,
    "R132 real postBuild finalization retains unpublished source only");
  search_after_build_test={};
  need(reader.Refresh({"channel-1"},{},&post_model,&error,{},false,&post_retry)&&post_retry.memory.bytes()==0,
    "R132 postBuild retry succeeds with current new source");
  need(reader.Refresh({"channel-1"},{},&oracle,&error,{},false)&&same(post_model->documents(),oracle->documents())&&
    prior_model->documents().size()<post_model->documents().size(),
    "R132 postBuild IDs order counts fields match independent full model and prior unchanged");
  const auto live=std::find_if(oracle->documents().begin(),oracle->documents().end(),[&](const auto& d){return d.segment_id!=id;});
  need(live!=oracle->documents().end(),"R132 independent live segment for detached lifecycle race");
  const auto live_id=live->segment_id;
  bool outside=false;
  search_outside_raw_cut_test=[&]{outside=true;need(catalog.MarkSegmentCorrupt(live_id,"container-invalid",&error),"R132 callback may acquire Catalog outside raw cut");};
  SearchSourceBatch old_cut;
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&old_cut,&error,{},false)&&outside,
    "R132 actual cold cut runs outside Catalog with owned raw");
  search_outside_raw_cut_test={};
  need(!catalog.ValidateSearchSource(old_cut,&error)&&error=="search-source-changed",
    "R132 real detached lifecycle change rejects old currentness");
  // Resource failure in optional detached processing must retry strictly, once,
  // after releasing the cut. It must not publish partially moved documents.
  unsigned refused=0;
  search_outside_raw_cut_test=[&]{++refused;throw RecordingResourceUnavailable();};
  SearchSourceBatch fallback;
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&fallback,&error,{},false)&&refused==1,
    "R132 detached reservation exception falls back once to locked full authentication");
  search_outside_raw_cut_test={};
  SearchSourceBatch fallback_oracle;
  need(catalog.CaptureSearchSource({"channel-1"},nullptr,&fallback_oracle,&error,{},false)&&same(fallback.delta.upserts,fallback_oracle.delta.upserts),
    "R132 optional cut failure preserves exact full source result");
  // R167 retains the full authenticated capture, including old rows. Only the
  // final ordering work can use the previous immutable model.
  std::shared_ptr<const RecordingSearchModel> append_base,appended,full_oracle;
  need(reader.Refresh({"channel-1"},{},&append_base,&error,{},false),"R167 actual immutable base");
  write("r167-add");SearchSourceBatch append_capture;
  need(catalog.CaptureSearchSource({"channel-1"},append_base.get(),&append_capture,&error,{},false)&&
       append_capture.rebuild&&append_capture.append_order_hint,"R167 actual bound finalize enables ordering hint with full capture");
  need(reader.Refresh({"channel-1"},append_base,&appended,&error,{},false)&&search_order_work_test[0]==0&&
       search_order_work_test[1]==appended->documents().size()-append_base->documents().size()&&
       search_order_work_test[2]==appended->documents().size(),"R167 real reader sorts additions only");
  std::cout<<"[append-order-work] fullSort="<<search_order_work_test[0]<<" addedSort="<<search_order_work_test[1]<<" merged="<<search_order_work_test[2]<<'\n';
  need(reader.Refresh({"channel-1"},{},&full_oracle,&error,{},false)&&same(appended->documents(),full_oracle->documents()),
       "R167 actual append ordering equals strict full source");
  // Same current raw, prior model, limits and query order; one short AB/BA
  // pair. Timing is complete authenticated Refresh, not a synthetic Build.
  std::array<std::size_t,4> strict_work{},shared_work{};
  for(const bool sharing:{false,true,true,false}) {
    search_projection_reuse_test_enabled=sharing;search_projection_work_test={};
    const auto held_before=catalog.SearchResidency()->used();
    std::shared_ptr<const RecordingSearchModel> measured;
    const auto begin=std::chrono::steady_clock::now();
    const auto ok=reader.Refresh({"channel-1"},append_base,&measured,&error,{},false);
    const auto elapsed=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-begin).count();
    need(ok&&same(measured->documents(),full_oracle->documents()),"R169 strict/shared full Refresh fields and order agree");
    need(measured->Channel("channel-1")==full_oracle->Channel("channel-1"),"R169 channel index agrees");
    std::size_t aliases=0;for(const auto& d:measured->documents()) {
      need(measured->Find(d.id)==&d,"R169 ID index points at exact document");
      if(append_base->Find(d.id)==&d)++aliases;
    }
    if(sharing)shared_work=search_projection_work_test;else strict_work=search_projection_work_test;
    need(sharing?aliases==search_projection_work_test[2]&&aliases>0:aliases==0,"R169 actual immutable sharing versus independent materialization");
    std::cout<<"[projection-work] sharing="<<sharing<<" raw="<<search_projection_work_test[0]<<" materialized="<<search_projection_work_test[1]
      <<" shared="<<search_projection_work_test[2]<<" fallback="<<search_projection_work_test[3]<<" documents="<<measured->documents().size()
      <<" logicalBytes="<<measured->accounted_bytes()<<" retainedDelta="<<catalog.SearchResidency()->used()-held_before<<" elapsedMs="<<elapsed<<'\n';
    measured.reset();need(catalog.SearchResidency()->used()==held_before,"R169 measured model returns all per-model and new-block reservations");
  }
  search_projection_reuse_test_enabled=true;
  need(strict_work[0]>0&&strict_work[0]==shared_work[0]&&shared_work[1]+shared_work[2]==strict_work[1]&&shared_work[3]==0,
    "R169 same authenticated raw count with fewer materialized documents");
  search_projection_build_refused_test=true;search_projection_work_test={};
  std::shared_ptr<const RecordingSearchModel> refused_model;
  need(reader.Refresh({"channel-1"},append_base,&refused_model,&error,{},false)&&same(refused_model->documents(),full_oracle->documents())&&
       search_projection_work_test[3]==1&&search_projection_work_test[0]==2*strict_work[0],
       "R169 optional sharing refusal releases metadata and performs one strict authenticated recapture");
  search_projection_build_refused_test=false;refused_model.reset();
  search_projection_work_test={};unsigned shared_pressure=0;
  search_outside_raw_cut_test=[&]{++shared_pressure;throw RecordingResourceUnavailable();};
  need(reader.Refresh({"channel-1"},append_base,&refused_model,&error,{},false)&&shared_pressure==1&&
       search_projection_work_test[3]==1&&same(refused_model->documents(),full_oracle->documents()),
       "R169 optional sharing pressure before Build releases owners and preserves strict success");
  search_outside_raw_cut_test={};refused_model.reset();
  auto foreign=std::make_shared<SearchModelResidency>();search_projection_work_test={};
  need(reader.Refresh({"channel-1"},append_base,&refused_model,&error,{100000,64*1024*1024,foreign},false)&&
       same(refused_model->documents(),full_oracle->documents())&&search_projection_work_test[2]==0&&refused_model->residency()==foreign,
       "R169 different residency owner cannot borrow uncharged backing");
  refused_model.reset();need(foreign->used()==0,"R169 foreign owner fully released");
  const auto before_reject=appended;
  need(!reader.Refresh({"channel-1"},append_base,&appended,&error,{1,64*1024*1024},false)&&error=="search-capacity-exceeded"&&appended==before_reject,
       "R169 capacity error preserves prior published output");
  for(const auto& d:append_base->documents())if(d.unavailable_reason=="media-not-checked")
    {shared_projection=appended->Find(d.id)==&d;break;}
  const auto saved_append=appended;
  const std::vector<SearchDocument> saved_documents(saved_append->documents().begin(),saved_append->documents().end());
  need(reader.Refresh({"channel-1"},appended,&appended,&error,{},false)&&appended==saved_append,"R167 unchanged scope reuses model");
  write("r167-other","channel-2");
  need(reader.Refresh({"channel-1"},appended,&appended,&error,{},false)&&appended==saved_append,"R167 other channel mutation preserves scope");
  const auto added_id=std::find_if(appended->documents().begin(),appended->documents().end(),[&](const auto& d){return !append_base->Find(d.id);})->segment_id;
  need(catalog.MarkSegmentCorrupt(added_id,"container-invalid",&error),"R167 changed lifecycle fixture");
  need(catalog.CaptureSearchSource({"channel-1"},appended.get(),&append_capture,&error,{},false)&&
       append_capture.rebuild&&!append_capture.append_order_hint,"R167 lifecycle change refuses append ordering");
  need(reader.Refresh({"channel-1"},appended,&appended,&error,{},false)&&
       reader.Refresh({"channel-1"},{},&full_oracle,&error,{},false)&&same(appended->documents(),full_oracle->documents()),
       "R167 lifecycle fallback equals strict full source");
  need(same(saved_documents,saved_append->documents()),
       "R167 held prior model retains pre-mutation lifecycle");
  // STATE45-SEARCH-SOURCE-01: actual retention invalidation and ownership.
  // Compare optional projection reuse with an independent strict capture.
  // Counts report work, not a claim that a retry/build optimization is present.
  const auto retention_base=appended;
  const auto doomed=std::find_if(retention_base->documents().begin(),retention_base->documents().end(),
    [](const auto& d){return d.unavailable_reason=="media-not-checked";});
  need(doomed!=retention_base->documents().end(),"retention sharing live victim");
  const auto doomed_id=doomed->segment_id;
  const auto doomed_location=catalog.FindSegmentMediaLocation(doomed_id);
  need(bool(doomed_location),"retention fixture records owned path while finalized");
  std::array<std::shared_ptr<SearchModelResidency>,2> retention_owners{
    std::make_shared<SearchModelResidency>(),std::make_shared<SearchModelResidency>()};
  std::array<std::shared_ptr<const RecordingSearchModel>,2> retention_sources;
  for(unsigned i=0;i<2;++i)need(reader.Refresh({"channel-1"},{},&retention_sources[i],&error,
    {100000,64*1024*1024,retention_owners[i]},false),"retention independent residency base");
  need(catalog.RequestDeletion(doomed_id,"continuous-capacity",&error),"retention sharing pending mutation");
  auto compare_retention=[&](const char* phase,bool deleted) {
    std::shared_ptr<const RecordingSearchModel> expected;
    search_projection_reuse_test_enabled=false;
    need(reader.Refresh({"channel-1"},{},&expected,&error,{},false),"retention independent current full capture");
    std::array<std::size_t,4> strict{},shared{};
    for(const bool sharing:{false,true}) {
      search_projection_reuse_test_enabled=sharing;search_projection_work_test={};
      const auto held_bytes=catalog.SearchResidency()->used();
      std::shared_ptr<const RecordingSearchModel> measured;
      const auto begin=std::chrono::steady_clock::now();
      need(reader.Refresh({"channel-1"},retention_base,&measured,&error,{},false)&&
           same(measured->documents(),expected->documents()),"retention strict/shared exact current membership and fields");
      const auto elapsed=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-begin).count();
      const auto work=search_projection_work_test;if(sharing)shared=work;else strict=work;
      need(deleted?std::none_of(measured->documents().begin(),measured->documents().end(),[&](const auto& d){return d.segment_id==doomed_id;}):
        std::any_of(measured->documents().begin(),measured->documents().end(),[&](const auto& d){return d.segment_id==doomed_id&&d.unavailable_reason=="deletion-pending";}),
        "retention changed lifecycle cannot share stale fields or resurrect deleted mappings");
      for(const auto& d:measured->documents())need(measured->Find(d.id)==&d,"retention shared ID index exact address");
      std::cout<<"[retention-projection] phase="<<phase<<" sharing="<<sharing<<" raw="<<work[0]<<" materialized="<<work[1]
        <<" shared="<<work[2]<<" fallback="<<work[3]<<" elapsedMs="<<elapsed<<" retainedDelta="<<catalog.SearchResidency()->used()-held_bytes<<'\n';
      measured.reset();need(catalog.SearchResidency()->used()==held_bytes,"retention model destruction returns all new reservations");
    }
    need(strict[0]>0&&strict[0]==shared[0]&&shared[1]+shared[2]==strict[1]&&shared[3]==0,
      "retention full authentication and projection accounting agree");
    for(unsigned i=0;i<2;++i) {
      search_projection_reuse_test_enabled=i!=0;
      need(reader.Refresh({"channel-1"},retention_sources[i],&retention_sources[i],&error,
        {100000,64*1024*1024,retention_owners[i]},false),"retention sole source replacement");
      std::cout<<"[retention-sole-owner] phase="<<phase<<" sharing="<<i<<" used="<<retention_owners[i]->used()
        <<" peak="<<retention_owners[i]->peak()<<" documents="<<retention_sources[i]->documents().size()<<'\n';
    }
  };
  compare_retention("pending",false);
  RecordingTombstoneV2 tomb;tomb.tombstone_id="search-retention-gone";tomb.segment=*catalog.FindSegmentV2ById(doomed_id);
  tomb.deletion_reason="continuous-capacity";tomb.deleted_at_ms=1792920000000LL;
  need(std::filesystem::remove(doomed_location->first/doomed_location->second),"retention fixture unlinks owned media before completion");
  need(catalog.CompleteDeletionV2(tomb,&error),"retention real generation retired mutation");
  compare_retention("retired",true);
  need(catalog.Checkpoint(&error),"retention generation transition");
  compare_retention("checkpoint",true);
  retention_sources={};
  need(retention_owners[0]->used()==0&&retention_owners[1]->used()==0,"retention last source releases all blocks including removed documents");
  need(std::any_of(retention_base->documents().begin(),retention_base->documents().end(),[&](const auto& d){return d.segment_id==doomed_id&&d.unavailable_reason=="media-not-checked";}),
       "retention prior immutable source remains unchanged");
  search_projection_reuse_test_enabled=true;
  for(const bool delta:{false,true}) {
    // Deterministic real Retention mutations at each existing capture boundary.
    // Preserve the original three-attempt assertion in the baseline arm.
    search_retention_delta_test_enabled=delta;search_retention_delta_work_test={};
    std::shared_ptr<const RecordingSearchModel> race_source;
    need(reader.Refresh({"channel-1"},{},&race_source,&error,{},false),"retention race current source");
    std::set<std::string> victims;
    for(const auto& d:race_source->documents())if(d.unavailable_reason=="media-not-checked")victims.insert(d.segment_id);
    need(victims.size()>=3,"retention race has three independent live segments");
    const auto owner_before=catalog.SearchResidency()->used();
    auto settled_scratch=catalog.ScratchResidency()->usage();
    const auto resources=[&](const char* phase){const auto scratch=catalog.ScratchResidency()->usage();
      std::cout<<"[delta-resource] delta="<<delta<<" phase="<<phase<<" owner="<<catalog.SearchResidency()->used()
        <<" peak="<<catalog.SearchResidency()->peak()<<" scratchDisk="<<scratch.disk_bytes<<" scratchFd="<<scratch.file_descriptors
        <<" scratchRam="<<scratch.ram_bytes<<'\n';};
    resources("before");
    {
      ingress::RecordingApplicationService application(reads,catalog,true,{});
      const auto& recent=race_source->documents().front();
      const auto end_ms=recent.end_ns?*recent.end_ns/1000000+1:1;
      const std::unordered_map<std::string,std::string> query{{"channelIds","channel-1"},{"startTimeMs",std::to_string(std::max<std::int64_t>(0,end_ms-30000))},
        {"endTimeMs",std::to_string(end_ms)},{"includeUnplaced","true"}};
      const auto allowed=[](const auto& c){return c=="channel-1";};
      need(application.Search(query,"owner","scope",allowed).status==200,"retention race application warmup");
      unsigned captures=0,builds=0,rebuilds=0;auto victim=victims.begin();
      search_after_capture_test=[&]{
        ++captures;const auto* d=SearchDiagnostic::active;if(d&&d->attempts[d->attempt].rebuild)++rebuilds;
        if(victim==victims.end()||!catalog.RequestDeletion(*victim++,"continuous-capacity",&error))throw std::runtime_error(error);
        settled_scratch=catalog.ScratchResidency()->usage();
      };
      search_after_build_test=[&]{++builds;};
      const auto begin=std::chrono::steady_clock::now();
      ingress::ApplicationServiceResult rejected;
      {
        latency::Scope measurement(latency::Operation::Query,latency::Source::Test,__LINE__,true,true);
        std::cout<<"[delta-lock-request] delta="<<delta<<" request="<<latency::local.request<<'\n';
        rejected=application.Search(query,"owner","scope",allowed);
      }
      search_after_capture_test={};search_after_build_test={};
      const auto work=search_retention_delta_work_test;
      std::cout<<"[retention-retry] delta="<<delta<<" captures="<<captures<<" rebuildCaptures="<<rebuilds<<" completedBuilds="<<builds<<" status="<<rejected.status
        <<" deltaAttempted="<<work[0]<<" deltaApplied="<<work[1]<<" deltaRefused="<<work[2]
        <<" elapsedMs="<<std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-begin).count()<<'\n';
      resources("request-complete");
      if(!delta)need(captures==3&&rejected.status==503&&rejected.body=="{\"error\":\"recording-search-unavailable\"}","real retention changes exhaust exactly three attempts without stale success");
      else {
        need(captures==2&&rebuilds==1&&builds==1&&rejected.status==200&&work==std::array<unsigned,3>{2,1,1},
          "authenticated retention delta reduces captures and retries without changing attempt limit");
        ingress::RecordingApplicationService independent(reads,catalog,true,{});
        const auto fresh=independent.Search(query,"owner","scope",allowed);
        ingress::StrictJsonObjectDocument actual,expected;
        need(fresh.status==200&&ingress::ParseStrictJsonObjectDocument(rejected.body,&actual,&error)&&
          ingress::ParseStrictJsonObjectDocument(fresh.body,&expected,&error),"retention delta independent public result parses");
        for(const auto* key:{"items","knownCount","unplacedCount","appliedQuery"})
          need(actual.Find(key)&&expected.Find(key)&&actual.Find(key)->raw==expected.Find(key)->raw,"retention delta public fields equal fresh current source");
      }
      const auto invoke=[&]{return application.Search(query,"owner","scope",allowed);};
      auto one=std::async(std::launch::async,invoke);auto two=std::async(std::launch::async,invoke);
      need(one.get().status==200&&two.get().status==200,"two same-channel requests recover after retention mutations settle");
      resources("concurrent-complete");
    }
    need(catalog.SearchResidency()->used()==owner_before,"retention retry and concurrent application release source snapshot and request owners");
    const auto returned=catalog.ScratchResidency()->usage();
    need(returned.disk_bytes==settled_scratch.disk_bytes&&returned.file_descriptors==settled_scratch.file_descriptors&&
      catalog.ScratchResidency()->ReaderCleanupHealthy(),"retention requests return scratch files and FDs after actual mutation growth");
    resources("released");
  }
  need(RecordingSearchRetryTestProbe::InvalidationBytes()==144,"retention metadata keeps existing fixed invalidation entry bytes");
  // Same actual Writer/Generation fixture; no alternate source implementation.
  write("delta-cases-a");write("delta-cases-b");
  for(const std::string mode:{"deleted","checkpoint","during-apply","post-build","bad-alloc","budget","floor","mismatch"}) {
    auto owner=std::make_shared<SearchModelResidency>();const SearchModelLimits limits{100000,64*1024*1024,owner};
    std::shared_ptr<const RecordingSearchModel> held,result,independent;
    need(reader.Refresh({"channel-1"},{},&held,&error,limits,false),"delta case immutable prior source");
    const auto victim=std::find_if(held->documents().begin(),held->documents().end(),[](const auto& d){return d.unavailable_reason=="media-not-checked";});
    need(victim!=held->documents().end(),"delta case has a live source");
    const auto victim_id=victim->segment_id;const auto location=catalog.FindSegmentMediaLocation(victim_id);
    const auto original=*catalog.FindSegmentV2ById(victim_id);
    const std::vector<SearchDocument> held_docs(held->documents().begin(),held->documents().end());
    result=held;const auto before_bytes=owner->used(),capture_peak=owner->peak();SearchModelResidency::Reservation pressure;
    unsigned injected=0;search_retention_delta_work_test={};
    search_after_capture_test=[&]{
      if(!catalog.RequestDeletion(victim_id,"continuous-capacity",&error))throw std::runtime_error(error);
      if(mode=="deleted"||mode=="bad-alloc") {
        RecordingTombstoneV2 gone;gone.tombstone_id="delta-gone-"+victim_id;gone.segment=original;
        gone.deletion_reason="continuous-capacity";gone.deleted_at_ms=1792920000000LL;
        if(!location||!std::filesystem::remove(location->first/location->second)||!catalog.CompleteDeletionV2(gone,&error))throw std::runtime_error(error);
      }
      if(mode=="checkpoint"&&!catalog.Checkpoint(&error))throw std::runtime_error(error);
      if(mode=="floor"||mode=="mismatch")RecordingSearchRetryTestProbe::RefuseCoverage(catalog,mode=="floor");
      if(mode=="budget") {auto reserved=owner->ReserveOwned(owner->limit()-owner->used());if(!reserved)throw std::runtime_error("pressure setup");pressure=std::move(*reserved);}
    };
    if(mode=="bad-alloc")search_retention_delta_apply_test=[&]{if(++injected==2)throw std::bad_alloc();};
    if(mode=="during-apply")search_retention_delta_apply_test=[&]{if(++injected==1)write("delta-during-apply");};
    if(mode=="post-build")search_after_build_test=[&]{write("delta-post-build");};
    const auto ok=reader.Refresh({"channel-1"},{},&result,&error,limits,false);
    search_after_capture_test={};search_after_build_test={};search_retention_delta_apply_test={};pressure={};
    const auto applied=search_retention_delta_work_test[1];
    if(mode=="deleted"||mode=="checkpoint") {
      need(ok&&applied==1,"delta applies authenticated deletion or checkpoint plus state change");
      const auto delta_peak=owner->peak();auto oracle_owner=std::make_shared<SearchModelResidency>();
      need(reader.Refresh({"channel-1"},{},&independent,&error,{limits.max_documents,limits.max_bytes,oracle_owner},false)&&same(result->documents(),independent->documents()),
        "delta model all fields and ordering equal independent current capture");
      if(mode=="deleted")need(std::none_of(result->documents().begin(),result->documents().end(),[&](const auto& d){return d.segment_id==victim_id;}),
        "delta deleted segment has no remaining mapping");
      const auto result_bytes=oracle_owner->used();independent.reset();
      need(result_bytes==owner->used()-before_bytes,
        "delta and independent model retain identical physical ownership");
      need(oracle_owner->used()==0&&delta_peak<=before_bytes+std::max(capture_peak,oracle_owner->peak()),
        "delta peak fits strict pre and post mutation full capture envelope with held source");
      std::cout<<"[delta-owner] mode="<<mode<<" retained="<<owner->used()-before_bytes<<" oracle="<<result_bytes<<" peak="<<delta_peak
        <<" held="<<before_bytes<<" preCapturePeak="<<capture_peak<<" currentCapturePeak="<<oracle_owner->peak()<<'\n';
    } else {
      need(!ok&&result==held&&owner->used()==before_bytes,"delta refusal or partial failure preserves prior source and returns private owners");
      need((mode=="bad-alloc"||mode=="budget")?error=="search-capacity-exceeded":error=="search-source-changed",
        "delta failure retains typed capacity or currentness error");
      if(mode=="bad-alloc")need(injected==2,"delta fault injected after partial private compaction");
      if(mode=="during-apply")need(injected>0&&search_retention_delta_work_test==std::array<unsigned,3>{1,0,1},
        "delta unlocked edit permits real writer reentry and rejects changed revision before Build");
      need(reader.Refresh({"channel-1"},{},&independent,&error,limits,false),"delta refusal leaves current source readable");
    }
    need(same(held_docs,held->documents()),"delta never mutates existing immutable source");
    held.reset();result.reset();independent.reset();need(owner->used()==0,"delta case last owner fully returned");
  }
  for(const unsigned count:{31U,32U,33U,1U}) {
    const bool long_identity=count==1;
    const auto channel=long_identity?std::string(100,'x'):"delta-bound-"+std::to_string(count);
    for(unsigned i=0;i<(long_identity?1U:12U);++i)write("delta-bound-"+std::to_string(i),channel);
    std::shared_ptr<const RecordingSearchModel> held,rejected;
    need(reader.Refresh({channel},{},&held,&error,{},false),"delta bound original source");
    std::set<std::string> victims;for(const auto& d:held->documents())victims.insert(d.segment_id);
    need(victims.size()>=count,"delta bound actual writer supplies distinct identities");
    rejected=held;search_retention_delta_work_test={};
    search_after_capture_test=[&]{auto it=victims.begin();for(unsigned i=0;i<count;++i)
      if(!catalog.RequestDeletion(*it++,"continuous-capacity",&error))throw std::runtime_error(error);};
    const auto ok=reader.Refresh({channel},{},&rejected,&error,{},false);
    if(count==31||count==32)need(ok&&search_retention_delta_work_test==std::array<unsigned,3>{1,1,0},
      "delta accepts 31 and exactly 32 distinct changed segments");
    else need(!ok&&error=="search-source-changed"&&rejected==held&&search_retention_delta_work_test==std::array<unsigned,3>{1,0,1},
      "delta refuses over-limit changes or identities that do not fit existing storage");
    search_after_capture_test={};
    if(ok){std::shared_ptr<const RecordingSearchModel> oracle;
      need(reader.Refresh({channel},{},&oracle,&error,{},false)&&same(rejected->documents(),oracle->documents()),
        "delta boundary result equals independent current capture");}
    need(std::all_of(held->documents().begin(),held->documents().end(),[](const auto& d){return d.unavailable_reason=="media-not-checked";}),
      "delta boundary keeps original source immutable");
    std::cout<<"[delta-boundary] segments="<<count<<" longIdentity="<<long_identity<<" accepted="<<ok<<'\n';
    need(reader.Refresh({channel},{},&rejected,&error,{},false),"delta bound refusal preserves ordinary full recapture");
  }
  // Actual durable identical-state mutations exercise duplicate identities and
  // the existing ring's overwrite boundary, without fabricating revision rows.
  for(const unsigned records:{1024U,1025U}) {
    auto owner=std::make_shared<SearchModelResidency>();const SearchModelLimits limits{100000,64*1024*1024,owner};
    std::shared_ptr<const RecordingSearchModel> held,result,oracle;
    need(reader.Refresh({"delta-bound-31"},{},&held,&error,limits,false),"delta ring current source");
    const auto victim=std::find_if(held->documents().begin(),held->documents().end(),[](const auto& d){return d.unavailable_reason=="deletion-pending";});
    need(victim!=held->documents().end(),"delta ring has actual pending segment");
    const auto id=victim->segment_id,source_instance=held->source_instance();
    const auto revision=held->revision();const auto before=owner->used();result=held;search_retention_delta_work_test={};
    search_after_capture_test=[&]{if(!RecordingSearchRetryTestProbe::RepeatPending(catalog,id,records,&error))throw std::runtime_error(error);};
    const auto ok=reader.Refresh({"delta-bound-31"},{},&result,&error,limits,false);
    search_after_capture_test={};const auto ring=RecordingSearchRetryTestProbe::RingState(catalog);
    need(ring[2]==1024&&ring[1]-revision==records,"delta ring uses exact successful durable revisions and fixed capacity");
    if(records==1024)need(ok&&ring[0]<=revision&&result->revision()==ring[1]&&result->source_instance()==source_instance&&
      search_retention_delta_work_test==std::array<unsigned,3>{1,1,0},"delta covers exactly 1024 records and deduplicates one segment");
    else need(!ok&&error=="search-source-changed"&&ring[0]>revision&&result==held&&owner->used()==before&&
      search_retention_delta_work_test==std::array<unsigned,3>{1,0,1},"delta refuses overwritten required revision without partial publication");
    need(reader.Refresh({"delta-bound-31"},{},&oracle,&error,limits,false)&&(!ok||same(result->documents(),oracle->documents())),
      "delta ring result or strict fallback agrees with current authenticated source");
    std::cout<<"[delta-ring] records="<<records<<" revision="<<revision<<" floor="<<ring[0]<<" current="<<ring[1]<<" accepted="<<ok<<'\n';
    held.reset();result.reset();oracle.reset();need(owner->used()==0,"delta ring final source owners returned");
  }
  // A real snapshot retains non-contiguous payload after both source owners go.
  {
    auto owner=std::make_shared<SearchModelResidency>();std::shared_ptr<const RecordingSearchModel> base,child;
    need(reader.Refresh({"channel-1"},{},&base,&error,{100000,64*1024*1024,owner},false),"R169 snapshot ownership base");
    write("r169-snapshot-add");
    SearchSourceBatch shared_retry;unsigned shared_races=0;
    search_after_build_test=[&]{++shared_races;write("r169-shared-retry");};
    need(!reader.Refresh({"channel-1"},base,&child,&error,{100000,64*1024*1024,owner},false,&shared_retry)&&
         error=="search-source-changed"&&!child&&shared_races==1&&shared_retry.memory.bytes()>0,
         "R169 shared build rejects concurrent finalization without publishing output");
    need(RecordingSearchRetryTestProbe::Spans(shared_retry)>0,
         "post-Build shared retry preserves authenticated segment spans");
    search_after_build_test={};search_projection_work_test={};
    need(reader.Refresh({"channel-1"},base,&child,&error,{100000,64*1024*1024,owner},false,&shared_retry)&&
         shared_retry.memory.bytes()==0&&search_projection_work_test[2]>base->documents().size(),
         "R169 retry reauthenticates current raw and shares unpublished added block without parent chain");
    std::shared_ptr<const RecordingSearchModel> retry_oracle;
    search_projection_reuse_test_enabled=false;
    need(reader.Refresh({"channel-1"},{},&retry_oracle,&error,{100000,64*1024*1024,owner},false)&&same(child->documents(),retry_oracle->documents()),
         "R169 shared retry equals independent strict current model");
    search_projection_reuse_test_enabled=true;retry_oracle.reset();
    const std::vector<SearchDocument> expected(child->documents().begin(),child->documents().end());
    {
      RecordingSearchSnapshots snapshots;RecordingSearchPage page,resumed;RecordingSearchQuery q;
      q.channels={"channel-1"};q.start_time_ms=0;q.end_time_ms=1;q.include_unplaced=true;q.limit=1;
      for(const auto& d:expected)if(d.start_ns){q.start_time_ms=*d.start_ns/1000000;break;}
      q.end_time_ms=q.start_time_ms+86400000;
      need(snapshots.Begin(child,q,"principal","scope",&page,&error)&&!page.next_cursor.empty(),"R169 shared snapshot begin with cursor");
      const auto first=page.model->documents()[page.positions.front()].id;
      base.reset();child.reset();
      need(snapshots.Resume(page.next_cursor,q,"principal","scope",&resumed,&error)&&same(expected,resumed.model->documents()),
        "R169 cursor retains immutable blocks after source eviction");
      std::shared_ptr<const RecordingSearchModel> hit;std::size_t position=SIZE_MAX;
      need(snapshots.ResolveHit(page.snapshot_id,first,q,"principal","scope",&hit,&position,&error)&&hit->documents()[position].id==first,
        "R169 ResolveHit uses model-local position for shared storage");
      need(!snapshots.ResolveHit(page.snapshot_id,first,q,"other","scope",&hit,&position,&error),"R169 shared snapshot principal isolation");
    }
    need(owner->used()==0,"R169 last snapshot releases blocks indices and owner tickets");
    std::cout<<"[projection-residency] peak="<<owner->peak()<<" final="<<owner->used()<<" limit="<<owner->limit()<<'\n';
  }

  // Error boundaries use the actual consumed shared retry, not a copied DTO
  // fixture. An invalid optional span must take the strict current raw path.
  for(const bool post_build:{false,true})
  for(const std::string fault:{"digest","size","range","lifecycle","pending","retired","checkpoint","build-refusal","exception","consumer","resource","capacity","scope","owner","instance"}) {
    auto owner=std::make_shared<SearchModelResidency>();auto foreign=std::make_shared<SearchModelResidency>();
    SearchModelLimits limits{100000,64*1024*1024,owner};SearchSourceBatch retry;
    std::shared_ptr<const RecordingSearchModel> base,result,oracle;
    need(reader.Refresh({"channel-1"},{},&base,&error,limits,false),"shared retry boundary base");
    write("shared-boundary-before-"+fault);result=base;
    const auto invalidate=[&]{write("shared-boundary-during-"+fault);};
    if(post_build)search_after_build_test=invalidate;else search_after_capture_test=invalidate;
    need(!reader.Refresh({"channel-1"},base,&result,&error,limits,false,&retry)&&error=="search-source-changed"&&result==base,
        "shared pre/post-Build retry rejects real Writer revision change without publishing");
    search_after_capture_test={};search_after_build_test={};
    const auto identity=RecordingSearchRetryTestProbe::SharedSpan(retry,fault);
    need(!identity.empty(),"shared pre/post-Build batch owns authenticated raw projection spans");
    if(fault=="lifecycle"){
      const bool changed=catalog.MarkSegmentCorrupt(identity,"container-invalid",&error);
      if(!changed)throw std::runtime_error("shared retry real current lifecycle change: "+error);
      need(changed,"shared retry real current lifecycle change");
    }
    if(fault=="pending"||fault=="retired"){
      const auto location=catalog.FindSegmentMediaLocation(identity);
      need(location&&catalog.RequestDeletion(identity,"continuous-capacity",&error),"shared retry actual deletion pending");
      if(fault=="retired"){
        RecordingTombstoneV2 tombstone;tombstone.tombstone_id="retry-retired-"+identity;tombstone.segment=*catalog.FindSegmentV2ById(identity);
        tombstone.deletion_reason="continuous-capacity";tombstone.deleted_at_ms=1792920000000LL;
        need(std::filesystem::remove(location->first/location->second)&&catalog.CompleteDeletionV2(tombstone,&error),"shared retry actual tombstone and retired state");
      }
    }
    if(fault=="checkpoint")need(catalog.Checkpoint(&error),"shared retry actual Generation transition");
    if(fault=="exception")search_outside_raw_cut_test=[] {throw std::bad_alloc();};
    if(fault=="consumer")search_outside_raw_cut_test=[] {throw std::runtime_error("retry-consumer-fault");};
    if(fault=="resource")search_outside_raw_cut_test=[] {throw RecordingResourceUnavailable();};
    if(fault=="build-refusal")search_projection_build_refused_test=true;
    auto actual_limits=limits;if(fault=="capacity")actual_limits.max_documents=1;if(fault=="owner")actual_limits.residency=foreign;
    const std::vector<std::string> channels{fault=="scope"?"empty-scope":"channel-1"};
    bool ok=false,consumer_threw=false;
    try {ok=reader.Refresh(channels,base,&result,&error,actual_limits,false,&retry);}
    catch(const std::runtime_error& e){if(fault!="consumer"||std::string(e.what())!="retry-consumer-fault")throw;consumer_threw=true;}
    search_outside_raw_cut_test={};search_projection_build_refused_test=false;
    need(retry.memory.bytes()==0,"shared retry consumed exactly once on success or failure");
    if(fault=="consumer")need(consumer_threw&&!ok&&result==base,"consumer exception propagates without publishing or poisoning source");
    else if(fault=="exception"||fault=="capacity")need(!ok&&error=="search-capacity-exceeded"&&result==base,
        "shared retry allocation and admission failure preserve immutable output");
    else {
      need(ok,"shared retry boundary strict fallback succeeds");
      search_projection_reuse_test_enabled=false;
      need(reader.Refresh(channels,{},&oracle,&error,actual_limits,false)&&same(result->documents(),oracle->documents()),
          "shared retry boundary fields and ordering equal independent full authenticated source");
      search_projection_reuse_test_enabled=true;
    }
    if(fault=="consumer"||fault=="exception"){
      need(reader.Refresh({"channel-1"},{},&oracle,&error,limits,false),"consumer failure leaves authoritative source readable");
      write("after-consumer-"+fault);need(catalog.Checkpoint(&error),"consumer failure leaves Writer and Generation available");
    }
    std::cout<<"[shared-retry-boundary] postBuild="<<post_build<<" fault="<<fault<<" passed=1\n";
    base.reset();result.reset();oracle.reset();
    need(owner->used()==0&&foreign->used()==0,"shared retry boundary returns every model batch and span reservation");
  }
  // Optional bounded scaling of the existing Writer fixture, never a product input.
  unsigned preparation_cycles=64;
  if(const char* scale=std::getenv("MEDIA_SERVER_NATIVE_PREPARATION_CYCLES")) {
    const std::string value(scale);
    if(value!="110"&&value!="125"&&value!="150")throw std::runtime_error("unsupported native preparation scale");
    preparation_cycles=static_cast<unsigned>(std::stoul(value));
  }
  // Same real Writer input and cold segments in each AB/BA case. Two
  // finalizations invalidate the first request's captures; a second request
  // for the identical scope waits on the unchanged preparation mutex.
  std::array<std::uint64_t,4> preparation_decodes{};
  for(unsigned round=0;round<4;++round) {
    const bool reuse=round==1||round==2;
    std::shared_ptr<SearchModelResidency> owner;
    std::shared_ptr<RecordingScratchResidency> scratch;
    std::cout<<"[preparation-case] round="<<round<<" reuse="<<reuse<<std::endl;
    SearchDiagnostic::sequence=0;ResetDetailBudget();
    {
      RecordingRuntimeStorage fixture(std::filesystem::path(argv[1])/("preparation-"+std::to_string(round)));
      need(fixture.Open(&error),"preparation real generation open");
      auto& current=fixture.catalog();owner=current.SearchResidency();scratch=current.ScratchResidency();
      const auto append=[&](const std::string& generation) {
        GStreamerSegmentWriter writer(fixture.WriterOptions(1000));std::string detail;
        if(!writer.Start("preparation","unused",input.descriptor,[](auto,auto,auto*){return false;},&detail))throw std::runtime_error(detail);
        for(auto packet:input.packets){packet.observation->source_generation=generation;writer.Push(packet,0);}writer.Stop();
      };
      for(unsigned i=0;i<preparation_cycles;++i)append("base-"+std::to_string(i));
      need(current.Checkpoint(&error),"preparation authenticated cold history");
      RecordingReadService media(current);
      std::array<unsigned,2> captures{},builds{};std::array<int,2> status{};
      std::array<std::uint64_t,2> decodes{},raws{};std::array<double,2> elapsed{};
      // Existing bounded CaptureCost records, copied after Capture releases its
      // Catalog lock. Emit only after both requests finish; the bounded copy is
      // still part of the measured Preparation interval.
      std::array<std::array<SearchDiagnostic::Capture,6>,2> capture_costs{};
      std::array<unsigned,2> capture_counts{},diagnostic_ids{};
      {
        ingress::RecordingApplicationService application(media,current,true,{});
        const std::unordered_map<std::string,std::string> query{{"channelIds","preparation"},{"startTimeMs","1789200000000"},
            {"endTimeMs","1789200005000"},{"includeUnplaced","true"},{"limit","1"}};
        const auto authorize=[](const auto& c){return c=="preparation";};
        need(application.Search(query,"owner","scope",authorize).status==200,"preparation immutable source warmup");
        append("before-request");
        std::promise<void> captured,release,second_started;auto ready=release.get_future();
        std::array<std::exception_ptr,2> failures{};std::array<std::string,2> bodies;
        const auto request=[&](unsigned client) {
          try {
            SearchDiagnostic::HttpRequest request_id("native-capture-"+std::to_string(round)+"-"+std::to_string(client));
            search_retry_projection_test_enabled=reuse;search_projection_work_test={};
            const auto before=latency::segment_decode_cost[0];
            search_after_capture_test=[&]{
              ++captures[client];
              if(const auto* d=SearchDiagnostic::active){
                capture_costs[client]=d->captures;capture_counts[client]=d->capture_count;diagnostic_ids[client]=d->id;
              }
              if(!client&&captures[client]<=2){
                if(captures[client]==1){captured.set_value();ready.wait();}
                append("during-"+std::to_string(captures[client]));
              }
            };
            search_after_build_test=[&]{++builds[client];};
            if(client)second_started.set_value();
            const auto start=std::chrono::steady_clock::now();
            auto response=application.Search(query,"owner","scope",authorize);
            elapsed[client]=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();
            status[client]=response.status;bodies[client]=std::move(response.body);
            decodes[client]=latency::segment_decode_cost[0]-before;raws[client]=search_projection_work_test[0];
          }catch(...){failures[client]=std::current_exception();}
          search_after_capture_test={};search_after_build_test={};search_retry_projection_test_enabled=true;
        };
        std::thread first(request,0);
        if(captured.get_future().wait_for(std::chrono::seconds(10))!=std::future_status::ready){release.set_value();first.join();throw std::runtime_error("preparation capture latch");}
        std::thread second(request,1);second_started.get_future().wait();release.set_value();first.join();second.join();
        for(const auto& failure:failures)if(failure)std::rethrow_exception(failure);
        need(status==std::array<int,2>{200,200}&&captures==std::array<unsigned,2>{3,1}&&builds==std::array<unsigned,2>{1,0},
            "preparation three bounded attempts then one source reuse; both concurrent requests complete");
        need(bodies[0].find("\"knownCount\":"+std::to_string(3*preparation_cycles+9)+",")!=std::string::npos&&bodies[1].find("\"knownCount\":"+std::to_string(3*preparation_cycles+9)+",")!=std::string::npos,
            "preparation both snapshots include all actual Writer finalizations");
      }
      preparation_decodes[round]=decodes[0];
      for(unsigned client=0;client<2;++client)for(unsigned i=0;i<capture_counts[client];++i){
        const auto& c=capture_costs[client][i];
        need(c.complete&&c.end>=c.begin&&c.read_ns+c.outside_ns<=c.end-c.begin,
            "capture recorded nonoverlapping raw read and outside decode fit elapsed time");
        std::cout<<"[native-capture] {\"round\":"<<round<<",\"client\":"<<client<<",\"diagnosticId\":"<<diagnostic_ids[client]
          <<",\"ordinal\":"<<i+1<<",\"attempt\":"<<c.attempt<<",\"parent\":"<<c.parent
          <<",\"elapsedNs\":"<<c.end-c.begin<<",\"cutReadNs\":"<<c.read_ns<<",\"outsideNs\":"<<c.outside_ns
          <<",\"rawReadInclusiveNs\":"<<c.raw_read_ns<<",\"decodeParseInclusiveNs\":"<<c.parse_ns
          <<",\"rows\":"<<c.rows<<",\"cutRows\":"<<c.cut_rows<<",\"rawBytes\":"<<c.raw_bytes
          <<",\"decodeCalls\":"<<c.decode_calls<<",\"decodeHits\":"<<c.decode_hits
          <<",\"catalogLockNs\":["<<c.catalog_lock[0]<<','<<c.catalog_lock[1]<<','<<c.catalog_lock[2]<<','<<c.catalog_lock[3]<<']'
          <<",\"historyNs\":["<<c.history_cost[0]<<','<<c.history_cost[1]<<','<<c.history_cost[2]<<','<<c.history_cost[3]<<','<<c.history_cost[4]<<','<<c.history_cost[5]<<','<<c.history_cost[6]<<','<<c.history_cost[7]<<','<<c.history_cost[8]<<']'
          <<",\"shared\":"<<c.shared<<",\"materialized\":"<<c.materialized<<"}"<<std::endl;
      }
      std::cout<<"[preparation-work] round="<<round<<" reuse="<<reuse<<" decodes="<<decodes[0]<<','<<decodes[1]
        <<" coldRows="<<3*preparation_cycles<<" finalRows="<<3*preparation_cycles+9
        <<" raw="<<raws[0]<<','<<raws[1]<<" captures="<<captures[0]<<','<<captures[1]<<" builds="<<builds[0]<<','<<builds[1]
        <<" elapsedMs="<<elapsed[0]<<','<<elapsed[1]<<" sourcePeak="<<owner->peak()
        <<" scratchPeak="<<scratch->peak().disk_bytes<<" scratchFdPeak="<<scratch->peak().file_descriptors<<std::endl;
      need(fixture.Finish(&error),"preparation explicit Finish");
    }
    need(owner->used()==0&&scratch->usage().disk_bytes==0&&scratch->usage().file_descriptors==0&&scratch->usage().ram_bytes==0,
        "preparation all source Scratch FD and RAM owners returned");
  }
  need(preparation_decodes[1]<preparation_decodes[0]&&preparation_decodes[2]<preparation_decodes[3],
      "preparation authenticated retry avoids duplicate decode in both AB and BA order");
#endif
  need(runtime.Finish(&error),"explicit generation Finish");
  need(shared_projection,"R169 unchanged authenticated projection has identical immutable document address");
  std::cout<<"[search-retry] pass="<<passed<<" fail=0"<<std::endl;return 0;
 }catch(const std::exception& e){
#ifdef RECORDING_SEARCH_TESTING
 search_after_build_test={};search_outside_raw_cut_test={};search_after_capture_test={};search_retention_delta_apply_test={};
#endif
 std::cerr<<"[search-retry] FAIL "<<e.what()<<std::endl;return 1;}
}
