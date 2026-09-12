// 파일 용도: 격리 실제 원장과 작은 자체 생성 미디어로 V2 보존·재생 보호 경계를 검증한다.
#include "recording/recording_read_service.h"
#include "recording/recording_media_inspector.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <thread>
#include <atomic>
#include <fcntl.h>
#include <unistd.h>
#include <sqlite3.h>
#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/gst.h>
#endif
using namespace recording;
namespace {
int passes=0,failures=0;
void Check(bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passes:++failures;}
class LegacyPort final:public RecordingStorePort {
public:
 bool FinalizeSegment(const RecordingSegmentV1&,const std::string&,std::string*)override{return false;}
 bool PutEventLink(const EventRecordingLinkV1&,std::string*)override{return false;}
 bool PutObservation(const AnalysisObservationV1&,std::string*)override{return false;}
 bool RequestDeletion(const std::string&,const std::string&,std::string*)override{return false;}
 bool CompleteDeletion(const RecordingTombstoneV1&,std::string*)override{return false;}
 std::vector<RecordingSegmentV1> QuerySegments(const std::string&,std::int64_t,std::int64_t)const override{return {};}
};
#if MEDIA_SERVER_USE_GSTREAMER
void Require(bool ok,const std::string& error){if(!ok)throw std::runtime_error(error);}
std::string Bytes(const std::filesystem::path& path){std::ifstream in(path,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}};}
std::string Sha(const std::filesystem::path& path){const auto b=Bytes(path);gchar* h=g_compute_checksum_for_data(G_CHECKSUM_SHA256,reinterpret_cast<const guchar*>(b.data()),b.size());std::string result=h;g_free(h);return result;}
std::filesystem::path media_fixture;
void Generate(const std::filesystem::path& path) {
    GError* error=nullptr;auto* p=gst_parse_launch(("videotestsrc num-buffers=10 ! video/x-raw,width=160,height=90,framerate=10/1 ! x264enc tune=zerolatency ! h264parse ! mp4mux ! filesink location=\""+path.string()+"\"").c_str(),&error);
    Require(p&&error==nullptr,"fixture pipeline setup");Require(gst_element_set_state(p,GST_STATE_PLAYING)!=GST_STATE_CHANGE_FAILURE,"fixture pipeline start");
    auto* bus=gst_element_get_bus(p);auto* message=gst_bus_timed_pop_filtered(bus,10*GST_SECOND,static_cast<GstMessageType>(GST_MESSAGE_EOS|GST_MESSAGE_ERROR));
    const bool ok=message&&GST_MESSAGE_TYPE(message)==GST_MESSAGE_EOS;if(message)gst_message_unref(message);gst_object_unref(bus);gst_element_set_state(p,GST_STATE_NULL);gst_object_unref(p);Require(ok,"fixture encode");
}
struct Store {
    std::filesystem::path root;RecordingJournal journal;RecordingCatalog catalog;std::string error;
    static RecordingCatalog::Options Options(const std::filesystem::path& p,bool sql=true){RecordingCatalog::Options o(p/"recording-catalog.sqlite3",p,sql);o.enable_v2_storage=true;return o;}
    Store(const std::filesystem::path& p,bool sql=true):root(p),journal(RecordingJournal::ManagedOptions{p,"store"}),catalog(journal,Options(p,sql)) {Require(journal.Open(&error)&&catalog.Open(&error),error);}
    RecordingSegmentV2 Add(const std::string& id,bool unknown=false,bool pinned=false,RecordingRetentionClass klass=RecordingRetentionClass::Continuous,const std::string& relative="") {
        RecordingSegmentV2 s;s.segment_id=id;s.source_id="source";s.channel_id="channel";s.store_id="store";s.order_request_id="order-"+id;s.media_epoch_id="epoch-"+id;
        s.media_start_pts=0;s.media_end_pts=1000000000;s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";
        s.size_bytes=std::filesystem::file_size(media_fixture);s.checksum_sha256=Sha(media_fixture);s.created_at_ms=1;s.finalized_at_ms=2;s.pinned=pinned;s.retention_class=klass;
        s.mappings={{"media-server.recording-utc-mapping.v1","map-"+id,0,1000000000,"server-observation",1000000000,2000000000,1,"observed"}};
        if(unknown){auto& m=s.mappings[0];m.provenance="unknown";m.reason="clock-unavailable";m.utc_start_ns.reset();m.utc_end_ns.reset();m.uncertainty_ns.reset();}
        RecordingOrderReservationV1 order;Require(journal.ReserveRecordingOrder(s.store_id,s.order_request_id,id,s.channel_id,&order,&error),error);s.order_sequence=order.sequence;
        const auto path=root/(relative.empty()?id+".mp4":relative);std::filesystem::create_directories(path.parent_path());
        std::filesystem::copy_file(media_fixture,path);Require(catalog.FinalizeSegmentV2(s,path.string(),&error),error);return s;
    }
    std::uint64_t Hold(const std::string& id){for(const auto& c:catalog.RetentionSnapshot().candidates)if(c.segment_v2&&c.segment_v2->segment_id==id)return c.hold_count;return 0;}
    RetentionCoordinator Coordinator(RetentionCoordinator::MediaUnlinker unlinker={}) {
        if(!unlinker)unlinker=[this](const auto& p,auto* e){return RemoveContainedMediaFile(root,p,e,{},true);};
        return RetentionCoordinator(catalog,[this]{return catalog.RetentionSnapshot();},[](auto* b,auto*){*b=100000000;return true;},unlinker,{0,1,root});
    }
};
RecordingTombstoneV2 Tomb(const RecordingSegmentV2& s){RecordingTombstoneV2 t;t.tombstone_id="tomb-"+s.segment_id;t.segment=s;t.deletion_reason="continuous-capacity";t.deleted_at_ms=10;return t;}
RetentionCandidate Candidate(RecordingSegmentV2 s,RecordingLifecycle state=RecordingLifecycle::Finalized){RetentionCandidate c;c.segment_v2=std::move(s);c.effective_lifecycle=state;c.media_path="/fixture.mp4";return c;}
RetentionPlanRequest Request(std::uint64_t quota){RetentionPlanRequest r;r.channel_id="channel";r.policy.continuous_max_bytes=quota;r.policy.event_max_bytes=100000000;r.free_bytes=100000000;r.now_ms=10000;return r;}
RecordingMediaDescriptor Descriptor(const RecordingSegmentV2& s){return {s.container,s.video_codecs,s.size_bytes,s.checksum_sha256,s.retention_class};}
std::string SqlText(const std::filesystem::path& path,const char* sql){
    sqlite3* db=nullptr;sqlite3_stmt* statement=nullptr;std::string result;
    if(sqlite3_open_v2(path.c_str(),&db,SQLITE_OPEN_READONLY,nullptr)==SQLITE_OK&&
       sqlite3_prepare_v2(db,sql,-1,&statement,nullptr)==SQLITE_OK&&sqlite3_step(statement)==SQLITE_ROW){
        const auto* value=sqlite3_column_text(statement,0);if(value)result=reinterpret_cast<const char*>(value);
    }
    if(statement)sqlite3_finalize(statement);if(db)sqlite3_close(db);return result;
}
#endif
}
int main(int argc,char** argv) {
    (void)argv;
    if(argc!=2)return 2;
    try {
#if MEDIA_SERVER_USE_GSTREAMER
        gst_init(nullptr,nullptr);const std::filesystem::path root=argv[1];media_fixture=root/"fixture.mp4";Generate(media_fixture);
        Store s(root/"store");const auto original=s.Add("original");
        Require(InspectRecordingPhysicalMedia(root,"fixture.mp4",Descriptor(original)).state==MediaInspectionState::Healthy,"independent healthy fixture inspection");
        RecordingTombstoneV2 parsed;const auto tomb=Tomb(original);const auto json=SerializeRecordingTombstoneV2(tomb);
        Check(ParseRecordingTombstoneV2(json,&parsed,&s.error)&&SerializeRecordingSegmentV2(parsed.segment)==SerializeRecordingSegmentV2(original)&&json.find("recorded_range")==std::string::npos,"B01 V2 tombstone preserves immutable segment without legacy UTC range");
        RecordingSegmentStateV2 state;RecordingMutationV1 mutation;
        state.segment_id="original";state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-capacity";
        const auto state_json=SerializeRecordingSegmentStateV2(state);RecordingSegmentStateV2 parsed_state;
        RecordingMutationV1 state_envelope;state_envelope.mutation_id="state-original";state_envelope.entity_id="other";
        state_envelope.mutation_type=RecordingMutationType::SegmentV2State;state_envelope.payload_json=state_json;state_envelope.occurred_at_ms=1;
        const bool wrong_entity=!ParseRecordingMutationV1(SerializeRecordingMutationV1(state_envelope),&mutation,&s.error);
        state_envelope.entity_id="original";
        const bool valid_state=ParseRecordingSegmentStateV2(state_json,&parsed_state,&s.error)&&ParseRecordingMutationV1(SerializeRecordingMutationV1(state_envelope),&mutation,&s.error);
        const auto conflict_root=root/"conflict";std::filesystem::create_directory(conflict_root);
        RecordingJournal conflict_journal(conflict_root/"journal.jsonl");
        std::ofstream conflict_output(conflict_journal.path());
        for(const auto& record:s.journal.Replay().mutations)conflict_output<<SerializeRecordingMutationV1(record)<<'\n';
        conflict_output<<SerializeRecordingMutationV1(state_envelope)<<'\n';
        state.reason="event-capacity";state_envelope.payload_json=SerializeRecordingSegmentStateV2(state);
        conflict_output<<SerializeRecordingMutationV1(state_envelope)<<'\n';conflict_output.close();Require(conflict_journal.Open(&s.error),s.error);
        const auto conflict_before=Bytes(conflict_journal.path());RecordingCatalog conflict_catalog(conflict_journal,Store::Options(conflict_root));
        const bool conflict_rejected=!conflict_catalog.Open(&s.error)&&s.error=="segment state mutation ID envelope 불일치"&&Bytes(conflict_journal.path())==conflict_before;
        Check(valid_state&&wrong_entity&&conflict_rejected&&!ParseRecordingSegmentStateV2("{}",&state,&s.error)&&!ParseRecordingTombstoneV2("{}",&parsed,&s.error),"B02 V2 state records reject malformed payload entity and duplicate conflicts");
        const bool pending=s.catalog.RequestDeletion("original","continuous-capacity",&s.error);const auto before=s.catalog.FindSegmentV2ById("original");
        Check(pending&&s.catalog.SegmentLifecycleV2("original")==RecordingLifecycle::DeletionPending&&before&&SerializeRecordingSegmentV2(*before)==SerializeRecordingSegmentV2(original),"B03 V2 pending corrupt and deleted overlays never mutate finalized payload");
        Check(pending&&!s.catalog.FinalizeSegmentV2(original,(s.root/"original.mp4").string(),&s.error)&&!s.catalog.MarkSegmentCorrupt("original","checksum-mismatch",&s.error),"B04 V2 invalid transitions and finalize retries cannot resurrect state");
        const bool existing_rejected=!s.catalog.CompleteDeletionV2(tomb,&s.error)&&std::filesystem::exists(s.root/"original.mp4");
        Require(std::filesystem::remove(s.root/"original.mp4"),"B05 fixture unlink");
        const bool completed=s.catalog.CompleteDeletionV2(tomb,&s.error);
        if(!completed)std::cout<<"[diagnostic] B05 complete: "<<s.error<<'\n';
        const bool checkpoint=completed&&s.catalog.Checkpoint(&s.error);
        if(completed&&!checkpoint)std::cout<<"[diagnostic] B05 checkpoint: "<<s.error<<'\n';
        bool restart_ok=true;std::string deleted_json;
        {
            Store restart(root/"restart");const auto value=restart.Add("restart-deleted");deleted_json=SerializeRecordingTombstoneV2(Tomb(value));
            restart_ok=restart.catalog.RequestDeletion(value.segment_id,"continuous-capacity",&restart.error);
            std::filesystem::remove(restart.root/"restart-deleted.mp4");
            restart_ok=restart.catalog.CompleteDeletionV2(Tomb(value),&restart.error)&&restart_ok;
            restart.Add("restart-corrupt");restart.Add("restart-pending");restart.Add("restart-held");
            restart_ok=restart.catalog.MarkSegmentCorrupt("restart-corrupt","checksum-mismatch",&restart.error)&&
                restart.catalog.RequestDeletion("restart-pending","continuous-capacity",&restart.error)&&
                restart.catalog.AdjustHoldCount("restart-held",1,&restart.error)&&restart.catalog.Checkpoint(&restart.error)&&
                restart.Hold("restart-held")==1&&restart_ok;
        }
        for(bool sql:{true,false}) {
            Store restart(root/"restart",sql);
            restart_ok=restart_ok&&restart.catalog.IsDeletedSegmentId("restart-deleted")&&
                restart.catalog.SegmentLifecycleV2("restart-pending")==RecordingLifecycle::DeletionPending&&
                restart.catalog.SegmentLifecycleV2("restart-corrupt")==RecordingLifecycle::Corrupt&&restart.Hold("restart-held")==0;
            if(sql)restart_ok=restart_ok&&SqlText(restart.root/"recording-catalog.sqlite3","SELECT tombstone_json FROM recording_segment_states_v2 WHERE segment_id='restart-deleted'")==deleted_json&&
                SqlText(restart.root/"recording-catalog.sqlite3","SELECT lifecycle FROM recording_segment_states_v2 WHERE segment_id='restart-corrupt'")=="corrupt";
        }
        s.error="stale-error";const bool retry_clean=s.catalog.CompleteDeletionV2(tomb,&s.error)&&s.error.empty();
        const auto terminal_root=root/"terminal";std::filesystem::create_directory(terminal_root);RecordingJournal terminal_journal(terminal_root/"journal.jsonl");
        {std::ofstream output(terminal_journal.path());for(const auto& record:s.journal.Replay().mutations)output<<SerializeRecordingMutationV1(record)<<'\n';
         state_envelope.mutation_id="late-pending";state_envelope.payload_json=state_json;output<<SerializeRecordingMutationV1(state_envelope)<<'\n';}
        Require(terminal_journal.Open(&s.error),s.error);RecordingCatalog terminal_catalog(terminal_journal,Store::Options(terminal_root));
        const auto terminal_before=Bytes(terminal_journal.path());const bool terminal_rejected=!terminal_catalog.Open(&s.error)&&Bytes(terminal_journal.path())==terminal_before;
        Check(pending&&existing_rejected&&completed&&checkpoint&&restart_ok&&retry_clean&&terminal_rejected&&s.catalog.SegmentLifecycleV2("original")==RecordingLifecycle::Deleted&&!s.catalog.FindSegmentV2ById("original"),"B05 V2 checkpoint and restart preserve overlay tombstone and SQLite parity");
        auto first=original,second=original;first.segment_id="first";first.order_sequence=1;second.segment_id="second";second.order_sequence=2;first.size_bytes=second.size_bytes=10;first.mappings[0].utc_end_ns=9000000000;second.mappings[0].utc_end_ns=3000000000;
        auto plan=RetentionCoordinator::Plan({{Candidate(second),Candidate(first)}},Request(10));
        Check(plan.deletions.size()==1&&plan.deletions[0].candidate.segment_v2&&plan.deletions[0].candidate.segment_v2->segment_id=="first","B06 V2 capacity deletion follows durable order despite reversed UTC");
        auto foreign=second;foreign.store_id="a-store";auto mixed=RetentionCoordinator::Plan({{Candidate(first),Candidate(foreign)}},Request(10));
        RetentionCandidate legacy_candidate;legacy_candidate.segment.segment_id="legacy";legacy_candidate.segment.channel_id="channel";legacy_candidate.segment.lifecycle=RecordingLifecycle::Finalized;legacy_candidate.segment.size_bytes=10;legacy_candidate.media_path="/legacy.mp4";
        const auto legacy_mixed=RetentionCoordinator::Plan({{Candidate(first),legacy_candidate}},Request(10));
        Check(mixed.deletions.size()==1&&mixed.deletions[0].candidate.segment_v2->store_id=="a-store"&&legacy_mixed.deletions.size()==1&&legacy_mixed.deletions[0].candidate.Id()=="legacy","B07 mixed legacy and multiple stores use deterministic nonchronological ordering");
        auto age=first;age.mappings[0].utc_end_ns=2000000001;age.mappings[0].uncertainty_ns=999999;auto rq=Request(100);rq.now_ms=3001;rq.policy.continuous_max_age_ms=1000;
        auto aged=RetentionCoordinator::Plan({{Candidate(age)}},rq);rq.now_ms=3000;auto young=RetentionCoordinator::Plan({{Candidate(age)}},rq);
        auto multi=age;multi.mappings[0].end_pts=500000000;auto later=multi.mappings[0];later.mapping_id="later";later.start_pts=500000000;later.end_pts=1000000000;later.utc_end_ns=4000000001;multi.mappings.push_back(later);
        rq.now_ms=5000;const auto multi_young=RetentionCoordinator::Plan({{Candidate(multi)}},rq);rq.now_ms=5001;const auto multi_aged=RetentionCoordinator::Plan({{Candidate(multi)}},rq);
        Check(aged.deletions.size()==1&&young.deletions.empty()&&multi_young.deletions.empty()&&multi_aged.deletions.size()==1,"B08 V2 age expiry uses all known mapping ends plus uncertainty rounded upward");
        auto unknown=s.Add("unknown",true);auto uc=Candidate(unknown);auto aq=Request(unknown.size_bytes+1);aq.policy.continuous_max_age_ms=1;
        auto overflow=first;overflow.mappings[0].utc_end_ns=std::numeric_limits<std::int64_t>::max();overflow.mappings[0].uncertainty_ns=1;
        auto overflow_request=Request(100);overflow_request.now_ms=std::numeric_limits<std::int64_t>::max();overflow_request.policy.continuous_max_age_ms=1;
        Check(RetentionCoordinator::Plan({{uc}},aq).deletions.empty()&&RetentionCoordinator::Plan({{uc}},Request(0)).deletions.size()==1&&RetentionCoordinator::Plan({{Candidate(overflow)}},overflow_request).deletions.empty()&&RetentionCoordinator::Plan({{Candidate(overflow)}},Request(0)).deletions.size()==1,"B09 V2 unknown or overflowing age remains capacity eligible");
        auto event=second;event.retention_class=RecordingRetentionClass::Event;auto er=Request(0);er.policy.event_max_bytes=100;er.free_bytes=0;er.reserved_free_bytes=1;
        auto separated=RetentionCoordinator::Plan({{Candidate(event),Candidate(first)}},er);
        Check(separated.deletions.size()==1&&separated.deletions[0].candidate.segment_v2->retention_class==RecordingRetentionClass::Continuous&&separated.event_quota_satisfied,"B10 V2 class quotas and disk reserve remain separated");
        auto pinned=s.Add("pinned",false,true);auto held=s.Add("held");bool hold=s.catalog.AdjustHoldCount("held",1,&s.error);
        Check(hold&&s.Hold("held")==1&&!s.catalog.RequestDeletion("held","continuous-capacity",&s.error)&&!s.catalog.MarkSegmentCorrupt("held","checksum-mismatch",&s.error)&&!s.catalog.RequestDeletion("pinned","continuous-capacity",&s.error)&&!s.catalog.MarkSegmentCorrupt("pinned","checksum-mismatch",&s.error),"B11 V2 pin and hold protect deletion and corruption");
        auto charged=RetentionCoordinator::Plan({{Candidate(first,RecordingLifecycle::Corrupt),Candidate(second,RecordingLifecycle::DeletionPending)}},Request(0));
        Check(charged.deletions.empty()&&!charged.continuous_quota_satisfied,"B12 V2 pending and corrupt bytes remain charged but are not automatic victims");
        const auto applied=s.Add("applied");bool saw_pending=false;auto coordinator=s.Coordinator([&](const auto& p,auto* e){
            bool durable_pending=false,durable_deleted=false;
            for(const auto& record:s.journal.Replay().mutations)if(record.entity_id=="applied") {
                if(record.mutation_type==RecordingMutationType::SegmentV2State){RecordingSegmentStateV2 state_value;durable_pending=ParseRecordingSegmentStateV2(record.payload_json,&state_value,e)&&state_value.lifecycle==RecordingLifecycle::DeletionPending;}
                if(record.mutation_type==RecordingMutationType::SegmentV2Deleted)durable_deleted=true;
            }
            saw_pending=durable_pending&&!durable_deleted&&s.catalog.SegmentLifecycleV2("applied")==RecordingLifecycle::DeletionPending;
            return RemoveContainedMediaFile(s.root,p,e,{},true);
        });
        auto cp=Candidate(applied);cp.media_path=s.root/"applied.mp4";RetentionPlan explicit_plan;explicit_plan.deletions.push_back({cp,RetentionCleanupReason::ContinuousCapacity});
        auto wrong_plan=explicit_plan;wrong_plan.deletions[0].candidate.media_path=s.root/"unknown.mp4";
        const auto untouched=Bytes(s.root/"unknown.mp4");const bool wrong_path=!coordinator.Apply(wrong_plan,20).ok&&Bytes(s.root/"unknown.mp4")==untouched&&s.catalog.SegmentLifecycleV2("applied")==RecordingLifecycle::Finalized;
        auto apply=coordinator.Apply(explicit_plan,20);
        Check(wrong_path&&apply.ok&&apply.deleted_count==1&&saw_pending&&!std::filesystem::exists(cp.media_path)&&s.catalog.SegmentLifecycleV2("applied")==RecordingLifecycle::Deleted,"B13 V2 apply persists pending before unlink and tombstone after unlink");
        auto interrupted=s.Add("interrupted");bool ip=s.catalog.RequestDeletion(interrupted.segment_id,"continuous-capacity",&s.error);auto recovery=s.Coordinator();auto rr=recovery.RecoverPending(30);
        bool restart_recovery=false;
        {Store pending_store(root/"pending-restart");const auto value=pending_store.Add("lost-parent",false,false,RecordingRetentionClass::Continuous,"sub/file.mp4");
         Require(pending_store.catalog.RequestDeletion(value.segment_id,"continuous-capacity",&pending_store.error),pending_store.error);
         auto failing=pending_store.Coordinator([](const auto&,auto* error){*error="injected-unlink";return false;});
         Require(!failing.RecoverPending(30).ok,"injected unlink failure observed");std::filesystem::remove_all(pending_store.root/"sub");}
        {Store pending_store(root/"pending-restart");auto pending_recovery=pending_store.Coordinator();const auto result=pending_recovery.RecoverPending(31);
         restart_recovery=result.ok&&result.deleted_count==1&&pending_store.catalog.IsDeletedSegmentId("lost-parent");}
        Check(ip&&rr.ok&&restart_recovery&&s.catalog.SegmentLifecycleV2("interrupted")==RecordingLifecycle::Deleted,"B14 V2 interrupted deletion recovers without resurrection");
        auto corrupt=s.Add("corrupt");bool marked=s.catalog.MarkSegmentCorrupt(corrupt.segment_id,"checksum-mismatch",&s.error);
        Check(marked&&!s.catalog.RequestDeletion(corrupt.segment_id,"continuous-capacity",&s.error)&&s.catalog.RequestDeletion(corrupt.segment_id,"manual-corrupt-cleanup",&s.error),"B15 V2 corrupt cleanup requires explicit manual reason");
        RecordingReadService read(s.catalog);auto media=read.ResolveMedia("channel","unknown");
        Check(media&&media->fd()>=0&&s.Hold("unknown")==1,"B16 V2 continuous media with unknown UTC resolves a healthy held fd");media.reset();
        s.Add("event",false,false,RecordingRetentionClass::Event);
        s.Add("collision");EventRecordingLinkV1 fallback;fallback.link_id="collision-link";fallback.event_id="collision-event";
        fallback.source_id="source";fallback.channel_id="channel";fallback.requested_range={1000,2000};fallback.time_basis="utc-ms";
        fallback.status=EventRecordingLinkStatus::Failed;fallback.fallback_evidence_id="collision";fallback.fallback_media_locator=(s.root/"unused.json").string();fallback.created_at_ms=1;fallback.updated_at_ms=1;
        Require(s.catalog.PutEventLink(fallback,&s.error),s.error);
        Check(!read.ResolveMedia("channel","collision")&&!read.ResolveMedia("wrong","unknown")&&!read.ResolveMedia("channel","event")&&s.Hold("collision")==0,"B17 V2 wrong channel event and fallback collision cannot expose media");
        s.Add("missing");std::filesystem::remove(s.root/"missing.mp4");const auto symlink_segment=s.Add("symlink");std::filesystem::remove(s.root/"symlink.mp4");std::filesystem::create_symlink(s.root/"unknown.mp4",s.root/"symlink.mp4");s.Add("hardlink");std::filesystem::create_hard_link(s.root/"hardlink.mp4",s.root/"extra.mp4");
        auto unsafe=Candidate(symlink_segment);unsafe.media_path=s.root/"symlink.mp4";RetentionPlan unsafe_plan;unsafe_plan.deletions.push_back({unsafe,RetentionCleanupReason::ContinuousCapacity});
        const bool target_preserved=!coordinator.Apply(unsafe_plan,40).ok&&Bytes(s.root/"unknown.mp4")==untouched&&std::filesystem::is_symlink(unsafe.media_path);
        const auto ancestor=s.Add("ancestor",false,false,RecordingRetentionClass::Continuous,"branch/media.mp4");
        std::filesystem::rename(s.root/"branch",s.root/"target-branch");std::filesystem::create_directory_symlink(s.root/"target-branch",s.root/"branch");
        auto ancestor_candidate=Candidate(ancestor);ancestor_candidate.media_path=s.root/"branch/media.mp4";RetentionPlan ancestor_plan;ancestor_plan.deletions.push_back({ancestor_candidate,RetentionCleanupReason::ContinuousCapacity});
        const auto ancestor_before=Bytes(s.root/"target-branch/media.mp4");const bool ancestor_preserved=!coordinator.Apply(ancestor_plan,40).ok&&!read.ResolveMedia("channel","ancestor")&&Bytes(s.root/"target-branch/media.mp4")==ancestor_before&&s.Hold("ancestor")==0;
        Check(target_preserved&&ancestor_preserved&&!read.ResolveMedia("channel","missing")&&!read.ResolveMedia("channel","symlink")&&!read.ResolveMedia("channel","hardlink")&&s.Hold("missing")==0&&s.Hold("symlink")==0&&s.Hold("hardlink")==0,"B18 V2 missing symlink and multiple hardlink media reject without hold leak");
        s.Add("damaged");{std::fstream file(s.root/"damaged.mp4",std::ios::binary|std::ios::in|std::ios::out);file.put('X');}
        const auto healthy_fixture=media_fixture;media_fixture=root/"invalid-container.mp4";{std::ofstream file(media_fixture,std::ios::binary);file<<std::string(128,'x');}
        const auto invalid_container=s.Add("invalid-container");media_fixture=healthy_fixture;
        const auto invalid_inspection=InspectRecordingPhysicalMedia(s.root,"invalid-container.mp4",Descriptor(invalid_container));
        Check(invalid_container.checksum_sha256==Sha(s.root/"invalid-container.mp4")&&invalid_inspection.state==MediaInspectionState::Corrupt&&!read.ResolveMedia("channel","invalid-container")&&!read.ResolveMedia("channel","damaged")&&s.Hold("damaged")==0&&s.Hold("invalid-container")==0,"B19 V2 same size corruption and invalid container reject without hold leak");
        s.Add("racing");std::atomic<bool> start{false};std::unique_ptr<ResolvedRecordingMedia> winner;bool deleted=false;
        std::thread player([&]{while(!start.load())std::this_thread::yield();winner=read.ResolveMedia("channel","racing");});
        std::thread deleter([&]{while(!start.load())std::this_thread::yield();std::string error;deleted=s.catalog.RequestDeletion("racing","continuous-capacity",&error);});start=true;player.join();deleter.join();
        Check(static_cast<bool>(winner)!=deleted&&(!winner||s.Hold("racing")==1),"B20 V2 deletion and playback hold races have one safe winner");winner.reset();
        const int fd=::open((s.root/"unknown.mp4").c_str(),O_RDONLY|O_CLOEXEC);Require(fd>=0,"borrowed open");::lseek(fd,7,SEEK_SET);
        auto inspected=InspectRecordingPhysicalMediaFd(fd,Descriptor(unknown));const bool preserved=::lseek(fd,0,SEEK_CUR)==7&&::fcntl(fd,F_GETFD)>=0;
        {std::fstream file(s.root/"unknown.mp4",std::ios::binary|std::ios::in|std::ios::out);file.put('X');}
        const auto changed=InspectRecordingPhysicalMediaFd(fd,Descriptor(unknown));const bool change_rejected=changed.state!=MediaInspectionState::Healthy&&::lseek(fd,0,SEEK_CUR)==7&&::fcntl(fd,F_GETFD)>=0;::close(fd);
        Check(inspected.state==MediaInspectionState::Healthy&&preserved&&change_rejected,"B21 borrowed fd inspection preserves caller ownership and detects file changes");
        {std::ofstream metadata(root/"gst-off-segment.json");metadata<<SerializeRecordingSegmentV2(unknown);}
#else
        {
        const std::filesystem::path root=argv[1];std::ifstream metadata(root/"gst-off-segment.json");
        const std::string json{std::istreambuf_iterator<char>(metadata),{}};RecordingSegmentV2 segment;std::string error;
        if(!ParseRecordingSegmentV2(json,&segment,&error))throw std::runtime_error("GST-off metadata setup");
        const auto storage=root/"gst-off";RecordingJournal journal(RecordingJournal::ManagedOptions{storage,"store"});
        RecordingCatalog::Options options(storage/"recording-catalog.sqlite3",storage,true);options.enable_v2_storage=true;
        RecordingCatalog catalog(journal,options);RecordingOrderReservationV1 order;
        if(!journal.Open(&error)||!catalog.Open(&error)||!journal.ReserveRecordingOrder(segment.store_id,segment.order_request_id,segment.segment_id,segment.channel_id,&order,&error))throw std::runtime_error("GST-off catalog setup");
        segment.order_sequence=order.sequence;std::filesystem::copy_file(root/"fixture.mp4",storage/"media.mp4");
        if(!catalog.FinalizeSegmentV2(segment,(storage/"media.mp4").string(),&error))throw std::runtime_error("GST-off finalize setup");
        RecordingReadService read(catalog);const auto resolved=read.ResolveMedia("channel",segment.segment_id);
        bool zero_hold=false;for(const auto& candidate:catalog.RetentionSnapshot().candidates)if(candidate.Id()==segment.segment_id)zero_hold=candidate.hold_count==0;
        const int fd=::open((storage/"media.mp4").c_str(),O_RDONLY|O_CLOEXEC);
        const auto result=InspectRecordingPhysicalMediaFd(fd,{segment.container,segment.video_codecs,segment.size_bytes,segment.checksum_sha256,segment.retention_class});if(fd>=0)::close(fd);
        Check(!resolved&&zero_hold&&result.state==MediaInspectionState::Unavailable,"B22 V2 playback is unavailable without GStreamer");
        }
#endif
        LegacyPort legacy;std::string error;Check(!legacy.CompleteDeletionV2({},&error)&&!error.empty(),"B23 legacy store port refuses unsupported V2 deletion");
    }catch(const std::exception& error){std::cerr<<"[setup-error] "<<error.what()<<'\n';return 2;}
    std::cout<<"[summary] pass="<<passes<<" fail="<<failures<<'\n';return failures?1:0;
}
