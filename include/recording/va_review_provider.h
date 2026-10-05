// 파일 용도: 명시한 provider의 제한된 전송과 시퀀스 검토. 자동 fallback은 없다.
#pragma once
#include "recording/va_review_service.h"

namespace recording {
struct VaReviewHttpRequest {
    std::string url,body;
    std::vector<std::string> headers;
    std::string ca_file{};
};
using VaReviewTransport=std::function<bool(const VaReviewHttpRequest&,VaReviewService::Clock::time_point,
    const std::function<bool()>&,std::string*,std::string*)>;
// 관리자 endpoint와 인증/TLS 설정을 검증한다. 네트워크 연결은 수행하지 않는다.
bool ValidateVaReviewConnection(const std::string& endpoint,const std::string& bearer_token,
    const std::string& ca_file);
// Ollama API 경로만 허용한다. TLS/인증·응답 상한/시간/취소와 child reap을 담당한다.
bool VaReviewCurl(const VaReviewHttpRequest&,VaReviewService::Clock::time_point,
    const std::function<bool()>&,std::string* response,std::string* error);
struct VaReviewProviderOptions {
    bool enabled{false};
    std::string local_endpoint{"http://127.0.0.1:11434"};
    std::string local_model{"qwen3-vl:8b-instruct-q4_K_M"};
    std::string bearer_token,ca_file; // token은 메모리 전용. 공개 config/로그/argv/record 금지.
};
// 내부 wire 수신기. 정제 reason만 반환하며 공개 오류는 review-invalid-output으로 유지한다.
// 합성 평가도 이 수신기를 사용한다. 원응답 상시 기록 기능은 없다.
bool DecodeVaReviewProviderOutput(const std::string&,const VaReviewInput&,VaReviewOutput*,std::string* reason);
VaReviewService::Infer MakeVaReviewProvider(VaReviewProviderOptions,VaReviewTransport=VaReviewCurl);
} // namespace recording
