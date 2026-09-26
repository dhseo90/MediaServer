// 파일 용도: 녹화 세대 append 처리의 파일·identity 계약을 smoke로 검증한다.
// 기존 검증 fixture만 사용한다. 이전 suite의 main은 실행하지 않는다.
#define RECORDING_SCRATCH_MAIN AppendScratchFixtureMain
#include "recording_catalog_generation_scratch_smoke.cpp"
#undef RECORDING_SCRATCH_MAIN
#include <sys/stat.h>
#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#endif
namespace recording {
struct RecordingGenerationAppendProbe {
    static bool Commit(RecordingCatalog& c,const RecordingMutationV1& m) {
        std::lock_guard<std::mutex> lock(c.mu_);return c.AppendAndApplyLocked(m,&error);
    }
    static std::vector<std::string> State(const RecordingCatalog& c) {
        auto rows=c.ProjectionSignatureLocked();
        for(const auto& p:c.accepted_generation_ordinals_)rows.push_back("ordinal:"+p.first+":"+std::to_string(p.second));
        for(const auto& p:c.hold_counts_)rows.push_back("hold:"+p.first+":"+std::to_string(p.second));
        rows.push_back("revision:"+std::to_string(c.source_snapshot_revision_));std::sort(rows.begin(),rows.end());return rows;
    }
    static void Fault(int write,int apply){RecordingJournal::generation_write_fault_=write;RecordingCatalog::generation_apply_fault_=apply;}
    static sqlite3* Db(RecordingCatalog& c){return c.generation_sqlite_db_;}
    static bool Link(RecordingJournal& j,const std::string& id,RecordingMutationLink* out){return j.MakeGenerationMutationLink(id,out,&error);}
    static bool Get(RecordingJournal& j,const RecordingMutationLink& link,RecordingMutationHandle* out){return j.AcquireMutationLink(link,out,&error);}
    static bool Foreign(RecordingJournal& j,const RecordingMutationV1& m){std::shared_ptr<const RecordingGenerationRecoveryRow> out;return j.AppendGeneration(&out,m,&out,&error);}
    static bool Update(RecordingCatalog& c,const DerivedJobRecordV1& record) {
        if(!c.derived_service_owner_&&!c.BindDerivedService(&c))return false;
        return c.UpdateDerivedJob(&c,record,&error);
    }
};
}
using AppendProbe=RecordingGenerationAppendProbe;
RecordingMutationV1 AM(RecordingMutationType type,const std::string& id,const std::string& entity,const std::string& payload) {
    auto m=Mutation();m.mutation_type=type;m.mutation_id=id;m.entity_id=entity;m.payload_json=payload;return m;
}
RecordingCatalog::Options AO(const std::filesystem::path& root,bool enabled=true,bool sql=true) {
    RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,sql);o.enable_v2_storage=true;o.enable_generation_writes=enabled;return o;
}
bool DeniedReads(RecordingCatalog& c) {
    RecordingCatalogStatusSnapshot status;RecordingTimelineResult timeline;
    return !c.SnapshotStatus(&status,&error)&&!c.RetentionSnapshot().authoritative&&
        !c.SnapshotTimelineV2({"channel",0,3000,0,10,false},&timeline,&error)&&!c.Open(&error);
}
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
std::map<std::string,std::string> Immutable(const std::filesystem::path& root) {
    std::map<std::string,std::string> result;
    for(const auto& entry:std::filesystem::directory_iterator(root)) {
        const auto name=entry.path().filename().string();
        if(name==".recording-store-format"||name=="recording-generation.json"||name=="recording-v2-mutations.jsonl"||
           name.rfind("snapshot-",0)==0||name.rfind("identity-",0)==0||name.rfind("evidence-",0)==0)result[name]=Read(entry.path());
    }return result;
}
#if MEDIA_SERVER_USE_SQLITE3
std::string AS(sqlite3* db,const std::string& sql) {
    sqlite3_stmt* query=nullptr;Need(sqlite3_prepare_v2(db,sql.c_str(),-1,&query,nullptr)==SQLITE_OK);
    Need(sqlite3_step(query)==SQLITE_ROW);const auto* value=sqlite3_column_text(query,0);
    std::string result=value?reinterpret_cast<const char*>(value):"";sqlite3_finalize(query);return result;
}
void AX(sqlite3* db,const char* sql){if(sqlite3_exec(db,sql,nullptr,nullptr,nullptr)!=SQLITE_OK){error=sqlite3_errmsg(db);Need(false);}}
void SqlValue(RecordingCatalog& c,const std::string& kind,const std::string& id,const std::string& expected) {
    auto* db=AppendProbe::Db(c);if(!db)return;
    Check("B03-W04",AS(db,"SELECT value_json FROM b_current WHERE kind='"+kind+"' AND id='"+id+"'")==expected,("independent SQL "+kind+"/"+id).c_str());
}
#else
void SqlValue(RecordingCatalog&,const std::string&,const std::string&,const std::string&){}
#endif
void Rejected(RecordingCatalog& c,const std::filesystem::path& root,const RecordingMutationV1& m,const char* label) {
    const auto state=AppendProbe::State(c);const auto immutable=Immutable(root);const auto bytes=Read(root/"active-2.jsonl");
    Check("B03-W02",!AppendProbe::Commit(c,m)&&AppendProbe::State(c)==state&&Read(root/"active-2.jsonl")==bytes&&Immutable(root)==immutable,label);
}
void Basic(const std::filesystem::path& root) {
    Fixture(root);ActiveRows(root,{});const auto immutable=Immutable(root);
    const auto corrupt=AM(RecordingMutationType::CorruptionDetected,"corrupt","segment","{\"reason\":\"missing-media\"}");
    {
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root));Need(c.Open(&error));
        Check("B03-W01",c.catalog_mode()==(AppendProbe::Db(c)?"generation-sqlite":"generation-jsonl"),"writable mode describes actual opt-in state");
