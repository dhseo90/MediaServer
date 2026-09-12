// 파일 용도: 실제 managed catalog의 원본 수락 결박과 복구 경계를 검증한다.
#include "recording/recording_catalog.h"
#include <sqlite3.h>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <stdexcept>
using namespace recording;
namespace {
int passed=0,failed=0;
void Check(bool ok,const char* name){std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';ok?++passed:++failed;}
void Require(bool ok,const std::string& error){if(!ok)throw std::runtime_error(error);}
std::string Bytes(const std::filesystem::path& p){std::ifstream in(p,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}};}
RecordingSegmentV2 Segment(const std::string& id) {
    RecordingSegmentV2 s;s.segment_id=id;s.source_id="source";s.channel_id="channel";s.store_id="store";
    s.order_request_id="order-"+id;s.media_epoch_id="media-epoch";s.media_end_pts=100000;
    s.container="mp4";s.video_codecs={"h264"};s.audio_omitted_reason="source-no-audio";
    s.size_bytes=12;s.checksum_sha256=std::string(64,'a');s.created_at_ms=1;s.finalized_at_ms=2;
    s.mappings={{"media-server.recording-utc-mapping.v1","mapping-"+id,0,100000,"unknown",{},{},{},"clock-unavailable"}};
    return s;
}
RecordingSourceBindingV1 Binding(const RecordingSegmentV2& s) {
    RecordingSourceBindingV1 b;b.segment_id=s.segment_id;b.source_id=s.source_id;b.channel_id=s.channel_id;
    b.store_id=s.store_id;b.media_epoch_id=s.media_epoch_id;b.source_generation="source-generation";
    b.generation_order=7;b.track_id="video/0";b.samples={{1,10},{3,20}};b.last_accepted_ordinal=3;return b;
}
struct Fixture {
    std::filesystem::path root;
    std::unique_ptr<RecordingJournal> journal;
    std::unique_ptr<RecordingCatalog> catalog;
    std::string error;
    explicit Fixture(const std::filesystem::path& p):root(p) {
        journal=std::make_unique<RecordingJournal>(RecordingJournal::ManagedOptions{root,"store"});
        Require(journal->Open(&error),error);Open(true);
    }
    void Open(bool sql) {
        RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,sql);o.enable_v2_storage=true;
        catalog=std::make_unique<RecordingCatalog>(*journal,o);Require(catalog->Open(&error),error);
    }
    void Reopen(bool sql) {catalog.reset();journal.reset();
        journal=std::make_unique<RecordingJournal>(RecordingJournal::ManagedOptions{root,"store"});
        Require(journal->Open(&error),error);Open(sql);
    }
    RecordingSegmentV2 Prepare(const std::string& id) {
        auto s=Segment(id);RecordingOrderReservationV1 order;
        Require(journal->ReserveRecordingOrder("store",s.order_request_id,id,s.channel_id,&order,&error),error);
        s.order_sequence=order.sequence;std::ofstream out(root/(id+".mp4"),std::ios::binary);
        out.write("\0\0\0\x0c" "ftypisom",12);return s;
    }
    std::string Path(const RecordingSegmentV2& s)const{return (root/(s.segment_id+".mp4")).string();}
};
bool Query(Fixture& f,std::uint64_t ordinal,std::uint64_t pts,RecordingOriginalResult* out) {
    return f.catalog->ResolveOriginalSample("channel","source","source-generation",7,"video/0",ordinal,pts,out,&f.error);
}
bool RawOpen(const std::filesystem::path& root,const std::string& contents,bool optin,bool expected) {
    std::filesystem::create_directories(root);
    const auto path=root/"journal.jsonl";
    {std::ofstream out(path);out<<contents;}
    const auto sql=root/"index.sqlite3";
    if(!expected){std::ofstream out(sql);out<<"untouched-sqlite";}
    RecordingJournal journal(path);std::string error;
    if(!journal.Open(&error))return false;
    RecordingCatalog::Options options(sql,root,true);options.enable_v2_storage=optin;
    RecordingCatalog catalog(journal,options);
    const bool opened=catalog.Open(&error);
    RecordingOriginalResult result;
    const bool replay_state=!expected || (opened&&
        catalog.SegmentLifecycleV2("one")==RecordingLifecycle::Deleted&&
        catalog.SegmentLifecycleV2("second")==RecordingLifecycle::Corrupt&&
        catalog.ResolveOriginalSample("channel","source","source-generation",7,"video/0",1,10,&result,&error)&&
        result.exact.empty()&&result.unknown.empty());
    return opened==expected&&replay_state&&Bytes(path)==contents&&
        (expected||(Bytes(sql)=="untouched-sqlite"&&!catalog.Open(&error)));
}
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        Fixture f(std::filesystem::path(argv[1])/"managed");
        auto segment=f.Prepare("one");auto binding=Binding(segment);std::string error;
        RecordingSourceBindingV1 parsed;
        const auto json=SerializeRecordingSourceBindingV1(binding);
        auto wrong_schema=json;
        if(!wrong_schema.empty())wrong_schema.replace(wrong_schema.find("recording-source-binding.v1"),27,"recording-source-binding.v9");
        Check(!json.empty()&&ParseRecordingSourceBindingV1(json,&parsed,&error)&&
              SerializeRecordingSourceBindingV1(parsed)==json&&!ParseRecordingSourceBindingV1("{\"schema\":0}",&parsed,&error)&&
              !ParseRecordingSourceBindingV1(wrong_schema,&parsed,&error)&&
              !ParseRecordingSourceBindingV1(std::string(512*1024+1,' '),&parsed,&error)&&
              !ParseRecordingSourceBindingV1(json.substr(0,json.size()-1)+",\"extra\":1}",&parsed,&error),
              "S10-C301 결박 schema 왕복");
        bool ids=true;
        for(const auto& track:{"video-0","123","raw/stream/0"}) {auto b=binding;b.track_id=track;ids=ValidateRecordingSourceBindingV1(b,&error)&&ids;}
        for(int mode=0;mode<8;++mode) {auto b=binding;
            if(mode==0)b.source_generation.clear();if(mode==1)b.generation_order=0;if(mode==2)b.samples[0].ordinal=0;
            if(mode==3)b.samples[1].ordinal=1;if(mode==4)b.track_id.clear();if(mode==5)b.track_id="bad\ntrack";
            if(mode==6)b.track_id=std::string(1025,'a');if(mode==7)b.samples={{3,10},{1,20}};
            ids=!ValidateRecordingSourceBindingV1(b,&error)&&ids;
        }
        Check(ids,"S10-C302 식별·ordinal 검증");
        auto reorder=binding;reorder.samples={{1,20},{2,10},{3,10}};
        Check(ValidateRecordingSourceBindingForSegment(reorder,segment,&error)&&
              ParseRecordingSourceBindingV1(SerializeRecordingSourceBindingV1(reorder),&parsed,&error)&&parsed.samples[1].pts_ns==10,
              "S10-C303 PTS 재정렬 보존");
        auto rational=segment;rational.time_base_den=3;auto rb=binding;rb.samples={{1,1000000000}};rb.last_accepted_ordinal=1;
        bool ranges=ValidateRecordingSourceBindingForSegment(rb,rational,&error);rb.samples[0].pts_ns=1;
        ranges=!ValidateRecordingSourceBindingForSegment(rb,rational,&error)&&ranges;
        auto outside=binding;outside.samples[1].pts_ns=100000;
        ranges=!ValidateRecordingSourceBindingForSegment(outside,segment,&error)&&ranges;
        outside.samples[1].pts_ns=std::numeric_limits<std::uint64_t>::max();
        ranges=!ValidateRecordingSourceBindingForSegment(outside,segment,&error)&&ranges;
        auto huge=segment;huge.time_base_den=std::numeric_limits<std::int32_t>::max();
        outside=binding;outside.samples[1].pts_ns=std::numeric_limits<std::int64_t>::max();
        ranges=!ValidateRecordingSourceBindingForSegment(outside,huge,&error)&&ranges;
        auto opened=segment;opened.media_end_pts.reset();opened.mappings[0].end_pts.reset();
        Check(ranges&&ValidateRecordingSourceBindingForSegment(binding,opened,&error),"S10-C304 미디어 범위·timebase");
        auto cap=binding;cap.samples.clear();for(std::uint64_t i=1;i<=4096;++i)cap.samples.push_back({i*2,i});
        cap.index_complete=false;cap.last_accepted_ordinal=9000;cap.incomplete_reason="sample-index-cap";
        bool caps=ValidateRecordingSourceBindingV1(cap,&error);auto invalid=cap;invalid.samples.push_back({9000,9000});
        caps=!ValidateRecordingSourceBindingV1(invalid,&error)&&caps;invalid=cap;invalid.last_accepted_ordinal=8192;
        auto short_cap=cap;short_cap.samples.pop_back();
        caps=!ValidateRecordingSourceBindingV1(short_cap,&error)&&caps;
        Check(caps&&!ValidateRecordingSourceBindingV1(invalid,&error),"S10-C305 색인 상한·미색인 꼬리");
        const auto before=f.journal->Replay().mutations.size();
        const bool bound=f.catalog->FinalizeBoundSegmentV2(segment,binding,f.Path(segment),&f.error);
        const auto replay=f.journal->Replay();
        const auto first_bound=replay.mutations.back();
        Check(bound&&replay.mutations.size()==before+1&&f.catalog->FindSourceBinding("one")&&
              replay.mutations.back().payload_json.find("\"sourceBinding\"")!=std::string::npos,"S10-C306 단일 bound mutation");
        bool identity=true;for(int mode=0;mode<5;++mode){auto b=binding;
            if(mode==0)b.segment_id="other";if(mode==1)b.source_id="other";if(mode==2)b.channel_id="other";
            if(mode==3)b.store_id="other";if(mode==4)b.media_epoch_id="other";
            identity=!f.catalog->ValidateBoundFinalizeRecoveryV2(segment,b,f.Path(segment),&error)&&identity;
        }
        Check(identity,"S10-C307 source·저장 identity 결박");
        bool inserted=true;const auto bytes=Bytes(f.journal->path());auto changed=binding;changed.samples[0].pts_ns=11;
        Check(bound&&f.catalog->RecoverBoundSegmentV2(segment,binding,f.Path(segment),&inserted,&error)&&!inserted&&
              !f.catalog->RecoverBoundSegmentV2(segment,changed,f.Path(segment),&inserted,&error)&&Bytes(f.journal->path())==bytes,
              "S10-C308 불변·멱등");
        auto unbound=f.Prepare("unbound");Require(f.catalog->FinalizeSegmentV2(unbound,f.Path(unbound),&error),error);
        Check(bound&&!f.catalog->RecoverFinalizedSegmentV2(segment,f.Path(segment),&inserted,&error)&&
              !f.catalog->RecoverBoundSegmentV2(unbound,Binding(unbound),f.Path(unbound),&inserted,&error),"S10-C309 소급·다운그레이드 금지");
        RecordingOriginalResult result;
        bool tuple=true;
        for(int i=0;i<3;++i) {
            tuple=f.catalog->ResolveOriginalSample("channel","source",i==0?"other-generation":"source-generation",
                i==1?8:7,i==2?"other-track":"video/0",1,10,&result,&error)&&result.exact.empty()&&tuple;
        }
        Check(tuple&&Query(f,1,10,&result)&&result.exact.size()==1&&result.unknown.empty()&&result.exact[0].sample&&
              result.exact[0].sample->ordinal==1&&Query(f,1,11,&result)&&result.exact.empty(),"S10-C310 정확한 원본 tuple 조회");
        auto capped=f.Prepare("capped");cap.segment_id=capped.segment_id;
        const bool cap_bound=f.catalog->FinalizeBoundSegmentV2(capped,cap,f.Path(capped),&error);
        Check(cap_bound&&Query(f,8999,42,&result)&&result.exact.empty()&&result.unknown.size()==1&&
              Query(f,9001,42,&result)&&result.unknown.empty()&&Query(f,4095,42,&result)&&result.unknown.empty(),
              "S10-C311 미색인·실제 부재 구분");
        auto second=f.Prepare("second");auto sb=Binding(second);
        Check(f.catalog->FinalizeBoundSegmentV2(second,sb,f.Path(second),&error)&&Query(f,1,10,&result)&&
              result.exact.size()==2&&result.exact[0].segment.segment_id=="one"&&result.exact[1].segment.segment_id=="second",
              "S10-C312 복수 segment 후보");
        bool states=bound&&f.catalog->RequestDeletion("one","continuous-capacity",&error);
        states=states&&Query(f,1,10,&result)&&result.exact.size()==1&&result.exact[0].segment.segment_id=="second"&&
            !f.catalog->ValidateBoundFinalizeRecoveryV2(segment,binding,f.Path(segment),&error);
        if(states){RecordingTombstoneV2 t;t.tombstone_id="deleted-one";t.segment=segment;t.deletion_reason="continuous-capacity";t.deleted_at_ms=9;
            std::filesystem::remove(f.Path(segment));states=f.catalog->CompleteDeletionV2(t,&error);}
        states=states&&f.catalog->MarkSegmentCorrupt("second","checksum-mismatch",&error);
        const auto state_log=Bytes(f.journal->path());
        const bool duplicate_replay=RawOpen(std::filesystem::path(argv[1])/"same-replay",
            state_log+SerializeRecordingMutationV1(first_bound)+"\n",true,true);
        Check(states&&duplicate_replay&&Query(f,1,10,&result)&&result.exact.empty()&&
              !f.catalog->RecoverBoundSegmentV2(segment,binding,f.Path(segment),&inserted,&error),"S10-C313 삭제·corrupt·pending 차단");
        result.exact.push_back({});
        RecordingCatalog::Options unopened_options(f.root/"unused.sqlite3",f.root,false);unopened_options.enable_v2_storage=true;
        RecordingCatalog unopened(*f.journal,unopened_options);
        bool query_errors=!unopened.ResolveOriginalSample("channel","source","source-generation",7,"video/0",1,10,&result,&error);
        for(int i=0;i<2;++i)query_errors=f.catalog->ResolveOriginalSample(i==0?"other":"channel",i==1?"other":"source",
            "source-generation",7,"video/0",1,10,&result,&error)&&result.exact.empty()&&result.unknown.empty()&&query_errors;
        result.exact.push_back({});
        Check(query_errors&&!f.catalog->ResolveOriginalSample("","source","source-generation",7,"video/0",1,10,&result,&error)&&result.exact.empty()&&
              !f.catalog->ResolveOriginalSample("channel","source","source-generation",7,"video/0",1,10,nullptr,&error),"S10-C314 채널·조회 오류 경계");
        bool sql_ok=false;sqlite3* db=nullptr;
        if(sqlite3_open_v2((f.root/"recording-catalog.sqlite3").c_str(),&db,SQLITE_OPEN_READONLY,nullptr)==SQLITE_OK) {
            sqlite3_stmt* stmt=nullptr;
            if(sqlite3_prepare_v2(db,"SELECT payload_json FROM recording_source_bindings WHERE segment_id='capped'",-1,&stmt,nullptr)==SQLITE_OK&&
               sqlite3_step(stmt)==SQLITE_ROW)sql_ok=std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt,0)))==SerializeRecordingSourceBindingV1(cap);
            sqlite3_finalize(stmt);sqlite3_close(db);
        }
        f.Reopen(false);
        Check(sql_ok&&Query(f,8999,42,&result)&&result.unknown.size()==1,"S10-C315 SQL·JSONL 재시작 동등");
        const bool checkpoint=f.catalog->Checkpoint(&error);f.Reopen(true);
        Check(checkpoint&&Query(f,8999,42,&result)&&result.unknown.size()==1&&
              f.catalog->SegmentLifecycleV2("one")==RecordingLifecycle::Deleted,"S10-C316 checkpoint 보존");
        RecordingMutationV1 bad;bad.mutation_id="bad";bad.entity_id="bad";bad.occurred_at_ms=1;
        const auto raw=std::string("{\"schema\":\"media-server.recording-mutation.v1\",\"mutationId\":\"bad\",\"mutationType\":\"segment_v2_bound_finalized\",\"occurredAtMs\":1,\"entityId\":\"bad\",\"payload\":{}}");
        const auto bad_root=std::filesystem::path(argv[1])/"malformed";
        std::filesystem::create_directories(bad_root);
        const auto bad_path=bad_root/"journal.jsonl";
        {std::ofstream out(bad_path);out<<raw<<'\n';}
        RecordingJournal bad_journal(bad_path);Require(bad_journal.Open(&error),error);
        RecordingCatalog bad_catalog(bad_journal,{bad_root/"index.sqlite3",bad_root,true});
        const auto good_log=Bytes(f.journal->path());
        auto conflict=first_bound;conflict.mutation_type=RecordingMutationType::ObservationV2Put;conflict.payload_json="{}";
        auto changed_id=first_bound;changed_id.mutation_id="new-binding-id";
        bool corrupt=RawOpen(std::filesystem::path(argv[1])/"bad-optin",raw+"\n",true,false)&&
            RawOpen(std::filesystem::path(argv[1])/"tail",good_log+"{",true,false)&&
            RawOpen(std::filesystem::path(argv[1])/"unsupported",good_log+"{\"schema\":\"future\"}\n",true,false)&&
            RawOpen(std::filesystem::path(argv[1])/"conflict",good_log+SerializeRecordingMutationV1(conflict)+"\n",true,false)&&
            RawOpen(std::filesystem::path(argv[1])/"new-id",good_log+SerializeRecordingMutationV1(changed_id)+"\n",true,false);
        Check(corrupt&&ParseRecordingMutationV1(raw,&bad,&error)&&!bad_catalog.Open(&error)&&
              Bytes(bad_path)==raw+"\n"&&!std::filesystem::exists(bad_root/"index.sqlite3"),"S10-C317 손상 원장 선차단");
        auto no_order=Segment("no-order");no_order.order_sequence=999;
        {std::ofstream media(f.Path(no_order));media<<"file-exists";}
        auto wrong_order=f.Prepare("wrong-order");++wrong_order.order_sequence;
        Check(!f.catalog->FinalizeBoundSegmentV2(no_order,Binding(no_order),f.Path(no_order),&error)&&
              !f.catalog->FinalizeBoundSegmentV2(wrong_order,Binding(wrong_order),f.Path(wrong_order),&error)&&
              RawOpen(std::filesystem::path(argv[1])/"optout",good_log,false,false)&&
              RawOpen(std::filesystem::path(argv[1])/"missing-reservation",SerializeRecordingMutationV1(first_bound)+"\n",true,false),
              "S10-C318 예약·옵트인 경계");
        Require(f.catalog->AdjustHoldCount("capped",1,&error),error);
        const auto holds=[&]() {
            for(const auto& candidate:f.catalog->RetentionSnapshot().candidates) {
                if(candidate.Id()=="capped")return candidate.hold_count;
            }
            return std::uint64_t{0};
        };
        const auto journal_bytes=Bytes(f.journal->path());const auto preserved=SerializeRecordingSegmentV2(unbound);
        RecordingLocationCatalogSnapshot snapshot;
        Check(f.catalog->SnapshotLocationsV2("channel",&snapshot,&error)&&
              SerializeRecordingSegmentV2(*f.catalog->FindSegmentV2ById("unbound"))==preserved&&
              Query(f,8999,42,&result)&&holds()==1&&Bytes(f.journal->path())==journal_bytes&&
              !f.catalog->FindSourceBinding("unbound"),"S10-C319 기존 segment·조회 불변");
        auto final=f.Prepare("final");const auto fb=Binding(final);
        Check(!f.catalog->FinalizeBoundSegmentV2(final,fb,(f.root/"missing.mp4").string(),&error)&&
              f.catalog->FinalizeBoundSegmentV2(final,fb,f.Path(final),&error)&&
              !f.catalog->FinalizeBoundSegmentV2(final,fb,f.Path(final),&error),"S10-C320 실제 finalize 수락 경계");
    }catch(const std::exception& e){std::cerr<<"[setup-error] "<<e.what()<<'\n';return 2;}
    std::cout<<"[summary] pass="<<passed<<" fail="<<failed<<'\n';return failed?1:0;
}
