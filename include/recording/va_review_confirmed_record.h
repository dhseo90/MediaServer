// 파일 용도: 서버가 확인한 principal/revision과 불변 A 판정 입력을 결속하는 새 record v3.
#pragma once
#include "recording/va_review_bound_record.h"
namespace recording {
struct ReviewConfirmationV3 {
    std::string principal,question,revision,spec_sha256;
    std::int64_t confirmed_at_ms{},expires_at_ms{};
};
struct ConfirmedAnalysisRequest {
    ReviewTargetBindingV2 binding;
    std::vector<ReviewClaimSpec> claims;
    ReviewConfirmationV3 confirmation;
};
struct VaReviewRecordV3 {
    VaReviewRecordV2 analysis;
    ReviewConfirmationV3 confirmation;
    std::string confirmation_sha256;
};
std::int64_t ReviewWallTimeMs();
std::string ReviewConfirmationDigest(const ReviewConfirmationV3&);
bool ValidateReviewConfirmation(const ReviewConfirmationV3&,std::string*);
bool ValidateVaReviewRecordV3(const VaReviewRecordV3&,std::string*);
std::string SerializeVaReviewRecordV3(const VaReviewRecordV3&);
bool ParseVaReviewRecordV3(const std::string&,VaReviewRecordV3*,std::string*);
} // namespace recording
