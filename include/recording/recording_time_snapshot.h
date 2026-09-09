// 녹화가 실제 수락한 시간 범위의 불변 사본. 파일 I/O 잠금을 조회에 전파하지 않는다.
#pragma once
#include <atomic>
#include <algorithm>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace recording {
struct RecordingTimeSnapshot {
    std::string channel_id;
    std::string stream_epoch_id;
    std::int64_t first_pts{0};
    std::int64_t last_pts{0};
    std::int64_t anchor_utc_ms{0};
    // 독립 recorder queue가 누락한 packet을 범위만 보고 수락했다고 추정하지 않는다.
    std::vector<std::int64_t> accepted_pts;
    bool Contains(std::int64_t pts) const {
        return std::binary_search(accepted_pts.begin(), accepted_pts.end(), pts);
    }
};

// Publish/Invalidate는 writer의 단일 직렬 경로에서 호출한다.
class RecordingTimeSnapshotPublisher {
public:
    void Publish(const std::string& channel, const std::string& epoch,
                 std::int64_t pts, std::int64_t utc_ms) {
        if (invalid_) return;
        const auto previous = Get();
        if (channel.empty() || epoch.empty() || pts < 0 || utc_ms <= 0 ||
            (previous && (previous->channel_id != channel ||
                          previous->stream_epoch_id != epoch || pts < previous->last_pts))) {
            Invalidate();
            return;
        }
        auto next = previous ? std::make_shared<RecordingTimeSnapshot>(*previous)
                             : std::make_shared<RecordingTimeSnapshot>(
                                   RecordingTimeSnapshot{channel, epoch, pts, pts, utc_ms, {}});
        next->last_pts = pts;
        if (next->accepted_pts.empty() || next->accepted_pts.back() != pts) {
            if (next->accepted_pts.size() == 256) next->accepted_pts.erase(next->accepted_pts.begin());
            next->accepted_pts.push_back(pts);
        }
        std::atomic_store(&snapshot_, std::shared_ptr<const RecordingTimeSnapshot>(std::move(next)));
    }
    void Invalidate() {
        invalid_ = true;
        std::atomic_store(&snapshot_, std::shared_ptr<const RecordingTimeSnapshot>{});
    }
    std::shared_ptr<const RecordingTimeSnapshot> Get() const {
        return std::atomic_load(&snapshot_);
    }
private:
    bool invalid_{false};
    std::shared_ptr<const RecordingTimeSnapshot> snapshot_;
};
}  // namespace recording
