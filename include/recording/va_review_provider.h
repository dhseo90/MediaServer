// 파일 용도: 명시한 provider의 제한된 전송과 시퀀스 검토. 자동 fallback은 없다.
#pragma once
#include "recording/va_review_service.h"

namespace recording {
struct VaReviewHttpRequest {
    std::string url,body;
    std::vector<std::string> headers;
};
using VaReviewTransport=std::function<bool(const VaReviewHttpRequest&,VaReviewService::Clock::time_point,
    const std::function<bool()>&,std::string*,std::string*)>;
// URL은 고정 loopback Ollama API만 허용한다. 응답 상한/시간/취소와 child reap을 담당한다.
bool VaReviewCurl(const VaReviewHttpRequest&,VaReviewService::Clock::time_point,
    const std::function<bool()>&,std::string* response,std::string* error);
struct VaReviewProviderOptions {
    bool enabled{false};
    std::string local_endpoint{"http://127.0.0.1:11434"};
    std::string local_model{"qwen3-vl:8b-instruct-q4_K_M"};
};
VaReviewService::Infer MakeVaReviewProvider(VaReviewProviderOptions,VaReviewTransport=VaReviewCurl);
} // namespace recording
