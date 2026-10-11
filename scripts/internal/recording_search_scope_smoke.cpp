// 파일 용도: R90 실제 application capture를 latch로 멈춰 무관/관련 mutation과 실패 수집을 대조한다.
#define main SearchScopeFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include "recording/recording_search_diagnostic.h"
#include <future>
#include <thread>
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    gst_init(nullptr,nullptr);int pass=0,fail=0;
    const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<std::endl;ok?++pass:++fail;};
    try {
        Store store(std::filesystem::weakly_canonical(argv[1])/"store");PrepareMedia(store,true);
        recording::RecordingReadService reader(store.catalog);ingress::RecordingApplicationService app(reader,store.catalog,true,{});
        using Query=std::unordered_map<std::string,std::string>;
        const Query query{{"channelIds","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200003000"},{"object","person"},{"includeUnplaced","true"}};
        auto auth=[](const std::string& c){return c=="probe-channel";};
        std::string error;
        auto observation=[](const std::string& id){recording::AnalysisObservationV2 o;o.observation_id=id;o.source_id="probe-channel";o.channel_id="probe-channel";o.analysis_namespace="scope";o.track_id="track";o.class_label="person";o.confidence=.8;o.bbox={0,0,.5,.5};o.selection_reasons={"track-start"};return o;};
        check(store.catalog.PutObservationV2(observation("selected"),&error),"selected observation fixture");
        const auto before=app.Search(query,"owner","scope",auth);check(before.status==200,"baseline actual search");
        auto input=Encode(30,false,false);Shift(input,7000000000ULL);
        recording::GStreamerSegmentWriter::Options options(store.root,1000);options.managed_journal=&store.journal;options.managed_catalog=&store.catalog;options.managed_store_id="probe-store";
        recording::GStreamerSegmentWriter writer(options);
        check(writer.Start("other-channel","unused",input.descriptor,[](auto,auto,auto*){return false;},&error),"unrelated writer start");
        std::promise<void> captured,released;auto proceed=released.get_future();unsigned captures=0;
        ingress::ApplicationServiceResult response;
        std::exception_ptr child_error;
        std::thread thread([&]{try {recording::search_after_capture_test=[&]{if(++captures==1){captured.set_value();proceed.wait();}};response=app.Search(query,"owner","scope",auth);recording::search_after_capture_test={};}catch(...){child_error=std::current_exception();}});
        bool changed=false;
        try {
            if(captured.get_future().wait_for(std::chrono::seconds(10))!=std::future_status::ready)throw std::runtime_error("capture latch deadline");
            for(const auto& packet:input.packets)writer.Push(packet,0);
            writer.Stop();
            const auto rows=store.Segments();
            changed=std::any_of(rows.begin(),rows.end(),[](const auto& s){return s.channel_id=="other-channel";});
        } catch(...) {released.set_value();thread.join();throw;}
        released.set_value();thread.join();if(child_error)std::rethrow_exception(child_error);
        check(changed&&response.status==200&&captures==1,"unrelated real writer finalization preserves one-attempt selected search");
        check(Field(Json(response.body),"unplacedCount")==Field(Json(before.body),"unplacedCount"),"selected membership unchanged independently");
        unsigned deletion_captures=0;
        recording::search_after_capture_test=[&]{
            ++deletion_captures;
            for(const auto& segment:store.Segments())if(segment.channel_id=="other-channel") {
                const auto location=store.catalog.FindSegmentMediaLocation(segment.segment_id);
                if(!location||!store.catalog.RequestDeletion(segment.segment_id,"continuous-capacity",&error))throw std::runtime_error("unrelated deletion prepare");
                std::filesystem::remove(location->first/location->second);
                recording::RecordingTombstoneV2 tomb;tomb.tombstone_id="scope-gone-"+segment.segment_id;tomb.segment=segment;tomb.deletion_reason="continuous-capacity";tomb.deleted_at_ms=1789200010000LL;
                if(!store.catalog.CompleteDeletionV2(tomb,&error))throw std::runtime_error("unrelated deletion complete");
            }
        };
        const auto after_delete=app.Search(query,"owner","scope",auth);recording::search_after_capture_test={};
        check(after_delete.status==200&&deletion_captures==1&&Field(Json(after_delete.body),"unplacedCount")==Field(Json(before.body),"unplacedCount"),"unrelated actual deletion retains selected membership without retry");
        // Every attempt gets a new relevant candidate. Exactly the existing three attempts, no retry widening.
        unsigned relevant=0;recording::search_after_capture_test=[&]{if(!store.catalog.PutObservationV2(observation("relevant-"+std::to_string(++relevant)),&error))throw std::runtime_error("fixture mutation failed");};
        const auto rejected=app.Search(query,"owner","scope",auth);recording::search_after_capture_test={};
        check(relevant==3&&rejected.status==503&&rejected.body=="{\"error\":\"recording-search-unavailable\"}","related candidate additions exhaust exactly three attempts fail closed");
        const auto refreshed=app.Search(query,"owner","scope",auth);
        check(refreshed.status==200&&std::stoull(Field(Json(refreshed.body),"unplacedCount"))==std::stoull(Field(Json(before.body),"unplacedCount"))+3,"fresh search includes every related addition");
        bool authorized=true;recording::search_after_capture_test=[&]{authorized=false;};
        check(app.Search(query,"owner","scope",[&](const auto&){return authorized;}).status==403,"authority revoked during preparation not published");recording::search_after_capture_test={};
        check(app.Search(query,"owner","scope",auth).status==200,"failure path releases request owners and resumes");
    }catch(const std::exception& e){recording::search_after_capture_test={};std::cerr<<e.what()<<'\n';++fail;}
    std::cout<<"[search-scope] pass="<<pass<<" fail="<<fail<<std::endl;return fail?1:0;
}
