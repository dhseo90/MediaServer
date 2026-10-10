// 파일 용도: 녹화 세대 checkpoint 생성·복구 계약을 smoke로 검증한다.
// 기존 고정 생성기만 재사용하며 이전 suite main은 실행하지 않는다.
#define RECORDING_SCRATCH_MAIN CheckpointScratchFixtureMain
#include "recording_catalog_generation_scratch_smoke.cpp"
#undef RECORDING_SCRATCH_MAIN
#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#endif
bool RecoverCheckpointTransaction(const std::filesystem::path&);
#include "recording_generation_checkpoint_sql_cases.inc"
#include "recording/recording_generation_transaction.h"
#include "recording/recording_cutover_candidate.h"
#include "recording_generation_observation.h"
#include "recording_catalog_history.h"
#include <sys/resource.h>
#include <chrono>
#ifdef __APPLE__
#include <malloc/malloc.h>
#include <mach/mach.h>
#endif
namespace recording {
struct RecordingGenerationResidencyProbe {
    static void Read(const RecordingJournal& journal,std::size_t* count,
        std::size_t* historical,std::size_t* active,std::size_t* order_copies=nullptr) {
        journal.ProbeGenerationIdentityStorage(count,historical,active,order_copies);
    }
};
struct RecordingGenerationTransactionProbe {
    static void StreamFailures(const std::filesystem::path& base) {
        for(const std::string mode:{"empty","prefix","exception","admission","large-option"}){
            const auto root=base/mode;std::filesystem::create_directories(root);
            RecordingGenerationTransaction tx;Need(tx.Create(root,&error));const auto stage=tx.StagePath();
            RecordingGenerationOwnedFile out;
            const auto producer=[&](const RecordingGenerationByteSink& sink,std::string* detail){
                if(mode=="empty"){*detail="first producer error";return false;}
                if(!sink("exact-prefix",detail))return false;
                if(mode=="large-option")return true;
                if(mode=="exception")throw std::runtime_error("injected producer exception");
                if(mode=="admission")return sink("excess",detail);
                *detail="first producer error";return false;
            };
            const bool written=tx.WriteComponentStream("snapshot-3.jsonl",mode=="large-option"?2ULL*1024*1024*1024:12,producer,&out,&error);
            Check("MEM79-G01",written==(mode=="large-option"),"stream producer return and original larger admission option preserved");
            if(mode=="prefix"||mode=="empty")Check("MEM79-G01",error=="first producer error","first producer error preserved");
            Check("MEM79-G01",tx.CleanupUnprepared(&error)&&!std::filesystem::exists(stage),"verified partial prefix cleanup preserves original authority");
        }
    }
    static void Hook(void(*hook)(const char*)){RecordingGenerationTransaction::fault_hook_=hook;}
    static bool Recover(RecordingCatalog& catalog,const RecordingCutoverCandidateLimits& limits,std::string* error){return catalog.RecoverManagedCutover(limits,8U*1024U*1024U,error);}
};
struct RecordingGenerationAppendProbe {
    static bool First(const RecordingJournal& journal,const std::string& id,std::optional<RecordingIdentityFirstAcceptance>* value,std::string* error){
        return journal.FindGenerationFirst(id,value,error);
    }
    static bool Firsts(const RecordingJournal& journal,const RecordingIdentityFirstVisitor& visitor,std::string* error){
        return journal.VisitGenerationFirst(visitor,error);
    }
    static bool Stream(const RecordingCatalog& c,const RecordingIdentityChainResult& chain,std::uint64_t generation,
        std::uint64_t cut,std::string* bytes,std::string* error){
        RecordingCatalog::GenerationSnapshotStream stream;
        bool ok=c.PrepareGenerationSnapshotStreamLocked(chain,generation,cut,&stream,error);
        if(ok)ok=stream.produce([&](std::string_view part,std::string*){bytes->append(part);return true;},error);
        std::string cleanup;if(stream.finish&&!stream.finish(&cleanup)){*error+="; cleanup: "+cleanup;ok=false;}return ok;
    }
    static bool Values(const RecordingCatalog& c,const std::string& store,const RecordingIdentityChainResult& chain,
        std::uint64_t generation,std::uint64_t cut,RecordingCatalogSnapshot* out,std::string* error) {
        return c.ExportGenerationValuesLocked(store,chain,generation,cut,out,error);
    }
    static void CleanupHook(void (*hook)()){RecordingJournal::generation_cleanup_before_unlink_=hook;}
    static void Limit(RecordingJournal& j,const std::string& kind) {
        if(kind=="snapshot")j.generation_limits_.snapshot_bytes=1;
        if(kind=="shard")j.generation_limits_.identity_shard_bytes=1;
        if(kind=="archives")j.generation_limits_.identity_archives=1;
        if(kind=="ids")j.generation_limits_.identity_unique_ids=1;
        if(kind=="active")j.generation_limits_.active_bytes=1;
        if(kind=="cold")j.generation_limits_.cold_row_bytes=1;
    }
};
}
bool RecoverCheckpointTransaction(const std::filesystem::path& root){
    RecordingJournal journal(Options(root));RecordingCatalog::Options options(root/"recording-catalog.sqlite3",root,false);options.enable_v2_storage=true;RecordingCatalog catalog(journal,options);
    RecordingCutoverCandidateLimits limits;limits.chain={8U*1024U*1024U,10000,10000};limits.snapshot_bytes=8U*1024U*1024U;limits.cold_row_bytes=17U*1024U*1024U;
    return recording::RecordingGenerationTransactionProbe::Recover(catalog,limits,&error);
}
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
namespace {
using Links=RecordingJournalGenerationReadOnlyProbe;
RecordingCatalog::Options CO(const std::filesystem::path& root,bool writable=true) {
    RecordingCatalog::Options o(root/"recording-catalog.sqlite3",root,true);
    o.enable_v2_storage=true;o.enable_generation_writes=writable;return o;
}
void Actual(const std::filesystem::path& root,std::size_t copies=1,bool manifest_evidence=false) {
    Fixture(root);ActiveRows(root,{});
    const auto raw=SerializeRecordingMutationV1(Historical(root))+"\n";std::string archive;
    for(std::size_t i=0;i<copies;++i)archive+=raw;
    RecordingIdentityShard shard;Need(ParseRecordingIdentityShard(Read(root/"identity-2.jsonl"),&shard,&error));
    const auto first=shard.rows.front();shard.rows.clear();
    for(std::size_t i=0;i<copies;++i){auto row=first;row.offset=i*raw.size();row.global_ordinal=7+i;shard.rows.push_back(std::move(row));}
    const std::string archive_name=manifest_evidence?"evidence-2-0.jsonl":"evidence-1-0.jsonl";
    shard.archives[0]={archive_name,archive.size(),Hash(archive)};
    std::string bytes;Need(SerializeRecordingIdentityShard(shard,&bytes,&error));Write(root/"identity-2.jsonl",bytes);Write(root/archive_name,archive);
    RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
    snapshot.identity_head={"identity-2.jsonl",bytes.size(),Hash(bytes)};snapshot.cut_ordinal=9+copies;SaveSnapshot(root,snapshot);
    if(manifest_evidence) {
        RecordingGenerationManifest manifest;Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&manifest,&error));
        manifest.evidence=shard.archives;Need(SerializeRecordingGenerationManifest(manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);
    }
}
RecordingGenerationManifest Manifest(const std::filesystem::path& root) {
    RecordingGenerationManifest value;Need(ParseRecordingGenerationManifest(Read(root/"recording-generation.json"),&value,&error));return value;
}
void IdentityResidency(const std::filesystem::path& root) {
    Actual(root);
    const auto original=Read(root/"evidence-1-0.jsonl");
    const auto measure=[&](RecordingJournal& journal,const char* phase,bool has_active) {
        std::size_t count=0,historical=0,active=0,order_copies=0;
        RecordingGenerationResidencyProbe::Read(journal,&count,&historical,&active,&order_copies);
        Check("V450-M01",order_copies==0,"consumed checkpoint reservation copy released after open/append/checkpoint/reopen");
        std::cout<<"[identity-residency] phase="<<phase<<" count="<<count
                 <<" historicalDuplicateBytes="<<historical<<" activeCachedBytes="<<active<<'\n';
        Check("V430-R01",count>0&&historical==0&&(has_active?active>0:active==0),
              "historical identity retains no duplicate digest string; active cache bounded by active rows");
    };
    for(int iteration=0;iteration<2;++iteration) {
        RecordingJournal journal(Options(root));Need(journal.Open(&error));
        RecordingCatalog catalog(journal,CO(root));Need(catalog.Open(&error));
        for(const std::string& invalid:{std::string{},std::string(129,'x'),std::string("bad/id")})
            Check("MEM79-G01",catalog.SegmentLifecycleV2(invalid)==RecordingLifecycle::Unknown&&!catalog.IsDeletedSegmentId(invalid)&&journal.HasManagedLease(),
                "invalid public ID stays absent without poisoning authenticated history or Journal owner");
        for(const std::string& invalid:{std::string{},std::string(129,'x'),std::string(300,'x'),std::string("bad/id")}) {
            std::optional<RecordingIdentityFirstAcceptance> invalid_first;
            Check("MEM79-G01",RecordingGenerationAppendProbe::First(journal,invalid,&invalid_first,&error)&&!invalid_first&&journal.HasManagedLease(),
                  "invalid direct first-acceptance key stays absent without poisoning Journal");
        }
        measure(journal,iteration?"reopen":"open",false);
        RecordingMutationLink link;RecordingMutationHandle record;
        Need(Links::Link(journal,"historical",&link));Need(Links::Get(journal,link,&record));
        Check("V430-R01",SerializeRecordingMutationV1(*record)+"\n"==original,
              "cold link retains exact independent original envelope");
        RecordingOrderReservationV1 reservation;
        const auto request="residency-request-"+std::to_string(iteration);
        const auto segment="residency-segment-"+std::to_string(iteration);
        Need(catalog.ReserveRecordingOrder("store",request,segment,"channel",&reservation,&error));
        const auto expected=reservation;
        measure(journal,"append",true);
        std::optional<RecordingIdentityFirstAcceptance> metadata;
        Need(RecordingGenerationAppendProbe::First(journal,request,&metadata,&error));
        Check("MEM79-G01",metadata&&metadata->first_row.reservation&&metadata->first_row.reservation->sequence==expected.sequence&&
            metadata->first_archive.name.empty(),"active first metadata is exact without presenting a sealed archive authority");
        const auto accepted_ordinal=metadata->first_global_ordinal;
        std::optional<std::uint64_t> previous_ordinal;std::size_t seen=0;
        Need(RecordingGenerationAppendProbe::Firsts(journal,[&](const auto& item,std::string*){
            if(previous_ordinal&&item.first_global_ordinal<=*previous_ordinal)return false;
            previous_ordinal=item.first_global_ordinal;if(item.mutation_id==request)++seen;return true;
        },&error));
        Check("MEM79-G01",seen==1,"first visitor emits historical and active identities once in ordinal order");
        Need(RecordingGenerationAppendProbe::First(journal,"missing-first",&metadata,&error));
        Check("MEM79-G01",!metadata,"authenticated typed first lookup returns explicit absence");

        Need(catalog.Checkpoint(&error));measure(journal,"checkpoint",false);
        Need(RecordingGenerationAppendProbe::First(journal,request,&metadata,&error));
        Check("MEM79-G01",metadata&&metadata->first_global_ordinal==accepted_ordinal&&!metadata->first_archive.name.empty(),
            "typed first coordinate survives checkpoint and becomes sealed history");

        Check("V430-R01",catalog.ReserveRecordingOrder("store",request,segment,"channel",&reservation,&error)&&
              std::tie(reservation.schema,reservation.store_id,reservation.request_id,reservation.segment_id,reservation.channel_id,reservation.sequence)==
              std::tie(expected.schema,expected.store_id,expected.request_id,expected.segment_id,expected.channel_id,expected.sequence),
              "historical reservation retry retains exact sequence and tuple");
        Check("V430-R01",!catalog.ReserveRecordingOrder("store",request,"different-segment","channel",&reservation,&error),
              "historical reservation conflict remains rejected");
        Need(Links::Get(journal,link,&record));
        Check("V430-R01",SerializeRecordingMutationV1(*record)+"\n"==original&&Read(root/"evidence-1-0.jsonl")==original,
              "rotation preserves historical link and sealed original bytes");
    }
}
// 8채널의 미사용 예약 이력만 증가시킨다. 미디어/삭제/혼합 부하는 별도 fixture다.
void IdentityScale(const std::filesystem::path& root,std::size_t count,bool baseline=false) {
    {
        ProjectionFixture fixture;
        fixture.snapshot.cut_ordinal=count;fixture.manifest.cut_ordinal=count;
        for(std::size_t i=0;i<count;++i){
            RecordingOrderReservationV1 order;order.store_id="store";order.request_id="scale-request-"+std::to_string(i);
            order.segment_id="scale-segment-"+std::to_string(i);order.channel_id="channel-"+std::to_string(i%8);order.sequence=i+1;
            const auto payload="{\"schema\":\"media-server.recording-order.v1\",\"storeId\":\"store\",\"requestId\":\""+order.request_id+
                "\",\"segmentId\":\""+order.segment_id+"\",\"channelId\":\""+order.channel_id+"\",\"sequence\":"+std::to_string(order.sequence)+"}";
            fixture.Add(RecordingMutationType::RecordingOrderReserved,order.request_id,order.segment_id,payload,order);
        }
        Install(std::move(fixture),root);
    }
    const auto evidence_hash=Hash(Read(root/"evidence-1-0.jsonl"));
    auto options=Options(root);options.generation_limits={256ULL*1024*1024,64ULL*1024*1024,256ULL*1024*1024,1024*1024,count+10,100};
    for(const bool sql:{false,true}){
        const auto started=std::chrono::steady_clock::now();
        RecordingJournal journal(options);Need(journal.Open(&error));auto co=CO(root);co.prefer_sqlite=sql;
        RecordingCatalog catalog(journal,co);Need(catalog.Open(&error));
        const auto opened=std::chrono::steady_clock::now();
        std::size_t actual=0,historical=0,active=0;RecordingGenerationResidencyProbe::Read(journal,&actual,&historical,&active);
        Check("V430-R02-SCALE",actual==count&&(baseline?historical>0:historical==0)&&active==0,"all historical identities retained; before/after duplicate-cache expectation");
        for(const auto i:{std::size_t(0),count/2,count-1}){
            const auto request="scale-request-"+std::to_string(i),segment="scale-segment-"+std::to_string(i),channel="channel-"+std::to_string(i%8);
            RecordingOrderReservationV1 result;
            Need(catalog.ReserveRecordingOrder("store",request,segment,channel,&result,&error));
            Check("V430-R02-SCALE",result.sequence==static_cast<std::int64_t>(i+1)&&result.request_id==request&&result.segment_id==segment&&result.channel_id==channel,"independent first/middle/last reservation tuple unchanged");
            Check("V430-R02-SCALE",!catalog.ReserveRecordingOrder("store",request,"wrong-segment",channel,&result,&error),"historical conflict rejected at scale");
        }
        Check("V430-R02-SCALE",catalog.Checkpoint(&error)&&Read(root/"active-2.jsonl").empty()&&Hash(Read(root/"evidence-1-0.jsonl"))==evidence_hash,"no-op checkpoint/retry preserve immutable evidence and empty active");
        RecordingCatalogStatusSnapshot status;Need(catalog.SnapshotStatus(&status,&error));
        Check("V430-R02-SCALE",status.channels.empty(),"active media remains fixed at zero while eight-channel reservation history grows");
        struct rusage usage{};Need(getrusage(RUSAGE_SELF,&usage)==0);
#ifdef __APPLE__
        const auto rss=static_cast<std::uint64_t>(usage.ru_maxrss);
#else
        const auto rss=static_cast<std::uint64_t>(usage.ru_maxrss)*1024;
#endif
#ifdef __APPLE__
        vm_address_t* zones=nullptr;unsigned zone_count=0;Need(malloc_get_all_zones(mach_task_self(),nullptr,&zones,&zone_count)==KERN_SUCCESS);
        std::size_t heap_used=0,heap_reserved=0;
        for(unsigned z=0;z<zone_count;++z){malloc_statistics_t stats{};malloc_zone_statistics(reinterpret_cast<malloc_zone_t*>(zones[z]),&stats);heap_used+=stats.size_in_use;heap_reserved+=stats.size_allocated;}
        std::cout<<"[native-heap] count="<<count<<" sqlite="<<sql<<" zones="<<zone_count<<" usedBytes="<<heap_used<<" reservedBytes="<<heap_reserved<<" catalogLogicalBytes=not-equal"<<std::endl;
#endif
        Check("V430-R02-SCALE",rss<=4ULL*1024*1024*1024,"process peak RSS stays within declared 4GiB development budget");
        std::uint64_t disk=0;for(const auto& file:std::filesystem::recursive_directory_iterator(root))if(file.is_regular_file())disk+=file.file_size();
        std::cout<<"[identity-scale] count="<<count<<" sqlite="<<sql<<" openMs="<<std::chrono::duration<double,std::milli>(opened-started).count()
            <<" peakRssBytes="<<rss<<" diskLogicalBytes="<<disk<<" historicalDuplicateBytes="<<historical<<std::endl;
    }
}
void ExportValueBoundary(const std::filesystem::path& root) {
    Actual(root);const auto manifest=Manifest(root);
    RecordingCatalogSnapshot expected;
    Need(ParseRecordingCatalogSnapshot(Read(root/manifest.snapshot.name),1024*1024,&expected,&error));
    RecordingIdentityChainResult chain;
    Need(ValidateRecordingIdentityShardChain(expected.identity_head,[&](const auto& descriptor,auto limit,auto* bytes,auto* err){
        return ReadVerifiedRecordingGenerationImmutable(root,descriptor,limit,bytes,err);
    },{1024*1024,1000,1000},&chain,&error));
    RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog unopened(j,CO(root));
    RecordingCatalogSnapshot sentinel;sentinel.store_id="unchanged";
    Check("B04-S07",!unopened.ExportGenerationSnapshot(chain,manifest.generation,manifest.cut_ordinal,&sentinel,&error)&&
        sentinel.store_id=="unchanged","public export rejects unopened owner and preserves output");
    std::unique_ptr<RecordingCatalog> scratch;Need(RecordingCatalogGenerationScratchProbe::Build(unopened,&scratch));
    Check("B04-S07",!scratch->ExportGenerationSnapshot(chain,manifest.generation,manifest.cut_ordinal,&sentinel,&error)&&
        sentinel.store_id=="unchanged","private scratch acquires no public export authority");
    RecordingCatalogSnapshot values;std::string a,b;
    Need(SerializeRecordingCatalogSnapshot(expected,&a,&error));
    Check("B04-S07",RecordingGenerationAppendProbe::Values(*scratch,"store",chain,manifest.generation,manifest.cut_ordinal,&values,&error)&&
        SerializeRecordingCatalogSnapshot(values,&b,&error)&&a==b,"explicit-store private values retain exact snapshot bytes");
    Check("B04-S07",!RecordingGenerationAppendProbe::Values(*scratch,"different",chain,manifest.generation,manifest.cut_ordinal,&sentinel,&error)&&
        sentinel.store_id=="unchanged","explicit store must match validated chain");
}
void StreamBoundary(const std::filesystem::path& root){
    auto input=AllRows();
    const auto original=input.snapshot.rows;
    for(const auto& row:original)if(row.kind=="observation-v1"){
        AnalysisObservationV1 value;Need(ParseAnalysisObservationV1(row.value_json,&value,&error));
        for(const std::string id:{"obs-","obs."}){value.observation_id=id;input.Row("observation-v1",id,SerializeAnalysisObservationV1(value));}
    }
    Install(std::move(input),root);
    const auto manifest=Manifest(root);RecordingCatalogSnapshot expected;
    Need(ParseRecordingCatalogSnapshot(Read(root/manifest.snapshot.name),8*1024*1024,&expected,&error));
    RecordingIdentityChainResult chain;Need(ValidateRecordingIdentityShardChain(expected.identity_head,[&](const auto& d,auto limit,auto* bytes,auto* detail){
        return ReadVerifiedRecordingGenerationImmutable(root,d,limit,bytes,detail);
    },{8*1024*1024,1000,1000},&chain,&error));
    RecordingIdentityChainResult stream_chain;
    Need(ValidateRecordingIdentityShardChainStream(root,expected.identity_head,{8*1024*1024,1000,1000},&stream_chain,&error));
    std::size_t first_count=0;bool equal=true;
    Need(VisitRecordingIdentityFirst(stream_chain,[&](const auto& value,std::string*){
        const auto& original=chain.first_acceptances.at(first_count++);
        equal=equal&&value.mutation_id==original.mutation_id&&value.first_global_ordinal==original.first_global_ordinal&&
            value.occurrences==original.occurrences&&value.first_archive.name==original.first_archive.name&&
            value.first_row.offset==original.first_row.offset&&value.first_row.length==original.first_row.length;
        return true;
    },&error));

    Check("MEM79-G01",equal&&first_count==chain.first_acceptances.size()&&stream_chain.first_acceptances.empty()&&
        stream_chain.order_history.maximum==chain.order_history.maximum&&stream_chain.order_history.reservations.empty()&&
        stream_chain.physical_rows==chain.physical_rows,
        "stream chain cursor matches DTO first acceptance, ordinal, physical coverage and order oracle without first vector");
    Need(CloseRecordingIdentityHistory(stream_chain.history,&error));
    RecordingJournal journal(Options(root));Need(journal.Open(&error));RecordingCatalog catalog(journal,CO(root));Need(catalog.Open(&error));
    RecordingCatalogSnapshot dto;Need(catalog.ExportGenerationSnapshot(chain,manifest.generation,manifest.cut_ordinal,&dto,&error));
    std::string oracle,streamed;Need(SerializeRecordingCatalogSnapshot(dto,&oracle,&error));
    Check("MEM79-G01",RecordingGenerationAppendProbe::Stream(catalog,chain,manifest.generation,manifest.cut_ordinal,&streamed,&error)&&oracle==streamed,
          "canonical stream bytes match DTO oracle including prefix keys and multi-chunk rows");
    auto invalid=chain;invalid.order_history.reservations.clear();RecordingCatalogSnapshot unchanged;unchanged.store_id="sentinel";
    Check("MEM79-G01",!RecordingGenerationAppendProbe::Values(catalog,"store",invalid,manifest.generation,manifest.cut_ordinal,&unchanged,&error)&&unchanged.store_id=="sentinel",
          "DTO reservation first acceptance cannot omit reverse order entry");
    invalid=chain;
    const auto ordinary=std::find_if(invalid.first_acceptances.begin(),invalid.first_acceptances.end(),[](const auto& entry){return entry.first_row.type!=RecordingMutationType::RecordingOrderReserved;});
    Need(ordinary!=invalid.first_acceptances.end());invalid.first_acceptances.push_back(*ordinary);
    Check("MEM79-G01",!ValidateRecordingCatalogSnapshotAcceptedStates(dto,invalid,&error),"duplicate ordinary DTO identity rejected");
    invalid=chain;invalid.maximum_global_ordinal=manifest.cut_ordinal;streamed.clear();
    Check("MEM79-G01",!RecordingGenerationAppendProbe::Stream(catalog,invalid,manifest.generation,manifest.cut_ordinal,&streamed,&error)&&streamed.empty(),
          "stream refuses invalid physical maximum before publication");
}
void StreamIdentityBoundaries(const std::filesystem::path& base) {
    const auto replace=[](std::string* bytes,const std::string& from,const std::string& to){
        const auto at=bytes->find(from);Need(at!=std::string::npos);bytes->replace(at,from.size(),to);
    };
    for(const std::string mode:{"truncated","escaped-id","large-id","ordinal-overlap","identity-conflict","duplicate-archive","missing-rows","hash-binding"}) {
        const auto root=base/mode;Actual(root,2);
        auto bytes=Read(root/"identity-2.jsonl");
        if(mode=="truncated")bytes.pop_back();
        else if(mode=="escaped-id")replace(&bytes,"historical","\\u0068istorical");
        else if(mode=="large-id")replace(&bytes,"historical",std::string(2049,'x'));
        else if(mode=="ordinal-overlap")replace(&bytes,"\"globalOrdinal\":8","\"globalOrdinal\":7");
        else if(mode=="identity-conflict")replace(&bytes,"\"entityId\":\"segment\"","\"entityId\":\"different\"");
        else if(mode=="duplicate-archive") {
            const auto begin=bytes.find("\"archives\":[")+12;const auto end=bytes.find('}',begin)+1;
            Need(begin>=12&&end>begin);bytes.insert(end,","+bytes.substr(begin,end-begin));
        } else if(mode=="missing-rows")replace(&bytes,"\"rows\":","\"wrong\":");
        else bytes[bytes.size()/2]^=1;
        Write(root/"identity-2.jsonl",bytes);
        if(mode!="hash-binding") {
            RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
            snapshot.identity_head.size=bytes.size();snapshot.identity_head.sha256=Hash(bytes);SaveSnapshot(root,snapshot);
        }
        const auto original=Original(root);RecordingJournal journal(Options(root));
        Check("MEM79-G01",!journal.Open(&error)&&!error.empty()&&Original(root)==original,
            ("stream product Open rejects "+mode+" and preserves originals").c_str());
        Need(journal.Finish(&error));
    }
    // Existing opaque IDs are escape-free and <=128 bytes. Canonical schemas, enums,
    // numeric widths and archive names bound every valid row below the 2048-byte slot.
    const auto root=base/"maximum-token";std::filesystem::create_directories(root);
    RecordingIdentityShard shard;shard.store_id=std::string(128,'s');shard.generation=1;
    shard.archives.push_back({"active-1.jsonl",UINT64_MAX,std::string(64,'f')});
    RecordingIdentityRow row;row.mutation_id=std::string(128,'m');row.entity_id=std::string(128,'e');
    row.type=RecordingMutationType::RecordingOrderReserved;row.occurred_at_ms=INT64_MIN;row.global_ordinal=UINT64_MAX;
    row.identity=row.raw_sha256=std::string(64,'f');row.offset=UINT64_MAX-1;row.length=1;
    row.reservation=RecordingOrderReservationV1{"media-server.recording-order.v1",shard.store_id,row.mutation_id,row.entity_id,std::string(128,'c'),INT64_MAX};
    shard.rows.push_back(row);std::string bytes;Need(SerializeRecordingIdentityShard(shard,&bytes,&error));Write(root/"identity-1.jsonl",bytes);
    RecordingIdentityChainResult chain;
    Check("MEM79-G01",ValidateRecordingIdentityShardChainStream(root,{"identity-1.jsonl",bytes.size(),Hash(bytes)},{1024*1024,10,10},&chain,&error),
          "maximum valid canonical identity widths keep original admission under bounded token parsing");
    Need(CloseRecordingIdentityHistory(chain.history,&error));
}
void Rotation(const std::filesystem::path& root) {
    Actual(root);const auto original=Read(root/"evidence-1-0.jsonl");
    RecordingMutationLink historical,active;
    {
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
        const auto before=Read(root/"recording-generation.json");
        Check("B03-C01",c.Checkpoint(&error)&&Read(root/"recording-generation.json")==before&&!std::filesystem::exists(root/"identity-3.jsonl"),"empty active checkpoint is a byte-preserving no-op");
        Need(Links::Link(j,"historical",&historical));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        RecordingMutationV1 accepted;Need(ParseRecordingMutationV1(Read(root/"active-2.jsonl").substr(0,Read(root/"active-2.jsonl").size()-1),&accepted,&error));
        Need(Links::Link(j,accepted.mutation_id,&active));const auto sealed=Read(root/"active-2.jsonl");
        Check("B03-C01",c.Checkpoint(&error),"explicit writable B checkpoint rotates generation");
        const auto third=Manifest(root);
        Check("B03-C01",third.generation==3&&third.cut_ordinal==11&&third.active.name=="active-3.jsonl"&&Read(root/third.active.name).empty(),"first rotation exact generation cut and empty active");
        RecordingOrderReservationV1 order;Need(c.ReserveRecordingOrder("store","request","future","channel",&order,&error));
        Check("B03-C01",order.sequence==1&&c.Checkpoint(&error)&&Manifest(root).generation==4&&Manifest(root).cut_ordinal==12,"second rotation preserves reservation and exclusive cut");
        RecordingMutationHandle a,b;
        Check("B03-C02",Links::Get(j,historical,&a)&&Links::Get(j,active,&b)&&a->mutation_id=="historical"&&b->mutation_id==accepted.mutation_id,"same-owner links survive two rotations and active-to-sealed relocation");
        const auto pid=::fork();Need(pid>=0);if(!pid){RecordingMutationHandle value;_exit(Links::Get(j,active,&value)?1:0);}int status=0;Need(::waitpid(pid,&status,0)==pid);
        Check("B03-C02",WIFEXITED(status)&&WEXITSTATUS(status)==0,"fork rejects inherited rotated link");
        Check("B03-C01",c.FindSegmentById("segment")->lifecycle==RecordingLifecycle::Corrupt&&Read(root/"active-2.jsonl")==sealed&&Read(root/"evidence-1-0.jsonl")==original,"independent current lifecycle and historical source bytes preserved");
        Check("B08-R01",!std::filesystem::exists(root/"snapshot-2.jsonl")&&!std::filesystem::exists(root/"snapshot-3.jsonl")&&std::filesystem::exists(root/"snapshot-4.jsonl")&&std::filesystem::exists(root/"identity-2.jsonl")&&std::filesystem::exists(root/"identity-3.jsonl")&&std::filesystem::exists(root/"active-3.jsonl"),"two checkpoints reclaim only exact predecessor snapshots");
        const auto size=Read(root/"active-4.jsonl").size();RecordingOrderReservationV1 retry;
        Check("B03-C05",c.ReserveRecordingOrder("store","request","future","channel",&retry,&error)&&retry.sequence==order.sequence&&Read(root/"active-4.jsonl").size()==size,"reservation retry after rotation emits no physical row");
    }
    RecordingJournal reopened(Options(root));Need(reopened.Open(&error));RecordingCatalog c(reopened,CO(root));Need(c.Open(&error));
    RecordingMutationHandle value;
    Check("B03-C02",!Links::Get(reopened,active,&value)&&!Links::Get(reopened,historical,&value),"new owner rejects prior instance links");
    Check("B03-C01",c.FindSegmentById("segment")->lifecycle==RecordingLifecycle::Corrupt&&Manifest(root).generation==4,"strict reopen restores rotated current state");
    RecordingMutationLink fresh;Need(Links::Link(reopened,"historical",&fresh));
    auto changed=original;changed[changed.size()/2]^=1;Write(root/"evidence-1-0.jsonl",changed);
    Check("B03-C02",!Links::Get(reopened,fresh,&value)&&!value,"late original archive alteration rejects cold acquisition");
}
void ObserverRace(const std::filesystem::path& root){
    Actual(root);RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
    Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
    const auto stale=generation_observation::Observe(root,0,[](const std::string&){return "{}";},[&]{Need(c.Checkpoint(&error));});
    Check("B08-R02",stale=="{\"busy\":true}"&&!std::filesystem::exists(root/"snapshot-2.jsonl"),
        "reader holding predecessor manifest reports Busy after exact snapshot retirement");
    const auto current=generation_observation::Observe(root,0,[](const std::string&){return "{}";});
    Check("B08-R02",current.find("\"busy\":false")!=std::string::npos&&current.find("\"generation\":\"3\"")!=std::string::npos,
        "fresh lock-free observer returns one complete current generation");
}
std::filesystem::path hook_root;
void AlterIdentity(){auto bytes=Read(hook_root/"identity-3.jsonl");bytes[bytes.size()/2]^=1;Write(hook_root/"identity-3.jsonl",bytes);}
unsigned preparation_count=0;
std::filesystem::path owned_stage;
void AlterOwnedSnapshot(const char* point){
    if(std::string(point)=="component-prepared"&&++preparation_count==2){
        for(const auto& item:std::filesystem::directory_iterator(hook_root))if(item.path().filename().string().rfind(".recording-generation-prepare-",0)==0)owned_stage=item.path();
        throw std::runtime_error("fixture stops owned preparation");
    }
    if(std::string(point)=="unprepared-before-unlink"){
        RecordingGenerationTransactionProbe::Hook(nullptr);
        auto bytes=Read(owned_stage/"identity-3.jsonl");bytes[bytes.size()/2]^=1;Write(owned_stage/"identity-3.jsonl",bytes);
    }
}
void Failures(const std::filesystem::path& base) {
    for(const std::string collision:{"active-3.jsonl",".recording-generation.stage"}) {
        const auto root=base/(collision=="active-3.jsonl"?"active-collision":"stage-collision");Actual(root);
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        const auto previous=Read(root/"recording-generation.json"),raw=Read(root/"active-2.jsonl");Write(root/collision,"foreign-owned-collision");
        Check("B03-C03",!c.Checkpoint(&error)&&Read(root/"recording-generation.json")==previous&&Read(root/"active-2.jsonl")==raw,"pre-publication collision preserves old authority and active");
        Check("B03-C03",Read(root/collision)=="foreign-owned-collision"&&!std::filesystem::exists(root/"snapshot-3.jsonl")&&!std::filesystem::exists(root/"identity-3.jsonl"),"only owned preparations reclaimed while foreign collision preserved");
        Need(std::filesystem::remove(root/collision));
        Check("B03-C03",c.Checkpoint(&error)&&Manifest(root).generation==3,"same owner retries after explicit fixture collision removal");
    }
    {
        const auto root=base/"cleanup-changed";Actual(root);RecordingJournal j(Options(root));Need(j.Open(&error));
        RecordingCatalog c(j,CO(root));Need(c.Open(&error));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        const auto before=Read(root/"recording-generation.json");
        hook_root=root;preparation_count=0;RecordingGenerationTransactionProbe::Hook(AlterOwnedSnapshot);
        Check("B03-C03",!c.Checkpoint(&error)&&!j.HasManagedLease()&&std::filesystem::exists(owned_stage/"snapshot-3.jsonl")&&
            std::filesystem::exists(owned_stage/"identity-3.jsonl")&&Read(root/"recording-generation.json")==before,
            "same-inode same-size change after live cleanup read preserves owned stage and poisons owner");
        RecordingGenerationTransactionProbe::Hook(nullptr);
    }
    for(bool uncertain:{false,true}) {
        const auto root=base/(uncertain?"uncertain":"identity-change");Actual(root);std::string previous;
        {
            RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));previous=Read(root/"recording-generation.json");
            if(uncertain)RecordingGenerationFailNextDirectorySyncForTest();else {hook_root=root;RecordingGenerationCheckpointBeforeBindingForTest(AlterIdentity);}
            Check("B03-C03",!c.Checkpoint(&error)&&!j.HasManagedLease()&&!c.Checkpoint(&error),uncertain?"post-rename directory failure poisons owner":"identity changed after stage fsync rejects publication and preserves suspect file");
            Check("B03-C03",uncertain?Manifest(root).generation==3:Read(root/"recording-generation.json")==previous,"published uncertainty versus not-published authority distinguished");
        }
        RecordingJournal j(Options(root));Check("B03-C03",j.Open(&error),"new owner strictly opens selected manifest after failure");
    }
    const auto root=base/"partial";Actual(root);Write(root/"active-2.jsonl","{");const auto original=Read(root/"active-2.jsonl");RecordingJournal j(Options(root));
    Check("B03-C03",!j.Open(&error)&&Read(root/"active-2.jsonl")==original,"partial active tail is never automatically truncated");
}
void Cost(const std::filesystem::path& base) {
    std::uint64_t prior_serializes=0;
    for(const std::size_t copies:{1U,4096U}) {
        const auto root=base/std::to_string(copies);Actual(root,copies,true);const auto archive=Read(root/"evidence-2-0.jsonl");
        auto options=Options(root);options.generation_limits.identity_shard_bytes=8*1024*1024;
        RecordingJournal j(options);Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        RecordingGenerationArchiveReadsForTest(true);RecordingMutationCodecCountsForTest(nullptr,nullptr,true);
        Need(c.Checkpoint(&error));std::uint64_t parses=0,serializes=0;RecordingMutationCodecCountsForTest(&parses,&serializes);
        const auto reads=RecordingGenerationArchiveReadsForTest();
        std::cout<<"[cost] history_bytes="<<archive.size()<<" archive_reads="<<reads<<" envelope_parses="<<parses<<" envelope_serializes="<<serializes<<'\n';
        Check("B03-C04",reads==0&&parses==0&&serializes==1&&(copies==1||serializes==prior_serializes)&&Read(root/"evidence-2-0.jsonl")==archive,"fixed current and delta avoid predecessor evidence read parse and serialization as complete history grows");prior_serializes=serializes;
    }
}
void Admission(const std::filesystem::path& root) {
    Actual(root);auto options=Options(root);options.generation_limits.active_bytes=512;
    RecordingJournal j(options);Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
    RecordingOrderReservationV1 order;
    for(int i=0;i<5;++i)Need(c.ReserveRecordingOrder("store","r"+std::to_string(i),"s"+std::to_string(i),"channel",&order,&error));
    Check("B03-C05",order.sequence==5&&Manifest(root).generation>2&&Read(root/Manifest(root).active.name).size()<=512,"active admission rotates before next valid reservation write");
    const auto original=Read(root/"recording-generation.json"),active=Read(root/Manifest(root).active.name);
    Check("B03-C05",!c.ReserveRecordingOrder("other","invalid","new","channel",&order,&error)&&!c.ReserveRecordingOrder("store",std::string(2048,'r'),"new","channel",&order,&error)&&Read(root/"recording-generation.json")==original&&Read(root/Manifest(root).active.name)==active,"invalid store and opaque ID length are rejected without rotation or append");
}
void Threshold(const std::filesystem::path& root) {
    Actual(root);auto options=Options(root);options.generation_limits.active_bytes=2*1024*1024;
    options.generation_limits.cold_row_bytes=2*1024*1024;options.generation_limits.snapshot_bytes=4*1024*1024;
    RecordingJournal j(options);Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
    auto segment=ProjectionV1();segment.audio_omitted_reason=std::string(1024*1024,'a');Need(ValidateRecordingSegmentV1(segment,&error));
    std::filesystem::create_directories(root/"channel");Write(root/"channel/legacy.mp4","owned-media");
    Need(c.FinalizeSegment(segment,(root/"channel/legacy.mp4").string(),&error));
    const auto sealed=Read(root/"active-2.jsonl"),before=Read(root/"recording-generation.json");
    Check("B03-C05",sealed.size()>1024*1024&&!c.MarkSegmentCorrupt("absent","missing-media",&error)&&Read(root/"recording-generation.json")==before,"invalid domain above automatic threshold does not rotate");
    RecordingOrderReservationV1 order;
    Check("B03-C01",c.ReserveRecordingOrder("store","threshold","future","channel",&order,&error)&&Manifest(root).generation==3&&
        Manifest(root).cut_ordinal==11&&Read(root/"active-2.jsonl")==sealed&&!Read(root/"active-3.jsonl").empty(),"one MiB threshold rotates before valid next row without rewriting sealed bytes");
    const auto current=c.FindSegmentById("legacy");
    Check("B03-C01",current&&current->audio_omitted_reason==segment.audio_omitted_reason&&current->segment_id=="legacy","large supported plain current row is preserved through automatic rotation");
}
void Limits(const std::filesystem::path& base) {
    for(const std::string kind:{"snapshot","shard","archives","ids","ordinal","active","cold"}) {
        const auto root=base/kind;Actual(root);
        if(kind=="ordinal") {
            RecordingCatalogSnapshot snapshot;Need(ParseRecordingCatalogSnapshot(Read(root/"snapshot-2.jsonl"),1024*1024,&snapshot,&error));
            snapshot.cut_ordinal=UINT64_MAX;SaveSnapshot(root,snapshot);
            auto manifest=Manifest(root);manifest.cut_ordinal=UINT64_MAX;std::string bytes;
            Need(SerializeRecordingGenerationManifest(manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);
        }
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
        const bool append=kind=="ids"||kind=="ordinal"||kind=="active"||kind=="cold";
        if(!append)Need(c.MarkSegmentCorrupt("segment","missing-media",&error));
        const auto previous=Read(root/"recording-generation.json"),active=Read(root/"active-2.jsonl");
        RecordingGenerationAppendProbe::Limit(j,kind);
        const bool ok=append?c.MarkSegmentCorrupt("segment","missing-media",&error):c.Checkpoint(&error);
        Check("B03-C05",!ok&&Read(root/"recording-generation.json")==previous&&Read(root/"active-2.jsonl")==active&&
            !std::filesystem::exists(root/"identity-3.jsonl"),("prepublication admission remains nondurable: "+kind).c_str());
    }
}
void Jobs(const std::filesystem::path& base) {
    for(bool committed:{false,true}) {
        const auto root=base/(committed?"committed":"ready");auto input=ReadyInput();
        if(committed)input.job.state=DerivedJobState::Committed;
        auto f=Active(input);const auto& segment=input.job.ready->outputs.front().segment;
        if(committed){f.Row("segment-v2",segment.segment_id,SerializeRecordingSegmentV2(segment));f.Row("media-path",segment.segment_id,"\""+input.job.intent.outputs[0].final_relpath+"\"");}
        Install(f,root);
        {
            RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));
            RecordingMutationLink source,job;Need(Links::Link(j,"bound",&source)&&Links::Link(j,"job-mutation",&job));
            RecordingOrderReservationV1 order;Need(c.ReserveRecordingOrder("store","next","future","channel",&order,&error));Need(c.Checkpoint(&error));
            std::optional<DerivedJobRecordV1> value;RecordingMutationHandle a,b;
            Check("B03-C05",order.sequence==3&&c.FindDerivedJob(input.job.intent.job_id,&value,&error)&&value&&value->state==input.job.state&&
                Links::Get(j,source,&a)&&Links::Get(j,job,&b)&&c.FindSourceBinding("segment").has_value(),"Ready/Committed source detail and job links survive rotation");
            Check("B03-C05",!committed||c.FindSegmentV2ById(segment.segment_id)->order_sequence==2,"Committed typed output keeps reserved ordinal independently");
        }
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));std::optional<DerivedJobRecordV1> value;
        Check("B03-C05",c.Open(&error)&&c.FindDerivedJob(input.job.intent.job_id,&value,&error)&&value&&value->state==input.job.state,"strict reopen preserves active job stage and cold source closure");
    }
    // 기존 통과한 두 source 생성기의 요청/미디어 구간을 그대로 사용한다.
    auto input=InputValue();auto first=input.source,second=input.source;
    first.segment.segment_id="z-first";first.segment.order_request_id="first-order";first.segment.media_end_pts=10000000;
    first.segment.mappings[0].end_pts=10000000;first.segment.mappings[0].utc_end_ns=110000000;
    first.binding->segment_id="z-first";first.binding->samples={{1,0}};first.binding->last_accepted_ordinal=1;
    second.segment.segment_id="a-second";second.segment.order_request_id="second-order";second.segment.order_sequence=2;second.segment.media_start_pts=10000000;
    second.segment.mappings[0].start_pts=10000000;second.segment.mappings[0].utc_start_ns=110000000;second.binding->segment_id="a-second";second.binding->samples={{2,10000000}};
    analysis::DecodedIntervalCollector collector;
    for(int i=0;i<2;++i){analysis::DecodedIntervalEvidence e;e.analysis_pts_ns=i*10000000;e.duration_ns=10000000;
        e.association={analysis::SourceAssociationQuality::TimestampMatch,analysis::OriginalSampleIdentity{"gen",1,static_cast<std::uint64_t>(i+1),"video/0",static_cast<std::uint64_t>(i*10000000)}};collector.Append(e);}
    DerivedRecordingSelection selection;DerivedJobRecordV1 job;
    Need(SelectDerivedRecording(input.job.intent.reference,*collector.Snapshot("tap"),{second,first},nullptr,&selection,&error));
    Need(BuildDerivedJobIntent(selection,{second,first},4096,10,&job.intent,&error));ProjectionFixture f;
    for(const auto& source:{first,second}) {
        const auto& s=source.segment;const auto& b=*source.binding;const auto id="bound-"+s.segment_id;
        f.Order(s.order_request_id,s.segment_id,s.order_sequence);
        f.Add(RecordingMutationType::SegmentV2BoundFinalized,id,s.segment_id,"{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\"channel/"+s.segment_id+".mp4\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(b)+"}");
        f.Row("segment-v2",s.segment_id,SerializeRecordingSegmentV2(s));f.Row("media-path",s.segment_id,"\"channel/"+s.segment_id+".mp4\"");std::string bytes;
        Need(SerializeRecordingCatalogSourceSummary({s.segment_id,"channel","source","gen","video/0",1,1,id},&bytes,&error));f.Row("source-binding",s.segment_id,bytes);
    }
    f.Add(RecordingMutationType::DerivedJobIntent,"multi-job",job.intent.job_id,SerializeDerivedJobRecord(job));
    RecordingCatalogJobSummary summary{job.intent.job_id,"channel","reference",DerivedJobState::Intent,0,4096,{}, {},"multi-job"};
    for(const auto& source:job.intent.sources)summary.source_ids.push_back(source.segment.segment_id);
    for(const auto& output:job.intent.outputs)summary.output_ids.push_back(output.output_id);
    std::string bytes;Need(SerializeRecordingCatalogJobSummary(summary,&bytes,&error));f.Row("derived-job",summary.id,bytes);
    f.Row("consumer-reference","reference",SerializeRecordingConsumerReferenceV1(job.intent.reference));f.Row("derived-reference-accepted","reference","true");
    const auto root=base/"multiple";Install(f,root);
    {
        RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));Need(c.Open(&error));RecordingOrderReservationV1 order;
        for(const auto& output:job.intent.outputs)Need(c.ReserveRecordingOrder("store",output.order_request_id,output.output_id,"channel",&order,&error));
        Need(c.Checkpoint(&error));std::optional<DerivedJobRecordV1> value;
        Check("B03-C05",order.sequence==4&&c.FindDerivedJob(job.intent.job_id,&value,&error)&&value&&value->intent.outputs.size()==2&&
            value->intent.sources[0].segment.segment_id=="z-first"&&value->intent.sources[1].segment.segment_id=="a-second"&&
            value->intent.outputs[0].output_id==job.intent.outputs[0].output_id&&value->intent.outputs[1].output_id==job.intent.outputs[1].output_id,
            "two planned outputs and meaningful source order survive reservation rotation");
    }
    RecordingJournal j(Options(root));Need(j.Open(&error));RecordingCatalog c(j,CO(root));std::optional<DerivedJobRecordV1> value;
    Check("B03-C05",c.Open(&error)&&c.FindDerivedJob(job.intent.job_id,&value,&error)&&value&&value->intent.outputs.size()==2,"new owner restores multi-output active job and reservations");
}
}
#endif
#define recording recording_experiment
#include "recording_history_index_experiment.h"
#undef recording
#include "recording_history_index.h"
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
void HistoryIndex(const std::filesystem::path& root) {
    using Index=recording_experiment::RecordingHistoryIndex;
    std::filesystem::create_directories(root);
    std::string error,value;
    Index index;Need(index.Create(root.string(),16*1024*1024,&error));
    // 외부 독립 기대값: 삽입 역순과 조회/순회 정순은 의도적으로 다르다.
    for(int i=2047;i>=0;--i)Need(index.Put("id-"+std::to_string(10000+i),"value-"+std::to_string(i),false,&error));
    bool all=true;
    for(int i=0;i<2048;++i)all=all&&index.Get("id-"+std::to_string(10000+i),&value,&error)==Index::Lookup::Found&&value=="value-"+std::to_string(i);
    Check("MEM77-X01",all,"disk tree reads every reversed-insert historical key");
    value="unchanged";
    Check("MEM77-X01",index.Get("id-absent",&value,&error)==Index::Lookup::Absent&&value=="unchanged","certified absent preserves output");
    std::size_t expected=0;
    Need(index.Visit([&](const auto& key,const auto& data,std::string*){return key=="id-"+std::to_string(10000+expected)&&data=="value-"+std::to_string(expected++);},&error));
    Check("MEM77-X01",expected==2048&&index.usage().cache_bytes==0,"bounded traversal is ordered without retained rows");
    Need(index.Put("id-11024","changed",true,&error));
    Check("MEM77-X01",index.Get("id-11024",&value,&error)==Index::Lookup::Found&&value=="changed","overwrite updates authenticated ancestors");
    const auto name=index.owned_name();Need(index.Close(&error));
    Check("MEM77-X01",!std::filesystem::exists(root/name),"exact owned scratch cleanup");
    for(const std::string fault:{"missing-node","value","truncate","duplicate","budget"}) {
        Index bad;Need(bad.Create(root.string(),fault=="budget"?1050:16384,&error));
        Need(bad.Put("key","payload",false,&error));
        if(fault=="duplicate"||fault=="budget") {
            Check("MEM77-X01",!bad.Put(fault=="duplicate"?"key":"key2","payload",false,&error),"duplicate/disk budget poisons unpublished index");
        }else {
            const auto path=root/bad.owned_name();
            if(fault=="truncate")std::filesystem::resize_file(path,512);
            else {std::fstream f(path,std::ios::in|std::ios::out|std::ios::binary);f.seekp(fault=="value"?512:519);f.put('x');f.flush();}
            // 노드 변조는 absent 경로도 거부하며 value 변조는 hit 내용을 검증한다.
            Check("MEM77-X01",bad.Get(fault=="value"?"key":"absent",&value,&error)==Index::Lookup::Error,"tampered node/value/truncation is error, never absent");
        }
        Check("MEM77-X01",bad.Get("absent",&value,&error)==Index::Lookup::Error,"poison remains fail-closed");
        Need(bad.Close(&error));
    }
}
void HistoryProduct(const std::filesystem::path& root) {
    using Index=recording::RecordingHistoryIndex;
    std::filesystem::create_directories(root);
    std::string error,value;
    Index index;Need(index.Create(root.string(),Index::BytesForRows(8),&error));
    struct stat st{};Need(::fstat(index.ProbeFd(),&st)==0);
    Check("MEM78-J01",st.st_nlink==0&&!std::filesystem::exists(root/index.owned_name()),"scratch anonymous while FD remains owned; original nlink rules unchanged");
    Need(index.Put("key","original",false,&error));const auto bytes=index.usage().file_bytes;
    for(int i=0;i<2048;++i)Need(index.Put("key",std::string(i%2048,'a'),true,&error));
    Check("MEM78-J01",index.usage().file_bytes==bytes&&index.usage().allocated_bytes>0,"2048 overwrites reuse one fixed slot; anonymous disk is measured");
    Check("MEM78-J01",index.Get("key",&value,&error)==Index::Lookup::Found&&value==std::string(2047,'a'),"cold lookup after repeated overwrite is exact");
    Need(index.Close(&error));Check("MEM78-J01",index.Close(&error),"explicit finish idempotent");
    for(int fault:{1,2,3,4}){
        Index bad;Index::probe_fault=fault;
        if(fault<=2)Check("MEM78-J01",!bad.Create(root.string(),Index::BytesForRows(2),&error)&&!error.empty(),"post-open/unlink injected failure is propagated and owned file removed");
        else {
            Index::probe_fault=0;Need(bad.Create(root.string(),Index::BytesForRows(2),&error));Need(bad.Put("key","value",false,&error));Index::probe_fault=fault;
            if(fault==3){Check("MEM78-J01",!bad.Put("key","new",true,&error)&&bad.Get("absent",&value,&error)==Index::Lookup::Error,"partial write poisons both hit and miss");Index::probe_fault=0;Need(bad.Close(&error));}
            else {Check("MEM78-J01",!bad.Close(&error)&&!bad.Close(&error),"close uncertainty persists without retrying released descriptor");}
        }
        Index::probe_fault=0;
        Check("MEM78-J01",std::filesystem::is_empty(root),"create/failure finish leaves no named scratch");
    }
    {Index bad;Index::probe_fault=5;
     Check("MEM78-J01",!bad.Create(root.string(),Index::BytesForRows(1),&error)&&error.find("cleanup:")!=std::string::npos&&!bad.Close(&error),"Create directory close uncertainty remains sticky through owner finish");
     Index::probe_fault=0;Check("MEM78-J01",std::filesystem::is_empty(root),"directory close uncertainty leaves no named scratch");}
    for(const bool hit:{false,true}){
        Index bad;Need(bad.Create(root.string(),Index::BytesForRows(1),&error));Need(bad.Put("key","value",false,&error));
        const char x='x';Need(::pwrite(bad.ProbeFd(),&x,1,hit?512:512+2048)==1);
        Check("MEM78-J01",bad.Get(hit?"key":"absent",&value,&error)==Index::Lookup::Error,"corrupt hit value or miss path fails closed");Need(bad.Close(&error));
    }
    {Index cap;Need(cap.Create(root.string(),Index::BytesForRows(1),&error));Need(cap.Put("one","value",false,&error));
     Check("MEM78-J01",!cap.Put("two","value",false,&error)&&!cap.Healthy(&error),"exact disk bound fails as resource error, not Absent");Need(cap.Close(&error));}
    {Index source,target;Need(source.Create(root.string(),Index::BytesForRows(3),&error));
     Need(source.Put("original","value",false,&error));Need(target.Create(root.string(),Index::BytesForRows(4),&error));
     Need(target.CopyFrom(source,&error));Need(target.Put("new","new-value",false,&error));
     Check("MEM78-J01",source.Get("new",&value,&error)==Index::Lookup::Absent&&target.Get("original",&value,&error)==Index::Lookup::Found&&value=="value","bounded FD clone preserves source miss and exact inherited value");
     Need(target.Close(&error));Need(source.Close(&error));}
    {
        RecordingCatalogHistoryRows rows;Need(rows.Create(&error));
        std::string observed;bool found=false;
        for(const std::size_t size:{std::size_t(1),std::size_t(2048),std::size_t(2049),std::size_t(6145)}){
            const std::string value(size,static_cast<char>('a'+size%20));
            Need(rows.Put("source-binding","chunk-source",value,&error));
            Check("MEM79-G01",rows.Get("source-binding","chunk-source",&observed,&found,&error)&&found&&observed==value,
                "completed metadata roundtrip preserves values spanning fixed 2048-byte chunks");
        }
        const auto allocated=rows.Bytes();
        for(int repeat=0;repeat<12;++repeat)Need(rows.Put("source-binding","chunk-source",std::string(repeat%2?6145:1,'z'),&error));
        Check("MEM79-G01",rows.Bytes()==allocated&&rows.Count("source-binding")==1,
            "completed metadata overwrite reuses allocated chunk capacity without logical duplicate rows");
        Need(rows.Put("source-binding","chunk-source-","prefix-neighbor",&error));
        std::size_t seen=0;Need(rows.Visit("source-binding",[&](const std::string&,const std::string&,std::string*){++seen;return true;},&error));
        Check("MEM79-G01",seen==2,"completed metadata visitor covers prefix-neighbor IDs once");
        bool consumer_threw=false;
        try { rows.Visit("source-binding",[](const std::string&,const std::string&,std::string*)->bool{throw std::runtime_error("consumer-limit");},&error); }
        catch(const std::runtime_error& exception){consumer_threw=std::string(exception.what())=="consumer-limit";}
        Check("MEM79-G01",consumer_threw&&rows.Healthy(&error)&&rows.Get("source-binding","chunk-source-",&observed,&found,&error)&&found&&observed=="prefix-neighbor",
              "consumer admission exception propagates without poisoning original authenticated history");
        Need(rows.Put("source-binding","chunk-source","",&error));
        Check("MEM79-G01",rows.Get("source-binding","chunk-source",&observed,&found,&error)&&!found&&rows.Count("source-binding")==1,
            "completed metadata erasure retains authenticated absence and active namespace count");
        Need(rows.Finish(&error));
    }
    {
        RecordingCatalogHistoryRows rows;Need(rows.Create(&error));Need(rows.Put("retired-v2","receipt","original",&error));
        Index::probe_fault=3;const bool written=rows.Put("retired-v2","receipt",std::string(4097,'x'),&error);Index::probe_fault=0;
        bool found=true;std::string value;
        Check("MEM79-G01",!written&&!rows.Get("retired-v2","missing",&value,&found,&error),
            "partial completed metadata chunk write poisons missing and present lookup");
        Need(rows.Finish(&error));
    }
    {
        RecordingCatalogHistoryRows rows;Need(rows.Create(&error));Need(rows.Put("retired-v2","exception",std::string(4097,'a'),&error));
        RecordingCatalogHistoryRows::probe_throw_after_chunk=true;
        const bool written=rows.Put("retired-v2","exception",std::string(4097,'b'),&error);
        RecordingCatalogHistoryRows::probe_throw_after_chunk=false;
        bool found=false;std::string value;
        Check("MEM79-G01",!written&&!rows.Healthy(&error)&&!rows.Get("retired-v2","exception",&value,&found,&error),
            "allocation exception after first overwritten chunk poisons wrapper instead of exposing mixed old/new value");
        Need(rows.Finish(&error));
    }
    // Real Journal Open uses the source validator and rejects omitted and incorrect ordinal index rows.
    for(int fault:{1,2}){const auto store=root/("source-"+std::to_string(fault));Actual(store);
        ProbeRecordingIdentityHistoryFault(fault);RecordingJournal j(Options(store));
        Check("MEM78-J01",!j.Open(&error),"original-complete seal rejects rebuild omission/wrong ordinal in product Open");
        ProbeRecordingIdentityHistoryFault(0);Need(j.Finish(&error));
        RecordingJournal reopened(Options(store));Check("MEM78-J01",reopened.Open(&error),"fresh owner rebuilds from unchanged originals after incomplete candidate");Need(reopened.Finish(&error));
    }

    {const auto source=root/"source-readonly";Actual(source);
     {RecordingJournal j(Options(source));Need(j.Open(&error));Need(j.Finish(&error));}
     Need(::chmod(source.c_str(),0500)==0);
     RecordingJournal j(Options(source));const bool opened=j.Open(&error);
     Need(::chmod(source.c_str(),0700)==0);
     Check("MEM78-J01",opened,"Journal original root needs no new scratch write permission");Need(j.Finish(&error));}
    {const auto crash=root/"crash";std::filesystem::create_directory(crash);
     const pid_t child=::fork();Need(child>=0);
     if(!child){Index abandoned;if(!abandoned.Create(crash.string(),Index::BytesForRows(1),&error))::_exit(2);
       if(!abandoned.Put("key","value",false,&error))::_exit(3);
       ::_exit(0);}
     int status=0;Need(::waitpid(child,&status,0)==child);
     Check("MEM78-J01",WIFEXITED(status)&&WEXITSTATUS(status)==0&&std::filesystem::is_empty(crash),"process exit without destructors leaves no named scratch");}
    {RecordingIdentityFirstAcceptance first;
     first.mutation_id=std::string(128,'m');first.first_global_ordinal=UINT64_MAX;first.occurrences=1;
     auto& row=first.first_row;row.mutation_id=first.mutation_id;row.global_ordinal=UINT64_MAX;
     row.type=RecordingMutationType::RecordingOrderReserved;row.entity_id=std::string(128,'e');row.occurred_at_ms=INT64_MIN;
     row.identity=std::string(64,'a');row.raw_sha256=std::string(64,'b');row.archive_slot=UINT64_MAX;row.offset=UINT64_MAX;row.length=UINT64_MAX;
     RecordingOrderReservationV1 order;order.store_id=std::string(128,'s');order.request_id=row.mutation_id;order.segment_id=row.entity_id;order.channel_id=std::string(128,'c');order.sequence=INT64_MAX;row.reservation=order;
     first.first_archive={"evidence-18446744073709551615-18446744073709551615.jsonl",UINT64_MAX,std::string(64,'c')};
     RecordingIdentityHistoryHandle history;
     Check("MEM78-J01",BuildRecordingIdentityHistory({}, {first},0,&history,&error),"maximum-width accepted DTO fields fit fixed slot independently of 16MiB cold payload");
     std::optional<RecordingIdentityFirstAcceptance> read;
     Check("MEM78-J01",FindRecordingIdentityHistory(history,first.mutation_id,&read,&error)&&read&&read->first_row.reservation->channel_id==order.channel_id,"maximum-width DTO roundtrip exact");
     Check("MEM78-J01",!ValidateRecordingIdentityHistoryCoverage(history,2,&error),"omitted active physical coverage rejected");Need(CloseRecordingIdentityHistory(history,&error));}
    IdentityResidency(root/"product-transition");
}

