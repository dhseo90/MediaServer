// 파일 요약: WebRTC HTTP 서버의 incident, API JSON, metadata 전송 구현이다.
#include "webrtc_http_server_detail.h"

namespace ingress {

using namespace webrtc_http_server_detail;

namespace webrtc_http_server_detail {

std::string OpsAuditSearchIndexJson() {
    return "{\"caseInsensitive\":true,"
           "\"filters\":[\"area\",\"actor\",\"user\",\"target\",\"action\",\"q\",\"fromMs\",\"toMs\"],"
           "\"fields\":[\"area\",\"actor\",\"role\",\"action\",\"target\",\"summary\",\"before\",\"after\",\"receivedAtMs\"],"
           "\"dateRangeFields\":[\"receivedAtMs\"],"
           "\"interactiveLimitMax\":200,"
           "\"exportLimitMax\":2000}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27854 function
std::string OpsAuditEntriesJson(const WebRtcHttpRuntimeConfig& config,
                                const std::unordered_map<std::string, std::string>& query) {
    const OpsAuditQueryResult result = QueryOpsAuditEntries(config, query);
    std::ostringstream out;
    out << "{\"status\":\"ops-audit\",\"persistent\":true,\"storagePath\":\""
        << JsonEscape(result.storage_path.string()) << "\",\"offset\":" << result.offset
        << ",\"limit\":" << result.limit << ",\"total\":" << result.total
        << ",\"scanned\":" << result.scanned
        << ",\"hasMore\":" << (result.has_more ? "true" : "false")
        << ",\"nextOffset\":" << (result.has_more ? result.offset + static_cast<int>(result.entries.size()) : result.offset)
        << ",\"query\":{\"fromMs\":"
        << (result.from_ms.has_value() ? std::to_string(*result.from_ms) : "null")
        << ",\"toMs\":" << (result.to_ms.has_value() ? std::to_string(*result.to_ms) : "null")
        << "}"
        << ",\"retention\":{\"days\":" << result.retention.retention_days
        << ",\"removed\":" << result.retention.removed
        << ",\"applied\":" << (result.retention.applied ? "true" : "false") << "}"
        << ",\"searchIndex\":" << OpsAuditSearchIndexJson()
        << ",\"entries\":[";
    for (std::size_t i = 0; i < result.entries.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << result.entries[i];
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27883 function
std::string OpsAuditEntriesDiffJson(const WebRtcHttpRuntimeConfig& config,
                                    const std::unordered_map<std::string, std::string>& query) {
    const OpsAuditQueryResult result = QueryOpsAuditEntries(config, query);
    std::ostringstream out;
    out << "{\"status\":\"ops-audit-diff\",\"persistent\":true,\"storagePath\":\""
        << JsonEscape(result.storage_path.string()) << "\",\"retention\":{\"days\":"
        << result.retention.retention_days << ",\"removed\":" << result.retention.removed
        << ",\"applied\":" << (result.retention.applied ? "true" : "false")
        << "},\"query\":{\"fromMs\":"
        << (result.from_ms.has_value() ? std::to_string(*result.from_ms) : "null")
        << ",\"toMs\":" << (result.to_ms.has_value() ? std::to_string(*result.to_ms) : "null")
        << "},\"searchIndex\":" << OpsAuditSearchIndexJson() << ",\"entries\":[";
    for (std::size_t i = 0; i < result.entries.size(); ++i) {
        const std::string& entry = result.entries[i];
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"id\":\"" << JsonEscape(ParseStringField(entry, "id").value_or("")) << "\","
            << "\"at\":\"" << JsonEscape(ParseStringField(entry, "at").value_or("")) << "\","
            << "\"actor\":\"" << JsonEscape(ParseStringField(entry, "actor").value_or("")) << "\","
            << "\"area\":\"" << JsonEscape(ParseStringField(entry, "area").value_or("")) << "\","
            << "\"action\":\"" << JsonEscape(ParseStringField(entry, "action").value_or("")) << "\","
            << "\"target\":\"" << JsonEscape(ParseStringField(entry, "target").value_or("")) << "\","
            << "\"summary\":\"" << JsonEscape(ParseStringField(entry, "summary").value_or("")) << "\","
            << "\"before\":" << ExtractJsonValueField(entry, "before").value_or("null") << ","
            << "\"after\":" << ExtractJsonValueField(entry, "after").value_or("null")
            << "}";
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27916 function
std::string CsvCell(std::string value) {
    std::string out = "\"";
    for (const char ch : value) {
        if (ch == '"') {
            out += "\"\"";
        } else {
            out.push_back(ch);
        }
    }
    out += "\"";
    return out;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27929 function
std::string OpsAuditEntriesCsv(const WebRtcHttpRuntimeConfig& config,
                               const std::unordered_map<std::string, std::string>& query) {
    OpsAuditQueryResult result = QueryOpsAuditEntries(config, query);
    std::ostringstream out;
    out << "id,at,receivedAtMs,actor,role,area,action,target,summary,before,after\n";
    for (const std::string& entry : result.entries) {
        out << CsvCell(ParseStringField(entry, "id").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "at").value_or("")) << ","
            << CsvCell(ExtractJsonValueField(entry, "receivedAtMs").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "actor").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "role").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "area").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "action").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "target").value_or("")) << ","
            << CsvCell(ParseStringField(entry, "summary").value_or("")) << ","
            << CsvCell(ExtractJsonValueField(entry, "before").value_or("null")) << ","
            << CsvCell(ExtractJsonValueField(entry, "after").value_or("null")) << "\n";
    }
    return out.str();
}

bool IsDiagnosticLogKeyCharacter(const char ch) {
    return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') ||
           (ch >= '0' && ch <= '9') || ch == '_' || ch == '-';
}

bool IsDiagnosticLogSpace(const char ch) {
    return ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n';
}

std::string CanonicalDiagnosticLogKey(const std::string_view value) {
    std::string out;
    out.reserve(value.size());
    for (const char ch : value) {
        if (ch == '_' || ch == '-') {
            continue;
        }
        if (ch >= 'A' && ch <= 'Z') {
            out.push_back(static_cast<char>(ch - 'A' + 'a'));
        } else {
            out.push_back(ch);
        }
    }
    return out;
}

bool IsSensitiveDiagnosticLogKey(const std::string_view key) {
    const std::string canonical = CanonicalDiagnosticLogKey(key);
    return canonical.find("password") != std::string::npos ||
           canonical.find("token") != std::string::npos ||
           canonical.find("authorization") != std::string::npos ||
           canonical.find("cookie") != std::string::npos ||
           canonical.find("session") != std::string::npos ||
           canonical.find("secret") != std::string::npos ||
           canonical.find("credential") != std::string::npos ||
           canonical.find("apikey") != std::string::npos;
}

std::size_t ConsumeQuotedDiagnosticLogValue(const std::string& line, const std::size_t quote) {
    std::size_t cursor = quote + 1;
    while (cursor < line.size()) {
        if (line[cursor] == '\\') {
            cursor += 2;
            continue;
        }
        if (line[cursor] == '"') {
            return cursor + 1;
        }
        ++cursor;
    }
    return line.size();
}

std::string RedactDiagnosticLogLine(std::string line) {
    std::size_t cursor = 0;
    while (cursor < line.size()) {
        if (!IsDiagnosticLogKeyCharacter(line[cursor])) {
            ++cursor;
            continue;
        }
        const std::size_t key_begin = cursor;
        while (cursor < line.size() && IsDiagnosticLogKeyCharacter(line[cursor])) {
            ++cursor;
        }
        const std::size_t key_end = cursor;
        if (!IsSensitiveDiagnosticLogKey(std::string_view(line).substr(key_begin, key_end - key_begin))) {
            continue;
        }

        const bool quoted_key = key_begin > 0 && line[key_begin - 1] == '"' &&
                                key_end < line.size() && line[key_end] == '"';
        std::size_t separator = quoted_key ? key_end + 1 : key_end;
        while (separator < line.size() && IsDiagnosticLogSpace(line[separator])) {
            ++separator;
        }
        if (separator >= line.size() || (line[separator] != ':' && line[separator] != '=')) {
            continue;
        }
        std::size_t value_begin = separator + 1;
        while (value_begin < line.size() && IsDiagnosticLogSpace(line[value_begin])) {
            ++value_begin;
        }
        if (value_begin >= line.size()) {
            continue;
        }

        const std::size_t replace_begin = quoted_key ? key_begin - 1 : key_begin;
        const bool quoted_value = line[value_begin] == '"';
        const std::size_t value_end = quoted_value
            ? ConsumeQuotedDiagnosticLogValue(line, value_begin)
            : line.size();
        const std::string replacement = quoted_key && line[separator] == ':' && quoted_value
            ? "\"<redacted>\":\"<redacted>\""
            : "[redacted]";
        line.replace(replace_begin, value_end - replace_begin, replacement);
        cursor = replace_begin + replacement.size();
    }
    return line;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27950 function
std::string OpsDiagnosticLogTailJson(const std::unordered_map<std::string, std::string>& query) {
    const int limit = ParseClampedIntQuery(query, "limit", 80, 1, 500);
    const std::filesystem::path path = std::filesystem::current_path() / ".media_server.log";
    std::ifstream in(path);
    std::vector<std::string> lines;
    std::string line;
    while (std::getline(in, line)) {
        if (static_cast<int>(lines.size()) >= limit) {
            lines.erase(lines.begin());
        }
        lines.push_back(RedactDiagnosticLogLine(Trim(line)));
    }
    std::ostringstream out;
    out << "{\"status\":\"ops-diagnostic-log-tail\","
        << "\"available\":" << (in.bad() ? "false" : (lines.empty() ? "false" : "true")) << ","
        << "\"logPath\":\"" << JsonEscape(path.string()) << "\","
        << "\"limit\":" << limit << ","
        << "\"lines\":[";
    for (std::size_t i = 0; i < lines.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(lines[i]) << "\"";
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27978 function
std::string JsonStringArrayOrDefault(const std::string& body,
                                     const std::string& field,
                                     const std::string& fallback) {
    const auto value = ExtractArrayField(body, field);
    return value.has_value() ? *value : fallback;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27985 function
std::string SourceBulkPayload(const std::string& source_raw,
                              const std::string& source_id,
                              const std::string& display_name,
                              bool enabled,
                              bool allow_duplicate_source) {
    const std::string kind = ParseStringField(source_raw, "kind").value_or("file");
    std::ostringstream out;
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(display_name.empty() ? source_id : display_name) << "\","
        << "\"kind\":\"" << JsonEscape(kind) << "\","
        << "\"enabled\":" << (enabled ? "true" : "false") << ","
        << "\"allowDuplicateSource\":" << (allow_duplicate_source ? "true" : "false") << ","
        << "\"tags\":" << JsonStringArrayOrDefault(source_raw, "tags", "[]") << ","
        << "\"ownerGroup\":\"" << JsonEscape(ParseStringField(source_raw, "ownerGroup").value_or("")) << "\"";
    if (const auto value = ParseStringField(source_raw, "file"); value.has_value()) {
        out << ",\"file\":\"" << JsonEscape(*value) << "\"";
    }
    if (const auto value = ParseStringField(source_raw, "rtspUrl"); value.has_value()) {
        out << ",\"rtspUrl\":\"" << JsonEscape(*value) << "\"";
    }
    if (const auto value = ParseStringField(source_raw, "webrtcSourceId"); value.has_value()) {
        out << ",\"webrtcSourceId\":\"" << JsonEscape(*value) << "\"";
    }
    if (const auto value = ParseStringField(source_raw, "whepUrl"); value.has_value()) {
        out << ",\"whepUrl\":\"" << JsonEscape(*value) << "\"";
    }
    if (const auto value = ParseStringField(source_raw, "httpUrl"); value.has_value()) {
        out << ",\"httpUrl\":\"" << JsonEscape(*value) << "\"";
    }
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28019 function
std::string ViewBulkPayload(const std::string& view_raw,
                            const std::string& source_raw,
                            const std::string& view_id,
                            const std::string& source_id,
                            const std::string& display_name,
                            bool enabled) {
    std::ostringstream out;
    out << "{"
        << "\"viewId\":\"" << JsonEscape(view_id) << "\","
        << "\"displayName\":\"" << JsonEscape(display_name.empty() ? view_id : display_name) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"defaultRuleId\":\"" << JsonEscape(ParseStringField(view_raw, "defaultRuleId").value_or("")) << "\","
        << "\"allowedRuleIds\":" << JsonStringArrayOrDefault(view_raw, "allowedRuleIds", "[]") << ","
        << "\"allowedOverlayModes\":"
        << JsonStringArrayOrDefault(view_raw, "allowedOverlayModes", "[\"raw\",\"va-overlay\",\"va-rule\"]")
        << ","
        << "\"showDashboard\":"
        << (ParseBoolField(view_raw, "showDashboard").value_or(true) ? "true" : "false") << ","
        << "\"showEvents\":" << (ParseBoolField(view_raw, "showEvents").value_or(true) ? "true" : "false")
        << ","
        << "\"showMetadataSummary\":"
        << (ParseBoolField(view_raw, "showMetadataSummary").value_or(true) ? "true" : "false") << ","
        << "\"clientGroups\":" << JsonStringArrayOrDefault(view_raw, "clientGroups", "[]") << ","
        << "\"maxTiles\":" << ParseIntField(view_raw, "maxTiles").value_or(1) << ","
        << "\"enabled\":" << (enabled ? "true" : "false") << "}";
    (void)source_raw;
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28048 function
bool SourceHasPlayableLocator(const std::string& source_raw) {
    const std::string kind = ParseStringField(source_raw, "kind").value_or("file");
    if (kind == "file") return !Trim(ParseStringField(source_raw, "file").value_or("")).empty();
    if (kind == "rtsp") return !Trim(ParseStringField(source_raw, "rtspUrl").value_or("")).empty();
    if (kind == "whep") return !Trim(ParseStringField(source_raw, "whepUrl").value_or("")).empty();
    if (kind == "webrtc") return !Trim(ParseStringField(source_raw, "webrtcSourceId").value_or("")).empty();
    if (kind == "http" || kind == "hls") return !Trim(ParseStringField(source_raw, "httpUrl").value_or("")).empty();
    return !Trim(ParseStringField(source_raw, "url").value_or("")).empty();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28058 function
std::string NextBulkChannelId(std::set<int>* used_ids) {
    int candidate = 1;
    while (used_ids->count(candidate) != 0) {
        ++candidate;
    }
    used_ids->insert(candidate);
    return std::to_string(candidate);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28067 function
std::set<int> CurrentNumericSourceIds() {
    std::set<int> ids;
    const ApplicationServiceResult result = SourceViewApplicationService::Instance().SourcesJson();
    for (const auto& item : ExtractJsonObjectArray(result.body, "sources")) {
        const std::string id = ParseStringField(item, "sourceId").value_or("");
        if (!id.empty() && std::all_of(id.begin(), id.end(), [](char ch) {
                return std::isdigit(static_cast<unsigned char>(ch)) != 0;
            })) {
            ids.insert(std::stoi(id));
        }
    }
    return ids;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28081 function
std::string OpsChannelBulkJson(const std::string& body) {
    const std::string operation =
        Trim(ParseStringField(body, "operation").value_or(ParseStringField(body, "action").value_or("validate")));
    const bool dry_run = ParseBoolField(body, "dryRun").value_or(operation == "validate");
    const auto items = ExtractJsonObjectArray(body, "items");
    std::set<int> used_ids = CurrentNumericSourceIds();
    int ok_count = 0;
    int fail_count = 0;
    std::ostringstream results;
    std::ostringstream audit_targets;
    results << "[";
    audit_targets << "[";
    for (std::size_t index = 0; index < items.size(); ++index) {
        const std::string& item = items[index];
        const std::string source_raw = ExtractObjectField(item, "source").value_or("{}");
        const std::string view_raw = ExtractObjectField(item, "view").value_or("{}");
        const std::string source_id =
            Trim(ParseStringField(item, "sourceId").value_or(ParseStringField(source_raw, "sourceId").value_or("")));
        std::string target_id = source_id;
        const std::string requested_result_id =
            Trim(ParseStringField(item, "resultSourceId").value_or(ParseStringField(item, "rollbackSourceId").value_or("")));
        const std::string rollback_mode = Trim(ParseStringField(item, "rollbackMode").value_or("restore"));
        std::string display_name =
            ParseStringField(view_raw, "displayName").value_or(ParseStringField(source_raw, "displayName").value_or(source_id));
        bool item_ok = true;
        std::string message = "validated";
        std::string result_source_id = source_id;
        std::string result_view_id = ParseStringField(view_raw, "viewId").value_or(source_id);
        bool retryable = false;
        if (source_id.empty()) {
            item_ok = false;
            message = "sourceId is required";
            retryable = true;
        } else if (!SourceHasPlayableLocator(source_raw)) {
            item_ok = false;
            message = "source locator is missing";
            retryable = true;
        } else if (operation == "clone") {
            target_id = NextBulkChannelId(&used_ids);
            display_name = display_name.empty() ? target_id : display_name + " 복제";
            result_source_id = target_id;
            result_view_id = target_id;
        } else if (operation == "rollback") {
            if (rollback_mode == "disable-created") {
                target_id = requested_result_id.empty() ? source_id : requested_result_id;
                result_source_id = target_id;
                result_view_id = target_id;
                display_name = display_name.empty() ? target_id : display_name;
            }
        } else if (operation != "validate" && operation != "disable") {
            item_ok = false;
            message = "unsupported bulk operation";
        }
        if (item_ok && !dry_run && operation == "rollback") {
            if (rollback_mode == "disable-created") {
                const ApplicationServiceResult source_result =
                    SourceViewApplicationService::Instance().UpsertSource(
                        target_id, SourceBulkPayload(source_raw, target_id, display_name, false, true));
                const ApplicationServiceResult view_result =
                    SourceViewApplicationService::Instance().UpsertView(
                        target_id, ViewBulkPayload(view_raw, source_raw, target_id, target_id, display_name, false));
                item_ok = source_result.status >= 200 && source_result.status < 300 &&
                          view_result.status >= 200 && view_result.status < 300;
                message = item_ok ? "rollback-disabled-created" : "rollback disable-created failed";
            } else {
                const ApplicationServiceResult source_result =
                    SourceViewApplicationService::Instance().UpsertSource(source_id, source_raw);
                const ApplicationServiceResult view_result =
                    SourceViewApplicationService::Instance().UpsertView(result_view_id, view_raw);
                item_ok = source_result.status >= 200 && source_result.status < 300 &&
                          view_result.status >= 200 && view_result.status < 300;
                message = item_ok ? "rollback-restored" : "rollback restore failed";
            }
            retryable = !item_ok;
        } else if (item_ok && !dry_run && operation == "disable") {
            const ApplicationServiceResult source_result =
                SourceViewApplicationService::Instance().UpsertSource(
                    source_id, SourceBulkPayload(source_raw, source_id, display_name, false, true));
            const ApplicationServiceResult view_result =
                SourceViewApplicationService::Instance().UpsertView(
                    result_view_id, ViewBulkPayload(view_raw, source_raw, result_view_id, source_id, display_name, false));
            item_ok = source_result.status >= 200 && source_result.status < 300 &&
                      view_result.status >= 200 && view_result.status < 300;
            message = item_ok ? "disabled" : "disable failed";
            retryable = !item_ok;
        } else if (item_ok && !dry_run && operation == "clone") {
            const ApplicationServiceResult source_result =
                SourceViewApplicationService::Instance().UpsertSource(
                    target_id, SourceBulkPayload(source_raw, target_id, display_name, false, true));
            const ApplicationServiceResult view_result =
                SourceViewApplicationService::Instance().UpsertView(
                    target_id, ViewBulkPayload(view_raw, source_raw, target_id, target_id, display_name, false));
            item_ok = source_result.status >= 200 && source_result.status < 300 &&
                      view_result.status >= 200 && view_result.status < 300;
            message = item_ok ? "cloned-disabled" : "clone failed";
            retryable = !item_ok;
        } else if (item_ok && dry_run && operation == "rollback") {
            message = rollback_mode == "disable-created" ? "rollback disable-created dry-run" : "rollback restore dry-run";
        }
        if (item_ok) {
            ++ok_count;
        } else {
            ++fail_count;
        }
        if (index != 0) {
            results << ",";
            audit_targets << ",";
        }
        const std::string audit_target_id = result_source_id.empty() ? source_id : result_source_id;
        audit_targets << "\"channel:" << JsonEscape(audit_target_id) << "\"";
        results << "{"
                << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
                << "\"resultSourceId\":\"" << JsonEscape(result_source_id) << "\","
                << "\"resultViewId\":\"" << JsonEscape(result_view_id) << "\","
                << "\"ok\":" << (item_ok ? "true" : "false") << ","
                << "\"retryable\":" << (retryable ? "true" : "false") << ","
                << "\"rollbackMode\":\"" << JsonEscape(rollback_mode) << "\","
                << "\"rollbackSourceId\":\"" << JsonEscape(result_source_id) << "\","
                << "\"auditTarget\":\"channel:" << JsonEscape(audit_target_id) << "\","
                << "\"message\":\"" << JsonEscape(message) << "\""
                << "}";
    }
    results << "]";
    audit_targets << "]";
    const std::string audit_action =
        dry_run ? "bulk-dry-run" : (operation == "rollback" ? "bulk-rollback" : "bulk-" + operation);
    std::ostringstream out;
    out << "{"
        << "\"status\":\"ops-channel-bulk\","
        << "\"operation\":\"" << JsonEscape(operation) << "\","
        << "\"dryRun\":" << (dry_run ? "true" : "false") << ","
        << "\"okCount\":" << ok_count << ","
        << "\"failCount\":" << fail_count << ","
        << "\"partialFailure\":" << (fail_count > 0 && ok_count > 0 ? "true" : "false") << ","
        << "\"auditArea\":\"channels\","
        << "\"auditAction\":\"" << JsonEscape(audit_action) << "\","
        << "\"auditTargets\":" << audit_targets.str() << ","
        << "\"diffPreviewPolicy\":\"UI records the before/after bulk diff preview in Ops audit before retry or rollback\","
        << "\"rollbackPolicy\":\"use operation=rollback with successful result ids; clone rollback disables created channels and disable rollback restores before snapshots\","
        << "\"retryPolicy\":\"retry only failed sourceId items after fixing validation errors; retryable flags identify safe retry targets\","
        << "\"results\":" << results.str()
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28226 function
std::string WebRtcSyncStatusForMatch(std::int64_t video_frame_pts_ns, std::int64_t analysis_pts_ns) {
    return video_frame_pts_ns == analysis_pts_ns ? "exact" : "near";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28230 function
VaMetadataApplicationSyncInfo BuildWebRtcVaMetadataSyncInfo(std::int64_t video_frame_pts_ns,
                                                            std::int64_t analysis_pts_ns,
                                                            std::int64_t sync_tolerance_ns,
                                                            std::string sync_status,
                                                            int frame_width,
                                                            int frame_height) {
    VaMetadataApplicationSyncInfo sync;
    sync.available = true;
    sync.video_frame_pts_ms = PtsNsToMs(video_frame_pts_ns);
    sync.analysis_pts_ms = PtsNsToMs(analysis_pts_ns);
    sync.sync_delta_ms = PtsNsToMs(analysis_pts_ns - video_frame_pts_ns);
    sync.sync_status = std::move(sync_status);
    sync.sync_tolerance_ms = PtsNsToMs(sync_tolerance_ns);
    sync.metadata_sequence = g_web_rtc_metadata_sequence.fetch_add(1, std::memory_order_relaxed) + 1;
    sync.sent_at_ms = NowUnixMs();
    sync.frame_width = frame_width;
    sync.frame_height = frame_height;
    sync.coordinate_space = "normalized-frame";
    return sync;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28251 function
std::string WebRtcVaMetadataMessageJson(const analysis::AnalysisResult& result,
                                        const std::vector<analysis::AnalysisEvent>& events,
                                        const VaMetadataApplicationSyncInfo& sync_info,
                                        const VaMetadataApplicationFilter& subscription_filter) {
    return SerializeWebRtcVaMetadataForApplication(
        result, events, sync_info, subscription_filter);
}

std::string WebRtcVaMetadataMessageJson(
    const AnalysisSessionApplicationResult& result,
    const std::vector<EventRuleApplicationEvent>& events,
    const VaMetadataApplicationSyncInfo& sync_info,
    const VaMetadataApplicationFilter& subscription_filter) {
    return SerializeWebRtcVaMetadataForApplication(
        result, events, sync_info, subscription_filter);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28269 function
std::string WebRtcVaMetadataMissingMessageJson(const std::string& stream_id,
                                               std::int64_t video_frame_pts_ns,
                                               std::int64_t sync_tolerance_ns) {
    auto sync = BuildWebRtcVaMetadataSyncInfo(
        video_frame_pts_ns, video_frame_pts_ns, sync_tolerance_ns, "missing", 0, 0);
    sync.analysis_pts_ms = 0;
    sync.sync_delta_ms = 0;
    return SerializeMissingWebRtcVaMetadataForApplication(
        stream_id, video_frame_pts_ns, sync);
}

template <typename Result, typename Event>
EventPostDispatchRequest ProjectEventPostDispatchRequestValue(
    const Result& result,
    const std::vector<Event>& events) {
    EventPostDispatchRequest request;
    request.source.source_key = result.source_key;
    request.source.profile_key = result.profile_key;
    request.source.source_kind = result.context.source_kind;
    request.source.route = result.context.route;
    request.source.client_id = result.context.client_id;
    request.source.pts = result.pts;
    request.events.reserve(events.size());
    for (const auto& event : events) {
        EventPostDispatchEvent output;
        output.rule_id = event.rule_id;
        output.event_type = event.event_type;
        output.track_id = event.track_id;
        output.class_id = event.class_id;
        output.label = event.label;
        output.score = event.score;
        output.box.x = event.box.x;
        output.box.y = event.box.y;
        output.box.width = event.box.width;
        output.box.height = event.box.height;
        output.highlight_color = event.highlight_color;
        output.highlight_duration_ms = event.highlight_duration_ms;
        output.highlight_enabled = event.highlight_enabled;
        output.post_enabled = event.post_enabled;
        output.post_url = event.post_url;
        request.events.push_back(std::move(output));
    }
    return request;
}

EventPostDispatchRequest ProjectEventPostDispatchRequest(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events) {
    return ProjectEventPostDispatchRequestValue(result, events);
}

EventPostDispatchRequest ProjectEventPostDispatchRequest(
    const AnalysisSessionApplicationResult& result,
    const std::vector<EventRuleApplicationEvent>& events) {
    return ProjectEventPostDispatchRequestValue(result, events);
}

template <typename Result, typename Event>
EventStorageApplicationDispatchRequest ProjectEventStorageDispatchRequestValue(
    const Result& result,
    const std::vector<Event>& events) {
    EventStorageApplicationDispatchRequest request;
    request.source.source_key = result.source_key;
    request.source.profile_key = result.profile_key;
    request.source.source_kind = result.context.source_kind;
    request.source.route = result.context.route;
    request.source.client_id = result.context.client_id;
    request.source.pts = result.pts;
    request.events.reserve(events.size());
    for (const auto& event : events) {
        EventStorageApplicationDispatchEvent output;
        output.event_id = event.event_id;
        output.rule_id = event.rule_id;
        output.event_type = event.event_type;
        output.track_id = event.track_id;
        output.class_id = event.class_id;
        output.label = event.label;
        output.score = event.score;
        output.box.x = event.box.x;
        output.box.y = event.box.y;
        output.box.width = event.box.width;
        output.box.height = event.box.height;
        output.highlight_color = event.highlight_color;
        output.highlight_duration_ms = event.highlight_duration_ms;
        output.highlight_enabled = event.highlight_enabled;
        output.post_enabled = event.post_enabled;
        output.post_url = event.post_url;
        output.status = event.status;
        output.start_time_ms = event.start_time_ms;
        output.update_time_ms = event.update_time_ms;
        output.end_time_ms = event.end_time_ms;
        output.zone_id = event.zone_id;
        output.line_id = event.line_id;
        output.scenario_name = event.scenario_name;
        output.scenario_phase = event.scenario_phase;
        output.metadata_json = event.metadata_json;
        request.events.push_back(std::move(output));
    }
    return request;
}

EventStorageApplicationDispatchRequest ProjectEventStorageDispatchRequest(
    const analysis::AnalysisResult& result,
    const std::vector<analysis::AnalysisEvent>& events) {
    return ProjectEventStorageDispatchRequestValue(result, events);
}

EventStorageApplicationDispatchRequest ProjectEventStorageDispatchRequest(
    const AnalysisSessionApplicationResult& result,
    const std::vector<EventRuleApplicationEvent>& events) {
    return ProjectEventStorageDispatchRequestValue(result, events);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28285 function
std::string AnalysisEventPostStatusJson() {
    const auto status = ObserveEventPostDispatchStatus();
    std::ostringstream out;
    out << "{"
        << "\"enabled\":" << (status.enabled ? "true" : "false") << ","
        << "\"queueSize\":" << status.queue_size << ","
        << "\"maxQueueSize\":" << status.max_queue_size << ","
        << "\"enqueuedCount\":" << status.enqueued_count << ","
        << "\"sentCount\":" << status.sent_count << ","
        << "\"failedCount\":" << status.failed_count << ","
        << "\"droppedCount\":" << status.dropped_count << ","
        << "\"suppressedCount\":" << status.suppressed_count << ","
        << "\"lastError\":\"" << JsonEscape(status.last_error) << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28302 function
std::string AnalysisEventStorageStatusJson() {
    const auto snapshot = ObserveEventStorageForApplication();
    std::ostringstream out;
    out << "{"
        << "\"enabled\":" << (snapshot.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(snapshot.path) << "\","
        << "\"activePath\":\"" << JsonEscape(snapshot.active_path.empty() ? snapshot.path
                                                                          : snapshot.active_path)
        << "\","
        << "\"activeFileSizeBytes\":" << snapshot.active_file_size_bytes << ","
        << "\"archivedFileCount\":" << snapshot.archived_file_count << ","
        << "\"totalArchiveBytes\":" << snapshot.total_archive_bytes << ","
        << "\"queueSize\":" << snapshot.queue_size << ","
        << "\"maxQueueSize\":" << snapshot.max_queue_size << ","
        << "\"enqueuedCount\":" << snapshot.enqueued_count << ","
        << "\"storedCount\":" << snapshot.stored_count << ","
        << "\"failedCount\":" << snapshot.failed_count << ","
        << "\"writeFailedCount\":" << snapshot.write_failed_count << ","
        << "\"droppedCount\":" << snapshot.dropped_count << ","
        << "\"skippedCorruptLines\":" << snapshot.skipped_corrupt_lines << ","
        << "\"partialLineCount\":" << snapshot.partial_line_count << ","
        << "\"lastRecoveryTime\":" << snapshot.last_recovery_time_ms << ","
        << "\"lastRecoveryStatus\":\"" << JsonEscape(snapshot.last_recovery_status) << "\","
        << "\"rotatedCount\":" << snapshot.rotated_count << ","
        << "\"rotationFailedCount\":" << snapshot.rotation_failed_count << ","
        << "\"retentionDeletedCount\":" << snapshot.retention_deleted_count << ","
        << "\"retentionDeletedBytes\":" << snapshot.retention_deleted_bytes << ","
        << "\"retentionFailedCount\":" << snapshot.retention_failed_count << ","
        << "\"snapshotHook\":{"
        << "\"enabled\":" << (snapshot.snapshot_hook_enabled ? "true" : "false") << ","
        << "\"directory\":\"" << JsonEscape(snapshot.snapshot_dir) << "\","
        << "\"failedCount\":" << snapshot.snapshot_hook_failed_count << ","
        << "\"lastError\":\"" << JsonEscape(snapshot.last_snapshot_error) << "\""
        << "},"
        << "\"clipHook\":{"
        << "\"enabled\":" << (snapshot.clip_hook_enabled ? "true" : "false") << ","
        << "\"directory\":\"" << JsonEscape(snapshot.clip_dir) << "\","
        << "\"preEventMs\":" << snapshot.pre_event_ms << ","
        << "\"postEventMs\":" << snapshot.post_event_ms << ","
        << "\"clipBufferMs\":" << snapshot.clip_buffer_ms << ","
        << "\"failedCount\":" << snapshot.clip_hook_failed_count << ","
        << "\"lastError\":\"" << JsonEscape(snapshot.last_clip_error) << "\""
        << "},"
        << "\"evidencePolicy\":{"
        << "\"scope\":\"event-short-evidence\","
        << "\"longRecording\":false,"
        << "\"videoArchive\":false,"
        << "\"snapshotEnabled\":" << (snapshot.snapshot_hook_enabled ? "true" : "false") << ","
        << "\"clipBundleEnabled\":" << (snapshot.clip_hook_enabled ? "true" : "false") << ","
        << "\"clipFormat\":\"frame-bundle\","
        << "\"snapshotFormats\":[\"jpg\",\"ppm\",\"pgm\"],"
        << "\"compactionDestructive\":false,"
        << "\"exportPolicy\":{"
        << "\"snapshotDownload\":true,"
        << "\"clipManifestDownload\":true,"
        << "\"clipFrameDownload\":true,"
        << "\"bundleArchiveDownload\":true,"
        << "\"bundleFormat\":\"zip\","
        << "\"bundleMaxAgeMs\":86400000,"
        << "\"bundleExpiresVia\":\"expiresAtMs\","
        << "\"bundleSignedToken\":true,"
        << "\"bundleTokenParam\":\"token\","
        << "\"bundleTokenIssuer\":\"/lab/analysis/events/evidence/bundle-token\","
        << "\"exportAudit\":true,"
        << "\"auditArea\":\"events\","
        << "\"auditAction\":\"export-bundle\","
        << "\"auditSearchQuery\":\"export-bundle\","
        << "\"longVideoExport\":false,"
        << "\"allowedFormats\":[\"jpg\",\"jpeg\",\"ppm\",\"pgm\",\"json\",\"zip\"]"
        << "},"
        << "\"retentionPolicy\":{"
        << "\"activeFileProtected\":true,"
        << "\"archiveRetention\":\"oldest-rotated-only\","
        << "\"compactionCleanup\":\"keepNewest\","
        << "\"expiredBundleCleanup\":\"token-expiry-no-server-file\","
        << "\"evidenceFileRetention\":\"event-record-retention\","
        << "\"bundleExpiry\":\"signed-token-expiresAtMs\","
        << "\"bundleMaxAgeMs\":86400000"
        << "},"
        << "\"deletePolicy\":{"
        << "\"activeRecordDelete\":false,"
        << "\"archiveDelete\":false,"
        << "\"compactionDelete\":true,"
        << "\"evidenceFileDelete\":false,"
        << "\"evidenceFileDeletePermission\":\"blocked-for-all-roles\","
        << "\"requiresRuleWrite\":true"
        << "}"
        << "},"
        << "\"lastError\":\"" << JsonEscape(snapshot.last_error) << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28395 function
bool ParseStrictInt64(const std::string& raw, std::int64_t* value) {
    if (value == nullptr || raw.empty()) {
        return false;
    }
    std::size_t consumed = 0;
    try {
        const std::int64_t parsed = std::stoll(raw, &consumed, 10);
        if (consumed != raw.size()) {
            return false;
        }
        *value = parsed;
        return true;
    } catch (...) {
        return false;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28412 function
bool ParseStrictUint64(const std::string& raw, std::uint64_t* value) {
    if (value == nullptr || raw.empty() || raw.front() == '-') {
        return false;
    }
    std::size_t consumed = 0;
    try {
        const unsigned long long parsed = std::stoull(raw, &consumed, 10);
        if (consumed != raw.size()) {
            return false;
        }
        *value = static_cast<std::uint64_t>(parsed);
        return true;
    } catch (...) {
        return false;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28429 function
bool ApplyStringEventRecordFilter(const std::unordered_map<std::string, std::string>& query,
                                  const std::string& key,
                                  std::string* out) {
    const auto it = query.find(key);
    if (it == query.end() || out == nullptr) {
        return false;
    }
    *out = Trim(it->second);
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28440 function
bool BuildEventRecordQueryOptions(const std::unordered_map<std::string, std::string>& query,
                                  EventStorageApplicationQueryOptions* options,
                                  std::string* error_message) {
    if (options == nullptr) {
        if (error_message != nullptr) {
            *error_message = "query options are required";
        }
        return false;
    }
    *options = EventStorageApplicationQueryOptions{};
    ApplyStringEventRecordFilter(query, "eventId", &options->event_id);
    ApplyStringEventRecordFilter(query, "eventType", &options->event_type);
    ApplyStringEventRecordFilter(query, "streamId", &options->stream_id);
    ApplyStringEventRecordFilter(query, "channelId", &options->channel_id);
    ApplyStringEventRecordFilter(query, "status", &options->status);
    ApplyStringEventRecordFilter(query, "zoneId", &options->zone_id);
    ApplyStringEventRecordFilter(query, "lineId", &options->line_id);
    ApplyStringEventRecordFilter(query, "scenarioName", &options->scenario_name);
    ApplyStringEventRecordFilter(query, "scenarioPhase", &options->scenario_phase);

    if (const auto it = query.find("evidence"); it != query.end() && !Trim(it->second).empty()) {
        const std::string evidence = LowerAscii(Trim(it->second));
        if (evidence != "snapshot" && evidence != "clip" && evidence != "any" &&
            evidence != "both" && evidence != "missing") {
            if (error_message != nullptr) {
                *error_message = "evidence must be snapshot, clip, any, both, or missing";
            }
            return false;
        }
        options->evidence = evidence;
    }

    if (const auto it = query.find("trackId"); it != query.end() && !Trim(it->second).empty()) {
        std::uint64_t parsed = 0;
        if (!ParseStrictUint64(Trim(it->second), &parsed)) {
            if (error_message != nullptr) {
                *error_message = "trackId must be a non-negative integer";
            }
            return false;
        }
        options->has_track_id = true;
        options->track_id = parsed;
    }

    if (const auto it = query.find("startTimeMs"); it != query.end() && !Trim(it->second).empty()) {
        std::int64_t parsed = 0;
        if (!ParseStrictInt64(Trim(it->second), &parsed) || parsed < 0) {
            if (error_message != nullptr) {
                *error_message = "startTimeMs must be a non-negative integer";
            }
            return false;
        }
        options->has_start_time_ms = true;
        options->start_time_ms = parsed;
    }

    if (const auto it = query.find("endTimeMs"); it != query.end() && !Trim(it->second).empty()) {
        std::int64_t parsed = 0;
        if (!ParseStrictInt64(Trim(it->second), &parsed) || parsed < 0) {
            if (error_message != nullptr) {
                *error_message = "endTimeMs must be a non-negative integer";
            }
            return false;
        }
        options->has_end_time_ms = true;
        options->end_time_ms = parsed;
    }

    if (options->has_start_time_ms && options->has_end_time_ms &&
        options->start_time_ms > options->end_time_ms) {
        if (error_message != nullptr) {
            *error_message = "startTimeMs must be less than or equal to endTimeMs";
        }
        return false;
    }

    if (const auto it = query.find("offset"); it != query.end() && !Trim(it->second).empty()) {
        std::uint64_t parsed = 0;
        if (!ParseStrictUint64(Trim(it->second), &parsed)) {
            if (error_message != nullptr) {
                *error_message = "offset must be a non-negative integer";
            }
            return false;
        }
        options->offset = static_cast<std::size_t>(parsed);
    }

    const auto include_archives_value = query.find("includeArchives");
    const auto archive_value = query.find("archive");
    const std::string include_archives_raw =
        include_archives_value != query.end()
            ? include_archives_value->second
            : (archive_value != query.end() ? archive_value->second : "");
    const std::string include_archives = LowerAscii(Trim(include_archives_raw));
    options->include_archives = include_archives == "1" || include_archives == "true" ||
                                include_archives == "yes" || include_archives == "all";

    constexpr std::size_t kDefaultLimit = 100;
    constexpr std::size_t kMaxLimit = 500;
    options->limit = kDefaultLimit;
    if (const auto it = query.find("limit"); it != query.end() && !Trim(it->second).empty()) {
        std::uint64_t parsed = 0;
        if (!ParseStrictUint64(Trim(it->second), &parsed) || parsed == 0) {
            if (error_message != nullptr) {
                *error_message = "limit must be a positive integer";
            }
            return false;
        }
        options->limit = static_cast<std::size_t>(std::min<std::uint64_t>(parsed, kMaxLimit));
    }

    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28557 function
std::string AnalysisEventRecordsJson(const EventStorageApplicationQueryResult& result) {
    const auto& snapshot = result.storage;
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-list.v1\","
        << "\"records\":[";
    for (std::size_t i = 0; i < result.records_json.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << result.records_json[i];
    }
    out << "],"
        << "\"offset\":" << result.offset << ","
        << "\"limit\":" << result.limit << ","
        << "\"nextOffset\":" << result.next_offset << ","
        << "\"matchedRecords\":" << result.matched_records << ","
        << "\"hasMore\":" << (result.has_more ? "true" : "false") << ","
        << "\"truncated\":" << (result.truncated ? "true" : "false") << ","
        << "\"skippedCorruptLines\":" << result.skipped_corrupt_lines << ","
        << "\"partialLineCount\":" << result.partial_line_count << ","
        << "\"archiveFilesScanned\":" << result.archive_files_scanned << ","
        << "\"archiveRecordsScanned\":" << result.archive_records_scanned << ","
        << "\"storage\":{"
        << "\"enabled\":" << (snapshot.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(snapshot.path) << "\","
        << "\"activePath\":\"" << JsonEscape(snapshot.active_path.empty() ? snapshot.path
                                                                          : snapshot.active_path)
        << "\","
        << "\"exists\":" << (result.file_exists ? "true" : "false") << ","
        << "\"activeFileSizeBytes\":" << snapshot.active_file_size_bytes << ","
        << "\"archivedFileCount\":" << snapshot.archived_file_count << ","
        << "\"totalArchiveBytes\":" << snapshot.total_archive_bytes << ","
        << "\"rotatedCount\":" << snapshot.rotated_count << ","
        << "\"retentionDeletedCount\":" << snapshot.retention_deleted_count << ","
        << "\"retentionDeletedBytes\":" << snapshot.retention_deleted_bytes << ","
        << "\"retentionFailedCount\":" << snapshot.retention_failed_count << ","
        << "\"skippedCorruptLines\":" << snapshot.skipped_corrupt_lines << ","
        << "\"partialLineCount\":" << snapshot.partial_line_count << ","
        << "\"lastRecoveryTime\":" << snapshot.last_recovery_time_ms << ","
        << "\"lastRecoveryStatus\":\"" << JsonEscape(snapshot.last_recovery_status) << "\","
        << "\"queueSize\":" << snapshot.queue_size << ","
        << "\"maxQueueSize\":" << snapshot.max_queue_size << ","
        << "\"enqueuedCount\":" << snapshot.enqueued_count << ","
        << "\"storedCount\":" << snapshot.stored_count << ","
        << "\"failedCount\":" << snapshot.failed_count << ","
        << "\"writeFailedCount\":" << snapshot.write_failed_count << ","
        << "\"droppedCount\":" << snapshot.dropped_count
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28610 function
std::string OpsVlmEventReviewJson(const std::string& event_json) {
    const bool event_record_present = !Trim(event_json).empty();
    const std::string event_id =
        event_record_present ? Trim(ParseStringField(event_json, "eventId").value_or("")) : std::string();
    const std::string event_type =
        event_record_present ? Trim(ParseStringField(event_json, "eventType").value_or("")) : std::string();
    const std::string snapshot_path =
        event_record_present ? Trim(ParseStringField(event_json, "snapshotPath").value_or("")) : std::string();
    const std::string clip_path =
        event_record_present ? Trim(ParseStringField(event_json, "clipPath").value_or("")) : std::string();
    const auto metadata = event_record_present ? ExtractObjectField(event_json, "metadata") : std::nullopt;
    const bool vlm_evidence_refs_present =
        metadata.has_value() && metadata->find("\"vlmEvidenceRefs\"") != std::string::npos;

    bool observation_query_ok = false;
    bool observation_store_exists = false;
    std::string observation_error;
    std::string observation_json;
    if (!event_id.empty()) {
        VlmObservationQueryRequest options;
        options.event_id = event_id;
        options.limit = 1;
        VlmObservationQueryView query_result;
        observation_query_ok = QueryVlmObservationStore(options, &query_result, &observation_error);
        observation_store_exists = query_result.file_exists;
        if (observation_query_ok && !query_result.observations_json.empty()) {
            observation_json = query_result.observations_json.front();
        }
    }
    const bool observation_present = !observation_json.empty();
    const std::string summary = observation_present
                                    ? Trim(ParseStringField(observation_json, "summary").value_or(""))
                                    : (event_record_present ? "VLM explanation pending for this EventRecord"
                                                            : "EventRecord is not available for VLM review");
    const std::string explanation =
        observation_present
            ? Trim(ParseStringField(observation_json, "eventExplanation").value_or(summary))
            : "Ops review shows EventRecord evidence first; VLM observation text appears here when the side storage has a matching eventId.";
    std::vector<std::string> hints =
        observation_present ? StringArrayFieldValues(observation_json, "falsePositiveHints")
                            : std::vector<std::string>{
                                  "Check snapshot and clip evidence before classifying this event.",
                              };
    std::vector<std::string> questions =
        observation_present ? StringArrayFieldValues(observation_json, "operatorReviewQuestions")
                            : std::vector<std::string>{
                                  "Does the snapshot and short clip support the rule/scenario decision?",
                              };
    if (hints.empty()) {
        hints.push_back("No false-positive hint was attached to the matching VLM observation.");
    }
    if (questions.empty()) {
        questions.push_back("No operator question was attached to the matching VLM observation.");
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.vlm-event-review.v1\","
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(event_type) << "\","
        << "\"eventRecordPresent\":" << (event_record_present ? "true" : "false") << ","
        << "\"observationPresent\":" << (observation_present ? "true" : "false") << ","
        << "\"observationStoreExists\":" << (observation_store_exists ? "true" : "false") << ","
        << "\"observationQueryOk\":" << (observation_query_ok ? "true" : "false") << ","
        << "\"observationError\":\"" << JsonEscape(observation_query_ok ? "" : observation_error) << "\","
        << "\"evidence\":{"
        << "\"snapshotPathPresent\":" << (snapshot_path.empty() ? "false" : "true") << ","
        << "\"clipPathPresent\":" << (clip_path.empty() ? "false" : "true") << ","
        << "\"vlmEvidenceRefsPresent\":" << (vlm_evidence_refs_present ? "true" : "false") << ","
        << "\"snapshotLabel\":\"" << JsonEscape(snapshot_path.empty() ? "snapshot missing" : "snapshot available")
        << "\","
        << "\"clipLabel\":\"" << JsonEscape(clip_path.empty() ? "clip missing" : "short clip available")
        << "\""
        << "},"
        << "\"explanation\":{"
        << "\"summary\":\"" << JsonEscape(summary) << "\","
        << "\"eventExplanation\":\"" << JsonEscape(explanation) << "\","
        << "\"falsePositiveHints\":" << JsonStringArray(hints) << ","
        << "\"operatorReviewQuestions\":" << JsonStringArray(questions)
        << "},"
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"autoRuleApplied\":false,"
        << "\"credentialMaterialStored\":false,"
        << "\"promptStored\":false,"
        << "\"rawProviderResponseStored\":false,"
        << "\"sourceUrlStored\":false,"
        << "\"rawFrameBytesStored\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28710 function
std::string OpsV390VlmRuleSuggestionDraftBridgeJson() {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v390-vlm-rule-suggestion-draft-bridge.v1\","
        << "\"status\":\"ops-review-to-rule-draft-bridge\","
        << "\"featureId\":\"V390-CAND-003\","
        << "\"selectedMode\":\"ops-review-to-rule-draft-bridge\","
        << "\"bridgeDecision\":\"manual-save-only\","
        << "\"sourceCandidateReportRoute\":\"/ops/api/vlm/rule-suggestion-drafts\","
        << "\"sourceCandidateSchema\":\"media-server.vlm-rule-suggestion-candidates.v1\","
        << "\"incidentReviewSchema\":\"media-server.ops.incident-rule-suggestion-review.v1\","
        << "\"manualReviewRoute\":\"/ops/events\","
        << "\"manualDraftRoute\":\"/ops/rules\","
        << "\"draftApiRoute\":\"/ops/api/vlm/rule-suggestion-drafts\","
        << "\"reviewToDraftBridge\":{"
        << "\"mode\":\"ops-review-to-rule-draft-bridge\","
        << "\"provenance\":\"incident-review-provenance\","
        << "\"draftTarget\":\"ops-rules-event-template-form\","
        << "\"candidateSource\":\"matchingRuleSuggestion\","
        << "\"sourceReportField\":\"sourceCandidateReport\","
        << "\"operatorAction\":\"apply-form-draft-then-manual-save\","
        << "\"manualSaveOnly\":true,"
        << "\"reviewableDraft\":true,"
        << "\"noAutoApply\":true"
        << "},"
        << "\"evidenceTrail\":{"
        << "\"provenanceMode\":\"incident-review-provenance\","
        << "\"candidateReport\":\"sourceCandidateReport\","
        << "\"matchingSuggestion\":\"matchingRuleSuggestion\","
        << "\"reviewCard\":\"media-server.ops.incident-rule-suggestion-review.v1\","
        << "\"draftWorkflow\":\"media-server.vlm-rule-suggestion-draft-workflow.v1\","
        << "\"auditExpectation\":\"existing-ops-rules-manual-save-audit\""
        << "},"
        << "\"workflowContract\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"reviewableDraft\":true,"
        << "\"manualSaveRequired\":true,"
        << "\"approvalRequiredBeforeSave\":true,"
        << "\"candidateProvenanceIncluded\":true,"
        << "\"ruleRegistryWritePerformedByBridge\":false,"
        << "\"profileRegistryWritePerformedByBridge\":false,"
        << "\"eventRecordWritePerformedByBridge\":false,"
        << "\"autoApplyEnabled\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"clientViewerExposureAdded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28768 function
std::string OpsVlmRuleSuggestionDraftWorkflowJson(
    const std::unordered_map<std::string, std::string>& query,
    std::string* error_message) {
    VlmRuleSuggestionRequest options;
    options.source_id = query.count("sourceId") != 0 ? Trim(query.at("sourceId")) : std::string();
    options.privacy_mode =
        query.count("privacyMode") != 0 ? Trim(query.at("privacyMode")) : std::string();
    options.suggestion_kind =
        query.count("suggestionKind") != 0 ? Trim(query.at("suggestionKind")) : std::string();
    options.offset = static_cast<std::size_t>(
        ParseClampedIntQuery(query, "offset", 0, 0, 1000000));
    options.limit = static_cast<std::size_t>(
        ParseClampedIntQuery(query, "limit", 10, 1, 25));

    std::string candidate_body;
    std::string candidate_error;
    if (!BuildVlmRuleSuggestionCandidates(options, &candidate_body, &candidate_error)) {
        if (error_message != nullptr) {
            *error_message = candidate_error;
        }
        return {};
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.vlm-rule-suggestion-draft-workflow.v1\","
        << "\"targetStep\":\"V210-S08\","
        << "\"status\":\"draft-only-manual-save-required\","
        << "\"manualSaveRoute\":\"/ops/rules\","
        << "\"sourceCandidateStep\":\"V200-S13\","
        << "\"sourceCandidateReport\":" << candidate_body << ","
        << "\"workflowContract\":{"
        << "\"opsOnly\":true,"
        << "\"draftOnly\":true,"
        << "\"manualSaveRequired\":true,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"autoRuleApplied\":false,"
        << "\"autoProfileApplied\":false"
        << "}"
        << "}";
    if (error_message != nullptr) {
        error_message->clear();
    }
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28826 function
std::string OpsJsonObjectOrNull(const std::string& value) {
    const std::string trimmed = Trim(value);
    if (trimmed.size() >= 2 && trimmed.front() == '{' && trimmed.back() == '}') {
        return trimmed;
    }
    return "null";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28834 function
std::string OpsIncidentRuleSuggestionSourceId(const std::string& event_json) {
    for (const char* key : {"sourceId", "streamId", "channelId"}) {
        const std::string value = Trim(ParseStringField(event_json, key).value_or(""));
        if (!value.empty()) {
            return value;
        }
    }
    if (const auto metadata = ExtractObjectField(event_json, "metadata"); metadata.has_value()) {
        for (const char* key : {"sourceId", "streamId", "channelId"}) {
            const std::string value = Trim(ParseStringField(*metadata, key).value_or(""));
            if (!value.empty()) {
                return value;
            }
        }
    }
    return "";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28852 function
std::string OpsIncidentRuleSuggestionReviewJson(const std::string& event_json) {
    const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
    const std::string source_id = OpsIncidentRuleSuggestionSourceId(event_json);

    VlmObservationQueryView observation_result;
    std::string observation_error;
    bool observation_query_ok = false;
    if (!event_id.empty()) {
        VlmObservationQueryRequest observation_options;
        observation_options.event_id = event_id;
        observation_options.limit = 1;
        observation_query_ok = QueryVlmObservationStore(
            observation_options, &observation_result, &observation_error);
    }
    const std::string observation_json =
        observation_query_ok && !observation_result.observations_json.empty()
            ? observation_result.observations_json.front()
            : std::string();
    const std::string rule_suggestion_json = OpsJsonObjectOrNull(
        ExtractJsonValueField(observation_json, "ruleSuggestion").value_or("null"));
    const bool rule_suggestion_present = rule_suggestion_json != "null";
    const std::string proposed_rule_kind =
        rule_suggestion_present
            ? Trim(ParseStringField(rule_suggestion_json, "kind")
                       .value_or(ParseStringField(rule_suggestion_json, "candidateId").value_or("")))
            : std::string();
    const std::string target_route =
        rule_suggestion_present
            ? Trim(ParseStringField(rule_suggestion_json, "targetRoute").value_or("/ops/rules"))
            : "/ops/rules";

    VlmRuleSuggestionRequest candidate_options;
    candidate_options.source_id = source_id;
    candidate_options.limit = 6;
    std::string candidate_report;
    std::string candidate_error;
    const bool candidate_report_ready = BuildVlmRuleSuggestionCandidates(
        candidate_options, &candidate_report, &candidate_error);

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.incident-rule-suggestion-review.v1\","
        << "\"status\":\"incident-to-rule-manual-review\","
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"observationPresent\":" << (observation_json.empty() ? "false" : "true") << ","
        << "\"observationStoreExists\":" << (observation_result.file_exists ? "true" : "false") << ","
        << "\"observationQueryOk\":" << (observation_query_ok ? "true" : "false") << ","
        << "\"observationError\":\"" << JsonEscape(observation_query_ok ? "" : observation_error) << "\","
        << "\"matchingRuleSuggestionPresent\":" << (rule_suggestion_present ? "true" : "false") << ","
        << "\"candidateStatus\":\""
        << (rule_suggestion_present ? "candidate-only-manual-rule-save" : "no-rule-suggestion-candidate")
        << "\","
        << "\"proposedRuleKind\":\"" << JsonEscape(proposed_rule_kind) << "\","
        << "\"sourceCandidateSchema\":\"media-server.vlm-rule-suggestion-candidates.v1\","
        << "\"manualReviewRoute\":\"/ops/events\","
        << "\"manualDraftRoute\":\"/ops/rules\","
        << "\"targetRoute\":\"" << JsonEscape(target_route.empty() ? "/ops/rules" : target_route) << "\","
        << "\"draftApiRoute\":\"/ops/api/vlm/rule-suggestion-drafts\","
        << "\"sourceCandidateReport\":" << (candidate_report_ready ? candidate_report : "null") << ","
        << "\"sourceCandidateError\":\"" << JsonEscape(candidate_report_ready ? "" : candidate_error) << "\","
        << "\"matchingRuleSuggestion\":" << rule_suggestion_json << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"draftOnly\":true,"
        << "\"manualSaveRequired\":true,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"autoRuleApplied\":false,"
        << "\"autoProfileApplied\":false"
        << "}"
        << "}";
    return out.str();
}

std::string OpsIncidentMemoryEventRuleId(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28937 function
std::string OpsIncidentTriageBoardSourceId(const std::string& event_json) {
    return OpsIncidentRuleSuggestionSourceId(event_json);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28941 function
std::string OpsIncidentTriageBoardScenario(const std::string& event_json) {
    for (const char* key : {"scenarioName", "scenarioPhase", "eventType", "className"}) {
        const std::string value = Trim(ParseStringField(event_json, key).value_or(""));
        if (!value.empty()) {
            return value;
        }
    }
    if (const auto scenario = ExtractObjectField(event_json, "scenario"); scenario.has_value()) {
        for (const char* key : {"name", "phase", "type"}) {
            const std::string value = Trim(ParseStringField(*scenario, key).value_or(""));
            if (!value.empty()) {
                return value;
            }
        }
    }
    return "unmapped-scenario";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28959 function
std::int64_t OpsIncidentTriageBoardEventTimeMs(const std::string& event_json,
                                               const OpsEventReviewState& review) {
    for (const char* key : {"updateTime", "endTime", "startTime", "timestampMs"}) {
        if (const auto value = ParseInt64Field(event_json, key); value.has_value()) {
            return *value;
        }
    }
    return review.updated_at_ms;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28969 function
std::string OpsIncidentTriageBoardLane(const OpsEventReviewState& review) {
    const std::string review_status = Trim(review.review_status);
    const std::string incident_status = NormalizeOpsIncidentStatus(review.incident_status);
    if (review_status == "confirmed" || review_status == "dismissed" ||
        incident_status == "closed" || incident_status == "false-positive") {
        return "resolved";
    }
    if (review_status == "reviewing" || incident_status == "in-progress" ||
        incident_status == "acknowledged") {
        return "in-progress";
    }
    if (review_status == "new" || review_status == "needs-follow-up" ||
        incident_status == "review-needed") {
        return "needs-triage";
    }
    return "watchlist";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28987 function
std::string OpsIncidentTriageBoardPriority(int score) {
    if (score >= 70) {
        return "urgent";
    }
    if (score >= 45) {
        return "high";
    }
    if (score >= 25) {
        return "medium";
    }
    return "low";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29000 function
std::string OpsIncidentTriageBoardVlmCandidateStatus(const std::string& rule_review_json) {
    return ParseStringField(rule_review_json, "candidateStatus")
        .value_or("no-rule-suggestion-candidate");
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29005 function
std::string OpsIncidentTriageBoardSimilarIncidentKey(const std::string& source_id,
                                                     const std::string& rule_id,
                                                     const std::string& scenario,
                                                     const OpsEventReviewState& review) {
    return source_id + "|" + rule_id + "|" + scenario + "|" +
           NormalizeOpsIncidentStatus(review.incident_status);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29013 function
std::string OpsIncidentTriageBoardCardJson(const std::string& event_json,
                                           const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string lane = OpsIncidentTriageBoardLane(review);
    const std::string incident_status = NormalizeOpsIncidentStatus(review.incident_status);
    const std::string review_state = review.review_status.empty() ? "new" : review.review_status;
    const std::string rule_review = OpsIncidentRuleSuggestionReviewJson(event_json);
    const std::string vlm_candidate_status = OpsIncidentTriageBoardVlmCandidateStatus(rule_review);
    const bool has_snapshot = !Trim(ParseStringField(event_json, "snapshotPath").value_or("")).empty();
    const bool has_clip = !Trim(ParseStringField(event_json, "clipPath").value_or("")).empty();
    int score = 20;
    std::vector<std::string> reasons;
    if (lane == "needs-triage") {
        score += 35;
        reasons.push_back("lane:needs-triage");
    } else if (lane == "in-progress") {
        score += 20;
        reasons.push_back("lane:in-progress");
    }
    if (review_state == "needs-follow-up" || incident_status == "review-needed") {
        score += 20;
        reasons.push_back("review-follow-up");
    }
    if (has_snapshot || has_clip) {
        score += 10;
        reasons.push_back("evidence-present");
    }
    if (!rule_id.empty()) {
        score += 8;
        reasons.push_back("rule-linked");
    }
    if (vlm_candidate_status != "no-rule-suggestion-candidate") {
        score += 7;
        reasons.push_back("vlm-candidate");
    }
    if (reasons.empty()) {
        reasons.push_back("default-watch");
    }
    const std::string priority = OpsIncidentTriageBoardPriority(score);

    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"lane\":\"" << JsonEscape(lane) << "\","
        << "\"priority\":\"" << JsonEscape(priority) << "\","
        << "\"priorityRank\":" << score << ","
        << "\"priorityReasons\":" << JsonStringArray(reasons) << ","
        << "\"reviewState\":\"" << JsonEscape(review_state) << "\","
        << "\"incidentStatus\":\"" << JsonEscape(incident_status) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(rule_id.empty() ? "unmapped-rule" : rule_id) << "\","
        << "\"scenario\":\"" << JsonEscape(scenario) << "\","
        << "\"similarIncidentKey\":\""
        << JsonEscape(OpsIncidentTriageBoardSimilarIncidentKey(
               source_id.empty() ? "unknown-source" : source_id,
               rule_id.empty() ? "unmapped-rule" : rule_id,
               scenario,
               review))
        << "\","
        << "\"vlmCandidateStatus\":\"" << JsonEscape(vlm_candidate_status) << "\","
        << "\"eventTimeMs\":" << OpsIncidentTriageBoardEventTimeMs(event_json, review) << ","
        << "\"reviewUpdatedAtMs\":" << review.updated_at_ms
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29084 function
std::string OpsIncidentTriageBoardViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<std::string> cards;
    cards.reserve(event_json_records.size());
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        cards.push_back(OpsIncidentTriageBoardCardJson(event_json, review));
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.incident-triage-board.v1\","
        << "\"status\":\"ops-incident-triage-board\","
        << "\"laneFilters\":[\"all\",\"needs-triage\",\"in-progress\",\"watchlist\",\"resolved\"],"
        << "\"priorityFilters\":[\"all\",\"urgent\",\"high\",\"medium\",\"low\"],"
        << "\"sortOptions\":[\"priority\",\"review-age\",\"event-time\"],"
        << "\"cards\":[";
    for (std::size_t i = 0; i < cards.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << cards[i];
    }
    out << "],"
        << "\"cardCount\":" << cards.size() << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"autoActionApplied\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29133 function
std::string OpsIncidentDecisionScorecardReasonChipsJson(const std::vector<std::string>& reasons) {
    std::ostringstream out;
    out << "[";
    for (std::size_t i = 0; i < reasons.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        const std::string& reason = reasons[i];
        const std::string tone =
            reason.find("missing") != std::string::npos || reason.find("stale") != std::string::npos
                ? "warn"
                : "info";
        out << "{"
            << "\"label\":\"" << JsonEscape(reason) << "\","
            << "\"tone\":\"" << JsonEscape(tone) << "\""
            << "}";
    }
    out << "]";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29154 function
std::string OpsIncidentDecisionScorecardJson(const std::string& event_json,
                                             const OpsEventReviewState& review,
                                             const OpsV320SourceReliabilityInfo& source_reliability,
                                             const int similar_incident_score,
                                             const int vlm_summary_candidate_count,
                                             const std::int64_t generated_at_ms) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string event_type = Trim(ParseStringField(event_json, "eventType")
                                            .value_or(ParseStringField(event_json, "className").value_or("event")));
    const std::string event_status = Trim(ParseStringField(event_json, "status").value_or("unknown"));
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string similar_key = OpsIncidentTriageBoardSimilarIncidentKey(
        source_id.empty() ? "unknown-source" : source_id,
        rule_id.empty() ? "unmapped-rule" : rule_id,
        scenario,
        review);
    const std::string rule_review = OpsIncidentRuleSuggestionReviewJson(event_json);
    const std::string vlm_rule_status = OpsIncidentTriageBoardVlmCandidateStatus(rule_review);
    const std::int64_t event_time_ms = OpsIncidentTriageBoardEventTimeMs(event_json, review);
    const std::int64_t operator_review_age_ms =
        review.updated_at_ms > 0 ? std::max<std::int64_t>(0, generated_at_ms - review.updated_at_ms) : -1;
    const std::string source_health_status = source_reliability.source_health_status;
    const std::string vlm_summary_status =
        vlm_summary_candidate_count > 0 ? "candidate-present" : "no-candidate";
    const int event_record_score =
        (event_status == "unknown" ? 0 : 15) +
        (event_time_ms > 0 ? 5 : 0) +
        (Trim(ParseStringField(event_json, "snapshotPath").value_or("")).empty() ? 0 : 5) +
        (Trim(ParseStringField(event_json, "clipPath").value_or("")).empty() ? 0 : 5);
    const int source_health_score = source_health_status == "live"
                                        ? 0
                                        : (source_health_status == "connecting"
                                               ? 5
                                               : (source_health_status == "stale" ? 10 : 15));
    const int bounded_similar_incident_score =
        std::max(0, std::min(15, (similar_incident_score * 15) / 100));
    const int vlm_summary_score = vlm_summary_candidate_count > 0 ? 10 : 0;
    const int vlm_rule_score = vlm_rule_status == "no-matching-candidate" ? 0 : 15;
    const int operator_review_age_score = operator_review_age_ms < 0
                                              ? 20
                                              : (operator_review_age_ms >= 300000
                                                     ? 15
                                                     : (operator_review_age_ms >= 60000 ? 10 : 5));
    const int decision_score =
        event_record_score + source_health_score + bounded_similar_incident_score +
        vlm_summary_score + vlm_rule_score + operator_review_age_score;

    std::vector<std::string> reasons;
    reasons.push_back(event_status == "unknown" ? "event-record-status-missing" : "event-record:" + event_status);
    reasons.push_back(source_health_status);
    reasons.push_back("similar:" + similar_key);
    reasons.push_back("vlm-summary:" + vlm_summary_status);
    reasons.push_back("vlm-rule:" + vlm_rule_status);
    reasons.push_back(operator_review_age_ms < 0 ? "operator-review:not-reviewed"
                                                 : "operator-review-age:" + std::to_string(operator_review_age_ms));

    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"eventRecordBasis\":{"
        << "\"eventType\":\"" << JsonEscape(event_type.empty() ? "event" : event_type) << "\","
        << "\"status\":\"" << JsonEscape(event_status) << "\","
        << "\"eventTimeMs\":" << event_time_ms
        << "},"
        << "\"sourceHealthBasis\":{"
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"status\":\"" << JsonEscape(source_health_status) << "\","
        << "\"reason\":\"" << JsonEscape(source_reliability.source_health_reason) << "\","
        << "\"sourceUrlExposed\":false"
        << "},"
        << "\"similarIncidentBasis\":{"
        << "\"similarIncidentKey\":\"" << JsonEscape(similar_key) << "\","
        << "\"ruleId\":\"" << JsonEscape(rule_id.empty() ? "unmapped-rule" : rule_id) << "\","
        << "\"scenario\":\"" << JsonEscape(scenario) << "\","
        << "\"score\":" << similar_incident_score
        << "},"
        << "\"vlmSummaryCandidateStatus\":\"" << JsonEscape(vlm_summary_status) << "\","
        << "\"vlmSummaryCandidateCount\":" << vlm_summary_candidate_count << ","
        << "\"vlmRuleCandidateStatus\":\"" << JsonEscape(vlm_rule_status) << "\","
        << "\"operatorReviewAgeMs\":" << operator_review_age_ms << ","
        << "\"score\":" << decision_score << ","
        << "\"priorityReasonChips\":" << OpsIncidentDecisionScorecardReasonChipsJson(reasons) << ","
        << "\"rawJsonExposed\":false,"
        << "\"sourceUrlExposed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29215 function
std::string OpsIncidentDecisionScorecardViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews,
    const OpsSourceHealthSnapshot& source_health_snapshot,
    const std::string& search_query) {
    std::vector<std::string> scorecards;
    scorecards.reserve(event_json_records.size());
    const std::int64_t generated_at_ms = NowUnixMs();
    for (std::size_t index = 0; index < event_json_records.size(); ++index) {
        const std::string& event_json = event_json_records[index];
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        const OpsSimilarIncidentCandidate base =
            OpsSimilarIncidentCandidateFromEvent(event_json, review, index);
        int similar_incident_score = 0;
        for (std::size_t related_index = 0; related_index < event_json_records.size(); ++related_index) {
            if (related_index == index) {
                continue;
            }
            const std::string related_event_id = Trim(
                ParseStringField(event_json_records[related_index], "eventId").value_or(""));
            const auto related_review_it = reviews.find(related_event_id);
            const OpsEventReviewState related_review = related_review_it == reviews.end()
                                                           ? DefaultOpsEventReviewState(related_event_id)
                                                           : related_review_it->second;
            const OpsSimilarIncidentCandidate related = OpsSimilarIncidentCandidateFromEvent(
                event_json_records[related_index], related_review, related_index);
            similar_incident_score = std::max(
                similar_incident_score, OpsSimilarIncidentScore(base, related, nullptr));
        }
        const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
        const std::string vlm_summary_review = search_query.empty()
                                                   ? std::string()
                                                   : OpsVlmSummaryCandidateReviewJson(search_query, source_id);
        const int vlm_summary_candidate_count = static_cast<int>(
            ParseInt64Field(vlm_summary_review, "matchedCandidates").value_or(0));
        scorecards.push_back(OpsIncidentDecisionScorecardJson(
            event_json,
            review,
            OpsV320SourceReliabilityInfoFor(event_json, source_health_snapshot),
            similar_incident_score,
            vlm_summary_candidate_count,
            generated_at_ms));
    }
    std::sort(scorecards.begin(), scorecards.end(), [](const std::string& left,
                                                       const std::string& right) {
        const std::int64_t left_score = ParseInt64Field(left, "score").value_or(0);
        const std::int64_t right_score = ParseInt64Field(right, "score").value_or(0);
        if (left_score != right_score) {
            return left_score > right_score;
        }
        return ParseStringField(left, "eventId").value_or("") <
               ParseStringField(right, "eventId").value_or("");
    });
    for (std::size_t index = 0; index < scorecards.size(); ++index) {
        if (!scorecards[index].empty() && scorecards[index].back() == '}') {
            scorecards[index].pop_back();
            scorecards[index] += ",\"scoreRank\":" + std::to_string(index + 1) + "}";
        }
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.incident-decision-scorecard.v1\","
        << "\"status\":\"ops-incident-decision-scorecard\","
        << "\"deterministicPriorityReasons\":true,"
        << "\"scorecards\":[";
    for (std::size_t i = 0; i < scorecards.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << scorecards[i];
    }
    out << "],"
        << "\"scorecardCount\":" << scorecards.size() << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29263 function
std::string OpsOperationalActionPackActionsJson(const std::string& event_json,
                                                const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string snapshot_path = Trim(ParseStringField(event_json, "snapshotPath").value_or(""));
    const std::string clip_path = Trim(ParseStringField(event_json, "clipPath").value_or(""));
    const bool evidence_available = !snapshot_path.empty() || !clip_path.empty();
    std::ostringstream bundle_payload;
    bundle_payload << "{";
    bool wrote_payload = false;
    const auto append_payload = [&](const std::string& key, const std::string& value) {
        if (value.empty()) {
            return;
        }
        if (wrote_payload) {
            bundle_payload << ",";
        }
        bundle_payload << "\"" << JsonEscape(key) << "\":\"" << JsonEscape(value) << "\"";
        wrote_payload = true;
    };
    append_payload("eventId", event_id);
    append_payload("snapshotPath", snapshot_path);
    append_payload("clipPath", clip_path);
    if (wrote_payload) {
        bundle_payload << ",\"releaseSafe\":\"1\"";
    } else {
        bundle_payload << "\"releaseSafe\":\"1\"";
    }
    bundle_payload << "}";

    std::ostringstream out;
    out << "{"
        << "\"releaseSafeEvidenceBundle\":{"
        << "\"available\":" << (evidence_available ? "true" : "false") << ","
        << "\"label\":\"redacted incident evidence bundle\","
        << "\"tokenRoute\":\"/lab/analysis/events/evidence/bundle-token\","
        << "\"bundleRoute\":\"/lab/analysis/events/evidence/bundle\","
        << "\"releaseSafe\":true,"
        << "\"snapshotPathPresent\":" << (snapshot_path.empty() ? "false" : "true") << ","
        << "\"clipPathPresent\":" << (clip_path.empty() ? "false" : "true") << ","
        << "\"bundlePayload\":" << bundle_payload.str() << ","
        << "\"rawEvidenceIncluded\":false"
        << "},"
        << "\"ruleDraftRoute\":{"
        << "\"available\":" << (event_id.empty() ? "false" : "true") << ","
        << "\"route\":\"/ops/rules?draftEventId=" << JsonEscape(UrlEncode(event_id)) << "\","
        << "\"mode\":\"manual-draft-only\","
        << "\"ruleRegistryWritePerformed\":false"
        << "},"
        << "\"alertDryRunRoute\":{"
        << "\"available\":true,"
        << "\"route\":\"/ops/api/alerts/deliveries/dry-run\","
        << "\"externalDeliveryPerformed\":false"
        << "},"
        << "\"sourceHealthRecheck\":{"
        << "\"available\":" << (source_id.empty() ? "false" : "true") << ","
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"route\":\"/ops/api/source-health\","
        << "\"dryRunOnly\":true,"
        << "\"sourceHealthWritePerformed\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29330 function
std::string OpsOperationalActionPackItemJson(const std::string& event_json,
                                             const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string incident_status = review.incident_status.empty() ? "new" : review.incident_status;
    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(rule_id.empty() ? "unmapped-rule" : rule_id) << "\","
        << "\"scenario\":\"" << JsonEscape(scenario) << "\","
        << "\"incidentStatus\":\"" << JsonEscape(incident_status) << "\","
        << "\"actions\":" << OpsOperationalActionPackActionsJson(event_json, review)
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29351 function
std::string OpsOperationalActionPackViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<std::string> items;
    items.reserve(event_json_records.size());
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        items.push_back(OpsOperationalActionPackItemJson(event_json, review));
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.operational-action-pack.v1\","
        << "\"status\":\"ops-operational-action-pack\","
        << "\"workflow\":\"manual-workflow-links\","
        << "\"items\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << items[i];
    }
    out << "],"
        << "\"itemCount\":" << items.size() << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"externalDeliveryPerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceHealthWritePerformed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29400 function
std::string OpsIncidentActionReadinessFollowUpJson(const std::string& type,
                                                   const std::string& label,
                                                   const std::string& status,
                                                   const std::string& route,
                                                   bool field_smoke_required,
                                                   const std::string& blocker) {
    std::ostringstream out;
    out << "{"
        << "\"type\":\"" << JsonEscape(type) << "\","
        << "\"label\":\"" << JsonEscape(label) << "\","
        << "\"status\":\"" << JsonEscape(status) << "\","
        << "\"route\":\"" << JsonEscape(route) << "\","
        << "\"operatorApprovalRequired\":true,"
        << "\"fieldSmokeRequired\":" << (field_smoke_required ? "true" : "false") << ","
        << "\"blocker\":\"" << JsonEscape(blocker) << "\","
        << "\"externalDeliveryPerformed\":false,"
        << "\"autoActionWritePerformed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29421 function
std::string OpsIncidentActionReadinessStatus(const std::vector<std::string>& blockers,
                                             bool field_smoke_required,
                                             bool review_present) {
    if (!review_present) {
        return "not-run";
    }
    if (!blockers.empty()) {
        return "blocked";
    }
    if (field_smoke_required) {
        return "field-smoke-needed";
    }
    return "ready";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29432 function
std::string OpsIncidentActionReadinessQueueItemJson(const std::string& event_json,
                                                    const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string incident_status = review.incident_status.empty() ? "new" : review.incident_status;
    const std::string review_status = review.review_status.empty() ? "new" : review.review_status;
    const std::string action_target = review.action_target.empty() ? "operator-follow-up" : review.action_target;
    const std::string snapshot_path = Trim(ParseStringField(event_json, "snapshotPath").value_or(""));
    const std::string clip_path = Trim(ParseStringField(event_json, "clipPath").value_or(""));
    const bool evidence_available = !snapshot_path.empty() || !clip_path.empty();

    std::vector<std::string> blockers;
    if (event_id.empty()) {
        blockers.push_back("event-id-missing");
    }
    if (source_id.empty()) {
        blockers.push_back("source-id-missing");
    }
    if (!evidence_available) {
        blockers.push_back("release-safe-evidence-missing");
    }

    const bool field_smoke_required =
        incident_status == "in-progress" || action_target == "alert" ||
        action_target == "notify" || action_target == "external-alert";
    const std::string readiness_status =
        OpsIncidentActionReadinessStatus(blockers, field_smoke_required, review.present);

    std::vector<std::string> followups;
    followups.push_back(OpsIncidentActionReadinessFollowUpJson(
        "release-safe-evidence-bundle",
        "Release-safe evidence bundle",
        evidence_available ? "ready" : "blocked",
        "/lab/analysis/events/evidence/bundle",
        false,
        evidence_available ? "" : "snapshot-or-clip-evidence-missing"));
    followups.push_back(OpsIncidentActionReadinessFollowUpJson(
        "manual-rule-draft",
        "Manual rule draft",
        event_id.empty() ? "blocked" : "ready",
        "/ops/rules?draftEventId=" + UrlEncode(event_id),
        false,
        event_id.empty() ? "event-id-missing" : ""));
    followups.push_back(OpsIncidentActionReadinessFollowUpJson(
        "alert-dry-run",
        "Alert dry-run",
        field_smoke_required ? "field-smoke-needed" : "ready",
        "/ops/api/alerts/deliveries/dry-run",
        field_smoke_required,
        field_smoke_required ? "external-endpoint-credential-field-smoke-required" : ""));
    followups.push_back(OpsIncidentActionReadinessFollowUpJson(
        "source-health-recheck",
        "Source health recheck",
        source_id.empty() ? "blocked" : "ready",
        "/ops/api/source-health",
        false,
        source_id.empty() ? "source-id-missing" : ""));

    std::ostringstream blockers_json;
    blockers_json << "[";
    for (std::size_t i = 0; i < blockers.size(); ++i) {
        if (i != 0) {
            blockers_json << ",";
        }
        blockers_json << "\"" << JsonEscape(blockers[i]) << "\"";
    }
    blockers_json << "]";

    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(rule_id.empty() ? "unmapped-rule" : rule_id) << "\","
        << "\"scenario\":\"" << JsonEscape(scenario) << "\","
        << "\"reviewStatus\":\"" << JsonEscape(review_status) << "\","
        << "\"incidentStatus\":\"" << JsonEscape(incident_status) << "\","
        << "\"actionTarget\":\"" << JsonEscape(action_target) << "\","
        << "\"readinessStatus\":\"" << JsonEscape(readiness_status) << "\","
        << "\"blockerReasons\":" << blockers_json.str() << ","
        << "\"fieldSmokeRequired\":" << (field_smoke_required ? "true" : "false") << ","
        << "\"manualApprovalRequired\":true,"
        << "\"autoActionWritePerformed\":false,"
        << "\"externalDeliveryPerformed\":false,"
        << "\"followUps\":[";
    for (std::size_t i = 0; i < followups.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << followups[i];
    }
    out << "]"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29531 function
std::string OpsIncidentActionReadinessQueueViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<std::string> items;
    items.reserve(event_json_records.size());
    int ready_count = 0;
    int blocked_count = 0;
    int field_smoke_needed_count = 0;
    int not_run_count = 0;
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        const std::string item = OpsIncidentActionReadinessQueueItemJson(event_json, review);
        const std::string status =
            Trim(ParseStringField(item, "readinessStatus").value_or("not-run"));
        if (status == "ready") {
            ++ready_count;
        } else if (status == "blocked") {
            ++blocked_count;
        } else if (status == "field-smoke-needed") {
            ++field_smoke_needed_count;
        } else {
            ++not_run_count;
        }
        items.push_back(item);
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.incident-action-readiness-queue.v1\","
        << "\"status\":\"ops-incident-action-readiness-queue\","
        << "\"workflow\":\"operator-supervised-action-readiness\","
        << "\"readinessCounts\":{"
        << "\"ready\":" << ready_count << ","
        << "\"blocked\":" << blocked_count << ","
        << "\"fieldSmokeNeeded\":" << field_smoke_needed_count << ","
        << "\"notRun\":" << not_run_count
        << "},"
        << "\"items\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << items[i];
    }
    out << "],"
        << "\"itemCount\":" << items.size() << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"manualApprovalRequired\":true,"
        << "\"externalDeliveryPerformed\":false,"
        << "\"autoActionWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceHealthWritePerformed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29604 function
std::string OpsEvidenceIntakeFieldPreconditionJson(const std::string& type,
                                                   const std::string& label,
                                                   const std::string& status,
                                                   const std::string& detail,
                                                   bool operator_follow_up_required) {
    std::ostringstream out;
    out << "{"
        << "\"type\":\"" << JsonEscape(type) << "\","
        << "\"label\":\"" << JsonEscape(label) << "\","
        << "\"status\":\"" << JsonEscape(status) << "\","
        << "\"detail\":\"" << JsonEscape(detail) << "\","
        << "\"operatorFollowUpRequired\":" << (operator_follow_up_required ? "true" : "false")
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29620 function
std::string OpsEvidenceIntakeFieldReadinessItemJson(const std::string& event_json,
                                                    const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string incident_status = review.incident_status.empty() ? "new" : review.incident_status;
    const std::string action_target = review.action_target.empty() ? "operator-follow-up" : review.action_target;
    const std::string snapshot_path = Trim(ParseStringField(event_json, "snapshotPath").value_or(""));
    const std::string clip_path = Trim(ParseStringField(event_json, "clipPath").value_or(""));
    const bool evidence_available = !snapshot_path.empty() || !clip_path.empty();
    const bool endpoint_credential_required =
        incident_status == "in-progress" || action_target == "alert" ||
        action_target == "notify" || action_target == "external-alert";

    const std::string evidence_intake_status = evidence_available ? "passed" : "blocked";
    const std::string source_health_readiness = source_id.empty() ? "blocked" : "not-run";
    const std::string field_smoke_status = endpoint_credential_required ? "blocked" : "not-run";
    const std::string field_smoke_credential_status =
        endpoint_credential_required ? "required-not-provided" : "not-required";
    const std::string redacted_evidence_bundle_status =
        evidence_available ? "release-safe-redacted-ready" : "redacted-evidence-missing";

    std::vector<std::string> preconditions;
    preconditions.push_back(OpsEvidenceIntakeFieldPreconditionJson(
        "redacted-evidence-intake",
        "Redacted evidence intake",
        evidence_intake_status,
        evidence_available ? "snapshot-or-clip reference present; raw path hidden from readiness UI"
                           : "snapshot-or-clip evidence missing",
        !evidence_available));
    preconditions.push_back(OpsEvidenceIntakeFieldPreconditionJson(
        "source-health-recheck",
        "Source health recheck",
        source_health_readiness,
        source_id.empty() ? "source-id-missing" : "dry-run recheck required before release evidence",
        true));
    preconditions.push_back(OpsEvidenceIntakeFieldPreconditionJson(
        "field-smoke-precondition",
        "Field smoke precondition",
        field_smoke_status,
        endpoint_credential_required ? "endpoint/credential required; no field PASS claimed"
                                     : "field smoke not required for this incident state",
        endpoint_credential_required));

    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(rule_id.empty() ? "unmapped-rule" : rule_id) << "\","
        << "\"scenario\":\"" << JsonEscape(scenario) << "\","
        << "\"incidentStatus\":\"" << JsonEscape(incident_status) << "\","
        << "\"actionTarget\":\"" << JsonEscape(action_target) << "\","
        << "\"evidenceIntakeStatus\":\"" << JsonEscape(evidence_intake_status) << "\","
        << "\"sourceHealthReadiness\":\"" << JsonEscape(source_health_readiness) << "\","
        << "\"fieldSmokeStatus\":\"" << JsonEscape(field_smoke_status) << "\","
        << "\"endpointCredentialRequired\":" << (endpoint_credential_required ? "true" : "false") << ","
        << "\"fieldSmokeCredentialStatus\":\"" << JsonEscape(field_smoke_credential_status) << "\","
        << "\"redactedEvidenceBundleStatus\":\"" << JsonEscape(redacted_evidence_bundle_status) << "\","
        << "\"releaseSafeEvidenceIntake\":{"
        << "\"snapshotPathPresent\":" << (snapshot_path.empty() ? "false" : "true") << ","
        << "\"clipPathPresent\":" << (clip_path.empty() ? "false" : "true") << ","
        << "\"redactedEvidenceBundleStatus\":\"" << JsonEscape(redacted_evidence_bundle_status) << "\","
        << "\"rawEvidenceIncluded\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"sourceUrlMaterialExposed\":false,"
        << "\"rawEvidenceMaterialExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"providerMaterialExposed\":false"
        << "},"
        << "\"preconditions\":[";
    for (std::size_t i = 0; i < preconditions.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << preconditions[i];
    }
    out << "],"
        << "\"redaction\":{"
        << "\"credentialMaterialExposed\":false,"
        << "\"sourceUrlMaterialExposed\":false,"
        << "\"rawEvidenceMaterialExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"providerMaterialExposed\":false,"
        << "\"endpointCredentialFieldPassClaimed\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29712 function
void OpsEvidenceIntakeFieldReadinessCountStatus(const std::string& status,
                                                int* passed_count,
                                                int* failed_count,
                                                int* blocked_count,
                                                int* not_run_count) {
    if (status == "passed") {
        ++(*passed_count);
    } else if (status == "failed") {
        ++(*failed_count);
    } else if (status == "blocked") {
        ++(*blocked_count);
    } else {
        ++(*not_run_count);
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29728 function
std::string OpsEvidenceIntakeFieldReadinessViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<std::string> items;
    items.reserve(event_json_records.size());
    int passed_count = 0;
    int failed_count = 0;
    int blocked_count = 0;
    int not_run_count = 0;
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        const std::string item = OpsEvidenceIntakeFieldReadinessItemJson(event_json, review);
        OpsEvidenceIntakeFieldReadinessCountStatus(
            Trim(ParseStringField(item, "evidenceIntakeStatus").value_or("not-run")),
            &passed_count,
            &failed_count,
            &blocked_count,
            &not_run_count);
        OpsEvidenceIntakeFieldReadinessCountStatus(
            Trim(ParseStringField(item, "sourceHealthReadiness").value_or("not-run")),
            &passed_count,
            &failed_count,
            &blocked_count,
            &not_run_count);
        OpsEvidenceIntakeFieldReadinessCountStatus(
            Trim(ParseStringField(item, "fieldSmokeStatus").value_or("not-run")),
            &passed_count,
            &failed_count,
            &blocked_count,
            &not_run_count);
        items.push_back(item);
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.evidence-intake-field-readiness.v1\","
        << "\"status\":\"ops-evidence-intake-field-readiness\","
        << "\"workflow\":\"redacted-evidence-field-readiness\","
        << "\"readinessCounts\":{"
        << "\"passed\":" << passed_count << ","
        << "\"failed\":" << failed_count << ","
        << "\"blocked\":" << blocked_count << ","
        << "\"notRun\":" << not_run_count
        << "},"
        << "\"items\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << items[i];
    }
    out << "],"
        << "\"itemCount\":" << items.size() << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"releaseSafeEvidenceIntake\":true,"
        << "\"endpointCredentialFieldPassClaimed\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"sourceUrlMaterialExposed\":false,"
        << "\"rawEvidenceMaterialExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"providerMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29810 function
std::int64_t OpsRuntimeEvidenceWindowEventTimeMs(const std::string& event_json,
                                                 const OpsEventReviewState& review) {
    const std::int64_t event_time = OpsIncidentTriageBoardEventTimeMs(event_json, review);
    return event_time < 0 ? 0 : event_time;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29816 function
std::string OpsRuntimeEvidenceWindowPacketJson(const std::string& event_json,
                                               const OpsEventReviewState& review) {
    constexpr std::int64_t kRuntimeEvidenceWindowMs = 15000;
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string incident_status = review.incident_status.empty() ? "new" : review.incident_status;
    const std::int64_t event_time_ms = OpsRuntimeEvidenceWindowEventTimeMs(event_json, review);
    const std::int64_t window_start_ms = event_time_ms > kRuntimeEvidenceWindowMs
                                             ? event_time_ms - kRuntimeEvidenceWindowMs
                                             : 0;
    const std::int64_t window_end_ms = event_time_ms + kRuntimeEvidenceWindowMs;
    const bool event_record_present = !Trim(event_json).empty();
    const bool source_present = !source_id.empty();
    const bool snapshot_present = !Trim(ParseStringField(event_json, "snapshotPath").value_or("")).empty();
    const bool clip_present = !Trim(ParseStringField(event_json, "clipPath").value_or("")).empty();

    std::ostringstream out;
    out << "{"
        << "\"windowScope\":\"bounded-local-runtime-source-event\","
        << "\"boundedLocalBuffer\":true,"
        << "\"pageSessionOnly\":true,"
        << "\"eventWindowMs\":" << kRuntimeEvidenceWindowMs << ","
        << "\"windowStartMs\":" << window_start_ms << ","
        << "\"windowEndMs\":" << window_end_ms << ","
        << "\"eventTimeMs\":" << event_time_ms << ","
        << "\"eventRecordPresent\":" << (event_record_present ? "true" : "false") << ","
        << "\"sourceRuntimeStatus\":\"" << JsonEscape(source_present ? "source-linked-not-polled" : "source-missing")
        << "\","
        << "\"eventBufferStatus\":\"" << JsonEscape(event_record_present ? "event-record-bounded" : "event-record-missing")
        << "\","
        << "\"metadataWindowStatus\":\"not-run\","
        << "\"snapshotPathPresent\":" << (snapshot_present ? "true" : "false") << ","
        << "\"clipPathPresent\":" << (clip_present ? "true" : "false") << ","
        << "\"persistentArchiveCreated\":false,"
        << "\"longrunSubstitute\":false,"
        << "\"thirtyMinutePassClaimed\":false,"
        << "\"oneHundredTwentyMinutePassClaimed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29861 function
std::string OpsRuntimeEvidenceWindowItemJson(const std::string& event_json,
                                             const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string incident_status = review.incident_status.empty() ? "new" : review.incident_status;
    const bool event_record_present = !Trim(event_json).empty();
    const bool source_present = !source_id.empty();
    const std::string readiness_status =
        event_record_present && source_present ? "bounded" : "blocked";

    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(rule_id.empty() ? "unmapped-rule" : rule_id) << "\","
        << "\"scenario\":\"" << JsonEscape(scenario) << "\","
        << "\"incidentStatus\":\"" << JsonEscape(incident_status) << "\","
        << "\"runtimeWindowStatus\":\"" << JsonEscape(readiness_status) << "\","
        << "\"runtimeEvidencePacket\":" << OpsRuntimeEvidenceWindowPacketJson(event_json, review)
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29888 function
std::string OpsRuntimeEvidenceWindowViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<std::string> items;
    items.reserve(event_json_records.size());
    int bounded_count = 0;
    int blocked_count = 0;
    int not_run_count = 0;
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        const std::string item = OpsRuntimeEvidenceWindowItemJson(event_json, review);
        const std::string status = Trim(ParseStringField(item, "runtimeWindowStatus").value_or("not-run"));
        if (status == "bounded") {
            ++bounded_count;
        } else if (status == "blocked") {
            ++blocked_count;
        } else {
            ++not_run_count;
        }
        items.push_back(item);
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.runtime-evidence-window.v1\","
        << "\"status\":\"ops-runtime-evidence-window\","
        << "\"workflow\":\"bounded-runtime-source-event-window\","
        << "\"windowScope\":\"bounded-local-runtime-source-event\","
        << "\"boundedLocalBuffer\":true,"
        << "\"pageSessionOnly\":true,"
        << "\"eventWindowMs\":15000,"
        << "\"windowCounts\":{"
        << "\"bounded\":" << bounded_count << ","
        << "\"blocked\":" << blocked_count << ","
        << "\"notRun\":" << not_run_count
        << "},"
        << "\"items\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << items[i];
    }
    out << "],"
        << "\"itemCount\":" << items.size() << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"boundedLocalBuffer\":true,"
        << "\"pageSessionOnly\":true,"
        << "\"persistentArchiveCreated\":false,"
        << "\"longrunSubstitute\":false,"
        << "\"thirtyMinutePassClaimed\":false,"
        << "\"oneHundredTwentyMinutePassClaimed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29961 function
std::string OpsRuleWhatIfPreviewJsonArrayOrFallback(const std::string& value,
                                                    const std::string& fallback) {
    const std::string trimmed = Trim(value);
    if (trimmed.size() >= 2 && trimmed.front() == '[' && trimmed.back() == ']') {
        return trimmed;
    }
    return fallback;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29970 function
std::string OpsRuleWhatIfPreviewDraftJson(const std::string& event_json,
                                          const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string source_event_type =
        Trim(ParseStringField(event_json, "eventType")
                 .value_or(ParseStringField(event_json, "className").value_or("event")));
    const std::string rule_review = OpsIncidentRuleSuggestionReviewJson(event_json);
    const std::string matching_suggestion =
        ExtractObjectField(rule_review, "matchingRuleSuggestion").value_or("{}");
    const std::string draft_rule = ExtractObjectField(matching_suggestion, "draftRule").value_or("{}");
    const bool matching_present =
        ExtractJsonValueField(rule_review, "matchingRuleSuggestionPresent").value_or("false") == "true";
    const std::string candidate_status =
        Trim(ParseStringField(rule_review, "candidateStatus").value_or("no-rule-suggestion-candidate"));
    const std::string proposed_rule_kind =
        Trim(ParseStringField(rule_review, "proposedRuleKind")
                 .value_or(ParseStringField(matching_suggestion, "kind").value_or("")));
    const std::string draft_event_type =
        Trim(ParseStringField(draft_rule, "eventType")
                 .value_or(ParseStringField(draft_rule, "type")
                               .value_or(proposed_rule_kind.empty() ? source_event_type : proposed_rule_kind)));
    const std::string classes_json = OpsRuleWhatIfPreviewJsonArrayOrFallback(
        ExtractJsonValueField(draft_rule, "classes")
            .value_or(ExtractJsonValueField(draft_rule, "targetClasses").value_or("")),
        "[\"person\"]");
    const std::string min_confidence = ExtractJsonValueField(draft_rule, "minConfidence").value_or("null");
    const std::string min_duration_ms = ExtractJsonValueField(draft_rule, "minDurationMs").value_or("null");
    const std::string line_direction =
        Trim(ParseStringField(draft_rule, "direction")
                 .value_or(ParseStringField(draft_rule, "lineDirection")
                               .value_or(ParseStringField(draft_rule, "allowedDirection").value_or("any"))));
    const std::string manual_draft_route =
        "/ops/rules?draftEventId=" + UrlEncode(event_id) + "&whatIfPreview=1";

    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(rule_id.empty() ? "unmapped-rule" : rule_id) << "\","
        << "\"scenario\":\"" << JsonEscape(scenario) << "\","
        << "\"candidateStatus\":\"" << JsonEscape(candidate_status) << "\","
        << "\"matchingRuleSuggestionPresent\":" << (matching_present ? "true" : "false") << ","
        << "\"draftComparison\":{"
        << "\"sourceEventType\":\"" << JsonEscape(source_event_type.empty() ? "event" : source_event_type) << "\","
        << "\"proposedRuleKind\":\"" << JsonEscape(proposed_rule_kind.empty() ? draft_event_type : proposed_rule_kind) << "\","
        << "\"comparisonResult\":\"" << (matching_present ? "candidate-ready" : "no-rule-suggestion-candidate")
        << "\","
        << "\"fullReplayEngineExecuted\":false"
        << "},"
        << "\"conditionPreview\":{"
        << "\"eventType\":\"" << JsonEscape(draft_event_type.empty() ? source_event_type : draft_event_type)
        << "\","
        << "\"classes\":" << classes_json << ","
        << "\"minConfidence\":" << min_confidence << ","
        << "\"minDurationMs\":" << min_duration_ms << ","
        << "\"lineDirection\":\"" << JsonEscape(line_direction.empty() ? "any" : line_direction) << "\","
        << "\"geometrySource\":\"operator-manual-review\""
        << "},"
        << "\"manualDraftRoute\":\"" << JsonEscape(manual_draft_route) << "\","
        << "\"draftOnly\":true,"
        << "\"manualSaveRequired\":true,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"autoRuleApplied\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30042 function
std::string OpsRuleWhatIfPreviewItemJson(const std::string& event_json,
                                         const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"preview\":" << OpsRuleWhatIfPreviewDraftJson(event_json, review)
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30055 function
std::string OpsRuleWhatIfPreviewViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<std::string> previews;
    previews.reserve(event_json_records.size());
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        previews.push_back(OpsRuleWhatIfPreviewItemJson(event_json, review));
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.rule-what-if-preview.v1\","
        << "\"status\":\"ops-rule-what-if-preview\","
        << "\"workflow\":\"selected-incident-draft-only\","
        << "\"items\":[";
    for (std::size_t i = 0; i < previews.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << previews[i];
    }
    out << "],"
        << "\"itemCount\":" << previews.size() << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"draftOnly\":true,"
        << "\"manualSaveRequired\":true,"
        << "\"fullReplayEngineExecuted\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"autoRuleApplied\":false,"
        << "\"autoProfileApplied\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30107 function
std::string OpsApprovalGatedRuleDraftIssuesJson(const std::vector<std::string>& issues) {
    std::ostringstream out;
    out << "[";
    for (std::size_t i = 0; i < issues.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(issues[i]) << "\"";
    }
    out << "]";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30120 function
std::string OpsApprovalGatedRuleDraftValidationState(const std::string& event_json,
                                                     const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string rule_review = OpsIncidentRuleSuggestionReviewJson(event_json);
    const bool matching_present =
        ExtractJsonValueField(rule_review, "matchingRuleSuggestionPresent").value_or("false") == "true";
    if (event_id.empty() || !matching_present) {
        return "blocked";
    }
    return "ready-for-approval";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30134 function
std::string OpsApprovalGatedRuleDraftReadinessItemJson(const std::string& event_json,
                                                       const OpsEventReviewState& review) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string rule_review = OpsIncidentRuleSuggestionReviewJson(event_json);
    const std::string matching_suggestion =
        ExtractObjectField(rule_review, "matchingRuleSuggestion").value_or("{}");
    const std::string draft_rule = ExtractObjectField(matching_suggestion, "draftRule").value_or("{}");
    const bool matching_present =
        ExtractJsonValueField(rule_review, "matchingRuleSuggestionPresent").value_or("false") == "true";
    const std::string candidate_status =
        Trim(ParseStringField(rule_review, "candidateStatus").value_or("no-rule-suggestion-candidate"));
    const std::string source_event_type =
        Trim(ParseStringField(event_json, "eventType")
                 .value_or(ParseStringField(event_json, "className").value_or("event")));
    const std::string draft_event_type =
        Trim(ParseStringField(draft_rule, "eventType")
                 .value_or(ParseStringField(draft_rule, "type")
                               .value_or(ParseStringField(matching_suggestion, "kind")
                                             .value_or(source_event_type))));
    const std::string classes_json = OpsRuleWhatIfPreviewJsonArrayOrFallback(
        ExtractJsonValueField(draft_rule, "classes")
            .value_or(ExtractJsonValueField(draft_rule, "targetClasses").value_or("")),
        "[\"person\"]");
    const std::string min_confidence = ExtractJsonValueField(draft_rule, "minConfidence").value_or("null");
    const std::string min_duration_ms = ExtractJsonValueField(draft_rule, "minDurationMs").value_or("null");
    const std::string line_direction =
        Trim(ParseStringField(draft_rule, "direction")
                 .value_or(ParseStringField(draft_rule, "lineDirection")
                               .value_or(ParseStringField(draft_rule, "allowedDirection").value_or("any"))));
    const std::string validation_state = OpsApprovalGatedRuleDraftValidationState(event_json, review);
    const std::string approval_state =
        validation_state == "ready-for-approval" ? "approval-required" : "blocked";
    const std::string manual_draft_route =
        "/ops/rules?draftEventId=" + UrlEncode(event_id) +
        "&whatIfPreview=1&approvalDraft=1&approvalState=" + UrlEncode(approval_state);

    std::vector<std::string> issues;
    if (event_id.empty()) {
        issues.push_back("event-id-missing");
    }
    if (!matching_present) {
        issues.push_back("rule-suggestion-candidate-missing");
    }

    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(rule_id.empty() ? "unmapped-rule" : rule_id) << "\","
        << "\"scenario\":\"" << JsonEscape(scenario) << "\","
        << "\"candidateStatus\":\"" << JsonEscape(candidate_status) << "\","
        << "\"approvalState\":\"" << JsonEscape(approval_state) << "\","
        << "\"validationState\":\"" << JsonEscape(validation_state) << "\","
        << "\"validationSummary\":{"
        << "\"status\":\"" << JsonEscape(validation_state) << "\","
        << "\"issues\":" << OpsApprovalGatedRuleDraftIssuesJson(issues) << ","
        << "\"matchingRuleSuggestionPresent\":" << (matching_present ? "true" : "false") << ","
        << "\"manualApprovalRequired\":true,"
        << "\"operatorValidationRequired\":true,"
        << "\"geometryReviewRequired\":true,"
        << "\"fullReplayEvidenceStatus\":\"not-run\","
        << "\"fullReplayEngineExecuted\":false"
        << "},"
        << "\"stagedDraft\":{"
        << "\"eventType\":\"" << JsonEscape(draft_event_type.empty() ? source_event_type : draft_event_type)
        << "\","
        << "\"classes\":" << classes_json << ","
        << "\"minConfidence\":" << min_confidence << ","
        << "\"minDurationMs\":" << min_duration_ms << ","
        << "\"lineDirection\":\"" << JsonEscape(line_direction.empty() ? "any" : line_direction) << "\","
        << "\"manualDraftRoute\":\"" << JsonEscape(manual_draft_route) << "\","
        << "\"draftOnly\":true,"
        << "\"stagedOnly\":true,"
        << "\"manualSaveRequired\":true,"
        << "\"noAutoSave\":true,"
        << "\"noAutoApply\":true,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"profileRegistryWritePerformed\":false,"
        << "\"autoRuleApplied\":false,"
        << "\"autoProfileApplied\":false"
        << "},"
        << "\"manualApprovalRequired\":true,"
        << "\"noAutoSave\":true,"
        << "\"noAutoApply\":true,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"profileRegistryWritePerformed\":false,"
        << "\"fullReplayEngineExecuted\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30230 function
std::string OpsApprovalGatedRuleDraftReadinessViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<std::string> items;
    items.reserve(event_json_records.size());
    int ready_for_approval_count = 0;
    int blocked_count = 0;
    int not_run_count = 0;
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        const std::string validation_state = OpsApprovalGatedRuleDraftValidationState(event_json, review);
        if (validation_state == "ready-for-approval") {
            ++ready_for_approval_count;
        } else if (validation_state == "blocked") {
            ++blocked_count;
        } else {
            ++not_run_count;
        }
        items.push_back(OpsApprovalGatedRuleDraftReadinessItemJson(event_json, review));
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.approval-gated-rule-draft-readiness.v1\","
        << "\"status\":\"ops-approval-gated-rule-draft-readiness\","
        << "\"workflow\":\"approval-gated-staged-draft\","
        << "\"readinessCounts\":{"
        << "\"readyForApproval\":" << ready_for_approval_count << ","
        << "\"blocked\":" << blocked_count << ","
        << "\"notRun\":" << not_run_count
        << "},"
        << "\"items\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << items[i];
    }
    out << "],"
        << "\"itemCount\":" << items.size() << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"manualApprovalRequired\":true,"
        << "\"manualSaveRequired\":true,"
        << "\"draftOnly\":true,"
        << "\"stagedOnly\":true,"
        << "\"noAutoSave\":true,"
        << "\"noAutoApply\":true,"
        << "\"fullReplayEngineExecuted\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"profileRegistryWritePerformed\":false,"
        << "\"autoRuleApplied\":false,"
        << "\"autoProfileApplied\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30303 function
std::string OpsEventReviewInboxItemJson(const std::string& event_json,
                                        const OpsEventReviewState& review) {
    std::ostringstream out;
    out << "{"
        << "\"event\":";
    if (event_json.empty()) {
        out << "null";
    } else {
        out << event_json;
    }
    out << ",\"review\":" << OpsEventReviewStateJson(review)
        << ",\"incidentRuleSuggestionReview\":" << OpsIncidentRuleSuggestionReviewJson(event_json)
        << ",\"vlmReview\":" << OpsVlmEventReviewJson(event_json)
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30320 function
std::string OpsIncidentMemoryStringArrayJson(const std::vector<std::string>& values) {
    std::ostringstream out;
    out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(values[i]) << "\"";
    }
    out << "]";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30333 function
std::string OpsIncidentMemoryQueryValue(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& key) {
    const auto it = query.find(key);
    return it == query.end() ? std::string() : Trim(it->second);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30340 function
std::string OpsIncidentMemoryEventRuleId(const std::string& event_json) {
    if (const auto rule_id = ParseStringField(event_json, "ruleId");
        rule_id.has_value() && !Trim(*rule_id).empty()) {
        return Trim(*rule_id);
    }
    if (const auto va_rule_id = ParseStringField(event_json, "vaRuleId");
        va_rule_id.has_value() && !Trim(*va_rule_id).empty()) {
        return Trim(*va_rule_id);
    }
    if (const auto metadata = ExtractObjectField(event_json, "metadata"); metadata.has_value()) {
        if (const auto metadata_rule = ParseStringField(*metadata, "ruleId");
            metadata_rule.has_value() && !Trim(*metadata_rule).empty()) {
            return Trim(*metadata_rule);
        }
        if (const auto metadata_va_rule = ParseStringField(*metadata, "vaRuleId");
            metadata_va_rule.has_value() && !Trim(*metadata_va_rule).empty()) {
            return Trim(*metadata_va_rule);
        }
    }
    return "";
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30369 function
std::string OpsOperatorOutcomeMemoryOutcome(const OpsEventReviewState& review) {
    const std::string action = NormalizeOpsVlmReviewAction(review.vlm_action);
    const std::string review_status = NormalizeOpsEventReviewStatus(review.review_status);
    const std::string classification = NormalizeOpsEventReviewClassification(review.classification);
    const std::string incident_status = NormalizeOpsIncidentStatus(review.incident_status);
    if (action == "accept" || review_status == "confirmed" || classification == "true-positive" ||
        incident_status == "acknowledged" || incident_status == "closed") {
        return "accept";
    }
    if (action == "dismiss" || review_status == "dismissed" ||
        classification == "false-positive" || incident_status == "false-positive") {
        return "dismiss";
    }
    if (action == "review-needed" || review_status == "needs-follow-up" ||
        incident_status == "review-needed") {
        return "review-needed";
    }
    return "not-reviewed";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30389 function
void OpsOperatorOutcomeMemoryAddCount(const std::string& outcome,
                                      OpsOperatorOutcomeMemoryCounts* counts) {
    if (counts == nullptr) {
        return;
    }
    if (outcome == "accept") {
        counts->accepted_count += 1;
    } else if (outcome == "dismiss") {
        counts->dismissed_count += 1;
    } else if (outcome == "review-needed") {
        counts->review_needed_count += 1;
    } else {
        counts->not_reviewed_count += 1;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30405 function
std::string OpsOperatorOutcomeMemoryCountsJson(
    const OpsOperatorOutcomeMemoryCounts& counts) {
    std::ostringstream out;
    out << "{"
        << "\"acceptedCount\":" << counts.accepted_count << ","
        << "\"dismissedCount\":" << counts.dismissed_count << ","
        << "\"reviewNeededCount\":" << counts.review_needed_count << ","
        << "\"notReviewedCount\":" << counts.not_reviewed_count
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30417 function
OpsOperatorOutcomeMemoryCounts OpsOperatorOutcomeMemoryCountsForKey(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews,
    const std::string& wanted_key) {
    OpsOperatorOutcomeMemoryCounts counts;
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
        const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
        const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
        const std::string key = OpsIncidentTriageBoardSimilarIncidentKey(
            source_id.empty() ? "unknown-source" : source_id,
            rule_id.empty() ? "unmapped-rule" : rule_id,
            scenario,
            review);
        if (key == wanted_key) {
            OpsOperatorOutcomeMemoryAddCount(OpsOperatorOutcomeMemoryOutcome(review), &counts);
        }
    }
    return counts;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30445 function
std::string OpsOperatorOutcomeMemoryHistoryHintText(
    const std::string& outcome,
    const OpsOperatorOutcomeMemoryCounts& counts) {
    if (outcome == "accept") {
        return "accepted outcome history exists; prioritize confirmed operator action pattern";
    }
    if (outcome == "dismiss") {
        return "dismissed outcome history exists; inspect false-positive or tuning context before action";
    }
    if (outcome == "review-needed") {
        return "review-needed outcome remains; keep incident in operator triage lane";
    }
    if (counts.accepted_count > counts.dismissed_count &&
        counts.accepted_count > counts.review_needed_count) {
        return "similar history leans accepted; verify evidence before applying action";
    }
    if (counts.dismissed_count > counts.accepted_count &&
        counts.dismissed_count > counts.review_needed_count) {
        return "similar history leans dismissed; check false-positive and tuning notes";
    }
    if (counts.review_needed_count > 0) {
        return "similar history has review-needed cases; keep human review before action";
    }
    return "no operator outcome history yet; treat as first review";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30471 function
std::string OpsOperatorOutcomeMemoryHistoryHintJson(
    const std::string& outcome,
    const OpsOperatorOutcomeMemoryCounts& counts) {
    std::ostringstream out;
    out << "{"
        << "\"outcome\":\"" << JsonEscape(outcome) << "\","
        << "\"deterministicHistoryHint\":\""
        << JsonEscape(OpsOperatorOutcomeMemoryHistoryHintText(outcome, counts)) << "\","
        << "\"historyBasis\":\"review-state-and-audit-action-reference\","
        << "\"modelProviderDependency\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30485 function
std::string OpsOperatorOutcomeMemoryItemJson(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    const std::string event_id = review.event_id.empty()
                                     ? Trim(ParseStringField(event_json, "eventId").value_or(""))
                                     : review.event_id;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    const std::string scenario = OpsIncidentTriageBoardScenario(event_json);
    const std::string similar_key = OpsIncidentTriageBoardSimilarIncidentKey(
        source_id.empty() ? "unknown-source" : source_id,
        rule_id.empty() ? "unmapped-rule" : rule_id,
        scenario,
        review);
    const std::string outcome = OpsOperatorOutcomeMemoryOutcome(review);
    const OpsOperatorOutcomeMemoryCounts counts =
        OpsOperatorOutcomeMemoryCountsForKey(event_json_records, reviews, similar_key);

    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id.empty() ? "unknown-source" : source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(rule_id.empty() ? "unmapped-rule" : rule_id) << "\","
        << "\"scenario\":\"" << JsonEscape(scenario) << "\","
        << "\"similarIncidentKey\":\"" << JsonEscape(similar_key) << "\","
        << "\"currentOutcome\":\"" << JsonEscape(outcome) << "\","
        << "\"deterministicHistoryHint\":"
        << OpsOperatorOutcomeMemoryHistoryHintJson(outcome, counts) << ","
        << "\"reviewStateBasis\":{"
        << "\"reviewStatus\":\"" << JsonEscape(review.review_status.empty() ? "new" : review.review_status) << "\","
        << "\"incidentStatus\":\"" << JsonEscape(review.incident_status.empty() ? "new" : review.incident_status) << "\","
        << "\"classification\":\""
        << JsonEscape(review.classification.empty() ? "unclassified" : review.classification) << "\","
        << "\"vlmAction\":\"" << JsonEscape(review.vlm_action.empty() ? "not-reviewed" : review.vlm_action) << "\","
        << "\"updatedAtMs\":" << review.updated_at_ms << ","
        << "\"operatorNoteIncluded\":false"
        << "},"
        << "\"auditActionRefs\":{"
        << "\"area\":\"events\","
        << "\"eventReviewUpdate\":\"event-review-update\","
        << "\"incidentActionUpdate\":\"incident-action-update\","
        << "\"auditRoute\":\"/ops/api/audit?area=events\","
        << "\"rawAuditBodyIncluded\":false"
        << "},"
        << "\"outcomeCounts\":" << OpsOperatorOutcomeMemoryCountsJson(counts) << ","
        << "\"rawJsonExposed\":false,"
        << "\"sourceUrlExposed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30538 function
std::string OpsOperatorOutcomeMemoryViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<std::string> items;
    items.reserve(event_json_records.size());
    OpsOperatorOutcomeMemoryCounts aggregate_counts;
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        OpsOperatorOutcomeMemoryAddCount(
            OpsOperatorOutcomeMemoryOutcome(review), &aggregate_counts);
        items.push_back(OpsOperatorOutcomeMemoryItemJson(
            event_json, review, event_json_records, reviews));
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.operator-outcome-memory.v1\","
        << "\"status\":\"ops-operator-outcome-memory\","
        << "\"workflow\":\"review-audit-history-hint\","
        << "\"aggregateOutcomeCounts\":"
        << OpsOperatorOutcomeMemoryCountsJson(aggregate_counts) << ","
        << "\"items\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << items[i];
    }
    out << "],"
        << "\"itemCount\":" << items.size() << ","
        << "\"contract\":{"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"operatorOutcomeMemoryPersistentWrite\":false,"
        << "\"autoLearningApplied\":false,"
        << "\"autoActionApplied\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30593 function
bool OpsIncidentMemoryRecordMatchesFilters(const std::string& event_json,
                                           const OpsEventReviewState& review,
                                           const std::string& rule_id,
                                           const std::string& source_id,
                                           const std::string& incident_status) {
    if (!rule_id.empty() && OpsIncidentMemoryEventRuleId(event_json) != rule_id) {
        return false;
    }
    if (!source_id.empty()) {
        const std::string stream_id = Trim(ParseStringField(event_json, "streamId").value_or(""));
        const std::string channel_id = Trim(ParseStringField(event_json, "channelId").value_or(""));
        const std::string event_source_id =
            Trim(ParseStringField(event_json, "sourceId").value_or(""));
        if (source_id != stream_id && source_id != channel_id && source_id != event_source_id) {
            return false;
        }
    }
    if (!incident_status.empty() &&
        NormalizeOpsIncidentStatus(review.incident_status) != NormalizeOpsIncidentStatus(incident_status)) {
        return false;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30617 function
std::string OpsIncidentReviewProjectionJson(const OpsEventReviewState& review) {
    const std::string incident_id = review.incident_id.empty() ? "incident:" + review.event_id
                                                               : review.incident_id;
    std::ostringstream out;
    out << "{"
        << "\"id\":\"review-" << JsonEscape(review.event_id) << "\","
        << "\"receivedAtMs\":" << review.updated_at_ms << ","
        << "\"action\":\"event-review-state\","
        << "\"target\":\"" << JsonEscape(incident_id) << "\","
        << "\"summary\":\"review " << JsonEscape(review.review_status)
        << " classification " << JsonEscape(review.classification)
        << " incident " << JsonEscape(review.incident_status)
        << " action " << JsonEscape(review.action_target) << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30672 function
std::string OpsVlmSummaryCandidateReviewJson(const std::string& search_query,
                                             const std::string& source_id) {
    std::string candidate_report;
    std::string error_message;
    bool report_ready = false;
    if (!search_query.empty()) {
        VlmSummarySearchRequest options;
        options.query = search_query;
        options.source_id = source_id;
        options.limit = 6;
        report_ready = BuildVlmSummaryCandidates(options, &candidate_report, &error_message);
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.vlm-summary-candidate-review.v1\","
        << "\"status\":\"ops-vlm-summary-candidate-review\","
        << "\"candidateStatus\":\"ops-manual-review-not-auto-applied\","
        << "\"sourceCandidateSchema\":\"media-server.vlm-summary-search-candidates.v1\","
        << "\"manualReviewRoute\":\"/ops/events\","
        << "\"opsOnly\":true,"
        << "\"query\":\"" << JsonEscape(search_query) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"sourceCandidateReport\":" << (report_ready ? candidate_report : "null") << ","
        << "\"error\":\"" << JsonEscape(search_query.empty() ? "" : error_message) << "\","
        << "\"contract\":{"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"autoRuleApplied\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30714 function
std::string OpsIncidentMemorySearchViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews,
    const std::unordered_map<std::string, std::string>& query) {
    const std::string search_query = OpsIncidentMemoryQueryValue(query, "q");
    const std::string rule_id = OpsIncidentMemoryQueryValue(query, "ruleId");
    const std::string source_id = OpsIncidentMemoryQueryValue(query, "sourceId");
    const std::string incident_status = OpsIncidentMemoryQueryValue(query, "incidentStatus");
    const std::string start_time_ms = OpsIncidentMemoryQueryValue(query, "startTimeMs");
    const std::string end_time_ms = OpsIncidentMemoryQueryValue(query, "endTimeMs");

    IncidentMemorySearchRequest memory_request;
    memory_request.query = search_query;
    memory_request.limit = 12;
    memory_request.event_records_json.reserve(event_json_records.size());
    memory_request.ops_audit_records_json.reserve(event_json_records.size());
    for (const std::string& event_json : event_json_records) {
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        if (!OpsIncidentMemoryRecordMatchesFilters(
                event_json, review, rule_id, source_id, incident_status)) {
            continue;
        }
        memory_request.event_records_json.push_back(event_json);
        if (review.present) {
            memory_request.ops_audit_records_json.push_back(OpsIncidentReviewProjectionJson(review));
        }
    }
    IncidentMemorySearchResult memory_result;
    std::string error_message;
    (void)SearchIncidentMemory(memory_request, &memory_result, &error_message);

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.incident-memory-search-view.v1\","
        << "\"status\":\"ops-incident-memory-search\","
        << "\"query\":\"" << JsonEscape(search_query) << "\","
        << "\"backend\":\"" << JsonEscape(memory_result.backend) << "\","
        << "\"documentCount\":" << memory_result.document_count << ","
        << "\"hitCount\":" << memory_result.hits.size() << ","
        << "\"modelProviderDependency\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"filters\":{"
        << "\"ruleId\":\"" << JsonEscape(rule_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"incidentStatus\":\"" << JsonEscape(incident_status) << "\","
        << "\"startTimeMs\":\"" << JsonEscape(start_time_ms) << "\","
        << "\"endTimeMs\":\"" << JsonEscape(end_time_ms) << "\""
        << "},"
        << "\"vlmSummaryCandidateReview\":"
        << OpsVlmSummaryCandidateReviewJson(search_query, source_id)
        << ","
        << "\"hits\":[";
    for (std::size_t i = 0; i < memory_result.hits.size(); ++i) {
        const auto& hit = memory_result.hits[i];
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"documentId\":\"" << JsonEscape(hit.document_id) << "\","
            << "\"sourceKind\":\"" << JsonEscape(hit.source_kind) << "\","
            << "\"incidentId\":\"" << JsonEscape(hit.incident_id) << "\","
            << "\"sourceId\":\"" << JsonEscape(hit.source_id) << "\","
            << "\"title\":\"" << JsonEscape(hit.title) << "\","
            << "\"summary\":\"" << JsonEscape(hit.summary) << "\","
            << "\"score\":" << hit.score << ","
            << "\"matchedTerms\":" << OpsIncidentMemoryStringArrayJson(hit.matched_terms)
            << ",\"highlightFragments\":"
            << OpsIncidentMemoryStringArrayJson(hit.highlight_fragments)
            << "}";
    }
    out << "]"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30822 function
std::string OpsV300EventEvidenceSearchQueryValue(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& primary_key,
    const std::string& fallback_key) {
    const auto primary = query.find(primary_key);
    if (primary != query.end() && !Trim(primary->second).empty()) {
        return Trim(primary->second);
    }
    if (!fallback_key.empty()) {
        const auto fallback = query.find(fallback_key);
        if (fallback != query.end()) {
            return Trim(fallback->second);
        }
    }
    return "";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30839 function
bool OpsV300EventEvidenceSearchBoolQuery(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& key) {
    const std::string value = LowerAscii(OpsV300EventEvidenceSearchQueryValue(query, key));
    return value == "1" || value == "true" || value == "yes" || value == "pinned";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30846 function
std::string OpsV300NestedRefPath(const std::string& object_json, const std::string& key) {
    if (const auto nested = ExtractObjectField(object_json, key); nested.has_value()) {
        return Trim(ParseStringField(*nested, "path").value_or(""));
    }
    return Trim(ParseStringField(object_json, key).value_or(""));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30853 function
std::string OpsV300EvidenceRefPath(const std::string& event_json, const std::string& key) {
    const std::string direct = OpsV300NestedRefPath(event_json, key);
    if (!direct.empty()) {
        return direct;
    }
    if (const auto refs = ExtractObjectField(event_json, "vlmEvidenceRefs"); refs.has_value()) {
        return OpsV300NestedRefPath(*refs, key);
    }
    return "";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30864 function
std::string OpsV310EncodedManifestPath(const std::string& clip_manifest_path) {
    if (clip_manifest_path.empty()) {
        return "";
    }
    const std::filesystem::path manifest_path(clip_manifest_path);
    if (manifest_path.filename().string() != "manifest.json") {
        return "";
    }
    return (manifest_path.parent_path() / "encoded" / "encoded-manifest.json").string();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30875 function
std::string OpsV310EncodedMediaPath(const std::string& clip_manifest_path) {
    if (clip_manifest_path.empty()) {
        return "";
    }
    const std::filesystem::path manifest_path(clip_manifest_path);
    if (manifest_path.filename().string() != "manifest.json") {
        return "";
    }
    return (manifest_path.parent_path() / "encoded" / "event-clip.webm").string();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30886 function
std::string OpsV310ArtifactJson(const std::string& role,
                                const std::string& status,
                                const std::string& storage_key,
                                const std::string& basis,
                                const bool selected) {
    std::ostringstream out;
    out << "{"
        << "\"role\":\"" << JsonEscape(role) << "\","
        << "\"status\":\"" << JsonEscape(status) << "\","
        << "\"available\":" << (storage_key.empty() ? "false" : "true") << ","
        << "\"storageKey\":\"" << JsonEscape(storage_key.empty() ? "not-available" : storage_key) << "\","
        << "\"basis\":\"" << JsonEscape(basis) << "\","
        << "\"selected\":" << (selected ? "true" : "false")
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30903 function
std::string OpsV310ReplayTimelinePointsJson(const std::string& event_frame,
                                            const std::string& representative_image,
                                            const std::string& frame_bundle,
                                            const std::string& encoded_manifest,
                                            const std::string& encoded_media) {
    struct Point {
        std::string phase;
        std::string status;
        std::string ref;
        std::string label;
    };
    const std::vector<Point> points = {
        {"eventFrame",
         event_frame.empty() ? "missing" : "present",
         event_frame,
         "trigger-time event frame"},
        {"representativeImage",
         representative_image.empty() ? "missing" : "selected",
         representative_image,
         "representative image for evidence review"},
        {"frameBundle",
         frame_bundle.empty() ? "missing" : "present",
         frame_bundle,
         "pre/event/post FrameRef bundle"},
        {"encodedClip",
         encoded_media.empty() ? "missing" : "completed",
         encoded_manifest.empty() ? encoded_media : encoded_manifest,
         "bounded encoded clip timeline"},
    };
    std::ostringstream out;
    out << "[";
    for (std::size_t i = 0; i < points.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"phase\":\"" << JsonEscape(points[i].phase) << "\","
            << "\"status\":\"" << JsonEscape(points[i].status) << "\","
            << "\"ref\":\"" << JsonEscape(points[i].ref.empty() ? "not-available" : points[i].ref) << "\","
            << "\"label\":\"" << JsonEscape(points[i].label) << "\""
            << "}";
    }
    out << "]";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30949 function
std::string OpsV310PlaybackSegmentsJson(const std::int64_t pre_event_ms,
                                        const std::int64_t post_event_ms,
                                        const bool encoded_clip_available) {
    struct Segment {
        std::string key;
        std::int64_t start_ms;
        std::int64_t end_ms;
        std::string status;
    };
    const std::vector<Segment> segments = {
        {"pre", -pre_event_ms, -1, "frame-bundle"},
        {"event", 0, 0, "event-frame"},
        {"post", 1, post_event_ms, "frame-bundle"},
        {"encodedClip", -pre_event_ms, post_event_ms, encoded_clip_available ? "completed" : "missing"},
    };
    std::ostringstream out;
    out << "[";
    for (std::size_t i = 0; i < segments.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"key\":\"" << JsonEscape(segments[i].key) << "\","
            << "\"startRelativeToEventMs\":" << segments[i].start_ms << ","
            << "\"endRelativeToEventMs\":" << segments[i].end_ms << ","
            << "\"status\":\"" << JsonEscape(segments[i].status) << "\""
            << "}";
    }
    out << "]";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30998 function
OpsV320EvidenceQualityInfo OpsV320EvidenceQualityInfoFor(const std::string& event_json,
                                                         const OpsEventReviewState& review) {
    OpsV320EvidenceQualityInfo info;
    const std::string snapshot_path = OpsV300EvidenceRefPath(event_json, "snapshotPath");
    const std::string evidence_manifest = OpsV300EvidenceRefPath(event_json, "evidenceManifest");
    const std::string frame_bundle = OpsV300EvidenceRefPath(event_json, "frameBundleManifest");
    const std::string clip_manifest = OpsV300EvidenceRefPath(event_json, "clipPath");
    const std::string bbox_crop = OpsV300EvidenceRefPath(event_json, "bboxCrop");
    const std::string encoded_media = OpsV310EncodedMediaPath(clip_manifest);
    const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(review);

    info.snapshot_path_present = !snapshot_path.empty();
    info.evidence_manifest_present = !evidence_manifest.empty();
    info.event_frame_present = info.snapshot_path_present || info.evidence_manifest_present;
    info.frame_bundle_present = !frame_bundle.empty();
    info.encoded_clip_present = !encoded_media.empty() || !clip_manifest.empty();
    info.bbox_crop_present = !bbox_crop.empty();
    info.vlm_evidence_refs_present = ExtractObjectField(event_json, "vlmEvidenceRefs").has_value();

    int evidence_points = 0;
    evidence_points += info.event_frame_present ? 1 : 0;
    evidence_points += info.evidence_manifest_present ? 1 : 0;
    evidence_points += info.frame_bundle_present ? 1 : 0;
    evidence_points += info.encoded_clip_present ? 1 : 0;
    evidence_points += info.bbox_crop_present ? 1 : 0;
    info.completeness_score = std::min(100, evidence_points * 20);

    if (info.completeness_score >= 80) {
        info.evidence_completeness = "complete";
        info.operator_hint = "evidence refs cover event frame, manifest, replay, and object-local review signals";
    } else if (info.completeness_score > 0) {
        info.evidence_completeness = "partial";
        info.operator_hint = "review available refs and capture missing replay coverage before final closure";
    }

    if (info.encoded_clip_present) {
        info.replay_coverage = "encoded-clip";
        info.replay_coverage_hint = "bounded encoded clip or clip manifest is available";
    } else if (info.frame_bundle_present) {
        info.replay_coverage = "frame-bundle";
        info.replay_coverage_hint = "pre/event/post frame bundle is available; encoded clip is missing";
    } else if (info.event_frame_present) {
        info.replay_coverage = "event-frame-only";
        info.replay_coverage_hint = "trigger-time event frame is available; replay context is missing";
    }

    info.confidence_score = info.evidence_completeness == "complete" ? 90
                            : info.evidence_completeness == "partial" ? 60
                                                                        : 20;
    if (resolution_state.resolution_reason == "evidence-insufficient") {
        info.confidence_score = std::min(info.confidence_score, 35);
        info.operator_hint = "resolution reason is evidence-insufficient; collect more refs before closure";
    } else if (OpsResolutionStatusIsClosed(resolution_state.resolution_status) &&
               info.evidence_completeness == "complete") {
        info.confidence_score = 95;
    }
    info.evidence_confidence = info.confidence_score >= 80 ? "high"
                               : info.confidence_score >= 50 ? "medium"
                                                             : "low";
    return info;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31060 function
std::string OpsV320EvidenceQualityJson(const OpsV320EvidenceQualityInfo& info) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-evidence-quality.v1\","
        << "\"evidenceCompleteness\":\"" << JsonEscape(info.evidence_completeness) << "\","
        << "\"evidenceConfidence\":\"" << JsonEscape(info.evidence_confidence) << "\","
        << "\"replayCoverage\":\"" << JsonEscape(info.replay_coverage) << "\","
        << "\"replayCoverageHint\":\"" << JsonEscape(info.replay_coverage_hint) << "\","
        << "\"operatorHint\":\"" << JsonEscape(info.operator_hint) << "\","
        << "\"completenessScore\":" << info.completeness_score << ","
        << "\"confidenceScore\":" << info.confidence_score << ","
        << "\"snapshotPathPresent\":" << (info.snapshot_path_present ? "true" : "false") << ","
        << "\"eventFramePresent\":" << (info.event_frame_present ? "true" : "false") << ","
        << "\"evidenceManifestPresent\":" << (info.evidence_manifest_present ? "true" : "false") << ","
        << "\"frameBundlePresent\":" << (info.frame_bundle_present ? "true" : "false") << ","
        << "\"encodedClipPresent\":" << (info.encoded_clip_present ? "true" : "false") << ","
        << "\"bboxCropPresent\":" << (info.bbox_crop_present ? "true" : "false") << ","
        << "\"vlmEvidenceRefsPresent\":" << (info.vlm_evidence_refs_present ? "true" : "false") << ","
        << "\"fullReplayEngineExecuted\":false,"
        << "\"opsOnly\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"rawEvidenceMaterialExposed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31095 function
std::string OpsV320EvidenceQualitySummaryJson(const std::vector<OpsV320EvidenceQualityInfo>& items) {
    int complete = 0;
    int partial = 0;
    int missing = 0;
    int high = 0;
    int medium = 0;
    int low = 0;
    int encoded_clip = 0;
    int frame_bundle = 0;
    int event_frame_only = 0;
    int replay_missing = 0;
    for (const auto& item : items) {
        if (item.evidence_completeness == "complete") ++complete;
        else if (item.evidence_completeness == "partial") ++partial;
        else ++missing;

        if (item.evidence_confidence == "high") ++high;
        else if (item.evidence_confidence == "medium") ++medium;
        else ++low;

        if (item.replay_coverage == "encoded-clip") ++encoded_clip;
        else if (item.replay_coverage == "frame-bundle") ++frame_bundle;
        else if (item.replay_coverage == "event-frame-only") ++event_frame_only;
        else ++replay_missing;
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-evidence-quality.v1\","
        << "\"status\":\"ops-v320-evidence-quality-layer\","
        << "\"itemCount\":" << items.size() << ","
        << "\"complete\":" << complete << ","
        << "\"partial\":" << partial << ","
        << "\"missing\":" << missing << ","
        << "\"highConfidence\":" << high << ","
        << "\"mediumConfidence\":" << medium << ","
        << "\"lowConfidence\":" << low << ","
        << "\"encodedClipCoverage\":" << encoded_clip << ","
        << "\"frameBundleCoverage\":" << frame_bundle << ","
        << "\"eventFrameOnlyCoverage\":" << event_frame_only << ","
        << "\"missingReplayCoverage\":" << replay_missing << ","
        << "\"fullReplayEngineExecuted\":false,"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"rawEvidenceMaterialExposed\":false"
        << "}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31161 function
const OpsSourceHealthItem* OpsV320SourceHealthForSource(const OpsSourceHealthSnapshot& snapshot,
                                                       const std::string& source_id) {
    if (source_id.empty() || source_id == "unknown-source") {
        return nullptr;
    }
    const auto it = std::find_if(snapshot.items.begin(), snapshot.items.end(), [&](const auto& item) {
        return item.source_id == source_id;
    });
    return it == snapshot.items.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31172 function
std::string OpsV320RecentFailureContext(const OpsSourceHealthItem& item) {
    if (std::find(item.warnings.begin(), item.warnings.end(), "high-reconnect") != item.warnings.end()) {
        return "high-reconnect";
    }
    if (std::find(item.warnings.begin(), item.warnings.end(), "repeated-stale") != item.warnings.end()) {
        return "repeated-stale";
    }
    if (item.status == "live" && item.warnings.empty()) {
        return "none";
    }
    if (!item.warnings.empty()) {
        return "warning:" + item.warnings.front();
    }
    return item.status + ":" + item.reason;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31188 function
std::string OpsV320SourceReliabilityHint(const OpsV320SourceReliabilityInfo& info) {
    if (!info.source_health_present) {
        if (info.source_health_status == "source-health-unavailable") {
            return "source health snapshot unavailable; check source registry before closing this incident";
        }
        if (info.source_health_status == "not-registered") {
            return "confirm source registry and PublishedView mapping before closing this incident";
        }
        return "link this event to a source before final closure";
    }
    if (info.source_health_status == "live" && info.warnings.empty()) {
        return "source is live; continue resolution with evidence quality context";
    }
    return "run source health recheck and inspect /ops/sources before final closure";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31204 function
OpsV320SourceReliabilityInfo OpsV320SourceReliabilityInfoFor(
    const std::string& event_json,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    OpsV320SourceReliabilityInfo info;
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    info.source_id = source_id.empty() ? "unknown-source" : source_id;
    if (source_id.empty()) {
        info.operator_recheck_hint = OpsV320SourceReliabilityHint(info);
        return info;
    }
    if (!source_health_snapshot.ok) {
        info.source_health_status = "source-health-unavailable";
        info.source_health_reason = "source-health-snapshot-error";
        info.recent_failure_context = "source-health-snapshot-unavailable";
        info.operator_recheck_hint = OpsV320SourceReliabilityHint(info);
        return info;
    }
    const auto* health = OpsV320SourceHealthForSource(source_health_snapshot, source_id);
    if (health == nullptr) {
        info.source_health_status = "not-registered";
        info.source_health_reason = "source-health-missing";
        info.recent_failure_context = "source-not-found";
        info.operator_recheck_hint = OpsV320SourceReliabilityHint(info);
        return info;
    }
    info.source_health_present = true;
    info.source_health_status = health->status;
    info.source_health_reason = health->reason;
    info.recent_failure_context = OpsV320RecentFailureContext(*health);
    info.checked_at = health->checked_at;
    info.last_frame_age_ms = health->last_frame_age_ms;
    info.last_metadata_age_ms = health->last_metadata_age_ms;
    info.reconnect_count = health->reconnect_count;
    info.warnings = health->warnings;
    info.operator_recheck_hint = OpsV320SourceReliabilityHint(info);
    return info;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31242 function
void AppendOpsV320SourceReliabilityWarningsJson(std::ostringstream& out,
                                                const std::vector<std::string>& warnings) {
    out << "[";
    for (std::size_t i = 0; i < warnings.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(warnings[i]) << "\"";
    }
    out << "]";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31254 function
std::string OpsV320SourceReliabilityContextJson(const OpsV320SourceReliabilityInfo& info) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-source-reliability-context.v1\","
        << "\"sourceId\":\"" << JsonEscape(info.source_id) << "\","
        << "\"sourceHealthStatus\":\"" << JsonEscape(info.source_health_status) << "\","
        << "\"sourceHealthReason\":\"" << JsonEscape(info.source_health_reason) << "\","
        << "\"recentFailureContext\":\"" << JsonEscape(info.recent_failure_context) << "\","
        << "\"operatorRecheckHint\":\"" << JsonEscape(info.operator_recheck_hint) << "\","
        << "\"operatorRecheckRoute\":\"/ops/api/source-health\","
        << "\"sourceHealthPresent\":" << (info.source_health_present ? "true" : "false") << ","
        << "\"sourceHealthCheckedAt\":";
    AppendNullableJsonString(out, info.checked_at);
    out << ",\"lastFrameAgeMs\":";
    AppendNullableInt64(out, info.last_frame_age_ms);
    out << ",\"lastMetadataAgeMs\":";
    AppendNullableInt64(out, info.last_metadata_age_ms);
    out << ",\"reconnectCount\":" << info.reconnect_count
        << ",\"warnings\":";
    AppendOpsV320SourceReliabilityWarningsJson(out, info.warnings);
    out << ",\"sourceRegistryWritePerformed\":false,"
        << "\"opsOnly\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31290 function
std::string OpsV320SourceReliabilitySummaryJson(
    const std::vector<OpsV320SourceReliabilityInfo>& items) {
    int live = 0;
    int needs_recheck = 0;
    int blocked = 0;
    int warnings = 0;
    for (const auto& item : items) {
        if (item.source_health_status == "live" && item.warnings.empty()) {
            ++live;
        } else if (item.source_health_status == "source-missing" ||
                   item.source_health_status == "not-registered" ||
                   item.source_health_status == "source-health-unavailable") {
            ++blocked;
        } else {
            ++needs_recheck;
        }
        if (!item.warnings.empty()) {
            ++warnings;
        }
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-source-reliability-context.v1\","
        << "\"status\":\"ops-v320-source-reliability-context\","
        << "\"itemCount\":" << items.size() << ","
        << "\"live\":" << live << ","
        << "\"needsRecheck\":" << needs_recheck << ","
        << "\"blocked\":" << blocked << ","
        << "\"warningContext\":" << warnings << ","
        << "\"operatorRecheckRoute\":\"/ops/api/source-health\","
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false"
        << "}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31348 function
OpsV330IncidentSourceCorrelationInfo OpsV330IncidentSourceCorrelationInfoFor(
    const std::string& event_json,
    const OpsEventReviewState& resolution_state,
    const OpsV320SourceReliabilityInfo& source_reliability) {
    OpsV330IncidentSourceCorrelationInfo info;
    info.event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
    if (info.event_id.empty()) {
        info.event_id = "unknown-event";
    }
    info.source_id = source_reliability.source_id.empty() ? "unknown-source" : source_reliability.source_id;
    info.source_health_status = source_reliability.source_health_status;
    info.source_health_reason = source_reliability.source_health_reason;
    info.recent_failure_context = source_reliability.recent_failure_context;
    info.reconnect_count = source_reliability.reconnect_count;

    const bool missing_context =
        info.source_id == "unknown-source" ||
        info.source_health_status == "source-missing" ||
        info.source_health_status == "not-registered" ||
        info.source_health_status == "source-health-unavailable";
    const bool source_live = info.source_health_status == "live" && source_reliability.warnings.empty();
    const bool source_warning = !source_reliability.warnings.empty();
    info.source_recheck_required = missing_context || !source_live || source_warning;

    if (missing_context) {
        info.source_cause_category = "source-context-missing";
        info.source_cause_summary =
            "source registry or source health context is missing for this resolution detail";
        info.resolution_closure_impact = "block-closure";
        info.correlation_confidence = "low";
    } else if (info.source_health_status != "live") {
        info.source_cause_category = "source-health-degraded";
        info.source_cause_summary =
            "source health is degraded and should be checked before final resolution closure";
        info.resolution_closure_impact =
            OpsResolutionStatusIsClosed(resolution_state.resolution_status)
                ? "review-closed-resolution"
                : "requires-source-recheck";
        info.correlation_confidence = "medium";
    } else if (source_warning) {
        info.source_cause_category = "source-warning";
        info.source_cause_summary =
            "source is live but warning context may explain this incident";
        info.resolution_closure_impact = "review-before-closure";
        info.correlation_confidence = "medium";
    } else {
        info.source_cause_category = "source-clear";
        info.source_cause_summary =
            "source is live with no recent source reliability warning context";
        info.resolution_closure_impact = "supports-resolution";
        info.correlation_confidence = "high";
    }

    info.correlation_signals.push_back("source-health:" + info.source_health_status);
    info.correlation_signals.push_back("recent-failure:" + info.recent_failure_context);
    info.correlation_signals.push_back("resolution:" + resolution_state.resolution_status);
    info.correlation_signals.push_back(info.source_recheck_required ? "recheck:required"
                                                                    : "recheck:not-required");
    info.correlation_signals.push_back("audit:source-health-state-change");
    return info;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31410 function
std::string OpsV330IncidentSourceCorrelationJson(
    const OpsV330IncidentSourceCorrelationInfo& info) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v330-incident-source-correlation.v1\","
        << "\"eventId\":\"" << JsonEscape(info.event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(info.source_id) << "\","
        << "\"sourceCauseCategory\":\"" << JsonEscape(info.source_cause_category) << "\","
        << "\"sourceCauseSummary\":\"" << JsonEscape(info.source_cause_summary) << "\","
        << "\"resolutionClosureImpact\":\"" << JsonEscape(info.resolution_closure_impact) << "\","
        << "\"sourceHealthStatus\":\"" << JsonEscape(info.source_health_status) << "\","
        << "\"sourceHealthReason\":\"" << JsonEscape(info.source_health_reason) << "\","
        << "\"recentFailureContext\":\"" << JsonEscape(info.recent_failure_context) << "\","
        << "\"correlationConfidence\":\"" << JsonEscape(info.correlation_confidence) << "\","
        << "\"reconnectCount\":" << info.reconnect_count << ","
        << "\"sourceRecheckRequired\":" << (info.source_recheck_required ? "true" : "false") << ","
        << "\"sourceAuditRoute\":\"/ops/sources#auditArea=channels&auditPreset=source-health-state-change\","
        << "\"sourceRecheckRoute\":\"/ops/api/source-health\","
        << "\"correlationSignals\":" << JsonStringArray(info.correlation_signals) << ","
        << "\"resolutionDetailAttached\":true,"
        << "\"sourceReliabilityContextReused\":true,"
        << "\"sourceHealthAuditLinked\":true,"
        << "\"opsOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"rawLocatorExposed\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"recoveryQueueCreated\":false,"
        << "\"clientDigestChanged\":false,"
        << "\"searchMetricsChanged\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31455 function
std::string OpsV330IncidentSourceCorrelationSummaryJson(
    const std::vector<OpsV330IncidentSourceCorrelationInfo>& items) {
    int source_recheck_required = 0;
    int closure_blocked = 0;
    int source_clear = 0;
    int source_warning = 0;
    for (const auto& item : items) {
        if (item.source_recheck_required) {
            ++source_recheck_required;
        }
        if (item.resolution_closure_impact == "block-closure" ||
            item.resolution_closure_impact == "requires-source-recheck") {
            ++closure_blocked;
        }
        if (item.source_cause_category == "source-clear") {
            ++source_clear;
        }
        if (item.source_cause_category == "source-warning" ||
            item.source_cause_category == "source-health-degraded") {
            ++source_warning;
        }
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v330-incident-source-correlation.v1\","
        << "\"status\":\"ops-v330-incident-source-correlation\","
        << "\"itemCount\":" << items.size() << ","
        << "\"sourceRecheckRequired\":" << source_recheck_required << ","
        << "\"closureBlocked\":" << closure_blocked << ","
        << "\"sourceClear\":" << source_clear << ","
        << "\"sourceWarning\":" << source_warning << ","
        << "\"sourceAuditRoute\":\"/ops/sources#auditArea=channels&auditPreset=source-health-state-change\","
        << "\"sourceRecheckRoute\":\"/ops/api/source-health\","
        << "\"resolutionDetailAttached\":true,"
        << "\"sourceReliabilityContextReused\":true,"
        << "\"sourceHealthAuditLinked\":true,"
        << "\"opsOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"recoveryQueueCreated\":false,"
        << "\"clientDigestChanged\":false,"
        << "\"searchMetricsChanged\":false"
        << "}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31527 function
OpsV330OperatorRecheckRecoveryQueueInfo OpsV330OperatorRecheckRecoveryQueueInfoFor(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const OpsV320SourceReliabilityInfo& source_reliability,
    const OpsV330IncidentSourceCorrelationInfo& incident_source_correlation) {
    OpsV330OperatorRecheckRecoveryQueueInfo info;
    info.event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
    if (info.event_id.empty()) {
        info.event_id = "unknown-event";
    }
    info.source_id = incident_source_correlation.source_id.empty()
                         ? "unknown-source"
                         : incident_source_correlation.source_id;
    const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(review);
    info.operator_note_present =
        !Trim(review.note).empty() || !Trim(resolution_state.resolution_note).empty();
    info.operator_note_status = info.operator_note_present ? "present" : "required";

    if (!incident_source_correlation.source_recheck_required) {
        info.queue_status = "cleared";
        info.recheck_status = "not-required";
        info.retry_candidate = "none";
        info.retry_candidate_reason = "source-recheck-not-required";
        info.retry_candidate_available = false;
        info.dry_run_result_status = "not-required";
        info.dry_run_result_summary = "source reliability context does not require recovery retry";
        info.recovery_queue_reason = "source reliability context supports resolution";
    } else {
        info.queue_status =
            info.operator_note_present ? "ready-for-dry-run" : "queued-operator-note-required";
        info.recheck_status = "required";
        info.retry_candidate = source_reliability.source_health_present
                                   ? "source-health-recheck"
                                   : "source-mapping-recheck";
        info.retry_candidate_reason =
            incident_source_correlation.source_cause_category + ":" +
            incident_source_correlation.resolution_closure_impact;
        info.dry_run_result_status =
            info.operator_note_present ? "ready-not-run" : "blocked-not-run";
        info.dry_run_result_summary =
            info.operator_note_present
                ? "source health recheck dry-run is ready but not executed by this read model"
                : "operator note is required before retry dry-run";
        info.recovery_queue_reason = incident_source_correlation.source_cause_summary;
    }

    info.recovery_checklist = {
        std::string("failed-only-recheck:") +
            (incident_source_correlation.source_recheck_required ? "required" : "not-required"),
        "retry-candidate:" + info.retry_candidate,
        "dry-run:" + info.dry_run_result_status,
        "operator-note:" + info.operator_note_status,
        "source-health:" + incident_source_correlation.source_health_status,
    };
    return info;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31584 function
std::string OpsV330OperatorRecheckRecoveryQueueJson(
    const OpsV330OperatorRecheckRecoveryQueueInfo& info) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v330-operator-recheck-recovery-queue.v1\","
        << "\"eventId\":\"" << JsonEscape(info.event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(info.source_id) << "\","
        << "\"queueStatus\":\"" << JsonEscape(info.queue_status) << "\","
        << "\"failedOnlyRecheck\":" << (info.failed_only_recheck ? "true" : "false") << ","
        << "\"recheckStatus\":\"" << JsonEscape(info.recheck_status) << "\","
        << "\"retryCandidate\":\"" << JsonEscape(info.retry_candidate) << "\","
        << "\"retryCandidateAvailable\":"
        << (info.retry_candidate_available ? "true" : "false") << ","
        << "\"retryCandidateReason\":\"" << JsonEscape(info.retry_candidate_reason) << "\","
        << "\"recoveryChecklist\":" << JsonStringArray(info.recovery_checklist) << ","
        << "\"dryRunResultStatus\":\"" << JsonEscape(info.dry_run_result_status) << "\","
        << "\"dryRunResultSummary\":\"" << JsonEscape(info.dry_run_result_summary) << "\","
        << "\"operatorNoteStatus\":\"" << JsonEscape(info.operator_note_status) << "\","
        << "\"operatorNotePresent\":" << (info.operator_note_present ? "true" : "false") << ","
        << "\"operatorNoteRoute\":\"/ops/api/events/reviews/{eventId}\","
        << "\"sourceRecheckRoute\":\"/ops/api/source-health\","
        << "\"recoveryQueueReason\":\"" << JsonEscape(info.recovery_queue_reason) << "\","
        << "\"operatorNoteLinked\":true,"
        << "\"recoveryQueueReadModelCreated\":true,"
        << "\"persistentRecoveryQueueCreated\":false,"
        << "\"recoveryQueueWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"rawLocatorExposed\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"autoRecoveryApplied\":false,"
        << "\"externalRecoveryPerformed\":false,"
        << "\"clientDigestChanged\":false,"
        << "\"searchMetricsChanged\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31633 function
std::string OpsV330OperatorRecheckRecoveryQueueSummaryJson(
    const std::vector<OpsV330OperatorRecheckRecoveryQueueInfo>& items) {
    int queued = 0;
    int retry_candidates = 0;
    int operator_notes_required = 0;
    int operator_notes_present = 0;
    int dry_run_ready = 0;
    int dry_run_not_run = 0;
    int cleared = 0;
    for (const auto& item : items) {
        if (item.recheck_status == "required") {
            ++queued;
        }
        if (item.retry_candidate_available) {
            ++retry_candidates;
        }
        if (item.operator_note_present) {
            ++operator_notes_present;
        } else {
            ++operator_notes_required;
        }
        if (item.dry_run_result_status == "ready-not-run") {
            ++dry_run_ready;
        }
        if (item.dry_run_result_status == "ready-not-run" ||
            item.dry_run_result_status == "blocked-not-run") {
            ++dry_run_not_run;
        }
        if (item.queue_status == "cleared") {
            ++cleared;
        }
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v330-operator-recheck-recovery-queue.v1\","
        << "\"status\":\"ops-v330-operator-recheck-recovery-queue\","
        << "\"itemCount\":" << items.size() << ","
        << "\"queuedForRecheck\":" << queued << ","
        << "\"retryCandidates\":" << retry_candidates << ","
        << "\"operatorNotesRequired\":" << operator_notes_required << ","
        << "\"operatorNotesPresent\":" << operator_notes_present << ","
        << "\"dryRunReady\":" << dry_run_ready << ","
        << "\"dryRunNotRun\":" << dry_run_not_run << ","
        << "\"cleared\":" << cleared << ","
        << "\"failedOnlyRecheck\":true,"
        << "\"operatorNoteRoute\":\"/ops/api/events/reviews/{eventId}\","
        << "\"sourceRecheckRoute\":\"/ops/api/source-health\","
        << "\"operatorNoteLinked\":true,"
        << "\"recoveryQueueReadModelCreated\":true,"
        << "\"persistentRecoveryQueueCreated\":false,"
        << "\"recoveryQueueWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"autoRecoveryApplied\":false,"
        << "\"externalRecoveryPerformed\":false,"
        << "\"clientDigestChanged\":false,"
        << "\"searchMetricsChanged\":false"
        << "}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31715 function
OpsV320AiReviewQualityInfo OpsV320AiReviewQualityInfoFor(
    const OpsEventReviewState& review,
    const OpsV320EvidenceQualityInfo& evidence_quality,
    const OpsV320SourceReliabilityInfo& source_reliability) {
    OpsV320AiReviewQualityInfo info;
    info.review_status = review.review_status.empty() ? "new" : review.review_status;
    info.classification = review.classification.empty() ? "unclassified" : review.classification;
    info.vlm_action = review.vlm_action.empty() ? "not-reviewed" : review.vlm_action;
    info.corrected_feature_label_present = !Trim(review.corrected_feature_label).empty();
    info.feature_alias_count = static_cast<int>(review.feature_aliases.size());
    info.reanalysis_requested = review.reanalysis_requested;
    info.reanalysis_reason = review.reanalysis_reason;

    if (info.corrected_feature_label_present) {
        info.signals.push_back("corrected-feature-label");
    }
    if (info.feature_alias_count > 0) {
        info.signals.push_back("feature-aliases");
    }
    if (info.reanalysis_requested) {
        info.signals.push_back("reanalysis-requested");
    }
    if (info.vlm_action != "not-reviewed") {
        info.signals.push_back("vlm-action:" + info.vlm_action);
    }
    if (evidence_quality.evidence_confidence == "low") {
        info.signals.push_back("low-evidence-confidence");
    }
    if (source_reliability.source_health_status != "live" || !source_reliability.warnings.empty()) {
        info.signals.push_back("source-context-needs-review");
    }

    if (info.corrected_feature_label_present || info.feature_alias_count > 0 ||
        info.reanalysis_requested) {
        info.correction_review_signal = "correction-review";
        info.uncertainty_reason =
            info.reanalysis_reason.empty() ? "operator-correction-present" : info.reanalysis_reason;
        info.quality_badge = "correction-needed";
        info.quality_score = 45;
        info.operator_hint =
            "operator correction or reanalysis request exists; review AI output before closure";
    } else if (info.vlm_action == "review-needed" || info.review_status == "needs-follow-up") {
        info.correction_review_signal = "needs-human-review";
        info.uncertainty_reason = "operator-review-needed";
        info.quality_badge = "review-required";
        info.quality_score = 40;
        info.operator_hint = "AI review action requires human follow-up before final closure";
    } else if (review.resolution_reason == "evidence-insufficient" ||
               evidence_quality.evidence_confidence == "low") {
        info.correction_review_signal = "evidence-uncertain";
        info.uncertainty_reason = review.resolution_reason == "evidence-insufficient"
                                      ? "evidence-insufficient"
                                      : "low-evidence-confidence";
        info.quality_badge = "uncertain";
        info.quality_score = 35;
        info.operator_hint = "AI quality is limited by evidence confidence; collect more context";
    } else if (source_reliability.source_health_status != "live" ||
               !source_reliability.warnings.empty()) {
        info.correction_review_signal = "source-context-uncertain";
        info.uncertainty_reason = source_reliability.recent_failure_context;
        info.quality_badge = "uncertain";
        info.quality_score = 50;
        info.operator_hint = "source reliability context should be reviewed before trusting AI signals";
    } else if (info.vlm_action == "accept" || info.review_status == "confirmed" ||
               info.classification == "true-positive") {
        info.correction_review_signal = "accepted-review";
        info.uncertainty_reason = "none";
        info.quality_badge = evidence_quality.evidence_confidence == "high" ? "quality-ok"
                                                                            : "operator-checked";
        info.quality_score = evidence_quality.evidence_confidence == "high" ? 90 : 75;
        info.operator_hint = "AI/operator review signal is accepted with available local evidence";
    } else if (info.vlm_action == "dismiss" || info.review_status == "dismissed" ||
               info.classification == "false-positive") {
        info.correction_review_signal = "dismissed-review";
        info.uncertainty_reason = "false-positive-review";
        info.quality_badge = "operator-checked";
        info.quality_score = 70;
        info.operator_hint = "operator dismissed the AI/event signal; retain review context only";
    } else if (info.classification == "needs-tuning") {
        info.correction_review_signal = "needs-tuning";
        info.uncertainty_reason = "model-rule-needs-tuning";
        info.quality_badge = "uncertain";
        info.quality_score = 45;
        info.operator_hint = "rule or model tuning is indicated before trusting this signal";
    }
    if (info.signals.empty()) {
        info.signals.push_back("no-correction-signal");
    }
    return info;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31806 function
void AppendOpsV320AiReviewSignalsJson(std::ostringstream& out,
                                       const std::vector<std::string>& signals) {
    out << "[";
    for (std::size_t i = 0; i < signals.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(signals[i]) << "\"";
    }
    out << "]";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31818 function
std::string OpsV320AiReviewQualityContextJson(const OpsV320AiReviewQualityInfo& info) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-ai-review-quality-context.v1\","
        << "\"correctionReviewSignal\":\"" << JsonEscape(info.correction_review_signal) << "\","
        << "\"uncertaintyReason\":\"" << JsonEscape(info.uncertainty_reason) << "\","
        << "\"qualityBadge\":\"" << JsonEscape(info.quality_badge) << "\","
        << "\"qualityScore\":" << info.quality_score << ","
        << "\"operatorHint\":\"" << JsonEscape(info.operator_hint) << "\","
        << "\"reviewStatus\":\"" << JsonEscape(info.review_status) << "\","
        << "\"classification\":\"" << JsonEscape(info.classification) << "\","
        << "\"vlmAction\":\"" << JsonEscape(info.vlm_action) << "\","
        << "\"correctedFeatureLabelPresent\":"
        << (info.corrected_feature_label_present ? "true" : "false") << ","
        << "\"featureAliasCount\":" << info.feature_alias_count << ","
        << "\"reanalysisRequested\":" << (info.reanalysis_requested ? "true" : "false") << ","
        << "\"reanalysisReason\":\"" << JsonEscape(info.reanalysis_reason) << "\","
        << "\"signals\":";
    AppendOpsV320AiReviewSignalsJson(out, info.signals);
    out << ",\"runtimeProviderCallPerformed\":false,"
        << "\"rawProviderMaterialExposed\":false,"
        << "\"opsOnly\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31854 function
std::string OpsV320AiReviewQualitySummaryJson(
    const std::vector<OpsV320AiReviewQualityInfo>& items) {
    int correction = 0;
    int review_required = 0;
    int uncertain = 0;
    int quality_ok = 0;
    int operator_checked = 0;
    for (const auto& item : items) {
        if (item.correction_review_signal == "correction-review") {
            ++correction;
        }
        if (item.quality_badge == "review-required") {
            ++review_required;
        } else if (item.quality_badge == "uncertain" || item.quality_badge == "correction-needed") {
            ++uncertain;
        } else if (item.quality_badge == "quality-ok") {
            ++quality_ok;
        } else if (item.quality_badge == "operator-checked") {
            ++operator_checked;
        }
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-ai-review-quality-context.v1\","
        << "\"status\":\"ops-v320-ai-review-quality-context\","
        << "\"itemCount\":" << items.size() << ","
        << "\"correctionSignalCount\":" << correction << ","
        << "\"reviewRequired\":" << review_required << ","
        << "\"uncertain\":" << uncertain << ","
        << "\"qualityOk\":" << quality_ok << ","
        << "\"operatorChecked\":" << operator_checked << ","
        << "\"runtimeProviderCallPerformed\":false,"
        << "\"rawProviderMaterialExposed\":false,"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false"
        << "}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31919 function
OpsV320OperatorResolutionFlowInfo OpsV320OperatorResolutionFlowInfoFor(
    const OpsEventReviewState& review) {
    OpsV320OperatorResolutionFlowInfo info;
    const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(review);
    info.assignment_target = review.action_target.empty() ? "operator-triage" : review.action_target;
    info.resolution_status = resolution_state.resolution_status;
    info.resolution_reason = resolution_state.resolution_reason;
    info.resolution_transition = resolution_state.resolution_transition;
    info.actor = review.actor;
    info.role = review.role;
    info.updated_at_ms = review.updated_at_ms;
    info.operator_note_present = !Trim(review.note).empty();
    info.resolution_note_present = !Trim(resolution_state.resolution_note).empty();
    const bool closed = OpsResolutionStatusIsClosed(resolution_state.resolution_status);
    info.close_action_available = !closed;
    info.reopen_action_available = closed || resolution_state.resolution_status == "reopened";

    if (info.assignment_target == "operator-triage") {
        info.assignment_flow_status = "triage-lane";
    } else {
        info.assignment_flow_status = "assigned";
    }
    if (closed) {
        info.operator_hint = "resolution is closed; audit trail is available and reopen remains operator-gated";
    } else if (resolution_state.resolution_status == "reopened") {
        info.operator_hint = "resolution was reopened; add operator note before closing again";
    } else if (info.operator_note_present || info.resolution_note_present) {
        info.operator_hint = "operator note is present; close or keep in progress with audited state";
    } else {
        info.operator_hint = "add an operator note before final close or reopen decision";
    }
    return info;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31953 function
std::string OpsV320OperatorResolutionFlowJson(const OpsV320OperatorResolutionFlowInfo& info) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-operator-resolution-flow.v1\","
        << "\"assignmentTarget\":\"" << JsonEscape(info.assignment_target) << "\","
        << "\"assignmentFlowStatus\":\"" << JsonEscape(info.assignment_flow_status) << "\","
        << "\"operatorNotePresent\":" << (info.operator_note_present ? "true" : "false") << ","
        << "\"resolutionNotePresent\":" << (info.resolution_note_present ? "true" : "false") << ","
        << "\"resolutionStatus\":\"" << JsonEscape(info.resolution_status) << "\","
        << "\"resolutionReason\":\"" << JsonEscape(info.resolution_reason) << "\","
        << "\"resolutionTransition\":\"" << JsonEscape(info.resolution_transition) << "\","
        << "\"closeActionAvailable\":" << (info.close_action_available ? "true" : "false") << ","
        << "\"reopenActionAvailable\":" << (info.reopen_action_available ? "true" : "false") << ","
        << "\"auditTrailRequired\":true,"
        << "\"auditTrailReady\":true,"
        << "\"auditActions\":" << JsonStringArray(info.audit_actions) << ","
        << "\"operatorResolutionFlowWritePath\":\"/ops/api/events/reviews/{eventId}\","
        << "\"operatorHint\":\"" << JsonEscape(info.operator_hint) << "\","
        << "\"actor\":\"" << JsonEscape(info.actor) << "\","
        << "\"role\":\"" << JsonEscape(info.role) << "\","
        << "\"updatedAtMs\":" << info.updated_at_ms << ","
        << "\"persistentReviewState\":true,"
        << "\"opsOnly\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"autoActionApplied\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31991 function
std::string OpsV320OperatorResolutionFlowSummaryJson(
    const std::vector<OpsV320OperatorResolutionFlowInfo>& items) {
    int assigned = 0;
    int note_present = 0;
    int closable = 0;
    int reopenable = 0;
    int audit_ready = 0;
    for (const auto& item : items) {
        if (item.assignment_flow_status == "assigned") {
            ++assigned;
        }
        if (item.operator_note_present || item.resolution_note_present) {
            ++note_present;
        }
        if (item.close_action_available) {
            ++closable;
        }
        if (item.reopen_action_available) {
            ++reopenable;
        }
        if (item.audit_trail_required) {
            ++audit_ready;
        }
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-operator-resolution-flow.v1\","
        << "\"status\":\"ops-v320-operator-resolution-flow\","
        << "\"itemCount\":" << items.size() << ","
        << "\"assigned\":" << assigned << ","
        << "\"notePresent\":" << note_present << ","
        << "\"closeActionAvailable\":" << closable << ","
        << "\"reopenActionAvailable\":" << reopenable << ","
        << "\"auditTrailReady\":" << audit_ready << ","
        << "\"operatorResolutionFlowWritePath\":\"/ops/api/events/reviews/{eventId}\","
        << "\"auditActions\":[\"event-review-update\",\"incident-action-update\","
        << "\"resolution-state-update\",\"operator-resolution-flow-update\"],"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false"
        << "}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32053 function
OpsV320ActionReadinessChecklistInfo OpsV320ActionReadinessChecklistInfoFor(
    const OpsV320EvidenceQualityInfo& evidence_quality,
    const OpsV320SourceReliabilityInfo& source_reliability,
    const OpsV320AiReviewQualityInfo& ai_review_quality,
    const OpsV320OperatorResolutionFlowInfo& operator_resolution_flow) {
    OpsV320ActionReadinessChecklistInfo info;
    const bool operator_note_ready =
        operator_resolution_flow.operator_note_present ||
        operator_resolution_flow.resolution_note_present ||
        operator_resolution_flow.assignment_flow_status == "assigned";
    const bool ai_quality_ready =
        ai_review_quality.quality_badge == "quality-ok" ||
        ai_review_quality.quality_badge == "operator-checked";
    const bool source_ready =
        source_reliability.source_health_status == "live" &&
        source_reliability.warnings.empty();

    info.evidence_bundle_ready =
        evidence_quality.evidence_completeness == "complete" &&
        evidence_quality.evidence_confidence != "low" &&
        evidence_quality.replay_coverage != "missing";
    info.rule_draft_ready = operator_note_ready && ai_quality_ready;
    info.notification_ready =
        info.evidence_bundle_ready && info.rule_draft_ready && source_ready;

    info.evidence_bundle_status =
        info.evidence_bundle_ready ? "ready" : "needs-evidence-bundle";
    info.rule_draft_status = info.rule_draft_ready ? "ready" : "needs-rule-draft";
    info.notification_status =
        info.notification_ready ? "ready" : "needs-notification-review";

    if (!info.evidence_bundle_ready) {
        info.readiness_blockers.push_back("evidence-bundle-not-ready");
    }
    if (!operator_note_ready) {
        info.readiness_blockers.push_back("operator-note-required");
    }
    if (!ai_quality_ready) {
        info.readiness_blockers.push_back("ai-quality-review-required");
    }
    if (!source_ready) {
        info.readiness_blockers.push_back("source-health-not-live");
    }
    if (!info.notification_ready) {
        info.readiness_blockers.push_back("notification-review-required");
    }

    info.checklist_items.push_back(info.rule_draft_ready ? "rule-draft:ready"
                                                         : "rule-draft:blocked");
    info.checklist_items.push_back(info.evidence_bundle_ready
                                       ? "evidence-bundle:ready"
                                       : "evidence-bundle:blocked");
    info.checklist_items.push_back(info.notification_ready ? "notification:ready"
                                                          : "notification:blocked");
    info.checklist_items.push_back("manual-approval-required");
    info.checklist_items.push_back("notification-dry-run-required");

    if (info.evidence_bundle_ready && info.rule_draft_ready && info.notification_ready) {
        info.readiness_status = "ready-for-operator-approval";
        info.operator_hint =
            "rule draft, evidence bundle, and notification dry-run prerequisites are ready";
    } else if (!info.evidence_bundle_ready) {
        info.readiness_status = "needs-evidence-bundle";
        info.operator_hint = "complete evidence bundle coverage before approving action";
    } else if (!info.rule_draft_ready) {
        info.readiness_status = "needs-rule-draft";
        info.operator_hint = "add operator note and resolve AI quality review before rule draft";
    } else {
        info.readiness_status = "needs-notification-review";
        info.operator_hint =
            "review notification dry-run and source health before external delivery approval";
    }
    return info;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32128 function
std::string OpsV320ActionReadinessChecklistJson(
    const OpsV320ActionReadinessChecklistInfo& info) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-action-readiness-checklist.v1\","
        << "\"readinessStatus\":\"" << JsonEscape(info.readiness_status) << "\","
        << "\"ruleDraftReady\":" << (info.rule_draft_ready ? "true" : "false") << ","
        << "\"ruleDraftStatus\":\"" << JsonEscape(info.rule_draft_status) << "\","
        << "\"ruleDraftRoute\":\"/ops/rules\","
        << "\"ruleDraftCreated\":false,"
        << "\"evidenceBundleReady\":" << (info.evidence_bundle_ready ? "true" : "false") << ","
        << "\"evidenceBundleStatus\":\"" << JsonEscape(info.evidence_bundle_status) << "\","
        << "\"evidenceBundleBasis\":\"EventRecord/vlmEvidenceRefs\","
        << "\"notificationReady\":" << (info.notification_ready ? "true" : "false") << ","
        << "\"notificationStatus\":\"" << JsonEscape(info.notification_status) << "\","
        << "\"notificationDryRunRequired\":true,"
        << "\"notificationDryRunRoute\":\"/ops/api/alerts/deliveries/dry-run\","
        << "\"notificationSent\":false,"
        << "\"manualApprovalRequired\":true,"
        << "\"readinessBlockers\":" << JsonStringArray(info.readiness_blockers) << ","
        << "\"checklistItems\":" << JsonStringArray(info.checklist_items) << ","
        << "\"operatorHint\":\"" << JsonEscape(info.operator_hint) << "\","
        << "\"opsOnly\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"autoActionApplied\":false,"
        << "\"autoActionWritePerformed\":false,"
        << "\"externalDeliveryPerformed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32168 function
std::string OpsV320ActionReadinessChecklistSummaryJson(
    const std::vector<OpsV320ActionReadinessChecklistInfo>& items) {
    int ready = 0;
    int blocked = 0;
    int rule_draft_ready = 0;
    int evidence_bundle_ready = 0;
    int notification_ready = 0;
    for (const auto& item : items) {
        if (item.readiness_status == "ready-for-operator-approval") {
            ++ready;
        } else {
            ++blocked;
        }
        if (item.rule_draft_ready) {
            ++rule_draft_ready;
        }
        if (item.evidence_bundle_ready) {
            ++evidence_bundle_ready;
        }
        if (item.notification_ready) {
            ++notification_ready;
        }
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-action-readiness-checklist.v1\","
        << "\"status\":\"ops-v320-action-readiness-checklist\","
        << "\"itemCount\":" << items.size() << ","
        << "\"readyForOperatorApproval\":" << ready << ","
        << "\"blocked\":" << blocked << ","
        << "\"ruleDraftReady\":" << rule_draft_ready << ","
        << "\"evidenceBundleReady\":" << evidence_bundle_ready << ","
        << "\"notificationReady\":" << notification_ready << ","
        << "\"manualApprovalRequired\":true,"
        << "\"notificationDryRunRequired\":true,"
        << "\"ruleDraftRoute\":\"/ops/rules\","
        << "\"notificationDryRunRoute\":\"/ops/api/alerts/deliveries/dry-run\","
        << "\"ruleDraftCreated\":false,"
        << "\"autoActionApplied\":false,"
        << "\"autoActionWritePerformed\":false,"
        << "\"externalDeliveryPerformed\":false,"
        << "\"notificationSent\":false,"
        << "\"opsOnly\":true,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32219 function
std::string OpsV320ResolutionQueueStatus(const OpsEventReviewState& review) {
    const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(review);
    if (resolution_state.resolution_status == "open") {
        return "needs-resolution";
    }
    if (resolution_state.resolution_status == "in-progress") {
        return "active-resolution";
    }
    if (resolution_state.resolution_status == "triaged") {
        return "triaged";
    }
    if (resolution_state.resolution_status == "reopened") {
        return "reopened";
    }
    if (OpsResolutionStatusIsClosed(resolution_state.resolution_status)) {
        return "closed";
    }
    return "needs-review";
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32261 function
OpsV320ResolutionSearchMetricsInfo OpsV320ResolutionSearchMetricsInfoFor(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const OpsV320EvidenceQualityInfo& evidence_quality,
    const OpsV320SourceReliabilityInfo& source_reliability,
    const OpsV320AiReviewQualityInfo& ai_review_quality,
    const OpsV320ActionReadinessChecklistInfo& action_readiness_checklist) {
    OpsV320ResolutionSearchMetricsInfo info;
    info.event_id = Trim(ParseStringField(event_json, "eventId").value_or(review.event_id));
    info.event_type =
        Trim(ParseStringField(event_json, "eventType")
                 .value_or(ParseStringField(event_json, "className").value_or("event")));
    if (info.event_type.empty()) {
        info.event_type = "event";
    }
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json);
    info.source_id = source_id.empty() ? "unknown-source" : source_id;
    const std::string rule_id = OpsIncidentMemoryEventRuleId(event_json);
    info.rule_id = rule_id.empty() ? "not-available" : rule_id;
    const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(review);
    info.queue_status = OpsV320ResolutionQueueStatus(resolution_state);
    info.resolution_status = resolution_state.resolution_status;
    info.resolution_reason = resolution_state.resolution_reason;
    info.review_status = review.review_status.empty() ? "new" : review.review_status;
    info.classification = review.classification.empty() ? "unclassified" : review.classification;
    info.evidence_confidence = evidence_quality.evidence_confidence;
    info.source_health_status = source_reliability.source_health_status;
    info.ai_quality_badge = ai_review_quality.quality_badge;
    info.action_readiness_status = action_readiness_checklist.readiness_status;
    info.event_time_ms =
        ParseInt64Field(event_json, "updateTime")
            .value_or(ParseInt64Field(event_json, "startTime").value_or(0));
    info.ready_for_approval =
        action_readiness_checklist.readiness_status == "ready-for-operator-approval";
    info.source_recheck_required =
        source_reliability.source_health_status != "live" || !source_reliability.warnings.empty();
    info.review_required =
        ai_review_quality.quality_badge == "review-required" ||
        ai_review_quality.quality_badge == "uncertain" ||
        ai_review_quality.quality_badge == "correction-needed" ||
        info.review_status == "needs-follow-up" || info.review_status == "new";

    info.filter_tokens = {
        "event:" + info.event_type,
        "source:" + info.source_id,
        "rule:" + info.rule_id,
        "queue:" + info.queue_status,
        "resolution:" + info.resolution_status,
        "reason:" + info.resolution_reason,
        "review:" + info.review_status,
        "classification:" + info.classification,
        "evidence:" + info.evidence_confidence,
        "source-health:" + info.source_health_status,
        "ai-quality:" + info.ai_quality_badge,
        "action-readiness:" + info.action_readiness_status,
    };
    if (info.resolution_status == "open" || info.resolution_status == "triaged" ||
        info.resolution_status == "in-progress" || info.resolution_status == "reopened") {
        info.saved_view_matches.push_back("open-resolution");
    }
    if (info.ready_for_approval) {
        info.saved_view_matches.push_back("ready-for-approval");
    }
    if (info.source_recheck_required) {
        info.saved_view_matches.push_back("source-recheck");
    }
    if (info.review_required) {
        info.saved_view_matches.push_back("review-required");
    }
    if (info.saved_view_matches.empty()) {
        info.saved_view_matches.push_back("closed-resolution");
    }
    return info;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32336 function
std::string OpsV320ResolutionSearchMetricsJson(
    const OpsV320ResolutionSearchMetricsInfo& info) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-resolution-search-metrics.v1\","
        << "\"eventId\":\"" << JsonEscape(info.event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(info.event_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(info.source_id) << "\","
        << "\"ruleId\":\"" << JsonEscape(info.rule_id) << "\","
        << "\"queueStatus\":\"" << JsonEscape(info.queue_status) << "\","
        << "\"resolutionStatus\":\"" << JsonEscape(info.resolution_status) << "\","
        << "\"resolutionReason\":\"" << JsonEscape(info.resolution_reason) << "\","
        << "\"reviewStatus\":\"" << JsonEscape(info.review_status) << "\","
        << "\"classification\":\"" << JsonEscape(info.classification) << "\","
        << "\"evidenceConfidence\":\"" << JsonEscape(info.evidence_confidence) << "\","
        << "\"sourceHealthStatus\":\"" << JsonEscape(info.source_health_status) << "\","
        << "\"aiQualityBadge\":\"" << JsonEscape(info.ai_quality_badge) << "\","
        << "\"actionReadinessStatus\":\"" << JsonEscape(info.action_readiness_status) << "\","
        << "\"readyForApproval\":" << (info.ready_for_approval ? "true" : "false") << ","
        << "\"sourceRecheckRequired\":" << (info.source_recheck_required ? "true" : "false") << ","
        << "\"reviewRequired\":" << (info.review_required ? "true" : "false") << ","
        << "\"eventTimeMs\":" << info.event_time_ms << ","
        << "\"filterTokens\":" << JsonStringArray(info.filter_tokens) << ","
        << "\"savedViewMatches\":" << JsonStringArray(info.saved_view_matches) << ","
        << "\"opsOnly\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"clientDigestChanged\":false,"
        << "\"savedViewWritePerformed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32377 function
std::string OpsV320ResolutionSearchFilterValue(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& key) {
    const auto it = query.find(key);
    return it == query.end() ? std::string() : Trim(it->second);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32384 function
std::string OpsV320ActiveResolutionFiltersJson(
    const std::unordered_map<std::string, std::string>& query) {
    const std::vector<std::string> filter_keys = {
        "eventId",
        "reviewStatus",
        "classification",
        "incidentStatus",
        "ruleId",
        "sourceId",
        "eventType",
        "q",
        "query",
    };
    int filter_count = 0;
    for (const auto& key : filter_keys) {
        if (!OpsV320ResolutionSearchFilterValue(query, key).empty()) {
            ++filter_count;
        }
    }
    const bool include_archives = ParseBoolQuery(query, "includeArchives", false) ||
                                  ParseBoolQuery(query, "archive", false);
    if (include_archives) {
        ++filter_count;
    }
    const std::string limit = OpsV320ResolutionSearchFilterValue(query, "limit");
    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(OpsV320ResolutionSearchFilterValue(query, "eventId")) << "\","
        << "\"reviewStatus\":\"" << JsonEscape(OpsV320ResolutionSearchFilterValue(query, "reviewStatus")) << "\","
        << "\"classification\":\"" << JsonEscape(OpsV320ResolutionSearchFilterValue(query, "classification")) << "\","
        << "\"incidentStatus\":\"" << JsonEscape(OpsV320ResolutionSearchFilterValue(query, "incidentStatus")) << "\","
        << "\"ruleId\":\"" << JsonEscape(OpsV320ResolutionSearchFilterValue(query, "ruleId")) << "\","
        << "\"sourceId\":\"" << JsonEscape(OpsV320ResolutionSearchFilterValue(query, "sourceId")) << "\","
        << "\"eventType\":\"" << JsonEscape(OpsV320ResolutionSearchFilterValue(query, "eventType")) << "\","
        << "\"textQuery\":\""
        << JsonEscape(OpsV320ResolutionSearchFilterValue(query, "q").empty()
                          ? OpsV320ResolutionSearchFilterValue(query, "query")
                          : OpsV320ResolutionSearchFilterValue(query, "q"))
        << "\","
        << "\"includeArchives\":" << (include_archives ? "true" : "false") << ","
        << "\"limit\":\"" << JsonEscape(limit.empty() ? "25" : limit) << "\","
        << "\"filterCount\":" << filter_count << ","
        << "\"queryApplied\":" << (filter_count > 0 ? "true" : "false")
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32431 function
std::string OpsV320ResolutionSavedViewsJson() {
    return "["
           "{\"id\":\"open-resolution\",\"label\":\"Open resolutions\","
           "\"description\":\"Open, triaged, in-progress, and reopened resolution queue\","
           "\"href\":\"/ops/events?reviewStatus=new&includeArchives=1\","
           "\"filterToken\":\"resolution:open\",\"savedViewsPersisted\":false,"
           "\"savedViewWritePerformed\":false},"
           "{\"id\":\"ready-for-approval\",\"label\":\"Ready for approval\","
           "\"description\":\"Action readiness items with rule draft, evidence bundle, and notification prerequisites ready\","
           "\"href\":\"/ops/events?classification=true-positive&includeArchives=1\","
           "\"filterToken\":\"action-readiness:ready-for-operator-approval\","
           "\"savedViewsPersisted\":false,\"savedViewWritePerformed\":false},"
           "{\"id\":\"source-recheck\",\"label\":\"Source recheck\","
           "\"description\":\"Resolution items whose source reliability context needs operator recheck\","
           "\"href\":\"/ops/events?includeArchives=1&sourceId=\","
           "\"filterToken\":\"source-health:recheck\",\"savedViewsPersisted\":false,"
           "\"savedViewWritePerformed\":false},"
           "{\"id\":\"review-required\",\"label\":\"Review required\","
           "\"description\":\"AI quality or operator review signals still need human review\","
           "\"href\":\"/ops/events?reviewStatus=needs-follow-up&includeArchives=1\","
           "\"filterToken\":\"ai-quality:review-required\",\"savedViewsPersisted\":false,"
           "\"savedViewWritePerformed\":false}"
           "]";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32456 function
std::string OpsV320ResolutionOperationsMetricSummaryJson(
    const std::vector<OpsV320ResolutionSearchMetricsInfo>& items) {
    int open = 0;
    int closed = 0;
    int ready = 0;
    int blocked = 0;
    int source_recheck = 0;
    int review_required = 0;
    for (const auto& item : items) {
        if (item.resolution_status == "resolved" || item.resolution_status == "false-positive") {
            ++closed;
        } else {
            ++open;
        }
        if (item.ready_for_approval) {
            ++ready;
        } else {
            ++blocked;
        }
        if (item.source_recheck_required) {
            ++source_recheck;
        }
        if (item.review_required) {
            ++review_required;
        }
    }
    std::ostringstream out;
    out << "{"
        << "\"matchedQueueCount\":" << items.size() << ","
        << "\"openResolutionCount\":" << open << ","
        << "\"closedResolutionCount\":" << closed << ","
        << "\"readyForApprovalCount\":" << ready << ","
        << "\"blockedActionCount\":" << blocked << ","
        << "\"sourceRecheckCount\":" << source_recheck << ","
        << "\"reviewRequiredCount\":" << review_required << ","
        << "\"metricBasis\":\"EventRecord + Ops review state + v3.2 context\","
        << "\"operationsNextAction\":\"filter saved views, inspect blocked action readiness, then close or reopen with audit\","
        << "\"metricWritePerformed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32498 function
std::string OpsV320ResolutionSearchMetricsSummaryJson(
    const std::vector<OpsV320ResolutionSearchMetricsInfo>& items,
    const std::unordered_map<std::string, std::string>& query) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-resolution-search-metrics.v1\","
        << "\"status\":\"ops-v320-resolution-search-metrics\","
        << "\"itemCount\":" << items.size() << ","
        << "\"activeResolutionFilters\":" << OpsV320ActiveResolutionFiltersJson(query) << ","
        << "\"savedViews\":" << OpsV320ResolutionSavedViewsJson() << ","
        << "\"operationsMetricSummary\":"
        << OpsV320ResolutionOperationsMetricSummaryJson(items) << ","
        << "\"savedViewsPersisted\":false,"
        << "\"savedViewWritePerformed\":false,"
        << "\"opsOnly\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"clientDigestChanged\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32528 function
std::string OpsV320TimelineMarkersJson(const std::string& event_json,
                                       const OpsEventReviewState& review,
                                       const OpsV320EvidenceQualityInfo& evidence_quality,
                                       const OpsV320SourceReliabilityInfo& source_reliability,
                                       const OpsV320AiReviewQualityInfo& ai_review_quality,
                                       const OpsV320OperatorResolutionFlowInfo& operator_resolution_flow,
                                       const OpsV320ActionReadinessChecklistInfo& action_readiness_checklist) {
    const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(review);
    const std::int64_t event_ms =
        ParseInt64Field(event_json, "updateTime")
            .value_or(ParseInt64Field(event_json, "startTime").value_or(0));
    const std::int64_t review_ms = review.updated_at_ms;
    const std::int64_t resolution_ms =
        resolution_state.resolution_status == "reopened"
            ? resolution_state.resolution_reopened_at_ms
            : resolution_state.resolution_closed_at_ms;
    std::ostringstream out;
    out << "["
        << "{"
        << "\"key\":\"event-record\","
        << "\"label\":\"EventRecord\","
        << "\"status\":\"recorded\","
        << "\"timeMs\":" << event_ms << ","
        << "\"opsOnly\":true"
        << "},"
        << "{"
        << "\"key\":\"review-state\","
        << "\"label\":\"Review state\","
        << "\"status\":\"" << JsonEscape(review.review_status.empty() ? "new" : review.review_status) << "\","
        << "\"timeMs\":" << review_ms << ","
        << "\"opsOnly\":true"
        << "},"
        << "{"
        << "\"key\":\"resolution-state\","
        << "\"label\":\"Resolution state\","
        << "\"status\":\"" << JsonEscape(resolution_state.resolution_status) << "\","
        << "\"timeMs\":" << resolution_ms << ","
        << "\"transition\":\"" << JsonEscape(resolution_state.resolution_transition) << "\","
        << "\"opsOnly\":true"
        << "},"
        << "{"
        << "\"key\":\"evidence-quality\","
        << "\"label\":\"Evidence quality\","
        << "\"status\":\"" << JsonEscape(evidence_quality.evidence_confidence) << "\","
        << "\"timeMs\":" << event_ms << ","
        << "\"replayCoverage\":\"" << JsonEscape(evidence_quality.replay_coverage) << "\","
        << "\"opsOnly\":true"
        << "},"
        << "{"
        << "\"key\":\"source-reliability\","
        << "\"label\":\"Source reliability\","
        << "\"status\":\"" << JsonEscape(source_reliability.source_health_status) << "\","
        << "\"timeMs\":" << event_ms << ","
        << "\"recentFailureContext\":\"" << JsonEscape(source_reliability.recent_failure_context) << "\","
        << "\"opsOnly\":true"
        << "},"
        << "{"
        << "\"key\":\"ai-review-quality\","
        << "\"label\":\"AI review quality\","
        << "\"status\":\"" << JsonEscape(ai_review_quality.quality_badge) << "\","
        << "\"timeMs\":" << review_ms << ","
        << "\"correctionReviewSignal\":\""
        << JsonEscape(ai_review_quality.correction_review_signal) << "\","
        << "\"opsOnly\":true"
        << "},"
        << "{"
        << "\"key\":\"operator-resolution-flow\","
        << "\"label\":\"Operator resolution flow\","
        << "\"status\":\"" << JsonEscape(operator_resolution_flow.assignment_flow_status) << "\","
        << "\"timeMs\":" << operator_resolution_flow.updated_at_ms << ","
        << "\"assignmentTarget\":\""
        << JsonEscape(operator_resolution_flow.assignment_target) << "\","
        << "\"auditTrailRequired\":true,"
        << "\"opsOnly\":true"
        << "},"
        << "{"
        << "\"key\":\"action-readiness-checklist\","
        << "\"label\":\"Action readiness checklist\","
        << "\"status\":\"" << JsonEscape(action_readiness_checklist.readiness_status) << "\","
        << "\"timeMs\":" << operator_resolution_flow.updated_at_ms << ","
        << "\"ruleDraftReady\":" << (action_readiness_checklist.rule_draft_ready ? "true" : "false") << ","
        << "\"evidenceBundleReady\":"
        << (action_readiness_checklist.evidence_bundle_ready ? "true" : "false") << ","
        << "\"notificationReady\":"
        << (action_readiness_checklist.notification_ready ? "true" : "false") << ","
        << "\"opsOnly\":true"
        << "}"
        << "]";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32619 function
std::string OpsV320DetailSectionsJson(const std::string& event_json,
                                      const OpsEventReviewState& review,
                                      const OpsV320EvidenceQualityInfo& evidence_quality,
                                      const OpsV320SourceReliabilityInfo& source_reliability,
                                      const OpsV330IncidentSourceCorrelationInfo& incident_source_correlation,
                                      const OpsV330OperatorRecheckRecoveryQueueInfo& operator_recheck_recovery_queue,
                                      const OpsV350IncidentCommandHandoff& incident_command_handoff,
                                      const OpsV320AiReviewQualityInfo& ai_review_quality,
                                      const OpsV320OperatorResolutionFlowInfo& operator_resolution_flow,
                                      const OpsV320ActionReadinessChecklistInfo& action_readiness_checklist) {
    const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(review);
    const std::string event_type =
        Trim(ParseStringField(event_json, "eventType")
                 .value_or(ParseStringField(event_json, "className").value_or("event")));
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json).empty()
                                      ? "unknown-source"
                                      : OpsIncidentTriageBoardSourceId(event_json);
    const std::string rule_id =
        Trim(ParseStringField(event_json, "ruleId")
                 .value_or(ParseStringField(event_json, "rule").value_or("not-available")));
    std::ostringstream out;
    out << "["
        << "{"
        << "\"key\":\"event\","
        << "\"label\":\"Event\","
        << "\"status\":\"" << JsonEscape(event_type.empty() ? "event" : event_type) << "\","
        << "\"detail\":\"source " << JsonEscape(source_id) << " / rule "
        << JsonEscape(rule_id.empty() ? "not-available" : rule_id) << "\""
        << "},"
        << "{"
        << "\"key\":\"review\","
        << "\"label\":\"Review\","
        << "\"status\":\"" << JsonEscape(review.review_status.empty() ? "new" : review.review_status) << "\","
        << "\"detail\":\"classification "
        << JsonEscape(review.classification.empty() ? "unclassified" : review.classification) << "\""
        << "},"
        << "{"
        << "\"key\":\"resolution\","
        << "\"label\":\"Resolution\","
        << "\"status\":\"" << JsonEscape(resolution_state.resolution_status) << "\","
        << "\"detail\":\"reason " << JsonEscape(resolution_state.resolution_reason)
        << " / transition " << JsonEscape(resolution_state.resolution_transition) << "\""
        << "},"
        << "{"
        << "\"key\":\"evidence-quality\","
        << "\"label\":\"Evidence Quality\","
        << "\"status\":\"" << JsonEscape(evidence_quality.evidence_completeness) << "\","
        << "\"detail\":\"confidence " << JsonEscape(evidence_quality.evidence_confidence)
        << " / replay " << JsonEscape(evidence_quality.replay_coverage) << "\""
        << "},"
        << "{"
        << "\"key\":\"source-reliability\","
        << "\"label\":\"Source Reliability\","
        << "\"status\":\"" << JsonEscape(source_reliability.source_health_status) << "\","
        << "\"detail\":\"recent failure " << JsonEscape(source_reliability.recent_failure_context)
        << " / recheck " << JsonEscape(source_reliability.operator_recheck_route) << "\""
        << "},"
        << "{"
        << "\"key\":\"incident-source-correlation\","
        << "\"label\":\"Incident Source Correlation\","
        << "\"status\":\"" << JsonEscape(incident_source_correlation.source_cause_category) << "\","
        << "\"detail\":\"closure impact " << JsonEscape(incident_source_correlation.resolution_closure_impact)
        << " / handoff /ops/sources source-health-state-change\""
        << "},"
        << "{"
        << "\"key\":\"operator-recheck-recovery-queue\","
        << "\"label\":\"Operator Recheck Recovery Queue\","
        << "\"status\":\"" << JsonEscape(operator_recheck_recovery_queue.queue_status) << "\","
        << "\"detail\":\"failed-only recheck "
        << JsonEscape(operator_recheck_recovery_queue.recheck_status)
        << " / retry " << JsonEscape(operator_recheck_recovery_queue.retry_candidate)
        << " / note " << JsonEscape(operator_recheck_recovery_queue.operator_note_status)
        << "\""
        << "},"
        << "{"
        << "\"key\":\"incident-command-handoff\","
        << "\"label\":\"Incident Command Handoff\","
        << "\"status\":\"" << JsonEscape(incident_command_handoff.handoff_readiness) << "\","
        << "\"detail\":\"source cause " << JsonEscape(incident_command_handoff.source_cause)
        << " / command plan draft " << JsonEscape(incident_command_handoff.command_plan_draft)
        << " / route /ops/api/live-operations/command-plan"
        << "\""
        << "},"
        << "{"
        << "\"key\":\"ai-review-quality\","
        << "\"label\":\"AI Review Quality\","
        << "\"status\":\"" << JsonEscape(ai_review_quality.quality_badge) << "\","
        << "\"detail\":\"signal " << JsonEscape(ai_review_quality.correction_review_signal)
        << " / uncertainty " << JsonEscape(ai_review_quality.uncertainty_reason) << "\""
        << "},"
        << "{"
        << "\"key\":\"operator-resolution-flow\","
        << "\"label\":\"Operator Resolution Flow\","
        << "\"status\":\"" << JsonEscape(operator_resolution_flow.assignment_flow_status) << "\","
        << "\"detail\":\"assignment " << JsonEscape(operator_resolution_flow.assignment_target)
        << " / audit operator-resolution-flow-update\""
        << "},"
        << "{"
        << "\"key\":\"action-readiness-checklist\","
        << "\"label\":\"Action Readiness Checklist\","
        << "\"status\":\"" << JsonEscape(action_readiness_checklist.readiness_status) << "\","
        << "\"detail\":\"rule draft " << JsonEscape(action_readiness_checklist.rule_draft_status)
        << " / evidence bundle " << JsonEscape(action_readiness_checklist.evidence_bundle_status)
        << " / notification " << JsonEscape(action_readiness_checklist.notification_status) << "\""
        << "}"
        << "]";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32728 function
std::string OpsV320UnifiedResolutionWorkspaceItemJson(const std::string& event_json,
                                                      const OpsEventReviewState& review,
                                                      const std::size_t index,
                                                      const OpsV320EvidenceQualityInfo& evidence_quality,
                                                      const OpsV320SourceReliabilityInfo& source_reliability,
                                                      const OpsV330IncidentSourceCorrelationInfo& incident_source_correlation,
                                                      const OpsV330OperatorRecheckRecoveryQueueInfo& operator_recheck_recovery_queue,
                                                      const OpsV350IncidentCommandHandoff& incident_command_handoff,
                                                      const OpsV320AiReviewQualityInfo& ai_review_quality,
                                                      const OpsV320OperatorResolutionFlowInfo& operator_resolution_flow,
                                                      const OpsV320ActionReadinessChecklistInfo& action_readiness_checklist,
                                                      const OpsV320ResolutionSearchMetricsInfo& resolution_search_metrics) {
    std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(review.event_id));
    if (!OpsEventReviewEventIdAllowed(event_id)) {
        event_id = OpsEventReviewEventIdAllowed(review.event_id) ? review.event_id
                                                                 : "event-" + std::to_string(index + 1);
    }
    const std::string event_type =
        Trim(ParseStringField(event_json, "eventType")
                 .value_or(ParseStringField(event_json, "className").value_or("event")));
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json).empty()
                                      ? "unknown-source"
                                      : OpsIncidentTriageBoardSourceId(event_json);
    const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(review);
    const std::string queue_status = OpsV320ResolutionQueueStatus(resolution_state);
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-unified-events-workspace.v1\","
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(event_type.empty() ? "event" : event_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"queueStatus\":\"" << JsonEscape(queue_status) << "\","
        << "\"reviewState\":\"" << JsonEscape(review.review_status.empty() ? "new" : review.review_status) << "\","
        << "\"resolutionState\":" << OpsResolutionStateJson(resolution_state) << ","
        << "\"closeReopenLifecycle\":" << OpsResolutionStateJson(resolution_state) << ","
        << "\"evidenceQuality\":" << OpsV320EvidenceQualityJson(evidence_quality) << ","
        << "\"sourceReliability\":" << OpsV320SourceReliabilityContextJson(source_reliability) << ","
        << "\"incidentSourceCorrelation\":"
        << OpsV330IncidentSourceCorrelationJson(incident_source_correlation) << ","
        << "\"operatorRecheckRecoveryQueue\":"
        << OpsV330OperatorRecheckRecoveryQueueJson(operator_recheck_recovery_queue) << ","
        << "\"incidentCommandHandoff\":";
    AppendV350IncidentCommandHandoffJson(out, incident_command_handoff);
    out << ","
        << "\"aiReviewQuality\":" << OpsV320AiReviewQualityContextJson(ai_review_quality) << ","
        << "\"operatorResolutionFlow\":"
        << OpsV320OperatorResolutionFlowJson(operator_resolution_flow) << ","
        << "\"actionReadinessChecklist\":"
        << OpsV320ActionReadinessChecklistJson(action_readiness_checklist) << ","
        << "\"resolutionSearchMetrics\":"
        << OpsV320ResolutionSearchMetricsJson(resolution_search_metrics) << ","
        << "\"detailSections\":"
        << OpsV320DetailSectionsJson(
               event_json,
               resolution_state,
               evidence_quality,
               source_reliability,
               incident_source_correlation,
               operator_recheck_recovery_queue,
               incident_command_handoff,
               ai_review_quality,
               operator_resolution_flow,
               action_readiness_checklist)
        << ","
        << "\"timelineMarkers\":"
        << OpsV320TimelineMarkersJson(
               event_json,
               resolution_state,
               evidence_quality,
               source_reliability,
               ai_review_quality,
               operator_resolution_flow,
               action_readiness_checklist)
        << ","
        << "\"opsOnly\":true,"
        << "\"persistentReviewState\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32818 function
std::string OpsV320UnifiedOpsEventsWorkspaceJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews,
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot,
    const std::unordered_map<std::string, std::string>& query) {
    std::vector<std::string> items;
    std::vector<OpsV320EvidenceQualityInfo> evidence_quality_items;
    std::vector<OpsV320SourceReliabilityInfo> source_reliability_items;
    std::vector<OpsV330IncidentSourceCorrelationInfo> incident_source_correlation_items;
    std::vector<OpsV330OperatorRecheckRecoveryQueueInfo> operator_recheck_recovery_queue_items;
    std::vector<OpsV350IncidentCommandHandoff> incident_command_handoff_items;
    std::vector<OpsV320AiReviewQualityInfo> ai_review_quality_items;
    std::vector<OpsV320OperatorResolutionFlowInfo> operator_resolution_flow_items;
    std::vector<OpsV320ActionReadinessChecklistInfo> action_readiness_checklist_items;
    std::vector<OpsV320ResolutionSearchMetricsInfo> resolution_search_metrics_items;
    items.reserve(std::min<std::size_t>(event_json_records.size(), 12U));
    evidence_quality_items.reserve(std::min<std::size_t>(event_json_records.size(), 12U));
    source_reliability_items.reserve(std::min<std::size_t>(event_json_records.size(), 12U));
    incident_source_correlation_items.reserve(
        std::min<std::size_t>(event_json_records.size(), 12U));
    operator_recheck_recovery_queue_items.reserve(
        std::min<std::size_t>(event_json_records.size(), 12U));
    incident_command_handoff_items.reserve(std::min<std::size_t>(event_json_records.size(), 12U));
    ai_review_quality_items.reserve(std::min<std::size_t>(event_json_records.size(), 12U));
    operator_resolution_flow_items.reserve(std::min<std::size_t>(event_json_records.size(), 12U));
    action_readiness_checklist_items.reserve(
        std::min<std::size_t>(event_json_records.size(), 12U));
    resolution_search_metrics_items.reserve(std::min<std::size_t>(event_json_records.size(), 12U));
    const auto v350_graph_context = BuildV350LiveOperationsGraphContext(config, source_health_snapshot);
    const std::vector<OpsV350CommandPlanCandidate> commandPlanCandidates =
        v350_graph_context.ok ? BuildV350CommandPlanCandidates(v350_graph_context)
                              : std::vector<OpsV350CommandPlanCandidate>{};
    for (std::size_t index = 0; index < event_json_records.size(); ++index) {
        const std::string& event_json = event_json_records[index];
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        const OpsV320EvidenceQualityInfo evidence_quality =
            OpsV320EvidenceQualityInfoFor(event_json, review);
        const OpsV320SourceReliabilityInfo source_reliability =
            OpsV320SourceReliabilityInfoFor(event_json, source_health_snapshot);
        const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(review);
        const OpsV330IncidentSourceCorrelationInfo incident_source_correlation =
            OpsV330IncidentSourceCorrelationInfoFor(
                event_json,
                resolution_state,
                source_reliability);
        const OpsV330OperatorRecheckRecoveryQueueInfo operator_recheck_recovery_queue =
            OpsV330OperatorRecheckRecoveryQueueInfoFor(
                event_json,
                review,
                source_reliability,
                incident_source_correlation);
        const OpsV350IncidentCommandHandoff incident_command_handoff =
            BuildV350IncidentCommandHandoff(
                event_json,
                incident_source_correlation.event_id,
                incident_source_correlation.source_id,
                incident_source_correlation.source_cause_category,
                incident_source_correlation.source_cause_summary,
                incident_source_correlation.source_recheck_required,
                commandPlanCandidates);
        const OpsV320AiReviewQualityInfo ai_review_quality =
            OpsV320AiReviewQualityInfoFor(review, evidence_quality, source_reliability);
        const OpsV320OperatorResolutionFlowInfo operator_resolution_flow =
            OpsV320OperatorResolutionFlowInfoFor(review);
        const OpsV320ActionReadinessChecklistInfo action_readiness_checklist =
            OpsV320ActionReadinessChecklistInfoFor(
                evidence_quality,
                source_reliability,
                ai_review_quality,
                operator_resolution_flow);
        const OpsV320ResolutionSearchMetricsInfo resolution_search_metrics =
            OpsV320ResolutionSearchMetricsInfoFor(event_json,
                                                  review,
                                                  evidence_quality,
                                                  source_reliability,
                                                  ai_review_quality,
                                                  action_readiness_checklist);
        items.push_back(OpsV320UnifiedResolutionWorkspaceItemJson(
            event_json,
            review,
            index,
            evidence_quality,
            source_reliability,
            incident_source_correlation,
            operator_recheck_recovery_queue,
            incident_command_handoff,
            ai_review_quality,
            operator_resolution_flow,
            action_readiness_checklist,
            resolution_search_metrics));
        evidence_quality_items.push_back(evidence_quality);
        source_reliability_items.push_back(source_reliability);
        incident_source_correlation_items.push_back(incident_source_correlation);
        operator_recheck_recovery_queue_items.push_back(operator_recheck_recovery_queue);
        incident_command_handoff_items.push_back(incident_command_handoff);
        ai_review_quality_items.push_back(ai_review_quality);
        operator_resolution_flow_items.push_back(operator_resolution_flow);
        action_readiness_checklist_items.push_back(action_readiness_checklist);
        resolution_search_metrics_items.push_back(resolution_search_metrics);
        if (items.size() >= 12U) {
            break;
        }
    }
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v320-unified-events-workspace.v1\","
        << "\"status\":\"ops-v320-unified-events-workspace\","
        << "\"opsOnly\":true,"
        << "\"workspace\":\"resolution-queue-detail-timeline\","
        << "\"resolutionQueue\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << items[i];
    }
    out << "],"
        << "\"selectedDetail\":" << (items.empty() ? "null" : items.front()) << ","
        << "\"resolutionTimeline\":" << (items.empty() ? "[]" : "[" + items.front() + "]") << ","
        << "\"evidenceQualitySummary\":"
        << OpsV320EvidenceQualitySummaryJson(evidence_quality_items) << ","
        << "\"sourceReliabilitySummary\":"
        << OpsV320SourceReliabilitySummaryJson(source_reliability_items) << ","
        << "\"incidentSourceCorrelationSummary\":"
        << OpsV330IncidentSourceCorrelationSummaryJson(incident_source_correlation_items) << ","
        << "\"operatorRecheckRecoveryQueueSummary\":"
        << OpsV330OperatorRecheckRecoveryQueueSummaryJson(operator_recheck_recovery_queue_items)
        << ","
        << "\"incidentCommandHandoffSummary\":"
        << OpsV350IncidentCommandHandoffSummaryJson(incident_command_handoff_items) << ","
        << "\"aiReviewQualitySummary\":"
        << OpsV320AiReviewQualitySummaryJson(ai_review_quality_items) << ","
        << "\"operatorResolutionFlowSummary\":"
        << OpsV320OperatorResolutionFlowSummaryJson(operator_resolution_flow_items) << ","
        << "\"actionReadinessChecklistSummary\":"
        << OpsV320ActionReadinessChecklistSummaryJson(action_readiness_checklist_items) << ","
        << "\"resolutionSearchMetricsSummary\":"
        << OpsV320ResolutionSearchMetricsSummaryJson(resolution_search_metrics_items, query) << ","
        << "\"itemCount\":" << items.size() << ","
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"evidenceQualityLayerImplemented\":true,"
        << "\"sourceReliabilityContextImplemented\":true,"
        << "\"incidentSourceCorrelationLayerImplemented\":true,"
        << "\"operatorRecheckRecoveryQueueImplemented\":true,"
        << "\"incidentCommandHandoffImplemented\":true,"
        << "\"aiReviewQualityContextImplemented\":true,"
        << "\"operatorAssignmentFlowImplemented\":true,"
        << "\"actionReadinessChecklistImplemented\":true,"
        << "\"clientDigestImplemented\":false,"
        << "\"searchMetricsImplemented\":true"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32988 function
std::string OpsV310ReplayTimelineItemJson(const std::string& event_json,
                                          const OpsEventReviewState& review,
                                          const std::size_t index) {
    std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
    if (!OpsEventReviewEventIdAllowed(event_id)) {
        event_id = "event-" + std::to_string(index + 1);
    }
    const std::string event_type =
        Trim(ParseStringField(event_json, "eventType")
                 .value_or(ParseStringField(event_json, "className").value_or("event")));
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json).empty()
                                      ? "unknown-source"
                                      : OpsIncidentTriageBoardSourceId(event_json);
    const std::string event_frame = OpsV300EvidenceRefPath(event_json, "snapshotPath");
    const std::string representative_image = event_frame;
    const std::string evidence_manifest = OpsV300EvidenceRefPath(event_json, "evidenceManifest");
    const std::string frame_bundle = OpsV300EvidenceRefPath(event_json, "frameBundleManifest");
    const std::string clip_manifest = OpsV300EvidenceRefPath(event_json, "clipPath");
    const std::string encoded_manifest = OpsV310EncodedManifestPath(clip_manifest);
    const std::string encoded_media = OpsV310EncodedMediaPath(clip_manifest);
    const std::int64_t start_ms = ParseInt64Field(event_json, "startTime").value_or(0);
    const std::int64_t event_ms = ParseInt64Field(event_json, "updateTime").value_or(start_ms);
    const std::int64_t end_ms = ParseInt64Field(event_json, "endTime").value_or(event_ms);
    const std::int64_t pre_event_ms =
        std::max<std::int64_t>(0, ParseInt64Field(event_json, "preEventMs").value_or(event_ms - start_ms));
    const std::int64_t post_event_ms =
        std::max<std::int64_t>(0, ParseInt64Field(event_json, "postEventMs").value_or(end_ms - event_ms));

    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(event_type.empty() ? "event" : event_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"reviewState\":\"" << JsonEscape(review.review_status.empty() ? "new" : review.review_status) << "\","
        << "\"eventFrame\":" << OpsV310ArtifactJson("eventFrame",
                                                      event_frame.empty() ? "missing" : "present",
                                                      event_frame,
                                                      "EventRecord snapshotPath",
                                                      true)
        << ",\"representativeImage\":"
        << OpsV310ArtifactJson("representativeImage",
                               representative_image.empty() ? "missing" : "selected",
                               representative_image,
                               "EvidenceManifest representativeImage",
                               true)
        << ",\"frameBundle\":"
        << OpsV310ArtifactJson("frameBundle",
                               frame_bundle.empty() ? "missing" : "present",
                               frame_bundle,
                               "vlmEvidenceRefs.temporalContext.frameBundleManifest")
        << ",\"encodedClip\":{"
        << "\"schema\":\"media-server.encoded-event-clip-contract.v1\","
        << "\"status\":\"" << (encoded_media.empty() ? "missing" : "completed") << "\","
        << "\"available\":" << (encoded_media.empty() ? "false" : "true") << ","
        << "\"encodedClipManifestPath\":\"" << JsonEscape(encoded_manifest.empty() ? "not-available" : encoded_manifest) << "\","
        << "\"encodedClipMediaPath\":\"" << JsonEscape(encoded_media.empty() ? "not-available" : encoded_media) << "\","
        << "\"clipManifestPath\":\"" << JsonEscape(clip_manifest.empty() ? "not-available" : clip_manifest) << "\","
        << "\"format\":\"webm\","
        << "\"codec\":\"vp8\","
        << "\"boundedShortSegment\":true,"
        << "\"continuousRecording\":false,"
        << "\"archiveApi\":false"
        << "},"
        << "\"frameRefPtsMapping\":{"
        << "\"timescale\":1000,"
        << "\"startMs\":" << std::max<std::int64_t>(0, event_ms - pre_event_ms) << ","
        << "\"eventMs\":" << event_ms << ","
        << "\"endMs\":" << (event_ms + post_event_ms) << ","
        << "\"eventClipPtsMs\":" << pre_event_ms << ","
        << "\"sourceFrameRefBasis\":\"EventRecord/vlmEvidenceRefs\""
        << "},"
        << "\"timelinePoints\":"
        << OpsV310ReplayTimelinePointsJson(event_frame,
                                           representative_image,
                                           frame_bundle,
                                           encoded_manifest,
                                           encoded_media)
        << ",\"playbackSegments\":"
        << OpsV310PlaybackSegmentsJson(pre_event_ms, post_event_ms, !encoded_media.empty())
        << ",\"evidenceManifestPath\":\"" << JsonEscape(evidence_manifest.empty() ? "not-available" : evidence_manifest) << "\","
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33081 function
std::string OpsV310ReplayTimelineUiJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v310-replay-timeline-ui.v1\","
        << "\"status\":\"ops-v310-replay-timeline-ui\","
        << "\"opsOnly\":true,"
        << "\"frameRefPtsMappingRequired\":true,"
        << "\"encodedClipTimelineRequired\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"clientDigestImplemented\":false,"
        << "\"scopedIntegratorApiImplemented\":false,"
        << "\"cleanupExecutionPerformed\":false,"
        << "\"items\":[";
    std::size_t written = 0;
    for (std::size_t index = 0; index < event_json_records.size(); ++index) {
        const std::string& event_json = event_json_records[index];
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        if (written != 0) {
            out << ",";
        }
        out << OpsV310ReplayTimelineItemJson(event_json, review, index);
        ++written;
        if (written >= 12U) {
            break;
        }
    }
    out << "],"
        << "\"itemCount\":" << written
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33129 function
std::string OpsV310OperatorFeatureCorrectionItemJson(const std::string& event_json,
                                                     const OpsEventReviewState& review,
                                                     const std::size_t index) {
    std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(review.event_id));
    if (!OpsEventReviewEventIdAllowed(event_id)) {
        event_id = OpsEventReviewEventIdAllowed(review.event_id) ? review.event_id
                                                                 : "event-" + std::to_string(index + 1);
    }
    const std::string event_type =
        Trim(ParseStringField(event_json, "eventType")
                 .value_or(ParseStringField(event_json, "className").value_or("event")));
    const std::string original_feature_label =
        Trim(ParseStringField(event_json, "className")
                 .value_or(ParseStringField(event_json, "eventType").value_or("unclassified")));
    const std::string source_id = OpsIncidentTriageBoardSourceId(event_json).empty()
                                      ? "unknown-source"
                                      : OpsIncidentTriageBoardSourceId(event_json);
    const bool correction_present = OpsFeatureCorrectionHasContent(review);
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.operator-feature-correction.v1\","
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(event_type.empty() ? "event" : event_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"originalFeatureLabel\":\""
        << JsonEscape(original_feature_label.empty() ? "unclassified" : original_feature_label)
        << "\","
        << "\"correctedFeatureLabel\":\"" << JsonEscape(review.corrected_feature_label) << "\","
        << "\"featureAliases\":" << JsonStringArray(review.feature_aliases) << ","
        << "\"aliasCount\":" << review.feature_aliases.size() << ","
        << "\"reanalysisRequested\":" << (review.reanalysis_requested ? "true" : "false") << ","
        << "\"reanalysisReason\":\"" << JsonEscape(review.reanalysis_reason) << "\","
        << "\"correctionPresent\":" << (correction_present ? "true" : "false") << ","
        << "\"reviewStatus\":\"" << JsonEscape(review.review_status.empty() ? "new" : review.review_status) << "\","
        << "\"classification\":\""
        << JsonEscape(review.classification.empty() ? "unclassified" : review.classification) << "\","
        << "\"operatorOnly\":true,"
        << "\"persistent\":true,"
        << "\"separateFromEventRecords\":true,"
        << "\"separateFromEventPostPayload\":true,"
        << "\"modelProviderDependency\":false,"
        << "\"runtimeProviderCallPerformed\":false,"
        << "\"featureRevisionWritePerformed\":false,"
        << "\"automaticRuleApplied\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33183 function
std::string OpsV310OperatorFeatureCorrectionViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.operator-feature-correction.v1\","
        << "\"status\":\"ops-operator-feature-correction\","
        << "\"opsOnly\":true,"
        << "\"persistent\":true,"
        << "\"separateFromEventRecords\":true,"
        << "\"separateFromEventPostPayload\":true,"
        << "\"modelProviderDependency\":false,"
        << "\"runtimeProviderCallPerformed\":false,"
        << "\"featureRevisionWritePerformed\":false,"
        << "\"automaticRuleApplied\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"items\":[";
    std::size_t written = 0;
    std::size_t correction_count = 0;
    std::size_t alias_count = 0;
    std::size_t reanalysis_request_count = 0;
    for (std::size_t index = 0; index < event_json_records.size(); ++index) {
        const std::string& event_json = event_json_records[index];
        const std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        if (OpsFeatureCorrectionHasContent(review)) {
            ++correction_count;
        }
        alias_count += review.feature_aliases.size();
        if (review.reanalysis_requested) {
            ++reanalysis_request_count;
        }
        if (written != 0) {
            out << ",";
        }
        out << OpsV310OperatorFeatureCorrectionItemJson(event_json, review, index);
        ++written;
        if (written >= 12U) {
            break;
        }
    }
    out << "],"
        << "\"itemCount\":" << written << ","
        << "\"correctionCount\":" << correction_count << ","
        << "\"aliasCount\":" << alias_count << ","
        << "\"reanalysisRequestCount\":" << reanalysis_request_count
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33243 function
EventFeatureSearchApplicationRecord OpsV300IndexEventRecordFromJson(
    const std::string& event_json,
    const std::size_t index) {
    EventFeatureSearchApplicationRecord event;
    event.event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
    if (!OpsEventReviewEventIdAllowed(event.event_id)) {
        event.event_id = "event-" + std::to_string(index + 1);
    }
    event.source_id = OpsIncidentTriageBoardSourceId(event_json);
    if (event.source_id.empty()) {
        event.source_id = "unknown-source";
    }
    event.channel_id = Trim(ParseStringField(event_json, "channelId").value_or(""));
    event.event_type = Trim(ParseStringField(event_json, "eventType").value_or(""));
    if (event.event_type.empty()) {
        event.event_type = Trim(ParseStringField(event_json, "className").value_or("event"));
    }
    event.scenario = OpsIncidentTriageBoardScenario(event_json);
    event.status = Trim(ParseStringField(event_json, "status").value_or("recorded"));
    event.zone_id = Trim(ParseStringField(event_json, "zoneId").value_or(""));
    event.line_id = Trim(ParseStringField(event_json, "lineId").value_or(""));
    event.class_name = Trim(ParseStringField(event_json, "className").value_or(""));
    for (const char* key : {"timestampMs", "createdAtMs", "receivedAtMs"}) {
        if (const auto parsed = ParseInt64Field(event_json, key); parsed.has_value()) {
            event.timestamp_ms = *parsed;
            break;
        }
    }
    return event;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33279 function
void OpsV300AddIndexFeature(EventFeatureSearchApplicationRecord* record,
                            const std::string& namespace_name,
                            const std::string& name,
                            const std::string& value,
                            const std::string& evidence_ref) {
    if (record == nullptr || Trim(value).empty()) {
        return;
    }
    EventFeatureSearchApplicationFeature feature;
    feature.namespace_name = namespace_name;
    feature.name = name;
    feature.value = value;
    feature.evidence_ref = evidence_ref;
    record->features.push_back(std::move(feature));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33299 function
void OpsV300ApplyIndexFeatureSetFromJson(
    const std::string& event_json,
    const OpsEventReviewState& review,
    EventFeatureSearchApplicationRecord* record) {
    if (record == nullptr) {
        return;
    }
    record->feature_set_id = "ops-v300-ui-" + record->event_id;
    record->feature_revision = 1;
    const std::string evidence_ref =
        OpsV300EvidenceRefPath(event_json, "evidenceManifest").empty()
            ? OpsV300EvidenceRefPath(event_json, "snapshotPath")
            : OpsV300EvidenceRefPath(event_json, "evidenceManifest");
    OpsV300AddIndexFeature(record, "event", "eventType", record->event_type, evidence_ref);
    OpsV300AddIndexFeature(record, "event", "status", record->status, evidence_ref);
    OpsV300AddIndexFeature(record, "scene", "source", record->source_id, evidence_ref);
    OpsV300AddIndexFeature(record, "scene", "scenario", record->scenario, evidence_ref);
    OpsV300AddIndexFeature(record, "action", "rule", OpsIncidentMemoryEventRuleId(event_json), evidence_ref);
    OpsV300AddIndexFeature(record, "operator", "reviewState", review.review_status, evidence_ref);
    OpsV300AddIndexFeature(record, "operator", "incidentStatus", review.incident_status, evidence_ref);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33328 function
void OpsV300ApplyIndexEvidenceManifestFromJson(
    const std::string& event_json,
    EventFeatureSearchApplicationRecord* record) {
    if (record == nullptr) {
        return;
    }
    const std::string snapshot_path = OpsV300EvidenceRefPath(event_json, "snapshotPath");
    const std::string evidence_manifest = OpsV300EvidenceRefPath(event_json, "evidenceManifest");
    const std::string frame_bundle_manifest = OpsV300EvidenceRefPath(event_json, "frameBundleManifest");
    const std::string bbox_crop = OpsV300EvidenceRefPath(event_json, "bboxCrop");
    record->manifest_path = evidence_manifest.empty() ? "ops-v300-ui-derived:" + record->event_id
                                                      : evidence_manifest;
    record->event_frame_present = !snapshot_path.empty() || !evidence_manifest.empty();
    record->representative_image_present = !snapshot_path.empty();
    record->bbox_crop_count = bbox_crop.empty() ? 0 : 1;
    record->frame_bundle_present = !frame_bundle_manifest.empty();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33350 function
void OpsV300ApplyIndexReviewStateFromReview(
    const std::string& event_json,
    const OpsEventReviewState& review,
    EventFeatureSearchApplicationRecord* record) {
    if (record == nullptr) {
        return;
    }
    record->review_state = review.review_status.empty() ? "new" : review.review_status;
    record->classification = review.classification.empty() ? "unclassified" : review.classification;
    record->incident_status = review.incident_status.empty() ? "new" : review.incident_status;
    record->pinned = ParseBoolField(event_json, "pinned").value_or(false);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33363 function
std::string OpsV300EntryFeatureValue(const EventFeatureSearchApplicationEntry& entry,
                                     const std::string& field) {
    for (const auto& value : entry.document.features) {
        if (value.field == field) {
            return value.value;
        }
    }
    return "";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33373 function
bool OpsV300EntryHasFeature(const EventFeatureSearchApplicationEntry& entry,
                            const std::string& field) {
    return !OpsV300EntryFeatureValue(entry, field).empty();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33378 function
std::string OpsV300EvidenceTimelineJson(const EventFeatureSearchApplicationEntry& entry,
                                        const std::string& event_json) {
    const std::string snapshot_path = OpsV300EvidenceRefPath(event_json, "snapshotPath");
    const std::string bbox_crop = OpsV300EvidenceRefPath(event_json, "bboxCrop");
    const std::string frame_bundle = OpsV300EvidenceRefPath(event_json, "frameBundleManifest");
    const std::string evidence_manifest = OpsV300EvidenceRefPath(event_json, "evidenceManifest");
    struct TimelineItem {
        std::string phase;
        std::string status;
        std::string ref;
        std::string reason;
    };
    const std::vector<TimelineItem> items = {
        {"eventFrame",
         OpsV300EntryHasFeature(entry, "evidence.eventFrame") ? "present" : "missing",
         snapshot_path.empty() ? evidence_manifest : snapshot_path,
         "trigger-time evidence"},
        {"representativeImage",
         OpsV300EntryHasFeature(entry, "evidence.representativeImage") ? "selected" : "not-selected",
         snapshot_path,
         "better VLM input only when available"},
        {"bboxCrop",
         OpsV300EntryHasFeature(entry, "evidence.bboxCrop") ? "present" : "missing",
         bbox_crop,
         "object-local review evidence"},
        {"frameBundle",
         OpsV300EntryHasFeature(entry, "evidence.frameBundle") ? "present" : "missing",
         frame_bundle,
         "pre/event/post FrameRef context"},
    };
    std::ostringstream out;
    out << "[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"phase\":\"" << JsonEscape(items[i].phase) << "\","
            << "\"status\":\"" << JsonEscape(items[i].status) << "\","
            << "\"ref\":\"" << JsonEscape(items[i].ref.empty() ? "not-available" : items[i].ref) << "\","
            << "\"reason\":\"" << JsonEscape(items[i].reason) << "\""
            << "}";
    }
    out << "]";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33425 function
std::string OpsV300FeatureReasonsJson(const EventFeatureSearchApplicationEntry& entry) {
    std::ostringstream out;
    out << "[";
    std::size_t written = 0;
    constexpr std::size_t kMaxReasons = 10;
    for (const auto& feature : entry.document.features) {
        if (feature.field.empty() || feature.value.empty()) {
            continue;
        }
        if (written != 0) {
            out << ",";
        }
        out << "{"
            << "\"field\":\"" << JsonEscape(feature.field) << "\","
            << "\"value\":\"" << JsonEscape(feature.value) << "\","
            << "\"basis\":\"local Feature/Search Index projection\""
            << "}";
        ++written;
        if (written >= kMaxReasons) {
            break;
        }
    }
    out << "]";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33451 function
bool OpsV300EntryRetryable(const EventFeatureSearchApplicationEntry& entry) {
    return entry.has_event_record && entry.has_evidence_manifest;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33455 function
std::string OpsV300RetryActionsJson(const EventFeatureSearchApplicationEntry& entry) {
    const bool retryable = OpsV300EntryRetryable(entry);
    std::ostringstream out;
    out << "{"
        << "\"status\":\"" << (retryable ? "retryable" : "blocked") << "\","
        << "\"route\":\"/ops/events#retry-v300-feature-extraction\","
        << "\"manualOnly\":true,"
        << "\"retryWritePerformed\":false,"
        << "\"providerCallPerformed\":false,"
        << "\"blockedReason\":\"" << (retryable ? "" : "missing-event-evidence") << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33469 function
std::string OpsV300PinStatusJson(const EventFeatureSearchApplicationEntry& entry) {
    std::ostringstream out;
    out << "{"
        << "\"pinned\":" << (entry.document.pinned ? "true" : "false") << ","
        << "\"pinEligible\":true,"
        << "\"pinActionAvailable\":true,"
        << "\"pinWritePerformed\":false,"
        << "\"status\":\"" << (entry.document.pinned ? "pinned" : "eligible-not-pinned") << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33481 function
std::string OpsV300RetentionStatusJson(const EventFeatureSearchApplicationEntry& entry) {
    std::ostringstream out;
    out << "{"
        << "\"defaultRetentionDays\":7,"
        << "\"pinnedExcludesAutomaticCleanup\":true,"
        << "\"status\":\"" << (entry.document.pinned ? "pinned-excluded" : "seven-day-window") << "\","
        << "\"cleanupExecutionRequired\":false,"
        << "\"retentionCleanupExecuted\":false,"
        << "\"s09LifecycleRequired\":true"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33494 function
std::string OpsV300EventEvidenceSearchItemJson(const EventFeatureSearchApplicationEntry& entry,
                                               const std::string& event_json) {
    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(entry.event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(entry.document.source_id.empty() ? "unknown-source"
                                                                            : entry.document.source_id) << "\","
        << "\"eventType\":\"" << JsonEscape(entry.document.event_type.empty() ? "event"
                                                                              : entry.document.event_type) << "\","
        << "\"scenario\":\"" << JsonEscape(entry.document.scenario.empty() ? "event"
                                                                           : entry.document.scenario) << "\","
        << "\"reviewState\":\"" << JsonEscape(entry.document.review_state.empty() ? "new"
                                                                                   : entry.document.review_state) << "\","
        << "\"featureRevision\":" << entry.feature_revision << ","
        << "\"featureReasons\":" << OpsV300FeatureReasonsJson(entry) << ","
        << "\"evidenceTimeline\":" << OpsV300EvidenceTimelineJson(entry, event_json) << ","
        << "\"retryActions\":" << OpsV300RetryActionsJson(entry) << ","
        << "\"pinStatus\":" << OpsV300PinStatusJson(entry) << ","
        << "\"retentionStatus\":" << OpsV300RetentionStatusJson(entry) << ","
        << "\"evidenceRefs\":" << OpsIncidentMemoryStringArrayJson(entry.evidence_refs) << ","
        << "\"rawPromptStored\":false,"
        << "\"rawProviderResponseStored\":false,"
        << "\"sourceUrlExposed\":false,"
        << "\"debugMaterialExposed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33522 function
std::string OpsV300EventEvidenceSearchUiJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews,
    const std::unordered_map<std::string, std::string>& query) {
    const std::string search_query =
        OpsV300EventEvidenceSearchQueryValue(query, "v300Q", "q");
    const bool pinned_only = OpsV300EventEvidenceSearchBoolQuery(query, "v300PinnedOnly");
    const std::string retry_filter =
        LowerAscii(OpsV300EventEvidenceSearchQueryValue(query, "v300RetryFilter"));

    std::vector<EventFeatureSearchApplicationRecord> records;
    std::unordered_map<std::string, std::string> event_by_id;
    records.reserve(event_json_records.size());
    for (std::size_t index = 0; index < event_json_records.size(); ++index) {
        const std::string& event_json = event_json_records[index];
        EventFeatureSearchApplicationRecord event_record =
            OpsV300IndexEventRecordFromJson(event_json, index);
        const auto review_it = reviews.find(event_record.event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_record.event_id)
                                       : review_it->second;
        event_by_id[event_record.event_id] = event_json;
        OpsV300ApplyIndexEvidenceManifestFromJson(event_json, &event_record);
        OpsV300ApplyIndexFeatureSetFromJson(event_json, review, &event_record);
        OpsV300ApplyIndexReviewStateFromReview(event_json, review, &event_record);
        records.push_back(std::move(event_record));
    }

    EventFeatureSearchApplicationQuery search;
    search.query = search_query;
    search.default_limit = 12;
    search.max_limit = 24;
    search.forced_limit = 12;
    search.pinned_only = pinned_only;
    search.search_index_required = true;
    search.ops_events_ui_required = true;
    auto search_result = SearchEventFeaturesForApplication(records, search);
    auto hits = std::move(search_result.hits);
    std::vector<std::string> items;
    items.reserve(hits.size());
    for (const auto& hit : hits) {
        const bool retryable = OpsV300EntryRetryable(hit);
        if (retry_filter == "retryable" && !retryable) {
            continue;
        }
        if (retry_filter == "blocked" && retryable) {
            continue;
        }
        const auto event_it = event_by_id.find(hit.event_id);
        items.push_back(OpsV300EventEvidenceSearchItemJson(
            hit, event_it == event_by_id.end() ? std::string() : event_it->second));
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.v300-event-evidence-search-ui.v1\","
        << "\"status\":\"ops-v300-event-evidence-search-ui\","
        << "\"query\":\"" << JsonEscape(search_query) << "\","
        << "\"pinnedOnly\":" << (pinned_only ? "true" : "false") << ","
        << "\"retryFilter\":\"" << JsonEscape(retry_filter) << "\","
        << "\"featureSearchIndexBacked\":true,"
        << "\"searchDslValid\":" << (search_result.search_dsl_valid ? "true" : "false") << ","
        << "\"rejectionReason\":\"" << JsonEscape(search_result.rejection_reason) << "\","
        << "\"generation\":" << search_result.generation << ","
        << "\"indexedEntries\":" << search_result.indexed_entries << ","
        << "\"hitCount\":" << items.size() << ","
        << "\"modelProviderDependency\":false,"
        << "\"vectorSearchPerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"retentionCleanupExecuted\":false,"
        << "\"s09RetentionLifecycleRequired\":true,"
        << "\"items\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << items[i];
    }
    out << "]}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33628 function
IntegratorScopedEventSearchSource LoadIntegratorScopedEventSearchSource(
    const SourceViewApplicationService::ClientViewAccess& access,
    std::size_t read_limit) {
    IntegratorScopedEventSearchSource source;
    EventStorageApplicationQueryResult selected_result;
    bool selected = false;
    for (const auto& stream_key : ClientEventStreamCandidates(access.source, nullptr)) {
        if (stream_key.empty()) {
            continue;
        }
        EventStorageApplicationQueryOptions options;
        options.stream_id = stream_key;
        options.limit = std::max<std::size_t>(read_limit, 200U);
        EventStorageApplicationQueryResult result;
        std::string error_message;
        if (!QueryEventRecordsForApplication(options, &result, &error_message)) {
            source.error = error_message.empty() ? "failed to query event records" : error_message;
            return source;
        }
        if (!selected || !result.records_json.empty()) {
            selected_result = std::move(result);
            selected = true;
        }
        if (!selected_result.records_json.empty()) {
            break;
        }
    }
    if (!selected) {
        source.error = "source stream is unavailable";
        return source;
    }
    source.provided = selected_result.storage.enabled && selected_result.file_exists;
    source.storage_enabled = selected_result.storage.enabled;
    source.has_more = selected_result.has_more;
    source.records_json = std::move(selected_result.records_json);
    return source;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33666 function
ClientEventItem IntegratorScopedEventItemFromEntry(const EventFeatureSearchApplicationEntry& entry,
                                                   const std::string& event_json) {
    ClientEventItem item = ParseClientEventItem(event_json);
    if (item.event_id.empty()) {
        item.event_id = entry.event_id;
    }
    if (item.event_type.empty()) {
        item.event_type = entry.document.event_type;
    }
    if (item.status.empty()) {
        item.status = entry.document.status.empty() ? "recorded" : entry.document.status;
    }
    if (item.class_name.empty()) {
        item.class_name = entry.document.class_name;
    }
    if (item.scenario_name.empty()) {
        item.scenario_name = entry.document.scenario;
    }
    if (!item.update_time_ms.has_value() && entry.document.timestamp_ms > 0) {
        item.update_time_ms = entry.document.timestamp_ms;
    }
    return item;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33690 function
std::string IntegratorScopedEventSearchItemJson(
    const SourceViewApplicationService::ClientViewAccess& access,
    const EventFeatureSearchApplicationEntry& entry,
    const std::string& event_json,
    std::size_t index) {
    const ClientEventItem item = IntegratorScopedEventItemFromEntry(entry, event_json);
    std::ostringstream out;
    out << "{"
        << "\"eventId\":\"" << JsonEscape(item.event_id.empty() ? entry.event_id : item.event_id) << "\","
        << "\"viewId\":\"" << JsonEscape(access.view.view_id) << "\","
        << "\"digest\":{"
        << "\"digestId\":\"integrator-event-" << (index + 1) << "\","
        << "\"summaryText\":\"" << JsonEscape(ClientSafeEventDigestSummaryText(item)) << "\","
        << "\"eventType\":\"" << JsonEscape(ClientSafeDigestValue(item.event_type, "event")) << "\","
        << "\"status\":\"" << JsonEscape(ClientSafeDigestValue(item.status, "recorded")) << "\","
        << "\"severity\":\"" << JsonEscape(ClientSafeIncidentDigestSeverity(item)) << "\","
        << "\"timelineHint\":\"" << JsonEscape(ClientSafeEventDigestTimelineHint(item)) << "\","
        << "\"time\":";
    AppendNullableInt64(out, item.update_time_ms.has_value() ? item.update_time_ms
                                                             : item.start_time_ms);
    out << "}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33714 function
std::string IntegratorScopedEventSearchJson(
    const SourceViewApplicationService::ClientViewAccess& access,
    const auth::Principal& principal,
    const std::unordered_map<std::string, std::string>& query) {
    const std::string search_query = OpsV300EventEvidenceSearchQueryValue(query, "q", "search");
    EventFeatureSearchApplicationQuery search;
    search.query = search_query;
    search.default_limit = 10;
    search.max_limit = 25;
    search.max_offset = 500;
    if (const auto it = query.find("limit"); it != query.end()) {
        search.requested_limit = it->second;
    }
    if (const auto it = query.find("offset"); it != query.end()) {
        search.requested_offset = it->second;
    }
    search.search_index_required = true;

    const auto search_resolution = ResolveEventFeatureSearchQueryForApplication(search);
    IntegratorScopedEventSearchSource source =
        LoadIntegratorScopedEventSearchSource(access, search_resolution.limit + search_resolution.offset);
    std::vector<EventFeatureSearchApplicationRecord> records;
    std::unordered_map<std::string, std::string> event_by_id;
    records.reserve(source.records_json.size());
    for (std::size_t index = 0; index < source.records_json.size(); ++index) {
        const std::string& event_json = source.records_json[index];
        EventFeatureSearchApplicationRecord event_record =
            OpsV300IndexEventRecordFromJson(event_json, index);
        const OpsEventReviewState review = DefaultOpsEventReviewState(event_record.event_id);
        event_by_id[event_record.event_id] = event_json;
        OpsV300ApplyIndexEvidenceManifestFromJson(event_json, &event_record);
        OpsV300ApplyIndexFeatureSetFromJson(event_json, review, &event_record);
        OpsV300ApplyIndexReviewStateFromReview(event_json, review, &event_record);
        records.push_back(std::move(event_record));
    }

    auto search_result = SearchEventFeaturesForApplication(records, search);
    auto hits = std::move(search_result.hits);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.integrator.scoped-event-search.v1\","
        << "\"status\":\"integrator-scoped-event-search\","
        << "\"route\":\"/client/api/views/{id}/events/search\","
        << "\"role\":\"" << JsonEscape(principal.role) << "\","
        << "\"integratorOnly\":true,"
        << "\"publishedViewScoped\":true,"
        << "\"scopeGate\":\"event:read\","
        << "\"scope\":\"event:read:" << JsonEscape(access.view.view_id) << "\","
        << "\"query\":\"" << JsonEscape(search_query) << "\","
        << "\"limit\":" << search_result.limit << ","
        << "\"offset\":" << search_result.offset << ","
        << "\"searchDslValid\":" << (search_result.search_dsl_valid ? "true" : "false") << ","
        << "\"rejectionReason\":\"" << JsonEscape(search_result.rejection_reason) << "\","
        << "\"featureSearchIndexBacked\":true,"
        << "\"indexedEntries\":" << search_result.indexed_entries << ","
        << "\"modelProviderDependency\":false,"
        << "\"runtimeProviderCallPerformed\":false,"
        << "\"vectorSearchPerformed\":false,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawEvidenceIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"featureProvenanceIncluded\":false,"
        << "\"internalEvidenceIncluded\":false,"
        << "\"encodedClipPathIncluded\":false,"
        << "\"ruleEditorIncluded\":false,"
        << "\"actionControlsIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"view\":";
    AppendClientViewIdentityJson(out, access);
    out << ",\"storage\":{"
        << "\"provided\":" << (source.provided ? "true" : "false") << ","
        << "\"storageEnabled\":" << (source.storage_enabled ? "true" : "false") << ","
        << "\"hasMore\":" << (source.has_more ? "true" : "false") << ","
        << "\"error\":\"" << JsonEscape(source.error) << "\""
        << "},\"hitCount\":" << hits.size()
        << ",\"results\":[";
    for (std::size_t i = 0; i < hits.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        const auto event_it = event_by_id.find(hits[i].event_id);
        out << IntegratorScopedEventSearchItemJson(
            access, hits[i], event_it == event_by_id.end() ? std::string() : event_it->second, i);
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33814 function
std::string OpsSimilarIncidentSafeValue(const std::string& value, const std::string& fallback) {
    const std::string trimmed = Trim(value);
    if (trimmed.empty() || OpsEventReviewNoteContainsSensitiveMaterial(trimmed) ||
        !IsIncidentMemoryValueReleaseSafe(trimmed)) {
        return fallback;
    }
    return trimmed;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33823 function
std::string OpsSimilarIncidentSourceId(const std::string& event_json) {
    for (const char* key : {"sourceId", "streamId", "channelId"}) {
        const std::string value = Trim(ParseStringField(event_json, key).value_or(""));
        if (!value.empty()) {
            return OpsSimilarIncidentSafeValue(value, "unknown-source");
        }
    }
    return "unknown-source";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33833 function
std::string OpsSimilarIncidentScenario(const std::string& event_json) {
    for (const char* key : {"scenarioType", "scenario", "eventType"}) {
        const std::string value = Trim(ParseStringField(event_json, key).value_or(""));
        if (!value.empty()) {
            return OpsSimilarIncidentSafeValue(value, "event");
        }
    }
    if (const auto metadata = ExtractObjectField(event_json, "metadata"); metadata.has_value()) {
        for (const char* key : {"scenarioType", "scenario", "eventType"}) {
            const std::string value = Trim(ParseStringField(*metadata, key).value_or(""));
            if (!value.empty()) {
                return OpsSimilarIncidentSafeValue(value, "event");
            }
        }
    }
    return "event";
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33862 function
OpsSimilarIncidentCandidate OpsSimilarIncidentCandidateFromEvent(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const std::size_t index) {
    OpsSimilarIncidentCandidate candidate;
    candidate.event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
    if (!OpsEventReviewEventIdAllowed(candidate.event_id)) {
        candidate.event_id = "event-" + std::to_string(index + 1);
    }
    candidate.incident_id = review.incident_id.empty()
                                ? "incident:" + candidate.event_id
                                : OpsSimilarIncidentSafeValue(
                                      review.incident_id, "incident:" + candidate.event_id);
    candidate.rule_id = OpsSimilarIncidentSafeValue(
        OpsIncidentMemoryEventRuleId(event_json), "unmapped-rule");
    candidate.scenario = OpsSimilarIncidentScenario(event_json);
    candidate.source_id = OpsSimilarIncidentSourceId(event_json);
    candidate.event_status = OpsSimilarIncidentSafeValue(
        Trim(ParseStringField(event_json, "status").value_or("recorded")), "recorded");
    candidate.incident_status = NormalizeOpsIncidentStatus(review.incident_status);
    candidate.action_target = OpsSimilarIncidentSafeValue(
        review.action_target.empty() ? "operator-triage" : review.action_target,
        "operator-triage");
    return candidate;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33888 function
int OpsSimilarIncidentScore(const OpsSimilarIncidentCandidate& base,
                            const OpsSimilarIncidentCandidate& related,
                            std::vector<std::string>* explanation_terms) {
    int score = 0;
    if (explanation_terms != nullptr) {
        explanation_terms->clear();
    }
    const auto add = [&](const char* term, int weight) {
        score += weight;
        if (explanation_terms != nullptr) {
            explanation_terms->push_back(term);
        }
    };
    if (base.rule_id == related.rule_id && base.rule_id != "unmapped-rule") {
        add("rule", 35);
    }
    if (base.scenario == related.scenario && base.scenario != "event") {
        add("scenario", 25);
    }
    if (base.source_id == related.source_id && base.source_id != "unknown-source") {
        add("source", 20);
    }
    if (base.event_status == related.event_status) {
        add("event-status", 8);
    }
    if (base.incident_status == related.incident_status) {
        add("incident-status", 8);
    }
    if (base.action_target == related.action_target &&
        base.action_target != "operator-triage") {
        add("action-target", 4);
    }
    return score;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33923 function
std::string OpsSimilarIncidentLookupViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<OpsSimilarIncidentCandidate> candidates;
    candidates.reserve(event_json_records.size());
    for (std::size_t index = 0; index < event_json_records.size(); ++index) {
        const std::string event_id =
            Trim(ParseStringField(event_json_records[index], "eventId").value_or(""));
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        candidates.push_back(
            OpsSimilarIncidentCandidateFromEvent(event_json_records[index], review, index));
    }

    constexpr std::size_t kMaxSimilarGroups = 8;
    constexpr std::size_t kMaxRelatedPerGroup = 4;
    std::vector<std::string> groups;
    for (std::size_t base_index = 0;
         base_index < candidates.size() && groups.size() < kMaxSimilarGroups;
         ++base_index) {
        const auto& base = candidates[base_index];
        struct Related {
            OpsSimilarIncidentCandidate candidate;
            int score{0};
            std::vector<std::string> terms;
        };
        std::vector<Related> related;
        for (std::size_t related_index = 0; related_index < candidates.size(); ++related_index) {
            if (base_index == related_index) {
                continue;
            }
            std::vector<std::string> terms;
            const int score = OpsSimilarIncidentScore(base, candidates[related_index], &terms);
            if (score < 35 || terms.empty()) {
                continue;
            }
            related.push_back({candidates[related_index], score, std::move(terms)});
        }
        std::sort(related.begin(), related.end(), [](const Related& lhs, const Related& rhs) {
            if (lhs.score != rhs.score) {
                return lhs.score > rhs.score;
            }
            return lhs.candidate.event_id < rhs.candidate.event_id;
        });
        if (related.size() > kMaxRelatedPerGroup) {
            related.resize(kMaxRelatedPerGroup);
        }
        if (related.empty()) {
            continue;
        }

        std::ostringstream group;
        group << "{"
              << "\"baseEventId\":\"" << JsonEscape(base.event_id) << "\","
              << "\"baseIncidentId\":\"" << JsonEscape(base.incident_id) << "\","
              << "\"baseSourceId\":\"" << JsonEscape(base.source_id) << "\","
              << "\"baseScenario\":\"" << JsonEscape(base.scenario) << "\","
              << "\"baseRuleId\":\"" << JsonEscape(base.rule_id) << "\","
              << "\"related\":[";
        for (std::size_t i = 0; i < related.size(); ++i) {
            if (i != 0) {
                group << ",";
            }
            group << "{"
                  << "\"eventId\":\"" << JsonEscape(related[i].candidate.event_id) << "\","
                  << "\"incidentId\":\"" << JsonEscape(related[i].candidate.incident_id) << "\","
                  << "\"sourceId\":\"" << JsonEscape(related[i].candidate.source_id) << "\","
                  << "\"scenario\":\"" << JsonEscape(related[i].candidate.scenario) << "\","
                  << "\"ruleId\":\"" << JsonEscape(related[i].candidate.rule_id) << "\","
                  << "\"eventStatus\":\"" << JsonEscape(related[i].candidate.event_status)
                  << "\","
                  << "\"incidentStatus\":\""
                  << JsonEscape(related[i].candidate.incident_status) << "\","
                  << "\"score\":" << related[i].score << ","
                  << "\"explanationTerms\":"
                  << OpsIncidentMemoryStringArrayJson(related[i].terms)
                  << "}";
        }
        group << "]}";
        groups.push_back(group.str());
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.similar-incident-lookup.v1\","
        << "\"status\":\"ops-similar-incident-lookup\","
        << "\"groupCount\":" << groups.size() << ","
        << "\"candidateCount\":" << candidates.size() << ","
        << "\"deterministicScoring\":true,"
        << "\"modelProviderDependency\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"scoreWeights\":{"
        << "\"rule\":35,"
        << "\"scenario\":25,"
        << "\"source\":20,"
        << "\"event-status\":8,"
        << "\"incident-status\":8,"
        << "\"action-target\":4"
        << "},"
        << "\"groups\":[";
    for (std::size_t i = 0; i < groups.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << groups[i];
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34035 function
std::string OpsIncidentTimelineGraphSourceId(const std::string& event_json) {
    for (const char* key : {"sourceId", "streamId", "channelId"}) {
        const std::string value = Trim(ParseStringField(event_json, key).value_or(""));
        if (!value.empty() && !OpsEventReviewNoteContainsSensitiveMaterial(value)) {
            return value;
        }
    }
    return "unknown-source";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34045 function
std::string OpsIncidentTimelineGraphEventStatus(const std::string& event_json) {
    const std::string status = Trim(ParseStringField(event_json, "status").value_or(""));
    return status.empty() ? "recorded" : status;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34050 function
std::int64_t OpsIncidentTimelineGraphEventTimeMs(const std::string& event_json) {
    for (const char* key : {"timestampMs", "createdAtMs", "receivedAtMs"}) {
        if (const auto parsed = ParseInt64Field(event_json, key); parsed.has_value()) {
            return *parsed;
        }
    }
    return 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34059 function
std::string OpsIncidentTimelineGraphNodeJson(const std::string& id,
                                             const std::string& stage,
                                             const std::string& title,
                                             const std::string& detail,
                                             const std::string& status,
                                             std::int64_t time_ms) {
    std::ostringstream out;
    out << "{"
        << "\"id\":\"" << JsonEscape(id) << "\","
        << "\"stage\":\"" << JsonEscape(stage) << "\","
        << "\"title\":\"" << JsonEscape(title) << "\","
        << "\"detail\":\"" << JsonEscape(detail) << "\","
        << "\"status\":\"" << JsonEscape(status) << "\","
        << "\"timeMs\":" << time_ms
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34077 function
std::string OpsIncidentTimelineGraphEdgeJson(const std::string& from,
                                             const std::string& to,
                                             const std::string& label) {
    std::ostringstream out;
    out << "{"
        << "\"from\":\"" << JsonEscape(from) << "\","
        << "\"to\":\"" << JsonEscape(to) << "\","
        << "\"label\":\"" << JsonEscape(label) << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34089 function
std::string OpsIncidentTimelineGraphAlertAttempt(
    const std::vector<std::string>& attempts,
    const std::string& event_id,
    const std::string& source_id) {
    for (const std::string& attempt : attempts) {
        const std::string attempt_event_id = Trim(ParseStringField(attempt, "eventId").value_or(""));
        const std::string attempt_source_id = Trim(ParseStringField(attempt, "sourceId").value_or(""));
        if ((!event_id.empty() && attempt_event_id == event_id) ||
            (!source_id.empty() && attempt_source_id == source_id)) {
            return attempt;
        }
    }
    return "";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34104 function
std::string OpsIncidentTimelineGraphViewJson(
    const WebRtcHttpRuntimeConfig& config,
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    const std::vector<std::string> alert_attempts = LoadRecentOpsAlertDeliveryAttempts(config, 80);
    std::vector<std::string> nodes;
    std::vector<std::string> edges;
    std::size_t graph_count = 0;
    constexpr std::size_t kMaxTimelineGraphs = 10;

    for (std::size_t index = 0; index < event_json_records.size() &&
                                graph_count < kMaxTimelineGraphs; ++index) {
        const std::string& event_json = event_json_records[index];
        std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            event_id = "event-" + std::to_string(index + 1);
        }
        const std::string event_type =
            Trim(ParseStringField(event_json, "eventType").value_or("event"));
        const std::string source_id = OpsIncidentTimelineGraphSourceId(event_json);
        const std::string event_status = OpsIncidentTimelineGraphEventStatus(event_json);
        const std::int64_t event_time_ms = OpsIncidentTimelineGraphEventTimeMs(event_json);
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        const std::string incident_id = review.incident_id.empty() ? "incident:" + event_id
                                                                   : review.incident_id;
        const std::string alert_attempt =
            OpsIncidentTimelineGraphAlertAttempt(alert_attempts, event_id, source_id);
        const std::string graph_prefix = "incident-timeline:" + event_id + ":";
        const std::string source_node = graph_prefix + "source-state";
        const std::string event_node = graph_prefix + "event-record";
        const std::string action_node = graph_prefix + "operator-action";
        const std::string alert_node = graph_prefix + "alert-dry-run";
        const std::string close_node = graph_prefix + "close-state";

        nodes.push_back(OpsIncidentTimelineGraphNodeJson(
            source_node,
            "source-state",
            "source state " + source_id,
            "source state from EventRecord scope; source locator and raw diagnostics are not exposed",
            source_id == "unknown-source" ? "unknown" : "scoped",
            event_time_ms));
        nodes.push_back(OpsIncidentTimelineGraphNodeJson(
            event_node,
            "event-record",
            "event " + event_type,
            "EventRecord " + event_id + " status " + event_status,
            event_status,
            event_time_ms));
        nodes.push_back(OpsIncidentTimelineGraphNodeJson(
            action_node,
            "operator-action",
            "operator action " + (review.action_target.empty() ? "operator-triage"
                                                                 : review.action_target),
            "review " + review.review_status + " classification " + review.classification +
                " audit event-review-update/incident-action-update",
            review.review_status,
            review.updated_at_ms));
        if (!alert_attempt.empty()) {
            const std::string alert_status =
                Trim(ParseStringField(alert_attempt, "status").value_or("attempted"));
            const std::string delivery_id =
                Trim(ParseStringField(alert_attempt, "deliveryId").value_or("delivery"));
            const std::string kind = Trim(ParseStringField(alert_attempt, "kind").value_or("alert"));
            const bool dry_run = ParseBoolField(alert_attempt, "dryRun").value_or(false);
            const bool external_delivery =
                ParseBoolField(alert_attempt, "externalDeliveryPerformed").value_or(false);
            nodes.push_back(OpsIncidentTimelineGraphNodeJson(
                alert_node,
                "alert-dry-run",
                "alert " + alert_status,
                delivery_id + " " + kind + (dry_run ? " dry-run" : " attempt") +
                    (external_delivery ? " external delivery performed" : " external delivery not performed"),
                alert_status,
                ParseInt64Field(alert_attempt, "attemptedAtMs").value_or(0)));
        } else {
            nodes.push_back(OpsIncidentTimelineGraphNodeJson(
                alert_node,
                "alert-dry-run",
                "alert dry-run pending",
                "no dry-run attempt yet; alert delivery remains separate from Event POST payload",
                "pending",
                0));
        }
        nodes.push_back(OpsIncidentTimelineGraphNodeJson(
            close_node,
            "close-state",
            "incident " + review.incident_status,
            incident_id + " close state " + review.incident_status +
                " eventPostPayloadChanged false",
            review.incident_status,
            review.updated_at_ms));

        edges.push_back(OpsIncidentTimelineGraphEdgeJson(
            source_node, event_node, "source-state->event-record"));
        edges.push_back(OpsIncidentTimelineGraphEdgeJson(
            event_node, action_node, "event-record->operator-action"));
        edges.push_back(OpsIncidentTimelineGraphEdgeJson(
            action_node, alert_node, "operator-action->alert-dry-run"));
        edges.push_back(OpsIncidentTimelineGraphEdgeJson(
            alert_node, close_node, "alert-dry-run->close-state"));
        ++graph_count;
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.incident-timeline-graph.v1\","
        << "\"status\":\"ops-incident-timeline-graph\","
        << "\"graphCount\":" << graph_count << ","
        << "\"nodeCount\":" << nodes.size() << ","
        << "\"edgeCount\":" << edges.size() << ","
        << "\"eventPostPayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"auditLinkage\":{"
        << "\"eventReviewAction\":\"event-review-update\","
        << "\"incidentAction\":\"incident-action-update\","
        << "\"alertDryRunAction\":\"alert-delivery-dry-run\","
        << "\"separateFromEventPostPayload\":true"
        << "},"
        << "\"nodes\":[";
    for (std::size_t i = 0; i < nodes.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << nodes[i];
    }
    out << "],\"edges\":[";
    for (std::size_t i = 0; i < edges.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << edges[i];
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34242 function
std::string OpsExplainableIncidentBriefValueOrFallback(const std::string& value,
                                                       const std::string& fallback) {
    const std::string trimmed = Trim(value);
    if (trimmed.empty() || OpsEventReviewNoteContainsSensitiveMaterial(trimmed)) {
        return fallback;
    }
    return trimmed;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34251 function
std::string OpsExplainableIncidentBriefObjectSlot(const std::string& event_json) {
    for (const char* key : {"objectClass", "class", "label", "category"}) {
        const std::string value = Trim(ParseStringField(event_json, key).value_or(""));
        if (!value.empty() && !OpsEventReviewNoteContainsSensitiveMaterial(value)) {
            return value;
        }
    }
    if (const auto metadata = ExtractObjectField(event_json, "metadata"); metadata.has_value()) {
        for (const char* key : {"objectClass", "class", "label", "category"}) {
            const std::string value = Trim(ParseStringField(*metadata, key).value_or(""));
            if (!value.empty() && !OpsEventReviewNoteContainsSensitiveMaterial(value)) {
                return value;
            }
        }
    }
    return "tracked object";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34269 function
std::string OpsExplainableIncidentBriefSlotJson(const std::string& key,
                                                const std::string& label,
                                                const std::string& value,
                                                const std::string& evidence) {
    std::ostringstream out;
    out << "{"
        << "\"key\":\"" << JsonEscape(key) << "\","
        << "\"label\":\"" << JsonEscape(label) << "\","
        << "\"value\":\"" << JsonEscape(value) << "\","
        << "\"evidence\":\"" << JsonEscape(evidence) << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34283 function
std::string OpsExplainableIncidentBriefViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews) {
    std::vector<std::string> briefs;
    constexpr std::size_t kMaxIncidentBriefs = 10;
    for (std::size_t index = 0; index < event_json_records.size() &&
                                briefs.size() < kMaxIncidentBriefs; ++index) {
        const std::string& event_json = event_json_records[index];
        std::string event_id = Trim(ParseStringField(event_json, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            event_id = "event-" + std::to_string(index + 1);
        }
        const std::string event_type = OpsExplainableIncidentBriefValueOrFallback(
            ParseStringField(event_json, "eventType").value_or(""), "event");
        const std::string status = OpsIncidentTimelineGraphEventStatus(event_json);
        const std::string source_id = OpsIncidentTimelineGraphSourceId(event_json);
        const std::string rule_id = OpsExplainableIncidentBriefValueOrFallback(
            OpsIncidentMemoryEventRuleId(event_json), "unmapped-rule");
        const auto review_it = reviews.find(event_id);
        const OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        const std::string incident_id = review.incident_id.empty() ? "incident:" + event_id
                                                                   : review.incident_id;
        const std::string action_value = OpsExplainableIncidentBriefValueOrFallback(
            review.action_target.empty() ? event_type : review.action_target, "operator-triage");
        const std::string object_value = OpsExplainableIncidentBriefObjectSlot(event_json);
        const std::string context_value = "source " + source_id + " rule " + rule_id +
                                          " status " + status;
        const std::string environment_value =
            "local EventRecord/review state only; VLM enrichment default-off";

        std::ostringstream out;
        out << "{"
            << "\"eventId\":\"" << JsonEscape(event_id) << "\","
            << "\"incidentId\":\"" << JsonEscape(incident_id) << "\","
            << "\"title\":\"" << JsonEscape(event_type + " brief") << "\","
            << "\"reviewStatus\":\"" << JsonEscape(review.review_status) << "\","
            << "\"incidentStatus\":\"" << JsonEscape(review.incident_status) << "\","
            << "\"actionSlot\":" << OpsExplainableIncidentBriefSlotJson(
                   "action", "Action", action_value, "review action target or event type")
            << ",\"objectSlot\":" << OpsExplainableIncidentBriefSlotJson(
                   "object", "Object", object_value, "redacted EventRecord object/category")
            << ",\"contextSlot\":" << OpsExplainableIncidentBriefSlotJson(
                   "context", "Context", context_value, "source/rule/status identifiers only")
            << ",\"environmentSlot\":" << OpsExplainableIncidentBriefSlotJson(
                   "environment", "Environment", environment_value, "provider-free local brief")
            << "}";
        briefs.push_back(out.str());
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.explainable-incident-brief.v1\","
        << "\"status\":\"ops-explainable-incident-brief\","
        << "\"briefCount\":" << briefs.size() << ","
        << "\"defaultVlmEnrichmentEnabled\":false,"
        << "\"modelProviderDependency\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"providerEnrichment\":{\"enabledByDefault\":false,"
        << "\"requiresOperatorOptIn\":true,"
        << "\"defaultState\":\"off\"},"
        << "\"briefs\":[";
    for (std::size_t i = 0; i < briefs.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << briefs[i];
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34356 function
bool OpsEventReviewInboxJson(const WebRtcHttpRuntimeConfig& config,
                             const OpsSourceHealthSnapshot& source_health_snapshot,
                             const std::unordered_map<std::string, std::string>& query,
                             std::string* body,
                             std::string* error_message) {
    if (body == nullptr) {
        if (error_message != nullptr) {
            *error_message = "response body is required";
        }
        return false;
    }
    EventStorageApplicationQueryOptions options;
    if (!BuildEventRecordQueryOptions(query, &options, error_message)) {
        return false;
    }
    if (query.find("limit") == query.end()) {
        options.limit = 25;
    }
    EventStorageApplicationQueryResult event_result;
    if (!QueryEventRecordsForApplication(options, &event_result, error_message)) {
        return false;
    }
    std::unordered_map<std::string, OpsEventReviewState> reviews;
    if (!LoadOpsEventReviewStates(config, &reviews, error_message)) {
        return false;
    }

    const std::string review_status_filter =
        query.count("reviewStatus") != 0 ? Trim(query.at("reviewStatus")) : std::string();
    const std::string classification_filter =
        query.count("classification") != 0 ? Trim(query.at("classification")) : std::string();
    const std::string incident_status_filter =
        query.count("incidentStatus") != 0 ? Trim(query.at("incidentStatus")) : std::string();
    const std::string requested_event_id =
        query.count("eventId") != 0 ? Trim(query.at("eventId")) : std::string();
    const std::string rule_id_filter =
        query.count("ruleId") != 0 ? Trim(query.at("ruleId")) : std::string();
    const std::string source_id_filter =
        query.count("sourceId") != 0 ? Trim(query.at("sourceId")) : std::string();

    std::vector<std::string> items;
    std::set<std::string> included_event_ids;
    for (const std::string& raw_event : event_result.records_json) {
        const std::string event_id = Trim(ParseStringField(raw_event, "eventId").value_or(""));
        if (!OpsEventReviewEventIdAllowed(event_id)) {
            continue;
        }
        auto review_it = reviews.find(event_id);
        OpsEventReviewState review =
            review_it == reviews.end() ? DefaultOpsEventReviewState(event_id) : review_it->second;
        if (!OpsEventReviewMatchesFilters(
                review, review_status_filter, classification_filter, incident_status_filter)) {
            continue;
        }
        if (!OpsIncidentMemoryRecordMatchesFilters(
                raw_event, review, rule_id_filter, source_id_filter, incident_status_filter)) {
            continue;
        }
        included_event_ids.insert(event_id);
        items.push_back(OpsEventReviewInboxItemJson(raw_event, review));
    }
    if (OpsEventReviewEventIdAllowed(requested_event_id) &&
        included_event_ids.count(requested_event_id) == 0) {
        const auto review_it = reviews.find(requested_event_id);
        if (review_it != reviews.end() &&
            OpsEventReviewMatchesFilters(review_it->second,
                                         review_status_filter,
                                         classification_filter,
                                         incident_status_filter)) {
            items.push_back(OpsEventReviewInboxItemJson("", review_it->second));
        }
    }

    std::ostringstream out;
    out << "{"
        << "\"status\":\"ops-event-review-inbox\","
        << "\"schema\":\"media-server.ops.event-review-inbox.v1\","
        << "\"storage\":{"
        << "\"persistent\":true,"
        << "\"separateFromEventRecords\":true,"
        << "\"separateFromEventPostPayload\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"vlmReviewActionSchema\":\"media-server.ops.vlm-review-action-state.v1\","
        << "\"vlmReviewActionPersistent\":true,"
        << "\"incidentActionSchema\":\"media-server.ops.incident-action-state.v1\","
        << "\"incidentActionPersistent\":true,"
        << "\"resolutionStateSchema\":\"media-server.ops.resolution-state.v1\","
        << "\"resolutionStatePersistent\":true,"
        << "\"auditArea\":\"events\","
        << "\"auditAction\":\"event-review-update\","
        << "\"incidentAuditAction\":\"incident-action-update\","
        << "\"resolutionAuditAction\":\"resolution-state-update\""
        << "},"
        << "\"catalog\":" << OpsEventReviewCatalogJson() << ","
        << "\"incidentTriageBoard\":" << OpsIncidentTriageBoardViewJson(event_result.records_json, reviews)
        << ","
        << "\"incidentDecisionScorecard\":"
        << OpsIncidentDecisionScorecardViewJson(
               event_result.records_json,
               reviews,
               source_health_snapshot,
               OpsIncidentMemoryQueryValue(query, "q"))
        << ","
        << "\"operationalActionPack\":"
        << OpsOperationalActionPackViewJson(event_result.records_json, reviews)
        << ","
        << "\"incidentActionReadinessQueue\":"
        << OpsIncidentActionReadinessQueueViewJson(event_result.records_json, reviews)
        << ","
        << "\"evidenceIntakeFieldReadiness\":"
        << OpsEvidenceIntakeFieldReadinessViewJson(event_result.records_json, reviews)
        << ","
        << "\"runtimeEvidenceWindow\":"
        << OpsRuntimeEvidenceWindowViewJson(event_result.records_json, reviews)
        << ","
        << "\"ruleWhatIfPreview\":"
        << OpsRuleWhatIfPreviewViewJson(event_result.records_json, reviews)
        << ","
        << "\"approvalGatedRuleDraftReadiness\":"
        << OpsApprovalGatedRuleDraftReadinessViewJson(event_result.records_json, reviews)
        << ","
        << "\"operatorOutcomeMemory\":"
        << OpsOperatorOutcomeMemoryViewJson(event_result.records_json, reviews)
        << ","
        << "\"eventEvidenceSearch\":"
        << OpsV300EventEvidenceSearchUiJson(event_result.records_json, reviews, query)
        << ","
        << "\"unifiedResolutionWorkspace\":"
        << OpsV320UnifiedOpsEventsWorkspaceJson(
               event_result.records_json,
               reviews,
               config,
               source_health_snapshot,
               query)
        << ","
        << "\"replayTimeline\":"
        << OpsV310ReplayTimelineUiJson(event_result.records_json, reviews)
        << ","
        << "\"operatorFeatureCorrection\":"
        << OpsV310OperatorFeatureCorrectionViewJson(event_result.records_json, reviews)
        << ","
        << "\"memorySearch\":" << OpsIncidentMemorySearchViewJson(event_result.records_json, reviews, query)
        << ","
        << "\"similarIncidents\":" << OpsSimilarIncidentLookupViewJson(event_result.records_json, reviews)
        << ","
        << "\"timelineGraph\":" << OpsIncidentTimelineGraphViewJson(config, event_result.records_json, reviews)
        << ","
        << "\"incidentBrief\":" << OpsExplainableIncidentBriefViewJson(event_result.records_json, reviews)
        << ","
        << "\"records\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << items[i];
    }
    out << "],"
        << "\"recordCount\":" << items.size() << ","
        << "\"eventRecordOffset\":" << event_result.offset << ","
        << "\"eventRecordLimit\":" << event_result.limit << ","
        << "\"eventRecordHasMore\":" << (event_result.has_more ? "true" : "false")
        << "}";
    *body = out.str();
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34521 function
std::string AnalysisEventRecordCompactionJson(
    const EventStorageApplicationCompactionResult& result) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-compaction.v1\","
        << "\"compactedPath\":\"" << JsonEscape(result.compacted_path) << "\","
        << "\"activeFileExists\":" << (result.active_file_exists ? "true" : "false") << ","
        << "\"activeRecordsScanned\":" << result.active_records_scanned << ","
        << "\"archiveFilesScanned\":" << result.archive_files_scanned << ","
        << "\"archiveRecordsScanned\":" << result.archive_records_scanned << ","
        << "\"retainedRecords\":" << result.retained_records << ","
        << "\"skippedCorruptLines\":" << result.skipped_corrupt_lines << ","
        << "\"partialLineCount\":" << result.partial_line_count << ","
        << "\"storage\":{"
        << "\"enabled\":" << (result.storage.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(result.storage.path) << "\","
        << "\"activePath\":\"" << JsonEscape(result.storage.active_path.empty()
                                                  ? result.storage.path
                                                  : result.storage.active_path)
        << "\","
        << "\"archivedFileCount\":" << result.storage.archived_file_count << ","
        << "\"totalArchiveBytes\":" << result.storage.total_archive_bytes
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34548 function
std::string AnalysisEventRecordCompactedFilesJson(
    const EventStorageApplicationCompactedFileListResult& result) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-compacted-list.v1\","
        << "\"files\":[";
    for (std::size_t i = 0; i < result.files.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        const auto& file = result.files[i];
        out << "{"
            << "\"fileName\":\"" << JsonEscape(file.file_name) << "\","
            << "\"path\":\"" << JsonEscape(file.path) << "\","
            << "\"sizeBytes\":" << file.size_bytes << ","
            << "\"modifiedTimeMs\":" << file.modified_time_ms
            << "}";
    }
    out << "],"
        << "\"storage\":{"
        << "\"enabled\":" << (result.storage.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(result.storage.path) << "\","
        << "\"activePath\":\"" << JsonEscape(result.storage.active_path.empty()
                                                  ? result.storage.path
                                                  : result.storage.active_path)
        << "\"}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34578 function
std::string AnalysisEventRecordCompactedFileDeletedJson(
    const EventStorageApplicationCompactedFileInfo& file) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-compacted-delete.v1\","
        << "\"deleted\":true,"
        << "\"fileName\":\"" << JsonEscape(file.file_name) << "\","
        << "\"path\":\"" << JsonEscape(file.path) << "\","
        << "\"sizeBytes\":" << file.size_bytes << ","
        << "\"modifiedTimeMs\":" << file.modified_time_ms
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34592 function
std::string AnalysisEventRecordCompactedFileCleanupJson(
    const EventStorageApplicationCompactedFileCleanupResult& result) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.va.event-record-compacted-cleanup.v1\","
        << "\"deletedCount\":" << result.deleted_count << ","
        << "\"deletedBytes\":" << result.deleted_bytes << ","
        << "\"keptCount\":" << result.kept_count << ","
        << "\"storage\":{"
        << "\"enabled\":" << (result.storage.enabled ? "true" : "false") << ","
        << "\"path\":\"" << JsonEscape(result.storage.path) << "\","
        << "\"activePath\":\"" << JsonEscape(result.storage.active_path.empty()
                                                  ? result.storage.path
                                                  : result.storage.active_path)
        << "\"}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34611 function
// Lab 리포트 뷰어가 노출할 수 있는 검증 산출물 확장자만 허용한다.
bool IsLabReportExtension(const std::filesystem::path& path) {
    std::string ext = path.extension().string();
    std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return ext == ".json" || ext == ".ndjson" || ext == ".md" || ext == ".html" || ext == ".log";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34620 function
// /tmp 아래 media_server_* 텍스트 산출물만 읽도록 제한해 임의 파일 노출을 막는다.
bool IsSafeLabReportPath(const std::filesystem::path& raw_path, std::filesystem::path* resolved_path) {
    std::error_code ec;
    const auto canonical = std::filesystem::weakly_canonical(raw_path, ec);
    if (ec || canonical.empty()) {
        return false;
    }
    const std::string full_path = canonical.string();
    if (full_path.rfind("/tmp/", 0) != 0 && full_path.rfind("/private/tmp/", 0) != 0) {
        return false;
    }
    if (canonical.filename().string().rfind("media_server_", 0) != 0) {
        return false;
    }
    if (!IsLabReportExtension(canonical) || !std::filesystem::is_regular_file(canonical, ec) || ec) {
        return false;
    }
    if (resolved_path != nullptr) {
        *resolved_path = canonical;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34643 function
bool PathStartsWith(const std::filesystem::path& path, const std::filesystem::path& base) {
    const std::string path_string = path.string();
    const std::string base_string = base.string();
    if (base_string.empty()) {
        return false;
    }
    if (path_string == base_string) {
        return true;
    }
    return path_string.size() > base_string.size() &&
           path_string.rfind(base_string + "/", 0) == 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34656 function
std::string EventEvidenceContentType(const std::filesystem::path& path) {
    const std::string ext = LowerAscii(path.extension().string());
    if (ext == ".jpg" || ext == ".jpeg") {
        return "image/jpeg";
    }
    if (ext == ".ppm") {
        return "image/x-portable-pixmap";
    }
    if (ext == ".pgm") {
        return "image/x-portable-graymap";
    }
    if (ext == ".json") {
        return "application/json; charset=utf-8";
    }
    return "";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34673 function
bool IsSafeEventEvidencePath(const std::filesystem::path& raw_path,
                             std::filesystem::path* resolved_path,
                             std::string* content_type) {
    std::error_code ec;
    const auto resolved = std::filesystem::weakly_canonical(raw_path, ec);
    if (ec || resolved.empty() || !std::filesystem::is_regular_file(resolved, ec) || ec) {
        return false;
    }
    const std::string detected_content_type = EventEvidenceContentType(resolved);
    if (detected_content_type.empty()) {
        return false;
    }
    const auto snapshot_dir =
        std::filesystem::weakly_canonical(std::filesystem::path(GetWebRtcHttpRuntimeConfig().analysis_event_snapshot_dir), ec);
    ec.clear();
    const auto clip_dir =
        std::filesystem::weakly_canonical(std::filesystem::path(GetWebRtcHttpRuntimeConfig().analysis_event_clip_dir), ec);
    ec.clear();
    if ((snapshot_dir.empty() || !PathStartsWith(resolved, snapshot_dir)) &&
        (clip_dir.empty() || !PathStartsWith(resolved, clip_dir))) {
        return false;
    }
    if (resolved_path != nullptr) {
        *resolved_path = resolved;
    }
    if (content_type != nullptr) {
        *content_type = detected_content_type;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34704 function
void AppendZipLe16(std::string* out, std::uint16_t value) {
    out->push_back(static_cast<char>(value & 0xff));
    out->push_back(static_cast<char>((value >> 8) & 0xff));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34709 function
void AppendZipLe32(std::string* out, std::uint32_t value) {
    out->push_back(static_cast<char>(value & 0xff));
    out->push_back(static_cast<char>((value >> 8) & 0xff));
    out->push_back(static_cast<char>((value >> 16) & 0xff));
    out->push_back(static_cast<char>((value >> 24) & 0xff));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34716 function
std::uint32_t ZipCrc32(const std::string& data) {
    std::uint32_t crc = 0xffffffffu;
    for (const unsigned char byte : data) {
        crc ^= byte;
        for (int bit = 0; bit < 8; ++bit) {
            crc = (crc >> 1) ^ (0xedb88320u & (0u - (crc & 1u)));
        }
    }
    return crc ^ 0xffffffffu;
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34734 function
bool AppendZipEntry(std::string* zip,
                    std::vector<ZipCentralDirectoryEntry>* entries,
                    const std::string& name,
                    const std::string& data,
                    std::string* error_message) {
    if (zip == nullptr || entries == nullptr || name.empty() || name.find("..") != std::string::npos ||
        name.front() == '/') {
        if (error_message != nullptr) {
            *error_message = "invalid zip entry name";
        }
        return false;
    }
    if (data.size() > std::numeric_limits<std::uint32_t>::max() ||
        zip->size() > std::numeric_limits<std::uint32_t>::max() ||
        name.size() > std::numeric_limits<std::uint16_t>::max()) {
        if (error_message != nullptr) {
            *error_message = "zip entry is too large";
        }
        return false;
    }
    const std::uint32_t local_offset = static_cast<std::uint32_t>(zip->size());
    const std::uint32_t size = static_cast<std::uint32_t>(data.size());
    const std::uint32_t crc = ZipCrc32(data);
    AppendZipLe32(zip, 0x04034b50u);
    AppendZipLe16(zip, 20);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, 0);
    AppendZipLe32(zip, crc);
    AppendZipLe32(zip, size);
    AppendZipLe32(zip, size);
    AppendZipLe16(zip, static_cast<std::uint16_t>(name.size()));
    AppendZipLe16(zip, 0);
    zip->append(name);
    zip->append(data);
    entries->push_back(ZipCentralDirectoryEntry{name, crc, size, local_offset});
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34774 function
bool ReadBinaryFile(const std::filesystem::path& path,
                    std::string* body,
                    std::string* error_message) {
    if (body == nullptr) {
        return false;
    }
    std::error_code ec;
    const auto size = std::filesystem::file_size(path, ec);
    constexpr std::uintmax_t kMaxEvidenceBundleFileBytes = 64ull * 1024ull * 1024ull;
    if (ec || size > kMaxEvidenceBundleFileBytes) {
        if (error_message != nullptr) {
            *error_message = ec ? "failed to stat evidence file" : "evidence file is too large";
        }
        return false;
    }
    std::ifstream input(path, std::ios::in | std::ios::binary);
    if (!input.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open evidence file";
        }
        return false;
    }
    std::ostringstream buffer;
    buffer << input.rdbuf();
    *body = buffer.str();
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34802 function
bool AppendEvidenceFileToZip(std::string* zip,
                             std::vector<ZipCentralDirectoryEntry>* entries,
                             const std::filesystem::path& resolved,
                             const std::string& entry_name,
                             std::string* error_message) {
    std::string body;
    if (!ReadBinaryFile(resolved, &body, error_message)) {
        return false;
    }
    return AppendZipEntry(zip, entries, entry_name, body, error_message);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34814 function
bool FinalizeZip(std::string* zip,
                 const std::vector<ZipCentralDirectoryEntry>& entries,
                 std::string* error_message) {
    if (zip == nullptr || entries.size() > std::numeric_limits<std::uint16_t>::max()) {
        if (error_message != nullptr) {
            *error_message = "too many zip entries";
        }
        return false;
    }
    if (zip->size() > std::numeric_limits<std::uint32_t>::max()) {
        if (error_message != nullptr) {
            *error_message = "zip archive is too large";
        }
        return false;
    }
    const std::uint32_t central_offset = static_cast<std::uint32_t>(zip->size());
    for (const auto& entry : entries) {
        if (entry.name.size() > std::numeric_limits<std::uint16_t>::max()) {
            if (error_message != nullptr) {
                *error_message = "zip entry name is too long";
            }
            return false;
        }
        AppendZipLe32(zip, 0x02014b50u);
        AppendZipLe16(zip, 20);
        AppendZipLe16(zip, 20);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe32(zip, entry.crc);
        AppendZipLe32(zip, entry.size);
        AppendZipLe32(zip, entry.size);
        AppendZipLe16(zip, static_cast<std::uint16_t>(entry.name.size()));
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe16(zip, 0);
        AppendZipLe32(zip, 0);
        AppendZipLe32(zip, entry.local_offset);
        zip->append(entry.name);
    }
    if (zip->size() > std::numeric_limits<std::uint32_t>::max()) {
        if (error_message != nullptr) {
            *error_message = "zip archive is too large";
        }
        return false;
    }
    const std::uint32_t central_size = static_cast<std::uint32_t>(zip->size() - central_offset);
    AppendZipLe32(zip, 0x06054b50u);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, 0);
    AppendZipLe16(zip, static_cast<std::uint16_t>(entries.size()));
    AppendZipLe16(zip, static_cast<std::uint16_t>(entries.size()));
    AppendZipLe32(zip, central_size);
    AppendZipLe32(zip, central_offset);
    AppendZipLe16(zip, 0);
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34874 function
bool AddOptionalEvidencePath(const std::unordered_map<std::string, std::string>& query,
                             const std::string& key,
                             std::filesystem::path* resolved,
                             std::string* error_message) {
    const auto it = query.find(key);
    if (it == query.end() || Trim(it->second).empty()) {
        return true;
    }
    std::string content_type;
    if (!IsSafeEventEvidencePath(std::filesystem::path(it->second), resolved, &content_type)) {
        if (error_message != nullptr) {
            *error_message = "invalid event evidence path: " + key;
        }
        return false;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34892 function
std::string EvidenceBundleEntryName(const std::filesystem::path& path, const std::string& prefix) {
    std::string file_name = path.filename().string();
    if (file_name.empty()) {
        file_name = "evidence.bin";
    }
    return prefix + "/" + file_name;
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34902 function
bool EvidenceBundleReleaseSafeRequested(const std::unordered_map<std::string, std::string>& query) {
    const std::string value = LowerAscii(Trim(query.find("releaseSafe") == query.end() ? "" : query.at("releaseSafe")));
    return value == "1" || value == "true" || value == "yes";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34907 function
bool ParseEvidenceBundleExpiresAtMs(const std::unordered_map<std::string, std::string>& query,
                                    std::int64_t now_ms,
                                    std::int64_t* expires_at_ms,
                                    std::string* error_message) {
    if (expires_at_ms == nullptr) {
        return false;
    }
    *expires_at_ms = now_ms + kEvidenceBundleMaxAgeMs;
    if (const auto it = query.find("expiresAtMs"); it != query.end() && !Trim(it->second).empty()) {
        if (!ParseStrictInt64(Trim(it->second), expires_at_ms)) {
            if (error_message != nullptr) {
                *error_message = "expiresAtMs must be an integer unix ms";
            }
            return false;
        }
        if (*expires_at_ms < now_ms) {
            if (error_message != nullptr) {
                *error_message = "evidence bundle link has expired";
            }
            return false;
        }
        if (*expires_at_ms - now_ms > kEvidenceBundleMaxAgeMs) {
            *expires_at_ms = now_ms + kEvidenceBundleMaxAgeMs;
        }
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34935 function
std::string EvidenceBundleTokenSecret() {
    const char* raw = std::getenv("MEDIA_SERVER_EVIDENCE_BUNDLE_TOKEN_SECRET");
    if (raw != nullptr && !std::string(raw).empty()) {
        return raw;
    }
    return "media-server-local-evidence-bundle-token";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34943 function
std::uint64_t EvidenceBundleFnv1a64(const std::string& value) {
    std::uint64_t hash = 1469598103934665603ull;
    for (const unsigned char ch : value) {
        hash ^= static_cast<std::uint64_t>(ch);
        hash *= 1099511628211ull;
    }
    return hash;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34952 function
std::string EvidenceBundleTokenPayload(const std::string& event_id,
                                       const std::filesystem::path& snapshot_path,
                                       const std::filesystem::path& clip_path,
                                       std::int64_t expires_at_ms,
                                       bool release_safe) {
    std::ostringstream payload;
    payload << "eventId=" << event_id << "\n"
            << "snapshotPath=" << snapshot_path.string() << "\n"
            << "clipPath=" << clip_path.string() << "\n"
            << "expiresAtMs=" << expires_at_ms << "\n"
            << "releaseSafe=" << (release_safe ? "1" : "0");
    return payload.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34966 function
std::string EvidenceBundleTokenFor(const std::string& event_id,
                                   const std::filesystem::path& snapshot_path,
                                   const std::filesystem::path& clip_path,
                                   std::int64_t expires_at_ms,
                                   bool release_safe) {
    std::ostringstream out;
    out << std::hex << std::setw(16) << std::setfill('0')
        << EvidenceBundleFnv1a64(EvidenceBundleTokenPayload(event_id, snapshot_path, clip_path, expires_at_ms, release_safe) +
                                 "\nsecret=" + EvidenceBundleTokenSecret());
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34978 function
bool ExtractEvidenceBundleRequest(const std::unordered_map<std::string, std::string>& query,
                                  std::int64_t now_ms,
                                  std::string* event_id,
                                  std::filesystem::path* snapshot_path,
                                  std::filesystem::path* clip_path,
                                  std::int64_t* expires_at_ms,
                                  std::string* error_message) {
    if (event_id == nullptr || snapshot_path == nullptr || clip_path == nullptr ||
        expires_at_ms == nullptr) {
        return false;
    }
    if (!ParseEvidenceBundleExpiresAtMs(query, now_ms, expires_at_ms, error_message)) {
        return false;
    }
    *event_id = Trim(query.find("eventId") == query.end() ? "" : query.at("eventId"));
    if (!AddOptionalEvidencePath(query, "snapshotPath", snapshot_path, error_message) ||
        !AddOptionalEvidencePath(query, "clipPath", clip_path, error_message)) {
        return false;
    }
    if (snapshot_path->empty() && clip_path->empty()) {
        if (!AddOptionalEvidencePath(query, "path", snapshot_path, error_message)) {
            return false;
        }
    }
    if (snapshot_path->empty() && clip_path->empty()) {
        if (error_message != nullptr) {
            *error_message = "snapshotPath or clipPath is required";
        }
        return false;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35011 function
bool ValidateEvidenceBundleToken(const std::unordered_map<std::string, std::string>& query,
                                 const std::string& event_id,
                                 const std::filesystem::path& snapshot_path,
                                 const std::filesystem::path& clip_path,
                                 std::int64_t expires_at_ms,
                                 bool release_safe,
                                 std::string* error_message) {
    const std::string token = Trim(query.find("token") == query.end() ? "" : query.at("token"));
    if (token.empty()) {
        if (error_message != nullptr) {
            *error_message = "evidence bundle token is required";
        }
        return false;
    }
    const std::string expected = EvidenceBundleTokenFor(event_id, snapshot_path, clip_path, expires_at_ms, release_safe);
    if (token != expected) {
        if (error_message != nullptr) {
            *error_message = "evidence bundle token is invalid";
        }
        return false;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35035 function
std::string EventEvidenceBundleTokenJson(const std::unordered_map<std::string, std::string>& query,
                                         std::string* error_message) {
    const std::int64_t now_ms = NowUnixMs();
    std::int64_t expires_at_ms = now_ms + kEvidenceBundleMaxAgeMs;
    std::string event_id;
    std::filesystem::path snapshot_path;
    std::filesystem::path clip_path;
    if (!ExtractEvidenceBundleRequest(query,
                                      now_ms,
                                      &event_id,
                                      &snapshot_path,
                                      &clip_path,
                                      &expires_at_ms,
                                      error_message)) {
        return {};
    }
    const bool release_safe_requested = EvidenceBundleReleaseSafeRequested(query);
    const std::string token = EvidenceBundleTokenFor(event_id, snapshot_path, clip_path, expires_at_ms, release_safe_requested);
    std::ostringstream params;
    params << "eventId=" << UrlEncode(event_id)
           << "&expiresAtMs=" << expires_at_ms
           << "&token=" << UrlEncode(token)
           << "&download=1";
    if (release_safe_requested) {
        params << "&releaseSafe=1";
    }
    if (!snapshot_path.empty()) {
        params << "&snapshotPath=" << UrlEncode(snapshot_path.string());
    }
    if (!clip_path.empty()) {
        params << "&clipPath=" << UrlEncode(clip_path.string());
    }
    std::ostringstream out;
    out << "{\"status\":\"event-evidence-bundle-token\","
        << "\"token\":\"" << JsonEscape(token) << "\","
        << "\"releaseSafe\":" << (release_safe_requested ? "true" : "false") << ","
        << "\"expiresAtMs\":" << expires_at_ms << ","
        << "\"maxAgeMs\":" << kEvidenceBundleMaxAgeMs << ","
        << "\"cleanupPolicy\":\"token-expiry-no-server-file\","
        << "\"bundleUrl\":\"/lab/analysis/events/evidence/bundle?" << JsonEscape(params.str()) << "\"}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35078 function
std::string EvidenceBundleRedactedValue(const std::string& value, const std::string& fallback) {
    const std::string trimmed = Trim(value);
    if (trimmed.empty() || !IsIncidentMemoryValueReleaseSafe(trimmed)) {
        return fallback;
    }
    return trimmed;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35086 function
std::string BuildReleaseSafeIncidentEvidenceBundleManifest(const std::string& event_id,
                                                           bool snapshot_requested,
                                                           bool clip_requested,
                                                           std::int64_t now_ms,
                                                           std::int64_t expires_at_ms) {
    std::string summary = "redacted incident evidence bundle";
    std::vector<std::string> terms;
    std::vector<std::string> redacted_fields;
    if (!event_id.empty()) {
        EventStorageApplicationQueryOptions options;
        options.event_id = event_id;
        options.limit = 1;
        options.include_archives = true;
        EventStorageApplicationQueryResult result;
        std::string query_error;
        if (QueryEventRecordsForApplication(options, &result, &query_error) && !result.records_json.empty()) {
            const auto document = ProjectEventRecordForIncidentMemory(result.records_json.front());
            summary = EvidenceBundleRedactedValue(document.summary, summary);
            terms = document.tokens;
            if (terms.size() > 12) {
                terms.resize(12);
            }
            redacted_fields = document.redacted_fields;
        }
    }

    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.v250.redacted-incident-evidence-bundle.v1\","
        << "\"releaseSafe\":true,"
        << "\"createdAtMs\":" << now_ms << ","
        << "\"expiresAtMs\":" << expires_at_ms << ","
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"scope\":\"release-safe-redacted-incident-evidence\","
        << "\"bundleFormat\":\"zip\","
        << "\"rawEvidenceIncluded\":false,"
        << "\"sourceLocatorIncluded\":false,"
        << "\"credentialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"encodedClipIncluded\":false,"
        << "\"encodedClipManifestIncluded\":false,"
        << "\"encodedClipPathIncluded\":false,"
        << "\"encodedClipMediaIncluded\":false,"
        << "\"retentionExportHardening\":{"
        << "\"schema\":\"media-server.v310.retention-export-hardening.v1\","
        << "\"implementedInStep\":\"V310-S08\","
        << "\"releaseSafeExportExcludesEncodedMedia\":true,"
        << "\"encodedClipLifecycleCleanup\":\"event-retention-cleanup\","
        << "\"auditAction\":\"export-bundle\","
        << "\"bundleExpiry\":\"signed-token-expiresAtMs\","
        << "\"expiredBundleCleanup\":\"token-expiry-no-server-file\""
        << "},"
        << "\"inputEvidence\":{\"snapshotProvided\":" << (snapshot_requested ? "true" : "false")
        << ",\"clipProvided\":" << (clip_requested ? "true" : "false") << "},"
        << "\"searchResults\":[{\"eventId\":\"" << JsonEscape(event_id)
        << "\",\"summaryText\":\"" << JsonEscape(summary) << "\",\"terms\":";
    out << OpsIncidentMemoryStringArrayJson(terms)
        << "}],"
        << "\"timelineSummary\":["
        << "{\"stage\":\"event-record\",\"summaryText\":\"" << JsonEscape(summary) << "\"},"
        << "{\"stage\":\"release-safe-export\",\"summaryText\":\"raw evidence files excluded\"}"
        << "],"
        << "\"redactionPolicy\":{\"excludedMaterials\":["
        << "\"raw-evidence\","
        << "\"snapshot-file\","
        << "\"clip-frame-file\","
        << "\"source-url\","
        << "\"developer-url\","
        << "\"credential\","
        << "\"debug-counters\","
        << "\"provider-prompt-response\"],"
        << "\"redactedFields\":";
    out << OpsIncidentMemoryStringArrayJson(redacted_fields)
        << "}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35169 function
bool BuildEventEvidenceBundleZip(const std::unordered_map<std::string, std::string>& query,
                                 std::string* zip_body,
                                 std::string* download_name,
                                 std::string* error_message) {
    if (zip_body == nullptr || download_name == nullptr) {
        return false;
    }
    const std::int64_t now_ms = NowUnixMs();
    std::int64_t expires_at_ms = now_ms + kEvidenceBundleMaxAgeMs;
    std::string event_id;
    std::filesystem::path snapshot_path;
    std::filesystem::path clip_path;
    const bool release_safe_requested = EvidenceBundleReleaseSafeRequested(query);
    if (!ExtractEvidenceBundleRequest(query,
                                      now_ms,
                                      &event_id,
                                      &snapshot_path,
                                      &clip_path,
                                      &expires_at_ms,
                                      error_message) ||
        !ValidateEvidenceBundleToken(query,
                                     event_id,
                                     snapshot_path,
                                     clip_path,
                                     expires_at_ms,
                                     release_safe_requested,
                                     error_message)) {
        return false;
    }

    std::string zip;
    std::vector<ZipCentralDirectoryEntry> entries;
    if (!release_safe_requested) {
        if (!event_id.empty()) {
            EventStorageApplicationQueryOptions options;
            options.event_id = event_id;
            options.limit = 1;
            options.include_archives = true;
            EventStorageApplicationQueryResult result;
            std::string query_error;
            if (QueryEventRecordsForApplication(options, &result, &query_error) && !result.records_json.empty()) {
                if (!AppendZipEntry(&zip, &entries, "event-record.json", result.records_json.front(), error_message)) {
                    return false;
                }
            }
        }

        if (!snapshot_path.empty() &&
            !AppendEvidenceFileToZip(&zip,
                                     &entries,
                                     snapshot_path,
                                     EvidenceBundleEntryName(snapshot_path, "evidence/snapshot"),
                                     error_message)) {
            return false;
        }

        if (!clip_path.empty()) {
            const std::string clip_root = "evidence/clip/" + clip_path.parent_path().filename().string();
            if (!AppendEvidenceFileToZip(&zip,
                                         &entries,
                                         clip_path,
                                         clip_root + "/" + clip_path.filename().string(),
                                         error_message)) {
                return false;
            }
            if (std::filesystem::is_regular_file(clip_path)) {
                std::error_code ec;
                std::vector<std::filesystem::path> clip_files;
                for (const auto& entry : std::filesystem::directory_iterator(clip_path.parent_path(), ec)) {
                    if (ec || !entry.is_regular_file()) {
                        continue;
                    }
                    const auto candidate = entry.path();
                    if (candidate == clip_path) {
                        continue;
                    }
                    std::filesystem::path resolved;
                    std::string content_type;
                    if (IsSafeEventEvidencePath(candidate, &resolved, &content_type)) {
                        clip_files.push_back(resolved);
                    }
                }
                std::sort(clip_files.begin(), clip_files.end());
                constexpr std::size_t kMaxClipFilesInBundle = 200;
                if (clip_files.size() > kMaxClipFilesInBundle) {
                    clip_files.resize(kMaxClipFilesInBundle);
                }
                for (const auto& file : clip_files) {
                    if (!AppendEvidenceFileToZip(&zip,
                                                 &entries,
                                                 file,
                                                 clip_root + "/" + file.filename().string(),
                                                 error_message)) {
                        return false;
                    }
                }
            }
        }
    }

    std::ostringstream manifest;
    if (release_safe_requested) {
        manifest << BuildReleaseSafeIncidentEvidenceBundleManifest(
            event_id, !snapshot_path.empty(), !clip_path.empty(), now_ms, expires_at_ms);
    } else {
        manifest << "{"
                 << "\"schema\":\"media-server.va.event-evidence-bundle.v1\","
                 << "\"createdAtMs\":" << now_ms << ","
                 << "\"expiresAtMs\":" << expires_at_ms << ","
                 << "\"eventId\":\"" << JsonEscape(event_id) << "\","
                 << "\"scope\":\"event-short-evidence\","
                 << "\"longRecording\":false,"
                 << "\"bundleFormat\":\"zip\","
                 << "\"retentionPolicy\":{\"bundleMaxAgeMs\":" << kEvidenceBundleMaxAgeMs
                 << ",\"bundleExpiry\":\"signed-token-expiresAtMs\","
                 << "\"expiredBundleCleanup\":\"token-expiry-no-server-file\"},"
                 << "\"exportPolicy\":{\"bundleSignedToken\":true,\"tokenParam\":\"token\"},"
                 << "\"deletePolicy\":{\"evidenceFileDelete\":false,\"evidenceFileDeletePermission\":\"blocked-for-all-roles\"},"
                 << "\"snapshotPath\":\"" << JsonEscape(snapshot_path.string()) << "\","
                 << "\"clipPath\":\"" << JsonEscape(clip_path.string()) << "\","
                 << "\"entries\":[";
        for (std::size_t index = 0; index < entries.size(); ++index) {
            if (index != 0) {
                manifest << ",";
            }
            manifest << "\"" << JsonEscape(entries[index].name) << "\"";
        }
        manifest << "]}";
    }
    if (!AppendZipEntry(&zip, &entries, "manifest.json", manifest.str(), error_message) ||
        !FinalizeZip(&zip, entries, error_message)) {
        return false;
    }

    const std::string safe_id = event_id.empty() ? std::to_string(NowUnixMs()) : event_id;
    *download_name = std::string(release_safe_requested ? "redacted-incident-evidence-" : "event-evidence-") + safe_id + ".zip";
    *zip_body = std::move(zip);
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35309 function
std::string BuildEvidenceBundleAuditJson(const std::string& event_id,
                                         const std::string& download_name,
                                         bool release_safe) {
    constexpr const char* kV310ExportBundleAuditSummary =
        "Export bundle downloaded with V310 retention/export hardening";
    std::ostringstream audit_body;
    audit_body
        << "{"
        << "\"area\":\"events\","
        << "\"action\":\"export-bundle\","
        << "\"target\":\"event:" << JsonEscape(event_id.empty() ? download_name : event_id) << "\","
        << "\"summary\":\"" << kV310ExportBundleAuditSummary << "\","
        << "\"before\":null,"
        << "\"after\":{"
        << "\"file\":\"" << JsonEscape(download_name) << "\","
        << "\"releaseSafe\":" << (release_safe ? "true" : "false") << ","
        << "\"retentionExportHardening\":{"
        << "\"schema\":\"media-server.v310.retention-export-hardening.v1\","
        << "\"implementedInStep\":\"V310-S08\","
        << "\"bundleExpiry\":\"signed-token-expiresAtMs\","
        << "\"expiredBundleCleanup\":\"token-expiry-no-server-file\","
        << "\"encodedClipLifecycleCleanup\":\"event-retention-cleanup\","
        << "\"releaseSafeExportExcludesEncodedMedia\":" << (release_safe ? "true" : "false")
        << "}"
        << "}"
        << "}";
    return audit_body.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35338 function
// 파일명 규칙으로 검증 리포트 종류를 추정해 UI 필터 없이도 대략적인 맥락을 보여준다.
std::string LabReportKindFromName(const std::string& name) {
    if (name.find("predev") != std::string::npos) {
        return "predev";
    }
    if (name.find("evtpost-longrun") != std::string::npos) {
        return "event-post-longrun";
    }
    if (name.find("evtpost") != std::string::npos || name.find("event-post") != std::string::npos) {
        return "event-post";
    }
    if (name.find("uri-longrun") != std::string::npos) {
        return "uri-longrun";
    }
    if (name.find("webrtc-ice") != std::string::npos) {
        return "webrtc-ice";
    }
    if (name.find("tracker-stability") != std::string::npos) {
        return "tracker";
    }
    if (name.find("report") != std::string::npos) {
        return "report";
    }
    return "artifact";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35364 function
// /tmp에 남은 최신 검증 산출물을 개발/검증 API에서 선택할 수 있는 JSON 목록으로 만든다.
std::string LabReportsJson() {
    std::vector<std::filesystem::path> reports;
    std::error_code ec;
    for (const auto& entry : std::filesystem::directory_iterator("/tmp", ec)) {
        if (ec) {
            break;
        }
        std::filesystem::path resolved;
        if (IsSafeLabReportPath(entry.path(), &resolved)) {
            reports.push_back(resolved);
        }
    }
    std::sort(reports.begin(), reports.end(), [](const auto& lhs, const auto& rhs) {
        std::error_code lhs_ec;
        std::error_code rhs_ec;
        return std::filesystem::last_write_time(lhs, lhs_ec) > std::filesystem::last_write_time(rhs, rhs_ec);
    });
    if (reports.size() > 80) {
        reports.resize(80);
    }

    std::ostringstream out;
    out << "{\"reports\":[";
    for (std::size_t i = 0; i < reports.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        std::error_code size_ec;
        const auto size = std::filesystem::file_size(reports[i], size_ec);
        const std::string name = reports[i].filename().string();
        out << "{"
            << "\"path\":\"" << JsonEscape(reports[i].string()) << "\","
            << "\"name\":\"" << JsonEscape(name) << "\","
            << "\"kind\":\"" << JsonEscape(LabReportKindFromName(name)) << "\","
            << "\"extension\":\"" << JsonEscape(reports[i].extension().string()) << "\","
            << "\"sizeBytes\":" << (size_ec ? 0 : size)
            << "}";
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35407 function
// 큰 로그 응답은 앞부분만 읽고 truncation 여부를 같이 내려준다.
bool BuildLabReportContentJson(const std::string& requested_path,
                               std::string* response_body,
                               std::string* error_message) {
    std::filesystem::path resolved;
    if (!IsSafeLabReportPath(std::filesystem::path(requested_path), &resolved)) {
        if (error_message != nullptr) {
            *error_message = "report path is not allowed";
        }
        return false;
    }

    constexpr std::size_t kMaxReportBytes = 1024 * 1024;
    std::error_code size_ec;
    const auto size = std::filesystem::file_size(resolved, size_ec);
    const std::size_t bytes_to_read =
        size_ec ? kMaxReportBytes : static_cast<std::size_t>(std::min<std::uintmax_t>(size, kMaxReportBytes));
    std::string content(bytes_to_read, '\0');
    std::ifstream input(resolved, std::ios::binary);
    if (!input.good()) {
        if (error_message != nullptr) {
            *error_message = "failed to open report file";
        }
        return false;
    }
    input.read(content.data(), static_cast<std::streamsize>(content.size()));
    content.resize(static_cast<std::size_t>(std::max<std::streamsize>(0, input.gcount())));

    std::ostringstream out;
    const auto truncated_bytes = (!size_ec && size > kMaxReportBytes) ? (size - kMaxReportBytes) : 0;
    out << "{"
        << "\"path\":\"" << JsonEscape(resolved.string()) << "\","
        << "\"name\":\"" << JsonEscape(resolved.filename().string()) << "\","
        << "\"kind\":\"" << JsonEscape(LabReportKindFromName(resolved.filename().string())) << "\","
        << "\"sizeBytes\":" << (size_ec ? content.size() : size) << ","
        << "\"maxBytes\":" << kMaxReportBytes << ","
        << "\"truncatedBytes\":" << truncated_bytes << ","
        << "\"truncated\":" << (!size_ec && size > kMaxReportBytes ? "true" : "false") << ","
        << "\"content\":\"" << JsonEscape(content) << "\""
        << "}";
    if (response_body != nullptr) {
        *response_body = out.str();
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35453 function
bool IsSupportedMediaFile(const std::filesystem::path& path) {
    std::string ext = path.extension().string();
    std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return ext == ".mp4" || ext == ".mov" || ext == ".mkv" || ext == ".webm" || ext == ".m4v";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35461 function
// 지정한 root 아래에서 predicate를 만족하는 파일만 상대 경로로 모아 UI/API에 노출한다.
std::vector<std::string> CollectRelativeFiles(const std::filesystem::path& root,
                                              bool (*predicate)(const std::filesystem::path&)) {
    std::vector<std::string> files;
    std::error_code ec;
    if (std::filesystem::exists(root, ec) && std::filesystem::is_directory(root, ec)) {
        for (std::filesystem::recursive_directory_iterator it(root, std::filesystem::directory_options::skip_permission_denied, ec);
             !ec && it != std::filesystem::recursive_directory_iterator();
             it.increment(ec)) {
            if (!it->is_regular_file(ec) || !predicate(it->path())) {
                continue;
            }
            std::error_code relative_ec;
            const auto relative = std::filesystem::relative(it->path(), root, relative_ec);
            if (!relative_ec) {
                files.push_back(relative.generic_string());
            }
        }
    }
    std::sort(files.begin(), files.end());
    return files;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35484 function
// /lab/files 응답에서 재사용하는 문자열 배열 필드를 JSON으로 직렬화한다.
void AppendJsonStringArray(std::ostringstream& out, const std::string& name, const std::vector<std::string>& values) {
    out << "\"" << JsonEscape(name) << "\":[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(values[i]) << "\"";
    }
    out << "]";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35496 function
std::string LabFilesJson() {
    const auto root = std::filesystem::path(GetWebRtcHttpRuntimeConfig().file_root_path);
    const auto asset_root = std::filesystem::path("docs") / "assets";
    const auto files = CollectRelativeFiles(root, IsSupportedMediaFile);
    const auto image_files = CollectRelativeFiles(root, IsSupportedImageFile);
    const auto asset_images = CollectRelativeFiles(asset_root, IsSupportedImageFile);

    std::string default_file = std::filesystem::path(GetWebRtcHttpRuntimeConfig().default_file_path).filename().string();
    std::error_code relative_ec;
    const auto default_relative =
        std::filesystem::relative(std::filesystem::path(GetWebRtcHttpRuntimeConfig().default_file_path), root, relative_ec);
    if (!relative_ec && !default_relative.empty() && default_relative.native().find("..") == std::string::npos) {
        default_file = default_relative.generic_string();
    }

    std::ostringstream out;
    out << "{\"root\":\"" << JsonEscape(root.filename().string()) << "\","
        << "\"assetRoot\":\"" << JsonEscape(asset_root.generic_string()) << "\","
        << "\"defaultFile\":\"" << JsonEscape(default_file) << "\","
        << "\"defaultImage\":\"va-four-scene-sample.png\",";
    AppendJsonStringArray(out, "files", files);
    out << ",";
    AppendJsonStringArray(out, "imageFiles", image_files);
    out << ",";
    AppendJsonStringArray(out, "assetImages", asset_images);
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35525 function
bool AttachWebRtcAnalysisOverlay(
                                 AnalysisSessionLifecycleApplicationService& analysis_session_lifecycle,
                                 AnalysisSessionReadApplicationService& analysis_session_reads,
                                 const WebRtcMediaApplicationRequest& ingress_request,
                                 const std::unordered_map<std::string, std::string>& query,
                                 const std::shared_ptr<WebRtcMediaApplicationEgressSession>& bridge,
                                 std::string* analysis_tap_id,
                                 std::string* error_message) {
    if (!IsAnalysisOverlayRequestedForApplication(query)) {
        return true;
    }
    if (bridge == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing WebRTC egress bridge for analysis overlay";
        }
        return false;
    }

    WebRtcMediaApplicationRequest analysis_request = ingress_request;
    analysis_request.protocol = "webrtc";
    analysis_request.client_id = ingress_request.client_id + "-analysis";
    auto attach_result = analysis_session_lifecycle.Attach(
        ProjectAnalysisSessionLifecycleRequest(analysis_request));
    if (!attach_result.ok) {
        if (error_message != nullptr) {
            *error_message = attach_result.message.empty() ? "failed to attach analysis overlay tap"
                                                           : attach_result.message;
        }
        return false;
    }

    std::weak_ptr<WebRtcMediaApplicationEgressSession> weak_bridge = bridge;
    const bool render_video_overlay =
        ParseBoolQuery(query, "renderVideoOverlay", ParseBoolQuery(query, "videoOverlay", true));
    const auto overlay_settings = ResolveAnalysisOverlaySettingsForApplication(
        query,
        render_video_overlay);
    const auto metadata_channel_config = BuildWebRtcMediaApplicationMetadataChannelConfigFromQuery(query);
    const bool metadata_channel_enabled = metadata_channel_config.enabled;
    const auto metadata_subscription_filter = BuildVaMetadataSubscriptionFilter(query);
    const bool metadata_fallback_payload_enabled =
        overlay_settings.render_video_overlay ||
        ParseBoolQuery(query, "clientOverlayFallback", ParseBoolQuery(query, "vaMetadataDrawFallback", false));
    bridge->SetMetadataChannelConfig(metadata_channel_config);
    auto event_runtime = AcquireEventRuleApplicationRuntime("webrtc-overlay:" + attach_result.tap_id);
    auto result_provider =
        [&analysis_session_reads,
         tap_id = attach_result.tap_id,
         weak_bridge,
         event_runtime,
         metadata_channel_enabled,
         metadata_subscription_filter,
         metadata_fallback_payload_enabled,
         debug_overlay = overlay_settings.draw_debug_overlay,
         tolerance_ns = overlay_settings.sync_tolerance_ns,
         wait_timeout_ms = overlay_settings.wait_timeout_ms](std::int64_t frame_pts,
                                                              AnalysisSessionApplicationResult* output) -> bool {
            if (output == nullptr) {
                return false;
            }
            const auto bridge_lock = weak_bridge.lock();
            const std::int64_t source_pts =
                bridge_lock != nullptr ? bridge_lock->ResolveOverlaySourcePts(frame_pts) : frame_pts;
            // WebRTC overlay frame PTS를 원본 packet PTS로 되돌려 가장 가까운 분석 결과를 우선 사용한다.
            auto result = analysis_session_reads.WaitResultNearPts(
                tap_id, source_pts, tolerance_ns, wait_timeout_ms);
            if (result.has_value()) {
                result->debug_state_requested =
                    result->debug_state_requested || debug_overlay || metadata_channel_enabled;
                result->debug_state_log_enabled = result->debug_state_log_enabled || debug_overlay;
                const auto evaluation = EvaluateEventRulesForApplication(*result, event_runtime);
                const auto& annotated = evaluation.ApplicationAnnotatedResult();
                const auto& events = evaluation.ApplicationEvents();
                DispatchEventRecordsForApplication(ProjectEventStorageDispatchRequest(
                    annotated, events));
                DispatchEventPostsForApplication(ProjectEventPostDispatchRequest(
                    annotated, events));
                if (metadata_channel_enabled && bridge_lock != nullptr && bridge_lock->MetadataChannelReady()) {
                    const auto sync_info = BuildWebRtcVaMetadataSyncInfo(
                        source_pts,
                        annotated.pts,
                        tolerance_ns,
                        WebRtcSyncStatusForMatch(source_pts, annotated.pts),
                        annotated.frame_width,
                        annotated.frame_height);
                    bridge_lock->PublishAnalysisMetadata(
                        WebRtcVaMetadataMessageJson(annotated,
                                                    events,
                                                    sync_info,
                                                    metadata_subscription_filter));
                }
                *output = annotated;
                return true;
            }
            // 동기화 허용 시간 안에 결과가 아직 없으면 최신 snapshot으로 fallback해 overlay 공백을 줄인다.
            const auto snapshot = analysis_session_reads.Snapshot(tap_id);
            if (!snapshot.has_value() || !snapshot->latest_result.has_value()) {
                if (metadata_channel_enabled && bridge_lock != nullptr && bridge_lock->MetadataChannelReady()) {
                    bridge_lock->PublishAnalysisMetadata(
                        WebRtcVaMetadataMissingMessageJson(tap_id, source_pts, tolerance_ns));
                }
                return false;
            }
            auto latest_result = *snapshot->latest_result;
            latest_result.debug_state_requested =
                latest_result.debug_state_requested || debug_overlay || metadata_channel_enabled;
            latest_result.debug_state_log_enabled = latest_result.debug_state_log_enabled || debug_overlay;
            const auto evaluation = EvaluateEventRulesForApplication(latest_result, event_runtime);
            const auto& annotated = evaluation.ApplicationAnnotatedResult();
            const auto& events = evaluation.ApplicationEvents();
            DispatchEventRecordsForApplication(ProjectEventStorageDispatchRequest(
                annotated, events));
            DispatchEventPostsForApplication(ProjectEventPostDispatchRequest(
                annotated, events));
            if (metadata_channel_enabled && bridge_lock != nullptr && bridge_lock->MetadataChannelReady()) {
                if (metadata_fallback_payload_enabled) {
                    const auto sync_info = BuildWebRtcVaMetadataSyncInfo(source_pts,
                                                                         annotated.pts,
                                                                         tolerance_ns,
                                                                         "fallback-latest",
                                                                         annotated.frame_width,
                                                                         annotated.frame_height);
                    bridge_lock->PublishAnalysisMetadata(
                        WebRtcVaMetadataMessageJson(annotated,
                                                    events,
                                                    sync_info,
                                                    metadata_subscription_filter));
                } else {
                    bridge_lock->PublishAnalysisMetadata(
                        WebRtcVaMetadataMissingMessageJson(tap_id, source_pts, tolerance_ns));
                }
            }
            *output = annotated;
            return true;
        };
    bridge->ConfigureAnalysisOverlay(query, render_video_overlay, std::move(result_provider));
    if (analysis_tap_id != nullptr) {
        *analysis_tap_id = attach_result.tap_id;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35657 function
bool SendAll(int fd, const std::string& data) {
    std::size_t sent = 0;
    while (sent < data.size()) {
        int flags = 0;
#ifdef MSG_NOSIGNAL
        flags |= MSG_NOSIGNAL;
#endif
        const ssize_t bytes = send(fd, data.data() + sent, data.size() - sent, flags);
        if (bytes <= 0) {
            return false;
        }
        sent += static_cast<std::size_t>(bytes);
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35673 function
void SuppressSocketSigPipe(int fd) {
#ifdef SO_NOSIGPIPE
    int enabled = 1;
    (void)setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &enabled, sizeof(enabled));
#else
    (void)fd;
#endif
}

}  // namespace webrtc_http_server_detail

}  // namespace ingress
