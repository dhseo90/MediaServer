// 파일 용도: 원본 참조와 검색의 UTC/PTS를 결합한다. 검색 결과를 파일 재생 증명으로 사용하지 않는다.
#include "recording/recording_search_reader.h"
#include <limits>

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
} // namespace recording
