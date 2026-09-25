// B read-only Journal 준비만 검사한다. Catalog/active 의미 적용·쓰기 활성화가 아니다.
#include "recording/recording_journal.h"
#include "recording/recording_catalog_snapshot.h"
#include <algorithm>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <limits>
#include <fcntl.h>
#include <sys/wait.h>
#include <unistd.h>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif
namespace recording {
struct RecordingJournalGenerationReadOnlyProbe {
    static bool Link(const RecordingJournal& j,const std::string& id,RecordingMutationLink* out){return j.MakeGenerationMutationLink(id,out,nullptr);}
    static bool Get(const RecordingJournal& j,const RecordingMutationLink& link,RecordingMutationHandle* out){return j.AcquireMutationLink(link,out,nullptr);}
    static void End(const RecordingJournal& j){j.EndGenerationMutationLinks();}
    static bool Attach(RecordingJournal& j,const std::filesystem::path& root,std::string* error){return j.AttachCatalog(&j,root,root/"recording-catalog.sqlite3",true,error);}
    static bool Append(RecordingJournal& j,const RecordingMutationV1& m,std::string* error){return j.AppendOwned(m,&j,error);}
    static int Active(const RecordingJournal& j){return j.managed_fd_;}
    static int Lease(const RecordingJournal& j){return j.lease_fd_;}
    static bool Checkpoint(RecordingJournal& j,std::string* error){RecordingMutationHandles candidate;
        return j.PrepareCheckpoint(&j,&candidate,error)&&j.CommitCheckpoint(&j,candidate,false,error);}
};
}
using namespace recording;
namespace {
unsigned failures=0;
std::string error;
void Check(const char* group,bool value,const char* detail){std::cout<<group<<' '<<(value?"PASS":"FAIL")<<' '<<detail<<'\n';if(!value){++failures;std::cerr<<error<<'\n';}}
void Need(bool value){if(!value)throw std::runtime_error("fixture: "+error);}
void Write(const std::filesystem::path& path,const std::string& bytes){std::ofstream out(path,std::ios::binary|std::ios::trunc);out<<bytes;Need(bool(out));}
[[maybe_unused]] std::string Read(const std::filesystem::path& path){std::ifstream in(path,std::ios::binary);Need(bool(in));return {std::istreambuf_iterator<char>(in),{}};}
std::string Marker(){return "{\"format\":\"media-server.managed-recording-store.v2\",\"storeId\":\"store\",\"manifest\":\"recording-generation.json\"}\n";}
RecordingMutationV1 Mutation(){RecordingMutationV1 m;m.mutation_id="active";m.entity_id="event";m.mutation_type=RecordingMutationType::EventLinkCreated;m.occurred_at_ms=1;m.payload_json="{}";return m;}
RecordingJournal::ManagedOptions Options(const std::filesystem::path& root){return {root,"store",{1024*1024,1024*1024,1024*1024,1024*1024,100,100}};}
void V1(const std::filesystem::path& root,const char* group) {
    const auto mutation=Mutation();
    {RecordingJournal j(RecordingJournal::ManagedOptions{root,"store"});
        Check(group,j.Open(&error)&&j.Append(mutation,&error)&&j.Replay().mutations.size()==1,"backend-enabled v1 open append replay");
#if MEDIA_SERVER_USE_OPENSSL
        Check(group,RecordingJournalGenerationReadOnlyProbe::Attach(j,root,&error)&&RecordingJournalGenerationReadOnlyProbe::Checkpoint(j,&error),"v1 checkpoint remains available");
#endif
    }
    RecordingJournal reopened(RecordingJournal::ManagedOptions{root,"store"});Check(group,reopened.Open(&error)&&reopened.Replay().mutations.size()==1,"v1 reopen unchanged");
}
#if MEDIA_SERVER_USE_OPENSSL
std::string Hash(const std::string& bytes){unsigned char digest[32];unsigned size=0;Need(EVP_Digest(bytes.data(),bytes.size(),digest,&size,EVP_sha256(),nullptr)==1&&size==32);
    const char* hex="0123456789abcdef";std::string out;for(auto c:digest){out+=hex[c>>4];out+=hex[c&15];}return out;}
void Fixture(const std::filesystem::path& root,std::uint64_t historical_size=1024) {
    std::filesystem::create_directories(root);
    RecordingSegmentV1 s;s.segment_id="segment";s.source_id="source";s.channel_id="channel";s.stream_epoch_id="epoch";
    s.start={1000,0,1,1000000000};s.end={2000,1000000000,1,1000000000};s.container="mp4";s.video_codecs={"h264"};
    s.audio_omitted_reason="source-no-audio";s.size_bytes=12;s.checksum_sha256=std::string(64,'a');s.lifecycle=RecordingLifecycle::Finalized;s.created_at_ms=1000;s.finalized_at_ms=2000;
    auto m=Mutation();m.mutation_id="historical";m.entity_id="segment";m.mutation_type=RecordingMutationType::SegmentFinalized;m.payload_json="{\"segment\":"+SerializeRecordingSegmentV1(s)+",\"mediaRelpath\":\"channel/file.mp4\"}";
    const auto raw=SerializeRecordingMutationV1(m)+"\n";
    RecordingIdentityShard shard;shard.store_id="store";shard.generation=2;shard.archives={{"evidence-1-0.jsonl",std::max<std::uint64_t>(historical_size,raw.size()),Hash("unopened archive")}};
    RecordingIdentityRow row;row.mutation_id=m.mutation_id;row.entity_id=m.entity_id;row.type=m.mutation_type;row.occurred_at_ms=m.occurred_at_ms;
    row.global_ordinal=7;row.identity=Hash(SerializeRecordingMutationV1(m));row.length=raw.size();row.raw_sha256=Hash(raw);shard.rows={row};
    std::string identity;Need(SerializeRecordingIdentityShard(shard,&identity,&error));Write(root/"identity-2.jsonl",identity);
    RecordingCatalogSnapshot snapshot;snapshot.store_id="store";snapshot.generation=2;snapshot.cut_ordinal=10;snapshot.identity_head={"identity-2.jsonl",identity.size(),Hash(identity)};
    snapshot.rows={{"accepted-state","historical","{\"mutationId\":\"historical\",\"globalOrdinal\":7,\"type\":\"segment_finalized\"}"},
        {"media-path","segment","\"channel/file.mp4\""},{"segment-v1","segment",SerializeRecordingSegmentV1(s)}};
    std::string bytes;Need(SerializeRecordingCatalogSnapshot(snapshot,&bytes,&error));Write(root/"snapshot-2.jsonl",bytes);
    const auto active=SerializeRecordingMutationV1(Mutation())+"\n";Write(root/"active-2.jsonl",active);
    RecordingGenerationManifest manifest;manifest.store_id="store";manifest.generation=2;manifest.cut_ordinal=10;
    manifest.snapshot={"snapshot-2.jsonl",bytes.size(),Hash(bytes)};manifest.active={"active-2.jsonl",0,Hash("")};
    Need(SerializeRecordingGenerationManifest(manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);Write(root/".recording-store-format",Marker());
    Write(root/"recording-v2-mutations.jsonl","preserved legacy original\n");
}
[[maybe_unused]] std::string Original(const std::filesystem::path& root) {
    std::string result;for(const char* name:{".recording-store-format","recording-generation.json","identity-2.jsonl","snapshot-2.jsonl","active-2.jsonl","recording-v2-mutations.jsonl"})result+=Read(root/name);return result;
}
#if MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
RecordingMutationV1 Reservation(const std::string& request,const std::string& segment,std::int64_t sequence,
    const std::string& store="store",std::int64_t time=2,const std::string& channel="channel") {
    auto m=Mutation();m.mutation_id=request;m.entity_id=segment;m.mutation_type=RecordingMutationType::RecordingOrderReserved;m.occurred_at_ms=time;
    m.payload_json="{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\""+store+"\",\"requestId\":\""+request+
        "\",\"segmentId\":\""+segment+"\",\"channelId\":\""+channel+"\",\"sequence\":"+std::to_string(sequence)+"}";return m;
}
void SaveSnapshot(const std::filesystem::path& root,RecordingCatalogSnapshot snapshot) {
    RecordingGenerationManifest manifest;Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&manifest,&error));
    std::string bytes;Need(SerializeRecordingCatalogSnapshot(snapshot,&bytes,&error));Write(root/"snapshot-2.jsonl",bytes);
    manifest.cut_ordinal=snapshot.cut_ordinal;manifest.snapshot.size=bytes.size();manifest.snapshot.sha256=Hash(bytes);
    Need(SerializeRecordingGenerationManifest(manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);
}
RecordingMutationV1 Historical(const std::filesystem::path& root) {
    RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
    auto m=Mutation();m.mutation_id="historical";m.entity_id="segment";m.mutation_type=RecordingMutationType::SegmentFinalized;
    m.payload_json="{\"segment\":"+snapshot.rows.back().value_json+",\"mediaRelpath\":\"channel/file.mp4\"}";return m;
}
void SeedHistoryMutation(const std::filesystem::path& root,const RecordingMutationV1& m) {
    RecordingIdentityShard shard;Need(ParseRecordingIdentityShard(Read(root/"identity-2.jsonl"),&shard,&error));
    RecordingIdentityRow row;
    row.mutation_id=m.mutation_id;row.type=m.mutation_type;row.entity_id=m.entity_id;row.occurred_at_ms=m.occurred_at_ms;row.global_ordinal=8;
    row.identity=Hash(SerializeRecordingMutationV1(m));
    if(m.mutation_type==RecordingMutationType::EventLinkReceipt) {
        const auto at=m.payload_json.find("\"originalSha256\":\"");Need(at!=std::string::npos);
        row.identity=m.payload_json.substr(at+18,64);
    }
    row.offset=shard.rows.back().offset+shard.rows.back().length;
    const auto raw=SerializeRecordingMutationV1(m)+"\n";row.length=raw.size();row.raw_sha256=Hash(raw);
    if(m.mutation_type==RecordingMutationType::RecordingOrderReserved) {
        RecordingOrderReservationV1 order;Need(ParseRecordingOrderReservationV1(m.payload_json,&order,&error));row.reservation=order;
    }
    shard.rows.push_back(row);shard.archives[0].size=std::max(shard.archives[0].size,row.offset+row.length);
    std::string bytes;Need(SerializeRecordingIdentityShard(shard,&bytes,&error));Write(root/"identity-2.jsonl",bytes);
    RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
    snapshot.identity_head.size=bytes.size();snapshot.identity_head.sha256=Hash(bytes);SaveSnapshot(root,snapshot);
}
void SeedReservation(const std::filesystem::path& root){SeedHistoryMutation(root,Reservation("old-order","reserved",4));}
void ActiveRows(const std::filesystem::path& root,const std::vector<RecordingMutationV1>& rows) {
    std::string bytes;for(const auto& row:rows)bytes+=SerializeRecordingMutationV1(row)+"\n";Write(root/"active-2.jsonl",bytes);
}
void IndexCases(const std::filesystem::path& base) {
    const auto run=[&](const std::string& label,const std::vector<RecordingMutationV1>& rows,bool success,bool seed=true) {
        const auto root=base/label;Fixture(root);if(seed)SeedReservation(root);ActiveRows(root,rows);const auto original=Original(root);
        RecordingJournal j(Options(root));const bool opened=j.Open(&error);
        Check(success?"B02-J08":"B02-J09",opened==success&&Original(root)==original&&
            (success?j.HasManagedLease():!j.HasManagedLease()&&RecordingJournalGenerationReadOnlyProbe::Active(j)<0&&RecordingJournalGenerationReadOnlyProbe::Lease(j)<0),label.c_str());
    };
    const auto seed=base/"identity-source";Fixture(seed);const auto historical=Historical(seed);
    run("historical-identical-retry",{historical},true);
    run("active-identical-retry",{Mutation(),Mutation()},true);
    run("reservation-same-retry-and-gap",{Reservation("old-order","reserved",4),Reservation("new-order","new-segment",9),Reservation("new-order","new-segment",9)},true);
    auto bad=historical;bad.payload_json="{}";run("historical-payload-conflict",{bad},false);
    bad=historical;++bad.occurred_at_ms;run("historical-time-conflict",{bad},false);
    bad=Mutation();bad.payload_json="{\"different\":true}";run("active-payload-conflict",{Mutation(),bad},false);
    bad=Mutation();bad.mutation_type=RecordingMutationType::ObservationPut;run("active-type-conflict",{Mutation(),bad},false);
    run("reservation-timestamp-conflict",{Reservation("old-order","reserved",4,"store",3)},false);
    run("reservation-tuple-conflict",{Reservation("old-order","reserved",4,"store",2,"other-channel")},false);
    run("reservation-retrograde",{Reservation("new-order","new-segment",3)},false);
    run("reservation-segment-reuse",{Reservation("new-order","reserved",9)},false);
    run("reservation-ordinary-id-collision",{Reservation("historical","new-segment",9)},false);
    run("reservation-legacy-segment-collision",{Reservation("new-order","segment",9)},false);
    run("reservation-store-conflict",{Reservation("new-order","new-segment",9,"other-store")},false);
    run("first-reservation-store-conflict",{Reservation("new-order","new-segment",9,"other-store")},false,false);
    bad=Mutation();bad.mutation_id="old-order";run("ordinary-reservation-id-collision",{bad},false);
    // 원래 event와 압축 receipt는 같은 original digest를 사용하는 기존 규칙이다.
    auto event=Mutation();event.mutation_id="receipt-event";auto receipt=event;receipt.mutation_type=RecordingMutationType::EventLinkReceipt;
    receipt.payload_json="{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+Hash(SerializeRecordingMutationV1(event))+"\"}";
    run("event-receipt-compatible",{event,receipt,event},true);
    for(bool historical_receipt:{false,true}) {
        const auto root=base/(historical_receipt?"historical-receipt-event":"historical-event-receipt");Fixture(root);
        SeedHistoryMutation(root,historical_receipt?receipt:event);ActiveRows(root,{historical_receipt?event:receipt});
        const auto original=Original(root);RecordingJournal j(Options(root));
        Check("B02-J08",j.Open(&error)&&Original(root)==original,historical_receipt?"historical receipt accepts original event retry":"historical event accepts compatible receipt");
    }
    receipt.payload_json="{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+std::string(64,'0')+"\"}";
    run("receipt-original-digest-conflict",{event,receipt},false);
    for(bool overflow:{false,true}) {
        const auto root=base/(overflow?"ordinal-overflow":"ordinal-maximum");Fixture(root);
        RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
        snapshot.cut_ordinal=std::numeric_limits<std::uint64_t>::max();SaveSnapshot(root,snapshot);
        ActiveRows(root,overflow?std::vector<RecordingMutationV1>{Mutation(),Mutation()}:std::vector<RecordingMutationV1>{Mutation()});
        const auto original=Original(root);RecordingJournal j(Options(root));Check(overflow?"B02-J09":"B02-J08",j.Open(&error)!=overflow&&Original(root)==original,overflow?"ordinal overflow rejected":"last uint64 ordinal accepted read-only");
    }
}
#endif
#endif
}
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path base(argv[1]);std::filesystem::create_directories(base);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        const auto root=base/"normal";Fixture(root);const auto original=Original(root);int active=-1,lease=-1;
        {RecordingJournal j(Options(root));Check("B02-J04",j.Open(&error)&&j.HasManagedLease()&&j.ManagedStoreId()=="store","nonempty B read-only open");
            Check("B02-J04",j.path()==root/"active-2.jsonl","B path identifies active journal rather than preserved legacy file");
            active=RecordingJournalGenerationReadOnlyProbe::Active(j);lease=RecordingJournalGenerationReadOnlyProbe::Lease(j);
            Check("B02-J04",active>=0&&lease>=0&&(::fcntl(active,F_GETFD)&FD_CLOEXEC)&&(::fcntl(lease,F_GETFD)&FD_CLOEXEC),"active lease FD CLOEXEC");
            RecordingJournal other(Options(root));Check("B02-J04",!other.Open(&error),"exclusive lease rejects second owner");
            RecordingOrderReservationV1 order;order.request_id="unchanged";
            Check("B02-J05",!j.Append(Mutation(),&error)&&!RecordingJournalGenerationReadOnlyProbe::Append(j,Mutation(),&error)&&
                !j.ReserveRecordingOrder("store","request","segment-two","channel",&order,&error)&&order.request_id=="unchanged"&&
                !RecordingJournalGenerationReadOnlyProbe::Attach(j,root,&error)&&j.Replay().io_error_count==1&&j.Replay().mutations.empty(),"writes attachment and misleading replay denied");
            const auto pid=::fork();Need(pid>=0);if(pid==0)::_exit(!j.HasManagedLease()&&!j.Open(nullptr)&&!j.Append(Mutation(),nullptr)&&j.Replay().io_error_count==1?0:1);
            int status=0;Need(::waitpid(pid,&status,0)==pid);Check("B02-J05",WIFEXITED(status)&&WEXITSTATUS(status)==0,"fork authority rejected");
            Check("B02-J04",Original(root)==original,"read-only original bytes preserved");
        }
        Check("B02-J04",::fcntl(active,F_GETFD)==-1&&::fcntl(lease,F_GETFD)==-1,"destructor closes active and lease");
        {RecordingJournal reopened(Options(root));Check("B02-J04",reopened.Open(&error),"lease released and B reopen");}
        for(const auto size:{1024ULL,512ULL*1024*1024}){const auto path=base/("history-"+std::to_string(size));Fixture(path,size);RecordingJournal j(Options(path));
            Check("B02-J04",!std::filesystem::exists(path/"evidence-1-0.jsonl")&&j.Open(&error),"fixed current/active accepts growing unopened historical descriptor");}
        for(const std::string kind:{"marker","manifest","snapshot","identity","active","store","admission","symlink","hardlink"}) {
            const auto path=base/kind;Fixture(path);auto options=Options(path);
            if(kind=="store")options.store_id="other";
            else if(kind=="admission")options.generation_limits.snapshot_bytes=1;
            else if(kind=="symlink"){std::filesystem::rename(path/"active-2.jsonl",path/"saved");std::filesystem::create_symlink("saved",path/"active-2.jsonl");}
            else if(kind=="hardlink")std::filesystem::create_hard_link(path/"active-2.jsonl",path/"alias");
            else {const auto name=kind=="marker"?".recording-store-format":kind=="manifest"?"recording-generation.json":kind=="snapshot"?"snapshot-2.jsonl":kind=="identity"?"identity-2.jsonl":"active-2.jsonl";
                Write(path/name,kind=="active"?SerializeRecordingMutationV1(Mutation()):"corrupt");}
            const auto bytes=Read(path/"recording-v2-mutations.jsonl");RecordingJournal j(options);
            Check("B02-J05",!j.Open(&error)&&!j.HasManagedLease()&&RecordingJournalGenerationReadOnlyProbe::Active(j)<0&&RecordingJournalGenerationReadOnlyProbe::Lease(j)<0&&Read(path/"recording-v2-mutations.jsonl")==bytes,kind.c_str());
        }
        for(const std::string kind:{"missing-marker","missing-manifest","ordinal"}) {
            const auto path=base/kind;Fixture(path);
            if(kind=="missing-marker")std::filesystem::remove(path/".recording-store-format");
            else if(kind=="missing-manifest")std::filesystem::remove(path/"recording-generation.json");
            else {auto bytes=Read(path/"recording-generation.json");const auto pos=bytes.find("\"cutOrdinal\":10");Need(pos!=std::string::npos);
                bytes.replace(pos,std::string("\"cutOrdinal\":10").size(),"\"cutOrdinal\":11");Write(path/"recording-generation.json",bytes);}
            const auto original=Read(path/"recording-v2-mutations.jsonl");RecordingJournal j(Options(path));
            Check("B02-J06",!j.Open(&error)&&!j.HasManagedLease()&&Read(path/"recording-v2-mutations.jsonl")==original,kind.c_str());
        }
        {RecordingJournal unset(RecordingJournal::ManagedOptions{root,"store"});Check("B02-J05",!unset.Open(&error),"zero B admission refused without changing v1 defaults");}
        for(const std::string name:{"active-2.jsonl","recording-generation.json",".recording-store-format"}) {
            const auto path=base/("replace-"+name);Fixture(path);RecordingJournal j(Options(path));Need(j.Open(&error));
            const auto bytes=Read(path/name);std::filesystem::rename(path/name,path/"saved");Write(path/name,bytes);
            Check("B02-J05",!j.Open(&error)&&!j.HasManagedLease(),"opened component replacement rejected");
            std::filesystem::remove(path/name);std::filesystem::rename(path/"saved",path/name);
            Check("B02-J05",!j.Open(&error),"restoring replaced component does not clear poison");
        }
        V1(base/"v1","B02-J06");
        IndexCases(base/"index-cases");
        {const auto path=base/"links";Fixture(path);RecordingJournal j(Options(path));Need(j.Open(&error));
            RecordingMutationLink link;RecordingMutationHandle got;
            Check("B02-J10",RecordingJournalGenerationReadOnlyProbe::Link(j,"active",&link)&&link.IsWeakLink()&&!link.ResidentOwned()&&
                RecordingJournalGenerationReadOnlyProbe::Get(j,link,&got)&&got&&got->mutation_id=="active","active opaque link reacquires physical row");
            RecordingJournalGenerationReadOnlyProbe::End(j);
            const auto sentinel=std::make_shared<const RecordingMutationV1>(Mutation());got=sentinel;
            Check("B02-J11",!RecordingJournalGenerationReadOnlyProbe::Get(j,link,&got)&&got==sentinel&&j.HasManagedLease(),"ended link rejected with output and lease preserved");
            RecordingMutationLink fresh;Check("B02-J10",RecordingJournalGenerationReadOnlyProbe::Link(j,"active",&fresh)&&
                RecordingJournalGenerationReadOnlyProbe::Get(j,fresh,&got),"new session does not revive ended link");
            got=sentinel;Check("B02-J11",!RecordingJournalGenerationReadOnlyProbe::Get(j,link,&got)&&got==sentinel,"old epoch remains invalid");
            const auto pid=::fork();Need(pid>=0);if(pid==0){got=sentinel;::_exit(!RecordingJournalGenerationReadOnlyProbe::Get(j,fresh,&got)&&got==sentinel?0:1);}
            int status=0;Need(::waitpid(pid,&status,0)==pid);Check("B02-J11",WIFEXITED(status)&&WEXITSTATUS(status)==0,"fork link rejected");
            RecordingMutationLink unchanged=fresh;Check("B02-J11",!RecordingJournalGenerationReadOnlyProbe::Link(j,"absent",&unchanged)&&
                RecordingJournalGenerationReadOnlyProbe::Get(j,unchanged,&got),"missing ID preserves output link");
            auto raw=Read(path/"active-2.jsonl");raw[raw.find("event")]='x';Write(path/"active-2.jsonl",raw);got=sentinel;
            Check("B02-J11",!RecordingJournalGenerationReadOnlyProbe::Get(j,fresh,&got)&&got==sentinel&&!j.HasManagedLease(),"same-size active tamper poisons without replacing output");
        }
        for(const std::string kind:{"reservation","receipt","uint64"}) {
            const auto path=base/("link-"+kind);Fixture(path);auto m=Mutation();
            if(kind=="reservation")m=Reservation("request","reserved",4);
            if(kind=="receipt"){m.mutation_type=RecordingMutationType::EventLinkReceipt;
                m.payload_json="{\"schema\":\"media-server.recording-receipt.v1\",\"originalType\":\"event_link_created\",\"originalSha256\":\""+
                    Hash(SerializeRecordingMutationV1(Mutation()))+"\"}";}
            if(kind=="uint64") {
                RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(path/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
                snapshot.cut_ordinal=std::numeric_limits<std::uint64_t>::max();SaveSnapshot(path,snapshot);
            }
            ActiveRows(path,{m,m});
            if(kind=="uint64")ActiveRows(path,{m});
            const auto original=Original(path);RecordingJournal j(Options(path));Need(j.Open(&error));RecordingMutationLink link;RecordingMutationHandle got;
            Check("B02-J10",RecordingJournalGenerationReadOnlyProbe::Link(j,m.mutation_id,&link)&&
                RecordingJournalGenerationReadOnlyProbe::Get(j,link,&got)&&got&&SerializeRecordingMutationV1(*got)==SerializeRecordingMutationV1(m)&&Original(path)==original,kind.c_str());
        }
        for(const std::string name:{"recording-generation.json",".recording-store-format"}) {
            const auto path=base/("link-replace-"+name);Fixture(path);RecordingJournal j(Options(path));Need(j.Open(&error));RecordingMutationLink link;
            Need(RecordingJournalGenerationReadOnlyProbe::Link(j,"active",&link));const auto bytes=Read(path/name);
            std::filesystem::rename(path/name,path/"saved");Write(path/name,bytes);
            auto sentinel=std::make_shared<const RecordingMutationV1>(Mutation());RecordingMutationHandle got=sentinel;
            Check("B02-J11",!RecordingJournalGenerationReadOnlyProbe::Get(j,link,&got)&&got==sentinel&&!j.HasManagedLease(),name.c_str());
        }
        {const auto path=base/"historical-link";Fixture(path);
            const auto raw=SerializeRecordingMutationV1(Historical(path))+"\n";
            RecordingIdentityShard shard;Need(ParseRecordingIdentityShard(Read(path/"identity-2.jsonl"),&shard,&error));
            shard.archives[0].size=raw.size();shard.archives[0].sha256=Hash(raw);Write(path/"evidence-1-0.jsonl",raw);
            std::string bytes;Need(SerializeRecordingIdentityShard(shard,&bytes,&error));Write(path/"identity-2.jsonl",bytes);
            RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(path/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
            snapshot.identity_head.size=bytes.size();snapshot.identity_head.sha256=Hash(bytes);SaveSnapshot(path,snapshot);
            const auto original=Original(path);RecordingMutationLink link;RecordingMutationHandle got;
            {RecordingJournal j(Options(path));Need(j.Open(&error));
                Check("B02-J10",RecordingJournalGenerationReadOnlyProbe::Link(j,"historical",&link)&&
                    RecordingJournalGenerationReadOnlyProbe::Get(j,link,&got)&&got&&got->mutation_id=="historical"&&Original(path)==original,
                    "historical ordinal seven cold acquisition preserves original");
                const auto foreign=base/"foreign-link";Fixture(foreign);RecordingJournal other(Options(foreign));Need(other.Open(&error));
                const auto sentinel=got;Check("B02-J11",!RecordingJournalGenerationReadOnlyProbe::Get(other,link,&got)&&got==sentinel&&other.HasManagedLease(),"foreign instance rejected without poisoning owner");
                Write(path/"evidence-1-0.jsonl",std::string(raw.size(),'x'));
                Check("B02-J11",!RecordingJournalGenerationReadOnlyProbe::Get(j,link,&got)&&got==sentinel,"historical archive corruption preserves output");
            }
            Write(path/"evidence-1-0.jsonl",raw);RecordingJournal reopened(Options(path));Need(reopened.Open(&error));const auto sentinel=got;
            Check("B02-J11",!RecordingJournalGenerationReadOnlyProbe::Get(reopened,link,&got)&&got==sentinel,"destroyed owner link rejected after reopen");
        }
#else
        const auto root=base/"unsupported";std::filesystem::create_directories(root);
#if MEDIA_SERVER_USE_OPENSSL
        Fixture(root);
#else
        Write(root/".recording-store-format",Marker());Write(root/"recording-generation.json","unsupported");
#endif
        RecordingJournal j(Options(root));Check("B02-J06",!j.Open(&error)&&!j.HasManagedLease(),"disabled backend or crypto refuses B");
        V1(base/"v1","B02-J06");
#endif
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 2;}
    return failures?1:0;
}
