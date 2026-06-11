// 파일 요약: Semantic Incident Memory의 redacted text projection 순수 로직을 구현한다.
// 동작 요약: 외부 Event POST/WebRTC/SSE/WS schema를 건드리지 않고 local-only 검색 문서를 만든다.
#include "analysis/incident_memory.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <map>
#include <memory>
#include <optional>
#include <set>
#include <sstream>
#include <unordered_map>
#include <unordered_set>
#include <utility>

#ifndef MEDIA_SERVER_USE_SQLITE3
#define MEDIA_SERVER_USE_SQLITE3 0
#endif

#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#else
struct sqlite3_stmt;
#endif

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

std::optional<IncidentProjectionDocument> ParseProjectionDocumentJson(const std::string& json) {
    if (ExtractString(json, "schema").value_or("") != "media-server.incident-text-projection.v1") {
        return std::nullopt;
    }
    IncidentProjectionDocument document;
    document.document_id = RequiredString(json, "documentId", "");
    document.source_kind = RequiredString(json, "sourceKind", "");
    document.record_id = RequiredString(json, "recordId", "");
    document.event_id = RequiredString(json, "eventId", "");
    document.incident_id = RequiredString(json, "incidentId", "");
    document.source_id = RequiredString(json, "sourceId", "");
    document.timestamp_ms = ExtractInt64(json, "timestampMs").value_or(0);
    document.title = RequiredString(json, "title", "");
    document.summary = RequiredString(json, "summary", "");
    document.searchable_text = RequiredString(json, "searchableText", "");
    if (document.document_id.empty() || document.searchable_text.empty()) {
        return std::nullopt;
    }
    document.tokens = IncidentProjectionTokens(document.searchable_text);
    return document;
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

std::string JoinOrFtsQuery(const std::vector<std::string>& terms) {
    std::ostringstream out;
    for (std::size_t index = 0; index < terms.size(); ++index) {
        if (index > 0) {
            out << " OR ";
        }
        out << "\"" << terms[index] << "\"";
    }
    return out.str();
}

void SetError(std::string* error_message, const std::string& message) {
    if (error_message != nullptr) {
        *error_message = message;
    }
}

}  // namespace

class IncidentMemoryIndexImpl {
public:
    IncidentMemoryIndexImpl() = default;
    ~IncidentMemoryIndexImpl() {
        CloseSqlite();
    }

    bool Open(const IncidentMemoryIndexConfig& config, std::string* error_message) {
        CloseSqlite();
        config_ = config;
        documents_.clear();
        report_ = IncidentMemoryIndexReport{};
        report_.sqlite_path = config.sqlite_path;
        report_.jsonl_path = config.jsonl_path;

        if (!config.force_jsonl_bm25_fallback && config.prefer_sqlite_fts5 &&
            TryOpenSqlite(config.sqlite_path, error_message)) {
            report_.backend = "sqlite-fts5";
            report_.sqlite_fts5_available = true;
            report_.fallback_active = false;
            report_.model_provider_dependency = false;
            report_.document_count = documents_.size();
            return true;
        }

        report_.backend = "jsonl-bm25";
        report_.sqlite_fts5_available = false;
        report_.fallback_active = true;
        report_.model_provider_dependency = false;
        if (!LoadJsonl(error_message)) {
            return false;
        }
        report_.document_count = documents_.size();
        return true;
    }

    bool Upsert(const IncidentProjectionDocument& document, std::string* error_message) {
        if (document.document_id.empty()) {
            SetError(error_message, "document_id is required");
            return false;
        }
        if (document.searchable_text.empty()) {
            SetError(error_message, "searchable_text is required");
            return false;
        }
        UpsertMemory(document);
        if (report_.backend == "sqlite-fts5") {
            if (!UpsertSqlite(document, error_message)) {
                return false;
            }
        }
        if (!config_.jsonl_path.empty() && !PersistJsonl(error_message)) {
            return false;
        }
        report_.document_count = documents_.size();
        return true;
    }

