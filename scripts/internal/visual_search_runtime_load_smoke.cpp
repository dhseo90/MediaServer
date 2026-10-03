// 파일 용도: 100k 이력 B 저장소에서 실제 SigLIP2/8채널 녹화/4검색의 단기 혼합 부하.
#define main RuntimeLoadFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include "recording/recording_runtime_composition.h"
#include "ingress/visual_search_application_service.h"
#include <array>
#include <atomic>
#include <thread>
#include <sys/resource.h>
#ifdef __APPLE__
#include <malloc/malloc.h>
#include <mach/mach.h>
#endif
namespace {
struct Joined {
    std::vector<std::thread>& threads;std::atomic<bool>& stop;
    ~Joined(){stop=true;for(auto& thread:threads)if(thread.joinable())thread.join();}
};
}
int main(int argc,char** argv){
    if(argc!=4||std::string(argv[2])!="existing")return 2;gst_init(nullptr,nullptr);
    try {
        const auto base=std::filesystem::weakly_canonical(argv[1]);
        const auto root=base;
        recording::RecordingRuntimeStorage runtime(root);std::string error;
        if(!runtime.Open(&error))throw std::runtime_error(error);
        auto seed_input=Encode(30,false,false,160,90,30,30);Shift(seed_input,3000000000ULL);
        for(int i=0;i<8;++i){recording::GStreamerSegmentWriter seed_writer(runtime.WriterOptions(1000));
            if(!seed_writer.Start("load-channel-"+std::to_string(i),"unused",seed_input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
            for(const auto& packet:seed_input.packets)seed_writer.Push(packet,0);seed_writer.Stop();}
        auto input=Encode(90,false,false,160,90,30,30);Shift(input,7000000000ULL);
        std::vector<std::unique_ptr<recording::GStreamerSegmentWriter>> writers;
        std::vector<std::string> channels;std::string channel_query;
        for(int i=0;i<8;++i){
            const auto channel="load-channel-"+std::to_string(i);channels.push_back(channel);
            if(i)channel_query+=',';channel_query+=channel;
            auto writer=std::make_unique<recording::GStreamerSegmentWriter>(runtime.WriterOptions(1000));
            if(!writer->Start(channel,"unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
            writers.push_back(std::move(writer));
        }
        for(int i=0;i<10000;++i){recording::AnalysisObservationV2 o;o.observation_id="load-observation-"+std::to_string(i);
            o.source_id=channels[i%8];o.channel_id=o.source_id;o.analysis_namespace="load";o.track_id="track-1";
            o.class_label="person";o.confidence=.8;o.bbox={0,0,.5,.5};o.selection_reasons={"track-start"};
            if(!runtime.catalog().PutObservationV2(o,&error))throw std::runtime_error(error);}
        recording::RecordingReadService reader(runtime.catalog());
        ingress::VisualSearchApplicationService::Options options;
        options.enabled=true;options.model_directory=argv[3];options.cache_directory=(root/"visual-cache").string();options.scan_seconds=1;options.sample_seconds=1;
        ingress::VisualSearchApplicationService app(runtime.catalog(),reader,options,[&](auto* out){*out=channels;return true;});
        std::unordered_map<std::string,std::string> query{{"channelIds",channel_query},{"text","red scene"},{"limit","4"}};
        const auto authorize=[](const auto&){return true;};
        const auto wait_ready=[&]{const auto end=std::chrono::steady_clock::now()+std::chrono::seconds(15);
            while(std::chrono::steady_clock::now()<end){if(app.Status(authorize).body.find("\"state\":\"ready\"")!=std::string::npos)return;std::this_thread::sleep_for(std::chrono::milliseconds(20));}
            throw std::runtime_error("visual-load-ready-deadline");};
        wait_ready();const auto warm=app.Search(query,authorize);
        if(warm.status!=200||warm.body.find("frame:")==std::string::npos)throw std::runtime_error("visual-load-warmup");
        std::atomic<unsigned> packets{0},finished{0};std::atomic<bool> stop{false};
        std::array<std::exception_ptr,12> errors{};
        std::array<std::vector<double>,4> elapsed;
        std::array<unsigned,4> ready{},unavailable{},progressed{};
        std::array<std::string,4> first_failure;
        std::vector<std::thread> threads;Joined joined{threads,stop};
        // 4명의 client를 먼저 시작하여 각 writer의 시작부터 종료까지 관측한다.
        for(std::size_t client=0;client<4;++client)threads.emplace_back([&,client]{
            try{do{const auto start=std::chrono::steady_clock::now();const auto before=packets.load();
                const auto result=app.Search(query,authorize);
                const double latency=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();
                if(result.status==200){++ready[client];elapsed[client].push_back(latency);if(result.body.find("frame:")==std::string::npos)throw std::runtime_error("visual-empty-mixed");}else if(result.status==503){++unavailable[client];if(first_failure[client].empty())first_failure[client]=result.body;}else throw std::runtime_error("load-search-status");
                if(packets>before)++progressed[client];std::this_thread::sleep_for(std::chrono::milliseconds(5));
            }while(!stop&&finished<8);}catch(...){errors[client]=std::current_exception();stop=true;}
        });
        for(std::size_t channel=0;channel<8;++channel)threads.emplace_back([&,channel]{
            try{for(const auto& packet:input.packets){if(stop)break;writers[channel]->Push(packet,0);++packets;std::this_thread::sleep_for(std::chrono::milliseconds(4));}
                writers[channel]->Stop();}catch(...){errors[4+channel]=std::current_exception();stop=true;}++finished;
        });
        for(auto& thread:threads)thread.join();
        for(const auto& failure:errors)if(failure)std::rethrow_exception(failure);
        for(std::size_t client=0;client<4;++client)std::cout<<"[visual-runtime-client] id="<<client<<" requests="<<elapsed[client].size()<<" ready="<<ready[client]<<" unavailable="<<unavailable[client]<<" firstFailure="<<first_failure[client]<<" maxMs="<<(elapsed[client].empty()?0:*std::max_element(elapsed[client].begin(),elapsed[client].end()))<<std::endl;
        if(packets!=720||finished!=8)throw std::runtime_error("load-packet-progress");
        std::vector<double> samples;unsigned progressing=0,success=0,unready=0;
        for(std::size_t client=0;client<4;++client){if(!ready[client])throw std::runtime_error("load-client-no-success");
            samples.insert(samples.end(),elapsed[client].begin(),elapsed[client].end());progressing+=progressed[client];success+=ready[client];unready+=unavailable[client];}
        std::sort(samples.begin(),samples.end());const auto p95=samples.at((samples.size()*95+99)/100-1);
        if(!progressing||p95>2000||samples.back()>5000)throw std::runtime_error("load-latency-or-progress");
        // writer off 이후에도 현재 파일과 독립 개수·시간 범위를 확인한다.
        unsigned total=0;for(const auto& channel:channels){recording::RecordingLocationCatalogSnapshot snapshot;
            if(!runtime.catalog().SnapshotLocationsV2(channel,&snapshot,&error)||snapshot.segments.size()!=4)throw std::runtime_error("load-channel-segment-count");
            for(const auto& segment:snapshot.segments){if(!reader.ResolveMedia(channel,segment.segment_id))throw std::runtime_error("load-media-health");++total;}}
        const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(15);bool complete=false;
        while(std::chrono::steady_clock::now()<deadline){const auto status=app.Status(authorize);std::size_t count=0,pos=0;
            while((pos=status.body.find("\"indexedFrames\":4",pos))!=std::string::npos){++count;++pos;}
            if(count==8&&status.body.find("\"state\":\"ready\"")!=std::string::npos){complete=true;break;}
            std::this_thread::sleep_for(std::chrono::milliseconds(20));}
        if(total!=32||!complete)throw std::runtime_error("visual-load-final-index");
        const auto final=app.Search(query,authorize);if(final.status!=200)throw std::runtime_error("visual-load-final-search");
        app.Stop();
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
        std::cout<<"[visual-runtime-heap] zones="<<zone_count<<" usedBytes="<<heap_used<<" reservedBytes="<<heap_reserved<<" catalogLogicalBytes=not-equal"<<std::endl;
        // 이 process에는 실제 모델이 포함된다. 전체 heap을 Catalog 512MiB 논리량으로 부르지 않는다.
#endif
        if(rss>4ULL*1024*1024*1024)throw std::runtime_error("load-rss-budget");
        std::cout<<"[visual-runtime-load] backend=B channels=8 clients=4 observations=10000 seedPackets=240 seedFiles=8 packets="<<packets<<" files="<<total<<" requests="<<samples.size()
            <<" ready="<<success<<" unavailable="<<unready<<" p95Ms="<<p95<<" maxMs="<<samples.back()<<" progressingSearches="<<progressing<<" peakRssBytes="<<rss<<" pass=true\n";
    }catch(const std::exception& e){std::cerr<<"[visual-runtime-load] fail="<<e.what()<<'\n';return 1;}
    return 0;
}
