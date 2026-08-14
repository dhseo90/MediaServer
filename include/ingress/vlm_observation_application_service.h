// 파일 요약: transport가 analysis 구현 타입 없이 VLM observation을 조회하는 application 경계다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace ingress {

struct VlmObservationQueryRequest {
    std::string event_id;
    std::string source_id;
    std::string provider;
    std::string model;
    std::string privacy_mode;
    std::size_t offset{0};
    std::size_t limit{100};
};

struct VlmObservationQueryView {
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

struct VlmSummarySearchRequest {
    std::string query;
    std::string source_id;
    std::string privacy_mode;
    std::size_t offset{0};
    std::size_t limit{25};
};

struct VlmRuleSuggestionRequest {
    std::string source_id;
    std::string privacy_mode;
    std::string suggestion_kind;
    std::size_t offset{0};
    std::size_t limit{25};
};

bool QueryVlmObservationStore(const VlmObservationQueryRequest& request,
                              VlmObservationQueryView* output,
                              std::string* error_message);
bool BuildVlmSummaryCandidates(const VlmSummarySearchRequest& request,
                               std::string* body,
                               std::string* error_message);
bool BuildVlmRuleSuggestionCandidates(const VlmRuleSuggestionRequest& request,
                                      std::string* body,
                                      std::string* error_message);

}  // namespace ingress
