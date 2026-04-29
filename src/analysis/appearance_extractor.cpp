// 파일 요약: appearance hook의 NoOp 구현과 config adapter를 제공한다.
// 동작 요약: 실제 Re-ID/attribute 모델 호출은 하지 않고 optional empty를 반환한다.
// 동작 요약: 향후 extractor 교체를 위한 update policy만 AppConfig에서 구성한다.
#include "analysis/appearance_extractor.h"

#include "app_config.h"

#include <algorithm>

namespace analysis {

bool NoOpAppearanceExtractor::Enabled() const {
    return true;
}

std::optional<AppearanceProfile> NoOpAppearanceExtractor::Extract(
    const AppearanceExtractionInput& input,
    const AppearanceProfile* previous_profile) {
    (void)input;
    (void)previous_profile;
    return std::nullopt;
}

AppearanceUpdatePolicy BuildAppearanceUpdatePolicyFromConfig(const app::AppConfig& config) {
    AppearanceUpdatePolicy policy;
    policy.enabled = config.analysis_appearance_enabled;
    policy.on_track_created = config.analysis_appearance_on_track_created;
    policy.every_n_seconds = std::max(0, config.analysis_appearance_every_n_seconds);
    policy.on_track_lost = config.analysis_appearance_on_track_lost;
    policy.on_reacquire_candidate = config.analysis_appearance_on_reacquire_candidate;
    policy.on_low_confidence_association =
        config.analysis_appearance_on_low_confidence_association;
    return policy;
}

}  // namespace analysis
