// 파일 요약: Semantic Incident Memory의 redacted text projection 순수 로직을 구현한다.
// 동작 요약: 외부 Event POST/WebRTC/SSE/WS schema를 건드리지 않고 local-only 검색 문서를 만든다.
#include "analysis/incident_memory.h"

#include <algorithm>
#include <cctype>
#include <optional>
#include <set>
#include <sstream>
#include <utility>

namespace analysis {
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

std::string LowerAscii(std::string value) {
    for (char& ch : value) {
        ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
    }
    return value;
}

std::string JsonEscape(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '\\':
                out += "\\\\";
                break;
            case '"':
                out += "\\\"";
                break;
            case '\n':
                out += "\\n";
                break;
            case '\r':
                out += "\\r";
                break;
            case '\t':
                out += "\\t";
                break;
            default:
                out.push_back(ch);
                break;
        }
    }
    return out;
}

void SkipWhitespace(const std::string& text, std::size_t* pos) {
    while (pos != nullptr && *pos < text.size() &&
           std::isspace(static_cast<unsigned char>(text[*pos])) != 0) {
        ++(*pos);
    }
}

bool ParseJsonString(const std::string& text, std::size_t* pos, std::string* decoded = nullptr) {
    if (pos == nullptr || *pos >= text.size() || text[*pos] != '"') {
        return false;
    }
    ++(*pos);
    bool escaped = false;
    std::string out;
    for (; *pos < text.size(); ++(*pos)) {
        const char ch = text[*pos];
        if (escaped) {
            switch (ch) {
                case 'n':
                    out.push_back('\n');
                    break;
                case 'r':
                    out.push_back('\r');
                    break;
                case 't':
                    out.push_back('\t');
                    break;
                case '"':
                case '\\':
                case '/':
                    out.push_back(ch);
                    break;
                default:
                    out.push_back(ch);
                    break;
            }
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            ++(*pos);
            if (decoded != nullptr) {
                *decoded = std::move(out);
            }
            return true;
        }
        out.push_back(ch);
    }
    return false;
}

bool SkipJsonValue(const std::string& text, std::size_t* pos);

bool SkipDelimitedValue(const std::string& text,
                        std::size_t* pos,
                        const char open_ch,
                        const char close_ch) {
    if (pos == nullptr || *pos >= text.size() || text[*pos] != open_ch) {
        return false;
    }
    int depth = 0;
    for (; *pos < text.size(); ++(*pos)) {
        const char ch = text[*pos];
        if (ch == '"') {
            if (!ParseJsonString(text, pos)) {
                return false;
            }
            --(*pos);
            continue;
        }
        if (ch == open_ch) {
            ++depth;
        } else if (ch == close_ch) {
            --depth;
            if (depth == 0) {
                ++(*pos);
                return true;
            }
        }
    }
    return false;
}

bool SkipJsonValue(const std::string& text, std::size_t* pos) {
    if (pos == nullptr) {
        return false;
    }
    SkipWhitespace(text, pos);
    if (*pos >= text.size()) {
        return false;
    }
    const char ch = text[*pos];
    if (ch == '"') {
        return ParseJsonString(text, pos);
    }
    if (ch == '{') {
        return SkipDelimitedValue(text, pos, '{', '}');
    }
    if (ch == '[') {
        return SkipDelimitedValue(text, pos, '[', ']');
    }
    const std::size_t start = *pos;
    while (*pos < text.size() && text[*pos] != ',' && text[*pos] != '}' && text[*pos] != ']') {
        ++(*pos);
    }
    return *pos > start;
}

std::optional<std::string> ExtractJsonValue(const std::string& json, const std::string& field) {
    std::size_t pos = 0;
    SkipWhitespace(json, &pos);
    if (pos >= json.size() || json[pos] != '{') {
        return std::nullopt;
    }
    ++pos;
    while (pos < json.size()) {
        SkipWhitespace(json, &pos);
        if (pos < json.size() && json[pos] == '}') {
            return std::nullopt;
        }
        std::string key;
        if (!ParseJsonString(json, &pos, &key)) {
            return std::nullopt;
        }
        SkipWhitespace(json, &pos);
        if (pos >= json.size() || json[pos] != ':') {
            return std::nullopt;
        }
        ++pos;
        SkipWhitespace(json, &pos);
        const std::size_t value_start = pos;
        if (!SkipJsonValue(json, &pos)) {
            return std::nullopt;
        }
        if (key == field) {
            return json.substr(value_start, pos - value_start);
        }
        SkipWhitespace(json, &pos);
        if (pos < json.size() && json[pos] == ',') {
            ++pos;
            continue;
        }
    }
    return std::nullopt;
}