    bool Search(const IncidentMemorySearchOptions& options,
                std::vector<IncidentMemorySearchHit>* hits,
                std::string* error_message) const {
        if (hits == nullptr) {
            SetError(error_message, "hits output is required");
            return false;
        }
        hits->clear();
        std::vector<std::string> terms = IncidentProjectionTokens(options.query);
        if (terms.empty() || options.limit == 0) {
            return true;
        }

        std::unordered_set<std::string> candidate_ids;
        if (report_.backend == "sqlite-fts5") {
            if (!CollectSqliteCandidates(terms, &candidate_ids, error_message)) {
                return false;
            }
        }
        std::vector<const IncidentProjectionDocument*> candidates;
        candidates.reserve(documents_.size());
        for (const auto& document : documents_) {
            if (report_.backend != "sqlite-fts5" || candidate_ids.count(document.document_id) > 0) {
                candidates.push_back(&document);
            }
        }

        *hits = RankCandidates(candidates, terms);
        if (hits->size() > options.limit) {
            hits->resize(options.limit);
        }
        return true;
    }

    IncidentMemoryIndexReport Report() const {
        IncidentMemoryIndexReport copy = report_;
        copy.document_count = documents_.size();
        return copy;
    }

private:
    void UpsertMemory(IncidentProjectionDocument document) {
        document.tokens = IncidentProjectionTokens(document.searchable_text);
        for (auto& existing : documents_) {
            if (existing.document_id == document.document_id) {
                existing = std::move(document);
                SortDocuments();
                return;
            }
        }
        documents_.push_back(std::move(document));
        SortDocuments();
    }

    void SortDocuments() {
        std::sort(documents_.begin(),
                  documents_.end(),
                  [](const auto& lhs, const auto& rhs) {
                      return lhs.document_id < rhs.document_id;
                  });
    }

    bool LoadJsonl(std::string* error_message) {
        if (config_.jsonl_path.empty() || !std::filesystem::exists(config_.jsonl_path)) {
            return true;
        }
        std::ifstream in(config_.jsonl_path);
        if (!in) {
            SetError(error_message, "failed to open JSONL fallback index: " + config_.jsonl_path);
            return false;
        }
        std::string line;
        while (std::getline(in, line)) {
            const auto parsed = ParseProjectionDocumentJson(line);
            if (parsed.has_value()) {
                UpsertMemory(*parsed);
            }
        }
        return true;
    }

    bool PersistJsonl(std::string* error_message) const {
        const std::filesystem::path output(config_.jsonl_path);
        const std::filesystem::path parent = output.parent_path();
        if (!parent.empty()) {
            std::filesystem::create_directories(parent);
        }
        std::ofstream out(config_.jsonl_path, std::ios::trunc);
        if (!out) {
            SetError(error_message, "failed to write JSONL fallback index: " + config_.jsonl_path);
            return false;
        }
        for (const auto& document : documents_) {
            out << IncidentProjectionDocumentJson(document) << "\n";
        }
        return true;
    }