#endif
int main(int argc,char** argv) {
    if(argc!=2&&argc!=3)return 2;
    if(argc==3&&std::string(argv[2])!="history-product"&&std::string(argv[2])!="history-index"&&std::string(argv[2])!="residency"&&std::string(argv[2])!="scale-1000"&&std::string(argv[2])!="scale-100000"&&std::string(argv[2])!="scale-baseline-1000"&&std::string(argv[2])!="scale-baseline-100000")return 2;
    try {
        const std::filesystem::path root(argv[1]);std::filesystem::create_directories(root);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        if(argc==3&&std::string(argv[2]).rfind("scale-",0)==0){IdentityScale(root/"scale",std::stoull(std::string(argv[2]).substr(std::string(argv[2]).find_last_of('-')+1)),std::string(argv[2]).find("baseline")!=std::string::npos);return failures?1:0;}
        if(argc==3&&std::string(argv[2])=="history-index"){HistoryIndex(root/"history-index");return failures?1:0;}
        if(argc==3&&std::string(argv[2])=="history-product"){HistoryProduct(root/"history-product");return failures?1:0;}
        IdentityResidency(root/"identity-residency");
        if(argc==3)return failures?1:0;
        ExportValueBoundary(root/"export-values");StreamBoundary(root/"stream");StreamIdentityBoundaries(root/"stream-identity");RecordingGenerationTransactionProbe::StreamFailures(root/"stream-failures");Rotation(root/"rotate");ObserverRace(root/"observer-race");Failures(root/"failures");Cost(root/"cost");Admission(root/"admission");Threshold(root/"threshold");Limits(root/"limits");Jobs(root/"jobs");SQL_CHECKPOINT_CASES::Run(root);
#else
        Write(root/".recording-store-format",Marker());RecordingJournal journal(Options(root));
        Check("B03-C06",!journal.Open(&error),"unsupported B remains closed");
#endif
        V1(root/"v1","B03-C06");
        return failures?1:0;
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 2;}
}
