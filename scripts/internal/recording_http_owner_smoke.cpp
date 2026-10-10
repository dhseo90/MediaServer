// 파일 용도: 실제 HTTP recording 검색 route의 송신/종료와 응답 예약 수명을 검사한다.
#define main PriorTimelineMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include "../../src/ingress/webrtc_http_server_detail.h"
#include <poll.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <netinet/tcp.h>
#include <thread>
#include <atomic>
#include <exception>
namespace ingress {
struct RecordingHttpOwnershipProbe {
    static std::uint16_t Configure(WebRtcHttpServer& s){
        {auto g=s.impl_->recording_gate;std::lock_guard lock(g->mu_);g->test_send_buffer_bytes_=4096;}
        sockaddr_in a{};socklen_t n=sizeof(a);if(getsockname(s.impl_->listen_fd,reinterpret_cast<sockaddr*>(&a),&n))throw std::runtime_error("listen identity");return ntohs(a.sin_port);
    }
    static int DuplicateFlight(WebRtcHttpServer& s){
        auto g=s.impl_->recording_gate;std::lock_guard lock(g->mu_);
        if(g->flights_.size()!=1)return -1;
        const int fd=g->flights_.begin()->second;
        const int flags=fcntl(fd,F_GETFL,0);if(flags<0||(flags&O_NONBLOCK))throw std::runtime_error("expected actual blocking HTTP socket");
        int bytes=0;socklen_t size=sizeof(bytes);if(getsockopt(fd,SOL_SOCKET,SO_SNDBUF,&bytes,&size)||bytes<4096||bytes>8192)throw std::runtime_error("actual accepted send buffer mismatch");
        timeval timeout{};size=sizeof(timeout);if(getsockopt(fd,SOL_SOCKET,SO_SNDTIMEO,&timeout,&size)||timeout.tv_sec!=5)throw std::runtime_error("actual send timeout mismatch");
        return dup(fd);
    }
    static std::shared_ptr<RecordingSendObservation> Observe(WebRtcHttpServer& s) {
        auto g=s.impl_->recording_gate;std::lock_guard lock(g->mu_);
        g->test_send_observation_=std::make_shared<RecordingSendObservation>();return g->test_send_observation_;
    }
    static int Active(WebRtcHttpServer& s){return s.impl_->active_http_connections.load();}
};
}
namespace {
using namespace ingress;
using Clock=std::chrono::steady_clock;
void Require(bool ok,const char* what){if(!ok)throw std::runtime_error(what);std::cout<<"[pass] "<<what<<std::endl;}
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
void WaitIdle(WebRtcHttpServer& s){const auto end=Clock::now()+std::chrono::seconds(12);while(RecordingHttpOwnershipProbe::Active(s)&&Clock::now()<end)std::this_thread::sleep_for(std::chrono::milliseconds(5));Require(!RecordingHttpOwnershipProbe::Active(s),"HTTP connection worker completed");}
int Request(std::uint16_t port,const std::string& path,bool admin=true){
    Socket c;c.fd=socket(AF_INET,SOCK_STREAM,0);Require(c.fd>=0,"client socket");int small=1024;
    Require(!setsockopt(c.fd,SOL_SOCKET,SO_RCVBUF,&small,sizeof(small)),"test client receive buffer");
    int segment=512;Require(!setsockopt(c.fd,IPPROTO_TCP,TCP_MAXSEG,&segment,sizeof(segment)),"test TCP segment size within receive window");
    timeval timeout{7,0};setsockopt(c.fd,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));
    sockaddr_in a{};a.sin_family=AF_INET;a.sin_port=htons(port);inet_pton(AF_INET,"127.0.0.1",&a.sin_addr);
    Require(!connect(c.fd,reinterpret_cast<sockaddr*>(&a),sizeof(a)),"actual loopback connect");
    const auto request="GET "+path+" HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer "+(admin?std::string("owned-http85-admin-token"):std::string("owned-http85-viewer-token"))+"\r\nConnection: close\r\n\r\n";
    Require(webrtc_http_server_detail::SendAll(c.fd,request),"normal HTTP request sent");return std::exchange(c.fd,-1);
}
std::string Drain(int fd,bool slow=false){std::string result;char b[4096];for(;;){auto n=recv(fd,b,sizeof(b),0);if(n==0)break;if(n<0)throw std::runtime_error("client receive failed");if(result.size()+static_cast<std::size_t>(n)>4*1024*1024+8192)throw std::runtime_error("HTTP fixture result bound");result.append(b,n);if(slow)std::this_thread::sleep_for(std::chrono::milliseconds(1));}return result;}
std::size_t WaitBlocked(WebRtcHttpServer& server,int client,const std::shared_ptr<recording::SearchModelResidency>& owner){
    const auto end=Clock::now()+std::chrono::seconds(3);std::size_t progress=0;
    while(Clock::now()<end){
        Socket duplicate;duplicate.fd=RecordingHttpOwnershipProbe::DuplicateFlight(server);
        char b[2048];const auto n=recv(client,b,sizeof(b),MSG_PEEK|MSG_DONTWAIT);
        if(n>0)progress=static_cast<std::size_t>(n);
        if(duplicate.fd>=0&&progress){pollfd p{duplicate.fd,POLLOUT,0};const int ready=poll(&p,1,0);
            if(ready==0){Require(owner->used()>16*1024*1024,"body/encoded work still charged while socket not writable");
                std::cout<<"[http-backpressure] peekBytes="<<progress<<" writeReady=false owner="<<owner->used()<<std::endl;return owner->used();}}
        std::this_thread::sleep_for(std::chrono::milliseconds(5));
    }
    char header[128]{};const auto n=recv(client,header,sizeof(header)-1,MSG_PEEK|MSG_DONTWAIT);
    if(n>0){const std::string prefix(header,static_cast<std::size_t>(n));std::cout<<"[unblocked-response] status="<<prefix.substr(0,prefix.find("\r\n"))<<" peekBytes="<<progress<<std::endl;}
    throw std::runtime_error("actual partial send/backpressure not observed");
}
}
int main(int argc,char** argv){
    const bool diagnose=argc==3&&std::string(argv[2])=="--diagnose-timeout";
    const bool stop_only=argc==3&&std::string(argv[2])=="--stop-only";
    if(argc!=2&&!stop_only&&!diagnose)return 2;
    try {
        gst_init(nullptr,nullptr);const auto root=std::filesystem::canonical(argv[1]);Store store(root/"store");
        PrepareMedia(store,true);const auto original=store.Segments().front();
        (void)original;
        for(unsigned i=0;i<200;++i){recording::AnalysisObservationV2 o;o.observation_id="http-observation-"+std::to_string(i);
            o.source_id="http-observation-source";o.channel_id="http-large-channel";o.analysis_namespace="http-native-fixture";
            o.track_id="track-1";o.class_label="person";o.confidence=.8;o.bbox={0,0,.5,.5};o.selection_reasons={"track-start"};
            for(unsigned k=0;k<64;++k){const auto key=std::to_string(k);o.event_ids.push_back(key+std::string(128-key.size(),'e'));o.zone_ids.push_back(key+std::string(128-key.size(),'z'));}
            recording::RecordingConsumerReferenceV1 ref;ref.reference_id="http-ref-"+std::to_string(i);ref.kind="observation";ref.owner_id=o.observation_id;
            ref.source_id=o.source_id;ref.channel_id=o.channel_id;ref.analysis_namespace=o.analysis_namespace;ref.analysis_track_id=o.track_id;ref.analysis_pts=o.pts;ref.association_quality="unavailable";
            std::string detail;if(!store.catalog.PutReferencedObservation(o,ref,&detail))throw std::runtime_error(detail);
        }
        recording::RecordingReadService read(store.catalog);RecordingApplicationService app(read,store.catalog,true,{});
        auto owner=store.catalog.SearchResidency();
        // Keep a real independent consumer alive across all transport terminations.
        auto held=app.Search({{"channelIds","http-large-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200003000"},{"limit","200"},{"includeUnplaced","true"},{"object","person"}},"held-owner","held-scope",[](const auto&){return true;});
        std::cout<<"[prepared-response] status="<<held.status<<" bytes="<<held.body.size()<<std::endl;
        Require(held.status==200&&held.memory.bytes()>0&&held.body.size()>3*1024*1024,"independent real response owner and sufficient valid body");
        Media media;Lifecycle lifecycle;Reads reads;WebRtcHttpRuntimeConfig config;
        config.auth_mode=HttpAuthMode::Token;config.auth_admin_token="owned-http85-admin-token";config.auth_viewer_token="owned-http85-viewer-token";config.enable_ops=true;
        config.auth_users_file=(root/"users.json").string();config.source_registry_path=(root/"sources.json").string();config.analysis_registry_path=(root/"analysis.json").string();config.file_root_path=root.string();
        WebRtcHttpServer server(media,lifecycle,reads,config,&app);std::string error;const bool started=server.Start("127.0.0.1",0,&error);if(!started)std::cerr<<"[server-start-error] "<<error<<std::endl;Require(started,"actual product HTTP server Start");
        const auto port=RecordingHttpOwnershipProbe::Configure(server);
        std::cout<<"[owned-port] "<<port<<std::endl;
        const std::string route="/ops/api/recordings/search?channelIds=http-large-channel&startTimeMs=1789200000000&endTimeMs=1789200003000&limit=200&includeUnplaced=true&object=person";
        const std::vector<std::string> modes=diagnose?std::vector<std::string>{"timeout"}:stop_only?std::vector<std::string>{"stop"}:
            std::vector<std::string>{"normal","slow","reset","timeout","stop-race"};
        for(const std::string& mode:modes){
            const auto observation=RecordingHttpOwnershipProbe::Observe(server);
            Socket client;client.fd=Request(port,route);const auto began=Clock::now();const auto charged=WaitBlocked(server,client.fd,owner);
            if(mode=="normal"||mode=="slow"){
                const auto response=Drain(client.fd,mode=="slow");Require(response.rfind("HTTP/1.1 200",0)==0&&response.find("\"items\":[")!=std::string::npos,"real response completed after partial-send pressure");
                std::cout<<"[http-response] bytes="<<response.size()<<std::endl;
            }else if(mode=="reset"){linger l{1,0};Require(!setsockopt(client.fd,SOL_SOCKET,SO_LINGER,&l,sizeof(l)),"test peer reset");client.Reset();}
            else if(mode=="stop"){server.Stop();Require(owner->used()<charged,"Stop drains response owner after user-space send completion");}
            else if(mode=="stop-race"){
                std::atomic<bool> consuming{false};std::size_t wire_bytes=0;std::exception_ptr peer_error;
                std::thread peer([&]{consuming.store(true);try{wire_bytes=Drain(client.fd).size();}catch(...){peer_error=std::current_exception();}});
                while(!consuming.load())std::this_thread::yield();
                server.Stop();peer.join();if(peer_error)std::rethrow_exception(peer_error);
                Require(wire_bytes<=held.body.size()+1024,"concurrent peer completion/Stop has bounded complete-or-partial response");
                std::cout<<"[stop-completion-race] wireBytes="<<wire_bytes<<" active="<<RecordingHttpOwnershipProbe::Active(server)<<std::endl;
            }
            if(mode=="timeout") {
                // Original MEM85 observation begins at POLLOUT=false, which need
                // not mean a zero-progress send: kernels can still accept bytes.
                // The diagnostic mode preserves that exact 12s premise. The new
                // separate case fixes a 12s preparation followed by a 12s window;
                // neither window is moved on later positive progress.
                const auto preparationEnd=Clock::now()+std::chrono::seconds(diagnose?0:12);
                while(RecordingHttpOwnershipProbe::Active(server)&&Clock::now()<preparationEnd)
                    std::this_thread::sleep_for(std::chrono::milliseconds(5));
                std::cout<<"[timeout-preparation] seconds="<<(diagnose?0:12)<<" active="<<RecordingHttpOwnershipProbe::Active(server)<<std::endl;
                const auto end=preparationEnd+std::chrono::seconds(12);std::size_t printed=0;
                while(RecordingHttpOwnershipProbe::Active(server)&&Clock::now()<end) {
                    const auto state=observation->Snapshot();if(state.overflow)throw std::runtime_error("send observation overflow");
                    for(;printed<state.count;++printed){const auto& e=state.events[printed];std::cout<<"[send] begin="<<e.begin<<" ns="<<e.ns<<" requested="<<e.requested<<" returned="<<e.returned<<" errno="<<e.error<<std::endl;}
                    std::this_thread::sleep_for(std::chrono::milliseconds(100));
                }
                const auto state=observation->Snapshot();
                for(;printed<state.count;++printed){const auto& e=state.events[printed];std::cout<<"[send] begin="<<e.begin<<" ns="<<e.ns<<" requested="<<e.requested<<" returned="<<e.returned<<" errno="<<e.error<<std::endl;}
                std::cout<<"[timeout-window] active="<<RecordingHttpOwnershipProbe::Active(server)<<" owner="<<owner->used()<<std::endl;
                Require(!RecordingHttpOwnershipProbe::Active(server),"MEM86 timeout worker completed within fixed observation");
                bool timed_out=false;double blocked=0;
                for(std::size_t i=1;i<state.count;++i) {
                    const auto& e=state.events[i];const auto& before=state.events[i-1];
                    if(!e.begin&&e.returned<0&&(e.error==EAGAIN||e.error==EWOULDBLOCK)&&before.begin) {
                        timed_out=true;blocked=(e.ns-before.ns)/1e9;
                    }
                }
                Require(timed_out&&blocked>=4.5,"actual zero-byte syscall timeout observed before worker release");
                std::cout<<"[no-progress-timeout] syscallSeconds="<<blocked<<std::endl;
            } else WaitIdle(server);
            const auto terminal=observation->Snapshot();Require(!terminal.overflow,"fixed send observation complete");
            if(mode!="timeout")for(std::size_t i=0;i<terminal.count;++i){const auto& e=terminal.events[i];std::cout<<"[send] mode="<<mode<<" begin="<<e.begin<<" ns="<<e.ns<<" requested="<<e.requested<<" returned="<<e.returned<<" errno="<<e.error<<std::endl;}
            Require(owner->used()<charged&&held.memory.bytes()>0&&!held.body.empty(),"transport ended charge returned; other consumer retained");
            const auto elapsed=std::chrono::duration<double>(Clock::now()-began).count();
            if(mode=="timeout"){const auto received=Drain(client.fd);Require(received.size()<held.body.size(),"timeout leaves incomplete wire body");std::cout<<"[timeout-observed] elapsed="<<elapsed<<" received="<<received.size()<<" header="<<received.substr(0,received.find("\r\n"))<<std::endl;Require(elapsed>=4.5&&elapsed<24.1,"existing per-send timeout; separate fixed preparation/observation completed");}
            std::cout<<"[http-case] mode="<<mode<<" elapsed="<<elapsed<<" charged="<<charged<<" after="<<owner->used()<<std::endl;
            if(mode=="slow"){
                Socket forbidden;forbidden.fd=Request(port,route,false);Require(Drain(forbidden.fd).rfind("HTTP/1.1 403",0)==0,"real route viewer forbidden");WaitIdle(server);
                auto saturation=owner->ReserveOwned(owner->limit()-owner->used());Require(bool(saturation),"explicit test quota saturation");
                Socket capacity;capacity.fd=Request(port,route);const auto response=Drain(capacity.fd);Require(response.rfind("HTTP/1.1 503",0)==0&&response.size()<1024,"real route bounded resource error");WaitIdle(server);saturation.reset();
            }
        }
        Require(!server.IsRunning(),"server stopped");Require(store.journal.Finish(&error),"Journal explicit Finish");
        std::cout<<"[scope] real TCP normal route; no media-session inference; kernel queue not counted as user-space reservation; no instantaneous heap proof"<<std::endl;return 0;
    }catch(const std::exception& e){std::cerr<<"[failure] "<<e.what()<<std::endl;return 1;}
}
