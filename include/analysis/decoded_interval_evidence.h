// 파일 용도: 실제 decoder callback의 직접 시간 대응을 bounded 내부 증거로 보존한다.
#pragma once
#include "analysis/analysis_types.h"
#include <deque>
#include <memory>
#include <limits>

namespace analysis {
struct DecodedIntervalEvidence {
    std::uint64_t decoded_sequence{0};
    std::int64_t analysis_pts_ns{0};
    SourceAssociation association;
    std::optional<std::uint64_t> duration_ns;
    bool direct{false};
    std::string reason;
};
struct DecodedIntervalSnapshot {
    std::string analysis_namespace;
    std::vector<DecodedIntervalEvidence> frames;
    bool incomplete{false};
    std::string incomplete_reason;
    std::optional<std::int64_t> discarded_end_ns;
    std::uint64_t minimum_sequence{0}, maximum_sequence{0};
};
class DecodedIntervalCollector {
public:
    void Append(DecodedIntervalEvidence value);
    void BeginNamespace(std::uint64_t minimum_sequence);
    std::shared_ptr<const DecodedIntervalSnapshot> Snapshot(const std::string& name,
        std::uint64_t minimum_sequence=0,
        std::uint64_t maximum_sequence=std::numeric_limits<std::uint64_t>::max()) const;
private:
    std::deque<DecodedIntervalEvidence> frames_;
    bool incomplete_{false};
    std::optional<std::int64_t> discarded_end_ns_;
    std::uint64_t next_sequence_{0},discarded_sequence_{0};
};
} // namespace analysis
