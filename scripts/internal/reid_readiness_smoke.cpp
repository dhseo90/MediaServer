// 파일 용도: Re-ID 공용 readiness evaluator의 결정적 false-positive 행렬을 검증한다.

#include "analysis/appearance_extractor.h"
#include "app_config.h"
#include "ingress/appearance_readiness_application_service.h"

#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

namespace {

constexpr const char* kModelBytes = "reid-readiness-v390-add1-04";
constexpr const char* kModelSha256 =
    "38e6a4de4d43e8ec1c8cebc599f6d446d1f2be1cebddfd4f9174284f79ba49aa";

void Require(bool condition, const std::string& message) {
    if (!condition) {
        std::cerr << "[fail] " << message << "\n";
        std::exit(1);
    }
}

analysis::AppearanceExtractorOptions BaseOptions(const std::filesystem::path& model_path) {
    analysis::AppearanceExtractorOptions options;
    options.enabled = true;
    options.extractor_name = "onnx-reid";
    options.model_path = model_path.string();
    options.model_sha256 = kModelSha256;
    options.model_provenance = "operator-reviewed:test-fixture";
    return options;
}

ingress::AppearanceReadinessRequest ToApplicationRequest(
    const analysis::AppearanceExtractorOptions& options) {
    ingress::AppearanceReadinessRequest request;
    request.enabled = options.enabled;
    request.extractor_name = options.extractor_name;
    request.model_path = options.model_path;
    request.model_sha256 = options.model_sha256;
    request.model_provenance = options.model_provenance;
    request.input_width = options.input_width;
    request.input_height = options.input_height;
    request.max_embedding_dim = options.max_embedding_dim;
    request.log_enabled = options.log_enabled;
    request.async_enabled = options.async_enabled;
    request.max_queue_size = options.max_queue_size;
    request.global_max_queue_size = options.global_max_queue_size;
    request.per_stream_rate_limit_ms = options.per_stream_rate_limit_ms;
    request.max_job_age_ms = options.max_job_age_ms;
    return request;
}

void RequireApplicationParity(const analysis::AppearanceModelReadiness& expected,
                              const analysis::AppearanceExtractorOptions& options) {
    const auto actual = ingress::InspectAppearanceReadiness(ToApplicationRequest(options));
    Require(actual.appearance_enabled == expected.appearance_enabled &&
                actual.onnx_reid_extractor_selected == expected.onnx_reid_extractor_selected &&
                actual.model_path_configured == expected.model_path_configured &&
                actual.model_file_exists == expected.model_file_exists &&
                actual.model_file_regular == expected.model_file_regular &&
                actual.checksum_configured == expected.checksum_configured &&
                actual.checksum_format_valid == expected.checksum_format_valid &&
                actual.openssl_runtime_available == expected.openssl_runtime_available &&
                actual.checksum_readable == expected.checksum_readable &&
                actual.checksum_matches == expected.checksum_matches &&
                actual.provenance_configured == expected.provenance_configured &&
                actual.onnxruntime_available == expected.onnxruntime_available &&
                actual.model_backed_preflight_ready == expected.model_backed_preflight_ready &&
                actual.fallback_reason == expected.fallback_reason,
            "application readiness mapping drift");
}

void RequireApplicationNormalization(const analysis::AppearanceExtractorOptions& normalized) {
    auto request = ToApplicationRequest(normalized);
    request.extractor_name = "  ONNX-REID  ";
    request.model_sha256 =
        "38E6A4DE4D43E8EC1C8CEBC599F6D446D1F2BE1CEBDDFD4F9174284F79BA49AA";
    request.model_provenance = "  operator-reviewed:test-fixture  ";
    request.input_width = 0;
    request.input_height = 0;
    request.max_embedding_dim = 0;
    request.max_queue_size = 0;
    request.global_max_queue_size = 0;
    request.per_stream_rate_limit_ms = -1;
    request.max_job_age_ms = -1;
    const auto actual = ingress::InspectAppearanceReadiness(request);
    const auto expected = analysis::InspectAppearanceModelReadiness(normalized);
    Require(actual.appearance_enabled == expected.appearance_enabled &&
                actual.onnx_reid_extractor_selected == expected.onnx_reid_extractor_selected &&
                actual.model_path_configured == expected.model_path_configured &&
                actual.model_file_exists == expected.model_file_exists &&
                actual.model_file_regular == expected.model_file_regular &&
                actual.checksum_configured == expected.checksum_configured &&
                actual.checksum_format_valid == expected.checksum_format_valid &&
                actual.openssl_runtime_available == expected.openssl_runtime_available &&
                actual.checksum_readable == expected.checksum_readable &&
                actual.checksum_matches == expected.checksum_matches &&
                actual.provenance_configured == expected.provenance_configured &&
                actual.onnxruntime_available == expected.onnxruntime_available &&
                actual.model_backed_preflight_ready == expected.model_backed_preflight_ready &&
                actual.fallback_reason == expected.fallback_reason,
            "application normalization drift");
}

void ExpectReason(const analysis::AppearanceExtractorOptions& options,
                  const std::string& reason) {
    const auto readiness = analysis::InspectAppearanceModelReadiness(options);
    RequireApplicationParity(readiness, options);
    Require(!readiness.model_backed_preflight_ready, reason + ": unexpectedly ready");
    Require(readiness.fallback_reason == reason,
            reason + ": got " + readiness.fallback_reason);
}

void ExpectDisabledNoOp(const std::shared_ptr<analysis::IAppearanceExtractor>& extractor,
                        const std::string& context) {
    Require(extractor != nullptr, context + ": missing extractor");
    Require(!extractor->Enabled(), context + ": NoOp must report Enabled=false");
    const auto stats = extractor->Stats();
    Require(!stats.enabled && stats.extractor_name == "noop",
            context + ": NoOp stats must report disabled/noop");
    Require(stats.request_count == 0 && stats.queued_count == 0 &&
                stats.completed_count == 0 && stats.failed_count == 0 &&
                stats.dropped_count == 0 && stats.missing_crop_count == 0,
            context + ": NoOp counters must remain zero");
    Require(!extractor->Extract(analysis::AppearanceExtractionInput{}, nullptr).has_value(),
            context + ": NoOp must not produce a profile");
}

}  // namespace

