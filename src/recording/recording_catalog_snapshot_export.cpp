#include "recording/recording_catalog.h"
#include "recording/recording_catalog_snapshot.h"
#include <algorithm>
#include <map>
#include <set>
#include <tuple>

namespace recording {
namespace {
bool Fail(std::string* error, const char* message) {
    if (error) *error = message;
    return false;
}
std::string Quote(const std::string& value) {
    std::string result = "\"";
    for (const unsigned char c : value) {
        switch (c) {
            case '"': result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:
                if (c < 32) {
                    const char* hex = "0123456789abcdef";
                    result += "\\u00"; result += hex[c >> 4]; result += hex[c & 15];
                } else result += static_cast<char>(c);
        }
    }
    return result + '"';
}
bool SameOrder(const RecordingOrderReservationV1& a, const RecordingOrderReservationV1& b) {
    return std::tie(a.schema,a.store_id,a.request_id,a.segment_id,a.channel_id,a.sequence) ==
           std::tie(b.schema,b.store_id,b.request_id,b.segment_id,b.channel_id,b.sequence);
}
bool JobType(RecordingMutationType type) {
    return type == RecordingMutationType::DerivedJobIntent || type == RecordingMutationType::DerivedJobFiles ||
        type == RecordingMutationType::DerivedJobReady || type == RecordingMutationType::DerivedJobCommitted ||
        type == RecordingMutationType::DerivedJobComplete || type == RecordingMutationType::DerivedJobFailed;
}
}

bool RecordingCatalog::ExportGenerationSnapshot(const RecordingIdentityChainResult& chain,
    std::uint64_t generation, std::uint64_t cut, RecordingCatalogSnapshot* output, std::string* error) const {
    std::lock_guard<std::mutex> lock(mu_);
    try {
        if (!output || !opened_ || !derived_job_state_authoritative_ || !journal_.managed_ ||
            !CanWriteLocked(error)) return Fail(error,"snapshot export authority unavailable");
        RecordingCatalogSnapshot result;
        result.store_id = journal_.ManagedStoreId(); result.generation = generation;
        result.cut_ordinal = cut; result.identity_head = chain.head;
        if (chain.store_id != result.store_id || !chain.shards ||
            (!chain.order_history.bound_store.empty() && chain.order_history.bound_store != result.store_id))
            return Fail(error,"snapshot chain store mismatch");
        std::string validated;
        if (!SerializeRecordingOrderHistorySnapshot(chain.order_history,&validated,error)) return false;
        std::map<std::string,const RecordingIdentityFirstAcceptance*> first;
        std::map<std::string,const RecordingOrderHistoryReservation*> orders;
        for (const auto& order : chain.order_history.reservations) orders.emplace(order.order.request_id,&order);
        std::uint64_t physical = 0;
        for (const auto& entry : chain.first_acceptances) {
            if (!first.emplace(entry.mutation_id,&entry).second || entry.mutation_id != entry.first_row.mutation_id ||
                entry.first_global_ordinal != entry.first_row.global_ordinal || entry.first_global_ordinal >= cut ||
                !entry.occurrences || entry.occurrences > chain.physical_rows - physical)
                return Fail(error,"snapshot first identity mismatch");
            physical += entry.occurrences;
            if (entry.first_row.type == RecordingMutationType::RecordingOrderReserved) {
                const auto found = orders.find(entry.mutation_id);
                if (!entry.first_row.reservation || found == orders.end() ||
                    !SameOrder(*entry.first_row.reservation,found->second->order) ||
                    entry.first_row.entity_id != found->second->order.segment_id ||
                    entry.first_row.occurred_at_ms != found->second->occurred_at_ms)
                    return Fail(error,"snapshot reservation identity mismatch");
            } else if (!mutation_ids_.count(entry.mutation_id) || entry.first_row.reservation) {
                return Fail(error,"snapshot ordinary identity missing");
            }
        }
        if (physical != chain.physical_rows) return Fail(error,"snapshot physical count mismatch");
        for (const auto& id : mutation_ids_) if (!first.count(id)) return Fail(error,"snapshot catalog ID missing");
        for (const auto& item : orders) {
            const auto found = first.find(item.first);
            if (found == first.end() || found->second->first_row.type != RecordingMutationType::RecordingOrderReserved)
                return Fail(error,"snapshot reservation first ID missing");
        }
        for (const auto& item : orders_v2_) {
            const auto found = orders.find(item.first);
            if (found == orders.end() || !SameOrder(item.second,found->second->order))
                return Fail(error,"snapshot catalog order mismatch");
        }
        for (const auto& item : segments_v2_) {
            const auto& segment = item.second;
            const auto found = orders.find(segment.order_request_id);
            if (found == orders.end() || segment.store_id != result.store_id ||
                found->second->order.segment_id != item.first || found->second->order.channel_id != segment.channel_id ||
                found->second->order.sequence != segment.order_sequence)
                return Fail(error,"snapshot finalized order mismatch");
        }
        const auto add = [&](const char* kind,const std::string& key,std::string bytes) {
            result.rows.push_back({kind,key,std::move(bytes)});
        };
        for (const auto& v : segments_) add("segment-v1",v.first,SerializeRecordingSegmentV1(v.second));
        for (const auto& v : segments_v2_) add("segment-v2",v.first,SerializeRecordingSegmentV2(v.second));
        for (const auto& v : states_v2_) add("state-v2",v.first,SerializeRecordingSegmentStateV2(v.second));
        for (const auto& v : tombstones_) add("tombstone-v1",v.first,SerializeRecordingTombstoneV1(v.second));
        for (const auto& v : tombstones_v2_) add("tombstone-v2",v.first,SerializeRecordingTombstoneV2(v.second));
        for (const auto& v : media_relpaths_) add("media-path",v.first,Quote(v.second));
        for (const auto& v : deletion_reasons_) add("deletion-reason",v.first,Quote(v.second));
        for (const auto& v : event_links_) add("event-link",v.first,SerializeEventRecordingLinkV1(v.second));
        for (const auto& v : observations_) add("observation-v1",v.first,SerializeAnalysisObservationV1(v.second));
        for (const auto& v : observations_v2_) add("observation-v2",v.first,SerializeAnalysisObservationV2(v.second));
        for (const auto& v : consumer_references_) add("consumer-reference",v.first,SerializeRecordingConsumerReferenceV1(v.second));
        for (const auto& v : referenced_observations_) add("referenced-observation",v.first,SerializeReferencedObservationV1(v.second));
        for (const auto& id : derived_accepted_references_) add("derived-reference-accepted",id,"true");
        for (const auto& item : source_bindings_) {
            const auto& v = item.second; const auto found = first.find(v.latest_mutation_id);
            if (item.first != v.id || found == first.end() || found->second->first_row.entity_id != v.id ||
                found->second->first_row.type != RecordingMutationType::SegmentV2BoundFinalized)
                return Fail(error,"snapshot source provenance mismatch");
            RecordingCatalogSourceSummary summary{v.id,v.channel,v.source,v.generation,v.track,v.order,v.sample_count,v.latest_mutation_id};
            if (!SerializeRecordingCatalogSourceSummary(summary,&validated,error)) return false;
            add("source-binding",item.first,validated);
        }
        for (const auto& item : derived_jobs_) {
            const auto& v = item.second; const auto found = first.find(v.latest_mutation_id);
            if (item.first != v.id || found == first.end() || found->second->first_row.entity_id != v.id ||
                !JobType(found->second->first_row.type)) return Fail(error,"snapshot job provenance mismatch");
            RecordingCatalogJobSummary summary{v.id,v.channel,v.reference,v.state,v.files,v.reserved_bytes,v.output_ids,v.source_ids,v.latest_mutation_id};
            if (!SerializeRecordingCatalogJobSummary(summary,&validated,error)) return false;
            add("derived-job",item.first,validated);
        }
        // chain은 이미 검증된 입력이다. 이 대조는 cold 링크 원문의 type/ordinal 검증이 아니다.
        for (const auto& item : accepted_segment_state_mutations_) {
            const auto found = first.find(item.first);
            if (found == first.end() || !mutation_ids_.count(item.first)) return Fail(error,"snapshot accepted ID missing");
            const auto& entry = *found->second;
            add("accepted-state",item.first,"{\"mutationId\":"+Quote(item.first)+",\"globalOrdinal\":"+
                std::to_string(entry.first_global_ordinal)+",\"type\":"+Quote(RecordingMutationTypeName(entry.first_row.type))+"}");
        }
        std::sort(result.rows.begin(),result.rows.end(),[](const auto& a,const auto& b) {
            return std::tie(a.kind,a.key) < std::tie(b.kind,b.key);
        });
        if (!ValidateRecordingCatalogSnapshotAcceptedStates(result,chain,error)) return false;
        *output = std::move(result);
        if (error) error->clear();
        return true;
    } catch (...) { return Fail(error,"snapshot export allocation/serialization failure"); }
}
} // namespace recording
