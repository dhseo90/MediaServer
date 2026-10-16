// R131: 실제 generation/cold 원본의 요청 내 재사용. 기존 writer fixture만 재사용한다.
#define main RetryWriterFixtureMain
#include "recording_managed_writer_smoke.cpp"
#undef main
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
  const auto write=[&](const std::string& generation){
   GStreamerSegmentWriter writer(runtime.WriterOptions(1000));need(writer.Start("channel-1","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"actual writer start");
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
  need(runtime.Finish(&error),"explicit generation Finish");
  std::cout<<"[search-retry] pass="<<passed<<" fail=0"<<std::endl;return 0;
 }catch(const std::exception& e){std::cerr<<"[search-retry] FAIL "<<e.what()<<std::endl;return 1;}
}
