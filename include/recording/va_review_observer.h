// 파일 용도: 고정 의도가 요구하는 관측만 Ollama에서 추출하는 내부 경로. 공개 provider와 미연결.
#pragma once
#include "recording/va_review_core.h"
#include "recording/va_review_provider.h"
#include <array>
namespace recording {
// Qwen grounding의 닫힌 [0,1000] bbox 모서리 → 원본 중심 pixel. 반올림/보정하지 않는다.
inline constexpr const char* kReviewCoordinateConversion="qwen3vl-bbox1000-center-v1";
struct ReviewCoordinateConversion {
    std::size_t frame{};
    std::array<double,4> bbox_1000{}; // xmin,ymin,xmax,ymax; raw model units
    ReviewPoint center_pixels;
};
bool ConvertReviewRelativeBox(const std::array<double,4>&,const ReviewFrame&,ReviewPoint*,std::string* error);
std::vector<ReviewFrame> ReviewFrames(const VaReviewInput&);
bool BuildReviewObservationRequest(const VaReviewInput&,const ReviewClaimSpec&,const std::string& model,
    std::string* request,std::string* error);
bool DecodeReviewObservations(const std::string&,const ReviewClaimSpec&,const std::vector<ReviewFrame>&,
    std::vector<ReviewObservation>*,std::string* error,std::vector<ReviewCoordinateConversion>* conversions=nullptr);
bool ExtractReviewObservations(const VaReviewInput&,const ReviewClaimSpec&,const VaReviewProviderOptions&,
    const std::string& expected_digest,VaReviewService::Clock::time_point,const std::function<bool()>&,
    std::vector<ReviewObservation>*,std::string* error,VaReviewTransport=VaReviewCurl,
    std::vector<ReviewCoordinateConversion>* conversions=nullptr);
} // namespace recording