    std::vector<IncidentMemorySearchHit> RankCandidates(
        const std::vector<const IncidentProjectionDocument*>& candidates,
        const std::vector<std::string>& terms) const {
        std::vector<IncidentMemorySearchHit> hits;
        if (candidates.empty()) {
            return hits;
        }
        std::map<std::string, std::size_t> document_frequency;
        double total_length = 0.0;
        for (const auto* document : candidates) {
            const auto counts = TokenCounts(*document);
            total_length += static_cast<double>(DocumentLength(counts));
            for (const auto& term : terms) {
                if (counts.count(term) > 0) {
                    document_frequency[term] += 1;
                }
            }
        }
        const double average_length =
            std::max(1.0, total_length / static_cast<double>(candidates.size()));
        for (const auto* document : candidates) {
            const auto counts = TokenCounts(*document);
            const double length = std::max(1.0, static_cast<double>(DocumentLength(counts)));
            double score = 0.0;
            std::vector<std::string> matched;
            for (const auto& term : terms) {
                const auto count_iter = counts.find(term);
                if (count_iter == counts.end() || count_iter->second == 0) {
                    continue;
                }
                matched.push_back(term);
                const double tf = static_cast<double>(count_iter->second);
                const double df = static_cast<double>(std::max<std::size_t>(1, document_frequency[term]));
                const double n = static_cast<double>(candidates.size());
                const double idf = std::log((n - df + 0.5) / (df + 0.5) + 1.0);
                constexpr double k1 = 1.2;
                constexpr double b = 0.75;
                score += idf * ((tf * (k1 + 1.0)) /
                                (tf + k1 * (1.0 - b + b * (length / average_length))));
            }
            if (score <= 0.0) {
                continue;
            }
            IncidentMemorySearchHit hit;
            hit.document_id = document->document_id;
            hit.source_kind = document->source_kind;
            hit.incident_id = document->incident_id;
            hit.source_id = document->source_id;
            hit.title = document->title;
            hit.summary = document->summary;
            hit.score = score;
            hit.matched_terms = std::move(matched);
            hits.push_back(std::move(hit));
        }
        std::sort(hits.begin(), hits.end(), [](const auto& lhs, const auto& rhs) {
            if (lhs.matched_terms.size() != rhs.matched_terms.size()) {
                return lhs.matched_terms.size() > rhs.matched_terms.size();
            }
            if (SourceKindPriority(lhs.source_kind) != SourceKindPriority(rhs.source_kind)) {
                return SourceKindPriority(lhs.source_kind) < SourceKindPriority(rhs.source_kind);
            }
            if (std::fabs(lhs.score - rhs.score) > 0.000001) {
                return lhs.score > rhs.score;
            }
            return lhs.document_id < rhs.document_id;
        });
        return hits;
    }

    static int SourceKindPriority(const std::string& source_kind) {
        if (source_kind == "event-record") {
            return 0;
        }
        if (source_kind == "ops-audit") {
            return 1;
        }
        if (source_kind == "alert-dry-run") {
            return 2;
        }
        if (source_kind == "source-health") {
            return 3;
        }
        return 10;
    }

    static std::unordered_map<std::string, std::size_t> TokenCounts(
        const IncidentProjectionDocument& document) {
        std::unordered_map<std::string, std::size_t> counts;
        for (const auto& token : IncidentProjectionTokens(document.searchable_text)) {
            counts[token] += 1;
        }
        return counts;
    }

    static std::size_t DocumentLength(const std::unordered_map<std::string, std::size_t>& counts) {
        std::size_t total = 0;
        for (const auto& item : counts) {
            total += item.second;
        }
        return total;
    }

    bool TryOpenSqlite(const std::string& sqlite_path, std::string* error_message) {
#if MEDIA_SERVER_USE_SQLITE3
        const std::string path = sqlite_path.empty() ? std::string(":memory:") : sqlite_path;
        if (!sqlite_path.empty()) {
            const std::filesystem::path db_path(sqlite_path);
            if (!db_path.parent_path().empty()) {
                std::filesystem::create_directories(db_path.parent_path());
            }
        }
        sqlite3* db = nullptr;
        if (sqlite3_open(path.c_str(), &db) != SQLITE_OK) {
            SetError(error_message, sqlite3_errmsg(db));
            if (db != nullptr) {
                sqlite3_close(db);
            }
            return false;
        }
        sqlite_db_ = db;
        if (!ExecSql("CREATE TABLE IF NOT EXISTS incident_memory_documents ("
                     "document_id TEXT PRIMARY KEY,"
                     "source_kind TEXT,"
                     "incident_id TEXT,"
                     "source_id TEXT,"
                     "title TEXT,"
                     "summary TEXT,"
                     "searchable_text TEXT,"
                     "document_json TEXT NOT NULL"
                     ");",
                     error_message) ||
            !ExecSql("CREATE VIRTUAL TABLE IF NOT EXISTS incident_memory_fts "
                     "USING fts5(document_id UNINDEXED, searchable_text, title, summary);",
                     error_message) ||
            !LoadSqliteDocuments(error_message)) {
            CloseSqlite();
            return false;
        }
        return true;
#else
        (void)sqlite_path;
        SetError(error_message, "sqlite3 support is not compiled");
        return false;
#endif
    }

