#include "recording/recording_startup_recovery.h"
#include "recording/recording_catalog.h"
#include "recording/retention_coordinator.h"
namespace recording {
bool RecoverRecordingAtStartup(RecordingCatalog &catalog, RetentionCoordinator &retention,
                               const std::filesystem::path &root, std::int64_t now_ms,
                               RecordingStartupRecoveryReport *report, std::string *error,
                               MediaInspectionOptions inspection_options) {
    RecordingStartupRecoveryReport result;
    const auto fail = [&](const std::string &stage, const std::string &detail) {
        result.failed_stage = stage;
        if (report)
            *report = result;
        if (error)
            *error = detail;
        return false;
    };
    // 오래된 ready 충돌이 이미 내구 접수된 삭제의 수렴을 막지 않는다.
    const auto pending = retention.RecoverPending(now_ms);
    result.deletions_completed = pending.deleted_count;
    if (!pending.ok)
        return fail("pending-deletion", pending.last_error);
    std::string ready_error;
    if (!RecoverFinalizeReadyTickets(catalog, root, &result.ready, &ready_error))
        return fail("finalize-ready", ready_error);
    // 경로 해석에 성공한 자료만 고르면 잘못된 경로가 검사를 우회하므로 metadata로 열거한다.
    for (const auto &segment : catalog.FinalizedSegmentsForStartup()) {
        const auto inspection =
            InspectAndMarkRecordingMedia(catalog, segment.segment_id, inspection_options);
        ++result.inspected;
        if (inspection.state == MediaInspectionState::Unavailable)
            return fail("media-inspection", inspection.detail);
        if (inspection.state == MediaInspectionState::Healthy) {
            ++result.healthy;
        } else {
            if (!inspection.applied)
                return fail("corruption-apply", inspection.apply_error);
            ++result.corrupt;
        }
    }
    if (report)
        *report = result;
    if (error)
        error->clear();
    return true;
}
} // namespace recording
