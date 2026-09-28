// 파일 용도: 녹화 세대 append 전 입력 검증과 준비 경계를 smoke로 검증한다.
// 고정 fixture만 재사용한다. 이전 suite main은 실행하지 않는다.
#define RECORDING_SCRATCH_MAIN PreappendScratchFixtureMain
#include "recording_catalog_generation_scratch_smoke.cpp"
#undef RECORDING_SCRATCH_MAIN
namespace recording {
struct RecordingGenerationPreappendProbe {
    static bool Validate(RecordingCatalog& c,const RecordingMutationV1& m) {
        std::lock_guard<std::mutex> lock(c.mu_);return c.ValidateMutationLocked(m,&error);
    }
    static std::vector<std::string> State(const RecordingCatalog& c) {
        auto state=c.ProjectionSignatureLocked();
        state.push_back("revision:"+std::to_string(c.source_snapshot_revision_)+":"+std::to_string(c.source_snapshot_revision_valid_));
        state.push_back("duplicates:"+std::to_string(c.recovery_report_.duplicate_mutation_count));
        for(const auto& p:c.hold_counts_)state.push_back("hold:"+p.first+":"+std::to_string(p.second));
        for(const auto& p:c.accepted_segment_state_mutations_)state.push_back("accepted:"+p.first);
        for(const auto& p:c.accepted_generation_ordinals_)state.push_back("ordinal:"+p.first+":"+std::to_string(p.second));
        std::sort(state.begin(),state.end());return state;
    }
    static bool Apply(RecordingCatalog& c,const RecordingMutationV1& m) {
        std::lock_guard<std::mutex> lock(c.mu_);return c.ApplyMutationLocked(m,false,&error);
    }
    static bool Commit(RecordingCatalog& c,const RecordingMutationV1& m) {
        std::lock_guard<std::mutex> lock(c.mu_);return c.AppendAndApplyLocked(m,&error);
    }
    static bool Order(const std::vector<RecordingMutationV1>& history,const RecordingMutationV1& m,bool* unchanged) {
        return RecordingJournal::ProbeOrderValidation(history,m,unchanged,&error);
    }
    static void MissingReason(RecordingCatalog& c) {
        c.tombstones_v2_.erase("removed");c.deletion_reasons_.erase("removed");
    }
    static void RemoveJob(RecordingCatalog& c,const std::string& id) {c.derived_jobs_.erase(id);}
};
}
using Probe=RecordingGenerationPreappendProbe;
RecordingSegmentV1 PreappendV1() {
    RecordingSegmentV1 s;s.segment_id="legacy";s.source_id="source";s.channel_id="channel";s.stream_epoch_id="epoch";
    s.start={1000,0,1,1000000000};s.end={2000,1000000000,1,1000000000};s.container="mp4";s.video_codecs={"h264"};
    s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');
    s.lifecycle=RecordingLifecycle::Finalized;s.created_at_ms=1000;s.finalized_at_ms=2000;return s;
}
RecordingSegmentV2 PreappendV2() {
    RecordingSegmentV2 s;s.segment_id="segment";s.source_id="source";s.channel_id="channel";s.store_id="store";
    s.order_request_id="order";s.order_sequence=1;s.media_epoch_id="epoch";s.media_end_pts=20000000;s.container="mp4";
    s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');
    s.created_at_ms=1;s.finalized_at_ms=2;s.mappings={{"media-server.recording-utc-mapping.v1","map",0,20000000,"server-observation",100000000,120000000,1,"observed"}};
    return s;
}
RecordingTombstoneV1 PreappendTomb() {
    RecordingTombstoneV1 t;t.tombstone_id="tomb";t.segment_id="legacy";t.source_id="source";t.channel_id="channel";
    t.recorded_range={1000,2000};t.checksum_sha256=std::string(64,'b');t.retention_class=RecordingRetentionClass::Continuous;
    t.deletion_reason="continuous-age";t.deleted_at_ms=3000;return t;
}
std::map<std::string,std::string> Disk(const std::filesystem::path& root) {
    std::map<std::string,std::string> files;
    for(const auto& entry:std::filesystem::recursive_directory_iterator(root))if(entry.is_regular_file())
        files.emplace(entry.path().lexically_relative(root).generic_string(),Read(entry.path()));
    return files;
}
RecordingMutationV1 M(RecordingMutationType type,const std::string& id,const std::string& entity,const std::string& payload) {
    auto m=Mutation();m.mutation_type=type;m.mutation_id=id;m.entity_id=entity;m.payload_json=payload;return m;
}
RecordingMutationV1 Order(const std::string& id,const std::string& segment,const std::string& sequence) {
    return M(RecordingMutationType::RecordingOrderReserved,id,segment,
        "{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\"store\",\"requestId\":\""+id+
        "\",\"segmentId\":\""+segment+"\",\"channelId\":\"channel\",\"sequence\":"+sequence+"}");
}
void AssertValidation(RecordingCatalog& c,const std::filesystem::path& root,const RecordingMutationV1& m,bool expected,const char* label) {
    const auto state=Probe::State(c);const auto bytes=Disk(root);
    const bool actual=Probe::Validate(c,m);
    Check(expected?"B03-V01":"B03-V02",actual==expected,label);
    Check("B03-V02",Probe::State(c)==state&&Disk(root)==bytes,"typed/ID/revision/hold/accepted/SQL/journal unchanged");
}
void OrderCases() {
    const auto first=Order("request","segment","1");
    const auto test=[&](const std::vector<RecordingMutationV1>& prior,const RecordingMutationV1& m,bool expected,const char* label){
        bool unchanged=false;const bool valid=Probe::Order(prior,m,&unchanged);
        Check("B03-V03",valid==expected&&unchanged,label);
    };
    test({},first,true,"initial reservation validation unchanged then small apply");
    test({first},first,true,"same tuple and time retry");
    test({first},Order("gap","other","20"),true,"sequence gap accepted");
    test({first},Order("request","different","2"),false,"same request changed tuple");
    auto changed=first;changed.occurred_at_ms=2;test({first},changed,false,"same request changed timestamp");
    test({first},Order("next","other","1"),false,"non-increasing sequence");
    test({first},Order("next","segment","2"),false,"segment reused");
    changed=Order("next","other","2");const auto p=changed.payload_json.find("\"store\"");changed.payload_json.replace(p,7,"\"foreign\"");
    test({first},changed,false,"foreign store rejected without binding mutation");
    auto ordinary=M(RecordingMutationType::ObservationPut,"ordinary","event","{}");
    test({ordinary},Order("ordinary","new","1"),false,"ordinary request namespace");
    ordinary.mutation_id="request";test({first},ordinary,false,"reserved request used by ordinary mutation");
    auto legacy=M(RecordingMutationType::SegmentFinalized,"legacy-final","legacy","{}");
    test({legacy},Order("late","legacy","1"),false,"legacy segment cannot be reserved retroactively");
    legacy.entity_id="segment";test({first},legacy,true,"reserved segment followed by V1 remains supported");
    test({},Order("maximum","last","9223372036854775807"),true,"int64 maximum reservation accepted");
    test({},Order("overflow","last","9223372036854775808"),false,"int64 overflow rejected");
    test({Order("maximum","last","9223372036854775807")},Order("later","other","1"),false,"maximum cannot wrap");
    auto segment=PreappendV2();
    auto output=segment;output.segment_id="second";output.order_request_id="second-order";output.order_sequence=2;
    const auto committed=[&](const RecordingSegmentV2& a,const RecordingSegmentV2& b){return M(RecordingMutationType::DerivedJobCommitted,"commit","job",
        "{\"state\":\"committed\",\"ready\":{\"outputs\":[{\"segment\":"+SerializeRecordingSegmentV2(a)+"},{\"segment\":"+SerializeRecordingSegmentV2(b)+"}]}}");};
    const std::vector<RecordingMutationV1> reserved={Order("order","segment","1"),Order("second-order","second","2")};
    test(reserved,committed(segment,output),true,"multiple committed outputs bound to reservations");
    output.channel_id="wrong";test(reserved,committed(segment,output),false,"late output mismatch leaves ordinary ID absent");
    test(reserved,committed(segment,segment),false,"duplicate output rejected without index mutation");
}
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
void BranchCases(const std::filesystem::path& base) {
    auto all=AllRows();unsigned index=0;
    for(const auto& row:all.snapshot.rows) {
        RecordingMutationType type=RecordingMutationType::Unknown;std::string payload=row.value_json;bool expected=true;
        if(row.kind=="segment-v1"){type=RecordingMutationType::SegmentFinalized;payload="{\"segment\":"+payload+",\"mediaRelpath\":\"channel/"+row.key+".mp4\"}";}
        else if(row.kind=="state-v2"){type=RecordingMutationType::SegmentV2State;expected=false;}
        else if(row.kind=="tombstone-v1"){type=RecordingMutationType::DeletionCompleted;payload="{\"tombstone\":"+payload+"}";}
        else if(row.kind=="tombstone-v2")type=RecordingMutationType::SegmentV2Deleted;
        else if(row.kind=="event-link"){type=RecordingMutationType::EventLinkCreated;payload="{\"link\":"+payload+"}";}
        else if(row.kind=="observation-v1"){type=RecordingMutationType::ObservationPut;payload="{\"observation\":"+payload+"}";}
        else if(row.kind=="observation-v2"){type=RecordingMutationType::ObservationV2Put;payload="{\"observation\":"+payload+"}";}
        else if(row.kind=="referenced-observation")type=RecordingMutationType::ReferencedObservationPut;
        else continue;
        const auto root=base/("branch-"+std::to_string(index++));Install(AllRows(),root);RecordingJournal journal(Options(root));Need(journal.Open(&error));
        RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,true);options.enable_v2_storage=true;
        RecordingCatalog catalog(journal,options);Need(catalog.Open(&error));
        auto m=M(type,"branch-probe",row.key,payload);AssertValidation(catalog,root,m,expected,("branch "+row.kind).c_str());
        auto bad=m;bad.mutation_id="branch-bad";bad.payload_json="{}";AssertValidation(catalog,root,bad,false,("malformed branch "+row.kind).c_str());
        if(type==RecordingMutationType::ObservationV2Put) {
            AnalysisObservationV2 observation;Need(ParseAnalysisObservationV2(row.value_json,&observation,&error));
            observation.event_ids.push_back("new-event");auto merge=m;merge.mutation_id="merge";merge.payload_json="{\"observation\":"+SerializeAnalysisObservationV2(observation)+"}";
            AssertValidation(catalog,root,merge,true,"observation event merge leaves current value untouched");
            observation.channel_id="different";merge.payload_json="{\"observation\":"+SerializeAnalysisObservationV2(observation)+"}";
            AssertValidation(catalog,root,merge,false,"observation immutable channel merge rejected");
        }
        if(type==RecordingMutationType::ReferencedObservationPut) {
            ReferencedObservationV1 pair;Need(ParseReferencedObservationV1(row.value_json,&pair,&error));
            pair.observation.event_ids.push_back("new-event");auto merge=m;merge.mutation_id="merge";merge.payload_json=SerializeReferencedObservationV1(pair);
            AssertValidation(catalog,root,merge,true,"referenced observation event merge unchanged");
            pair.observation.confidence=.4;merge.payload_json=SerializeReferencedObservationV1(pair);
            AssertValidation(catalog,root,merge,false,"referenced immutable attributes rejected");
        }
        if(type==RecordingMutationType::SegmentV2Deleted) {
            Probe::MissingReason(catalog);AssertValidation(catalog,root,m,false,"missing deletion reason must not insert map entry");
        } else if(expected)Check("B03-V01",Probe::Apply(catalog,m),("shared actual Apply accepts "+row.kind).c_str());
    }
    {
        const auto root=base/"managed-v2";std::filesystem::create_directories(root);
        RecordingJournal journal(RecordingJournal::ManagedOptions{root,"store"});Need(journal.Open(&error));
        RecordingOrderReservationV1 reservation;Need(journal.ReserveRecordingOrder("store","order","segment","channel",&reservation,&error));
        Need(journal.ReserveRecordingOrder("store","plain-order","plain","channel",&reservation,&error));
        RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,false);options.enable_v2_storage=true;
        RecordingCatalog catalog(journal,options);Need(catalog.Open(&error));const auto input=InputValue();
        auto bound=M(RecordingMutationType::SegmentV2BoundFinalized,"bound","segment","{\"segment\":"+SerializeRecordingSegmentV2(input.source.segment)+
            ",\"mediaRelpath\":\"channel/source.mp4\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(*input.source.binding)+"}");
        AssertValidation(catalog,root,bound,true,"new V2 bound source validated before append");
        auto bad=bound;bad.entity_id="wrong";AssertValidation(catalog,root,bad,false,"bound envelope entity mismatch");
        Need(Probe::Commit(catalog,bound));AssertValidation(catalog,root,bound,true,"bound same-ID retry");
        auto segment=input.source.segment;segment.segment_id="plain";segment.order_request_id="plain-order";segment.order_sequence=2;
        auto plain=M(RecordingMutationType::SegmentV2Finalized,"plain-final","plain","{\"segment\":"+SerializeRecordingSegmentV2(segment)+",\"mediaRelpath\":\"channel/plain.mp4\"}");
        AssertValidation(catalog,root,plain,true,"new V2 unbound segment validated");
        bad=plain;bad.payload_json="{}";AssertValidation(catalog,root,bad,false,"V2 malformed finalization");Need(Probe::Commit(catalog,plain));
        RecordingSegmentStateV2 state;state.segment_id="plain";state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-capacity";
        auto pending=M(RecordingMutationType::SegmentV2State,"plain-pending","plain",SerializeRecordingSegmentStateV2(state));
        AssertValidation(catalog,root,pending,true,"V2 valid pending transition");Need(Probe::Commit(catalog,pending));
        RecordingTombstoneV2 tomb;tomb.tombstone_id="plain-tomb";tomb.segment=segment;tomb.deletion_reason=state.reason;tomb.deleted_at_ms=20;
        auto deleted=M(RecordingMutationType::SegmentV2Deleted,"plain-deleted","plain",SerializeRecordingTombstoneV2(tomb));
        AssertValidation(catalog,root,deleted,true,"V2 valid deletion with reason");Need(Probe::Commit(catalog,deleted));
        AssertValidation(catalog,root,pending,true,"same ID retry preserves deleted state");
    }
    {
        const auto root=base/"derived-transitions";auto input=ReadyInput();Install(Active(input),root);
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,false);options.enable_v2_storage=true;
        RecordingCatalog catalog(journal,options);Need(catalog.Open(&error));
        auto record=input.job;record.state=DerivedJobState::Committed;
        auto m=M(RecordingMutationType::DerivedJobCommitted,"committed",record.intent.job_id,SerializeDerivedJobRecord(record));
        AssertValidation(catalog,root,m,true,"Ready to Committed validates output reservations without publication");Need(Probe::Apply(catalog,m));
        record.state=DerivedJobState::Complete;record.cleaned_at_ms=30;
        DerivedJobRecordV1 verified;Need(ParseDerivedJobRecord(SerializeDerivedJobRecord(record),&verified,&error));
        m=M(RecordingMutationType::DerivedJobComplete,"complete",record.intent.job_id,SerializeDerivedJobRecord(record));
        AssertValidation(catalog,root,m,true,"Committed to Complete validates without state change");Need(Probe::Apply(catalog,m));
        AssertValidation(catalog,root,m,true,"same-ID Complete retry");
    }
    {
        const auto root=base/"derived-initial-failed";auto input=InputValue();Install(Active(input),root);
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,false);options.enable_v2_storage=true;
        RecordingCatalog catalog(journal,options);Need(catalog.Open(&error));
        // 공유 domain 분기의 최초 job 상태를 만드는 테스트 전용 준비다. 파일/Journal은 수정하지 않는다.
        Probe::RemoveJob(catalog,input.job.intent.job_id);
        auto m=M(RecordingMutationType::DerivedJobIntent,"initial-probe",input.job.intent.job_id,SerializeDerivedJobRecord(input.job));
        AssertValidation(catalog,root,m,true,"initial Intent validates sources before map insertion");Need(Probe::Apply(catalog,m));
        auto record=input.job;record.state=DerivedJobState::Failed;record.cleaned_at_ms=30;record.failure_reason="fixture-no-files";
        DerivedJobRecordV1 verified;Need(ParseDerivedJobRecord(SerializeDerivedJobRecord(record),&verified,&error));
        m=M(RecordingMutationType::DerivedJobFailed,"failed-probe",record.intent.job_id,SerializeDerivedJobRecord(record));
        AssertValidation(catalog,root,m,true,"Intent to Failed validates without publication");Need(Probe::Apply(catalog,m));
    }
    {
        const auto root=base/"derived-files-ready";auto input=InputValue();Install(Active(input),root);
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,false);options.enable_v2_storage=true;
        RecordingCatalog catalog(journal,options);Need(catalog.Open(&error));
        auto ready=ReadyInput().job;auto files=ready;files.state=DerivedJobState::Intent;files.ready.reset();
        auto m=M(RecordingMutationType::DerivedJobFiles,"files",files.intent.job_id,SerializeDerivedJobRecord(files));
        AssertValidation(catalog,root,m,true,"Intent to Files validates without receipt publication");Need(Probe::Apply(catalog,m));
        // 테스트 전용 current 예약 준비: 실제 제품 예약 발급은 계속 차단돼 있다.
        const auto& output=ready.ready->outputs.front().segment;
        auto order=Order(output.order_request_id,output.segment_id,std::to_string(output.order_sequence));
        AssertValidation(catalog,root,order,true,"reservation domain validation only");Need(Probe::Apply(catalog,order));
        m=M(RecordingMutationType::DerivedJobReady,"ready",ready.intent.job_id,SerializeDerivedJobRecord(ready));
        AssertValidation(catalog,root,m,true,"Files to Ready validates current source and order");Need(Probe::Apply(catalog,m));
    }
}
#endif
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path base(argv[1]);std::filesystem::create_directories(base);
        for(bool managed:{true,false}) {
            const auto root=base/(managed?"first-store-managed":"first-store-unmanaged");std::filesystem::create_directories(root);
            auto journal=managed?std::make_unique<RecordingJournal>(RecordingJournal::ManagedOptions{root,"store"}):std::make_unique<RecordingJournal>(root/"journal.jsonl");
            Need(journal->Open(&error));RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,false);options.enable_v2_storage=true;
            RecordingCatalog catalog(*journal,options);Need(catalog.Open(&error));
            auto foreign=Order("foreign-request","first","1");const auto pos=foreign.payload_json.find("\"store\"");foreign.payload_json.replace(pos,7,"\"foreign\"");
            AssertValidation(catalog,root,foreign,!managed,managed?"first foreign store reservation rejected in empty managed store":"unmanaged first reservation retains prior store freedom");
        }
        OrderCases();
        for(bool managed:{false,true}) {
            const auto root=base/(managed?"managed":"unmanaged");std::filesystem::create_directories(root);
            auto journal=managed?std::make_unique<RecordingJournal>(RecordingJournal::ManagedOptions{root,"store"}):std::make_unique<RecordingJournal>(root/"journal.jsonl");
            Need(journal->Open(&error));RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,true);options.enable_v2_storage=true;
            {
                RecordingCatalog catalog(*journal,options);Need(catalog.Open(&error));
                auto m=M(RecordingMutationType::SegmentFinalized,"first","legacy","{\"segment\":"+SerializeRecordingSegmentV1(PreappendV1())+",\"mediaRelpath\":\"channel/legacy.mp4\"}");
                AssertValidation(catalog,root,m,true,"valid finalized before durable append");
                Need(Probe::Commit(catalog,m));
                Check("B03-V01",catalog.QuerySegments("channel",1000,2000).size()==1,"actual apply independently exposes one segment");
                AssertValidation(catalog,root,m,true,"same-ID same-envelope retry");
                auto bad=m;bad.schema="wrong-schema";AssertValidation(catalog,root,bad,false,"schema normalization cannot hide invalid input");
                bad=m;bad.payload_json="{}";AssertValidation(catalog,root,bad,false,"same ID changed payload rejected");
                bad=m;bad.mutation_id="invalid";bad.entity_id="missing";AssertValidation(catalog,root,bad,false,"new ID entity mismatch");
                bad=M(RecordingMutationType::ObservationPut,"bad-observation","obs","{}");AssertValidation(catalog,root,bad,false,"observation invalid domain");
                bad=M(RecordingMutationType::CorruptionDetected,"bad-reason","legacy","{\"reason\":\"unknown\"}");AssertValidation(catalog,root,bad,false,"unknown corruption reason");
                auto corrupt=M(RecordingMutationType::CorruptionDetected,"valid-corrupt","legacy","{\"reason\":\"missing-media\"}");
                AssertValidation(catalog,root,corrupt,true,"valid corruption does not change finalized lifecycle");
                bad=M(RecordingMutationType::DeletionRequested,"missing-request","absent","{}");AssertValidation(catalog,root,bad,false,"deletion requested missing entity");
                bad=M(RecordingMutationType::Unknown,"unknown","legacy","{}");AssertValidation(catalog,root,bad,false,"unknown mutation rejected");
                auto request=M(RecordingMutationType::DeletionRequested,"pending","legacy","{\"reason\":\"manual-corrupt-cleanup\"}");
                AssertValidation(catalog,root,request,true,"deletion request checked without lifecycle change");Need(Probe::Commit(catalog,request));
                const auto tomb=PreappendTomb();auto completed=M(RecordingMutationType::DeletionCompleted,"deleted","deliberately-different", "{\"tombstone\":"+SerializeRecordingTombstoneV1(tomb)+"}");
                AssertValidation(catalog,root,completed,true,"V1 tombstone historical entity difference accepted");Need(Probe::Commit(catalog,completed));
                request.mutation_id="pending-after-delete";AssertValidation(catalog,root,request,true,"direct historical deletion request after tombstone remains supported");
            }
            journal.reset();journal=managed?std::make_unique<RecordingJournal>(RecordingJournal::ManagedOptions{root,"store"}):std::make_unique<RecordingJournal>(root/"journal.jsonl");
            Need(journal->Open(&error));RecordingCatalog reopened(*journal,options);
            Check("B03-V04",reopened.Open(&error)&&reopened.IsDeletedSegmentId("legacy"),"v1 strict reopen and deleted identity preserved");
        }
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        BranchCases(base);
        {
            const auto root=base/"generation";Install(AllRows(),root);
            RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,true);options.enable_v2_storage=true;
            RecordingCatalog catalog(journal,options);Need(catalog.Open(&error));
            auto input=InputValue();auto job=M(RecordingMutationType::DerivedJobIntent,"job-retry-new-id",input.job.intent.job_id,SerializeDerivedJobRecord(input.job));
            AssertValidation(catalog,root,job,true,"derived job same content validation uses current cold identity");
            auto invalid=job;invalid.mutation_id="job-invalid";invalid.mutation_type=RecordingMutationType::DerivedJobComplete;
            AssertValidation(catalog,root,invalid,false,"job type/state mismatch");
            auto reference=M(RecordingMutationType::ConsumerReferencePut,"ref-retry","reference","{\"reference\":"+SerializeRecordingConsumerReferenceV1(input.job.intent.reference)+"}");
            AssertValidation(catalog,root,reference,true,"consumer reference equal identity");
            reference.mutation_type=RecordingMutationType::DerivedReferenceAccepted;reference.mutation_id="accept-reference";
            AssertValidation(catalog,root,reference,true,"accepted reference validation does not publish acceptance");
            auto receipt=M(RecordingMutationType::EventLinkReceipt,"receipt-probe","event","{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+std::string(64,'a')+"\"}");
            AssertValidation(catalog,root,receipt,true,"internal receipt domain remains managed-only (not public append authorization)");
            RecordingSegmentStateV2 state;state.segment_id="segment";state.lifecycle=RecordingLifecycle::Corrupt;state.reason="missing-media";
            auto protected_state=M(RecordingMutationType::SegmentV2State,"protected","segment",SerializeRecordingSegmentStateV2(state));
            AssertValidation(catalog,root,protected_state,false,"active job protected source rejects state mutation");
            RecordingOrderReservationV1 order;const auto bytes=Disk(root);
            Check("B03-V04",!journal.Append(job,&error)&&!journal.ReserveRecordingOrder("store","next","new","channel",&order,&error)&&
                !catalog.Checkpoint(&error)&&Disk(root)==bytes,"B append reservation checkpoint remain closed");
        }
#else
        const auto root=base/"unsupported";std::filesystem::create_directories(root);Write(root/".recording-store-format",Marker());
        RecordingJournal journal(Options(root));const auto bytes=Disk(root);
        Check("B03-V04",!journal.Open(&error)&&Disk(root)==bytes,"B crypto/backend unsupported remains closed");
#endif
        return failures?1:0;
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 2;}
}
