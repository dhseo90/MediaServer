// 파일 용도: 기존 실제 media fixture의 준비 함수만 재사용하여 검색 우선 후보를 검사한다.
#define main SearchTimelineFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include "recording/recording_search_reader.h"
#include <tuple>
#include "recording/recording_runtime_composition.h"

auto CandidateKey(const recording::SearchPlaybackCandidate& c){return std::make_tuple(
        c.original.source_id,c.original.store_id,c.original.media_epoch_id,c.original.segment_id,
        c.original.time_base_num,c.original.time_base_den,c.original.start_pts,c.original.end_pts,
        c.event_id,c.output_segment_id,c.playable,c.provenance_verified,c.job_id);}
// 삭제·미배치 행을 포함한 기존 전체 타임라인을 독립 기대값으로 사용한다.
template<class S> bool SameEventCandidates(S& store,recording::RecordingSearchReader& search,
    const recording::RecordingSearchModel& model,const recording::RecordingSearchQuery& q) {
    recording::RecordingReadService read(store.catalog);
    ingress::RecordingApplicationService app(read,store.catalog,true,{});
    const std::unordered_map<std::string,std::string> query{{"channelId",q.channels.front()},
        {"startTimeMs",std::to_string(q.start_time_ms)},{"endTimeMs",std::to_string(q.end_time_ms)}};
    const auto before=app.Timeline(query,[](const auto&){return true;});
    std::string error;recording::RecordingTimelineResult full;
    if(!read.QuerySearchTimeline(q.channels.front(),q.start_time_ms,q.end_time_ms,&full,&error))throw std::runtime_error(error);

    std::vector<decltype(CandidateKey(recording::SearchPlaybackCandidate{}))> expected,actual;
    for(const auto& row:full.items)if(row.kind=="event"&&row.playable&&row.job_state=="complete"&&!row.event_id.empty())
        for(const auto& c:row.coverage)expected.push_back(CandidateKey({{c.source_id,c.store_id,c.epoch_id,c.segment_id,
            1,1000000000,c.start_ns,c.end_ns},row.event_id,row.segment_id,true,true,row.job_id}));
    std::vector<recording::SearchPlaybackCandidate> candidates;
    if(!search.PlaybackCandidates(model,q,&candidates,&error))throw std::runtime_error(error);
    for(const auto& c:candidates)actual.push_back(CandidateKey(c));
    std::sort(expected.begin(),expected.end());std::sort(actual.begin(),actual.end());
    const auto after=app.Timeline(query,[](const auto&){return true;});
    return expected==actual&&before.status==200&&after.status==200&&before.body==after.body;
}
template<class S> void DeleteFixtureSegment(S& store,const recording::RecordingSegmentV2& segment) {
    const auto location=store.catalog.FindSegmentMediaLocation(segment.segment_id);
    recording::RecordingTombstoneV2 tomb;tomb.tombstone_id="search-deleted-"+segment.segment_id;
    tomb.segment=segment;tomb.deletion_reason=segment.retention_class==recording::RecordingRetentionClass::Event?"event-capacity":"continuous-capacity";tomb.deleted_at_ms=20;std::string error;
    if(!location||!store.catalog.RequestDeletion(segment.segment_id,tomb.deletion_reason,&error)||
       !std::filesystem::remove(location->first/location->second)||!store.catalog.CompleteDeletionV2(tomb,&error))throw std::runtime_error(error);
}

