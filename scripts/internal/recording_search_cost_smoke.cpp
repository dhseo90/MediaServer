// 파일 용도: 실제 application의 규모별 비용·독립 결과·snapshot 수명 단기 측정.
#define main SearchCostFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include "recording/recording_search_reader.h"
#include <chrono>
using Clock=std::chrono::steady_clock;
static double Ms(Clock::time_point t){return std::chrono::duration<double,std::milli>(Clock::now()-t).count();}
int main(int argc,char** argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);
    try {
        for(int count:{1,1000,10000}){
            const auto prep=Clock::now();Store store(std::filesystem::weakly_canonical(argv[1])/std::to_string(count));
            const auto intent=PrepareMedia(store,true);recording::DerivedJobService jobs(store.catalog,store.journal,{store.root,30000,{}});
            if(!jobs.Run(intent.job_id).complete)throw std::runtime_error("cost-job");
            std::string error;std::vector<std::string> expected;
            auto put=[&](int i){auto r=intent.reference;r.kind="observation";r.owner_id="cost-"+std::to_string(i);r.reference_id="ref-"+r.owner_id;r.request.reset();r.analysis_track_id="track-7";
                recording::AnalysisObservationV2 o;o.observation_id=r.owner_id;o.source_id=r.source_id;o.channel_id=r.channel_id;
                o.analysis_namespace=r.analysis_namespace;o.track_id=r.analysis_track_id;o.pts=r.analysis_pts;o.first_seen_pts=o.pts;o.last_seen_pts=o.pts;o.confidence=.8;o.bbox={0,0,.5,.5};
                o.class_label=i%100==0?"person":"car";o.selection_reasons={"track-start"};o.created_at_ms=5;o.event_ids={"cost-event"};
                recording::AnalysisObservationV2 parsed;
                if(!recording::ParseAnalysisObservationV2(recording::SerializeAnalysisObservationV2(o),&parsed,&error)||!recording::ValidateRecordingConsumerReferenceV1(r,&error))throw std::runtime_error("cost-fixture-contract:"+error);
                if(!store.catalog.PutReferencedObservation(o,r,&error))throw std::runtime_error(error);
                if(i%100==0)expected.push_back("or:"+OpaqueKey(o.observation_id));};
            for(int i=0;i<count;++i)put(i);
            const auto events=store.root/"events.jsonl";{std::ofstream out(events);out<<"{\"schema\":\"media-server.va.event-record.v1\",\"eventId\":\"cost-event\",\"channelId\":\"probe-channel\",\"trackId\":7,\"eventType\":\"Intrusion\",\"scenarioName\":\"Arrival\",\"startTime\":1000,\"updateTime\":1000,\"endTime\":2000}\n";}
            setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED","true",1);setenv("MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH",events.c_str(),1);
            recording::RecordingReadService reader(store.catalog);ingress::RecordingApplicationService app(reader,store.catalog,true,{});
            using Query=std::unordered_map<std::string,std::string>;
            Query query{{"channelIds","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200003000"},{"object","person"},{"limit","1"}};
            if(std::getenv("V420_COST_BEHAVIOUR"))query["behaviour"]="scenario:Arrival";
            std::cout<<"[cost-filter] object=person limit=1 behaviour="<<(query.count("behaviour")?"scenario:Arrival":"none")<<'\n';
            std::cout<<"[cost-prep] observations="<<count<<" ms="<<Ms(prep)<<" actualMp4Files="<<(store.Segments().size()+2)<<" eventFacts=1\n";
            auto request=[&](const char* phase,const Query& q,const std::vector<std::string>& ids,std::size_t offset=0){
                auto sorted=ids;std::sort(sorted.begin(),sorted.end());const auto start=Clock::now();
                const auto response=app.Search(q,"fixture","scope",[](const auto& c){return c=="probe-channel";});const double elapsed=Ms(start);
                if(response.status!=200)throw std::runtime_error(response.body);auto body=Json(response.body);auto items=Objects(body,"items");
                if(Field(body,"knownCount")!=std::to_string(ids.size())||items.size()!=1||Field(items[0],"id")!=sorted.at(offset)||Field(items[0],"selectionReason")!="event-priority")throw std::runtime_error("independent-result-mismatch");
                std::cout<<"[cost] observations="<<count<<" phase="<<phase<<" ms="<<elapsed<<" expectedTotal="<<ids.size()<<" returned="<<items.size()<<" expectedId="<<sorted[offset]<<" actualId="<<Field(items[0],"id")<<" equality=true\n";return body;};
            auto first=request("first",query,expected);request("unchanged",query,expected);
            auto cursor=Field(first,"nextCursor");if(cursor!="null"){auto next=query;next["cursor"]=cursor;request("cursor",next,expected,1);}
            else std::cout<<"[cost] observations="<<count<<" phase=cursor not-applicable=single-hit\n";
            recording::RecordingSearchReader search(store.catalog,reader);std::shared_ptr<const recording::RecordingSearchModel> model;
            if(!search.Refresh({"probe-channel"},{},&model,&error))throw std::runtime_error(error);
            recording::RecordingSearchQuery q;q.channels={"probe-channel"};q.start_time_ms=1789200000000;q.end_time_ms=1789200003000;
            std::vector<recording::SearchPlaybackCandidate> candidates;if(!search.PlaybackCandidates(*model,q,&candidates,&error))throw std::runtime_error(error);
            auto checkMode=[&](const char* phase){recording::SearchSourceBatch batch;if(!store.catalog.CaptureSearchSource(q.channels,model.get(),&batch,&error))throw std::runtime_error(error);
                std::cout<<"[cost-source] phase="<<phase<<" rebuild="<<batch.rebuild<<" upserts="<<batch.delta.upserts.size()<<" modelRows="<<model->documents().size()<<" logicalBytes="<<model->accounted_bytes()<<" playbackCandidates="<<candidates.size()<<" queryCandidates="<<expected.size()<<'\n';};
            checkMode("unchanged");put(count*100);checkMode("append");request("append",query,expected);
            // 새 실제 파일 확정으로 resolution revision을 무효화한다. 같은 UTC의 다른 원본이다.
            CloneSource(store,intent.sources.front().segment,"cost-new-original",false);checkMode("finalize");request("finalize",query,expected);

        }
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}
    std::cout<<"[search-cost] pass\n";return 0;
}