    bool ExecSql(const std::string& sql, std::string* error_message) const {
#if MEDIA_SERVER_USE_SQLITE3
        char* raw_error = nullptr;
        const int rc = sqlite3_exec(sqlite_db_, sql.c_str(), nullptr, nullptr, &raw_error);
        if (rc != SQLITE_OK) {
            const std::string message = raw_error != nullptr ? raw_error : sqlite3_errmsg(sqlite_db_);
            sqlite3_free(raw_error);
            SetError(error_message, message);
            return false;
        }
        return true;
#else
        (void)sql;
        SetError(error_message, "sqlite3 support is not compiled");
        return false;
#endif
    }

    bool LoadSqliteDocuments(std::string* error_message) {
#if MEDIA_SERVER_USE_SQLITE3
        sqlite3_stmt* stmt = nullptr;
        const char* sql =
            "SELECT document_json FROM incident_memory_documents ORDER BY document_id ASC;";
        if (sqlite3_prepare_v2(sqlite_db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
            SetError(error_message, sqlite3_errmsg(sqlite_db_));
            return false;
        }
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            const unsigned char* text = sqlite3_column_text(stmt, 0);
            if (text != nullptr) {
                const auto parsed =
                    ParseProjectionDocumentJson(reinterpret_cast<const char*>(text));
                if (parsed.has_value()) {
                    UpsertMemory(*parsed);
                }
            }
        }
        const int rc = sqlite3_finalize(stmt);
        if (rc != SQLITE_OK) {
            SetError(error_message, sqlite3_errmsg(sqlite_db_));
            return false;
        }
        return true;
#else
        (void)error_message;
        return false;
#endif
    }

    bool UpsertSqlite(const IncidentProjectionDocument& document, std::string* error_message) {
#if MEDIA_SERVER_USE_SQLITE3
        sqlite3_stmt* stmt = nullptr;
        const char* upsert_sql =
            "REPLACE INTO incident_memory_documents "
            "(document_id, source_kind, incident_id, source_id, title, summary, searchable_text, document_json) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?);";
        if (!Prepare(upsert_sql, &stmt, error_message)) {
            return false;
        }
        const std::string json = IncidentProjectionDocumentJson(document);
        BindText(stmt, 1, document.document_id);
        BindText(stmt, 2, document.source_kind);
        BindText(stmt, 3, document.incident_id);
        BindText(stmt, 4, document.source_id);
        BindText(stmt, 5, document.title);
        BindText(stmt, 6, document.summary);
        BindText(stmt, 7, document.searchable_text);
        BindText(stmt, 8, json);
        if (!StepDone(stmt, error_message)) {
            return false;
        }
        if (!ExecSql("DELETE FROM incident_memory_fts WHERE document_id = '" +
                         SqlQuote(document.document_id) + "';",
                     error_message)) {
            return false;
        }
        const char* fts_sql =
            "INSERT INTO incident_memory_fts (document_id, searchable_text, title, summary) "
            "VALUES (?, ?, ?, ?);";
        if (!Prepare(fts_sql, &stmt, error_message)) {
            return false;
        }
        BindText(stmt, 1, document.document_id);
        BindText(stmt, 2, document.searchable_text);
        BindText(stmt, 3, document.title);
        BindText(stmt, 4, document.summary);
        return StepDone(stmt, error_message);
#else
        (void)document;
        SetError(error_message, "sqlite3 support is not compiled");
        return false;
#endif
    }

