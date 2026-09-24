#pragma once
// B 저장 형식의 독립 준비 도구. 기존 recording journal과 자동 연결하지 않는다.
#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace recording {
struct RecordingGenerationFile {
    std::string name;
    std::uint64_t size{0};
    std::string sha256;
};
struct RecordingGenerationManifest {
    std::string store_id;
    // 배타적 경계: snapshot/identity에는 < cut_ordinal, active delta에는 >= cut_ordinal.
    std::uint64_t generation{0}, cut_ordinal{0};
    RecordingGenerationFile snapshot, active;
    std::vector<RecordingGenerationFile> evidence;
};
enum class RecordingGenerationPublishResult { NotPublished, Published, DurabilityUncertain };
enum class RecordingGenerationValidation { PrefixOnly };
struct RecordingGenerationReadResult {
    RecordingGenerationManifest manifest;
    std::uint64_t active_tail_bytes{0};
    RecordingGenerationValidation validation{RecordingGenerationValidation::PrefixOnly};
};
// 한 manifest 64KiB, descriptor 크기 1GiB, evidence 64개. active tail 상한/GC 정책은 아니다.
bool SerializeRecordingGenerationManifest(const RecordingGenerationManifest&, std::string*, std::string* error);
bool ParseRecordingGenerationManifest(const std::string&, RecordingGenerationManifest*, std::string* error);
// 호출자는 managed root의 독점 lease를 보유하고 구성 파일 쓰기를 정지해야 한다.
// 게시 전 이전/새 active tail의 완결성과 snapshot 의미 동등성을 별도로 검증해야 한다.
// 내부 flock은 이 helper 사용자 사이의 publisher/read 충돌만 막는다.
// active descriptor는 확정 prefix의 크기/SHA다. 뒤 append bytes는 허용하지만 검증하지 않는다.
// Read 결과는 PrefixOnly다. B-04의 active tail strict mutation 검증과 catalog 의미 검증 전
// 사용 가능한 catalog로 공개하면 안 된다.
RecordingGenerationPublishResult PublishRecordingGenerationManifest(
    const std::filesystem::path& root, const RecordingGenerationManifest&, std::string* error);
bool ReadRecordingGenerationManifest(const std::filesystem::path& root,
    RecordingGenerationReadResult*, std::string* error);
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
void RecordingGenerationFailNextDirectorySyncForTest();
#endif
// DurabilityUncertain은 rename 후 directory fsync 또는 재결박 실패다.
// 호출자는 쓰기를 차단하고 재open해야 하며 이전 manifest 보존을 가정하지 않는다.
}  // namespace recording
