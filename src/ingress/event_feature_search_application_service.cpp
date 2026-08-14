// 파일 요약: dependency-neutral Event Feature/Search 요청을 canonical analysis index로 투영한다.
// 동작 요약: privacy/schema/media 안전값을 고정하고 rebuild, DSL 변환, 검색, 결과 mapping 순서를 보존한다.
#include "ingress/event_feature_search_application_service.h"

#include <algorithm>
#include <utility>

#include "analysis/event_feature_search_index.h"

namespace ingress {

namespace {

std::size_t ParseRequestedSize(const std::optional<std::string>& requested,
                               std::size_t default_value,
                               std::size_t min_value,
                               std::size_t max_value) {
    if (!requested.has_value()) {
        return default_value;
    }
    try {
        const int parsed = std::stoi(*requested);
        if (parsed < 0) {
            return min_value;
        }
        return std::max(min_value, std::min(max_value, static_cast<std::size_t>(parsed)));
    } catch (...) {
        return default_value;
    }
}

EventFeatureSearchApplicationEntry ProjectEntry(
    const analysis::EventSearchIndexEntry& source) {
    EventFeatureSearchApplicationEntry output;
    output.event_id = source.event_id;
    output.feature_revision = source.feature_revision;
    output.has_event_record = source.has_event_record;
    output.has_feature_set = source.has_feature_set;
    output.has_evidence_manifest = source.has_evidence_manifest;
    output.has_review_state = source.has_review_state;
    output.document.event_id = source.document.event_id;
    output.document.source_id = source.document.source_id;
    output.document.channel_id = source.document.channel_id;
    output.document.event_type = source.document.event_type;
    output.document.scenario = source.document.scenario;
    output.document.status = source.document.status;
    output.document.zone_id = source.document.zone_id;
    output.document.line_id = source.document.line_id;
    output.document.class_name = source.document.class_name;
    output.document.review_state = source.document.review_state;
    output.document.timestamp_ms = source.document.timestamp_ms;
    output.document.pinned = source.document.pinned;
    output.document.features.reserve(source.document.features.size());
    for (const auto& feature : source.document.features) {
        output.document.features.push_back({feature.field, feature.value});
    }
    output.evidence_refs = source.evidence_refs;
    return output;
}

analysis::EventSearchDsl BuildSearchDsl(const EventFeatureSearchApplicationQuery& query) {
    analysis::EventSearchQueryOptions options;
    options.default_limit = query.default_limit;
    options.max_limit = query.max_limit;
    options.max_offset = query.max_offset;
    auto dsl = analysis::ConvertEventSearchQueryToDsl(query.query, options);
    if (query.forced_limit.has_value()) {
        dsl.limit = *query.forced_limit;
    }
    if (query.forced_offset.has_value()) {
        dsl.offset = *query.forced_offset;
    }
    dsl.limit = ParseRequestedSize(query.requested_limit, dsl.limit, 1, query.max_limit);
    dsl.offset = ParseRequestedSize(query.requested_offset, dsl.offset, 0, query.max_offset);
    dsl.search_index_required = query.search_index_required;
    dsl.ops_events_ui_required = query.ops_events_ui_required;
    if (query.pinned_only) {
        dsl.filters.push_back({"pinned", "eq", "true"});
    }
    return dsl;
}

}  // namespace

EventFeatureSearchApplicationQueryResolution ResolveEventFeatureSearchQueryForApplication(
    const EventFeatureSearchApplicationQuery& query) {
    const auto dsl = BuildSearchDsl(query);
    EventFeatureSearchApplicationQueryResolution output;
    output.search_dsl_valid = dsl.valid;
    output.rejection_reason = dsl.rejection_reason;
    output.limit = dsl.limit;
    output.offset = dsl.offset;
    return output;
}

EventFeatureSearchApplicationResult SearchEventFeaturesForApplication(
    const std::vector<EventFeatureSearchApplicationRecord>& records,
    const EventFeatureSearchApplicationQuery& query) {
    analysis::EventFeatureSearchIndexRebuildInput input;
    input.events.reserve(records.size());
    input.feature_sets.reserve(records.size());
    input.evidence_manifests.reserve(records.size());
    input.review_states.reserve(records.size());
    for (const auto& record : records) {
        analysis::EventSearchIndexEventRecord event;
        event.event_id = record.event_id;
        event.source_id = record.source_id;
        event.channel_id = record.channel_id;
        event.event_type = record.event_type;
        event.scenario = record.scenario;
        event.status = record.status;
        event.zone_id = record.zone_id;
        event.line_id = record.line_id;
        event.class_name = record.class_name;
        event.timestamp_ms = record.timestamp_ms;
        event.event_post_payload_changed = false;
        event.webrtc_data_channel_schema_changed = false;
        event.sse_ws_metadata_schema_changed = false;
        event.rtsp_webrtc_media_path_changed = false;
        event.viewer_client_exposure_added = false;
        input.events.push_back(std::move(event));

        analysis::EventSearchIndexFeatureSet feature_set;
        feature_set.event_id = record.event_id;
        feature_set.feature_set_id = record.feature_set_id;
        feature_set.feature_revision = record.feature_revision;
        feature_set.features.reserve(record.features.size());
        for (const auto& source : record.features) {
            analysis::EventSearchIndexFeature feature;
            feature.namespace_name = source.namespace_name;
            feature.name = source.name;
            feature.value = source.value;
            feature.evidence_ref = source.evidence_ref;
            feature.searchable = true;
            feature.identity_feature = false;
            feature.raw_prompt_fragment_stored = false;
            feature.raw_provider_response_fragment_stored = false;
            feature_set.features.push_back(std::move(feature));
        }
        feature_set.raw_prompt_stored = false;
        feature_set.raw_provider_response_stored = false;
        feature_set.provider_request_body_stored = false;
        feature_set.credential_stored = false;
        feature_set.source_url_stored = false;
        feature_set.raw_frame_bytes_stored = false;
        feature_set.identity_features_allowed = false;
        input.feature_sets.push_back(std::move(feature_set));

        analysis::EventSearchIndexEvidenceManifest evidence;
        evidence.event_id = record.event_id;
        evidence.manifest_path = record.manifest_path;
        evidence.event_frame_present = record.event_frame_present;
        evidence.representative_image_present = record.representative_image_present;
        evidence.bbox_crop_count = record.bbox_crop_count;
        evidence.frame_bundle_present = record.frame_bundle_present;
        evidence.raw_prompt_stored = false;
        evidence.raw_provider_response_stored = false;
        evidence.identity_features_allowed = false;
        evidence.archive_api = false;
        input.evidence_manifests.push_back(std::move(evidence));

        analysis::EventSearchIndexReviewState review;
        review.event_id = record.event_id;
        review.review_state = record.review_state;
        review.classification = record.classification;
        review.incident_status = record.incident_status;
        review.pinned = record.pinned;
        input.review_states.push_back(std::move(review));
    }

    analysis::EventFeatureSearchIndex index;
    const auto report = index.Rebuild(input);
    const auto dsl = BuildSearchDsl(query);

    const auto hits = dsl.valid ? index.Search(dsl) : std::vector<analysis::EventSearchIndexEntry>{};
    EventFeatureSearchApplicationResult output;
    output.search_dsl_valid = dsl.valid;
    output.rejection_reason = dsl.rejection_reason;
    output.limit = dsl.limit;
    output.offset = dsl.offset;
    output.generation = report.generation;
    output.indexed_entries = report.indexed_entries;
    output.privacy_rejected_records = report.privacy_rejected_records;
    output.hits.reserve(hits.size());
    for (const auto& hit : hits) {
        output.hits.push_back(ProjectEntry(hit));
    }
    return output;
}

}  // namespace ingress
