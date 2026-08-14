// 파일 요약: VLM 평가 후보와 profile 승격 사이의 서버 권위 신뢰 경계를 구현한다.
// 동작 요약: 평가 API와 저장 validator가 같은 immutable catalog를 사용하고 canonical provenance를 생성한다.
#include "ingress/vlm_evaluation_promotion.h"

#include <algorithm>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

namespace ingress {
namespace {

constexpr const char* kCatalogRevision = "v390-add1-03-2026-07-10";
constexpr const char* kWorkflowSchema = "media-server.ops.vlm-evaluation-result-workflow.v1";
constexpr const char* kReportSchema = "media-server.vlm-evaluation-report.v1";
constexpr const char* kProvenanceSchema = "media-server.vlm-evaluation-provenance.v1";
constexpr const char* kWorkflowFixture = "test/fixtures/vlm_evaluation_result_workflow/cases.json";
constexpr const char* kWorkflowFixtureSha256 =
    "0dbd882519707c274f765d5945749a6ba287f63cb85452c4ca3491844f54035f";
constexpr const char* kHarnessFixture = "test/fixtures/vlm_evaluation_harness/cases.json";
constexpr const char* kHarnessFixtureSha256 =
    "686598db4603a8fb209578e34b90fd8856fe872899ac4ab3ea143e1e708a503a";
constexpr const char* kEvaluatorSha256 =
    "31da31cf69464c99940bb0c14f0ccd91284049341fdef19a395126e965c50c12";
constexpr const char* kModelCatalogSha256 =
    "c2e3e513d4afd4b161da3570754acb37825ae68caa717a2e2b7b15aa66b3a4fb";

struct Candidate {
    const char* id;
    const char* selected_option_id;
    const char* model;
    const char* prompt_id;
    const char* prompt_version;
    const char* prompt_language;
    const char* status;
    bool profile_draft_allowed;
    const char* case_ids_json;
    const char* latency_json;
    const char* dimensions_json;
    const char* score_json;
    const char* activation_default;
    bool enabled_default;
    const char* reason;
    const char* provenance_digest;
};

const std::vector<Candidate>& Candidates() {
    static const std::vector<Candidate> candidates{
        {
            "eval-qwen8b-event-review-default",
            "local-qwen3-vl-8b",
            "Qwen/Qwen3-VL-8B-Instruct",
            "event-review-default",
            "v1",
            "ko-en",
            "passed",
            true,
            R"(["line-crossing-ko-ab","intrusion-en-json-stability"])",
            R"({"p50":8200,"p95":9700})",
            R"({"latency":"passed","jsonStability":"passed","explanationQuality":"passed","hallucinationRisk":"passed","languageQuality":"passed"})",
            R"({"total":0.93,"latency":1.0,"jsonStability":1.0,"explanationQuality":0.88,"hallucinationRisk":1.0,"languageQuality":1.0})",
            "pending-evaluation",
            false,
            "Best fixture-passed profile candidate across Korean and English sample events.",
            "910bd13342f8f7f587e4f7e371ee462f1674b599d3328a6882dd7f495db6adca",
        },
        {
            "eval-qwen4b-false-positive-review",
            "local-qwen3-vl-4b",
            "Qwen/Qwen3-VL-4B-Instruct",
            "false-positive-review",
            "v1",
            "ko",
            "review-required",
            true,
            R"(["line-crossing-ko-ab"])",
            R"({"p50":6100,"p95":6100})",
            R"({"latency":"passed","jsonStability":"passed","explanationQuality":"passed","hallucinationRisk":"passed","languageQuality":"review-required"})",
            R"({"total":0.82,"latency":1.0,"jsonStability":1.0,"explanationQuality":0.75,"hallucinationRisk":1.0,"languageQuality":0.5})",
            "pending-evaluation",
            false,
            "Local low-spec fallback can be saved only as review-required until English quality is evaluated.",
            "dd028b2697c381000c66ff94989c033e9edfe093fe512d4f484fa074baf56024",
        },
        {
            "eval-qwen4b-operator-question-review",
            "local-qwen3-vl-4b",
            "Qwen/Qwen3-VL-4B-Instruct",
            "operator-question-review",
            "v1",
            "en",
            "failed",
            false,
            R"(["intrusion-en-json-stability"])",
            R"({"p50":34000,"p95":34000})",
            R"({"latency":"failed","jsonStability":"failed","explanationQuality":"review-required","hallucinationRisk":"failed","languageQuality":"passed"})",
            R"({"total":0.18,"latency":0.0,"jsonStability":0.0,"explanationQuality":0.25,"hallucinationRisk":0.0,"languageQuality":1.0})",
            "disabled",
            false,
            "Invalid JSON, latency threshold miss, and hallucination fixture failure exclude this prompt profile.",
            "595eabd467be4a2d01d166ce69323e35cd3fd063a847f46c8c7a504b91cb9349",
        },
    };
    return candidates;
}

std::string JsonEscape(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '\\': out += "\\\\"; break;
            case '"': out += "\\\""; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: out.push_back(ch); break;
        }
    }
    return out;
}

