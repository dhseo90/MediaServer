// 파일 용도: S10-2 설계 검증용 순수 모델. 제품 writer/저장/API에는 연결하지 않는다.
#pragma once
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <optional>

namespace recording_time_probe {
struct Clock {
    std::uint64_t process;
    std::int64_t before_ns, utc_ns, after_ns;
};
enum class ClockDecision { Stable, Remap, StepBack, StepForward, Unknown };
// 이 값은 측정 정확도 보장이 아니라 버전 1 모델의 분류 예산이다.
constexpr long double kPairWidthNs = 5000000;
constexpr long double kResolutionNs = 1000000;
constexpr long double kMappingBudgetNs = 50000000;
constexpr long double kStepBudgetNs = 250000000;
constexpr long double kDriftRatio = 0.0005L;
constexpr std::size_t kMaxMappingKnots = 256;

inline ClockDecision Compare(const Clock& previous, const Clock& current) {
    const auto valid = [](const Clock& c) {
        return c.before_ns >= 0 && c.after_ns >= c.before_ns &&
            static_cast<long double>(c.after_ns) - c.before_ns <= kPairWidthNs;
    };
    if (previous.process != current.process || !valid(previous) || !valid(current) ||
        current.before_ns <= previous.after_ns) return ClockDecision::Unknown;
    const long double previous_width = static_cast<long double>(previous.after_ns) - previous.before_ns;
    const long double current_width = static_cast<long double>(current.after_ns) - current.before_ns;
    const long double elapsed = static_cast<long double>(current.before_ns) - previous.before_ns +
        (current_width - previous_width) / 2;
    const long double residual = static_cast<long double>(current.utc_ns) - previous.utc_ns - elapsed;
    const long double uncertainty = (previous_width + current_width) / 2 + 2 * kResolutionNs;
    // 인접 관측 간 step 판정과 anchor 이후 누적 Remap 판정을 호출자가 구분한다.
    // 정수 뺄셈 overflow를 피하려고 변환 후 연산한다. 제품은 ns exact 연산을 별도 검증해야 한다.
    if (std::fabs(residual) > kStepBudgetNs + uncertainty + elapsed * kDriftRatio)
        return residual < 0 ? ClockDecision::StepBack : ClockDecision::StepForward;
    if (std::fabs(residual) > kMappingBudgetNs + uncertainty) return ClockDecision::Remap;
    return ClockDecision::Stable;
}
enum class Continuity { Same, Reordered, Replay, NewEpoch, Unknown };
struct Sample {
    std::uint64_t epoch, ordinal;
    std::optional<std::int64_t> pts, dts, duration;
};
inline Continuity Classify(const Sample& previous, const Sample& current) {
    if (previous.epoch != current.epoch) return Continuity::NewEpoch;
    if (previous.ordinal == current.ordinal && previous.pts == current.pts &&
        previous.dts == current.dts && previous.duration == current.duration) return Continuity::Replay;
    if (current.ordinal <= previous.ordinal || !previous.pts || !current.pts ||
        !previous.dts || !current.dts || *current.dts <= *previous.dts) return Continuity::Unknown;
    return *current.pts <= *previous.pts ? Continuity::Reordered : Continuity::Same;
}
inline std::optional<std::int64_t> KnownEnd(const Sample& sample) {
    if (!sample.pts || !sample.duration || *sample.duration <= 0 ||
        *sample.pts > std::numeric_limits<std::int64_t>::max() - *sample.duration) return std::nullopt;
    return *sample.pts + *sample.duration;
}
inline bool CanAppendMapping(std::size_t count) { return count < kMaxMappingKnots; }
} // namespace recording_time_probe
