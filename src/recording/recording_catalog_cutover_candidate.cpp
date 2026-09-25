#include "recording/recording_catalog.h"
#include "recording/recording_cutover_candidate.h"
#include "recording/recording_cutover_stage_writer.h"
#include "recording/recording_generation_transaction.h"
#include <algorithm>
#include <limits>
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <sys/stat.h>
#endif
namespace recording {
namespace {
bool Fail(std::string* error,const char* message){if(error)*error=message;return false;}
}
bool RecordingCatalog::PublishManagedCutover(const RecordingCutoverCandidateLimits& limits,std::string* error) {
#if MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND && MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    // PrepareManagedCutoverCandidate는 자체 Catalog 잠금을 잡는다. 준비 후 새 attachment와
    // Journal의 새 freeze에서 전체 원문/FD를 다시 확인하며, DTO를 외부에서 받지 않는다.
    RecordingGenerationTransaction transaction;
    std::filesystem::path canonical_root;
    {std::lock_guard lock(mu_);if(opened_||!journal_.managed_||!options_.enable_v2_storage)return Fail(error,"cutover coordinator requires unopened managed catalog");
        std::lock_guard journal_lock(journal_.mu_);if(!journal_.CheckManagedStateLocked(error))return false;canonical_root=journal_.io_path_.parent_path();}
    if(!transaction.Create(canonical_root,error))return false;
    struct stat root{},stage{};
    if(::lstat(canonical_root.c_str(),&root)!=0||::lstat(transaction.StagePath().c_str(),&stage)!=0)return Fail(error,"cutover coordinator directory stat failed");
    RecordingCutoverCandidate candidate;RecordingCutoverCreatedFiles files;
    if(!PrepareManagedCutoverCandidate({transaction.StagePath(),static_cast<std::uint64_t>(stage.st_dev),static_cast<std::uint64_t>(stage.st_ino)},limits,&candidate,&files,error))return false;
    std::lock_guard lock(mu_);
    if(opened_||!journal_.AttachCatalog(this,options_.media_root,options_.sqlite_path,true,error))return false;
    struct Detach {RecordingJournal& journal;const void* owner;~Detach(){journal.DetachCatalog(owner);}} detach{journal_,this};
    RecordingGenerationReceipt receipt;receipt.root_device=root.st_dev;receipt.root_inode=root.st_ino;
    receipt.stage_device=stage.st_dev;receipt.stage_inode=stage.st_ino;receipt.stage_name=transaction.StagePath().filename().string();
    receipt.target=candidate.projection.manifest;
    if(!transaction.Describe(false,".recording-store-format",&receipt.marker,error)||!transaction.Describe(false,"recording-v2-mutations.jsonl",&receipt.source,error))return false;
    RecordingGenerationOwnedFile replacement;
    const auto marker="{\"format\":\"media-server.managed-recording-store.v2\",\"storeId\":\""+receipt.target.store_id+"\",\"manifest\":\"recording-generation.json\"}\n";
    if(!transaction.WriteReplacementMarker(marker,&replacement,error))return false;receipt.replacement_marker=std::move(replacement);
    // 후보가 검증한 head에서 다시 읽은 descriptor만 사용한다. 변경된 stage의 새 SHA를
    // 권위로 채택하지 않으며 archive 전수 읽기는 최초 호환 전환에만 허용된다.
    std::map<std::string,RecordingGenerationFile> expected;
    expected.emplace(receipt.target.snapshot.name,receipt.target.snapshot);
    expected.emplace(receipt.target.active.name,receipt.target.active);
    std::optional<RecordingGenerationFile> head=candidate.snapshot.identity_head;
    while(head){
        std::string bytes;RecordingIdentityShard shard;
        if(!expected.emplace(head->name,*head).second||!ReadVerifiedRecordingGenerationImmutable(transaction.StagePath(),*head,limits.chain.max_shard_bytes,&bytes,error)||!ParseRecordingIdentityShard(bytes,&shard,error))return false;
        for(const auto& archive:shard.archives)if(!expected.emplace(archive.name,archive).second)return Fail(error,"cutover repeated archive descriptor");
        head=shard.previous;
    }
    if(expected.size()!=files.files.size())return Fail(error,"cutover descriptor coverage mismatch");
    for(const auto& file:files.files){
        RecordingGenerationOwnedFile owned;
        const auto descriptor=expected.find(file.name);
        if(!file.created||!file.complete||descriptor==expected.end()||!transaction.Describe(true,file.name,&owned,error)||owned.device!=file.device||owned.inode!=file.inode||owned.file.size!=file.size||owned.file.size!=descriptor->second.size||owned.file.sha256!=descriptor->second.sha256)return Fail(error,"cutover coordinator created ownership changed");
        receipt.created.push_back(std::move(owned));
    }
    std::sort(receipt.created.begin(),receipt.created.end(),[](const auto& a,const auto& b){return a.file.name<b.file.name;});
    return journal_.PublishManagedCutover(this,candidate.source,transaction,receipt,error);
#else
    (void)limits;return Fail(error,"cutover publication unsupported");
#endif
}
// 게시 후보와 PREPARED 복구 모두 같은 domain Apply/상세 수명 규칙을 사용한다.
bool RecordingCatalog::RecoverManagedCutover(const RecordingCutoverCandidateLimits& limits,
    std::uint64_t receipt_admission,std::string* error) {
#if MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND && MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    std::lock_guard lock(mu_);
    if(opened_||!options_.enable_v2_storage||!receipt_admission)return Fail(error,"cutover recovery catalog state/admission rejected");
    std::filesystem::path root;RecordingGenerationTransaction transaction;
    if(!journal_.ManagedCutoverRoot(&root,error)||!transaction.Load(root,receipt_admission,error))return false;
    const auto& receipt=transaction.Receipt();
    const bool checkpoint=receipt.operation==RecordingGenerationOperation::Checkpoint;
    const bool committed=receipt.phase==RecordingGenerationPhase::PublishIntent;
    struct End {RecordingJournal& journal;bool generation=false;~End(){if(generation)journal.PoisonGeneration(nullptr);else journal.EndManagedCutoverRecovery();}} end{journal_};
    std::unique_ptr<RecordingCatalog> scratch;
    if(checkpoint||committed){
        if(committed){
            RecordingGenerationReadResult current;std::string actual,expected;
            if(!ReadRecordingGenerationManifestForOpen(root,&current,error)||!SerializeRecordingGenerationManifest(current.manifest,&actual,error)||
               !SerializeRecordingGenerationManifest(receipt.target,&expected,error)||actual!=expected||!transaction.Revalidate(error))return Fail(error,"publish intent has no exact target; preserved");
        }else if(!transaction.ValidateRecoveryOriginal(error))return false;
        if(!journal_.Open(error))return false;end.generation=true;
        auto recovery_options=options_;
        recovery_options.prefer_sqlite=false;
        recovery_options.enable_generation_writes=false;
        RecordingCatalog recovery(journal_,recovery_options);
        if(!recovery.BuildGenerationScratch(&scratch,error))return false;
        if(committed)return transaction.Cleanup(true,error);
    }else {
        if(!journal_.BeginManagedCutoverRecovery(this,transaction,options_.media_root,options_.sqlite_path,error))return false;
        scratch=std::make_unique<RecordingCatalog>(journal_,options_);RecordingCutoverInputSummary source;
        if(!ReplayManagedCutoverScratch(*scratch,{},&source,error)||source.source_bytes!=receipt.source.file.size||source.sha256!=receipt.source.file.sha256)return false;
    }
    bool complete=true;
    if(!transaction.ValidateRecoveryOriginal(error,&complete))return false;
    if(!complete)return (checkpoint||transaction.RestoreMarker(error))&&transaction.Cleanup(false,error);
    if(!transaction.Promote(error))return false;
    std::string bytes;RecordingCatalogSnapshot snapshot;
    if(!ReadVerifiedRecordingGenerationImmutable(root,receipt.target.snapshot,limits.snapshot_bytes,&bytes,error)||!ParseRecordingCatalogSnapshot(bytes,limits.snapshot_bytes,&snapshot,error))return false;
    RecordingIdentityChainResult chain;
    const RecordingIdentityShardLoader loader=[&](const auto& file,std::uint64_t admission,std::string* data,std::string* detail){return ReadVerifiedRecordingGenerationImmutable(root,file,admission,data,detail);};
    if(!ValidateRecordingIdentityShardChain(snapshot.identity_head,loader,limits.chain,&chain,error))return false;
    for(const auto& reservation:chain.order_history.reservations)scratch->mutation_ids_.erase(reservation.order.request_id);
    RecordingCatalogSnapshot expected;std::string canonical,observed;
    if(!scratch->ExportGenerationValuesLocked(receipt.target.store_id,chain,receipt.target.generation,receipt.target.cut_ordinal,&expected,error)||
       !SerializeRecordingCatalogSnapshot(expected,&canonical,error)||!SerializeRecordingCatalogSnapshot(snapshot,&observed,error)||canonical!=observed)
        return Fail(error,"cutover recovery source/snapshot domain mismatch");
    RecordingCatalogGenerationProjection projection;
    if(!BuildRecordingCatalogGenerationProjection(root,receipt.target,chain,snapshot,limits.cold_row_bytes,&projection,error)||
       !transaction.ValidateRecoveryOriginal(error)||(!checkpoint&&!transaction.RestoreMarker(error))||!transaction.Cleanup(false,error))return false;
    if(error)error->clear();return true;
#else
    (void)limits;(void)receipt_admission;return Fail(error,"cutover recovery unsupported");
#endif
}
// 게시 후보와 PREPARED 복구 모두 같은 domain Apply/상세 수명 규칙을 사용한다.
// caller가 이 Catalog의 잠금과 정당한 Journal attachment를 유지한다. sink는
// 비공개 stage에만 쓸 수 있으며, 빈 sink는 원본/domain 읽기 검증만 수행한다.
bool RecordingCatalog::ReplayManagedCutoverScratch(RecordingCatalog& scratch,
    const std::function<bool(const RecordingCutoverInputRow&,std::string*)>& sink,
    RecordingCutoverInputSummary* summary,std::string* error) {
#if MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND && MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    std::unordered_map<std::string,std::size_t> active_sources;
    const auto verify_source=[&](const std::string& id,bool retain) {
        const auto found=scratch.source_bindings_.find(id);
        if(found==scratch.source_bindings_.end())return !retain;
        auto& entry=found->second;RecordingMutationHandle envelope;SourceBindingHandle detail;
        const auto segment=scratch.segments_v2_.find(id);
        if(segment==scratch.segments_v2_.end()||
           !journal_.AcquireMutationLink(entry.mutation,&envelope,error)||
           !MaterializeSourceBinding(entry,segment->second,envelope,&detail,error))return false;
        entry.resident=retain?std::move(detail):SourceBindingHandle{};return true;
    };
    std::string callback_error;
    const bool visited=journal_.VisitManagedCutoverInput(this,[&](const auto& row,const auto& view,std::string* row_error) {
        const auto apply=[&]() {
            std::vector<std::string> prior_sources;
            const auto prior=scratch.derived_jobs_.find(row.mutation.entity_id);
            if(prior!=scratch.derived_jobs_.end()&&prior->second.Active())prior_sources=prior->second.source_ids;
            GenerationDelta changed;
            if(!scratch.ApplyMutationLocked(row.mutation,false,row_error,nullptr,{},nullptr,nullptr,nullptr,view,nullptr,true,&changed))return false;
            if(scratch.accepted_segment_state_mutations_.count(row.mutation.mutation_id))
                scratch.accepted_generation_ordinals_.emplace(row.mutation.mutation_id,row.ordinal);
            if(changed.count({"derived-job",row.mutation.entity_id})) {
                for(const auto& id:prior_sources) {
                    auto old=active_sources.find(id);
                    if(old==active_sources.end()||!old->second)return Fail(row_error,"cutover active source accounting");
                    if(!--old->second)active_sources.erase(old);
                }
                auto& entry=scratch.derived_jobs_.at(row.mutation.entity_id);
                if(entry.Active())for(const auto& id:entry.source_ids)++active_sources[id];
                entry.resident.reset();DerivedJobHandle detail;
                if(!scratch.AcquireDerivedJobOwnedLocked(entry.id,&detail,row_error)||!detail)return false;
                if(entry.Active())entry.resident=std::move(detail);
                for(const auto& id:prior_sources)if(!verify_source(id,active_sources.count(id)!=0))return false;
                for(const auto& id:entry.source_ids)if(!verify_source(id,active_sources.count(id)!=0))return false;
            }
            for(const auto& key:changed)
                if(key.first=="source-binding"&&!verify_source(key.second,active_sources.count(key.second)!=0))return false;
            return !sink||sink(row,row_error);
        };
        const bool ok=apply();if(!ok&&row_error)callback_error=*row_error;return ok;
    },summary,error);
    if(!visited&&error&&!callback_error.empty())*error=callback_error;
    return visited;
#else
    (void)scratch;(void)sink;(void)summary;return Fail(error,"cutover scratch backend/crypto/POSIX unsupported");
#endif
}
bool RecordingCatalog::PrepareManagedCutoverCandidate(const RecordingCutoverFreshStage& stage,
    const RecordingCutoverCandidateLimits& limits,RecordingCutoverCandidate* output,RecordingCutoverCreatedFiles* created,std::string* error) {
#if MEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND && MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    std::lock_guard lock(mu_);
    if(!output||!created||!created->files.empty()||opened_||!options_.enable_v2_storage||!journal_.managed_)
        return Fail(error,"cutover candidate unopened managed options required");
    if(!journal_.AttachCatalog(this,options_.media_root,options_.sqlite_path,true,error))return false;
    struct Attachment {RecordingJournal& journal;const void* owner;~Attachment(){journal.DetachCatalog(owner);}} attachment{journal_,this};
    try {
        const auto store=journal_.ManagedStoreId();if(store.empty())return Fail(error,"cutover source store authority unavailable");
        RecordingCutoverStageWriter writer;if(!writer.Open(stage,store,limits,created,error))return false;
        RecordingCatalog scratch(journal_,options_);
        RecordingCutoverCandidate candidate;
        if(!ReplayManagedCutoverScratch(scratch,[&](const auto& row,std::string* row_error){
            return writer.Append(row,row_error);
        },&candidate.source,error))return false;
        RecordingGenerationManifest manifest;
        if(!writer.Finish(&candidate.chain,&manifest,error))return false;
        if(candidate.source.rows!=candidate.chain.physical_rows||candidate.source.rows!=manifest.cut_ordinal)
            return Fail(error,"cutover row/identity count mismatch");
        // 기존 Apply 재시도 의미를 전행 처리한 뒤 예약 ID만 일반 accepted 집합에서 제외한다.
        for(const auto& reservation:candidate.chain.order_history.reservations)scratch.mutation_ids_.erase(reservation.order.request_id);
        if(!scratch.ExportGenerationValuesLocked(store,candidate.chain,manifest.generation,manifest.cut_ordinal,&candidate.snapshot,error)||
            !writer.Snapshot(candidate.snapshot,&manifest,error)||
            !BuildRecordingCatalogGenerationProjection(stage.path,manifest,candidate.chain,candidate.snapshot,limits.cold_row_bytes,&candidate.projection,error))return false;
        const auto& p=candidate.projection;
        const auto same=[](const auto& left,const auto& right,auto serialize){
            if(left.size()!=right.size())return false;
            for(const auto& entry:left){const auto found=right.find(entry.first);if(found==right.end()||serialize(entry.second)!=serialize(found->second))return false;}return true;
        };
        if(!same(scratch.segments_,p.segments,SerializeRecordingSegmentV1)||!same(scratch.segments_v2_,p.segments_v2,SerializeRecordingSegmentV2)||
            !same(scratch.states_v2_,p.states_v2,SerializeRecordingSegmentStateV2)||!same(scratch.tombstones_,p.tombstones,SerializeRecordingTombstoneV1)||
            !same(scratch.tombstones_v2_,p.tombstones_v2,SerializeRecordingTombstoneV2)||!same(scratch.event_links_,p.event_links,SerializeEventRecordingLinkV1)||
            !same(scratch.observations_,p.observations,SerializeAnalysisObservationV1)||!same(scratch.observations_v2_,p.observations_v2,SerializeAnalysisObservationV2)||
            !same(scratch.consumer_references_,p.consumer_references,SerializeRecordingConsumerReferenceV1)||!same(scratch.referenced_observations_,p.referenced_observations,SerializeReferencedObservationV1)||
            !same(scratch.media_relpaths_,p.media_paths,[](const auto& value){return value;})||!same(scratch.deletion_reasons_,p.deletion_reasons,[](const auto& value){return value;})||
            std::set<std::string>(scratch.mutation_ids_.begin(),scratch.mutation_ids_.end())!=p.mutation_ids||
            std::set<std::string>(scratch.derived_accepted_references_.begin(),scratch.derived_accepted_references_.end())!=p.derived_accepted_references)
            return Fail(error,"cutover typed current values differ");
        if(scratch.orders_v2_.size()!=p.orders.size()||scratch.accepted_generation_ordinals_.size()!=p.accepted_states.size()||
           scratch.source_bindings_.size()!=p.source_bindings.size()||scratch.derived_jobs_.size()!=p.derived_jobs.size())return Fail(error,"cutover provenance counts differ");
        for(const auto& item:scratch.orders_v2_){const auto found=p.orders.find(item.first);const auto& a=item.second;
            if(found==p.orders.end())return false;const auto& b=found->second;
            if(a.schema!=b.schema||a.store_id!=b.store_id||a.request_id!=b.request_id||a.segment_id!=b.segment_id||a.channel_id!=b.channel_id||a.sequence!=b.sequence)return Fail(error,"cutover order tuple differs");}
        for(const auto& item:scratch.accepted_generation_ordinals_){const auto found=p.accepted_states.find(item.first);if(found==p.accepted_states.end()||found->second.first_global_ordinal!=item.second)return Fail(error,"cutover accepted ordinal differs");}
        for(const auto& item:scratch.source_bindings_){const auto found=p.source_bindings.find(item.first);if(found==p.source_bindings.end())return false;const auto& a=item.second;const auto& b=found->second.summary;
            if(a.id!=b.id||a.channel!=b.channel||a.source!=b.source||a.generation!=b.generation||a.track!=b.track||a.order!=b.order||a.sample_count!=b.sample_count||a.latest_mutation_id!=b.latest_mutation_id||bool(a.resident)!=(p.active_source_bindings.count(a.id)!=0))return Fail(error,"cutover source summary/resident differs");}
        for(const auto& item:scratch.derived_jobs_){const auto found=p.derived_jobs.find(item.first);if(found==p.derived_jobs.end())return false;const auto& a=item.second;const auto& b=found->second.summary;
            if(a.id!=b.id||a.channel!=b.channel||a.reference!=b.reference||a.state!=b.state||a.files!=b.files||a.reserved_bytes!=b.reserved_bytes||a.output_ids!=b.output_ids||a.source_ids!=b.source_ids||a.latest_mutation_id!=b.latest_mutation_id||bool(a.resident)!=a.Active())return Fail(error,"cutover job summary/resident differs");}
        // OpenLocked 없이 영속 terminal 관계에서만 pending hold를 독립 재도출한다.
        std::map<std::string,std::uint64_t> holds;
        const auto hold=[&](const std::string& id,RecordingRetentionClass retention){const auto found=scratch.segments_.find(id);
            if(found==scratch.segments_.end()||found->second.lifecycle!=RecordingLifecycle::Finalized||found->second.retention_class!=retention||holds[id]>=static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max()))return false;++holds[id];return true;};
        for(const auto& pair:scratch.event_links_){const auto& link=pair.second;if(link.status!=EventRecordingLinkStatus::Pending||!link.derived_segment_id)continue;
            const auto segment=scratch.segments_.find(*link.derived_segment_id);
            if(segment==scratch.segments_.end()||segment->second.lifecycle!=RecordingLifecycle::Finalized||segment->second.retention_class!=RecordingRetentionClass::Event)continue;
            const bool output_hold=link.completeness_reason=="event-catalog-finalize-recovery-pending"||link.completeness_reason=="event-marker-cleanup-recovery-pending"||link.completeness_reason=="event-terminal-release-recovery-pending"||link.completeness_reason=="event-terminal-output-release-pending";
            if(output_hold&&!hold(segment->first,RecordingRetentionClass::Event))return Fail(error,"cutover pending output hold invalid");
            if(output_hold||link.completeness_reason=="event-terminal-source-release-pending")for(const auto& overlap:link.ordered_overlaps)if(!hold(overlap.segment_id,RecordingRetentionClass::Continuous))return Fail(error,"cutover pending source hold invalid");}
        if(holds!=p.pending_hold_counts||!writer.Revalidate(error))return Fail(error,"cutover pending hold/stage mismatch");
        *output=std::move(candidate);if(error)error->clear();return true;
    }catch(...){return Fail(error,"cutover candidate exception");}
#else
    (void)stage;(void)limits;(void)output;(void)created;return Fail(error,"cutover candidate backend/crypto/POSIX unsupported");
#endif
}
}
