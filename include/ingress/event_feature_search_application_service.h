// 파일 요약: Event Feature/Search Index의 dependency-neutral application 계약을 선언한다.
// 동작 요약: transport가 만든 안전한 record/query를 canonical local index에 연결하고 검색 결과 DTO를 반환한다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace ingress {

struct EventFeatureSearchApplicationFeature {
    std::string namespace_name;
    std::string name;
    std::string value;
    std::string evidence_ref;
};

struct EventFeatureSearchApplicationRecord {
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
    std::string feature_set_id;
    int feature_revision{1};
    std::vector<EventFeatureSearchApplicationFeature> features;
    std::string manifest_path;
    bool event_frame_present{false};
    bool representative_image_present{false};
    std::size_t bbox_crop_count{0};
    bool frame_bundle_present{false};
    std::string review_state;
    std::string classification;
    std::string incident_status;
    bool pinned{false};
};

struct EventFeatureSearchApplicationQuery {
    std::string query;
    std::size_t default_limit{50};
    std::size_t max_limit{100};
    std::size_t max_offset{10000};
    std::optional<std::size_t> forced_limit;
    std::optional<std::size_t> forced_offset;
    std::optional<std::string> requested_limit;
    std::optional<std::string> requested_offset;
    bool pinned_only{false};
    bool search_index_required{true};
    bool ops_events_ui_required{false};
};

struct EventFeatureSearchApplicationFieldValue {
    std::string field;
    std::string value;
};

struct EventFeatureSearchApplicationDocument {
    std::string event_id;
    std::string source_id;
    std::string channel_id;
    std::string event_type;
    std::string scenario;
    std::string status;
    std::string zone_id;
    std::string line_id;
    std::string class_name;
    std::string review_state;
    std::int64_t timestamp_ms{0};
    bool pinned{false};
    std::vector<EventFeatureSearchApplicationFieldValue> features;
};

struct EventFeatureSearchApplicationEntry {
    std::string event_id;
    int feature_revision{0};
    bool has_event_record{false};
    bool has_feature_set{false};
    bool has_evidence_manifest{false};
    bool has_review_state{false};
    EventFeatureSearchApplicationDocument document;
    std::vector<std::string> evidence_refs;
};

struct EventFeatureSearchApplicationResult {
    bool search_dsl_valid{true};
    std::string rejection_reason;
    std::size_t limit{0};
    std::size_t offset{0};
    std::uint64_t generation{0};
    std::size_t indexed_entries{0};
    std::size_t privacy_rejected_records{0};
    std::vector<EventFeatureSearchApplicationEntry> hits;
};

struct EventFeatureSearchApplicationQueryResolution {
    bool search_dsl_valid{true};
    std::string rejection_reason;
    std::size_t limit{0};
    std::size_t offset{0};
};

EventFeatureSearchApplicationQueryResolution ResolveEventFeatureSearchQueryForApplication(
    const EventFeatureSearchApplicationQuery& query);

EventFeatureSearchApplicationResult SearchEventFeaturesForApplication(
    const std::vector<EventFeatureSearchApplicationRecord>& records,
    const EventFeatureSearchApplicationQuery& query);

}  // namespace ingress
