// 파일 용도: 근거 index를 가진 구조화 VA 검토와 독립 보존 revision의 값 계약.
#pragma once
#include "recording/va_review_input.h"

namespace recording {
struct VaReviewClaim { std::string text; std::vector<std::size_t> frame_indices; };
struct VaReviewOutput {
    std::vector<VaReviewClaim> supports, questions, contradictions, unclear;
    std::optional<double> confidence;
};
struct VaReviewRecord {
    VaReviewInput input;
    VaReviewOutput output;
    std::string revision_id, provider, model, model_revision, prompt_sha256, adapter_version;
    std::int64_t created_at_ms{0};
    int latency_ms{0};
};
bool ValidateVaReviewOutput(const VaReviewOutput&, std::size_t frames, std::string* error);
bool ParseVaReviewOutput(const std::string&, std::size_t frames, VaReviewOutput*, std::string* error);
std::string SerializeVaReviewOutput(const VaReviewOutput&);
bool ParseVaReviewRecord(const std::string&, VaReviewRecord*, std::string* error);
std::string SerializeVaReviewRecord(const VaReviewRecord&);
bool ValidateVaReviewRecord(const VaReviewRecord&, std::string* error);
} // namespace recording
