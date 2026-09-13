// 파일 용도: 녹화 catalog의 영속 순서와 분리된 운영 timeline 조회 계약.
#pragma once

#include "recording/recording_catalog.h"
#include <memory>
#include <limits>

namespace recording {

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
struct ConsumerReferenceLocation {
    RecordingOriginalCandidate original;
    RecordingLocationResult location;
    std::string reason;
};
struct ConsumerReferenceResolution {
    std::vector<ConsumerReferenceLocation> exact;
    std::vector<RecordingOriginalCandidate> unindexed;
    std::string reason;
};
// 호출자가 이미 확인한 미디어 구간만 입력한다. association 점/UTC 요청이나 playable 증명이 아니다.
struct ConfirmedMediaInterval {
    std::string source_id, store_id, media_epoch_id, segment_id;
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    std::int64_t start_pts{0}, end_pts{0};
};
std::optional<ConfirmedMediaInterval> IntersectConfirmedMediaIntervals(
    const ConfirmedMediaInterval&, const ConfirmedMediaInterval&);

// Confirmed는 최소 한 후보의 미디어 구간 coverage가 확인됨을 뜻한다(UTC는 known 후보).
// 다른 불확실 후보·unplaced를 포함한 전체 완전성, 후보 유일성·프레임 고유성·재생 가능성은 아니다.
enum class RecordingRangeCoverage { Confirmed, Unknown, Gap };
struct RecordingRangeCandidate {
    std::string store_id, segment_id, media_epoch_id;
    std::int64_t order_sequence{0};
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    RecordingUtcMappingV1 mapping;
    std::optional<std::int64_t> media_start_pts, media_end_pts;
    std::string reason;
};
struct RecordingRangeSlice {
    // ResolveMediaRange에서는 PTS, ResolveUtcRange에서는 UTC ns인 query 축 좌표다.
    std::int64_t start{0}, end{0};
    RecordingRangeCoverage coverage{RecordingRangeCoverage::Gap};
    std::vector<RecordingRangeCandidate> candidates;
};
struct RecordingRangeResult {
    std::vector<RecordingRangeSlice> slices;
    // UTC 위치가 불명확한 mapping을 UTC축에 임의로 배치하지 않는다.
    std::vector<RecordingRangeCandidate> unplaced;
    bool deleted{false};
};
// 동일 잠금에서 취득한 원본 집합의 순수 UTC 조회. 파일 건강도 증명이 아니다.
bool ResolveUtcRangeFromSnapshot(const RecordingLocationCatalogSnapshot&,std::int64_t start,
    std::int64_t end,RecordingRangeResult*,std::string* error,
    std::size_t max_candidates=std::numeric_limits<std::size_t>::max());

class RecordingReadService {
public:
    explicit RecordingReadService(RecordingCatalog& catalog,
                                  std::filesystem::path event_root = {})
        : catalog_(catalog), event_root_(std::move(event_root)) {}
    bool QueryTimeline(const RecordingTimelineQuery& query,
                       RecordingTimelineResult* result, std::string* error) const;
    bool ResolveConsumerReference(const RecordingConsumerReferenceV1&, ConsumerReferenceResolution*, std::string*) const;
    bool ResolveMediaLocation(const std::string& channel_id, const std::string& segment_id,
                              std::int64_t pts, RecordingLocationResult* result, std::string* error) const;
    bool ResolveUtcLocations(const std::string& channel_id, std::int64_t utc_ns,
                             RecordingLocationResult* result, std::string* error) const;
    bool ResolveMediaRange(const std::string& channel_id, const std::string& segment_id,
                           std::int64_t start_pts, std::int64_t end_pts,
                           RecordingRangeResult* result, std::string* error) const;
    bool ResolveUtcRange(const std::string& channel_id, std::int64_t start_ns, std::int64_t end_ns,
                         RecordingRangeResult* result, std::string* error) const;
    std::unique_ptr<ResolvedRecordingMedia> ResolveMedia(
        const std::string& channel_id, const std::string& segment_id) const;
private:
    RecordingCatalog& catalog_;
    bool FinishTimelineV2(const RecordingTimelineQuery&,RecordingTimelineResult*,std::string*) const;
    std::filesystem::path event_root_;
};

}  // namespace recording
