// S08-B2a 알려진 segment 손상 상태의 실제 catalog/SQLite 검증.
#include "recording/recording_catalog.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <iterator>
#include <sqlite3.h>
namespace fs = std::filesystem;
using namespace recording;
int passes=0, failures=0;
void Check(bool ok, const std::string& name) { std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passes:++failures; }
RecordingSegmentV1 Segment(const std::string& id) {
    RecordingSegmentV1 s; s.segment_id=id;s.source_id="source-one";s.channel_id="channel-one";s.stream_epoch_id="epoch-one";
    s.start={1000,0,1,1000000000};s.end={2000,1000000000,1,1000000000};
    s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";
    s.size_bytes=12;s.checksum_sha256=std::string(64,'a');s.lifecycle=RecordingLifecycle::Finalized;
    s.created_at_ms=1000;s.finalized_at_ms=2000;return s;
}
void Media(const fs::path& p) { fs::create_directories(p.parent_path());std::ofstream out(p,std::ios::binary);out.write("\0\0\0\014ftypisom",12);if(!out)throw std::runtime_error("media fixture write"); }
RecordingMutationV1 Corruption(const std::string& id,const std::string& entity,const std::string& reason="checksum-mismatch") {
    RecordingMutationV1 m;m.mutation_id=id;m.entity_id=entity;m.mutation_type=RecordingMutationType::CorruptionDetected;m.occurred_at_ms=3000;
    m.payload_json="{\"reason\":\""+reason+"\"}";return m;
}
#if !B2A_RED_ONLY
std::string Bytes(const fs::path& p) { std::ifstream in(p,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}}; }
std::string Scalar(const fs::path& path,const std::string& sql) {
    sqlite3* db=nullptr;sqlite3_stmt* stmt=nullptr;std::string value;
    if(sqlite3_open(path.c_str(),&db)==SQLITE_OK&&sqlite3_prepare_v2(db,sql.c_str(),-1,&stmt,nullptr)==SQLITE_OK&&sqlite3_step(stmt)==SQLITE_ROW) {
        const auto* text=sqlite3_column_text(stmt,0);if(text)value=reinterpret_cast<const char*>(text);
    }
    if(stmt)sqlite3_finalize(stmt);
    if(db)sqlite3_close(db);
    return value;
}
bool ExecSql(const fs::path& path,const std::string& sql) {
    sqlite3* db=nullptr;bool ok=sqlite3_open(path.c_str(),&db)==SQLITE_OK;
    if(ok)ok=sqlite3_exec(db,sql.c_str(),nullptr,nullptr,nullptr)==SQLITE_OK;
    if(db)sqlite3_close(db);
    return ok;
}
RecordingMutationV1 Final(const std::string& id,RecordingSegmentV1 segment,const std::string& path) {
    RecordingMutationV1 m;m.mutation_id=id;m.entity_id=segment.segment_id;m.mutation_type=RecordingMutationType::SegmentFinalized;m.occurred_at_ms=2000;
    m.payload_json="{\"segment\":"+SerializeRecordingSegmentV1(segment)+",\"mediaRelpath\":\""+path+"\"}";return m;
}
void Full(const fs::path& root,bool sqlite) {
    const std::string tag=sqlite?"sqlite ":"fallback ";std::string error;
    fs::create_directories(root);const auto journal_path=root/"journal.jsonl",db=root/"catalog.db",media=root/"media";
    RecordingJournal journal(journal_path);Check(journal.Open(&error),tag+"journal open");
    auto base=Segment("segment-base");const auto path=media/"base.mp4";Media(path);
    {
        RecordingCatalog c(journal,{db,media,sqlite});Check(c.Open(&error),tag+"catalog open");
        Check(c.FinalizeSegment(base,path.string(),&error),tag+"seed base");
        AnalysisObservationV2 o;o.observation_id="observation-one";o.source_id=base.source_id;o.channel_id=base.channel_id;
        o.analysis_namespace="analysis-one";o.stream_epoch_id=base.stream_epoch_id;o.pts=500000000;
        o.track_id="track-one";o.class_label="person";o.confidence=0.8;o.bbox={0.1,0.1,0.2,0.2};
        o.selection_reasons={"track-start"};o.first_seen_pts=o.pts;o.last_seen_pts=o.pts;o.created_at_ms=1500;
        o=c.ResolveObservationV2(o);
        Check(o.frame_locator&&o.frame_locator->segment_id=="segment-base"&&
              o.frame_locator->frame.utc_ms==1500&&o.frame_locator->frame.pts==500000000,
              tag+"resolved locator literal segment UTC PTS");
        Check(c.PutObservationV2(o,&error),tag+"observation stored before corruption");
        const auto observed=c.QueryObservationsV2(base.channel_id);
        Check(observed.size()==1&&observed[0].frame_locator.has_value(),tag+"observation locator initially available");
        const auto file_before=Bytes(path);const auto initial=journal.Replay().mutations.size();
        Check(!c.MarkSegmentCorrupt("missing-id","missing-media",&error)&&!c.MarkSegmentCorrupt(base.segment_id,"arbitrary",&error)&&journal.Replay().mutations.size()==initial,
              tag+"unknown ID and reason refused noappend");
        Check(c.AdjustHoldCount(base.segment_id,1,&error),tag+"acquire hold");
        Check(!c.MarkSegmentCorrupt(base.segment_id,"checksum-mismatch",&error)&&journal.Replay().mutations.size()==initial,
              tag+"held corruption refused noappend");
        Check(c.AdjustHoldCount(base.segment_id,-1,&error),tag+"release hold");
        Check(c.MarkSegmentCorrupt(base.segment_id,"checksum-mismatch",&error),tag+"mark corruption");
        const auto count=journal.Replay().mutations.size();
        Check(count==initial+1&&c.MarkSegmentCorrupt(base.segment_id,"missing-media",&error)&&journal.Replay().mutations.size()==count,
              tag+"repeat corruption noappend");
        const auto changed=c.FindSegmentById(base.segment_id);auto expected=base;expected.lifecycle=RecordingLifecycle::Corrupt;
        Check(changed&&SerializeRecordingSegmentV1(*changed)==SerializeRecordingSegmentV1(expected)&&Bytes(path)==file_before,
              tag+"only lifecycle changed bytes identity preserved");
        Check(!c.FindSegmentMediaLocation(base.segment_id),tag+"corrupt media location blocked");
        const auto revoked=c.QueryObservationsV2(base.channel_id);
        Check(revoked.size()==1&&!revoked[0].frame_locator&&revoked[0].locator_reason=="corrupt",tag+"V2 locator revoked");
        if(sqlite) {
            Check(Scalar(db,"SELECT lifecycle FROM recording_segments WHERE segment_id='segment-base'")=="corrupt",tag+"SQL lifecycle corrupt");
            Check(Scalar(db,"SELECT codecs_json FROM recording_segments WHERE segment_id='segment-base'")==SerializeRecordingSegmentV1(base),tag+"SQL codecs_json original metadata");
        }
        auto held_source=Segment("pending-source"),output=Segment("pending-output");output.retention_class=RecordingRetentionClass::Event;
        Media(media/"source.mp4");Media(media/"output.mp4");
        Check(c.FinalizeSegment(held_source,(media/"source.mp4").string(),&error)&&c.FinalizeSegment(output,(media/"output.mp4").string(),&error),tag+"pending link segments seed");
        EventRecordingLinkV1 link;link.link_id="pending-link";link.event_id="event-one";link.source_id=base.source_id;link.channel_id=base.channel_id;
        link.stream_epoch_id=base.stream_epoch_id;link.requested_range=UtcRangeV1{1000,2000};link.ordered_overlaps={{held_source.segment_id,{1000,2000}}};
        link.derived_segment_id=output.segment_id;link.status=EventRecordingLinkStatus::Pending;link.time_basis="utc-ms";link.created_at_ms=2000;link.updated_at_ms=2000;
        Check(c.PutEventLink(link,&error),tag+"pending link seed");const auto pending_count=journal.Replay().mutations.size();
        Check(!c.MarkSegmentCorrupt(held_source.segment_id,"missing-media",&error)&&!c.MarkSegmentCorrupt(output.segment_id,"derived-media-missing",&error)&&journal.Replay().mutations.size()==pending_count,
              tag+"pending source output refused noappend");
        Check(SerializeEventRecordingLinkV1(*c.FindEventLinkByEventId("event-one"))==SerializeEventRecordingLinkV1(link),tag+"event link metadata preserved");
        for(const auto& id:{"deletion-pending","deletion-done"}) {
            auto s=Segment(id);Media(media/(std::string(id)+".mp4"));
            Check(c.FinalizeSegment(s,(media/(std::string(id)+".mp4")).string(),&error)&&c.RequestDeletion(id,"quota",&error),tag+id+" deletion seed");
            if(std::string(id)=="deletion-done") {
                RecordingTombstoneV1 t;t.tombstone_id="tombstone-one";t.segment_id=id;t.source_id=s.source_id;t.channel_id=s.channel_id;
                t.recorded_range={1000,2000};t.checksum_sha256=s.checksum_sha256;t.retention_class=s.retention_class;t.deletion_reason="quota";t.deleted_at_ms=4000;
                Check(c.CompleteDeletion(t,&error),tag+"tombstone seed");
            }
            const auto before=journal.Replay().mutations.size();
            Check(!c.MarkSegmentCorrupt(id,"missing-media",&error)&&journal.Replay().mutations.size()==before,tag+id+" mark rejected noappend");
        }
    }
    Check(journal.Append(Final("final-repeat",base,"base.mp4"),&error),tag+"identical finalized replay seed");
    auto wrong=base;wrong.checksum_sha256=std::string(64,'b');
    Check(journal.Append(Final("wrong-metadata",wrong,"base.mp4"),&error)&&journal.Append(Final("wrong-path",base,"other.mp4"),&error),tag+"conflicting finalized seed");
    auto mismatched=Final("wrong-envelope",base,"base.mp4");mismatched.entity_id="other-entity";
    Check(journal.Append(mismatched,&error),tag+"entity mismatch seed");
    auto bad=Corruption("invalid-first","unknown-entity");
    Check(journal.Append(bad,&error)&&journal.Append(Corruption("invalid-first",base.segment_id),&error),tag+"invalid first valid later same mutation ID seed");
    Check(journal.Append(Corruption("malformed",base.segment_id,"bogus"),&error)&&journal.Append(Corruption("pending-corruption","deletion-pending"),&error)&&journal.Append(Corruption("deleted-corruption","deletion-done"),&error),tag+"malformed and deletion-priority seed");
    Check(journal.Append(Final("final-repeat",wrong,"base.mp4"),&error),tag+"same mutation ID different payload seed");
    {
        RecordingCatalog c(journal,{db,media,sqlite});Check(c.Open(&error),tag+"restart");
        const auto s=c.FindSegmentById(base.segment_id);
        Check(s&&s->lifecycle==RecordingLifecycle::Corrupt&&s->checksum_sha256==base.checksum_sha256,tag+"restart never resurrects corrupt identity");
        Check(c.QuerySegments(base.channel_id,1000,2000).size()==4,tag+"query keeps corrupt pending excludes deleted");
        Check(c.FindSegmentById("deletion-pending")->lifecycle==RecordingLifecycle::DeletionPending&&c.IsDeletedSegmentId("deletion-done")&&!c.FindSegmentById("unknown-entity"),tag+"deletion priority and unknown no creation");
        Check(c.recovery_report().projection_error_count==6,tag+"invalid mutations diagnosed exact count");
        if(sqlite) {
            Check(Scalar(db,"SELECT lifecycle FROM recording_segments WHERE segment_id='segment-base'")=="corrupt",tag+"restart SQL lifecycle parity");
            Check(Scalar(db,"SELECT lifecycle FROM recording_segments WHERE segment_id='deletion-pending'")=="deletion_pending"&&Scalar(db,"SELECT lifecycle FROM recording_segments WHERE segment_id='deletion-done'")=="deleted",tag+"SQL deletion precedence");
            Check(Scalar(db,"SELECT COUNT(*) FROM recording_mutations WHERE mutation_id IN ('wrong-metadata','wrong-path','wrong-envelope','malformed')")=="0",tag+"rebuild excludes rejected envelopes");
            Check(Scalar(db,"SELECT entity_id FROM recording_mutations WHERE mutation_id='invalid-first'")==base.segment_id,tag+"invalid first valid later SQL exact binding");
            auto live=Segment("fallback-trigger");Media(media/"trigger.mp4");Check(c.FinalizeSegment(live,(media/"trigger.mp4").string(),&error),tag+"projection failover seed");
            Check(ExecSql(db,"CREATE TRIGGER fail_corruption BEFORE UPDATE OF lifecycle ON recording_segments BEGIN SELECT RAISE(ABORT,'corruption projection failure'); END"),tag+"SQLite failure trigger");
            Check(c.MarkSegmentCorrupt(live.segment_id,"container-invalid",&error)&&c.catalog_mode()=="jsonl-fallback"&&c.FindSegmentById(live.segment_id)->lifecycle==RecordingLifecycle::Corrupt,tag+"projection failure keeps durable memory state");
            Check(ExecSql(db,"DROP TRIGGER fail_corruption"),tag+"remove projection trigger");
        }
    }
    if(sqlite) { RecordingCatalog c(journal,{db,media,true});Check(c.Open(&error)&&Scalar(db,"SELECT lifecycle FROM recording_segments WHERE segment_id='fallback-trigger'")=="corrupt",tag+"fallback restart SQL repaired"); }
}
void ReplayOrder(const fs::path& root) {
    fs::create_directories(root);std::string error;const auto media=root/"media";Media(media/"base.mp4");
    RecordingJournal journal(root/"journal.jsonl");Check(journal.Open(&error),"order journal open");
    const auto m=Corruption("same-envelope","segment-base");
    Check(journal.Append(m,&error)&&journal.Append(Final("create-base",Segment("segment-base"),"base.mp4"),&error)&&journal.Append(m,&error),"order corruption-before-create-after seed");
    RecordingCatalog c(journal,{root/"catalog.db",media,true});Check(c.Open(&error),"order catalog open");
    Check(c.FindSegmentById("segment-base")->lifecycle==RecordingLifecycle::Corrupt,"order memory corrupt");
    Check(Scalar(root/"catalog.db","SELECT lifecycle FROM recording_segments WHERE segment_id='segment-base'")=="corrupt","identical envelope accepted ordinal SQL parity");
}
#endif
int main(int argc,char** argv) {
    if(argc<2||argc>3)return 2;
    const fs::path root(argv[1]);std::string error;
#if !B2A_RED_ONLY
    if(argc==3&&std::string(argv[2])=="--red-order") {
        ReplayOrder(root/"order");
        std::cout<<"[recording-corruption] pass="<<passes<<" fail="<<failures<<'\n';return failures?1:0;
    }
#endif
    RecordingJournal journal(root/"journal.jsonl");Check(journal.Open(&error),"journal open");
    const auto path=root/"media/one.mp4";Media(path);
    {RecordingCatalog c(journal,{root/"catalog.db",root/"media",false});Check(c.Open(&error),"catalog seed open");Check(c.FinalizeSegment(Segment("segment-one"),path.string(),&error),"seed finalized");}
    Check(journal.Append(Corruption("corruption-one","segment-one"),&error),"corruption durable append");
    RecordingCatalog replay(journal,{root/"catalog.db",root/"media",false});Check(replay.Open(&error),"catalog replay open");
    const auto segment=replay.FindSegmentById("segment-one");
    Check(segment&&segment->lifecycle==RecordingLifecycle::Corrupt,"corruption replay lifecycle is Corrupt");
#if !B2A_RED_ONLY
    Full(root/"fallback",false);Full(root/"sqlite",true);ReplayOrder(root/"order");
#endif
    std::cout<<"[recording-corruption] pass="<<passes<<" fail="<<failures<<'\n';return failures?1:0;
}
