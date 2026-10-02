// 파일 용도: 기존 generation 값 fixture로 실제 원장/카탈로그를 열고 검색 원본 참조를 검증한다.
// fixture의 기존 main은 호출하지 않으며 private probe를 사용하지 않는다.
#define main SearchProjectionFixtureMain
#include "recording_catalog_generation_projection_smoke.cpp"
#undef main
#include "recording/recording_search_reader.h"
#include "recording/recording_identity_shard.h"
namespace {
int search_passed=0,search_failed=0;
void SearchCheck(bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';if(ok)++search_passed;else{++search_failed;std::cerr<<error<<'\n';}}
void InstallSearch(Fixture f,const std::filesystem::path& root) {
    f.Seal(root);RecordingIdentityShard shard;shard.store_id="store";shard.generation=2;
    shard.archives={{"evidence-1-0.jsonl",f.archive.size(),Hash(f.archive)}};
    for(const auto& first:f.chain.first_acceptances)shard.rows.push_back(first.first_row);
    std::string bytes;Need(SerializeRecordingIdentityShard(shard,&bytes,&error));Write(root/"identity-2.jsonl",bytes);
    f.snapshot.identity_head={"identity-2.jsonl",bytes.size(),Hash(bytes)};
    Need(SerializeRecordingCatalogSnapshot(f.snapshot,&bytes,&error));Write(root/"snapshot-2.jsonl",bytes);
    f.manifest.snapshot={"snapshot-2.jsonl",bytes.size(),Hash(bytes)};
    Need(SerializeRecordingGenerationManifest(f.manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);
    Write(root/"active-2.jsonl","");
    Write(root/".recording-store-format","{\"format\":\"media-server.managed-recording-store.v2\",\"storeId\":\"store\",\"manifest\":\"recording-generation.json\"}\n");
    Write(root/"recording-v2-mutations.jsonl","preserved\n");
}
AnalysisObservationV2 SearchObservation(const RecordingConsumerReferenceV1& r) {
    AnalysisObservationV2 o;o.observation_id=r.owner_id;o.source_id=r.source_id;o.channel_id=r.channel_id;
    o.analysis_namespace=r.analysis_namespace;o.track_id=r.analysis_track_id;o.pts=r.analysis_pts;
    o.locator_reason="unresolved";o.class_label="person";o.confidence=.8;o.bbox={0,0,.5,.5};
    o.selection_reasons={"track-start"};o.created_at_ms=5;return o;
}
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const auto root=std::filesystem::weakly_canonical(argv[1]);
        const auto input=InputValue();InstallSearch(Active(input),root);
        std::shared_ptr<const RecordingSearchModel> model;
        for(int phase=0;phase<3;++phase) {
            RecordingJournal journal(RecordingJournal::ManagedOptions{root,"store",{1024*1024,1024*1024,1024*1024,1024*1024,100,100}});Need(journal.Open(&error));
            RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,phase!=1);
            options.enable_v2_storage=true;options.enable_generation_writes=true;
            RecordingCatalog catalog(journal,options);Need(catalog.Open(&error));
            RecordingReadService read(catalog);RecordingSearchReader search(catalog,read);
            if(phase==0) {
                auto r=input.job.intent.reference;r.kind="observation";r.reference_id="obs-reference";r.owner_id="obs";r.request.reset();
                Need(catalog.PutReferencedObservation(SearchObservation(r),r,&error));
                auto missing=r;missing.owner_id="missing";missing.reference_id="missing-reference";
                missing.original->source_generation="absent-generation";
                Need(catalog.PutReferencedObservation(SearchObservation(missing),missing,&error));
            }
            const auto before=Read(root/"active-2.jsonl");const auto held=model;
            SearchCheck(search.Refresh({"channel"},model,&model,&error),"generation-search-refresh");
            if(!model)return 1;
            const auto* hit=model->Find("or:3:obs");const auto* missing=model->Find("or:7:missing");
            SearchCheck(model->documents().size()==3&&hit&&hit->segment_id=="segment"&&hit->media_pts==0&&
                hit->start_ns==100000000&&hit->end_ns==100000001&&hit->uncertainty_ns==1,
                "generation-original-sample-exact-utc");
            SearchCheck(missing&&!missing->start_ns&&missing->segment_id.empty()&&!missing->unavailable_reason.empty(),
                "generation-missing-original-stays-unplaced");
            SearchCheck(Read(root/"active-2.jsonl")==before,"generation-search-journal-unchanged");
            if(held)SearchCheck(model->source_instance()!=held->source_instance()&&held->documents().size()==3,
                "generation-reopen-rebuild-preserves-held-model");
        }
    }catch(const std::exception& ex){std::cerr<<ex.what()<<'\n';return 1;}
    std::cout<<"[search-generation] pass="<<search_passed<<" fail="<<search_failed<<'\n';return search_failed?1:0;
}