    bool CollectSqliteCandidates(const std::vector<std::string>& terms,
                                 std::unordered_set<std::string>* candidate_ids,
                                 std::string* error_message) const {
#if MEDIA_SERVER_USE_SQLITE3
        if (candidate_ids == nullptr) {
            SetError(error_message, "candidate output is required");
            return false;
        }
        candidate_ids->clear();
        const std::string query = JoinOrFtsQuery(terms);
        sqlite3_stmt* stmt = nullptr;
        const char* sql =
            "SELECT document_id FROM incident_memory_fts "
            "WHERE incident_memory_fts MATCH ? "
            "ORDER BY document_id ASC;";
        if (!Prepare(sql, &stmt, error_message)) {
            return false;
        }
        BindText(stmt, 1, query);
        while (true) {
            const int rc = sqlite3_step(stmt);
            if (rc == SQLITE_ROW) {
                const unsigned char* text = sqlite3_column_text(stmt, 0);
                if (text != nullptr) {
                    candidate_ids->insert(reinterpret_cast<const char*>(text));
                }
                continue;
            }
            if (rc == SQLITE_DONE) {
                break;
            }
            SetError(error_message, sqlite3_errmsg(sqlite_db_));
            sqlite3_finalize(stmt);
            return false;
        }
        const int finalize_rc = sqlite3_finalize(stmt);
        if (finalize_rc != SQLITE_OK) {
            SetError(error_message, sqlite3_errmsg(sqlite_db_));
            return false;
        }
        return true;
#else
        (void)terms;
        (void)candidate_ids;
        SetError(error_message, "sqlite3 support is not compiled");
        return false;
#endif
    }

    bool Prepare(const char* sql, sqlite3_stmt** stmt, std::string* error_message) const {
#if MEDIA_SERVER_USE_SQLITE3
        if (sqlite3_prepare_v2(sqlite_db_, sql, -1, stmt, nullptr) != SQLITE_OK) {
            SetError(error_message, sqlite3_errmsg(sqlite_db_));
            return false;
        }
        return true;
#else
        (void)sql;
        (void)stmt;
        SetError(error_message, "sqlite3 support is not compiled");
        return false;
#endif
    }

    bool StepDone(sqlite3_stmt* stmt, std::string* error_message) const {
#if MEDIA_SERVER_USE_SQLITE3
        const int rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE) {
            SetError(error_message, sqlite3_errmsg(sqlite_db_));
            sqlite3_finalize(stmt);
            return false;
        }
        const int finalize_rc = sqlite3_finalize(stmt);
        if (finalize_rc != SQLITE_OK) {
            SetError(error_message, sqlite3_errmsg(sqlite_db_));
            return false;
        }
        return true;
#else
        (void)stmt;
        SetError(error_message, "sqlite3 support is not compiled");
        return false;
#endif
    }

    static void BindText(sqlite3_stmt* stmt, int index, const std::string& value) {
#if MEDIA_SERVER_USE_SQLITE3
        sqlite3_bind_text(stmt, index, value.c_str(), -1, SQLITE_TRANSIENT);
#else
        (void)stmt;
        (void)index;
        (void)value;
#endif
    }

    static std::string SqlQuote(const std::string& value) {
        std::string out;
        out.reserve(value.size() + 8);
        for (const char ch : value) {
            if (ch == '\'') {
                out += "''";
            } else {
                out.push_back(ch);
            }
        }
        return out;
    }

    void CloseSqlite() {
#if MEDIA_SERVER_USE_SQLITE3
        if (sqlite_db_ != nullptr) {
            sqlite3_close(sqlite_db_);
            sqlite_db_ = nullptr;
        }
#endif
    }

    IncidentMemoryIndexConfig config_;
    IncidentMemoryIndexReport report_;
    std::vector<IncidentProjectionDocument> documents_;
#if MEDIA_SERVER_USE_SQLITE3
    sqlite3* sqlite_db_{nullptr};
#endif
};

IncidentMemoryIndex::IncidentMemoryIndex() : impl_(std::make_unique<IncidentMemoryIndexImpl>()) {}

IncidentMemoryIndex::~IncidentMemoryIndex() = default;

bool IncidentMemoryIndex::Open(const IncidentMemoryIndexConfig& config,
                               std::string* error_message) {
    return impl_->Open(config, error_message);
}

bool IncidentMemoryIndex::Upsert(const IncidentProjectionDocument& document,
                                 std::string* error_message) {
    return impl_->Upsert(document, error_message);
}

bool IncidentMemoryIndex::Search(const IncidentMemorySearchOptions& options,
                                 std::vector<IncidentMemorySearchHit>* hits,
                                 std::string* error_message) const {
    return impl_->Search(options, hits, error_message);
}

IncidentMemoryIndexReport IncidentMemoryIndex::Report() const {
    return impl_->Report();
}

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
