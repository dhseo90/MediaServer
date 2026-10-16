// 파일 용도: V420-L01/L02 원장과 검색 스냅샷 연결의 단기 통합 검사.
#include "recording/recording_search_reader.h"
#include "recording/recording_search_snapshots.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
using namespace recording;
static int failures=0, passes=0;
static void Check(bool ok,const char* name) {std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';if(ok)++passes;else ++failures;}
static std::string Bytes(const std::filesystem::path& p){std::ifstream f(p,std::ios::binary);return {std::istreambuf_iterator<char>(f),{}};}
static AnalysisObservationV2 Observation() {
    AnalysisObservationV2 v;
    v.observation_id="obs-one"; v.source_id="channel-one"; v.channel_id="channel-one";
    v.analysis_namespace="tap-one"; v.stream_epoch_id="epoch-one";
    v.pts=1500000000; v.track_id="track-one"; v.class_label="person";
    v.confidence=.8; v.bbox={.1,.2,.3,.4}; v.selection_reasons={"track-start"};
    v.first_seen_pts=v.pts; v.last_seen_pts=v.pts; v.created_at_ms=1500;
    v.zone_ids={"zone-one"}; v.line_ids={"line-one"}; v.rule_ids={"rule-one"}; v.scenario_ids={"scenario-one"};
    return v;
}
static RecordingSegmentV1 Segment(const std::string& id) {
    RecordingSegmentV1 s;
    s.segment_id=id; s.source_id="channel-one"; s.channel_id="channel-one";
    s.stream_epoch_id="epoch-one"; s.start={1000,1000000000,1,1000000000};
    s.end={2000,2000000000,1,1000000000}; s.container="mp4"; s.video_codecs={"h264"};
    s.audio_omitted_reason="source-no-audio"; s.size_bytes=12; s.checksum_sha256=std::string(64,'a');
    s.lifecycle=RecordingLifecycle::Finalized; s.created_at_ms=1000; s.finalized_at_ms=2000;
    return s;
}
static RecordingSegmentV2 SegmentV2(const std::string& id) {
    RecordingSegmentV2 s;s.segment_id=id;s.channel_id="v2";s.source_id="source";s.store_id="store";
    s.order_request_id="order-"+id;s.media_epoch_id="epoch";s.media_start_pts=0;s.media_end_pts=20;
    s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";s.size_bytes=12;
    s.checksum_sha256=std::string(64,'a');s.created_at_ms=1;s.finalized_at_ms=2;
    s.mappings={{"media-server.recording-utc-mapping.v1","first",0,10,"server-observation",100,110,7,"observed"},
        {"media-server.recording-utc-mapping.v1","second",10,20,"estimated",105,115,9,"clock-step"}};
    return s;
}
static bool AddV2(RecordingJournal& journal,RecordingSegmentV2 s,std::string* error) {
    RecordingOrderReservationV1 order;
    if(!journal.ReserveRecordingOrder(s.store_id,s.order_request_id,s.segment_id,s.channel_id,&order,error))return false;
    s.order_sequence=order.sequence;
    RecordingMutationV1 m;m.mutation_id="final-"+s.segment_id;m.entity_id=s.segment_id;m.occurred_at_ms=3;
    m.mutation_type=RecordingMutationType::SegmentV2Finalized;
    m.payload_json="{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\""+s.segment_id+".mp4\"}";
    return journal.Append(m,error);
}
static void V2(const std::filesystem::path& root) {
    std::filesystem::create_directories(root/"media");std::string error;
    RecordingJournal journal(root/"journal.jsonl");
    Check(journal.Open(&error)&&AddV2(journal,SegmentV2("multi"),&error),"v2-journal-fixture");
    auto unknown=SegmentV2("unknown");unknown.mappings.resize(1);unknown.mappings[0].end_pts=20;
    unknown.mappings[0].provenance="unknown";unknown.mappings[0].utc_start_ns.reset();
    unknown.mappings[0].utc_end_ns.reset();unknown.mappings[0].uncertainty_ns.reset();unknown.mappings[0].reason="clock-unavailable";
    Check(AddV2(journal,unknown,&error),"v2-unknown-fixture");
    for(bool sqlite:{false,true}) {
        RecordingCatalog::Options options(root/"index.sqlite3",root/"media",sqlite);options.enable_v2_storage=true;
        RecordingCatalog catalog(journal,options);RecordingReadService reader(catalog);RecordingSearchReader search(catalog,reader);
        std::shared_ptr<const RecordingSearchModel> model;
        Check(catalog.Open(&error)&&search.Refresh({"v2"},{},&model,&error),"v2-source-open");
        if(!model){std::cerr<<error<<'\n';return;}
        if(!sqlite) {
            const auto* first=model->Find("s2:5:multi5:first");const auto* second=model->Find("s2:5:multi6:second");
            const auto* u=model->Find("s2:7:unknown5:first");
            Check(model->documents().size()==3&&first&&second&&first->start_ns==100&&first->end_ns==110&&
                second->start_ns==105&&second->end_ns==115&&second->media_pts==10&&second->uncertainty_ns==9,
                "v2-mappings-separate-clock-overlap-preserved");
            Check(u&&!u->start_ns&&!u->end_ns&&u->time_provenance=="unknown"&&u->media_pts==0,"v2-unknown-retains-media-axis");
            const auto held=model;
            Check(catalog.RequestDeletion("multi","continuous-capacity",&error)&&
                search.Refresh({"v2"},model,&model,&error)&&model->Find("s2:5:multi5:first")->unavailable_reason=="deletion-pending",
                "v2-deletion-pending-refresh");
            RecordingSearchQuery playback_query;playback_query.channels={"v2"};playback_query.start_time_ms=0;
            playback_query.end_time_ms=1;playback_query.include_unplaced=true;
            auto unchanged=held;
            Check(!search.WithPlayback(held,playback_query,&unchanged,&error)&&error=="search-source-changed"&&unchanged==held,
                "R127 deletion invalidates reusable source and preserves prior output");
            RecordingTombstoneV2 tomb;tomb.tombstone_id="gone";tomb.segment=*catalog.FindSegmentV2ById("multi");
            tomb.deletion_reason="continuous-capacity";tomb.deleted_at_ms=9;
            const bool deleted=catalog.CompleteDeletionV2(tomb,&error);
            if(!deleted)std::cerr<<"v2 deletion failure: "<<error<<'\n';
            Check(deleted&&search.Refresh({"v2"},model,&model,&error)&&
                model->documents().size()==1&&!model->Find("s2:5:multi5:first")&&held->documents().size()==3,
                "v2-tombstone-removes-all-mappings-held-model-unchanged");
        } else Check(model->documents().size()==1&&!model->Find("s2:5:multi5:first"),"v2-reopen-tombstone-no-resurrection");
        const auto before=Bytes(journal.path());
        Check(search.Refresh({"v2"},model,&model,&error)&&Bytes(journal.path())==before,"v2-read-journal-unchanged");
    }
}
static void ReaderBudget() {
    SearchDocument d;d.id="budget-document";d.channel_id="channel";d.segment_id="segment";d.start_ns=1000000;d.end_ns=2000000;
    std::vector<SearchDocument> docs{d};std::string error;std::shared_ptr<const RecordingSearchModel> probe;
    Check(RecordingSearchModel::Build(docs,"budget",1,&probe,&error),"MEM83 budget fixture admission");
    const auto charge=probe->accounted_bytes();probe.reset();
    // Test-only three-model envelope, not a product support limit.
    auto owner=std::make_shared<SearchModelResidency>(3*charge);
    SearchModelLimits limits{100000,64*1024*1024,owner};
    std::shared_ptr<const RecordingSearchModel> a,b,c;
    Check(RecordingSearchModel::Build(docs,"budget",1,&a,&error,limits)&&
        RecordingSearchModel::Build(docs,"budget",2,&b,&error,limits)&&
        RecordingSearchModel::Build(docs,"budget",3,&c,&error,limits)&&owner->used()==3*charge,"MEM83 three simultaneous model owners charged");
    auto held=a;Check(owner->used()==3*charge,"MEM83 shared readers do not double charge");
    auto rejected=c;Check(!RecordingSearchModel::Build(docs,"budget",4,&rejected,&error,limits)&&error=="search-capacity-exceeded"&&rejected==c,"MEM83 full owner budget rejects before allocation and preserves output");
    rejected.reset();a.reset();Check(owner->used()==3*charge&&held->documents().size()==1,"MEM83 caller holds old model after source replacement");
    held.reset();Check(owner->used()==2*charge&&RecordingSearchModel::Build(docs,"budget",4,&a,&error,limits),"MEM83 final reader release permits fresh work");
    {RecordingSearchSnapshots pool;RecordingSearchQuery q;q.channels={"channel"};q.start_time_ms=0;q.end_time_ms=3;RecordingSearchPage page;
     const auto now=RecordingSearchSnapshots::Clock::now();
     Check(!pool.Begin(a,q,"owner","scope",&page,&error,now)&&!page.model&&owner->used()==3*charge,
         "MEM84 full shared owner rejects snapshot work before positions allocation");
     b.reset();c.reset();Check(owner->used()==charge,"MEM84 release actual models before snapshot resume");
     Check(pool.Begin(a,q,"owner","scope",&page,&error,now),"MEM84 released budget admits snapshot and page");
     const auto page_bytes=page.memory.bytes();Check(page_bytes>0&&owner->used()>charge+page_bytes,"MEM84 snapshot matches and page separately charged");
     a.reset();std::shared_ptr<const RecordingSearchModel> expired;std::size_t pos=0;
     Check(!pool.ResolveHit(page.snapshot_id,d.id,q,"owner","scope",&expired,&pos,&error,now+std::chrono::minutes(6))&&error=="search-snapshot-expired"&&owner->used()==charge+page_bytes,"MEM84 expiry releases matches but retains caller model and page");
    }
    Check(owner->used()==0&&owner->peak()==3*charge,"MEM84 final page/model release; finite high water");
}
int main(int argc,char**argv) {
    if(argc!=2)return 2;
    ReaderBudget();
    // macOS 임시 디렉터리 별칭(/var)을 실제 경로로 정규화한다. 원본 삭제의 no-follow 검사는 유지한다.
    const auto root=std::filesystem::weakly_canonical(argv[1]);
    std::filesystem::create_directories(root/"media");
    const auto file=root/"media"/"one.mp4";
    {std::ofstream out(file,std::ios::binary);const char b[12]={0,0,0,12,'f','t','y','p','i','s','o','m'};out.write(b,12);}
    std::string error;std::shared_ptr<const RecordingSearchModel> model,held;
    RecordingJournal journal(root/"journal.jsonl");
    Check(journal.Open(&error),"journal-open");
    {
        RecordingCatalog catalog(journal,{root/"catalog.sqlite3",root/"media",true});
        RecordingReadService reader(catalog);RecordingSearchReader search(catalog,reader);
        Check(!search.Refresh({"channel-one"},{},&model,&error)&&!model,"closed-source-rejected");
        Check(catalog.Open(&error),"catalog-open");
        Check(search.Refresh({"channel-one"},{},&model,&error)&&model->documents().empty(),"empty-source-success");
        held=model;
        Check(!search.Refresh({},model,&model,&error)&&model==held,"invalid-channel-output-unchanged");
        Check(catalog.FinalizeSegment(Segment("segment-one"),file.string(),&error),"finalize");
        SearchSourceBatch unrelated;
        Check(catalog.CaptureSearchSource({"channel-one"},nullptr,&unrelated,&error),"R90 capture before unrelated finalization");
        auto other=Segment("segment-other");other.channel_id="unrelated-channel";other.source_id="unrelated-channel";
        const auto other_file=root/"media"/"other.mp4";std::filesystem::copy_file(file,other_file);
        Check(catalog.FinalizeSegment(other,other_file.string(),&error),"R90 actual unrelated finalization");
        Check(catalog.ValidateSearchSource(unrelated,&error),"R90 unrelated channel must preserve captured search");
        AnalysisObservationV1 moving;moving.observation_id="moving-v1";moving.source_id="channel-one";
        moving.channel_id="channel-one";moving.track_id="track";
        moving.class_label="person";moving.confidence=.8;moving.bbox={.1,.2,.3,.4};
        moving.frame_locator.segment_id="segment-one";moving.frame_locator.frame={1500,1500000000,1,1000000000};
        moving.created_at_ms=1500;moving.selection_reason="track-start";
        Check(catalog.PutObservation(moving,&error),"R90 V1 original channel fixture");
        std::shared_ptr<const RecordingSearchModel> moving_model;
        Check(search.Refresh({"channel-one"},{},&moving_model,&error)&&moving_model->Find("o1:9:moving-v1"),"R90 V1 original membership");
        SearchSourceBatch moving_guard;Check(catalog.CaptureSearchSource({"channel-one"},moving_model.get(),&moving_guard,&error),"R90 V1 movement guard");
        moving.channel_id="unrelated-channel";moving.source_id="unrelated-channel";moving.frame_locator.segment_id="segment-other";
        Check(catalog.PutObservation(moving,&error)&&!catalog.ValidateSearchSource(moving_guard,&error),"R90 old channel rejects moved V1 candidate");
        Check(search.Refresh({"channel-one"},moving_model,&moving_model,&error)&&!moving_model->Find("o1:9:moving-v1"),"R90 moved V1 removed by structural rebuild");
        auto observation=Observation();
        Check(catalog.PutObservationV2(observation,&error),"unknown-observation-put");
        Check(search.Refresh({"channel-one"},model,&model,&error)&&model->documents().size()==2&&
            !model->Find("o2:7:obs-one")->start_ns,"unknown-is-not-inferred");
        {std::shared_ptr<const RecordingSearchModel> only_recordings,all_again;
         Check(search.Refresh({"channel-one"},model,&only_recordings,&error,{},false)&&only_recordings->documents().size()==1&&
             only_recordings->Find("s1:11:segment-one")&&!only_recordings->Find("o2:7:obs-one"),"MEM83 recording-only source does not load unused observation rows");
         RecordingSearchQuery query;query.channels={"channel-one"};query.start_time_ms=0;query.end_time_ms=10000;query.include_unplaced=true;
         std::shared_ptr<const RecordingSearchModel> playback;
         Check(search.WithPlayback(*only_recordings,query,&playback,&error)&&playback->documents().size()==1,
             "MEM83 recording-only playback guard preserves source mode");
         const auto rebuilt_playback=playback;
         Check(search.WithPlayback(only_recordings,query,&playback,&error)&&playback==only_recordings,
             "R127 no-candidate ns recording source shares immutable model");
         const auto& original=playback->documents().front();const auto& rebuilt=rebuilt_playback->documents().front();
         Check(original.id==rebuilt.id&&original.segment_id==rebuilt.segment_id&&original.start_ns==rebuilt.start_ns&&
             original.end_ns==rebuilt.end_ns&&original.media_pts==rebuilt.media_pts&&original.media_end_pts==rebuilt.media_end_pts&&
             original.time_base_num==rebuilt.time_base_num&&original.time_base_den==rebuilt.time_base_den&&
             original.playback_segment_id.empty()&&rebuilt.playback_segment_id==original.segment_id&&
             original.playback_event_id==rebuilt.playback_event_id&&original.playback_job_id==rebuilt.playback_job_id,
             "R127 shared model preserves identity time and effective original playback");
         Check(!search.WithPlayback(only_recordings,query,&playback,&error,{0,64*1024*1024})&&
             error=="search-capacity-exceeded"&&playback==only_recordings&&
             !search.WithPlayback(only_recordings,query,&playback,&error,{100000,only_recordings->accounted_bytes()-1})&&
             error=="search-capacity-exceeded"&&playback==only_recordings,
             "R127 shared model respects caller document and byte limits without replacing output");
         auto non_ns=only_recordings->documents();non_ns.front().media_pts=1000;non_ns.front().media_end_pts=2000;
         non_ns.front().time_base_den=1000;std::shared_ptr<const RecordingSearchModel> converted;
         Check(RecordingSearchModel::Build(non_ns,only_recordings->source_instance(),only_recordings->revision(),&converted,&error,
                 {100000,64*1024*1024,only_recordings->residency()})&&
             search.WithPlayback(converted,query,&playback,&error)&&playback!=converted&&
             playback->documents().front().media_pts==1000000000&&playback->documents().front().time_base_den==1000000000,
             "R127 non-ns input retains conversion path");
         Check(search.WithPlayback(model,query,&playback,&error)&&playback!=model&&playback->documents().size()==1,
             "R127 mixed source retains recording-only projection");
         Check(search.Refresh({"channel-one"},only_recordings,&all_again,&error)&&all_again->documents().size()==2&&
             all_again->Find("o2:7:obs-one")&&model->documents().size()==2,"MEM83 query-kind switch rebuilds complete observation source and preserves old reader");}
        observation=catalog.ResolveObservationV2(observation);
        Check(observation.frame_locator&&catalog.PutObservationV2(observation,&error),"stored-locator-put");
        SearchSourceBatch batch;
        Check(catalog.CaptureSearchSource({"channel-one"},model.get(),&batch,&error)&&!batch.rebuild&&
            batch.delta.upserts.size()==1,"observation-delta-only");
        Check(search.Refresh({"channel-one"},model,&model,&error)&&
            model->Find("o2:7:obs-one")->start_ns==1500000000&&
            model->Find("o2:7:obs-one")->media_pts==1500000000,"stored-locator-utc-and-pts");
        held=model;
        const auto before=Bytes(root/"journal.jsonl");
        Check(search.Refresh({"channel-one"},model,&model,&error)&&model==held,"unchanged-model-reused");
        Check(Bytes(root/"journal.jsonl")==before,"search-does-not-write-journal");
        Check(catalog.CaptureSearchSource({"channel-one"},model.get(),&batch,&error),"capture-before-observation");
        observation.observation_id="obs-two";
        Check(catalog.PutObservationV2(observation,&error)&&!catalog.ValidateSearchSource(batch,&error),"R90 new relevant observation invalidates captured membership");
        Check(search.Refresh({"channel-one"},model,&model,&error)&&model->documents().size()==3&&held->documents().size()==2,"new-model-held-snapshot-independent");
        auto limited=model;
        Check(!search.Refresh({"channel-one"},{},&limited,&error,{1,64*1024*1024})&&limited==model,"capacity-failure-output-unchanged");
        Check(search.Refresh({"channel-two"},model,&limited,&error)&&limited->documents().empty()&&
            limited->source_instance()!=model->source_instance(),"scope-change-rebuild");
        held=model;
        bool inserted=true;
        for(int i=0;i<1025&&inserted;++i){observation.observation_id="history-"+std::to_string(i);inserted=catalog.PutObservationV2(observation,&error);}
        Check(inserted&&catalog.CaptureSearchSource({"channel-one"},held.get(),&batch,&error)&&batch.rebuild&&
            batch.delta.upserts.size()==1028,"history-gap-rebuild");
        Check(catalog.MarkSegmentCorrupt("segment-one","container-invalid",&error)&&
            !catalog.ValidateSearchSource(batch,&error),"structural-change-invalidates-captured-batch");
        Check(search.Refresh({"channel-one"},model,&model,&error)&&
            model->Find("s1:11:segment-one")->unavailable_reason=="corrupt"&&
            held->Find("s1:11:segment-one")->unavailable_reason=="media-not-checked","corruption-new-state-old-snapshot-preserved");
    }
    const auto before=Bytes(root/"journal.jsonl");
    for(bool sqlite:{false,true}) {
        RecordingCatalog catalog(journal,{root/"catalog.sqlite3",root/"media",sqlite});
        RecordingReadService reader(catalog);RecordingSearchReader search(catalog,reader);
        held=model;
        Check(catalog.Open(&error)&&search.Refresh({"channel-one"},model,&model,&error)&&
            model->source_instance()!=held->source_instance()&&model->documents().size()==1028&&
            model->Find("s1:11:segment-one")->unavailable_reason=="corrupt",sqlite?"sqlite-reopen-rebuild":"journal-reopen-rebuild");
    }
    Check(Bytes(root/"journal.jsonl")==before,"rebuild-does-not-write-journal");
    V2(root/"v2");
    std::cout<<"[search-source] pass="<<passes<<" fail="<<failures<<" error="<<error<<'\n';return failures?1:0;
}
