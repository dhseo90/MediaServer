// 파일 용도: 실제 compact job 계약과 catalog/retention 원자 경계를 격리 검증한다.
#include "recording/recording_derived_job.h"
#include "recording/recording_derived_selection.h"
#include <iostream>
#include <fstream>
#include <atomic>
#include <thread>
#include <sqlite3.h>

namespace {
using namespace recording;
void Require(bool ok,const std::string& error) { if(!ok)throw std::runtime_error(error); }
struct Store {
    std::filesystem::path root;
    RecordingJournal journal;
    std::unique_ptr<RecordingCatalog> catalog;
    std::string error;
    explicit Store(const std::filesystem::path& path,bool sql=true):root(path),journal(RecordingJournal::ManagedOptions{path,"store"}) {
        Require(journal.Open(&error),error);
        Open(sql);
    }
    void Open(bool sql) {
        RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,sql);options.enable_v2_storage=true;
        catalog=std::make_unique<RecordingCatalog>(journal,options);
        Require(catalog->Open(&error),error);
    }
    void Add(const DerivedSourceEvidence& source) {
        const auto& s=source.segment;RecordingOrderReservationV1 order;
        Require(journal.ReserveRecordingOrder(s.store_id,s.order_request_id,s.segment_id,s.channel_id,&order,&error),error);
        Require(order.sequence==s.order_sequence,"fixture order 불일치");
        const auto path=root/(s.channel_id+"/"+s.segment_id+".mp4");std::filesystem::create_directories(path.parent_path());
        Require(WriteContainedFileDurably(root,path,"0123456789ab",&error),error);
        Require(catalog->FinalizeBoundSegmentV2(s,*source.binding,path.string(),&error),error);
    }
    RetentionCoordinator Coordinator(std::uint64_t* free=nullptr,bool* snapshots=nullptr,bool* space=nullptr) {
        return RetentionCoordinator(*catalog,[this,snapshots]{auto s=catalog->RetentionSnapshot();if(snapshots&&!*snapshots){s.authoritative=false;s.error="fixture snapshot 실패";}return s;},
            [free,space](auto* bytes,auto* error){if(space&&!*space){if(error)*error="fixture disk 실패";return false;}*bytes=free?*free:100000;return true;},
            [](const auto&,auto*){return false;},{0,1,root});
    }
    std::uint64_t Hold(const std::string& id) {
        for(const auto& candidate:catalog->RetentionSnapshot().candidates)if(candidate.Id()==id)return candidate.hold_count;
        return 0;
    }
};
std::string SqlJob(const std::filesystem::path& path) {
    sqlite3* db=nullptr;sqlite3_stmt* stmt=nullptr;std::string result;
    if(sqlite3_open_v2(path.c_str(),&db,SQLITE_OPEN_READONLY,nullptr)==SQLITE_OK&&
       sqlite3_prepare_v2(db,"SELECT payload_json FROM recording_derived_jobs",-1,&stmt,nullptr)==SQLITE_OK&&sqlite3_step(stmt)==SQLITE_ROW) {
        const auto* value=sqlite3_column_text(stmt,0);if(value)result=reinterpret_cast<const char*>(value);
    }
    if(stmt)sqlite3_finalize(stmt);if(db)sqlite3_close(db);return result;
}
std::pair<int,int> Extended(const std::filesystem::path& root,const DerivedSourceEvidence& source,
                          const DerivedRecordingSelection& selection,const DerivedJobIntentV1& job) {
    int pass=0,fail=0;std::string error;
    const auto check=[&](bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++pass:++fail;};
    const auto build=[&](const std::string& id,std::uint64_t bytes=4096,std::int64_t now=10) {
        auto chosen=selection;chosen.reference.reference_id=id;DerivedJobIntentV1 result;
        Require(BuildDerivedJobIntent(chosen,{source},bytes,now,&result,&error),error);return result;
    };
    DerivedJobIntentV1 later;
    Require(BuildDerivedJobIntent(selection,{source},4096,100,&later,&error),error);
    auto changed=selection;changed.reference.request->end_ms=10;changed.expanded_end_ns=10000000;
    changed.slices.erase(std::remove_if(changed.slices.begin(),changed.slices.end(),[](const auto& s){return s.start_ns>=10000000;}),changed.slices.end());
    DerivedJobIntentV1 selected;
    check(later.job_id==job.job_id&&later.created_at_ms==100&&BuildDerivedJobIntent(changed,{source},4096,10,&selected,&error)&&selected.job_id!=job.job_id,"J02 이후 시각 재Build ID 유지·선택 변경 새 ID");
    const auto json=SerializeDerivedJobIntent(job);DerivedJobIntentV1 parsed;
    auto unsupported=json;unsupported.replace(unsupported.find("intent.v1"),9,"intent.v9");
    bool strict=!ParseDerivedJobIntent(json.substr(0,json.size()-1)+",\"extra\":1}",&parsed,&error)&&
        !ParseDerivedJobIntent("{\"schema\":\"duplicate\","+json.substr(1),&parsed,&error)&&
        !ParseDerivedJobIntent(unsupported,&parsed,&error)&&!ParseDerivedJobIntent(json.substr(0,json.size()-1),&parsed,&error)&&
        !ParseDerivedJobIntent(std::string(4*1024*1024+1,' '),&parsed,&error);
    auto invalid=job;invalid.reserved_bytes=0;strict=strict&&!ValidateDerivedJobIntent(invalid,&error);
    invalid=job;invalid.reserved_bytes=256ULL*1024*1024+1;strict=strict&&!ValidateDerivedJobIntent(invalid,&error);
    DerivedJobRecordV1 record;record.intent=job;record.state=DerivedJobState::Ready;
    strict=strict&&SerializeDerivedJobRecord(record).empty();record.state=DerivedJobState::Committed;strict=strict&&SerializeDerivedJobRecord(record).empty();
    record.state=DerivedJobState::Complete;strict=strict&&SerializeDerivedJobRecord(record).empty();
    check(strict,"J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부");
    invalid=job;invalid.outputs[0].temporary_relpath="../escape";
    bool plans=!ValidateDerivedJobIntent(invalid,&error);invalid=job;invalid.attempt_id+="-retry";plans=plans&&!ValidateDerivedJobIntent(invalid,&error);
    invalid=job;invalid.outputs[0].order_request_id="reused";plans=plans&&!ValidateDerivedJobIntent(invalid,&error);
    check(plans,"J16 소유 경로·attempt·order 계획 조작 거부");
    {
        auto first=source,second=source;
        first.segment.segment_id="z-first";first.segment.order_request_id="first-order";first.segment.media_end_pts=10000000;
        first.segment.mappings[0].end_pts=10000000;first.segment.mappings[0].utc_end_ns=110000000;
        first.binding->segment_id="z-first";first.binding->samples={{1,0}};first.binding->last_accepted_ordinal=1;
        second.segment.segment_id="a-second";second.segment.order_request_id="second-order";second.segment.order_sequence=2;second.segment.media_start_pts=10000000;
        second.segment.mappings[0].start_pts=10000000;second.segment.mappings[0].utc_start_ns=110000000;
        second.binding->segment_id="a-second";second.binding->samples={{2,10000000}};
        analysis::DecodedIntervalCollector collector;
        for(int i=0;i<2;++i){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=i*10000000;e.duration_ns=10000000;e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",static_cast<std::uint64_t>(i*10000000)}};collector.Append(e);}
        DerivedRecordingSelection ordered;DerivedJobIntentV1 plan;
        const bool built=SelectDerivedRecording(selection.reference,*collector.Snapshot("tap-r0"),{second,first},nullptr,&ordered,&error)&&
            BuildDerivedJobIntent(ordered,{second,first},4096,10,&plan,&error);
        check(built&&plan.sources.size()==2&&plan.sources[0].segment.segment_id=="z-first"&&plan.sources[1].segment.segment_id=="a-second"&&
            plan.outputs[0].source_index==0&&plan.outputs[1].source_index==1,"J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획");
        if(!built)std::cout<<"[detail] J16 "<<error<<'\n';
    }
    {
        Store s(root/"retry");s.Add(source);auto coordinator=s.Coordinator();Require(coordinator.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error),error);
        Require(coordinator.AdmitDerivedJob(*s.catalog,job,10).created,"첫 intent");const auto count=s.journal.Replay().mutations.size();
        const auto retry=coordinator.AdmitDerivedJob(*s.catalog,later,100);
        auto budget=later;budget.reserved_bytes=4097;auto path=later;path.outputs[0].final_relpath="other.ts";
        Store foreign(root/"foreign");
        check(retry.accepted&&!retry.created&&retry.job&&retry.job->intent.created_at_ms==10&&
            !coordinator.AdmitDerivedJob(*s.catalog,budget,100).accepted&&!coordinator.AdmitDerivedJob(*s.catalog,path,100).accepted&&
            !coordinator.AdmitDerivedJob(*foreign.catalog,later,100).accepted&&s.journal.Replay().mutations.size()==count&&s.Hold("segment")==1,
            "J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부");
        const bool held=s.catalog->AdjustHoldCount("segment",1,&error)&&s.Hold("segment")==2&&
            s.catalog->AdjustHoldCount("segment",-1,&error)&&s.Hold("segment")==1&&!s.catalog->AdjustHoldCount("segment",-1,&error);
        RecordingTombstoneV2 tomb;tomb.tombstone_id="tomb";tomb.segment=source.segment;tomb.deletion_reason="continuous-capacity";tomb.deleted_at_ms=20;
        check(held&&!s.catalog->RequestDeletion("segment","continuous-capacity",&error)&&!s.catalog->MarkSegmentCorrupt("segment","checksum-mismatch",&error)&&
              !s.catalog->CompleteDeletionV2(tomb,&error),"J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단");
        Require(s.catalog->AdjustHoldCount("segment",1,&error),error);
        const bool cleaned=!s.catalog->FailDerivedJobAfterCleanup(job.job_id,"wrong","fixture-no-files",5,&error)&&
            s.catalog->FailDerivedJobAfterCleanup(job.job_id,job.attempt_id,"fixture-no-files",5,&error);
        const auto end=s.journal.Replay().mutations.size();const auto terminal=coordinator.AdmitDerivedJob(*s.catalog,later,200);
        check(cleaned&&s.Hold("segment")==1&&s.catalog->RetentionSnapshot().durable_reservations.empty()&&
            terminal.accepted&&!terminal.created&&terminal.job&&terminal.job->state==DerivedJobState::Failed&&
            s.catalog->FailDerivedJobAfterCleanup(job.job_id,job.attempt_id,"fixture-no-files",5,&error)&&s.journal.Replay().mutations.size()==end,
            "J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음");
    }
    bool live=true;
    for(const std::string mode:{"pending","corrupt","deleted","hash","binding"}) {
        Store s(root/("live-"+mode));auto actual=source;
        if(mode=="hash")actual.segment.checksum_sha256=std::string(64,'b');
        if(mode=="binding")actual.binding->source_generation="other";
        s.Add(actual);auto coordinator=s.Coordinator();Require(coordinator.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error),error);
        if(mode=="pending"||mode=="deleted")Require(s.catalog->RequestDeletion("segment","continuous-capacity",&error),error);
        if(mode=="corrupt")Require(s.catalog->MarkSegmentCorrupt("segment","checksum-mismatch",&error),error);
        if(mode=="deleted") {std::filesystem::remove(s.root/"channel/segment.mp4");RecordingTombstoneV2 tomb;tomb.tombstone_id="tomb";tomb.segment=actual.segment;tomb.deletion_reason="continuous-capacity";tomb.deleted_at_ms=20;Require(s.catalog->CompleteDeletionV2(tomb,&error),error);}
        live=live&&!coordinator.AdmitDerivedJob(*s.catalog,job,10).accepted&&s.catalog->RetentionSnapshot().durable_reservations.empty();
        std::cout<<"[detail] J05 "<<mode<<" 예약 없음="<<s.catalog->RetentionSnapshot().durable_reservations.empty()<<'\n';
    }
    check(live,"J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부");
    {
        Store s(root/"race");s.Add(source);auto coordinator=s.Coordinator();Require(coordinator.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error),error);
        std::atomic<bool> start{false};bool admitted=false,deleted=false;
        std::thread a([&]{while(!start.load())std::this_thread::yield();admitted=coordinator.AdmitDerivedJob(*s.catalog,job,10).accepted;});
        std::thread d([&]{while(!start.load())std::this_thread::yield();std::string e;deleted=s.catalog->RequestDeletion("segment","continuous-capacity",&e);});start=true;a.join();d.join();
        check(admitted!=deleted&&(!admitted||s.Hold("segment")==1),"J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용");
    }
    std::string saved;
    {
        Store s(root/"restart");s.Add(source);auto coordinator=s.Coordinator();Require(coordinator.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error),error);
        Require(coordinator.AdmitDerivedJob(*s.catalog,job,10).accepted,"restart intent");std::optional<DerivedJobRecordV1> found;
        Require(s.catalog->FindDerivedJob(job.job_id,&found,&error)&&found.has_value(),error);saved=SerializeDerivedJobRecord(*found);
        check(SqlJob(s.root/"recording-catalog.sqlite3")==saved&&s.catalog->Checkpoint(&error)&&s.Hold("segment")==1&&s.catalog->RetentionSnapshot().durable_reservations[0].bytes==4096,
            "J10 checkpoint 전후 job·보호·예약 유지");
    }
    bool parity=true;
    for(bool sql:{false,true}) {
        Store s(root/"restart",sql);std::optional<DerivedJobRecordV1> found;
        parity=parity&&s.catalog->FindDerivedJob(job.job_id,&found,&error)&&found&&SerializeDerivedJobRecord(*found)==saved&&s.Hold("segment")==1&&
            s.catalog->RetentionSnapshot().durable_reservations.size()==1&&s.catalog->RetentionSnapshot().durable_reservations[0].bytes==4096;
        if(sql)parity=parity&&SqlJob(s.root/"recording-catalog.sqlite3")==saved;
    }
    check(parity,"J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음");
    bool replay=true;int replay_index=0;
    for(const std::string mode:{"duplicate","different","malformed","schema","transition","protected-state","failed-without-intent"}) {
        const auto path=root/("replay-"+std::to_string(replay_index++));
        {
            Store s(path);s.Add(source);
            if(mode!="failed-without-intent") {auto c=s.Coordinator();Require(c.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error),error);Require(c.AdmitDerivedJob(*s.catalog,job,10).accepted,"replay intent");}
            RecordingMutationV1 mutation;mutation.mutation_id="replay-extra";mutation.mutation_type=RecordingMutationType::DerivedJobIntent;mutation.entity_id=job.job_id;mutation.occurred_at_ms=30;
            mutation.payload_json=saved;
            if(mode=="different") {auto altered=job;altered.reserved_bytes=4097;DerivedJobRecordV1 r;r.intent=altered;mutation.payload_json=SerializeDerivedJobRecord(r);}
            if(mode=="malformed")mutation.payload_json="{}";
            if(mode=="schema")mutation.payload_json.replace(mutation.payload_json.find("record.v1"),9,"record.v9");
            if(mode=="transition")mutation.payload_json.replace(mutation.payload_json.find("\"state\":\"intent\""),16,"\"state\":\"ready\"");
            if(mode=="protected-state") {RecordingSegmentStateV2 state;state.segment_id="segment";state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-capacity";mutation.mutation_type=RecordingMutationType::SegmentV2State;mutation.entity_id="segment";mutation.payload_json=SerializeRecordingSegmentStateV2(state);}
            if(mode=="failed-without-intent") {DerivedJobRecordV1 r;r.intent=job;r.state=DerivedJobState::Failed;r.failure_reason="fixture-no-files";r.cleaned_at_ms=5;mutation.mutation_type=RecordingMutationType::DerivedJobFailed;mutation.payload_json=SerializeDerivedJobRecord(r);}
            const auto journal_path=s.journal.path();s.catalog.reset();
            std::ofstream out(journal_path,std::ios::app);out<<SerializeRecordingMutationV1(mutation)<<'\n';
        }
        bool opened=false;std::uint64_t hold=0;
        try {Store s(path);opened=true;hold=s.Hold("segment");}catch(const std::exception& e){std::cout<<"[detail] J10 "<<mode<<" 거부="<<e.what()<<'\n';}
        replay=replay&&(mode=="duplicate"?(opened&&hold==1):!opened);
    }
    check(replay,"J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부");
    {
        Store s(root/"quota");s.Add(source);auto c=s.Coordinator();Require(c.UpdateChannelPolicy("channel",{100000,100000,6000,100000},&error),error);
        Require(c.AdmitEventWrite("channel","memory",1000,10).allowed,"memory 예약");
        const auto one=build("concurrent-one",4000),two=build("concurrent-two",4000);bool a=false,b=false;std::atomic<bool> start{false};
        std::thread first([&]{while(!start.load())std::this_thread::yield();a=c.AdmitDerivedJob(*s.catalog,one,10).accepted;});
        std::thread second([&]{while(!start.load())std::this_thread::yield();b=c.AdmitDerivedJob(*s.catalog,two,10).accepted;});start=true;first.join();second.join();
        check(a!=b&&!c.AdmitEventWrite("channel","overflow",2000,10).allowed&&s.catalog->RetentionSnapshot().durable_reservations.size()==1,
            "J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한");
    }
    {
        Store s(root/"disk");s.Add(source);std::uint64_t free=7000;auto c=s.Coordinator(&free);Require(c.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error),error);
        Require(c.AdmitDerivedJob(*s.catalog,job,10).accepted,"disk intent");
        const bool continuous=!c.AdmitContinuousWrite("channel",3000,10).allowed;
        const bool event=!c.AdmitEventWrite("channel","event",3000,10).allowed;
        const bool derived=!c.AdmitDerivedJob(*s.catalog,build("disk-second",3000),10).accepted;
        check(continuous&&event&&derived,"J12 durable outstanding을 continuous/event/derived disk 예약에 포함");
    }
    {
        Store s(root/"provider");s.Add(source);bool snapshots=false,space=true;auto c=s.Coordinator(nullptr,&snapshots,&space);Require(c.UpdateChannelPolicy("channel",{1,1,1,1},&error),error);
        const auto before=s.journal.Replay().mutations.size();
        bool closed=!c.AdmitDerivedJob(*s.catalog,job,10).accepted&&!c.AdmitContinuousWrite("channel",1,10).allowed&&!c.AdmitEventWrite("channel","event",1,10).allowed&&!c.RecoverPending(10).ok;
        c.RunPeriodic(100000);closed=closed&&s.journal.Replay().mutations.size()==before;
        snapshots=true;space=false;Require(c.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error),error);
        closed=closed&&!c.AdmitDerivedJob(*s.catalog,job,10).accepted&&!c.AdmitEventWrite("channel","event",1,10).allowed&&!c.AdmitContinuousWrite("channel",1,10).allowed;
        check(closed,"J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단");
    }
    {
        auto partial=selection;partial.complete=false;partial.reason="evidence-incomplete";partial.slices.back().state=DerivedSliceState::Unknown;partial.slices.back().reason="direct-duration-missing";
        DerivedJobIntentV1 captured;DerivedRecordingSelection restored;
        check(BuildDerivedJobIntent(partial,{source},4096,10,&captured,&error)&&RestoreDerivedJobSelection(captured,&restored,&error)&&!restored.complete&&
            restored.slices.back().state==DerivedSliceState::Unknown&&restored.slices.back().reason==partial.slices.back().reason&&restored.slices.back().candidates.size()==partial.slices.back().candidates.size()&&
            restored.reference.request->time_basis==partial.reference.request->time_basis,"J15 partial unknown·이유·후보·요청 시간축 그대로 보존");
    }
    {
        Store s(root/"owner-release");s.Add(source);
        {auto c=s.Coordinator();{auto rejected=s.Coordinator();}Require(c.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error),error);Require(c.AdmitDerivedJob(*s.catalog,job,10).accepted,"후발 소멸이 실제 소유 해제하면 안 됨");}
        auto next=s.Coordinator();Require(next.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error),error);
        check(next.AdmitDerivedJob(*s.catalog,later,100).accepted,"J19 정확한 소유자 소멸 후 새 coordinator만 재결박");
    }
    return {pass,fail};
}
} // namespace
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    using namespace recording;DerivedSourceEvidence source;auto& s=source.segment;
    s.segment_id="segment";s.source_id="source";s.channel_id="channel";s.store_id="store";s.order_request_id="order";s.order_sequence=1;
    s.media_epoch_id="epoch";s.media_end_pts=20000000;s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";
    s.size_bytes=12;s.checksum_sha256=std::string(64,'a');s.created_at_ms=1;s.finalized_at_ms=2;
    s.mappings={{"media-server.recording-utc-mapping.v1","map",0,20000000,"server-observation",100000000,120000000,1,"observed"}};
    RecordingSourceBindingV1 b;b.segment_id=s.segment_id;b.source_id=s.source_id;b.channel_id=s.channel_id;b.store_id=s.store_id;b.media_epoch_id=s.media_epoch_id;
    b.source_generation="gen";b.generation_order=1;b.track_id="video/0";b.samples={{1,0},{2,10000000}};b.last_accepted_ordinal=2;source.binding=b;
    RecordingConsumerReferenceV1 ref;ref.reference_id="request";ref.kind="event";ref.owner_id="event";ref.source_id=s.source_id;ref.channel_id=s.channel_id;
    ref.analysis_namespace="tap-r0";ref.analysis_track_id="track-1";ref.association_quality="timestamp-match";ref.original=RecordingConsumerOriginalV1{"gen",1,1,"video/0",0};
    ref.request=RecordingConsumerRequestV1{"media-pts-ms",0,20,0,0};
    analysis::DecodedIntervalCollector collector;
    for(int i=0;i<2;++i){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=i*10000000;e.duration_ns=10000000;
        e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",static_cast<std::uint64_t>(i*10000000)}};collector.Append(e);}
    DerivedRecordingSelection selection;std::string error;
    if(!SelectDerivedRecording(ref,*collector.Snapshot("tap-r0"),{source},nullptr,&selection,&error)){std::cerr<<"[setup-fail] "<<error<<'\n';return 2;}
    DerivedJobIntentV1 job,parsed;const bool ok=BuildDerivedJobIntent(selection,{source},4096,10,&job,&error)&&
        ParseDerivedJobIntent(SerializeDerivedJobIntent(job),&parsed,&error)&&job.job_id==parsed.job_id&&!job.job_id.empty();
    std::cout<<(ok?"[pass] ":"[fail] ")<<"J01 실제 선택→compact 내구 job 계약 왕복\n";
    std::cout<<"[detail] error="<<error<<'\n';
    std::vector<DerivedSourceEvidence> expanded{source};for(int i=0;i<8;++i){auto extra=source;extra.segment.segment_id="unrelated-"+std::to_string(i);extra.binding->segment_id=extra.segment.segment_id;expanded.push_back(extra);}
    DerivedJobIntentV1 same;const bool unrelated=BuildDerivedJobIntent(selection,expanded,4096,10,&same,&error)&&same.job_id==job.job_id&&same.selection_json==job.selection_json;
    std::cout<<(unrelated?"[pass] ":"[fail] ")<<"J17 무관source8개 추가에도 동일선택 jobID 유지\n";
    DerivedJobRecordV1 cleaned;cleaned.intent=job;cleaned.state=DerivedJobState::Failed;cleaned.failure_reason="fixture-no-files";cleaned.cleaned_at_ms=5;DerivedJobRecordV1 copy;
    const bool rollback=ParseDerivedJobRecord(SerializeDerivedJobRecord(cleaned),&copy,&error)&&copy.cleaned_at_ms==5;
    std::cout<<(rollback?"[pass] ":"[fail] ")<<"J18 cleanup wall시계 역행 허용·순서는상태로검사\n";
    if(!unrelated||!rollback){std::cout<<"[summary] pass="<<(ok?1:0)+(unrelated?1:0)+(rollback?1:0)<<" fail="<<(ok?0:1)+(unrelated?0:1)+(rollback?0:1)<<'\n';return 1;}
    const auto root=std::filesystem::path(argv[1])/"catalog";
    RecordingJournal journal(RecordingJournal::ManagedOptions{root,"store"});
    RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,true);options.enable_v2_storage=true;
    RecordingCatalog catalog(journal,options);RecordingOrderReservationV1 order;
    if(!journal.Open(&error)||!catalog.Open(&error)){std::cerr<<"[setup-fail] "<<error<<'\n';return 2;}
    std::filesystem::create_directories(root/"channel");
    if(!journal.ReserveRecordingOrder("store","order","segment","channel",&order,&error)||
       !WriteContainedFileDurably(root,root/"channel/segment.mp4","0123456789ab",&error)||
       !catalog.FinalizeBoundSegmentV2(s,b,(root/"channel/segment.mp4").string(),&error)){std::cerr<<"[setup-fail] "<<error<<'\n';return 2;}
    std::vector<RecordingSegmentV2> unprotected;
    for(int i=0;i<3;++i) {
        auto extra=s;extra.segment_id="unprotected-"+std::to_string(i);extra.order_request_id="extra-order-"+std::to_string(i);extra.order_sequence=i+2;
        const auto file=root/("channel/"+extra.segment_id+".mp4");
        auto binding=b;binding.segment_id=extra.segment_id;
        if(!journal.ReserveRecordingOrder("store",extra.order_request_id,extra.segment_id,"channel",&order,&error)||
           !WriteContainedFileDurably(root,file,"0123456789ab",&error)||!catalog.FinalizeBoundSegmentV2(extra,binding,file.string(),&error)) {
            std::cerr<<"[setup-fail] "<<error<<'\n';return 2;
        }
        unprotected.push_back(extra);
    }
    RetentionCoordinator::Options ro;ro.media_root=root;ro.default_expected_segment_bytes=1;
    RetentionCoordinator retention(catalog,[&]{return catalog.RetentionSnapshot();},[](std::uint64_t* bytes,std::string*){*bytes=100000;return true;},[](const auto&,std::string*){return false;},ro);
    if(!retention.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error))return 2;
    const auto before=journal.Replay().mutations.size();const auto admitted=retention.AdmitDerivedJob(catalog,job,10);
    std::optional<DerivedJobRecordV1> stored;const auto snapshot=catalog.RetentionSnapshot();
    const bool atomic=admitted.accepted&&admitted.created&&catalog.FindDerivedJob(job.job_id,&stored,&error)&&stored&&
        journal.Replay().mutations.size()==before+1&&snapshot.durable_reservations.size()==1&&snapshot.durable_reservations[0].bytes==4096&&
        std::any_of(snapshot.candidates.begin(),snapshot.candidates.end(),[](const auto& candidate){return candidate.Id()=="segment"&&candidate.hold_count>0;});
    std::cout<<(atomic?"[pass] ":"[fail] ")<<"J04 단일 Intent 원장·보호·예약 원자 가시성\n";
    RetentionCoordinator duplicate(catalog,[&]{return catalog.RetentionSnapshot();},[](std::uint64_t* bytes,std::string*){*bytes=100000;return true;},[](const auto&,std::string*){return false;},ro);
    if(!duplicate.UpdateChannelPolicy("channel",{100000,100000,100000,100000},&error))return 2;
    const bool owner=!duplicate.AdmitDerivedJob(catalog,job,11).accepted&&
        !duplicate.AdmitEventWrite("channel","other",1,11).allowed&&
        !duplicate.AdmitContinuousWrite("channel",1,11).allowed&&!duplicate.RecoverPending(11).ok;
    std::cout<<(owner?"[pass] ":"[fail] ")<<"J19 후발 coordinator 일반·파생 admission 및 복구 차단\n";
    if(!catalog.RequestDeletion(unprotected[2].segment_id,"continuous-capacity",&error)){std::cerr<<"[setup-fail] "<<error<<'\n';return 2;}
    std::filesystem::remove(root/("channel/"+unprotected[2].segment_id+".mp4"));
    std::pair<int,int> extended;
    try {extended=Extended(std::filesystem::path(argv[1])/"extended",source,selection,job);}
    catch(const std::exception& e){std::cerr<<"[setup-fail] extended "<<e.what()<<'\n';return 2;}
    const auto size=std::filesystem::file_size(journal.path());
    const auto lastByte=[&](char value){std::fstream file(journal.path(),std::ios::in|std::ios::out|std::ios::binary);file.seekp(size-1);file.put(value);file.flush();return file.good();};
    if(!lastByte('x'))return 2;
    const bool failed=!catalog.FailDerivedJobAfterCleanup(job.job_id,job.attempt_id,"fixture-no-files",11,&error);
    const auto failure=error;
    if(!lastByte('\n'))return 2;
    RecordingTombstoneV2 tomb;tomb.tombstone_id="cleanup-tomb";tomb.segment=unprotected[2];tomb.deletion_reason="continuous-capacity";tomb.deleted_at_ms=20;
    const bool guard=failed&&!catalog.RetentionSnapshot().authoritative&&
        !catalog.RequestDeletion(unprotected[0].segment_id,"continuous-capacity",&error)&&
        !catalog.MarkSegmentCorrupt(unprotected[1].segment_id,"checksum-mismatch",&error)&&!catalog.CompleteDeletionV2(tomb,&error);
    std::cout<<(guard?"[pass] ":"[fail] ")<<"J20 append 거부 후 원장 복원해도 공통 mutation 차단\n";
    std::cout<<"[detail] injected="<<failure<<'\n';
    std::cout<<"[detail] admission="<<admitted.message<<'\n'<<"[summary] pass="<<extended.first+(ok?1:0)+(unrelated?1:0)+(rollback?1:0)+(atomic?1:0)+(owner?1:0)+(guard?1:0)<<" fail="<<extended.second+(ok?0:1)+(unrelated?0:1)+(rollback?0:1)+(atomic?0:1)+(owner?0:1)+(guard?0:1)<<'\n';return ok&&atomic&&owner&&guard&&extended.second==0?0:1;
}
