// 파일 용도: 녹화 catalog의 영속 순서와 분리된 운영 timeline 조회 계약.
#pragma once

#include "recording/recording_catalog.h"
#include "recording/recording_query_values.h"
#include "recording/recording_media_inspector.h"
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

std::optional<ConfirmedMediaInterval> IntersectConfirmedMediaIntervals(
    const ConfirmedMediaInterval&, const ConfirmedMediaInterval&);
// 동일 잠금에서 취득한 원본 집합의 순수 UTC 조회. 파일 건강도 증명이 아니다.
bool ResolveUtcRangeFromSnapshot(const RecordingLocationCatalogSnapshot&,std::int64_t start,
    std::int64_t end,RecordingRangeResult*,std::string* error,
    std::size_t max_candidates=std::numeric_limits<std::size_t>::max());

class RecordingReadService {
public:
    explicit RecordingReadService(RecordingCatalog& catalog,
                                  std::filesystem::path event_root = {})
        : catalog_(catalog), event_root_(std::move(event_root)) {}
    // 내부 opt-in 계측의 구현 헤더는 녹화 모듈 안에 둔다. 공개 응답/검색 판정과 독립적이다.
    static std::uint64_t TracePreparationStarted() noexcept;
    static void TracePreparationCompleted(const char* reference,std::uint64_t started,
        std::uint64_t prepared,std::uint64_t reused,std::uint64_t peak_bytes) noexcept;
    bool QueryTimeline(const RecordingTimelineQuery& query,
                       RecordingTimelineResult* result, std::string* error) const;
    // 검색 전용 전체 projection. 기존 공개 timeline의 1,000개 page 계약은 유지한다.
    bool QuerySearchTimeline(const std::string& channel_id, std::int64_t start_ms, std::int64_t end_ms,
        RecordingTimelineResult*, std::string* error) const;
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
        const std::string& channel_id, const std::string& segment_id, MediaInspectionOptions options = {}) const;
private:
    friend class RecordingSearchReader;
    bool RevalidateHeldMediaV2(const ResolvedRecordingMedia&,const RecordingSegmentV2&,
        const std::pair<std::filesystem::path,std::filesystem::path>&) const;
    // 검색 재생 후보만 소비한다. 공개 전체 timeline과 별도로 연속 녹화 행 생성을 생략한다.
    bool QuerySearchEventTimeline(const std::string&, std::int64_t, std::int64_t,
        RecordingTimelineResult*, std::string*) const;
    bool QueryTimelineImpl(const RecordingTimelineQuery&, RecordingTimelineResult*, std::string*,
        std::size_t max_limit, bool event_candidates_only = false) const;
    RecordingCatalog& catalog_;
    bool FinishTimelineV2(const RecordingTimelineQuery&,RecordingTimelineResult*,std::string*) const;
    bool FinishTimelineWithContext(const RecordingTimelineQuery&,RecordingTimelineResult*,std::string*,RecordingCatalog::JobReadContext*) const;
    std::unique_ptr<ResolvedRecordingMedia> ResolveMediaWithContext(const std::string&,const std::string&,RecordingCatalog::JobReadContext*, MediaInspectionOptions options = {}) const;
    std::filesystem::path event_root_;
};

}  // namespace recording