#if MEDIA_SERVER_USE_SQLITE3
        if(auto* db=AppendProbe::Db(c))AX(db,"INSERT INTO b_current VALUES('sentinel','untouched','owned'); CREATE TRIGGER keep_unrelated_delete BEFORE DELETE ON b_current WHEN OLD.id='untouched' BEGIN SELECT RAISE(ABORT,'unrelated deletion'); END; CREATE TRIGGER keep_unrelated_update BEFORE UPDATE ON b_current WHEN OLD.id='untouched' BEGIN SELECT RAISE(ABORT,'unrelated update'); END;");
#endif
        std::filesystem::create_directories(root/"channel");Write(root/"channel/legacy.mp4","owned-media");
        const auto legacy=ProjectionV1();auto held=legacy;held.segment_id="held-legacy";const auto before_bytes=Read(root/"active-2.jsonl");
        Need(c.FinalizeSegmentWithHold(held,(root/"channel/legacy.mp4").string(),&error));
        const auto held_bytes=Read(root/"active-2.jsonl");const auto held_state=AppendProbe::State(c);bool hold_sql=true;
#if MEDIA_SERVER_USE_SQLITE3
        if(auto* db=AppendProbe::Db(c))hold_sql=AS(db,"SELECT count FROM b_hold WHERE id='held-legacy'")=="1"&&AS(db,"SELECT count(*) FROM b_current WHERE kind='segment-v1' AND id='held-legacy'")=="1";
