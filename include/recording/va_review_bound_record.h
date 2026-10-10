// 파일 용도: 내부 A 기록 판정의 명세·sample·출처 결속과 versioned 저장 계약. 공개 v1과 분리한다.
#pragma once
#include "recording/evidence_observation.h"

namespace recording {
class VaReviewStore;
struct ReviewTargetBindingV2 {
    std::string target_id, package_id, manifest_sha256, analysis_namespace, analysis_track_id;
    // 패키지 후보가 실제 보존한 episode의 정렬된 집합. 빈 값은 동일성 확인을 뜻하지 않는다.
    std::vector<std::int64_t> engine_episodes;
};
struct VaReviewRecordV2Fields {
    ReviewTargetBindingV2 binding;
    std::vector<ReviewClaimSpec> claims;
    // PNG/assets/검색 결과 전체가 아닌 판정 입력 사본: source/channel/store/epoch, frames, observations만 직렬화.
    EvidencePackageV1 evidence;
    std::vector<ReviewDecision> decisions;
    std::string spec_sha256, observation_sha256, policy_sha256;
    std::int64_t created_at_ms{};
};
using VaReviewRecordV2=RecordingMemoryValue<VaReviewRecordV2Fields>;
constexpr std::size_t kVaReviewRecordV2Bytes=128*1024;
std::string SerializeVaReviewRecordV2(const VaReviewRecordV2&);
bool ParseVaReviewRecordV2(const std::string&,VaReviewRecordV2*,std::string*);
bool ValidateVaReviewRecordV2(const VaReviewRecordV2&,std::string*);
std::string AnalysisReviewSpecDigest(const ReviewTargetBindingV2&,const std::vector<ReviewClaimSpec>&);
bool BuildAnalysisReviewRecord(const EvidencePackageStore&,const ReviewTargetBindingV2&,
    const std::vector<ReviewClaimSpec>&,std::int64_t,const std::function<bool(const std::string&)>&,
    VaReviewRecordV2*,std::string*,const std::function<bool()>& cancelled={});
// 명세는 internal-explicit/not-confirmed다. 확인자·확인시각·모델 confidence를 만들지 않는다.
bool CreateAnalysisReviewRecord(const EvidencePackageStore&,const VaReviewStore&,const ReviewTargetBindingV2&,
    const std::vector<ReviewClaimSpec>&,std::int64_t created_at_ms,
    const std::function<bool(const std::string&)>& authorize,std::string* id,std::string* error,
    const std::function<bool()>& cancelled={});
bool ReadAnalysisReviewRecord(const VaReviewStore&,const std::string& id,
    const std::function<bool(const std::string&)>& authorize,VaReviewRecordV2*,std::string*);
// 저장 판정은 유지한다. 근거 package의 현재 열람 가능 여부만 별도로 반환한다.
bool CheckAnalysisReviewEvidence(const EvidencePackageStore&,const VaReviewRecordV2&,
    std::string* availability,std::string* error);
struct ReviewDisplayProjectionV2 {
    std::string status; // available-display-only / unavailable-limit / unavailable-unsupported
    std::string text_origin{"server-template"},questions_state{"not-generated"},quality{"not-evaluated"};
    std::optional<VaReviewOutput> output;
};
bool ProjectAnalysisReviewDisplay(const VaReviewRecordV2&,ReviewDisplayProjectionV2*,std::string*);
} // namespace recording
