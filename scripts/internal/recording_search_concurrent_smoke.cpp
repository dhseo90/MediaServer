// 파일 용도: 실제 managed writer와 검색 application의 동시 진행·종료를 단기로 검사한다.
#define main SearchConcurrentFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include <atomic>
#include <thread>
#include <array>
int main(int argc,char** argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);int pass=0,fail=0;
    auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    try {
        Store store(std::filesystem::weakly_canonical(argv[1])/"store");auto input=Encode(90,false,false,160,90,30,30);Shift(input,7000000000ULL);
        recording::GStreamerSegmentWriter::Options options(store.root,1000);options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);std::string error;
        if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
        for(int i=0;i<10000;++i){recording::AnalysisObservationV2 o;o.observation_id="concurrent-"+std::to_string(i);
            o.source_id="probe-channel";o.channel_id="probe-channel";o.analysis_namespace="concurrent";o.track_id="track-1";
            o.class_label="person";o.confidence=.8;o.bbox={0,0,.5,.5};o.selection_reasons={"track-start"};
            if(!store.catalog.PutObservationV2(o,&error))throw std::runtime_error(error);}
        recording::RecordingReadService reader(store.catalog);ingress::RecordingApplicationService app(reader,store.catalog,true,{});
        std::unordered_map<std::string,std::string> query{{"channelIds","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200004000"}};
        check(app.Search(query,"warmup","scope",[](const auto&){return true;}).status==200,"R04 source warmup before four-client measurement");
        std::atomic<unsigned> pushed{0};std::atomic<bool> done{false};
        std::thread recording([&]{for(const auto& packet:input.packets){writer.Push(packet,0);++pushed;std::this_thread::sleep_for(std::chrono::milliseconds(4));}writer.Stop();done=true;});
        std::array<std::vector<double>,3> competing_times;
        std::array<unsigned,3> competing_ready{},competing_unavailable{},competing_invalid{};
        std::vector<std::thread> competing;
        for(std::size_t client=0;client<3;++client)competing.emplace_back([&,client]{
            do {const auto start=std::chrono::steady_clock::now();
                const auto response=app.Search(query,"fixture-other-"+std::to_string(client),"scope",[](const auto&){return true;});
                competing_times[client].push_back(std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count());
                if(response.status==200)++competing_ready[client];else if(response.status==503)++competing_unavailable[client];else ++competing_invalid[client];
                std::this_thread::sleep_for(std::chrono::milliseconds(5));
            }while(!done);
        });
        unsigned searches=0,ready=0,unavailable=0;double max_search_ms=0;unsigned progressed_during_search=0;bool observed_progress=false;unsigned previous=0;
        std::vector<double> measured;
        try {
            while(!done){const auto started=std::chrono::steady_clock::now();const auto before=pushed.load();auto r=app.Search(query,"fixture","scope",[](const auto& c){return c=="probe-channel";});++searches;
                const auto elapsed=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-started).count();
                measured.push_back(elapsed);max_search_ms=std::max(max_search_ms,elapsed);
                if(pushed.load()>before)++progressed_during_search;
                if(r.status==200)++ready;else if(r.status==503)++unavailable;else throw std::runtime_error("unexpected concurrent search status");
                const auto now=pushed.load();observed_progress|=now>previous&&previous>0;previous=now;
                std::this_thread::sleep_for(std::chrono::milliseconds(5));}
        }catch(...){recording.join();for(auto& client:competing)client.join();throw;}
        recording.join();for(auto& client:competing)client.join();
        bool all_clients=true;
        for(std::size_t client=0;client<3;++client){
            all_clients&=competing_ready[client]>0&&competing_invalid[client]==0;
            std::cout<<"[client] index="<<client+1<<" requests="<<competing_times[client].size()<<" ready="<<competing_ready[client]<<" unavailable="<<competing_unavailable[client]<<'\n';
            measured.insert(measured.end(),competing_times[client].begin(),competing_times[client].end());
        }
        check(all_clients,"R04 all four clients finish and observe ready results under existing application serialization");
        std::sort(measured.begin(),measured.end());
        const auto p95=measured.at((measured.size()*95+99)/100-1);
        check(p95<=2000&&measured.back()<=5000,"R04 p95 <= 2s and every response <= 5s; transient failures included in latency but not success");
        check(progressed_during_search>0,"writer packet advances inside measured search interval");
        check(pushed==90&&observed_progress&&searches>1&&ready>0,"recording packets advance while search requests execute");
        const auto final=app.Search(query,"fixture","scope",[](const auto&){return true;});
        check(final.status==200&&Field(Json(final.body),"knownCount")=="3","post-finalize search exposes three actual source seconds");
        const auto segments=store.Segments();check(segments.size()==3,"writer finalizes all three GOP segments");
        bool healthy=true;for(const auto& segment:segments)healthy&=bool(reader.ResolveMedia("probe-channel",segment.segment_id));
        check(healthy,"all finalized files remain healthy after concurrent reads");
        std::cout<<"[concurrent] clients=4 measured="<<measured.size()<<" p95Ms="<<p95<<" allMaxMs="<<measured.back()<<" searches="<<searches<<" ready="<<ready<<" transientUnavailable="<<unavailable<<" observations=10000 maxSearchMs="<<max_search_ms<<" progressingSearches="<<progressed_during_search<<" packets="<<pushed<<'\n';
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';++fail;}
    std::cout<<"[search-concurrent] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
