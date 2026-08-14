// 파일 요약: canonical incident projection, privacy guard, local fallback index와 highlight를 application use-case로 결속한다.
#include "ingress/incident_memory_application_service.h"

#include <algorithm>
#include <cctype>
#include <utility>

#include "analysis/incident_memory.h"

namespace ingress {
namespace {

std::string LowerAscii(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

IncidentMemoryProjectionView MapProjection(const analysis::IncidentProjectionDocument& document) {
    IncidentMemoryProjectionView output;
    output.schema = document.schema;
    output.document_id = document.document_id;
    output.source_kind = document.source_kind;
    output.record_id = document.record_id;
    output.event_id = document.event_id;
    output.incident_id = document.incident_id;
    output.source_id = document.source_id;
    output.timestamp_ms = document.timestamp_ms;
    output.title = document.title;
    output.summary = document.summary;
    output.searchable_text = document.searchable_text;
    output.tokens = document.tokens;
    output.fields.reserve(document.fields.size());
    for (const auto& field : document.fields) {
        output.fields.push_back(IncidentProjectionFieldView{.name = field.name, .value = field.value});
    }
    output.redacted_fields = document.redacted_fields;
    output.redaction_applied = document.redaction_applied;
    return output;
}

std::vector<std::string> BuildIncidentMemoryHighlightFragments(
    const analysis::IncidentProjectionDocument& document,
    const std::vector<std::string>& matched_terms) {
    std::vector<std::string> fragments;
    const std::string text = document.searchable_text.empty()
                                 ? (document.title + " " + document.summary)
                                 : document.searchable_text;
    const std::string lowered = LowerAscii(text);
    for (const std::string& term : matched_terms) {
        const std::string lowered_term = LowerAscii(term);
        const std::size_t pos = lowered.find(lowered_term);
        if (pos == std::string::npos) {
            continue;
        }
        const std::size_t start = pos > 42 ? pos - 42 : 0;
        const std::size_t count = std::min<std::size_t>(text.size() - start, 120);
        std::string fragment = Trim(text.substr(start, count));
        if (start > 0) {
            fragment = "..." + fragment;
        }
        if (start + count < text.size()) {
            fragment += "...";
        }
        if (!fragment.empty() && !analysis::IncidentProjectionContainsForbiddenMaterial(fragment)) {
            fragments.push_back(std::move(fragment));
        }
        if (fragments.size() >= 3) {
            break;
        }
    }
    if (fragments.empty() && !document.summary.empty() &&
        !analysis::IncidentProjectionContainsForbiddenMaterial(document.summary)) {
        fragments.push_back(document.summary);
    }
    return fragments;
}

}  // namespace

bool SearchIncidentMemory(const IncidentMemorySearchRequest& request,
                          IncidentMemorySearchResult* output,
                          std::string* error_message) {
    if (output == nullptr) {
        if (error_message != nullptr) {
            *error_message = "incident memory search output is required";
        }
        return false;
    }
    *output = IncidentMemorySearchResult{};

    analysis::IncidentMemoryIndex index;
    analysis::IncidentMemoryIndexConfig config;
    config.prefer_sqlite_fts5 = false;
    config.force_jsonl_bm25_fallback = true;
    output->open_succeeded = index.Open(config, error_message);

    std::vector<analysis::IncidentProjectionDocument> documents;
    documents.reserve(request.event_records_json.size() + request.ops_audit_records_json.size());
    const auto add_document = [&](analysis::IncidentProjectionDocument document) {
        if (analysis::IncidentProjectionContainsForbiddenMaterial(document.searchable_text)) {
            return;
        }
        (void)index.Upsert(document, nullptr);
        documents.push_back(std::move(document));
    };
    for (const auto& event_json : request.event_records_json) {
        add_document(analysis::ProjectEventRecordIncidentText(event_json));
    }
    for (const auto& audit_json : request.ops_audit_records_json) {
        add_document(analysis::ProjectOpsAuditIncidentText(audit_json));
    }

    std::vector<analysis::IncidentMemorySearchHit> hits;
    output->search_succeeded = true;
    if (!request.query.empty()) {
        analysis::IncidentMemorySearchOptions options;
        options.query = request.query;
        options.limit = request.limit;
        output->search_succeeded = index.Search(options, &hits, error_message);
        if (!output->search_succeeded) {
            hits.clear();
        }
    }

    const auto report = index.Report();
    output->backend = report.backend;
    output->sqlite_fts5_available = report.sqlite_fts5_available;
    output->fallback_active = report.fallback_active;
    output->model_provider_dependency = report.model_provider_dependency;
    output->document_count = documents.size();
    output->hits.reserve(hits.size());
    for (const auto& hit : hits) {
        IncidentMemorySearchHitView view;
        view.document_id = hit.document_id;
        view.source_kind = hit.source_kind;
        view.incident_id = hit.incident_id;
        view.source_id = hit.source_id;
        view.title = hit.title;
        view.summary = hit.summary;
        view.score = hit.score;
        view.matched_terms = hit.matched_terms;
        const auto document = std::find_if(documents.begin(), documents.end(), [&](const auto& candidate) {
            return candidate.document_id == hit.document_id;
        });
        view.highlight_fragments = document == documents.end()
                                       ? std::vector<std::string>{hit.summary}
                                       : BuildIncidentMemoryHighlightFragments(*document, hit.matched_terms);
        output->hits.push_back(std::move(view));
    }
    return output->open_succeeded && output->search_succeeded;
}

IncidentMemoryProjectionView ProjectEventRecordForIncidentMemory(const std::string& event_record_json) {
    return MapProjection(analysis::ProjectEventRecordIncidentText(event_record_json));
}

bool IsIncidentMemoryValueReleaseSafe(const std::string& value) {
    return !analysis::IncidentProjectionContainsForbiddenMaterial(value);
}

}  // namespace ingress
