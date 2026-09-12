// 파일 용도: 녹화 catalog의 영속 순서와 분리된 운영 timeline 조회 계약.
#pragma once

#include "recording/recording_catalog.h"
#include <memory>

namespace recording {

struct RecordingTimelineQuery {
    std::string channel_id;
    std::int64_t start_ms{0};
    std::int64_t end_ms{0};
    std::size_t offset{0};
    std::size_t limit{100};
};

struct RecordingTimelineItem {
    std::string segment_id;
    std::string channel_id;
    std::string kind;
    int display_priority{0};
    std::int64_t start_ms{0};
    std::int64_t end_ms{0};
    std::string event_id;
    std::string completeness;
    bool playable{false};
    std::string playback_url;
    std::string content_type;
    std::vector<std::string> superseded_by_event_ids;
    std::optional<UtcRangeV1> requested_range;
    std::optional<UtcRangeV1> actual_range;
    std::string range_basis{"segment"};
};

struct RecordingTimelineResult {
    std::vector<RecordingTimelineItem> items;
    std::size_t total{0};
};

// 소멸 순서: media fd close 후 catalog hold 해제. catalog는 이 객체보다 오래 살아야 한다.
class ResolvedRecordingMedia {
public:
    ~ResolvedRecordingMedia();
    ResolvedRecordingMedia(const ResolvedRecordingMedia&) = delete;
    ResolvedRecordingMedia& operator=(const ResolvedRecordingMedia&) = delete;
    int fd() const { return fd_; }
    std::uint64_t size_bytes() const { return size_bytes_; }
    const std::string& content_type() const { return content_type_; }
private:
    friend class RecordingReadService;
    ResolvedRecordingMedia() = default;
    int fd_{-1};
    RecordingCatalog* catalog_{nullptr};
    std::string segment_id_;
    std::uint64_t size_bytes_{0};
    std::string content_type_;
};

enum class RecordingLocationState { Single, Multiple, Unknown, None, Deleted };
// 내부 메타데이터 위치: 프레임 고유성이나 파일 재생 가능 여부의 증명이 아니다.
struct RecordingLocationCandidate {
    std::string store_id, segment_id, media_epoch_id;
    std::int64_t order_sequence{0}, media_pts{0};
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    std::optional<RecordingUtcMappingV1> mapping;
};
struct RecordingLocationResult {
    RecordingLocationState state{RecordingLocationState::None};
    std::vector<RecordingLocationCandidate> candidates;
    bool has_unknown{false};
};

class RecordingReadService {
public:
    explicit RecordingReadService(RecordingCatalog& catalog,
                                  std::filesystem::path event_root = {})
        : catalog_(catalog), event_root_(std::move(event_root)) {}
    bool QueryTimeline(const RecordingTimelineQuery& query,
                       RecordingTimelineResult* result, std::string* error) const;
    bool ResolveMediaLocation(const std::string& channel_id, const std::string& segment_id,
                              std::int64_t pts, RecordingLocationResult* result, std::string* error) const;
    bool ResolveUtcLocations(const std::string& channel_id, std::int64_t utc_ns,
                             RecordingLocationResult* result, std::string* error) const;
    std::unique_ptr<ResolvedRecordingMedia> ResolveMedia(
        const std::string& channel_id, const std::string& segment_id) const;
private:
    RecordingCatalog& catalog_;
    std::filesystem::path event_root_;
};

}  // namespace recording
