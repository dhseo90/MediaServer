// 파일 용도: 원본 참조와 검색의 UTC/PTS를 결합한다. 검색 결과를 파일 재생 증명으로 사용하지 않는다.
#include "recording/recording_search_reader.h"
#include <limits>
#include <map>
#include <tuple>
#include "ingress/event_storage_application_service.h"

namespace recording {
namespace {
void Locate(SearchDocument& d, const ConsumerReferenceResolution& resolution) {
    if (resolution.exact.size() != 1 || !resolution.unindexed.empty()) {
        d.unavailable_reason = resolution.exact.size() > 1 ? "ambiguous-original" :
            (!resolution.unindexed.empty() ? "sample-index-cap" : resolution.reason);
        if (d.unavailable_reason.empty()) d.unavailable_reason = "unresolved-original";
        return;
    }
    const auto& resolved = resolution.exact.front();
    const auto& location = resolved.location;
    if (location.state != RecordingLocationState::Single || location.candidates.size() != 1) {
        d.unavailable_reason = "unresolved-location";return;
    }
    const auto& candidate = location.candidates.front();
    d.segment_id = candidate.segment_id;d.media_pts = candidate.media_pts;
    d.time_base_num = candidate.time_base_num;d.time_base_den = candidate.time_base_den;
    d.unavailable_reason = "media-not-checked";
    if (!candidate.mapping) return;
    const auto& mapping = *candidate.mapping;
    d.time_provenance = mapping.provenance;d.uncertainty_ns = mapping.uncertainty_ns;
    if (location.has_unknown || mapping.provenance == "unknown" || !mapping.utc_start_ns ||
        !mapping.utc_end_ns || !mapping.end_pts || candidate.time_base_num <= 0 || candidate.time_base_den <= 0) return;
    const __int128 numerator = (static_cast<__int128>(candidate.media_pts) - mapping.start_pts) *
        candidate.time_base_num * 1000000000;
    if (numerator % candidate.time_base_den) {d.unavailable_reason="unrepresentable-utc-time";return;}
    const auto ns = static_cast<__int128>(*mapping.utc_start_ns) + numerator / candidate.time_base_den;
    if (ns < 0 || ns < *mapping.utc_start_ns || ns >= *mapping.utc_end_ns ||
        ns >= std::numeric_limits<std::int64_t>::max()) return;
    d.start_ns = static_cast<std::int64_t>(ns);d.end_ns = *d.start_ns + 1;
}
}

bool RecordingSearchReader::Refresh(const std::vector<std::string>& channels,
    const std::shared_ptr<const RecordingSearchModel>& previous,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits) const {
    if (!output) {if(error)*error="search-invalid-output";return false;}
    SearchSourceBatch batch;
    if (!catalog_.CaptureSearchSource(channels, previous.get(), &batch, error, limits)) return false;
    for (const auto& pending : batch.pending) {
        ConsumerReferenceResolution resolution;
        if (!reader_.ResolveConsumerReference(pending.reference, &resolution, error)) return false;
        Locate(batch.delta.upserts.at(pending.document_index), resolution);
    }
    if (!catalog_.ValidateSearchSource(batch, error)) return false;
    if (!batch.rebuild && previous && previous->revision() == batch.delta.revision) {
        *output = previous;if(error)error->clear();return true;
    }
    std::shared_ptr<const RecordingSearchModel> next;
    const bool built = batch.rebuild ? RecordingSearchModel::Build(batch.delta.upserts,
        batch.delta.source_instance, batch.delta.revision, &next, error, limits) :
        RecordingSearchModel::ApplyDelta(*previous, batch.delta, &next, error, limits);
    // 정렬/복사 동안 발생한 원본 상태 변경도 완료 직전에 거부한다.
    if (!built || !catalog_.ValidateSearchSource(batch, error)) return false;
    *output = std::move(next);if(error)error->clear();return true;
}
bool RecordingSearchReader::WithEventFacts(const RecordingSearchModel& source,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits) {
    if (!output) {if(error)*error="search-invalid-output";return false;}
    try {
        auto documents=source.documents();
        std::map<std::string,std::vector<std::size_t>> channels;
        for(std::size_t i=0;i<documents.size();++i) {
            documents[i].event_facts.clear();
            if(!documents[i].event_ids.empty())channels[documents[i].channel_id].push_back(i);
        }
        for(const auto& channel:channels) {
            std::vector<ingress::EventSearchApplicationFact> facts;
            if(!ingress::ReadEventSearchFactsForApplication(channel.first,&facts,error))return false;
            std::map<std::string,const ingress::EventSearchApplicationFact*> by_id;
            for(const auto& fact:facts) {
                auto inserted=by_id.emplace(fact.event_id,&fact);
                if(!inserted.second) {
                    const auto& old=*inserted.first->second;
                    if(std::tie(old.channel_id,old.track_id,old.stream_epoch_id,old.event_type,old.scenario_name)!=
                       std::tie(fact.channel_id,fact.track_id,fact.stream_epoch_id,fact.event_type,fact.scenario_name)) {
                        if(error)*error="search-event-evidence-conflict";return false;
                    }
                }
            }
            for(const auto index:channel.second) {
                auto& d=documents[index];
                for(const auto& id:d.event_ids) {
                    const auto found=by_id.find(id);if(found==by_id.end())continue;
                    const auto& fact=*found->second;
                    if(fact.channel_id!=d.channel_id || (!d.track_id.empty()&&d.track_id!=std::to_string(fact.track_id)) ||
                        (!d.stream_epoch_id.empty()&&!fact.stream_epoch_id.empty()&&d.stream_epoch_id!=fact.stream_epoch_id))continue;
                    d.event_facts.push_back({fact.event_id,fact.event_type,fact.scenario_name});
                }
            }
        }
        return RecordingSearchModel::Build(documents,source.source_instance(),source.revision(),output,error,limits);
    } catch(const std::bad_alloc&) {if(error)*error="search-capacity-exceeded";return false;}
      catch(const std::length_error&) {if(error)*error="search-capacity-exceeded";return false;}
}
} // namespace recording
