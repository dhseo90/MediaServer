// 파일 용도: 제품 B 저장소, 8채널 writer와 4개 검색 client의 짧은 실제 동시 부하.
#define main RuntimeLoadFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include "recording/recording_runtime_composition.h"
#include <array>
#include <atomic>
#include <thread>
#include <sys/resource.h>
#include <fstream>
#include <condition_variable>
#include <sstream>
#ifdef __APPLE__
#include <malloc/malloc.h>
#include <mach/mach.h>
#endif
namespace {
// 각 thread는 자신의 원자 상태만 갱신한다. observer는 제품 객체/결과 vector를 읽지 않는다.
enum class LoadPhase : unsigned { Idle, Open, Encode, WriterStart, Observations, Warmup, Clients,
    Search, Packets, Checkpoint, WriterStop, Join, FinalValidation, Finish, Done, Failed };
const char* PhaseName(LoadPhase p) {
    static constexpr const char* names[]={"idle","open","encode","writer-start","observations","warmup",
        "clients-start","search","packets","checkpoint-request","writer-stop","thread-join","final-validation","finish","done","failed"};
    return names[static_cast<unsigned>(p)];
}
struct LoadProgress {
    using Clock=std::chrono::steady_clock;
    struct State {std::atomic<unsigned> phase{0};std::atomic<std::uint64_t> begin{0},last{0},completed{0};};
    std::array<State,14> states{};const Clock::time_point epoch=Clock::now();
    std::mutex output_mutex,wait_mutex;std::condition_variable wake;bool stopping=false;
    std::atomic<bool> output_failed{false};std::thread monitor;
    std::uint64_t Now() const {return std::chrono::duration_cast<std::chrono::microseconds>(Clock::now()-epoch).count();}
    void Line(const std::string& line) {
        std::lock_guard lock(output_mutex);
        if(std::fprintf(stdout,"%s\n",line.c_str())<0||std::fflush(stdout)!=0)output_failed=true;
    }
    void Begin(unsigned id,LoadPhase phase) {
        auto& state=states.at(id);const auto now=Now();state.begin=now;state.last=now;state.phase=static_cast<unsigned>(phase);
        Line("[load-stage] thread="+std::to_string(id)+" phase="+PhaseName(phase)+" event=begin us="+std::to_string(now));
    }
    void Progress(unsigned id,std::uint64_t count){states.at(id).completed=count;states.at(id).last=Now();}
    void End(unsigned id) {
        auto& state=states.at(id);const auto now=Now();
        Line("[load-stage] thread="+std::to_string(id)+" phase="+PhaseName(static_cast<LoadPhase>(state.phase.load()))+
             " event=end us="+std::to_string(now)+" elapsedUs="+std::to_string(now-state.begin.load())+" completed="+std::to_string(state.completed.load()));
        state.last=now;state.phase=static_cast<unsigned>(LoadPhase::Idle);
    }
    void Failure(unsigned id,const std::string& detail) {
        Line("[load-error] thread="+std::to_string(id)+" phase="+PhaseName(static_cast<LoadPhase>(states.at(id).phase.load()))+
            " us="+std::to_string(Now())+" detail="+detail.substr(0,1024));states.at(id).phase=static_cast<unsigned>(LoadPhase::Failed);
    }
    LoadProgress():monitor([this]{
        std::unique_lock lock(wait_mutex);
        while(!wake.wait_for(lock,std::chrono::seconds(1),[this]{return stopping;})){
            const auto now=Now();std::ostringstream line;line<<"[load-progress] us="<<now;
            for(unsigned id=0;id<states.size();++id){const auto& s=states[id];const auto phase=static_cast<LoadPhase>(s.phase.load());
                if(phase!=LoadPhase::Idle)line<<" t"<<id<<"="<<PhaseName(phase)<<":"<<s.completed.load()<<":"<<s.begin.load()<<":"<<s.last.load();}
            Line(line.str());
        }
    }){}
    ~LoadProgress(){ {std::lock_guard lock(wait_mutex);stopping=true;}wake.notify_one();if(monitor.joinable())monitor.join();}
};
std::string OwnedManifest(const std::filesystem::path& path){
    std::ifstream in(path,std::ios::binary);if(!in)throw std::runtime_error("checkpoint-manifest-open");
    std::string value;std::array<char,4096> buffer{};
    while(in){in.read(buffer.data(),buffer.size());const auto count=in.gcount();
        if(value.size()+static_cast<std::size_t>(count)>1024*1024)throw std::runtime_error("checkpoint-manifest-cap");
        value.append(buffer.data(),static_cast<std::size_t>(count));}
    if(!in.eof())throw std::runtime_error("checkpoint-manifest-read");return value;
}
struct Joined {
    std::vector<std::thread>& threads;std::atomic<bool>& stop;
    ~Joined(){stop=true;for(auto& thread:threads)if(thread.joinable())thread.join();}
};
}
int main(int argc,char** argv){
    if(argc!=2&&(argc!=3||(std::string(argv[2])!="existing"&&std::string(argv[2])!="checkpoint")))return 2;
    std::cout.setf(std::ios::unitbuf);LoadProgress progress;
    const bool checkpoint_overlap=argc==3&&std::string(argv[2])=="checkpoint";gst_init(nullptr,nullptr);
    std::unique_ptr<recording::RecordingRuntimeStorage> runtime_owner;
    try {
        const auto base=std::filesystem::weakly_canonical(argv[1]);
        const auto root=argc==3&&!checkpoint_overlap?base:base/"product";
        runtime_owner=std::make_unique<recording::RecordingRuntimeStorage>(root);auto& runtime=*runtime_owner;std::string error;
        progress.Begin(0,LoadPhase::Open);
        if(!runtime.Open(&error))throw std::runtime_error(error);progress.End(0);
        progress.Begin(0,LoadPhase::Encode);
        auto input=Encode(90,false,false,160,90,30,30);Shift(input,7000000000ULL);progress.End(0);progress.Begin(0,LoadPhase::WriterStart);
        std::vector<std::unique_ptr<recording::GStreamerSegmentWriter>> writers;
        std::vector<std::string> channels;std::string channel_query;
        for(int i=0;i<8;++i){
            const auto channel="load-channel-"+std::to_string(i);channels.push_back(channel);
            if(i)channel_query+=',';channel_query+=channel;
            auto writer=std::make_unique<recording::GStreamerSegmentWriter>(runtime.WriterOptions(1000));
            if(!writer->Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
            writers.push_back(std::move(writer));
        }
        progress.End(0);progress.Begin(0,LoadPhase::Observations);
        for(int i=0;i<10000;++i){recording::AnalysisObservationV2 o;o.observation_id="load-observation-"+std::to_string(i);
            o.source_id=channels[i%8];o.channel_id=o.source_id;o.analysis_namespace="load";o.track_id="track-1";
            o.class_label="person";o.confidence=.8;o.bbox={0,0,.5,.5};o.selection_reasons={"track-start"};
            if(!runtime.catalog().PutObservationV2(o,&error))throw std::runtime_error(error);
            if(i%250==249)progress.Progress(0,i+1);}
        progress.End(0);progress.Begin(0,LoadPhase::Warmup);
        recording::RecordingReadService reader(runtime.catalog());
        ingress::RecordingApplicationService app(reader,runtime.catalog(),true,{});
        std::unordered_map<std::string,std::string> query{{"channelIds",channel_query},{"startTimeMs","1789200000000"},{"endTimeMs","1789200004000"}};
        if(app.Search(query,"warmup","scope",[](const auto&){return true;}).status!=200)throw std::runtime_error("load-warmup");progress.End(0);
        std::atomic<unsigned> packets{0},finished{0};std::atomic<bool> stop{false};
        std::array<std::exception_ptr,13> errors{};
        std::atomic<unsigned> checkpoint_phase{0};std::array<std::array<unsigned,3>,4> completed_phase{};
        double checkpoint_ms=0;unsigned checkpoint_begin=0,checkpoint_end=0;bool checkpoint_published=false;
        std::array<std::vector<double>,4> elapsed;
        std::array<unsigned,4> ready{},unavailable{},progressed{};
        std::array<std::string,4> first_failure;
        std::vector<std::thread> threads;Joined joined{threads,stop};
        progress.Begin(0,LoadPhase::Clients);
        // 4명의 client를 먼저 시작하여 각 writer의 시작부터 종료까지 관측한다.
        for(std::size_t client=0;client<4;++client)threads.emplace_back([&,client]{
            try{progress.Begin(1+client,LoadPhase::Search);do{progress.states[1+client].begin=progress.Now();const auto start=std::chrono::steady_clock::now();const auto before=packets.load();
                const auto result=app.Search(query,"load-client-"+std::to_string(client),"scope",[](const auto&){return true;});
                ++completed_phase[client][checkpoint_phase.load()];
                elapsed[client].push_back(std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count());
                if(result.status==200)++ready[client];else if(result.status==503){++unavailable[client];if(first_failure[client].empty())first_failure[client]=result.body;}else throw std::runtime_error("load-search-status");
                progress.Progress(1+client,elapsed[client].size());
                if(packets>before)++progressed[client];std::this_thread::sleep_for(std::chrono::milliseconds(5));
            }while(!stop&&finished<8);progress.End(1+client);}catch(const std::exception& e){progress.Failure(1+client,e.what());errors[client]=std::current_exception();stop=true;}catch(...){progress.Failure(1+client,"unknown");errors[client]=std::current_exception();stop=true;}
        });
        progress.End(0);
        for(std::size_t channel=0;channel<8;++channel)threads.emplace_back([&,channel]{
            try{progress.Begin(5+channel,LoadPhase::Packets);unsigned supplied=0;for(const auto& packet:input.packets){if(stop)break;writers[channel]->Push(packet,0);++packets;progress.Progress(5+channel,++supplied);std::this_thread::sleep_for(std::chrono::milliseconds(4));}
                progress.End(5+channel);progress.Begin(5+channel,LoadPhase::WriterStop);writers[channel]->Stop();progress.End(5+channel);}
            catch(const std::exception& e){progress.Failure(5+channel,e.what());errors[4+channel]=std::current_exception();stop=true;}catch(...){progress.Failure(5+channel,"unknown");errors[4+channel]=std::current_exception();stop=true;}++finished;
        });
        if(checkpoint_overlap)threads.emplace_back([&]{
            try {
                while(!stop&&packets<160&&finished<8)std::this_thread::yield();
                if(stop||finished==8)throw std::runtime_error("checkpoint-overlap-not-reached");
                progress.Begin(13,LoadPhase::Checkpoint);
                const auto prior=OwnedManifest(root/"recording-generation.json");checkpoint_begin=packets.load();
                const auto started=std::chrono::steady_clock::now();checkpoint_phase=1;std::string detail;
                if(!runtime.catalog().Checkpoint(&detail))throw std::runtime_error("checkpoint-overlap:"+detail);
                checkpoint_ms=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-started).count();
                checkpoint_phase=2;checkpoint_end=packets.load();checkpoint_published=OwnedManifest(root/"recording-generation.json")!=prior;
                if(!checkpoint_published)throw std::runtime_error("checkpoint-overlap-no-publication");progress.Progress(13,checkpoint_end);progress.End(13);
            }catch(const std::exception& e){progress.Failure(13,e.what());errors[12]=std::current_exception();stop=true;}catch(...){progress.Failure(13,"unknown");errors[12]=std::current_exception();stop=true;}
        });
        progress.Begin(0,LoadPhase::Join);for(auto& thread:threads)thread.join();progress.End(0);
        progress.Begin(0,LoadPhase::FinalValidation);
        if(checkpoint_overlap)std::cout<<"[checkpoint-overlap] milliseconds="<<checkpoint_ms<<" startPackets="<<checkpoint_begin<<" endPackets="<<checkpoint_end<<" published="<<checkpoint_published<<'\n';
        for(const auto& failure:errors)if(failure)std::rethrow_exception(failure);
        for(std::size_t client=0;client<4;++client)std::cout<<"[runtime-client] id="<<client<<" requests="<<elapsed[client].size()<<" ready="<<ready[client]<<" unavailable="<<unavailable[client]<<" completedBeforeCheckpoint="<<completed_phase[client][0]<<" completedDuringCheckpoint="<<completed_phase[client][1]<<" completedAfterCheckpoint="<<completed_phase[client][2]<<" firstFailure="<<first_failure[client]<<" maxMs="<<(elapsed[client].empty()?0:*std::max_element(elapsed[client].begin(),elapsed[client].end()))<<std::endl;
        const auto diagnostic=app.Search(query,"after-writer-off","scope",[](const auto&){return true;});
        std::cout<<"[runtime-off] status="<<diagnostic.status<<" knownCount="<<(diagnostic.status==200?Field(Json(diagnostic.body),"knownCount"):diagnostic.body)<<std::endl;
        if(packets!=720||finished!=8)throw std::runtime_error("load-packet-progress");
        std::vector<double> samples;unsigned progressing=0,success=0,unready=0;
        for(std::size_t client=0;client<4;++client){if(!ready[client])throw std::runtime_error("load-client-no-success");
            samples.insert(samples.end(),elapsed[client].begin(),elapsed[client].end());progressing+=progressed[client];success+=ready[client];unready+=unavailable[client];}
        std::sort(samples.begin(),samples.end());const auto p95=samples.at((samples.size()*95+99)/100-1);
        std::cout<<"[runtime-latency-result] samples="<<samples.size()<<" ready="<<success<<" unavailable="<<unready<<" p95Ms="<<p95<<" maxMs="<<samples.back()<<" progressing="<<progressing<<std::endl;
        if(!progressing||p95>2000||samples.back()>5000)throw std::runtime_error("load-latency-or-progress");
        // writer off 이후에도 현재 파일과 독립 개수·시간 범위를 확인한다.
        unsigned total=0;for(const auto& channel:channels){recording::RecordingLocationCatalogSnapshot snapshot;
            if(!runtime.catalog().SnapshotLocationsV2(channel,&snapshot,&error)||snapshot.segments.size()!=3)throw std::runtime_error("load-channel-segment-count");
            for(const auto& segment:snapshot.segments){if(!reader.ResolveMedia(channel,segment.segment_id))throw std::runtime_error("load-media-health");++total;}}
        const auto final=app.Search(query,"load-final","scope",[](const auto&){return true;});
        if(total!=24||final.status!=200||Field(Json(final.body),"knownCount")!="24")throw std::runtime_error("load-final-result");
        progress.End(0);progress.Begin(0,LoadPhase::Finish);
        if(!runtime.Finish(&error))throw std::runtime_error("load-finish:"+error);progress.End(0);
        if(progress.output_failed)throw std::runtime_error("load-progress-output-failed");
        struct rusage usage{};if(getrusage(RUSAGE_SELF,&usage))throw std::runtime_error("load-rss");
        const std::uint64_t rss=static_cast<std::uint64_t>(usage.ru_maxrss)
#ifndef __APPLE__
            *1024
#endif
            ;
#ifdef __APPLE__
        vm_address_t* zones=nullptr;unsigned zone_count=0;
        if(malloc_get_all_zones(mach_task_self(),nullptr,&zones,&zone_count)!=KERN_SUCCESS)throw std::runtime_error("load-heap-read");
        std::size_t heap_used=0,heap_reserved=0;
        for(unsigned z=0;z<zone_count;++z){malloc_statistics_t stats{};malloc_zone_statistics(reinterpret_cast<malloc_zone_t*>(zones[z]),&stats);heap_used+=stats.size_in_use;heap_reserved+=stats.size_allocated;}
        std::cout<<"[runtime-heap] zones="<<zone_count<<" usedBytes="<<heap_used<<" reservedBytes="<<heap_reserved<<" catalogLogicalBytes=not-equal"<<std::endl;
        if(heap_used>512ULL*1024*1024)throw std::runtime_error("load-native-heap-exceeds-logical-budget");
#endif
        if(rss>4ULL*1024*1024*1024)throw std::runtime_error("load-rss-budget");
        std::cout<<"[runtime-load] backend=B channels=8 clients=4 observations=10000 packets="<<packets<<" files="<<total<<" requests="<<samples.size()
            <<" ready="<<success<<" unavailable="<<unready<<" p95Ms="<<p95<<" maxMs="<<samples.back()<<" progressingSearches="<<progressing<<" peakRssBytes="<<rss<<" pass=true\n";
    }catch(const std::exception& e){progress.Failure(0,e.what());std::cerr<<"[runtime-load] fail="<<e.what()<<'\n';
        if(runtime_owner){std::string cleanup;progress.Begin(0,LoadPhase::Finish);const bool closed=runtime_owner->Finish(&cleanup);
            std::cout<<"[runtime-failure-cleanup] finish="<<closed<<" error="<<cleanup.substr(0,1024)<<std::endl;if(closed)progress.End(0);else progress.Failure(0,cleanup);}
        return 1;}
    return 0;
}
