// 파일 요약: dependency-free Re-ID readiness 요청을 canonical analysis inspector에 매핑한다.
#include "ingress/appearance_readiness_application_service.h"

#include <algorithm>
#include <cctype>
#include <utility>

#include "analysis/appearance_extractor.h"

namespace ingress {
namespace {

std::string Trim(std::string value) {
    const auto first = std::find_if_not(value.begin(), value.end(), [](const unsigned char ch) {
        return std::isspace(ch) != 0;
    });
    const auto last = std::find_if_not(value.rbegin(), value.rend(), [](const unsigned char ch) {
        return std::isspace(ch) != 0;
    }).base();
    if (first >= last) {
        return {};
    }
    return std::string(first, last);
}

std::string NormalizedLower(std::string value) {
    value = Trim(std::move(value));
    std::transform(value.begin(), value.end(), value.begin(), [](const unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

}  // namespace

AppearanceReadinessView InspectAppearanceReadiness(const AppearanceReadinessRequest& request) {
    analysis::AppearanceExtractorOptions options;
    options.enabled = request.enabled;
    options.extractor_name = NormalizedLower(request.extractor_name);
    options.model_path = request.model_path;
    options.model_sha256 = NormalizedLower(request.model_sha256);
    options.model_provenance = Trim(request.model_provenance);
    options.input_width = std::max(1, request.input_width);
    options.input_height = std::max(1, request.input_height);
    options.max_embedding_dim = std::max<std::size_t>(1, request.max_embedding_dim);
    options.log_enabled = request.log_enabled;
    options.async_enabled = request.async_enabled;
    options.max_queue_size = std::max<std::size_t>(1, request.max_queue_size);
    options.global_max_queue_size = std::max<std::size_t>(1, request.global_max_queue_size);
    options.per_stream_rate_limit_ms = std::max(0, request.per_stream_rate_limit_ms);
    options.max_job_age_ms = std::max(0, request.max_job_age_ms);

    const auto readiness = analysis::InspectAppearanceModelReadiness(options);
    AppearanceReadinessView output;
    output.appearance_enabled = readiness.appearance_enabled;
    output.onnx_reid_extractor_selected = readiness.onnx_reid_extractor_selected;
    output.model_path_configured = readiness.model_path_configured;
    output.model_file_exists = readiness.model_file_exists;
    output.model_file_regular = readiness.model_file_regular;
    output.checksum_configured = readiness.checksum_configured;
    output.checksum_format_valid = readiness.checksum_format_valid;
    output.openssl_runtime_available = readiness.openssl_runtime_available;
    output.checksum_readable = readiness.checksum_readable;
    output.checksum_matches = readiness.checksum_matches;
    output.provenance_configured = readiness.provenance_configured;
    output.onnxruntime_available = readiness.onnxruntime_available;
    output.model_backed_preflight_ready = readiness.model_backed_preflight_ready;
    output.fallback_reason = readiness.fallback_reason;
    return output;
}

}  // namespace ingress
