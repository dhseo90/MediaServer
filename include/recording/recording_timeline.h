#pragma once
// 파일 용도: 공개 timeline 값과 조회 내부 계보 구간. 저장 원장 shape는 변경하지 않는다.
#include "recording/recording_contracts.h"
#include <cstddef>
namespace recording {
struct RecordingTimelineQuery {
    std::string channel_id;
    std::int64_t start_ms{0},end_ms{0};
    std::size_t offset{0},limit{100};
};
struct RecordingTimelineCoverage {
    // 내부 우선 표시 대조 전용. raw source/store/epoch는 JSON으로 직렬화하지 않는다.
    std::string source_id,store_id,epoch_id,segment_id;
    std::int64_t start_ns{0},end_ns{0};
};
struct RecordingTimelineOverlap {
    std::string item_id;
    std::int64_t start_ns{0},end_ns{0};
};
struct RecordingTimelineItem {
    std::string segment_id,channel_id,kind;
    int display_priority{0};
    std::int64_t start_ms{0},end_ms{0};
    std::string event_id,completeness;
    bool playable{false};
    std::string playback_url,content_type;
    std::vector<std::string> superseded_by_event_ids;
    std::optional<UtcRangeV1> requested_range,actual_range;
    std::string range_basis{"segment"};
    std::string item_id,reference_id,job_id,job_state,catalog_state,unavailable_reason;
    bool unplaced{false},hide_by_event{false};
    std::optional<std::int64_t> utc_start_ns,utc_end_ns,uncertainty_ns;
    std::string mapping_provenance,mapping_id;
    std::string media_axis{"segment-media-pts"};
    std::optional<std::int64_t> media_start_pts,media_end_pts;
    std::int32_t time_base_num{1},time_base_den{1000000000};
    std::optional<std::int64_t> order_sequence;
    std::optional<RecordingConsumerRequestV1> request;
    std::vector<RecordingTimelineCoverage> coverage;
    std::vector<RecordingTimelineOverlap> event_overlaps;
};
struct RecordingTimelineResult {
    std::vector<RecordingTimelineItem> items,unplaced_items;
    std::size_t total{0},unplaced_total{0};
    bool v2_projection{false};
};
} // namespace recording
