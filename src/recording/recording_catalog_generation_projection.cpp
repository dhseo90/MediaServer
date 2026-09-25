#include "recording/recording_catalog_generation_projection.h"
#include "recording/recording_generation_cold_mutation.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <limits>
#include <tuple>
#ifndef MEDIA_SERVER_USE_OPENSSL
#define MEDIA_SERVER_USE_OPENSSL 0
#endif
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <openssl/evp.h>
#endif
namespace recording {
namespace {
bool Fail(std::string* error,const char* message){if(error)*error=message;return false;}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
// Catalog의 내부 IsSafeMediaRelpath와 동일한 lexical 허용 범위다.
bool IsSafeMediaRelpath(const std::string& value) {
    if(value.empty())return false;
    const std::filesystem::path path(value);
    if(path.is_absolute())return false;
    const auto normalized=path.lexically_normal();
    if(normalized.empty()||normalized==".")return false;
    for(const auto& part:normalized)if(part=="..")return false;
    return true;
}
std::string Hash(const std::string& bytes) {
    unsigned char digest[32];unsigned size=0;
    if(EVP_Digest(bytes.data(),bytes.size(),digest,&size,EVP_sha256(),nullptr)!=1||size!=32)return {};
    const char* hex="0123456789abcdef";std::string result;
    for(auto c:digest){result+=hex[c>>4];result+=hex[c&15];}return result;
}
std::string Quote(const std::string& value) {
    std::string result="\"";const char* hex="0123456789abcdef";
    for(unsigned char c:value){switch(c){case '"':result+="\\\"";break;case '\\':result+="\\\\";break;
        case '\n':result+="\\n";break;case '\r':result+="\\r";break;case '\t':result+="\\t";break;
        default:if(c<32){result+="\\u00";result+=hex[c>>4];result+=hex[c&15];}else result+=static_cast<char>(c);}}
    return result+'"';
}
template<class T> bool Decode(const RecordingCatalogSnapshotRow& row,std::map<std::string,T>* map,
    bool(*parse)(const std::string&,T*,std::string*),std::string(*serialize)(const T&),
    std::string T::*id,std::string* error) {
    T value;
    if(!parse(row.value_json,&value,error)||serialize(value)!=row.value_json||value.*id!=row.key)
        return Fail(error,"projection domain canonical/key mismatch");
    return map->emplace(row.key,std::move(value)).second;
}
bool SameOrder(const RecordingOrderReservationV1& a,const RecordingOrderReservationV1& b) {
    return std::tie(a.schema,a.store_id,a.request_id,a.segment_id,a.channel_id,a.sequence)==
        std::tie(b.schema,b.store_id,b.request_id,b.segment_id,b.channel_id,b.sequence);
}
bool JobType(DerivedJobState state,RecordingMutationType type) {
    switch(state){
        case DerivedJobState::Intent:return type==RecordingMutationType::DerivedJobIntent||type==RecordingMutationType::DerivedJobFiles;
        case DerivedJobState::Ready:return type==RecordingMutationType::DerivedJobReady;
        case DerivedJobState::Committed:return type==RecordingMutationType::DerivedJobCommitted;
        case DerivedJobState::Complete:return type==RecordingMutationType::DerivedJobComplete;
        case DerivedJobState::Failed:return type==RecordingMutationType::DerivedJobFailed;
    }return false;
}
RecordingLifecycle Lifecycle(const RecordingCatalogGenerationProjection& p,const std::string& id) {
    if(p.tombstones_v2.count(id))return RecordingLifecycle::Deleted;
    const auto state=p.states_v2.find(id);
    return state==p.states_v2.end()?RecordingLifecycle::Finalized:state->second.lifecycle;
}
bool BindingMatches(const RecordingSourceBindingV1& live,const RecordingSourceBindingV1& saved) {
    if(saved.file_evidence)return SerializeRecordingSourceBindingV1(live)==SerializeRecordingSourceBindingV1(saved);
    return live.schema==saved.schema&&live.segment_id==saved.segment_id&&live.source_id==saved.source_id&&
        live.channel_id==saved.channel_id&&live.store_id==saved.store_id&&live.media_epoch_id==saved.media_epoch_id&&
        live.source_generation==saved.source_generation&&live.generation_order==saved.generation_order&&live.track_id==saved.track_id&&
        live.index_complete==saved.index_complete&&live.last_accepted_ordinal==saved.last_accepted_ordinal&&
        live.incomplete_reason==saved.incomplete_reason&&live.samples.size()==saved.samples.size()&&
        std::equal(live.samples.begin(),live.samples.end(),saved.samples.begin(),[](const auto& a,const auto& b){return a.ordinal==b.ordinal&&a.pts_ns==b.pts_ns;});
}
bool CrossMaps(RecordingCatalogGenerationProjection& p,std::string* error) {
    std::set<std::string> reserved_segments;
    for(const auto& pair:p.orders)reserved_segments.insert(pair.second.segment_id);
    for(const auto& pair:p.segments) {
        const auto& v=pair.second;
        if(p.segments_v2.count(pair.first)||p.tombstones_v2.count(pair.first)||reserved_segments.count(pair.first))
            return Fail(error,"projection V1/V2/order namespace collision");
        if((v.lifecycle==RecordingLifecycle::Deleted)!=static_cast<bool>(p.tombstones.count(pair.first))||
            (v.lifecycle!=RecordingLifecycle::Deleted&&!p.media_paths.count(pair.first)))
            return Fail(error,"projection V1 lifecycle/path mismatch");
    }
    for(const auto& pair:p.tombstones) {
        const auto& v=pair.second;
        if(p.segments_v2.count(pair.first)||p.tombstones_v2.count(pair.first)||reserved_segments.count(pair.first)||p.media_paths.count(pair.first))
            return Fail(error,"projection tombstone namespace/path mismatch");
        const auto segment=p.segments.find(pair.first);
        if(segment!=p.segments.end()&&(segment->second.source_id!=v.source_id||segment->second.channel_id!=v.channel_id||
            segment->second.checksum_sha256!=v.checksum_sha256||segment->second.retention_class!=v.retention_class))
            return Fail(error,"projection V1 tombstone identity mismatch");
    }
    for(const auto& pair:p.segments_v2) {
        const auto& v=pair.second;const auto order=p.orders.find(v.order_request_id);
        if(v.store_id!=p.manifest.store_id||order==p.orders.end()||order->second.segment_id!=pair.first||
            order->second.channel_id!=v.channel_id||order->second.sequence!=v.order_sequence||!p.media_paths.count(pair.first))
            return Fail(error,"projection V2 reservation/path mismatch");
    }
    for(const auto& pair:p.states_v2)if(!p.segments_v2.count(pair.first))return Fail(error,"projection orphan V2 state");
    for(const auto& pair:p.tombstones_v2) {
        const auto segment=p.segments_v2.find(pair.first);
        const auto state=p.states_v2.find(pair.first);
        const auto reason=p.deletion_reasons.find(pair.first);
        if(segment==p.segments_v2.end()||state==p.states_v2.end()||state->second.lifecycle!=RecordingLifecycle::DeletionPending||
            reason==p.deletion_reasons.end()||reason->second!=pair.second.deletion_reason||
            SerializeRecordingSegmentV2(segment->second)!=SerializeRecordingSegmentV2(pair.second.segment))
            return Fail(error,"projection V2 tombstone transition mismatch");
    }
    for(const auto& pair:p.media_paths)if(!IsSafeMediaRelpath(pair.second)||
        (!p.segments.count(pair.first)&&!p.segments_v2.count(pair.first)))return Fail(error,"projection orphan/unsafe media path");
    for(const auto& pair:p.deletion_reasons) {
        const auto v1=p.segments.find(pair.first);const auto v2=p.states_v2.find(pair.first);
        if(v1!=p.segments.end()) {if(v1->second.lifecycle!=RecordingLifecycle::DeletionPending)return Fail(error,"projection V1 deletion reason mismatch");}
        else if(v2==p.states_v2.end()||v2->second.lifecycle!=RecordingLifecycle::DeletionPending||v2->second.reason!=pair.second)
            return Fail(error,"projection orphan V2 deletion reason");
    }
    for(const auto& pair:p.source_bindings) {
        const auto segment=p.segments_v2.find(pair.first);const auto& s=pair.second.summary;
        if(segment==p.segments_v2.end()||s.source!=segment->second.source_id||s.channel!=segment->second.channel_id)
            return Fail(error,"projection source summary namespace mismatch");
    }
    for(const auto& id:p.derived_accepted_references) {
        const auto reference=p.consumer_references.find(id);
        if(reference==p.consumer_references.end()||reference->second.kind!="event")return Fail(error,"projection accepted reference missing");
    }
    // 과거 참조에 현재 Finalized 조건을 소급 적용하지 않는다.
    const auto v1_reference=[&](const std::string& id,const std::string& source,const std::string& channel) {
        const auto segment=p.segments.find(id);
        if(segment!=p.segments.end())return (source.empty()||segment->second.source_id==source)&&segment->second.channel_id==channel;
        const auto tomb=p.tombstones.find(id);
        return tomb!=p.tombstones.end()&&(source.empty()||tomb->second.source_id==source)&&tomb->second.channel_id==channel;
    };
    // ObservationPut는 segment 존재만 검사했다. 과거 source/channel 불일치를
    // 새 오류로 만들지 않으며 V2/ReferencedObservation에는 locator FK를 소급하지 않는다.
    for(const auto& pair:p.observations) {
        const auto& id=pair.second.frame_locator.segment_id;
        if(!p.segments.count(id)&&!p.tombstones.count(id))
            return Fail(error,"projection observation missing segment");
    }
    std::set<std::string> event_ids;
    const auto hold=[&](const std::string& id,RecordingRetentionClass retention) {
        const auto segment=p.segments.find(id);
        if(segment==p.segments.end()||segment->second.lifecycle!=RecordingLifecycle::Finalized||segment->second.retention_class!=retention)return false;
        auto& count=p.pending_hold_counts[id];if(count==static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max()))return false;
        ++count;return true;
    };
    for(const auto& pair:p.event_links) {
        const auto& link=pair.second;if(!event_ids.insert(link.event_id).second)return Fail(error,"projection duplicate event ID");
        for(const auto& overlap:link.ordered_overlaps) {
            if(!link.requested_range||!v1_reference(overlap.segment_id,{},link.channel_id))return Fail(error,"projection event overlap identity");
            const auto segment=p.segments.find(overlap.segment_id);const auto tomb=p.tombstones.find(overlap.segment_id);
            const auto start=segment!=p.segments.end()?segment->second.start.utc_ms:tomb->second.recorded_range.start_ms;
            const auto end=segment!=p.segments.end()?segment->second.end.utc_ms:tomb->second.recorded_range.end_ms;
            const auto retention=segment!=p.segments.end()?segment->second.retention_class:tomb->second.retention_class;
            if(retention!=RecordingRetentionClass::Continuous||
                (segment!=p.segments.end()&&!link.stream_epoch_id.empty()&&segment->second.stream_epoch_id!=link.stream_epoch_id)||
                overlap.range.start_ms!=std::max(start,link.requested_range->start_ms)||overlap.range.end_ms!=std::min(end,link.requested_range->end_ms))
                return Fail(error,"projection event overlap range/epoch");
        }
        if(link.status==EventRecordingLinkStatus::Complete) {
            if(!link.derived_segment_id||!link.derived_actual_range||!v1_reference(*link.derived_segment_id,link.source_id,link.channel_id))return Fail(error,"projection complete event identity");
            const auto segment=p.segments.find(*link.derived_segment_id);const auto tomb=p.tombstones.find(*link.derived_segment_id);
            const auto start=segment!=p.segments.end()?segment->second.start.utc_ms:tomb->second.recorded_range.start_ms;
            const auto end=segment!=p.segments.end()?segment->second.end.utc_ms:tomb->second.recorded_range.end_ms;
            const auto retention=segment!=p.segments.end()?segment->second.retention_class:tomb->second.retention_class;
            if(retention!=RecordingRetentionClass::Event||start!=link.derived_actual_range->start_ms||end!=link.derived_actual_range->end_ms)return Fail(error,"projection complete event range");
        }
        if(link.status!=EventRecordingLinkStatus::Pending||!link.derived_segment_id)continue;
        const auto derived=p.segments.find(*link.derived_segment_id);
        if(derived==p.segments.end()||derived->second.lifecycle!=RecordingLifecycle::Finalized||derived->second.retention_class!=RecordingRetentionClass::Event)continue;
        const bool output=link.completeness_reason=="event-catalog-finalize-recovery-pending"||link.completeness_reason=="event-marker-cleanup-recovery-pending"||
            link.completeness_reason=="event-terminal-release-recovery-pending"||link.completeness_reason=="event-terminal-output-release-pending";
        const bool source=output||link.completeness_reason=="event-terminal-source-release-pending";
        if(output&&!hold(derived->first,RecordingRetentionClass::Event))return Fail(error,"projection pending output hold invalid");
        if(source)for(const auto& overlap:link.ordered_overlaps)if(!hold(overlap.segment_id,RecordingRetentionClass::Continuous))return Fail(error,"projection pending source hold invalid");
    }
    return true;
}
bool ActiveDetails(const std::filesystem::path& root,std::uint64_t admission,
    RecordingCatalogGenerationProjection& p,std::string* error) {
    for(const auto& pair:p.derived_jobs) {
        const auto& summary=pair.second.summary;
        if(summary.state==DerivedJobState::Complete||summary.state==DerivedJobState::Failed)continue;
        RecordingMutationV1 mutation;DerivedJobRecordV1 job;
        if(!ReadVerifiedRecordingIdentityMutation(root,p.manifest,pair.second.origin,admission,&mutation,error)||
            !ParseDerivedJobRecord(mutation.payload_json,&job,error)||SerializeDerivedJobRecord(job)!=mutation.payload_json)
            return Fail(error,"projection active job detail unavailable");
        RecordingCatalogJobSummary actual{job.intent.job_id,job.intent.reference.channel_id,job.intent.reference.reference_id,
            job.state,job.files.size(),job.intent.reserved_bytes,{},{},mutation.mutation_id};
        for(const auto& output:job.intent.outputs)actual.output_ids.push_back(output.output_id);
        for(const auto& source:job.intent.sources)actual.source_ids.push_back(source.segment.segment_id);
        std::string a,b;
        if(!SerializeRecordingCatalogJobSummary(actual,&a,error)||!SerializeRecordingCatalogJobSummary(summary,&b,error)||a!=b)
            return Fail(error,"projection active job summary mismatch");
        for(const auto& source:job.intent.sources) {
            const auto segment=p.segments_v2.find(source.segment.segment_id);
            const auto entry=p.source_bindings.find(source.segment.segment_id);
            if(segment==p.segments_v2.end()||entry==p.source_bindings.end()||Lifecycle(p,segment->first)!=RecordingLifecycle::Finalized||
                !p.media_paths.count(segment->first)||SerializeRecordingSegmentV2(segment->second)!=SerializeRecordingSegmentV2(source.segment))
                return Fail(error,"projection active source protection mismatch");
            auto binding=p.active_source_bindings.find(segment->first);
            if(binding==p.active_source_bindings.end()) {
                RecordingMutationV1 original;ingress::StrictJsonObjectDocument payload;RecordingSegmentV2 original_segment;RecordingSourceBindingV1 original_binding;
                if(!ReadVerifiedRecordingIdentityMutation(root,p.manifest,entry->second.origin,admission,&original,error)||
                    !ingress::ParseStrictJsonObjectDocument(original.payload_json,&payload,error)||payload.members.size()!=3)
                    return Fail(error,"projection active source detail unavailable");
                const auto segment_json=ingress::StrictJsonObjectField(payload,"segment"),binding_json=ingress::StrictJsonObjectField(payload,"sourceBinding");
                const auto path=ingress::StrictJsonStringField(payload,"mediaRelpath");
                if(!segment_json||!binding_json||!path||*path!=p.media_paths.at(segment->first)||
                    !ParseRecordingSegmentV2(*segment_json,&original_segment,error)||SerializeRecordingSegmentV2(original_segment)!=*segment_json||
                    SerializeRecordingSegmentV2(original_segment)!=SerializeRecordingSegmentV2(segment->second)||
                    !ParseRecordingSourceBindingV1(*binding_json,&original_binding,error)||SerializeRecordingSourceBindingV1(original_binding)!=*binding_json||
                    !ValidateRecordingSourceBindingForSegment(original_binding,original_segment,error)||
                    original.payload_json!="{\"segment\":"+*segment_json+",\"mediaRelpath\":"+Quote(*path)+",\"sourceBinding\":"+*binding_json+"}")
                    return Fail(error,"projection active source domain mismatch");
                const auto& thin=entry->second.summary;
                RecordingCatalogSourceSummary loaded{original_binding.segment_id,original_binding.channel_id,original_binding.source_id,
                    original_binding.source_generation,original_binding.track_id,original_binding.generation_order,original_binding.samples.size(),original.mutation_id};
                if(!SerializeRecordingCatalogSourceSummary(loaded,&a,error)||!SerializeRecordingCatalogSourceSummary(thin,&b,error)||a!=b)
                    return Fail(error,"projection active source summary mismatch");
                binding=p.active_source_bindings.emplace(segment->first,std::move(original_binding)).first;
            }
            if(!BindingMatches(binding->second,source.binding))return Fail(error,"projection active job source binding mismatch");
        }
        for(std::size_t i=0;i<job.intent.outputs.size();++i) {
            const auto& output=job.intent.outputs[i];
            if(p.segments.count(output.output_id)||p.tombstones.count(output.output_id)||p.tombstones_v2.count(output.output_id))
                return Fail(error,"projection active output namespace collision");
            // Intent/Ready 뒤 별도 공개 finalize로 생긴 현재 V2도 기존 Open은 수용한다.
            // job 전이 가능성과 현재 저장 상태 수용을 혼동하지 않는다.
            if(job.state==DerivedJobState::Committed) {
                if(!job.ready||i>=job.ready->outputs.size())return Fail(error,"projection committed output missing");
                const auto segment=p.segments_v2.find(output.output_id);const auto path=p.media_paths.find(output.output_id);
                if(segment==p.segments_v2.end()||path==p.media_paths.end()||path->second!=output.final_relpath||
                    Lifecycle(p,output.output_id)!=RecordingLifecycle::Finalized||
                    SerializeRecordingSegmentV2(segment->second)!=SerializeRecordingSegmentV2(job.ready->outputs[i].segment))
                    return Fail(error,"projection committed output mismatch");
            }
        }
        if(job.ready)for(const auto& output:job.ready->outputs) {
            const auto& segment=output.segment;const auto order=p.orders.find(segment.order_request_id);
            if(order==p.orders.end()||order->second.store_id!=segment.store_id||order->second.segment_id!=segment.segment_id||
                order->second.channel_id!=segment.channel_id||order->second.sequence!=segment.order_sequence)
                return Fail(error,"projection ready output order mismatch");
        }
        p.active_jobs.emplace(pair.first,std::move(job));
    }
    return true;
}
#endif
}
bool BuildRecordingCatalogGenerationProjection(const std::filesystem::path& root,
    const RecordingGenerationManifest& manifest,const RecordingIdentityChainResult& chain,
    const RecordingCatalogSnapshot& snapshot,std::uint64_t admission,
    RecordingCatalogGenerationProjection* output,std::string* error) {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    try {
        std::string bytes,manifest_bytes;
        if(!output||!SerializeRecordingGenerationManifest(manifest,&manifest_bytes,error)||
            !ValidateRecordingCatalogSnapshotManifest(snapshot,manifest,error)||
            !SerializeRecordingCatalogSnapshot(snapshot,&bytes,error)||Hash(bytes)!=manifest.snapshot.sha256||
            !ValidateRecordingCatalogSnapshotAcceptedStates(snapshot,chain,error)||chain.store_id!=manifest.store_id||!chain.shards)
            return Fail(error,"projection manifest/snapshot/chain binding invalid");
        RecordingCatalogGenerationProjection p;p.manifest=manifest;p.order_history=chain.order_history;
        if(!SerializeRecordingOrderHistorySnapshot(chain.order_history,&bytes,error)||
            (!chain.order_history.bound_store.empty()&&chain.order_history.bound_store!=manifest.store_id))return Fail(error,"projection order history invalid");
        std::map<std::string,const RecordingIdentityFirstAcceptance*> first;std::uint64_t physical=0;
        for(const auto& entry:chain.first_acceptances) {
            if(!entry.occurrences||entry.occurrences>chain.physical_rows-physical||entry.mutation_id!=entry.first_row.mutation_id||
                entry.first_global_ordinal!=entry.first_row.global_ordinal||entry.first_global_ordinal>=manifest.cut_ordinal||
                !first.emplace(entry.mutation_id,&entry).second)return Fail(error,"projection first acceptance invalid");
            physical+=entry.occurrences;
            // Catalog의 accepted ID 집합은 Journal 예약 ID를 포함하지 않는다.
            if(entry.first_row.type!=RecordingMutationType::RecordingOrderReserved)
                p.mutation_ids.insert(entry.mutation_id);
        }
        if(physical!=chain.physical_rows)return Fail(error,"projection physical identity count mismatch");
        for(const auto& entry:chain.order_history.reservations) {
            const auto found=first.find(entry.order.request_id);
            if(found==first.end()||found->second->first_row.type!=RecordingMutationType::RecordingOrderReserved||
                !found->second->first_row.reservation||!SameOrder(entry.order,*found->second->first_row.reservation)||
                entry.occurred_at_ms!=found->second->first_row.occurred_at_ms||entry.order.segment_id!=found->second->first_row.entity_id)
                return Fail(error,"projection reservation first binding mismatch");
            p.orders.emplace(entry.order.request_id,entry.order);
        }
        for(const auto& item:first) {
            const auto& row=item.second->first_row;
            if(row.type==RecordingMutationType::RecordingOrderReserved) {if(!p.orders.count(item.first))return Fail(error,"projection missing reservation");}
            else if(row.reservation)return Fail(error,"projection nonreservation tuple");
        }
        for(const auto& row:snapshot.rows) {
            bool ok=false;
            if(row.kind=="segment-v1")ok=Decode(row,&p.segments,ParseRecordingSegmentV1,SerializeRecordingSegmentV1,&RecordingSegmentV1::segment_id,error);
            else if(row.kind=="segment-v2")ok=Decode(row,&p.segments_v2,ParseRecordingSegmentV2,SerializeRecordingSegmentV2,&RecordingSegmentV2::segment_id,error);
            else if(row.kind=="state-v2")ok=Decode(row,&p.states_v2,ParseRecordingSegmentStateV2,SerializeRecordingSegmentStateV2,&RecordingSegmentStateV2::segment_id,error);
            else if(row.kind=="tombstone-v1")ok=Decode(row,&p.tombstones,ParseRecordingTombstoneV1,SerializeRecordingTombstoneV1,&RecordingTombstoneV1::segment_id,error);
            else if(row.kind=="event-link")ok=Decode(row,&p.event_links,ParseEventRecordingLinkV1,SerializeEventRecordingLinkV1,&EventRecordingLinkV1::link_id,error);
            else if(row.kind=="observation-v1")ok=Decode(row,&p.observations,ParseAnalysisObservationV1,SerializeAnalysisObservationV1,&AnalysisObservationV1::observation_id,error);
            else if(row.kind=="observation-v2")ok=Decode(row,&p.observations_v2,ParseAnalysisObservationV2,SerializeAnalysisObservationV2,&AnalysisObservationV2::observation_id,error);
            else if(row.kind=="consumer-reference")ok=Decode(row,&p.consumer_references,ParseRecordingConsumerReferenceV1,SerializeRecordingConsumerReferenceV1,&RecordingConsumerReferenceV1::reference_id,error);
            else if(row.kind=="tombstone-v2") {
                RecordingTombstoneV2 value;ok=ParseRecordingTombstoneV2(row.value_json,&value,error)&&SerializeRecordingTombstoneV2(value)==row.value_json&&value.segment.segment_id==row.key;
                if(ok)p.tombstones_v2.emplace(row.key,std::move(value));
            } else if(row.kind=="referenced-observation") {
                ReferencedObservationV1 value;ok=ParseReferencedObservationV1(row.value_json,&value,error)&&SerializeReferencedObservationV1(value)==row.value_json&&value.observation.observation_id==row.key;
                if(ok)p.referenced_observations.emplace(row.key,std::move(value));
            } else if(row.kind=="media-path"||row.kind=="deletion-reason") {
                ingress::StrictJsonObjectDocument object;
                if(ingress::ParseStrictJsonObjectDocument("{\"value\":"+row.value_json+"}",&object,error)) {
                    const auto value=ingress::StrictJsonStringField(object,"value");ok=value&&Quote(*value)==row.value_json;
                    if(ok)(row.kind=="media-path"?p.media_paths:p.deletion_reasons).emplace(row.key,*value);
                }
            } else if(row.kind=="derived-reference-accepted") {ok=row.value_json=="true";if(ok)p.derived_accepted_references.insert(row.key);}
            else if(row.kind=="source-binding") {
                RecordingCatalogSourceSummary value;ok=ParseRecordingCatalogSourceSummary(row.value_json,&value,error)&&value.id==row.key;
                const auto found=first.find(value.latest_mutation_id);
                ok=ok&&found!=first.end()&&found->second->first_row.type==RecordingMutationType::SegmentV2BoundFinalized&&found->second->first_row.entity_id==row.key;
                if(ok)p.source_bindings.emplace(row.key,RecordingGenerationSourceProjection{std::move(value),*found->second});
            } else if(row.kind=="derived-job") {
                RecordingCatalogJobSummary value;ok=ParseRecordingCatalogJobSummary(row.value_json,&value,error)&&value.id==row.key;
                const auto found=first.find(value.latest_mutation_id);
                ok=ok&&found!=first.end()&&JobType(value.state,found->second->first_row.type)&&found->second->first_row.entity_id==row.key;
                if(ok)p.derived_jobs.emplace(row.key,RecordingGenerationJobProjection{std::move(value),*found->second});
            } else if(row.kind=="accepted-state") {
                const auto found=first.find(row.key);
                if(found!=first.end()) {
                    const auto& entry=*found->second;
                    ok=row.value_json=="{\"mutationId\":"+Quote(row.key)+",\"globalOrdinal\":"+std::to_string(entry.first_global_ordinal)+",\"type\":"+Quote(RecordingMutationTypeName(entry.first_row.type))+"}";
                    if(ok)p.accepted_states.emplace(row.key,entry);
                }
            }
            if(!ok)return Fail(error,"projection row domain/key/provenance invalid");
        }
        if(!CrossMaps(p,error)||!ActiveDetails(root,admission,p,error))return false;
        *output=std::move(p);if(error)error->clear();return true;
    }catch(...){return Fail(error,"projection allocation/domain failure");}
#else
    (void)root;(void)manifest;(void)chain;(void)snapshot;(void)admission;(void)output;
    return Fail(error,"projection unsupported: POSIX/OpenSSL required");
#endif
}
} // namespace recording
