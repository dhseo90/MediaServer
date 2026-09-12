// 파일 용도: 실제 catalog의 구간 분할·모호성·읽기 불변을 검증한다.
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

using Coverage=RecordingRangeCoverage;
std::string Signature(const RecordingRangeResult& r) {
    std::string out=std::to_string(r.deleted);
    const auto candidate=[&](const auto& c) {
        const auto& m=c.mapping;
        const auto n=[](const auto& v){return v?std::to_string(*v):"null";};
        out+="|"+c.store_id+":"+c.segment_id+":"+c.media_epoch_id+":"+std::to_string(c.order_sequence)+
            ":"+std::to_string(c.time_base_num)+":"+std::to_string(c.time_base_den)+":"+n(c.media_start_pts)+
            ":"+n(c.media_end_pts)+":"+c.reason+":"+m.schema+":"+m.mapping_id+":"+std::to_string(m.start_pts)+
            ":"+n(m.end_pts)+":"+m.provenance+":"+n(m.utc_start_ns)+":"+n(m.utc_end_ns)+":"+n(m.uncertainty_ns)+":"+m.reason;
    };
    for(const auto& s:r.slices) {
        out+=";"+std::to_string(s.start)+":"+std::to_string(s.end)+":"+std::to_string(static_cast<int>(s.coverage));
        for(const auto& c:s.candidates)candidate(c);
    }
    out+=";unplaced";
    for(const auto& c:r.unplaced)candidate(c);
    return out;
}
bool Slice(const RecordingRangeResult& r,std::size_t i,std::int64_t start,std::int64_t end,
           Coverage coverage,std::size_t count) {
    return i<r.slices.size()&&r.slices[i].start==start&&r.slices[i].end==end&&
        r.slices[i].coverage==coverage&&r.slices[i].candidates.size()==count;
}
std::string Bytes(const std::filesystem::path& p) {
    std::ifstream in(p,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}};
}
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        Fixture f(std::filesystem::path(argv[1])/"primary");
        auto multi=Segment("multi","maps");
        multi.media_end_pts=20;
        multi.mappings.push_back({"media-server.recording-utc-mapping.v1","second",10,20,"estimated",105,115,9,"clock-step"});
        f.Add(multi);
        auto unknown=Segment("unknown","mixed");
        unknown.mappings[0].provenance="unknown";unknown.mappings[0].utc_start_ns.reset();
        unknown.mappings[0].utc_end_ns.reset();unknown.mappings[0].uncertainty_ns.reset();
        unknown.mappings[0].reason="clock-unavailable";f.Add(unknown);
        auto tail=unknown;tail.segment_id="tail";tail.order_request_id="order-tail";tail.channel_id="tail-channel";
        tail.media_end_pts.reset();tail.mappings[0].end_pts.reset();f.Add(tail);
        f.Add(Segment("z-first","files"));f.Add(Segment("a-second","files"));
        auto adjacent=Segment("adjacent","adjacent-channel");adjacent.media_epoch_id="shared-epoch";f.Add(adjacent);
        auto adjacent2=Segment("adjacent-two","adjacent-channel");adjacent2.media_epoch_id="shared-epoch";
        adjacent2.media_start_pts=10;adjacent2.media_end_pts=20;
        adjacent2.mappings[0].start_pts=10;adjacent2.mappings[0].end_pts=20;
        adjacent2.mappings[0].utc_start_ns=110;adjacent2.mappings[0].utc_end_ns=120;f.Add(adjacent2);
        auto rational=Segment("rational","rational-channel");rational.time_base_den=3;
        rational.mappings[0].utc_start_ns=0;rational.mappings[0].utc_end_ns=4000000000LL;f.Add(rational);
        auto mixed_exact=Segment("mixed-exact","fraction-mixed");
        mixed_exact.mappings[0].utc_start_ns=0;mixed_exact.mappings[0].utc_end_ns=10;f.Add(mixed_exact);
        auto mixed_fraction=rational;mixed_fraction.segment_id="mixed-fraction";
        mixed_fraction.order_request_id="order-mixed-fraction";mixed_fraction.channel_id="fraction-mixed";
        f.Add(mixed_fraction);
        auto extreme=Segment("extreme","extreme-channel");
        extreme.media_start_pts=std::numeric_limits<std::int64_t>::min();extreme.media_end_pts=std::numeric_limits<std::int64_t>::max();
        extreme.time_base_num=std::numeric_limits<std::int32_t>::max();extreme.time_base_den=std::numeric_limits<std::int32_t>::max();
        extreme.mappings[0].start_pts=extreme.media_start_pts;extreme.mappings[0].end_pts=extreme.media_end_pts;
        extreme.mappings[0].utc_start_ns=std::numeric_limits<std::int64_t>::min();
        extreme.mappings[0].utc_end_ns=std::numeric_limits<std::int64_t>::max();f.Add(extreme);
        f.Add(Segment("known","mixed"));f.Add(Segment("gone","deleted-channel"));
        f.Add(Segment("pending","mixed"));f.Add(Segment("corrupt","mixed"));
        auto foreign=unknown;foreign.segment_id="foreign";foreign.order_request_id="order-foreign";foreign.channel_id="foreign-channel";f.Add(foreign);
        f.AddHeldLegacy();
        for(int i=0;i<128;++i) {
            auto segment=Segment("adjacent-many-"+std::to_string(i),"many-channel");
            segment.media_epoch_id="one-epoch";
            segment.media_start_pts=10*i;segment.media_end_pts=10*(i+1);
            segment.mappings[0].start_pts=10*i;segment.mappings[0].end_pts=10*(i+1);
            segment.mappings[0].utc_start_ns=100+10*i;
            segment.mappings[0].utc_end_ns=110+10*i;
            f.Add(segment);
        }
        RecordingCatalog catalog(f.journal,f.Options(true));Require(catalog.Open(&f.error),f.error);
        Require(catalog.AdjustHoldCount("held",1,&f.error),f.error);
        Require(catalog.RequestDeletion("gone","continuous-capacity",&f.error),f.error);
        RecordingTombstoneV2 deleted;deleted.tombstone_id="gone-deleted";deleted.segment=*catalog.FindSegmentV2ById("gone");
        deleted.deletion_reason="continuous-capacity";deleted.deleted_at_ms=9;Require(catalog.CompleteDeletionV2(deleted,&f.error),f.error);
        Require(catalog.RequestDeletion("pending","continuous-capacity",&f.error),f.error);
        Require(catalog.MarkSegmentCorrupt("corrupt","checksum-mismatch",&f.error),f.error);
        RecordingReadService read(catalog);RecordingRangeResult r,a,b;
        const auto original=Bytes(f.journal.path());
        bool ok=read.ResolveMediaRange("maps","multi",5,15,&r,&f.error);
        Check(ok&&r.slices.size()==2&&Slice(r,0,5,10,Coverage::Confirmed,1)&&Slice(r,1,10,15,Coverage::Confirmed,1)&&
              r.slices[0].candidates[0].media_start_pts==5&&r.slices[1].candidates[0].media_end_pts==15,"S10-C201 미디어 구간 mapping 경계");
        Check(read.ResolveMediaRange("mixed","unknown",2,8,&r,&f.error)&&Slice(r,0,2,8,Coverage::Confirmed,1)&&
              r.slices[0].candidates[0].media_start_pts==2&&!r.slices[0].candidates[0].mapping.utc_start_ns,"S10-C202 unknown UTC의 미디어 위치");
        Check(read.ResolveMediaRange("maps","multi",-5,25,&r,&f.error)&&r.slices.size()==4&&
              Slice(r,0,-5,0,Coverage::Gap,0)&&Slice(r,3,20,25,Coverage::Gap,0),"S10-C203 미디어 범위 밖");
        Check(read.ResolveMediaRange("tail-channel","tail",-2,5,&r,&f.error)&&Slice(r,0,-2,0,Coverage::Gap,0)&&
              Slice(r,1,0,5,Coverage::Unknown,1)&&!r.slices[1].candidates[0].media_end_pts,"S10-C204 미확정 끝");
        Check(read.ResolveUtcRange("maps",100,115,&r,&f.error)&&r.slices.size()==3&&
              Slice(r,0,100,105,Coverage::Confirmed,1)&&Slice(r,1,105,110,Coverage::Confirmed,2)&&
              Slice(r,2,110,115,Coverage::Confirmed,1)&&r.slices[1].candidates[0].mapping.mapping_id!=r.slices[1].candidates[1].mapping.mapping_id,
              "S10-C205 UTC 중첩 mapping");
        Fixture other(std::filesystem::path(argv[1])/"other");auto os=Segment("other","files");os.store_id="other-store";other.Add(os);
        RecordingCatalog other_catalog(other.journal,other.Options(false));Require(other_catalog.Open(&other.error),other.error);
        RecordingReadService other_read(other_catalog);RecordingOrderReservationV1 rejected;
        const bool denied=!f.journal.ReserveRecordingOrder("other-store","foreign-order","foreign-id","files",&rejected,&f.error);
        Check(denied&&read.ResolveUtcRange("files",100,110,&r,&f.error)&&Slice(r,0,100,110,Coverage::Confirmed,2)&&
              r.slices[0].candidates[0].segment_id=="z-first"&&r.slices[0].candidates[1].segment_id=="a-second"&&
              r.slices[0].candidates[0].store_id=="store"&&other_read.ResolveUtcRange("files",100,110,&a,&f.error)&&
              a.slices[0].candidates[0].store_id=="other-store","S10-C206 저장소 경계·결정 순서");
        bool many=read.ResolveUtcRange("many-channel",100,1380,&b,&f.error)&&b.slices.size()==128;
        if(many)for(int i=0;i<128;++i) {
            many=Slice(b,i,100+10*i,110+10*i,Coverage::Confirmed,1)&&
                b.slices[i].candidates[0].segment_id=="adjacent-many-"+std::to_string(i)&&
                b.slices[i].candidates[0].media_start_pts==10*i&&
                b.slices[i].candidates[0].media_end_pts==10*(i+1)&&many;
        }
        Check(many&&read.ResolveUtcRange("adjacent-channel",100,120,&r,&f.error)&&r.slices.size()==2&&
              Slice(r,0,100,110,Coverage::Confirmed,1)&&Slice(r,1,110,120,Coverage::Confirmed,1)&&
              r.slices[0].candidates[0].media_epoch_id==r.slices[1].candidates[0].media_epoch_id&&
              r.slices[0].candidates[0].media_start_pts==0&&r.slices[0].candidates[0].media_end_pts==10&&
              r.slices[1].candidates[0].media_start_pts==10&&r.slices[1].candidates[0].media_end_pts==20&&
              r.slices[0].candidates[0].segment_id!=r.slices[1].candidates[0].segment_id,"S10-C207 정상 segment 분할");
        Check(!read.ResolveUtcRange("maps",100,100,&r,&f.error)&&!read.ResolveMediaRange("maps","multi",5,4,&r,&f.error)&&
              read.ResolveUtcRange("adjacent-channel",110,111,&r,&f.error)&&Slice(r,0,110,111,Coverage::Confirmed,1)&&
              r.slices[0].candidates[0].segment_id=="adjacent-two","S10-C208 반열린 구간 경계");
        RecordingRangeResult mixture;
        const bool mixed=read.ResolveUtcRange("fraction-mixed",0,1,&mixture,&f.error)&&
            Slice(mixture,0,0,1,Coverage::Confirmed,2)&&
            mixture.slices[0].candidates[0].segment_id=="mixed-exact"&&
            mixture.slices[0].candidates[0].media_start_pts==0&&mixture.slices[0].candidates[0].media_end_pts==1&&
            mixture.slices[0].candidates[1].segment_id=="mixed-fraction"&&
            !mixture.slices[0].candidates[1].media_end_pts&&
            mixture.slices[0].candidates[1].reason=="non-integral-media-bound";
        Check(mixed&&read.ResolveUtcRange("rational-channel",0,1000000000,&r,&f.error)&&r.slices[0].candidates[0].media_end_pts==3&&
              read.ResolveUtcRange("rational-channel",0,1,&a,&f.error)&&Slice(a,0,0,1,Coverage::Unknown,1)&&
              !a.slices[0].candidates[0].media_end_pts&&!a.slices[0].candidates[0].reason.empty()&&
              read.ResolveUtcRange("rational-channel",3000000000LL,4000000000LL,&b,&f.error)&&!b.slices[0].candidates[0].media_end_pts,
              "S10-C209 유리수·비정수 경계");
        Check(read.ResolveUtcRange("extreme-channel",std::numeric_limits<std::int64_t>::min(),std::numeric_limits<std::int64_t>::max(),&r,&f.error)&&
              r.slices.size()==1&&r.slices[0].candidates.size()==1&&!r.slices[0].candidates[0].media_end_pts&&
              r.slices[0].candidates[0].mapping.start_pts==std::numeric_limits<std::int64_t>::min(),"S10-C210 정수 범위 안전성");
        Check(read.ResolveUtcRange("mixed",95,115,&r,&f.error)&&r.slices.size()==3&&
              Slice(r,0,95,100,Coverage::Gap,0)&&Slice(r,1,100,110,Coverage::Confirmed,1)&&
              Slice(r,2,110,115,Coverage::Gap,0)&&r.unplaced.size()==1&&r.unplaced[0].segment_id=="unknown","S10-C211 UTC 공백·unplaced 구분");
        RecordingCatalog unopened(f.journal,f.Options(false));RecordingReadService not_open(unopened);
        r.deleted=true;r.unplaced.push_back({});
        bool invalid=!read.ResolveUtcRange("",1,2,&r,&f.error)&&r.slices.empty()&&r.unplaced.empty()&&!r.deleted;
        r.deleted=true;
        invalid=invalid&&!read.ResolveMediaRange("maps","../bad",1,2,&r,&f.error)&&!r.deleted&&
            !read.ResolveUtcRange("maps",1,2,nullptr,&f.error)&&!not_open.ResolveUtcRange("maps",1,2,&r,&f.error);
        Check(invalid,"S10-C212 입력 오류 초기화");
        Check(read.ResolveMediaRange("deleted-channel","gone",0,10,&r,&f.error)&&r.deleted&&r.slices.empty()&&
              read.ResolveMediaRange("other","gone",0,10,&a,&f.error)&&!a.deleted&&Slice(a,0,0,10,Coverage::Gap,0),
              "S10-C213 삭제·채널 경계");
        RecordingCatalog fallback(f.journal,f.Options(false));Require(fallback.Open(&f.error),f.error);RecordingReadService replay(fallback);
        bool parity=true;
        for(const auto* channel:{"maps","mixed","tail-channel","files","deleted-channel"}) {
            parity=read.ResolveUtcRange(channel,95,120,&a,&f.error)&&replay.ResolveUtcRange(channel,95,120,&b,&f.error)&&Signature(a)==Signature(b)&&parity;
        }
        Check(parity,"S10-C214 재시작 SQL·JSONL 동등");
        const auto holds=[&](){for(const auto& c:catalog.RetentionSnapshot().candidates)if(c.segment.segment_id=="held")return c.hold_count;return std::uint64_t{0};};
        Check(read.ResolveMediaRange("maps","multi",5,15,&r,&f.error)&&r.slices[1].candidates[0].mapping.start_pts==10&&
              r.slices[1].candidates[0].mapping.end_pts==20&&r.slices[1].candidates[0].mapping.reason=="clock-step"&&
              r.slices[1].candidates[0].mapping.provenance=="estimated"&&r.slices[1].candidates[0].mapping.uncertainty_ns==9&&
              Bytes(f.journal.path())==original&&holds()==1,"S10-C215 원본 mapping·조회 불변");
        Check(read.ResolveUtcRange("mixed",100,110,&r,&f.error)&&r.unplaced.size()==1&&r.unplaced[0].segment_id=="unknown"&&
              Slice(r,0,100,110,Coverage::Confirmed,1)&&r.slices[0].candidates[0].segment_id=="known",
              "S10-C216 unknown 채널 격리");
    } catch(const std::exception& e) {std::cerr<<"[setup-error] "<<e.what()<<'\n';return 2;}
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}