int main(int argc,char** argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);
    int pass=0,fail=0;const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    try {
        Store store(std::filesystem::weakly_canonical(argv[1])/"store");
        const auto intent=PrepareMedia(store,true);std::string error;
        recording::RecordingReadService read(store.catalog);recording::RecordingSearchReader search(store.catalog,read);
        recording::RecordingSearchQuery q;q.channels={"probe-channel"};q.start_time_ms=1789200000000LL;q.end_time_ms=1789200003000LL;
        std::shared_ptr<const recording::RecordingSearchModel> model;
        if(!search.Refresh(q.channels,{},&model,&error))throw std::runtime_error(error);
        std::vector<recording::SearchPlaybackCandidate> candidates;
        check(search.PlaybackCandidates(*model,q,&candidates,&error)&&candidates.empty(),"intent cannot replace source");
        check(SameEventCandidates(store,search,*model,q),"intent matches full timeline and public JSON");
        recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});
        const auto done=service.Run(intent.job_id);if(!done.complete)throw std::runtime_error("derived-job:"+done.reason);
        check(!search.PlaybackCandidates(*model,q,&candidates,&error)&&error=="search-source-changed","completed job invalidates prior source view");
        if(!search.Refresh(q.channels,model,&model,&error))throw std::runtime_error(error);
        check(search.PlaybackCandidates(*model,q,&candidates,&error)&&!candidates.empty(),"actual completed outputs yield playable proven candidates");
        if(candidates.empty())throw std::runtime_error(error);
        check(SameEventCandidates(store,search,*model,q),"partial complete job matches full timeline and public JSON");
        bool partial=false,all_proven=true;
        for(const auto& source:intent.sources){
            const auto& s=source.segment;
            recording::ConfirmedMediaInterval base{s.source_id,s.store_id,s.media_epoch_id,s.segment_id,1,1000000000,s.media_start_pts,*s.media_end_pts};
            std::vector<recording::SearchPlaybackSlice> slices;
            if(!recording::SelectSearchPlayback(base,candidates,&slices,&error))throw std::runtime_error(error);
            bool original=false,event=false;for(const auto& slice:slices){original|=slice.event_id.empty();event|=!slice.event_id.empty();}
            partial|=original&&event;
        }
        for(const auto& c:candidates)all_proven&=c.playable&&c.provenance_verified&&c.event_id=="public-media-event"&&
            c.original.store_id=="probe-store"&&c.original.start_pts>=7000000000LL&&c.original.end_pts<=8500000000LL;
        check(all_proven&&partial,"actual original coverage retains uncovered source tail");
        const auto selected=candidates.front().output_segment_id;
        const auto location=store.catalog.FindSegmentMediaLocation(selected);if(!location)throw std::runtime_error("output location");
        const auto file=location->first/location->second;const auto hidden=file.string()+".held";
        std::filesystem::rename(file,hidden);
        const bool missing_ok=search.PlaybackCandidates(*model,q,&candidates,&error)&&
            std::none_of(candidates.begin(),candidates.end(),[&](const auto& c){return c.output_segment_id==selected;});
        check(SameEventCandidates(store,search,*model,q),"missing file matches full timeline and public JSON");
        std::filesystem::rename(hidden,file);
        check(missing_ok,"missing event file cannot supersede source");
        check(search.PlaybackCandidates(*model,q,&candidates,&error)&&
            std::any_of(candidates.begin(),candidates.end(),[&](const auto& c){return c.output_segment_id==selected;}),"restored file is revalidated on new lookup");

        check(SameEventCandidates(store,search,*model,q),"restored file matches full timeline and public JSON");
        const auto history=MappedSource(store,intent.sources.front().segment,"search-unplaced-history",256,std::nullopt);
        DeleteFixtureSegment(store,history);
        check(!search.PlaybackCandidates(*model,q,&candidates,&error)&&error=="search-source-changed","retired source change invalidates prior source view");
        if(!search.Refresh(q.channels,model,&model,&error))throw std::runtime_error(error);
        check(SameEventCandidates(store,search,*model,q),"deleted unplaced history leaves exact event candidates and public JSON");
        recording::RecordingTimelineResult full;
        if(!read.QuerySearchTimeline(q.channels.front(),q.start_time_ms,q.end_time_ms,&full,&error))throw std::runtime_error(error);
        check(std::count_if(full.unplaced_items.begin(),full.unplaced_items.end(),[&](const auto& row){
            return row.segment_id==history.segment_id&&row.catalog_state=="deleted";})==256,"full timeline retains every deleted history mapping");
        for(const auto& source:intent.sources)DeleteFixtureSegment(store,source.segment);
        if(!search.Refresh(q.channels,model,&model,&error))throw std::runtime_error(error);
        check(SameEventCandidates(store,search,*model,q)&&search.PlaybackCandidates(*model,q,&candidates,&error)&&!candidates.empty(),
            "deleted originals retain proven event candidates");
        std::optional<recording::DerivedJobRecordV1> completed;
        if(!store.catalog.FindDerivedJob(intent.job_id,&completed,&error)||!completed||!completed->ready)throw std::runtime_error(error);
        DeleteFixtureSegment(store,completed->ready->outputs.front().segment);
        if(!search.Refresh(q.channels,model,&model,&error))throw std::runtime_error(error);
        check(SameEventCandidates(store,search,*model,q),"deleted output matches full timeline and public JSON");
        auto foreign=q;foreign.channels={"other-channel"};
        if(!search.Refresh(foreign.channels,{},&model,&error))throw std::runtime_error(error);
        check(SameEventCandidates(store,search,*model,foreign)&&search.PlaybackCandidates(*model,foreign,&candidates,&error)&&candidates.empty(),
            "foreign channel cannot acquire event candidates");
        Store unplaced(std::filesystem::weakly_canonical(argv[1])/"unplaced");const auto unplaced_intent=PrepareMedia(unplaced,true,1);
        recording::DerivedJobService unplaced_service(unplaced.catalog,unplaced.journal,{unplaced.root,30000,{}});
        if(!unplaced_service.Run(unplaced_intent.job_id).complete)throw std::runtime_error("unplaced complete fixture");
        recording::RecordingReadService unplaced_read(unplaced.catalog);recording::RecordingSearchReader unplaced_search(unplaced.catalog,unplaced_read);
        if(!unplaced_search.Refresh(q.channels,{},&model,&error))throw std::runtime_error(error);
        check(SameEventCandidates(unplaced,unplaced_search,*model,q)&&unplaced_search.PlaybackCandidates(*model,q,&candidates,&error)&&candidates.empty(),
            "unplaced partial event is not a proven UTC replacement");

        // 실제 B 소유권과 퇴역 영수증·미캐시 archive를 재개방해 검사한다.
        for(const std::string mode:{"unrelated","related-cold","related-warm"}) {
            const auto root=std::filesystem::weakly_canonical(argv[1])/("generation-"+mode);
            recording::DerivedJobIntentV1 durable;recording::RecordingSegmentV2 unrelated_known,unrelated_unknown;
            {
                Store seed(root);durable=PrepareMedia(seed,true);
                recording::DerivedJobService seed_service(seed.catalog,seed.journal,{root,30000,{}});
                if(!seed_service.Run(durable.job_id).complete)throw std::runtime_error("B seed complete");
                unrelated_known=MappedSource(seed,durable.sources.front().segment,"b-known-history",2,1789200000000000000LL);
                unrelated_unknown=MappedSource(seed,durable.sources.front().segment,"b-unknown-history",2,std::nullopt);
            }
            struct View {std::filesystem::path root;recording::RecordingCatalog& catalog;};
            {
                recording::RecordingRuntimeStorage runtime(root);if(!runtime.Open(&error))throw std::runtime_error(error);
                View view{root,runtime.catalog()};
                for(const auto& source:durable.sources)DeleteFixtureSegment(view,source.segment);
                if(!view.catalog.Checkpoint(&error))throw std::runtime_error(error);
                DeleteFixtureSegment(view,unrelated_known);DeleteFixtureSegment(view,unrelated_unknown);
                if(!view.catalog.Checkpoint(&error))throw std::runtime_error(error);
            }
            recording::RecordingRuntimeStorage runtime(root);if(!runtime.Open(&error))throw std::runtime_error(error);
            View view{root,runtime.catalog()};recording::RecordingReadService b_read(view.catalog);
            recording::RecordingSearchReader b_search(view.catalog,b_read);
            if(!b_search.Refresh(q.channels,{},&model,&error))throw std::runtime_error(error);
            std::vector<recording::SearchPlaybackCandidate> b_candidates;
            if(mode!="related-cold") {
                check(SameEventCandidates(view,b_search,*model,q)&&b_search.PlaybackCandidates(*model,q,&b_candidates,&error)&&!b_candidates.empty(),
                    "B retired source retains exact event candidates after reopen");
                recording::RecordingTimelineResult b_full;
                if(!b_read.QuerySearchTimeline(q.channels.front(),q.start_time_ms,q.end_time_ms,&b_full,&error))throw std::runtime_error(error);
                check(std::count_if(b_full.items.begin(),b_full.items.end(),[&](const auto& row){return row.segment_id==unrelated_known.segment_id&&row.catalog_state=="deleted"&&!row.playable;})==2&&
                    std::count_if(b_full.unplaced_items.begin(),b_full.unplaced_items.end(),[&](const auto& row){return row.segment_id==unrelated_unknown.segment_id&&row.catalog_state=="deleted"&&!row.playable;})==2,
                    "B full timeline retains known and unplaced retired mapping IDs");
            }
            const auto target=mode=="unrelated"?unrelated_unknown.segment_id:durable.sources.front().segment.segment_id;
            std::filesystem::path archive;std::size_t matches=0;
            for(const auto& entry:std::filesystem::recursive_directory_iterator(root)) {
                const auto name=entry.path().filename().string();
                if(!entry.is_regular_file()||(name.find("evidence-")!=0&&name.find("active-")!=0)||
                   entry.path()==runtime.journal().path()||entry.path().extension()!=".jsonl")continue;
                std::ifstream in(entry.path(),std::ios::binary);std::string line;bool found=false,related=false;
                // 결속·삭제 행은 기존 압축 물리 envelope를 사용할 수 있다.
                while(std::getline(in,line))if(!line.empty()) {
                    recording::RecordingMutationV1 mutation;
                    if(!recording::ParseRecordingMutationV1(line,&mutation,&error))throw std::runtime_error(error);
                    if(mutation.mutation_type!=recording::RecordingMutationType::SegmentV2Deleted)continue;
                    found|=mutation.entity_id==target;
                    related|=mutation.entity_id==durable.sources.front().segment.segment_id;
                }
                if(!found)continue;
                if(mode=="unrelated"&&related)throw std::runtime_error("unrelated archive is not isolated");
                archive=entry.path();++matches;
            }
            if(matches!=1) {
                std::cout<<"[diagnostic] mode="<<mode<<" catalog="<<view.catalog.catalog_mode()<<" target="<<target<<" current="<<runtime.journal().path().filename()<<std::endl;
                for(const auto& entry:std::filesystem::recursive_directory_iterator(root))if(entry.is_regular_file()&&entry.path().extension()==".jsonl") {
                    std::ifstream in(entry.path(),std::ios::binary);std::string bytes((std::istreambuf_iterator<char>(in)),{});
                    std::cout<<"[diagnostic] file="<<entry.path().filename()<<" bytes="<<bytes.size()<<" entity="<<(bytes.find(target)!=std::string::npos)<<" tombstone="<<(bytes.find("search-deleted-"+target)!=std::string::npos)<<std::endl;
                }
                throw std::runtime_error("one isolated tombstone archive required: "+std::to_string(matches));
            }
            {std::fstream file(archive,std::ios::binary|std::ios::in|std::ios::out);char byte=0;file.read(&byte,1);byte^=1;file.seekp(0);file.write(&byte,1);file.flush();if(!file)throw std::runtime_error("owned archive tamper");}
            if(mode=="unrelated") {
                check(b_search.PlaybackCandidates(*model,q,&b_candidates,&error)&&!b_candidates.empty(),"unconsumed isolated continuous archive is validated lazily");
                recording::RecordingTimelineResult b_full;
                check(!b_read.QuerySearchTimeline(q.channels.front(),q.start_time_ms,q.end_time_ms,&b_full,&error),"full timeline strictly rejects consumed corrupt history");
            }
            if(mode=="related-cold")b_candidates.push_back({{},"sentinel-event","sentinel-output",false,false,"sentinel-job"});
            const auto prior_candidates=b_candidates;
            check(!b_search.PlaybackCandidates(*model,q,&b_candidates,&error)&&b_candidates.size()==prior_candidates.size()&&
                std::equal(b_candidates.begin(),b_candidates.end(),prior_candidates.begin(),[](const auto& a,const auto& b){return CandidateKey(a)==CandidateKey(b);}),
                "related cold/warm corruption or lost authority rejects with every output field unchanged");
        }
        recording::RecordingTimelineResult legacy;
        check(!read.QueryTimeline({"probe-channel",q.start_time_ms,q.end_time_ms,0,1001,false},&legacy,&error),"legacy timeline page limit unchanged");
    }catch(const std::exception& ex){std::cerr<<ex.what()<<'\n';return 1;}
    std::cout<<"[search-playback] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
