// 파일 용도: 기존 fixture 준비와 decoder만 재사용하며 기존 suite main은 호출하지 않는다.
#define main DerivedSeekTimelineFixtureMain
#include "recording_public_timeline_smoke.cpp"
#undef main
#define main DerivedSeekSourceFixtureMain
#include "recording_search_seek_smoke.cpp"
#undef main
int main(int argc,char**argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);int pass=0,fail=0;
    const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    try{
        Store store(std::filesystem::weakly_canonical(argv[1])/"derived");const auto intent=PrepareMedia(store,true);std::string error;
        recording::RecordingReadService read(store.catalog);recording::RecordingSearchReader search(store.catalog,read);
        recording::SearchSeekTarget target;
        check(!search.DerivedSeek("probe-channel",intent.job_id,intent.sources.front().segment.segment_id,intent.outputs.front().output_id,7000000000LL,&target,&error),"intent output seek unavailable");
        recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});
        const auto run=service.Run(intent.job_id);if(!run.complete||!run.job||!run.job->ready)throw std::runtime_error("derived-job:"+run.reason);
        const auto& output=run.job->ready->outputs.front();const auto& source=intent.sources[output.source_index];
        const auto& units=output.provenance.access_units;const auto index=std::min<std::size_t>(5,units.size()-1);const auto& au=units[index];
        check(search.DerivedSeek("probe-channel",intent.job_id,source.segment.segment_id,output.segment.segment_id,au.original_pts_ns,&target,&error)&&
            target.sample_ordinal==au.ordinal&&target.seconds>=0&&target.seconds<3,"original AU maps to current output presentation");
        const auto source_location=store.catalog.FindSegmentMediaLocation(source.segment.segment_id);
        const auto output_location=store.catalog.FindSegmentMediaLocation(output.segment.segment_id);
        if(!source_location||!output_location)throw std::runtime_error("media locations");
        const auto file=output_location->first/output_location->second;
        const auto decoded_source=Decode(source_location->first/source_location->second);
        const auto found=std::find_if(source.binding.samples.begin(),source.binding.samples.end(),[&](const auto& sample){return sample.ordinal==au.ordinal;});
        const auto source_index=static_cast<std::size_t>(found-source.binding.samples.begin());const auto sought=Decode(file,target.seconds);
        check(source_index<decoded_source.size()&&sought.size()==1&&sought[0].hash==decoded_source[source_index].hash&&
            std::abs(sought[0].pts/1e9-target.seconds)<=target.frame_duration_seconds,"derived accurate seek matches independent original decoded frame");
        bool other_gop=run.job->ready->outputs.size()>1;
        for(std::size_t n=1;n<run.job->ready->outputs.size();++n){
            const auto& other=run.job->ready->outputs[n];const auto& base=intent.sources[other.source_index];
            const auto& sample=other.provenance.access_units[std::min<std::size_t>(2,other.provenance.access_units.size()-1)];
            recording::SearchSeekTarget other_target;
            if(!search.DerivedSeek("probe-channel",intent.job_id,base.segment.segment_id,other.segment.segment_id,sample.original_pts_ns,&other_target,&error)){other_gop=false;continue;}
            const auto original_file=store.catalog.FindSegmentMediaLocation(base.segment.segment_id);
            const auto derived_file=store.catalog.FindSegmentMediaLocation(other.segment.segment_id);
            if(!original_file||!derived_file){other_gop=false;continue;}
            const auto all=Decode(original_file->first/original_file->second);
            const auto actual=Decode(derived_file->first/derived_file->second,other_target.seconds);
            const auto original_sample=std::find_if(base.binding.samples.begin(),base.binding.samples.end(),[&](const auto& s){return s.ordinal==sample.ordinal;});
            const auto expected=static_cast<std::size_t>(original_sample-base.binding.samples.begin());
            other_gop&=expected<all.size()&&actual.size()==1&&actual[0].hash==all[expected].hash&&
                std::abs(actual[0].pts/1e9-other_target.seconds)<=other_target.frame_duration_seconds;
        }
        check(other_gop,"different source GOP output has independent file origin");
        const auto held=target;
        check(!search.DerivedSeek("other",intent.job_id,source.segment.segment_id,output.segment.segment_id,au.original_pts_ns,&target,&error)&&target.seconds==held.seconds,"foreign channel rejects atomically");
        check(!search.DerivedSeek("probe-channel",intent.job_id,"other",output.segment.segment_id,au.original_pts_ns,&target,&error),"foreign original segment rejected");
        check(!search.DerivedSeek("probe-channel",intent.job_id,source.segment.segment_id,"other",au.original_pts_ns,&target,&error),"unbound output rejected");
        check(!search.DerivedSeek("probe-channel",intent.job_id,source.segment.segment_id,output.segment.segment_id,99000000000LL,&target,&error),"outside derived actual range rejected");
        std::filesystem::rename(file,file.string()+".held");
        const bool absent=!search.DerivedSeek("probe-channel",intent.job_id,source.segment.segment_id,output.segment.segment_id,au.original_pts_ns,&target,&error);
        std::filesystem::rename(file.string()+".held",file);check(absent,"missing output no seek proof");
        check(search.DerivedSeek("probe-channel",intent.job_id,source.segment.segment_id,output.segment.segment_id,au.original_pts_ns,&target,&error),"restored output revalidated");
    }catch(const std::exception& ex){std::cerr<<ex.what()<<'\n';return 1;}
    std::cout<<"[search-derived-seek] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
