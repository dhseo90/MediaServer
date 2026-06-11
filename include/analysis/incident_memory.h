// 파일 요약: v2.5.0 Semantic Incident Memory용 local text projection 계약을 선언한다.
// 동작 요약: EventRecord/audit/source health/alert dry-run 입력을 redacted searchable document로 변환한다.
#pragma once

#include <cstdint>
#include <memory>
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

struct IncidentMemoryIndexConfig {
    std::string sqlite_path;
    std::string jsonl_path;
    bool prefer_sqlite_fts5{true};
    bool force_jsonl_bm25_fallback{false};
};

struct IncidentMemoryIndexReport {
    std::string schema{"media-server.incident-memory-index.v1"};
    std::string backend;
    std::string sqlite_path;
    std::string jsonl_path;
    bool sqlite_fts5_available{false};
    bool fallback_active{false};
    bool model_provider_dependency{false};
    std::size_t document_count{0};
};

struct IncidentMemorySearchOptions {
    std::string query;
    std::size_t limit{10};
};

struct IncidentMemorySearchHit {
    std::string document_id;
    std::string source_kind;
    std::string incident_id;
    std::string source_id;
    std::string title;
    std::string summary;
    double score{0.0};
    std::vector<std::string> matched_terms;
};

class IncidentMemoryIndexImpl;

class IncidentMemoryIndex {
public:
    IncidentMemoryIndex();
    ~IncidentMemoryIndex();

    IncidentMemoryIndex(const IncidentMemoryIndex&) = delete;
    IncidentMemoryIndex& operator=(const IncidentMemoryIndex&) = delete;

    bool Open(const IncidentMemoryIndexConfig& config, std::string* error_message);
    bool Upsert(const IncidentProjectionDocument& document, std::string* error_message);
    bool Search(const IncidentMemorySearchOptions& options,
                std::vector<IncidentMemorySearchHit>* hits,
                std::string* error_message) const;
    IncidentMemoryIndexReport Report() const;

private:
    std::unique_ptr<IncidentMemoryIndexImpl> impl_;
};

IncidentProjectionDocument ProjectEventRecordIncidentText(const std::string& event_record_json);
IncidentProjectionDocument ProjectOpsAuditIncidentText(const std::string& audit_record_json);
IncidentProjectionDocument ProjectSourceHealthIncidentText(const std::string& source_health_json);
IncidentProjectionDocument ProjectAlertDryRunIncidentText(const std::string& alert_dry_run_json);

std::vector<std::string> IncidentProjectionTokens(const std::string& text);
std::string IncidentProjectionDocumentJson(const IncidentProjectionDocument& document);
bool IncidentProjectionContainsForbiddenMaterial(const std::string& value);

}  // namespace analysis