std::optional<std::string> ExtractString(const std::string& json, const std::string& field) {
    const auto value = ExtractJsonValue(json, field);
    if (!value.has_value()) {
        return std::nullopt;
    }
    std::size_t pos = 0;
    SkipWhitespace(*value, &pos);
    std::string decoded;
    if (!ParseJsonString(*value, &pos, &decoded)) {
        return std::nullopt;
    }
    SkipWhitespace(*value, &pos);
    return pos == value->size() ? std::optional<std::string>(decoded) : std::nullopt;
}

std::optional<std::int64_t> ExtractInt64(const std::string& json, const std::string& field) {
    const auto value = ExtractJsonValue(json, field);
    if (!value.has_value()) {
        return std::nullopt;
    }
    const std::string trimmed = Trim(*value);
    if (trimmed.empty() || trimmed.front() == '"') {
        return std::nullopt;
    }
    std::size_t consumed = 0;
    try {
        const std::int64_t parsed = std::stoll(trimmed, &consumed, 10);
        return consumed == trimmed.size() ? std::optional<std::int64_t>(parsed) : std::nullopt;
    } catch (...) {
        return std::nullopt;
    }
}

std::optional<bool> ExtractBool(const std::string& json, const std::string& field) {
    const auto value = ExtractJsonValue(json, field);
    if (!value.has_value()) {
        return std::nullopt;
    }
    const std::string trimmed = LowerAscii(Trim(*value));
    if (trimmed == "true") {
        return true;
    }
    if (trimmed == "false") {
        return false;
    }
    return std::nullopt;
}

bool StartsWithIncidentId(const std::string& value) {
    return value.rfind("incident:", 0) == 0;
}

std::string FallbackIncidentId(const std::string& event_id,
                               const std::string& source_kind,
                               const std::string& document_id) {
    if (!event_id.empty()) {
        return "incident:" + event_id;
    }
    if (source_kind == "source-health") {
        return document_id;
    }
    return "";
}

bool SensitiveKey(const std::string& key) {
    const std::string lowered = LowerAscii(key);
    for (const char* needle : {
             "sourceurl",
             "developerurl",
             "rawjson",
             "debugcounters",
             "bboxdiagnostics",
             "password",
             "token",
             "secret",
             "credential",
             "endpoint",
             "modelpath",
             "modelchecksum",
             "rawprompt",
             "rawresponse",
             "provider",
         }) {
        if (lowered.find(needle) != std::string::npos) {
            return true;
        }
    }
    return false;
}

std::string RedactionCategory(const std::string& key, const std::string& value) {
    const std::string lowered = LowerAscii(key + " " + value);
    if (lowered.find("sourceurl") != std::string::npos ||
        lowered.find("developerurl") != std::string::npos ||
        lowered.find("rtsp://") != std::string::npos ||
        lowered.find("rtsps://") != std::string::npos ||
        lowered.find("whep://") != std::string::npos ||
        lowered.find("wheps://") != std::string::npos) {
        return "source-locator";
    }
    if (lowered.find("debug") != std::string::npos ||
        lowered.find("bboxdiagnostics") != std::string::npos) {
        return "debug-material";
    }
    if (lowered.find("password") != std::string::npos ||
        lowered.find("credential") != std::string::npos ||
        lowered.find("secret") != std::string::npos ||
        lowered.find("token") != std::string::npos ||
        lowered.find("endpoint") != std::string::npos) {
        return "auth-material";
    }
    if (lowered.find("model") != std::string::npos ||
        lowered.find(".onnx") != std::string::npos ||
        lowered.find(".engine") != std::string::npos ||
        lowered.find(".pt") != std::string::npos) {
        return "model-material";
    }
    if (lowered.find("rawprompt") != std::string::npos ||
        lowered.find("rawresponse") != std::string::npos ||
        lowered.find("provider") != std::string::npos) {
        return "provider-material";
    }
    return "restricted-material";
}

