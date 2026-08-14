// 파일 요약: canonical VLM observation store를 dependency-free application DTO로 매핑한다.
#include "ingress/vlm_observation_application_service.h"

#include "analysis/vlm_observation_store.h"

namespace ingress {

bool QueryVlmObservationStore(const VlmObservationQueryRequest& request,
                              VlmObservationQueryView* output,
                              std::string* error_message) {
    if (output == nullptr) {
        if (error_message != nullptr) {
            *error_message = "VLM observation query output is required";
        }
        return false;
    }
    *output = VlmObservationQueryView{};
    analysis::VlmObservationQueryOptions options;
    options.event_id = request.event_id;
    options.source_id = request.source_id;
    options.provider = request.provider;
    options.model = request.model;
    options.privacy_mode = request.privacy_mode;
    options.offset = request.offset;
    options.limit = request.limit;
    analysis::VlmObservationQueryResult result;
    const bool ok = analysis::QueryVlmObservations(
        analysis::DefaultVlmObservationStorePath(), options, &result, error_message);
    output->file_exists = result.file_exists;
    output->observations_json = result.observations_json;
    output->offset = result.offset;
    output->limit = result.limit;
    output->next_offset = result.next_offset;
    output->has_more = result.has_more;
    output->truncated = result.truncated;
    output->matched_observations = result.matched_observations;
    output->skipped_corrupt_lines = result.skipped_corrupt_lines;
    return ok;
}

bool BuildVlmSummaryCandidates(const VlmSummarySearchRequest& request,
                               std::string* body,
                               std::string* error_message) {
    analysis::VlmSummarySearchOptions options;
    options.query = request.query;
    options.source_id = request.source_id;
    options.privacy_mode = request.privacy_mode;
    options.offset = request.offset;
    options.limit = request.limit;
    return analysis::BuildVlmSummarySearchCandidatesJson(
        analysis::DefaultVlmObservationStorePath(), options, body, error_message);
}

bool BuildVlmRuleSuggestionCandidates(const VlmRuleSuggestionRequest& request,
                                      std::string* body,
                                      std::string* error_message) {
    analysis::VlmRuleSuggestionOptions options;
    options.source_id = request.source_id;
    options.privacy_mode = request.privacy_mode;
    options.suggestion_kind = request.suggestion_kind;
    options.offset = request.offset;
    options.limit = request.limit;
    return analysis::BuildVlmRuleSuggestionCandidatesJson(
        analysis::DefaultVlmObservationStorePath(), options, body, error_message);
}

}  // namespace ingress
