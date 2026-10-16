// 파일 용도: 보존 누적 원본의 전체 mapping·cursor와 실제 HTTP/증거 소비. 장시간 대체 아님.
#define RECORDING_DEGRADED_HTTP_NO_MAIN
#include "recording_degraded_http_smoke.cpp"
#include "recording/recording_search_snapshots.h"
#include "recording/recording_search_diagnostic.h"
namespace {
std::string Http126(std::uint16_t port,const std::string& route,unsigned id,bool post=false){
 const auto begin=Clock::now();HttpObservation observation{id,"capacity126",route,begin};Socket socket;
 if(!post)socket.fd=Request(port,route);
 else {socket.fd=::socket(AF_INET,SOCK_STREAM,0);NeedHttp(socket.fd>=0,"socket");timeval timeout{5,0};setsockopt(socket.fd,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));sockaddr_in a{};a.sin_family=AF_INET;a.sin_port=htons(port);inet_pton(AF_INET,"127.0.0.1",&a.sin_addr);NeedHttp(!connect(socket.fd,reinterpret_cast<sockaddr*>(&a),sizeof(a)),"connect");NeedHttp(webrtc_http_server_detail::SendAll(socket.fd,"POST "+route+" HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer owned-http85-admin-token\r\nContent-Type: application/json\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}"),"send");}
 auto wire=Drain(socket.fd,begin+std::chrono::seconds(5),observation);const auto end=wire.find("\r\n\r\n");NeedHttp(end!=std::string::npos,"HTTP headers");
 std::cout<<"[R126-http] id="<<id<<" status="<<wire.substr(9,3)<<" ms="<<std::chrono::duration<double,std::milli>(Clock::now()-begin).count()<<" bytes="<<wire.size()<<std::endl;
 NeedHttp(wire.rfind(post?"HTTP/1.1 201":"HTTP/1.1 200",0)==0,wire.substr(end+4).c_str());return wire.substr(end+4);
}
std::string Field126(const std::string& body,const char* name){StrictJsonObjectDocument d;std::string error;NeedHttp(ParseStrictJsonObjectDocument(body,&d,&error),"JSON");return StrictJsonStringField(d,name).value_or("");}
std::string Url126(const std::string& in){std::string out;const char* hex="0123456789ABCDEF";for(unsigned char c:in){if(std::isalnum(c)||c=='-'||c=='_'||c=='.')out+=char(c);else{out+='%';out+=hex[c>>4];out+=hex[c&15];}}return out;}
}
int main(int argc,char**argv){
 if((argc!=2&&argc!=3)||!RecordingWriterTestIsolation(argv[1]))return 2;
 if(argc==3&&std::string(argv[2])=="--readback") {
  recording::EvidencePackageStore::Limits limits;limits.reserved_free_bytes=64ULL*1024*1024;
  recording::EvidencePackageStore store(std::filesystem::path(argv[1])/"packages",limits);std::string error;std::vector<std::string> ids;
  if(!store.ListIds(&ids,&error)||ids.size()!=1)return 3;
  const auto package=store.Open(ids.front(),&error);if(!package||package->manifest().frames.empty())return 4;
  std::cout<<"[R126-readback] "<<recording::SerializeEvidencePackage(package->manifest())<<std::endl;return 0;
 }
 std::shared_ptr<recording::SearchModelResidency> owner;std::shared_ptr<recording::RecordingScratchResidency> scratch;
 try {const std::filesystem::path root(argv[1]);gst_init(nullptr,nullptr);std::string error;
 {recording::RecordingRuntimeStorage runtime(root/"recording");NeedHttp(runtime.Open(&error),error.c_str());auto& catalog=runtime.catalog();owner=catalog.SearchResidency();scratch=catalog.ScratchResidency();
 struct Finish {recording::RecordingRuntimeStorage& runtime;bool done=false;bool Run(){if(done)return true;done=true;std::string e;const bool ok=runtime.Finish(&e);std::cout<<"[R126-explicit-finish] ok="<<ok<<" error="<<e<<std::endl;return ok;}~Finish(){if(!done)(void)Run();}} finish{runtime};
 recording::RecordingReadService reader(catalog);recording::RecordingSearchReader search(catalog,reader);
 {
 std::shared_ptr<const recording::RecordingSearchModel> model;NeedHttp(search.Refresh({"9101"},{},&model,&error,{},false),error.c_str());
 recording::RecordingSearchQuery query;query.channels={"9101"};query.start_time_ms=1792000000000;query.end_time_ms=1792200000000;query.include_unplaced=true;query.limit=200;
 recording::RecordingSearchSnapshots pages;recording::RecordingSearchPage page;NeedHttp(pages.Begin(model,query,"owner","scope",&page,&error),error.c_str());
 std::ifstream oracle(root/"expected-ids.txt");std::vector<std::string> expected;for(std::string line;std::getline(oracle,line);)expected.push_back(line);
 NeedHttp(expected.size()==25526,"independent preserved input count");std::size_t count=0,number=0;
 do {++number;NeedHttp(page.known_count==1018&&page.unplaced_count==24508,"all known/unplaced retained");for(auto p:page.positions){NeedHttp(count<expected.size()&&model->documents().at(p).id==expected[count++],"independent sorted mapping identity");}if(page.next_cursor.empty())break;NeedHttp(pages.Resume(page.next_cursor,query,"owner","scope",&page,&error),error.c_str());}while(true);
 NeedHttp(count==expected.size(),"all pages no missing/duplicate");
 std::cout<<"[R126-pages] pages="<<number<<" count="<<count<<" modelBytes="<<model->accounted_bytes()<<" owner="<<owner->used()<<std::endl;
 }
 {ingress::EvidenceApplicationService evidence(catalog,reader,true,root/"packages",64ULL*1024*1024);
 ingress::RecordingApplicationService app(reader,catalog,true,{}, {},nullptr,&evidence);
 Media media;Lifecycle lifecycle;Reads reads;WebRtcHttpRuntimeConfig config;config.auth_mode=HttpAuthMode::Token;config.auth_admin_token="owned-http85-admin-token";config.enable_ops=true;config.auth_users_file=(root/"users.json").string();config.source_registry_path=(root/"sources.json").string();config.analysis_registry_path=(root/"analysis.json").string();config.file_root_path=(root/"input").string();
 WebRtcHttpServer server(media,lifecycle,reads,config,&app);NeedHttp(server.Start("127.0.0.1",0,&error),error.c_str());struct Stop{WebRtcHttpServer& s;ingress::EvidenceApplicationService& e;~Stop(){s.Stop();e.Stop();}}stop{server,evidence};auto port=RecordingHttpOwnershipProbe::Port(server);std::cout<<"[R126-port] "<<port<<std::endl;
 const std::string query="channelIds=9101&startTimeMs=1792000000000&endTimeMs=1792200000000&limit=20&includeUnplaced=true";
 std::string first;
 for(unsigned i=0;i<3;++i){auto body=Http126(port,"/ops/api/recordings/search?"+query,i+1);if(!i)first=body;}
 std::string hit;StrictJsonObjectDocument body;NeedHttp(ParseStrictJsonObjectDocumentObjectArray(first,"items",&body,[&](const auto& item){if(hit.empty())hit=StrictJsonStringField(item,"id").value_or("");return true;},&error),"items");NeedHttp(!hit.empty(),"hit");
 const auto selected=query+"&snapshotId="+Url126(Field126(first,"snapshotId"))+"&hitId="+Url126(hit);
 auto seek=Http126(port,"/ops/api/recordings/search/seek?"+selected,4);std::cout<<"[R126-seek] "<<seek<<std::endl;
 auto package=Http126(port,"/ops/api/recordings/search/evidence?"+selected,5,true);std::cout<<"[R126-package] "<<package<<std::endl;
 const auto cursor=Field126(first,"nextCursor");NeedHttp(!cursor.empty(),"cursor");(void)Http126(port,"/ops/api/recordings/search?"+query+"&cursor="+Url126(cursor),6);
 // 별도 기능 검사: 같은 누적 원본에 실제 source를 추가하고 이전 모델 보유 중 refresh 확인.
 std::shared_ptr<const recording::RecordingSearchModel> held,next;
 NeedHttp(search.Refresh({"9101"},{},&held,&error,{},false),error.c_str());
 const auto held_count=held->documents().size();std::atomic<unsigned> writes{0},removed{0};
 RunHttpSources(runtime,root,120,writes,removed);
 NeedHttp(search.Refresh({"9101"},held,&next,&error,{},false),error.c_str());
 NeedHttp(held->documents().size()==held_count&&next->documents().size()>held_count,"held snapshot and new durable input");
 std::cout<<"[R126-refresh] before="<<held_count<<" after="<<next->documents().size()<<" writes="<<writes<<" removed="<<removed<<" oldBytes="<<held->accounted_bytes()<<" newBytes="<<next->accounted_bytes()<<" owner="<<owner->used()<<std::endl;
 for(unsigned i=0;i<2;++i)(void)Http126(port,"/ops/api/recordings/search?"+query,7+i);
 held.reset();next.reset();
 WaitIdle(server);server.Stop();evidence.Stop();std::cout<<"[R126-stop] explicit=true"<<std::endl;
 }
 NeedHttp(finish.Run(),"Finish");std::cout<<"[R126-finish] owner="<<owner->used()<<std::endl;
 }
 auto usage=scratch->usage();NeedHttp(owner->used()==0&&usage.disk_bytes==0&&usage.file_descriptors==0&&usage.ram_bytes==0,"last storage owner");std::cout<<"[R126-destroyed] RAM=0 scratch=0 FD=0 peak="<<owner->peak()<<std::endl;
 return 0;
 }catch(const std::exception& e){std::cerr<<"[R126-first-error] "<<e.what()<<std::endl;return 1;}
}