void AddRedaction(IncidentProjectionDocument* document, const std::string& category) {
    if (document == nullptr || category.empty()) {
        return;
    }
    if (std::find(document->redacted_fields.begin(), document->redacted_fields.end(), category) ==
        document->redacted_fields.end()) {
        document->redacted_fields.push_back(category);
    }
    document->redaction_applied = true;
}

bool SafeTextValue(const std::string& key,
                   const std::string& value,
                   IncidentProjectionDocument* document) {
    if (value.empty()) {
        return false;
    }
    if (SensitiveKey(key) || IncidentProjectionContainsForbiddenMaterial(value)) {
        AddRedaction(document, RedactionCategory(key, value));
        return false;
    }
    return true;
}

void AddField(IncidentProjectionDocument* document,
              const std::string& key,
              const std::string& value) {
    if (document == nullptr || !SafeTextValue(key, value, document)) {
        return;
    }
    document->fields.push_back({key, value});
}

void AddFieldFromString(IncidentProjectionDocument* document,
                        const std::string& json,
                        const std::string& field,
                        const std::string& label) {
    AddField(document, label, ExtractString(json, field).value_or(""));
}

void NoteRawRedactions(IncidentProjectionDocument* document, const std::string& json) {
    for (const char* needle : {
             "sourceUrl",
             "developerUrl",
             "debugCounters",
             "bboxDiagnostics",
             "password",
             "token",
             "secret",
             "credential",
             "endpoint",
             "modelPath",
             "modelChecksum",
             "rawPrompt",
             "rawResponse",
             "providerCredential",
         }) {
        if (json.find(needle) != std::string::npos) {
            AddRedaction(document, RedactionCategory(needle, ""));
        }
    }
    if (IncidentProjectionContainsForbiddenMaterial(json)) {
        AddRedaction(document, RedactionCategory("", json));
    }
}

void BuildTextFields(IncidentProjectionDocument* document) {
    if (document == nullptr) {
        return;
    }
    std::ostringstream out;
    auto append = [&](const std::string& label, const std::string& value) {
        if (value.empty()) {
            return;
        }
        if (out.tellp() > 0) {
            out << "\n";
        }
        out << label << " " << value;
    };
    append("title", document->title);
    append("summary", document->summary);
    append("sourceKind", document->source_kind);
    append("recordId", document->record_id);
    append("eventId", document->event_id);
    append("incidentId", document->incident_id);
    append("sourceId", document->source_id);
    for (const auto& field : document->fields) {
        append(field.name, field.value);
    }
    document->searchable_text = out.str();
    document->tokens = IncidentProjectionTokens(document->searchable_text);
}

IncidentProjectionDocument FinalizeDocument(IncidentProjectionDocument document,
                                            const std::string& raw_json) {
    if (document.incident_id.empty()) {
        document.incident_id =
            FallbackIncidentId(document.event_id, document.source_kind, document.document_id);
    }
    NoteRawRedactions(&document, raw_json);
    std::sort(document.redacted_fields.begin(), document.redacted_fields.end());
    BuildTextFields(&document);
    return document;
}

std::string RequiredString(const std::string& json,
                           const std::string& field,
                           const std::string& fallback) {
    std::string value = Trim(ExtractString(json, field).value_or(""));
    return value.empty() ? fallback : value;
}

void AppendJsonStringField(std::ostringstream& out,
                           bool* first,
                           const std::string& name,
                           const std::string& value) {
    if (first != nullptr && !*first) {
        out << ",";
    }
    if (first != nullptr) {
        *first = false;
    }
    out << "\"" << JsonEscape(name) << "\":\"" << JsonEscape(value) << "\"";
}

}  // namespace

