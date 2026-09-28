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

struct RecordingUtcMappingV1 {
    std::string schema{"media-server.recording-utc-mapping.v1"};
    std::string mapping_id;
    std::int64_t start_pts{0};
    std::optional<std::int64_t> end_pts;
    std::string provenance;
    std::optional<std::int64_t> utc_start_ns, utc_end_ns, uncertainty_ns;
    std::string reason;
};

struct RecordingSegmentV2 {
    std::string schema{"media-server.recording-segment.v2"};
    std::string segment_id, source_id, channel_id, store_id, order_request_id, media_epoch_id;
    std::int64_t order_sequence{0}, media_start_pts{0};
    std::optional<std::int64_t> media_end_pts;
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    std::string container;
    std::vector<std::string> video_codecs, audio_codecs;
    std::string audio_omitted_reason;
    std::uint64_t size_bytes{0};
    std::string checksum_sha256;
    RecordingRetentionClass retention_class{RecordingRetentionClass::Continuous};
    RecordingLifecycle lifecycle{RecordingLifecycle::Finalized};
    bool pinned{false};
    std::int64_t created_at_ms{0}, finalized_at_ms{0};
    std::vector<RecordingUtcMappingV1> mappings;
};
bool ValidateRecordingSegmentV2(const RecordingSegmentV2& value, std::string* error);
std::string SerializeRecordingSegmentV2(const RecordingSegmentV2& value);
bool ParseRecordingSegmentV2(const std::string& json, RecordingSegmentV2* value, std::string* error);

struct RecordingSourceSampleV1 {
    std::uint64_t ordinal{0}, pts_ns{0};
};
// file_evidence v1 sample tuple 순서. -1 original_duration만 원본 duration 부재를 뜻한다.
// native 숫자는 track ticks; source identity PTS와 mapped file 표시 시각은 별개다.
struct RecordingFileSampleEvidenceV1 {
    std::uint64_t ordinal{0};
    std::int64_t original_pts_ns{0}, original_dts_ns{0}, original_duration_ns{-1};
    std::int64_t mux_pts_ns{0}, mux_dts_ns{0}, mux_duration_ns{0};
    std::int64_t native_pts{0}, native_dts{0}, native_duration{0};
    std::string vcl_sha256, sample_sha256;
};
struct RecordingFileEvidenceV1 {
    std::uint32_t version{1};
    std::string profile{"gst-qtmux-1.28.1-default-v1"};
    std::int64_t writer_origin_ns{0};
    std::uint64_t file_size_bytes{0};
    std::string file_sha256;
    std::uint32_t timescale{0}, movie_timescale{0};
    std::int64_t edit_duration{0}, edit_media_time{0};
    std::vector<RecordingFileSampleEvidenceV1> samples;
};
// appsrc 수락 연관이며 출력 decoded frame의 고유성·존재 증명이 아니다.
struct RecordingSourceBindingV1 {
    std::string schema{"media-server.recording-source-binding.v1"};
    std::string segment_id, source_id, channel_id, store_id, media_epoch_id;
    std::string source_generation;
    std::uint64_t generation_order{0};
    std::string track_id;
    std::vector<RecordingSourceSampleV1> samples;
    bool index_complete{true};
    std::uint64_t last_accepted_ordinal{0};
    std::string incomplete_reason;
    std::optional<RecordingFileEvidenceV1> file_evidence{};
};
bool ValidateRecordingFileEvidence(const RecordingSourceBindingV1&, std::string* error);
bool ValidateRecordingSourceBindingV1(const RecordingSourceBindingV1&, std::string* error);
bool ValidateRecordingSourceBindingForSegment(const RecordingSourceBindingV1&, const RecordingSegmentV2&, std::string* error);
std::string SerializeRecordingSourceBindingV1(const RecordingSourceBindingV1&);
bool ParseRecordingSourceBindingV1(const std::string&, RecordingSourceBindingV1*, std::string* error);

