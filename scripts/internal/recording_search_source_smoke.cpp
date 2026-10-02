// 파일 용도: V420-L01/L02 원장과 검색 스냅샷 연결의 단기 통합 검사.
#include "recording/recording_search_reader.h"
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
int main(int argc,char**argv) {
    if(argc!=2)return 2;
    const std::filesystem::path root(argv[1]);
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
        auto observation=Observation();
        Check(catalog.PutObservationV2(observation,&error),"unknown-observation-put");
        Check(search.Refresh({"channel-one"},model,&model,&error)&&model->documents().size()==2&&
            !model->Find("o2:7:obs-one")->start_ns,"unknown-is-not-inferred");
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
        Check(catalog.PutObservationV2(observation,&error)&&catalog.ValidateSearchSource(batch,&error),"observation-keeps-resolution-valid");
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
    std::cout<<"[search-source] pass="<<passes<<" fail="<<failures<<" error="<<error<<'\n';return failures?1:0;
}
