// R131: 실제 generation/cold 원본의 요청 내 재사용. 기존 writer fixture만 재사용한다.
#define main RetryWriterFixtureMain
#include "recording_managed_writer_smoke.cpp"
#undef main
#include "recording/recording_search_reader.h"
#include "recording/recording_search_diagnostic.h"
namespace recording {
struct RecordingSearchRetryTestProbe {
 static std::size_t Spans(const SearchSourceBatch& b){return b.segment_spans_.size();}
 static std::size_t Reused(const SearchSourceBatch& b){return b.reused_segments_;}
};
}
int main(int argc,char** argv){
 if(argc!=2)return 2;
 gst_init(nullptr,nullptr);using namespace recording;
 unsigned passed=0;
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
    if(std::tie(x.id,x.channel_id,x.segment_id,x.source_id,x.store_id,x.media_epoch_id,x.stream_epoch_id,x.start_ns,x.end_ns,x.time_provenance,x.uncertainty_ns,x.media_pts,x.media_end_pts,x.time_base_num,x.time_base_den,x.unavailable_reason)!=
       std::tie(y.id,y.channel_id,y.segment_id,y.source_id,y.store_id,y.media_epoch_id,y.stream_epoch_id,y.start_ns,y.end_ns,y.time_provenance,y.uncertainty_ns,y.media_pts,y.media_end_pts,y.time_base_num,y.time_base_den,y.unavailable_reason))return false;
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
  const auto saved_append=appended;
  const auto saved_documents=saved_append->documents();
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
#endif
  need(runtime.Finish(&error),"explicit generation Finish");
  std::cout<<"[search-retry] pass="<<passed<<" fail=0"<<std::endl;return 0;
 }catch(const std::exception& e){
#ifdef RECORDING_SEARCH_TESTING
 search_after_build_test={};search_outside_raw_cut_test={};
#endif
 std::cerr<<"[search-retry] FAIL "<<e.what()<<std::endl;return 1;}
}
