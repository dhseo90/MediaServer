#pragma once
#include "recording/recording_journal.h"
#include <cstdint>
#include <functional>
#include <string>

namespace recording {
struct RecordingCutoverInputDescriptor {
    std::uint64_t device = 0, inode = 0, size = 0;
    std::string sha256;
};
struct RecordingCutoverInputRow {
    std::uint64_t ordinal = 0, offset = 0, length = 0;
    RecordingMutationV1 mutation;
    std::string canonical_bytes;
};
struct RecordingCutoverInputSummary {
    std::uint64_t source_bytes = 0, rows = 0, blank_lines = 0;
    std::string sha256;
};
using RecordingCutoverInputVisitor =
    std::function<bool(const RecordingCutoverInputRow&, std::string*)>;
// 빌린 FD를 닫거나 위치/내용을 바꾸지 않는다. 경로 결박과 독점 lease는 호출자 책임이다.
// 방문은 부분 성공일 수 있으므로 비공개 scratch에만 적용한다. row 참조는 호출 동안만 유효하다.
// 전체 SHA/최종 FD 검증 성공 때만 summary를 변경한다. Catalog domain/전환 게시 검증은 아니다.
// callback 거부/예외는 입력 원문을 노출하지 않는 고정 오류 분류로 반환한다.
bool VisitRecordingCutoverInput(int fd, const RecordingCutoverInputDescriptor& expected,
    const RecordingCutoverInputVisitor& visitor, RecordingCutoverInputSummary* summary,
    std::string* error);
}
