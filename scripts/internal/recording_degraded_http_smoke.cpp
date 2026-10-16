#include "recording_http_observation.h"
// R107: exact closed original copy, real HTTP and actual source/writer/index consumers.
#define main ManagedInputFixtureMain
#include "recording_managed_writer_smoke.cpp"
#undef main
#include "recording_writer_test_isolation.h"
#include "ingress/recording_application_service.h"
#include "../../src/ingress/webrtc_http_server_detail.h"
#include <future>
#include "recording_source_http_fixture.h"
#include "recording/visual_index_store.h"
#include "domain/strict_json.h"
#include <arpa/inet.h>
#include <netinet/tcp.h>
namespace ingress {struct VisualSearchPublicationTestProbe {
 static recording::VisualIndexReadView View(const VisualSearchApplicationService& s){return s.worker_?s.worker_->ReadView():recording::VisualIndexReadView{};}
};struct RecordingHttpOwnershipProbe {
 static std::uint16_t Port(WebRtcHttpServer& s){sockaddr_in a{};socklen_t n=sizeof(a);if(getsockname(s.impl_->listen_fd,reinterpret_cast<sockaddr*>(&a),&n))throw std::runtime_error("port");return ntohs(a.sin_port);}
 static int Active(WebRtcHttpServer& s){return s.impl_->active_http_connections.load();}
};}
namespace {
using namespace ingress;using Clock=std::chrono::steady_clock;
void NeedHttp(bool ok,const char* why){if(!ok)throw std::runtime_error(why);}
[[maybe_unused]] void Observer107(const char* phase){
 if(const char* enabled=std::getenv("MEDIA_SERVER_VERIFY_CONTENTION_OBSERVER");enabled&&std::string(enabled)=="1"){
  if(phase)std::cout<<"[R101-phase] "<<phase<<std::endl;
  char token[16]{};std::cin.getline(token,sizeof(token));NeedHttp(std::string(token)=="continue","observer-not-ready");
 }
}
[[maybe_unused]] std::optional<std::uint64_t> Generation107(const std::string& body){
 StrictJsonObjectDocument doc,index;std::string error;
 NeedHttp(ParseStrictJsonObjectDocument(body,&doc,&error),"status-json");
 const auto raw=StrictJsonObjectField(doc,"index");NeedHttp(raw.has_value(),"status-index");
 NeedHttp(ParseStrictJsonObjectDocument(*raw,&index,&error),"index-json");
 const auto* g=index.Find("generation");NeedHttp(g,"index-generation");if(g->type==StrictJsonType::Null){NeedHttp(StrictJsonStringField(index,"origin")==std::optional<std::string>("cache"),"null generation origin");return std::nullopt;}NeedHttp(g->type==StrictJsonType::Number,"index-generation");
 return std::stoull(g->raw);
}
struct Media final:WebRtcMediaApplicationService {
    std::shared_ptr<WebRtcMediaApplicationEgressSession> CreateEgressSession()override{return {};}
    std::shared_ptr<WebRtcMediaApplicationSourceSession> CreateSourceSession()override{return {};}
    bool CloseSession(const std::string&)override{return true;}
    WebRtcMediaApplicationRuntimeStateSnapshot RuntimeStateSnapshot()const override{return {};}
    std::vector<WebRtcMediaApplicationSourceReconnectStats> SourceReconnectStatsSnapshot()const override{return {};}
    std::vector<WebRtcMediaApplicationSourceDescriptorSnapshot> SourceDescriptorSnapshots()const override{return {};}
    std::vector<WebRtcMediaApplicationSourceEgressStats> SourceEgressStatsSnapshot()const override{return {};}
    std::vector<WebRtcMediaApplicationPublishedSourceSnapshot> PublishedSourceSnapshots()const override{return {};}
};
struct Lifecycle final:AnalysisSessionLifecycleApplicationService {
    AnalysisSessionLifecycleApplicationAttachResult Attach(const AnalysisSessionLifecycleApplicationRequest&)override{return {};}
    AnalysisSessionLifecycleApplicationDetachResult Detach(const std::string&)override{return {};}
};
struct Reads final:AnalysisSessionReadApplicationService {
    std::optional<AnalysisSessionApplicationSnapshot> Snapshot(const std::string&)const override{return {};}
    std::vector<AnalysisSessionApplicationSnapshot> Snapshots()const override{return {};}
    std::optional<AnalysisSessionApplicationResult> WaitResultNearPts(const std::string&,std::int64_t,std::int64_t,int)const override{return {};}
    std::optional<ImageCodecFrame> LatestFrame(const std::string&)const override{return {};}
    std::optional<AnalysisSessionApplicationLatestFrameAndResult> LatestFrameAndResult(const std::string&)const override{return {};}
    std::size_t ActiveTapCount()const override{return 0;}
};
struct Socket {int fd{-1};~Socket(){if(fd>=0)close(fd);}void Reset(){if(fd>=0){close(fd);fd=-1;}}};
void WaitIdle(WebRtcHttpServer& s){const auto end=Clock::now()+std::chrono::seconds(12);while(RecordingHttpOwnershipProbe::Active(s)&&Clock::now()<end)std::this_thread::sleep_for(std::chrono::milliseconds(5));NeedHttp(!RecordingHttpOwnershipProbe::Active(s),"HTTP connection worker completed");}
int Request(std::uint16_t port,const std::string& path,bool admin=true){
    Socket c;c.fd=socket(AF_INET,SOCK_STREAM,0);NeedHttp(c.fd>=0,"client socket");    timeval timeout{5,0};setsockopt(c.fd,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));
    sockaddr_in a{};a.sin_family=AF_INET;a.sin_port=htons(port);inet_pton(AF_INET,"127.0.0.1",&a.sin_addr);
    NeedHttp(!connect(c.fd,reinterpret_cast<sockaddr*>(&a),sizeof(a)),"actual loopback connect");
    const auto request="GET "+path+" HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer "+(admin?std::string("owned-http85-admin-token"):std::string("owned-http85-viewer-token"))+"\r\nConnection: close\r\n\r\n";
    NeedHttp(webrtc_http_server_detail::SendAll(c.fd,request),"normal HTTP request sent");return std::exchange(c.fd,-1);
}
using recording_http_observation::HttpObservation;
using recording_http_observation::Drain;
struct ExplicitFinish {
 WebRtcHttpServer& server;VisualSearchApplicationService& visual;recording::RecordingRuntimeStorage& runtime;recording::RecordingResourceTrace& trace;bool done=false;
 bool Run() noexcept {if(done)return true;done=true;bool good=true;std::string error;
  try{WaitIdle(server);}catch(const std::exception& e){std::cerr<<"[R119-cleanup-error] idle "<<e.what()<<std::endl;good=false;}
  try{server.Stop();std::cout<<"[R119-stop] server=1"<<std::endl;}catch(...){good=false;}
  try{visual.Stop();std::cout<<"[R119-stop] visual=1"<<std::endl;}catch(...){good=false;}
  try{const bool ok=runtime.Finish(&error);std::cout<<"[R119-finish] ok="<<ok<<" error="<<error<<std::endl;good=ok&&good;good=trace.Emit("finished")&&good;}catch(...){good=false;}
  return good;}
 ~ExplicitFinish(){if(!done)(void)Run();}
};

}

