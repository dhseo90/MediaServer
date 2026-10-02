// 파일 용도: 기존 실제 media fixture의 준비 함수만 재사용하여 검색 우선 후보를 검사한다.
#define main SearchTimelineFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#include "recording/recording_search_reader.h"
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
        recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});
        const auto done=service.Run(intent.job_id);if(!done.complete)throw std::runtime_error("derived-job:"+done.reason);
        check(!search.PlaybackCandidates(*model,q,&candidates,&error)&&error=="search-source-changed","completed job invalidates prior source view");
        if(!search.Refresh(q.channels,model,&model,&error))throw std::runtime_error(error);
        check(search.PlaybackCandidates(*model,q,&candidates,&error)&&!candidates.empty(),"actual completed outputs yield playable proven candidates");
        if(candidates.empty())throw std::runtime_error(error);
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
        std::filesystem::rename(hidden,file);
        check(missing_ok,"missing event file cannot supersede source");
        check(search.PlaybackCandidates(*model,q,&candidates,&error)&&
            std::any_of(candidates.begin(),candidates.end(),[&](const auto& c){return c.output_segment_id==selected;}),"restored file is revalidated on new lookup");
        recording::RecordingTimelineResult legacy;
        check(!read.QueryTimeline({"probe-channel",q.start_time_ms,q.end_time_ms,0,1001,false},&legacy,&error),"legacy timeline page limit unchanged");
    }catch(const std::exception& ex){std::cerr<<ex.what()<<'\n';return 1;}
    std::cout<<"[search-playback] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
