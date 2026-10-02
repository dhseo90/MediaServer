// 파일 용도: 검색 결과의 bounded 불변 페이지와 사용자/권한/질의 결박 cursor.
#pragma once
#include "recording/recording_search_model.h"
#include <array>
#include <chrono>
#include <deque>
#include <mutex>

namespace recording {
struct SearchSnapshotLimits {
    std::size_t max_snapshots{8}, max_bytes{128*1024*1024};
    std::chrono::milliseconds lifetime{std::chrono::minutes(5)};
};
struct RecordingSearchPage {
    std::shared_ptr<const RecordingSearchModel> model;
    std::vector<std::size_t> positions;
    std::size_t known_count{0}, unplaced_count{0};
    std::string snapshot_id, next_cursor;
};
class RecordingSearchSnapshots {
public:
    using Clock=std::chrono::steady_clock;
    explicit RecordingSearchSnapshots(SearchSnapshotLimits limits = {});
    // caller는 매 호출마다 현재 사용자와 요청 채널 전체 권한을 먼저 검사한다.
    bool Begin(std::shared_ptr<const RecordingSearchModel>, const RecordingSearchQuery&,
        const std::string& principal, const std::string& scope,
        RecordingSearchPage*, std::string* error, Clock::time_point now=Clock::now());
    bool Resume(const std::string& cursor, const RecordingSearchQuery&,
        const std::string& principal, const std::string& scope,
        RecordingSearchPage*, std::string* error, Clock::time_point now=Clock::now());
private:
    struct Entry {
        std::shared_ptr<const RecordingSearchModel> model;
        RecordingSearchMatches matches;
        std::string id, query_hash, principal, scope;
        std::size_t limit{0}, bytes{0};
        Clock::time_point expires;
    };
    bool Page(const Entry&, std::size_t offset, RecordingSearchPage*, std::string*) const;
    bool Mac(const std::string&, std::string*) const;
    void Expire(Clock::time_point);
    SearchSnapshotLimits limits_;
    std::array<unsigned char,32> secret_{};
    bool ready_{false};
    std::mutex mutex_;
    std::deque<Entry> entries_;
    std::size_t bytes_{0};
};
} // namespace recording