#ifndef RECORDING_DEGRADED_HTTP_NO_MAIN
int main(int argc,char** argv){
 if((argc!=3&&argc!=4)||!RecordingWriterTestIsolation(argv[1]))return 2;
 // R111 diagnostic A/B only vary foreground HTTP concurrency. Default C keeps
 // all four clients; background writers, indexing and retention stay identical.
 const std::string mode=argc==4?argv[3]:"parallel";
 const bool source_mode=mode=="source-parallel"||mode=="source-small";
 if(!source_mode&&mode!="single"&&mode!="visual-pair"&&mode!="parallel")return 2;
 const unsigned clients=mode=="single"?1:mode=="visual-pair"?2:4;
 try {
 const std::filesystem::path root(argv[1]);std::string error;Observer107(nullptr);gst_init(nullptr,nullptr);
 recording::RecordingResourceTrace trace("1");recording::RecordingRuntimeStorage runtime(root/"recording");NeedHttp(runtime.Open(&error),error.c_str());
 auto& catalog=runtime.catalog();NeedHttp(trace.Bind(catalog.SearchResidency(),catalog.ScratchResidency()),"trace");
 std::atomic<unsigned> source_writes{0},source_removed{0};
 if(mode=="source-small")RunHttpSources(runtime,root,120,source_writes,source_removed);
 recording::RecordingReadService reader(catalog);ingress::VisualSearchApplicationService::Options options;
 options.enabled=true;options.model_directory=argv[2];options.cache_directory=(source_mode?root/"recording"/"visual-cache":root/"visual-cache").string();options.scan_seconds=1;options.sample_seconds=1;
 Observer107("model");std::promise<bool> gate;auto allowed=gate.get_future().share();
 ingress::VisualSearchApplicationService visual(catalog,reader,options,[allowed](auto* out){if(!allowed.get())return false;*out={"9101","9201"};return true;});
 struct Release {std::promise<bool>& gate;bool done=false;~Release(){if(!done)gate.set_value(false);}} release{gate};
 Observer107("live");gate.set_value(true);release.done=true;
 auto authorize=[](const std::string& c){return c=="9101"||c=="9201";};
 const auto ready_end=Clock::now()+std::chrono::seconds(500);bool ready=false;
 while(Clock::now()<ready_end){auto status=visual.Status(authorize);if(status.body.find("\"searchAvailable\":true")!=std::string::npos){ready=true;std::cout<<"[R107-ready] "<<status.body<<std::endl;break;}std::this_thread::sleep_for(std::chrono::milliseconds(100));}
 if(!ready)std::cerr<<"[R118-ready-failure] "<<visual.Status(authorize).body<<std::endl;
 NeedHttp(ready,"index-ready");NeedHttp(trace.Emit("ready"),"trace-ready");const auto initial_generation=Generation107(visual.Status(authorize).body);
 ingress::RecordingApplicationService app(reader,catalog,true,{}, {},&visual);
 Media media;Lifecycle lifecycle;Reads reads;WebRtcHttpRuntimeConfig config;
 config.auth_mode=HttpAuthMode::Token;config.auth_admin_token="owned-http85-admin-token";config.auth_viewer_token="owned-http85-viewer-token";config.enable_ops=true;
 config.auth_users_file=(root/"users.json").string();config.source_registry_path=(root/"sources.json").string();config.analysis_registry_path=(root/"analysis.json").string();config.file_root_path=(root/"input").string();
 WebRtcHttpServer server(media,lifecycle,reads,config,&app);NeedHttp(server.Start("127.0.0.1",0,&error),error.c_str());const auto port=RecordingHttpOwnershipProbe::Port(server);
 std::cout<<"[R107-port] "<<port<<std::endl;
 ExplicitFinish finish{server,visual,runtime,trace};
 std::set<std::string> original_segments;
 if(source_mode)for(const auto& e:std::filesystem::recursive_directory_iterator(root/"recording"))if(e.path().extension()==".mp4")original_segments.insert(e.path().stem().string());
 std::atomic<std::uint64_t> source_started_ns{0};
 auto input=MixedInput(root);input.packets.resize(60);for(auto& p:input.packets){auto& o=*p.observation;o.clock_process_id="r107-clock";o.mono_before_ns=1000000000+p.pts;o.mono_after_ns=o.mono_before_ns+1000;o.observed_utc_ns=1791887400000000000LL+p.pts;}std::atomic<unsigned> writes{0},removed{0};std::exception_ptr bgerror;
 std::thread background([&]{try{if(source_mode){RunHttpSources(runtime,root,1200,writes,removed,&source_started_ns);return;}recording::RetentionCoordinator retention(catalog,[&](auto* b,auto*){*b=std::filesystem::space(root).available;return true;},[&](const auto& p,auto* e){const bool ok=recording::RemoveContainedMediaFile(root/"recording",p,e,{},true);if(ok)++removed;return ok;},{0,64ULL*1024*1024,root/"recording"});std::array<std::unique_ptr<recording::GStreamerSegmentWriter>,2> writers;
  for(unsigned i=0;i<2;++i){const std::string channel=i?"9201":"9101";recording::RetentionPolicy policy;policy.continuous_max_bytes=87ULL*1024*1024;policy.event_max_bytes=128ULL*1024*1024;std::string detail;NeedHttp(retention.UpdateChannelPolicy(channel,policy,&detail),detail.c_str());auto o=runtime.WriterOptions(2000);o.admit_segment=[&](const auto& c,std::uint64_t m){const auto a=retention.AdmitContinuousWrite(c,m,1791887500000LL);return recording::SegmentAdmissionDecision{a.allowed,a.start_new_epoch,a.reserved_bytes};};o.report_segment_progress=[&](const auto& c,std::uint64_t b){retention.UpdateContinuousWriteProgress(c,b);};o.complete_segment=[&](const auto& c,std::uint64_t b){retention.CompleteContinuousWrite(c,b);++writes;};writers[i]=std::make_unique<recording::GStreamerSegmentWriter>(o);NeedHttp(writers[i]->Start(i?"9201":"9101","unused",input.descriptor,[](auto,auto,auto*){return false;},&detail),detail.c_str());}
  const auto begin=Clock::now();for(unsigned i=0;i<180;++i){auto packet=input.packets[i%60];const std::int64_t delta=std::int64_t(i/60)*2000000000;packet.pts+=delta;packet.dts+=delta;if(packet.observation){auto& o=*packet.observation;o.ordinal=i+1;o.pts_ns=packet.pts;o.dts_ns=packet.dts;o.mono_before_ns+=delta;o.mono_after_ns+=delta;o.observed_utc_ns+=delta;}
   for(auto& writer:writers)writer->Push(packet,0);if(i%30==0)retention.RunPeriodic(1791887500000LL+i*1000/30);std::this_thread::sleep_until(begin+std::chrono::nanoseconds((i+1)*1000000000ULL/30));}
  for(auto& writer:writers)writer->Stop();
 }catch(...){bgerror=std::current_exception();try{std::rethrow_exception(bgerror);}catch(const std::exception& e){std::cerr<<"[R118-background-failure] "<<e.what()<<std::endl;}catch(...){std::cerr<<"[R118-background-failure] unknown"<<std::endl;}}});
 struct Join {std::thread& t;~Join(){if(t.joinable())t.join();}} join{background};
 if(source_mode){const auto end=Clock::now()+std::chrono::seconds(10);while(!source_started_ns.load()&&Clock::now()<end)std::this_thread::sleep_for(std::chrono::milliseconds(10));NeedHttp(source_started_ns.load()!=0,"source-start");}
 unsigned failures=0;std::vector<double> elapsed;
 for(unsigned round=0;round<3;++round){
  if(source_mode){const auto target=source_started_ns.load()+(round+1)*2000000000ULL;std::this_thread::sleep_until(Clock::time_point(std::chrono::nanoseconds(target)));std::cout<<"[R118-wave] round="<<round<<" sourceStartNs="<<source_started_ns.load()<<" startNs="<<SourceHttpSteadyNs()<<std::endl;}
  std::vector<std::future<std::tuple<double,std::string>>> requests;
  for(unsigned client=0;client<clients;++client)requests.push_back(std::async(std::launch::async,[&,client]{
   const std::string route=client<2?"/ops/api/recordings/visual-search?channelIds=9101,9201&text=ball&limit=20&threshold=-1":
    (source_mode?"/ops/api/recordings/search?channelIds=9101&startTimeMs=1792000000000&endTimeMs=1792100000000&limit=20&includeUnplaced=true":"/ops/api/recordings/search?channelIds=9101&startTimeMs=1791800000000&endTimeMs=1791900000000&limit=20&includeUnplaced=true");
   const auto begin=Clock::now();HttpObservation observation{round*clients+client,"original12",route,begin};Socket socket;socket.fd=Request(port,route);auto wire=Drain(socket.fd,begin+std::chrono::seconds(5),observation);return std::make_tuple(std::chrono::duration<double,std::milli>(Clock::now()-begin).count(),wire);
  }));
  for(unsigned client=0;client<clients;++client){const auto [ms,wire]=requests[client].get();elapsed.push_back(ms);if(wire.rfind("HTTP/1.1 200",0)!=0)++failures;std::cout<<"[R107-http] round="<<round<<" client="<<client<<" ms="<<ms<<" response="<<wire.substr(wire.find("\r\n\r\n")+4)<<std::endl;}
  NeedHttp(trace.Emit("wave"),"trace-wave");
 }
 background.join();if(bgerror)std::rethrow_exception(bgerror);
 {auto times=elapsed;std::sort(times.begin(),times.end());std::cout<<"[R119-original-result] failures="<<failures<<" count="<<times.size()<<" p95="<<times[std::size_t(std::ceil(times.size()*.95))-1]<<" max="<<times.back()<<std::endl;}
 const auto publication_end=Clock::now()+std::chrono::seconds(30);bool published=false;
 while(Clock::now()<publication_end){const auto status=visual.Status(authorize);StrictJsonObjectDocument doc;NeedHttp(status.status==200&&ParseStrictJsonObjectDocument(status.body,&doc,&error),"publication-status");const auto state=StrictJsonStringField(doc,"state");if(!state||*state=="degraded"||*state=="stopped"||*state=="unavailable")std::cerr<<"[R119-publication-failure] status="<<status.status<<" body="<<status.body<<std::endl;NeedHttp(state&&*state!="degraded"&&*state!="stopped"&&*state!="unavailable","publication-failed");if((*state=="ready"||*state=="indexing")&&Generation107(status.body)&&(!initial_generation||*Generation107(status.body)>*initial_generation)){published=true;break;}std::this_thread::sleep_for(std::chrono::milliseconds(100));}
 NeedHttp(published,"new index publication after writer");
 std::cout<<"[R107-background] writes="<<writes<<" removed="<<removed<<" status="<<visual.Status(authorize).body<<std::endl;
 if(source_mode){
 {const auto view=VisualSearchPublicationTestProbe::View(visual);NeedHttp(view.index&&view.publication,"current publication");std::size_t fresh=0;for(const auto& d:view.index->documents())if(!original_segments.count(d.segment_id)){NeedHttp(catalog.FindSourceBinding(d.segment_id).has_value(),"published current binding");++fresh;}
 std::cout<<"[R119-membership] generation="<<view.publication->generation.value_or(0)<<" documents="<<view.index->documents().size()<<" newDocuments="<<fresh<<" instance="<<view.publication->instance_id<<std::endl;NeedHttp(fresh>0,"published new document membership");}
 const auto begin=Clock::now();const std::string route="/ops/api/recordings/visual-search?channelIds=9101,9201&text=ball&limit=200&threshold=-1";HttpObservation observation{100,"auxiliary200",route,begin};Socket socket;socket.fd=Request(port,route);const auto wire=Drain(socket.fd,begin+std::chrono::seconds(5),observation);NeedHttp(wire.rfind("HTTP/1.1 200",0)==0,"publication HTTP status");const auto body=wire.substr(wire.find("\r\n\r\n")+4);StrictJsonObjectDocument doc;std::size_t fresh=0;NeedHttp(ParseStrictJsonObjectDocumentObjectArray(body,"items",&doc,[&](const auto& item){const auto url=StrictJsonStringField(item,"playbackUrl");if(!url)return false;const auto id=std::filesystem::path(*url).filename().string();if(!original_segments.count(id)){const auto binding_begin=SourceHttpSteadyNs();const bool bound=catalog.FindSourceBinding(id).has_value();observation.BindingComplete(binding_begin);NeedHttp(bound,"new published source binding");++fresh;}return true;},&error),error.c_str());HttpObservation::Mark(observation.validationEndNs);std::cout<<"[R118-publication] newDocuments="<<fresh<<" response="<<body<<std::endl;HttpObservation::Mark(observation.outputEndNs);NeedHttp(fresh>0,"new writer document live publication");}
 NeedHttp(finish.Run(),"explicit finish failed");
 std::sort(elapsed.begin(),elapsed.end());std::cout<<"[R107-result] failures="<<failures<<" count="<<elapsed.size()<<" p95="<<elapsed[std::size_t(std::ceil(elapsed.size()*.95))-1]<<" max="<<elapsed.back()<<std::endl;
 NeedHttp(source_mode?writes>=6:writes==6,"durable writer completions");NeedHttp(elapsed[std::size_t(std::ceil(elapsed.size()*.95))-1]<=2000&&elapsed.back()<=5000,"original latency criteria");return failures?1:0;
 }catch(const std::exception& e){std::cerr<<"[R107-fail] "<<e.what()<<std::endl;return 1;}
}

#endif
