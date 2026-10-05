// 파일 용도: 고정 의도가 요구하는 관측만 Ollama에서 추출하는 내부 경로. 공개 provider와 미연결.
#pragma once
#include "recording/va_review_core.h"
#include "recording/va_review_provider.h"
namespace recording {
std::vector<ReviewFrame> ReviewFrames(const VaReviewInput&);
bool BuildReviewObservationRequest(const VaReviewInput&,const ReviewClaimSpec&,const std::string& model,
    std::string* request,std::string* error);
bool DecodeReviewObservations(const std::string&,const ReviewClaimSpec&,const std::vector<ReviewFrame>&,
    std::vector<ReviewObservation>*,std::string* error);
bool ExtractReviewObservations(const VaReviewInput&,const ReviewClaimSpec&,const VaReviewProviderOptions&,
    const std::string& expected_digest,VaReviewService::Clock::time_point,const std::function<bool()>&,
    std::vector<ReviewObservation>*,std::string* error,VaReviewTransport=VaReviewCurl);
} // namespace recording
