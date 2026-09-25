#pragma once
#include "recording/recording_generation_manifest.h"
#include "recording/recording_journal.h"

namespace recording {
struct RecordingGenerationActiveRow {
    RecordingMutationV1 mutation;
    std::uint64_t global_ordinal{0}, offset{0}, length{0};
    // LF를 포함한 정확한 물리 행의 SHA-256이다. 논리 identity digest가 아니다.
    std::string raw_sha256;
};
struct RecordingGenerationActiveReadResult {
    RecordingGenerationManifest manifest;
    // 읽은 전체 active 파일의 크기/SHA. manifest.active는 확정 prefix descriptor다.
    RecordingGenerationFile active_file;
    std::vector<RecordingGenerationActiveRow> rows;
};
// caller는 호출 전체에 managed 독점 lease와 쓰기 정지를 유지해야 한다.
// prefix는 비어 있거나 LF로 끝나는 완결행 경계여야 한다. prefix를 포함한 active 첫 행부터
// cut_ordinal을 부여한다. caller admission은 전체
// active 물리 bytes의 상한이며 결과 envelope/문자열 객체 overhead의 정확한 RSS 상한이 아니다.
// 완결 canonical envelope와 locator만 검증한다. 과거 evidence 원문, 중복 ID/상태 전이,
// snapshot domain, 제품 Open/Append/Checkpoint를 검증/게시하지 않는다.
// manifest 선행 검증은 snapshot/prefix IO 및 helper lock 생성 부작용을 가질 수 있다.
// active 데이터는 수정하지 않는다. 실패하면 output 불변, crypto-off는 unsupported다.
bool ReadRecordingGenerationActive(const std::filesystem::path& root,
    std::uint64_t byte_admission, RecordingGenerationActiveReadResult* output, std::string* error);
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
// active를 모두 읽은 후 최종 경로/FD 결박 직전에 호출되는 일회성 fixture hook.
void RecordingGenerationActiveBeforeBindingForTest(void (*hook)());
#endif
} // namespace recording
