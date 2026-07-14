// 파일 용도: VLM incident-to-rule provenance의 구조와 server-record readback을 검증한다.
// 동작 요약: duplicate/nested authority, forged record, auto-apply, route/id, privacy material을 저장 전에 거부한다.
#include "ingress/vlm_incident_rule_provenance.h"

#include "analysis/vlm_observation_store.h"
#include "core/strict_json.h"

#include <cctype>
#include <string>

namespace ingress {

namespace {

std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

}  // namespace

bool ValidateVlmIncidentRuleProvenanceContract(const std::string& body,
                                               const std::string& rule_id,
                                               std::string* error_message) {
    const auto set_error = [error_message](const std::string& message) {
        if (error_message != nullptr) {
            *error_message = message;
        }
    };
    StrictJsonObjectDocument rule_document;
    std::string parse_error;
    if (!ParseStrictJsonObjectDocument(body, &rule_document, &parse_error)) {
        set_error("rule JSON is invalid: " + parse_error);
        return false;
    }
    if (!StrictJsonHasTopLevelField(rule_document, "vlmProvenance")) {
        if (StrictJsonContainsKey(rule_document, "vlmProvenance")) {
            set_error("rule vlmProvenance must be top-level");
            return false;
        }
        return true;
    }
    const auto provenance = StrictJsonObjectField(rule_document, "vlmProvenance");
    if (!provenance.has_value()) {
        set_error("rule vlmProvenance must be a JSON object");
        return false;
    }
    StrictJsonObjectDocument provenance_document;
    if (!ParseStrictJsonObjectDocument(*provenance, &provenance_document, &parse_error)) {
        set_error("rule vlmProvenance JSON is invalid: " + parse_error);
        return false;
    }
    if (StrictJsonStringField(provenance_document, "schema").value_or("") !=
        "media-server.vlm-incident-to-rule-provenance.v1") {
        set_error("rule vlmProvenance schema is invalid");
        return false;
    }
    const auto event_source = StrictJsonObjectField(provenance_document, "eventSource");
    const auto candidate_source = StrictJsonObjectField(provenance_document, "candidateSource");
    const auto evaluation_source = StrictJsonObjectField(provenance_document, "evaluationSource");
    const auto generated_rule = StrictJsonObjectField(provenance_document, "generatedRule");
    if (!event_source.has_value() || !candidate_source.has_value() ||
        !evaluation_source.has_value() || !generated_rule.has_value()) {
        set_error("rule vlmProvenance requires eventSource, candidateSource, evaluationSource, and generatedRule");
        return false;
    }
    StrictJsonObjectDocument event_source_document;
    StrictJsonObjectDocument candidate_source_document;
    StrictJsonObjectDocument evaluation_source_document;
    StrictJsonObjectDocument generated_rule_document;
    if (!ParseStrictJsonObjectDocument(*event_source, &event_source_document, &parse_error) ||
        !ParseStrictJsonObjectDocument(*candidate_source, &candidate_source_document, &parse_error) ||
        !ParseStrictJsonObjectDocument(*evaluation_source, &evaluation_source_document, &parse_error) ||
        !ParseStrictJsonObjectDocument(*generated_rule, &generated_rule_document, &parse_error)) {
        set_error("rule vlmProvenance nested JSON is invalid: " + parse_error);
        return false;
    }
    for (const char* field : {"eventId", "observationId", "sourceId", "sourceSchema"}) {
        if (Trim(StrictJsonStringField(event_source_document, field).value_or("")).empty()) {
            set_error(std::string("rule vlmProvenance eventSource.") + field + " is required");
            return false;
        }
    }
    for (const char* field : {"candidateId", "proposedRuleKind", "source", "sourceSchema", "targetRoute"}) {
        if (Trim(StrictJsonStringField(candidate_source_document, field).value_or("")).empty()) {
            set_error(std::string("rule vlmProvenance candidateSource.") + field + " is required");
            return false;
        }
    }
    if (!StrictJsonBoolField(candidate_source_document, "manualReviewRequired").value_or(false) ||
        StrictJsonBoolField(candidate_source_document, "autoApply").value_or(true)) {
        set_error("rule vlmProvenance candidate must remain manual-review and no-auto-apply");
        return false;
    }
    for (const char* field : {"status", "source", "provider", "model", "promptProfile", "privacyMode"}) {
        if (Trim(StrictJsonStringField(evaluation_source_document, field).value_or("")).empty()) {
            set_error(std::string("rule vlmProvenance evaluationSource.") + field + " is required");
            return false;
        }
    }
    if (StrictJsonBoolField(evaluation_source_document, "evaluationExecuted").value_or(true)) {
        set_error("rule vlmProvenance must not claim an unverified evaluation execution");
        return false;
    }
    if (!analysis::ValidateVlmIncidentRuleProvenanceServerRecords(*event_source, *candidate_source, *evaluation_source, error_message)) return false;
    const std::string generated_rule_id =
        Trim(StrictJsonStringField(generated_rule_document, "id").value_or(""));
    if (generated_rule_id != rule_id) {
        set_error("generated rule id must match provenance");
        return false;
    }
    const std::string expected_route = "/lab/analysis/rules/" + rule_id;
    if (Trim(StrictJsonStringField(generated_rule_document, "saveApiRoute").value_or("")) != expected_route) {
        set_error("generated rule save API route must match rule id");
        return false;
    }
    if (StrictJsonStringField(generated_rule_document, "saveMethod").value_or("") != "PUT" ||
        !StrictJsonBoolField(generated_rule_document, "manualSaveRequired").value_or(false)) {
        set_error("generated rule provenance requires manual PUT save");
        return false;
    }
    for (const char* forbidden : {"credential", "sourceUrl", "rawPrompt", "rawResponse", "rawFrameBytes"}) {
        if (StrictJsonContainsKey(provenance_document, forbidden)) {
            set_error(std::string("rule vlmProvenance must not include ") + forbidden);
            return false;
        }
    }
    return true;
}

}  // namespace ingress
