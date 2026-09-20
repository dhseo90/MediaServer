// 첫 RED는 기존 실제 파일/완료 job fixture의 복구 내용 재검증만 관측한다.
// 대형 합성 복구 및 새 private 반례는 이 baseline과 구분하여 추가한다.
#define main recovery_public_media_unused_main
#include "recording_public_media_smoke.cpp"
#undef main
#include "recording_recovery_content_counter.h"
#define main recovery_checkpoint_unused_main
#include "recording_checkpoint_reproduction_smoke.cpp"
#undef main
#include <array>
#include <chrono>
#include <sstream>
#include <set>
#include <tuple>
#include <sqlite3.h>

namespace {
const char* recovery_stage="initial";
std::string Bytes(const std::filesystem::path& path){std::ifstream in(path,std::ios::binary);if(!in)throw std::runtime_error("fixture-read");return {std::istreambuf_iterator<char>(in),{}};}
struct Reopened {
    recording::RecordingJournal journal;
    recording::RecordingCatalog catalog;
    static recording::RecordingCatalog::Options Options(const std::filesystem::path& root,bool sqlite){auto options=Store::Options(root);options.prefer_sqlite=sqlite;return options;}
    Reopened(const std::filesystem::path& root,bool sqlite):journal(recording::RecordingJournal::ManagedOptions{root,"probe-store"}),catalog(journal,Options(root,sqlite)){}
};
std::string Job(recording::RecordingCatalog& catalog,const std::string& id){std::optional<recording::DerivedJobRecordV1> job;std::string error;
    if(!catalog.FindDerivedJob(id,&job,&error)||!job)throw std::runtime_error("fixture-job");return recording::SerializeDerivedJobRecord(*job);}
void NeedRecovery(bool value){if(!value)throw std::runtime_error("recovery-fixed");}
[[maybe_unused]] std::filesystem::path ManagedRecoveryPath(const std::filesystem::path& root){
    recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{root,"probe-store"});return journal.path();
}
void WriteRecovery(const std::filesystem::path& file,const std::string& bytes){std::ofstream out(file,std::ios::binary|std::ios::trunc);out<<bytes;NeedRecovery(bool(out));}
const char* SafeRecoveryReason(const std::string& reason){
    if(reason.empty())return "none";
    for(const char* known:{"job-remux: file-original-timestamp-mismatch","job-remux: source-binding-incomplete",
        "job-source-unavailable","job-cancelled-or-deadline","job-attempt-create","job-output-create",
        "job-remux: media-budget-exceeded","job-remux: work-cancelled","job-remux: output-byte-budget-exceeded"})
        if(reason==known)return known;
    return "unknown";
}
const char* SafeRecoveryState(recording::DerivedJobState state){
    switch(state){case recording::DerivedJobState::Intent:return "intent";case recording::DerivedJobState::Ready:return "ready";
        case recording::DerivedJobState::Committed:return "committed";case recording::DerivedJobState::Complete:return "complete";
        case recording::DerivedJobState::Failed:return "failed";}return "unknown";
}
void PrepareDiagnostic(int index,const recording::DerivedRecordingSelection& selection,const recording::DerivedJobIntentV1& intent,
    const recording::DerivedJobRunResult* result,bool after,bool exception=false){
    std::size_t proofs=0;for(const auto& source:intent.sources)proofs+=source.binding.file_evidence.has_value();
    const char* profile=intent.profile=="h264-mp4-native-to-mpegts-video-only-v1"?"native":
        intent.profile=="h264-mp4-to-mpegts-video-only-v1"?"legacy":"unknown";
    const auto* job=result&&result->job?&*result->job:nullptr;const auto* ready=job&&job->ready?&*job->ready:nullptr;
    std::cout<<"[recovery-prepare-diagnostic] {\"phase\":\""<<(after?"after":"before")<<"\",\"index\":"<<index
        <<",\"profile\":\""<<profile<<"\",\"selectionNative\":"<<(selection.native_file_intervals?"true":"false")
        <<",\"selectedSources\":"<<intent.sources.size()<<",\"plannedOutputs\":"<<intent.outputs.size()<<",\"bindingProofs\":"<<proofs
        <<",\"complete\":"<<(result?(result->complete?"true":"false"):"null")<<",\"blocked\":"<<(result?(result->blocked?"true":"false"):"null")
        <<",\"hasJob\":"<<(result?(job?"true":"false"):"null")<<",\"state\":"<<(job?std::string("\"")+SafeRecoveryState(job->state)+"\"":"null")
        <<",\"hasReady\":"<<(job?(ready?"true":"false"):"null")<<",\"verifiedOutput\":"<<(ready?(ready->verified_output?"true":"false"):"null")
        <<",\"outputCount\":"<<(ready?std::to_string(ready->outputs.size()):"null")<<",\"requestFullySatisfied\":"<<(ready?(ready->request_fully_satisfied?"true":"false"):"null")
        <<",\"reason\":"<<(exception?"\"exception\"":result?std::string("\"")+SafeRecoveryReason(result->reason)+"\"":"null")<<"}"<<std::endl;
}
void PrepareRealistic(const std::filesystem::path& root,bool native=true){
    recovery_stage="prepare-input";
    auto input=Encode(1500,false,false,160,90,30,250);Shift(input,0);
    // 합성 관측을 writer 입력 전에 만든다. 완료된 mapping/segment를 사후 덮어쓰지 않는다.
    for(std::size_t i=0;i<input.packets.size();++i){auto& observation=*input.packets[i].observation;
        const auto jitter=(i%250<158&&i%2)?5000000LL:0LL;
        observation.mono_before_ns=1000000000LL+input.packets[i].pts+jitter;observation.mono_after_ns=observation.mono_before_ns+1000;
        observation.observed_utc_ns=1789200000000000000LL+input.packets[i].pts+jitter;}
    recovery_stage="prepare-sources";
    Store store(root);auto writer=Writer(store,input);for(const auto& packet:input.packets)writer->Push(packet,0);writer->Stop();
    const auto sources=Sources(store);NeedRecovery(sources.size()==6);std::size_t mappings=0,source_samples=0,file_proofs=0;
    for(const auto& source:sources){NeedRecovery(source.binding&&source.binding->samples.size()==250);mappings+=source.segment.mappings.size();source_samples+=source.binding->samples.size();file_proofs+=source.binding->file_evidence.has_value();}
    NeedRecovery(mappings>=900&&mappings<=1500&&file_proofs==6);
    auto retention=Retention(store);auto evidence=Evidence(input);const auto oracle=root.parent_path()/"expected";std::filesystem::create_directory(oracle);
    recording::DerivedJobService service(store.catalog,store.journal,{root,30000,{}});
    std::size_t outputs=0,satisfied=0,output_aus=0,transitions=0;
    for(int index=0;index<(native?4:1);++index){
        recovery_stage="prepare-selection";
        const auto boundary=(index+1)*250*1000/30;auto reference=Reference(100+index,boundary-333,boundary+667);
        recording::DerivedRecordingSelection selected;recording::DerivedJobIntentV1 intent;std::string error;
        const bool selected_ok=recording::SelectDerivedRecording(reference,*evidence,sources,nullptr,&selected,&error,native);
        std::size_t confirmed=0,unknown=0,other=0;
        for(const auto& slice:selected.slices){if(slice.state==recording::DerivedSliceState::Confirmed)++confirmed;
            else if(slice.state==recording::DerivedSliceState::Unknown)++unknown;else ++other;}
        std::cout<<"[recovery-selection] {\"index\":"<<index<<",\"ok\":"<<(selected_ok?"true":"false")
            <<",\"native\":"<<(selected.native_file_intervals?"true":"false")<<",\"complete\":"<<(selected.complete?"true":"false")
            <<",\"confirmed\":"<<confirmed<<",\"unknown\":"<<unknown<<",\"other\":"<<other<<",\"unplaced\":"<<selected.unplaced.size()<<"}"<<std::endl;
        // R15는 작업 Complete와 요청 전체 충족을 구분한다. unknown을 confirmed로 바꾸지 않는다.
        NeedRecovery(selected_ok&&confirmed>0&&other==0&&selected.unplaced.empty()&&(native?selected.native_file_intervals:selected.complete));
        for(const auto& slice:selected.slices)if(slice.state==recording::DerivedSliceState::Unknown){
            NeedRecovery(slice.presentation&&slice.reason=="unconfirmed-interval-no-trusted-watermark");
            const auto& p=*slice.presentation;
            std::cout<<"[recovery-selection-missing] {\"index\":"<<index<<",\"startNs\":"<<p.start.ns<<",\"startNumerator\":"<<p.start.numerator
                <<",\"startDenominator\":"<<p.start.denominator<<",\"endNs\":"<<p.end.ns<<",\"endNumerator\":"<<p.end.numerator<<",\"endDenominator\":"<<p.end.denominator<<"}"<<std::endl;}
        recovery_stage="prepare-intent";
        NeedRecovery(recording::BuildDerivedJobIntent(selected,sources,8*1024*1024,100+index,&intent,&error));
        recovery_stage="prepare-admit";
        NeedRecovery(retention->AdmitDerivedJob(store.catalog,intent,100+index).accepted);
        recovery_stage="prepare-run";
        PrepareDiagnostic(index,selected,intent,nullptr,false);
        if(native){std::size_t proofs=0;for(const auto& source:intent.sources)proofs+=source.binding.file_evidence.has_value();
            NeedRecovery(selected.native_file_intervals&&intent.profile=="h264-mp4-native-to-mpegts-video-only-v1"&&intent.sources.size()==2&&intent.outputs.size()==2&&proofs==2);}
        recording::DerivedJobRunResult result;
        try{result=service.Run(intent.job_id);}catch(...){PrepareDiagnostic(index,selected,intent,nullptr,true,true);throw;}
        PrepareDiagnostic(index,selected,intent,&result,true);
        if(!native){std::cout<<"[diagnostic] legacy first job only; not native preparation evidence\n[summary] pass=0 fail=0\n";return;}
        NeedRecovery(result.complete&&result.job&&result.job->state==recording::DerivedJobState::Complete&&result.job->ready&&
            result.job->ready->verified_output&&result.job->ready->outputs.size()==2);
        std::multiset<std::tuple<std::string,std::int64_t,std::int64_t>> requested_missing,actual_missing;
        for(const auto& slice:selected.slices)if(slice.state!=recording::DerivedSliceState::Confirmed)
            requested_missing.emplace(slice.reason,slice.start_ns,slice.end_ns);
        for(const auto& missing:result.job->ready->unfulfilled)if(missing.axis=="request-ns")actual_missing.emplace(missing.reason,missing.start,missing.end);
        NeedRecovery(requested_missing==actual_missing&&(!unknown||!result.job->ready->request_fully_satisfied));
        recovery_stage="prepare-expected";
        const auto canonical=recording::SerializeDerivedJobRecord(*result.job);recording::DerivedJobRecordV1 parsed;
        NeedRecovery(!canonical.empty()&&recording::ParseDerivedJobRecord(canonical,&parsed,&error)&&recording::SerializeDerivedJobRecord(parsed)==canonical);
        WriteRecovery(oracle/("job-"+std::to_string(index)+".json"),canonical);satisfied+=result.job->ready->request_fully_satisfied;
        if(index==3){WriteRecovery(oracle/"target-reference",intent.reference.reference_id);WriteRecovery(oracle/"target-intent.sha256",Hash(recording::SerializeDerivedJobIntent(intent)));}
        for(const auto& output:result.job->ready->outputs){const auto location=store.catalog.FindSegmentMediaLocation(output.segment.segment_id);NeedRecovery(bool(location));
            NeedRecovery(Hash(Bytes(location->first/location->second))==output.segment.checksum_sha256);++outputs;output_aus+=output.provenance.access_units.size();}
        std::cout<<"[recovery-job-proof] {\"index\":"<<index<<",\"state\":\"complete\",\"verifiedOutput\":true,\"outputs\":2,\"requestFullySatisfied\":"
            <<(result.job->ready->request_fully_satisfied?"true":"false")<<",\"unfulfilled\":"<<result.job->ready->unfulfilled.size()<<",\"canonicalBytes\":"<<canonical.size()<<",\"canonicalSha256\":\""<<Hash(canonical)<<"\"}\n";
    }
    const auto replay=store.journal.Replay();for(const auto& mutation:replay.mutations){recording::DerivedJobRecordV1 job;
        if(recording::ParseDerivedJobRecord(mutation.payload_json,&job,nullptr))++transitions;}
    std::string media_manifest;for(const auto& candidate:store.catalog.RetentionSnapshot().candidates)if(candidate.segment_v2){
        const auto location=store.catalog.FindSegmentMediaLocation(candidate.segment_v2->segment_id);NeedRecovery(bool(location));
        media_manifest+=location->second.generic_string()+"\t"+Hash(Bytes(location->first/location->second))+"\n";}
    NeedRecovery(store.catalog.RetentionSnapshot().durable_reservations.empty()&&outputs==8&&transitions==24);
    WriteRecovery(oracle/"media.txt",media_manifest);WriteRecovery(oracle/"journal.sha256",Hash(Bytes(store.journal.path())));
    std::cout<<"[recovery-realistic-shape] {\"inputAU\":1500,\"sources\":6,\"samplesPerSource\":250,\"sourceSamples\":"<<source_samples
        <<",\"sourceMappings\":"<<mappings<<",\"sourceFileEvidence\":"<<file_proofs<<",\"completeJobs\":4,\"outputFiles\":"<<outputs
        <<",\"outputAccessUnits\":"<<output_aus<<",\"fullySatisfiedJobs\":"<<satisfied<<",\"jobTransitions\":"<<transitions<<",\"journalRows\":"<<replay.mutations.size()
        <<",\"journalBytes\":"<<Bytes(store.journal.path()).size()<<",\"historicalByteReproduction\":false}\n";
    std::cout<<"[pass] recovery realistic six-source four-complete-job fixture preserves output evidence\n[summary] pass=1 fail=0\n";
}
#if LP24_RECOVERY_CONTENT
using Catalog=recording::RecordingCatalog;
using Context=Catalog::RecoveryContentContext;
using Scope=Catalog::RecoveryContentScope;
void DiagnoseRealistic(const std::filesystem::path& root,bool strict,bool sqlite){
    const auto started=std::chrono::steady_clock::now();const auto reference=Bytes(root.parent_path()/"expected/target-reference");
    std::string intent_hash;std::size_t outputs=0;std::int64_t open_us=0;
    {
        Reopened store(root,sqlite);std::string error;recovery_content_probe::strict_only=strict;
        recovery_content_probe::Reset();recovery_content_probe::enabled=true;
        NeedRecovery(store.journal.Open(&error)&&store.catalog.Open(&error));
        open_us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-started).count();
        bool cold=true;for(const auto& [id,entry]:store.catalog.source_bindings_){(void)id;cold=cold&&!entry.resident;}
        for(const auto& [id,entry]:store.catalog.derived_jobs_){(void)id;cold=cold&&!entry.resident;}
        NeedRecovery(cold&&!store.catalog.recovery_content_&&!store.catalog.recovery_envelope_);
        recording::RecordingDerivedReferenceResult result;NeedRecovery(store.catalog.QueryDerivedReferenceResult(reference,&result,&error)&&!result.truncated&&result.jobs.size()==1);
        const auto& item=result.jobs.front();NeedRecovery(item.job.state==recording::DerivedJobState::Complete&&item.job.ready&&item.job.ready->verified_output);
        intent_hash=Hash(recording::SerializeDerivedJobIntent(item.job.intent));outputs=item.outputs.size();NeedRecovery(outputs==2&&intent_hash==Bytes(root.parent_path()/"expected/target-intent.sha256"));
        recovery_content_probe::enabled=false;recovery_content_probe::strict_only=false;
    }
    const auto total_us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-started).count();
    NeedRecovery(total_us<15000000);
    std::cout<<"[recovery-realistic-result] {\"strictBaseline\":"<<(strict?"true":"false")<<",\"sqlite\":"<<(sqlite?"true":"false")
        <<",\"openUs\":"<<open_us<<",\"totalUs\":"<<total_us<<",\"coldBindings\":6,\"coldJobs\":4,\"proofReleased\":true,\"jobCount\":1,\"state\":\"complete\",\"outputs\":"<<outputs
        <<",\"intentSha256\":\""<<intent_hash<<"\",\"fullSemanticOracle\":false}\n";
    for(std::size_t i=0;i<recovery_content_probe::counts.size();++i){const auto& value=recovery_content_probe::counts[i];
        std::cout<<"[recovery-realistic-cost] {\"phase\":"<<i<<",\"parses\":"<<value.parses<<",\"serializes\":"<<value.serializes<<",\"calls\":"<<value.calls<<"}\n";}
    std::cout<<"[diagnostic] bounded state read only; full semantic oracle is separate\n[summary] pass=0 fail=0\n";
}
void VerifyRealistic(const std::filesystem::path& root,bool strict,bool sqlite){
    const auto oracle=root.parent_path()/"expected";const auto started=std::chrono::steady_clock::now();
    Reopened store(root,sqlite);std::string error;recovery_content_probe::strict_only=strict;
    recovery_content_probe::Reset();recovery_content_probe::enabled=true;
    const bool opened=store.journal.Open(&error)&&store.catalog.Open(&error);recovery_content_probe::enabled=false;recovery_content_probe::strict_only=false;
    NeedRecovery(opened);const auto open_us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-started).count();
    bool cold=true;for(const auto& [id,entry]:store.catalog.source_bindings_){(void)id;cold=cold&&!entry.resident;}
    for(const auto& [id,entry]:store.catalog.derived_jobs_){(void)id;cold=cold&&!entry.resident;}
    NeedRecovery(cold&&!store.catalog.recovery_content_&&!store.catalog.recovery_envelope_);
    std::size_t outputs=0;for(int index=0;index<4;++index){const auto expected=Bytes(oracle/("job-"+std::to_string(index)+".json"));recording::DerivedJobRecordV1 job;
        NeedRecovery(recording::ParseDerivedJobRecord(expected,&job,&error)&&Job(store.catalog,job.intent.job_id)==expected);
        if(sqlite){sqlite3_stmt* statement=nullptr;NeedRecovery(sqlite3_prepare_v2(store.catalog.sqlite_db_,"SELECT payload_json FROM recording_derived_jobs WHERE job_id=?",-1,&statement,nullptr)==SQLITE_OK);
            sqlite3_bind_text(statement,1,job.intent.job_id.c_str(),-1,SQLITE_TRANSIENT);const bool row=sqlite3_step(statement)==SQLITE_ROW;
            const auto* text=row?sqlite3_column_text(statement,0):nullptr;const bool same=text&&std::string(reinterpret_cast<const char*>(text))==expected;
            sqlite3_finalize(statement);NeedRecovery(same);}
        for(const auto& output:job.ready->outputs){const auto location=store.catalog.FindSegmentMediaLocation(output.segment.segment_id);NeedRecovery(bool(location)&&Hash(Bytes(location->first/location->second))==output.segment.checksum_sha256);++outputs;}}
    std::istringstream manifest(Bytes(oracle/"media.txt"));std::string line;std::size_t media_count=0;
    while(std::getline(manifest,line)){const auto tab=line.find('\t');NeedRecovery(tab!=std::string::npos);const auto relative=std::filesystem::path(line.substr(0,tab));
        NeedRecovery(!relative.is_absolute()&&relative.lexically_normal()==relative&&line.substr(0,tab).find("..") == std::string::npos);
        NeedRecovery(Hash(Bytes(root/relative))==line.substr(tab+1));++media_count;}
    NeedRecovery(outputs==8&&media_count==14&&Hash(Bytes(store.journal.path()))==Bytes(oracle/"journal.sha256")&&store.catalog.RetentionSnapshot().durable_reservations.empty());
    const auto total_us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-started).count();
    std::cout<<"[recovery-realistic-verification] {\"strictBaseline\":"<<(strict?"true":"false")<<",\"sqlite\":"<<(sqlite?"true":"false")
        <<",\"openUs\":"<<open_us<<",\"totalUs\":"<<total_us<<",\"coldBindings\":6,\"coldJobs\":4,\"canonicalAndBytesEqual\":true,\"proofReleased\":true}\n";
}
struct Primed {
    Reopened store;
    Context context;
    Scope scope;
    recording::RecordingMutationHandles owned;
    recording::RecordingJournalOwnedViews views;
    recording::RecordingJournalReplayResult replay;
    explicit Primed(const std::filesystem::path& root):store(root,true),context(&store.catalog),scope(store.catalog,&context,0,{}){
        std::string error;NeedRecovery(store.journal.Open(&error)&&store.catalog.Open(&error));
        NeedRecovery(store.catalog.ReadCatalogReplay(&owned,&replay,&error,&views));context.original=&owned;
        NeedRecovery(store.catalog.PreflightV2Locked(replay,&error,nullptr,{},nullptr,owned,views));context.collecting=false;
        NeedRecovery(!context.entries.empty());
    }
};
std::filesystem::path CopyRecovery(const std::filesystem::path& source,const char* name){const auto destination=source.parent_path()/name;
    NeedRecovery(!std::filesystem::exists(destination));std::filesystem::copy(source,destination,std::filesystem::copy_options::recursive);return destination;}
