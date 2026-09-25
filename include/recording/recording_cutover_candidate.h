#pragma once
#include "recording/recording_catalog_generation_projection.h"
#include "recording/recording_cutover_input.h"
#include "recording/recording_generation_files.h"
namespace recording {
struct RecordingCutoverFreshStage {
    std::filesystem::path path;
    std::uint64_t device{0},inode{0};
};
struct RecordingCutoverCandidateLimits {
    std::uint64_t archive_target_bytes{8U*1024U*1024U};
    std::size_t archive_target_rows{4096};
    RecordingIdentityChainLimits chain;
    std::uint64_t snapshot_bytes{0},cold_row_bytes{0};
};
struct RecordingCutoverCreatedFiles {
    std::vector<RecordingGenerationCreatedFile> files;
};
// 비공개 준비 결과의 값이다. 변조 가능한 DTO이므로 게시·원본 소유권의 증명이 아니다.
// 후속 publisher는 별도 freeze에서 원본 descriptor/SHA 및 owner를 다시 검증해야 한다.
struct RecordingCutoverCandidate {
    RecordingCutoverInputSummary source;
    RecordingCatalogSnapshot snapshot;
    RecordingIdentityChainResult chain;
    RecordingCatalogGenerationProjection projection;
};
}
