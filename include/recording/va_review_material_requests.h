// 파일 용도: 검증된 typed gap의 현재 자료 요청 표시. 모델·저장·판정 변경 없음.
#pragma once
#include "recording/va_review_confirmed_record.h"
namespace recording {
struct ReviewMaterialGapRef { std::string claim_id; std::size_t gap_index{}; };
struct ReviewMaterialFrame {
    std::size_t index{}; std::int64_t pts_ns{};
    std::string observation_state,identity_state;
    std::optional<std::uint64_t> sample_ordinal;
};
struct ReviewMaterialRequest {
    std::string target_id,target_description,kind,purpose,time_state,source,requested_source,text;
    std::string analysis_namespace,analysis_track;
    std::vector<std::int64_t> engine_episodes;
    std::vector<ReviewMaterialFrame> frames;
    std::vector<ReviewMaterialGapRef> gap_refs;
};
struct ReviewMaterialRequests {
    std::string status{"not-needed"}; // available / not-needed / unavailable-limit / unavailable-unsupported
    std::vector<std::string> unsupported_claims;
    std::vector<ReviewMaterialRequest> items;
};
// 기존 질문 표시 상한을 재사용한다. 개별 문장뿐 아니라 JSON 전체와 대응 참조도 계산한다.
constexpr std::size_t kReviewMaterialItems=16,kReviewMaterialTextBytes=512,kReviewMaterialCodePoints=170,kReviewMaterialBytes=8192;
std::string SerializeReviewMaterialRequests(const ReviewMaterialRequests&);
void ApplyReviewMaterialRequestBudget(ReviewMaterialRequests*,std::size_t available_bytes=kReviewMaterialBytes);
// 명시 core 검사 입력은 독립 영상 인증이 아니다. B/C 출처 label을 수용하는 입력은 없다.
bool BuildReviewMaterialRequests(const std::vector<ReviewClaimSpec>&,const std::vector<ReviewFrame>&,
    const std::vector<ReviewObservation>&,const std::vector<ReviewDecision>&,ReviewMaterialRequests*,std::string*);
bool BuildConfirmedReviewMaterialRequests(const VaReviewRecordV3&,ReviewMaterialRequests*,std::string*);
} // namespace recording
