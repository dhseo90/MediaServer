// S07 시간 사본의 불변성·되감기·epoch 모호성 검증.
#include "recording/recording_time_snapshot.h"
#include <iostream>
int main() {
    int failures = 0;
    const auto check = [&](bool value, const char* name) {
        std::cout << (value ? "[pass] " : "[fail] ") << name << '\n';
        failures += !value;
    };
    recording::RecordingTimeSnapshotPublisher publisher;
    check(!publisher.Get(), "입력 전 위치 없음");
    publisher.Publish("channel", "epoch", 100, 2000);
    auto first = publisher.Get();
    check(first && first->first_pts == 100 && first->last_pts == 100 &&
          first->anchor_utc_ms == 2000, "수락 packet anchor");
    publisher.Publish("channel", "epoch", 200, 2100);
    auto next = publisher.Get();
    check(next && next->first_pts == 100 && next->last_pts == 200 &&
          next->anchor_utc_ms == 2000, "동일 epoch 범위 확장");
    check(first && first->last_pts == 100, "캡처된 사본 불변");
    check(next && next->Contains(100) && next->Contains(200) && !next->Contains(150),
          "accepted-pts-exact-membership");
    publisher.Publish("channel", "epoch", 50, 2200);
    check(!publisher.Get(), "PTS 되감기 차단");
    publisher.Publish("channel", "epoch", 300, 2300);
    check(!publisher.Get(), "모호성 이후 추정 복원 금지");
    recording::RecordingTimeSnapshotPublisher changed;
    changed.Publish("channel", "epoch", 100, 2000);
    changed.Publish("channel", "epoch2", 200, 2100);
    check(!changed.Get(), "epoch 변경 차단");
    recording::RecordingTimeSnapshotPublisher stopped;
    stopped.Publish("channel", "epoch", 100, 2000);
    stopped.Invalidate();
    check(!stopped.Get(), "종료 사본 차단");
    recording::RecordingTimeSnapshotPublisher bounded;
    for (int i = 0; i < 300; ++i) bounded.Publish("channel", "epoch", i, 2000 + i);
    const auto recent = bounded.Get();
    check(recent && !recent->Contains(0) && recent->Contains(299), "accepted-pts-history-bound");
    return failures ? 1 : 0;
}
