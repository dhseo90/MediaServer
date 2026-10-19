// R131: 실제 generation/cold 원본의 요청 내 재사용. 기존 writer fixture만 재사용한다.
#define main RetryWriterFixtureMain
#include "recording_managed_writer_smoke.cpp"
#undef main
#include "recording/recording_search_reader.h"
#include "recording/recording_search_diagnostic.h"
#include "recording/recording_search_snapshots.h"
namespace recording {
struct RecordingSearchRetryTestProbe {
 static std::size_t Spans(const SearchSourceBatch& b){return b.segment_spans_.size();}
 static std::size_t Reused(const SearchSourceBatch& b){return b.reused_segments_;}
};
}
int main(int argc,char** argv){
 if(argc!=2)return 2;
 gst_init(nullptr,nullptr);using namespace recording;
 unsigned passed=0;bool shared_projection=false;
 const auto need=[&](bool ok,const char* name){if(!ok)throw std::runtime_error(name);++passed;std::cout<<"[pass] "<<name<<std::endl;};
 try{
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

#endif
  need(runtime.Finish(&error),"explicit generation Finish");
  need(shared_projection,"R169 unchanged authenticated projection has identical immutable document address");
  std::cout<<"[search-retry] pass="<<passed<<" fail=0"<<std::endl;return 0;
 }catch(const std::exception& e){
#ifdef RECORDING_SEARCH_TESTING
 search_after_build_test={};search_outside_raw_cut_test={};
#endif
 std::cerr<<"[search-retry] FAIL "<<e.what()<<std::endl;return 1;}
}
