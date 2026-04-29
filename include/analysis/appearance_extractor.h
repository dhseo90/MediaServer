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

struct AppearanceUpdatePolicy {
    bool enabled{app_config::kDefaultAnalysisAppearanceEnabled};
    bool on_track_created{app_config::kDefaultAnalysisAppearanceOnTrackCreated};
    int every_n_seconds{app_config::kDefaultAnalysisAppearanceEveryNSeconds};
    bool on_track_lost{app_config::kDefaultAnalysisAppearanceOnTrackLost};
    bool on_reacquire_candidate{app_config::kDefaultAnalysisAppearanceOnReacquireCandidate};
    bool on_low_confidence_association{
        app_config::kDefaultAnalysisAppearanceOnLowConfidenceAssociation};
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
    AppearanceUpdateReason reason{AppearanceUpdateReason::Periodic};
};

class IAppearanceExtractor {
public:
    virtual ~IAppearanceExtractor() = default;

    virtual bool Enabled() const = 0;
    virtual std::optional<AppearanceProfile> Extract(const AppearanceExtractionInput& input,
                                                     const AppearanceProfile* previous_profile) = 0;
};

class NoOpAppearanceExtractor : public IAppearanceExtractor {
public:
    bool Enabled() const override;
    std::optional<AppearanceProfile> Extract(const AppearanceExtractionInput& input,
                                             const AppearanceProfile* previous_profile) override;
};

AppearanceUpdatePolicy BuildAppearanceUpdatePolicyFromConfig(const app::AppConfig& config);

}  // namespace analysis