int main(int argc, char** argv) {
    Require(argc == 3, "usage: reid_readiness_smoke <work-dir> <no-crypto|crypto-no-onnx>");
    const std::filesystem::path work_dir = argv[1];
    const std::string mode = argv[2];
    std::filesystem::create_directories(work_dir);
    const auto model_path = work_dir / "model.onnx";
    {
        std::ofstream model(model_path, std::ios::binary | std::ios::trunc);
        model << kModelBytes;
    }
    auto options = BaseOptions(model_path);
    RequireApplicationNormalization(options);

    auto candidate = options;
    candidate.enabled = false;
    ExpectReason(candidate, "appearance-disabled");
    candidate = options;
    candidate.extractor_name = "noop";
    ExpectReason(candidate, "onnx-reid-extractor-not-selected");
    candidate = options;
    candidate.model_path.clear();
    ExpectReason(candidate, "model-path-missing");
    candidate = options;
    candidate.model_path = (work_dir / "missing.onnx").string();
    ExpectReason(candidate, "model-file-missing");
    candidate = options;
    candidate.model_path = work_dir.string();
    ExpectReason(candidate, "model-file-not-regular");
    candidate = options;
    candidate.model_sha256.clear();
    ExpectReason(candidate, "model-checksum-missing");
    candidate = options;
    candidate.model_sha256 = "not-a-sha";
    ExpectReason(candidate, "model-checksum-invalid");
    candidate = options;
    candidate.model_provenance = " \t\n ";
    ExpectReason(candidate, "model-provenance-missing");

    if (mode == "no-crypto") {
        const auto readiness = analysis::InspectAppearanceModelReadiness(options);
        RequireApplicationParity(readiness, options);
        Require(!readiness.openssl_runtime_available, "no-crypto: OpenSSL must be unavailable");
        Require(readiness.fallback_reason == "openssl-runtime-unavailable",
                "no-crypto: wrong reason " + readiness.fallback_reason);
    } else if (mode == "crypto-no-onnx") {
        candidate = options;
        candidate.model_sha256 = std::string(64, '0');
        ExpectReason(candidate, "model-checksum-mismatch");

        candidate = options;
        candidate.model_sha256 =
            "38E6A4DE4D43E8EC1C8CEBC599F6D446D1F2BE1CEBDDFD4F9174284F79BA49AA";
        const auto readiness = analysis::InspectAppearanceModelReadiness(candidate);
        RequireApplicationParity(readiness, candidate);
        Require(readiness.openssl_runtime_available, "crypto-no-onnx: OpenSSL unavailable");
        Require(readiness.checksum_readable, "crypto-no-onnx: checksum unreadable");
        Require(readiness.checksum_matches, "crypto-no-onnx: uppercase checksum mismatch");
        Require(!readiness.onnxruntime_available, "crypto-no-onnx: ONNX must be unavailable");
        Require(readiness.fallback_reason == "onnxruntime-unavailable",
                "crypto-no-onnx: wrong reason " + readiness.fallback_reason);

        app::AppConfig config;
        config.analysis_appearance_enabled = true;
        config.analysis_appearance_extractor = "onnx-reid";
        config.analysis_appearance_model_path = model_path.string();
        config.analysis_appearance_model_sha256 = kModelSha256;
        config.analysis_appearance_model_provenance = "operator-reviewed:test-fixture";
        const auto extractor = analysis::CreateAppearanceExtractorFromConfig(config);
        ExpectDisabledNoOp(extractor,
                           "factory must consume shared no-ONNX readiness and return NoOp");
    } else {
        Require(false, "unknown mode: " + mode);
    }

    std::cout << "[pass] " << mode << " readiness matrix\n";
    return 0;
}
