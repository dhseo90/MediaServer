// 파일 요약: transport가 analysis 구현 타입 없이 incident-memory 투영·검색·privacy를 사용하는 application 경계다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace ingress {

struct IncidentProjectionFieldView {
    std::string name;
    std::string value;
};

struct IncidentMemoryProjectionView {
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
    std::vector<IncidentProjectionFieldView> fields;
    std::vector<std::string> redacted_fields;
    bool redaction_applied{false};
};

struct IncidentMemorySearchRequest {
    std::vector<std::string> event_records_json;
    std::vector<std::string> ops_audit_records_json;
    std::string query;
    std::size_t limit{12};
};

struct IncidentMemorySearchHitView {
    std::string document_id;
    std::string source_kind;
    std::string incident_id;
    std::string source_id;
    std::string title;
    std::string summary;
    double score{0.0};
    std::vector<std::string> matched_terms;
    std::vector<std::string> highlight_fragments;
};

struct IncidentMemorySearchResult {
    std::string backend;
    bool sqlite_fts5_available{false};
    bool fallback_active{false};
    bool model_provider_dependency{false};
    std::size_t document_count{0};
    bool open_succeeded{false};
    bool search_succeeded{false};
    std::vector<IncidentMemorySearchHitView> hits;
};

bool SearchIncidentMemory(const IncidentMemorySearchRequest& request,
                          IncidentMemorySearchResult* output,
                          std::string* error_message);
IncidentMemoryProjectionView ProjectEventRecordForIncidentMemory(const std::string& event_record_json);
bool IsIncidentMemoryValueReleaseSafe(const std::string& value);

}  // namespace ingress
