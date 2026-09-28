// 파일 용도: 녹화 생산자와 HTTP가 시작되기 전에 수행하는 동기 복구. 새 보존 삭제를 계획하지 않는다.
#pragma once
#include "recording/recording_finalize_recovery.h"
#include "recording/recording_media_inspector.h"
#include <cstdint>
namespace recording {
class RetentionCoordinator;
struct RecordingStartupRecoveryReport {
    std::size_t deletions_completed{0};
    FinalizeRecoveryReport ready;
    std::size_t inspected{0}, healthy{0}, corrupt{0};
    std::string failed_stage;
};
bool RecoverRecordingMetadataAtStartup(RecordingCatalog&,RetentionCoordinator&,const std::filesystem::path&,
    std::int64_t,RecordingStartupRecoveryReport*,std::string*);
bool InspectFinalizedRecordingAtStartup(RecordingCatalog&,RecordingStartupRecoveryReport*,std::string*,MediaInspectionOptions = {});
// 단일 startup 소유자가 worker 시작 전에 호출한다. 검사불가/보호된 손상/복구 충돌은 실패다.
bool RecoverRecordingAtStartup(RecordingCatalog &catalog, RetentionCoordinator &retention,
                               const std::filesystem::path &root, std::int64_t now_ms,
                               RecordingStartupRecoveryReport *report, std::string *error,
                               MediaInspectionOptions inspection_options = {});
} // namespace recording
