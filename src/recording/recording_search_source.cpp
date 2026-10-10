// 파일 용도: 카탈로그의 검증된 resident/cold 행에서 일관된 검색 snapshot/관측 변화분을 내보낸다.
#include "recording/recording_catalog.h"
#include <algorithm>
#include <limits>
#include <new>
#include <stdexcept>

namespace recording {
namespace {
bool Fail(std::string* error, const char* value) { if (error) *error = value; return false; }
std::string Key(const std::string& value) { return std::to_string(value.size()) + ":" + value; }
std::optional<std::int64_t> Ns(std::int64_t ms) {
    if (ms < 0 || ms > std::numeric_limits<std::int64_t>::max() / 1000000) return {};
    return ms * 1000000;
}
void Point(SearchDocument& d, std::optional<std::int64_t> value) {
    if (value && *value >= 0 && *value < std::numeric_limits<std::int64_t>::max()) {
        d.start_ns = value; d.end_ns = *value + 1;
    }
}
SearchDocument Observation(const AnalysisObservationV2& o, const std::string& prefix) {
    SearchDocument d; d.kind = SearchDocumentKind::Observation;
    d.id = prefix + Key(o.observation_id); d.observation_id = o.observation_id; d.channel_id = o.channel_id;
    d.analysis_namespace = o.analysis_namespace; d.stream_epoch_id = o.stream_epoch_id;
    d.track_id = o.track_id; d.object = o.class_label;d.source_id=o.source_id;
    d.zone_ids = o.zone_ids; d.rule_ids = o.rule_ids; d.event_ids = o.event_ids;
    d.media_pts = o.pts; d.unavailable_reason = o.locator_reason;
    return d;
}
const char* State(RecordingLifecycle state) {
    switch (state) {
    case RecordingLifecycle::Finalized: return "media-not-checked";
    case RecordingLifecycle::Deleted: return "deleted";
    case RecordingLifecycle::DeletionPending: return "deletion-pending";
    case RecordingLifecycle::Corrupt: return "corrupt";
    default: return "pending";
    }
}
}

std::string SearchSourceIdentity(std::uint64_t instance, std::vector<std::string> channels) {
    std::sort(channels.begin(), channels.end());
    channels.erase(std::unique(channels.begin(), channels.end()), channels.end());
    std::string result = "catalog-" + std::to_string(instance) + ":";
    for (const auto& channel : channels) result += Key(channel);
    return result;
}

bool RecordingCatalog::ValidateSearchSource(const SearchSourceBatch& batch, std::string* error) const {
    std::lock_guard<std::mutex> lock(mu_);
    if (!opened_ || !CanReadLocked(error) || !source_snapshot_revision_valid_ ||
        batch.catalog_instance != search_instance_ || batch.resolution_revision != search_resolution_revision_)
        return Fail(error, "search-source-changed");
    if (error) error->clear();
    return true;
}

bool RecordingCatalog::CaptureSearchSource(const std::vector<std::string>& channels,
    const RecordingSearchModel* previous, SearchSourceBatch* result, std::string* error, SearchModelLimits limits, bool include_observations) const {
    if (!result || channels.empty() || channels.size() > 32) return Fail(error, "search-invalid-channels");
    for (const auto& channel : channels)
        if (!ValidateRecordingReferenceId(channel, nullptr)) return Fail(error, "search-invalid-channels");
    try {
        std::lock_guard<std::mutex> lock(mu_);
        if (!opened_ || !CanReadLocked(error) || !source_snapshot_revision_valid_ || !search_instance_ ||
            recovery_report_.projection_error_count || recovery_report_.corrupt_line_count)
            return Fail(error, "search-source-unavailable");
        SearchSourceBatch batch;
        batch.catalog_instance = search_instance_;batch.resolution_revision = search_resolution_revision_;
        batch.delta.source_instance = SearchSourceIdentity(search_instance_, channels);
        if(!include_observations)batch.delta.source_instance="recordings:"+batch.delta.source_instance;
        batch.delta.revision = source_snapshot_revision_;
        batch.delta.previous_revision = previous ? previous->revision() : 0;
        batch.rebuild = !previous || previous->source_instance() != batch.delta.source_instance ||
            previous->revision() < search_rebuild_revision_ || previous->revision() > source_snapshot_revision_;
        const auto selected = [&](const std::string& channel) {
            return std::find(channels.begin(), channels.end(), channel) != channels.end();
        };
        std::size_t bytes = sizeof(batch);
        const auto add = [&](SearchDocument d) {
            if (batch.delta.upserts.size() >= limits.max_documents ||
                !AccountSearchDocument(d, &bytes, limits.max_bytes)) return false;
            batch.delta.upserts.push_back(std::move(d));return true;
        };
        // 저장된 locator의 시각만 소비한다. 여기서 미확정 관측의 epoch/시각을 새로 추정하지 않는다.
        const auto locate = [&](SearchDocument& d, const FrameLocatorV1& locator) {
            d.segment_id = locator.segment_id;d.media_pts = locator.frame.pts;
            d.time_base_num = locator.frame.time_base_num;d.time_base_den = locator.frame.time_base_den;
            const auto found = segments_.find(locator.segment_id);
            if (found == segments_.end() || found->second.channel_id != d.channel_id) {
                d.unavailable_reason = "missing-original";return;
            }
            d.source_id=found->second.source_id;d.media_epoch_id=found->second.stream_epoch_id;
            d.unavailable_reason = State(found->second.lifecycle);
            Point(d, Ns(locator.frame.utc_ms));d.time_provenance = "legacy-locator";
        };
        const auto v1 = [&](const AnalysisObservationV1& o) {
            if (!selected(o.channel_id)) return true;
            SearchDocument d;d.id = "o1:" + Key(o.observation_id);d.kind = SearchDocumentKind::Observation;
            d.channel_id=o.channel_id;d.observation_id=o.observation_id;d.track_id=o.track_id;d.object=o.class_label;
            d.event_ids=o.event_ids;d.zone_ids=o.zone_ids;d.rule_ids=o.rule_ids;
            locate(d,o.frame_locator);return add(std::move(d));
        };
        const auto v2 = [&](const AnalysisObservationV2& o) {
            if (!selected(o.channel_id)) return true;
            auto d=Observation(o,"o2:");if(o.frame_locator)locate(d,*o.frame_locator);
            return add(std::move(d));
        };
        const auto referenced = [&](const ReferencedObservationV1& pair) {
            if (!selected(pair.observation.channel_id)) return true;
            auto d=Observation(pair.observation,"or:");d.reference_id=pair.reference.reference_id;
            // 참조는 고정 크기 필드/문자열 계약이다. 사본과 임시값의 비용을 먼저 계상한다.
            const auto size=SerializeRecordingConsumerReferenceV1(pair.reference).size();
            if (size > limits.max_bytes/4 || bytes > limits.max_bytes-size*4) return false;
            bytes+=size*4;
            const auto index=batch.delta.upserts.size();
            if(!add(std::move(d)))return false;
            batch.pending.push_back({index,pair.reference});return true;
        };
        if (batch.rebuild) {
            for (const auto& [id,s] : segments_) {
                if (!selected(s.channel_id) || s.lifecycle == RecordingLifecycle::Deleted || tombstones_.count(id)) continue;
                SearchDocument d;d.id="s1:"+Key(id);d.channel_id=s.channel_id;d.segment_id=id;
                d.source_id=s.source_id;d.media_epoch_id=s.stream_epoch_id;d.stream_epoch_id=s.stream_epoch_id;d.media_end_pts=s.end.pts;d.start_ns=Ns(s.start.utc_ms);d.end_ns=Ns(s.end.utc_ms);
                if (!d.start_ns || !d.end_ns || *d.start_ns>=*d.end_ns) {d.start_ns.reset();d.end_ns.reset();}
                d.media_pts=s.start.pts;d.time_base_num=s.start.time_base_num;d.time_base_den=s.start.time_base_den;
                d.time_provenance="legacy-segment";d.unavailable_reason=State(s.lifecycle);
                if(!add(std::move(d)))return Fail(error,"search-capacity-exceeded");
            }
            for (const auto& entry : segments_v2_) {
                const auto& id=entry.first;const auto& s=entry.second;
                const auto lifecycle=EffectiveLifecycleV2Locked(id);
                if (!selected(s.channel_id) || lifecycle==RecordingLifecycle::Deleted) continue;
                const auto segment = [&](const RecordingUtcMappingV1* m) {
                    SearchDocument d;d.id="s2:"+Key(id)+Key(m?m->mapping_id:"");d.channel_id=s.channel_id;d.segment_id=id;
                    d.source_id=s.source_id;d.store_id=s.store_id;d.media_epoch_id=s.media_epoch_id;d.stream_epoch_id=s.media_epoch_id;d.media_end_pts=m?m->end_pts:s.media_end_pts;d.media_pts=m?m->start_pts:s.media_start_pts;
                    d.time_base_num=s.time_base_num;d.time_base_den=s.time_base_den;d.unavailable_reason=State(lifecycle);
                    if(m){d.time_provenance=m->provenance;d.uncertainty_ns=m->uncertainty_ns;
                        if(m->provenance!="unknown"&&m->utc_start_ns&&m->utc_end_ns&&*m->utc_start_ns<*m->utc_end_ns){
                            d.start_ns=m->utc_start_ns;d.end_ns=m->utc_end_ns;}}
                    return add(std::move(d));
                };
                if (s.mappings.empty()) {if(!segment(nullptr))return Fail(error,"search-capacity-exceeded");}
                else for(const auto& mapping:s.mappings)if(!segment(&mapping))return Fail(error,"search-capacity-exceeded");
            }
            if(include_observations&&(!observations_.ForEach(v1)||!observations_v2_.ForEach(v2)||!referenced_observations_.ForEach(referenced)))
                return Fail(error,"search-capacity-exceeded");
        } else if(include_observations) {
            std::set<std::pair<RecordingMutationType,std::string>> changed;
            for(const auto& change:search_changes_)if(change.revision>previous->revision())changed.emplace(change.type,change.id);
            for(const auto& [type,id]:changed) {
                if(type==RecordingMutationType::ObservationPut){const auto it=observations_.find(id);
                    if(it!=observations_.end()&&!v1(it->second))return Fail(error,"search-capacity-exceeded");}
                else if(type==RecordingMutationType::ObservationV2Put){const auto it=observations_v2_.find(id);
                    if(it!=observations_v2_.end()&&!v2(it->second))return Fail(error,"search-capacity-exceeded");}
                else {const auto it=referenced_observations_.find(id);
                    if(it!=referenced_observations_.end()&&!referenced(it->second))return Fail(error,"search-capacity-exceeded");}
            }
        }
        *result=std::move(batch);if(error)error->clear();return true;
    } catch(const RecordingRetainedReadError&) {return Fail(error,"search-source-unavailable");}
      catch(const std::bad_alloc&) {return Fail(error,"search-capacity-exceeded");}
      catch(const std::length_error&) {return Fail(error,"search-capacity-exceeded");}
}
} // namespace recording
