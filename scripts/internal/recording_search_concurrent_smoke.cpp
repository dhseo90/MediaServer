// 파일 용도: 실제 managed writer와 검색 application의 동시 진행·종료를 단기로 검사한다.
#define main SearchConcurrentFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include <atomic>
#include <thread>
int main(int argc,char** argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);int pass=0,fail=0;
    auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    try {
        Store store(std::filesystem::weakly_canonical(argv[1])/"store");auto input=Encode(90,false,false,160,90,30,30);Shift(input,7000000000ULL);
        recording::GStreamerSegmentWriter::Options options(store.root,1000);options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);std::string error;
        if(!writer.Start("probe-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error))throw std::runtime_error(error);
        recording::RecordingReadService reader(store.catalog);ingress::RecordingApplicationService app(reader,store.catalog,true,{});
        std::unordered_map<std::string,std::string> query{{"channelIds","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200004000"}};
        std::atomic<unsigned> pushed{0};std::atomic<bool> done{false};
        std::thread recording([&]{for(const auto& packet:input.packets){writer.Push(packet,0);++pushed;std::this_thread::sleep_for(std::chrono::milliseconds(4));}writer.Stop();done=true;});
        unsigned searches=0,ready=0,unavailable=0;bool observed_progress=false;unsigned previous=0;
        try {
            while(!done){auto r=app.Search(query,"fixture","scope",[](const auto& c){return c=="probe-channel";});++searches;
                if(r.status==200)++ready;else if(r.status==503)++unavailable;else throw std::runtime_error("unexpected concurrent search status");
                const auto now=pushed.load();observed_progress|=now>previous&&previous>0;previous=now;
                std::this_thread::sleep_for(std::chrono::milliseconds(5));}
        }catch(...){recording.join();throw;}
        recording.join();
        check(pushed==90&&observed_progress&&searches>1&&ready>0,"recording packets advance while search requests execute");
        const auto final=app.Search(query,"fixture","scope",[](const auto&){return true;});
        check(final.status==200&&Field(Json(final.body),"knownCount")=="3","post-finalize search exposes three actual source seconds");
        const auto segments=store.Segments();check(segments.size()==3,"writer finalizes all three GOP segments");
        bool healthy=true;for(const auto& segment:segments)healthy&=bool(reader.ResolveMedia("probe-channel",segment.segment_id));
        check(healthy,"all finalized files remain healthy after concurrent reads");
        std::cout<<"[concurrent] searches="<<searches<<" ready="<<ready<<" transientUnavailable="<<unavailable<<" packets="<<pushed<<'\n';
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';++fail;}
    std::cout<<"[search-concurrent] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
