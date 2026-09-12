// 파일 용도: 원본 참조의 실제 계약·원장·catalog 저장 경계를 검사한다.
#include "recording/recording_catalog.h"
#include <iostream>
#include <fstream>
#include <limits>
#include <sqlite3.h>
std::string Bytes(const std::filesystem::path& p) {
    std::ifstream in(p,std::ios::binary);return {std::istreambuf_iterator<char>(in),{}};
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    using namespace recording;
    RecordingConsumerReferenceV1 v;
    v.reference_id="reference-one";v.kind="observation";v.owner_id="owner-one";
    v.source_id="source-one";v.channel_id="channel-one";
    v.analysis_namespace="analysis-one";v.analysis_track_id="track/1";
    v.association_quality="unavailable";
    const std::string literal=R"({"schema":"media-server.recording-consumer-reference.v1","reference_id":"reference-one","kind":"observation","owner_id":"owner-one","source_id":"source-one","channel_id":"channel-one","analysis_namespace":"analysis-one","analysis_track_id":"track/1","analysis_pts":0,"association_quality":"unavailable","original":null,"request":null,"created_at_ms":0})";
    std::string error;RecordingConsumerReferenceV1 parsed;
    int pass=0,fail=0;
    const auto check=[&](bool ok,const char* label){std::cout<<(ok?"[pass] ":"[fail] ")<<label<<'\n';ok?++pass:++fail;};
    check(ParseRecordingConsumerReferenceV1(literal,&parsed,&error)&&SerializeRecordingConsumerReferenceV1(parsed)==literal,"C341 계약 왕복");
    check(!ParseRecordingConsumerReferenceV1(literal.substr(0,literal.size()-1)+",\"extra\":0}",&parsed,&error)&&
          !ParseRecordingConsumerReferenceV1("{\"kind\":\"event\","+literal.substr(1),&parsed,&error)&&
          !ParseRecordingConsumerReferenceV1(std::string(1024*1024+1,' '),&parsed,&error),"C342 unknown/중복 필드 거부");
    auto bad=v;bad.reference_id="../escape";
    bool ids=!ValidateRecordingConsumerReferenceV1(bad,&error);bad=v;bad.owner_id.clear();ids=ids&&!ValidateRecordingConsumerReferenceV1(bad,&error);
    bad=v;bad.kind="other";ids=ids&&!ValidateRecordingConsumerReferenceV1(bad,&error);
    check(ids,"C343 ID·종류·소유자 제약");
    auto associated=v;associated.association_quality="timestamp-match";
    bool quality=!ValidateRecordingConsumerReferenceV1(associated,&error);
    associated.original=RecordingConsumerOriginalV1{"source-generation",1,1,"video/0",0};
    quality=quality&&ValidateRecordingConsumerReferenceV1(associated,&error);
    associated.association_quality="nearest";quality=quality&&ValidateRecordingConsumerReferenceV1(associated,&error);
    bad=associated;bad.association_quality="ambiguous";quality=quality&&!ValidateRecordingConsumerReferenceV1(bad,&error);
    bad.original.reset();quality=quality&&ValidateRecordingConsumerReferenceV1(bad,&error);
    check(quality,"C344 품질·원본 nullable 조합");
    bool original=ValidateRecordingConsumerReferenceV1(associated,&error);
    for(int field=0;field<6;++field) {
        bad=associated;
        if(field==0)bad.original->generation_order=0;
        if(field==1)bad.original->ordinal=0;
        if(field==2)bad.original->pts_ns=std::numeric_limits<std::uint64_t>::max();
        if(field==3)bad.original->track_id="";
        if(field==4)bad.original->track_id="bad\ntrack";
        if(field==5)bad.original->track_id=std::string(1025,'a');
        original=original&&!ValidateRecordingConsumerReferenceV1(bad,&error);
    }
    bad=associated;bad.original->pts_ns=std::numeric_limits<std::int64_t>::max();bad.original->ordinal=std::numeric_limits<std::uint64_t>::max();
    original=original&&ValidateRecordingConsumerReferenceV1(bad,&error)&&ParseRecordingConsumerReferenceV1(SerializeRecordingConsumerReferenceV1(bad),&parsed,&error)&&parsed.original->ordinal==bad.original->ordinal;
    check(original,"C345 원본 수치·track 경계");
    auto event=associated;event.reference_id="event-reference";event.kind="event";event.request=RecordingConsumerRequestV1{"utc-ms",0,0,0,0};
    bool request=ValidateRecordingConsumerReferenceV1(event,&error);event.request->time_basis="media-pts-ms";
    request=request&&ParseRecordingConsumerReferenceV1(SerializeRecordingConsumerReferenceV1(event),&parsed,&error)&&parsed.request->start_ms==0;
    bad=event;bad.request->time_basis="unknown";request=request&&!ValidateRecordingConsumerReferenceV1(bad,&error);
    bad=event;bad.request.reset();request=request&&!ValidateRecordingConsumerReferenceV1(bad,&error);
    check(request,"C346 event 요청·시간축");
    bad=v;bad.request=event.request;check(!ValidateRecordingConsumerReferenceV1(bad,&error),"C347 observation 요청 금지");
    bool ranges=true;
    for(int field=0;field<6;++field) {
        bad=event;
        if(field==0)bad.request->start_ms=-1;
        if(field==1)bad.request->start_ms=1;
        if(field==2)bad.request->pre_ms=-1;
        if(field==3)bad.request->post_ms=-1;
        if(field==4)bad.request->pre_ms=1;
        if(field==5){bad.request->end_ms=std::numeric_limits<std::int64_t>::max();bad.request->post_ms=1;}
        ranges=ranges&&!ValidateRecordingConsumerReferenceV1(bad,&error);
    }
    check(ranges,"C348 요청 음수·역전·padding");
    auto unsupported=literal;unsupported.replace(unsupported.find("reference.v1"),12,"reference.v9");
    check(!ParseRecordingConsumerReferenceV1(unsupported,&parsed,&error),"C349 미지원 schema 거부");
    const std::filesystem::path root=std::filesystem::path(argv[1])/"store";
    RecordingJournal journal(RecordingJournal::ManagedOptions{root,"store-one"});
    RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,true);options.enable_v2_storage=true;
    RecordingCatalog catalog(journal,options);
    if(!journal.Open(&error)||!catalog.Open(&error)){std::cerr<<"[setup-fail] "<<error<<'\n';return 2;}
    check(catalog.PutConsumerReference(v,&error)&&catalog.QueryConsumerReferences(v.channel_id,v.kind,v.owner_id).size()==1,"C350 실제 원장 저장·조회");
    const auto saved=Bytes(journal.path());
    check(catalog.PutConsumerReference(v,&error)&&Bytes(journal.path())==saved,"C351 동일 참조 멱등");
    bool conflict=true;
    for(int field=0;field<3;++field) {
        bad=v;if(field==0){bad.kind="event";bad.request=event.request;}
        if(field==1)bad.owner_id="different-owner";
        if(field==2){bad.association_quality=associated.association_quality;bad.original=associated.original;}
        conflict=conflict&&!catalog.PutConsumerReference(bad,&error)&&Bytes(journal.path())==saved;
    }
    check(conflict,"C352 동일 ID 충돌 거부");
    const auto legacy=std::filesystem::path(argv[1])/"legacy";std::filesystem::create_directories(legacy);
    RecordingJournal raw(legacy/"journal.jsonl");
    RecordingCatalog unopened(raw,{legacy/"catalog.db",legacy,false});
    bool guards=!unopened.PutConsumerReference(v,&error)&&!std::filesystem::exists(raw.path());
    guards=guards&&raw.Open(&error)&&unopened.Open(&error)&&!unopened.PutConsumerReference(v,&error)&&Bytes(raw.path()).empty();
    check(guards,"C353 opt-in·미open 거부");
    sqlite3* db=nullptr;sqlite3_stmt* statement=nullptr;std::string sql_value;
    if(sqlite3_open_v2((root/"recording-catalog.sqlite3").c_str(),&db,SQLITE_OPEN_READONLY,nullptr)==SQLITE_OK&&
       sqlite3_prepare_v2(db,"SELECT payload_json FROM recording_consumer_references WHERE reference_id='reference-one'",-1,&statement,nullptr)==SQLITE_OK&&sqlite3_step(statement)==SQLITE_ROW)
        sql_value=reinterpret_cast<const char*>(sqlite3_column_text(statement,0));
    sqlite3_finalize(statement);if(db)sqlite3_close(db);
    const auto replay_root=std::filesystem::path(argv[1])/"replay";std::filesystem::create_directories(replay_root);
    {std::ofstream out(replay_root/"journal.jsonl");out<<saved;}
    RecordingJournal replay(replay_root/"journal.jsonl");RecordingCatalog::Options replay_options(replay_root/"catalog.db",replay_root,false);replay_options.enable_v2_storage=true;
    RecordingCatalog reopened(replay,replay_options);
    const bool replayed=replay.Open(&error)&&reopened.Open(&error);
    const auto found=reopened.QueryConsumerReferences(v.channel_id,v.kind,v.owner_id);
    check(sql_value==literal&&replayed&&found.size()==1&&SerializeRecordingConsumerReferenceV1(found[0])==literal&&
          reopened.QueryConsumerReferences("wrong-channel",v.kind,v.owner_id).empty(),"C354 SQL·JSONL 재시작 동등");
    bool checkpoint=catalog.Checkpoint(&error)&&catalog.QueryConsumerReferences(v.channel_id,v.kind,v.owner_id).size()==1&&Bytes(journal.path())==saved;
    const auto cp_root=std::filesystem::path(argv[1])/"checkpoint-restart";
    RecordingCatalog::Options cp_options(cp_root/"recording-catalog.sqlite3",cp_root,true);cp_options.enable_v2_storage=true;
    {
        RecordingJournal cp(RecordingJournal::ManagedOptions{cp_root,"store-one"});RecordingCatalog c(cp,cp_options);
        checkpoint=cp.Open(&error)&&c.Open(&error)&&c.PutConsumerReference(event,&error)&&c.Checkpoint(&error)&&checkpoint;
    }
    for(bool sql:{false,true}) {
        RecordingJournal cp(RecordingJournal::ManagedOptions{cp_root,"store-one"});cp_options.prefer_sqlite=sql;RecordingCatalog c(cp,cp_options);
        const bool opened=cp.Open(&error)&&c.Open(&error);
        const auto result=c.QueryConsumerReferences(event.channel_id,event.kind,event.owner_id);
        checkpoint=opened&&result.size()==1&&SerializeRecordingConsumerReferenceV1(result[0])==SerializeRecordingConsumerReferenceV1(event)&&checkpoint;
    }
    check(checkpoint,"C355 checkpoint 참조 보존");
    bool rejection=true;int number=0;
    for(const std::string mode:{"malformed","conflict","unknown","tail","optout","entity","extra","same-id","cross-before","cross-after"}) {
        const auto dir=std::filesystem::path(argv[1])/("invalid-"+std::to_string(number++));std::filesystem::create_directories(dir);
        auto content=saved;
        RecordingMutationV1 m;m.mutation_id="malformed-id";m.entity_id=v.reference_id;m.mutation_type=RecordingMutationType::ConsumerReferencePut;
        m.payload_json="{\"reference\":{}}";
        if(mode=="malformed")content+=SerializeRecordingMutationV1(m)+"\n";
        if(mode=="conflict") {bad=v;bad.owner_id="other";m.payload_json="{\"reference\":"+SerializeRecordingConsumerReferenceV1(bad)+"}";content+=SerializeRecordingMutationV1(m)+"\n";}
        if(mode=="unknown")content+="{\"schema\":\"future\"}\n";
        if(mode=="tail")content+="{";
        if(mode=="entity"||mode=="extra") {
            m.entity_id=mode=="entity"?"wrong-reference":v.reference_id;
            m.payload_json="{\"reference\":"+literal+(mode=="extra"?",\"extra\":0}":"}");
            content+=SerializeRecordingMutationV1(m)+"\n";
        }
        if(mode=="same-id"||mode=="cross-before"||mode=="cross-after") {
            const auto records=journal.Replay().mutations;
            if(records.empty())return 2;
            m=records.front();
            if(mode=="same-id") {bad=v;bad.owner_id="other";m.payload_json="{\"reference\":"+SerializeRecordingConsumerReferenceV1(bad)+"}";}
            else {m.mutation_type=RecordingMutationType::EventLinkCreated;m.payload_json="{}";}
            const auto changed=SerializeRecordingMutationV1(m)+"\n";
            content=mode=="cross-before"?changed+saved:saved+changed;
        }
        {std::ofstream out(dir/"journal.jsonl");out<<content;std::ofstream sql(dir/"catalog.db");sql<<"original-sqlite";}
        RecordingJournal invalid(dir/"journal.jsonl");RecordingCatalog::Options o(dir/"catalog.db",dir,true);o.enable_v2_storage=mode!="optout";
        RecordingCatalog denied(invalid,o);
        const bool refused=invalid.Open(&error)&&!denied.Open(&error)&&!denied.Open(&error)&&Bytes(invalid.path())==content&&Bytes(o.sqlite_path)=="original-sqlite";
        std::cout<<"[detail] C356 "<<mode<<" preserved="<<(refused?"true":"false")<<'\n';
        rejection=refused&&rejection;
    }
    check(rejection,"C356 손상·충돌 replay 선차단");
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