#endif
        Check("B03-W05",std::count(held_bytes.begin(),held_bytes.end(),'\n')==std::count(before_bytes.begin(),before_bytes.end(),'\n')+1&&
            std::find(held_state.begin(),held_state.end(),"hold:held-legacy:1")!=held_state.end()&&hold_sql&&!c.RequestDeletion("held-legacy","continuous-age",&error),"B finalize plus hold publishes one row and same SQL protection");
        Check("B03-W01",c.FinalizeSegment(legacy,(root/"channel/legacy.mp4").string(),&error),"public plain V1 finalize remains supported under explicit opt-in");
        SqlValue(c,"segment-v1","legacy",SerializeRecordingSegmentV1(legacy));SqlValue(c,"media-path","legacy","\"channel/legacy.mp4\"");
        Check("B03-W01",AppendProbe::Commit(c,corrupt),"explicit B append succeeds");
        const auto bytes=Read(root/"active-2.jsonl");const auto state=AppendProbe::State(c);
        Check("B03-W01",AppendProbe::Commit(c,corrupt)&&Read(root/"active-2.jsonl")==bytes&&AppendProbe::State(c)==state,"same-ID retry adds no physical row or projection");
        auto bad=corrupt;bad.payload_json="{}";Rejected(c,root,bad,"same-ID changed payload rejected before durable");
        bad=corrupt;bad.mutation_id="wrong-schema";bad.schema="bad";Rejected(c,root,bad,"invalid schema not normalized away");
        bad=corrupt;bad.mutation_id="invalid-domain";bad.entity_id="absent";Rejected(c,root,bad,"missing domain entity leaves bytes and current maps unchanged");
        Rejected(c,root,AM(RecordingMutationType::Unknown,"unknown","segment","{}"),"unknown mutation rejected before durable");
        Rejected(c,root,AM(RecordingMutationType::EventLinkReceipt,"receipt","segment","{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+std::string(64,'a')+"\"}"),"checkpoint-only receipt cannot use B append");
        Check("B03-W05",!journal.Append(corrupt,&error)&&!AppendProbe::Foreign(journal,corrupt),"raw foreign append remains blocked; writable checkpoint moves to C01");
        RecordingOrderReservationV1 reservation;Need(c.ReserveRecordingOrder("store","new-order","new-segment","channel",&reservation,&error));
        const auto reserved=Read(root/"active-2.jsonl");RecordingOrderReservationV1 retry;
        Check("B03-W01",c.ReserveRecordingOrder("store","new-order","new-segment","channel",&retry,&error)&&retry.sequence==reservation.sequence&&Read(root/"active-2.jsonl")==reserved,"Catalog reservation preserves retry tuple timestamp and bytes");
        retry.request_id="sentinel";
        Check("B03-W02",!c.ReserveRecordingOrder("store","new-order","different","channel",&retry,&error)&&retry.request_id=="sentinel"&&Read(root/"active-2.jsonl")==reserved,"reservation conflict leaves output and active unchanged");
        Check("B03-W02",!c.ReserveRecordingOrder("store","corrupt","other","channel",&retry,&error)&&
            !c.ReserveRecordingOrder("foreign","foreign","other","channel",&retry,&error)&&Read(root/"active-2.jsonl")==reserved,"reservation ordinary-ID and foreign-store conflicts are non-durable");
        Check("B03-W05",!journal.ReserveRecordingOrder("store","raw","raw","channel",&retry,&error),"raw Journal reserve remains blocked under opt-in");
        RecordingMutationLink link;Need(AppendProbe::Link(journal,"corrupt",&link));
        auto request=AM(RecordingMutationType::DeletionRequested,"request","segment","{\"reason\":\"manual-corrupt-cleanup\"}");Need(AppendProbe::Commit(c,request));
        RecordingMutationHandle got;Check("B03-W01",AppendProbe::Get(journal,link,&got)&&got->mutation_id=="corrupt","active opaque slot and epoch survive append");
        auto tomb=Tomb("segment");auto deleted=AM(RecordingMutationType::DeletionCompleted,"deleted","different-entity","{\"tombstone\":"+SerializeRecordingTombstoneV1(tomb)+"}");
        Need(AppendProbe::Commit(c,deleted));SqlValue(c,"tombstone-v1","segment",SerializeRecordingTombstoneV1(tomb));
        Check("B03-W01",c.IsDeletedSegmentId("segment")&&Immutable(root)==immutable,"V1 tombstone internal ID retained and historical bytes unchanged");
#if MEDIA_SERVER_USE_SQLITE3
        auto* db=AppendProbe::Db(c);if(db)Check("B03-W04",AS(db,"SELECT count(*) FROM b_current WHERE id='different-entity'")=="0"&&
            AS(db,"SELECT count(*) FROM b_current WHERE kind='media-path' AND id='segment'")=="0"&&
            AS(db,"SELECT count(*) FROM b_current WHERE kind='accepted-state' AND id='new-order'")=="0","SQL internal key delete and reservation excluded from segment-state ordinal");
        if(db){Check("B03-W04",AS(db,"SELECT value_json FROM b_current WHERE kind='sentinel' AND id='untouched'")=="owned","delta writes never rebuild or modify unrelated SQL key");
            AX(db,"DROP TRIGGER keep_unrelated_delete; DROP TRIGGER keep_unrelated_update;");}
