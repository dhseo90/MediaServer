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
        // R166: 기존 capture hook으로 실제 application의 범위 교대 재구축을 센다.
        // 별도 캐시/계측 모형을 테스트 oracle로 사용하지 않는다.
        const auto model_category=unsigned(recording::SearchModelResidency::Category::Model);
        const auto model_bytes_before=store.catalog.SearchResidency()->DiagnosticSnapshot().bytes[model_category];
        const auto currents=[] {
            auto& state=recording::memory_diagnostic::Data();std::lock_guard lock(state.mutex);
            std::size_t count=0;for(const auto& model:state.models)if(model.id&&model.current)++count;return count;
        };
        {
            ingress::RecordingApplicationService scoped(reader,store.catalog,true,{});
            std::vector<bool> rebuilds;
            recording::search_after_capture_test=[&]{
                const auto* d=recording::SearchDiagnostic::active;
                if(!d||!d->attempts[d->attempt].authority)throw std::runtime_error("scope capture authority");
                rebuilds.push_back(d->attempts[d->attempt].rebuild);
            };
            const auto invoke=[&](const Query& q){return scoped.Search(q,"owner","scope",[](const auto&){return true;});};
            Query other=query;other["channelIds"]="other-channel";other.erase("object");
            const auto a=invoke(query),b=invoke(other),again=invoke(query);
            check(a.status==200&&b.status==200&&again.status==200&&
                Field(Json(a.body),"items")==Field(Json(again.body),"items"),"R166 A-B-A identical membership and public fields");
            std::cout<<"[scope-rebuilds]";for(bool value:rebuilds)std::cout<<' '<<value;std::cout<<std::endl;
            check(rebuilds==std::vector<bool>({true,true,false}),"R166 A-B-A rebuilds only first two scopes");
            if(recording::memory_diagnostic::Enabled())check(currents()==2,"R166 both retained source models are diagnostic current");
            rebuilds.clear();
            auto normalized=query;normalized["channelIds"]="probe-channel,probe-channel";
            check(invoke(normalized).status==200&&rebuilds==std::vector<bool>({false}),"R166 normalized same scope reuses after fresh capture");
            rebuilds.clear();
            auto recordings=query;recordings.erase("object");recordings["limit"]="1";
            const auto saved=invoke(recordings);const auto saved_json=Json(saved.body);
            check(saved.status==200&&rebuilds==std::vector<bool>({true}),"R166 observation inclusion is a distinct scope");
            rebuilds.clear();
            check(invoke(query).status==200&&rebuilds==std::vector<bool>({false}),"R166 most recent observation scope survives third key eviction");
            rebuilds.clear();
            check(invoke(other).status==200&&rebuilds==std::vector<bool>({true}),"R166 least recent scope evicted at two entries");
            if(recording::memory_diagnostic::Enabled())check(currents()==2,"R166 eviction retires only the displaced source");
            rebuilds.clear();
            recordings["cursor"]=Field(saved_json,"nextCursor");
            check(recordings["cursor"]!="null"&&invoke(recordings).status==200&&rebuilds.empty(),"R166 evicted source snapshot cursor remains usable without preparation");
            check(scoped.Search(query,"owner","scope",[](const auto&){return false;}).status==403&&rebuilds.empty(),"R166 warm scope still requires authorization before capture");
            const auto owner=store.catalog.SearchResidency();
            auto full=owner->ReserveOwned(owner->limit()-owner->used());
            auto third=query;third["channelIds"]="capacity-channel";
            check(full&&invoke(third).status==503&&rebuilds.empty(),"R166 new scope refuses saturated shared admission without completed capture");
            full.reset();rebuilds.clear();
            check(invoke(other).status==200&&rebuilds==std::vector<bool>({false}),"R166 admission failure preserves most recent scope and permits recovery");
            recording::search_after_capture_test={};
        }
        if(recording::memory_diagnostic::Enabled())check(currents()==0&&
            store.catalog.SearchResidency()->DiagnosticSnapshot().bytes[model_category]==model_bytes_before,
            "R166 service destruction returns model and key ownership");
        if(fail)return 1; // 예상 RED 이후 기존 영향 회귀를 실행하지 않는다.
        const auto before=app.Search(query,"owner","scope",auth);check(before.status==200,"baseline actual search");
        Query paging=query;paging.erase("object");paging["limit"]="1";
        const auto page=app.Search(paging,"page-owner","page-scope",auth);
        const auto saved_cursor=Field(Json(page.body),"nextCursor");
        check(page.status==200&&!saved_cursor.empty()&&saved_cursor!="null","R127 prior immutable snapshot has a next page");
        paging["cursor"]=saved_cursor;
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
            // Long source preparation is held by the other thread. A prior cursor
            // must finish before that latch is released; release before join on failure.
            auto cursor_request=std::async(std::launch::async,[&]{return app.Search(paging,"page-owner","page-scope",auth);});
            const bool concurrent=cursor_request.wait_for(std::chrono::seconds(2))==std::future_status::ready;
            if(!concurrent){released.set_value();thread.join();(void)cursor_request.get();throw std::runtime_error("R127 cursor blocked on source preparation");}
            check(cursor_request.get().status==200,"R127 prior cursor progresses while a new preparation is held");
            check(app.Search(paging,"other-owner","page-scope",auth).status==403,
                "R127 independent cursor principal binding remains enforced during preparation");
            for(const auto& packet:input.packets)writer.Push(packet,0);
            writer.Stop();
            const auto rows=store.Segments();
            changed=std::any_of(rows.begin(),rows.end(),[](const auto& s){return s.channel_id=="other-channel";});
        } catch(...) {if(thread.joinable()){released.set_value();thread.join();}throw;}
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
        // R131: only a complete pre-Build rejected batch may be consumed by the
        // same request. Real finalized media arrives between capture and validate.
        recording::RecordingSearchReader source_reader(store.catalog,reader);
        recording::SearchSourceBatch retry;
        std::shared_ptr<const recording::RecordingSearchModel> retried,cold;
        const auto original=store.Segments().front();
        unsigned retry_calls=0;
        recording::search_after_capture_test=[&]{if(++retry_calls==1)CloneSource(store,original,"r131-new",false);};
        check(!source_reader.Refresh({"probe-channel"},{},&retried,&error,{},false,&retry)&&
            error=="search-source-changed"&&!retried&&retry.memory.bytes()>0,
            "R131 real finalization rejects before Build and retains one private charged batch");
        recording::search_after_capture_test={};
        check(source_reader.Refresh({"probe-channel"},{},&retried,&error,{},false,&retry)&&retry.memory.bytes()==0,
            "R131 next bounded attempt consumes prior batch and releases retry owner");
        check(source_reader.Refresh({"probe-channel"},{},&cold,&error,{},false),"R131 independent cold source comparison");
        const auto same=[](const auto& a,const auto& b){
            if(!a||!b||a->documents().size()!=b->documents().size())return false;
            for(std::size_t i=0;i<a->documents().size();++i){const auto& x=a->documents()[i];const auto& y=b->documents()[i];
                if(std::tie(x.id,x.channel_id,x.segment_id,x.source_id,x.store_id,x.media_epoch_id,x.stream_epoch_id,x.start_ns,x.end_ns,x.time_provenance,x.uncertainty_ns,x.media_pts,x.media_end_pts,x.time_base_num,x.time_base_den,x.unavailable_reason)!=
                   std::tie(y.id,y.channel_id,y.segment_id,y.source_id,y.store_id,y.media_epoch_id,y.stream_epoch_id,y.start_ns,y.end_ns,y.time_provenance,y.uncertainty_ns,y.media_pts,y.media_end_pts,y.time_base_num,y.time_base_den,y.unavailable_reason))return false;
            }return true;
        };
        check(same(retried,cold)&&std::any_of(retried->documents().begin(),retried->documents().end(),[](const auto& d){return d.segment_id=="r131-new";}),
            "R131 reused and fresh complete source fields agree and include actual new segment");
        const auto held_retry=retried;
        recording::search_after_capture_test=[&]{if(!store.catalog.MarkSegmentCorrupt("r131-new","container-invalid",&error))throw std::runtime_error(error);};
        check(!source_reader.Refresh({"probe-channel"},{},&retried,&error,{},false,&retry)&&retried==held_retry,
            "R131 separate lifecycle mutation rejects while previous model remains immutable");
        recording::search_after_capture_test={};
        check(source_reader.Refresh({"probe-channel"},{},&retried,&error,{},false,&retry)&&
            std::any_of(retried->documents().begin(),retried->documents().end(),[](const auto& d){return d.segment_id=="r131-new"&&d.unavailable_reason=="corrupt";})&&
            std::none_of(held_retry->documents().begin(),held_retry->documents().end(),[](const auto& d){return d.segment_id=="r131-new"&&d.unavailable_reason=="corrupt";}),
            "R131 raw-equal current lifecycle is not replaced by stale retry state");
        recording::search_after_capture_test=[&]{if(!store.catalog.PutObservationV2(observation("retry-boundary"),&error))throw std::runtime_error(error);};
        check(!source_reader.Refresh({"probe-channel"},{},&retried,&error,{},false,&retry),"R131 retry fixture for changed limits");
        recording::search_after_capture_test={};const auto before_capacity=retried;
        check(!source_reader.Refresh({"probe-channel"},{},&retried,&error,{1,64*1024*1024},false,&retry)&&
            error=="search-capacity-exceeded"&&retried==before_capacity&&retry.memory.bytes()==0,
            "R131 capacity failure clears consumed retry without changing prior output");
        recording::search_after_capture_test=[&]{if(!store.catalog.PutObservationV2(observation("retry-range"),&error))throw std::runtime_error(error);};
        check(!source_reader.Refresh({"probe-channel"},{},&retried,&error,{},false,&retry)&&retry.memory.bytes()>0,
            "R131 nonempty retry before changing source range");
        recording::search_after_capture_test={};
        check(source_reader.Refresh({"other-empty"},{},&retried,&error,{},false,&retry)&&retried->documents().empty(),
            "R131 different source range never imports prior segment documents");
        check(source_reader.Refresh({"probe-channel"},{},&cold,&error,{},false),"R131 current exact document bound");
        const recording::SearchModelLimits exact(cold->documents().size(),64*1024*1024);
        recording::search_after_capture_test=[&]{CloneSource(store,original,"zz-r131-overflow",false);};
        check(!source_reader.Refresh({"probe-channel"},{},&retried,&error,exact,false,&retry)&&error=="search-source-changed"&&retry.memory.bytes()>0,
            "R131 real added segment invalidates exact-count captured source");
        recording::search_after_capture_test={};const auto before_partial=retried;
        check(!source_reader.Refresh({"probe-channel"},{},&retried,&error,exact,false,&retry)&&error=="search-capacity-exceeded"&&
            retry.memory.bytes()==0&&retried==before_partial,
            "R131 new candidate over exact bound clears partially consumed retry and preserves output");
        bool authorized=true;recording::search_after_capture_test=[&]{authorized=false;};
        check(app.Search(query,"owner","scope",[&](const auto&){return authorized;}).status==403,"authority revoked during preparation not published");recording::search_after_capture_test={};
        check(app.Search(query,"owner","scope",auth).status==200,"failure path releases request owners and resumes");
    }catch(const std::exception& e){recording::search_after_capture_test={};std::cerr<<e.what()<<'\n';++fail;}
    std::cout<<"[search-scope] pass="<<pass<<" fail="<<fail<<std::endl;return fail?1:0;
}
