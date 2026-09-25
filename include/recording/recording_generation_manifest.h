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
enum class RecordingGenerationValidation { PrefixOnly, OpenComponentsOnly };
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
// 정상 Open의 구성 파일 선검사: manifest·snapshot·active 확정 prefix만 검증한다.
// 과거 evidence 원문은 열지 않으므로 identity chain·active 전체·snapshot 의미 검증 전에는
// 사용 가능한 catalog가 아니다. 내부 lock 파일 생성과 managed root 독점 lease 조건은 위와 같다.
bool ReadRecordingGenerationManifestForOpen(const std::filesystem::path& root,
    RecordingGenerationReadResult*, std::string* error);
// snapshot/identity/evidence 불변 파일의 bytes를 독립 검증해 읽는다. active는 허용하지 않는다.
// 호출자는 immutable 조건과 managed lease를 유지해야 한다. 파일 쓰기/삭제/제품 Open 연결 없음.
// descriptor 1GiB 상한과 caller admission을 읽기 전에 적용하며 실패 output은 불변이다.
bool ReadVerifiedRecordingGenerationImmutable(const std::filesystem::path& root,
    const RecordingGenerationFile&, std::uint64_t byte_admission, std::string* output, std::string* error);
// 전체 파일 SHA를 64KiB 블록으로 검증하되 요청 구간만 보관한다. 비용은 파일 전체 읽기이며
// 메모리는 결과 길이+고정 블록에 비례한다. 빈 구간은 admission=0도 허용하며 전체 검증은 수행한다.
// 구간 자체의 domain 의미나 제품 B Open 검증을 대신하지 않는다.
bool ReadVerifiedRecordingGenerationImmutableRange(const std::filesystem::path& root,
    const RecordingGenerationFile&, std::uint64_t offset, std::uint64_t length,
    std::uint64_t result_admission, std::string* output, std::string* error);
// identity shard가 참조하는 이전 세대 active의 봉인된 전체 길이/SHA를 검증하고
// 지정 구간만 반환한다. caller는 검증된 현재 manifest의 generation과 managed 독점 lease를
// 호출 전체에 유지해야 하며 현재/미래 active는 거부한다. 이 API만으로 manifest나
// identity chain의 신뢰를 만들지 않는다. 실패 시 output 불변이다.
bool ReadVerifiedRecordingGenerationSealedActiveRange(const std::filesystem::path& root,
    const RecordingGenerationFile&, std::uint64_t current_generation,
    std::uint64_t offset, std::uint64_t length, std::uint64_t result_admission,
    std::string* output, std::string* error);
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
void RecordingGenerationFailNextDirectorySyncForTest();
// 실제 파일 읽기 후 최종 결박 검사 직전의 일회성 fixture hook이다.
void RecordingGenerationImmutableBeforeBindingForTest(void (*hook)());
#endif
// DurabilityUncertain은 rename 후 directory fsync 또는 재결박 실패다.
// 호출자는 쓰기를 차단하고 재open해야 하며 이전 manifest 보존을 가정하지 않는다.
}  // namespace recording
