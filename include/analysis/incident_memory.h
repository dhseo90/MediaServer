// 파일 요약: v2.5.0 Semantic Incident Memory용 local text projection 계약을 선언한다.
// 동작 요약: EventRecord/audit/source health/alert dry-run 입력을 redacted searchable document로 변환한다.
#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace analysis {

struct IncidentProjectionField {
    std::string name;
    std::string value;
};

struct IncidentProjectionDocument {
    std::string schema{"media-server.incident-text-projection.v1"};
    std::string document_id;
    std::string source_kind;
    std::string record_id;
    std::string event_id;
    std::string incident_id;
    std::string source_id;
    std::int64_t timestamp_ms{0};
    std::string title;
    std::string summary;
    std::string searchable_text;
    std::vector<std::string> tokens;
    std::vector<IncidentProjectionField> fields;
    std::vector<std::string> redacted_fields;
    bool redaction_applied{false};
};

IncidentProjectionDocument ProjectEventRecordIncidentText(const std::string& event_record_json);
IncidentProjectionDocument ProjectOpsAuditIncidentText(const std::string& audit_record_json);
IncidentProjectionDocument ProjectSourceHealthIncidentText(const std::string& source_health_json);
IncidentProjectionDocument ProjectAlertDryRunIncidentText(const std::string& alert_dry_run_json);

std::vector<std::string> IncidentProjectionTokens(const std::string& text);
std::string IncidentProjectionDocumentJson(const IncidentProjectionDocument& document);
bool IncidentProjectionContainsForbiddenMaterial(const std::string& value);

}  // namespace analysis
