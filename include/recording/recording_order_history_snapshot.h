#pragma once
#include "recording/recording_journal.h"

namespace recording {
struct RecordingOrderHistoryReservation {
    RecordingOrderReservationV1 order;
    std::int64_t occurred_at_ms{0};
};
// OrderHistoryIndex의 영속 자료 후보 DTO다. 제품 Open/원장/manifest와 연결하지 않는다.
// 예약이 없으면 bound_store="", maximum=0이다. ordinary/legacy 집합은 남을 수 있다.
// reservation sequence는 양수·고유이지만 연속일 필요가 없다. timestamp는 int64 전체다.
struct RecordingOrderHistorySnapshot {
    std::string bound_store;
    std::int64_t maximum{0};
    std::vector<RecordingOrderHistoryReservation> reservations;
    std::vector<std::string> ordinary_ids, legacy_segments;
};
// DTO 순서는 무관하다. canonical은 sequence 오름차순과 ID 사전순, 마지막 LF를 사용한다.
// parser는 canonical bytes만 수용하며 실패하면 caller output을 변경하지 않는다.
// 기존 ID 계약 외 새 파일/배열 상한을 추가하지 않는다. 암호 기능은 필요하지 않다.
bool SerializeRecordingOrderHistorySnapshot(const RecordingOrderHistorySnapshot&,
    std::string* output, std::string* error);
bool ParseRecordingOrderHistorySnapshot(const std::string&,
    RecordingOrderHistorySnapshot* output, std::string* error);
// segments 집합은 중복 저장하지 않고 검증된 reservations에서 정렬 재구성한다.
bool RecordingOrderHistorySegments(const RecordingOrderHistorySnapshot&,
    std::vector<std::string>* output, std::string* error);
} // namespace recording
