// 파일 요약: finalized 상시녹화 segment에서 이벤트 clip을 remux하는 port를 선언한다.
// 동작 요약: 요청/실제 UTC 범위와 원본 provenance를 분리하고 video 재인코딩을 금지한다.
#pragma once

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

#include "recording/recording_contracts.h"
#include "recording/recording_finalize_recovery.h"

namespace recording {

struct EventClipSource {
    RecordingSegmentV1 segment;
    std::filesystem::path media_path;
    UtcRangeV1 overlap;
};

struct EventClipDeriveRequest {
    std::string event_id;
    std::string link_id;
    std::string output_segment_id;
    std::string source_id;
    std::string channel_id;
    UtcRangeV1 requested_range;
    std::vector<EventClipSource> sources;
    std::filesystem::path output_root;
    std::string output_epoch_id;
    std::int64_t created_at_ms{0};
    std::optional<EventRecordingLinkV1> ready_link;
    std::uint64_t max_output_bytes{0}; // 0은 standalone remux 호출의 기존 무상한 의미.
};

struct EventClipDeriveResult {
    bool ok{false};
    std::filesystem::path media_path;
    std::filesystem::path partial_path;
    std::filesystem::path cleanup_marker_path;
    // 실패 시 생성 산출물이 모두 제거됐는지 명시한다. false면 lease/reservation을 유지한다.
    bool cleanup_complete{false};
    UtcRangeV1 actual_range;
    std::string container;
    std::vector<std::string> video_codecs;
    std::vector<std::string> audio_codecs;
    std::string audio_omitted_reason;
    std::uint64_t size_bytes{0};
    std::string checksum_sha256;
    std::string error;
    std::optional<FinalizeReadyTicket> ready_ticket;
};

RecordingSegmentV1 BuildEventClipSegment(const EventClipDeriveRequest& request,
                                       const EventClipDeriveResult& result);

class EventClipDeriver {
public:
    virtual ~EventClipDeriver() = default;
    virtual EventClipDeriveResult Derive(const EventClipDeriveRequest& request) = 0;
};

class GStreamerEventClipDeriver final : public EventClipDeriver {
public:
    EventClipDeriveResult Derive(const EventClipDeriveRequest& request) override;
};

}  // namespace recording
