// R165 continuation: reuse preserved small V2/HTTP focused; no accumulated workload.
// Included Http152 is a generated owned copy with correlation header 1 only for request 10.
#define RECORDING_ACCUMULATED_NO_MAIN
#include "recording_accumulated_http_smoke.cpp"
int main(int argc,char** argv){
 if(argc!=2||!RecordingWriterTestIsolation(argv[1]))return 2;
 try {
  gst_init(nullptr,nullptr);const std::filesystem::path root(argv[1]);
  recording::RecordingRuntimeStorage runtime(root/"recording");std::string error;
  NeedHttp(runtime.Open(&error),"focused runtime Open");
  bool finished=false;
  struct FailureFinish {recording::RecordingRuntimeStorage& runtime;bool& finished;
   ~FailureFinish(){if(!finished)Cleanup153("focused-failure-finish",[&]{std::string e;const bool ok=runtime.Finish(&e);std::cerr<<"[R165-failure-cleanup] {\"finish\":"<<(ok?"true":"false")<<"}\n";if(!ok)throw std::runtime_error("focused failure Finish");});}
  } finish{runtime,finished};
  auto& catalog=runtime.catalog();recording::RecordingReadService reader(catalog);
  auto input=MixedInput(root);
  {recording::GStreamerSegmentWriter writer(runtime.WriterOptions(2000));NeedHttp(writer.Start("9101","focused",input.descriptor,[](auto,auto,auto*){return false;},&error),"focused writer");for(const auto& packet:input.packets)writer.Push(packet,0);writer.Stop();}
  const auto ids=catalog.FinalizedSegmentIdsForStartup();NeedHttp(ids.size()==2,"focused two V2 sources");
  const auto id=ids.front();const auto row=catalog.FindSegmentV2ById(id);const auto binding=catalog.FindSourceBinding(id);NeedHttp(row&&binding,"focused V2 row/binding");
  NeedHttp(!catalog.FindSegmentById(id)&&!catalog.FindSegmentMediaPath(id),"V2 only not V1 path");

  {
   RecordingApplicationService app(reader,catalog,true,{});
   Media media;Lifecycle lifecycle;Reads reads;WebRtcHttpRuntimeConfig config;
   config.auth_mode=HttpAuthMode::Token;config.auth_admin_token="owned-http85-admin-token";config.auth_viewer_token="owned-http85-viewer-token";config.enable_ops=true;
   config.auth_users_file=(root/"users.json").string();config.source_registry_path=(root/"sources.json").string();config.analysis_registry_path=(root/"analysis.json").string();config.file_root_path=(root/"input").string();
   WebRtcHttpServer server(media,lifecycle,reads,config,&app);
   error.clear();const bool started=server.Start("127.0.0.1",0,&error);const int start_errno=errno;
   if(!started){
    const char* stage=error=="failed to create HTTP socket"?"socket":error=="invalid HTTP listen address"?"inet_pton":error.rfind("failed to bind HTTP socket: ",0)==0?"bind":error.rfind("failed to listen HTTP socket: ",0)==0?"listen":"unknown";
    const std::string safe=std::string(stage)=="unknown"?"unrecognized Start error (redacted)":error;
    std::cerr<<"[R165-http-start-failure] {\"stage\":"<<Q152(stage)<<",\"error\":"<<Q152(safe)<<",\"errnoAfterStart\":"<<start_errno<<"}"<<std::endl;
    throw std::runtime_error("focused HTTP Start failed; see bounded error record");
   }
   const auto port=RecordingHttpOwnershipProbe::Port(server);
   try {
    const std::string route="/ops/api/recordings/search?channelIds=9101&startTimeMs=1791887399000&endTimeMs=1791887420000&limit=20&includeUnplaced=true";
    (void)Http152(port,route,1,401,"",0);
    const auto response=Http152(port,route,10);NeedHttp(response.body.find("\"playable\":true")!=std::string::npos,"actual focused playable");
    WaitIdle(server);server.Stop();
   }catch(...){server.Stop();throw;}
   int fd=socket(AF_INET,SOCK_STREAM,0);NeedHttp(fd>=0,"port-close probe socket");sockaddr_in address{};address.sin_family=AF_INET;address.sin_port=htons(port);inet_pton(AF_INET,"127.0.0.1",&address.sin_addr);
   const int connection=connect(fd,reinterpret_cast<sockaddr*>(&address),sizeof(address));const int connect_error=errno;close(fd);NeedHttp(connection==-1&&connect_error==ECONNREFUSED,"focused port closed by refusal");
   std::cout<<"[R165-native-focused] actual parser/Search/send; auth401; portClosed true\n";
  }
  NeedHttp(runtime.Finish(&error),"focused Finish");finished=true;std::cout<<"[R165-focused-finish] PASS\n";return 0;
 }catch(const std::exception& e){std::cerr<<"[R165-native-focused-failure] "<<e.what()<<"\n";return 1;}
}
