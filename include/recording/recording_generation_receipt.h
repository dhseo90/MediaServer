#pragma once
#include "recording/recording_generation_manifest.h"
#include <optional>

namespace recording {
enum class RecordingGenerationOperation { Cutover, Checkpoint };
enum class RecordingGenerationPhase { Prepared, PublishIntent };
struct RecordingGenerationOwnedFile {
    RecordingGenerationFile file;
    std::uint64_t device{0}, inode{0};
};
// 저장된 값은 권위 증명이 아니다. caller가 실제 lease/FD/hash/domain을 다시 확인해야 한다.
// source는 원문 journal/봉인할 active 전체이며 1GiB 구성 파일 상한과 혼동하지 않는다.
struct RecordingGenerationReceipt {
    RecordingGenerationOperation operation{RecordingGenerationOperation::Cutover};
    RecordingGenerationPhase phase{RecordingGenerationPhase::Prepared};
    std::uint64_t root_device{0},root_inode{0},stage_device{0},stage_inode{0};
    std::string stage_name;
    RecordingGenerationOwnedFile marker,source;
    // cutover만: stage의 .recording-marker-v2 inode는 rename 뒤 실제 marker와 같아야 한다.
    std::optional<RecordingGenerationOwnedFile> replacement_marker;
    // checkpoint만: 이전 manifest의 bytes와 파일 identity를 함께 결박한다.
    std::optional<RecordingGenerationOwnedFile> predecessor_file;
    // 새 checkpoint만: 회수할 정확한 이전 snapshot. 부재인 구형 receipt는 회수 권한이 없다.
    std::optional<RecordingGenerationOwnedFile> predecessor_snapshot;
    std::optional<RecordingGenerationManifest> predecessor;
    RecordingGenerationManifest target;
    // 정렬된 새 파일 목록. 구형 원본·이전 archive·marker·manifest를 포함하면 안 된다.
    std::vector<RecordingGenerationOwnedFile> created;
};
// 값 검사/직렬화만 수행한다. 파일·lease·삭제·게시·재기동 조치는 하지 않는다.
// created 총 개수의 고정 형식 상한은 없다. 파싱 전 caller byte admission을 적용한다.
bool SerializeRecordingGenerationReceipt(const RecordingGenerationReceipt&,std::string*,std::string* error);
bool ParseRecordingGenerationReceipt(const std::string&,std::uint64_t byte_admission,
    RecordingGenerationReceipt*,std::string* error);
}