template<class Check> void Negatives(const std::filesystem::path& root,const std::string& job_id,const std::string& expected,Check check){
    recovery_stage="negative-r06";
    {
        Primed p(root);auto& catalog=p.store.catalog;const auto& entry=p.context.entries.back();bool rejected=true;
        for(int field=0;field<6;++field){auto changed=std::make_shared<recording::RecordingMutationV1>(*entry.envelope);
            if(field==0)changed->schema="invalid";if(field==1)changed->mutation_id+="-changed";if(field==2)changed->entity_id+="-changed";
            if(field==3)++changed->occurred_at_ms;if(field==4)changed->mutation_type=recording::RecordingMutationType::Unknown;if(field==5)changed->payload_json+=" ";
            Scope row(catalog,&p.context,entry.ordinal,changed);rejected=rejected&&!catalog.RecoveryContentLocked(*changed);
        }
        Catalog other(p.store.journal,Store::Options(root));Context foreign(&other);foreign.collecting=false;foreign.entries=p.context.entries;
        {Scope row(catalog,&foreign,entry.ordinal,entry.envelope);rejected=rejected&&!catalog.RecoveryContentLocked(*entry.envelope);}
        auto changed_time=p.replay;auto changed_owned=p.owned;++changed_time.mutations[entry.ordinal].occurred_at_ms;
        changed_owned[entry.ordinal]=std::make_shared<const recording::RecordingMutationV1>(changed_time.mutations[entry.ordinal]);
        std::string changed_error;recovery_content_probe::Reset();recovery_content_probe::enabled=true;
        const bool fallback=catalog.PreflightV2Locked(changed_time,&changed_error,nullptr,{},nullptr,changed_owned,{});recovery_content_probe::enabled=false;
        check(rejected&&fallback&&recovery_content_probe::counts[1].parses>0,"recovery proof rejects changed envelope identity and payload");
        recovery_stage="negative-r07";
        auto duplicate=p.replay;duplicate.mutations.push_back(*entry.envelope);auto duplicate_owned=p.owned;duplicate_owned.push_back(entry.envelope);
        bool ordinal_rejected=false;{Scope wrong(catalog,&p.context,entry.ordinal+1,entry.envelope);ordinal_rejected=!catalog.RecoveryContentLocked(*entry.envelope);}
        std::string error;const bool duplicate_ok=catalog.PreflightV2Locked(duplicate,&error,nullptr,{},nullptr,duplicate_owned,{});
        ++duplicate.mutations.back().occurred_at_ms;duplicate_owned.back()=std::make_shared<const recording::RecordingMutationV1>(duplicate.mutations.back());
        check(ordinal_rejected&&duplicate_ok&&!catalog.PreflightV2Locked(duplicate,&error,nullptr,{},nullptr,duplicate_owned,{}),
              "recovery proof preserves physical ordinal and duplicate collision rules");
        recovery_stage="negative-r08";
        bool historical=true;std::size_t jobs=0;bool intent=false,complete=false;
        for(const auto& value:p.context.entries)if(value.job){++jobs;historical=historical&&recording::SerializeDerivedJobRecord(*value.job)==value.envelope->payload_json;
            intent=intent||value.job->state==recording::DerivedJobState::Intent;complete=complete||value.job->state==recording::DerivedJobState::Complete;}
        check(historical&&jobs==6&&intent&&complete,"recovery proof never substitutes latest job for historical transition");
        recovery_stage="negative-r09";
        const auto first=std::find_if(p.context.entries.begin(),p.context.entries.end(),[](const auto& e){return e.job&&e.envelope->mutation_type==recording::RecordingMutationType::DerivedJobIntent;});
        NeedRecovery(first!=p.context.entries.end());Catalog scratch(p.store.journal,Store::Options(root));
        bool source_rejected=false;{Scope row(scratch,&p.context,first->ordinal,first->envelope);source_rejected=!scratch.ApplyMutationLocked(*first->envelope,false,&error,nullptr,first->envelope);}
        const auto ready=std::find_if(p.context.entries.begin(),p.context.entries.end(),[](const auto& e){return e.job&&e.envelope->mutation_type==recording::RecordingMutationType::DerivedJobReady;});
        NeedRecovery(ready!=p.context.entries.end());bool cached_boundaries=true;
        for(int boundary=0;boundary<3;++boundary){Catalog before_ready(p.store.journal,Store::Options(root));
            for(std::size_t i=0;i<ready->ordinal;++i){Scope row(before_ready,&p.context,i,p.owned[i]);NeedRecovery(before_ready.ApplyMutationLocked(*p.owned[i],false,&error,nullptr,p.owned[i],nullptr,nullptr,nullptr,p.views[i]));}
            if(boundary==0)before_ready.orders_v2_.erase(ready->job->ready->outputs.front().segment.order_request_id);
            if(boundary==1)before_ready.states_v2_[ready->job->intent.sources.front().segment.segment_id].lifecycle=recording::RecordingLifecycle::DeletionPending;
            if(boundary==2)before_ready.media_relpaths_.erase(ready->job->intent.sources.front().segment.segment_id);
            Scope row(before_ready,&p.context,ready->ordinal,ready->envelope);NeedRecovery(before_ready.RecoveryContentLocked(*ready->envelope)!=nullptr);
            recovery_content_probe::Reset();recovery_content_probe::enabled=true;
            const bool accepted=before_ready.ApplyMutationLocked(*ready->envelope,false,&error,nullptr,ready->envelope,nullptr,nullptr,nullptr,p.views[ready->ordinal]);
            recovery_content_probe::enabled=false;cached_boundaries=cached_boundaries&&!accepted&&recovery_content_probe::counts[0].parses==0;
        }
        // 같은 엄격 재생에서 Intent 직후의 활성 source 보호가 유지되는지도 별도 확인한다.
        Catalog active(p.store.journal,Store::Options(root));bool applied=true;
        for(std::size_t i=0;i<=first->ordinal&&applied;++i){Scope row(active,&p.context,i,p.owned[i]);applied=active.ApplyMutationLocked(*p.owned[i],false,&error,nullptr,p.owned[i],nullptr,nullptr,nullptr,p.views[i]);}
        bool protected_sources=applied;for(const auto& source:first->job->intent.sources)protected_sources=protected_sources&&active.DerivedJobProtectsLocked(source.segment.segment_id);
        recording::RecordingSegmentStateV2 deletion;deletion.segment_id=first->job->intent.sources.front().segment.segment_id;
        deletion.lifecycle=recording::RecordingLifecycle::DeletionPending;deletion.reason="continuous-capacity";
        recording::RecordingMutationV1 mutation;mutation.mutation_id="recovery-active-delete";mutation.entity_id=deletion.segment_id;
        mutation.mutation_type=recording::RecordingMutationType::SegmentV2State;mutation.payload_json=recording::SerializeRecordingSegmentStateV2(deletion);
        check(source_rejected&&cached_boundaries&&protected_sources&&!active.ApplyMutationLocked(mutation,false,&error),"recovery reused content preserves reservation source deletion and hold checks");
    }
    {
        recovery_stage="negative-r10";
        const auto copy=CopyRecovery(root,"changed-replay");Primed p(copy);
        const auto entry=std::find_if(p.context.entries.begin(),p.context.entries.end(),[](const auto& e){return bool(e.job);});NeedRecovery(entry!=p.context.entries.end());
        auto changed=entry->job->intent.reference;changed.reference_id+="-new";std::string error;NeedRecovery(p.store.catalog.PutConsumerReference(changed,&error));
        recovery_content_probe::Reset();recovery_content_probe::enabled=true;const bool rebuilt=p.store.catalog.RebuildSqliteLocked(&error);recovery_content_probe::enabled=false;
        const bool invalidated=rebuilt&&!p.context.valid&&p.context.entries.empty()&&recovery_content_probe::counts[2].parses>0&&Job(p.store.catalog,job_id)==expected;
        const auto tamper_copy=CopyRecovery(root,"tampered-replay");Primed tampered(tamper_copy);auto bytes=Bytes(tampered.store.journal.path());
        const auto at=bytes.rfind(job_id);NeedRecovery(at!=std::string::npos);bytes[at]=bytes[at]=='a'?'b':'a';WriteRecovery(tampered.store.journal.path(),bytes);
        check(invalidated&&!tampered.store.catalog.RebuildSqliteLocked(&error),
              "recovery journal change invalidates reuse and retains strict corruption rejection");
    }
    {
        recovery_stage="negative-r11";
        const auto copy=CopyRecovery(root,"pending-replay");const auto durable=Bytes(ManagedRecoveryPath(copy));const auto prefix=durable.substr(0,10);
        NeedRecovery(prefix.size()==10&&prefix!=durable);WriteRecovery(copy/".recording-checkpoint.tmp",prefix);
        Reopened p(copy,true);std::string error;NeedRecovery(p.journal.Open(&error));recovery_content_probe::Reset();recovery_content_probe::enabled=true;
        const bool opened=p.catalog.Open(&error);recovery_content_probe::enabled=false;
        check(opened&&recovery_content_probe::counts[0].parses>0&&recovery_content_probe::counts[2].parses>0&&Job(p.catalog,job_id)==expected&&
              !std::filesystem::exists(copy/".recording-checkpoint.tmp"),"recovery pending checkpoint uses strict fallback");
    }
    {
        recovery_stage="negative-r12";
        bool fallback=true;
        for(int mode=0;mode<3;++mode){Primed p(root);p.context.entries.clear();p.context.charge=0;p.context.collecting=true;
            if(mode==0)p.context.budget=0;else if(mode==1)p.context.limit=0;else recovery_content_probe::fail_admission=true;
            std::string error;const bool valid=p.store.catalog.PreflightV2Locked(p.replay,&error,nullptr,{},nullptr,p.owned,p.views);
            fallback=fallback&&valid&&p.store.catalog.derived_job_state_authoritative_&&p.context.charge<=p.context.budget&&p.context.entries.size()<=p.context.limit;
            if(mode<2)fallback=fallback&&p.context.entries.empty();else fallback=fallback&&!recovery_content_probe::fail_admission;
            p.context.collecting=false;fallback=fallback&&p.store.catalog.RebuildSqliteLocked(&error)&&Job(p.store.catalog,job_id)==expected;
        }
        check(fallback,"recovery budget exhaustion and admission exception preserve strict results");
    }
    {
        recovery_stage="negative-r13";
        std::vector<std::weak_ptr<const recording::DerivedJobRecordV1>> weak;bool scopes=true;
        Reopened store(root,true);std::string error;NeedRecovery(store.journal.Open(&error)&&store.catalog.Open(&error));
        for(int mode=0;mode<3;++mode){Context context(&store.catalog);recording::RecordingMutationHandles owned;recording::RecordingJournalReplayResult replay;recording::RecordingJournalOwnedViews views;
            try{Scope outer(store.catalog,&context,7,{});NeedRecovery(store.catalog.ReadCatalogReplay(&owned,&replay,&error,&views));context.original=&owned;
                NeedRecovery(store.catalog.PreflightV2Locked(replay,&error,nullptr,{},nullptr,owned,views));for(const auto& e:context.entries)if(e.job)weak.push_back(e.job);
                {Scope inner(store.catalog,&context,9,{});scopes=scopes&&store.catalog.recovery_ordinal_==9;}
                scopes=scopes&&store.catalog.recovery_ordinal_==7;
                if(mode==1){auto invalid=replay;invalid.mutations.front().schema="invalid";scopes=scopes&&!store.catalog.PreflightV2Locked(invalid,&error,nullptr,{},nullptr,owned,views);}
                if(mode==2)throw std::runtime_error("fixed-scope-exception");
            }catch(...){if(mode!=2)throw;}
            scopes=scopes&&!store.catalog.recovery_content_&&!store.catalog.recovery_envelope_;
        }
        bool expired=!weak.empty();for(const auto& value:weak)expired=expired&&value.expired();
        check(scopes&&expired,"recovery proof ownership ends on success failure and exception");
    }
    {
        recovery_stage="negative-r14";
        const auto copy=CopyRecovery(root,"whitespace-binding");std::string serialized,binding_canonical,id;
        {recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{copy,"probe-store"});std::string error;NeedRecovery(journal.Open(&error));
            for(auto m:journal.Replay().mutations){if(binding_canonical.empty()&&m.mutation_type==recording::RecordingMutationType::SegmentV2BoundFinalized){
                const auto marker=m.payload_json.find("\"sourceBinding\":");NeedRecovery(marker!=std::string::npos);const auto begin=m.payload_json.find('{',marker);
                NeedRecovery(begin!=std::string::npos);m.payload_json.insert(begin+1," \t ");id=m.entity_id;
                // 원래 공개 binding과 SQLite의 canonical 바이트를 별도로 대조한다.
                Reopened original(root,false);NeedRecovery(original.journal.Open(&error)&&original.catalog.Open(&error));const auto binding=original.catalog.FindSourceBinding(id);NeedRecovery(bool(binding));binding_canonical=recording::SerializeRecordingSourceBindingV1(*binding);
            }serialized+=recording::SerializeRecordingMutationV1(m)+"\n";}}
        WriteRecovery(ManagedRecoveryPath(copy),serialized);Reopened store(copy,true);std::string error;NeedRecovery(store.journal.Open(&error)&&store.catalog.Open(&error));
        sqlite3_stmt* statement=nullptr;NeedRecovery(sqlite3_prepare_v2(store.catalog.sqlite_db_,"SELECT payload_json FROM recording_source_bindings WHERE segment_id=?",-1,&statement,nullptr)==SQLITE_OK);
        sqlite3_bind_text(statement,1,id.c_str(),-1,SQLITE_TRANSIENT);const bool row=sqlite3_step(statement)==SQLITE_ROW;std::string saved;
        if(row){const auto* text=sqlite3_column_text(statement,0);if(text)saved=reinterpret_cast<const char*>(text);}sqlite3_finalize(statement);
        check(row&&saved==binding_canonical&&Bytes(store.journal.path())==serialized,"recovery noncanonical binding preserves existing sqlite canonical bytes");
    }
}
#endif
}
int main(int argc,char** argv){
    if(argc<2||argc>3)return 2;const std::string mode=argc==3?argv[2]:"initial";const bool full=mode=="full";
    gst_init(nullptr,nullptr);int pass=0,fail=0;
    const auto check=[&](bool ok,const char* title){std::cout<<(ok?"[pass] ":"[fail] ")<<title<<'\n';ok?++pass:++fail;};
    try {
        if(mode=="prepare-realistic"||mode=="prepare-native"||mode=="prepare-legacy"){
            PrepareRealistic(std::filesystem::path(argv[1])/"realistic",mode!="prepare-legacy");return 0;}
#if LP24_RECOVERY_CONTENT
        if(mode=="recover-realistic"||mode=="strict-realistic"||mode=="jsonl-realistic"){
            DiagnoseRealistic(std::filesystem::path(argv[1])/"realistic",mode=="strict-realistic",mode!="jsonl-realistic");return 0;}
        if(mode=="verify-realistic"){
            for(int variant=0;variant<3;++variant)VerifyRealistic(std::filesystem::path(argv[1])/"realistic",variant==2,variant!=1);
            std::cout<<"[semantic-oracle] all four job canonical values and fourteen media hashes match prepared bytes\n[summary] pass=0 fail=0\n";return 0;}
#endif
        if(mode!="initial"&&!full)throw std::runtime_error("recovery-mode");
        const auto root=std::filesystem::path(argv[1])/"store";
        std::string job_id,expected,journal_before;std::vector<std::pair<std::filesystem::path,std::string>> media;
        std::size_t job_mutations=0;
        {
            Store store(root);const auto intent=PrepareMedia(store,false);job_id=intent.job_id;
            recording::DerivedJobService service(store.catalog,store.journal,{root,30000,{}});
            if(!service.Run(job_id).complete)throw std::runtime_error("fixture-complete");
            expected=Job(store.catalog,job_id);
            recording::DerivedJobRecordV1 completed;if(!recording::ParseDerivedJobRecord(expected,&completed,nullptr)||!completed.ready||!completed.ready->verified_output||completed.ready->outputs.size()!=2)throw std::runtime_error("fixture-ready-proof");
            std::cout<<"[recovery-small-shape] {\"state\":\"complete\",\"verifiedOutput\":true,\"outputs\":2,\"requestFullySatisfied\":"
                <<(completed.ready->request_fully_satisfied?"true":"false")<<",\"unfulfilled\":"<<completed.ready->unfulfilled.size()<<"}\n";
            for(const auto& output:intent.outputs)media.emplace_back(root/output.final_relpath,Bytes(root/output.final_relpath));
            journal_before=Bytes(store.journal.path());
        }
        // 타입 카운트는 공개 parser로 독립 확인한다. 측정은 Open 구간만 활성화한다.
        job_mutations=0;
        {
            recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{root,"probe-store"});std::string error;
            if(!journal.Open(&error))throw std::runtime_error("fixture-journal");
            for(const auto& mutation:journal.Replay().mutations)if(mutation.entity_id==job_id){recording::DerivedJobRecordV1 parsed;
                if(recording::ParseDerivedJobRecord(mutation.payload_json,&parsed,nullptr))++job_mutations;}
        }
        std::array<recovery_content_probe::Count,4> first{};std::string sql_result;std::int64_t open_us=0;
        {
            Reopened store(root,true);std::string error;if(!store.journal.Open(&error))throw std::runtime_error("fixture-open-journal");
            recovery_content_probe::Reset();recovery_content_probe::enabled=true;
            const auto started=std::chrono::steady_clock::now();const bool opened=store.catalog.Open(&error);
            open_us=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-started).count();
            recovery_content_probe::enabled=false;first=recovery_content_probe::counts;
            if(!opened)throw std::runtime_error("fixture-open-catalog");sql_result=Job(store.catalog,job_id);
            check(job_mutations>0&&first[1].calls==1&&first[1].parses==job_mutations,"recovery first preflight retains strict content validation");
            check(sql_result==expected&&first[0].parses==0,"recovery actual apply reuses validated content and preserves transitions");
            check(first[2].calls==1&&first[3].calls>0&&first[2].parses==0&&first[3].parses==0&&first[3].serializes==0,
                  "recovery sqlite preflight and projection reuse exact validated content");
            if(Bytes(store.journal.path())!=journal_before)throw std::runtime_error("fixture-bytes");
        }
        {
            Reopened store(root,false);std::string error;if(!store.journal.Open(&error))throw std::runtime_error("fixture-jsonl-journal");
            recovery_content_probe::Reset();recovery_content_probe::enabled=true;const bool opened=store.catalog.Open(&error);recovery_content_probe::enabled=false;
            if(!opened)throw std::runtime_error("fixture-jsonl-catalog");bool unchanged=Bytes(store.journal.path())==journal_before;
            for(const auto& [file,bytes]:media)unchanged=unchanged&&Bytes(file)==bytes;
            check(unchanged&&Job(store.catalog,job_id)==sql_result&&sql_result==expected,"recovery sqlite and jsonl return identical public values and durable bytes");
            check(recovery_content_probe::counts[1].calls==1&&recovery_content_probe::counts[1].parses==job_mutations,
                  "recovery new open performs fresh strict validation");
        }
        std::cout<<"[recovery-count] {\"jobMutations\":"<<job_mutations<<",\"firstPreflightParses\":"<<first[1].parses
            <<",\"actualApplyParses\":"<<first[0].parses<<",\"rebuildPreflightParses\":"<<first[2].parses
            <<",\"projectionParses\":"<<first[3].parses<<",\"projectionSerializes\":"<<first[3].serializes<<"}\n";
        std::cout<<"[recovery-cost] {\"openUs\":"<<open_us<<",\"firstPreflightSerializes\":"<<first[1].serializes
            <<",\"actualApplySerializes\":"<<first[0].serializes<<",\"rebuildPreflightSerializes\":"<<first[2].serializes
            <<",\"projectionSerializes\":"<<first[3].serializes<<",\"realisticFixture\":false}\n";
#if LP24_RECOVERY_CONTENT
        if(full)Negatives(root,job_id,expected,check);
#else
        if(full)throw std::runtime_error("recovery-capability");
#endif
        std::cout<<(full?"[not-run] realistic fifteen-second fixture: 2\n":"[not-run] private recovery counterexamples and realistic fifteen-second fixture: 11\n");
    }catch(...){recovery_content_probe::enabled=false;++fail;std::cout<<"[recovery-error] stage="<<recovery_stage<<" class=preparation-exception\n[fail] recovery fixed fixture preparation failure\n";}
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