#endif
        Check("B03-C01",c.Checkpoint(&error),"writable checkpoint supported after append branch assertions");
    }
    {RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root,false));
        Check("B03-W01",c.Open(&error)&&c.IsDeletedSegmentId("segment"),"new read-only owner strict replay restores appended current state");
        Check("B03-W05",!c.MarkSegmentCorrupt("segment","missing-media",&error),"default B writes remain blocked after writable owner");}
}
void Branches(const std::filesystem::path& base) {
    unsigned index=0;
    for(const auto& row:AllRows().snapshot.rows) {
        RecordingMutationType type=RecordingMutationType::Unknown;std::string payload=row.value_json;
        if(row.kind=="segment-v1"){type=RecordingMutationType::SegmentFinalized;payload="{\"segment\":"+payload+",\"mediaRelpath\":\"channel/"+row.key+".mp4\"}";}
        else if(row.kind=="tombstone-v1"){type=RecordingMutationType::DeletionCompleted;payload="{\"tombstone\":"+payload+"}";}
        else if(row.kind=="tombstone-v2")type=RecordingMutationType::SegmentV2Deleted;
        else if(row.kind=="event-link"){type=RecordingMutationType::EventLinkCreated;payload="{\"link\":"+payload+"}";}
        else if(row.kind=="observation-v1"){type=RecordingMutationType::ObservationPut;payload="{\"observation\":"+payload+"}";}
        else if(row.kind=="observation-v2"){type=RecordingMutationType::ObservationV2Put;payload="{\"observation\":"+payload+"}";}
        else if(row.kind=="referenced-observation")type=RecordingMutationType::ReferencedObservationPut;
        else continue;
        const auto root=base/("branch-"+std::to_string(index++));Install(AllRows(),root);
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root));Need(c.Open(&error));
        const auto entity=(type==RecordingMutationType::ObservationPut||type==RecordingMutationType::EventLinkCreated||type==RecordingMutationType::DeletionCompleted)?"outer-different":row.key;
        auto m=AM(type,"branch",entity,payload);auto bad=m;bad.mutation_id="bad";bad.payload_json="{}";Rejected(c,root,bad,("domain-invalid "+row.kind).c_str());
        Check("B03-W01",AppendProbe::Commit(c,m),("append branch "+row.kind).c_str());
        SqlValue(c,row.kind,row.key,row.value_json);
        if(type==RecordingMutationType::ObservationV2Put) {
            AnalysisObservationV2 v;Need(ParseAnalysisObservationV2(row.value_json,&v,&error));v.event_ids.push_back("new-event");
            Need(AppendProbe::Commit(c,AM(type,"merge",row.key,"{\"observation\":"+SerializeAnalysisObservationV2(v)+"}")));SqlValue(c,row.kind,row.key,SerializeAnalysisObservationV2(v));
        }
        if(type==RecordingMutationType::ReferencedObservationPut) {
            ReferencedObservationV1 v;Need(ParseReferencedObservationV1(row.value_json,&v,&error));v.observation.event_ids.push_back("new-event");
            Need(AppendProbe::Commit(c,AM(type,"merge",row.key,SerializeReferencedObservationV1(v))));SqlValue(c,row.kind,row.key,SerializeReferencedObservationV1(v));
        }
    }
}
void V2AndJobs(const std::filesystem::path& base) {
    const auto root=base/"v2";Install(ProjectionFixture{},root);
    {
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root));Need(c.Open(&error));
        const auto input=InputValue();RecordingOrderReservationV1 order;
        Need(c.ReserveRecordingOrder("store","order","segment","channel",&order,&error));
        const auto bound=AM(RecordingMutationType::SegmentV2BoundFinalized,"bound","segment","{\"segment\":"+SerializeRecordingSegmentV2(input.source.segment)+
            ",\"mediaRelpath\":\"channel/source.mp4\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(*input.source.binding)+"}");
        Check("B03-W01",AppendProbe::Commit(c,bound)&&c.FindSourceBinding("segment").has_value(),"bound V2 append exposes strict active cold source");
        RecordingMutationLink source;Need(AppendProbe::Link(journal,"bound",&source));
        Need(c.ReserveRecordingOrder("store","plain-order","plain","channel",&order,&error));
        auto segment=input.source.segment;segment.segment_id="plain";segment.order_request_id="plain-order";segment.order_sequence=2;
        auto plain=AM(RecordingMutationType::SegmentV2Finalized,"plain-final","plain","{\"segment\":"+SerializeRecordingSegmentV2(segment)+",\"mediaRelpath\":\"channel/plain.mp4\"}");
        Check("B03-W01",AppendProbe::Commit(c,plain),"plain V2 finalized append");SqlValue(c,"segment-v2","plain",SerializeRecordingSegmentV2(segment));
        RecordingSegmentStateV2 state;state.segment_id="plain";state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-capacity";
        Need(AppendProbe::Commit(c,AM(RecordingMutationType::SegmentV2State,"pending","plain",SerializeRecordingSegmentStateV2(state))));
        SqlValue(c,"state-v2","plain",SerializeRecordingSegmentStateV2(state));
        RecordingTombstoneV2 tomb;tomb.tombstone_id="tomb-plain";tomb.segment=segment;tomb.deletion_reason=state.reason;tomb.deleted_at_ms=20;
        Need(AppendProbe::Commit(c,AM(RecordingMutationType::SegmentV2Deleted,"deleted","plain",SerializeRecordingTombstoneV2(tomb))));
        // 원장 원문은 tombstone 그대로, current SQL만 B11의 고정 영수증으로 바뀐다.
        // 제품 receipt builder를 oracle로 재사용하지 않고 fixture 입력으로 독립 기대값을 만든다.
        RecordingRetiredV2Receipt receipt;receipt.segment_id="plain";receipt.store_id="store";receipt.source_id="source";receipt.channel_id="channel";
        receipt.order_request_id="plain-order";receipt.order_sequence=2;receipt.media_epoch_id="epoch";receipt.tombstone_id="tomb-plain";
        receipt.media_start_pts=0;receipt.media_end_pts=20000000;receipt.time_base_num=1;receipt.time_base_den=1000000000;
        receipt.retention_class=RecordingRetentionClass::Continuous;receipt.deleted_at_ms=20;receipt.deletion_reason="continuous-capacity";
        receipt.prior_relative_path="channel/plain.mp4";receipt.deletion_mutation_id="deleted";
        receipt.segment_sha256=Hash(SerializeRecordingSegmentV2(segment));receipt.tombstone_sha256=Hash(SerializeRecordingTombstoneV2(tomb));
        receipt.utc_exclusion_safe=false;std::string receipt_bytes;Need(SerializeRecordingRetiredV2Receipt(receipt,&receipt_bytes,&error));
        SqlValue(c,"retired-v2","plain",receipt_bytes);