struct RecordingTombstoneV2 {
    std::string schema{"media-server.recording-tombstone.v2"};
    std::string tombstone_id;
    RecordingSegmentV2 segment;
    std::string deletion_reason;
    std::int64_t deleted_at_ms{0};
};
struct RecordingSegmentStateV2 {
    std::string schema{"media-server.recording-segment-state.v2"};
    std::string segment_id;
    RecordingLifecycle lifecycle{RecordingLifecycle::Unknown};
    std::string reason;
};
std::string SerializeRecordingTombstoneV2(const RecordingTombstoneV2& value);
bool ParseRecordingTombstoneV2(const std::string& json, RecordingTombstoneV2* value, std::string* error);
std::string SerializeRecordingSegmentStateV2(const RecordingSegmentStateV2& value);
bool ParseRecordingSegmentStateV2(const std::string& json, RecordingSegmentStateV2* value, std::string* error);

// 원본 연관/요청 사실만 저장한다. 후보나 재생 가능 상태는 포함하지 않는다.
struct RecordingConsumerOriginalV1 {
    std::string source_generation;
    std::uint64_t generation_order{0}, ordinal{0};
    std::string track_id;
    std::uint64_t pts_ns{0};
};
struct RecordingConsumerRequestV1 {
    std::string time_basis;
    std::int64_t start_ms{0}, end_ms{0}, pre_ms{0}, post_ms{0};
};
struct RecordingConsumerReferenceV1 {
    std::string schema{"media-server.recording-consumer-reference.v1"};
    std::string reference_id, kind, owner_id, source_id, channel_id;
    std::string analysis_namespace, analysis_track_id;
    std::int64_t analysis_pts{0};
    std::string association_quality;
    std::optional<RecordingConsumerOriginalV1> original;
    std::optional<RecordingConsumerRequestV1> request;
    std::int64_t created_at_ms{0};
};
bool ValidateRecordingConsumerReferenceV1(const RecordingConsumerReferenceV1&, std::string*);
std::string SerializeRecordingConsumerReferenceV1(const RecordingConsumerReferenceV1&);
bool ParseRecordingConsumerReferenceV1(const std::string&, RecordingConsumerReferenceV1*, std::string*);

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

// V1 locator 필수 계약과 분리된 검색 관측 envelope. 원본 PTS는 locator가 없어도 보존한다.
struct AnalysisObservationV2 {
    std::string schema{"media-server.analysis-observation.v2"};
    std::string observation_id;
    std::string source_id;
    std::string channel_id;
    std::string analysis_namespace;
    std::string stream_epoch_id;
    std::int64_t pts{0};
    std::optional<FrameLocatorV1> frame_locator;
    std::string locator_reason{"unresolved"};
    std::string track_id;
    std::string class_label;
    double confidence{0.0};
    NormalizedBoundingBoxV1 bbox;
    std::vector<std::string> selection_reasons;
    std::vector<std::string> event_ids;
    std::vector<std::string> zone_ids;
    std::vector<std::string> line_ids;
    std::vector<std::string> rule_ids;
    std::vector<std::string> scenario_ids;
    std::int64_t first_seen_pts{0};
    std::int64_t last_seen_pts{0};
    std::optional<std::int64_t> duration_ns;
    std::string ended_reason;
    std::int64_t created_at_ms{0};
};

struct ReferencedObservationV1 {
    std::string schema{"media-server.referenced-observation.v1"};
    AnalysisObservationV2 observation;
    RecordingConsumerReferenceV1 reference;
};
bool ValidateReferencedObservationV1(const ReferencedObservationV1&, std::string*);
std::string SerializeReferencedObservationV1(const ReferencedObservationV1&);
bool ParseReferencedObservationV1(const std::string&, ReferencedObservationV1*, std::string*);

std::string SerializeAnalysisObservationV2(const AnalysisObservationV2& value);
bool ParseAnalysisObservationV2(const std::string& json, AnalysisObservationV2* value,
                                std::string* error);

bool ValidateOpaqueId(const std::string& value, std::string* error);
// V2 source/channel 참조: opaque의 길이·문자·경로 제한을 유지하되 숫자 원문도 허용한다.
// V1 legacy 참조 검증과 생성 opaque ID 검증은 별도로 유지한다.
bool ValidateRecordingReferenceId(const std::string& value, std::string* error);
// 내부 trusted-journal identity 결속. 파일 서명/미디어 checksum이 아니며 JSON 필드는 추가하지 않는다.
bool IsBoundRecordingFallbackNamespace(const std::string& value);
std::string BoundRecordingFallbackId(const std::string& event_id,
                                     const std::string& link_id,
                                     const std::string& source_id,
                                     const std::string& channel_id,
                                     const std::string& raw_stream_id,
                                     const std::string& raw_channel_id);
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
