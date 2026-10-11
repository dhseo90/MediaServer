// 파일 요약: 녹화 영속 구현이 따라야 하는 내부 저장 port를 선언한다.
// 동작 요약: filesystem path는 내부 finalize 인자로만 받고 공개 JSON 계약과 분리한다.
#pragma once

#include "recording/recording_contracts.h"

#include <cstdint>
#include <string>
#include <vector>

namespace recording {

// Protected is a pre-mutation rejection, never an I/O or authority failure.
enum class RecordingDeletionAdmission { Accepted, Protected, Failed };

class RecordingStorePort {
public:
    virtual ~RecordingStorePort() = default;
    virtual bool FinalizeSegment(const RecordingSegmentV1& segment,
                                 const std::string& media_path,
                                 std::string* error) = 0;
    virtual bool PutEventLink(const EventRecordingLinkV1& link, std::string* error) = 0;
    virtual bool PutObservation(const AnalysisObservationV1& observation, std::string* error) = 0;
    virtual bool RequestDeletion(const std::string& segment_id,
                                 const std::string& reason,
                                 std::string* error) = 0;
    virtual RecordingDeletionAdmission RequestDeletionForAdmission(
        const std::string& id, const std::string& reason, std::string* error) {
        return RequestDeletion(id,reason,error) ? RecordingDeletionAdmission::Accepted
                                               : RecordingDeletionAdmission::Failed;
    }
    virtual bool CompleteDeletion(const RecordingTombstoneV1& tombstone, std::string* error) = 0;
    virtual bool CompleteDeletionV2(const RecordingTombstoneV2&, std::string* error) {
        if(error)*error="V2 deletion unsupported";
        return false;
    }
    virtual std::vector<RecordingSegmentV1> QuerySegments(
        const std::string& channel_id,
        std::int64_t start_ms,
        std::int64_t end_ms) const = 0;
};

}  // namespace recording
