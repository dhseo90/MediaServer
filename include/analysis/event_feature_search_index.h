// 파일 요약: v3.0 Feature/Search Index의 로컬 projection 계약을 선언한다.
// 동작 요약: EventRecord, FeatureSet, EvidenceManifest, operator review state를 Search DSL 문서로 묶는다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

#include "analysis/event_search_query.h"

namespace analysis {

struct EventSearchIndexEventRecord {
    std::string event_id;
    std::string source_id;
    std::string channel_id;
    std::string event_type;
    std::string scenario;
    std::string status;
    std::string zone_id;
    std::string line_id;
    std::string class_name;
    std::int64_t timestamp_ms{0};
    bool event_post_payload_changed{false};
    bool webrtc_data_channel_schema_changed{false};
    bool sse_ws_metadata_schema_changed{false};
    bool rtsp_webrtc_media_path_changed{false};
    bool viewer_client_exposure_added{false};
};

struct EventSearchIndexFeature {
    std::string namespace_name;
    std::string name;
    std::string value;
    std::string evidence_ref;
    bool searchable{true};
    bool identity_feature{false};
    bool raw_prompt_fragment_stored{false};
    bool raw_provider_response_fragment_stored{false};
};

struct EventSearchIndexFeatureSet {
    std::string event_id;
    std::string feature_set_id;
    int feature_revision{1};
    std::vector<EventSearchIndexFeature> features;
    bool raw_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool provider_request_body_stored{false};
    bool credential_stored{false};
    bool source_url_stored{false};
    bool raw_frame_bytes_stored{false};
    bool identity_features_allowed{false};
};

struct EventSearchIndexEvidenceManifest {
    std::string event_id;
    std::string manifest_path;
    bool event_frame_present{false};
    bool representative_image_present{false};
    std::size_t bbox_crop_count{0};
    bool frame_bundle_present{false};
    bool raw_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool identity_features_allowed{false};
    bool archive_api{false};
};

struct EventSearchIndexReviewState {
    std::string event_id;
    std::string review_state;
    std::string classification;
    std::string incident_status;
    bool pinned{false};
};

struct EventSearchIndexEntry {
    std::string event_id;
    int feature_revision{0};
    bool has_event_record{false};
    bool has_feature_set{false};
    bool has_evidence_manifest{false};
    bool has_review_state{false};
    EventSearchDocument document;
    std::vector<std::string> evidence_refs;
};

struct EventOptionalVectorEmbedding {
    std::string event_id;
    std::string embedding_id;
    std::string namespace_name;
    std::string model_id;
    std::string evidence_ref;
    std::vector<float> values;
    float quality{0.0F};
    bool searchable{true};
    bool face_embedding{false};
    bool identity_embedding{false};
    bool raw_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool provider_request_body_stored{false};
    bool provider_embedding_call_performed{false};
    bool credential_stored{false};
    bool source_url_stored{false};
    bool raw_frame_bytes_stored{false};
};

struct EventOptionalVectorIndexOptions {
    bool enabled{false};
    float min_quality{0.75F};
    std::size_t expected_dimensions{0};
};

struct EventOptionalVectorSearchQuery {
    bool enabled{false};
    std::vector<float> values;
    std::size_t limit{10};
    float min_score{0.0F};
};

struct EventOptionalVectorIndexReport {
    std::string schema{"media-server.v310-optional-vector-search-report.v1"};
    std::uint64_t generation{0};
    bool default_off{true};
    bool vector_index_enabled{false};
    bool rebuild_performed{false};
    bool vector_search_performed{false};
    std::size_t embeddings_seen{0};
    std::size_t indexed_embeddings{0};
    std::size_t quality_rejected_embeddings{0};
    std::size_t dimension_rejected_embeddings{0};
    std::size_t privacy_rejected_embeddings{0};
    std::size_t orphan_embeddings_skipped{0};
    bool quality_gate_active{true};
    bool dimension_gate_active{true};
    bool identity_embeddings_rejected{true};
    bool face_embeddings_rejected{true};
    bool raw_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool runtime_provider_call_performed{false};
    bool provider_embedding_call_performed{false};
    bool event_post_payload_changed{false};
    bool webrtc_data_channel_schema_changed{false};
    bool sse_ws_metadata_schema_changed{false};
    bool rtsp_webrtc_media_path_changed{false};
    bool viewer_client_exposure_added{false};
    std::string rejection_reason;
};

struct EventOptionalVectorSearchResult {
    std::string event_id;
    std::string embedding_id;
    float score{0.0F};
    std::size_t rank{0};
    EventSearchDocument document;
};

struct EventOptionalVectorSearchOutput {
    std::vector<EventOptionalVectorSearchResult> results;
    EventOptionalVectorIndexReport report;
};

struct EventFeatureSearchIndexRebuildInput {
    std::vector<EventSearchIndexEventRecord> events;
    std::vector<EventSearchIndexFeatureSet> feature_sets;
    std::vector<EventSearchIndexEvidenceManifest> evidence_manifests;
    std::vector<EventSearchIndexReviewState> review_states;
};

struct EventSearchIndexReport {
    std::string schema{"media-server.v300-feature-search-index-report.v1"};
    std::uint64_t generation{0};
    std::size_t events_seen{0};
    std::size_t indexed_entries{0};
    std::size_t feature_sets_seen{0};
    std::size_t latest_feature_sets_indexed{0};
    std::size_t stale_feature_sets_skipped{0};
    std::size_t orphan_feature_sets_skipped{0};
    std::size_t evidence_manifests_seen{0};
    std::size_t evidence_manifests_indexed{0};
    std::size_t stale_evidence_manifests_skipped{0};
    std::size_t orphan_evidence_manifests_skipped{0};
    std::size_t review_states_seen{0};
    std::size_t review_states_indexed{0};
    std::size_t orphan_review_states_skipped{0};
    std::size_t privacy_rejected_records{0};
    bool stale_result_guard_active{true};
    bool raw_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool runtime_provider_call_performed{false};
    bool vector_search_performed{false};
    bool ops_events_ui_required{false};
    bool event_post_payload_changed{false};
    bool webrtc_data_channel_schema_changed{false};
    bool sse_ws_metadata_schema_changed{false};
    bool rtsp_webrtc_media_path_changed{false};
    bool viewer_client_exposure_added{false};
};

class EventFeatureSearchIndex final {
public:
    EventSearchIndexReport Rebuild(const EventFeatureSearchIndexRebuildInput& input);
    std::vector<EventSearchIndexEntry> Search(const EventSearchDsl& dsl) const;
    EventOptionalVectorIndexReport RebuildOptionalVectorIndex(
        const std::vector<EventOptionalVectorEmbedding>& embeddings,
        const EventOptionalVectorIndexOptions& options = {});
    EventOptionalVectorSearchOutput SearchOptionalVector(
        const EventOptionalVectorSearchQuery& query) const;
    const EventSearchIndexReport& Report() const;
    const EventOptionalVectorIndexReport& OptionalVectorReport() const;
    const std::vector<EventSearchIndexEntry>& Entries() const;

private:
    struct OptionalVectorIndexEntry {
        std::string event_id;
        std::string embedding_id;
        std::vector<float> values;
        float quality{0.0F};
        EventSearchDocument document;
    };

    std::uint64_t generation_{0};
    std::uint64_t vector_generation_{0};
    EventSearchIndexReport report_;
    EventOptionalVectorIndexReport vector_report_;
    std::vector<EventSearchIndexEntry> entries_;
    std::vector<OptionalVectorIndexEntry> vector_entries_;
};

std::string EventFeatureSearchIndexReportJson(const EventSearchIndexReport& report);
bool EventFeatureSearchIndexReportContainsForbiddenMaterial(const EventSearchIndexReport& report);
std::string EventOptionalVectorIndexReportJson(const EventOptionalVectorIndexReport& report);
bool EventOptionalVectorIndexReportContainsForbiddenMaterial(
    const EventOptionalVectorIndexReport& report);

}  // namespace analysis
