// 파일 용도: 실제 원본/파생 파일 fixture를 재사용한다. 기존 public media main은 실행하지 않는다.
#define main lp22_public_media_unused_main
#include "recording_public_media_smoke.cpp"
#undef main
#include "recording_job_read_context_counter.h"
#include <sstream>
std::string ReadBytes(const std::filesystem::path& path){std::ifstream f(path,std::ios::binary);return {std::istreambuf_iterator<char>(f),{}};}
#if LP22_JOB_READ_CONTEXT
using Context=recording::RecordingCatalog::JobReadContext;
using JobHandle=recording::RecordingCatalog::DerivedJobHandle;
void WriteBytes(const std::filesystem::path& path,const std::string& bytes){std::ofstream f(path,std::ios::binary|std::ios::trunc);f.write(bytes.data(),bytes.size());if(!f)throw std::runtime_error("fixture-write");}
template<class Check> void Negatives(Store& store,const recording::DerivedJobIntentV1& intent,Check check){
    const recording::RecordingTimelineQuery q{"probe-channel",1789200000000LL,1789200003000LL,0,100};
    recording::RecordingReadService reader(store.catalog);std::string error;
    auto& catalog=store.catalog;
    const auto prime=[&](Context& context){recording::RecordingTimelineResult result;
        if(!catalog.SnapshotTimelineWithContext(q,&result,&error,&context)||context.entries.size()!=1)throw std::runtime_error("fixture-prime");};
    // RetentionSnapshot의 hold_count에는 불확실/활성 job 보호가 합산된다. 실제 FD hold와 구분한다.
    const auto clean_holds=[&](){for(const auto& output:intent.outputs){const auto held=catalog.hold_counts_.find(output.output_id);
        if(held!=catalog.hold_counts_.end()&&held->second!=0)return false;}return true;};
    const auto uncertain_protected=[&](){if(catalog.derived_job_state_authoritative_)return false;
        for(const auto& output:intent.outputs)if(Holds(catalog,output.output_id)==0)return false;return true;};
    const auto rejection=[&](const char* name,bool rejected){std::uint64_t fd_holds=0,retention_holds=0;
        for(const auto& output:intent.outputs){const auto held=catalog.hold_counts_.find(output.output_id);
            if(held!=catalog.hold_counts_.end())fd_holds+=held->second;retention_holds+=Holds(catalog,output.output_id);}
        std::cout<<"[read-context-rejection] {\"case\":\""<<name<<"\",\"rejected\":"<<(rejected?"true":"false")
            <<",\"fdHolds\":"<<fd_holds<<",\"authoritative\":"<<(catalog.derived_job_state_authoritative_?"true":"false")
            <<",\"retentionProtection\":"<<retention_holds<<"}\n";
        return rejected&&clean_holds()&&uncertain_protected();};
    const auto media=[&](Context& context){return reader.ResolveMediaWithContext("probe-channel",intent.outputs[0].output_id,&context);};
    {
        Context context;prime(context);auto changed=std::make_shared<recording::RecordingMutationV1>(*context.entries[0].envelope);
        ++changed->occurred_at_ms;context.entries[0].envelope=changed;JobHandle out;bool strict=false;
        job_read_probe::parses=0;job_read_probe::enabled=true;
        const bool ok=catalog.AcquireJobForReadLocked(intent.job_id,&out,&context,&error,&strict);
        job_read_probe::enabled=false;
        check(ok&&out&&job_read_probe::parses==1,"LP22-R06 changed saved envelope falls back to strict parsing");
    }
    {
        Context context;prime(context);auto& entry=catalog.derived_jobs_.at(intent.job_id);const auto saved=entry.mutation;
        entry.mutation=catalog.source_bindings_.at(intent.sources[0].segment.segment_id).mutation;
        JobHandle out=context.entries[0].job;const bool ok=catalog.AcquireJobForReadLocked(intent.job_id,&out,&context,&error);
        check(!ok&&!out&&!catalog.derived_job_state_authoritative_,"LP22-R06 replaced current mutation rejects without stale reuse");
        entry.mutation=saved;catalog.derived_job_state_authoritative_=true;
    }
    {
        Context context;prime(context);auto& entry=catalog.derived_jobs_.at(intent.job_id);const auto saved=entry.resident;
        auto invalid=std::make_shared<recording::DerivedJobRecordV1>(*context.entries[0].job);invalid->ready->manifest_sha256="invalid";
        entry.resident=invalid;context.entries[0].job=invalid;context.entries[0].link={};
        job_read_probe::serializes=0;job_read_probe::enabled=true;auto result=media(context);job_read_probe::enabled=false;
        check(!result&&job_read_probe::serializes>0&&catalog.derived_job_state_authoritative_&&clean_holds(),"LP22-R06 same resident with invalid provenance retains strict validation");entry.resident=saved;
    }
    {
        Context context;prime(context);auto& entry=catalog.derived_jobs_.at(intent.job_id);const auto saved=entry.state;entry.state=recording::DerivedJobState::Committed;
        auto result=media(context);check(rejection("state",!result),"LP22-R07 changed current state rejects playback");entry.state=saved;catalog.derived_job_state_authoritative_=true;
    }
    {
        Context context;prime(context);auto& entry=catalog.derived_jobs_.at(intent.job_id);const auto saved=entry.reference;entry.reference="different-reference";
        auto result=media(context);check(rejection("metadata",!result),"LP22-R07 changed thin metadata rejects stale content");entry.reference=saved;catalog.derived_job_state_authoritative_=true;
    }
    {
        Context context;prime(context);auto& segment=catalog.segments_v2_.at(intent.sources[0].segment.segment_id);const auto saved=segment;segment.size_bytes+=1;
        auto result=media(context);check(rejection("source",!result),"LP22-R07 changed current source segment rejects stale content");segment=saved;catalog.derived_job_state_authoritative_=true;
    }
    {
        Context context;prime(context);auto& path=catalog.media_relpaths_.at(intent.outputs[0].output_id);const auto saved=path;path="wrong.mp4";
        auto result=media(context);auto strict=reader.ResolveMedia("probe-channel",intent.outputs[0].output_id);
        check(!result&&!strict&&clean_holds(),"LP22-R07 changed output path preserves strict rejection");path=saved;
    }
    {
        Context context;prime(context);catalog.derived_jobs_.emplace("duplicate-owner",catalog.derived_jobs_.at(intent.job_id));
        auto result=media(context);check(rejection("duplicate-owner",!result),"LP22-R07 duplicate output owner rejects playback");catalog.derived_jobs_.erase("duplicate-owner");catalog.derived_job_state_authoritative_=true;
    }
    {
        Context context;prime(context);const auto id=intent.outputs[0].output_id;const auto saved=catalog.states_v2_;
        catalog.states_v2_[id].lifecycle=recording::RecordingLifecycle::Deleted;
        auto result=media(context);check(!result&&clean_holds(),"LP22-R07 deleted output rejects playback");catalog.states_v2_=saved;
    }
    {
        ingress::RecordingApplicationService app(reader,catalog,true,{});
        const std::unordered_map<std::string,std::string> query{{"channelId","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200003000"}};
        job_read_probe::strict_only=true;const auto strict=app.Timeline(query,[](const auto&){return true;});job_read_probe::strict_only=false;
        job_read_probe::zero_budget=true;job_read_probe::enabled=true;job_read_probe::parses=0;
        const auto result=app.Timeline(query,[](const auto&){return true;});job_read_probe::enabled=false;job_read_probe::zero_budget=false;
        const auto fallback_parses=job_read_probe::parses;
        const bool fallback_empty=job_read_probe::observed_entries==0&&job_read_probe::observed_charge==0;
        Context context;prime(context);std::size_t summed=0;for(const auto& e:context.entries)summed+=e.link.LogicalCharge();
        check(result.status==200&&result.body==strict.body&&fallback_parses==5&&fallback_empty&&context.entries.size()<=8&&
              context.budget==8U*1024U*1024U&&summed>0&&summed==context.charge&&summed<=context.budget,"LP22-R08 byte budget fallback preserves full timeline and owned limit");
    }
    {
        Context context;context.entries.resize(8);job_read_probe::parses=0;job_read_probe::enabled=true;
        auto result=media(context);job_read_probe::enabled=false;const bool ok=static_cast<bool>(result);result.reset();
        check(ok&&job_read_probe::parses==2&&context.entries.size()==8&&context.charge==0&&clean_holds(),"LP22-R08 job budget fallback preserves strict playback");
    }
    {
        Context context;job_read_probe::fail_admission=true;JobHandle out;
        const bool ok=catalog.AcquireJobForReadLocked(intent.job_id,&out,&context,&error);
        check(ok&&out&&context.entries.empty()&&context.charge==0&&!job_read_probe::fail_admission&&catalog.derived_job_state_authoritative_,
              "LP22-R08 admission allocation failure preserves authority and strict result");
    }
    {
        Context context;prime(context);const auto path=store.root/intent.outputs[0].final_relpath;const auto original=ReadBytes(path);auto damaged=original;
        if(damaged.empty())throw std::runtime_error("fixture-file-empty");damaged.back()^=1;WriteBytes(path,damaged);auto result=media(context);
        check(!result&&clean_holds()&&ReadBytes(path).size()==original.size(),"LP22-R09 file tamper rejects and releases holds");WriteBytes(path,original);
    }
    {
        ingress::RecordingApplicationService app(reader,catalog,true,{});job_read_probe::enabled=true;job_read_probe::fail_media=true;
        const auto result=app.Timeline({{"channelId","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200003000"}},[](const auto&){return true;});job_read_probe::enabled=false;
        const bool bounded=catalog.timeline_read_candidates_.entries.size()<=8&&
            catalog.timeline_read_candidates_.charge<=catalog.timeline_read_candidates_.budget;
        catalog.timeline_read_candidates_={};
        check(result.status!=200&&!job_read_probe::fail_media&&clean_holds()&&bounded&&job_read_probe::ObservedExpired(),
              "LP22-R09 media exception releases context and holds");
    }
    for(bool detach:{false,true}){
        Store isolated(store.root.parent_path()/(detach?"detached":"tampered"));const auto other=PrepareMedia(isolated,false);
        recording::DerivedJobService service(isolated.catalog,isolated.journal,{isolated.root,30000,{}});
        if(!service.Run(other.job_id).complete)throw std::runtime_error("fixture-isolated");
        Context context;recording::RecordingTimelineResult timeline;
        if(!isolated.catalog.SnapshotTimelineWithContext(q,&timeline,&error,&context)||context.entries.size()!=1)throw std::runtime_error("fixture-isolated-context");
        const auto owned=context.entries[0].job;JobHandle out=owned;
        if(detach)isolated.journal.DetachCatalog(&isolated.catalog);
        else {auto bytes=ReadBytes(isolated.journal.path());const auto pos=bytes.rfind(other.job_id);
            if(pos==std::string::npos)throw std::runtime_error("fixture-mutation-position");bytes[pos]=bytes[pos]=='a'?'b':'a';WriteBytes(isolated.journal.path(),bytes);}
        const bool ok=isolated.catalog.AcquireJobForReadLocked(other.job_id,&out,&context,&error);
        check(!ok&&!out&&!isolated.catalog.derived_job_state_authoritative_&&owned->state==recording::DerivedJobState::Complete,
              detach?"LP22-R09 detached authority rejects cold context reuse":"LP22-R09 same size journal tamper rejects and clears owned output");
    }
    {
        Store isolated(store.root.parent_path()/"cross-request-tamper");const auto other=PrepareMedia(isolated,false);
        recording::DerivedJobService service(isolated.catalog,isolated.journal,{isolated.root,30000,{}});
        if(!service.Run(other.job_id).complete)throw std::runtime_error("fixture-cross-request");
        recording::RecordingReadService read(isolated.catalog);ingress::RecordingApplicationService app(read,isolated.catalog,true,{});
        const std::unordered_map<std::string,std::string> query{{"channelId","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200003000"}};
        const auto first=app.Timeline(query,[](const auto&){return true;});
        const auto bytes=ReadBytes(isolated.journal.path());const auto pos=bytes.rfind(other.job_id);
        if(pos==std::string::npos)throw std::runtime_error("fixture-cross-request-journal");
        auto damaged=bytes;damaged[pos]=damaged[pos]=='a'?'b':'a';WriteBytes(isolated.journal.path(),damaged);
        const auto second=app.Timeline(query,[](const auto&){return true;});
        bool holds_zero=true;for(const auto& output:other.outputs){const auto held=isolated.catalog.hold_counts_.find(output.output_id);
            holds_zero&=held==isolated.catalog.hold_counts_.end()||held->second==0;}
        check(first.status==200&&isolated.catalog.timeline_read_candidates_.entries.size()==1&&
              second.status!=200&&!isolated.catalog.derived_job_state_authoritative_&&holds_zero,
              "LP26-O23 cross-request candidate rejects same-size journal tamper");
    }
}
#endif
int main(int argc,char** argv){
    if(argc!=2)return 2;gst_init(nullptr,nullptr);int pass=0,fail=0;
    const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    try{
        Store store(std::filesystem::path(argv[1])/"store");const auto intent=PrepareMedia(store,false);
        recording::DerivedJobService service(store.catalog,store.journal,{store.root,30000,{}});
        const auto result=service.Run(intent.job_id);std::optional<recording::DerivedJobRecordV1> job;std::string error;
        if(!result.complete||!store.catalog.FindDerivedJob(intent.job_id,&job,&error)||!job||!job->ready)throw std::runtime_error("fixture");
        check(job->state==recording::DerivedJobState::Complete&&job->ready->request_fully_satisfied&&job->ready->outputs.size()==2&&job->ready->outputs[0].segment.segment_id!=job->ready->outputs[1].segment.segment_id,
              "LP22-R01 fixture actual Complete two outputs");
        std::vector<std::string> before;for(const auto& output:intent.outputs)before.push_back(ReadBytes(store.root/output.final_relpath));
        recording::RecordingReadService reader(store.catalog);ingress::RecordingApplicationService app(reader,store.catalog,true,{});
        const std::unordered_map<std::string,std::string> query{{"channelId","probe-channel"},{"startTimeMs","1789200000000"},{"endTimeMs","1789200003000"}};
        job_read_probe::strict_only=true;const auto baseline=app.Timeline(query,[](const auto&){return true;});job_read_probe::strict_only=false;
        job_read_probe::parses=0;job_read_probe::enabled=true;
        const auto first=app.Timeline(query,[](const auto&){return true;});
        job_read_probe::enabled=false;const auto first_parses=job_read_probe::parses;
        bool bytes_same=true;for(std::size_t i=0;i<intent.outputs.size();++i)bytes_same&=before[i]==ReadBytes(store.root/intent.outputs[i].final_relpath);
        check(baseline.status==200&&first.status==200&&baseline.body==first.body&&bytes_same,"LP22-R02 public timeline canonical and media bytes unchanged");
        check(first_parses==1,"LP22-R03 same job two outputs parse strictly once per request");
        job_read_probe::parses=0;job_read_probe::enabled=true;const auto second=app.Timeline(query,[](const auto&){return true;});job_read_probe::enabled=false;
        check(job_read_probe::parses==0&&second.status==200&&second.body==first.body,"LP22-R04 next request revalidates cold job");
        bool holds_zero=true;for(const auto& output:intent.outputs)holds_zero&=Holds(store.catalog,output.output_id)==0;
        bool released=holds_zero;
#if LP22_JOB_READ_CONTEXT
        released=released&&store.catalog.timeline_read_candidates_.entries.size()<=8&&
            store.catalog.timeline_read_candidates_.charge<=store.catalog.timeline_read_candidates_.budget;
        store.catalog.timeline_read_candidates_={};
        released=released&&job_read_probe::ObservedExpired();
#endif
        check(released,"LP22-R05 context and media holds released after request");
        std::cout<<"[read-context-count] {\"firstParses\":"<<first_parses<<",\"secondParses\":"<<job_read_probe::parses<<"}\n";
#if LP22_JOB_READ_CONTEXT
        Negatives(store,intent,check);
#endif
    }catch(...){job_read_probe::enabled=false;++fail;std::cout<<"[fail] LP22-M00 fixed fixture preparation failure\n";}
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
