// 파일 용도: package 관측 사본만 복원하여 A 기록 관계를 계산한다. 외부 catalog 조회와 공개 게시 없음.
#pragma once
#include "recording/evidence_package_store.h"
#include "recording/va_review_core.h"

namespace recording {
// reader/판정 반환값에 출처를 유지한다. engine-track은 물리적 동일성의 독립 증명이 아니다.
struct AnalysisRecordReview {
    std::string source_kind{"A"}, verification{"analysis-record-consistency"}, identity_basis{"engine-track"};
    EvidencePackageV1 package;
    std::vector<ReviewFrame> frames;
    std::vector<ReviewObservation> observations;
    std::vector<ReviewDecision> decisions;
};
bool PopulateEvidenceObservations(EvidencePackageV1*, const std::vector<ReferencedObservationV1>&, std::string*);
bool ValidateEvidenceObservations(const EvidencePackageV1&, std::string*);
// 보존 사본만 사용하는 동일 A adapter. record codec의 입력 재현에도 사용한다.
bool EvaluateAnalysisRecordSnapshot(const EvidencePackageV1&, const std::vector<ReviewClaimSpec>&,
    AnalysisRecordReview*, std::string* error);
// target_id는 명시 ClaimSpec의 대상 ID다. 자유질문을 해석하지 않는다.
bool ReadAnalysisRecordReview(const EvidencePackageStore&, const std::string& package_id,
    const std::vector<ReviewClaimSpec>&, AnalysisRecordReview*, std::string* error,
    const std::function<bool()>& cancelled={});
} // namespace recording
