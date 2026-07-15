// 파일 요약: transport가 analysis 구현 타입 없이 Re-ID model readiness를 조회하는 application 경계다.
#pragma once

#include <cstddef>
#include <string>

namespace ingress {

struct AppearanceReadinessRequest {
    bool enabled{false};
    std::string extractor_name;
    std::string model_path;
    std::string model_sha256;
    std::string model_provenance;
    int input_width{1};
    int input_height{1};
    std::size_t max_embedding_dim{1};
    bool log_enabled{false};
    bool async_enabled{false};
    std::size_t max_queue_size{1};
    std::size_t global_max_queue_size{1};
    int per_stream_rate_limit_ms{0};
    int max_job_age_ms{0};
};

struct AppearanceReadinessView {
    bool appearance_enabled{false};
    bool onnx_reid_extractor_selected{false};
    bool model_path_configured{false};
    bool model_file_exists{false};
    bool model_file_regular{false};
    bool checksum_configured{false};
    bool checksum_format_valid{false};
    bool openssl_runtime_available{false};
    bool checksum_readable{false};
    bool checksum_matches{false};
    bool provenance_configured{false};
    bool onnxruntime_available{false};
    bool model_backed_preflight_ready{false};
    std::string fallback_reason{"appearance-disabled"};
};

AppearanceReadinessView InspectAppearanceReadiness(const AppearanceReadinessRequest& request);

}  // namespace ingress