const Candidate* FindCandidate(const std::string& id) {
    const auto& candidates = Candidates();
    const auto it = std::find_if(candidates.begin(), candidates.end(), [&](const Candidate& item) {
        return id == item.id;
    });
    return it == candidates.end() ? nullptr : &*it;
}

std::string CanonicalProvenanceJson(const Candidate* candidate) {
    std::ostringstream out;
    out << "{\"schema\":\"" << kProvenanceSchema << "\",";
    out << "\"authority\":\"media-server\",";
    out << "\"catalogRevision\":\"" << kCatalogRevision << "\",";
    out << "\"sourceReportSchema\":\"" << kReportSchema << "\",";
    out << "\"workflowFixture\":\"" << kWorkflowFixture << "\",";
    out << "\"workflowFixtureSha256\":\"" << kWorkflowFixtureSha256 << "\",";
    out << "\"harnessFixture\":\"" << kHarnessFixture << "\",";
    out << "\"harnessFixtureSha256\":\"" << kHarnessFixtureSha256 << "\",";
    out << "\"evaluatorSha256\":\"" << kEvaluatorSha256 << "\",";
    out << "\"modelCatalogSha256\":\"" << kModelCatalogSha256 << "\",";
    if (candidate == nullptr) {
        out << "\"candidateId\":null,\"candidateDigest\":null,";
        out << "\"verification\":\"server-no-candidate-not-run\"}";
    } else {
        out << "\"candidateId\":\"" << JsonEscape(candidate->id) << "\",";
        out << "\"candidateDigest\":\"" << candidate->provenance_digest << "\",";
        out << "\"verification\":\"server-candidate-option-model-prompt-revision-digest-binding\"}";
    }
    return out.str();
}

std::string CanonicalEvaluationJson(const Candidate* candidate) {
    std::ostringstream out;
    out << "{\"status\":\"" << (candidate == nullptr ? "not-run" : candidate->status) << "\",";
    out << "\"source\":\"server-verified-evaluation-catalog\",";
    out << "\"workflowSchema\":\"" << kWorkflowSchema << "\",";
    out << "\"sourceReportSchema\":\"" << kReportSchema << "\",";
    if (candidate == nullptr) {
        out << "\"candidateId\":null,\"caseIds\":[],\"dimensions\":{},\"score\":null,";
    } else {
        out << "\"candidateId\":\"" << JsonEscape(candidate->id) << "\",";
        out << "\"caseIds\":" << candidate->case_ids_json << ",";
        out << "\"dimensions\":" << candidate->dimensions_json << ",";
        out << "\"score\":" << candidate->score_json << ",";
    }
    out << "\"provenance\":" << CanonicalProvenanceJson(candidate) << "}";
    return out.str();
}

VlmEvaluationPromotionResult Reject(std::string error) {
    VlmEvaluationPromotionResult result;
    result.error = std::move(error);
    return result;
}

}  // namespace

const char* VlmEvaluationCatalogRevision() {
    return kCatalogRevision;
}

VlmEvaluationPromotionResult ValidateVlmEvaluationPromotion(
    const VlmEvaluationPromotionRequest& request) {
    if (request.client_declared_result_fields) {
        return Reject("VLM profile evaluation accepts candidateId, expectedCatalogRevision, and expectedProvenanceDigest only");
    }
    if (request.candidate_id.empty()) {
        if (!request.expected_catalog_revision.empty() || !request.expected_provenance_digest.empty()) {
            return Reject("VLM profile without an evaluation candidate must not include catalog revision or provenance digest");
        }
        VlmEvaluationPromotionResult result;
        result.accepted = true;
        result.evaluation_status = "not-run";
        result.canonical_evaluation_json = CanonicalEvaluationJson(nullptr);
        return result;
    }
    if (request.expected_catalog_revision != kCatalogRevision) {
        return Reject("VLM evaluation candidate catalog revision is missing or stale");
    }
    const Candidate* candidate = FindCandidate(request.candidate_id);
    if (candidate == nullptr) {
        return Reject("VLM evaluation candidateId is unknown");
    }
    if (request.expected_provenance_digest != candidate->provenance_digest) {
        return Reject("VLM evaluation candidate provenance digest is missing or stale");
    }
    if (!candidate->profile_draft_allowed) {
        return Reject("VLM evaluation candidate is not eligible for profile draft promotion");
    }
    if (request.selected_option_id != candidate->selected_option_id) {
        return Reject("VLM evaluation candidate selectedOptionId does not match server evidence");
    }
    if (request.model != candidate->model) {
        return Reject("VLM evaluation candidate model does not match server evidence");
    }
    if (request.prompt_profile_id != candidate->prompt_id ||
        request.prompt_profile_version != candidate->prompt_version ||
        request.prompt_profile_language != candidate->prompt_language) {
        return Reject("VLM evaluation candidate prompt profile does not match server evidence");
    }
    VlmEvaluationPromotionResult result;
    result.accepted = true;
    result.evaluation_status = candidate->status;
    result.canonical_evaluation_json = CanonicalEvaluationJson(candidate);
    return result;
}

