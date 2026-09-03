// 파일 요약: v4.1.0 녹화 기반의 버전 고정 영속 계약을 선언한다.
// 동작 요약: 세그먼트·프레임·이벤트 연결·분석 관측·삭제 표식의 JSONL 호환 경계를 제공한다.
#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace recording {

enum class RecordingRetentionClass { Continuous, Event, Unknown };
enum class RecordingLifecycle { Writing, Finalized, DeletionPending, Deleted, Corrupt, Unknown };
enum class EventRecordingLinkStatus { Pending, Complete, Partial, Failed, Unknown };

struct MediaTimeV1 {
    std::int64_t utc_ms{0};
    std::int64_t pts{0};
    std::int32_t time_base_num{1};
    std::int32_t time_base_den{1000000000};
};

struct UtcRangeV1 {
    std::int64_t start_ms{0};
    std::int64_t end_ms{0};
};

struct RecordingSegmentV1 {
    std::string schema{"media-server.recording-segment.v1"};
    std::string segment_id;
    std::string source_id;
    std::string channel_id;
    std::string stream_epoch_id;
    MediaTimeV1 start;
    MediaTimeV1 end;
    std::string container;
    std::vector<std::string> video_codecs;
    std::vector<std::string> audio_codecs;
    std::string audio_omitted_reason;
    std::uint64_t size_bytes{0};
    std::string checksum_sha256;
    RecordingRetentionClass retention_class{RecordingRetentionClass::Continuous};
    RecordingLifecycle lifecycle{RecordingLifecycle::Writing};
    bool pinned{false};
    std::int64_t created_at_ms{0};
    std::int64_t finalized_at_ms{0};
};

struct FrameLocatorV1 {
    std::string schema{"media-server.frame-locator.v1"};
    std::string segment_id;
    MediaTimeV1 frame;
    std::optional<std::uint64_t> frame_index;
    std::optional<std::int64_t> keyframe_pts;
};

struct SegmentOverlapV1 {
    std::string segment_id;
    UtcRangeV1 range;
};

struct EventRecordingLinkV1 {
    std::string schema{"media-server.event-recording-link.v1"};
    std::string link_id;
    std::string event_id;
    std::string source_id;
    std::string channel_id;
    std::string stream_epoch_id;
    std::optional<UtcRangeV1> requested_range;
    // terminal 자원 정리가 끝난 뒤 처리할 UTC 확장 요청을 같은 journal에 보존한다.
    std::optional<UtcRangeV1> deferred_requested_range;
    // 이미 해석한 UTC 요청과 별도로 아직 segment map이 없는 후속 PTS를 보존한다.
    std::optional<UtcRangeV1> deferred_media_pts_range_ms;
    // UTC anchor가 아직 없는 media PTS는 UTC field에 섞지 않고 별도 보존한다.
    std::optional<UtcRangeV1> media_pts_range_ms;
    std::vector<SegmentOverlapV1> ordered_overlaps;
    std::optional<std::string> derived_segment_id;
    std::optional<std::string> fallback_evidence_id;
    std::optional<std::string> fallback_media_locator;
    std::optional<UtcRangeV1> derived_actual_range;
    std::string derivation_mode;
    std::string time_basis;
    std::string completeness_reason;
    std::vector<UtcRangeV1> missing_ranges;
    EventRecordingLinkStatus status{EventRecordingLinkStatus::Pending};
    std::int64_t created_at_ms{0};
    std::int64_t updated_at_ms{0};
};

struct NormalizedBoundingBoxV1 {
    double x{0.0};
    double y{0.0};
    double width{0.0};
    double height{0.0};
};

struct AnalysisObservationV1 {
    std::string schema{"media-server.analysis-observation.v1"};
    std::string observation_id;
    std::string source_id;
    std::string channel_id;
    FrameLocatorV1 frame_locator;
    std::string track_id;
    std::string class_label;
    double confidence{0.0};
    NormalizedBoundingBoxV1 bbox;
    std::vector<std::string> zone_ids;
    std::vector<std::string> line_ids;
    std::vector<std::string> rule_ids;
    std::vector<std::string> scenario_ids;
    std::vector<std::string> event_ids;
    std::string selection_reason;
    std::int64_t created_at_ms{0};
};

struct RecordingTombstoneV1 {
    std::string schema{"media-server.recording-tombstone.v1"};
    std::string tombstone_id;
    std::string segment_id;
    std::string source_id;
    std::string channel_id;
    UtcRangeV1 recorded_range;
    std::string checksum_sha256;
    RecordingRetentionClass retention_class{RecordingRetentionClass::Unknown};
    std::string deletion_reason;
    std::int64_t deleted_at_ms{0};
};

bool ValidateOpaqueId(const std::string& value, std::string* error);
bool ValidateMediaTime(const MediaTimeV1& value, std::string* error);
bool ValidateRecordingSegmentV1(const RecordingSegmentV1& value, std::string* error);
bool ValidateEventRecordingLinkV1(const EventRecordingLinkV1& value, std::string* error);
bool IsPlayable(RecordingLifecycle lifecycle);
bool HalfOpenRangesOverlap(std::int64_t first_start_ms,
                           std::int64_t first_end_ms,
                           std::int64_t second_start_ms,
                           std::int64_t second_end_ms);
bool CanCreateSegmentId(const std::string& segment_id,
                        const std::vector<RecordingTombstoneV1>& tombstones,
                        std::string* error);

std::string SerializeRecordingSegmentV1(const RecordingSegmentV1& value);
bool ParseRecordingSegmentV1(const std::string& json,
                             RecordingSegmentV1* value,
                             std::string* error);
std::string SerializeFrameLocatorV1(const FrameLocatorV1& value);
bool ParseFrameLocatorV1(const std::string& json, FrameLocatorV1* value, std::string* error);
std::string SerializeEventRecordingLinkV1(const EventRecordingLinkV1& value);
bool ParseEventRecordingLinkV1(const std::string& json,
                               EventRecordingLinkV1* value,
                               std::string* error);
std::string SerializeAnalysisObservationV1(const AnalysisObservationV1& value);
bool ParseAnalysisObservationV1(const std::string& json,
                                AnalysisObservationV1* value,
                                std::string* error);
std::string SerializeRecordingTombstoneV1(const RecordingTombstoneV1& value);
bool ParseRecordingTombstoneV1(const std::string& json,
                               RecordingTombstoneV1* value,
                               std::string* error);

}  // namespace recording
