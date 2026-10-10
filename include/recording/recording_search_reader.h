// 파일 용도: 카탈로그 snapshot을 검색 모델로 연결하고 잠금 밖에서 원본 참조를 해석한다.
#pragma once
#include "recording/recording_read_service.h"
#include "recording/recording_search_source.h"
#include "recording/recording_search_precedence.h"

namespace recording {
struct SearchSeekTarget {
    double seconds{0}, frame_duration_seconds{0};
    std::uint64_t sample_ordinal{0};
    std::string basis;
};
class RecordingSearchReader {
public:
    RecordingSearchReader(RecordingCatalog& catalog, RecordingReadService& reader)
        : catalog_(catalog), reader_(reader) {}
    // 호출자는 channels 전체를 권한 검사한 뒤 호출한다. 실패 시 output과 previous는 불변이다.
    bool Refresh(const std::vector<std::string>& channels,
                 const std::shared_ptr<const RecordingSearchModel>& previous,
                 std::shared_ptr<const RecordingSearchModel>* output,
                 std::string* error, SearchModelLimits limits = {}, bool include_observations = true) const;
    bool WithPlayback(const RecordingSearchModel&, const RecordingSearchQuery&,
        std::shared_ptr<const RecordingSearchModel>*, std::string* error, SearchModelLimits limits = {}) const;
    bool DerivedSeek(const std::string& channel, const std::string& job,
        const std::string& original_segment, const std::string& output_segment,
        std::int64_t original_ns, SearchSeekTarget*, std::string* error) const;
    bool SourceSeek(const std::string& channel, const std::string& segment,
        std::int64_t media_pts, std::int32_t time_base_num, std::int32_t time_base_den,
        SearchSeekTarget*, std::string* error, const ResolvedRecordingMedia* verified_media = nullptr,
        const std::function<bool()>& cancelled = {},
        std::chrono::steady_clock::time_point deadline = std::chrono::steady_clock::time_point::max()) const;
    // 전체 물리/native 검증에 성공한 요청 내 증명이다. 외부에서 미검증 객체를 만들 수 없다.
    class PreparedSource {
    public:
        ~PreparedSource();
        PreparedSource(const PreparedSource&)=delete;
        PreparedSource& operator=(const PreparedSource&)=delete;
        bool Matches(const std::string& channel,const std::string& segment,const std::string& media_sha256) const;
        bool MatchesFrame(std::int64_t pts,const std::string& sha256) const;
        std::size_t retained_bytes() const;
        std::shared_ptr<const ResolvedRecordingMedia> Hold() const;
    private:
        friend class RecordingSearchReader;
        struct Impl;
        explicit PreparedSource(std::unique_ptr<Impl>);
        std::unique_ptr<Impl> impl_;
    };
    std::unique_ptr<PreparedSource> PrepareSource(const std::string& channel,const std::string& segment,
        std::string* error,const std::function<bool()>& cancelled = {},
        std::chrono::steady_clock::time_point deadline = std::chrono::steady_clock::time_point::max()) const;
    bool SourceSeekPrepared(const PreparedSource&,std::int64_t media_pts,std::int32_t time_base_num,
        std::int32_t time_base_den,SearchSeekTarget*,std::string* error,
        const std::function<bool()>& cancelled = {},
        std::chrono::steady_clock::time_point deadline = std::chrono::steady_clock::time_point::max()) const;
    bool PlaybackCandidates(const RecordingSearchModel&, const RecordingSearchQuery&,
        std::vector<SearchPlaybackCandidate>*, std::string* error) const;
    // 새 검색마다 호출한다. 카탈로그 revision과 별개인 이벤트 사실을 재사용하지 않는다.
    static bool WithEventFacts(const RecordingSearchModel& source,
        std::shared_ptr<const RecordingSearchModel>* output, std::string* error,
        SearchModelLimits limits = {}, const RecordingSearchQuery* query = nullptr);
private:
    RecordingCatalog& catalog_;
    RecordingReadService& reader_;
};
} // namespace recording
