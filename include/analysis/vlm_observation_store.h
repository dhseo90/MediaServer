// 파일 요약: VLM observation 결과를 EventRecord와 분리된 JSONL 저장소에 기록하는 계약을 선언한다.
// 동작 요약: 기존 event/metadata payload를 바꾸지 않고 eventId로만 상관시킨다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace analysis {

struct VlmObservationSidecar {
    std::string observation_id;
    std::string event_id;
    std::string source_id;
    std::string rule_id;
    std::string scenario_id;
    std::string input_type{"event-short-evidence-ref-only"};
    std::string input_evidence_refs_json{"{}"};
    std::string summary;
    std::string event_explanation;
    std::vector<std::string> false_positive_hints;
    std::vector<std::string> operator_review_questions;
    std::string rule_suggestion_json{"null"};
    double uncertainty{1.0};
    std::string provider;
    std::string model;
    std::string prompt_profile;
    std::string privacy_mode{"local-only"};
    int latency_ms{0};
    std::int64_t created_at_ms{0};
    std::string metadata_json{"{}"};
};

struct VlmObservationQueryOptions {
    std::string event_id;
    std::string source_id;
    std::string provider;
    std::string model;
    std::string privacy_mode;
    std::size_t offset{0};
    std::size_t limit{100};
};

struct VlmObservationQueryResult {
    bool file_exists{false};
    std::vector<std::string> observations_json;
    std::size_t offset{0};
    std::size_t limit{100};
    std::size_t next_offset{0};
    bool has_more{false};
    bool truncated{false};
    std::uint64_t matched_observations{0};
    std::uint64_t skipped_corrupt_lines{0};
};

struct VlmSummarySearchOptions {
    std::string query;
    std::string source_id;
    std::string privacy_mode;
    std::size_t offset{0};
    std::size_t limit{25};
};

class FileVlmObservationStore final {
public:
    explicit FileVlmObservationStore(std::string path);
    bool Store(const VlmObservationSidecar& observation, std::string* error_message);

private:
    std::string path_;
};

std::string DefaultVlmObservationStorePath();
std::string VlmObservationSidecarJson(const VlmObservationSidecar& observation);
bool QueryVlmObservations(const std::string& path,
                          const VlmObservationQueryOptions& options,
                          VlmObservationQueryResult* result,
                          std::string* error_message);
bool BuildVlmSummarySearchCandidatesJson(const std::string& path,
                                         const VlmSummarySearchOptions& options,
                                         std::string* body,
                                         std::string* error_message);
std::string BuildVlmObservationCorrelationReportJson(const std::string& event_record_json,
                                                     const std::string& observation_json);

}  // namespace analysis
