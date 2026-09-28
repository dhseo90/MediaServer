// 파일 용도: 녹화 세대 파일의 입력 source와 생성 결과 계약을 선언한다.
#pragma once
#include "recording/recording_generation_manifest.h"
#include <string_view>

namespace recording {
struct RecordingGenerationSource {
    int fd{-1};                         // 빌린 FD: close/seek/write하지 않는다.
    std::string source_name;             // 같은 root 안의 단일 basename.
    std::uint64_t expected_size{0};
    std::string expected_sha256;
};
struct RecordingGenerationCreatedFile {
    std::string name;
    bool created{false};
    bool complete{false};
    std::uint64_t device{0}, inode{0}, size{0};
};
struct RecordingGenerationPreparation {
    bool ready{false};
    RecordingGenerationManifest manifest;
    std::vector<RecordingGenerationCreatedFile> files;
};
// 기존 managed lease를 호출 전체와 이후 Publish까지 보유해야 한다. 원본 FD와
// snapshot bytes는 호출 중 불변이며 엄격한 의미 검증을 이미 통과했다는 호출자 계약이다.
// 이 도구는 의미 검증을 대신하지 않고 크기/SHA/원본 inode/내구 기록만 검증한다.
// evidence 목록은 이번 세대에 새로 준비한 자료만 뜻한다. 이전 manifest/archive를
// 열거하거나 복사하지 않는다. 이전 세대 증거의 참조 폐쇄는 후속 통합의 책임이다.
// snapshot/evidence는 O_EXCL 고정 이름, active는 빈 파일로 생성한다.
// 성공/실패 모두 생성 파일을 자동 삭제하지 않는다. files는 cleanup 소유권 보고이며
// ready=false이면 manifest를 게시하면 안 된다. 충돌·중단 잔여물도 덮어쓰지 않는다.
bool PrepareRecordingGenerationFiles(const std::filesystem::path& root,
    const std::string& store_id, std::uint64_t generation, std::uint64_t cut_ordinal,
    std::string_view snapshot, const std::vector<RecordingGenerationSource>& sources,
    RecordingGenerationPreparation* result, std::string* error);
// 회전 시 새 최소 identity 조각만 O_EXCL로 기록한다. 과거 원문을 읽거나 복사하지 않는다.
bool PrepareRecordingGenerationIdentityFile(const std::filesystem::path&,std::uint64_t generation,
    std::string_view,RecordingGenerationCreatedFile*,std::string* error);

// 이 API는 Publish를 호출하지 않는다. 준비 완료 뒤 B-04의 snapshot 의미/참조·tail
// 검증을 통과한 소유자가 별도로 PublishRecordingGenerationManifest를 호출해야 한다.
} // namespace recording
