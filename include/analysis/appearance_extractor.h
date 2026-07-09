// 파일 요약: Re-ID/attribute 분석을 위한 appearance hook 계약을 선언한다.
// 동작 요약: 실제 모델 호출 없이 AppearanceProfile, update policy, NoOp extractor만 제공한다.
// 동작 요약: 기본 비활성화 상태로 TrackStateManager가 필요 시점에만 호출할 수 있는 인터페이스다.
#pragma once

#include <cstdint>
#include <optional>

#include "analysis/tracked_object_metadata.h"

namespace app {
struct AppConfig;
}

namespace analysis {

struct AppearanceProfile {
    std::vector<float> embedding;
    float embedding_quality{0.0F};
    std::string upper_color{"unknown"};
    std::string lower_color{"unknown"};
    std::string gender{"unknown"};
    std::string hat{"unknown"};
    std::string glasses{"unknown"};
    std::int64_t last_updated_time_ns{0};
    std::int64_t last_updated_time_ms{0};
    std::uint32_t sample_count{0};
};

struct AppearanceExtractorStats {
    bool enabled{false};
    std::string extractor_name{"noop"};
    std::string model_path;
    std::uint64_t request_count{0};
    std::uint64_t queued_count{0};
    std::uint64_t completed_count{0};
    std::uint64_t failed_count{0};
    std::uint64_t dropped_count{0};
    std::uint64_t missing_crop_count{0};
    std::uint64_t busy_drop_count{0};
    std::uint64_t queue_full_drop_count{0};
    std::uint64_t global_queue_drop_count{0};
    std::uint64_t rate_limited_count{0};
    std::uint64_t stale_drop_count{0};
    std::uint64_t total_queue_latency_ms{0};
    double last_queue_latency_ms{0.0};
    double max_queue_latency_ms{0.0};
    std::uint64_t total_inference_time_ms{0};
    double last_inference_time_ms{0.0};
    double max_inference_time_ms{0.0};
    std::string last_error;
};

struct AppearanceExtractorOptions {
    bool enabled{app_config::kDefaultAnalysisAppearanceEnabled};
    std::string extractor_name{app_config::kDefaultAnalysisAppearanceExtractor};
    std::string model_path{app_config::kDefaultAnalysisAppearanceModelPath};
    std::string model_sha256{app_config::kDefaultAnalysisAppearanceModelSha256};
    std::string model_provenance{app_config::kDefaultAnalysisAppearanceModelProvenance};
    int input_width{app_config::kDefaultAnalysisAppearanceInputWidth};
    int input_height{app_config::kDefaultAnalysisAppearanceInputHeight};
    std::size_t max_embedding_dim{app_config::kDefaultAnalysisAppearanceMaxEmbeddingDim};
    bool log_enabled{app_config::kDefaultAnalysisAppearanceLogEnabled};
    bool async_enabled{app_config::kDefaultAnalysisAppearanceAsyncEnabled};
    std::size_t max_queue_size{app_config::kDefaultAnalysisAppearanceMaxQueue};
    std::size_t global_max_queue_size{app_config::kDefaultAnalysisAppearanceGlobalMaxQueue};
    int per_stream_rate_limit_ms{app_config::kDefaultAnalysisAppearancePerStreamRateLimitMs};
    int max_job_age_ms{app_config::kDefaultAnalysisAppearanceMaxJobAgeMs};
};

// Re-ID 모델을 실제 extractor에 전달하기 전에 확인하는 서버 소유 준비 상태다.
// 원본 path/checksum/provenance는 포함하지 않아 Ops API가 민감한 설정을 노출하지 않는다.
struct AppearanceModelReadiness {
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

struct AppearanceUpdatePolicy {
    bool enabled{app_config::kDefaultAnalysisAppearanceEnabled};
    bool on_track_created{app_config::kDefaultAnalysisAppearanceOnTrackCreated};
    int every_n_seconds{app_config::kDefaultAnalysisAppearanceEveryNSeconds};
    bool on_track_lost{app_config::kDefaultAnalysisAppearanceOnTrackLost};
    bool on_reacquire_candidate{app_config::kDefaultAnalysisAppearanceOnReacquireCandidate};
    bool on_low_confidence_association{
        app_config::kDefaultAnalysisAppearanceOnLowConfidenceAssociation};
    bool async_enabled{app_config::kDefaultAnalysisAppearanceAsyncEnabled};
    std::size_t max_queue_size{app_config::kDefaultAnalysisAppearanceMaxQueue};
    std::size_t global_max_queue_size{app_config::kDefaultAnalysisAppearanceGlobalMaxQueue};
    int per_stream_rate_limit_ms{app_config::kDefaultAnalysisAppearancePerStreamRateLimitMs};
    int max_job_age_ms{app_config::kDefaultAnalysisAppearanceMaxJobAgeMs};
};

enum class AppearanceUpdateReason {
    TrackCreated,
    Periodic,
    TrackLost,
    ReacquireCandidate,
    LowConfidenceAssociation,
};

struct AppearanceExtractionInput {
    std::string stream_id;
    std::string channel_id;
    std::uint64_t track_id{0};
    std::uint64_t frame_id{0};
    std::int64_t timestamp_ns{0};
    std::int64_t timestamp_ms{0};
    int class_id{-1};
    std::string class_name;
    float confidence{0.0F};
    RectF bbox;
    NormalizedPointF center;
    ObjectDirection direction;
    int crop_width{0};
    int crop_height{0};
    std::vector<unsigned char> crop_rgb;
    AppearanceUpdateReason reason{AppearanceUpdateReason::Periodic};
};

class IAppearanceExtractor {
public:
    virtual ~IAppearanceExtractor() = default;

    virtual bool Enabled() const = 0;
    virtual AppearanceExtractorStats Stats() const = 0;
    virtual std::optional<AppearanceProfile> Extract(const AppearanceExtractionInput& input,
                                                     const AppearanceProfile* previous_profile) = 0;
};

class NoOpAppearanceExtractor : public IAppearanceExtractor {
public:
    bool Enabled() const override;
    AppearanceExtractorStats Stats() const override;
    std::optional<AppearanceProfile> Extract(const AppearanceExtractionInput& input,
                                             const AppearanceProfile* previous_profile) override;
};

AppearanceUpdatePolicy BuildAppearanceUpdatePolicyFromConfig(const app::AppConfig& config);
AppearanceExtractorOptions BuildAppearanceExtractorOptionsFromConfig(const app::AppConfig& config);
AppearanceModelReadiness InspectAppearanceModelReadiness(
    const AppearanceExtractorOptions& options);
AppearanceModelReadiness InspectAppearanceModelReadiness(const app::AppConfig& config);
std::shared_ptr<IAppearanceExtractor> CreateAppearanceExtractorFromConfig(const app::AppConfig& config);

}  // namespace analysis
