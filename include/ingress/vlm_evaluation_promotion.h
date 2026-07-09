#pragma once

#include <string>

namespace ingress {

struct VlmEvaluationPromotionRequest {
    std::string candidate_id;
    std::string expected_catalog_revision;
    std::string expected_provenance_digest;
    std::string selected_option_id;
    std::string model;
    std::string prompt_profile_id;
    std::string prompt_profile_version;
    std::string prompt_profile_language;
    bool client_declared_result_fields{false};
};

struct VlmEvaluationPromotionResult {
    bool accepted{false};
    std::string evaluation_status;
    std::string canonical_evaluation_json;
    std::string error;
};

const char* VlmEvaluationCatalogRevision();
std::string VlmEvaluationResultWorkflowJson();
VlmEvaluationPromotionResult ValidateVlmEvaluationPromotion(
    const VlmEvaluationPromotionRequest& request);

}  // namespace ingress
