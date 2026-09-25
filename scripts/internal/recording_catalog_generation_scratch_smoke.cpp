// 기존 고정 fixture만 재사용한다. 기존 suite의 main은 호출하지 않는다.
#define main JournalFixtureMain
#include "recording_journal_generation_readonly_smoke.cpp"
#undef main
#include "recording/recording_catalog.h"
#define main ProjectionFixtureMain
#define Fixture ProjectionFixture
#define Check ProjectionCheck
#define Need ProjectionNeed
#define Write ProjectionWrite
#define Read ProjectionRead
#define Hash ProjectionHash
#define error projection_error
#define V1 ProjectionV1
#include "recording_catalog_generation_projection_smoke.cpp"
#undef V1
#undef error
#undef Hash
#undef Read
#undef Write
#undef Need
#undef Check
#undef Fixture
#undef main
namespace recording {
struct RecordingCatalogGenerationScratchProbe {
    static bool Build(RecordingCatalog& c,std::unique_ptr<RecordingCatalog>* out){return c.BuildGenerationScratch(out,&error);}
    static bool Empty(const RecordingCatalog& c){return !c.opened_&&c.segments_.empty()&&!c.sqlite_db_;}
    static bool Corrupt(const RecordingCatalog& c){return !c.opened_&&!c.sqlite_db_&&c.segments_.at("segment").lifecycle==RecordingLifecycle::Corrupt;}
    static bool Thin(RecordingCatalog& c,bool acquire){
        const auto& source=c.source_bindings_.at("segment");
        if(source.resident||!source.mutation.IsWeakLink()||source.latest_mutation_id!="bound")return false;
        if(!acquire)return true;
        RecordingCatalog::SourceBindingHandle out;return c.AcquireSourceBindingOwnedLocked("segment",&out,&error)&&out&&out->segment_id=="segment";
    }
    static bool ActiveSource(RecordingCatalog& c){
        const auto& source=c.source_bindings_.at("segment");
        if(!source.resident||!source.mutation.IsWeakLink()||source.latest_mutation_id!="bound")return false;
        RecordingMutationHandle envelope;RecordingCatalog::SourceBindingHandle verified;
        return RecordingJournalGenerationReadOnlyProbe::Get(c.journal_,source.mutation,&envelope)&&envelope&&
            envelope->mutation_id==source.latest_mutation_id&&
            c.MaterializeSourceBinding(source,c.segments_v2_.at("segment"),envelope,&verified,&error)&&verified&&
            SerializeRecordingSourceBindingV1(*verified)==SerializeRecordingSourceBindingV1(*source.resident);
    }
    static bool Holds(const RecordingCatalog& c,std::uint64_t expected){const auto i=c.hold_counts_.find("legacy");return (i==c.hold_counts_.end()?0:i->second)==expected;}
    static bool All(const RecordingCatalog& c){return c.segments_.size()==2&&c.segments_v2_.size()==2&&c.states_v2_.size()==1&&
        c.tombstones_.size()==1&&c.tombstones_v2_.size()==1&&c.observations_.size()==1&&c.observations_v2_.size()==1&&
        c.referenced_observations_.size()==1&&c.event_links_.size()==1&&c.source_bindings_.size()==1&&c.derived_jobs_.size()==1&&
        c.consumer_references_.size()==1&&c.derived_accepted_references_.size()==1&&c.deletion_reasons_.size()==1&&
        c.media_relpaths_.size()==4&&c.accepted_segment_state_mutations_.size()==2;}
};
}
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
void Install(ProjectionFixture f,const std::filesystem::path& root) {
    f.Seal(root);RecordingIdentityShard shard;shard.store_id="store";shard.generation=2;
    shard.archives={{"evidence-1-0.jsonl",f.archive.size(),Hash(f.archive)}};
    for(const auto& first:f.chain.first_acceptances)shard.rows.push_back(first.first_row);
    std::string bytes;Need(SerializeRecordingIdentityShard(shard,&bytes,&error));Write(root/"identity-2.jsonl",bytes);
    f.snapshot.identity_head={"identity-2.jsonl",bytes.size(),Hash(bytes)};
    Need(SerializeRecordingCatalogSnapshot(f.snapshot,&bytes,&error));Write(root/"snapshot-2.jsonl",bytes);
    f.manifest.snapshot={"snapshot-2.jsonl",bytes.size(),Hash(bytes)};
    Need(SerializeRecordingGenerationManifest(f.manifest,&bytes,&error));Write(root/"recording-generation.json",bytes);
    Write(root/"active-2.jsonl","");Write(root/".recording-store-format",Marker());Write(root/"recording-v2-mutations.jsonl","preserved\n");
}
ProjectionFixture AllRows() {
    auto input=InputValue();auto f=Active(input);auto legacy=ProjectionV1(),derived=legacy;
    derived.segment_id="derived";derived.retention_class=RecordingRetentionClass::Event;
    for(const auto& s:{legacy,derived}){f.Row("segment-v1",s.segment_id,SerializeRecordingSegmentV1(s));f.Row("media-path",s.segment_id,"\"channel/"+s.segment_id+".mp4\"");}
    auto removed=input.source.segment;removed.segment_id="removed";removed.order_request_id="removed-order";removed.order_sequence=3;
    f.Order(removed.order_request_id,removed.segment_id,3);f.Row("segment-v2",removed.segment_id,SerializeRecordingSegmentV2(removed));f.Row("media-path",removed.segment_id,"\"channel/removed.mp4\"");
    RecordingSegmentStateV2 state;state.segment_id="removed";state.lifecycle=RecordingLifecycle::DeletionPending;state.reason="continuous-capacity";
    f.Row("state-v2","removed",SerializeRecordingSegmentStateV2(state));f.Row("deletion-reason","removed","\"continuous-capacity\"");
    RecordingTombstoneV2 t2;t2.tombstone_id="t2";t2.segment=removed;t2.deletion_reason=state.reason;t2.deleted_at_ms=30;
    f.Row("tombstone-v2","removed",SerializeRecordingTombstoneV2(t2));
    RecordingTombstoneV1 t;t.tombstone_id="t1";t.segment_id="standalone";t.source_id="source";t.channel_id="channel";t.recorded_range={1000,2000};
    t.checksum_sha256=std::string(64,'a');t.retention_class=RecordingRetentionClass::Continuous;t.deletion_reason="continuous-age";t.deleted_at_ms=3000;
    f.Row("tombstone-v1",t.segment_id,SerializeRecordingTombstoneV1(t));
    AnalysisObservationV1 o;o.observation_id="obs";o.source_id="source";o.channel_id="channel";o.frame_locator.segment_id="legacy";
    o.frame_locator.frame={1500,500000000,1,1000000000};o.track_id="track";o.class_label="person";o.confidence=.8;o.bbox={.1,.1,.2,.3};o.selection_reason="event";o.created_at_ms=1500;
    f.Row("observation-v1",o.observation_id,SerializeAnalysisObservationV1(o));
    AnalysisObservationV2 v;v.observation_id="obs-v2";v.source_id="source";v.channel_id="channel";v.analysis_namespace="tap";v.stream_epoch_id="epoch";
    v.pts=1500000000;v.track_id="track";v.class_label="person";v.confidence=.8;v.bbox={.1,.2,.3,.4};v.selection_reasons={"track-start"};v.first_seen_pts=v.pts;v.last_seen_pts=v.pts;v.created_at_ms=1500;
    v.locator_reason="unresolved";f.Row("observation-v2",v.observation_id,SerializeAnalysisObservationV2(v));
    ReferencedObservationV1 pair;pair.observation=v;pair.observation.observation_id="referenced";pair.observation.stream_epoch_id.clear();
    pair.reference=input.job.intent.reference;pair.reference.reference_id="observation-reference";pair.reference.kind="observation";
    pair.reference.owner_id="referenced";pair.reference.analysis_pts=v.pts;pair.reference.request.reset();
    f.Row("referenced-observation","referenced",SerializeReferencedObservationV1(pair));
    EventRecordingLinkV1 e;e.link_id="link";e.event_id="event";e.source_id="source";e.channel_id="channel";e.stream_epoch_id="epoch";
    e.requested_range=UtcRangeV1{1000,2000};e.ordered_overlaps={{"legacy",{1000,2000}}};e.derived_segment_id="derived";
    e.time_basis="utc-ms";e.created_at_ms=1000;e.updated_at_ms=2000;e.completeness_reason="event-terminal-release-recovery-pending";
    f.Row("event-link",e.link_id,SerializeEventRecordingLinkV1(e));return f;
}
#endif
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    try {
        const std::filesystem::path base(argv[1]);std::filesystem::create_directories(base);
#if MEDIA_SERVER_USE_OPENSSL && MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND
        const auto root=base/"normal";Fixture(root);
        auto m=Mutation();m.mutation_id="corrupt";m.entity_id="segment";m.mutation_type=RecordingMutationType::CorruptionDetected;m.payload_json="{\"reason\":\"missing-media\"}";
        ActiveRows(root,{Historical(root),m,m});const auto original=Original(root);
        RecordingJournal j(Options(root));Need(j.Open(&error));
        RecordingCatalog::Options options(root/"catalog.sqlite3",root,true);options.enable_v2_storage=true;
        RecordingCatalog live(j,options);std::unique_ptr<RecordingCatalog> candidate;
        Check("B02-Y01",RecordingCatalogGenerationScratchProbe::Build(live,&candidate)&&candidate&&RecordingCatalogGenerationScratchProbe::Corrupt(*candidate),"snapshot plus active corruption and same-ID retry");
        Check("B02-Y02",RecordingCatalogGenerationScratchProbe::Empty(live)&&Original(root)==original&&!std::filesystem::exists(options.sqlite_path),"live SQLite and original remain unpublished");
        auto* first_candidate=candidate.get();Check("B02-Y02",!RecordingCatalogGenerationScratchProbe::Build(live,&candidate)&&candidate.get()==first_candidate&&j.HasManagedLease(),"successful recovery is one-shot without ending link lease");
        Check("B02-Y02",!live.Open(&error)&&!j.Append(m,&error)&&j.Replay().io_error_count==1,"public Open write and replay remain closed");
        for(bool conflict:{false,true}) {
            const auto path=base/(conflict?"conflict":"partial");Fixture(path);auto bad=m;
            if(conflict)bad.payload_json="{\"reason\":\"checksum-mismatch\"}";else {bad.mutation_id="invalid";bad.entity_id="absent";}
            ActiveRows(path,{m,bad});const auto bytes=Original(path);
            {
            RecordingJournal owner(Options(path));
            if(conflict){Check("B02-Y02",!owner.Open(&error)&&Original(path)==bytes,"identity conflict rejected before restore");continue;}
            Need(owner.Open(&error));RecordingCatalog::Options o(path/"db",path,true);o.enable_v2_storage=true;RecordingCatalog target(owner,o);
            auto output=std::make_unique<RecordingCatalog>(owner,o);const auto pointer=output.get();
            Check("B02-Y02",!RecordingCatalogGenerationScratchProbe::Build(target,&output)&&output.get()==pointer&&
                RecordingCatalogGenerationScratchProbe::Empty(target)&&!owner.HasManagedLease()&&!owner.Open(&error)&&Original(path)==bytes&&!std::filesystem::exists(o.sqlite_path),
                "active second domain failure preserves candidate live bytes SQLite and poisons owner");
            }
            RecordingJournal reopened(Options(path));
            RecordingCatalog::Options o(path/"db",path,true);o.enable_v2_storage=true;
            RecordingCatalog target(reopened,o);std::unique_ptr<RecordingCatalog> output;
            const bool strict_open=reopened.Open(&error);
            Check("B02-Y02",strict_open&&!RecordingCatalogGenerationScratchProbe::Build(target,&output)&&!output&&
                RecordingCatalogGenerationScratchProbe::Empty(target)&&Original(path)==bytes&&!std::filesystem::exists(o.sqlite_path),
                "new Journal strict reopen succeeds but unchanged domain-invalid candidate still fails");
        }
        for(bool cold:{false,true}) {
            const auto path=base/(cold?"cold":"active-job");auto f=Active(InputValue());
            if(cold) {
                f.snapshot.rows.erase(std::remove_if(f.snapshot.rows.begin(),f.snapshot.rows.end(),[](const auto& r){return r.kind=="derived-job"||(r.kind=="accepted-state"&&r.key=="job-mutation");}),f.snapshot.rows.end());
                // 원래 job 이력이 없는 독립 source fixture로 축소한다.
                f.chain.first_acceptances.pop_back();f.chain.maximum_global_ordinal=1;f.chain.physical_rows=2;
                f.archive.resize(f.chain.first_acceptances.back().first_row.offset+f.chain.first_acceptances.back().first_row.length);
            }
            Install(f,path);if(cold)std::filesystem::remove(path/"evidence-1-0.jsonl");
            RecordingJournal owner(Options(path));Need(owner.Open(&error));RecordingCatalog::Options o(path/"db",path,true);o.enable_v2_storage=true;
            RecordingCatalog target(owner,o);std::unique_ptr<RecordingCatalog> out;
            Check("B02-Y03",RecordingCatalogGenerationScratchProbe::Build(target,&out)&&out&&
                (cold?RecordingCatalogGenerationScratchProbe::Thin(*out,false):RecordingCatalogGenerationScratchProbe::ActiveSource(*out)),
                cold?"inactive source archive is not read during scratch":"active job source retains resident bound to verified identity");
            if(cold)Check("B02-Y03",!RecordingCatalogGenerationScratchProbe::Thin(*out,true),"cold missing archive fails at actual detail use");
        }
        for(bool terminal:{false,true}) {
            const auto path=base/(terminal?"hold-terminal":"hold-pending");ProjectionFixture f;
            auto source=ProjectionV1(),derived=source;derived.segment_id="derived";derived.retention_class=RecordingRetentionClass::Event;
            f.Row("segment-v1",source.segment_id,SerializeRecordingSegmentV1(source));f.Row("media-path",source.segment_id,"\"channel/source.mp4\"");
            f.Row("segment-v1",derived.segment_id,SerializeRecordingSegmentV1(derived));f.Row("media-path",derived.segment_id,"\"channel/derived.mp4\"");
            EventRecordingLinkV1 e;e.link_id="link";e.event_id="event";e.source_id="source";e.channel_id="channel";e.stream_epoch_id="epoch";
            e.requested_range=UtcRangeV1{1000,2000};e.ordered_overlaps={{"legacy",{1000,2000}}};e.derived_segment_id="derived";
            e.time_basis="utc-ms";e.created_at_ms=1000;e.updated_at_ms=2000;e.completeness_reason="event-terminal-release-recovery-pending";
            f.Row("event-link",e.link_id,SerializeEventRecordingLinkV1(e));Install(f,path);
            if(terminal){e.status=EventRecordingLinkStatus::Complete;e.derived_actual_range=UtcRangeV1{1000,2000};e.completeness_reason.clear();
                auto update=Mutation();update.payload_json="{\"link\":"+SerializeEventRecordingLinkV1(e)+"}";update.entity_id="link";ActiveRows(path,{update});}
            const auto bytes=Original(path);RecordingJournal owner(Options(path));Need(owner.Open(&error));RecordingCatalog::Options o(path/"db",path,true);o.enable_v2_storage=true;
            RecordingCatalog target(owner,o);std::unique_ptr<RecordingCatalog> out;
            Check("B02-Y04",RecordingCatalogGenerationScratchProbe::Build(target,&out)&&out&&RecordingCatalogGenerationScratchProbe::Holds(*out,terminal?0:1)&&
                Original(path)==bytes&&!std::filesystem::exists(o.sqlite_path),terminal?"active terminal completion clears snapshot hold":"pending source hold rederived without SQLite");
        }
        for(bool reversed:{false,true}) {
            const auto path=base/(reversed?"future-order":"ordered-v2");Fixture(path);auto s=InputValue().source.segment;
            s.segment_id="v2-segment";s.order_request_id="v2-order";s.order_sequence=9;
            auto finalized=Mutation();finalized.mutation_id="v2-finalized";finalized.entity_id=s.segment_id;finalized.mutation_type=RecordingMutationType::SegmentV2Finalized;
            finalized.payload_json="{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\"channel/v2.mp4\"}";
            const auto order=Reservation("v2-order","v2-segment",9);
            ActiveRows(path,reversed?std::vector<RecordingMutationV1>{finalized,order}:std::vector<RecordingMutationV1>{order,finalized});
            RecordingJournal owner(Options(path));
            if(reversed){Check("B02-Y01",!owner.Open(&error),"later reservation rejected by Journal before scratch");continue;}
            Need(owner.Open(&error));RecordingCatalog::Options o(path/"db",path,true);o.enable_v2_storage=true;
            RecordingCatalog target(owner,o);std::unique_ptr<RecordingCatalog> out;
            const bool result=RecordingCatalogGenerationScratchProbe::Build(target,&out);
            Check("B02-Y01",result!=reversed&&(reversed?!out:bool(out)),reversed?"later reservation cannot authorize earlier active finalization":"active reservation gap then finalization accepted");
        }
        {const auto path=base/"all-rows";auto f=AllRows();Install(f,path);
            RecordingJournal owner(Options(path));Need(owner.Open(&error));RecordingCatalog::Options o(path/"db",path,true);o.enable_v2_storage=true;
            RecordingCatalog target(owner,o);std::unique_ptr<RecordingCatalog> out;
            Check("B02-Y01",RecordingCatalogGenerationScratchProbe::Build(target,&out)&&out&&RecordingCatalogGenerationScratchProbe::All(*out),"all sixteen snapshot row kinds imported");
        }
#else
        const auto root=base/"unsupported";std::filesystem::create_directories(root);RecordingJournal j(Options(root));
        RecordingCatalog c(j,{root/"catalog.sqlite3",root,false});std::unique_ptr<RecordingCatalog> candidate;
        Check("B02-Y02",!RecordingCatalogGenerationScratchProbe::Build(c,&candidate)&&!candidate,"unsupported scratch remains closed");
#endif
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 2;}
    return failures?1:0;
}
