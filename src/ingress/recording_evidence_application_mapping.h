#pragma once
// 파일 용도: 공개 DTO와 분리한 동일 분석 결과의 녹화 증거 전달 계약이다.
#include "analysis/analysis_types.h"
#include "ingress/analysis_session_read_application_service.h"

namespace ingress {

struct RecordingEvidenceCarrier {
    std::string source_key;
    std::int64_t pts{0};
    std::uint64_t frame_id{0};
    analysis::AnalysisObservationContext observation_context;
    std::string observation_namespace;
    analysis::SourceAssociation source_association;
    std::shared_ptr<const analysis::DecodedIntervalSnapshot> decoded_intervals;
};

inline bool RecordingEvidenceMatches(const RecordingEvidenceCarrier& evidence,
                                     const std::string& source_key,
                                     std::int64_t pts, std::uint64_t frame_id) {
    return evidence.source_key == source_key && evidence.pts == pts &&
           evidence.frame_id == frame_id;
}

inline std::shared_ptr<const RecordingEvidenceCarrier> CaptureRecordingEvidence(
    const analysis::AnalysisResult& result) {
    // snapshot이 없는 history 결과도 그대로 전달하며 최신 증거를 조회하지 않는다.
    return std::make_shared<const RecordingEvidenceCarrier>(RecordingEvidenceCarrier{
        result.source_key, result.pts, result.frame_id, result.observation_context,
        result.observation_namespace, result.source_association, result.decoded_intervals});
}

inline std::shared_ptr<const RecordingEvidenceCarrier> CaptureRecordingEvidence(
    const AnalysisSessionApplicationResult& result) {
    if (!result.recording_evidence ||
        !RecordingEvidenceMatches(*result.recording_evidence, result.source_key,
                                  result.pts, result.frame_id)) return {};
    return result.recording_evidence;
}

inline void RestoreRecordingEvidence(
    const std::shared_ptr<const RecordingEvidenceCarrier>& evidence,
    analysis::AnalysisResult& result) {
    // 호출자는 신규 결과를 구성한다. 다른 frame의 증거는 복원하지 않는다.
    if (!evidence || !RecordingEvidenceMatches(*evidence, result.source_key,
                                              result.pts, result.frame_id)) return;
    result.observation_context = evidence->observation_context;
    result.observation_namespace = evidence->observation_namespace;
    result.source_association = evidence->source_association;
    result.decoded_intervals = evidence->decoded_intervals;
}

}  // namespace ingress
