// 파일 용도: R101 source-bound generation의 실제 자료량/검색/배경 작업 경합.
// 기존 R98 입력 생성과 R99 FinalizeBound 준비 경계를 재사용한다.
#define main managed_fixture_main
#include "recording_managed_writer_smoke.cpp"
#undef main
#include "recording_writer_test_isolation.h"
#include "recording/recording_latency_trace.h"
#include "recording/recording_search_diagnostic.h"
#include <fstream>
#include <sstream>
#include "ingress/recording_application_service.h"
#include "recording/recording_visual_source.h"
#include "recording/recording_search_reader.h"
#include "domain/strict_json.h"
#include <future>
#include <thread>
#include <sys/resource.h>
namespace recording {
struct RecordingSearchRetryTestProbe {
 static std::size_t Reused(const SearchSourceBatch& batch){return batch.reused_segments_;}
};
}
namespace {
using VS=ingress::VisualSearchApplicationService;
using Clock=std::chrono::steady_clock;
void Need101(bool ok,const std::string& why){if(!ok)throw std::runtime_error(why);}
// Opt-in density only: immutable State snapshot supplies mapping shapes, not
// source/file bindings. Every new row still passes the existing real file proof.
std::vector<recording::RecordingSegmentV2> Density101(){
 const char* path=std::getenv("MEDIA_SERVER_NATIVE_CAPTURE_SNAPSHOT");if(!path)return {};
 Need101(std::filesystem::file_size(path)<=16*1024*1024,"density-input-cap");
 std::ifstream input(path);Need101(input.good(),"density-open");std::string line,error;
 std::vector<recording::RecordingSegmentV2> rows;std::size_t mappings=0,raw=0;
 while(std::getline(input,line)){
  Need101(line.size()<=65536,"density-line-cap");ingress::StrictJsonObjectDocument doc;
  Need101(ingress::ParseStrictJsonObjectDocument(line,&doc,&error),"density-json:"+error);
  if(ingress::StrictJsonStringField(doc,"kind")!=std::optional<std::string>("segment-v2"))continue;
  const auto value=ingress::StrictJsonObjectField(doc,"value");Need101(value.has_value(),"density-value");
  recording::RecordingSegmentV2 row;Need101(recording::ParseRecordingSegmentV2(*value,&row,&error),"density-row:"+error);
  if(row.channel_id!="9101"&&row.channel_id!="9201")continue;
  Need101(row.time_base_num==1&&row.time_base_den==1000000000&&row.media_end_pts&&*row.media_end_pts-row.media_start_pts==1999999999,"density-media-domain");
  mappings+=row.mappings.size();raw+=value->size();rows.push_back(std::move(row));Need101(rows.size()<=1068,"density-row-cap");
 }
 Need101(input.eof()&&rows.size()==1068&&mappings==41308,"density-reference-counts");
 std::cout<<"[R101-density-reference] rows="<<rows.size()<<" mappings="<<mappings<<" rawBytes="<<raw<<std::endl;return rows;
}
std::string Capture101(const char* phase,unsigned round,unsigned client,unsigned id,const recording::SearchDiagnostic::Capture& c){
 Need101(c.complete&&c.end>=c.begin&&c.read_ns+c.outside_ns<=c.end-c.begin,"capture-complete-intervals");
 const auto lock=c.catalog_lock[0]+c.catalog_lock[1]+c.catalog_lock[2]+c.catalog_lock[3];
 Need101(lock<=c.end-c.begin&&c.history_cost[1]<=c.end-c.begin,"capture-lock-intervals");
 std::ostringstream out;out<<"[native-density-capture] {\"phase\":\""<<phase<<"\",\"round\":"<<round<<",\"client\":"<<client<<",\"diagnosticId\":"<<id
  <<",\"attempt\":"<<c.attempt<<",\"elapsedNs\":"<<c.end-c.begin<<",\"cutReadNs\":"<<c.read_ns<<",\"outsideNs\":"<<c.outside_ns
  <<",\"rawReadInclusiveNs\":"<<c.raw_read_ns<<",\"decodeParseInclusiveNs\":"<<c.parse_ns<<",\"rows\":"<<c.rows<<",\"cutRows\":"<<c.cut_rows<<",\"rawBytes\":"<<c.raw_bytes
  <<",\"decodeCalls\":"<<c.decode_calls<<",\"decodeHits\":"<<c.decode_hits<<",\"shared\":"<<c.shared<<",\"materialized\":"<<c.materialized<<",\"catalogLockNs\":[";
 for(unsigned i=0;i<c.catalog_lock.size();++i)out<<(i?",":"")<<c.catalog_lock[i];out<<"],\"historyNs\":[";
 for(unsigned i=0;i<c.history_cost.size();++i)out<<(i?",":"")<<c.history_cost[i];out<<"]}\n";return out.str();
}
void Observer101(const char* phase){
 if(const char* wait=std::getenv("MEDIA_SERVER_VERIFY_CONTENTION_OBSERVER");wait&&std::string(wait)=="1"){
  std::cout<<"[R101-phase] "<<phase<<std::endl;char token[16]{};std::cin.getline(token,sizeof(token));Need101(std::string(token)=="continue","observer-phase-not-ready");
 }
}
std::uint64_t Generation101(const std::string& body){
 ingress::StrictJsonObjectDocument doc,index;std::string error;
 Need101(ingress::ParseStrictJsonObjectDocument(body,&doc,&error),"status-json");
 const auto raw=ingress::StrictJsonObjectField(doc,"index");Need101(raw.has_value(),"status-index");
 Need101(ingress::ParseStrictJsonObjectDocument(*raw,&index,&error),"index-json");
 const auto* g=index.Find("generation");Need101(g&&g->type==ingress::StrictJsonType::Number,"index-generation");
 std::size_t used=0;const auto value=std::stoull(g->raw,&used);Need101(used==g->raw.size(),"generation-integer");return value;
}
void Published101(VS& service,const VS::Authorize& auth,std::uint64_t initial,Clock::time_point deadline){
 const auto begin=Clock::now();std::cout<<"[R101-publication-wait] initial="<<initial<<std::endl;
 bool reported_failure=false;
 do{
  const auto status=service.Status(auth);Need101(status.status==200,"publication-status");
  ingress::StrictJsonObjectDocument doc;std::string error;
  Need101(ingress::ParseStrictJsonObjectDocument(status.body,&doc,&error),"publication-json");
  const auto state=ingress::StrictJsonStringField(doc,"state");Need101(state.has_value(),"publication-state");
  Need101(*state!="stopped"&&*state!="unavailable","publication-stopped-or-unavailable");
  // A failed refresh retains the previous complete index under the existing
  // worker contract. Preserve the first observed failure; never label it success.
  if(*state=="degraded"&&!reported_failure){std::cout<<"[R101-refresh-failure-observed] "<<status.body<<std::endl;reported_failure=true;}
  if((*state=="ready"||*state=="indexing")&&Generation101(status.body)>initial){std::cout<<"[R101-publication-complete] elapsedMs="<<std::chrono::duration<double,std::milli>(Clock::now()-begin).count()<<" status="<<status.body<<std::endl;return;}
  std::this_thread::sleep_for(std::chrono::milliseconds(20));
 }while(Clock::now()<deadline);
 throw std::runtime_error("publication-in-existing-total-deadline");
}
void Ready101(VS& service,const VS::Authorize& auth,unsigned seconds){
 const auto end=Clock::now()+std::chrono::seconds(seconds);std::string status;
 do{status=service.Status(auth).body;if(status.find("\"searchAvailable\":true")!=std::string::npos){std::cout<<"[R101-ready] "<<status<<std::endl;return;}std::this_thread::sleep_for(std::chrono::milliseconds(20));}while(Clock::now()<end);
 throw std::runtime_error("index-not-ready:"+status);
}
}
int main(int argc,char** argv){
 if(argc!=5)return 2;
 const auto run_begin=Clock::now();
 const std::filesystem::path root(argv[1]);if(!RecordingWriterTestIsolation(root)){std::cerr<<"isolation-rejected\n";return 2;}
 try{
 if(const char* wait=std::getenv("MEDIA_SERVER_VERIFY_CONTENTION_OBSERVER");wait&&std::string(wait)=="1"){
  char token[16]{};std::cin.getline(token,sizeof(token));Need101(std::string(token)=="continue","observer-not-ready");
 }
 gst_init(nullptr,nullptr);using namespace recording;std::string error;const std::string scale=argv[3],mode=argv[4];
 Need101(scale=="4"||scale=="53"||scale=="cycle","scale");Need101(mode=="single"||mode=="visual-pair"||mode=="parallel"||mode=="background","mode");
 RecordingResourceTrace trace("1");RecordingRuntimeStorage runtime(root/"recording");Need101(runtime.Open(&error),"open:"+error);auto& catalog=runtime.catalog();Need101(trace.Bind(catalog.SearchResidency(),catalog.ScratchResidency()),"trace-bind");
 auto density=Density101();std::size_t density_rows=0,density_mappings=0,density_bytes=0;
 auto input=MixedInput(root);input.packets.resize(60);
 for(auto& p:input.packets){auto& o=*p.observation;o.clock_process_id="r101-clock";o.mono_before_ns=1000000000+p.pts;o.mono_after_ns=o.mono_before_ns+1000;o.observed_utc_ns=1789200000000000000LL+p.pts;}
 const auto write=[&](const std::string& channel,GStreamerSegmentWriter::Options options){GStreamerSegmentWriter writer(options);Need101(writer.Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"writer-start:"+error);for(const auto& p:input.packets)writer.Push(p,0);writer.Stop();};
 constexpr std::uint64_t Q=87ULL*1024*1024,E=64ULL*1024*1024;std::uint64_t count=0;
 for(const auto& channel:{"9101","9201"}){
  write(channel,runtime.WriterOptions(2000));auto list=catalog.RetentionSnapshot();auto found=std::find_if(list.candidates.begin(),list.candidates.end(),[&](const auto& x){return x.Channel()==channel;});Need101(found!=list.candidates.end()&&found->segment_v2.has_value(),"template");
  const auto seed=*found->segment_v2;const auto file=found->media_path;auto binding=catalog.FindSourceBinding(seed.segment_id);Need101(binding&&binding->file_evidence&&seed.size_bytes>0&&seed.size_bytes<=36*1024,"template-bound");
  count=!density.empty()?535:scale=="cycle"?(Q-E)/seed.size_bytes+2:std::stoul(scale);Need101(count<=2048,"count-cap");
  for(std::uint64_t i=1;i<count;++i){auto row=seed;row.segment_id="r101-"+std::string(channel)+"-"+std::to_string(i);row.order_request_id="order-"+row.segment_id;row.media_epoch_id="epoch-"+row.segment_id;
   if(!density.empty()){
    std::vector<const RecordingSegmentV2*> selected;for(const auto& value:density)if(value.channel_id==channel)selected.push_back(&value);
    Need101(selected.size()==534&&i<=selected.size(),"density-channel-count");const auto& original=*selected[i-1];
    row.segment_id=original.segment_id;row.order_request_id="order-"+row.segment_id;row.media_epoch_id=original.media_epoch_id;
    row.mappings=original.mappings;for(auto& mapping:row.mappings){
     mapping.start_pts+=seed.media_start_pts-original.media_start_pts;
     if(mapping.end_pts)*mapping.end_pts+=seed.media_start_pts-original.media_start_pts;
     if(mapping.utc_start_ns){const auto offset=1789200000000000000LL+mapping.start_pts-*mapping.utc_start_ns;*mapping.utc_start_ns+=offset;if(mapping.utc_end_ns)*mapping.utc_end_ns+=offset;}
    }
    Need101(ValidateRecordingSegmentV2(row,&error),"density-translated-row:"+error);
    ++density_rows;density_mappings+=row.mappings.size();density_bytes+=SerializeRecordingSegmentV2(row).size();
   }
   RecordingOrderReservationV1 order;Need101(catalog.ReserveRecordingOrder(row.store_id,row.order_request_id,row.segment_id,channel,&order,&error),"reserve:"+error);row.order_sequence=order.sequence;
   auto bound=*binding;bound.segment_id=row.segment_id;bound.media_epoch_id=row.media_epoch_id;const auto target=root/"recording"/channel/(row.segment_id+".mp4");std::filesystem::create_directories(target.parent_path());std::filesystem::copy_file(file,target);
   const int fd=open(target.c_str(),O_RDONLY|O_CLOEXEC|O_NOFOLLOW);Need101(fd>=0,"clone-open");const bool good=VerifyRecordingFileEvidenceFd(fd,bound,&error);const int closed=close(fd);Need101(good&&closed==0,"clone-proof:"+error);Need101(catalog.FinalizeBoundSegmentV2(row,bound,target.string(),&error),"clone-finalize:"+error);
  }
  std::cout<<"[R101-state] channel="<<channel<<" active="<<count<<" uniqueOriginals="<<count<<" segmentBytes="<<seed.size_bytes<<" seedHash="<<seed.checksum_sha256<<" sampleCount="<<binding->samples.size()<<std::endl;
 }
 if(!density.empty())std::cout<<"[R101-density-installed] denseRows="<<density_rows<<" denseMappings="<<density_mappings<<" denseRawBytes="<<density_bytes<<" seedRows=2"<<std::endl;
 density.clear();density.shrink_to_fit();
 Need101(catalog.Checkpoint(&error),"baseline-checkpoint:"+error);Need101(trace.Emit("baseline"),"baseline-resource");
 if(density_rows){
  for(unsigned round=0;round<3;++round){
   SearchDiagnostic::HttpRequest request("native-density-pure-"+std::to_string(round));SearchDiagnostic diagnostic(catalog.SearchResidency().get());
   SearchSourceBatch batch,empty;Need101(catalog.CaptureSearchSource({"9101"},nullptr,&batch,&error,{},false,&empty),"density-pure-capture:"+error);
   Need101(catalog.ValidateSearchSource(batch,&error),"density-pure-currentness:"+error);diagnostic.status=200;
   Need101(diagnostic.capture_count==1&&!diagnostic.capture_loss,"density-pure-count");
   std::cout<<Capture101("pure",round,0,diagnostic.id,diagnostic.captures[0])<<std::flush;
  }
  Need101(trace.Emit("after-pure-capture"),"pure-resource");
 }
 RecordingReadService reader(catalog);ingress::RecordingApplicationService structured(reader,catalog,true,{});
#ifdef RECORDING_SEARCH_TESTING
 // Same density and real Writer, isolated from the slow model startup.
 // A failed unpublished Build is followed by exactly two/three Refresh calls.
 if(density_rows&&std::getenv("MEDIA_SERVER_NATIVE_CAPTURE_RETRY_ONLY")){
 for(unsigned invalidations:{1U,2U}){
  auto owner=std::make_shared<SearchModelResidency>();
  {
   RecordingSearchReader source(catalog,reader);SearchModelLimits limits{100000,64*1024*1024,owner};
   std::shared_ptr<const RecordingSearchModel> base,result,oracle;SearchSourceBatch retry;
   Need101(source.Refresh({"9101"},{},&base,&error,limits,false),"density-retry-base:"+error);
   write("9101",runtime.WriterOptions(2000));unsigned builds=0;
   SearchDiagnostic::HttpRequest request("native-density-post-build-"+std::to_string(invalidations));SearchDiagnostic diagnostic(owner.get());
   search_after_build_test=[&]{if(++builds<=invalidations)write("9101",runtime.WriterOptions(2000));};
   const auto begin=Clock::now();
   for(unsigned attempt=0;attempt<=invalidations;++attempt){
    diagnostic.attempt=attempt;
    const bool ok=source.Refresh({"9101"},base,&result,&error,limits,false,&retry);
    Need101(ok==(attempt==invalidations),"density-post-build-retry-outcome:"+error);
    if(!ok)Need101(error=="search-source-changed"&&!result,"density-no-stale-publication");
    std::cout<<"[density-reused-segments] attempts="<<invalidations+1<<" attempt="<<attempt<<" reused="<<RecordingSearchRetryTestProbe::Reused(retry)<<'\n';
   }
   const double elapsed=std::chrono::duration<double,std::milli>(Clock::now()-begin).count();
   search_after_build_test={};diagnostic.status=200;
   Need101(builds==invalidations+1&&retry.memory.bytes()==0,"density-post-build-count-return");
   for(unsigned i=0;i<diagnostic.capture_count;++i)std::cout<<Capture101("post-build",invalidations+1,i,diagnostic.id,diagnostic.captures[i]);
   std::cout<<"[density-post-build] attempts="<<invalidations+1<<" elapsedMs="<<elapsed<<" peak="<<owner->peak()<<" current="<<owner->used()<<" documents="<<result->documents().size()<<std::endl;
   // Independent full source verifies ordering, identity, mapping and lifecycle.
   search_projection_reuse_test_enabled=false;
   Need101(source.Refresh({"9101"},{},&oracle,&error,limits,false),"density-post-build-oracle:"+error);
   search_projection_reuse_test_enabled=true;
   Need101(result->documents().size()==oracle->documents().size(),"density-post-build-cardinality");
   for(std::size_t i=0;i<oracle->documents().size();++i){
    const auto fields=[](const auto& d){return std::tie(d.id,d.channel_id,d.segment_id,d.source_id,d.store_id,d.media_epoch_id,d.stream_epoch_id,
     d.start_ns,d.end_ns,d.time_provenance,d.uncertainty_ns,d.media_pts,d.media_end_pts,d.time_base_num,d.time_base_den,d.unavailable_reason);};
    Need101(fields(result->documents()[i])==fields(oracle->documents()[i]),"density-post-build-fields-order");
   }
  }
  Need101(owner->used()==0,"density-post-build-owner-return");
  std::cout<<"[density-post-build-return] attempts="<<invalidations+1<<" owner=0\n";
 }
 Need101(runtime.Finish(&error),"density-retry-finish:"+error);Need101(trace.Emit("after-Finish"),"density-retry-final-resource");
 std::cout<<"[density-retry-result] passed=1\n";return 0;
 }
#endif
 VS::Options options;options.enabled=true;options.model_directory=argv[2];options.cache_directory=(root/"visual-cache").string();options.scan_seconds=1;options.sample_seconds=1;
 const VS::Authorize auth=[](const std::string& c){return c=="9101"||c=="9201";};
 Observer101("model");
 std::promise<bool> indexing_gate;const auto indexing_ready=indexing_gate.get_future().share();
 VS service(catalog,reader,options,[indexing_ready](auto* out){if(!indexing_ready.get())return false;*out={"9101","9201"};return true;});
 // The existing constructor has closed both verified temporary ONNX FDs. Its
 // worker cannot collect Catalog rows before the parent's live admission.
 struct ReleaseIndex {std::promise<bool>& gate;bool released=false;void Release(bool accepted){if(!released){gate.set_value(accepted);released=true;}}~ReleaseIndex(){Release(false);}} release_index{indexing_gate};
 Observer101("live");release_index.Release(true);Ready101(service,auth,scale=="cycle"?600:180);
 const auto initial_generation=Generation101(service.Status(auth).body);
 VS::Query query{{"channelIds","9101,9201"},{"text","ball"},{"limit","20"},{"threshold","-1"}};
 VS::Query sq{{"channelIds","9101"},{"startTimeMs","1789199999000"},{"endTimeMs","1789201000000"},{"limit","20"},{"includeUnplaced","true"}};
 std::vector<double> times;unsigned failures=0;std::atomic<bool> start{false};std::exception_ptr bgerror;std::atomic<unsigned> writes{0},removed{0};
 std::thread background;
 struct Join {std::thread& thread;~Join(){if(thread.joinable())thread.join();}} join{background};
 if(mode=="background")background=std::thread([&]{try{while(!start.load())std::this_thread::yield();RetentionCoordinator retention(catalog,[&](auto* b,auto*){*b=std::filesystem::space(root).available;return true;},[&](const auto& p,auto* e){const bool ok=RemoveContainedMediaFile(root/"recording",p,e,{},true);if(ok)++removed;return ok;},{0,E,root/"recording"});
  std::array<std::unique_ptr<GStreamerSegmentWriter>,2> writers;
  for(unsigned i=0;i<2;++i){const std::string c=i?"9201":"9101";RetentionPolicy policy;policy.continuous_max_bytes=Q;policy.event_max_bytes=128ULL*1024*1024;Need101(retention.UpdateChannelPolicy(c,policy,&error),"policy");auto opts=runtime.WriterOptions(2000);opts.admit_segment=[&](const auto& c,std::uint64_t m){const auto a=retention.AdmitContinuousWrite(c,m,1789201000000LL);return SegmentAdmissionDecision{a.allowed,a.start_new_epoch,a.reserved_bytes};};opts.report_segment_progress=[&](const auto& c,std::uint64_t b){retention.UpdateContinuousWriteProgress(c,b);};opts.complete_segment=[&](const auto& c,std::uint64_t b){retention.CompleteContinuousWrite(c,b);++writes;};writers[i]=std::make_unique<GStreamerSegmentWriter>(opts);Need101(writers[i]->Start(c,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"background-start");}
  const auto beginning=Clock::now();
  for(unsigned i=0;i<180;++i){auto packet=input.packets[i%60];const std::int64_t offset=std::int64_t(i/60)*2000000000;packet.pts+=offset;packet.dts+=offset;auto& o=*packet.observation;o.ordinal=i+1;o.pts_ns=packet.pts;o.dts_ns=packet.dts;o.mono_before_ns+=offset;o.mono_after_ns+=offset;o.observed_utc_ns+=offset;
   for(auto& writer:writers)writer->Push(packet,0);
   if(i%30==0)retention.RunPeriodic(1789201000000LL+i*1000/30);
   std::this_thread::sleep_until(beginning+std::chrono::nanoseconds((i+1)*1000000000ULL/30));
  }
  for(auto& writer:writers)writer->Stop();
 }catch(...){bgerror=std::current_exception();}});
 start=true;
 for(unsigned round=0;round<3;++round){
  if(mode=="background"&&round){
   const auto until=Clock::now()+std::chrono::seconds(5);
   while(writes.load()<2*round&&Clock::now()<until)std::this_thread::sleep_for(std::chrono::milliseconds(10));
   Need101(writes.load()>=2*round,"background-finalization-progress");
  }
  std::cout<<"[R101-wave] round="<<round<<" completed="<<writes.load()<<" removed="<<removed.load()<<" status="<<service.Status(auth).body<<std::endl;
  const auto call=[&](bool visual,unsigned client){latency::WorkScope work(visual?latency::Work::Visual:latency::Work::Structured);const auto t=Clock::now();SearchDiagnostic::HttpRequest request("native-density-"+std::to_string(round)+"-"+std::to_string(client));
   std::array<SearchDiagnostic::Capture,6> captures{};unsigned captured=0,id=0,builds=0;std::array<unsigned,3> delta{};
#ifdef RECORDING_SEARCH_TESTING
   search_retention_delta_work_test={};
   search_after_capture_test=[&]{if(auto* d=SearchDiagnostic::active){captures=d->captures;captured=d->capture_count;id=d->id;}};
   search_after_build_test=[&]{++builds;};
#endif
   const auto result=visual?service.Search(query,auth):structured.Search(sq,"r101","both",auth);
#ifdef RECORDING_SEARCH_TESTING
   delta=search_retention_delta_work_test;search_after_capture_test={};search_after_build_test={};
#endif
   std::string costs;for(unsigned i=0;i<captured;++i)costs+=Capture101("concurrent",round,client,id,captures[i]);
   costs+="[R101-refresh] round="+std::to_string(round)+" client="+std::to_string(client)+" captures="+std::to_string(captured)+" builds="+std::to_string(builds)+" delta="+std::to_string(delta[0])+","+std::to_string(delta[1])+","+std::to_string(delta[2])+"\n";const double ms=std::chrono::duration<double,std::milli>(Clock::now()-t).count();return std::make_tuple(visual,client,ms,result.status,result.body,costs);};
  std::vector<std::future<decltype(call(true,0))>> jobs;const unsigned n=mode=="single"?1:(mode=="visual-pair"?2:4);
  for(unsigned i=0;i<n;++i)jobs.push_back(std::async(std::launch::async,call,i<2,i));
  for(auto& job:jobs){const auto [visual,client,ms,status,body,costs]=job.get();std::cout<<costs;times.push_back(ms);if(status!=200)++failures;std::cout<<"[R101-request] round="<<round<<" visual="<<visual<<" client="<<client<<" ms="<<ms<<" status="<<status<<" body="<<body<<std::endl;}
 }
 if(background.joinable())background.join();if(bgerror)std::rethrow_exception(bgerror);
 // Observe actual publication before Stop cancels the worker. This consumes
 // the existing parent total budget, never a search latency or extra warmup.
 if(mode=="background")Published101(service,auth,initial_generation,run_begin+std::chrono::seconds(scale=="cycle"?630:180));
 std::cout<<"[R101-post-background] "<<service.Status(auth).body<<std::endl;
 if(mode=="background")Need101(writes.load()==6&&(scale!="cycle"||removed.load()>0),"actual-background-gate");
 std::cout<<"[R101-background] completed="<<writes<<" removed="<<removed<<std::endl;
 service.Stop();Need101(trace.Emit("before-Finish"),"resource");Need101(runtime.Finish(&error),"finish:"+error);Need101(trace.Emit("after-Finish"),"finish-resource");
 std::sort(times.begin(),times.end());const double p95=times[std::min(times.size()-1,std::size_t(std::ceil(times.size()*0.95))-1)];
 struct rusage usage{};Need101(getrusage(RUSAGE_SELF,&usage)==0,"rss");std::uint64_t rss=usage.ru_maxrss;
#ifndef __APPLE__
 rss*=1024;
#endif
 std::cout<<"[R101-result] count="<<times.size()<<" failures="<<failures<<" p95="<<p95<<" max="<<times.back()<<" peakRss="<<rss<<" finish=1"<<std::endl;
 Need101(rss<=4ULL*1024*1024*1024,"RSS-cap");Need101(!failures&&p95<=2000&&times.back()<=5000,"request-gate");return 0;
 }catch(const std::exception& e){std::cerr<<"[R101-failure] "<<e.what()<<std::endl;return 1;}
}