#if MEDIA_SERVER_USE_SQLITE3
        if(auto* db=AppendProbe::Db(c))Check("B11-P01",AS(db,"SELECT count(*) FROM b_current WHERE id='plain' AND kind IN ('segment-v2','tombstone-v2','state-v2','media-path','deletion-reason')")=="0","retired append removes obsolete current detail keys");
#endif
        RecordingMutationHandle envelope;Check("B03-W01",AppendProbe::Get(journal,source,&envelope)&&envelope->mutation_id=="bound","source link remains authoritative after reservation and multiple appends");
#if MEDIA_SERVER_USE_SQLITE3
        if(auto* db=AppendProbe::Db(c)){RecordingCatalogSourceSummary summary;
            Check("B03-W04",ParseRecordingCatalogSourceSummary(AS(db,"SELECT summary_json FROM b_source_summary WHERE id='segment'"),&summary,&error)&&summary.latest_mutation_id=="bound"&&summary.sample_count==2,"thin source delta uses exact latest ID and sample count");}
#endif
    }
    {RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root,false));
        Check("B03-W01",c.Open(&error)&&c.FindSourceBinding("segment").has_value()&&c.IsDeletedSegmentId("plain"),"new owner restores reservations bound source and V2 deletion");}
    for(bool fail:{false,true}) {
        const auto path=base/(fail?"job-failed":"job-complete");auto input=InputValue();auto fixture=Active(input);
        // 초기 source만 남기며 job 최초 수용은 실제 새 append로 만든다.
        fixture.snapshot.rows.erase(std::remove_if(fixture.snapshot.rows.begin(),fixture.snapshot.rows.end(),[](const auto& r){return r.kind=="derived-job"||(r.kind=="accepted-state"&&r.key=="job-mutation");}),fixture.snapshot.rows.end());
        fixture.chain.first_acceptances.pop_back();fixture.archive.resize(fixture.chain.first_acceptances.back().first_row.offset+fixture.chain.first_acceptances.back().first_row.length);
        Install(fixture,path);const auto immutable=Immutable(path);
        {
            RecordingJournal journal(Options(path));Need(journal.Open(&error));RecordingCatalog c(journal,AO(path));Need(c.Open(&error));
            RecordingMutationLink historical;Need(AppendProbe::Link(journal,"bound",&historical));
            auto reference=input.job.intent.reference;
            Check("B03-W01",AppendProbe::Commit(c,AM(RecordingMutationType::ConsumerReferencePut,"reference-new","reference","{\"reference\":"+SerializeRecordingConsumerReferenceV1(reference)+"}"))&&
                AppendProbe::Commit(c,AM(RecordingMutationType::DerivedReferenceAccepted,"reference-accepted","reference","{\"reference\":"+SerializeRecordingConsumerReferenceV1(reference)+"}")),"consumer and accepted reference append");
            auto record=input.job;Need(AppendProbe::Commit(c,AM(RecordingMutationType::DerivedJobIntent,"initial",record.intent.job_id,SerializeDerivedJobRecord(record))));
            if(fail){record.state=DerivedJobState::Failed;record.cleaned_at_ms=30;record.failure_reason="fixture-no-files";
                Check("B03-W01",AppendProbe::Commit(c,AM(RecordingMutationType::DerivedJobFailed,"failed",record.intent.job_id,SerializeDerivedJobRecord(record))),"Intent to Failed durable transition");}
            else {
                auto ready=ReadyInput().job;auto files=ready;files.state=DerivedJobState::Intent;files.ready.reset();
                Check("B03-W01",AppendProbe::Update(c,files),"prepared Files validation consumed under current owner");
                const auto repeated=Read(path/"active-2.jsonl");
                Check("B03-W01",AppendProbe::Update(c,files)&&Read(path/"active-2.jsonl")==repeated,"same-content service retry does not append");
                const auto& output=ready.ready->outputs.front().segment;RecordingOrderReservationV1 order;
                Need(c.ReserveRecordingOrder("store",output.order_request_id,output.segment_id,"channel",&order,&error));
                Check("B03-W01",order.sequence==output.order_sequence&&AppendProbe::Commit(c,AM(RecordingMutationType::DerivedJobReady,"ready",ready.intent.job_id,SerializeDerivedJobRecord(ready))),"Files to Ready binds Catalog-reserved output");
                record=ready;record.state=DerivedJobState::Committed;
                Check("B03-W01",AppendProbe::Commit(c,AM(RecordingMutationType::DerivedJobCommitted,"committed",record.intent.job_id,SerializeDerivedJobRecord(record))),"Ready to Committed publishes typed output");
                SqlValue(c,"segment-v2",output.segment_id,SerializeRecordingSegmentV2(output));
                SqlValue(c,"media-path",output.segment_id,"\""+ready.intent.outputs[0].final_relpath+"\"");
                record.state=DerivedJobState::Complete;record.cleaned_at_ms=30;
                Need(AppendProbe::Commit(c,AM(RecordingMutationType::DerivedJobComplete,"complete",record.intent.job_id,SerializeDerivedJobRecord(record))));
            }
            std::optional<DerivedJobRecordV1> out;Check("B03-W01",c.FindDerivedJob(record.intent.job_id,&out,&error)&&out&&out->state==record.state,"terminal job raw detail acquired from appended row");
            RecordingMutationHandle historical_value;
            Check("B03-W01",AppendProbe::Get(journal,historical,&historical_value)&&historical_value->mutation_id=="bound"&&c.FindSourceBinding("segment").has_value(),"historical opaque source link survives active reservation and job appends");
#if MEDIA_SERVER_USE_SQLITE3
            if(auto* db=AppendProbe::Db(c)){RecordingCatalogJobSummary summary;
                Check("B03-W04",ParseRecordingCatalogJobSummary(AS(db,"SELECT summary_json FROM b_job_summary"),&summary,&error)&&summary.state==record.state&&summary.latest_mutation_id==(fail?"failed":"complete")&&
                    summary.source_ids==std::vector<std::string>{"segment"}&&summary.output_ids==std::vector<std::string>{record.intent.outputs[0].output_id},"job SQL delta exact state latest identity source and output IDs");}
#endif
            Check("B03-W04",Immutable(path)==immutable,"job transitions do not rewrite source snapshot identity archive manifest");
        }
        {RecordingJournal journal(Options(path));Need(journal.Open(&error));RecordingCatalog c(journal,AO(path,false));std::optional<DerivedJobRecordV1> out;
            Check("B03-W01",c.Open(&error)&&c.FindDerivedJob(input.job.intent.job_id,&out,&error)&&out&&out->state==(fail?DerivedJobState::Failed:DerivedJobState::Complete),"new owner recovers terminal job through all active transitions");}
    }
}
void Limits(const std::filesystem::path& base) {
    for(const std::string limit:{"active","cold","ids","ordinal"}) {
        const auto root=base/("limit-"+limit);Fixture(root);ActiveRows(root,{});auto options=Options(root);
        if(limit=="active")options.generation_limits.active_bytes=1;
        if(limit=="cold")options.generation_limits.cold_row_bytes=1;
        if(limit=="ids")options.generation_limits.identity_unique_ids=1;
        if(limit=="ordinal") {
            RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
            snapshot.cut_ordinal=std::numeric_limits<std::uint64_t>::max();std::string bytes;Need(SerializeRecordingCatalogSnapshot(snapshot,&bytes,&error));Write(root/"snapshot-2.jsonl",bytes);
            RecordingGenerationManifest manifest;Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&manifest,&error));manifest.cut_ordinal=snapshot.cut_ordinal;
            manifest.snapshot={"snapshot-2.jsonl",bytes.size(),Hash(bytes)};Need(SerializeRecordingGenerationManifest(manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);
        }
        RecordingJournal journal(options);Need(journal.Open(&error));RecordingCatalog c(journal,AO(root));Need(c.Open(&error));
        Rejected(c,root,AM(RecordingMutationType::CorruptionDetected,"new","segment","{\"reason\":\"missing-media\"}"),("admission prewrite "+limit).c_str());
    }
    {
        const auto root=base/"max-sequence";ProjectionFixture fixture;fixture.Order("maximum","last",std::numeric_limits<std::int64_t>::max());Install(fixture,root);
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root));Need(c.Open(&error));RecordingOrderReservationV1 order;
        Check("B03-W02",!c.ReserveRecordingOrder("store","overflow","next","channel",&order,&error)&&Read(root/"active-2.jsonl").empty(),"sequence exhaustion refuses new reservation without wrap or bytes");
        Check("B03-W01",c.ReserveRecordingOrder("store","maximum","last","channel",&order,&error)&&order.sequence==std::numeric_limits<std::int64_t>::max()&&Read(root/"active-2.jsonl").empty(),"sequence maximum original reservation retry remains valid");
    }
    {
        const auto root=base/"readonly-idempotent";Fixture(root);ActiveRows(root,{AM(RecordingMutationType::CorruptionDetected,"corrupt","segment","{\"reason\":\"missing-media\"}")});
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root,false));Need(c.Open(&error));RecordingOrderReservationV1 order;
        Check("B03-W05",!c.MarkSegmentCorrupt("segment","missing-media",&error)&&!c.ReserveRecordingOrder("store","new","new","channel",&order,&error),"read-only B refuses idempotent corrupt and Catalog reserve");
    }
}
void MultipleOutputs(const std::filesystem::path& root) {
    auto input=InputValue();auto first=input.source,second=input.source;
    first.segment.segment_id="z-first";first.segment.order_request_id="first-order";first.segment.media_end_pts=10000000;
    first.segment.mappings[0].end_pts=10000000;first.segment.mappings[0].utc_end_ns=110000000;
    first.binding->segment_id="z-first";first.binding->samples={{1,0}};first.binding->last_accepted_ordinal=1;
    second.segment.segment_id="a-second";second.segment.order_request_id="second-order";second.segment.order_sequence=2;second.segment.media_start_pts=10000000;
    second.segment.mappings[0].start_pts=10000000;second.segment.mappings[0].utc_start_ns=110000000;
    second.binding->segment_id="a-second";second.binding->samples={{2,10000000}};
    analysis::DecodedIntervalCollector collector;
    for(int i=0;i<2;++i){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=i*10000000;e.duration_ns=10000000;
        e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",static_cast<std::uint64_t>(i*10000000)}};collector.Append(e);}
    DerivedRecordingSelection selection;DerivedJobRecordV1 job;
    Need(SelectDerivedRecording(input.job.intent.reference,*collector.Snapshot("tap"),{second,first},nullptr,&selection,&error));
    Need(BuildDerivedJobIntent(selection,{second,first},4096,10,&job.intent,&error));
    Install(ProjectionFixture{},root);RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root));Need(c.Open(&error));
    for(const auto& source:{first,second}) {
        const auto& s=source.segment;RecordingOrderReservationV1 order;Need(c.ReserveRecordingOrder("store",s.order_request_id,s.segment_id,"channel",&order,&error));
        Need(AppendProbe::Commit(c,AM(RecordingMutationType::SegmentV2BoundFinalized,"bound-"+s.segment_id,s.segment_id,
            "{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\"channel/"+s.segment_id+".mp4\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(*source.binding)+"}")));
    }
    Need(AppendProbe::Commit(c,AM(RecordingMutationType::DerivedJobIntent,"multi-intent",job.intent.job_id,SerializeDerivedJobRecord(job))));
    std::map<std::string,std::uint64_t> directory_inodes;std::uint64_t next_inode=200;
    for(std::size_t i=0;i<2;++i){DerivedJobFileV1 file;file.output_index=i;file.device=1;file.inode=100+i;file.initial_sha256=Hash("");
        std::set<std::string> dirs{""};for(const auto& path:{job.intent.outputs[i].temporary_relpath,job.intent.outputs[i].final_relpath}) {
            auto parent=std::filesystem::path(path).parent_path();while(!parent.empty()){dirs.insert(parent.generic_string());parent=parent.parent_path();}}
        for(const auto& path:dirs){auto inserted=directory_inodes.emplace(path,next_inode);if(inserted.second)++next_inode;file.directories.push_back({path,1,inserted.first->second});}job.files.push_back(file);
        Need(AppendProbe::Update(c,job));}
    DerivedRemuxResult remux;Need(RestoreDerivedJobSelection(job.intent,&remux.selection,&error));
    remux.verified_output=true;remux.request_fully_satisfied=true;const auto full=ReadyInput().job.ready->outputs[0].provenance;
    std::vector<std::int64_t> orders;
    for(std::size_t i=0;i<2;++i){auto p=full;p.segment_id=job.intent.sources[i].segment.segment_id;
        p.requested_media_start_ns=i*10000000;p.requested_media_end_ns=(i+1)*10000000;
        p.actual_original_start_ns=p.requested_media_start_ns;p.actual_original_end_ns=p.requested_media_end_ns;
        p.source_origin_ns=i*10000000;p.seek_stream_time_ns=0;
        p.access_units={full.access_units[i]};p.access_units[0].file_pts_ns=0;p.access_units[0].file_stream_time_ns=0;p.access_units[0].output_pts_ns=0;
        p.source_decoded_sha256={full.source_decoded_sha256[i]};p.output_decoded_sha256=p.source_decoded_sha256;remux.outputs.push_back(p);
        RecordingOrderReservationV1 order;Need(c.ReserveRecordingOrder("store",job.intent.outputs[i].order_request_id,job.intent.outputs[i].output_id,"channel",&order,&error));orders.push_back(order.sequence);}
    DerivedJobRecordV1 ready;Need(BuildDerivedJobReady(job,remux,orders,20,&ready,&error));Need(AppendProbe::Update(c,ready));
    auto committed=ready;committed.state=DerivedJobState::Committed;
    Check("B03-W01",AppendProbe::Update(c,committed),"prepared Committed applies two ordered output segments atomically");
    for(std::size_t i=0;i<2;++i){const auto& output=ready.ready->outputs[i].segment;
        SqlValue(c,"segment-v2",job.intent.outputs[i].output_id,SerializeRecordingSegmentV2(output));
        SqlValue(c,"media-path",job.intent.outputs[i].output_id,"\""+job.intent.outputs[i].final_relpath+"\"");}
}
void FailureCases(const std::filesystem::path& base) {
    for(int fault=1;fault<=4;++fault) {
        const auto root=base/("fault-"+std::to_string(fault));Fixture(root);ActiveRows(root,{});const auto immutable=Immutable(root);
        {RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root));Need(c.Open(&error));
            AppendProbe::Fault(fault<=2?fault:0,fault>2?fault-2:0);
            Check("B03-W03",!c.MarkSegmentCorrupt("segment","missing-media",&error)&&DeniedReads(c)&&!journal.HasManagedLease(),"post-write fsync/apply/exception failure poisons all authority including Timeline");
            RecordingOrderReservationV1 out;Check("B03-W03",!c.ReserveRecordingOrder("store","later","later","channel",&out,&error)&&Immutable(root)==immutable,"poison rejects later writes and preserves historical source");}
        RecordingJournal fresh(Options(root));const bool opened=fresh.Open(&error);
        Check("B03-W03",opened==(fault!=1),fault==1?"partial active tail rejected without automatic truncation":"complete durable envelope allows strict new owner reopen");
        if(opened){RecordingCatalog c(fresh,AO(root,false));Check("B03-W03",c.Open(&error)&&c.FindSegmentById("segment")->lifecycle==RecordingLifecycle::Corrupt,"complete record recovery applies durable current state");}
    }
    for(bool hard:{false,true}) {
        const auto root=base/(hard?"hard-sidecar":"sym-sidecar");Fixture(root);ActiveRows(root,{});
        RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog c(journal,AO(root));Need(c.Open(&error));
        Write(root/"sentinel","not-sqlite");const auto side=root/"recording-generation-catalog.sqlite3-journal";
        if(hard)std::filesystem::create_hard_link(root/"sentinel",side);else std::filesystem::create_symlink(root/"sentinel",side);
        const auto active=Read(root/"active-2.jsonl");const auto state=AppendProbe::State(c);
        Check("B03-W04",!c.MarkSegmentCorrupt("segment","missing-media",&error)&&Read(root/"active-2.jsonl")==active&&
            AppendProbe::State(c)==state&&Read(root/"sentinel")=="not-sqlite","unsafe cache sidecar rejected before active write and SQL BEGIN");
    }
}
#endif
#include "recording_generation_append_sql_cases.inc"
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path root(argv[1]);std::filesystem::create_directories(root);
        {
            const auto path=root/"v1";std::filesystem::create_directories(path);
            RecordingJournal journal(RecordingJournal::ManagedOptions{path,"store"});Need(journal.Open(&error));
            RecordingCatalog c(journal,AO(path));Need(c.Open(&error));RecordingOrderReservationV1 order;
            Check("B03-W05",c.ReserveRecordingOrder("store","v1-request","v1-segment","channel",&order,&error)&&order.sequence==1&&
                journal.Replay().mutations.size()==1,"Catalog wrapper preserves v1 Journal-only reservation semantics");
        }
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        Basic(root/"basic");Branches(root);V2AndJobs(root);Limits(root);MultipleOutputs(root/"multiple");FailureCases(root);SQL_APPEND_CASES::Run(root);
#else
        Write(root/".recording-store-format",Marker());RecordingJournal journal(Options(root));
        Check("B03-W05",!journal.Open(&error),"unsupported B remains closed");
#endif
        return failures?1:0;
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 2;}
}