std::string VlmEvaluationResultWorkflowJson() {
    std::ostringstream out;
    out << "{\"schema\":\"" << kWorkflowSchema << "\",";
    out << "\"targetStep\":\"V390-ADD1-03\",";
    out << "\"sourceReportSchema\":\"" << kReportSchema << "\",";
    out << "\"sourceFixture\":\"" << kWorkflowFixture << "\",";
    out << "\"catalogRevision\":\"" << kCatalogRevision << "\",";
    out << "\"status\":\"ready-for-operator-selection\",";
    out << "\"scope\":\"ops-only-server-authoritative-evaluation-promotion\",";
    out << "\"summary\":{\"sampleCases\":2,\"caseCandidates\":4,\"profileCandidates\":3,";
    out << "\"passedProfileCandidates\":1,\"reviewRequiredProfileCandidates\":1,";
    out << "\"failedProfileCandidates\":1,\"recommendedCandidateId\":\"eval-qwen8b-event-review-default\"},";
    out << "\"selectionPolicy\":{\"singleProfileCandidateSelection\":true,";
    out << "\"operatorMustSaveProfile\":true,\"autoActivateSelectedProfile\":false,";
    out << "\"runtimeCallAllowed\":false,\"providerCallAllowed\":false,";
    out << "\"profileDraftMayCopyEvaluationStatus\":false,";
    out << "\"profileSaveAcceptsCandidateReferenceOnly\":true,";
    out << "\"serverDerivesEvaluationAndProvenance\":true},\"profileCandidates\":[";
    const auto& candidates = Candidates();
    for (std::size_t i = 0; i < candidates.size(); ++i) {
        if (i > 0) out << ",";
        const auto& item = candidates[i];
        out << "{\"id\":\"" << item.id << "\",\"selectedOptionId\":\"" << item.selected_option_id << "\",";
        out << "\"model\":\"" << item.model << "\",\"selectedOptionModel\":\"" << item.model << "\",";
        out << "\"promptProfile\":{\"id\":\"" << item.prompt_id << "\",\"version\":\""
            << item.prompt_version << "\",\"language\":\"" << item.prompt_language << "\"},";
        out << "\"caseIds\":" << item.case_ids_json << ",\"latencyMs\":" << item.latency_json << ",";
        out << "\"dimensions\":" << item.dimensions_json << ",\"score\":" << item.score_json << ",";
        out << "\"evaluation\":{\"status\":\"" << item.status
            << "\",\"source\":\"server-verified-evaluation-catalog\"},";
        out << "\"provenanceRef\":{\"catalogRevision\":\"" << kCatalogRevision
            << "\",\"candidateDigest\":\"" << item.provenance_digest << "\"},";
        out << "\"selection\":{\"profileDraftAllowed\":" << (item.profile_draft_allowed ? "true" : "false")
            << ",\"activationDefault\":\"" << item.activation_default << "\",\"enabledDefault\":"
            << (item.enabled_default ? "true" : "false") << ",\"reason\":\"" << JsonEscape(item.reason) << "\"}}";
    }
    out << "],\"caseResults\":[";
    out << "{\"caseId\":\"line-crossing-ko-ab\",\"eventType\":\"line-crossing\",\"language\":\"ko\",";
    out << "\"bestCandidateId\":\"qwen8b-default-ko\",\"candidateIds\":[\"qwen8b-default-ko\",\"qwen4b-fp-ko\"]},";
    out << "{\"caseId\":\"intrusion-en-json-stability\",\"eventType\":\"intrusion-dwell\",\"language\":\"en\",";
    out << "\"bestCandidateId\":\"qwen8b-default-en\",\"candidateIds\":[\"qwen8b-default-en\",\"bad-json-hallucination-en\"]}],";
    out << "\"contractInvariants\":{\"runtimeMode\":\"fixture-captured-output-only\",";
    out << "\"runtimeVlmCallPerformed\":false,\"cloudProviderApiCalled\":false,\"modelArtifactDownloaded\":false,";
    out << "\"sidecarStored\":false,\"eventPostPayloadChanged\":false,\"webrtcDataChannelSchemaChanged\":false,";
    out << "\"sseMetadataSchemaChanged\":false,\"wsMetadataSchemaChanged\":false,";
    out << "\"rtspOrWebrtcMediaPathChanged\":false,\"viewerClientExposureAdded\":false}}";
    return out.str();
}

}  // namespace ingress