bool IncidentProjectionContainsForbiddenMaterial(const std::string& value) {
    const std::string lowered = LowerAscii(value);
    for (const char* needle : {
             "rtsp://",
             "rtsps://",
             "whep://",
             "wheps://",
             "sourceurl",
             "developerurl",
             "debugcounters",
             "bbox diagnostics",
             "bboxdiagnostics",
             "password",
             "token",
             "secret",
             "credential",
             "passwordhash",
             "tokenhash",
             "modelpath",
             "modelchecksum",
             "raw json",
             "rawjson",
             "rawprompt",
             "rawresponse",
             "/models/",
             "\\models\\",
             ".onnx",
             ".engine",
             ".pt",
             "https://example.invalid",
         }) {
        if (lowered.find(needle) != std::string::npos) {
            return true;
        }
    }
    return false;
}

std::vector<std::string> IncidentProjectionTokens(const std::string& text) {
    std::set<std::string> tokens;
    std::string token;
    auto flush = [&]() {
        if (token.size() >= 2) {
            tokens.insert(token);
        }
        token.clear();
    };
    for (const unsigned char ch : text) {
        if (std::isalnum(ch) != 0) {
            token.push_back(static_cast<char>(std::tolower(ch)));
        } else {
            flush();
        }
    }
    flush();
    return {tokens.begin(), tokens.end()};
}

IncidentProjectionDocument ProjectEventRecordIncidentText(const std::string& event_record_json) {
    IncidentProjectionDocument document;
    document.source_kind = "event-record";
    document.event_id = RequiredString(event_record_json, "eventId", "unknown-event");
    document.record_id = document.event_id;
    document.document_id = "event-record:" + document.event_id;
    document.source_id = RequiredString(event_record_json, "streamId", "");
    document.timestamp_ms = ExtractInt64(event_record_json, "startTime").value_or(
        ExtractInt64(event_record_json, "updateTime").value_or(0));
    const std::string event_type = RequiredString(event_record_json, "eventType", "event");
    const std::string status = RequiredString(event_record_json, "status", "unknown");
    const std::string class_name = RequiredString(event_record_json, "className", "");
    document.title = "EventRecord " + event_type + " " + status;
    document.summary = class_name.empty() ? event_type : event_type + " " + class_name;
    AddField(&document, "eventType", event_type);
    AddField(&document, "status", status);
    AddFieldFromString(&document, event_record_json, "channelId", "channelId");
    AddFieldFromString(&document, event_record_json, "className", "className");
    AddFieldFromString(&document, event_record_json, "zoneId", "zoneId");
    AddFieldFromString(&document, event_record_json, "lineId", "lineId");
    AddFieldFromString(&document, event_record_json, "scenarioName", "scenarioName");
    AddFieldFromString(&document, event_record_json, "scenarioPhase", "scenarioPhase");
    if (const auto track_id = ExtractInt64(event_record_json, "trackId"); track_id.has_value()) {
        AddField(&document, "trackId", std::to_string(*track_id));
    }
    return FinalizeDocument(std::move(document), event_record_json);
}

IncidentProjectionDocument ProjectOpsAuditIncidentText(const std::string& audit_record_json) {
    IncidentProjectionDocument document;
    document.source_kind = "ops-audit";
    document.record_id = RequiredString(audit_record_json, "id", "unknown-audit");
    document.document_id = "ops-audit:" + document.record_id;
    document.timestamp_ms = ExtractInt64(audit_record_json, "receivedAtMs").value_or(
        ExtractInt64(audit_record_json, "at").value_or(0));
    const std::string action = RequiredString(audit_record_json, "action", "audit");
    const std::string target = RequiredString(audit_record_json, "target", "");
    if (StartsWithIncidentId(target)) {
        document.incident_id = target;
        document.event_id = target.substr(std::string("incident:").size());
    }
    document.title = "Ops audit " + action;
    document.summary = RequiredString(audit_record_json, "summary", action);
    AddField(&document, "action", action);
    AddField(&document, "target", target);
    AddFieldFromString(&document, audit_record_json, "area", "area");
    AddFieldFromString(&document, audit_record_json, "actor", "actor");
    AddFieldFromString(&document, audit_record_json, "role", "role");
    if (const auto after = ExtractJsonValue(audit_record_json, "after"); after.has_value()) {
        AddFieldFromString(&document, *after, "incidentStatus", "incidentStatus");
        AddFieldFromString(&document, *after, "classification", "classification");
        AddFieldFromString(&document, *after, "note", "note");
    }
    return FinalizeDocument(std::move(document), audit_record_json);
}

