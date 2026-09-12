// 파일 용도: 실제 catalog 원장으로 내부 V2 시간 위치 해석의 범위·모호함·정수 경계를 검증한다.
#include "recording/recording_read_service.h"
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>

using namespace recording;
namespace {
int passed=0,failed=0;
void Check(bool ok,const std::string& name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;}
void Require(bool ok,const std::string& error){if(!ok)throw std::runtime_error(error);}
RecordingSegmentV2 Segment(const std::string& id,const std::string& channel) {
    RecordingSegmentV2 s;s.segment_id=id;s.channel_id=channel;s.source_id="source";s.store_id="store";
    s.order_request_id="order-"+id;s.media_epoch_id="epoch-"+id;s.media_start_pts=0;s.media_end_pts=10;
    s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";s.size_bytes=12;
    s.checksum_sha256=std::string(64,'a');s.created_at_ms=1;s.finalized_at_ms=2;
    s.mappings={{"media-server.recording-utc-mapping.v1","map-"+id,0,10,"server-observation",100,110,7,"observed"}};
    return s;
}
struct Fixture {
    std::filesystem::path root;RecordingJournal journal;std::string error;
    Fixture(const std::filesystem::path& p):root(p),journal(p/"journal.jsonl") {
        std::filesystem::create_directories(root/"media");Require(journal.Open(&error),error);
    }
    void Add(RecordingSegmentV2 s) {
        RecordingOrderReservationV1 order;
        Require(journal.ReserveRecordingOrder(s.store_id,s.order_request_id,s.segment_id,s.channel_id,&order,&error),error);
        s.order_sequence=order.sequence;Require(ValidateRecordingSegmentV2(s,&error),error);
        RecordingMutationV1 m;m.mutation_id="final-"+s.segment_id;m.entity_id=s.segment_id;m.occurred_at_ms=3;
        m.mutation_type=RecordingMutationType::SegmentV2Finalized;
        m.payload_json="{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\""+s.segment_id+".mp4\"}";
        Require(journal.Append(m,&error),error);
    }
    void Delete(const std::string& id,const std::string& channel) {
        RecordingTombstoneV1 t;t.tombstone_id="deleted-"+id;t.segment_id=id;t.source_id="source";t.channel_id=channel;
        t.recorded_range={1,2};t.checksum_sha256=std::string(64,'a');t.retention_class=RecordingRetentionClass::Continuous;
        t.deletion_reason="capacity";t.deleted_at_ms=4;
        RecordingMutationV1 m;m.mutation_id=t.tombstone_id;m.entity_id=id;m.occurred_at_ms=4;m.mutation_type=RecordingMutationType::DeletionCompleted;
        m.payload_json="{\"tombstone\":"+SerializeRecordingTombstoneV1(t)+"}";Require(journal.Append(m,&error),error);
    }
    RecordingCatalog::Options Options(bool sql) {
        RecordingCatalog::Options o(root/"index.sqlite3",root/"media",sql);o.enable_v2_storage=true;return o;
    }
    void AddHeldLegacy() {
        RecordingSegmentV1 s;s.segment_id="held";s.source_id="source";s.channel_id="legacy";s.stream_epoch_id="epoch";
        s.start={1000,0,1,1000000000};s.end={2000,1000000000,1,1000000000};s.container="mp4";
        s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');
        s.lifecycle=RecordingLifecycle::Finalized;s.created_at_ms=1000;s.finalized_at_ms=2000;
        std::ofstream media(root/"media"/"held.mp4",std::ios::binary);media.write("\0\0\0\x0c" "ftypisom",12);media.close();
        RecordingMutationV1 m;m.mutation_id="held-final";m.entity_id="held";m.occurred_at_ms=2000;m.mutation_type=RecordingMutationType::SegmentFinalized;
        m.payload_json="{\"segment\":"+SerializeRecordingSegmentV1(s)+",\"mediaRelpath\":\"held.mp4\"}";Require(journal.Append(m,&error),error);
    }
};
bool Single(const RecordingLocationResult& r,std::int64_t pts){return r.state==RecordingLocationState::Single&&r.candidates.size()==1&&r.candidates[0].media_pts==pts;}
std::string Signature(const RecordingLocationResult& r) {
    std::string s=std::to_string(static_cast<int>(r.state))+":"+std::to_string(r.has_unknown);
    const auto nullable=[](const auto& v){return v?std::to_string(*v):"null";};
    for(const auto& c:r.candidates) {
        s+="|"+c.store_id+":"+std::to_string(c.order_sequence)+":"+c.segment_id+":"+c.media_epoch_id+":"+std::to_string(c.media_pts)+":"+std::to_string(c.time_base_num)+":"+std::to_string(c.time_base_den);
        if(c.mapping){const auto& m=*c.mapping;s+=":"+m.schema+":"+m.mapping_id+":"+std::to_string(m.start_pts)+":"+nullable(m.end_pts)+":"+m.provenance+":"+nullable(m.utc_start_ns)+":"+nullable(m.utc_end_ns)+":"+nullable(m.uncertainty_ns)+":"+m.reason;}
        else s+=":no-mapping";
    }
    return s;
}
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        Fixture f(std::filesystem::path(argv[1])/"fixture");
        f.Add(Segment("one","exact"));
        auto unknown=Segment("unknown","unknown-channel");unknown.mappings[0].provenance="unknown";
        unknown.mappings[0].utc_start_ns.reset();unknown.mappings[0].utc_end_ns.reset();unknown.mappings[0].uncertainty_ns.reset();unknown.mappings[0].reason="clock-unavailable";f.Add(unknown);
        f.Add(Segment("z-file","files"));f.Add(Segment("a-file","files"));
        auto two=Segment("two","maps");two.media_end_pts=20;two.mappings.push_back({"media-server.recording-utc-mapping.v1","second",10,20,"estimated",100,110,9,"clock-step"});f.Add(two);
        auto tail=Segment("tail","tail-channel");tail.media_end_pts.reset();auto open=unknown.mappings[0];open.mapping_id="open";open.start_pts=10;open.end_pts.reset();tail.mappings.push_back(open);f.Add(tail);
        f.Add(Segment("known","mixed"));unknown.segment_id="mixed-unknown";unknown.order_request_id="mixed-order";unknown.channel_id="mixed";f.Add(unknown);
        auto rational=Segment("rational","rational-channel");rational.time_base_num=1;rational.time_base_den=3;rational.mappings[0].utc_start_ns=0;rational.mappings[0].utc_end_ns=3333333334LL;f.Add(rational);
        auto extreme=Segment("extreme","extreme-channel");extreme.media_start_pts=std::numeric_limits<std::int64_t>::min();extreme.media_end_pts=std::numeric_limits<std::int64_t>::max();
        extreme.time_base_num=std::numeric_limits<std::int32_t>::max();extreme.time_base_den=std::numeric_limits<std::int32_t>::max();
        extreme.mappings[0].start_pts=extreme.media_start_pts;extreme.mappings[0].end_pts=extreme.media_end_pts;
        extreme.mappings[0].utc_start_ns=std::numeric_limits<std::int64_t>::min();extreme.mappings[0].utc_end_ns=std::numeric_limits<std::int64_t>::max();f.Add(extreme);
        f.Add(Segment("gone","deleted-channel"));f.Delete("gone","deleted-channel");
        f.AddHeldLegacy();
        RecordingCatalog catalog(f.journal,f.Options(true));Require(catalog.Open(&f.error),f.error);RecordingReadService read(catalog);RecordingLocationResult r,a,b;
        Require(catalog.AdjustHoldCount("held",1,&f.error),f.error);
        bool ok=read.ResolveMediaLocation("exact","one",5,&r,&f.error);
        Check(ok&&Single(r,5)&&r.candidates[0].segment_id=="one"&&r.candidates[0].media_epoch_id=="epoch-one"&&r.candidates[0].mapping&&r.candidates[0].mapping->uncertainty_ns==7,"LOC01 exact media location preserves identity and mapping");
        Check(read.ResolveMediaLocation("unknown-channel","unknown",5,&r,&f.error)&&Single(r,5)&&r.has_unknown&&r.candidates[0].mapping&&!r.candidates[0].mapping->utc_start_ns,"LOC02 unknown UTC does not discard exact media location");
        Check(read.ResolveUtcLocations("files",105,&r,&f.error)&&r.state==RecordingLocationState::Multiple&&r.candidates.size()==2&&r.candidates[0].segment_id=="z-file"&&r.candidates[1].segment_id=="a-file","LOC03 UTC point returns both overlapping files");
        Check(read.ResolveUtcLocations("maps",105,&r,&f.error)&&r.candidates.size()==2&&r.candidates[0].media_pts==5&&r.candidates[1].media_pts==15&&r.candidates[0].mapping->mapping_id!=r.candidates[1].mapping->mapping_id,"LOC04 UTC point preserves separate mappings in one file");
        Check(read.ResolveUtcLocations("exact",100,&a,&f.error)&&Single(a,0)&&read.ResolveUtcLocations("exact",110,&b,&f.error)&&b.state==RecordingLocationState::None&&read.ResolveMediaLocation("exact","one",10,&r,&f.error)&&r.state==RecordingLocationState::None,"LOC05 point lookup uses half-open bounds");
        Check(read.ResolveUtcLocations("tail-channel",111,&a,&f.error)&&a.state==RecordingLocationState::Unknown&&a.candidates.empty()&&read.ResolveMediaLocation("tail-channel","tail",5,&b,&f.error)&&Single(b,5)&&read.ResolveMediaLocation("tail-channel","tail",11,&r,&f.error)&&r.state==RecordingLocationState::Unknown&&r.candidates.empty(),"LOC06 unknown mapping never extrapolates UTC");
        Check(read.ResolveUtcLocations("mixed",105,&r,&f.error)&&r.state==RecordingLocationState::Unknown&&r.has_unknown&&r.candidates.size()==1&&r.candidates[0].segment_id=="known","LOC07 known candidates coexist with unknown coverage");
        Check(read.ResolveUtcLocations("rational-channel",1000000000,&r,&f.error)&&Single(r,3)&&r.candidates[0].time_base_num==1&&r.candidates[0].time_base_den==3,"LOC08 rational conversion preserves exact non-nanosecond PTS");
        Check(read.ResolveUtcLocations("rational-channel",1,&r,&f.error)&&r.state==RecordingLocationState::Unknown&&r.has_unknown&&r.candidates.empty(),"LOC09 fractional PTS remains unknown without rounding");
        Check(read.ResolveUtcLocations("extreme-channel",std::numeric_limits<std::int64_t>::max()-1,&r,&f.error)&&r.state==RecordingLocationState::Unknown&&r.candidates.empty(),"LOC10 arithmetic extremes do not overflow");
        Check(read.ResolveMediaLocation("deleted-channel","gone",5,&a,&f.error)&&a.state==RecordingLocationState::Deleted&&read.ResolveMediaLocation("other","gone",5,&b,&f.error)&&b.state==RecordingLocationState::None,"LOC11 deleted exact ID is channel scoped");
        const auto bytes=std::filesystem::file_size(f.journal.path());
        RecordingCatalog unopened(f.journal,f.Options(false));RecordingReadService unopened_read(unopened);RecordingLocationCatalogSnapshot snapshot;
        const bool cleared_media=read.ResolveMediaLocation("exact","one",5,&r,&f.error)&&!read.ResolveMediaLocation("exact","../bad",0,&r,&f.error)&&r.candidates.empty()&&!r.has_unknown;
        const bool cleared_utc=read.ResolveUtcLocations("exact",105,&r,&f.error)&&!read.ResolveUtcLocations("",0,&r,&f.error)&&r.candidates.empty()&&!r.has_unknown;
        const bool cleared_snapshot=catalog.SnapshotLocationsV2("exact",&snapshot,&f.error)&&!catalog.SnapshotLocationsV2("",&snapshot,&f.error)&&snapshot.segments.empty()&&snapshot.deleted_segment_ids.empty();
        Check(cleared_media&&cleared_utc&&cleared_snapshot&&!read.ResolveUtcLocations("../bad",0,&r,&f.error)&&!read.ResolveUtcLocations("exact",0,nullptr,&f.error)&&!catalog.SnapshotLocationsV2("exact",nullptr,&f.error)&&!unopened_read.ResolveUtcLocations("exact",100,&r,&f.error)&&!unopened.SnapshotLocationsV2("exact",&snapshot,&f.error)&&std::filesystem::file_size(f.journal.path())==bytes,"LOC12 invalid input is rejected without mutation");
        RecordingCatalog fallback(f.journal,f.Options(false));Require(fallback.Open(&f.error),f.error);RecordingReadService replay(fallback);
        Check(read.ResolveUtcLocations("maps",105,&a,&f.error)&&replay.ResolveUtcLocations("maps",105,&b,&f.error)&&Signature(a)==Signature(b)&&a.candidates.size()==2,"LOC13 reopened JSONL and SQLite locations are identical");
        const auto held=[&](){for(const auto& c:catalog.RetentionSnapshot().candidates)if(c.segment.segment_id=="held")return c.hold_count;return std::uint64_t{0};};
        const auto holds=held();
        Check(holds==1&&read.ResolveMediaLocation("exact","one",5,&r,&f.error)&&Single(r,5)&&!std::filesystem::exists(f.root/"media"/"one.mp4")&&std::filesystem::file_size(f.journal.path())==bytes&&held()==1,"LOC14 metadata resolution does not require files or alter holds");
    }catch(const std::exception& e){std::cerr<<"[setup-error] "<<e.what()<<'\n';return 2;}
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}
