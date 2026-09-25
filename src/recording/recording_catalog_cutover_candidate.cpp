#include "recording/recording_catalog.h"
#include "recording/recording_cutover_candidate.h"
#include "recording/recording_cutover_stage_writer.h"
#include <limits>
namespace recording {
namespace {
bool Fail(std::string* error,const char* message){if(error)*error=message;return false;}
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
        std::unordered_map<std::string,std::size_t> active_sources;
        const auto verify_source=[&](const std::string& id,bool retain) {
            const auto found=scratch.source_bindings_.find(id);if(found==scratch.source_bindings_.end())return !retain;
            auto& entry=found->second;RecordingMutationHandle envelope;SourceBindingHandle detail;
            const auto segment=scratch.segments_v2_.find(id);
            if(segment==scratch.segments_v2_.end()||!journal_.AcquireMutationLink(entry.mutation,&envelope,error)||
                !MaterializeSourceBinding(entry,segment->second,envelope,&detail,error))return false;
            entry.resident=retain?std::move(detail):SourceBindingHandle{};return true;
        };
        const auto apply_row=[&](const RecordingCutoverInputRow& row,const RecordingJournalOwnedViewHandle& view,std::string* row_error){
            std::vector<std::string> prior_sources;
            const auto prior=scratch.derived_jobs_.find(row.mutation.entity_id);
            if(prior!=scratch.derived_jobs_.end()&&prior->second.Active())prior_sources=prior->second.source_ids;
            GenerationDelta changed;
            if(!scratch.ApplyMutationLocked(row.mutation,false,row_error,nullptr,{},nullptr,nullptr,nullptr,view,nullptr,true,&changed))return false;
            if(scratch.accepted_segment_state_mutations_.count(row.mutation.mutation_id))
                scratch.accepted_generation_ordinals_.emplace(row.mutation.mutation_id,row.ordinal);
            if(changed.count({"derived-job",row.mutation.entity_id})){
                for(const auto& id:prior_sources){auto old=active_sources.find(id);if(old==active_sources.end()||!old->second)return Fail(row_error,"cutover active source accounting");if(!--old->second)active_sources.erase(old);}
                auto& entry=scratch.derived_jobs_.at(row.mutation.entity_id);
                if(entry.Active())for(const auto& id:entry.source_ids)++active_sources[id];
                // resident를 우회하여 검증된 view link의 원문과 최신 요약을 다시 대조한다.
                entry.resident.reset();DerivedJobHandle detail;
                if(!scratch.AcquireDerivedJobOwnedLocked(entry.id,&detail,row_error)||!detail)return false;
                if(entry.Active())entry.resident=std::move(detail);
                for(const auto& id:prior_sources)if(!verify_source(id,active_sources.count(id)!=0))return false;
                for(const auto& id:entry.source_ids)if(!verify_source(id,active_sources.count(id)!=0))return false;
            }
            for(const auto& key:changed)if(key.first=="source-binding"&&!verify_source(key.second,active_sources.count(key.second)!=0))return false;
            return writer.Append(row,row_error);
        };
        std::string callback_error;
        if(!journal_.VisitManagedCutoverInput(this,[&](const auto& row,const auto& view,std::string* row_error){
            const bool ok=apply_row(row,view,row_error);
            if(!ok&&row_error)callback_error=*row_error;
            return ok;
        },&candidate.source,error)){
            if(error&&!callback_error.empty())*error=callback_error;
            return false;
        }
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