IncidentProjectionDocument ProjectSourceHealthIncidentText(const std::string& source_health_json) {
    IncidentProjectionDocument document;
    document.source_kind = "source-health";
    document.source_id = RequiredString(source_health_json, "sourceId", "unknown-source");
    const std::string status = RequiredString(source_health_json, "status", "unknown");
    const std::string reason = RequiredString(source_health_json, "reason", "unspecified");
    document.record_id = document.source_id + ":" + status + ":" + reason;
    document.document_id = "source-health:" + document.record_id;
    document.incident_id = document.document_id;
    document.title = "Source health " + status;
    document.summary = RequiredString(source_health_json, "summary", reason);
    AddField(&document, "status", status);
    AddField(&document, "reason", reason);
    if (const auto last_frame = ExtractInt64(source_health_json, "lastFrameAgeMs"); last_frame.has_value()) {
        AddField(&document, "lastFrameAgeMs", std::to_string(*last_frame));
    }
    if (const auto last_metadata = ExtractInt64(source_health_json, "lastMetadataAgeMs");
        last_metadata.has_value()) {
        AddField(&document, "lastMetadataAgeMs", std::to_string(*last_metadata));
    }
    return FinalizeDocument(std::move(document), source_health_json);
}

IncidentProjectionDocument ProjectAlertDryRunIncidentText(const std::string& alert_dry_run_json) {
    IncidentProjectionDocument document;
    document.source_kind = "alert-dry-run";
    document.record_id = RequiredString(alert_dry_run_json, "id", "unknown-alert-dry-run");
    document.document_id = "alert-dry-run:" + document.record_id;
    document.event_id = RequiredString(alert_dry_run_json, "eventId", "");
    std::string audit_action = "alert-delivery-dry-run";
    if (const auto audit = ExtractJsonValue(alert_dry_run_json, "audit"); audit.has_value()) {
        audit_action = ExtractString(*audit, "action").value_or(audit_action);
    }
    const std::string status = RequiredString(alert_dry_run_json, "status", "dry-run");
    document.title = "Alert delivery dry-run";
    document.summary = audit_action + " " + status;
    AddField(&document, "action", audit_action);
    AddField(&document, "status", status);
    AddFieldFromString(&document, alert_dry_run_json, "deliveryId", "deliveryId");
    AddFieldFromString(&document, alert_dry_run_json, "transport", "transport");
    if (const auto external = ExtractBool(alert_dry_run_json, "externalDeliveryPerformed");
        external.has_value()) {
        AddField(&document,
                 "externalDeliveryPerformed",
                 *external ? std::string("true") : std::string("false"));
    }
    return FinalizeDocument(std::move(document), alert_dry_run_json);
}

std::string IncidentProjectionDocumentJson(const IncidentProjectionDocument& document) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"" << JsonEscape(document.schema) << "\","
        << "\"documentId\":\"" << JsonEscape(document.document_id) << "\","
        << "\"sourceKind\":\"" << JsonEscape(document.source_kind) << "\","
        << "\"recordId\":\"" << JsonEscape(document.record_id) << "\","
        << "\"eventId\":\"" << JsonEscape(document.event_id) << "\","
        << "\"incidentId\":\"" << JsonEscape(document.incident_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(document.source_id) << "\","
        << "\"timestampMs\":" << document.timestamp_ms << ","
        << "\"title\":\"" << JsonEscape(document.title) << "\","
        << "\"summary\":\"" << JsonEscape(document.summary) << "\","
        << "\"searchableText\":\"" << JsonEscape(document.searchable_text) << "\","
        << "\"terms\":[";
    for (std::size_t index = 0; index < document.tokens.size(); ++index) {
        if (index > 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(document.tokens[index]) << "\"";
    }
    out << "],\"fields\":{";
    bool first = true;
    for (const auto& field : document.fields) {
        AppendJsonStringField(out, &first, field.name, field.value);
    }
    out << "},\"redactionApplied\":" << (document.redaction_applied ? "true" : "false")
        << ",\"redactedFields\":[";
    for (std::size_t index = 0; index < document.redacted_fields.size(); ++index) {
        if (index > 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(document.redacted_fields[index]) << "\"";
    }
    out << "]}";
    return out.str();
}

}  // namespace analysis
